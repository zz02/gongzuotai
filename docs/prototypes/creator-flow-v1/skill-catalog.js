/* Reviewed catalogue for interaction design; no third-party skill is executed. */
(() => {
  const rows = [
    ['khazix-writer','公众号写作','卡兹克','写作改编','draft','材料与写作要求','公众号候选稿','wechat'],
    ['baoyu-xhs-images','小红书逐页稿','宝玉','写作改编','draft','材料与创作角度','小红书逐页候选稿','xhs'],
    ['baoyu-xhs-native','小红书 AI 图卡','宝玉 / OpenAI','图片排版','image','逐页稿与风格','当前页候选图','xhs'],
    ['baoyu-image-gen','Codex 原生生图','宝玉 / OpenAI','图片排版','image','用途、提示词与参考材料','当前内容候选图','all'],
    ['baoyu-cover-image','封面提示词','宝玉','图片排版','prompt','标题、正文与用途','可编辑的封面提示词','all'],
    ['db-audience','读者需求','dontbesilent','选题整理','advice','材料与读者场景','需求假设与验证建议','all'],
    ['db-content-plan','内容组织','dontbesilent','写作改编','outline','当前主题与材料','大纲及材料缺口','all'],
    ['db-topics','读者选题','dontbesilent','选题整理','topic','材料与读者问题','可保存的选题候选','all'],
    ['db-hook','标题封面建议','dontbesilent','标题开头','title','当前平台正文','标题、封面文字与开头候选','all'],
    ['db-content','内容价值检查','dontbesilent','审稿检查','review','当前平台正文','引用原句的修改建议','all'],
    ['db-resonate','共鸣审稿','dontbesilent','审稿检查','review','当前正文与目标读者','具体表达的修改建议','all'],
    ['db-expression','表达检查','dontbesilent','审稿检查','review','当前平台正文','空话与重复表达建议','all'],
    ['db-risk','发布检查','dontbesilent','审稿检查','review','当前平台正文','待核验项与局部建议','all'],
    ['gzh-design','公众号排版','甲木 × 摸鱼小李','图片排版','layout','确认后的正文','当前稿的排版预览','wechat'],
    ['guizang-card','文字卡片导出','归藏','图片排版','image','当前页文字','模板图卡，非 AI 生图','visual'],
    ['obsidian-markdown','Obsidian 归档','Kepano','知识归档','archive','选定文稿和图片','独立归档记录','all'],
  ];
  const pending = [
    ['huashu-topic-gen','花叔选题','花叔','选题整理','本人想法与材料','选题建议'],
    ['huashu-material-search','花叔素材搜索','花叔','信息检索','资料需求','可追溯参考材料'],
    ['huashu-proofreading','花叔校对','花叔','审稿检查','当前正文','校对建议'],
    ['huashu-wechat-image','花叔公众号配图','花叔','图片排版','文章段落与风格','配图方案'],
    ['huashu-nuwa','女娲个人方法','花叔','个人方法','本人确认的表达偏好','可审查的个人方法，不自动学习'],
    ['humanizer-zh','中文表达优化','humanizer-zh','审稿检查','当前正文','保留个人判断的表达建议'],
    ['baoyu-article-illustrator','文章插图','宝玉','图片排版','正文与配图位置','插图计划'],
    ['baoyu-infographic','信息图','宝玉','图片排版','已核对的信息与数据','信息图方案'],
    ['yunshu-writing-assistant','云舒写作助手','云舒','写作改编','观点与材料','写作引导与候选稿'],
    ['thought-mining','个人观点整理','云舒','选题整理','零碎想法与本人经验','观点与素材'],
    ['image-render','风格配图计划','云舒','图片排版','文章与风格要求','逐图计划'],
    ['case-radar','真实案例检索','云舒','信息检索','案例需求','带出处的案例；浏览器依赖待接入'],
    ['readable-output','长文阅读预览','云舒','阅读辅助','已有文章','阅读页面，非公众号发布排版'],
  ];
  const sources={
    khazix:{repo:'KKKKhazix/khazix-skills',version:'322346ded8129436b3f64707789a73e732ae24d9',license:'MIT'},
    baoyu:{repo:'JimLiu/baoyu-skills',version:'1567581c26ec29f4216c6e6835415bf30343b0e3',license:'MIT'},
    db:{repo:'dontbesilent2025/dbskill',version:'564a794ffa8d08eb9c28ede8b2446237c1f67ada',license:'CC-BY-NC-4.0'},
    gzh:{repo:'isjiamu/gzh-design-skill',version:'339840b1343c86b0159d97a06a0e9eba7c09f9ba',license:'AGPL-3.0'},
    guizang:{repo:'op7418/guizang-social-card-skill',version:'cf4b810fac1c73fb65a2bb31d8c9278d82cbc4c5',license:'AGPL-3.0'},
    obsidian:{repo:'kepano/obsidian-skills',version:'3ccff5338ea700537839b21900aa5358a0402c98',license:'MIT'},
  };
  window.CreatorSkills = [
    ...rows.map(([id,name,author,category,type,input,output,platform])=>({id,name,author,category,type,input,output,platform,registered:true})),
    ...pending.map(([id,name,author,category,input,output])=>({id,name,author,category,input,output,type:'pending',platform:'all',registered:false})),
  ].map(s=>({...s,source:s.registered?sources[s.id.startsWith('db-')?'db':s.id.startsWith('baoyu-')?'baoyu':s.id.startsWith('khazix')?'khazix':s.id==='gzh-design'?'gzh':s.id==='guizang-card'?'guizang':'obsidian']:null}));
})();
