const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  LABEL,
  xmlEscape,
  xmlUnescape,
  buildPlist,
  launchAgentPaths,
  plistWorkingDirectory,
  installedAppRoot,
  serviceTargetsAppRoot,
} = require('../scripts/macos-service');

test('launchd 配置正确转义中文、空格与 XML 特殊字符', () => {
  const plist = buildPlist({
    nodePath: '/Applications/Node & Tools/bin/node',
    appRoot: '/Users/测试/自媒体 <工作台>',
    stdoutPath: '/tmp/out & service.log',
    stderrPath: '/tmp/error > service.log',
  });
  assert.match(plist, new RegExp(`<string>${LABEL}</string>`));
  assert.match(plist, /Node &amp; Tools/);
  assert.match(plist, /自媒体 &lt;工作台&gt;/);
  assert.match(plist, /out &amp; service\.log/);
  assert.match(plist, /error &gt; service\.log/);
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
});

test('launchd 路径固定在当前用户目录且不混入应用目录', () => {
  const paths = launchAgentPaths('/Users/example user', '/tmp/insprira app');
  assert.equal(paths.plistPath, path.join('/Users/example user', 'Library', 'LaunchAgents', `${LABEL}.plist`));
  assert.equal(paths.logDir, path.join('/tmp/insprira app', 'data', 'logs'));
  assert.equal(xmlEscape(`&<>"'`), '&amp;&lt;&gt;&quot;&apos;');
  assert.equal(xmlUnescape('&amp;&lt;&gt;&quot;&apos;'), `&<>"'`);
});

test('常驻服务只归属 plist 中记录的安装目录', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-service-root-'));
  const otherRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-service-other-'));
  const plistPath = path.join(root, 'com.insprira.local.plist');
  try {
    const plist = buildPlist({
      nodePath: process.execPath,
      appRoot: root,
      stdoutPath: path.join(root, 'out.log'),
      stderrPath: path.join(root, 'err.log'),
    });
    fs.writeFileSync(plistPath, plist, 'utf8');
    assert.equal(plistWorkingDirectory(plist), root);
    assert.equal(installedAppRoot(plistPath), root);
    assert.equal(serviceTargetsAppRoot(root, plistPath), true);
    assert.equal(serviceTargetsAppRoot(otherRoot, plistPath), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(otherRoot, { recursive: true, force: true });
  }
});

test('常驻服务命令帮助在非 macOS 测试环境也可读取', () => {
  const result = spawnSync(process.execPath, ['scripts/macos-service.js', '--help'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /install.*status.*uninstall/);
});
