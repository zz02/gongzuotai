const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createContentWorkspace } = require('./content-workspace-fixture');

const DATA_DIR = path.join(os.tmpdir(), `insprira-setup-${process.pid}`);
const WORKSPACE_ROOT = path.join(os.tmpdir(), `insprira-setup-content-${process.pid}`);
const ENV_FILE = path.join(DATA_DIR, '.env');
fs.mkdirSync(DATA_DIR, { recursive: true });
createContentWorkspace(WORKSPACE_ROOT);

process.env.DATA_DIR = DATA_DIR;
process.env.INSPRIRA_ENV_FILE = ENV_FILE;
process.env.NODE_ENV = 'test';
process.env.ENABLE_SCHEDULER = 'false';
process.env.HOST = '127.0.0.1';
process.env.REDFOX_API_KEY = '';
process.env.LLM_API_KEY = '';
process.env.KB_ENCRYPTION_KEY = '';
process.env.CONTENT_WORKSPACE_ROOT = '';

const { server } = require('../server');

let baseUrl = '';

async function request(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body,
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: response.status, headers: response.headers, json, text };
}

test.before(async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
});

test('新安装可在网页完成管理员创建与无损工作区接入', async () => {
  const initial = await request('/api/_/status');
  assert.equal(initial.status, 200);
  assert.equal(initial.json.setupRequired, true);
  assert.equal(initial.json.authenticated, false);
  assert.equal(initial.json.kbEncryptionInsecure, false);
  assert.equal(initial.json.kbEncryptionSource, 'managed');

  const managedKey = fs.readFileSync(path.join(DATA_DIR, 'kb-encryption.key'), 'utf8').trim();
  assert.match(managedKey, /^[a-f0-9]{64}$/);

  const beforeSetupLogin = await request('/api/_/login', {
    method: 'POST',
    body: { username: 'admin', password: 'not-created-yet' },
  });
  assert.equal(beforeSetupLogin.status, 409);
  assert.equal(beforeSetupLogin.json.code, 'SETUP_REQUIRED');

  const weakPassword = await request('/api/_/setup', {
    method: 'POST',
    body: { username: 'admin', displayName: '管理员', password: '1234567', confirmPassword: '1234567' },
  });
  assert.equal(weakPassword.status, 400);
  assert.match(weakPassword.json.error, /8-128/);

  const invalidWorkspace = await request('/api/_/setup', {
    method: 'POST',
    body: {
      username: 'admin',
      displayName: '管理员',
      password: 'safe-password-123',
      confirmPassword: 'safe-password-123',
      workspaceRoot: path.join(DATA_DIR, 'not-exists'),
    },
  });
  assert.equal(invalidWorkspace.status, 422);
  assert.equal(invalidWorkspace.json.code, 'WORKSPACE_INVALID');

  const setup = await request('/api/_/setup', {
    method: 'POST',
    body: {
      username: 'owner',
      displayName: '内容负责人',
      password: 'safe-password-123',
      confirmPassword: 'safe-password-123',
      workspaceRoot: WORKSPACE_ROOT,
    },
  });
  assert.equal(setup.status, 201);
  assert.equal(setup.json.data.user.username, 'owner');
  assert.equal(setup.json.data.user.mustChangePassword, false);
  const cookie = setup.headers.get('set-cookie').split(';')[0];

  const authenticated = await request('/api/_/status', { headers: { Cookie: cookie } });
  assert.equal(authenticated.json.setupRequired, false);
  assert.equal(authenticated.json.authenticated, true);
  assert.equal(authenticated.json.user.displayName, '内容负责人');

  const projects = await request('/api/_/content-projects', { headers: { Cookie: cookie } });
  assert.equal(projects.status, 200);
  assert.equal(projects.json.data.config.configured, true);
  assert.equal(projects.json.data.config.workspaceRoot, fs.realpathSync(WORKSPACE_ROOT));

  const envText = fs.readFileSync(ENV_FILE, 'utf8');
  assert.match(envText, /^CONTENT_WORKSPACE_ROOT=.+$/m);

  const repeated = await request('/api/_/setup', {
    method: 'POST',
    body: {
      username: 'second-owner',
      displayName: '第二管理员',
      password: 'another-password-123',
      confirmPassword: 'another-password-123',
    },
  });
  assert.equal(repeated.status, 409);
  assert.equal(repeated.json.code, 'SETUP_COMPLETED');

  await request('/api/_/logout', { method: 'POST', headers: { Cookie: cookie }, body: {} });
  const login = await request('/api/_/login', {
    method: 'POST',
    body: { username: 'owner', password: 'safe-password-123' },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(login.headers.get('set-cookie'), /SameSite=Strict/i);
});
