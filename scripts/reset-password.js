#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const { loadEnvFile } = require('../lib/env');
const envFile = process.env.INSPRIRA_ENV_FILE
  ? path.resolve(process.env.INSPRIRA_ENV_FILE)
  : path.join(APP_ROOT, '.env');
loadEnvFile(envFile);

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || '').trim() : '';
}

function timestamp() {
  return new Date().toISOString().replace('T', '-').replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('用法：scripts/reset-password.sh [--username 登录账号]\n');
    return;
  }
  const username = argumentValue(args, '--username');
  if (!username) throw new Error('缺少 --username 登录账号');

  const lines = fs.readFileSync(0, 'utf8').split(/\r?\n/);
  const password = lines[0] || '';
  const confirmPassword = lines[1] || '';

  const { db, DATA_ROOT, DB_PATH } = require('../lib/db');
  const { preparePasswordReset, applyPasswordReset } = require('../lib/account-recovery');
  try {
    const prepared = preparePasswordReset(db, { username, password, confirmPassword });
    const backupDir = path.join(DATA_ROOT, 'backups');
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const backupPath = path.join(backupDir, `cache-before-password-reset-${timestamp()}.db`);
    await db.backup(backupPath);
    fs.chmodSync(backupPath, 0o600);

    const result = applyPasswordReset(db, prepared);
    process.stdout.write(`账号“${result.username}”的密码已更新，已撤销 ${result.revokedSessions} 个登录会话。\n`);
    process.stdout.write(`数据库备份：${backupPath}\n`);
    process.stdout.write('请回到登录页使用新密码登录。\n');
    process.stdout.write(`数据文件：${DB_PATH}\n`);
  } finally {
    db.close();
  }
}

main().catch(error => {
  process.stderr.write(`[ERROR] ${error.message}\n`);
  process.exitCode = 1;
});
