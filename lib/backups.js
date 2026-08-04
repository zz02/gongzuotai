const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_ID_PATTERN = /^backup-\d{8}-\d{6}-[a-f0-9]{6}$/;
const ALLOWED_PAYLOADS = new Set(['cache.db', 'config.env', 'kb-encryption.key']);
const MIN_FREE_BYTES = 16 * 1024 * 1024;
const PRESERVED_ENV_KEYS = new Set(['DATA_DIR', 'CACHE_DB_PATH', 'INSPRIRA_ENV_FILE', 'HOST', 'PORT']);

class BackupError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
    this.status = status;
  }
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeId(value) {
  const id = String(value || '').trim();
  if (!BACKUP_ID_PATTERN.test(id)) {
    throw new BackupError('BACKUP_ID_INVALID', '备份编号无效。');
  }
  return id;
}

function timestampId(now = Date.now(), entropy = crypto.randomBytes(3).toString('hex')) {
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `backup-${stamp}-${String(entropy).toLowerCase()}`;
}

function ensurePrivateDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new BackupError('BACKUP_ROOT_UNSAFE', '备份目录不是安全的本机目录。', 500);
  }
  fs.chmodSync(directory, 0o700);
  return fs.realpathSync(directory);
}

function fileSha256(filename) {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(filename, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytes = 0;
    do {
      bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytes) hash.update(buffer.subarray(0, bytes));
    } while (bytes);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
}

function verifySqlite(filename) {
  let database;
  try {
    database = new Database(filename, { readonly: true, fileMustExist: true });
    const rows = database.pragma('quick_check');
    const messages = rows.map(row => String(row.quick_check || Object.values(row)[0] || ''));
    if (messages.length !== 1 || messages[0].toLowerCase() !== 'ok') {
      throw new BackupError('BACKUP_DATABASE_INVALID', `数据库校验失败：${messages.join('；') || '未知错误'}`, 422);
    }
    database.prepare('SELECT COUNT(*) AS count FROM sqlite_master').get();
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError('BACKUP_DATABASE_INVALID', `数据库校验失败：${error.message}`, 422);
  } finally {
    try { database?.close(); } catch {}
  }
  return true;
}

function removeSqliteSidecars(filename) {
  for (const suffix of ['-wal', '-shm']) {
    try { fs.rmSync(`${filename}${suffix}`, { force: true }); } catch {}
  }
}

function atomicJsonWrite(filename, value) {
  const temporary = `${filename}.tmp-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, filename);
  fs.chmodSync(filename, 0o600);
}

function manifestPath(directory) {
  return path.join(directory, 'manifest.json');
}

function readManifest(directory) {
  const filename = manifestPath(directory);
  let stat;
  try { stat = fs.lstatSync(filename); } catch {
    throw new BackupError('BACKUP_MANIFEST_MISSING', '备份缺少校验清单。', 422);
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024) {
    throw new BackupError('BACKUP_MANIFEST_INVALID', '备份校验清单无效。', 422);
  }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(filename, 'utf8')); } catch {
    throw new BackupError('BACKUP_MANIFEST_INVALID', '备份校验清单无法读取。', 422);
  }
  if (manifest?.schemaVersion !== BACKUP_SCHEMA_VERSION || !BACKUP_ID_PATTERN.test(String(manifest.id || ''))) {
    throw new BackupError('BACKUP_MANIFEST_INVALID', '备份校验清单版本或编号无效。', 422);
  }
  if (!Array.isArray(manifest.files) || !manifest.files.length) {
    throw new BackupError('BACKUP_MANIFEST_INVALID', '备份校验清单没有文件记录。', 422);
  }
  const seen = new Set();
  for (const entry of manifest.files) {
    const name = String(entry?.name || '');
    if (!ALLOWED_PAYLOADS.has(name) || path.basename(name) !== name || seen.has(name)) {
      throw new BackupError('BACKUP_MANIFEST_INVALID', '备份校验清单包含重复或不允许的文件。', 422);
    }
    if (!Number.isSafeInteger(entry.size) || entry.size < 0 || !/^[a-f0-9]{64}$/.test(String(entry.sha256 || '').toLowerCase())) {
      throw new BackupError('BACKUP_MANIFEST_INVALID', '备份校验清单的文件记录无效。', 422);
    }
    seen.add(name);
  }
  if (!seen.has('cache.db')) {
    throw new BackupError('BACKUP_DATABASE_MISSING', '备份缺少数据库快照。', 422);
  }
  return manifest;
}

function mergeEnvForRestore(backupText, currentText) {
  const currentValues = new Map();
  for (const line of String(currentText || '').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && PRESERVED_ENV_KEYS.has(match[1])) currentValues.set(match[1], match[2]);
  }
  const emitted = new Set();
  const lines = [];
  for (const line of String(backupText || '').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match || !PRESERVED_ENV_KEYS.has(match[1])) {
      lines.push(line);
      continue;
    }
    const key = match[1];
    if (emitted.has(key)) continue;
    emitted.add(key);
    if (currentValues.has(key)) lines.push(`${key}=${currentValues.get(key)}`);
  }
  for (const [key, value] of currentValues) {
    if (!emitted.has(key)) lines.push(`${key}=${value}`);
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

function assertSafePayload(directory, entry) {
  const name = String(entry?.name || '');
  if (!ALLOWED_PAYLOADS.has(name) || path.basename(name) !== name) {
    throw new BackupError('BACKUP_MANIFEST_INVALID', '备份清单包含不允许的文件。', 422);
  }
  const filename = path.join(directory, name);
  const realDirectory = fs.realpathSync(directory);
  let stat;
  try { stat = fs.lstatSync(filename); } catch {
    throw new BackupError('BACKUP_FILE_MISSING', `备份文件“${name}”不存在。`, 422);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new BackupError('BACKUP_FILE_UNSAFE', `备份文件“${name}”不是安全的普通文件。`, 422);
  }
  const real = fs.realpathSync(filename);
  if (!isInside(realDirectory, real)) {
    throw new BackupError('BACKUP_FILE_UNSAFE', `备份文件“${name}”超出备份目录。`, 422);
  }
  if (!Number.isSafeInteger(entry.size) || entry.size < 0 || stat.size !== entry.size) {
    throw new BackupError('BACKUP_SIZE_MISMATCH', `备份文件“${name}”大小与清单不一致。`, 422);
  }
  const expectedHash = String(entry.sha256 || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || fileSha256(real) !== expectedHash) {
    throw new BackupError('BACKUP_HASH_MISMATCH', `备份文件“${name}”校验失败。`, 422);
  }
  return { name, filename: real, size: stat.size, sha256: expectedHash };
}

function publicSummary(manifest) {
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  return {
    id: manifest.id,
    createdAt: manifest.createdAt,
    appVersion: manifest.appVersion,
    trigger: manifest.trigger,
    databaseSize: files.find(file => file.name === 'cache.db')?.size || 0,
    configIncluded: files.some(file => file.name === 'config.env'),
    encryptionKeyIncluded: files.some(file => file.name === 'kb-encryption.key'),
    totalSize: files.reduce((sum, file) => sum + (Number(file.size) || 0), 0),
    lastVerifiedAt: manifest.lastVerifiedAt || manifest.createdAt,
    status: 'verified',
  };
}

function statFreeBytes(directory) {
  try {
    const stats = fs.statfsSync(directory);
    return Number(stats.bavail) * Number(stats.bsize);
  } catch {
    return null;
  }
}

function make(options) {
  const database = options.database || null;
  const dbPath = path.resolve(options.dbPath);
  const envFile = path.resolve(options.envFile);
  const dataRoot = path.resolve(options.dataRoot);
  const managedKeyPath = path.resolve(options.managedKeyPath || path.join(dataRoot, 'kb-encryption.key'));
  const appVersion = String(options.appVersion || '0.0.0');
  const backupRoot = path.join(dataRoot, 'backups');
  let activeBackup = null;

  function readyRoot() {
    const realDataRoot = ensurePrivateDirectory(dataRoot);
    const realBackupRoot = ensurePrivateDirectory(backupRoot);
    if (!isInside(realDataRoot, realBackupRoot)) {
      throw new BackupError('BACKUP_ROOT_UNSAFE', '备份目录超出应用数据目录。', 500);
    }
    return realBackupRoot;
  }

  function directoryFor(id) {
    const root = readyRoot();
    const directory = path.join(root, safeId(id));
    let stat;
    try { stat = fs.lstatSync(directory); } catch {
      throw new BackupError('BACKUP_NOT_FOUND', '备份不存在或已经移除。', 404);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new BackupError('BACKUP_DIRECTORY_UNSAFE', '备份目录无效。', 422);
    }
    const real = fs.realpathSync(directory);
    if (!isInside(root, real)) {
      throw new BackupError('BACKUP_DIRECTORY_UNSAFE', '备份目录超出允许范围。', 422);
    }
    return real;
  }

  function inspectBackup(id) {
    const directory = directoryFor(id);
    const manifest = readManifest(directory);
    if (manifest.id !== id) {
      throw new BackupError('BACKUP_MANIFEST_INVALID', '备份目录与清单编号不一致。', 422);
    }
    return { directory, manifest, summary: publicSummary(manifest) };
  }

  async function verifyBackup(id, { touch = true, now = Date.now() } = {}) {
    const inspected = inspectBackup(safeId(id));
    const files = inspected.manifest.files.map(entry => assertSafePayload(inspected.directory, entry));
    const databaseFile = files.find(file => file.name === 'cache.db');
    if (!databaseFile) {
      throw new BackupError('BACKUP_DATABASE_MISSING', '备份缺少数据库快照。', 422);
    }
    verifySqlite(databaseFile.filename);
    removeSqliteSidecars(databaseFile.filename);
    if (touch) {
      inspected.manifest.lastVerifiedAt = new Date(now).toISOString();
      atomicJsonWrite(manifestPath(inspected.directory), inspected.manifest);
    }
    return {
      ...publicSummary(inspected.manifest),
      directory: inspected.directory,
      files,
    };
  }

  function listBackups() {
    const root = readyRoot();
    const backups = [];
    let legacyCount = 0;
    let legacySize = 0;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const filename = path.join(root, entry.name);
      if (entry.isDirectory() && BACKUP_ID_PATTERN.test(entry.name)) {
        try {
          backups.push(inspectBackup(entry.name).summary);
        } catch (error) {
          backups.push({
            id: entry.name,
            createdAt: null,
            appVersion: null,
            trigger: 'unknown',
            databaseSize: 0,
            configIncluded: false,
            totalSize: 0,
            lastVerifiedAt: null,
            status: 'invalid',
            error: error.message,
          });
        }
        continue;
      }
      if (entry.name.startsWith('.creating-')) continue;
      if (entry.isFile()) {
        legacyCount += 1;
        try { legacySize += fs.statSync(filename).size; } catch {}
      }
    }
    backups.sort((a, b) => String(b.createdAt || b.id).localeCompare(String(a.createdAt || a.id)));
    const managedSize = backups.reduce((sum, item) => sum + (item.totalSize || 0), 0);
    return {
      backups,
      count: backups.length,
      managedSize,
      legacyCount,
      legacySize,
      availableBytes: statFreeBytes(root),
      active: Boolean(activeBackup),
      scope: {
        database: true,
        configuration: fs.existsSync(envFile),
        encryptionKey: fs.existsSync(managedKeyPath),
        contentWorkspace: false,
        logs: false,
      },
    };
  }

  async function createBackup({ trigger = 'manual', now = Date.now() } = {}) {
    if (!database || typeof database.backup !== 'function') {
      throw new BackupError('BACKUP_DATABASE_UNAVAILABLE', '数据库暂时无法创建一致性备份。', 503);
    }
    if (activeBackup) {
      throw new BackupError('BACKUP_BUSY', '已有备份任务正在执行，请稍后再试。', 409);
    }
    const allowedTriggers = new Set(['manual', 'pre-restore', 'password-reset', 'upgrade']);
    if (!allowedTriggers.has(trigger)) {
      throw new BackupError('BACKUP_TRIGGER_INVALID', '备份来源无效。');
    }
    activeBackup = (async () => {
      const root = readyRoot();
      const id = timestampId(now);
      const stage = path.join(root, `.creating-${id}-${process.pid}`);
      const destination = path.join(root, id);
      const databaseTarget = path.join(stage, 'cache.db');
      try {
        if (fs.existsSync(destination)) {
          throw new BackupError('BACKUP_ALREADY_EXISTS', '同一时间的备份已存在，请稍后重试。', 409);
        }
        fs.mkdirSync(stage, { mode: 0o700 });
        const sourceSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
        const availableBytes = statFreeBytes(root);
        if (availableBytes != null && availableBytes < Math.max(MIN_FREE_BYTES, sourceSize * 2)) {
          throw new BackupError('BACKUP_SPACE_LOW', '可用磁盘空间不足，无法安全创建备份。', 507);
        }
        await database.backup(databaseTarget);
        fs.chmodSync(databaseTarget, 0o600);
        verifySqlite(databaseTarget);
        removeSqliteSidecars(databaseTarget);

        const files = [{
          name: 'cache.db',
          size: fs.statSync(databaseTarget).size,
          sha256: fileSha256(databaseTarget),
        }];
        if (fs.existsSync(envFile)) {
          const envTarget = path.join(stage, 'config.env');
          fs.copyFileSync(envFile, envTarget, fs.constants.COPYFILE_EXCL);
          fs.chmodSync(envTarget, 0o600);
          files.push({
            name: 'config.env',
            size: fs.statSync(envTarget).size,
            sha256: fileSha256(envTarget),
          });
        }
        if (fs.existsSync(managedKeyPath)) {
          const keyTarget = path.join(stage, 'kb-encryption.key');
          const keyStat = fs.lstatSync(managedKeyPath);
          if (!keyStat.isFile() || keyStat.isSymbolicLink()) {
            throw new BackupError('BACKUP_KEY_UNSAFE', '知识库加密密钥不是安全的普通文件。', 422);
          }
          fs.copyFileSync(managedKeyPath, keyTarget, fs.constants.COPYFILE_EXCL);
          fs.chmodSync(keyTarget, 0o600);
          files.push({
            name: 'kb-encryption.key',
            size: fs.statSync(keyTarget).size,
            sha256: fileSha256(keyTarget),
          });
        }

        const createdAt = new Date(now).toISOString();
        const manifest = {
          schemaVersion: BACKUP_SCHEMA_VERSION,
          id,
          createdAt,
          appVersion,
          trigger,
          lastVerifiedAt: createdAt,
          files,
          scope: {
            database: true,
            configuration: files.some(file => file.name === 'config.env'),
            encryptionKey: files.some(file => file.name === 'kb-encryption.key'),
            contentWorkspace: false,
            logs: false,
          },
        };
        atomicJsonWrite(manifestPath(stage), manifest);
        fs.renameSync(stage, destination);
        const verified = await verifyBackup(id, { touch: false });
        return publicSummary({ ...manifest, lastVerifiedAt: verified.lastVerifiedAt });
      } catch (error) {
        try { fs.rmSync(stage, { recursive: true, force: true }); } catch {}
        if (error instanceof BackupError) throw error;
        throw new BackupError('BACKUP_CREATE_FAILED', `创建备份失败：${error.message}`, 500);
      }
    })();
    try {
      return await activeBackup;
    } finally {
      activeBackup = null;
    }
  }

  return {
    backupRoot,
    listBackups,
    createBackup,
    inspectBackup,
    verifyBackup,
  };
}

function restoreBackupFiles({ verified, dbPath, envFile, managedKeyPath, includeConfig = true, now = Date.now() }) {
  const targetDatabase = path.resolve(dbPath);
  const targetEnv = path.resolve(envFile);
  const targetManagedKey = path.resolve(managedKeyPath || path.join(path.dirname(targetDatabase), 'kb-encryption.key'));
  const databasePayload = verified.files.find(file => file.name === 'cache.db');
  const configPayload = verified.files.find(file => file.name === 'config.env');
  const keyPayload = verified.files.find(file => file.name === 'kb-encryption.key');
  if (!databasePayload) throw new BackupError('BACKUP_DATABASE_MISSING', '备份缺少数据库快照。', 422);

  const suffix = `${process.pid}-${new Date(now).toISOString().replace(/\D/g, '').slice(0, 14)}`;
  const databaseTemp = `${targetDatabase}.restore-${suffix}.tmp`;
  const databaseRollback = `${targetDatabase}.restore-${suffix}.rollback`;
  const walRollback = `${databaseRollback}-wal`;
  const shmRollback = `${databaseRollback}-shm`;
  const envTemp = `${targetEnv}.restore-${suffix}.tmp`;
  const envRollback = `${targetEnv}.restore-${suffix}.rollback`;
  const keyTemp = `${targetManagedKey}.restore-${suffix}.tmp`;
  const keyRollback = `${targetManagedKey}.restore-${suffix}.rollback`;
  let databaseMoved = false;
  let envMoved = false;
  let keyMoved = false;
  let databaseInstalled = false;
  let envInstalled = false;
  let keyInstalled = false;
  try {
    fs.mkdirSync(path.dirname(targetDatabase), { recursive: true, mode: 0o700 });
    fs.copyFileSync(databasePayload.filename, databaseTemp, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(databaseTemp, 0o600);
    if (fileSha256(databaseTemp) !== databasePayload.sha256) {
      throw new BackupError('BACKUP_HASH_MISMATCH', '数据库快照在恢复准备阶段校验失败。', 422);
    }
    verifySqlite(databaseTemp);
    removeSqliteSidecars(databaseTemp);
    if (includeConfig && configPayload) {
      fs.mkdirSync(path.dirname(targetEnv), { recursive: true, mode: 0o700 });
      if (fileSha256(configPayload.filename) !== configPayload.sha256) {
        throw new BackupError('BACKUP_HASH_MISMATCH', '配置副本在恢复准备阶段校验失败。', 422);
      }
      const backupConfig = fs.readFileSync(configPayload.filename, 'utf8');
      const currentConfig = fs.existsSync(targetEnv) && fs.lstatSync(targetEnv).isFile()
        ? fs.readFileSync(targetEnv, 'utf8')
        : '';
      fs.writeFileSync(envTemp, mergeEnvForRestore(backupConfig, currentConfig), { mode: 0o600, flag: 'wx' });
      fs.chmodSync(envTemp, 0o600);
    }
    if (includeConfig && keyPayload) {
      fs.mkdirSync(path.dirname(targetManagedKey), { recursive: true, mode: 0o700 });
      fs.copyFileSync(keyPayload.filename, keyTemp, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(keyTemp, 0o600);
      if (fileSha256(keyTemp) !== keyPayload.sha256) {
        throw new BackupError('BACKUP_HASH_MISMATCH', '知识库加密密钥在恢复准备阶段校验失败。', 422);
      }
    }

    if (fs.existsSync(targetDatabase)) {
      fs.renameSync(targetDatabase, databaseRollback);
      databaseMoved = true;
    }
    if (fs.existsSync(`${targetDatabase}-wal`)) fs.renameSync(`${targetDatabase}-wal`, walRollback);
    if (fs.existsSync(`${targetDatabase}-shm`)) fs.renameSync(`${targetDatabase}-shm`, shmRollback);
    fs.renameSync(databaseTemp, targetDatabase);
    databaseInstalled = true;

    if (includeConfig && configPayload) {
      if (fs.existsSync(targetEnv)) {
        fs.renameSync(targetEnv, envRollback);
        envMoved = true;
      }
      fs.renameSync(envTemp, targetEnv);
      envInstalled = true;
      fs.chmodSync(targetEnv, 0o600);
    }
    if (includeConfig && keyPayload) {
      if (fs.existsSync(targetManagedKey)) {
        fs.renameSync(targetManagedKey, keyRollback);
        keyMoved = true;
      }
      fs.renameSync(keyTemp, targetManagedKey);
      keyInstalled = true;
      fs.chmodSync(targetManagedKey, 0o600);
    }

    const restored = new Database(targetDatabase);
    try {
      const quickCheck = restored.pragma('quick_check');
      if (String(quickCheck[0]?.quick_check || '').toLowerCase() !== 'ok') {
        throw new Error('恢复后的数据库校验失败');
      }
      const sessionsTable = restored.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sessions'").get();
      if (sessionsTable) restored.prepare('DELETE FROM sessions').run();
      restored.pragma('wal_checkpoint(TRUNCATE)');
    } finally {
      restored.close();
    }

    for (const filename of [databaseRollback, walRollback, shmRollback, envRollback, keyRollback]) {
      try { fs.rmSync(filename, { force: true }); } catch {}
    }
    return {
      backupId: verified.id,
      databaseRestored: true,
      configurationRestored: Boolean(includeConfig && configPayload),
      encryptionKeyRestored: Boolean(includeConfig && keyPayload),
      runtimeSettingsPreserved: Boolean(includeConfig && configPayload),
      sessionsRevoked: true,
    };
  } catch (error) {
    if (databaseInstalled) {
      try { fs.rmSync(targetDatabase, { force: true }); } catch {}
    }
    if (databaseMoved || databaseInstalled) {
      try { fs.rmSync(`${targetDatabase}-wal`, { force: true }); } catch {}
      try { fs.rmSync(`${targetDatabase}-shm`, { force: true }); } catch {}
    }
    if (databaseMoved && fs.existsSync(databaseRollback)) fs.renameSync(databaseRollback, targetDatabase);
    if (fs.existsSync(walRollback)) fs.renameSync(walRollback, `${targetDatabase}-wal`);
    if (fs.existsSync(shmRollback)) fs.renameSync(shmRollback, `${targetDatabase}-shm`);
    if (includeConfig && configPayload) {
      if (envInstalled) {
        try { fs.rmSync(targetEnv, { force: true }); } catch {}
      }
      if (envMoved && fs.existsSync(envRollback)) fs.renameSync(envRollback, targetEnv);
    }
    if (includeConfig && keyPayload) {
      if (keyInstalled) {
        try { fs.rmSync(targetManagedKey, { force: true }); } catch {}
      }
      if (keyMoved && fs.existsSync(keyRollback)) fs.renameSync(keyRollback, targetManagedKey);
    }
    throw new BackupError('BACKUP_RESTORE_FAILED', `恢复失败，原数据已回滚：${error.message}`, 500);
  } finally {
    for (const filename of [databaseTemp, `${databaseTemp}-wal`, `${databaseTemp}-shm`, envTemp, keyTemp]) {
      try { fs.rmSync(filename, { force: true }); } catch {}
    }
  }
}

module.exports = {
  ALLOWED_PAYLOADS,
  BACKUP_ID_PATTERN,
  BACKUP_SCHEMA_VERSION,
  BackupError,
  fileSha256,
  make,
  mergeEnvForRestore,
  removeSqliteSidecars,
  restoreBackupFiles,
  safeId,
  timestampId,
  verifySqlite,
};
