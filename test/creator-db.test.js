const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const Database=require('better-sqlite3');
const {make}=require('../lib/workbench');
const methods=require('../lib/creator-db');
const rootDir=path.resolve(__dirname,'..');
const topics=JSON.stringify(Array.from({length:3},(_,i)=>({title:`读者任务 ${i+1}`,problem:'会后责任不清楚',action:'用模拟会议验证，并明确标注模拟',reason:'解决具体任务，读者需求待验证'})));
function fixture(t,runner=async()=> '建议，不是新稿',root=rootDir){
 const db=new Database(':memory:'),dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'creator-db-'));
 const w=make({db,dataRoot,rootDir:root,runner});
 t.after(()=>{db.close();fs.rmSync(dataRoot,{recursive:true,force:true});});return w;
}
async function settled(w){for(let i=0;i<100;i++){if(!w.state().busy)return;await new Promise(r=>setTimeout(r,10));}throw new Error('任务未结束');}
function context(prompt){const marker='<用户资料>\n';return JSON.parse(prompt.slice(prompt.lastIndexOf(marker)+marker.length,prompt.lastIndexOf('\n</用户资料>')));}

test('8 项 db 能力有真实适配和源码，标题不再使用旧入口',t=>{
 const w=fixture(t);const caps=w.capabilities().filter(c=>c.assistant);
 assert.equal(caps.length,8);assert.ok(caps.every(c=>c.available&&methods.task(c.kind)));
 assert.ok(caps.every(c=>c.license===methods.LICENSE));
 assert.match(caps.find(c=>c.id==='db-hook').file,/dbs-title-cover-intro/);
 assert.equal(methods.task('__proto__'),undefined);assert.deepEqual(methods.files('unknown'),[]);
});

test('每项任务真实加载方法材料、保留版本和摘要，不改原稿',async t=>{
 const calls=[];const w=fixture(t,async input=>{calls.push(input);return input.prompt.includes('只输出 JSON 数组')?topics:'局部建议';});
 let p=w.create({title:'会议整理',brief:'模拟材料，尚未实测'});
 p=w.save(p.id,{version:p.version,wechat:'公众号本人原稿',xhs:'## 小红书\n保留原句',douyinPhoto:'## 抖音\n保留结果'});
 for(const [kind,spec] of Object.entries(methods.TASKS)){
   const j=await w.generate(p.id,{kind,draftField:'xhs',platform:'公众号',version:p.version});await settled(w);
   assert.equal(w.jobs()[0].status,'done');assert.equal(j.method.skill,spec.skill);assert.equal(j.method.draftField,'xhs');assert.equal(j.method.platform,'小红书');assert.match(j.method.digest,/^[a-f0-9]{64}$/);assert.match(j.method.commit,/^[a-f0-9]{40}$/);
   const prompt=calls.at(-1).prompt;
   assert.ok(prompt.includes(`文件="skills/${spec.skill}/SKILL.md"`));assert.ok(prompt.includes(fs.readFileSync(path.join(rootDir,'skill-sources/dbskill/skills',spec.skill,'SKILL.md'),'utf8')));
   assert.match(prompt,/不得执行上游安装/);assert.match(prompt,/不启动代理/);
   assert.equal(context(prompt).draft,p.xhs);assert.equal(context(prompt).draftName,'小红书逐页稿');
   assert.equal(w.get(p.id).wechat,p.wechat);assert.equal(w.get(p.id).xhs,p.xhs);assert.equal(w.get(p.id).version,p.version);
   assert.throws(()=>w.apply(p.id,j.id,p.version),/没有可采用/);
 }
});

test('跨平台稿件明确选择，不回退到其他平台；有正文无需重复填素材',async t=>{
 let prompt;const w=fixture(t,async input=>{prompt=input.prompt;return '检查结果';});
 let p=w.create({title:'抖音稿'});p=w.save(p.id,{version:p.version,wechat:'不应该检查我',douyinPhoto:'应该检查的抖音正文',douyinTitle:'抖音原标题'});
 await w.generate(p.id,{kind:'risk',draftField:'douyinPhoto'});await settled(w);
 const c=context(prompt);assert.equal(c.draft,'应该检查的抖音正文');assert.equal(c.platform,'抖音图文');assert.equal(c.publishTitle,'抖音原标题');
 await assert.rejects(w.generate(p.id,{kind:'resonate',draftField:'xhs'}),/小红书逐页稿/);
 assert.equal(w.jobs().length,1);
});

test('空材料、无效对象、平台、任务与过期版本均不建任务',async t=>{
 const w=fixture(t);let p=w.create({title:'空项目'});
 for(const kind of ['review','resonate','expression','risk','hooks'])await assert.rejects(w.generate(p.id,{kind,draftField:'master'}),/请先填写/);
 await assert.rejects(w.generate(p.id,{kind:'audience',draftField:'brief'}),/实测素材/);
 p=w.save(p.id,{version:p.version,brief:'已填素材'});
 for(const field of ['sources','__proto__',null,{},'../master'])await assert.rejects(w.generate(p.id,{kind:'audience',draftField:field}),/检查对象/);
 await assert.rejects(w.generate(p.id,{kind:'audience',platform:'微博'}),/目标平台/);
 await assert.rejects(w.generate(p.id,{kind:'audience',version:1}),/稿件已更新/);
 await assert.rejects(w.generate(p.id,{kind:'__proto__'}),/无效/);assert.equal(w.jobs().length,0);
});

test('缺少来源或标题依赖时禁用，后台不退回泛化生成',async t=>{
 const fake=fs.mkdtempSync(path.join(os.tmpdir(),'creator-db-source-'));t.after(()=>fs.rmSync(fake,{recursive:true,force:true}));
 const dir=path.join(fake,'skill-sources/dbskill/skills/dbs-title-cover-intro');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),'存在主文件，但缺少参考文件');
 let called=false;const w=fixture(t,async()=>{called=true;return '不应调用';},fake);const p=w.create({title:'缺来源',brief:'已有素材'});
 assert.equal(w.capabilities().find(c=>c.kind==='hooks').available,false);
 await assert.rejects(w.generate(p.id,{kind:'hooks',draftField:'brief'}),e=>e.status===503&&/方法文件/.test(e.message));
 await assert.rejects(w.generate(p.id,{kind:'audience'}),/方法文件/);
 assert.equal(called,false);assert.equal(w.jobs().length,0);
});

test('模型失败、空响应和不合格选题不改手稿，重试成功仍只留建议',async t=>{
 let response=0;const w=fixture(t,async()=>{response++;if(response===1)throw new Error('临时失败');if(response===2)return '';return '局部建议';});
 let p=w.create({title:'保护手稿',brief:'实测素材'});p=w.save(p.id,{version:p.version,xhs:'## 手改\n保留'});
 for(let i=0;i<3;i++){await w.generate(p.id,{kind:'resonate',draftField:'xhs'});await settled(w);assert.equal(w.jobs()[0].status,i<2?'failed':'done');assert.equal(w.get(p.id).xhs,p.xhs);}
 const invalid=fixture(t,async()=> '[{"title":"缺字段"}]');const q=invalid.create({title:'坏选题',brief:'材料'});await invalid.generate(q.id,{kind:'topicPlan'});await settled(invalid);assert.equal(invalid.jobs()[0].status,'failed');assert.equal(invalid.projects().length,1);
});

test('选定 OB 素材可用于读者需求，原文不变且不作为已访谈证据',async t=>{
 let prompt;const w=fixture(t,async input=>{prompt=input.prompt;return '任务假设';});
 const vault=fs.mkdtempSync(path.join(os.tmpdir(),'creator-db-vault-'));t.after(()=>fs.rmSync(vault,{recursive:true,force:true}));fs.mkdirSync(path.join(vault,'.obsidian'));fs.mkdirSync(path.join(vault,'素材'));const note=path.join(vault,'素材/会议.md');fs.writeFileSync(note,'模拟会议材料，没有真实访谈。');
 w.obsidian.connect({path:vault,scopes:['素材'],output:'创作归档'});const p=w.create({title:'读者需求'});w.obsidian.select(p.id,{version:p.version,path:'素材/会议.md'});
 await w.generate(p.id,{kind:'audience',draftField:'brief'});await settled(w);
 assert.equal(w.jobs()[0].status,'done');assert.ok(context(prompt).knowledge.length);assert.match(prompt,/待验证假设/);assert.equal(fs.readFileSync(note,'utf8'),'模拟会议材料，没有真实访谈。');
});
