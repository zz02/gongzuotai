// 为内容项目路由创建完全隔离的临时工作区，测试不得触碰用户真实目录。
const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = ['00-项目卡.md', '01-资料.md', '02-母稿.md', '03-公众号.md', '04-小红书.md', '05-抖音.md', '06-复盘.md'];

function card(title, date, status = '待立项', ready = false) {
  return `---
title: "${title}"
created: ${date}
status: ${status}
pillar: 测试内容支柱
primary_platform: 公众号 / 小红书 / 抖音
publish_at: 待定
ready: ${ready ? 'true' : 'false'}
---

# ${title}

## 立项信息

- 目标读者：
- 核心问题：
- 一句话结论：
- 读者收益：
- 独特角度：
- 主要平台：
- 计划发布日期：
- 成功标准：

## 状态记录

| 日期 | 状态 | 已完成 | 下一步 |
|---|---|---|---|
| ${date} | ${status} | 创建项目 | 完成立项判断 |

## 发布记录

| 平台 | 发布时间 | 发布链接 | 备注 |
|---|---|---|---|
| 公众号 | - | - | - |
| 小红书 | - | - | - |
| 抖音 | - | - | - |
`;
}

function research(title) {
  return `# ${title}：资料库

## 要回答的问题

1.
2.
3.

## 原始来源

| 来源 | 发布日期 | 核心信息 | 支持的结论 | 核验状态 |
|---|---|---|---|---|
| - | - | - | - | 待核验 |

## 个人素材

- 真实经历：

## 可用结论

-
`;
}

function contentFile(name, title) {
  const templates = {
    '02-母稿.md': `# ${title}\n\n## 核心判断\n\n测试判断。\n\n## 正文\n\n原母稿正文。\n`,
    '03-公众号.md': `# ${title}：公众号稿\n\n## 标题备选\n\n1. 测试标题\n\n## 摘要\n\n测试摘要。\n\n## 正文\n\n原公众号正文。\n\n## 配图位置\n\n| 位置 | 作用 | 图片文件 | 状态 |\n|---|---|---|---|\n| 封面 | 传达主题 | - | 待制作 |\n`,
    '04-小红书.md': `# ${title}：小红书稿\n\n## 发布标题\n\n测试标题\n\n## 发布配文\n\n原小红书配文。\n\n## 标签\n\n#测试\n`,
    '05-抖音.md': `# ${title}：抖音口播稿\n\n## 视频标题\n\n测试标题\n\n## 口播脚本\n\n### 前 3 秒\n\n原口播。\n\n## 发布文案\n\n测试发布文案。\n`,
    '06-复盘.md': `# ${title}：发布复盘\n\n## 结论\n\n- 待复盘\n`,
  };
  return templates[name] || `# ${title}\n`;
}

function writeProject(directory, title, date, options = {}) {
  fs.mkdirSync(path.join(directory, 'publish'), { recursive: true });
  fs.writeFileSync(path.join(directory, '00-项目卡.md'), card(title, date, options.status, options.ready));
  fs.writeFileSync(path.join(directory, '01-资料.md'), research(title));
  for (const name of REQUIRED_FILES.slice(2)) fs.writeFileSync(path.join(directory, name), contentFile(name, title));
  if (options.publish) {
    fs.writeFileSync(path.join(directory, 'publish', '发布中心.html'), '<!doctype html><html><head><meta charset="utf-8"><title>发布中心</title></head><body><a href="公众号复制.html">公众号</a></body></html>');
    fs.writeFileSync(path.join(directory, 'publish', '公众号复制.html'), '<!doctype html><html><head><meta charset="utf-8"><title>公众号</title></head><body>公众号成品</body></html>');
    fs.writeFileSync(path.join(directory, 'publish', 'secret.txt'), 'not allowed');
  }
}

function createContentWorkspace(root) {
  const projectsRoot = path.join(root, '内容工作台', '项目', '进行中');
  const templateRoot = path.join(root, '内容工作台', '_模板', '内容项目');
  const scriptsRoot = path.join(root, 'scripts');
  fs.mkdirSync(projectsRoot, { recursive: true });
  fs.mkdirSync(path.join(templateRoot, 'publish'), { recursive: true });
  fs.mkdirSync(scriptsRoot, { recursive: true });
  const skillRoot = path.join(root, '.claude', 'skills', 'berry-human-writer');
  const blockedSkillRoot = path.join(root, '.claude', 'skills', 'banana-image-gen');
  fs.mkdirSync(skillRoot, { recursive: true });
  fs.mkdirSync(blockedSkillRoot, { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), `---\nname: berry-human-writer\ndescription: 测试用本地写作 Skill。\n---\n\n# Berry Human Writer\n\n只依据资料改写，不编造事实。\n`);
  fs.writeFileSync(path.join(blockedSkillRoot, 'SKILL.md'), `---\nname: banana-image-gen\ndescription: 测试用联网生图 Skill。\n---\n\n# Banana Image Gen\n`);
  fs.writeFileSync(path.join(templateRoot, '00-项目卡.md'), card('{{TITLE}}', '{{DATE}}'));
  fs.writeFileSync(path.join(templateRoot, '01-资料.md'), research('{{TITLE}}'));
  for (const name of REQUIRED_FILES.slice(2)) fs.writeFileSync(path.join(templateRoot, name), contentFile(name, '{{TITLE}}'));
  writeProject(path.join(projectsRoot, '2026-08-01-可推进项目'), '可推进项目', '2026-08-01', { ready: true, publish: true });
  writeProject(path.join(projectsRoot, '2026-08-02-缺少立项信息'), '缺少立项信息', '2026-08-02', { ready: false });

  const workflow = `#!/usr/bin/env python3
import argparse
import re
import sys
from pathlib import Path

STATUSES = ['待立项', '资料中', '写作中', '制作中', '待发布', '已发布', '已复盘']
FILES = ['00-项目卡.md', '01-资料.md', '02-母稿.md', '03-公众号.md', '04-小红书.md', '05-抖音.md', '06-复盘.md']

def read(project):
    return (project / '00-项目卡.md').read_text(encoding='utf-8')

def status(project):
    match = re.search(r'(?m)^status:\\s*(.+?)\\s*$', read(project))
    return match.group(1) if match else '状态无效'

def issues(project, target):
    missing = [f'项目缺少文件：{name}' for name in FILES if not (project / name).exists()]
    if missing:
        return missing
    if STATUSES.index(target) >= 1 and 'ready: true' not in read(project):
        return ['项目卡缺少：目标读者', '项目卡缺少：一句话结论']
    return []

parser = argparse.ArgumentParser()
sub = parser.add_subparsers(dest='command', required=True)
for command in ['status', 'validate', 'advance']:
    item = sub.add_parser(command)
    item.add_argument('project', type=Path)
    if command == 'validate': item.add_argument('--target', choices=STATUSES, required=True)
    if command == 'advance': item.add_argument('--to', choices=STATUSES, required=True)
args = parser.parse_args()
project = args.project.resolve()
current = status(project)
if args.command == 'status':
    print(f'当前状态：{current}')
    found = issues(project, current)
    if found:
        print('当前状态存在缺失项：')
        for issue in found: print(f'- {issue}')
        raise SystemExit(1)
    next_index = min(STATUSES.index(current) + 1, len(STATUSES) - 1)
    print(f'当前状态检查通过。下一状态：{STATUSES[next_index]}')
    raise SystemExit(0)
target = args.target if args.command == 'validate' else args.to
found = issues(project, target)
if found:
    print(f'不能进入“{target}”，请先处理：')
    for issue in found: print(f'- {issue}')
    raise SystemExit(1)
print(f'“{target}”质量检查通过。')
if args.command == 'advance':
    if STATUSES.index(target) != STATUSES.index(current) + 1:
        print('状态只能按顺序推进，不能跳级或倒退。', file=sys.stderr)
        raise SystemExit(2)
    card_path = project / '00-项目卡.md'
    text = card_path.read_text(encoding='utf-8')
    card_path.write_text(re.sub(r'(?m)^status:\\s*.*$', f'status: {target}', text, count=1), encoding='utf-8')
    print(f'项目状态已更新为：{target}')
`;
  fs.writeFileSync(path.join(scriptsRoot, 'content_project.py'), workflow, { mode: 0o755 });

  const creator = `#!/bin/sh
set -eu
title=\"\${1:-}\"
project_date=\"\${2:-}\"
if [ -z \"\$title\" ]; then echo '错误：内容标题不能为空。' >&2; exit 1; fi
safe_title=\$(printf '%s' \"\$title\" | sed -E 's#[/:：?*<>|]+#-#g; s#[[:space:]]+#-#g; s#-+#-#g; s#^-|-$##g')
target=\"\${CONTENT_PROJECTS_ROOT}/\${project_date}-\${safe_title}\"
if [ -e \"\$target\" ]; then echo \"错误：项目已经存在：\$target\" >&2; exit 2; fi
mkdir \"\$target\"
cp -R \"\${CONTENT_WORKSPACE_ROOT}/内容工作台/_模板/内容项目/.\" \"\$target/\"
export CONTENT_TITLE=\"\$title\" CONTENT_DATE=\"\$project_date\"
find \"\$target\" -type f -name '*.md' -exec perl -pi -e 's/\\{\\{TITLE\\}\\}/$ENV{CONTENT_TITLE}/g; s/\\{\\{DATE\\}\\}/$ENV{CONTENT_DATE}/g' {} +
echo \"已创建内容项目：\$target\"
echo '下一步：打开 00-项目卡.md，完成立项信息。'
`;
  fs.writeFileSync(path.join(scriptsRoot, 'new_content_project.sh'), creator, { mode: 0o755 });
  return { root, projectsRoot };
}

module.exports = { createContentWorkspace, REQUIRED_FILES };
