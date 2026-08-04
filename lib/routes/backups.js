const { json } = require('../http');

function sendError(res, error) {
  json(res, Number(error?.status) || 500, {
    ok: false,
    error: error?.message || '数据备份操作失败。',
    code: error?.code || 'BACKUP_ERROR',
  });
}

async function tryRoute(req, res, url, ctx = {}) {
  const base = '/api/_/backups';
  const { backupManager, logAction } = ctx;
  if (!url.pathname.startsWith(base)) return false;
  if (!backupManager) {
    json(res, 503, { ok: false, error: '数据保护服务尚未初始化。', code: 'BACKUP_UNAVAILABLE' });
    return true;
  }

  if (url.pathname === base && req.method === 'GET') {
    try { json(res, 200, { ok: true, data: backupManager.listBackups() }); }
    catch (error) { sendError(res, error); }
    return true;
  }

  if (url.pathname === base && req.method === 'POST') {
    try {
      const backup = await backupManager.createBackup({ trigger: 'manual' });
      logAction?.('data_backup', 'manual', 'local-database', { backupId: backup.id }, 0, 0);
      json(res, 201, { ok: true, data: backup });
    } catch (error) { sendError(res, error); }
    return true;
  }

  const verifyMatch = url.pathname.match(/^\/api\/_\/backups\/(backup-\d{8}-\d{6}-[a-f0-9]{6})\/verify$/);
  if (verifyMatch && req.method === 'POST') {
    try {
      const verified = await backupManager.verifyBackup(verifyMatch[1]);
      const { directory: _directory, files: _files, ...backup } = verified;
      logAction?.('data_backup_verify', 'manual', 'local-backup', { backupId: backup.id }, 0, 0);
      json(res, 200, { ok: true, data: backup });
    } catch (error) { sendError(res, error); }
    return true;
  }

  json(res, 404, { ok: false, error: '备份操作不存在。', code: 'BACKUP_ROUTE_NOT_FOUND' });
  return true;
}

module.exports = { tryRoute };
