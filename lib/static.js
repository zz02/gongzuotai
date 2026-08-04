// 静态文件服务：仅暴露浏览器运行所需的明确资源。
// 应用根目录还包含 .env、SQLite、备份和后端源码，不能把“位于根目录内”
// 等同于“允许通过 HTTP 读取”。
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const PUBLIC_ROOT_FILES = new Set(['index.html']);
const PUBLIC_ASSET_DIRS = new Map([
  ['css', new Set(['.css'])],
  ['js', new Set(['.js', '.mjs'])],
  ['vendor', new Set(['.js', '.css', '.woff', '.woff2'])],
]);

function classifyPublicAsset(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(pathname || '/'));
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;

  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const segments = relative.split('/');
  if (!relative || segments.some(segment => !segment || segment === '..' || segment.startsWith('.'))) {
    return null;
  }
  if (segments.length === 1) {
    return PUBLIC_ROOT_FILES.has(relative) ? { relative, publicDir: '' } : null;
  }

  const publicDir = segments[0];
  const extensions = PUBLIC_ASSET_DIRS.get(publicDir);
  if (!extensions || !extensions.has(path.extname(relative).toLowerCase())) return null;
  return { relative, publicDir };
}

function notFound(res) {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end('Not found');
}

function serveStatic(rootDir, res, pathname) {
  const asset = classifyPublicAsset(pathname);
  if (!asset) return notFound(res);

  const root = path.resolve(rootDir);
  const filePath = path.resolve(root, asset.relative);
  const expectedBase = asset.publicDir ? path.join(root, asset.publicDir) : root;
  if (filePath !== expectedBase && !filePath.startsWith(`${expectedBase}${path.sep}`)) {
    return notFound(res);
  }

  fs.realpath(filePath, (realPathError, realFilePath) => {
    if (realPathError) return notFound(res);
    fs.realpath(expectedBase, (realBaseError, realBasePath) => {
      if (realBaseError) return notFound(res);
      const insideExpectedBase = realFilePath === realBasePath
        || realFilePath.startsWith(`${realBasePath}${path.sep}`);
      // 根目录只开放固定的 index.html；不允许它通过符号链接指向其他文件。
      const exactRootFile = asset.publicDir || realFilePath === filePath;
      if (!insideExpectedBase || !exactRootFile) return notFound(res);

      const mime = MIME[path.extname(realFilePath).toLowerCase()] || 'application/octet-stream';
      fs.readFile(realFilePath, (error, content) => {
        if (error) return notFound(res);
        // 本地工作台频繁更新，禁用浏览器缓存可避免 HTML 与 ES Module 版本错配。
        res.writeHead(200, {
          'Content-Type': mime,
          'Cache-Control': 'no-store',
        });
        res.end(content);
      });
    });
  });
}

module.exports = {
  serveStatic,
  classifyPublicAsset,
  PUBLIC_ROOT_FILES,
  PUBLIC_ASSET_DIRS,
  MIME,
};
