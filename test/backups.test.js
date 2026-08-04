const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const {
  BackupError,
  make,
  mergeEnvForRestore,
  restoreBackupFiles,
} = require('../lib/backups');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-backups-'));
  const dataRoot = path.join(root, 'data');
  const dbPath = path.join(dataRoot, 'cache.db');
  const envFile = path.join(root, '.env');
  const managedKeyPath = path.join(dataRoot, 'kb-encryption.key');
  fs.mkdirSync(dataRoot, { recursive: true });
  fs.writeFileSync(envFile, 'REDFOX_API_KEY=secret-before\nCONTENT_WORKSPACE_ROOT=/outside/content\nDATA_DIR=/old-data\nPORT=9000\n', { mode: 0o600 });
  fs.writeFileSync(managedKeyPath, 'managed-key-before\n', { mode: 0o600 });
  const database = new Database(dbPath);
  database.pragma('journal_mode = WAL');
  database.exec(`
    CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL);
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at INTEGER, created_at INTEGER);
  `);
  database.prepare('INSERT INTO notes (title) VALUES (?)').run('备份前内容');
  database.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run('old-session', 'owner', Date.now() + 60000, Date.now());
  const manager = make({ database, dbPath, envFile, dataRoot, managedKeyPath, appVersion: '0.5.0-test' });
  return { root, dataRoot, dbPath, envFile, managedKeyPath, database, manager };
}

test('受管备份生成一致性 SQLite、私有配置和可重复校验清单', async () => {
  const item = fixture();
  try {
    const backup = await item.manager.createBackup({ trigger: 'manual', now: Date.UTC(2026, 7, 4, 2, 3, 4) });
    assert.match(backup.id, /^backup-20260804-020304-[a-f0-9]{6}$/);
    assert.equal(backup.configIncluded, true);
    assert.ok(backup.totalSize > 0);

    item.database.prepare('INSERT INTO notes (title) VALUES (?)').run('备份后内容');
    const verified = await item.manager.verifyBackup(backup.id, { now: Date.UTC(2026, 7, 4, 3, 4, 5) });
    assert.equal(verified.status, 'verified');
    assert.equal(verified.files.length, 3);

    const backupDatabase = new Database(verified.files.find(file => file.name === 'cache.db').filename, { readonly: true });
    assert.equal(backupDatabase.prepare('SELECT COUNT(*) AS count FROM notes').get().count, 1);
    backupDatabase.close();

    const manifest = JSON.parse(fs.readFileSync(path.join(verified.directory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.scope.contentWorkspace, false);
    assert.equal(manifest.scope.logs, false);
    assert.equal(manifest.lastVerifiedAt, '2026-08-04T03:04:05.000Z');
    assert.equal(fs.statSync(verified.directory).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(verified.directory, 'config.env')).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.join(verified.directory, 'kb-encryption.key')).mode & 0o777, 0o600);
  } finally {
    item.database.close();
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('校验拒绝被修改的配置副本且不读取外部路径', async () => {
  const item = fixture();
  try {
    const backup = await item.manager.createBackup();
    const directory = path.join(item.dataRoot, 'backups', backup.id);
    fs.appendFileSync(path.join(directory, 'config.env'), 'LLM_API_KEY=tampered\n');
    await assert.rejects(
      item.manager.verifyBackup(backup.id),
      error => error instanceof BackupError && error.code === 'BACKUP_SIZE_MISMATCH',
    );
    const status = item.manager.listBackups();
    assert.equal(status.scope.contentWorkspace, false);
    assert.equal(Object.hasOwn(status, 'backupRoot'), false);
  } finally {
    item.database.close();
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('并发点击备份时只执行一个任务', async () => {
  const item = fixture();
  const originalBackup = item.database.backup.bind(item.database);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  item.database.backup = async filename => {
    await gate;
    return originalBackup(filename);
  };
  try {
    const first = item.manager.createBackup();
    await assert.rejects(
      item.manager.createBackup(),
      error => error instanceof BackupError && error.code === 'BACKUP_BUSY',
    );
    release();
    await first;
    assert.equal(item.manager.listBackups().count, 1);
  } finally {
    release();
    item.database.close();
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('恢复替换数据库和配置、撤销旧会话并保持外部内容不变', async () => {
  const item = fixture();
  const externalContent = path.join(item.root, 'outside-content.md');
  fs.writeFileSync(externalContent, '原始内容不可修改\n');
  try {
    const backup = await item.manager.createBackup();
    const verified = await item.manager.verifyBackup(backup.id, { touch: false });
    item.database.prepare('INSERT INTO notes (title) VALUES (?)').run('稍后删除的内容');
    item.database.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run('new-session', 'owner', Date.now() + 60000, Date.now());
    item.database.close();
    fs.writeFileSync(item.envFile, 'REDFOX_API_KEY=secret-after\nDATA_DIR=/current-data\nPORT=8080\n', { mode: 0o600 });
    fs.writeFileSync(item.managedKeyPath, 'managed-key-after\n', { mode: 0o600 });

    const result = restoreBackupFiles({
      verified,
      dbPath: item.dbPath,
      envFile: item.envFile,
      managedKeyPath: item.managedKeyPath,
      includeConfig: true,
    });
    assert.equal(result.databaseRestored, true);
    assert.equal(result.configurationRestored, true);
    assert.equal(result.sessionsRevoked, true);
    assert.equal(result.encryptionKeyRestored, true);

    const restored = new Database(item.dbPath);
    assert.deepEqual(restored.prepare('SELECT title FROM notes ORDER BY id').all(), [{ title: '备份前内容' }]);
    assert.equal(restored.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
    restored.close();
    assert.match(fs.readFileSync(item.envFile, 'utf8'), /REDFOX_API_KEY=secret-before/);
    assert.match(fs.readFileSync(item.envFile, 'utf8'), /DATA_DIR=\/current-data/);
    assert.match(fs.readFileSync(item.envFile, 'utf8'), /PORT=8080/);
    assert.equal(fs.readFileSync(item.managedKeyPath, 'utf8'), 'managed-key-before\n');
    assert.equal(fs.readFileSync(externalContent, 'utf8'), '原始内容不可修改\n');
  } finally {
    try { item.database.close(); } catch {}
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('恢复准备阶段校验失败时保持当前数据库且清理临时文件', async () => {
  const item = fixture();
  try {
    const backup = await item.manager.createBackup();
    const verified = await item.manager.verifyBackup(backup.id, { touch: false });
    verified.files.find(file => file.name === 'cache.db').sha256 = '0'.repeat(64);
    item.database.prepare('INSERT INTO notes (title) VALUES (?)').run('当前数据');
    item.database.close();

    assert.throws(
      () => restoreBackupFiles({
        verified,
        dbPath: item.dbPath,
        envFile: item.envFile,
        managedKeyPath: item.managedKeyPath,
      }),
      error => error instanceof BackupError && error.code === 'BACKUP_RESTORE_FAILED',
    );
    const current = new Database(item.dbPath);
    assert.equal(current.prepare('SELECT COUNT(*) AS count FROM notes').get().count, 2);
    current.close();
    assert.deepEqual(fs.readdirSync(item.dataRoot).filter(name => name.includes('.restore-')), []);
  } finally {
    try { item.database.close(); } catch {}
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('恢复后置校验失败时原子回滚数据库、配置和密钥', async () => {
  const item = fixture();
  try {
    item.database.exec(`
      CREATE TRIGGER reject_session_delete
      BEFORE DELETE ON sessions
      BEGIN SELECT RAISE(ABORT, 'sessions locked'); END;
    `);
    const backup = await item.manager.createBackup();
    const verified = await item.manager.verifyBackup(backup.id, { touch: false });
    item.database.exec('DROP TRIGGER reject_session_delete');
    item.database.prepare('INSERT INTO notes (title) VALUES (?)').run('必须保留的当前数据');
    item.database.close();
    fs.writeFileSync(item.envFile, 'REDFOX_API_KEY=current-config\n', { mode: 0o600 });
    fs.writeFileSync(item.managedKeyPath, 'current-managed-key\n', { mode: 0o600 });

    assert.throws(
      () => restoreBackupFiles({
        verified,
        dbPath: item.dbPath,
        envFile: item.envFile,
        managedKeyPath: item.managedKeyPath,
      }),
      error => error instanceof BackupError && error.code === 'BACKUP_RESTORE_FAILED',
    );
    const current = new Database(item.dbPath);
    assert.equal(current.prepare('SELECT COUNT(*) AS count FROM notes').get().count, 2);
    assert.equal(current.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'trigger' AND name = 'reject_session_delete'").get().count, 0);
    current.close();
    assert.match(fs.readFileSync(item.envFile, 'utf8'), /current-config/);
    assert.equal(fs.readFileSync(item.managedKeyPath, 'utf8'), 'current-managed-key\n');
    assert.deepEqual(fs.readdirSync(item.dataRoot).filter(name => name.includes('.restore-')), []);
  } finally {
    try { item.database.close(); } catch {}
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('备份目录只接受合法编号并识别旧版散装文件', () => {
  const item = fixture();
  try {
    const backupRoot = path.join(item.dataRoot, 'backups');
    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(path.join(backupRoot, 'cache-before-upgrade.db'), 'legacy');
    const status = item.manager.listBackups();
    assert.equal(status.legacyCount, 1);
    assert.throws(
      () => item.manager.inspectBackup('../../outside'),
      error => error instanceof BackupError && error.code === 'BACKUP_ID_INVALID',
    );
  } finally {
    item.database.close();
    fs.rmSync(item.root, { recursive: true, force: true });
  }
});

test('配置恢复只保留当前运行位置并恢复业务配置', () => {
  const merged = mergeEnvForRestore(
    'DATA_DIR=/backup-data\nPORT=9000\nREDFOX_API_KEY=old-key\nCONTENT_WORKSPACE_ROOT=/old-content\n',
    'DATA_DIR=/current-data\nHOST=127.0.0.1\nPORT=8080\nREDFOX_API_KEY=new-key\n',
  );
  assert.match(merged, /^DATA_DIR=\/current-data$/m);
  assert.match(merged, /^HOST=127\.0\.0\.1$/m);
  assert.match(merged, /^PORT=8080$/m);
  assert.match(merged, /^REDFOX_API_KEY=old-key$/m);
  assert.match(merged, /^CONTENT_WORKSPACE_ROOT=\/old-content$/m);
  assert.doesNotMatch(merged, /backup-data|new-key/);
});
