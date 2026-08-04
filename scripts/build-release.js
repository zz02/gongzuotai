#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const REQUIRED_RELEASE_FILES = Object.freeze([
  'LICENSE', 'NOTICE', 'README.md', 'index.html', 'package.json', 'package-lock.json',
  'server.js', 'start.sh', '.env.example', 'docker-compose.yaml',
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    input: options.input,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(detail || `${command} 执行失败`);
  }
  return result.stdout;
}

function normalizeRelative(filename) {
  const value = String(filename || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!value || value.startsWith('/') || value === '..' || value.startsWith('../') || value.includes('/../') || value.includes('\0')) {
    throw new Error(`发布文件路径无效：${filename}`);
  }
  return value;
}

function isForbiddenReleasePath(filename) {
  const value = normalizeRelative(filename);
  if (value === '.env.example') return false;
  return /(^|\/)\.env(?:$|\.)/.test(value)
    || /(^|\/)(?:data|node_modules|\.git)(?:\/|$)/.test(value)
    || /(^|\/)(?:server\.log|app\.pid|nohup\.out)$/.test(value)
    || /(?:^|\/).+\.(?:sqlite|sqlite3)(?:-(?:shm|wal))?$/.test(value)
    || /(?:^|\/)cache\.db(?:-(?:shm|wal))?$/.test(value);
}

function validateFileList(root, files) {
  const normalized = [...new Set(files.map(normalizeRelative))].sort();
  const forbidden = normalized.filter(isForbiddenReleasePath);
  if (forbidden.length) throw new Error(`发布包包含运行时数据或密钥：${forbidden.join('、')}`);
  const missing = REQUIRED_RELEASE_FILES.filter(filename => !normalized.includes(filename));
  if (missing.length) throw new Error(`发布包缺少必需文件：${missing.join('、')}`);
  for (const filename of normalized) {
    const absolute = path.resolve(root, filename);
    const relative = path.relative(root, absolute);
    if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
      throw new Error(`发布文件超出项目目录：${filename}`);
    }
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`发布包不允许符号链接：${filename}`);
    if (!stat.isFile()) throw new Error(`发布条目不是普通文件：${filename}`);
  }
  return normalized;
}

function worktreeFiles(root) {
  const output = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root });
  return output.split('\0').filter(Boolean);
}

function headFiles(root) {
  const output = run('git', ['ls-tree', '-r', '-z', '--name-only', 'HEAD'], { cwd: root });
  return output.split('\0').filter(Boolean);
}

function packageVersion(root, mode) {
  const raw = mode === 'head'
    ? run('git', ['show', 'HEAD:package.json'], { cwd: root })
    : fs.readFileSync(path.join(root, 'package.json'), 'utf8');
  const version = JSON.parse(raw).version;
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(version || ''))) {
    throw new Error('package.json 版本号不是有效 SemVer');
  }
  return version;
}

function copyWorktree(root, files, destination) {
  for (const filename of files) {
    const source = path.join(root, filename);
    const target = path.join(destination, filename);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    fs.chmodSync(target, fs.statSync(source).mode & 0o777);
  }
}

function archiveEntries(archivePath) {
  return run('tar', ['-tzf', archivePath], { cwd: path.dirname(archivePath) }).split(/\r?\n/).filter(Boolean);
}

function verifyArchive(archivePath, folderName) {
  const entries = archiveEntries(archivePath);
  const prefix = `${folderName}/`;
  if (!entries.length || !entries.every(entry => entry === folderName || entry.startsWith(prefix))) {
    throw new Error('发布包目录结构无效');
  }
  const relativeFiles = entries
    .filter(entry => entry.startsWith(prefix) && !entry.endsWith('/'))
    .map(entry => entry.slice(prefix.length));
  const forbidden = relativeFiles.filter(isForbiddenReleasePath);
  if (forbidden.length) throw new Error(`压缩包包含运行时数据或密钥：${forbidden.join('、')}`);
  const missing = REQUIRED_RELEASE_FILES.filter(filename => !relativeFiles.includes(filename));
  if (missing.length) throw new Error(`压缩包缺少必需文件：${missing.join('、')}`);
  return { entries: relativeFiles.length };
}

function checksumFile(archivePath) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
  const checksumPath = `${archivePath}.sha256`;
  fs.writeFileSync(checksumPath, `${hash}  ${path.basename(archivePath)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
  return { hash, checksumPath };
}

function buildRelease(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const mode = options.mode === 'worktree' ? 'worktree' : 'head';
  const version = packageVersion(root, mode);
  const suffix = mode === 'worktree' ? '-candidate' : '';
  const folderName = `insprira-${version}${suffix}`;
  const outputDir = path.resolve(options.outputDir || path.join(root, 'dist'));
  const archivePath = path.join(outputDir, `${folderName}.tar.gz`);
  const checksumPath = `${archivePath}.sha256`;
  if (fs.existsSync(archivePath) || fs.existsSync(checksumPath)) {
    throw new Error(`发布产物已存在：${path.basename(archivePath)}。请先移走旧文件。`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  let fileCount = 0;
  if (mode === 'head') {
    const files = headFiles(root);
    const forbidden = files.map(normalizeRelative).filter(isForbiddenReleasePath);
    if (forbidden.length) throw new Error(`Git HEAD 包含运行时数据或密钥：${forbidden.join('、')}`);
    const missing = REQUIRED_RELEASE_FILES.filter(filename => !files.includes(filename));
    if (missing.length) throw new Error(`Git HEAD 缺少必需文件：${missing.join('、')}`);
    run('git', ['archive', '--format=tar.gz', `--prefix=${folderName}/`, `--output=${archivePath}`, 'HEAD'], { cwd: root });
    fileCount = files.length;
  } else {
    const files = validateFileList(root, worktreeFiles(root));
    fileCount = files.length;
    const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-release-'));
    try {
      const packageRoot = path.join(stagingRoot, folderName);
      fs.mkdirSync(packageRoot, { recursive: true });
      copyWorktree(root, files, packageRoot);
      run('tar', ['-czf', archivePath, '-C', stagingRoot, folderName], { cwd: root });
    } finally {
      fs.rmSync(stagingRoot, { recursive: true, force: true });
    }
  }

  const verified = verifyArchive(archivePath, folderName);
  const checksum = checksumFile(archivePath);
  return {
    mode,
    version,
    folderName,
    archivePath,
    checksumPath: checksum.checksumPath,
    sha256: checksum.hash,
    sourceFiles: fileCount,
    archiveFiles: verified.entries,
    bytes: fs.statSync(archivePath).size,
  };
}

function parseArgs(argv) {
  const args = { mode: 'head', outputDir: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--worktree') args.mode = 'worktree';
    else if (value === '--output-dir') {
      args.outputDir = argv[index + 1] || '';
      index += 1;
    } else throw new Error(`未知参数：${value}`);
  }
  return args;
}

if (require.main === module) {
  try {
    const result = buildRelease(parseArgs(process.argv.slice(2)));
    process.stdout.write(`发布包已生成：${result.archivePath}\n`);
    process.stdout.write(`校验文件：${result.checksumPath}\n`);
    process.stdout.write(`版本：v${result.version} · ${result.archiveFiles} 个文件 · ${result.bytes} 字节\n`);
    process.stdout.write(`SHA-256：${result.sha256}\n`);
    if (result.mode === 'worktree') process.stdout.write('类型：当前工作树候选包，仅用于安装验收，不代表 GitHub 正式发布。\n');
  } catch (error) {
    process.stderr.write(`发布包生成失败：${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  REQUIRED_RELEASE_FILES,
  archiveEntries,
  buildRelease,
  isForbiddenReleasePath,
  normalizeRelative,
  validateFileList,
  verifyArchive,
};
