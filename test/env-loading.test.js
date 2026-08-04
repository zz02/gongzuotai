const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

test('.env 在数据库、RedFox 与加密模块初始化前生效', () => {
  const root = path.join(os.tmpdir(), `insprira-env-order-${process.pid}`);
  const dataDir = path.join(root, 'runtime-data');
  const envFile = path.join(root, '.env');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(envFile, [
    `DATA_DIR=${dataDir}`,
    'REDFOX_API_KEY=loaded-before-modules',
    `KB_ENCRYPTION_KEY=${'ab'.repeat(32)}`,
    'ENABLE_SCHEDULER=false',
  ].join('\n') + '\n');

  const childEnv = { ...process.env, INSPRIRA_ENV_FILE: envFile, NODE_ENV: 'test' };
  for (const key of ['DATA_DIR', 'CACHE_DB_PATH', 'REDFOX_API_KEY', 'KB_ENCRYPTION_KEY', 'ENABLE_SCHEDULER']) {
    delete childEnv[key];
  }
  const script = `
    require('./server.js');
    const { DB_PATH } = require('./lib/db');
    const { KB_ENC_SOURCE, KB_ENC_INSECURE } = require('./lib/auth');
    console.log('ENV_ORDER_RESULT=' + JSON.stringify({
      redfox: process.env.REDFOX_API_KEY,
      dbPath: DB_PATH,
      keySource: KB_ENC_SOURCE,
      insecure: KB_ENC_INSECURE,
    }));
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: childEnv,
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const line = result.stdout.split(/\r?\n/).find(value => value.startsWith('ENV_ORDER_RESULT='));
  assert.ok(line, `缺少验证输出：${result.stdout}`);
  const payload = JSON.parse(line.slice('ENV_ORDER_RESULT='.length));
  assert.equal(payload.redfox, 'loaded-before-modules');
  assert.equal(payload.dbPath, path.join(dataDir, 'cache.db'));
  assert.equal(payload.keySource, 'environment');
  assert.equal(payload.insecure, false);
});
