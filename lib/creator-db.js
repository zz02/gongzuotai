// Reviewed, task-scoped db adapters. Never run upstream installers or update scripts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LICENSE = 'CC BY-NC 4.0 · 非商业使用；商业用途另行授权';
const TARGETS = Object.freeze({brief:'实测素材', master:'事实母稿', wechat:'公众号正文', xhs:'小红书逐页稿', douyinPhoto:'抖音图文稿', video:'视频脚本'});
const TASKS = Object.freeze({
  audience: {id:'db-audience',name:'读者需求',skill:'dbs-jtbd',description:'从真实情境找读者任务、阻力和验证动作',instruction:'输出读者情境、想完成的变化、当前阻力、本文应提供的结果和一个最小验证动作。没有访谈或行为材料时标为待验证假设；不按性别猜偏好，不虚构用户心理。用业务语言，不展开理论问卷。'},
  contentPlan: {id:'db-content-plan',name:'内容组织',skill:'dbs-content',description:'已选主题 → 大纲、材料缺口与图片用途',instruction:'沿用当前主题与目标平台，输出读者所得、3～5 个段落或页面的大纲、每段所需证据、截图或配图用途及最小补充动作。只给制作方案，不代写整稿，不强迫先有付费产品，不把作者的限流、投流、收益经验当平台事实。'},
  topicPlan: {id:'db-topics',name:'读者选题',skill:'dbs-jtbd',description:'三个具体选题，标清读者问题与最小实测动作',instruction:'从材料中的读者任务提出 3 个适合用户时间预算的 AI 实测选题。只输出 JSON 数组，不含代码围栏；每项只含非空字符串 title、problem、action、reason。action 写最小验证动作和证据缺口。未知需求标明假设；链接未读不宣称热点，不给爆款概率。'},
  hooks: {id:'db-hook',name:'标题封面建议',skill:'dbs-title-cover-intro',description:'沿用主题，配套发布标题、封面文字与开头',requiresDraft:true,references:['material-selection','title-surfaces','cover-title','promise-check'],instruction:'用户点击本功能是沿用当前主题、受众和稿件，只优化标题文字，不授权重做选题。走已锁定方向的快捷路径，不启动 12 视角团队或角度确认问卷。只给目标平台的 1 组首选和最多 2 组备选，每组分开写发布标题、封面标题及换行、图文开头和正文兑现位置；材料不足标暂定。只写文字，不生图、不设计画面、不写视频冷开场。各项互补、不改原意，不将上游项目约定说成已核验的官方字数限制。'},
  review: {id:'db-content',name:'内容价值检查',skill:'dbs-content-value',description:'判断读者所得与收藏、分享、关注理由',requiresDraft:true,instruction:'只检查指定稿件的开头、具体读者所得、收藏分享和关注理由，引用原句，最多给 3 个改动及取舍。没有读者数据时只给内容侧假设，不预测点击、播放或涨粉。该能力不承担事实核验，另列尚未核验的引用，不把材料齐全说成事实已证实。'},
  resonate: {id:'db-resonate',name:'共鸣审稿',skill:'dbs-resonate',description:'找到具体原句的断点，提出局部删改',requiresDraft:true,instruction:'围绕目标读者定位最多 3 处原句的共鸣断点，每处给原句、为什么不够具体、最小修改建议和应保留的表达。不整篇改写，不虚构经历和读者反应，不把共鸣推断说成实测。'},
  expression: {id:'db-expression',name:'表达检查',skill:'dbs-ai-check',description:'定位空话与重复，保留自然口语和个人判断',requiresDraft:true,instruction:'只诊断最多 3 处最影响阅读的空话、重复、过度包装或不合体裁的表达，引用原句并给局部建议。保留有效口语、小标题和作者判断；不输出 AI 率或作者身份概率，不用错字、假经历和粗口制造人味，不提出逐项长问卷。'},
  risk: {id:'db-risk',name:'发布检查',skill:'dbs-content-risk-check',description:'区分词面疑点与内容实质，给最小修改',requiresDraft:true,instruction:'只对指定平台稿件做发布前辅助检查。分开说明词面疑点、内容实质和事实证据缺口，每项引用原句，最多给 3 个局部修改。平台最新规则未核实时明确写待核验，不推断限流原因，不保证过审、合规或能发。材料正常可报告未发现明显问题，但仍说明检查边界。'},
});

function task(kind) { const key=kind === 'topics' ? 'topicPlan' : kind; return Object.hasOwn(TASKS,key)?TASKS[key]:undefined; }
function files(kind) {
  const spec = task(kind);
  if (!spec) return [];
  const base = `skills/${spec.skill}`;
  return [`${base}/SKILL.md`, ...(spec.references || []).map(name => `${base}/references/${name}.md`)];
}
function error(message, status=400) { const e=new Error(message); e.status=status; throw e; }
function target(project, requested) {
  const field = requested === undefined
    ? ['master','wechat','xhs','douyinPhoto','video','brief'].find(key => project[key]?.trim()) || 'brief'
    : requested;
  if (!Object.hasOwn(TARGETS, field)) error('请选择有效的检查对象。');
  return {field, name:TARGETS[field], body:project[field] || ''};
}
function prepare(rootDir, kind) {
  const spec=task(kind);
  if (!spec) return null;
  const dir=path.join(rootDir,'skill-sources','dbskill');
  const documents=files(kind).map(file=>{
    const absolute=path.join(dir,file);
    try {
      if (!fs.statSync(absolute).isFile() || fs.statSync(absolute).size>150000 || !fs.realpathSync(absolute).startsWith(fs.realpathSync(dir)+path.sep)) throw new Error('invalid');
      const content=fs.readFileSync(absolute,'utf8');
      if (!content.trim()) throw new Error('empty');
      return {file,content};
    } catch { error(`“${spec.name}”的方法文件缺失或无效，请在 Skills 中心同步来源后重试。`,503); }
  });
  return {
    skill:spec.skill,
    digest:crypto.createHash('sha256').update(JSON.stringify(documents)).digest('hex'),
    instruction:kind==='topics' ? TASKS.audience.instruction+' 推荐三个选题，每题写读者问题、证据缺口、最小验证动作、理由和估计用时。' : spec.instruction,
    reference:documents.map(d=>`<方法资料 文件="${d.file}">\n${d.content}\n</方法资料>`).join('\n'),
  };
}
const CAPABILITIES=Object.entries(TASKS).map(([kind,s])=>({id:s.id,name:s.name,author:'dontbesilent',repo:'dbskill',file:`skills/${s.skill}/SKILL.md`,kind,tab:'materials',mode:'Codex 方法适配 · 不自动改稿',description:s.description,assistant:true,requiresDraft:Boolean(s.requiresDraft)}));
module.exports={LICENSE,TARGETS,TASKS,CAPABILITIES,task,files,target,prepare};
