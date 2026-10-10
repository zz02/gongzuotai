const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');const {Readable}=require('stream');const {spawnSync}=require('child_process');const Database=require('better-sqlite3');
const delivery=require('../lib/creator-delivery'),video=require('../lib/creator-video'),{make}=require('../lib/workbench');
const rootDir=path.resolve(__dirname,'..');
function fixture(t,runner=async()=> '候选稿'){const db=new Database(':memory:');const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'creator-production-'));const w=make({db,dataRoot,rootDir,runner});t.after(()=>{db.close();fs.rmSync(dataRoot,{recursive:true,force:true});});return {w,dataRoot};}
async function settled(w){for(let i=0;i<600;i++){if(!w.state().busy)return;await new Promise(r=>setTimeout(r,50));}throw new Error('任务未结束');}
const pages='## 真实问题\n记录版本与成本。\n\n---\n\n## 实际结果\n不编造测评数据。';
test('三平台整稿契约拒绝残缺、格式错误与卡片溢出',()=>{
 assert.deepEqual(delivery.parsePack('wechatPack',JSON.stringify({wechatTitle:'具体问题',wechatSummary:'适用范围',wechat:'正文',evil:'忽略'})),{wechatTitle:'具体问题',wechatSummary:'适用范围',wechat:'正文'});
 for(const bad of ['{}','null','[]','不是 JSON',JSON.stringify({xhsTitle:'标题',xhsCaption:'配文',xhs:'缺少分页标题'})])assert.throws(()=>delivery.parsePack('xhsPack',bad));
 for(const kind of ['constructor','__proto__'])assert.throws(()=>delivery.parsePack(kind,'{}'),/稿件类型无效/);
 assert.throws(()=>delivery.parseTopics('{}'));assert.throws(()=>delivery.parseTopics('[{"title":"标题"}]'));
});
test('整稿采用一次保存标题、正文、配文；失败和冲突均不覆盖',async t=>{
 let good=true;const {w}=fixture(t,async()=>good?JSON.stringify({xhsTitle:'录屏实测',xhsCaption:'你遇到哪个具体问题？',xhs:pages}):'坏结果');
 let p=w.create({title:'实测'});p=w.save(p.id,{version:1,master:'用户已确认的事实母稿',xhs:'原稿'});
 const j=await w.generate(p.id,{kind:'xhsPack'});await settled(w);assert.equal(w.get(p.id).xhs,'原稿');p=w.apply(p.id,j.id,p.version);assert.equal(p.xhs, pages);assert.equal(p.xhsTitle,'录屏实测');assert.ok(p.xhsCaption);
 good=false;await w.generate(p.id,{kind:'xhsPack'});await settled(w);assert.equal(w.jobs()[0].status,'failed');assert.equal(w.get(p.id).xhs,pages);
 good=true;const old=await w.generate(p.id,{kind:'xhsPack'});await settled(w);p=w.save(p.id,{version:p.version,xhsTitle:'本人手改'});assert.throws(()=>w.apply(p.id,old.id,p.version),/不能直接覆盖/);assert.equal(w.get(p.id).xhsTitle,'本人手改');
});
test('导入正文先成为候选，限制目标与字符，冲突保留原稿',t=>{
 const {w}=fixture(t);let p=w.create({title:'已有文章'});p=w.save(p.id,{version:1,wechat:'原稿'});
 const j=w.importDraft(p.id,{version:p.version,field:'wechat',content:'本人导入的正文'});assert.equal(w.get(p.id).wechat,'原稿');p=w.apply(p.id,j.id,p.version);assert.equal(p.wechat,'本人导入的正文');
 for(const input of [{field:'master',content:''},{field:'__proto__',content:'bad'},{field:'xhs',content:'x'.repeat(12001)}])assert.throws(()=>w.importDraft(p.id,{version:p.version,...input}));
 assert.throws(()=>w.importDraft(p.id,{version:1,field:'master',content:'旧版本'}),/稿件已更新/);
});
test('可立项选题创建独立内容，重复点击复用，不覆盖旧母稿',async t=>{
 const {w}=fixture(t,async()=>JSON.stringify([{title:'具体问题',problem:'谁遇到了什么',action:'记录真实测试',reason:'可以复现'}]));const p=w.create({title:'原项目',brief:'已有素材'});
 const j=await w.generate(p.id,{kind:'topicPlan'});await settled(w);const first=w.topicCreate(p.id,{jobId:j.id,index:0});assert.equal(first.reused,false);assert.notEqual(first.project.id,p.id);assert.equal(w.get(p.id).title,'原项目');assert.equal(w.topicCreate(p.id,{jobId:j.id,index:0}).reused,true);
 assert.throws(()=>w.topicCreate(p.id,{jobId:j.id,index:-1}));
});
test('发布检查不把单封面、旧稿图片、缺少配文当作成品',()=>{
 const p={id:'project',wechat:'正文',xhs:pages,douyinPhoto:pages,xhsTitle:'标题',xhsCaption:'配文',douyinTitle:'标题',douyinCaption:'配文'};
 assert.ok(delivery.readiness(p,[]).every(c=>!c.ready));
 assert.equal(delivery.imagesFor(p,[{id:'old',projectId:p.id,status:'done',kind:'cards',seriesKey:'old',assets:['card-01.png','card-02.png']}],'xhs').length,0);
 assert.equal(delivery.imagesFor(p,[{id:'cover',projectId:p.id,status:'done',kind:'xhsImage',pageIndex:0,seriesKey:delivery.hash(pages),assets:['image.png']}],'xhs').length,0);
});
test('图文导出包含当前稿全部图片与配文，正文改变阻止导出',async t=>{
 const {w}=fixture(t);let p=w.create({title:'图文验证'});p=w.save(p.id,{version:1,xhsTitle:'具体问题',xhsCaption:'本人发布说明',xhs:pages});const j=await w.generate(p.id,{kind:'cards'});await settled(w);assert.equal(w.jobs()[0].status,'done');assert.equal(w.readiness(p.id)[1].ready,true);
 const pack=await w.exportPlatform(p.id,{version:p.version,platform:'小红书'});assert.equal((pack.html.match(/data:image\/png;base64/g)||[]).length,2);assert.ok(pack.html.includes('本人发布说明'));assert.ok(!pack.html.includes('/api/_/workbench/assets'));
 p=w.save(p.id,{version:p.version,xhs:pages+'\n新版'});await assert.rejects(w.exportPlatform(p.id,{version:p.version,platform:'小红书'}),/当前稿图片/);assert.ok(fs.existsSync(w.asset(j.id,'card-01.png')));
});
test('公众号导出独立标题摘要与排版，工作台图片嵌入且外部项目图片拒绝',async t=>{
 const {w}=fixture(t);let p=w.create({title:'公众号验证'});const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1kAAAAASUVORK5CYII=';const j=w.importImage(p.id,{base64:png});
 p=w.save(p.id,{version:1,wechatTitle:'标题',wechatSummary:'摘要',wechat:`正文。\n\n![图](/api/_/workbench/assets/${j.id}/image.png)`});const pack=await w.exportPlatform(p.id,{version:p.version,platform:'公众号'});assert.ok(pack.html.includes('data:image/png;base64'));assert.ok(pack.html.includes('摘要'));
 const other=w.create({title:'另一个项目'});const alien=w.importImage(other.id,{base64:png});p=w.save(p.id,{version:p.version,wechat:`![跨项目](/api/_/workbench/assets/${alien.id}/image.png)`});await assert.rejects(w.exportPlatform(p.id,{version:p.version,platform:'公众号'}),/不属于当前项目/);
});
test('视频时间轴、字幕、画幅与配音长度的边界验证',()=>{
 const source={duration:10,video:true,audio:true};const good='1\n00:00:00,000 --> 00:00:02,000\n本人讲解\n';assert.equal(video.parseSrt(good,5),good);
 for(const s of ['坏字幕','1\n00:00:00,000 --> 00:00:02,000\n<script>', '1\n00:00:03,000 --> 00:00:09,000\n超时','1\n00:00:00,000 --> 00:00:02,000\n'+ '长'.repeat(25)])assert.throws(()=>video.parseSrt(s,5));
 for(const input of [{start:-1,end:2,aspect:'vertical'},{start:2,end:1,aspect:'vertical'},{start:0,end:11,aspect:'vertical'},{start:0,end:2,aspect:'bad'}])assert.throws(()=>video.spec(input,source));
 assert.throws(()=>video.spec({start:0,end:5,aspect:'vertical'},source,{duration:2,audio:true}),/配音比成片短/);
});
test('伪装视频与本地播放清单拒绝，不登记半成品',async t=>{
 const {w}=fixture(t);const p=w.create({title:'视频边界'});const stream=Readable.from([Buffer.from('ffconcat version 1.0\nfile /etc/passwd\n')]);stream.headers={'content-type':'video/mp4'};
 await assert.rejects(w.importMedia(p.id,'recording',stream),/无法解码/);assert.equal(w.jobs().length,0);
});
test('真实录屏＋配音＋烧录中文字幕生成可解码 MP4，独立保存素材',async t=>{
 const env=await video.runtime();assert.equal(env.available,true,'本机需要 FFmpeg');assert.equal(env.subtitles,true,'本机需要 libass 或本地文字画布');
 const {w,dataRoot}=fixture(t);let p=w.create({title:'合成视频验收'});const src=path.join(dataRoot,'sample.mp4'),audio=path.join(dataRoot,'voice.wav');
 const commands=[['-f','lavfi','-i','testsrc2=size=640x360:rate=30','-t','3','-c:v','libx264','-pix_fmt','yuv420p',src],['-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','3',audio]];
 for(const args of commands){const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-n',...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
 const upload=async(kind,file,mime)=>{const stream=Readable.from([fs.readFileSync(file)]);stream.headers={'content-type':mime};return w.importMedia(p.id,kind,stream);};
 const rec=await upload('recording',src,'video/mp4'),voice=await upload('narration',audio,'audio/wav');assert.equal(rec.media.video,true);assert.equal(voice.media.audio,true);
 p=w.save(p.id,{version:1,subtitles:'1\n00:00:00,000 --> 00:00:01,000\n中文字幕验收\n\n2\n00:00:01,000 --> 00:00:02,000\n这是合成测试素材\n'});
 const job=await w.videoRender(p.id,{version:p.version,recordingId:rec.id,narrationId:voice.id,start:0.5,end:2.5,aspect:'vertical'});await settled(w);const done=w.jobs().find(j=>j.id===job.id);assert.equal(done.status,'done',done.error);assert.equal(done.media.width,1080);assert.equal(done.media.height,1920);assert.equal(done.media.audio,true);assert.equal(done.assets.includes('subtitles.srt'),true);assert.ok(fs.existsSync(w.asset(rec.id,'source.mp4')));assert.ok(fs.existsSync(w.asset(voice.id,'source.wav')));
 const elsewhere=w.create({title:'不可跨项目引用'});await assert.rejects(w.videoRender(elsewhere.id,{version:1,recordingId:rec.id,start:0,end:2,aspect:'vertical'}),/当前项目/);
});
