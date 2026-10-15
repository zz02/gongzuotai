/* Complete source → knowledge → draft → human revision → next draft scenario. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const server=require('./serve.cjs');
const KEY='diandeng.prototype.unified.v2';
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
  const act=async(a,id,root=page)=>root.locator(`[data-action="${a}"]${id?`[data-id="${id}"]`:''}`).first().click();
  const nav=async v=>{await page.evaluate(v=>location.hash=v,v);await page.waitForFunction(v=>document.querySelector('#screen').dataset.view===v,v);};
  const form=id=>page.locator('#'+id);
  const fill=async(id,name,value)=>form(id).locator(`[name="${name}"]`).fill(value);
  const submit=async id=>form(id).locator('button[type=submit]').click();
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const shot=async name=>{if(process.env.PROTOTYPE_SCREENSHOTS==='1')await page.screenshot({path:path.join(__dirname,`../../assets/learning-${name}-2026-10-15.png`)});};
  const run=async(selected=true)=>{await act('method-picker',undefined,page.locator('#screen'));await act('use-skill','khazix-writer');if(!selected&&await form('run-form').locator('[name=style-rule]').count())await form('run-form').locator('[name=style-rule]').first().uncheck();await submit('run-form');await page.waitForFunction(()=>document.querySelector('.task-strip')?.textContent.includes('模拟结果待确认'));};
  try{
    await page.goto(base+'/#sources');await act('source','AIHOT');await act('learn-collect','aihot-1');
    assert.equal(await form('learn-collect-form').locator('[name=reason]').inputValue(),'');
    await submit('learn-collect-form');assert.match(await page.locator('#learn-error').textContent(),/收藏理由/);
    await fill('learn-collect-form','reason','用来设计会议纪要的实测，后续核对原文。');
    await fill('learn-collect-form','url','javascript:alert(1)');await submit('learn-collect-form');assert.match(await page.locator('#learn-error').textContent(),/http/);
    await fill('learn-collect-form','url','https://example.com/ai-demo');
    await form('learn-collect-form').locator('[name=fail]').check();await submit('learn-collect-form');assert.match(await page.locator('#learn-error').textContent(),/失败/);
    await shot('collect');
    await form('learn-collect-form').locator('[name=fail]').uncheck();await submit('learn-collect-form');
    let s=await state();assert.equal(s.knowledge.length,1);const note=s.knowledge[0];assert.match(note.text,/未核验/);assert.match(note.text,/后续核对原文/);
    await page.keyboard.press('Escape');await act('learn-collect','aihot-1');assert.match(await page.locator('#modal-body').textContent(),/不会重复/);await page.keyboard.press('Escape');
    await act('source','乔木 RSS');await act('learn-collect','qiaomu-1');await fill('learn-collect-form','reason','补充海外资料');await fill('learn-collect-form','url','https://example.com/ai-demo');await submit('learn-collect-form');assert.match(await page.locator('#learn-error').textContent(),/已收藏/);
    await fill('learn-collect-form','url','');await submit('learn-collect-form');await page.keyboard.press('Escape');
    await act('source','RedFox');await act('rf-collect-ob');await fill('learn-collect-form','reason','了解读者关心什么，不直接照搬。');await submit('learn-collect-form');await page.keyboard.press('Escape');
    assert.equal((await state()).knowledge.length,3);
    console.log('PASS 三个信源收藏 OB、空值/链接校验、失败重试、同源与同链接去重');

    await nav('knowledge');await page.locator('[name=knowledge-filter]').selectOption('OB 收藏');await page.locator(`[name=reference][value="${note.id}"]`).check();await act('reference-selected');await submit('handoff-form');
    await fill('create-form','title','AI 会议纪要：别把待确认写成已完成');
    await form('create-form').locator('summary').click();await fill('create-form','reader','第一次使用 AI 写纪要的职场新人');await fill('create-form','angle','对照原始记录，找出未确认的负责人');await fill('create-form','evidence','真实会议脱敏样本、两组结果截图');await submit('create-form');await page.waitForSelector('#editor-form');
    const first=(await state()).current;assert.match((await state()).items[0].angle,/负责人/);
    await page.locator('#screen details').first().locator('summary').click();await act('add-reference');await page.locator('#reference-form [value=ob-meeting]').check();await submit('reference-form');
    assert.equal((await state()).items[0].refs.length,2);
    await run();await act('adopt-result');let original=await form('editor-form').locator('[name=body]').inputValue();assert.match(original,/未确认的负责人/);assert.match(original,/真实会议脱敏样本/);
    await fill('editor-form','body','我最怕的不是纪要没写完，而是替别人认领了任务。\n'+original);
    await act('learn-review');assert.match(await page.locator('#modal-body').textContent(),/修改前/);assert.match(await page.locator('#modal-body').textContent(),/修改后/);
    await fill('learn-review-form','reason','开头从具体困扰说起，不讲抽象收益。');await form('learn-review-form').locator('[name=kind]').selectOption('fact');await form('learn-review-form').locator('[name=enable]').check();await submit('learn-review-form');assert.match(await page.locator('#learn-error').textContent(),/不自动变成文风/);
    await form('learn-review-form').locator('[name=kind]').selectOption('expression');await form('learn-review-form').locator('[name=scope]').selectOption('wechat');await fill('learn-review-form','rule','先说一个具体困扰，不用“赋能”等抽象词。');
    await form('learn-review-form').locator('[name=fail]').check();await submit('learn-review-form');assert.match(await page.locator('#learn-error').textContent(),/失败/);assert.equal((await state()).styleRules.length,0);
    await form('learn-review-form').locator('[name=fail]').uncheck();await page.locator('#modal-body').evaluate(e=>e.scrollTop=0);await shot('revision');await submit('learn-review-form');
    s=await state();assert.equal(s.editReviews.length,1);assert.equal(s.styleRules.length,1);assert.equal(s.styleRules[0].enabled,true);const rule=s.styleRules[0];
    assert.equal(s.knowledge.find(n=>n.id===note.id).text,note.text);const firstBody=s.items.find(w=>w.id===first).drafts.wechat.body;
    await nav('style');await shot('preferences');
    console.log('PASS 来源与经验分离、角度进入候选、手改前后对照、事实不泛化、确认表达才启用');

    await nav('content');await act('new-content');await fill('create-form','title','第二篇：用 AI 整理周报');await submit('create-form');await page.waitForSelector('#editor-form');const second=(await state()).current;
    await act('method-picker',undefined,page.locator('#screen'));await act('use-skill','khazix-writer');assert.equal(await form('run-form').locator('[name=style-rule]').count(),1);assert.match(await form('run-form').textContent(),/AI 会议纪要/);await shot('context');
    await form('run-form').locator('[name=style-rule]').uncheck();await submit('run-form');await page.waitForTimeout(850);s=await state();assert.equal(s.items[0].drafts.wechat.results[0].styleRules.length,0);await act('discard-result');
    await run();s=await state();assert.equal(s.items[0].drafts.wechat.results[0].styleRules[0].id,rule.id);await act('adopt-result');
    assert.match(await page.locator('#screen').textContent(),/本次模拟生成采用/);
    await fill('editor-form','body','第二次手改，不授权使用。\n'+await form('editor-form').locator('[name=body]').inputValue());await act('learn-review');await form('learn-review-form').locator('[name=kind]').selectOption('expression');await fill('learn-review-form','reason','只想记下来，暂时不复用');await fill('learn-review-form','rule','结尾提出一个待验证问题');await submit('learn-review-form');
    assert.equal((await state()).styleRules[1].enabled,false);
    await act('add-platform');await page.locator('#platform-form [name=platform]').selectOption('xhs');await submit('platform-form');await act('method-picker',undefined,page.locator('#screen'));await act('use-skill','baoyu-xhs-images');assert.equal(await form('run-form').locator('[name=style-rule]').count(),0);await page.keyboard.press('Escape');
    await nav('style');await act('learn-toggle',rule.id);assert.equal((await state()).styleRules[0].enabled,false);
    await nav('editor');await act('platform','wechat');await act('method-picker',undefined,page.locator('#screen'));await act('use-skill','khazix-writer');assert.equal(await form('run-form').locator('[name=style-rule]').count(),0);await page.keyboard.press('Escape');
    s=await state();assert.equal(s.items.find(w=>w.id===first).drafts.wechat.body,firstBody);assert.equal(s.items.find(w=>w.id===second).drafts.wechat.lastStyleUse[0].id,rule.id);
    await page.reload();await page.waitForSelector('#editor-form');assert.equal((await state()).editReviews.length,2);
    console.log('PASS 下一篇查看来源与单次不用、选择后留痕、平台隔离、未确认不参与、停用不改历史');

    // The same first article proceeds through illustration, delivery, publishing and archive.
    await nav('content');await act('open-content',first);await fill('editor-form','caption','把未确认的事实留给本人核对。');await act('editor-tab','配图');await act('add-page');await act('make-page');await act('editor-tab','成品');await page.locator('#manual-check').check();await act('confirm-delivery');
    const download=page.waitForEvent('download');await act('download-preview');assert.equal((await download).suggestedFilename(),'点灯-模拟预览.html');
    await act('editor-tab','发布记录');await act('publication');await fill('publication-form','url','https://example.com/complete-learning');await submit('publication-form');await act('archive');await submit('archive-form');assert.ok((await state()).items.find(w=>w.id===first).drafts.wechat.archive);
    const archiveNote=(await state()).knowledge.find(n=>n.group==='成品归档');assert.ok(archiveNote);assert.match(archiveNote.text,/complete-learning/);await nav('knowledge');await page.locator('[name=knowledge-filter]').selectOption('成品归档');assert.match(await page.locator('#screen').textContent(),/AI 会议纪要/);
    console.log('PASS 同一来源稿继续配图、确认成品、导出预览、登记发布与归档回查');

    for(const size of [{width:1440,height:1000},{width:768,height:900},{width:375,height:812}]){
      await page.setViewportSize(size);await nav('style');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'style overflow');
      await act('learn-review-detail',(await state()).editReviews[0].id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'comparison overflow');await shot('review-'+size.width);await page.keyboard.press('Escape');
      await nav('sources');await act('source','AIHOT');await act('learn-collect','aihot-1');await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('PASS 三尺寸新页面与对照弹窗、刷新恢复、无页面异常、不请求外部服务');
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
