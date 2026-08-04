// 现有内容工作流的无损适配层。
// Markdown 与原脚本仍是事实源；本模块只负责安全定位、读取摘要和调用脚本。
const fs = require('fs');
const path = require('path');
const { runProcess } = require('./exec');

const STATUSES = ['待立项', '资料中', '写作中', '制作中', '待发布', '已发布', '已复盘'];
const REQUIRED_FILES = [
  '00-项目卡.md', '01-资料.md', '02-母稿.md', '03-公众号.md',
  '04-小红书.md', '05-抖音.md', '06-复盘.md',
];
const NEXT_STEPS = {
  待立项: '完善项目卡并进入资料阶段',
  资料中: '核验资料并开始母稿写作',
  写作中: '完成母稿并制作平台内容',
  制作中: '完成配图、排版与发布包',
  待发布: '完成三平台预览与发布记录',
  已发布: '记录数据并完成内容复盘',
  已复盘: '项目已完成，可沉淀改进项',
};
const PUBLISH_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

class ContentProjectError extends Error {
  constructor(message, status = 400, code = 'CONTENT_PROJECT_ERROR') {
    super(message);
    this.name = 'ContentProjectError';
    this.status = status;
    this.code = code;
  }
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function workspaceConfig(candidateRoot) {
  const configuredPath = String(candidateRoot ?? process.env.CONTENT_WORKSPACE_ROOT ?? '').trim();
  if (!configuredPath) {
    return {
      configured: false,
      workspaceRoot: '',
      projectsRoot: '',
      message: '尚未配置内容工作区，请先设置 CONTENT_WORKSPACE_ROOT。',
    };
  }
  const requestedRoot = path.resolve(configuredPath);
  if (!fs.existsSync(requestedRoot) || !fs.statSync(requestedRoot).isDirectory()) {
    return {
      configured: false,
      workspaceRoot: requestedRoot,
      projectsRoot: '',
      message: '内容工作区路径不存在或不是目录。',
    };
  }
  const workspaceRoot = fs.realpathSync(requestedRoot);
  const projectsRoot = path.join(workspaceRoot, '内容工作台', '项目', '进行中');
  const scriptsRoot = path.join(workspaceRoot, 'scripts');
  if (!fs.existsSync(projectsRoot) || !fs.statSync(projectsRoot).isDirectory()) {
    return {
      configured: false,
      workspaceRoot,
      projectsRoot,
      message: '内容工作区缺少“内容工作台/项目/进行中”目录。',
    };
  }
  if (!fs.existsSync(scriptsRoot) || !fs.statSync(scriptsRoot).isDirectory()) {
    return {
      configured: false,
      workspaceRoot,
      projectsRoot,
      message: '内容工作区缺少 scripts 目录。',
    };
  }
  return { configured: true, workspaceRoot, projectsRoot: fs.realpathSync(projectsRoot), scriptsRoot, message: '' };
}

function requireWorkspace() {
  const config = workspaceConfig();
  if (!config.configured) throw new ContentProjectError(config.message, 422, 'WORKSPACE_NOT_CONFIGURED');
  return config;
}

function decodeProjectId(rawId) {
  let id;
  try { id = decodeURIComponent(String(rawId || '')); } catch {
    throw new ContentProjectError('项目标识格式无效。', 400, 'INVALID_PROJECT_ID');
  }
  if (!id || id === '.' || id === '..' || id.includes('/') || id.includes('\\') || /[\0\r\n]/.test(id)) {
    throw new ContentProjectError('项目标识格式无效。', 400, 'INVALID_PROJECT_ID');
  }
  return id;
}

function resolveProject(rawId, config = requireWorkspace()) {
  const id = decodeProjectId(rawId);
  const candidate = path.resolve(config.projectsRoot, id);
  if (!isInside(config.projectsRoot, candidate) || !fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) {
    throw new ContentProjectError('内容项目不存在。', 404, 'PROJECT_NOT_FOUND');
  }
  const real = fs.realpathSync(candidate);
  if (!isInside(config.projectsRoot, real)) {
    throw new ContentProjectError('项目路径超出允许范围。', 403, 'PROJECT_PATH_FORBIDDEN');
  }
  return { id, path: real };
}

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, 'm'));
  return match ? match[1].trim().replace(/^(["'])(.*)\1$/, '$2') : '';
}

function singleLine(value, maxLength = 500) {
  return String(value ?? '').replace(/[\0\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeOrigin(origin) {
  if (!origin) return null;
  const ref = singleLine(origin.ref, 200);
  if (!/^[A-Za-z0-9:_-]{1,200}$/.test(ref)) {
    throw new ContentProjectError('选题标识无效，无法建立来源关联。', 400, 'INVALID_ORIGIN_REF');
  }
  const sourceKeywords = [...new Set((Array.isArray(origin.sourceKeywords) ? origin.sourceKeywords : [])
    .map(value => singleLine(value, 30)).filter(Boolean))].slice(0, 20);
  const sourceItems = (Array.isArray(origin.sourceItems) ? origin.sourceItems : [])
    .filter(item => item && typeof item === 'object')
    .filter(item => item.title || item.url || item.author || item.platform || item.sourceType)
    .slice(0, 10);
  return {
    type: 'inspiration',
    ref,
    title: singleLine(origin.title, 100),
    summary: singleLine(origin.summary, 2000),
    angle: singleLine(origin.angle, 200),
    targetPlatform: singleLine(origin.targetPlatform, 50),
    sourceKeywords,
    sourceItems,
    sourceMode: singleLine(origin.sourceMode, 50) || 'manual',
    generationNote: singleLine(origin.generationNote, 500),
    generatedBy: singleLine(origin.generatedBy, 100),
  };
}

function setFrontmatterValue(markdown, key, value) {
  const safeValue = singleLine(value, 500);
  const line = `${key}: ${JSON.stringify(safeValue)}`;
  const pattern = new RegExp(`^${key}:.*$`, 'm');
  if (pattern.test(markdown)) return markdown.replace(pattern, line);
  const closing = markdown.indexOf('\n---', 3);
  if (!markdown.startsWith('---\n') || closing < 0) {
    throw new ContentProjectError('项目卡缺少有效的 YAML 头部。', 422, 'PROJECT_TEMPLATE_INVALID');
  }
  return `${markdown.slice(0, closing)}\n${line}${markdown.slice(closing)}`;
}

function setBusinessField(markdown, label, value) {
  const safeValue = singleLine(value, 500);
  if (!safeValue) return markdown;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^(-\\s*${escaped}[：:])\\s*.*$`, 'm');
  return pattern.test(markdown) ? markdown.replace(pattern, `$1 ${safeValue}`) : markdown;
}

function platformLabel(value) {
  const raw = singleLine(value, 50).toLowerCase();
  const mapping = {
    all: '公众号 / 小红书 / 抖音',
    '多平台': '公众号 / 小红书 / 抖音',
    gzh: '公众号', wechat: '公众号', '公众号': '公众号',
    xhs: '小红书', '小红书': '小红书',
    dy: '抖音', douyin: '抖音', '抖音': '抖音',
  };
  return mapping[raw] || singleLine(value, 50);
}

function markdownInline(value, maxLength = 500) {
  return singleLine(value, maxLength).replace(/([\\`*_[\]<>])/g, '\\$1');
}

function markdownTableCell(value, maxLength = 300) {
  return singleLine(value, maxLength).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function safeSourceUrl(value) {
  const raw = singleLine(value, 2000);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\|/g, '%7C');
  } catch { return ''; }
}

function sourceDate(value) {
  if (value == null || value === '') return '日期未提供';
  const raw = singleLine(value, 100);
  const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  let parsed;
  if (/^\d+$/.test(raw)) {
    const number = Number(raw);
    parsed = new Date(number < 1e12 ? number * 1000 : number);
  } else parsed = new Date(raw.replace(/-/g, '/'));
  if (Number.isNaN(parsed.getTime())) return '日期未提供';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(parsed);
}

function sourceName(item) {
  const platform = platformLabel(item.platform || item.sourceType || item.source || '');
  const author = singleLine(item.author || item.userName || item.sourceUsernickname, 80);
  const label = markdownTableCell([platform, author].filter(Boolean).join(' · ') || '来源待核验', 160);
  const url = safeSourceUrl(item.url || item.link);
  return url ? `[${label}](${url})` : label;
}

function originSourceRows(origin) {
  const support = markdownTableCell(origin.summary || origin.angle || `用于验证选题“${origin.title}”`, 260)
    || '用于验证选题方向，具体结论待核验';
  return origin.sourceItems.map(item => {
    const core = markdownTableCell(item.title || item.content || item.desc || '内容信息待核验', 220);
    return `| ${sourceName(item)} | ${sourceDate(item.publishTime || item.publicTime || item.createTime)} | ${core} | ${support} | 待核验 |`;
  });
}

function applyOriginHandoff(projectPath, origin) {
  const cardPath = path.join(projectPath, '00-项目卡.md');
  const researchPath = path.join(projectPath, '01-资料.md');
  let card = readText(cardPath);
  let research = readText(researchPath);
  if (!card || !research || !/^##\s+原始来源\s*$/m.test(research)) {
    throw new ContentProjectError('内容项目模板缺少项目卡或“原始来源”区域。', 422, 'PROJECT_TEMPLATE_INVALID');
  }

  const platform = platformLabel(origin.targetPlatform);
  card = setFrontmatterValue(card, 'origin_type', origin.type);
  card = setFrontmatterValue(card, 'origin_ref', origin.ref);
  card = setFrontmatterValue(card, 'origin_mode', origin.sourceMode);
  card = setFrontmatterValue(card, 'origin_evidence_count', String(origin.sourceItems.length));
  if (platform) card = setFrontmatterValue(card, 'primary_platform', platform);
  card = setBusinessField(card, '核心问题', origin.title);
  card = setBusinessField(card, '一句话结论', origin.summary);
  card = setBusinessField(card, '独特角度', origin.angle);
  card = setBusinessField(card, '主要平台', platform);

  const handoff = [
    '## 选题交接',
    '',
    '- 来源：灵感与选题库',
    `- 原始选题：${markdownInline(origin.title || '未命名选题', 100)}`,
    `- 内容角度：${markdownInline(origin.angle || '待补充', 200)}`,
    `- 目标平台：${markdownInline(platform || '待确认', 50)}`,
    `- 关键词：${origin.sourceKeywords.length ? origin.sourceKeywords.map(value => markdownInline(value, 30)).join('、') : '待补充'}`,
    `- 生成依据：${markdownInline(origin.generationNote || (origin.sourceItems.length ? '已携带参考证据，使用前仍需逐条核验。' : '当前没有可直接引用的外部证据。'), 500)}`,
    `- 生成方式：${markdownInline(origin.generatedBy || (origin.sourceMode === 'manual' ? '人工录入' : '未记录'), 100)}`,
    '',
    '### 核心摘要',
    '',
    `> ${markdownInline(origin.summary || '待补充选题摘要。', 2000)}`,
    '',
  ].join('\n');
  research = research.replace(/^##\s+原始来源\s*$/m, `${handoff}\n## 原始来源`);
  const rows = originSourceRows(origin);
  if (rows.length) {
    const placeholder = /^\|\s*-\s*\|\s*-\s*\|\s*-\s*\|\s*-\s*\|\s*待核验\s*\|\s*$/m;
    if (!placeholder.test(research)) {
      throw new ContentProjectError('资料模板缺少原始来源占位行。', 422, 'PROJECT_TEMPLATE_INVALID');
    }
    research = research.replace(placeholder, rows.join('\n'));
  }
  fs.writeFileSync(cardPath, card, 'utf8');
  fs.writeFileSync(researchPath, research, 'utf8');
}

function section(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^##\\s+${escaped}\\s*$\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'm'));
  return match ? match[1].trim() : '';
}

function tableRows(markdown) {
  return markdown.split(/\r?\n/).filter(line => {
    const value = line.trim();
    return value.startsWith('|') && !value.includes('---');
  }).map(line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()));
}

function parseStatusRecords(card) {
  return tableRows(section(card, '状态记录')).filter(row => row[0] !== '日期' && row.length >= 4).map(row => ({
    date: row[0], status: row[1], completed: row[2], nextStep: row[3],
  }));
}

function parsePublishRecords(card) {
  return tableRows(section(card, '发布记录')).filter(row => row[0] !== '平台' && row.length >= 3).map(row => ({
    platform: row[0], publishedAt: row[1], url: row[2], note: row[3] || '',
  }));
}

function nextStatus(status) {
  const index = STATUSES.indexOf(status);
  return index >= 0 && index < STATUSES.length - 1 ? STATUSES[index + 1] : null;
}

function parseIssues(output) {
  return String(output || '').split(/\r?\n/)
    .map(line => line.match(/^[-•]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

async function runWorkflow(config, args, options = {}) {
  const script = path.join(config.scriptsRoot, 'content_project.py');
  if (!fs.existsSync(script)) {
    throw new ContentProjectError('找不到工作流脚本：scripts/content_project.py。', 422, 'WORKFLOW_SCRIPT_MISSING');
  }
  try {
    const result = await runProcess('python3', [script, ...args], {
      cwd: config.workspaceRoot,
      timeout: options.timeout || 180000,
      env: { ...process.env, CONTENT_WORKSPACE_ROOT: config.workspaceRoot },
    });
    return { passed: true, output: result.stdout.trim(), issues: [] };
  } catch (error) {
    const output = String(error.message || '工作流脚本执行失败').trim();
    return { passed: false, output, issues: parseIssues(output) };
  }
}

async function currentCheck(config, projectPath) {
  const result = await runWorkflow(config, ['status', projectPath]);
  return {
    passed: result.passed,
    issues: result.issues.length ? result.issues : (result.passed ? [] : [result.output]),
    message: result.output,
    scope: 'current',
  };
}

function projectSummary(project, check = null) {
  const cardPath = path.join(project.path, '00-项目卡.md');
  const card = readText(cardPath);
  const status = frontmatterValue(card, 'status') || '状态无效';
  const originRef = frontmatterValue(card, 'origin_ref');
  const originType = frontmatterValue(card, 'origin_type');
  const originEvidenceCount = Math.max(0, Number(frontmatterValue(card, 'origin_evidence_count')) || 0);
  const files = REQUIRED_FILES.map(name => ({ name, exists: fs.existsSync(path.join(project.path, name)) }));
  const publishCenter = path.join(project.path, 'publish', '发布中心.html');
  const stat = fs.statSync(project.path);
  return {
    id: project.id,
    title: frontmatterValue(card, 'title') || project.id.replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    created: frontmatterValue(card, 'created') || project.id.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '',
    status,
    statusIndex: STATUSES.indexOf(status),
    nextStatus: nextStatus(status),
    nextStep: NEXT_STEPS[status] || '修复项目状态后继续',
    pillar: frontmatterValue(card, 'pillar'),
    primaryPlatform: frontmatterValue(card, 'primary_platform'),
    publishAt: frontmatterValue(card, 'publish_at'),
    publishReady: fs.existsSync(publishCenter) && fs.statSync(publishCenter).size > 0,
    origin: originRef ? {
      type: originType || 'inspiration',
      ref: originRef,
      mode: frontmatterValue(card, 'origin_mode') || 'legacy',
      evidenceCount: originEvidenceCount,
    } : null,
    fileCount: files.filter(file => file.exists).length,
    requiredFileCount: files.length,
    modifiedAt: new Date(stat.mtimeMs).toISOString(),
    currentCheck: check,
  };
}

async function inspectProject(rawId, options = {}) {
  const config = requireWorkspace();
  const project = resolveProject(rawId, config);
  const check = options.skipCheck ? null : await currentCheck(config, project.path);
  const summary = projectSummary(project, check);
  const card = readText(path.join(project.path, '00-项目卡.md'));
  return {
    ...summary,
    statusOrder: STATUSES,
    statusRecords: parseStatusRecords(card),
    publishRecords: parsePublishRecords(card),
    files: REQUIRED_FILES.map(name => ({ name, exists: fs.existsSync(path.join(project.path, name)) })),
  };
}

async function listProjects() {
  const config = workspaceConfig();
  if (!config.configured) return { config, projects: [] };
  const entries = fs.readdirSync(config.projectsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => ({ id: entry.name, path: path.join(config.projectsRoot, entry.name) }));
  const projects = await Promise.all(entries.map(async project => {
    let check;
    try { check = await currentCheck(config, project.path); } catch (error) {
      check = { passed: false, issues: [error.message], message: error.message, scope: 'current' };
    }
    return projectSummary(project, check);
  }));
  projects.sort((a, b) => String(b.created).localeCompare(String(a.created), 'zh-CN') || b.modifiedAt.localeCompare(a.modifiedAt));
  return {
    config: {
      configured: true,
      workspaceRoot: config.workspaceRoot,
      projectsRoot: config.projectsRoot,
      message: '',
    },
    projects,
  };
}

function validateNewProjectInput(input) {
  const title = String(input?.title || '').trim();
  const date = String(input?.date || '').trim();
  if (!title) throw new ContentProjectError('项目标题不能为空。', 400, 'INVALID_TITLE');
  if (title.length > 100 || /[\0\r\n]/.test(title)) {
    throw new ContentProjectError('项目标题需为 1-100 个字符，且不能换行。', 400, 'INVALID_TITLE');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ContentProjectError('项目日期必须使用 YYYY-MM-DD。', 400, 'INVALID_DATE');
  }
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new ContentProjectError('项目日期不是有效日期。', 400, 'INVALID_DATE');
  }
  return { title, date, origin: normalizeOrigin(input?.origin) };
}

function findProjectByOriginRef(config, originRef) {
  if (!originRef) return null;
  const entries = fs.readdirSync(config.projectsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'));
  for (const entry of entries) {
    const card = readText(path.join(config.projectsRoot, entry.name, '00-项目卡.md'));
    if (frontmatterValue(card, 'origin_ref') === originRef) {
      return { id: entry.name, path: path.join(config.projectsRoot, entry.name) };
    }
  }
  return null;
}

function listOriginLinks() {
  const config = workspaceConfig();
  if (!config.configured) return [];
  return fs.readdirSync(config.projectsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => {
      const card = readText(path.join(config.projectsRoot, entry.name, '00-项目卡.md'));
      const inspirationId = frontmatterValue(card, 'origin_ref');
      if (!inspirationId || (frontmatterValue(card, 'origin_type') || 'inspiration') !== 'inspiration') return null;
      return {
        projectId: entry.name,
        projectTitle: frontmatterValue(card, 'title') || entry.name,
        inspirationId,
        evidenceCount: Math.max(0, Number(frontmatterValue(card, 'origin_evidence_count')) || 0),
      };
    })
    .filter(Boolean);
}

async function createProject(input) {
  const config = requireWorkspace();
  const { title, date, origin } = validateNewProjectInput(input);
  const script = path.join(config.scriptsRoot, 'new_content_project.sh');
  if (!fs.existsSync(script)) {
    throw new ContentProjectError('找不到工作流脚本：scripts/new_content_project.sh。', 422, 'WORKFLOW_SCRIPT_MISSING');
  }
  const linkedProject = origin ? findProjectByOriginRef(config, origin.ref) : null;
  if (linkedProject) {
    throw new ContentProjectError(`该选题已经建立内容项目：${linkedProject.id}`, 409, 'INSPIRATION_ALREADY_LINKED');
  }
  // 原脚本仍负责创建项目，但先写入同一磁盘下的隔离暂存目录。
  // 只有脚本完整成功后才原子移动到正式目录，避免复制模板中断时留下半成品。
  const stagingRoot = fs.mkdtempSync(path.join(config.projectsRoot, '.insprira-staging-'));
  const cleanupStaging = () => {
    try {
      const resolved = path.resolve(stagingRoot);
      const isOwnedStaging = isInside(config.projectsRoot, resolved)
        && path.dirname(resolved) === config.projectsRoot
        && path.basename(resolved).startsWith('.insprira-staging-');
      if (isOwnedStaging && fs.existsSync(resolved)) fs.rmSync(resolved, { recursive: true, force: true });
    } catch {}
  };
  let result;
  try {
    result = await runProcess(script, [title, date], {
      cwd: config.workspaceRoot,
      timeout: 30000,
      env: {
        ...process.env,
        CONTENT_WORKSPACE_ROOT: config.workspaceRoot,
        CONTENT_PROJECTS_ROOT: stagingRoot,
      },
    });
  } catch (error) {
    cleanupStaging();
    const message = String(error.message || '创建项目失败').trim();
    const status = /已经存在/.test(message) ? 409 : 422;
    throw new ContentProjectError(message, status, status === 409 ? 'PROJECT_EXISTS' : 'CREATE_FAILED');
  }
  const output = result.stdout.trim();
  const createdPath = output.match(/已创建内容项目：(.+)/)?.[1]?.trim();
  if (!createdPath) {
    cleanupStaging();
    throw new ContentProjectError('项目脚本已结束，但无法识别新项目目录。', 500, 'CREATE_RESULT_INVALID');
  }
  const absolute = path.resolve(createdPath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) {
    cleanupStaging();
    throw new ContentProjectError('新项目目录不存在或不是目录。', 500, 'CREATE_RESULT_INVALID');
  }
  const stagedProject = fs.realpathSync(absolute);
  if (!isInside(stagingRoot, stagedProject) || path.dirname(stagedProject) !== fs.realpathSync(stagingRoot)) {
    cleanupStaging();
    throw new ContentProjectError('新项目目录超出允许范围。', 500, 'CREATE_RESULT_INVALID');
  }
  const missingFiles = REQUIRED_FILES.filter(name => !fs.existsSync(path.join(stagedProject, name)));
  if (missingFiles.length) {
    cleanupStaging();
    throw new ContentProjectError(`项目模板不完整，缺少：${missingFiles.join('、')}`, 422, 'PROJECT_TEMPLATE_INVALID');
  }
  if (origin) {
    try { applyOriginHandoff(stagedProject, origin); }
    catch (error) {
      cleanupStaging();
      if (error instanceof ContentProjectError) throw error;
      throw new ContentProjectError(`选题资料写入失败：${error.message}`, 422, 'ORIGIN_HANDOFF_FAILED');
    }
  }
  const projectId = path.basename(stagedProject);
  const finalPath = path.join(config.projectsRoot, projectId);
  if (fs.existsSync(finalPath)) {
    cleanupStaging();
    throw new ContentProjectError(`项目已经存在：${finalPath}`, 409, 'PROJECT_EXISTS');
  }
  try {
    fs.renameSync(stagedProject, finalPath);
    try { fs.rmdirSync(stagingRoot); } catch {}
  } catch (error) {
    cleanupStaging();
    throw new ContentProjectError(`项目创建完成，但写入正式目录失败：${error.message}`, 500, 'CREATE_COMMIT_FAILED');
  }
  return inspectProject(projectId);
}

async function validateProject(rawId, requestedTarget) {
  const config = requireWorkspace();
  const project = resolveProject(rawId, config);
  const summary = projectSummary(project);
  const target = requestedTarget || summary.nextStatus || summary.status;
  if (!STATUSES.includes(target)) throw new ContentProjectError('目标状态无效。', 400, 'INVALID_STATUS');
  if (requestedTarget && target !== summary.nextStatus && !(summary.nextStatus == null && target === summary.status)) {
    throw new ContentProjectError('只能检查下一状态，不能跳级或倒退。', 409, 'STATUS_ORDER_INVALID');
  }
  const result = await runWorkflow(config, ['validate', project.path, '--target', target]);
  return {
    target,
    passed: result.passed,
    issues: result.issues.length ? result.issues : (result.passed ? [] : [result.output]),
    message: result.output,
  };
}

async function advanceProject(rawId, requestedTarget) {
  const config = requireWorkspace();
  const project = resolveProject(rawId, config);
  const before = projectSummary(project);
  const target = before.nextStatus;
  if (!target) throw new ContentProjectError('项目已是最终状态，不能继续推进。', 409, 'STATUS_FINAL');
  if (requestedTarget && requestedTarget !== target) {
    throw new ContentProjectError('状态只能按顺序推进，不能跳级或倒退。', 409, 'STATUS_ORDER_INVALID');
  }
  const result = await runWorkflow(config, ['advance', project.path, '--to', target]);
  if (!result.passed) {
    throw new ContentProjectError(result.output, 409, 'QUALITY_CHECK_FAILED');
  }
  return inspectProject(project.id);
}

function resolvePublishFile(rawId, rawRelativePath) {
  const config = requireWorkspace();
  const project = resolveProject(rawId, config);
  let relativePath;
  try { relativePath = decodeURIComponent(String(rawRelativePath || '发布中心.html')); } catch {
    throw new ContentProjectError('发布文件路径格式无效。', 400, 'INVALID_PUBLISH_PATH');
  }
  relativePath = relativePath.replace(/^\/+/, '');
  if (!relativePath || relativePath.includes('\0')) {
    throw new ContentProjectError('发布文件路径格式无效。', 400, 'INVALID_PUBLISH_PATH');
  }
  const publishRoot = path.join(project.path, 'publish');
  if (!fs.existsSync(publishRoot) || !fs.statSync(publishRoot).isDirectory()) {
    throw new ContentProjectError('该项目还没有生成发布中心。', 404, 'PUBLISH_CENTER_MISSING');
  }
  const realRoot = fs.realpathSync(publishRoot);
  const candidate = path.resolve(realRoot, relativePath);
  if (!isInside(realRoot, candidate) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    throw new ContentProjectError('发布文件不存在。', 404, 'PUBLISH_FILE_NOT_FOUND');
  }
  const real = fs.realpathSync(candidate);
  if (!isInside(realRoot, real)) throw new ContentProjectError('发布文件超出允许范围。', 403, 'PUBLISH_PATH_FORBIDDEN');
  const extension = path.extname(real).toLowerCase();
  const contentType = PUBLISH_MIME[extension];
  if (!contentType) throw new ContentProjectError('不允许访问该类型的发布文件。', 403, 'PUBLISH_TYPE_FORBIDDEN');
  return { path: real, contentType };
}

module.exports = {
  STATUSES,
  REQUIRED_FILES,
  ContentProjectError,
  workspaceConfig,
  requireWorkspace,
  resolveProject,
  listProjects,
  listOriginLinks,
  inspectProject,
  createProject,
  validateProject,
  advanceProject,
  resolvePublishFile,
};
