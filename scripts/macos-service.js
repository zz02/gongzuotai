#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { readEnvValues } = require('../lib/env');

const APP_ROOT = path.resolve(__dirname, '..');
const LABEL = 'com.insprira.local';
const PACKAGE_VERSION = require('../package.json').version;

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlUnescape(value) {
  return String(value)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function plistWorkingDirectory(content) {
  const match = String(content || '').match(/<key>WorkingDirectory<\/key>\s*<string>([\s\S]*?)<\/string>/);
  return match ? xmlUnescape(match[1]).trim() : '';
}

function installedAppRoot(plistPath = launchAgentPaths().plistPath) {
  if (!fs.existsSync(plistPath)) return '';
  try { return plistWorkingDirectory(fs.readFileSync(plistPath, 'utf8')); }
  catch { return ''; }
}

function canonicalPath(value) {
  const resolved = path.resolve(String(value || ''));
  try { return fs.realpathSync(resolved); } catch { return resolved; }
}

function serviceTargetsAppRoot(appRoot = APP_ROOT, plistPath = launchAgentPaths().plistPath) {
  const installed = installedAppRoot(plistPath);
  return Boolean(installed) && canonicalPath(installed) === canonicalPath(appRoot);
}

function requireCurrentInstallation(paths = launchAgentPaths()) {
  if (!fs.existsSync(paths.plistPath)) throw new Error('常驻服务尚未安装，请先运行 npm run service:install');
  if (!serviceTargetsAppRoot(APP_ROOT, paths.plistPath)) {
    throw new Error('常驻服务属于另一个安装目录。请回到原目录操作，或在当前目录运行 npm run service:install 完成接管。');
  }
  return paths;
}

function buildPlist({ nodePath, appRoot, stdoutPath, stderrPath }) {
  const runtimePath = [
    path.dirname(nodePath),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].filter((item, index, items) => items.indexOf(item) === index).join(':');
  const string = value => `<string>${xmlEscape(value)}</string>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  ${string(LABEL)}
  <key>ProgramArguments</key>
  <array>
    ${string(nodePath)}
    ${string(path.join(appRoot, 'server.js'))}
  </array>
  <key>WorkingDirectory</key>
  ${string(appRoot)}
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    ${string(runtimePath)}
    <key>INSPRIRA_ENV_FILE</key>
    ${string(path.join(appRoot, '.env'))}
    <key>FURNACE_SERVICE_MANAGER</key>
    <string>launchd</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <key>TimeOut</key>
  <integer>20</integer>
  <key>Umask</key>
  <integer>63</integer>
  <key>StandardOutPath</key>
  ${string(stdoutPath)}
  <key>StandardErrorPath</key>
  ${string(stderrPath)}
</dict>
</plist>
`;
}

function launchAgentPaths(homeDir = os.homedir(), appRoot = APP_ROOT) {
  const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');
  const logDir = path.join(appRoot, 'data', 'logs');
  return {
    launchAgentsDir,
    plistPath: path.join(launchAgentsDir, `${LABEL}.plist`),
    logDir,
    stdoutPath: path.join(logDir, 'insprira.out.log'),
    stderrPath: path.join(logDir, 'insprira.err.log'),
  };
}

function launchDomain() {
  if (typeof process.getuid !== 'function') throw new Error('无法读取当前 macOS 用户标识');
  return `gui/${process.getuid()}`;
}

function runLaunchctl(args, { allowFailure = false, quiet = false } = {}) {
  const result = spawnSync('launchctl', args, {
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 && !allowFailure) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`launchctl ${args[0]} 失败${detail ? `：${detail}` : ''}`);
  }
  return result;
}

function isLoaded() {
  const result = runLaunchctl(['print', `${launchDomain()}/${LABEL}`], { allowFailure: true, quiet: true });
  return result.status === 0;
}

function configuredPort(appRoot = APP_ROOT) {
  const value = Number(readEnvValues(path.join(appRoot, '.env')).PORT || 8080);
  return Number.isInteger(value) && value > 0 && value <= 65535 ? value : 8080;
}

function healthCheck(port = configuredPort(), timeoutMs = 1500) {
  return new Promise(resolve => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/api/_/version', timeout: timeoutMs }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          const payload = JSON.parse(body);
          resolve(response.statusCode === 200 && payload.ok === true
            ? { ok: true, version: payload.version }
            : { ok: false, error: `HTTP ${response.statusCode}` });
        } catch {
          resolve({ ok: false, error: '版本接口返回了无效数据' });
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('连接超时')));
    req.on('error', error => resolve({ ok: false, error: error.message }));
  });
}

async function waitForHealth(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let latest = { ok: false, error: '尚未启动' };
  while (Date.now() < deadline) {
    latest = await healthCheck(port);
    if (latest.ok) return latest;
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  return latest;
}

async function waitForStopped(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const health = await healthCheck(port, 350);
    if (!health.ok) return true;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

function ensureMac() {
  if (process.platform !== 'darwin') throw new Error('常驻服务安装仅支持 macOS；其他系统可使用 Docker 部署');
}

function startService(plistPath) {
  if (!fs.existsSync(plistPath)) throw new Error('常驻服务尚未安装，请先运行 npm run service:install');
  if (!isLoaded()) {
    // RunAtLoad 会在 bootstrap 后自动拉起进程；此时立即 kickstart 会与
    // launchd 的首次调度竞争，偶发返回失败。
    runLaunchctl(['bootstrap', launchDomain(), plistPath]);
    return;
  }
  runLaunchctl(['kickstart', '-k', `${launchDomain()}/${LABEL}`]);
}

function stopService() {
  if (isLoaded()) runLaunchctl(['bootout', `${launchDomain()}/${LABEL}`]);
}

async function installService() {
  ensureMac();
  const paths = launchAgentPaths();
  const port = configuredPort();
  const existingHealth = await healthCheck(port, 500);
  if (existingHealth.ok && !isLoaded()) {
    throw new Error(`端口 ${port} 上已有未受 macOS 托管的服务，请先运行 ./start.sh stop`);
  }

  fs.mkdirSync(paths.launchAgentsDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(paths.logDir, { recursive: true, mode: 0o700 });
  stopService();

  const plist = buildPlist({
    nodePath: process.execPath,
    appRoot: APP_ROOT,
    stdoutPath: paths.stdoutPath,
    stderrPath: paths.stderrPath,
  });
  const tempPath = `${paths.plistPath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, plist, { mode: 0o600 });
  fs.renameSync(tempPath, paths.plistPath);
  fs.chmodSync(paths.plistPath, 0o644);

  try {
    startService(paths.plistPath);
    const health = await waitForHealth(port);
    if (!health.ok) throw new Error(`服务未通过健康检查：${health.error}`);
    process.stdout.write(`常驻服务已安装并启动：Insprira v${health.version}\n`);
    process.stdout.write(`访问地址：http://127.0.0.1:${port}\n`);
    process.stdout.write(`登录系统后会自动启动，退出后异常中断也会自动恢复。\n`);
    process.stdout.write(`日志目录：${paths.logDir}\n`);
  } catch (error) {
    stopService();
    throw error;
  }
}

async function statusService() {
  ensureMac();
  const paths = launchAgentPaths();
  const installedRoot = installedAppRoot(paths.plistPath);
  const owned = Boolean(installedRoot) && serviceTargetsAppRoot(APP_ROOT, paths.plistPath);
  const loaded = isLoaded();
  const health = await healthCheck(installedRoot ? configuredPort(installedRoot) : configuredPort());
  const installedLabel = !fs.existsSync(paths.plistPath) ? '未安装' : owned ? '已安装' : '已由其他目录安装';
  process.stdout.write(`安装状态：${installedLabel}\n`);
  process.stdout.write(`托管状态：${loaded ? '运行中' : '未运行'}\n`);
  process.stdout.write(`健康检查：${health.ok ? `通过（v${health.version}）` : `失败（${health.error}）`}\n`);
  if (!owned || !loaded || !health.ok) process.exitCode = 1;
}

function uninstallService() {
  ensureMac();
  const { plistPath } = requireCurrentInstallation();
  stopService();
  if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
  process.stdout.write('常驻服务已卸载；数据库、配置和内容工作区均已保留。\n');
}

function showLogs() {
  ensureMac();
  const { stdoutPath, stderrPath } = requireCurrentInstallation();
  const files = [stdoutPath, stderrPath].filter(fs.existsSync);
  if (!files.length) throw new Error('尚无服务日志');
  spawnSync('tail', ['-n', '100', '-f', ...files], { stdio: 'inherit' });
}

function usage() {
  process.stdout.write(`用法：node scripts/macos-service.js <命令>\n\n`);
  process.stdout.write(`命令：install | start | stop | restart | status | logs | uninstall\n`);
}

async function main() {
  const command = process.argv[2];
  if (command === 'install') return installService();
  if (command === 'start') {
    ensureMac();
    const paths = requireCurrentInstallation();
    startService(paths.plistPath);
    const health = await waitForHealth(configuredPort());
    if (!health.ok) throw new Error(`服务启动失败：${health.error}`);
    process.stdout.write(`服务已启动：Insprira v${health.version}\n`);
    return;
  }
  if (command === 'stop') {
    ensureMac();
    requireCurrentInstallation();
    stopService();
    process.stdout.write('服务已停止，常驻配置仍保留。\n');
    return;
  }
  if (command === 'restart') {
    ensureMac();
    const paths = requireCurrentInstallation();
    startService(paths.plistPath);
    const health = await waitForHealth(configuredPort());
    if (!health.ok) throw new Error(`服务重启失败：${health.error}`);
    process.stdout.write(`服务已重启：Insprira v${health.version}\n`);
    return;
  }
  if (command === 'status') return statusService();
  if (command === 'logs') return showLogs();
  if (command === 'uninstall') return uninstallService();
  usage();
  if (command && !['-h', '--help'].includes(command)) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`[ERROR] ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  APP_ROOT,
  LABEL,
  PACKAGE_VERSION,
  xmlEscape,
  xmlUnescape,
  buildPlist,
  launchAgentPaths,
  plistWorkingDirectory,
  installedAppRoot,
  serviceTargetsAppRoot,
  configuredPort,
  healthCheck,
  isLoaded,
  startService,
  stopService,
  waitForHealth,
  waitForStopped,
};
