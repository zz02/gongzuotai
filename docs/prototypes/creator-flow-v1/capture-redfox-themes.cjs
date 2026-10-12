/* Capture viewport evidence without fixed-sidebar full-page stitching. */
const {chromium}=require('playwright'),path=require('node:path');
const server=require('./serve.cjs');
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(url+'/#appearance');await page.waitForSelector('[name=studio-theme]');
  for(const theme of ['forest','blue','cream','pink','night']){await page.locator(`[name=studio-theme][value=${theme}]`).check();await page.locator('[data-action=save-appearance]').click();await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.pui-sidebar').scrollTop=0;});await page.waitForTimeout(1700);await page.screenshot({path:path.resolve(__dirname,`../../assets/redfox-theme-${theme}-2026-10-12.png`),fullPage:false});
   console.log(theme,await page.locator('.pui-btn-primary').evaluate(el=>{const c=getComputedStyle(el);return{bg:c.backgroundColor,text:c.color,accent:getComputedStyle(document.documentElement).getPropertyValue('--studio-accent')};}));}
  await page.evaluate(()=>location.hash='original');await page.waitForSelector('.rf-work-row');
  for(const width of [1440,768,375]){await page.setViewportSize({width,height:width===375?812:1000});await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.pui-sidebar').scrollTop=0;});await page.screenshot({path:path.resolve(__dirname,`../../assets/redfox-hotlist-${width}-2026-10-12.png`),fullPage:false});}
  await page.evaluate(()=>location.hash='rf-settings');await page.waitForSelector('[data-action=rf-budget]');await page.locator('[data-action=rf-budget]').click();await page.screenshot({path:path.resolve(__dirname,'../../assets/redfox-night-modal-mobile-2026-10-12.png'),fullPage:false});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
