const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { classifyPublicAsset, serveStatic } = require('../lib/static');

test('静态资源分类只开放前端运行所需目录与扩展名', () => {
  assert.deepEqual(classifyPublicAsset('/'), { relative: 'index.html', publicDir: '' });
  assert.deepEqual(classifyPublicAsset('/js/pages/content-projects.js'), {
    relative: 'js/pages/content-projects.js',
    publicDir: 'js',
  });
  assert.deepEqual(classifyPublicAsset('/vendor/manrope-latin.woff2'), {
    relative: 'vendor/manrope-latin.woff2',
    publicDir: 'vendor',
  });
  for (const pathname of [
    '/.env', '/%2eenv', '/server.js', '/data/cache.db', '/js/.hidden.js',
    '/js/app.txt', '/css/../.env', '/vendor/file.exe', '/unknown/app.js',
  ]) {
    assert.equal(classifyPublicAsset(pathname), null, pathname);
  }
});

test('静态服务拒绝资源目录内指向目录外的符号链接', async (t) => {
  if (process.platform === 'win32') return t.skip('Windows 普通用户环境不保证可创建符号链接');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-static-'));
  fs.mkdirSync(path.join(root, 'js'));
  fs.writeFileSync(path.join(root, 'index.html'), '<html></html>');
  fs.writeFileSync(path.join(root, '.env'), 'REDFOX_API_KEY=must-not-leak');
  fs.symlinkSync(path.join(root, '.env'), path.join(root, 'js', 'leak.js'));

  const response = await new Promise(resolve => {
    const output = { status: null, headers: null, body: '' };
    const res = {
      writeHead(status, headers) {
        output.status = status;
        output.headers = headers;
      },
      end(body = '') {
        output.body = String(body);
        resolve(output);
      },
    };
    serveStatic(root, res, '/js/leak.js');
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.includes('must-not-leak'), false);
  fs.rmSync(root, { recursive: true, force: true });
});
