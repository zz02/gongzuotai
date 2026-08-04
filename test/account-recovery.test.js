const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const Database = require('better-sqlite3');
const { hashPassword, verifyPassword } = require('../lib/password');
const {
  AccountRecoveryError,
  resetUserPassword,
} = require('../lib/account-recovery');

function recoveryDatabase(filename = ':memory:') {
  const database = new Database(filename);
  database.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      last_login_at INTEGER,
      password_changed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  const now = Date.now();
  database.prepare(`
    INSERT INTO users
      (id, username, display_name, password_hash, role, must_change_password, password_changed_at, created_at, updated_at)
    VALUES ('owner-1', 'admin', '管理员', ?, 'owner', 0, ?, ?, ?)
  `).run(hashPassword('OldPass88'), now, now, now);
  database.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run('active-session', 'owner-1', now + 60000, now);
  return database;
}

test('密码恢复更新哈希并撤销该账号全部会话', () => {
  const database = recoveryDatabase();
  const changedAt = Date.UTC(2026, 7, 4, 1, 2, 3);
  const result = resetUserPassword(database, {
    username: 'ADMIN',
    password: 'NewPass88',
    confirmPassword: 'NewPass88',
  }, changedAt);

  const user = database.prepare('SELECT * FROM users WHERE id = ?').get('owner-1');
  assert.equal(verifyPassword('OldPass88', user.password_hash), false);
  assert.equal(verifyPassword('NewPass88', user.password_hash), true);
  assert.equal(user.password_changed_at, changedAt);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
  assert.equal(result.revokedSessions, 1);
  database.close();
});

test('密码恢复拒绝未知账号、弱密码、不一致与原密码', () => {
  const cases = [
    [{ username: 'missing', password: 'NewPass88', confirmPassword: 'NewPass88' }, 'ACCOUNT_NOT_FOUND'],
    [{ username: 'admin', password: 'short', confirmPassword: 'short' }, 'INPUT_INVALID'],
    [{ username: 'admin', password: 'NewPass88', confirmPassword: 'OtherPass88' }, 'PASSWORD_MISMATCH'],
    [{ username: 'admin', password: 'OldPass88', confirmPassword: 'OldPass88' }, 'PASSWORD_UNCHANGED'],
  ];
  for (const [input, code] of cases) {
    const database = recoveryDatabase();
    assert.throws(() => resetUserPassword(database, input), error => {
      assert.equal(error instanceof AccountRecoveryError, true);
      assert.equal(error.code, code);
      return true;
    });
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 1);
    database.close();
  }
});

test('密码恢复命令从标准输入读取密码并先创建数据库备份', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-password-reset-'));
  const database = recoveryDatabase(path.join(dataDir, 'cache.db'));
  database.close();
  const envFile = path.join(dataDir, '.env');
  fs.writeFileSync(envFile, '', { mode: 0o600 });

  const result = spawnSync(process.execPath, ['scripts/reset-password.js', '--username', 'admin'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      INSPRIRA_ENV_FILE: envFile,
      NODE_ENV: 'test',
    },
    input: 'CliPass88\nCliPass88\n',
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /密码已更新/);
  assert.doesNotMatch(result.stdout, /CliPass88/);

  const reopened = new Database(path.join(dataDir, 'cache.db'));
  const user = reopened.prepare('SELECT password_hash FROM users WHERE username = ?').get('admin');
  assert.equal(verifyPassword('CliPass88', user.password_hash), true);
  assert.equal(reopened.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
  reopened.close();
  const backups = fs.readdirSync(path.join(dataDir, 'backups')).filter(name => name.endsWith('.db'));
  assert.equal(backups.length, 1);
});
