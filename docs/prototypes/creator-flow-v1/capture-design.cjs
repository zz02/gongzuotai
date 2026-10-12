/* Render an isolated review example through real UI actions, never production APIs. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const server=require('./serve.cjs');
const out=path.resolve(__dirname,'../../assets');
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const baseline=process.env.PROTOTYPE_BASELINE_URL;
  if(baseline&&new URL(baseline).hostname!=='127.0.0.1')throw Error('Baseline capture must use a loopback prototype.');
  const url=baseline||'http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const act=a=>page.locator(`[data-action="${a}"]`).first().click();
  const nav=async v=>{await page.evaluate(v=>location.hash=v,v);await page.waitForFunction(v=>document.querySelector('#location-name').textContent===({sources:'信源',topics:'选题库',works:'我的作品',write:'生成稿件',images:'图片排版',deliver:'发布成品',skills:'Skill 中心',appearance:'外观设置'})[v],v);await page.evaluate(()=>scrollTo(0,0));};
  const capture=async(name,width=1440)=>{
    await page.setViewportSize({width,height:width===375?812:width===768?900:1000});
    await page.waitForFunction(()=>!document.querySelector('.pui-toast.is-open'));
    await page.screenshot({path:path.join(out,`creator-studio-${baseline?'before':'review'}-${name}-${width}-2026-10-12.png`),fullPage:true});
  };
  try{
    await page.goto(url);await page.waitForSelector('.source-row');await capture('sources');
    await act('source-topic');await page.getByRole('button',{name:'保存选题',exact:true}).click();await page.waitForURL(/#topics/);await capture('topics');
    await act('start-work');await page.getByRole('button',{name:'建立作品',exact:true}).click();await page.waitForURL(/#write/);
    await act('generate');await page.getByRole('button',{name:'开始模拟',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#live-body').textContent.includes('原型示例'));
    await page.waitForFunction(()=>document.querySelector('.platform-tabs').textContent.includes('待确认'));
    await page.waitForFunction(()=>document.querySelector('#save-state').textContent.includes('已保存'));
    // Wait for both platform tasks in this suite's own simulated record only.
    await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('diandeng.prototype.creator-flow.v1'));return s.works[0].drafts.xhs.task==='done';});
    await capture('write');await capture('write',768);await capture('write',375);
    if(!baseline){await page.locator('[data-writer-view=preview]').click();await capture('read',375);}
    await page.setViewportSize({width:1440,height:1000});await nav('works');await capture('works');await nav('write');
    await act('confirm-text');await page.waitForURL(/#images/);await act('make-template');await capture('cover');
    await nav('write');await page.locator('[data-platform=xhs]').click();await act('confirm-text');await page.waitForURL(/#images/);
    await page.waitForSelector('.page-list [data-action=page]');
    const count=await page.locator('[data-action=page]').count();
    assert.equal(count,4,'the simulated XHS example must contain four pages');
    for(let i=0;i<count;i++){await page.locator(`[data-page="${i}"]`).click();await act('make-template');await page.waitForFunction(i=>document.querySelector(`[data-page="${i}"]`).textContent.includes('已确认模板'),i);}
    await page.locator('[data-page="0"]').click();
    assert.equal(await page.locator('.page-description em').allTextContents().then(items=>items.filter(x=>x==='已确认模板').length),count,'all pages must retain their confirmed state');
    await capture('images');await capture('images',375);
    assert.equal(await page.locator('.page-description em').allTextContents().then(items=>items.filter(x=>x==='已确认模板').length),count,'viewport changes must not invalidate images');
    await page.setViewportSize({width:1440,height:1000});await nav('deliver');await page.locator('#manual-check').check();await act('check-delivery');
    assert.equal(await page.locator('[data-action=download-product]').isEnabled(),true,'delivery must actually be ready before capture');
    await capture('deliver');
    await nav('skills');await capture('skills');await nav('appearance');await capture('appearance');
    assert.deepEqual(errors,[]);console.log('PASS visual review captures: source, topic, work, manuscript, reading, cover, image, delivery, skill and appearance');
    const offline=await browser.newPage();await offline.goto('file://'+path.join(__dirname,'index.html'));await offline.waitForSelector('.source-row');assert.equal(await offline.locator('.source-row').count(),3);await offline.close();
    console.log('PASS offline file entry: 3 sources');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
