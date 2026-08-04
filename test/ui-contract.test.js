const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

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
