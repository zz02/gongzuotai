#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

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

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('用法：node scripts/restore-backup.js <备份编号> --confirm <同一备份编号> [--database-only]\n');
    return;
  }
  const backupId = String(args[0] || '').trim();
  if (!backupId || backupId.startsWith('-')) throw new Error('缺少备份编号');
  if (argumentValue(args, '--confirm') !== backupId) {
    throw new Error('恢复确认失败；--confirm 后必须再次填写同一备份编号');
  }
  const includeConfig = !args.includes('--database-only');
  const dataRoot = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(APP_ROOT, 'data');
  const dbPath = process.env.CACHE_DB_PATH ? path.resolve(process.env.CACHE_DB_PATH) : path.join(dataRoot, 'cache.db');
  const managedKeyPath = path.join(dataRoot, 'kb-encryption.key');
  if (!fs.existsSync(dbPath)) throw new Error(`当前数据库不存在：${dbPath}`);

  const { make, restoreBackupFiles } = require('../lib/backups');
  const database = new Database(dbPath);
  const manager = make({
    database,
    dbPath,
    envFile,
    dataRoot,
    appVersion: require('../package.json').version,
  });

  let verified;
  let safetyBackup;
  try {
    verified = await manager.verifyBackup(backupId, { touch: false });
    safetyBackup = await manager.createBackup({ trigger: 'pre-restore' });
  } finally {
    database.close();
  }

  const service = require('./macos-service');
  const port = service.configuredPort();
  const health = await service.healthCheck(port, 600);
  const managed = process.platform === 'darwin' && service.isLoaded();
  if (health.ok && !managed) {
    throw new Error('检测到未受 macOS 托管的运行中服务。请先停止服务，再重新执行恢复命令');
  }

  let stoppedManagedService = false;
  try {
    if (managed) {
      service.stopService();
      stoppedManagedService = true;
      const stopped = await service.waitForStopped(port);
      if (!stopped) throw new Error('服务未能在限定时间内停止，尚未修改任何数据');
    }

    const result = restoreBackupFiles({ verified, dbPath, envFile, managedKeyPath, includeConfig });
    process.stdout.write(`备份已恢复：${result.backupId}\n`);
    process.stdout.write(`恢复前安全快照：${safetyBackup.id}\n`);
    process.stdout.write(`配置文件：${result.configurationRestored ? '已恢复' : '保持当前版本'}\n`);
    process.stdout.write(`知识库密钥：${result.encryptionKeyRestored ? '已恢复' : '保持当前版本'}\n`);
    process.stdout.write('历史登录会话已全部撤销。\n');

    if (stoppedManagedService) {
      service.startService(service.launchAgentPaths().plistPath);
      const restartPort = service.configuredPort();
      const restarted = await service.waitForHealth(restartPort);
      if (!restarted.ok) throw new Error(`数据已恢复，但服务启动失败：${restarted.error}`);
      process.stdout.write(`服务已恢复运行：Insprira v${restarted.version}\n`);
    } else {
      process.stdout.write('请重新启动 Insprira，并使用账号密码登录。\n');
    }
  } catch (error) {
    if (stoppedManagedService) {
      try {
        service.startService(service.launchAgentPaths().plistPath);
        await service.waitForHealth(port, 10000);
      } catch {}
    }
    throw error;
  }
}

main().catch(error => {
  process.stderr.write(`[ERROR] ${error.message}\n`);
  process.exitCode = 1;
});
