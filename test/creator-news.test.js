const {test}=require('node:test');const assert=require('node:assert/strict');const Database=require('better-sqlite3');
const {make,CHANNELS,parseSource,readPublic}=require('../lib/creator-news');
test('AIHOT 与乔木保留来源，危险链接不进入资讯',async()=>{
  const a=await parseSource(CHANNELS[0],JSON.stringify({items:[{title:'测试资讯',summary:'<b>摘要</b>',links:{original:'https://example.com/1',aihot:'https://aihot.news/items/1'},publishedAt:'invalid'},{title:'危险',links:{original:'javascript:alert(1)'}}]}),1000);
  assert.equal(a.length,1);assert.equal(a[0].summary,'摘要');assert.equal(a[0].publishedAt,null);assert.equal(a[0].provider,'AIHOT');
  const q=await parseSource(CHANNELS[1],JSON.stringify({entries:[{title:'Original',titleZh:'中文标题',link:'https://example.com/2',publishedTs:2000,summary:'英文摘要'}]}));assert.equal(q[0].title,'中文标题');assert.equal(q[0].publishedAt,2000);
  await assert.rejects(parseSource(CHANNELS[0],'{}'),/格式已变化/);
});
test('RSS、Atom 解析，拒绝外部实体',async()=>{
  const r=await parseSource(CHANNELS.at(-1),'<rss version="2.0"><channel><title>Feed</title><item><title>工具 &amp; 边界</title><link>https://example.com/3</link><description>摘要</description></item></channel></rss>');assert.equal(r[0].title,'工具 & 边界');
  await assert.rejects(parseSource(CHANNELS.at(-1),'<!DOCTYPE rss [<!ENTITY a SYSTEM "file:///etc/passwd">]><rss/>'),/外部实体/);
});
test('固定信源防内网跳转、限流与过大响应',async()=>{
  let calls=0;
  await assert.rejects(readPublic('http://127.0.0.1',async()=>{calls++;}),/允许范围/);assert.equal(calls,0);
  await assert.rejects(readPublic(CHANNELS[0].url,async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}})),/允许范围/);
  await assert.rejects(readPublic(CHANNELS[0].url,async()=>new Response(null,{status:429})),/限流/);
  await assert.rejects(readPublic(CHANNELS[0].url,async()=>new Response('x',{headers:{'content-length':'2000001'}})),/2 MB/);
});
test('无密钥刷新、并发复用、失败显示缓存、分钟限流',async t=>{
  const db=new Database(':memory:');t.after(()=>db.close());let time=100000,calls=0,broken=false;
  const w=make({db,channels:CHANNELS.slice(0,1),now:()=>time,fetcher:async()=>{calls++;if(broken)throw new Error('网络失败');return new Response(JSON.stringify({items:[{title:'真实条目',links:{original:'https://example.com/4'}}]}));}});
  const [a,b]=await Promise.all([w.refresh(),w.refresh()]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.sources[0].status,'ok');assert.equal(w.item(a.items[0].id,'aihot').title,'真实条目');
  assert.equal((await w.refresh()).throttled,true);time+=61000;broken=true;const cached=await w.refresh();assert.equal(cached.sources[0].status,'cached');assert.equal(cached.items.length,1);assert.equal(cached.sources[0].successAt,100000);
});
