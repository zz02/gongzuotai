// 路由组：无损接入现有内容项目工作流。
const fs = require('fs');
const { json, readBody } = require('../http');
const { db } = require('../db');
const contentProjects = require('../content-projects');

function parseJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function loadInspirationOrigin(rawId) {
  const id = String(rawId || '').trim();
  if (!id) return null;
  if (id.length > 200 || /[\0\r\n]/.test(id)) {
    throw new contentProjects.ContentProjectError('选题标识无效。', 400, 'INVALID_ORIGIN_REF');
  }
  const row = db.prepare('SELECT * FROM inspirations WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!row) {
    throw new contentProjects.ContentProjectError('选题不存在或已移入回收站。', 404, 'INSPIRATION_NOT_FOUND');
  }
  return {
    type: 'inspiration',
    ref: row.id,
    title: row.title,
    summary: row.summary,
    angle: row.angle,
    targetPlatform: row.target_platform,
    sourceKeywords: parseJson(row.source_keywords, []),
    sourceItems: parseJson(row.source_items, []),
    sourceMode: row.source_mode || 'legacy',
    generationNote: row.generation_note || '',
    generatedBy: row.generated_by || '',
  };
}

function sendError(res, error) {
  const status = Number(error?.status) || 500;
  json(res, status, {
    ok: false,
    error: error?.message || '内容项目操作失败。',
    code: error?.code || 'CONTENT_PROJECT_ERROR',
  });
}

async function tryRoute(req, res, url, ctx = {}) {
  const base = '/api/_/content-projects';
  const { contentSkillRuns } = ctx;
  if (url.pathname === `${base}/check-workspace` && req.method === 'POST') {
    try {
      const { data } = await readBody(req);
      const root = String(data?.root || '').trim();
      if (!root) {
        json(res, 400, { ok: false, error: '内容工作区路径不能为空。', code: 'WORKSPACE_PATH_REQUIRED' });
        return true;
      }
      const result = contentProjects.workspaceConfig(root);
      if (!result.configured) {
        json(res, 422, { ok: false, error: result.message, code: 'WORKSPACE_INVALID' });
      } else {
        json(res, 200, { ok: true, data: {
          configured: true,
          workspaceRoot: result.workspaceRoot,
          projectsRoot: result.projectsRoot,
        } });
      }
    } catch (error) { sendError(res, error); }
    return true;
  }

  if (url.pathname === base && req.method === 'GET') {
    try { json(res, 200, { ok: true, data: await contentProjects.listProjects() }); }
    catch (error) { sendError(res, error); }
    return true;
  }

  if (url.pathname === `${base}/origins` && req.method === 'GET') {
    try { json(res, 200, { ok: true, data: contentProjects.listOriginLinks() }); }
    catch (error) { sendError(res, error); }
    return true;
  }

  if (url.pathname === base && req.method === 'POST') {
    try {
      const { data } = await readBody(req);
      const origin = loadInspirationOrigin(data?.inspirationId);
      const project = await contentProjects.createProject({ ...(data || {}), origin });
      if (origin) {
        db.prepare(`
          UPDATE inspirations
          SET status = CASE WHEN status = '待研究' THEN '创作中' ELSE status END,
              updated_at = ?
          WHERE id = ?
        `).run(Date.now(), origin.ref);
      }
      json(res, 201, { ok: true, data: project });
    } catch (error) { sendError(res, error); }
    return true;
  }

  const skillContextMatch = url.pathname.match(/^\/api\/_\/content-projects\/([^/]+)\/skill-context$/);
  if (skillContextMatch && req.method === 'GET') {
    try {
      if (!contentSkillRuns) throw new Error('内容 Skill 服务尚未初始化。');
      json(res, 200, { ok: true, data: await contentSkillRuns.getContext(skillContextMatch[1]) });
    } catch (error) { sendError(res, error); }
    return true;
  }

  const skillRunsMatch = url.pathname.match(/^\/api\/_\/content-projects\/([^/]+)\/skill-runs$/);
  if (skillRunsMatch) {
    if (req.method === 'GET') {
      try {
        if (!contentSkillRuns) throw new Error('内容 Skill 服务尚未初始化。');
        json(res, 200, { ok: true, data: contentSkillRuns.listRuns(skillRunsMatch[1]) });
      } catch (error) { sendError(res, error); }
      return true;
    }
    if (req.method === 'POST') {
      try {
        if (!contentSkillRuns) throw new Error('内容 Skill 服务尚未初始化。');
        const { data } = await readBody(req);
        json(res, 201, { ok: true, data: await contentSkillRuns.execute(skillRunsMatch[1], data || {}) });
      } catch (error) { sendError(res, error); }
      return true;
    }
  }

  const skillRunActionMatch = url.pathname.match(/^\/api\/_\/content-projects\/([^/]+)\/skill-runs\/([^/]+)\/(apply|discard)$/);
  if (skillRunActionMatch && req.method === 'POST') {
    try {
      if (!contentSkillRuns) throw new Error('内容 Skill 服务尚未初始化。');
      const result = skillRunActionMatch[3] === 'apply'
        ? contentSkillRuns.apply(skillRunActionMatch[1], skillRunActionMatch[2])
        : contentSkillRuns.discard(skillRunActionMatch[1], skillRunActionMatch[2]);
      json(res, 200, { ok: true, data: result });
    } catch (error) { sendError(res, error); }
    return true;
  }

  const skillRunDetailMatch = url.pathname.match(/^\/api\/_\/content-projects\/([^/]+)\/skill-runs\/([^/]+)$/);
  if (skillRunDetailMatch && req.method === 'GET') {
    try {
      if (!contentSkillRuns) throw new Error('内容 Skill 服务尚未初始化。');
      json(res, 200, { ok: true, data: contentSkillRuns.getRun(skillRunDetailMatch[1], skillRunDetailMatch[2]) });
    } catch (error) { sendError(res, error); }
    return true;
  }

  const publishMatch = url.pathname.match(/^\/api\/_\/content-projects\/([^/]+)\/publish(?:\/(.*))?$/);
  if (publishMatch && ['GET', 'HEAD'].includes(req.method)) {
    try {
      const file = contentProjects.resolvePublishFile(publishMatch[1], publishMatch[2] || '发布中心.html');
      const stat = fs.statSync(file.path);
      res.writeHead(200, {
        'Content-Type': file.contentType,
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self' data:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
      });
      if (req.method === 'HEAD') res.end();
      else fs.createReadStream(file.path).pipe(res);
    } catch (error) { sendError(res, error); }
    return true;
  }

  const actionMatch = url.pathname.match(/^\/api\/_\/content-projects\/([^/]+)\/(validate|advance)$/);
  if (actionMatch && req.method === 'POST') {
    try {
      const { data } = await readBody(req);
      const result = actionMatch[2] === 'validate'
        ? await contentProjects.validateProject(actionMatch[1], data?.target)
        : await contentProjects.advanceProject(actionMatch[1], data?.to);
      json(res, 200, { ok: true, data: result });
    } catch (error) { sendError(res, error); }
    return true;
  }

  const detailMatch = url.pathname.match(/^\/api\/_\/content-projects\/([^/]+)$/);
  if (detailMatch && req.method === 'GET') {
    try { json(res, 200, { ok: true, data: await contentProjects.inspectProject(detailMatch[1]) }); }
    catch (error) { sendError(res, error); }
    return true;
  }

  return false;
}

module.exports = { tryRoute };
