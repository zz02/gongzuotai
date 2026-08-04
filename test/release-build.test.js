const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  buildRelease, isForbiddenReleasePath, validateFileList,
} = require('../scripts/build-release');

function run(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} 失败`);
  return result.stdout;
}

function write(root, filename, content = '') {
  const target = path.join(root, filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-release-test-'));
  run(root, 'git', ['init', '-q']);
  write(root, '.gitignore', '.env\ndata/\nnode_modules/\ndist/\n');
  write(root, 'LICENSE', 'test license');
  write(root, 'NOTICE', 'test modification notice');
  write(root, 'README.md', '# test');
  write(root, 'index.html', '<!doctype html><title>test</title>');
  write(root, 'package.json', JSON.stringify({ name: 'insprira', version: '1.2.3' }));
  write(root, 'package-lock.json', JSON.stringify({ name: 'insprira', version: '1.2.3', lockfileVersion: 3, packages: { '': { version: '1.2.3' } } }));
  write(root, 'server.js', 'console.log("ok")');
  write(root, 'start.sh', '#!/bin/sh\nnode server.js\n');
  fs.chmodSync(path.join(root, 'start.sh'), 0o755);
  write(root, '.env.example', 'HOST=127.0.0.1\n');
  write(root, 'docker-compose.yaml', 'services: {}\n');
  write(root, 'lib/example.js', 'module.exports = true;\n');
  write(root, '.env', 'SECRET=do-not-package\n');
  write(root, 'data/cache.db', 'private');
  return root;
}

test('发布路径规则允许配置示例，拒绝密钥与运行时数据', () => {
  assert.equal(isForbiddenReleasePath('.env.example'), false);
  assert.equal(isForbiddenReleasePath('.env'), true);
  assert.equal(isForbiddenReleasePath('config/.env.production'), true);
  assert.equal(isForbiddenReleasePath('data/cache.db'), true);
  assert.equal(isForbiddenReleasePath('node_modules/a.js'), true);
  assert.equal(isForbiddenReleasePath('cache.db-wal'), true);
});

test('候选发布包忽略本机密钥与数据，并生成可验证压缩包', () => {
  const root = fixture();
  const outputDir = path.join(root, 'dist');
  try {
    const result = buildRelease({ root, mode: 'worktree', outputDir });
    assert.equal(result.version, '1.2.3');
    assert.match(path.basename(result.archivePath), /^insprira-1\.2\.3-candidate\.tar\.gz$/);
    assert.equal(fs.existsSync(result.checksumPath), true);
    const entries = run(root, 'tar', ['-tzf', result.archivePath]);
    assert.match(entries, /insprira-1\.2\.3-candidate\/package-lock\.json/);
    assert.match(entries, /insprira-1\.2\.3-candidate\/NOTICE/);
    assert.doesNotMatch(entries, /\/\.env(?:\n|$)/);
    assert.doesNotMatch(entries, /\/data\//);
    assert.doesNotMatch(entries, /\/node_modules\//);
    const checksum = fs.readFileSync(result.checksumPath, 'utf8');
    assert.match(checksum, /^[a-f0-9]{64}  insprira-1\.2\.3-candidate\.tar\.gz\n$/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('被 Git 追踪的密钥文件会阻断打包', () => {
  const root = fixture();
  try {
    run(root, 'git', ['add', '-f', '.env']);
    assert.throws(
      () => buildRelease({ root, mode: 'worktree', outputDir: path.join(root, 'dist') }),
      /运行时数据或密钥/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('发布文件列表拒绝符号链接', () => {
  const root = fixture();
  try {
    fs.symlinkSync(path.join(root, 'README.md'), path.join(root, 'linked-readme'));
    assert.throws(
      () => validateFileList(root, [
        'LICENSE', 'NOTICE', 'README.md', 'index.html', 'package.json', 'package-lock.json',
        'server.js', 'start.sh', '.env.example', 'docker-compose.yaml', 'linked-readme',
      ]),
      /不允许符号链接/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
