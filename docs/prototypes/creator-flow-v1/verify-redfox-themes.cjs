/* Additive regression suite. Historical prototype tests remain unchanged. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const server=require('./serve.cjs'),key='diandeng.prototype.creator-flow.v1',rfKey='diandeng.prototype.redfox.v1';
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(url)&&!r.url().startsWith('data:'))external.push(r.url());});
  const act=async(a,id)=>page.locator(`[data-action="${a}"]${id===undefined?'':`[data-rf-id="${id}"]`}`).first().click();
  const nav=async route=>{await page.evaluate(r=>location.hash=r,route);await page.waitForFunction(r=>document.querySelector('#screen').dataset.view===r,route);};
  const stored=async k=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),k);
  const run=async()=>{await act('rf-run-task');await page.waitForTimeout(450);};
  const pass=label=>console.log('PASS '+label);
  try {
    await page.goto(url+'/#original');await page.waitForSelector('.rf-work-row');
    assert.equal(await page.locator('.rf-tabs a').count(),6);assert.equal(await page.locator('.source-filter [data-action=rf-hot]').count(),6);
    await act('rf-hot','xhs');assert.match(await page.locator('.rf-toolbar').textContent(),/小红书/);
    await act('rf-auto','xhs');assert.equal((await stored(rfKey)).auto.xhs,false);
    await act('rf-remove-tab','xhs');assert.match(await page.locator('#modal-body').textContent(),/自动选题/);await page.keyboard.press('Escape');assert.equal((await stored(rfKey)).removed.length,0);
    await act('rf-remove-tab','xhs');await act('rf-confirm-remove-tab','xhs');assert.equal((await stored(rfKey)).removed.length,1);await act('rf-restore-tabs');assert.equal((await stored(rfKey)).removed.length,0);
    await act('rf-refresh');await run();assert.equal((await stored(rfKey)).logs.length,1);await act('rf-trends');await run();assert.match(await page.locator('#modal-title').textContent(),/模拟/);await page.keyboard.press('Escape');pass('六平台榜单、刷新确认、自动采集开关、移除取消恢复、趋势分析');
    await nav('rf-search');await page.locator('#rf-search-form button[type=submit]').click();assert.match(await page.locator('#rf-search-error').textContent(),/关键词/);
    await page.locator('[name=query]').fill('AI');for(const box of await page.locator('#rf-search-form input[type=checkbox]').all())await box.uncheck();await page.locator('#rf-search-form button[type=submit]').click();assert.match(await page.locator('#rf-search-error').textContent(),/至少/);
    await page.locator('#rf-search-form input[value=xhs]').check();await page.locator('#rf-search-form button[type=submit]').click();assert.equal(await page.locator('.rf-work-row').count(),4);assert.equal((await stored(rfKey)).history.length,1);
    await page.locator('#rf-search-form button[type=submit]').click();assert.match(await page.locator('[role=status]').last().textContent(),/缓存/);await act('rf-retry-search');assert.match(await page.locator('[role=status]').last().textContent(),/查询完成/);
    await page.locator('[name=query]').fill('不存在的内容');await page.locator('#rf-search-form button[type=submit]').click();assert.equal(await page.locator('.rf-work-row').count(),0);assert.match(await page.locator('.rf-empty').textContent(),/暂无/);
    await act('rf-keyword','AI');await page.locator('#rf-search-form button[type=submit]').click();await act('rf-detail');await page.waitForFunction(()=>document.querySelector('#screen').dataset.view==='rf-detail');
    assert.match(await page.locator('.rf-metrics-large').textContent(),/评论/);await act('rf-comments');assert.match(await page.locator('#modal-body').textContent(),/没有 RedFox 评论全文/);await page.keyboard.press('Escape');await act('rf-save');await act('rf-save');assert.equal((await stored(rfKey)).saved.length,1);
    await act('rf-topic');await page.getByRole('button',{name:'保存选题',exact:true}).click();await page.waitForURL(/#topics/);assert.equal((await stored(key)).topics.length,1);await nav('rf-detail');await act('rf-topic');assert.equal((await stored(key)).topics.length,1);pass('搜索校验、平台筛选、缓存重查、空结果、详情评论边界、收藏去重、带入选题');
    await nav('rf-detail');await act('rf-track');await page.waitForURL(/#rf-tracker/);assert.equal((await stored(rfKey)).accounts.length,1);
    await act('rf-sync-account');await run();assert.equal((await stored(rfKey)).accounts[0].synced,true);await act('rf-account-works');assert.equal(await page.locator('#modal-body .rf-work-row').count(),4);await page.keyboard.press('Escape');
    await act('rf-edit-account');await page.locator('#rf-account-form [name=name]').fill('我的演示账号');await page.locator('#rf-account-form button[type=submit]').click();assert.equal((await stored(rfKey)).accounts[0].name,'我的演示账号');
    await act('rf-add-account');await page.locator('#rf-account-form [name=name]').fill('重复');await page.locator('#rf-account-form [name=account]').fill((await stored(rfKey)).accounts[0].account);await page.locator('#rf-account-form [name=platform]').selectOption((await stored(rfKey)).accounts[0].platform);await page.locator('#rf-account-form button[type=submit]').click();assert.match(await page.locator('#rf-account-error').textContent(),/已在/);await page.keyboard.press('Escape');
    await act('rf-remove-account');await page.keyboard.press('Escape');assert.equal((await stored(rfKey)).accounts.length,1);await act('rf-diagnose');await run();assert.match(await page.locator('#modal-title').textContent(),/模拟/);await page.keyboard.press('Escape');pass('账号追踪、同步作品、编辑、重复拦截、移除取消、诊断模拟');
    await nav('rf-creator');await page.locator('#rf-tool-form button[type=submit]').click();assert.match(await page.locator('#rf-tool-error').textContent(),/输入/);await page.locator('#rf-tool-form [name=content]').fill('我的实测材料，需要核对来源。');
    for(const tool of ['检测','改写','热点关联','封面']){await act('rf-tool',tool);assert.equal(await page.locator('#rf-tool-form [name=content]').inputValue(),'我的实测材料，需要核对来源。');await page.locator('#rf-tool-form button[type=submit]').click();await run();assert.match(await page.locator('.rf-copy').textContent(),/模拟/);}
    await nav('rf-settings');await act('rf-configured');await nav('rf-creator');await page.locator('#rf-tool-form button[type=submit]').click();assert.equal(await page.locator('#flow-modal.is-open').count(),0);await nav('rf-settings');await act('rf-configured');
    await act('rf-budget');await page.locator('[name=quota]').fill('0');await page.locator('#rf-budget-form button[type=submit]').click();assert.match(await page.locator('#rf-budget-error').textContent(),/整数/);await page.locator('[name=quota]').fill('30');await page.locator('#rf-budget-form button[type=submit]').click();assert.equal((await stored(rfKey)).quota,30);
    await act('rf-job','热点实时采集');assert.equal((await stored(rfKey)).jobs['热点实时采集'],false);await act('rf-logs');assert.ok(await page.locator('.rf-log').count()>5);await page.keyboard.press('Escape');pass('四类原工具、空材料拦截、未配置拦截、预算边界、任务开关、审计日志');
    await nav('appearance');assert.equal(await page.locator('[name=studio-theme]').count(),5);
    for(const theme of ['forest','blue','cream','pink','night']){
      await page.locator(`[name=studio-theme][value=${theme}]`).check();assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      await page.screenshot({path:path.resolve(__dirname,`../../assets/redfox-theme-${theme}-2026-10-12.png`),fullPage:true});
      await act('save-appearance');await nav('rf-search');assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      // Check actual foreground and surface colours, not token declarations only.
      const ratio=await page.locator('.pui-control').first().evaluate(el=>{const c=getComputedStyle(el),rgb=x=>(x.match(/[\d.]+/g)||[]).slice(0,3).map(Number),lum=x=>rgb(x).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),a=lum(c.color),b=lum(c.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});assert.ok(ratio>=4.5,theme+' input contrast '+ratio);
      await nav('appearance');
    }
    await page.reload();await page.waitForSelector('[name=studio-theme]');assert.equal(await page.locator('html').getAttribute('data-theme'),'night');
    await page.locator('[name=studio-theme][value=pink]').check();await act('cancel-appearance');assert.equal(await page.locator('html').getAttribute('data-theme'),'night');
    await page.locator('[name=studio-theme][value=blue]').check();await nav('original');assert.equal(await page.locator('html').getAttribute('data-theme'),'night');pass('五主题实际渲染、输入对比度、保存跨页刷新、取消预览、未保存离开不生效');
    for(const width of [1440,768,375]){await page.setViewportSize({width,height:width===375?812:1000});for(const theme of ['forest','blue','cream','pink','night']){await nav('appearance');await page.locator(`[name=studio-theme][value=${theme}]`).check();await act('save-appearance');for(const route of ['original','rf-search','rf-detail','rf-tracker','rf-creator','rf-library','rf-settings','appearance']){await nav(route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} ${theme} ${width} overflow`);}}
      await nav('original');await page.screenshot({path:path.resolve(__dirname,`../../assets/redfox-hotlist-${width}-2026-10-12.png`),fullPage:width!==375});
      if(width===375){await page.locator('.navigation-toggle').click();assert.equal(await page.locator('#drawer-navigation a[href="#rf-search"]').count(),1);await page.locator('#drawer-navigation a[href="#rf-search"]').click();await page.waitForFunction(()=>!document.querySelector('#navigation-drawer').classList.contains('is-open'));assert.equal(await page.locator('.pui-main').evaluate(el=>el.inert),false);}
    }
    await nav('rf-settings');await act('rf-budget');await page.screenshot({path:path.resolve(__dirname,'../../assets/redfox-night-modal-mobile-2026-10-12.png'),fullPage:false});await page.keyboard.press('Escape');
    await nav('appearance');await act('reset-appearance');await act('confirm-reset');assert.equal(await page.locator('html').getAttribute('data-theme'),'forest');assert.equal((await stored(key)).topics.length,1);assert.equal((await stored(rfKey)).saved.length,1);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);pass('120 个主题/页面/屏宽组合无横向溢出，手机左侧菜单闭环，重置不删内容，无外部请求与页面异常');
    console.log('PASS all RedFox/theme checks');
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
