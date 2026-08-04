const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-content-skill-data-'));
process.env.DATA_DIR = dataRoot;
process.env.NODE_ENV = 'test';
process.env.REDFOX_API_KEY = '';

const { db } = require('../lib/db');
const { make } = require('../lib/content-skill-runs');
const { createContentWorkspace } = require('./content-workspace-fixture');

const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'insprira-content-skill-workspace-'));
const { projectsRoot } = createContentWorkspace(workspaceRoot);
const projectId = '2026-08-01-可推进项目';
const projectPath = path.join(projectsRoot, projectId);
process.env.CONTENT_WORKSPACE_ROOT = workspaceRoot;

let answer = '改写后的正文。\n\n### 具体场景\n\n只使用项目资料，不补造事实。';
let executeCount = 0;
const audit = [];
const service = make({
  db,
  listLocalAgents: async () => [
    { id: 'codex', name: 'Codex', available: true, family: 'Codex CLI' },
    { id: 'claude', name: 'Claude Code', available: false, reason: '未登录' },
  ],
  executeAgent: async (_agentId, prompt, mode) => {
    executeCount += 1;
    assert.equal(mode, 'read');
    assert.match(prompt, /不要调用工具、命令或网络/);
    assert.match(prompt, /Berry Human Writer/);
    return answer;
  },
  logAction: (...args) => audit.push(args),
});

test.after(() => {
  try { db.close(); } catch {}
  fs.rmSync(dataRoot, { recursive: true, force: true });
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

test('工作区 Skill 分为可执行白名单与暂未接入能力', async () => {
  const context = await service.getContext(projectId);
  const writer = context.skills.find(item => item.id === 'berry-human-writer');
  const image = context.skills.find(item => item.id === 'banana-image-gen');
  assert.equal(writer.eligible, true);
  assert.deepEqual(writer.targets, ['master', 'wechat', 'xiaohongshu', 'douyin']);
  assert.equal(image.eligible, false);
  assert.match(image.unavailableReason, /第一版只开放/);
  assert.equal(context.targets.length, 4);
  assert.equal(context.agents[0].id, 'codex');
});

test('Skill 先生成预览，确认后只替换目标章节', async () => {
  const cardPath = path.join(projectPath, '00-项目卡.md');
  const card = fs.readFileSync(cardPath, 'utf8').replace(
    'status: 待立项',
    'status: 待立项\norigin_mode: hot-evidence\norigin_evidence_count: 2',
  );
  fs.writeFileSync(cardPath, card);
  const targetPath = path.join(projectPath, '03-公众号.md');
  const beforeFile = fs.readFileSync(targetPath, 'utf8');

  const run = await service.execute(projectId, {
    skillId: 'berry-human-writer',
    targetKey: 'wechat',
    agentId: 'codex',
    instruction: '保留克制语气。',
  });

  assert.equal(run.status, 'succeeded');
  assert.equal(run.evidenceMode, 'hot-evidence');
  assert.equal(run.evidenceCount, 2);
  assert.equal(fs.readFileSync(targetPath, 'utf8'), beforeFile, '生成预览前不得写入目标文件');
  assert.equal(audit.at(-1)[2], 'workspace+redfox-context');

  const applied = service.apply(projectId, run.id);
  const afterFile = fs.readFileSync(targetPath, 'utf8');
  assert.equal(applied.status, 'applied');
  assert.match(afterFile, /## 正文\n\n改写后的正文。/);
  assert.match(afterFile, /## 配图位置/);
  assert.doesNotMatch(afterFile, /原公众号正文/);
  assert.equal(service.apply(projectId, run.id).status, 'applied', '重复确认应保持幂等');
});

test('目标文件在预览后变化时拒绝覆盖', async () => {
  const targetPath = path.join(projectPath, '02-母稿.md');
  const run = await service.execute(projectId, {
    skillId: 'berry-human-writer', targetKey: 'master', agentId: 'codex',
  });
  fs.appendFileSync(targetPath, '\n人工补充。\n');
  assert.throws(
    () => service.apply(projectId, run.id),
    error => error.code === 'CONTENT_TARGET_CHANGED' && error.status === 409,
  );
});

test('会破坏 Markdown 层级的 Agent 输出只记录失败，不写原文件', async () => {
  const targetPath = path.join(projectPath, '04-小红书.md');
  const before = fs.readFileSync(targetPath, 'utf8');
  answer = '## 新章节\n\n不允许插入同级章节。';
  const run = await service.execute(projectId, {
    skillId: 'berry-human-writer', targetKey: 'xiaohongshu', agentId: 'codex',
  });
  answer = '改写后的正文。';
  assert.equal(run.status, 'failed');
  assert.match(run.error, /章节结构/);
  assert.equal(fs.readFileSync(targetPath, 'utf8'), before);
});

test('未进入白名单的 Skill 不能借项目接口执行', async () => {
  const before = executeCount;
  await assert.rejects(
    service.execute(projectId, { skillId: 'banana-image-gen', targetKey: 'wechat', agentId: 'codex' }),
    error => error.code === 'CONTENT_SKILL_NOT_ALLOWED' && error.status === 403,
  );
  assert.equal(executeCount, before);
});
