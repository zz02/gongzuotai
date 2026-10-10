#!/usr/bin/env node
// Opt-in real Codex smoke check. Isolated mock materials; never opens the user's DB/vault.
const fs=require('fs'),os=require('os'),path=require('path');
const Database=require('better-sqlite3');
const {make}=require('../lib/workbench');
async function main(){
 if(!process.argv.includes('--real'))throw new Error('真实验证会使用 Codex 额度；确认执行时加 --real。');
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'creator-db-real-'));
 const db=new Database(':memory:');
 const w=make({db,dataRoot,rootDir:path.resolve(__dirname,'..')});
 let p=w.create({title:'会议结束后，如何把待办分清楚',brief:'这是明确标注的模拟演示，不是本人实测。素材：一份模拟会议记录，要求从原文逐项提取任务、负责人、截止日期，原文没有的信息标待补，再由参会人确认。未测耗时，不知道效率提升，也没有读者访谈。'});
 p=w.save(p.id,{version:p.version,audience:'AI 职场小白，女生友好但不限性别',xhs:'## 会后待办，先分清责任\n这是模拟演示，不代表本人在公司实测。\n---\n## 先找原文依据\n把模拟会议记录逐项整理为任务、负责人、截止日期。原文没说的写待补。\n---\n## 最后请人确认\n请参会人核对，AI 整理不替代本人确认。未测耗时，不承诺效率倍数。'});
 try{
  for(const kind of ['audience','hooks','risk']){
   const j=await w.generate(p.id,{kind,draftField:'xhs',platform:'小红书',version:p.version});
   console.log(JSON.stringify({kind,event:'submitted',jobId:j.id,dataRoot}));
   while(w.state().busy)await new Promise(r=>setTimeout(r,1000));
   const done=w.jobs().find(x=>x.id===j.id);
   console.log(JSON.stringify({kind,status:done.status,characters:done.result.length,result:path.join(dataRoot,'workbench',j.id,'result.md'),error:done.error}));
   if(done.status!=='done')throw new Error(`${kind}: ${done.error}`);
   if(w.get(p.id).version!==p.version||w.get(p.id).xhs!==p.xhs)throw new Error('验证期间原稿发生变化。');
  }
 }finally{db.close();}
 console.log(JSON.stringify({status:'passed',note:'真实任务完成；内容质量和增长效果仍需本人及读者验证。',dataRoot}));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={main};
