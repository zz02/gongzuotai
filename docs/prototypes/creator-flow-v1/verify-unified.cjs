/* Browser acceptance of isolated interactions; no production or model calls. */
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
  const nav=async v=>{await page.evaluate(v=>location.hash=v,v);await page.waitForFunction(v=>document.querySelector('#screen').dataset.view===v,v);};
  const act=async(a,id,root=page)=>root.locator(`[data-action="${a}"]${id===undefined?'':`[data-id="${id}"]`}`).first().click();
  const submit=async id=>page.locator(`#${id} button[type=submit]`).click();
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const modal=()=>page.locator('#flow-modal');
  const platform=async p=>{await act('add-platform');await modal().locator('[name=platform]').selectOption(p);await submit('platform-form');};
  const fill=async(name,value)=>page.locator(`#editor-form [name=${name}]`).fill(value);
  const use=async id=>{await act('use-skill',id);if(await page.locator('#skill-target-form').isVisible())await submit('skill-target-form');await page.waitForSelector('#run-form');};
  try{
    await page.goto(base);await page.waitForSelector('[data-view=content]');
    assert.equal(await page.locator('.pui-sidebar .pui-nav a').count(),6);
    await nav('skills');assert.equal(await page.locator('[data-skill]').count(),29);
    await page.locator('[name=skill-status]').selectOption('已登记');assert.equal(await page.locator('[data-skill]').count(),16);
    await page.locator('[name=skill-status]').selectOption('待接入');assert.equal(await page.locator('[data-skill]').count(),13);
    await act('skill-detail','huashu-nuwa');assert.match(await modal().textContent(),/待适配/);assert.equal(await modal().locator('[data-action=use-skill]').count(),0);await page.keyboard.press('Escape');
    await page.locator('[name=skill-status]').selectOption('全部');await page.locator('[name=skill-query]').fill('dontbesilent');assert.equal(await page.locator('[data-skill]').count(),8);
    await page.locator('[name=skill-query]').fill('');await act('favorite','db-hook');await page.locator('[name=skill-status]').selectOption('常用');assert.equal(await page.locator('[data-skill]').count(),1);
    console.log('PASS 29 项能力、16 / 13 状态区分、作者搜索、常用与待接入边界');
    await nav('content');await act('new-content');await submit('create-form');assert.match(await page.locator('#form-error').textContent(),/标题/);
    await modal().locator('[name=title]').fill('AI 会议纪要如何核对');await submit('create-form');await page.waitForSelector('#editor-form');
    let s=await state();assert.equal(s.items.length,1);const original=s.current;
    await fill('body','赋能会议纪要。\n先核对负责人和截止日期。');await fill('caption','具体操作仍需实测。');
    await page.locator('#screen .context-block summary').first().click();await act('add-reference');await modal().locator('[value=ob-meeting]').check();await modal().locator('[value=ob-test]').check();await submit('reference-form');
    assert.equal((await state()).items[0].refs.length,2);
    await nav('knowledge');await page.locator('#screen [value=ob-meeting]').check();await act('reference-selected');await modal().locator('[name=target]').selectOption(original);await submit('handoff-form');
    assert.equal((await state()).items.length,1);assert.equal((await state()).items[0].refs.length,2);
    await platform('xhs');await fill('body','小红书独立版本');await act('platform','wechat');assert.match(await page.locator('[name=body]').inputValue(),/负责人/);
    console.log('PASS 一句话直达正文、多份 OB 引用、重复引用去重、平台正文独立');
    await use('db-hook');await submit('run-form');await page.locator('[name=body]').fill('本人手改的新正文，不得覆盖。');await page.waitForTimeout(850);
    assert.equal(await page.locator('[data-action=adopt-result]').first().isDisabled(),true);assert.match(await page.locator('#editor-form [name=body]').inputValue(),/本人手改/);
    await act('discard-result');await use('db-hook');await modal().locator('[name=fail]').check();await submit('run-form');await page.waitForTimeout(850);assert.match(await page.locator('.task-strip').textContent(),/失败/);
    await act('retry-task');await submit('run-form');await page.waitForTimeout(850);await act('adopt-result');assert.match(await page.locator('[name=title]').inputValue(),/先核对/);
    await page.reload();await page.waitForSelector('#editor-form');assert.match(await page.locator('[name=body]').inputValue(),/本人手改/);
    console.log('PASS 生成期间手改保护、失败重试、候选采用和刷新恢复');
    await act('editor-tab','配图');await act('add-page');await act('add-page');let pages=(await state()).items[0].drafts.wechat.pages;
    await act('make-page',pages[0].id);await act('fail-page',pages[1].id);s=await state();assert.equal(s.items[0].drafts.wechat.pages[0].status,'ready');assert.equal(s.items[0].drafts.wechat.pages[1].status,'failed');await act('make-page',pages[1].id);
    await act('editor-tab','成品');await page.locator('#manual-check').check();await act('confirm-delivery');
    const downloadEvent=page.waitForEvent('download');await act('download-preview');assert.equal((await downloadEvent).suggestedFilename(),'点灯-模拟预览.html');
    await act('editor-tab','发布记录');await act('publication');await modal().locator('[name=url]').fill('https://example.com/demo-article');
    await modal().locator('[data-pui-picker-trigger]').click();await modal().locator('[data-pui-date-option]').first().click();await modal().locator('[data-pui-picker-confirm]').click();await submit('publication-form');
    await act('feedback');await modal().locator('[name=reads]').fill('0');await modal().locator('[name=note]').fill('想看负责人缺失时怎样处理');await submit('feedback-form');s=await state();assert.equal(s.items[0].drafts.wechat.feedback[0].reads,0);assert.equal(s.items[0].drafts.wechat.feedback[0].follows,null);
    await act('archive');await modal().locator('[name=fail]').check();await submit('archive-form');assert.match(await page.locator('#form-error').textContent(),/失败/);await modal().locator('[name=fail]').uncheck();await submit('archive-form');
    await act('editor-tab','正文');await fill('body','发布后的修改');await act('editor-tab','发布记录');await act('snapshot');assert.match(await modal().textContent(),/本人手改/);assert.doesNotMatch(await modal().textContent(),/发布后的修改/);await page.keyboard.press('Escape');
    console.log('PASS 逐页失败恢复、演示导出、日期选择、发布快照、空值与零、归档失败恢复');
    await nav('sources');await act('source','AIHOT');await act('feed-use','aihot-1');await page.keyboard.press('Escape');assert.equal((await state()).items.length,1);
    await act('feed-use','aihot-1');await submit('handoff-form');await submit('create-form');await page.waitForSelector('#editor-form');assert.equal((await state()).items.length,2);
    await nav('knowledge');await act('note-import','ob-article');await submit('create-form');await page.waitForSelector('#editor-form');assert.match(await page.locator('#editor-form [name=body]').inputValue(),/先整理事实/);
    await nav('sources');await act('source','RedFox');await page.locator('[data-action=rf-topic]').first().click();await modal().locator('[name=target]').selectOption(original);await submit('handoff-form');assert.equal((await state()).items.find(w=>w.id===original).refs.length,3);
    console.log('PASS 外部材料转稿、取消无副作用、OB 原文导入、RedFox 新旧衔接');
    // Exercise every registered action, not only catalogue presence.
    const registered=await page.evaluate(()=>window.CreatorSkills.filter(s=>s.registered));
    for(const skill of registered){
      await nav('skills');await page.locator('[name=skill-status]').selectOption('全部');await page.locator('[name=skill-query]').fill(skill.name);await act('use-skill',skill.id);
      await modal().locator('[name=target]').selectOption(original);await submit('skill-target-form');
      if(skill.type==='archive'){await page.waitForSelector('#archive-form');await page.keyboard.press('Escape');}
      else if(skill.type==='layout'){await page.waitForFunction(()=>document.querySelector('#screen')?.textContent.includes('检查与导出'));}
      else if(skill.type==='image'){await page.waitForSelector('#image-task-form');await submit('image-task-form');assert.ok((await state()).items.find(w=>w.id===original).drafts[(await state()).platform].pages.length);}
      else {await page.waitForSelector('#run-form');await submit('run-form');await page.waitForTimeout(850);assert.ok(await page.locator('.unified-result').count(),skill.name);await act('adopt-result');}
    }
    await nav('skills');await page.locator('[name=skill-query]').fill('');console.log('PASS 16 项登记能力逐项走到候选、配图、排版或归档结果');
    for(const size of [{width:1440,height:1000},{width:768,height:900},{width:375,height:812}]){
      await page.setViewportSize(size);
      for(const v of ['content','sources','knowledge','skills','editor','appearance','rf-search','rf-tracker','rf-settings']){
        await nav(v);await page.waitForTimeout(50);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${size.width}: ${v} overflow`);
      }
      await nav('skills');await page.locator('[name=skill-status]').selectOption('全部');await act('skill-detail','db-hook');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'modal overflow');
      if(process.env.PROTOTYPE_SCREENSHOTS==='1'&&size.width===1440)await page.screenshot({path:path.join(__dirname,'../../assets/unified-skill-detail-2026-10-13.png')});
      await page.keyboard.press('Escape');
      if(size.width===375){await page.locator('.navigation-toggle').click();await page.locator('#drawer-navigation a[href="#knowledge"]').click();await page.waitForSelector('[data-view=knowledge]');assert.equal(await page.locator('#navigation-drawer').getAttribute('aria-hidden'),'true');}
      if(process.env.PROTOTYPE_SCREENSHOTS==='1'){await nav('skills');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(__dirname,`../../assets/unified-skills-${size.width}-2026-10-13.png`),fullPage:false});}
    }
    await page.setViewportSize({width:1440,height:1000});await nav('editor');await act('editor-tab','正文');
    if(process.env.PROTOTYPE_SCREENSHOTS==='1'){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'../../assets/unified-editor-2026-10-13.png'),fullPage:false});}
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS 1440 / 768 / 375 无页面溢出、弹层关闭、手机导航、无脚本错误与外部请求');
    const before=await state();await page.evaluate(k=>localStorage.setItem(k,'{broken'),KEY);await page.reload();await page.waitForSelector('#storage-error:not([hidden])');assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),'{broken');await act('new-content');await modal().locator('[name=title]').fill('恢复后的内容');await submit('create-form');assert.equal(await page.evaluate(k=>Object.keys(localStorage).filter(x=>x.startsWith(k+'.backup-')).length,KEY),1);
    await page.evaluate(({k,v})=>localStorage.setItem(k,JSON.stringify(v)),{k:KEY,v:before});await page.reload();console.log('PASS 损坏存档保留与保存前备份');
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
