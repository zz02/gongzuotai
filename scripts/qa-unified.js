// Isolated UI fixture: temporary database, synthetic account, no live AI or production data.
// Use CUA for all browser interactions; this script only exposes the existing HTTP app.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { boot, close, req, TEST_ADMIN_PASSWORD } = require('../test/_server');
const liveAI=process.argv.includes('--live-ai');

(async () => {
  const base = await boot();
  const login = await req('/api/_/login', { method: 'POST', body: { username: 'admin', password: TEST_ADMIN_PASSWORD } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const call = (url, method='GET', body) => req('/api/_/'+url, { method, body, headers: { Cookie: cookie } });
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'creator-fusion-qa-'));
  fs.mkdirSync(path.join(vault, '.obsidian'));
  fs.mkdirSync(path.join(vault, '素材'));
  fs.writeFileSync(path.join(vault, '素材/AI实测学习卡.md'), '## 实测要求\n记录工具版本、成本与失败案例。未测过的结果标明待验证。');
  await call('workbench/obsidian', 'PUT', { path: vault, scopes: ['素材'], output: '归档' });
  let p = (await call('workbench/projects', 'POST', { title: '融合验收 · AI 实测', brief: '隔离演示素材，不是实际发布稿。' })).json.data;
  await call(`workbench/projects/${p.id}`, 'PUT', { version: p.version, wechat: '## 先确认问题\n\nAI 实测要记录版本、成本与失败案例。\n\n## 结语\n\n演示稿没有测试结果，不可直接发布。', xhs: '## 先验证再分享\n记录问题、步骤和真实结果。\n---\n## 保留失败案例\n说明版本、成本与限制。', video: '开头：展示真实结果（待录）。\n步骤：关键操作（待录）。\n结尾：说明适合谁。' });
  await call('inspirations', 'POST', { title: '灵感转稿验收 · 用 AI 做需求评审', summary: '验证能否找出需求边界，结果待测。', angle: '产品实测', targetPlatform: '多平台', sourceKeywords: ['AI', '需求评审'], generationType: 'manual' });
  const proxy = http.createServer((incoming, outgoing) => {
    const url = new URL(incoming.url, 'http://127.0.0.1');
    if ((/restart|cron.*run/.test(url.pathname)||(!liveAI&&/generate/.test(url.pathname))) && incoming.method !== 'GET') {
      outgoing.writeHead(403, {'Content-Type':'application/json'});
      return outgoing.end(JSON.stringify({ok:false,error:'隔离验收不调用真实 AI 或重启服务。'}));
    }
    const headers = { ...incoming.headers, host: new URL(base).host, cookie };
    const upstream = http.request(base + incoming.url, { method: incoming.method, headers }, response => {
      const responseHeaders = { ...response.headers }; delete responseHeaders['set-cookie'];
      outgoing.writeHead(response.statusCode, responseHeaders); response.pipe(outgoing);
    });
    upstream.on('error',()=>{outgoing.writeHead(502);outgoing.end('隔离验收服务已停止。');});
    incoming.pipe(upstream);
  });
  await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  console.log(JSON.stringify({url:`http://127.0.0.1:${proxy.address().port}/index.html#workbench`, isolated:true}));
  process.on('SIGTERM',async()=>{proxy.closeAllConnections?.();await new Promise(resolve=>proxy.close(resolve));await close();process.exit(0);});
})().catch(e=>{console.error(e.message);process.exit(1);});
