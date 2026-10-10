// Fixed, reviewed public endpoints only. Never fetch a URL supplied by an article or browser.
const crypto = require('crypto');
const Parser = require('rss-parser');
const CHANNELS = [
  { id:'aihot', name:'卡兹克 · AIHOT 精选', provider:'AIHOT', url:'https://aihot.news/api/v1/items?mode=selected&window=7d&limit=40', site:'https://aihot.news', type:'aihot', note:'个人非商业 / 内部使用；商业服务需书面授权' },
  ...[['tldrai','TLDR AI'],['bensbites',"Ben’s Bites"],['importai','Import AI'],['producthunt','Product Hunt'],['qiaomu-blog','乔木博客']].map(([id,name])=>({id:`qiaomu-${id}`,name:`乔木 · ${name}`,provider:'乔木 RSS',url:`https://rss.qiaomu.ai/api/sources/${id}/entries?limit=30`,site:'https://rss.qiaomu.ai',type:'qiaomu',note:'索引与短摘要；发布前核对原文，不转载改写全文'})),
  {id:'openai',name:'OpenAI 官方',provider:'官方 RSS',url:'https://openai.com/news/rss.xml',site:'https://openai.com/news',type:'rss',note:'官方公告；保留原语言与出处'},
  {id:'huggingface',name:'Hugging Face 官方',provider:'官方 RSS',url:'https://huggingface.co/blog/feed.xml',site:'https://huggingface.co/blog',type:'rss',note:'官方技术文章；保留原语言与出处'},
];
const safeLink = value => { try { const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:''; } catch { return ''; } };
const plain = (value,max) => String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
async function readPublic(url, fetcher=fetch) {
  const allowed=new Set(CHANNELS.map(s=>new URL(s.url).hostname));
  const signal=AbortSignal.timeout(15000);
  for(let n=0;n<3;n++){
    const u=new URL(url);
    if(u.protocol!=='https:'||u.username||u.password||u.port||!allowed.has(u.hostname))throw new Error('信源跳转地址不在允许范围。');
    const r=await fetcher(u.href,{redirect:'manual',signal,headers:{'User-Agent':'aihot-api/2.0.0','Accept':'application/json, application/rss+xml, application/atom+xml'}});
    if([301,302,303,307,308].includes(r.status)){url=new URL(r.headers.get('location'),u).href;await r.body?.cancel();continue;}
    if(!r.ok){await r.body?.cancel();throw new Error(r.status===429?'信源限流，请稍后刷新。':`信源暂时不可用（HTTP ${r.status}）。`);}
    if(Number(r.headers.get('content-length'))>2000000){await r.body?.cancel();throw new Error('信源响应超过 2 MB。');}
    const chunks=[];let length=0;
    for await(const b of r.body){length+=b.length;if(length>2000000)throw new Error('信源响应超过 2 MB。');chunks.push(b);}
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new Error('信源跳转次数过多。');
}
async function parseSource(source, raw, now=Date.now()) {
  let items;
  if(source.type==='rss'){
    if(/<!DOCTYPE|<!ENTITY/i.test(raw))throw new Error('不支持带外部实体的 RSS。');
    const feed=await new Parser().parseString(raw);items=feed.items.map(x=>({title:x.title,summary:x.contentSnippet||x.summary,url:x.link,at:x.isoDate||x.pubDate,author:x.creator}));
  }else{
    const data=JSON.parse(raw), rows=source.type==='aihot'?data.items:data.entries;
    if(!Array.isArray(rows))throw new Error('信源格式已变化，请检查接入。');
    items=rows.map(x=>source.type==='aihot'?{title:x.title,summary:x.summary,url:x.links?.original,readingUrl:x.links?.aihot,at:x.publishedAt,author:x.source?.name}:{title:x.titleZh||x.title,summary:x.summaryZh||x.summary,url:x.link,at:x.published||x.publishedTs,author:x.author});
  }
  return items.slice(0,60).map(x=>{
    const url=safeLink(x.url), at=typeof x.at==='number'?x.at:Date.parse(x.at||'');
    return {id:crypto.createHash('sha256').update(url).digest('hex'),sourceId:source.id,source:source.name,provider:source.provider,title:plain(x.title,240),summary:plain(x.summary,500),url,readingUrl:safeLink(x.readingUrl),publishedAt:Number.isFinite(at)&&at>0?at:null,fetchedAt:now,author:plain(x.author,120)};
  }).filter(x=>x.url&&x.title);
}
function make({db,fetcher=fetch,now=Date.now,channels=CHANNELS}){
  db.exec('CREATE TABLE IF NOT EXISTS creator_news_sources(id TEXT PRIMARY KEY,body TEXT NOT NULL)');
  let pending;
  const read=id=>{const r=db.prepare('SELECT body FROM creator_news_sources WHERE id=?').get(id);return r?JSON.parse(r.body):{items:[],status:'unfetched',attemptAt:null,successAt:null,error:''};};
  function state(){
    const sources=channels.map(s=>{const c=read(s.id);return {id:s.id,name:s.name,provider:s.provider,site:s.site,note:s.note,status:c.status,attemptAt:c.attemptAt,successAt:c.successAt,error:c.error,count:c.items.length};});
    const items=channels.flatMap(s=>read(s.id).items).sort((a,b)=>(b.publishedAt||b.fetchedAt)-(a.publishedAt||a.fetchedAt));
    return {sources,items,lastAttemptAt:Math.max(0,...sources.map(s=>s.attemptAt||0))||null};
  }
  async function refresh(){
    if(pending)return pending;
    const current=state();
    if(current.lastAttemptAt&&now()-current.lastAttemptAt<60000)return {...current,throttled:true};
    pending=(async()=>{
      // Two connections at most; no burst polling against public sources.
      let index=0;
      async function worker(){while(index<channels.length){const s=channels[index++],old=read(s.id),attemptAt=now();let c;
        try{const items=await parseSource(s,await readPublic(s.url,fetcher),attemptAt);c={items,status:items.length?'ok':'empty',attemptAt,successAt:attemptAt,error:''};}
        catch(e){c={...old,status:old.items.length?'cached':'failed',attemptAt,error:e.name==='TimeoutError'?'信源请求超时，保留上次内容。':plain(e.message,240)};}
        db.prepare('INSERT OR REPLACE INTO creator_news_sources VALUES (?,?)').run(s.id,JSON.stringify(c));
      }}
      await Promise.all([worker(),worker()]);return state();
    })().finally(()=>pending=null);return pending;
  }
  function item(id,sourceId){return read(sourceId).items.find(x=>x.id===id);}
  return {state,refresh,item};
}
module.exports={make,CHANNELS,parseSource,readPublic,safeLink};
