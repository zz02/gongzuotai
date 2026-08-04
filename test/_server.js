// 路由级集成测试引导：启动真实 http server 到随机端口
// 与 _helper.js（纯函数测试）分开，避免互相污染
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createContentWorkspace } = require('./content-workspace-fixture');

const TMP_DATA_DIR = process.env.TEST_ROUTE_DATA_DIR
  || path.join(os.tmpdir(), `insprira-route-${process.pid}`);
fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
const TMP_CONTENT_WORKSPACE_ROOT = process.env.TEST_CONTENT_WORKSPACE_ROOT
  || path.join(os.tmpdir(), `insprira-content-route-${process.pid}`);
createContentWorkspace(TMP_CONTENT_WORKSPACE_ROOT);
const TEST_ADMIN_PASSWORD = 'test-password-123';

process.env.DATA_DIR = TMP_DATA_DIR;
process.env.INSPRIRA_ENV_FILE = path.join(TMP_DATA_DIR, '.env');
process.env.NODE_ENV = 'test';
process.env.ENABLE_SCHEDULER = 'false';
process.env.HOST = '127.0.0.1';
// 屏蔽真实 .env（loadEnvFile 只在 process.env[key] == null 时填，先占位）
process.env.REDFOX_API_KEY = '';
process.env.LLM_API_KEY = '';
process.env.LLM_BASE_URL = '';
process.env.LLM_MODEL = '';
process.env.KB_ENCRYPTION_KEY = '';
process.env.CONTENT_WORKSPACE_ROOT = TMP_CONTENT_WORKSPACE_ROOT;
process.env.LOGIN_ACCOUNT_FAILURE_LIMIT = '5';
process.env.LOGIN_IP_FAILURE_LIMIT = '20';
process.env.LOGIN_FAILURE_WINDOW_MINUTES = '15';
process.env.LOGIN_LOCK_MINUTES = '15';
process.env.TRUSTED_PROXY_IPS = '';

const { server } = require('../server.js');

let baseUrl = null;

async function boot() {
  if (baseUrl) return baseUrl;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  const setup = await fetch(`${baseUrl}/api/_/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      displayName: '测试管理员',
      password: TEST_ADMIN_PASSWORD,
      confirmPassword: TEST_ADMIN_PASSWORD,
    }),
  });
  if (![201, 409].includes(setup.status)) {
    throw new Error(`测试管理员初始化失败：HTTP ${setup.status} ${await setup.text()}`);
  }
  return baseUrl;
}

async function close() {
  if (!baseUrl) return;
  const closing = new Promise((r) => server.close(r));
  // 发布中心使用流式响应；测试结束时主动关闭 undici 的 keep-alive 连接。
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  await closing;
  baseUrl = null;
}

async function req(pathStr, opts = {}) {
  if (!baseUrl) throw new Error('call boot() first');
  const headers = { ...(opts.headers || {}) };
  let body;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const res = await fetch(`${baseUrl}${pathStr}`, {
    method: opts.method || 'GET',
    headers,
    body,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, headers: res.headers, body: text, json };
}

module.exports = { boot, close, req, TMP_DATA_DIR, TMP_CONTENT_WORKSPACE_ROOT, TEST_ADMIN_PASSWORD };
