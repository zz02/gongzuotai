const { json } = require('../http');

async function tryRoute(req, res, url, ctx = {}) {
  if (url.pathname !== '/api/_/diagnostics') return false;
  if (req.method !== 'GET') {
    json(res, 405, { ok: false, error: '系统诊断仅支持查询。', code: 'DIAGNOSTICS_METHOD_NOT_ALLOWED' }, { Allow: 'GET' });
    return true;
  }
  if (!ctx.diagnostics) {
    json(res, 503, { ok: false, error: '系统诊断尚未初始化。', code: 'DIAGNOSTICS_UNAVAILABLE' });
    return true;
  }
  try {
    json(res, 200, { ok: true, data: ctx.diagnostics.run() });
  } catch {
    json(res, 500, { ok: false, error: '系统诊断暂时无法完成，请稍后重试。', code: 'DIAGNOSTICS_FAILED' });
  }
  return true;
}

module.exports = { tryRoute };
