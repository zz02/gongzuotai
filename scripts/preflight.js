#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REQUIRED_FILES = [
  'server.js', 'index.html', 'package.json', 'package-lock.json', '.env.example', 'LICENSE', 'NOTICE',
  'lib/login-guard.js', 'lib/diagnostics.js', 'lib/backups.js',
  'scripts/backup.js', 'scripts/build-release.js', 'scripts/restore-backup.js', 'scripts/reset-password.js',
];

function fail(message) {
  process.stderr.write(`发布前自检失败：${message}\n`);
  process.exit(1);
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function filesUnder(directory) {
  const root = path.join(ROOT, directory);
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(relative));
    else output.push(relative);
  }
  return output;
}

function checkManifest() {
  const packageJson = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(packageJson.version)) fail('package.json 版本号不是有效 SemVer');
  if (lock.version !== packageJson.version || lock.packages?.['']?.version !== packageJson.version) {
    fail('package.json 与 package-lock.json 版本不一致');
  }
  const releaseTag = String(process.env.RELEASE_TAG || '').trim();
  if (releaseTag && releaseTag !== `v${packageJson.version}`) fail(`发布标签 ${releaseTag} 与 v${packageJson.version} 不一致`);
  for (const filename of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(ROOT, filename))) fail(`缺少交付文件 ${filename}`);
  }
  return packageJson.version;
}

function checkBrowserImports() {
  const javascriptFiles = filesUnder('js').filter(filename => filename.endsWith('.js'));
  for (const filename of javascriptFiles) {
    const source = read(filename);
    const syntax = spawnSync(process.execPath, ['--check', '--input-type=module'], {
      cwd: ROOT,
      encoding: 'utf8',
      input: source,
    });
    if (syntax.status !== 0) {
      const detail = String(syntax.stderr || syntax.stdout || '').trim().split('\n').slice(-3).join(' ');
      fail(`${filename} 语法检查失败${detail ? `：${detail}` : ''}`);
    }
    const matcher = /\bfrom\s+['"](\.[^'"]+)['"]/g;
    for (const match of source.matchAll(matcher)) {
      const candidate = path.resolve(ROOT, path.dirname(filename), match[1]);
      const resolved = path.extname(candidate) ? candidate : `${candidate}.js`;
      if (!fs.existsSync(resolved)) fail(`${filename} 引用了不存在的模块 ${match[1]}`);
    }
  }
}

function checkUiActions() {
  const sources = ['index.html', ...filesUnder('js').filter(filename => filename.endsWith('.js'))];
  const used = new Set();
  for (const filename of sources) {
    for (const match of read(filename).matchAll(/data-action=["']([A-Za-z0-9_-]+)["']/g)) used.add(match[1]);
  }
  const registered = new Set([...read('js/app.js').matchAll(/registerAction\(['"]([A-Za-z0-9_-]+)['"]/g)].map(match => match[1]));
  const missing = [...used].filter(action => !registered.has(action)).sort();
  if (missing.length) fail(`页面动作未注册：${missing.join('、')}`);
}

function checkLocalAssets() {
  const html = read('index.html');
  const references = [...html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
  for (const reference of references) {
    if (/^(?:data:|https?:|\/\/)/.test(reference)) continue;
    const filename = reference.replace(/^\//, '').split(/[?#]/)[0];
    if (!fs.existsSync(path.join(ROOT, filename))) fail(`index.html 引用了不存在的资源 ${reference}`);
  }
}

function checkTrackedRuntimeFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) fail('无法读取 Git 交付清单');
  const files = result.stdout.split('\0').filter(Boolean);
  const forbidden = files.filter(filename => (
    /(^|\/)\.env$/.test(filename)
    || /(^|\/)(?:data|node_modules)(?:\/|$)/.test(filename)
    || /(^|\/)(?:server\.log|app\.pid)$/.test(filename)
  ));
  if (forbidden.length) fail(`Git 中包含运行时数据或密钥文件：${forbidden.join('、')}`);
}

function run(command, args, label) {
  process.stdout.write(`\n[自检] ${label}\n`);
  const result = spawnSync(command, args, { cwd: ROOT, env: process.env, stdio: 'inherit' });
  if (result.error) fail(`${label} 无法执行：${result.error.message}`);
  if (result.status !== 0) fail(`${label} 未通过`);
}

const version = checkManifest();
checkBrowserImports();
checkUiActions();
checkLocalAssets();
checkTrackedRuntimeFiles();
process.stdout.write(`[自检] 交付结构通过（v${version}）\n`);

run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test'], '完整自动化测试');
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'check'], '服务端语法检查');
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], '前端样式构建');
run('git', ['diff', '--check'], '变更格式检查');

process.stdout.write(`\n发布前自检通过：Insprira v${version}\n`);
