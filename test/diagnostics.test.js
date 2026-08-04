const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { make } = require('../lib/diagnostics');

function fixture(overrides = {}) {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-diagnostics-'));
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE kb_config (notion_api_key TEXT, notion_database_id TEXT);
    CREATE TABLE wersss_config (id INTEGER PRIMARY KEY, base_url TEXT, username TEXT, token TEXT, token_expires_at INTEGER, enabled INTEGER);
  `);
  const options = {
    database,
    backupManager: { listBackups: () => ({ backups: [], count: 0 }) },
    contentProjects: { workspaceConfig: () => ({ configured: false, message: '未配置内容工作区' }) },
    dataRoot,
    appVersion: '9.9.9',
    schedulerEnabled: true,
    env: {
      REDFOX_API_KEY: '', LLM_BASE_URL: '', LLM_API_KEY: '', LLM_MODEL: '', GITHUB_API_TOKEN: '',
    },
    xhsMcpService: { getPublicConfig: () => ({ configured: false, enabled: false, baseUrl: '/private/secret' }) },
    kbEncryption: { insecure: false, source: 'managed' },
    now: () => Date.UTC(2026, 7, 4, 8, 30),
    uptime: () => 123.9,
    ...overrides,
  };
  return { dataRoot, database, diagnostics: make(options) };
}

test('诊断结果使用业务状态并覆盖核心与可选能力', () => {
  const current = fixture();
  try {
    const result = current.diagnostics.run();
    assert.equal(result.status, 'warning');
    assert.equal(result.checkedAt, '2026-08-04T08:30:00.000Z');
    assert.deepEqual(new Set(result.items.map(entry => entry.id)), new Set([
      'service', 'database', 'backup', 'storage', 'content-workspace', 'credential-security',
      'redfox', 'llm', 'github', 'notion', 'wersss', 'xhs-mcp',
    ]));
    for (const entry of result.items) {
      assert.ok(['normal', 'warning', 'error'].includes(entry.status));
      assert.ok(entry.summary && entry.impact && entry.nextStep);
    }
  } finally {
    current.database.close();
  }
});

test('已配置 RedFox、LLM 与内容工作区时标记为正常', () => {
  const current = fixture({
    env: { REDFOX_API_KEY: 'secret-redfox', LLM_BASE_URL: 'https://llm.invalid', LLM_API_KEY: 'secret-llm', LLM_MODEL: 'model', GITHUB_API_TOKEN: 'secret-github' },
    contentProjects: { workspaceConfig: () => ({ configured: true, workspaceRoot: '/private/content-secret' }) },
    backupManager: { listBackups: () => ({ backups: [{ status: 'verified', createdAt: '2026-08-04T08:00:00.000Z' }], count: 1 }) },
  });
  try {
    const result = current.diagnostics.run();
    for (const id of ['redfox', 'llm', 'github', 'content-workspace', 'backup']) {
      assert.equal(result.items.find(entry => entry.id === id).status, 'normal');
    }
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /secret-redfox|secret-llm|secret-github|private\/content-secret|private\/secret/);
  } finally {
    current.database.close();
  }
});

test('数据库或备份检查失败时返回可执行错误项而不抛出', () => {
  const current = fixture({ backupManager: { listBackups: () => { throw new Error('/private/backup-secret'); } } });
  try {
    current.database.close();
    const result = current.diagnostics.run();
    assert.equal(result.status, 'error');
    assert.equal(result.items.find(entry => entry.id === 'database').status, 'error');
    assert.equal(result.items.find(entry => entry.id === 'backup').status, 'error');
    assert.doesNotMatch(JSON.stringify(result), /private\/backup-secret/);
  } finally {
    try { current.database.close(); } catch {}
  }
});
