// 路由级集成测试：启动真实 http server，覆盖公开端点、登录流程、受保护端点、401 边界
// 这些测试是后续拆分 handleLocalApi 的回归网
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { boot, close, req, TEST_ADMIN_PASSWORD, TMP_DATA_DIR, TMP_CONTENT_WORKSPACE_ROOT } = require('./_server');

let started = false;
test.before(async () => {
  await boot();
  started = true;
});
test.after(async () => {
  if (started) await close();
});

// ============= 公开端点 =============

test('GET /api/_/version 返回版本号', async () => {
  const r = await req('/api/_/version');
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(typeof r.json.version, 'string');
  assert.ok(r.json.version.length > 0);
});

test('GET /api/_/status 未登录返回已初始化状态与自动管理的加密密钥', async () => {
  const r = await req('/api/_/status');
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.authenticated, false);
  assert.equal(r.json.user, null);
  assert.equal(r.json.authRequired, true);
  assert.equal(r.json.setupRequired, false);
  assert.equal(r.json.kbEncryptionInsecure, false);
  assert.equal(r.json.kbEncryptionSource, 'managed');
});

test('POST /api/_/login 错误密码返回 401', async () => {
  const r = await req('/api/_/login', {
    method: 'POST',
    body: { username: 'admin', password: 'definitely-wrong' },
  });
  assert.equal(r.status, 401);
  assert.equal(r.json.ok, false);
});

test('POST /api/_/login 不存在的用户返回 401', async () => {
  const r = await req('/api/_/login', {
    method: 'POST',
    body: { username: 'nobody', password: 'whatever' },
  });
  assert.equal(r.status, 401);
});

test('POST /api/_/login 缺字段返回 401', async () => {
  const r = await req('/api/_/login', { method: 'POST', body: {} });
  assert.equal(r.status, 401);
});

// ============= 登录流程 =============

let authCookie = null;

test('POST /api/_/login 使用已初始化管理员成功并下发 cookie', async () => {
  const r = await req('/api/_/login', {
    method: 'POST',
    body: { username: 'admin', password: TEST_ADMIN_PASSWORD },
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.data.authenticated, true);
  assert.equal(r.json.data.user.username, 'admin');
  const setCookie = r.headers.get('set-cookie');
  assert.ok(setCookie, '应返回 Set-Cookie');
  assert.match(setCookie, /furnace_session=[^;]+/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  authCookie = setCookie.split(';')[0];
});

test('GET /api/_/status 带 cookie 返回 authenticated:true 与 user', async () => {
  assert.ok(authCookie, '前置登录测试应已设置 cookie');
  const r = await req('/api/_/status', { headers: { Cookie: authCookie } });
  assert.equal(r.status, 200);
  assert.equal(r.json.authenticated, true);
  assert.equal(r.json.user.username, 'admin');
  assert.equal(r.json.user.mustChangePassword, false, '首次设置的管理员不应要求再次修改密码');
});

test('POST /api/_/logout 清除会话', async () => {
  assert.ok(authCookie);
  const r = await req('/api/_/logout', { method: 'POST', headers: { Cookie: authCookie } });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  // 同一 cookie 之后应无法访问受保护端点
  const after = await req('/api/_/env', { headers: { Cookie: authCookie } });
  assert.equal(after.status, 401);
});

test('POST /api/_/login 达到账号上限后锁定且忽略伪造转发地址', async () => {
  for (let index = 1; index <= 5; index += 1) {
    const r = await req('/api/_/login', {
      method: 'POST',
      headers: { 'X-Forwarded-For': `203.0.113.${index}` },
      body: { username: 'locked-route-user', password: 'wrong-password' },
    });
    if (index < 5) {
      assert.equal(r.status, 401);
      assert.equal(r.json.code, 'LOGIN_INVALID_CREDENTIALS');
      assert.equal(r.json.remainingAttempts, 5 - index);
    } else {
      assert.equal(r.status, 429);
      assert.equal(r.json.code, 'LOGIN_TEMPORARILY_LOCKED');
      assert.ok(Number(r.headers.get('retry-after')) > 0);
    }
  }
  const stillLocked = await req('/api/_/login', {
    method: 'POST',
    headers: { 'X-Forwarded-For': '198.51.100.99' },
    body: { username: 'locked-route-user', password: 'another-password' },
  });
  assert.equal(stillLocked.status, 429, '伪造转发地址不应绕过账号锁定');
});

// ============= 401 边界（未登录访问受保护端点）=============

const protectedEndpoints = [
  { path: '/api/_/env', method: 'GET' },
  { path: '/api/_/account', method: 'GET' },
  { path: '/api/_/skills', method: 'GET' },
  { path: '/api/_/inspiration-configs', method: 'GET' },
  { path: '/api/_/trackers', method: 'GET' },
  { path: '/api/_/crons', method: 'GET' },
  { path: '/api/_/my-accounts', method: 'GET' },
  { path: '/api/_/action-logs', method: 'GET' },
  { path: '/api/_/notifications', method: 'GET' },
  { path: '/api/_/content-projects', method: 'GET' },
  { path: '/api/_/backups', method: 'GET' },
  { path: '/api/_/diagnostics', method: 'GET' },
  { path: '/api/_/content-projects/origins', method: 'GET' },
  { path: '/api/_/content-projects/2026-08-01-可推进项目/skill-context', method: 'GET' },
  { path: '/api/_/content-projects/2026-08-01-可推进项目/publish/发布中心.html', method: 'GET' },
];

for (const ep of protectedEndpoints) {
  test(`${ep.method} ${ep.path} 未登录返回 401`, async () => {
    const r = await req(ep.path, { method: ep.method });
    assert.equal(r.status, 401);
  });
}

// ============= 已认证受保护端点 =============

async function withLogin(cb) {
  const login = await req('/api/_/login', {
    method: 'POST',
    body: { username: 'admin', password: TEST_ADMIN_PASSWORD },
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  try { return await cb(cookie); } finally {
    await req('/api/_/logout', { method: 'POST', headers: { Cookie: cookie } });
  }
}

test('GET /api/_/env 返回 masked env config', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/env', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    const env = r.json.data;
    // 所有 EDITABLE_ENV_KEYS 都应在响应里
    for (const key of ['REDFOX_API_KEY', 'LLM_API_KEY', 'KB_ENCRYPTION_KEY']) {
      assert.ok(env[key], `应有 ${key}`);
      assert.equal(env[key].secret, true, `${key} 应标记 secret`);
      assert.equal(env[key].value, '', `${key} value 应被 mask`);
    }
  });
});

test('GET /api/_/skills 返回数组', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/skills', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.ok(Array.isArray(r.json.data));
  });
});

test('备份接口创建、列出并校验受管备份且不返回本机路径和文件哈希', async () => {
  await withLogin(async (cookie) => {
    const created = await req('/api/_/backups', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: {},
    });
    assert.equal(created.status, 201);
    assert.match(created.json.data.id, /^backup-\d{8}-\d{6}-[a-f0-9]{6}$/);
    assert.equal(typeof created.json.data.configIncluded, 'boolean');

    const listed = await req('/api/_/backups', { headers: { Cookie: cookie } });
    assert.equal(listed.status, 200);
    assert.equal(listed.json.ok, true);
    assert.ok(listed.json.data.backups.some(item => item.id === created.json.data.id));
    assert.equal(listed.json.data.scope.contentWorkspace, false);

    const verified = await req(`/api/_/backups/${created.json.data.id}/verify`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: {},
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.json.data.status, 'verified');
    assert.equal(Object.hasOwn(verified.json.data, 'directory'), false);
    assert.equal(Object.hasOwn(verified.json.data, 'files'), false);
    assert.doesNotMatch(verified.body, new RegExp(TMP_DATA_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(verified.body, /[a-f0-9]{64}/);
  });
});

test('GET /api/_/diagnostics 返回脱敏的业务诊断清单', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/diagnostics', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.ok(['normal', 'warning', 'error'].includes(r.json.data.status));
    assert.ok(Array.isArray(r.json.data.items));
    assert.ok(r.json.data.items.some(item => item.id === 'redfox'));
    assert.ok(r.json.data.items.some(item => item.id === 'content-workspace'));
    for (const item of r.json.data.items) {
      assert.ok(item.summary && item.impact && item.nextStep);
    }
    assert.doesNotMatch(r.body, new RegExp(TMP_DATA_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(r.body, new RegExp(TMP_CONTENT_WORKSPACE_ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('GET /api/_/inspiration-configs 返回数组', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/inspiration-configs', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.data));
  });
});

test('GET /api/_/trackers 返回数组', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/trackers', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.data));
  });
});

test('GET /api/_/crons 返回内置 cron 列表', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/crons', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    const ids = r.json.data.map(c => c.id);
    // 内置任务都应在
    for (const id of ['hot-realtime', 'hot-daily-dy', 'cache-clean', 'usage-clean', 'wersss-sync']) {
      assert.ok(ids.includes(id), `应包含内置 cron: ${id}`);
    }
    // lock/protected 是前端概念（js/config.js），后端 listCronJobs 不返回该字段
  });
});

test('GET /api/_/my-accounts 返回数组', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/my-accounts', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.data));
  });
});

test('GET /api/_/action-logs 返回数组', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/action-logs', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.data));
  });
});

test('GET /api/_/notifications 返回 ok', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/notifications', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
  });
});

// ============= 内容项目无损接入 =============

test('GET /api/_/content-projects 扫描临时工作区', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/_/content-projects', { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.config.configured, true);
    assert.equal(r.json.data.projects.length, 2);
    assert.equal(r.json.data.projects[0].title, '缺少立项信息');
  });
});

test('POST /api/_/content-projects/check-workspace 保存前校验目录结构', async () => {
  await withLogin(async (cookie) => {
    const empty = await req('/api/_/content-projects/check-workspace', { method: 'POST', headers: { Cookie: cookie }, body: { root: '' } });
    assert.equal(empty.status, 400);
    const invalid = await req('/api/_/content-projects/check-workspace', { method: 'POST', headers: { Cookie: cookie }, body: { root: '/definitely/not/a/content/workspace' } });
    assert.equal(invalid.status, 422);
    assert.match(invalid.json.error, /不存在|目录/);
  });
});

test('GET /api/_/content-projects/:id 返回状态、文件和业务记录', async () => {
  await withLogin(async (cookie) => {
    const id = encodeURIComponent('2026-08-01-可推进项目');
    const r = await req(`/api/_/content-projects/${id}`, { headers: { Cookie: cookie } });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.status, '待立项');
    assert.equal(r.json.data.files.length, 7);
    assert.equal(r.json.data.statusRecords.length, 1);
    assert.equal(r.json.data.publishRecords.length, 3);
  });
});

test('内容项目 Skill 上下文只开放白名单，并拒绝通过接口执行生图 Skill', async () => {
  await withLogin(async (cookie) => {
    const id = encodeURIComponent('2026-08-01-可推进项目');
    const context = await req(`/api/_/content-projects/${id}/skill-context`, { headers: { Cookie: cookie } });
    assert.equal(context.status, 200);
    assert.equal(context.json.data.skills.find(item => item.id === 'berry-human-writer').eligible, true);
    assert.equal(context.json.data.skills.find(item => item.id === 'banana-image-gen').eligible, false);
    assert.equal(context.json.data.targets.length, 4);

    const blocked = await req(`/api/_/content-projects/${id}/skill-runs`, {
      method: 'POST', headers: { Cookie: cookie },
      body: { skillId: 'banana-image-gen', targetKey: 'wechat', agentId: 'codex' },
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.code, 'CONTENT_SKILL_NOT_ALLOWED');
  });
});

test('POST /api/_/inspirations 可手工写入选题并被列表读取', async () => {
  await withLogin(async (cookie) => {
    const created = await req('/api/_/inspirations', {
      method: 'POST', headers: { Cookie: cookie },
      body: {
        id: 'insp:manual-route-test',
        title: '手工选题测试',
        summary: '验证手工写入链路。',
        angle: '回归测试',
        targetPlatform: '多平台',
        sourceKeywords: ['测试'],
      },
    });
    assert.equal(created.status, 200);
    assert.equal(created.json.data.id, 'insp:manual-route-test');
    const listed = await req('/api/_/inspirations', { headers: { Cookie: cookie } });
    assert.equal(listed.status, 200);
    const idea = listed.json.data.find(item => item.id === 'insp:manual-route-test');
    assert.equal(idea.title, '手工选题测试');
    assert.equal(idea.sourceMode, 'manual');
    assert.equal(idea.kbLink, null);
  });
});

test('POST /api/_/inspirations 校验手工选题边界', async () => {
  await withLogin(async (cookie) => {
    const headers = { Cookie: cookie };
    const empty = await req('/api/_/inspirations', { method: 'POST', headers, body: { title: '' } });
    assert.equal(empty.status, 400);
    const longTitle = await req('/api/_/inspirations', { method: 'POST', headers, body: { title: '题'.repeat(101) } });
    assert.equal(longTitle.status, 400);
    const invalidPlatform = await req('/api/_/inspirations', { method: 'POST', headers, body: { title: '平台测试', targetPlatform: '未知平台' } });
    assert.equal(invalidPlatform.status, 400);
    const tooManyKeywords = await req('/api/_/inspirations', { method: 'POST', headers, body: { title: '关键词测试', sourceKeywords: Array.from({ length: 21 }, (_, index) => `词${index}`) } });
    assert.equal(tooManyKeywords.status, 400);
  });
});

test('内容项目拒绝非法项目标识与路径穿越', async () => {
  await withLogin(async (cookie) => {
    for (const value of ['..', '%2E%2E', '%2Fetc']) {
      const r = await req(`/api/_/content-projects/${value}`, { headers: { Cookie: cookie } });
      assert.ok([400, 404].includes(r.status), `${value} 应被拒绝`);
    }
  });
});

test('POST /api/_/content-projects 校验空标题与非法日期', async () => {
  await withLogin(async (cookie) => {
    const empty = await req('/api/_/content-projects', { method: 'POST', headers: { Cookie: cookie }, body: { title: '', date: '2026-08-03' } });
    assert.equal(empty.status, 400);
    assert.match(empty.json.error, /标题/);
    const badDate = await req('/api/_/content-projects', { method: 'POST', headers: { Cookie: cookie }, body: { title: '测试', date: '2026-02-30' } });
    assert.equal(badDate.status, 400);
    assert.match(badDate.json.error, /日期/);
  });
});

test('POST /api/_/content-projects 调用原脚本创建项目并拒绝重名', async () => {
  await withLogin(async (cookie) => {
    const body = { title: '工作台创建测试', date: '2026-08-03' };
    const created = await req('/api/_/content-projects', { method: 'POST', headers: { Cookie: cookie }, body });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.title, body.title);
    assert.equal(created.json.data.status, '待立项');
    const duplicate = await req('/api/_/content-projects', { method: 'POST', headers: { Cookie: cookie }, body });
    assert.equal(duplicate.status, 409);
  });
});

test('灵感建立项目时把摘要、关键词和参考证据无损交接到原 Markdown', async () => {
  await withLogin(async (cookie) => {
    const headers = { Cookie: cookie };
    const inspirationId = 'insp:handoff-route-test';
    const saved = await req('/api/_/inspirations', {
      method: 'POST', headers,
      body: {
        id: inspirationId,
        title: '证据交接测试',
        summary: '把真实证据交给原工作流，避免选题与写作脱节。',
        angle: '端到端验证',
        targetPlatform: '多平台',
        sourceKeywords: ['证据链', '无损接入'],
        sourceMode: 'hot-evidence',
        generationType: 'manual',
        sourceItems: [
          {
            platform: 'gzh', author: '测试作者',
            title: '第一条|证据\n包含换行', publishTime: '2026-08-02 10:00:00',
            url: 'https://example.com/article?q=a|b',
          },
          {
            platform: 'xhs', author: '第二作者',
            title: '第二条证据', publishTime: 1785661200,
            url: 'javascript:alert(1)',
          },
        ],
      },
    });
    assert.equal(saved.status, 200);

    const created = await req('/api/_/content-projects', {
      method: 'POST', headers,
      body: { title: '证据交接测试', date: '2026-08-04', inspirationId },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.origin.ref, inspirationId);
    assert.equal(created.json.data.origin.evidenceCount, 2);
    const projectId = created.json.data.id;
    const projectRoot = path.join(TMP_CONTENT_WORKSPACE_ROOT, '内容工作台', '项目', '进行中', projectId);
    const card = fs.readFileSync(path.join(projectRoot, '00-项目卡.md'), 'utf8');
    const research = fs.readFileSync(path.join(projectRoot, '01-资料.md'), 'utf8');
    assert.match(card, /origin_ref: "insp:handoff-route-test"/);
    assert.match(card, /primary_platform: "公众号 \/ 小红书 \/ 抖音"/);
    assert.match(card, /- 独特角度： 端到端验证/);
    assert.match(research, /## 选题交接/);
    assert.match(research, /关键词：证据链、无损接入/);
    assert.match(research, /第一条\\\|证据 包含换行/);
    assert.match(research, /https:\/\/example\.com\/article\?q=a%7Cb/);
    assert.equal(research.includes('javascript:'), false);
    assert.equal(research.includes('| - | - | - | - | 待核验 |'), false);
    assert.equal((research.match(/\| 待核验 \|/g) || []).length, 2);

    const links = await req('/api/_/content-projects/origins', { headers });
    assert.equal(links.status, 200);
    assert.deepEqual(
      links.json.data.find(link => link.inspirationId === inspirationId),
      { projectId, projectTitle: '证据交接测试', inspirationId, evidenceCount: 2 },
    );
    const inspirations = await req('/api/_/inspirations', { headers });
    assert.equal(inspirations.json.data.find(item => item.id === inspirationId).status, '创作中');

    const duplicate = await req('/api/_/content-projects', {
      method: 'POST', headers,
      body: { title: '重复证据交接', date: '2026-08-05', inspirationId },
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.json.code, 'INSPIRATION_ALREADY_LINKED');
  });
});

test('内容项目拒绝不存在或非法的选题来源且不留下目录', async () => {
  await withLogin(async (cookie) => {
    const headers = { Cookie: cookie };
    const missing = await req('/api/_/content-projects', {
      method: 'POST', headers,
      body: { title: '不存在来源', date: '2026-08-06', inspirationId: 'insp:not-found' },
    });
    assert.equal(missing.status, 404);
    assert.equal(missing.json.code, 'INSPIRATION_NOT_FOUND');
    const names = fs.readdirSync(path.join(TMP_CONTENT_WORKSPACE_ROOT, '内容工作台', '项目', '进行中'));
    assert.equal(names.some(name => name.includes('不存在来源')), false);
  });
});

test('没有证据的选题保留待核验占位且不会倒退已有业务状态', async () => {
  await withLogin(async (cookie) => {
    const headers = { Cookie: cookie };
    const inspirationId = 'insp:no-evidence-route-test';
    await req('/api/_/inspirations', {
      method: 'POST', headers,
      body: {
        id: inspirationId,
        title: '无证据交接测试',
        summary: '这是人工判断，当前没有外部证据。',
        angle: '人工经验',
        targetPlatform: '公众号',
        sourceKeywords: ['人工判断'],
      },
    });
    await req(`/api/_/inspirations/${encodeURIComponent(inspirationId)}`, {
      method: 'PATCH', headers, body: { status: '已发布' },
    });
    const created = await req('/api/_/content-projects', {
      method: 'POST', headers,
      body: { title: '无证据交接测试', date: '2026-08-07', inspirationId },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.data.origin.evidenceCount, 0);
    const projectRoot = path.join(
      TMP_CONTENT_WORKSPACE_ROOT, '内容工作台', '项目', '进行中', created.json.data.id,
    );
    const research = fs.readFileSync(path.join(projectRoot, '01-资料.md'), 'utf8');
    assert.match(research, /当前没有可直接引用的外部证据/);
    assert.match(research, /\| - \| - \| - \| - \| 待核验 \|/);
    const inspirations = await req('/api/_/inspirations', { headers });
    assert.equal(inspirations.json.data.find(item => item.id === inspirationId).status, '已发布');
  });
});

test('推进前检查返回缺失项，失败时不修改状态', async () => {
  await withLogin(async (cookie) => {
    const id = encodeURIComponent('2026-08-02-缺少立项信息');
    const checked = await req(`/api/_/content-projects/${id}/validate`, { method: 'POST', headers: { Cookie: cookie }, body: { target: '资料中' } });
    assert.equal(checked.status, 200);
    assert.equal(checked.json.data.passed, false);
    assert.equal(checked.json.data.issues.length, 2);
    const advanced = await req(`/api/_/content-projects/${id}/advance`, { method: 'POST', headers: { Cookie: cookie }, body: { to: '资料中' } });
    assert.equal(advanced.status, 409);
    const detail = await req(`/api/_/content-projects/${id}`, { headers: { Cookie: cookie } });
    assert.equal(detail.json.data.status, '待立项');
  });
});

test('内容项目不能跳级，只能在检查通过后顺序推进', async () => {
  await withLogin(async (cookie) => {
    const id = encodeURIComponent('2026-08-01-可推进项目');
    const jump = await req(`/api/_/content-projects/${id}/advance`, { method: 'POST', headers: { Cookie: cookie }, body: { to: '写作中' } });
    assert.equal(jump.status, 409);
    const checked = await req(`/api/_/content-projects/${id}/validate`, { method: 'POST', headers: { Cookie: cookie }, body: { target: '资料中' } });
    assert.equal(checked.status, 200);
    assert.equal(checked.json.data.passed, true);
    const advanced = await req(`/api/_/content-projects/${id}/advance`, { method: 'POST', headers: { Cookie: cookie }, body: { to: '资料中' } });
    assert.equal(advanced.status, 200);
    assert.equal(advanced.json.data.status, '资料中');
  });
});

test('发布中心仅在登录后开放允许类型', async () => {
  await withLogin(async (cookie) => {
    const id = encodeURIComponent('2026-08-01-可推进项目');
    const html = await req(`/api/_/content-projects/${id}/publish/${encodeURIComponent('发布中心.html')}`, { headers: { Cookie: cookie } });
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-type'), /text\/html/);
    assert.match(html.body, /发布中心/);
    const nested = await req(`/api/_/content-projects/${id}/publish/${encodeURIComponent('../00-项目卡.md')}`, { headers: { Cookie: cookie } });
    assert.equal(nested.status, 404);
    const forbidden = await req(`/api/_/content-projects/${id}/publish/${encodeURIComponent('secret.txt')}`, { headers: { Cookie: cookie } });
    assert.equal(forbidden.status, 403);
  });
});

// ============= RedFox 代理边界 =============

test('POST /api/{未在白名单} 登录后返回 403', async () => {
  // 注意：auth 检查先于白名单检查，必须先登录
  await withLogin(async (cookie) => {
    const r = await req('/api/totally/fake/endpoint', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: { foo: 'bar' },
    });
    assert.equal(r.status, 403);
  });
});

test('POST /api/{未在白名单} 未登录返回 401（auth 优先于白名单）', async () => {
  const r = await req('/api/totally/fake/endpoint', {
    method: 'POST',
    body: { foo: 'bar' },
  });
  assert.equal(r.status, 401);
});

test('POST /api/{白名单端点} 未配置 REDFOX_API_KEY 时返回错误', async () => {
  await withLogin(async (cookie) => {
    // hotKeyword/list 在白名单内，但 REDFOX_API_KEY 在测试环境为空
    const r = await req('/api/hotKeyword/list', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: {},
    });
    assert.ok(r.status >= 400);
  });
});

test('GET /api/{白名单} 用 GET 方法返回 405（auth 后才检查 method）', async () => {
  await withLogin(async (cookie) => {
    const r = await req('/api/hotKeyword/list', { headers: { Cookie: cookie } });
    assert.equal(r.status, 405);
  });
});

// ============= 静态资源 =============

test('GET / 返回 index.html', async () => {
  const r = await req('/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.match(r.body, /<html/i);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.match(r.headers.get('permissions-policy'), /camera=\(\)/);
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('GET /css/tailwind.css 返回 css', async () => {
  const r = await req('/css/tailwind.css');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/css/);
});

test('GET /js/app.js 返回 javascript', async () => {
  const r = await req('/js/app.js');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /javascript/);
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

test('GET /vendor/chart.umd.min.js 返回 javascript', async () => {
  const r = await req('/vendor/chart.umd.min.js');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /javascript/);
});

test('GET /../.env 路径穿越返回 403 或 404', async () => {
  // 注：fetch 通常会规范化 URL，这里测一个相对路径
  const r = await req('/css/..%2F.env');
  // 任何 4xx 都接受——关键是不能泄漏
  assert.ok(r.status >= 400 && r.status < 500);
  assert.equal(r.body.includes('REDFOX_API_KEY'), false, '绝不能泄漏 .env');
});

test('静态服务拒绝直接读取配置、数据库和后端源码', async () => {
  for (const pathname of [
    '/.env',
    '/%2eenv',
    '/data/cache.db',
    '/data/backups/example.db',
    '/data/backups/backup-20260804-010203-abcdef/manifest.json',
    '/server.js',
    '/package.json',
    '/lib/auth.js',
    '/lib/backups.js',
    '/scripts/reset-password.js',
    '/scripts/restore-backup.js',
    '/test/routes.test.js',
    '/js/.secret.js',
    '/js/app.txt',
  ]) {
    const r = await req(pathname);
    assert.equal(r.status, 404, `${pathname} 不应对浏览器公开`);
    assert.equal(r.headers.get('cache-control'), 'no-store');
  }
});

test('GET /api/_/not-a-real-endpoint 返回 404', async () => {
  const r = await req('/api/_/not-a-real-endpoint');
  // 未认证的 401 优先于 404，所以先登录
  const login = await req('/api/_/login', {
    method: 'POST',
    body: { username: 'admin', password: TEST_ADMIN_PASSWORD },
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const authed = await req('/api/_/not-a-real-endpoint', { headers: { Cookie: cookie } });
  assert.equal(authed.status, 404);
  await req('/api/_/logout', { method: 'POST', headers: { Cookie: cookie } });
});
