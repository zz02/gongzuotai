const fs=require('fs');const path=require('path');
const dbMethods=require('./creator-db');
// Reviewed adapters, not arbitrary script execution. User identity and facts override author defaults.
const CAPABILITIES=[
  {id:'khazix-writer',name:'公众号写作',author:'卡兹克',repo:'khazix',file:'khazix-writer/SKILL.md',kind:'wechat',tab:'wechat',mode:'Codex 方法适配',description:'实测素材 → 结构清晰的初稿；未知事实标待补'},
  {id:'baoyu-xhs-images',name:'小红书逐页稿',author:'宝玉',repo:'baoyu',file:'skills/baoyu-xhs-images/SKILL.md',kind:'xhs',tab:'xhs',mode:'Codex 方法适配',description:'按读者问题组织封面、步骤、限制与结尾'},
  {id:'baoyu-xhs-native',name:'小红书 AI 图卡',author:'宝玉 / OpenAI',repo:'baoyu',file:'skills/baoyu-xhs-images/SKILL.md',kind:'xhsImage',tab:'xhs',mode:'原生生图 · 单页确认',description:'先生成封面，后续页参考封面；每页保留提示词'},
  {id:'baoyu-image-gen',name:'Codex 原生生图',author:'宝玉 / OpenAI',repo:'baoyu',file:'skills/baoyu-image-gen/SKILL.md',kind:'image',tab:'images',mode:'原生 image_gen',description:'确认提示词后生成原图；不需要 RedFox 密钥'},
  {id:'baoyu-cover-image',name:'封面提示词',author:'宝玉',repo:'baoyu',file:'skills/baoyu-cover-image/SKILL.md',kind:'imagePrompt',tab:'images',mode:'Codex 方法适配',description:'结合标题、用途与品牌方向生成可编辑的提示词'},
  ...dbMethods.CAPABILITIES,
  {id:'gzh-design',name:'公众号排版',author:'甲木 × 摸鱼小李',repo:'gzh-design',file:'SKILL.md',kind:'layout',tab:'wechat',mode:'本地组件适配',description:'保留正文、列表、代码与链接，预览后复制排版'},
  {id:'guizang-card',name:'文字卡片导出',author:'归藏',repo:'guizang-social-card',file:'SKILL.md',kind:'cards',tab:'xhs',mode:'本地排版适配 · 非 AI 生图',description:'将确认后的逐页稿导出为 3:4 PNG'},
  {id:'obsidian-markdown',name:'Obsidian 归档',author:'Kepano',repo:'obsidian',file:'skills/obsidian-markdown/SKILL.md',kind:'archive',tab:'knowledge',mode:'本地笔记适配',description:'关联选定笔记，归档独立快照，不覆盖原笔记'},
];
function list(rootDir,sources){
  return CAPABILITIES.map(c=>{
    const s=sources.find(s=>s.id===c.repo);
    const required=c.repo==='dbskill'?dbMethods.files(c.kind):[c.file];
    return {...c,available:Boolean(s)&&required.every(file=>fs.existsSync(path.join(rootDir,'skill-sources',c.repo,file))),sourceRepo:s?.repo||'',url:s?`https://github.com/${s.repo}/blob/${s.commit||'HEAD'}/${c.file}`:'',commit:s?.commit||'',license:s?.license||''};
  });
}
module.exports={CAPABILITIES,list};
