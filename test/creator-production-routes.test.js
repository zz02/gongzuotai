const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const {boot,close,req,TEST_ADMIN_PASSWORD}=require('./_server');
let cookie,base;before(async()=>{base=await boot();const login=await req('/api/_/login',{method:'POST',body:{username:'admin',password:TEST_ADMIN_PASSWORD}});cookie=login.headers.get('set-cookie').split(';')[0];});after(close);
const call=(url,method='GET',body)=>req('/api/_/workbench'+url,{method,body,headers:{Cookie:cookie}});
test('新增制作接口必须登录，异常输入不给出成功状态',async()=>{
 const p=(await call('/projects','POST',{title:'路由验收'})).json.data;
 for(const endpoint of ['draft-import','topic-create','export-platform','video-render','recording','narration'])assert.equal((await req(`/api/_/workbench/projects/${p.id}/${endpoint}`,{method:'POST',body:{}})).status,401);
 for(const endpoint of ['readiness'])assert.equal((await req(`/api/_/workbench/projects/${p.id}/${endpoint}`)).status,401);
 assert.equal((await req('/api/_/workbench/video-runtime')).status,401);
 assert.equal((await call(`/projects/${p.id}/draft-import`,'POST',[])).status,400);
 assert.equal((await call(`/projects/${p.id}/recording`,'POST',{})).status,400);
 assert.equal((await call(`/projects/${p.id}/narration`,'POST',{})).status,400);
 assert.equal((await call(`/projects/${p.id}/video-render`,'POST',{version:1,recordingId:'fake',aspect:'vertical'})).status,400);
 assert.equal((await call(`/projects/${p.id}/export-platform`,'POST',{version:1,platform:'公众号'})).status,400);
});
test('HTTP 导入与采用、独立平台稿保存、排版发布包和过期保护闭环',async()=>{
 let p=(await call('/projects','POST',{title:'已有正文制作'})).json.data;
 const draft=(await call(`/projects/${p.id}/draft-import`,'POST',{version:1,field:'master',content:'本人提供的事实正文。'})).json.data;
 assert.equal((await call(`/projects/${p.id}`)).json.data.master,undefined);
 p=(await call(`/projects/${p.id}/apply`,'POST',{version:1,jobId:draft.id})).json.data;assert.equal(p.master,'本人提供的事实正文。');
 p=(await call(`/projects/${p.id}`,'PUT',{version:p.version,wechatTitle:'独立标题',wechatSummary:'独立摘要',wechat:'正文。\n\n## 步骤\n\n先核对事实。',xhsTitle:'小红书标题',douyinTitle:'抖音标题',videoSettings:JSON.stringify({start:'0',end:'2',aspect:'vertical'})})).json.data;
 const checks=(await call(`/projects/${p.id}/readiness`)).json.data;assert.equal(checks[0].ready,true);assert.equal(checks[1].ready,false);assert.equal(checks[2].ready,false);
 const pack=await call(`/projects/${p.id}/export-platform`,'POST',{version:p.version,platform:'公众号'});assert.equal(pack.status,200);assert.ok(pack.json.data.html.includes('独立标题'));assert.ok(pack.json.data.html.includes('独立摘要'));assert.ok(pack.json.data.html.includes('先核对事实'));
 assert.equal((await call(`/projects/${p.id}/export-platform`,'POST',{version:1,platform:'公众号'})).status,409);
 assert.equal((await call(`/projects/${p.id}`,'PUT',{version:p.version,xhsTitle:'x'.repeat(61)})).status,400);
 const runtime=await call('/video-runtime');assert.equal(runtime.status,200);assert.equal(typeof runtime.json.data.available,'boolean');
});
