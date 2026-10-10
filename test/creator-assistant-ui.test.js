// Real rendered UI + isolated HTTP app; model responses are deliberate test doubles.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('fs'),os=require('os'),path=require('path');
const {boot,close,TEST_ADMIN_PASSWORD}=require('./_server');
const methods=require('../lib/creator-db');
let base,browser;
before(async()=>{base=await boot();const executablePath=process.env.WORKBENCH_CHROME||(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);browser=await chromium.launch({headless:true,executablePath});});
after(async()=>{await browser?.close();await close();});

for(const viewport of [{width:1440,height:1000},{width:768,height:900},{width:375,height:812}]){
 test(`创作助手 ${viewport.width}px：正确稿件、错误提示、结果保护、弹窗与无横向溢出`,async t=>{
  const context=await browser.newContext({baseURL:base,viewport});t.after(()=>context.close());
  const login=await context.request.post('/api/_/login',{data:{username:'admin',password:TEST_ADMIN_PASSWORD}});assert.equal(login.status(),200);
  let p=(await (await context.request.post('/api/_/workbench/projects',{data:{title:`界面验收 ${viewport.width}`,brief:'模拟会议材料，尚未实测'}})).json()).data;
  p=(await (await context.request.put(`/api/_/workbench/projects/${p.id}`,{data:{version:p.version,wechat:'公众号正文',xhs:'## 小红书\n明确的操作步骤',douyinPhoto:'## 抖音\n真实结果仍待补'}})).json()).data;
  await context.addInitScript(id=>{localStorage.setItem('creator-project',id);localStorage.setItem('creator-tab','xhs');},p.id);
  const page=await context.newPage(),errors=[],calls=[],fakeJobs=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/_/workbench/runtime',r=>r.fulfill({json:{ok:true,data:{installed:true,loggedIn:true,imageEnabled:false,note:'UI 测试环境，不代表真实 Codex 状态'}}}));
  await page.route('**/api/_/workbench',async r=>{const response=await r.fetch(),body=await response.json();body.data.jobs=[...fakeJobs,...body.data.jobs];await r.fulfill({json:body});});
  await page.route('**/api/_/workbench/projects/*/generate',async r=>{
   const input=r.request().postDataJSON();calls.push(input);
   const project=(await (await context.request.get(`/api/_/workbench/projects/${p.id}`)).json()).data;
   const spec=methods.task(input.kind);
   if(spec.requiresDraft&&!project[input.draftField]?.trim())return r.fulfill({status:400,json:{ok:false,error:`请先填写“${methods.TARGETS[input.draftField]}”，再运行${spec.name}。`}});
   const job={id:require('crypto').randomUUID(),projectId:p.id,kind:input.kind,baseVersion:project.version,status:'done',startedAt:Date.now(),assets:[],error:'',result:'局部建议：<script>不是可执行内容</script>',method:{draftName:methods.TARGETS[input.draftField],draftField:input.draftField,platform:input.platform,commit:'564a794ffa8d08eb9c28ede8b2446237c1f67ada'}};
   fakeJobs.unshift(job);await r.fulfill({json:{ok:true,data:job}});
  });
  await page.goto('/index.html#workbench');
  await page.locator('#editor').waitFor({state:'visible'});
  assert.equal(await page.locator('#assistant-kind option').count(),8);
  assert.equal(await page.locator('#assistant-target').inputValue(),'xhs');assert.equal(await page.locator('#assistant-platform').inputValue(),'小红书');assert.equal(await page.locator('#assistant-platform').isDisabled(),true);
  await page.locator('#assistant-kind').selectOption('risk');await page.locator('#assistant-run').click();
  await page.locator('#jobs [data-preview]').first().waitFor();assert.equal(calls[0].draftField,'xhs');assert.equal(calls[0].platform,'小红书');
  await page.locator('#jobs [data-preview]').first().click();await page.locator('#dialog[open]').waitFor();
  assert.match(await page.locator('#dialog').innerText(),/小红书逐页稿/);assert.equal(await page.locator('#dialog script').count(),0);assert.equal(await page.locator('#dialog [data-apply]').count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);
  await page.locator('#creator-tab-douyin').click();assert.equal(await page.locator('#assistant-target').inputValue(),'douyinPhoto');assert.equal(await page.locator('#assistant-platform').inputValue(),'抖音图文');
  await page.locator('#assistant-run').click();await page.waitForFunction(()=>document.querySelectorAll('#jobs [data-preview]').length>=2);assert.equal(calls[1].draftField,'douyinPhoto');
  await page.locator('#assistant-target').selectOption('master');await page.locator('#assistant-run').click();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('事实母稿'));assert.match(await page.locator('#toast').innerText(),/请先填写/);
  await page.locator('#creator-tab-materials').click();await page.locator('[data-field="title"]').fill('生成后手改');
  await page.locator('#jobs [data-preview]').first().click();assert.match(await page.locator('#dialog').innerText(),/稿件有修改/);
  const evidence=fs.mkdtempSync(path.join(os.tmpdir(),`creator-assistant-ui-${viewport.width}-`));
  await page.screenshot({path:path.join(evidence,'result-dialog.png'),fullPage:false});
  await page.keyboard.press('Escape');
  await page.locator('.creator-assistant').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(evidence,'assistant.png'),fullPage:false});
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,selects:[...document.querySelectorAll('#assistant-form select')].map(e=>e.getBoundingClientRect().height),button:document.querySelector('#assistant-run').getBoundingClientRect().height}));
  assert.ok(layout.scroll<=layout.width+1,JSON.stringify(layout));if(viewport.width<=768)assert.ok(Math.min(layout.button,...layout.selects)>=44);
  assert.deepEqual(errors,[]);console.log(`UI evidence: ${evidence}`);
  await page.keyboard.press('Escape');
  await page.locator('#creator-tab-xhs').click();
  if(viewport.width<=1023)await page.locator('[data-action="openMobileSidebar"]').click();
  await page.locator('a[data-page="skills"]').click();
  await page.locator('#creator-capability-grid [data-capability="db-resonate"]').waitFor();
  assert.equal(await page.locator('#creator-capability-grid .capability-card').count(),16);
  assert.match(await page.locator('#creator-capability-grid').innerText(),/方法已适配/);
  await page.locator('#creator-capability-grid [data-capability="db-resonate"]').click();
  await page.locator('#editor').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#assistant-kind')?.value==='resonate');
  assert.equal(await page.locator('#assistant-target').inputValue(),'xhs');
  assert.deepEqual(errors,[]);
 });
}
