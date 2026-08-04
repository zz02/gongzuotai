const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const contentProjects = require('../lib/content-projects');
const { createContentWorkspace } = require('./content-workspace-fixture');

test('未配置内容工作区时返回可操作的空状态', async () => {
  const before = process.env.CONTENT_WORKSPACE_ROOT;
  delete process.env.CONTENT_WORKSPACE_ROOT;
  try {
    const result = await contentProjects.listProjects();
    assert.equal(result.config.configured, false);
    assert.match(result.config.message, /尚未配置/);
    assert.deepEqual(result.projects, []);
  } finally {
    if (before == null) delete process.env.CONTENT_WORKSPACE_ROOT;
    else process.env.CONTENT_WORKSPACE_ROOT = before;
  }
});

test('已配置的空项目目录返回空列表', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-empty-content-'));
  const before = process.env.CONTENT_WORKSPACE_ROOT;
  fs.mkdirSync(path.join(root, '内容工作台', '项目', '进行中'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  process.env.CONTENT_WORKSPACE_ROOT = root;
  try {
    const result = await contentProjects.listProjects();
    assert.equal(result.config.configured, true);
    assert.deepEqual(result.projects, []);
  } finally {
    if (before == null) delete process.env.CONTENT_WORKSPACE_ROOT;
    else process.env.CONTENT_WORKSPACE_ROOT = before;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('创建脚本中途失败时不在正式目录留下半成品', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-atomic-content-'));
  const before = process.env.CONTENT_WORKSPACE_ROOT;
  const { projectsRoot } = createContentWorkspace(root);
  const script = path.join(root, 'scripts', 'new_content_project.sh');
  fs.writeFileSync(script, `#!/bin/sh
set -eu
target="\${CONTENT_PROJECTS_ROOT}/\${2}-半成品"
mkdir "$target"
printf 'partial' > "$target/partial.txt"
echo '模拟模板复制失败' >&2
exit 9
`, { mode: 0o755 });
  process.env.CONTENT_WORKSPACE_ROOT = root;
  try {
    await assert.rejects(
      contentProjects.createProject({ title: '半成品', date: '2026-08-03' }),
      error => error.code === 'CREATE_FAILED' && error.status === 422,
    );
    const names = fs.readdirSync(projectsRoot);
    assert.equal(names.some(name => name.includes('半成品')), false);
    assert.equal(names.some(name => name.startsWith('.insprira-staging-')), false);
  } finally {
    if (before == null) delete process.env.CONTENT_WORKSPACE_ROOT;
    else process.env.CONTENT_WORKSPACE_ROOT = before;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('选题交接模板不完整时整体回滚且不留下项目目录', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-origin-rollback-'));
  const before = process.env.CONTENT_WORKSPACE_ROOT;
  const { projectsRoot } = createContentWorkspace(root);
  fs.writeFileSync(path.join(root, '内容工作台', '_模板', '内容项目', '01-资料.md'), '# 缺少原始来源区域\n');
  process.env.CONTENT_WORKSPACE_ROOT = root;
  try {
    await assert.rejects(
      contentProjects.createProject({
        title: '交接失败回滚',
        date: '2026-08-03',
        origin: {
          ref: 'insp:rollback-test',
          title: '交接失败回滚',
          summary: '模板异常时不能提交半成品。',
          sourceItems: [{ title: '测试证据', platform: 'gzh' }],
        },
      }),
      error => error.code === 'PROJECT_TEMPLATE_INVALID' && error.status === 422,
    );
    const names = fs.readdirSync(projectsRoot);
    assert.equal(names.some(name => name.includes('交接失败回滚')), false);
    assert.equal(names.some(name => name.startsWith('.insprira-staging-')), false);
  } finally {
    if (before == null) delete process.env.CONTENT_WORKSPACE_ROOT;
    else process.env.CONTENT_WORKSPACE_ROOT = before;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
