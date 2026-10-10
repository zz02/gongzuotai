const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('能力来源统一归入 Skill 中心，创作页不保留重复弹窗', () => {
  const html = read('index.html');
  const workbench = read('js/workbench.js');
  const skills = read('js/pages/agent.js');
  assert.doesNotMatch(html, /data-action="sources"/);
  assert.doesNotMatch(workbench, /function sources\(|action==='sources'/);
  assert.match(html, /能力用途、作者、来源仓库、版本与许可统一在此查看/);
  assert.match(skills, /c\.sourceRepo/);
  assert.match(skills, /data-capability=/);
  assert.match(skills, /gotoPage\('workbench',\{workbench:\{capability:b\.dataset\.capability\}\}\)/);
  assert.match(skills, /grid\.onclick=/);
});

test('Skill 来源卡片处理空、缺失和检测失败，刷新不重复绑定操作', async () => {
  const vm = require('node:vm');
  const skills = read('js/pages/agent.js');
  const source = skills.slice(skills.indexOf('async function renderCreatorCapabilities(){'), skills.indexOf('function bindHubSearchInput()'));
  const grid = {isConnected:true,innerHTML:'',textContent:'',onclick:null};
  const runtime = {textContent:''};
  let items = [], failSources = false, navigation = [];
  const render = vm.runInNewContext(source+';renderCreatorCapabilities', {
    document:{getElementById:id=>id==='creator-capability-grid'?grid:runtime},
    localApi:async endpoint=>{if(endpoint.endsWith('runtime'))throw new Error('检测失败');if(failSources)throw new Error('读取失败');return items;},
    esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    gotoPage:(page,options)=>navigation.push({page,options})
  });
  await render();
  assert.match(grid.innerHTML,/暂无创作能力/);
  assert.match(runtime.textContent,/运行环境检测失败/);
  items=[{id:'review',name:'检查',description:'<script>不是 HTML</script>',author:'作者',mode:'方法适配',available:false,url:''}];
  await render();
  assert.match(grid.innerHTML,/源码缺失/);
  assert.match(grid.innerHTML,/来源未确认/);
  assert.match(grid.innerHTML,/许可未确认/);
  assert.match(grid.innerHTML,/版本未确认/);
  assert.match(grid.innerHTML,/disabled/);
  assert.doesNotMatch(grid.innerHTML,/<script>|href=/);
  grid.onclick({target:{closest:()=>({disabled:true,dataset:{capability:'review'}})}});
  assert.equal(navigation.length,0);
  items[0].available=true;
  await render();await render();
  grid.onclick({target:{closest:()=>({disabled:false,dataset:{capability:'review'}})}});
  assert.equal(navigation.length,1);
  assert.equal(navigation[0].options.workbench.capability,'review');
  failSources=true;
  await render();
  assert.match(grid.textContent,/请点击顶部刷新重试/);
  assert.match(runtime.textContent,/尚未加载/);
});

test('AI 创作页默认关闭外部能力，读取配置后再按依赖启用', () => {
  const html = read('index.html');
  const creator = read('js/pages/creator.js');
  for (const id of ['checkWordBtn', 'generateCoverBtn', 'doRewriteBtn', 'hotspotAnalyzeBtn']) {
    assert.match(html, new RegExp(`<button[^>]+id=["']${id}["'][^>]+disabled`), `${id} 应默认禁用`);
  }
  assert.match(html, /id=["']creator-capability-status["']/);
  assert.match(creator, /localApi\(['"]status['"]/);
  assert.match(creator, /creatorCapabilities\.llmConfigured/);
  assert.match(creator, /creatorCapabilities\.redfoxConfigured/);
  assert.match(creator, /手工编辑、复制、导出和本地内容流程仍可使用/);
});

test('顶部刷新覆盖所有可导航业务页，详情页复用最近一次请求', () => {
  const navigation = read('js/navigation.js');
  const router = read('js/router.js');
  const detail = read('js/pages/detail.js');
  const pageNames = [...navigation.matchAll(/^\s{2}([a-z][a-z0-9]*):\s+\{/gm)]
    .map(match => match[1])
    .filter(page => !['my'].includes(page));
  for (const page of pageNames) {
    const pagePattern = ['library', 'knowledgebase'].includes(page)
      ? /currentPage === ['"]library['"] \|\| currentPage === ['"]knowledgebase['"]/
      : new RegExp(`currentPage === ['"]${page}['"]`);
    assert.match(router, pagePattern, `刷新遗漏页面：${page}`);
  }
  assert.match(router, /currentPage === ['"]creator['"].+renderCreator\(\)/);
  assert.match(router, /currentPage === ['"]detail['"].+refreshDetail\(\)/);
  assert.match(detail, /currentDetailRequest = \{ plat, workId \}/);
  assert.match(detail, /navigate: false/);
  assert.doesNotMatch(router, /toast\(['"]已刷新['"], ['"]success['"]\);\s*\n\}/);
});
