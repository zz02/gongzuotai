const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
process.env.CODEX_BIN=path.join(__dirname,'fixtures','fake-codex-bin');
const {boot,close,TEST_ADMIN_PASSWORD}=require('./_server');
let base,browser;
before(async()=>{base=await boot();const executablePath=process.env.WORKBENCH_CHROME||(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);browser=await chromium.launch({headless:true,executablePath});});
after(async()=>{await browser?.close();await close();});

async function createIdea(context,id,title){
 const response=await context.request.post('/api/_/inspirations',{data:{id,title,summary:'职场新人想从会议记录提取任务、负责人、日期；尚未实测。',angle:'先核对原文，再补测试截图',targetPlatform:'多平台',sourceKeywords:['会议待办']}});
 assert.equal(response.status(),200,await response.text());
}
async function loggedContext(viewport){
 const context=await browser.newContext({baseURL:base,viewport});
 const login=await context.request.post('/api/_/login',{data:{username:'admin',password:TEST_ADMIN_PASSWORD}});
 assert.equal(login.status(),200);
 return context;
}

test('从灵感选题开始创作，自动生成并保存公众号与小红书初稿',async t=>{
 const context=await loggedContext({width:1440,height:1000});t.after(()=>context.close());
 await createIdea(context,'insp:two-platform-happy','会议待办怎么分清责任');
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/index.html#inspiration');
 await page.locator('[data-action="sendIdeaToCreator"][data-id="insp:two-platform-happy"]').click();
 await page.locator('#draft-path-status').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('[data-field="wechat"]')?.value.includes('【待补】')&&document.querySelector('[data-field="xhs"]')?.value.includes('【待补】'),undefined,{timeout:30000});
 assert.match(await page.locator('#draft-path-status').innerText(),/双平台草稿已写入/);
 assert.equal(await page.locator('#draft-both-button').isDisabled(),true);
 const projects=(await (await context.request.get('/api/_/workbench')).json()).data.projects;
 const project=projects.find(p=>p.title==='会议待办怎么分清责任');
 assert.ok(project?.wechat?.includes('【待补】'));
 assert.ok(project?.xhs?.includes('【待补】'));
 assert.ok(project.wechatTitle&&project.xhsTitle&&project.wechatSummary&&project.xhsCaption);
 const original=project.wechat;
 await page.reload();await page.locator('#draft-path-status').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-field="wechat"]').inputValue(),original);
 for(const viewport of [{width:1440,height:1000},{width:768,height:900},{width:375,height:812}]){
  await page.setViewportSize(viewport);
  await page.locator('#draft-both-button').scrollIntoViewIfNeeded();
  const layout=await page.evaluate(()=>({window:innerWidth,content:document.documentElement.scrollWidth,button:document.querySelector('#draft-both-button').getBoundingClientRect().height}));
  assert.ok(layout.content<=layout.window+1,JSON.stringify(layout));
  if(viewport.width===375)assert.ok(layout.button>=44,JSON.stringify(layout));
  await page.screenshot({path:path.join(require('os').tmpdir(),`creator-two-platform-${viewport.width}.png`)});
 }
 assert.deepEqual(errors,[]);
});

test('生成失败留在页面说明原因，重试入口可用，平台正文仍为空',async t=>{
 const context=await loggedContext({width:375,height:812});t.after(()=>context.close());
 await createIdea(context,'insp:two-platform-fail','【测试失败】会议待办');
 const page=await context.newPage();await page.goto('/index.html#inspiration');
 await page.locator('[data-action="sendIdeaToCreator"][data-id="insp:two-platform-fail"]').click();
 await page.locator('#draft-path-status').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#draft-path-status')?.textContent.includes('生成失败'),undefined,{timeout:20000});
 assert.equal(await page.locator('[data-field="wechat"]').inputValue(),'');
 assert.equal(await page.locator('[data-field="xhs"]').inputValue(),'');
 assert.equal(await page.locator('#draft-both-button').isDisabled(),false);
 assert.match(await page.locator('#draft-path-status').innerText(),/请重试/);
});

test('补齐小红书稿时保留已经手写的公众号正文',async t=>{
 const context=await loggedContext({width:768,height:900});t.after(()=>context.close());
 let project=(await (await context.request.post('/api/_/workbench/projects',{data:{title:'只补小红书',brief:'选题阶段，尚未实测。请准备一份带待补标记的图文稿。'}})).json()).data;
 project=(await (await context.request.put(`/api/_/workbench/projects/${project.id}`,{data:{version:project.version,wechat:'本人手写的公众号正文',wechatTitle:'本人标题'}})).json()).data;
 await context.addInitScript(id=>localStorage.setItem('creator-project',id),project.id);
 const page=await context.newPage();await page.goto('/index.html#workbench');
 await page.locator('#draft-both-button').waitFor({state:'visible'});
 assert.match(await page.locator('#draft-both-button').innerText(),/小红书/);
 await page.locator('#draft-both-button').click();
 await page.waitForFunction(()=>document.querySelector('[data-field="xhs"]')?.value.includes('【待补】'),undefined,{timeout:20000});
 const saved=(await (await context.request.get(`/api/_/workbench/projects/${project.id}`)).json()).data;
 assert.equal(saved.wechat,'本人手写的公众号正文');
 assert.equal(saved.wechatTitle,'本人标题');
 assert.ok(saved.xhs.includes('【待补】'));
 const jobs=(await (await context.request.get('/api/_/workbench')).json()).data.jobs.filter(j=>j.projectId===project.id);
 assert.deepEqual(jobs.map(j=>j.kind),['xhsPack']);
});
