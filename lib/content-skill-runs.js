// 内容项目中的受控 Skill 执行器。
// 原 Markdown 仍是唯一事实源：Agent 只读生成预览，用户确认后才原子替换固定章节。
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const contentProjects = require('./content-projects');

const CONTENT_SKILL_PROFILES = Object.freeze({
  'berry-human-writer': { label: '真人感写作', targets: ['master', 'wechat', 'xiaohongshu', 'douyin'] },
  'feynman-article-writer': { label: '费曼文章写作', targets: ['master', 'wechat'] },
  'great-writing-framework': { label: '通用写作框架', targets: ['master', 'wechat', 'xiaohongshu', 'douyin'] },
  'chai-jing-writing-perspective': { label: '现场感与问题意识', targets: ['master', 'wechat'] },
  'feynman-writing-perspective': { label: '复杂概念讲清楚', targets: ['master', 'wechat'] },
  'orwell-writing-perspective': { label: '清理套话与空话', targets: ['master', 'wechat', 'xiaohongshu', 'douyin'] },
  'paul-graham-writing-perspective': { label: '观点文章推进', targets: ['master', 'wechat'] },
});

const CONTENT_TARGETS = Object.freeze({
  master: {
    key: 'master', label: '母稿正文', file: '02-母稿.md', section: '正文',
    description: '基于项目卡与资料库生成或改写母稿正文。',
  },
  wechat: {
    key: 'wechat', label: '公众号正文', file: '03-公众号.md', section: '正文',
    description: '基于母稿生成或改写公众号正文。',
  },
  xiaohongshu: {
    key: 'xiaohongshu', label: '小红书发布配文', file: '04-小红书.md', section: '发布配文',
    description: '基于母稿生成或改写小红书发布配文。',
  },
  douyin: {
    key: 'douyin', label: '抖音口播脚本', file: '05-抖音.md', section: '口播脚本',
    description: '基于母稿生成或改写完整口播脚本。',
  },
});

const MAX_SKILL_CHARS = 80_000;
const MAX_FILE_CHARS = 80_000;
const MAX_CONTEXT_CHARS = 180_000;
const MAX_RESULT_CHARS = 120_000;
const MAX_INSTRUCTION_CHARS = 1_000;
const RUN_ID_PATTERN = /^[a-f0-9-]{20,64}$/i;

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function singleLine(value, maxLength = 200) {
  return String(value ?? '').replace(/[\0\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function digest(value) {
  return crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

function parseFrontmatter(markdown) {
  const metadata = {};
  const match = String(markdown || '').match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return metadata;
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([a-zA-Z0-9_-]+):\s*(.*?)\s*$/);
    if (item) metadata[item[1]] = item[2].replace(/^(?:"|')|(?:"|')$/g, '').trim();
  }
  return metadata;
}

function parseSkillMetadata(content, slug) {
  const metadata = parseFrontmatter(content);
  const body = String(content || '').replace(/^---\s*\n[\s\S]*?\n---\s*/, '');
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
  return {
    name: singleLine(metadata.name || slug, 80),
    title: singleLine(metadata.title || heading || metadata.name || slug, 80),
    description: singleLine(metadata.description || '', 300),
  };
}

function resolveWorkspaceSkillsRoot(config) {
  const candidate = path.join(config.workspaceRoot, '.claude', 'skills');
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) return null;
  const real = fs.realpathSync(candidate);
  return isInside(config.workspaceRoot, real) ? real : null;
}

function listWorkspaceSkills(config = contentProjects.requireWorkspace()) {
  const skillsRoot = resolveWorkspaceSkillsRoot(config);
  if (!skillsRoot) return [];
  const skills = [];
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-z0-9][a-z0-9-]{1,62}$/i.test(entry.name)) continue;
    const directory = path.join(skillsRoot, entry.name);
    const skillPath = path.join(directory, 'SKILL.md');
    if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isFile()) continue;
    const realDirectory = fs.realpathSync(directory);
    const realSkillPath = fs.realpathSync(skillPath);
    if (!isInside(skillsRoot, realDirectory) || !isInside(realDirectory, realSkillPath)) continue;
    const content = fs.readFileSync(realSkillPath, 'utf8');
    const profile = CONTENT_SKILL_PROFILES[entry.name] || null;
    const metadata = parseSkillMetadata(content, entry.name);
    skills.push({
      id: entry.name,
      ...metadata,
      source: 'workspace',
      eligible: Boolean(profile),
      capability: profile?.label || '暂未开放',
      targets: profile?.targets || [],
      unavailableReason: profile ? '' : '第一版只开放不会直接联网、运行脚本或创建额外文件的写作类 Skill。',
      updatedAt: fs.statSync(realSkillPath).mtimeMs || 0,
    });
  }
  return skills.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.title.localeCompare(b.title, 'zh-CN'));
}

function requireWorkspaceSkill(skillId, config) {
  const id = singleLine(skillId, 80);
  const profile = CONTENT_SKILL_PROFILES[id];
  if (!profile) {
    throw new contentProjects.ContentProjectError('该 Skill 尚未进入内容项目白名单。', 403, 'CONTENT_SKILL_NOT_ALLOWED');
  }
  const skillsRoot = resolveWorkspaceSkillsRoot(config);
  if (!skillsRoot) {
    throw new contentProjects.ContentProjectError('内容工作区中没有可用的 .claude/skills 目录。', 422, 'CONTENT_SKILLS_MISSING');
  }
  const directory = path.join(skillsRoot, id);
  const skillPath = path.join(directory, 'SKILL.md');
  if (!isInside(skillsRoot, directory) || !fs.existsSync(skillPath) || !fs.statSync(skillPath).isFile()) {
    throw new contentProjects.ContentProjectError('选择的本地 Skill 不存在。', 404, 'CONTENT_SKILL_NOT_FOUND');
  }
  const realDirectory = fs.realpathSync(directory);
  const realSkillPath = fs.realpathSync(skillPath);
  if (!isInside(skillsRoot, realDirectory) || !isInside(realDirectory, realSkillPath)) {
    throw new contentProjects.ContentProjectError('Skill 路径超出内容工作区。', 403, 'CONTENT_SKILL_PATH_FORBIDDEN');
  }
  const content = fs.readFileSync(realSkillPath, 'utf8');
  if (content.length > MAX_SKILL_CHARS) {
    throw new contentProjects.ContentProjectError('Skill 说明过长，暂不支持在项目中执行。', 422, 'CONTENT_SKILL_TOO_LARGE');
  }
  return { id, profile, content, ...parseSkillMetadata(content, id) };
}

function sectionBounds(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`^##[ \\t]+${escaped}[ \\t]*\\r?$`, 'm');
  const match = matcher.exec(markdown);
  if (!match) return null;
  const lineEnd = markdown.indexOf('\n', match.index + match[0].length);
  const contentStart = lineEnd < 0 ? markdown.length : lineEnd + 1;
  const nextMatcher = /^##[ \t]+.+\r?$/m;
  const next = nextMatcher.exec(markdown.slice(contentStart));
  const contentEnd = next ? contentStart + next.index : markdown.length;
  return { contentStart, contentEnd };
}

function readSection(markdown, heading) {
  const bounds = sectionBounds(markdown, heading);
  if (!bounds) return null;
  return markdown.slice(bounds.contentStart, bounds.contentEnd).trim();
}

function replaceSection(markdown, heading, replacement) {
  const bounds = sectionBounds(markdown, heading);
  if (!bounds) {
    throw new contentProjects.ContentProjectError(`目标文件缺少“${heading}”章节。`, 422, 'CONTENT_TARGET_SECTION_MISSING');
  }
  const suffix = markdown.slice(bounds.contentEnd).replace(/^\s*/, '');
  return `${markdown.slice(0, bounds.contentStart)}\n${String(replacement || '').trim()}\n${suffix ? `\n${suffix}` : ''}`;
}

function normalizeAgentResult(value, target) {
  let result = String(value || '').trim();
  const fenced = result.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (fenced) result = fenced[1].trim();
  const targetHeading = new RegExp(`^##[ \\t]+${target.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[ \\t]*\\r?\\n`, 'i');
  result = result.replace(targetHeading, '').trim();
  if (!result) {
    throw new contentProjects.ContentProjectError('Agent 没有生成可预览的内容。', 502, 'CONTENT_SKILL_EMPTY_RESULT');
  }
  if (result.length > MAX_RESULT_CHARS) {
    throw new contentProjects.ContentProjectError('Agent 返回内容过长，已停止写入预览。', 502, 'CONTENT_SKILL_RESULT_TOO_LARGE');
  }
  if (/\0/.test(result) || /^#{1,2}[ \t]+/m.test(result)) {
    throw new contentProjects.ContentProjectError('Agent 返回了会破坏原 Markdown 章节结构的内容，请重试。', 502, 'CONTENT_SKILL_RESULT_INVALID');
  }
  return result;
}

function targetPublic(target) {
  return {
    key: target.key,
    label: target.label,
    file: target.file,
    section: target.section,
    description: target.description,
  };
}

function make({ db, listLocalAgents, executeAgent, logAction = () => {} }) {
  if (!db || typeof listLocalAgents !== 'function' || typeof executeAgent !== 'function') {
    throw new Error('content-skill-runs 缺少必要依赖');
  }

  const activeProjects = new Set();
  let agentCache = { at: 0, data: null };

  db.prepare(`
    UPDATE content_skill_runs
    SET status = 'failed', error_message = '服务重启，执行已中断，请重新运行。', updated_at = ?
    WHERE status = 'running'
  `).run(Date.now());

  function rowToRun(row, includeContent = false) {
    if (!row) return null;
    const run = {
      id: row.id,
      projectId: row.project_id,
      skillId: row.skill_id,
      skillTitle: row.skill_title,
      targetKey: row.target_key,
      targetFile: row.target_file,
      targetSection: row.target_section,
      agentId: row.agent_id,
      agentName: row.agent_name,
      status: row.status,
      instruction: row.instruction || '',
      evidenceMode: row.evidence_mode,
      evidenceCount: row.evidence_count,
      error: row.error_message || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      appliedAt: row.applied_at,
    };
    if (includeContent) {
      run.before = row.before_text || '';
      run.result = row.result_text || '';
    }
    return run;
  }

  async function agents(force = false) {
    const now = Date.now();
    if (!force && agentCache.data && now - agentCache.at < 30_000) return agentCache.data;
    const data = await listLocalAgents();
    agentCache = { at: now, data: Array.isArray(data) ? data : [] };
    return agentCache.data;
  }

  function projectIdentity(rawProjectId) {
    const config = contentProjects.requireWorkspace();
    const project = contentProjects.resolveProject(rawProjectId, config);
    return { config, project };
  }

  function listRuns(rawProjectId, limit = 12) {
    const { config, project } = projectIdentity(rawProjectId);
    const safeLimit = Math.max(1, Math.min(30, Number(limit) || 12));
    return db.prepare(`
      SELECT * FROM content_skill_runs
      WHERE workspace_root = ? AND project_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(config.workspaceRoot, project.id, safeLimit).map(row => rowToRun(row));
  }

  function requireRun(rawProjectId, rawRunId) {
    const runId = String(rawRunId || '');
    if (!RUN_ID_PATTERN.test(runId)) {
      throw new contentProjects.ContentProjectError('执行记录标识无效。', 400, 'CONTENT_SKILL_RUN_ID_INVALID');
    }
    const { config, project } = projectIdentity(rawProjectId);
    const row = db.prepare(`
      SELECT * FROM content_skill_runs
      WHERE id = ? AND workspace_root = ? AND project_id = ?
    `).get(runId, config.workspaceRoot, project.id);
    if (!row) throw new contentProjects.ContentProjectError('执行记录不存在。', 404, 'CONTENT_SKILL_RUN_NOT_FOUND');
    return { config, project, row };
  }

  function getRun(rawProjectId, rawRunId) {
    return rowToRun(requireRun(rawProjectId, rawRunId).row, true);
  }

  async function getContext(rawProjectId) {
    const project = await contentProjects.inspectProject(rawProjectId, { skipCheck: true });
    const config = contentProjects.requireWorkspace();
    let availableAgents = [];
    let agentError = '';
    try { availableAgents = await agents(); }
    catch (error) { agentError = error.message || '本地 Agent 检查失败。'; }
    const sourceMode = project.origin?.mode || 'workspace';
    const evidenceCount = Number(project.origin?.evidenceCount) || 0;
    const redfoxContext = sourceMode === 'hot-evidence' && evidenceCount > 0;
    return {
      skills: listWorkspaceSkills(config),
      targets: Object.values(CONTENT_TARGETS).map(targetPublic),
      agents: availableAgents,
      agentError,
      runs: listRuns(project.id),
      evidence: {
        mode: sourceMode,
        count: evidenceCount,
        redfoxConfigured: Boolean(String(process.env.REDFOX_API_KEY || '').trim()),
        redfoxContext,
        label: redfoxContext ? `已带入 ${evidenceCount} 条 RedFox 热点证据` : evidenceCount ? `已带入 ${evidenceCount} 条项目证据` : '使用本地项目资料',
      },
    };
  }

  function collectContext(projectPath, target) {
    const names = [...new Set(['00-项目卡.md', '01-资料.md', '02-母稿.md', target.file])];
    const files = [];
    let total = 0;
    for (const name of names) {
      const filePath = path.join(projectPath, name);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        throw new contentProjects.ContentProjectError(`内容项目缺少 ${name}。`, 422, 'CONTENT_CONTEXT_FILE_MISSING');
      }
      const text = fs.readFileSync(filePath, 'utf8');
      if (text.length > MAX_FILE_CHARS) {
        throw new contentProjects.ContentProjectError(`${name} 内容过长，暂不支持直接执行 Skill。`, 422, 'CONTENT_CONTEXT_TOO_LARGE');
      }
      total += text.length;
      if (total > MAX_CONTEXT_CHARS) {
        throw new contentProjects.ContentProjectError('项目上下文总量过大，请精简资料后重试。', 422, 'CONTENT_CONTEXT_TOO_LARGE');
      }
      files.push({ name, text });
    }
    return files;
  }

  function buildPrompt({ project, skill, target, files, instruction, evidenceMode, evidenceCount }) {
    const context = files.map(file => `===== ${file.name} =====\n${file.text}`).join('\n\n');
    return [
      '你是 Insprira 内容项目的只读写作执行器。',
      '安全边界：不要调用工具、命令或网络；不要读取或修改任何文件；只根据下方内联内容生成目标章节预览。',
      `项目：${project.id}`,
      `目标：${target.file} 中的“## ${target.section}”章节。`,
      `证据上下文：${evidenceMode === 'hot-evidence' ? `RedFox 热点证据 ${evidenceCount} 条` : evidenceCount ? `项目证据 ${evidenceCount} 条` : '仅本地项目资料'}。所有标记“待核验”的内容必须继续视为待核验，不得写成确定事实。`,
      '事实约束：只能使用给定项目卡、资料库和母稿里的事实、案例与数据；禁止编造个人经历、来源、数据或发布结果。',
      '输出契约：只输出目标章节的 Markdown 内容，不要输出解释、前言、代码围栏，也不要输出一级或二级标题；可以保留三级及更低级标题。',
      instruction ? `本次补充要求：${instruction}` : '本次补充要求：保持原有选题和事实边界，提升目标章节的可发布性。',
      `===== Skill：${skill.title} =====\n${skill.content}`,
      `===== 项目上下文 =====\n${context}`,
    ].join('\n\n');
  }

  async function execute(rawProjectId, input = {}) {
    const { config, project } = projectIdentity(rawProjectId);
    const target = CONTENT_TARGETS[singleLine(input.targetKey, 40)];
    if (!target) throw new contentProjects.ContentProjectError('请选择有效的目标产物。', 400, 'CONTENT_TARGET_INVALID');
    const skill = requireWorkspaceSkill(input.skillId, config);
    if (!skill.profile.targets.includes(target.key)) {
      throw new contentProjects.ContentProjectError('该 Skill 暂不支持所选目标产物。', 400, 'CONTENT_SKILL_TARGET_INVALID');
    }
    const instruction = String(input.instruction || '').trim();
    if (instruction.length > MAX_INSTRUCTION_CHARS || /\0/.test(instruction)) {
      throw new contentProjects.ContentProjectError('补充要求不能超过 1000 个字符。', 400, 'CONTENT_SKILL_INSTRUCTION_INVALID');
    }
    const agentId = singleLine(input.agentId || 'codex', 60);
    const availableAgents = await agents();
    const agent = availableAgents.find(item => item.id === agentId);
    if (!agent) throw new contentProjects.ContentProjectError('选择的本地 Agent 不存在。', 400, 'CONTENT_AGENT_INVALID');
    if (!agent.available) throw new contentProjects.ContentProjectError(agent.reason || `${agent.name} 当前不可用。`, 422, 'CONTENT_AGENT_UNAVAILABLE');

    const projectKey = `${config.workspaceRoot}\0${project.id}`;
    if (activeProjects.has(projectKey)) {
      throw new contentProjects.ContentProjectError('该项目已有 Skill 正在执行，请等待完成。', 409, 'CONTENT_SKILL_RUN_ACTIVE');
    }
    const targetPath = path.join(project.path, target.file);
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      throw new contentProjects.ContentProjectError(`内容项目缺少 ${target.file}。`, 422, 'CONTENT_TARGET_FILE_MISSING');
    }
    const targetMarkdown = fs.readFileSync(targetPath, 'utf8');
    const before = readSection(targetMarkdown, target.section);
    if (before == null) {
      throw new contentProjects.ContentProjectError(`目标文件缺少“${target.section}”章节。`, 422, 'CONTENT_TARGET_SECTION_MISSING');
    }
    const files = collectContext(project.path, target);
    const card = files.find(file => file.name === '00-项目卡.md')?.text || '';
    const metadata = parseFrontmatter(card);
    const evidenceMode = singleLine(metadata.origin_mode || 'workspace', 40) || 'workspace';
    const evidenceCount = Math.max(0, Number(metadata.origin_evidence_count) || 0);
    const prompt = buildPrompt({ project, skill, target, files, instruction, evidenceMode, evidenceCount });
    const runId = crypto.randomUUID();
    const now = Date.now();
    const inputDigest = digest(files.map(file => `${file.name}\0${file.text}`).join('\0'));
    db.prepare(`
      INSERT INTO content_skill_runs
        (id, workspace_root, project_id, skill_id, skill_title, target_key, target_file,
         target_section, agent_id, agent_name, status, instruction, skill_digest, input_digest,
         target_digest, evidence_mode, evidence_count, before_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId, config.workspaceRoot, project.id, skill.id, skill.title, target.key, target.file,
      target.section, agent.id, agent.name, instruction, digest(skill.content), inputDigest,
      digest(targetMarkdown), evidenceMode, evidenceCount, before, now, now,
    );

    activeProjects.add(projectKey);
    const outputFile = path.join(os.tmpdir(), `insprira-content-skill-${runId}.txt`);
    try {
      const answer = await executeAgent(agent.id, prompt, 'read', outputFile);
      const result = normalizeAgentResult(answer, target);
      db.prepare(`
        UPDATE content_skill_runs
        SET status = 'succeeded', result_text = ?, error_message = NULL, updated_at = ?
        WHERE id = ?
      `).run(result, Date.now(), runId);
      try {
        logAction('content-skill-preview', 'content-project', evidenceMode === 'hot-evidence' ? 'workspace+redfox-context' : 'workspace', {
          runId, projectId: project.id, skillId: skill.id, target: target.key,
          agent: agent.id, evidenceMode, evidenceCount,
        }, 0, 1);
      } catch {}
    } catch (error) {
      const message = singleLine(error?.message || 'Skill 执行失败。', 1000) || 'Skill 执行失败。';
      db.prepare(`
        UPDATE content_skill_runs
        SET status = 'failed', error_message = ?, updated_at = ?
        WHERE id = ?
      `).run(message, Date.now(), runId);
      try {
        logAction('content-skill-failed', 'content-project', evidenceMode === 'hot-evidence' ? 'workspace+redfox-context' : 'workspace', {
          runId, projectId: project.id, skillId: skill.id, target: target.key,
          agent: agent.id, evidenceMode, evidenceCount, error: message,
        }, 0, 1);
      } catch {}
    } finally {
      activeProjects.delete(projectKey);
      try { fs.rmSync(outputFile, { force: true }); } catch {}
    }
    return getRun(project.id, runId);
  }

  function apply(rawProjectId, rawRunId) {
    const { project, row } = requireRun(rawProjectId, rawRunId);
    if (row.status === 'applied') return rowToRun(row, true);
    if (row.status !== 'succeeded' || !row.result_text) {
      throw new contentProjects.ContentProjectError('只有已生成预览的结果可以回写。', 409, 'CONTENT_SKILL_RUN_NOT_APPLICABLE');
    }
    const target = CONTENT_TARGETS[row.target_key];
    if (!target || target.file !== row.target_file || target.section !== row.target_section) {
      throw new contentProjects.ContentProjectError('执行记录中的目标产物无效。', 409, 'CONTENT_SKILL_RUN_TARGET_INVALID');
    }
    const targetPath = path.join(project.path, target.file);
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      throw new contentProjects.ContentProjectError(`内容项目缺少 ${target.file}。`, 422, 'CONTENT_TARGET_FILE_MISSING');
    }
    const current = fs.readFileSync(targetPath, 'utf8');
    const currentDigest = digest(current);
    if (row.applied_digest && currentDigest === row.applied_digest) {
      const updatedAt = Date.now();
      db.prepare(`UPDATE content_skill_runs SET status = 'applied', applied_at = COALESCE(applied_at, ?), updated_at = ? WHERE id = ?`)
        .run(updatedAt, updatedAt, row.id);
      return getRun(project.id, row.id);
    }
    if (currentDigest !== row.target_digest) {
      throw new contentProjects.ContentProjectError('目标文件在预览生成后已被修改。为避免覆盖，请重新执行 Skill。', 409, 'CONTENT_TARGET_CHANGED');
    }
    const result = normalizeAgentResult(row.result_text, target);
    const next = replaceSection(current, target.section, result);
    const nextDigest = digest(next);
    const tempPath = path.join(project.path, `.${path.basename(target.file)}.insprira-${row.id}.tmp`);
    try {
      fs.writeFileSync(tempPath, next, { encoding: 'utf8', mode: fs.statSync(targetPath).mode });
      fs.renameSync(tempPath, targetPath);
    } catch (error) {
      try { fs.rmSync(tempPath, { force: true }); } catch {}
      throw new contentProjects.ContentProjectError(`回写原 Markdown 失败：${error.message}`, 500, 'CONTENT_SKILL_APPLY_FAILED');
    }
    const now = Date.now();
    db.prepare(`
      UPDATE content_skill_runs
      SET status = 'applied', applied_digest = ?, applied_at = ?, updated_at = ?
      WHERE id = ?
    `).run(nextDigest, now, now, row.id);
    try {
      logAction('content-skill-apply', 'content-project', row.evidence_mode === 'hot-evidence' ? 'workspace+redfox-context' : 'workspace', {
        runId: row.id, projectId: project.id, skillId: row.skill_id,
        target: row.target_key, file: row.target_file, section: row.target_section,
        evidenceMode: row.evidence_mode, evidenceCount: row.evidence_count,
      }, 0, 0);
    } catch {}
    return getRun(project.id, row.id);
  }

  function discard(rawProjectId, rawRunId) {
    const { project, row } = requireRun(rawProjectId, rawRunId);
    if (row.status === 'discarded') return rowToRun(row, true);
    if (row.status !== 'succeeded') {
      throw new contentProjects.ContentProjectError('只有尚未回写的预览可以放弃。', 409, 'CONTENT_SKILL_RUN_NOT_DISCARDABLE');
    }
    db.prepare(`UPDATE content_skill_runs SET status = 'discarded', updated_at = ? WHERE id = ?`).run(Date.now(), row.id);
    try {
      logAction('content-skill-discard', 'content-project', 'workspace', {
        runId: row.id, projectId: project.id, skillId: row.skill_id, target: row.target_key,
      }, 0, 0);
    } catch {}
    return getRun(project.id, row.id);
  }

  return { getContext, listRuns, getRun, execute, apply, discard };
}

module.exports = {
  make,
  CONTENT_SKILL_PROFILES,
  CONTENT_TARGETS,
  listWorkspaceSkills,
  readSection,
  replaceSection,
  normalizeAgentResult,
};
