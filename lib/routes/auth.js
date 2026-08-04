// 路由组：登录/登出/status/version/redfox-apply/account/env
// 这些路由依赖很少（auth/db/password/redfox/env/http），适合首先拆出
// 由 handleLocalApi 调用 try(req, res, url, ctx)，返回 true 表示已处理
const crypto = require('crypto');
const { db } = require('../db');
const {
  sessionSet, sessionDel, getCookies, currentSession, publicUser,
  sessions, KB_ENC_INSECURE, KB_ENC_SOURCE,
} = require('../auth');
const { verifyPassword, validateUsername, validatePassword, hashPassword } = require('../password');
const { API_KEY } = require('../redfox');
const { publicEnvConfig, updateEnvConfig } = require('../env');
const contentProjects = require('../content-projects');
const { json, readBody } = require('../http');

// 不存在的账号也执行一次等价的 scrypt 校验，避免通过响应耗时判断账号是否存在。
const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(24).toString('hex'));

function userCount() {
  return db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
}

function createSession(req, res, user, statusCode = 200) {
  const token = crypto.randomBytes(32).toString('hex');
  const maxAge = 7 * 24 * 60 * 60;
  const now = Date.now();
  sessionSet(token, user.id, now + maxAge * 1000);
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const secure = Boolean(req.socket?.encrypted) || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  json(res, statusCode, { ok: true, data: { authenticated: true, user: publicUser(updatedUser) } }, {
    'Set-Cookie': `furnace_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
  });
}

async function tryRoute(req, res, url, ctx) {
  const { APP_VERSION, ENABLE_SCHEDULER, ENV_FILE, loginGuard } = ctx;

  if (url.pathname === '/api/_/login' && req.method === 'POST') {
    if (userCount() === 0) {
      json(res, 409, { ok: false, error: '系统尚未初始化，请先创建管理员账户', code: 'SETUP_REQUIRED' });
      return true;
    }
    const { data } = await readBody(req);
    const username = String(data.username || '').trim();
    const access = loginGuard?.check(req, username);
    if (access && !access.allowed) {
      json(res, 429, {
        ok: false,
        error: '登录尝试过多，请稍后再试',
        code: 'LOGIN_TEMPORARILY_LOCKED',
        retryAfterSeconds: access.retryAfterSeconds,
      }, { 'Retry-After': String(access.retryAfterSeconds) });
      return true;
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
    const validPassword = verifyPassword(data.password || '', user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !validPassword) {
      const failed = loginGuard?.recordFailure(req, username);
      if (failed && !failed.allowed) {
        json(res, 429, {
          ok: false,
          error: '登录尝试过多，请稍后再试',
          code: 'LOGIN_TEMPORARILY_LOCKED',
          retryAfterSeconds: failed.retryAfterSeconds,
        }, { 'Retry-After': String(failed.retryAfterSeconds) });
        return true;
      }
      const remaining = Number.isInteger(failed?.remainingAttempts) ? failed.remainingAttempts : null;
      json(res, 401, {
        ok: false,
        error: remaining == null ? '用户名或密码错误' : `用户名或密码错误，还可尝试 ${remaining} 次`,
        code: 'LOGIN_INVALID_CREDENTIALS',
        ...(remaining == null ? {} : { remainingAttempts: remaining }),
      });
      return true;
    }
    loginGuard?.recordSuccess(req, username);
    createSession(req, res, user);
    return true;
  }

  if (url.pathname === '/api/_/setup' && req.method === 'POST') {
    if (userCount() > 0) {
      json(res, 409, { ok: false, error: '系统已完成初始化，请直接登录', code: 'SETUP_COMPLETED' });
      return true;
    }
    const { data } = await readBody(req);
    let username;
    let password;
    try {
      username = validateUsername(data.username);
      password = validatePassword(data.password);
    } catch (error) {
      json(res, 400, { ok: false, error: error.message, code: 'SETUP_INPUT_INVALID' });
      return true;
    }
    if (password !== String(data.confirmPassword || '')) {
      json(res, 400, { ok: false, error: '两次输入的密码不一致', code: 'PASSWORD_MISMATCH' });
      return true;
    }
    const displayName = String(data.displayName || username).trim();
    if (!displayName || displayName.length > 50) {
      json(res, 400, { ok: false, error: '显示名称需为 1-50 个字符', code: 'DISPLAY_NAME_INVALID' });
      return true;
    }
    const workspaceRoot = String(data.workspaceRoot || '').trim();
    if (workspaceRoot) {
      const workspace = contentProjects.workspaceConfig(workspaceRoot);
      if (!workspace.configured) {
        json(res, 422, { ok: false, error: workspace.message, code: 'WORKSPACE_INVALID' });
        return true;
      }
      updateEnvConfig(ENV_FILE, { CONTENT_WORKSPACE_ROOT: workspace.workspaceRoot });
    }
    let userId;
    try {
      userId = db.transaction(() => {
        if (userCount() > 0) throw new Error('SETUP_COMPLETED');
        const now = Date.now();
        const id = crypto.randomUUID();
        db.prepare(`
          INSERT INTO users
            (id, username, display_name, password_hash, role, must_change_password, password_changed_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'owner', 0, ?, ?, ?)
        `).run(id, username, displayName, hashPassword(password), now, now, now);
        return id;
      })();
    } catch (error) {
      if (error.message === 'SETUP_COMPLETED') {
        json(res, 409, { ok: false, error: '系统已完成初始化，请直接登录', code: 'SETUP_COMPLETED' });
        return true;
      }
      throw error;
    }
    createSession(req, res, db.prepare('SELECT * FROM users WHERE id = ?').get(userId), 201);
    return true;
  }

  if (url.pathname === '/api/_/logout' && req.method === 'POST') {
    const token = getCookies(req).furnace_session;
    if (token) sessionDel(token);
    json(res, 200, { ok: true }, {
      'Set-Cookie': 'furnace_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    });
    return true;
  }

  if (url.pathname === '/api/_/status' && req.method === 'GET') {
    const auth = currentSession(req);
    const setupRequired = userCount() === 0;
    // Notion 凭证存在 kb_config 表里（不是 env），单独查
    const kbRow = require('../db').db.prepare('SELECT notion_api_key FROM kb_config LIMIT 1').get();
    // 小红书 MCP 接入状态
    const xhsMcp = require('../xhs-mcp/service').getPublicConfig();
    // WeRss 接入状态：走 getWersssAuthStatus 拿完整诊断（serviceReachable + wxAuthorized）
    // 但那个调用要发 HTTP 请求，太重；这里只读 DB 配置 + token 有效期，前端按需调 /wersss/status 拿详细
    const wersssRow = require('../db').db.prepare('SELECT base_url, username, token, token_expires_at, enabled FROM wersss_config WHERE id = 1').get();
    const wersssConfigured = Boolean(wersssRow?.base_url && wersssRow?.username);
    const wersssTokenValid = Boolean(wersssRow?.token) && (!wersssRow?.token_expires_at || wersssRow.token_expires_at > Date.now());
    json(res, 200, {
      ok: true,
      version: APP_VERSION,
      redfoxConfigured: Boolean(process.env.REDFOX_API_KEY),
      llmConfigured: Boolean(process.env.LLM_API_KEY),
      githubConfigured: Boolean(String(process.env.GITHUB_API_TOKEN || '').trim()),
      notionConfigured: Boolean(kbRow?.notion_api_key),
      wersssConfigured,
      wersssEnabled: wersssConfigured && Boolean(wersssRow?.enabled),
      wersssTokenValid,
      xhsMcpConfigured: xhsMcp.configured && xhsMcp.enabled,
      xhsMcpLoginStatus: xhsMcp.loginStatus,
      xhsMcpAutoDetected: Boolean(xhsMcp.autoDetected),
      schedulerEnabled: ENABLE_SCHEDULER,
      authRequired: true,
      setupRequired,
      authenticated: Boolean(auth),
      user: auth ? publicUser(auth.user) : null,
      kbEncryptionInsecure: KB_ENC_INSECURE,
      kbEncryptionSource: KB_ENC_SOURCE,
    });
    return true;
  }

  if (url.pathname === '/api/_/version' && req.method === 'GET') {
    json(res, 200, { ok: true, version: APP_VERSION });
    return true;
  }

  if (url.pathname === '/api/_/redfox/apply' && req.method === 'GET') {
    json(res, 200, { ok: true, url: String(process.env.REDFOX_APPLY_URL || '').trim() });
    return true;
  }

  if (url.pathname === '/api/_/account' && req.method === 'GET') {
    const auth = currentSession(req);
    json(res, 200, { ok: true, data: publicUser(auth.user) });
    return true;
  }

  if (url.pathname === '/api/_/account' && req.method === 'PATCH') {
    const auth = currentSession(req);
    const { data } = await readBody(req);
    let username;
    try {
      username = validateUsername(data.username ?? auth.user.username);
    } catch (error) {
      json(res, 400, { ok: false, error: error.message });
      return true;
    }
    const displayName = String(data.displayName ?? auth.user.display_name).trim();
    if (!displayName || displayName.length > 50) {
      json(res, 400, { ok: false, error: '显示名称需为 1-50 个字符' });
      return true;
    }
    const duplicate = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id <> ?')
      .get(username, auth.user.id);
    if (duplicate) {
      json(res, 409, { ok: false, error: '用户名已存在' });
      return true;
    }
    const now = Date.now();
    db.prepare('UPDATE users SET username = ?, display_name = ?, updated_at = ? WHERE id = ?')
      .run(username, displayName, now, auth.user.id);
    json(res, 200, {
      ok: true,
      data: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(auth.user.id)),
    });
    return true;
  }

  if (url.pathname === '/api/_/account/password' && req.method === 'POST') {
    const auth = currentSession(req);
    const { data } = await readBody(req);
    if (!verifyPassword(data.currentPassword || '', auth.user.password_hash)) {
      json(res, 400, { ok: false, error: '当前密码错误' });
      return true;
    }
    let newPassword;
    try {
      newPassword = validatePassword(data.newPassword);
    } catch (error) {
      json(res, 400, { ok: false, error: error.message });
      return true;
    }
    if (verifyPassword(newPassword, auth.user.password_hash)) {
      json(res, 400, { ok: false, error: '新密码不能与当前密码相同' });
      return true;
    }
    const now = Date.now();
    db.transaction(() => {
      db.prepare(`
        UPDATE users
        SET password_hash = ?, must_change_password = 0, password_changed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(hashPassword(newPassword), now, now, auth.user.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(auth.user.id, auth.token);
    })();
    for (const [token, session] of sessions) {
      if (session.userId === auth.user.id && token !== auth.token) sessions.delete(token);
    }
    json(res, 200, {
      ok: true,
      data: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(auth.user.id)),
    });
    return true;
  }

  if (url.pathname === '/api/_/env' && req.method === 'GET') {
    json(res, 200, { ok: true, data: publicEnvConfig(ENV_FILE) });
    return true;
  }

  if (url.pathname === '/api/_/env' && req.method === 'PUT') {
    const { data } = await readBody(req);
    json(res, 200, { ok: true, data: updateEnvConfig(ENV_FILE, data || {}), restartRequired: true });
    return true;
  }

  return false;
}

module.exports = { tryRoute };
