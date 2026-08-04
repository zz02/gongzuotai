#!/usr/bin/env node
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const { loadEnvFile } = require('../lib/env');
const envFile = process.env.INSPRIRA_ENV_FILE
  ? path.resolve(process.env.INSPRIRA_ENV_FILE)
  : path.join(APP_ROOT, '.env');
loadEnvFile(envFile);

function humanBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

async function main() {
  const [command = 'list', id] = process.argv.slice(2);
  if (['help', '--help', '-h'].includes(command)) {
    process.stdout.write('用法：node scripts/backup.js <create|list|verify> [备份编号]\n');
    return;
  }

  const { db, DATA_ROOT, DB_PATH } = require('../lib/db');
  const manager = require('../lib/backups').make({
    database: db,
    dbPath: DB_PATH,
    envFile,
    dataRoot: DATA_ROOT,
    appVersion: require('../package.json').version,
  });
  try {
    if (command === 'create') {
      const backup = await manager.createBackup({ trigger: 'manual' });
      process.stdout.write(`备份已创建：${backup.id}\n`);
      process.stdout.write(`数据大小：${humanBytes(backup.totalSize)}\n`);
      process.stdout.write('已完成数据库完整性与 SHA-256 校验。\n');
      return;
    }
    if (command === 'verify') {
      if (!id) throw new Error('缺少备份编号');
      const backup = await manager.verifyBackup(id);
      process.stdout.write(`备份校验通过：${backup.id}\n`);
      process.stdout.write(`数据大小：${humanBytes(backup.totalSize)}\n`);
      return;
    }
    if (command === 'list') {
      const status = manager.listBackups();
      if (!status.backups.length) {
        process.stdout.write('尚无受管备份。\n');
      } else {
        for (const backup of status.backups) {
          const created = backup.createdAt || '时间未知';
          process.stdout.write(`${backup.id}\t${created}\t${humanBytes(backup.totalSize)}\t${backup.status}\n`);
        }
      }
      if (status.legacyCount) {
        process.stdout.write(`另有 ${status.legacyCount} 个旧版散装备份，仅保留，不支持直接恢复。\n`);
      }
      return;
    }
    throw new Error(`不支持的命令：${command}`);
  } finally {
    db.close();
  }
}

main().catch(error => {
  process.stderr.write(`[ERROR] ${error.message}\n`);
  process.exitCode = 1;
});
