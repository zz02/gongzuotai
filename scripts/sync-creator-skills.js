#!/usr/bin/env node
// Fetch reviewed/pinned sources. Never execute an upstream installer or change global skills.
const fs=require('fs');const path=require('path');const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');const lockPath=path.join(root,'skills.lock.json');const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
const update=process.argv.includes('--update');
function git(args,cwd=root){const r=spawnSync('git',args,{cwd,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout||'Git 操作失败');return r.stdout.trim();}
fs.mkdirSync(path.join(root,'skill-sources'),{recursive:true});
for(const [id,s] of Object.entries(lock)){
  const dir=path.join(root,'skill-sources',id);const remote=`https://github.com/${s.repo}.git`;
  if(!fs.existsSync(dir))git(['clone','--depth','1',remote,dir]);
  if(git(['remote','get-url','origin'],dir)!==remote)throw new Error(`${id} 来源不匹配，停止更新。`);
  if(git(['status','--porcelain'],dir))throw new Error(`${id} 有本地修改，停止更新。`);
  let revision=s.commit;
  if(update){git(['fetch','--depth','1','origin','HEAD'],dir);revision=git(['rev-parse','FETCH_HEAD'],dir);}
  else if(git(['rev-parse','HEAD'],dir)!==revision)git(['fetch','--depth','1','origin',revision],dir);
  git(['checkout','--detach',revision],dir);s.commit=revision;console.log(`${id}: ${revision.slice(0,12)} · ${s.license}`);
}
if(update){fs.writeFileSync(lockPath,JSON.stringify(lock,null,2)+'\n');console.log('版本清单已更新。请审查上游差异并重跑测试后使用。');}
