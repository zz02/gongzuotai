import { localApi } from '../api.js';
import { esc, safeExternalUrl } from '../utils.js';
import { toast, Modal, skeleton } from '../components.js';
import { initIcons } from '../icons.js';

const STATUS_TONES = {
  待立项: 'pill-gray',
  资料中: 'pill-sky',
  写作中: 'pill-cyan',
  制作中: 'pill-brand',
  待发布: 'pill-amber',
  已发布: 'pill-green',
  已复盘: 'pill-green',
};

let contentProjectState = {
  config: null,
  projects: [],
  active: null,
  validation: null,
  skillContext: null,
  activeSkillRun: null,
  skillForm: null,
};
let detailModal = null;

const SKILL_RUN_LABELS = {
  running: ['执行中', 'pill-cyan', 'loader'],
  succeeded: ['待确认', 'pill-amber', 'scan-eye'],
  applied: ['已回写', 'pill-green', 'check'],
  failed: ['执行失败', 'pill-hot', 'circle-alert'],
  discarded: ['已放弃', 'pill-gray', 'archive-x'],
};

function statusPill(status) {
  return `<span class="pill ${STATUS_TONES[status] || 'pill-hot'}">${esc(status || '状态无效')}</span>`;
}

function checkPill(check) {
  if (!check) return '<span class="pill pill-gray">未检查</span>';
  return check.passed
    ? '<span class="pill pill-green"><i data-lucide="check" class="w-3 h-3"></i>当前通过</span>'
    : `<span class="pill pill-hot"><i data-lucide="alert-triangle" class="w-3 h-3"></i>${check.issues?.length || 1} 项缺失</span>`;
}

function skillRunPill(status) {
  const [label, tone, icon] = SKILL_RUN_LABELS[status] || ['状态未知', 'pill-gray', 'circle-help'];
  return `<span class="pill ${tone}"><i data-lucide="${icon}" class="w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}"></i>${label}</span>`;
}

function originText(project) {
  if (!project?.origin) return esc(project?.pillar || '未设置内容支柱');
  const evidence = Number(project.origin.evidenceCount) || 0;
  return `灵感选题 · ${evidence ? `${evidence} 条证据` : '资料已交接'}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

function renderSummary(projects) {
  const counts = {
    total: projects.length,
    creating: projects.filter(project => ['待立项', '资料中', '写作中', '制作中'].includes(project.status)).length,
    ready: projects.filter(project => project.status === '待发布').length,
    issues: projects.filter(project => project.currentCheck && !project.currentCheck.passed).length,
  };
  const host = document.getElementById('content-project-summary');
  if (!host) return;
  host.innerHTML = [
    ['全部项目', counts.total, 'folder-kanban', 'text-cyan-300'],
    ['创作进行中', counts.creating, 'pen-line', 'text-purple-300'],
    ['等待发布', counts.ready, 'send', 'text-amber-300'],
    ['存在缺失', counts.issues, 'circle-alert', counts.issues ? 'text-red-300' : 'text-emerald-300'],
  ].map(([label, value, icon, tone]) => `<div class="glass rounded-xl p-4">
    <div class="flex items-center justify-between gap-3"><span class="text-xs text-gray-500">${label}</span><i data-lucide="${icon}" class="w-4 h-4 ${tone}"></i></div>
    <div class="text-2xl font-bold mt-2 ${tone}">${value}</div>
  </div>`).join('');
}

function projectActions(project, compact = false) {
  return `<div class="flex items-center ${compact ? 'flex-wrap w-full justify-end' : ''} gap-1.5">
    <button class="btn btn-ghost py-1 px-2 text-xs" data-action="openContentProject" data-id="${esc(project.id)}"><i data-lucide="eye" class="w-3.5 h-3.5"></i>查看</button>
    <button class="btn btn-ghost py-1 px-2 text-xs" data-action="validateContentProject" data-id="${esc(project.id)}"><i data-lucide="circle-check" class="w-3.5 h-3.5"></i>检查</button>
    <button class="btn btn-ghost py-1 px-2 text-xs ${project.publishReady ? 'text-amber-300' : 'opacity-50'}" data-action="openContentPublishCenter" data-id="${esc(project.id)}" ${project.publishReady ? '' : 'disabled'}><i data-lucide="external-link" class="w-3.5 h-3.5"></i>成品</button>
  </div>`;
}

function renderProjectList(projects) {
  const host = document.getElementById('content-project-list');
  if (!host) return;
  if (!projects.length) {
    host.innerHTML = `<div class="glass rounded-xl py-16 px-5 text-center">
      <i data-lucide="folder-plus" class="w-11 h-11 mx-auto mb-3 text-gray-600"></i>
      <div class="text-sm font-medium">还没有内容项目</div>
      <p class="text-xs text-gray-500 mt-2">新建后仍保存在原工作区，Markdown 文件不会迁移。</p>
      <button class="btn btn-primary mt-4" data-action="newContentProject"><i data-lucide="plus" class="w-4 h-4"></i>新建项目</button>
    </div>`;
    initIcons(host);
    return;
  }

  const desktopRows = projects.map(project => `<tr class="border-t border-white/5 hover:bg-white/[0.02]">
    <td class="px-4 py-3 min-w-[260px]"><button class="text-left group" data-action="openContentProject" data-id="${esc(project.id)}"><span class="text-sm font-medium group-hover:text-cyan-300 transition-colors">${esc(project.title)}</span><span class="block text-[11px] ${project.origin ? 'text-emerald-400/80' : 'text-gray-600'} mt-1">${originText(project)}</span></button></td>
    <td class="px-4 py-3 whitespace-nowrap">${statusPill(project.status)}</td>
    <td class="px-4 py-3 text-xs text-gray-400 min-w-[160px]">${esc(project.primaryPlatform || '未设置')}</td>
    <td class="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">${esc(project.created || '—')}</td>
    <td class="px-4 py-3 min-w-[210px]"><div class="text-xs">${esc(project.nextStep)}</div><div class="mt-1.5">${checkPill(project.currentCheck)}</div></td>
    <td class="px-4 py-3 whitespace-nowrap">${projectActions(project)}</td>
  </tr>`).join('');
  const mobileCards = projects.map(project => `<article class="glass rounded-xl p-4 space-y-3">
    <button class="w-full text-left" data-action="openContentProject" data-id="${esc(project.id)}">
      <div class="flex items-start justify-between gap-3"><h3 class="text-sm font-semibold leading-6">${esc(project.title)}</h3>${statusPill(project.status)}</div>
      <div class="text-[11px] text-gray-500 mt-1.5">${esc(project.created || '—')} · ${esc(project.primaryPlatform || '未设置主要平台')}</div>${project.origin ? `<div class="text-[10px] text-emerald-400/80 mt-1">${originText(project)}</div>` : ''}
    </button>
    <div class="rounded-lg bg-white/[0.025] border border-white/5 p-3"><div class="text-[10px] text-gray-500 mb-1">下一步</div><div class="text-xs">${esc(project.nextStep)}</div></div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">${checkPill(project.currentCheck)}${projectActions(project, true)}</div>
  </article>`).join('');

  host.innerHTML = `<div class="hidden md:block glass rounded-xl overflow-hidden">
    <div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-white/[0.025] text-[11px] text-gray-500"><tr>
      <th class="px-4 py-3 font-medium">项目标题</th><th class="px-4 py-3 font-medium">当前状态</th><th class="px-4 py-3 font-medium">主要平台</th><th class="px-4 py-3 font-medium">创建日期</th><th class="px-4 py-3 font-medium">下一步</th><th class="px-4 py-3 font-medium">操作</th>
    </tr></thead><tbody>${desktopRows}</tbody></table></div>
  </div><div class="md:hidden space-y-3">${mobileCards}</div>`;
  initIcons(host);
}

function renderWorkspaceState(config) {
  const host = document.getElementById('content-project-config');
  if (!host) return;
  if (config?.configured) {
    host.innerHTML = `<div class="flex items-center gap-2 min-w-0"><span class="pill pill-green flex-shrink-0"><i data-lucide="link" class="w-3 h-3"></i>无损接入</span><span class="text-[11px] text-gray-500 truncate" title="${esc(config.workspaceRoot)}">${esc(config.workspaceRoot)}</span></div><button class="btn btn-ghost py-1 px-2 text-xs flex-shrink-0" data-action="configureContentWorkspace"><i data-lucide="settings-2" class="w-3.5 h-3.5"></i>配置路径</button>`;
    host.className = 'glass rounded-xl px-4 py-3 flex items-center justify-between gap-3';
  } else {
    host.innerHTML = `<div class="flex items-start gap-3"><i data-lucide="folder-cog" class="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0"></i><div><div class="text-sm font-medium">内容工作区尚未接通</div><p class="text-xs text-gray-500 mt-1">${esc(config?.message || '请配置现有自媒体工作区的绝对路径。')}</p>${config?.workspaceRoot ? `<p class="text-[11px] text-gray-600 mt-1 break-all">${esc(config.workspaceRoot)}</p>` : ''}</div></div><button class="btn btn-primary flex-shrink-0" data-action="configureContentWorkspace">配置路径</button>`;
    host.className = 'rounded-xl px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-400/20 bg-amber-400/[0.04]';
  }
  initIcons(host);
}

export async function renderContentProjects() {
  const listHost = document.getElementById('content-project-list');
  if (!listHost) return;
  listHost.innerHTML = `<div class="glass rounded-xl p-4 space-y-3">${skeleton(6)}</div>`;
  try {
    const payload = await localApi('content-projects', { abortKey: 'content-projects-list' });
    contentProjectState = { ...contentProjectState, config: payload.config, projects: payload.projects || [] };
    renderWorkspaceState(payload.config);
    renderSummary(contentProjectState.projects);
    renderProjectList(contentProjectState.projects);
    const count = document.getElementById('nav-content-project-count');
    if (count) count.textContent = String(contentProjectState.projects.length);
  } catch (error) {
    if (error.name === 'AbortError') return;
    listHost.innerHTML = `<div class="glass rounded-xl py-14 px-5 text-center"><i data-lucide="triangle-alert" class="w-10 h-10 mx-auto text-red-300 mb-3"></i><div class="text-sm">内容项目加载失败</div><p class="text-xs text-gray-500 mt-2">${esc(error.message)}</p><button class="btn btn-ghost mt-4" data-action="refreshContentProjects">重试</button></div>`;
    initIcons(listHost);
  }
}

function renderValidation(validation) {
  if (!validation) return '<div class="text-xs text-gray-500">尚未运行推进前检查。</div>';
  if (validation.passed) return `<div class="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-3"><div class="flex items-center gap-2 text-sm text-emerald-300"><i data-lucide="circle-check" class="w-4 h-4"></i>可以进入“${esc(validation.target)}”</div></div>`;
  const issues = validation.issues || [];
  const publishIssue = issues.some(issue => /发布时间|发布链接/.test(issue));
  const recovery = publishIssue
    ? '请在原项目的“项目卡 → 发布记录”中补齐信息，保存后重新检查。'
    : '请按上方缺失项补齐原项目内容，保存后重新检查。';
  return `<div class="rounded-lg border border-red-400/20 bg-red-400/[0.05] p-3" role="alert"><div class="flex items-center gap-2 text-sm text-red-300 mb-2"><i data-lucide="circle-alert" class="w-4 h-4"></i>暂不能进入“${esc(validation.target)}”</div><ul class="space-y-1.5">${issues.map(issue => `<li class="text-xs text-gray-300 flex gap-2"><span class="text-red-300">•</span><span>${esc(issue)}</span></li>`).join('')}</ul><div class="mt-3 border-t border-red-400/10 pt-2.5 text-[11px] leading-5 text-gray-400"><span class="text-red-200">下一步：</span>${recovery}</div></div>`;
}

function advanceButtonState(project, validation) {
  if (!project.nextStatus) return { disabled: true, label: '项目已完成' };
  if (validation?.passed) return { disabled: false, label: `推进至${project.nextStatus}` };
  if (validation) return { disabled: true, label: '修复后再推进' };
  return { disabled: false, label: '检查并推进' };
}

function renderProgress(project) {
  return `<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">${project.statusOrder.map((status, index) => {
    const complete = index < project.statusIndex;
    const current = index === project.statusIndex;
    const className = current ? 'border-cyan-400/40 bg-cyan-400/[0.07]' : complete ? 'border-emerald-400/20 bg-emerald-400/[0.04]' : 'border-white/5 bg-white/[0.015]';
    return `<div class="rounded-lg border ${className} p-2.5"><div class="flex items-center gap-1.5 text-[11px] ${current ? 'text-cyan-300' : complete ? 'text-emerald-300' : 'text-gray-500'}"><i data-lucide="${current ? 'circle-dot' : complete ? 'check' : 'circle'}" class="w-3.5 h-3.5"></i>${esc(status)}</div></div>`;
  }).join('')}</div>`;
}

function skillTargetLabel(key) {
  return contentProjectState.skillContext?.targets?.find(item => item.key === key)?.label || key || '目标产物';
}

function renderSkillPreview(run) {
  if (!run) return '';
  if (run.status === 'failed') {
    return `<div class="rounded-xl border border-red-400/20 bg-red-400/[0.05] p-4" role="alert"><div class="flex items-center gap-2 text-sm text-red-300"><i data-lucide="circle-alert" class="w-4 h-4"></i>本次执行失败</div><p class="text-xs text-gray-400 mt-2 leading-5">${esc(run.error || '本地 Agent 未返回可用结果。')}</p></div>`;
  }
  if (run.status === 'running') {
    return `<div class="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4"><div class="flex items-center gap-2 text-sm text-cyan-300"><i data-lucide="loader" class="w-4 h-4 animate-spin"></i>正在只读生成预览</div><p class="text-xs text-gray-500 mt-2">完成前不会写入原 Markdown。</p></div>`;
  }
  if (!run.result && !run.before) return '';
  const action = run.status === 'succeeded' ? `<div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
    <button class="btn btn-ghost justify-center min-h-11" data-action="discardContentSkillRun" data-id="${esc(run.id)}"><i data-lucide="archive-x" class="w-4 h-4"></i>放弃结果</button>
    <button class="btn btn-primary justify-center min-h-11" data-action="applyContentSkillRun" data-id="${esc(run.id)}"><i data-lucide="file-check-2" class="w-4 h-4"></i>确认回写</button>
  </div>` : run.status === 'applied'
    ? '<div class="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-xs text-emerald-300"><i data-lucide="check" class="w-3.5 h-3.5 inline mr-1"></i>已替换原 Markdown 中的目标章节，其他章节未改动。</div>'
    : '<div class="mt-4 text-xs text-gray-500">该预览已放弃，原 Markdown 未修改。</div>';
  return `<div class="rounded-xl border border-white/10 bg-black/10 p-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3"><div><div class="text-sm font-semibold">${esc(run.skillTitle)} · ${esc(skillTargetLabel(run.targetKey))}</div><div class="text-[11px] text-gray-500 mt-1">${esc(run.agentName)} · ${formatDateTime(run.createdAt)}</div></div>${skillRunPill(run.status)}</div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div class="min-w-0"><div class="text-[11px] text-gray-500 mb-1.5">回写前</div><pre class="content-skill-preview">${esc(run.before || '原章节为空')}</pre></div>
      <div class="min-w-0"><div class="text-[11px] text-cyan-300 mb-1.5">Skill 结果</div><pre class="content-skill-preview content-skill-preview-new">${esc(run.result || '暂无结果')}</pre></div>
    </div>${action}
  </div>`;
}

function renderSkillRunHistory(context) {
  const runs = context?.runs || [];
  if (!runs.length) return '<div class="text-xs text-gray-500 py-2">还没有执行记录。</div>';
  return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${runs.slice(0, 6).map(run => `<button class="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-left hover:border-cyan-400/20 transition-colors min-h-16" data-action="openContentSkillRun" data-id="${esc(run.id)}">
    <div class="flex items-start justify-between gap-2"><span class="text-xs font-medium truncate">${esc(run.skillTitle)}</span>${skillRunPill(run.status)}</div>
    <div class="text-[10px] text-gray-500 mt-1.5 truncate">${esc(skillTargetLabel(run.targetKey))} · ${formatDateTime(run.createdAt)}</div>
  </button>`).join('')}</div>`;
}

function bindContentSkillForm(host) {
  const skillSelect = host.querySelector('#content-skill-id');
  const targetSelect = host.querySelector('#content-skill-target');
  const agentSelect = host.querySelector('#content-skill-agent');
  const instruction = host.querySelector('#content-skill-instruction');
  const store = () => {
    contentProjectState.skillForm = {
      skillId: skillSelect?.value || '',
      targetKey: targetSelect?.value || '',
      agentId: agentSelect?.value || '',
      instruction: instruction?.value || '',
    };
  };
  skillSelect?.addEventListener('change', () => { store(); renderContentSkillWorkbench(); });
  targetSelect?.addEventListener('change', () => { store(); renderContentSkillWorkbench(); });
  agentSelect?.addEventListener('change', store);
  instruction?.addEventListener('input', store);
}

function renderContentSkillWorkbench() {
  const host = detailModal?.bodyElement?.querySelector('#content-project-skill-workbench');
  if (!host) return;
  const context = contentProjectState.skillContext;
  if (!context) {
    host.innerHTML = `<div class="space-y-3">${skeleton(3)}</div>`;
    return;
  }
  const eligibleSkills = (context.skills || []).filter(skill => skill.eligible);
  const pendingSkills = (context.skills || []).filter(skill => !skill.eligible);
  const availableAgents = (context.agents || []).filter(agent => agent.available);
  const saved = contentProjectState.skillForm || {};
  const selectedSkill = eligibleSkills.find(skill => skill.id === saved.skillId) || eligibleSkills[0] || null;
  const allowedTargets = (context.targets || []).filter(target => selectedSkill?.targets?.includes(target.key));
  const selectedTarget = allowedTargets.find(target => target.key === saved.targetKey) || allowedTargets[0] || null;
  const selectedAgent = availableAgents.find(agent => agent.id === saved.agentId)
    || availableAgents.find(agent => agent.id === 'codex') || availableAgents[0] || null;
  contentProjectState.skillForm = {
    skillId: selectedSkill?.id || '',
    targetKey: selectedTarget?.key || '',
    agentId: selectedAgent?.id || '',
    instruction: saved.instruction || '',
  };
  const evidence = context.evidence || {};
  const evidenceTone = evidence.redfoxContext ? 'pill-green' : evidence.count ? 'pill-amber' : 'pill-gray';
  const unavailableMessage = !eligibleSkills.length
    ? '<div class="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3 text-xs text-amber-200">工作区中还没有进入白名单的写作类 Skill。</div>'
    : !availableAgents.length
      ? `<div class="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3 text-xs text-amber-200">${esc(context.agentError || '未检测到可用的本地 Agent，请先在 Agent 页面完成安装或登录。')}</div>`
      : '';
  host.innerHTML = `<div class="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-4">
    <div><div class="flex items-center gap-2"><i data-lucide="workflow" class="w-4 h-4 text-cyan-300"></i><h3 class="text-sm font-semibold">Skill 工作流</h3><span class="pill pill-green">无损执行</span></div><p class="text-xs text-gray-500 mt-1.5 leading-5">读取原项目资料，在只读环境生成预览；确认后只回写一个固定章节。</p></div>
    <span class="pill ${evidenceTone} flex-shrink-0"><i data-lucide="${evidence.redfoxContext ? 'database-zap' : 'database'}" class="w-3 h-3"></i>${esc(evidence.label || '使用本地项目资料')}</span>
  </div>
  ${unavailableMessage}
  ${eligibleSkills.length ? `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 ${unavailableMessage ? 'mt-3' : ''}">
    <div><label class="text-[11px] text-gray-500 mb-1.5 block" for="content-skill-id">使用 Skill</label><select class="input min-h-11" id="content-skill-id">${eligibleSkills.map(skill => `<option value="${esc(skill.id)}" ${skill.id === selectedSkill?.id ? 'selected' : ''}>${esc(skill.title)}</option>`).join('')}</select><p class="text-[10px] text-gray-600 mt-1.5">${esc(selectedSkill?.capability || '')}</p></div>
    <div><label class="text-[11px] text-gray-500 mb-1.5 block" for="content-skill-target">目标产物</label><select class="input min-h-11" id="content-skill-target">${allowedTargets.map(target => `<option value="${esc(target.key)}" ${target.key === selectedTarget?.key ? 'selected' : ''}>${esc(target.label)}</option>`).join('')}</select><p class="text-[10px] text-gray-600 mt-1.5">${esc(selectedTarget?.file || '')} · ${esc(selectedTarget?.section || '')}</p></div>
    <div><label class="text-[11px] text-gray-500 mb-1.5 block" for="content-skill-agent">本地 Agent</label><select class="input min-h-11" id="content-skill-agent" ${availableAgents.length ? '' : 'disabled'}>${availableAgents.map(agent => `<option value="${esc(agent.id)}" ${agent.id === selectedAgent?.id ? 'selected' : ''}>${esc(agent.name)}</option>`).join('')}</select><p class="text-[10px] text-gray-600 mt-1.5 leading-4"><span class="block">项目资料会交给所选 Agent，可能消耗其模型额度。</span><span class="block">只读模式不允许它直接改文件。</span></p></div>
  </div>
  <div class="mt-3"><label class="text-[11px] text-gray-500 mb-1.5 block" for="content-skill-instruction">补充要求 <span class="text-gray-600">（可选）</span></label><textarea class="input min-h-20 resize-y" id="content-skill-instruction" maxlength="1000" placeholder="例如：保留克制语气，重点讲清楚实际操作。">${esc(saved.instruction || '')}</textarea></div>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3"><div class="text-[11px] text-gray-500"><i data-lucide="shield-check" class="w-3.5 h-3.5 inline mr-1 text-emerald-300"></i>生成预览不会修改原 Markdown</div><button class="btn btn-primary justify-center min-h-11" data-action="runContentSkill" ${availableAgents.length && selectedTarget ? '' : 'disabled'}><i data-lucide="sparkles" class="w-4 h-4"></i>生成预览</button></div>` : ''}
  ${pendingSkills.length ? `<details class="mt-4 rounded-lg border border-white/5 bg-white/[0.015] p-3"><summary class="text-xs text-gray-500 cursor-pointer">${pendingSkills.length} 个 Skill 暂未接入第一版</summary><div class="mt-2 space-y-1.5">${pendingSkills.map(skill => `<div class="flex items-start justify-between gap-3 text-[11px]"><span class="text-gray-400">${esc(skill.title)}</span><span class="text-gray-600 text-right">${esc(skill.unavailableReason)}</span></div>`).join('')}</div></details>` : ''}
  <div id="content-skill-active-preview" class="mt-4">${renderSkillPreview(contentProjectState.activeSkillRun)}</div>
  <div class="mt-5 border-t border-white/5 pt-4"><div class="text-xs font-medium text-gray-300 mb-2">最近执行</div>${renderSkillRunHistory(context)}</div>`;
  bindContentSkillForm(host);
  initIcons(host);
}

async function loadContentSkillWorkbench(projectId) {
  try {
    const context = await localApi(`content-projects/${encodeURIComponent(projectId)}/skill-context`, { abortKey: 'content-skill-context' });
    if (contentProjectState.active?.id !== projectId) return;
    contentProjectState.skillContext = context;
    contentProjectState.skillForm = null;
    renderContentSkillWorkbench();
  } catch (error) {
    if (error.name === 'AbortError') return;
    const host = detailModal?.bodyElement?.querySelector('#content-project-skill-workbench');
    if (host) {
      host.innerHTML = `<div class="rounded-lg border border-red-400/20 bg-red-400/[0.04] p-3 text-xs text-red-300">Skill 工作流加载失败：${esc(error.message)}</div>`;
      initIcons(host);
    }
  }
}

function detailBody(project, validation = null) {
  const currentIssues = project.currentCheck?.issues || [];
  const advance = advanceButtonState(project, validation);
  const statusRows = project.statusRecords?.length ? project.statusRecords.slice().reverse().map(record => `<div class="relative pl-5 pb-4 last:pb-0 border-l border-white/10 last:border-transparent"><span class="absolute -left-1 top-0 w-2 h-2 rounded-full bg-cyan-400"></span><div class="flex flex-wrap items-center gap-2">${statusPill(record.status)}<span class="text-[11px] text-gray-500">${esc(record.date)}</span></div><div class="text-xs mt-1.5">${esc(record.completed)}</div><div class="text-[11px] text-gray-500 mt-1">下一步：${esc(record.nextStep)}</div></div>`).join('') : '<div class="text-xs text-gray-500">暂无状态记录。</div>';
  const publishRows = project.publishRecords?.map(record => `<tr class="border-t border-white/5"><td class="py-2 pr-3 text-xs">${esc(record.platform)}</td><td class="py-2 pr-3 text-xs text-gray-400 whitespace-nowrap">${esc(record.publishedAt || '—')}</td><td class="py-2 text-xs text-gray-500 max-w-[220px] truncate">${record.url && record.url !== '-' ? `<a href="${safeExternalUrl(record.url)}" target="_blank" rel="noopener noreferrer" class="text-cyan-300 hover:underline">${esc(record.url)}</a>` : '未记录'}</td></tr>`).join('') || '';
  const originPanel = project.origin ? `<section class="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div class="flex items-center gap-2 text-sm text-emerald-300"><i data-lucide="git-merge" class="w-4 h-4"></i>选题资料已交接</div><p class="text-xs text-gray-500 mt-1.5">摘要、角度、关键词${project.origin.evidenceCount ? `和 ${project.origin.evidenceCount} 条参考证据` : ''}已写入原 Markdown 资料库。</p></div><span class="pill ${project.origin.evidenceCount ? 'pill-green' : 'pill-amber'} flex-shrink-0">${project.origin.evidenceCount ? '证据待核验' : '待补充证据'}</span></section>` : '';
  return `<div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div class="flex items-center gap-2">${statusPill(project.status)}${checkPill(project.currentCheck)}</div><p class="text-xs text-gray-500 mt-2">${esc(project.pillar || '未设置内容支柱')} · ${esc(project.primaryPlatform || '未设置主要平台')}</p></div><div class="text-[11px] text-gray-500">创建于 ${esc(project.created || '—')}<br>更新于 ${formatDateTime(project.modifiedAt)}</div></div>
    ${originPanel}
    <section><h3 class="text-xs font-semibold text-gray-300 mb-2">七阶段进度</h3>${renderProgress(project)}</section>
    <section id="content-project-skill-workbench" class="glass rounded-xl p-4 sm:p-5" aria-live="polite"><div class="space-y-3">${skeleton(3)}</div></section>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="glass rounded-xl p-4"><div class="flex items-center justify-between gap-2 mb-3"><h3 class="text-sm font-semibold">推进前检查</h3><span class="text-[11px] text-gray-500">目标：${esc(project.nextStatus || project.status)}</span></div><div id="content-project-validation-result">${renderValidation(validation)}</div>${currentIssues.length ? `<div class="mt-3"><div class="text-[11px] text-gray-500 mb-1.5">当前阶段缺失项</div><ul class="space-y-1">${currentIssues.map(issue => `<li class="text-xs text-red-300">• ${esc(issue)}</li>`).join('')}</ul></div>` : ''}</section>
      <section class="glass rounded-xl p-4"><h3 class="text-sm font-semibold mb-3">文件完整性</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${project.files.map(file => `<div class="flex items-center gap-2 text-xs"><i data-lucide="${file.exists ? 'file-check-2' : 'file-x-2'}" class="w-3.5 h-3.5 ${file.exists ? 'text-emerald-300' : 'text-red-300'}"></i><span class="truncate">${esc(file.name)}</span></div>`).join('')}</div><div class="text-[11px] text-gray-500 mt-3">原 Markdown 仍是唯一事实源。</div></section>
      <section class="glass rounded-xl p-4"><h3 class="text-sm font-semibold mb-3">状态记录</h3><div class="max-h-64 overflow-y-auto pr-1">${statusRows}</div></section>
      <section class="glass rounded-xl p-4"><h3 class="text-sm font-semibold mb-3">发布记录</h3><div class="overflow-x-auto"><table class="w-full"><thead class="text-[11px] text-gray-500"><tr><th class="text-left pb-2 pr-3 font-medium">平台</th><th class="text-left pb-2 pr-3 font-medium">发布时间</th><th class="text-left pb-2 font-medium">发布链接</th></tr></thead><tbody>${publishRows}</tbody></table></div></section>
    </div>
    <div class="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
      <button class="btn btn-ghost justify-center" data-action="validateContentProject" data-id="${esc(project.id)}"><i data-lucide="circle-check" class="w-4 h-4"></i>运行检查</button>
      <button class="btn btn-ghost justify-center ${project.publishReady ? 'text-amber-300' : 'opacity-50'}" data-action="openContentPublishCenter" data-id="${esc(project.id)}" ${project.publishReady ? '' : 'disabled'}><i data-lucide="external-link" class="w-4 h-4"></i>打开成品</button>
      <button class="btn btn-primary justify-center ${advance.disabled ? 'opacity-50' : ''}" data-action="advanceContentProject" data-id="${esc(project.id)}" ${advance.disabled ? 'disabled aria-disabled="true"' : ''}><i data-lucide="${validation?.passed ? 'arrow-right' : 'list-checks'}" class="w-4 h-4"></i>${esc(advance.label)}</button>
    </div>
  </div>`;
}

function refreshDetailBody(project, validation = contentProjectState.validation) {
  if (!detailModal?.bodyElement) return;
  detailModal.bodyElement.innerHTML = detailBody(project, validation);
  initIcons(detailModal.bodyElement);
  if (contentProjectState.skillContext) renderContentSkillWorkbench();
}

export async function openContentProject(id) {
  if (!id) return;
  try {
    const project = await localApi(`content-projects/${encodeURIComponent(id)}`, { abortKey: 'content-project-detail' });
    contentProjectState.active = project;
    contentProjectState.validation = null;
    contentProjectState.skillContext = null;
    contentProjectState.activeSkillRun = null;
    contentProjectState.skillForm = null;
    detailModal?.close();
    detailModal = new Modal({ title: project.title, body: detailBody(project), maxWidth: '920px', onClose: () => { detailModal = null; } }).open();
    loadContentSkillWorkbench(project.id);
  } catch (error) {
    if (error.name !== 'AbortError') toast(error.message, 'error');
  }
}

function upsertSkillRun(run) {
  if (!run || !contentProjectState.skillContext) return;
  const runs = contentProjectState.skillContext.runs || [];
  contentProjectState.skillContext.runs = [run, ...runs.filter(item => item.id !== run.id)]
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 12);
}

export async function runContentSkill() {
  const project = contentProjectState.active;
  const host = detailModal?.bodyElement?.querySelector('#content-project-skill-workbench');
  if (!project || !host) return;
  const skillId = host.querySelector('#content-skill-id')?.value || '';
  const targetKey = host.querySelector('#content-skill-target')?.value || '';
  const agentId = host.querySelector('#content-skill-agent')?.value || '';
  const instruction = host.querySelector('#content-skill-instruction')?.value.trim() || '';
  if (!skillId || !targetKey || !agentId) { toast('请选择 Skill、目标产物和本地 Agent', 'error'); return; }
  contentProjectState.skillForm = { skillId, targetKey, agentId, instruction };
  const button = host.querySelector('[data-action="runContentSkill"]');
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i>正在生成';
    initIcons(button);
  }
  try {
    const run = await localApi(`content-projects/${encodeURIComponent(project.id)}/skill-runs`, {
      method: 'POST', body: { skillId, targetKey, agentId, instruction },
    });
    contentProjectState.activeSkillRun = run;
    upsertSkillRun(run);
    renderContentSkillWorkbench();
    if (run.status === 'succeeded') toast('Skill 预览已生成，原文件尚未修改', 'success');
    else toast(run.error || 'Skill 执行失败', 'error');
    requestAnimationFrame(() => detailModal?.bodyElement?.querySelector('#content-skill-active-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  } catch (error) {
    toast(error.message, 'error');
    if (button) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.innerHTML = '<i data-lucide="sparkles" class="w-4 h-4"></i>生成预览';
      initIcons(button);
    }
  }
}

export async function openContentSkillRun(runId) {
  const project = contentProjectState.active;
  if (!project || !runId) return;
  try {
    const run = await localApi(`content-projects/${encodeURIComponent(project.id)}/skill-runs/${encodeURIComponent(runId)}`, { abortKey: 'content-skill-run-detail' });
    contentProjectState.activeSkillRun = run;
    upsertSkillRun(run);
    renderContentSkillWorkbench();
    requestAnimationFrame(() => detailModal?.bodyElement?.querySelector('#content-skill-active-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  } catch (error) {
    if (error.name !== 'AbortError') toast(error.message, 'error');
  }
}

export async function applyContentSkillRun(runId) {
  const project = contentProjectState.active;
  const run = contentProjectState.activeSkillRun;
  if (!project || !runId || run?.id !== runId || run.status !== 'succeeded') return;
  if (!confirm(`确认用本次 Skill 结果替换“${skillTargetLabel(run.targetKey)}”章节？其他章节不会改动。`)) return;
  const button = detailModal?.bodyElement?.querySelector(`[data-action="applyContentSkillRun"][data-id="${runId}"]`);
  if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
  try {
    const applied = await localApi(`content-projects/${encodeURIComponent(project.id)}/skill-runs/${encodeURIComponent(runId)}/apply`, { method: 'POST', body: {} });
    const [updatedProject, context] = await Promise.all([
      localApi(`content-projects/${encodeURIComponent(project.id)}`),
      localApi(`content-projects/${encodeURIComponent(project.id)}/skill-context`),
    ]);
    contentProjectState.active = updatedProject;
    contentProjectState.skillContext = context;
    contentProjectState.activeSkillRun = applied;
    upsertSkillRun(applied);
    refreshDetailBody(updatedProject, contentProjectState.validation);
    toast('已回写原 Markdown 的目标章节', 'success');
  } catch (error) {
    toast(error.message, 'error');
    if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
  }
}

export async function discardContentSkillRun(runId) {
  const project = contentProjectState.active;
  const run = contentProjectState.activeSkillRun;
  if (!project || !runId || run?.id !== runId || run.status !== 'succeeded') return;
  try {
    const discarded = await localApi(`content-projects/${encodeURIComponent(project.id)}/skill-runs/${encodeURIComponent(runId)}/discard`, { method: 'POST', body: {} });
    contentProjectState.activeSkillRun = discarded;
    upsertSkillRun(discarded);
    renderContentSkillWorkbench();
    toast('预览已放弃，原 Markdown 未修改', 'success');
  } catch (error) { toast(error.message, 'error'); }
}

export async function validateContentProject(id) {
  const project = contentProjectState.active?.id === id
    ? contentProjectState.active
    : contentProjectState.projects.find(item => item.id === id);
  if (!project) return;
  try {
    const validation = await localApi(`content-projects/${encodeURIComponent(id)}/validate`, {
      method: 'POST', body: { target: project.nextStatus || project.status },
    });
    contentProjectState.validation = validation;
    if (contentProjectState.active?.id === id) refreshDetailBody(contentProjectState.active, validation);
    else if (!validation.passed) await openContentProject(id).then(() => {
      contentProjectState.validation = validation;
      refreshDetailBody(contentProjectState.active, validation);
    });
    toast(validation.passed ? `“${validation.target}”检查通过` : `还有 ${validation.issues.length} 项需要处理`, validation.passed ? 'success' : 'error');
    return validation;
  } catch (error) {
    toast(error.message, 'error');
    return null;
  }
}

export async function advanceContentProject(id) {
  const project = contentProjectState.active?.id === id
    ? contentProjectState.active
    : contentProjectState.projects.find(item => item.id === id);
  if (!project?.nextStatus) return;
  const validation = await validateContentProject(id);
  if (!validation?.passed) return;
  if (!confirm(`检查已通过，确定将项目推进至“${project.nextStatus}”？`)) return;
  try {
    const updated = await localApi(`content-projects/${encodeURIComponent(id)}/advance`, {
      method: 'POST', body: { to: project.nextStatus },
    });
    contentProjectState.active = updated;
    contentProjectState.validation = null;
    refreshDetailBody(updated, null);
    toast(`项目已推进至“${updated.status}”`, 'success');
    await renderContentProjects();
  } catch (error) { toast(error.message, 'error'); }
}

export function openContentPublishCenter(id) {
  const project = contentProjectState.active?.id === id
    ? contentProjectState.active
    : contentProjectState.projects.find(item => item.id === id);
  if (!project?.publishReady) { toast('该项目还没有生成发布中心', 'error'); return; }
  const url = `/api/_/content-projects/${encodeURIComponent(id)}/publish/${encodeURIComponent('发布中心.html')}`;
  window.open(url, '_blank', 'noopener');
}

function todayYmd() {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(new Date());
}

function validYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

async function ensureContentProjectState() {
  if (contentProjectState.config) return contentProjectState;
  const payload = await localApi('content-projects', { abortKey: 'content-projects-create-preflight' });
  contentProjectState = {
    ...contentProjectState,
    config: payload.config,
    projects: payload.projects || [],
    active: null,
    validation: null,
    skillContext: null,
    activeSkillRun: null,
    skillForm: null,
  };
  const count = document.getElementById('nav-content-project-count');
  if (count) count.textContent = String(contentProjectState.projects.length);
  return contentProjectState;
}

export async function newContentProject(options = {}) {
  const normalizedOptions = typeof options === 'string' ? { title: options } : (options || {});
  try {
    await ensureContentProjectState();
  } catch (error) {
    if (error.name !== 'AbortError') toast(error.message, 'error');
    return;
  }
  if (!contentProjectState.config?.configured) {
    configureContentWorkspace({ onConfigured: () => newContentProject(normalizedOptions) });
    return;
  }
  const initialTitle = String(normalizedOptions.title || '').trim();
  const initialDate = validYmd(normalizedOptions.date) ? normalizedOptions.date : todayYmd();
  const originLabel = String(normalizedOptions.originLabel || '').trim();
  const inspiration = normalizedOptions.inspiration?.id ? normalizedOptions.inspiration : null;
  const evidenceCount = Array.isArray(inspiration?.sourceItems) ? inspiration.sourceItems.length : 0;
  const workspaceRoot = contentProjectState.config.workspaceRoot || '';
  const modal = new Modal({
    title: '新建内容项目',
    maxWidth: '520px',
    body: `<form id="new-content-project-form" class="space-y-4" novalidate>
      ${originLabel ? `<div class="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] p-3"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2 text-xs text-cyan-300"><i data-lucide="git-merge" class="w-3.5 h-3.5"></i>来自${esc(originLabel)}</div><span class="pill ${evidenceCount ? 'pill-green' : 'pill-amber'}">${evidenceCount ? `${evidenceCount} 条证据` : '暂无证据'}</span></div><p class="text-[11px] text-gray-500 mt-1.5">标题、摘要、角度、关键词${evidenceCount ? '和参考证据' : ''}将写入原 Markdown；外部证据统一标记为“待核验”。</p></div>` : ''}
      <div><label class="text-xs text-gray-400 mb-1.5 block" for="content-project-title">项目标题</label><input class="input" id="content-project-title" maxlength="100" value="${esc(initialTitle)}" placeholder="输入本次内容主题" autocomplete="off" required><p class="text-[11px] text-gray-500 mt-1.5">可在创建前调整，目录和 Markdown 将由原工作流生成。</p></div>
      <div><label class="text-xs text-gray-400 mb-1.5 block" for="content-project-date">创建日期</label><input class="input" type="date" id="content-project-date" value="${initialDate}" required></div>
      <div class="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2"><div class="flex items-start justify-between gap-3 text-[11px]"><span class="text-gray-500 flex-shrink-0">接入方式</span><span class="text-emerald-300">无损接入</span></div><div class="flex items-start justify-between gap-3 text-[11px]"><span class="text-gray-500 flex-shrink-0">保存位置</span><span class="text-gray-300 text-right break-all" title="${esc(workspaceRoot)}">${esc(workspaceRoot)}</span></div></div>
      <div id="content-project-create-error" class="hidden rounded-lg border border-red-400/20 bg-red-400/[0.05] p-3 text-xs text-red-300" role="alert" aria-live="assertive"></div>
      <div class="flex justify-end gap-2 pt-2"><button type="button" class="btn btn-ghost" data-action="closeModal">取消</button><button type="submit" class="btn btn-primary" id="content-project-create-button"><i data-lucide="plus" class="w-4 h-4"></i>创建项目</button></div>
    </form>`,
  }).open();
  const form = modal.bodyElement.querySelector('form');
  const titleInput = modal.bodyElement.querySelector('#content-project-title');
  const dateInput = modal.bodyElement.querySelector('#content-project-date');
  const errorBox = modal.bodyElement.querySelector('#content-project-create-error');
  const setError = message => {
    if (!errorBox) return;
    errorBox.textContent = message || '';
    errorBox.classList.toggle('hidden', !message);
  };
  form?.querySelectorAll('input').forEach(input => input.addEventListener('input', () => setError('')));
  requestAnimationFrame(() => { titleInput?.focus(); titleInput?.select(); });
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const title = titleInput?.value.trim() || '';
    const date = dateInput?.value || '';
    const button = modal.bodyElement.querySelector('#content-project-create-button');
    if (!title) { setError('请输入项目标题。'); titleInput?.focus(); return; }
    if (title.length > 100) { setError('项目标题不能超过 100 个字符。'); titleInput?.focus(); return; }
    if (!validYmd(date)) { setError('创建日期必须是有效的 YYYY-MM-DD。'); dateInput?.focus(); return; }
    setError('');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i>创建中';
    initIcons(button);
    try {
      const project = await localApi('content-projects', {
        method: 'POST',
        body: { title, date, inspirationId: inspiration?.id || '' },
      });
      modal.close();
      toast('内容项目已创建', 'success');
      if (typeof normalizedOptions.onCreated === 'function') {
        try { await normalizedOptions.onCreated(project); }
        catch (callbackError) { console.warn('项目创建后的页面同步失败：', callbackError); }
      }
      if (!contentProjectState.projects.some(item => item.id === project.id)) contentProjectState.projects.unshift(project);
      const count = document.getElementById('nav-content-project-count');
      if (count) count.textContent = String(contentProjectState.projects.length);
      if (document.getElementById('content-project-list')) await renderContentProjects();
      await openContentProject(project.id);
    } catch (error) {
      setError(error.message);
      toast(error.message, 'error');
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i>创建项目';
      initIcons(button);
    }
  });
}

export async function configureContentWorkspace(options = {}) {
  const onConfigured = typeof options?.onConfigured === 'function' ? options.onConfigured : null;
  try {
    const env = await localApi('env');
    const modal = new Modal({
      title: '配置内容工作区',
      maxWidth: '620px',
      body: `<form id="content-workspace-form" class="space-y-4">
        <div class="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] p-3 text-xs text-gray-400 leading-5">填写现有“自媒体”工作区根目录。工作台只调用其中的脚本和 Markdown，不迁移、不删除原文件。</div>
        <div><label class="text-xs text-gray-400 mb-1.5 block" for="content-workspace-root">工作区路径</label><input class="input font-mono text-xs" id="content-workspace-root" value="${esc(env.CONTENT_WORKSPACE_ROOT?.value || contentProjectState.config?.workspaceRoot || '')}" placeholder="/Users/你的名字/Downloads/自媒体" autocomplete="off"><p class="text-[11px] text-gray-500 mt-1.5">目录内需包含“内容工作台/项目/进行中”和“scripts”。</p></div>
        <div class="flex justify-end gap-2"><button type="button" class="btn btn-ghost" data-action="closeModal">取消</button><button type="submit" class="btn btn-primary" id="content-workspace-save">保存配置</button></div>
      </form>`,
    }).open();
    modal.bodyElement.querySelector('form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const root = modal.bodyElement.querySelector('#content-workspace-root')?.value.trim() || '';
      if (!root || !root.startsWith('/')) { toast('请输入有效的绝对路径', 'error'); return; }
      const button = modal.bodyElement.querySelector('#content-workspace-save');
      button.disabled = true;
      try {
        const validated = await localApi('content-projects/check-workspace', { method: 'POST', body: { root } });
        await localApi('env', { method: 'PUT', body: { CONTENT_WORKSPACE_ROOT: root } });
        contentProjectState.config = {
          configured: true,
          workspaceRoot: validated.workspaceRoot,
          projectsRoot: validated.projectsRoot,
          message: '',
        };
        modal.close();
        toast('内容工作区已接通', 'success');
        await renderContentProjects();
        if (onConfigured) await onConfigured();
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  } catch (error) { toast(error.message, 'error'); }
}

export function refreshContentProjects() {
  return renderContentProjects();
}
