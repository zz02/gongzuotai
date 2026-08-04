const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const START_SCRIPT = path.resolve(__dirname, '..', 'start.sh');

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function createFixture(t, { installed = true, healthReady = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-start-'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  if (installed) fs.mkdirSync(path.join(root, 'node_modules', 'better-sqlite3'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(START_SCRIPT, path.join(root, 'start.sh'));
  fs.chmodSync(path.join(root, 'start.sh'), 0o755);
  fs.writeFileSync(path.join(root, '.env'), 'PORT=18991\n', { mode: 0o600 });
  fs.writeFileSync(path.join(root, 'scripts', 'check-native-dependencies.js'), 'fixture\n');
  fs.writeFileSync(path.join(root, 'server.js'), 'fixture\n');
  if (healthReady) fs.writeFileSync(path.join(root, 'http-ready'), 'ready\n');

  writeExecutable(path.join(bin, 'node'), `#!/usr/bin/env bash
if [[ "\${1:-}" == "-p" ]]; then printf '22\\n'; exit 0; fi
if [[ "\${1:-}" == "-e" ]]; then [[ -f "${root}/http-ready" ]] && exit 0; exit 1; fi
if [[ "\${1:-}" == "scripts/check-native-dependencies.js" ]]; then
  [[ -f "${root}/runtime-ready" ]] && exit 0
  exit 1
fi
if [[ "\${1:-}" == "server.js" ]]; then exec sleep 30; fi
exit 0
`);
  writeExecutable(path.join(bin, 'npm'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "${root}/npm-calls"
if [[ "\${1:-}" == "install" && "\${2:-}" == "--omit=dev" ]]; then
  mkdir -p "${root}/node_modules/better-sqlite3"
  touch "${root}/runtime-ready"
  exit 0
fi
if [[ "\${1:-}" == "rebuild" && "\${2:-}" == "better-sqlite3" ]]; then
  touch "${root}/runtime-ready"
  printf 'rebuilt dependencies successfully\\n'
  exit 0
fi
exit 1
`);

  const env = {
    ...process.env,
    HOME: root,
    PATH: `${bin}:${process.env.PATH}`,
    INSPRIRA_START_TIMEOUT_SEC: '1',
  };
  t.after(() => {
    spawnSync('bash', ['./start.sh', 'stop'], { cwd: root, env, encoding: 'utf8' });
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, env };
}

test('启动脚本发现 Node ABI 变化后自动重建数据库依赖', (t) => {
  const { root, env } = createFixture(t);
  const started = spawnSync('bash', ['./start.sh', 'start'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(started.status, 0, started.stderr);
  assert.match(started.stdout, /检测到 Node 运行时变化/);
  assert.match(started.stdout, /数据库依赖已适配/);
  assert.equal(fs.existsSync(path.join(root, 'runtime-ready')), true);

  const stopped = spawnSync('bash', ['./start.sh', 'stop'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(stopped.status, 0, stopped.stderr);
  assert.equal(fs.existsSync(path.join(root, 'app.pid')), false);
});

test('全新启动只安装生产运行依赖', (t) => {
  const { root, env } = createFixture(t, { installed: false });
  const started = spawnSync('bash', ['./start.sh', 'start'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(started.status, 0, started.stderr);
  assert.match(started.stdout, /npm install --omit=dev/);
  assert.equal(fs.readFileSync(path.join(root, 'npm-calls'), 'utf8').trim(), 'install --omit=dev');
});

test('进程存在但健康检查失败时启动失败并清理 PID', (t) => {
  const { root, env } = createFixture(t, { healthReady: false });
  fs.writeFileSync(path.join(root, 'runtime-ready'), 'ready\n');
  const started = spawnSync('bash', ['./start.sh', 'start'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(started.status, 1);
  assert.match(started.stderr, /未通过健康检查/);
  assert.equal(fs.existsSync(path.join(root, 'app.pid')), false);
});
