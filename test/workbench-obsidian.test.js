const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const os=require('os');const path=require('path');const Database=require('better-sqlite3');
const {make}=require('../lib/workbench');
const {relative}=require('../lib/workbench-obsidian');
const rootDir=path.resolve(__dirname,'..');
function fixture(t,runner=async()=> '候选稿'){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'creator-vault-')),vault=path.join(dir,'知识库 空格');fs.mkdirSync(vault);fs.mkdirSync(path.join(vault,'.obsidian'));fs.mkdirSync(path.join(vault,'素材'));fs.mkdirSync(path.join(vault,'输出'));fs.mkdirSync(path.join(vault,'日记'));
  fs.writeFileSync(path.join(vault,'素材','AI实测.md'),'---\ntitle: 实测学习卡\ncustom: 保留属性\n---\n\n真实结果，成本待验证。\n[[另一条笔记|来源]]\n> [!note] 不编造经历');
  fs.writeFileSync(path.join(vault,'日记','私人.md'),'不该发送给模型');
  const db=new Database(':memory:');const w=make({db,dataRoot:path.join(dir,'app'),rootDir,runner});t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
  const connect=()=>w.obsidian.connect({path:vault,scopes:['素材','输出'],output:'输出/创作台'});
  return {dir,vault,w,connect};
}
test('知识库连接校验、搜索范围、原文只读和中文 URI',t=>{
  const {dir,vault,w,connect}=fixture(t);assert.equal(w.obsidian.config(),null);assert.throws(()=>w.obsidian.list(),/先连接/);
  assert.throws(()=>w.obsidian.connect({path:dir,scopes:['素材']}),/不是 Obsidian/);assert.throws(()=>w.obsidian.connect({path:vault,scopes:[]}),/1～8/);
  connect();assert.equal(w.obsidian.list('AI').total,1);assert.equal(w.obsidian.list('私人').total,0);
  const n=w.obsidian.read('素材/AI实测.md');assert.ok(n.content.includes('[[另一条笔记|来源]]'));assert.equal(decodeURIComponent(n.uri.split('path=')[1]),path.join(fs.realpathSync(vault),'素材/AI实测.md'));
  assert.throws(()=>w.obsidian.read('日记/私人.md'),/接入范围/);assert.equal(w.obsidian.list('无匹配').notes.length,0);
});
test('路径穿越、隐藏目录、有效及断开的符号链接均被拒绝',t=>{
  const {vault,w,connect}=fixture(t);connect();
  for(const p of ['../etc/hosts','/etc/hosts','.obsidian/config','素材/../日记/私人.md','素材\\a.md','素材/a\u0000.md','素材/a#b.md'])assert.throws(()=>relative(p));
  fs.symlinkSync('/etc/hosts',path.join(vault,'素材','恶意.md'));assert.throws(()=>w.obsidian.read('素材/恶意.md'),/符号链接/);assert.equal(w.obsidian.list('恶意').total,0);
  fs.symlinkSync('/missing-target-for-test',path.join(vault,'输出','坏链'));assert.throws(()=>w.obsidian.connect({path:vault,scopes:['素材'],output:'输出/坏链/内容'}),/符号链接/);
});
test('关联有版本保护、刷新检测修改和重命名、移除不删除原文',t=>{
  const {vault,w,connect}=fixture(t);connect();let p=w.create({title:'内容'});const original=fs.readFileSync(path.join(vault,'素材/AI实测.md'),'utf8');
  p=w.obsidian.select(p.id,{version:p.version,path:'素材/AI实测.md'}).project;assert.equal(w.obsidian.selected(p.id)[0].status,'已同步');
  assert.throws(()=>w.obsidian.select(p.id,{version:1,path:'素材/AI实测.md'}),/更新/);assert.equal(fs.readFileSync(path.join(vault,'素材/AI实测.md'),'utf8'),original);
  fs.appendFileSync(path.join(vault,'素材/AI实测.md'),'\n新增结果');assert.equal(w.obsidian.selected(p.id)[0].status,'原文已改');assert.throws(()=>w.obsidian.material(p.id),/变化/);
  p=w.obsidian.select(p.id,{version:p.version,path:'素材/AI实测.md'}).project;assert.ok(w.obsidian.material(p.id)[0].content.includes('新增结果'));
  fs.renameSync(path.join(vault,'素材/AI实测.md'),path.join(vault,'素材/改名.md'));assert.equal(w.obsidian.selected(p.id)[0].status,'原文不可读');
  w.obsidian.remove(p.id,{version:p.version,path:'素材/AI实测.md'});assert.equal(w.obsidian.selected(p.id).length,0);assert.ok(fs.existsSync(path.join(vault,'素材/改名.md')));
});
test('只有选中的素材进入生成上下文，空手写素材也可生成',async t=>{
  let prompt='';const {w,connect}=fixture(t,async args=>{prompt=args.prompt;return '结果';});connect();let p=w.create({title:'内容'});p=w.obsidian.select(p.id,{version:1,path:'素材/AI实测.md'}).project;
  await w.generate(p.id,{kind:'wechat'});for(let i=0;i<20&&w.state().busy;i++)await new Promise(r=>setTimeout(r,10));
  assert.match(prompt,/真实结果/);assert.ok(!prompt.includes('不该发送给模型'));assert.equal(w.jobs()[0].status,'done');
});
test('OB 稿件先进入候选，原稿保留，修改后不能直接采用',t=>{
  const {w,connect,vault}=fixture(t);connect();let p=w.create({title:'内容'});p=w.save(p.id,{version:1,wechat:'人工原稿'});
  const j=w.obsidian.candidate(p.id,{version:p.version,path:'素材/AI实测.md',kind:'wechat'});assert.equal(w.get(p.id).wechat,'人工原稿');
  p=w.apply(p.id,j.id,p.version);assert.ok(p.wechat.includes('真实结果'));
  const j2=w.obsidian.candidate(p.id,{version:p.version,path:'素材/AI实测.md',kind:'wechat'});p=w.save(p.id,{version:p.version,wechat:'新修改'});assert.throws(()=>w.apply(p.id,j2.id,p.version),/不能直接覆盖/);
  fs.appendFileSync(path.join(vault,'素材/AI实测.md'),'\n![[图.png]]');assert.throws(()=>w.obsidian.candidate(p.id,{version:p.version,path:'素材/AI实测.md',kind:'wechat'}),/图片缺失/);
});
test('OB 导入事实母稿和抖音图文需确认采用，归档保留各平台元信息',t=>{
  const {w,connect,vault}=fixture(t);connect();let p=w.create({title:'新创作流程'});
  const original=fs.readFileSync(path.join(vault,'素材/AI实测.md'),'utf8');
  for(const kind of ['master','douyinPhoto']){
    const job=w.obsidian.candidate(p.id,{version:p.version,path:'素材/AI实测.md',kind});
    assert.equal(w.get(p.id)[kind]||'','');assert.equal(job.kind,'draftImport');
    p=w.apply(p.id,job.id,p.version);assert.ok(p[kind].includes('真实结果'));
  }
  p=w.save(p.id,{version:p.version,wechatTitle:'公众号标题',wechatSummary:'公众号摘要',xhsTitle:'小红书标题',xhsCaption:'小红书配文',douyinTitle:'抖音图文标题',douyinCaption:'抖音图文配文',videoTitle:'视频标题',videoCaption:'视频配文',subtitles:'字幕原文'});
  const result=w.obsidian.archive(p.id,{version:p.version}),dir=path.dirname(path.join(vault,result.path));
  assert.match(fs.readFileSync(path.join(dir,'素材与来源.md'),'utf8'),/真实结果/);
  assert.match(fs.readFileSync(path.join(dir,'公众号.md'),'utf8'),/公众号摘要/);
  assert.match(fs.readFileSync(path.join(dir,'小红书.md'),'utf8'),/小红书配文/);
  const videoNote=fs.readFileSync(path.join(dir,'抖音脚本.md'),'utf8');assert.match(videoNote,/抖音图文配文/);assert.match(videoNote,/视频配文/);assert.match(videoNote,/字幕原文/);
  assert.equal(fs.readFileSync(path.join(vault,'素材/AI实测.md'),'utf8'),original);
});
test('归档可迁移图片、保存三端与复盘，重复归档不覆盖 OB 修改',t=>{
  const {w,connect,vault}=fixture(t);connect();let p=w.create({title:"曾曾's 实测",brief:'母素材'});p=w.obsidian.select(p.id,{version:1,path:'素材/AI实测.md'}).project;
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1kAAAAASUVORK5CYII=';const j=w.importImage(p.id,{base64:png});p=w.save(p.id,{version:p.version,wechat:`正文\n![配图](/api/_/workbench/assets/${j.id}/image.png)`,xhs:'## 封面\n内容',video:'录屏脚本',nextAction:'验证开头'});
  const result=w.obsidian.archive(p.id,{version:p.version});assert.equal(result.assets,1);const dir=path.dirname(path.join(vault,result.path));const draft=path.join(dir,'公众号.md');
  assert.ok(fs.readFileSync(draft,'utf8').includes('![['));assert.ok(!fs.readFileSync(draft,'utf8').includes('/api/'));assert.deepEqual(fs.readFileSync(path.join(dir,'附件',`${j.id}-image.png`)),Buffer.from(png,'base64'));
  assert.ok(fs.readFileSync(path.join(dir,'素材与来源.md'),'utf8').includes('[[素材/AI实测|实测学习卡]]'));assert.ok(fs.readFileSync(path.join(dir,'发布与复盘.md'),'utf8').includes('验证开头'));
  const base=fs.readFileSync(path.join(dir,'创作看板.base'),'utf8');assert.ok(base.includes('平台'));assert.ok(base.includes('filters:'));
  fs.appendFileSync(draft,'\nOB 人工修改');const second=w.obsidian.archive(p.id,{version:p.version});assert.notEqual(result.path,second.path);assert.ok(fs.readFileSync(draft,'utf8').includes('OB 人工修改'));
  assert.throws(()=>w.obsidian.archive(p.id,{version:1}),/先保存/);
  const imported=w.obsidian.candidate(p.id,{version:p.version,path:path.posix.join(path.posix.dirname(result.path),'公众号.md'),kind:'wechat'});assert.equal(imported.assets.length,1);assert.match(imported.result,/\/api\/_\/workbench\/assets/);assert.deepEqual(fs.readFileSync(w.asset(imported.id,imported.assets[0])),Buffer.from(png,'base64'));
});
test('OB 图片可导入但不展开嵌入笔记，不读取范围外或伪造的图片',t=>{
  const {w,connect,vault}=fixture(t);connect();const p=w.create({title:'内容'});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1kAAAAASUVORK5CYII=','base64');fs.writeFileSync(path.join(vault,'素材','图.png'),png);
  fs.writeFileSync(path.join(vault,'素材','带图.md'),'![[图.png|300]]\n![图](图.png)');const j=w.obsidian.candidate(p.id,{version:1,path:'素材/带图.md',kind:'wechat'});assert.equal(j.assets.length,1);
  fs.writeFileSync(path.join(vault,'素材','带图.md'),'![[AI实测]]');assert.throws(()=>w.obsidian.candidate(p.id,{version:1,path:'素材/带图.md',kind:'wechat'}),/嵌入笔记/);
  fs.writeFileSync(path.join(vault,'素材','带图.md'),'![图](../../etc/hosts.png)');assert.throws(()=>w.obsidian.candidate(p.id,{version:1,path:'素材/带图.md',kind:'wechat'}),/图片缺失/);
  fs.writeFileSync(path.join(vault,'素材','伪造.png'),'<script>bad</script>');fs.writeFileSync(path.join(vault,'素材','带图.md'),'![[伪造.png]]');assert.throws(()=>w.obsidian.candidate(p.id,{version:1,path:'素材/带图.md',kind:'wechat'}),/有效的图片/);
});
test('归档失败不暴露半成品快照，单个平台登记不误标其他平台',t=>{
  const {w,connect,vault}=fixture(t);connect();let p=w.create({title:'保护检查'});
  w.importImage(p.id,{base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1kAAAAASUVORK5CYII='});
  const copy=fs.copyFileSync;fs.copyFileSync=()=>{throw new Error('模拟磁盘写入失败');};
  try{assert.throws(()=>w.obsidian.archive(p.id,{version:1}),/归档未完成/);}finally{fs.copyFileSync=copy;}
  const output=path.join(vault,'输出/创作台');assert.ok(fs.readdirSync(output).every(f=>f.startsWith('.creator-staging-')));
  p=w.publication(p.id,{version:1,platform:'小红书',url:'https://example.com/post',at:'2026-10-08 10:00'});
  const result=w.obsidian.archive(p.id,{version:p.version}),dir=path.dirname(path.join(vault,result.path));
  assert.match(fs.readFileSync(path.join(dir,'小红书.md'),'utf8'),/状态: "已登记"/);assert.match(fs.readFileSync(path.join(dir,'公众号.md'),'utf8'),/状态: "草稿"/);
});
test('过大笔记、选中笔记数量、断开与切换知识库的保护',t=>{
  const {w,connect,vault,dir}=fixture(t);connect();let p=w.create({title:'内容'});fs.writeFileSync(path.join(vault,'素材/过大.md'),'字'.repeat(30001));assert.throws(()=>w.obsidian.read('素材/过大.md'),/30,000/);
  for(let i=0;i<8;i++){fs.writeFileSync(path.join(vault,`素材/${i}.md`),'素材');p=w.obsidian.select(p.id,{version:p.version,path:`素材/${i}.md`}).project;}
  assert.throws(()=>w.obsidian.select(p.id,{version:p.version,path:'素材/AI实测.md'}),/最多关联/);
  const other=path.join(dir,'另一个库');fs.mkdirSync(other);fs.mkdirSync(path.join(other,'.obsidian'));fs.mkdirSync(path.join(other,'素材'));w.obsidian.connect({path:other,scopes:['素材']});assert.equal(w.obsidian.selected(p.id)[0].status,'其他知识库');assert.throws(()=>w.obsidian.material(p.id),/不可读/);assert.throws(()=>w.obsidian.archive(p.id,{version:p.version}),/其他知识库/);
});
