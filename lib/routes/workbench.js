const fs = require('fs');
const path = require('path');
const { json, readBody } = require('../http');
const { MIME } = require('../static');
async function tryRoute(req, res, url, { workbench: w }) {
  const base = '/api/_/workbench';
  if (!url.pathname.startsWith(base)) return false;
  try {
    const tail = url.pathname.slice(base.length);
    const footage = tail.match(/^\/projects\/([a-f0-9-]{36})\/footage$/);
    if (footage && req.method === 'POST') { json(res,200,{ok:true,data:await w.importVideo(footage[1],req)});return true; }
    const media=tail.match(/^\/projects\/([a-f0-9-]{36})\/(recording|narration)$/);
    if(media&&req.method==='POST'){json(res,200,{ok:true,data:await w.importMedia(media[1],media[2],req)});return true;}
    let data;
    if (['POST','PUT'].includes(req.method)) {
      try { data = (await readBody(req)).data; } catch(e) { e.status=400;throw e; }
      if (!data || typeof data !== 'object' || Array.isArray(data)) { const e=new Error('请输入有效的表单内容。');e.status=400;throw e; }
    }
    let result;
    if (!tail && req.method === 'GET') result = w.state();
    else if (tail === '/runtime' && req.method === 'GET') result = await w.runtime();
    else if (tail === '/video-runtime' && req.method === 'GET') result = await w.videoRuntime();
    else if (tail === '/capabilities' && req.method === 'GET') result = w.capabilities();
    else if (tail === '/news' && req.method === 'GET') result = w.news.state();
    else if (tail === '/news/refresh' && req.method === 'POST') result = await w.news.refresh();
    else if (tail === '/news/handoff' && req.method === 'POST') result = w.newsHandoff(data);
    else if (tail === '/obsidian' && req.method === 'GET') result = { config:w.obsidian.config(), vaults:w.obsidian.discover() };
    else if (tail === '/obsidian' && req.method === 'PUT') result = w.obsidian.connect(data);
    else if (tail === '/obsidian/notes' && req.method === 'GET') result = w.obsidian.list(url.searchParams.get('q') || '');
    else if (tail === '/obsidian/note' && req.method === 'GET') result = w.obsidian.read(url.searchParams.get('path'));
    else if (tail === '/profile' && req.method === 'PUT') result = w.updateProfile(data);
    else if (tail === '/projects' && req.method === 'POST') result = w.create(data);
    else if (tail === '/handoff' && req.method === 'POST') result = w.handoff(data);
    else {
      const m = tail.match(/^\/projects\/([a-f0-9-]{36})(?:\/(generate|layout|publish|observe|import|apply|knowledge|knowledge-remove|archive|knowledge-draft|draft-import|topic-create|readiness|export-platform|video-render))?$/);
      const a = tail.match(/^\/assets\/([a-f0-9-]{36})\/([^/]+)$/);
      if (a && req.method === 'GET') {
        const file = w.asset(a[1], decodeURIComponent(a[2]));
        const size=fs.statSync(file).size;
        const mediaMime={'.mp4':'video/mp4','.mov':'video/quicktime','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4'};
        const headers={ 'Content-Type': mediaMime[path.extname(file)] || MIME[path.extname(file)] || 'text/plain; charset=utf-8', 'Content-Length':size, 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff', 'Accept-Ranges':'bytes', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:" };
        let start=0,end=size-1,status=200;
        if(req.headers.range){
          const r=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
          start=r?Number(r[1]):-1;end=r&&r[2]?Math.min(Number(r[2]),size-1):size-1;
          if(!r||start<0||start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return true;}
          status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;headers['Content-Length']=end-start+1;
        }
        res.writeHead(status,headers);
        fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res); return true;
      }
      if (!m) { json(res, 404, { ok: false, error: '工作台接口不存在。' }); return true; }
      if (!m[2] && req.method === 'GET') result = w.get(m[1]);
      else if(m[2]==='readiness'&&req.method==='GET')result=w.readiness(m[1]);
      else if(m[2]==='draft-import'&&req.method==='POST')result=w.importDraft(m[1],data);
      else if(m[2]==='topic-create'&&req.method==='POST')result=w.topicCreate(m[1],data);
      else if(m[2]==='export-platform'&&req.method==='POST')result=await w.exportPlatform(m[1],data);
      else if(m[2]==='video-render'&&req.method==='POST')result=await w.videoRender(m[1],data);
      else if (m[2] === 'knowledge' && req.method === 'GET') result = w.obsidian.selected(m[1]);
      else if (m[2] === 'knowledge' && req.method === 'POST') result = w.obsidian.select(m[1],data);
      else if (m[2] === 'knowledge-remove' && req.method === 'POST') result = w.obsidian.remove(m[1],data);
      else if (m[2] === 'knowledge-draft' && req.method === 'POST') result = w.obsidian.candidate(m[1],data);
      else if (m[2] === 'archive' && req.method === 'POST') result = w.obsidian.archive(m[1],data);
      else if (!m[2] && req.method === 'PUT') result = w.save(m[1], data);
      else if (m[2] === 'generate' && req.method === 'POST') result = await w.generate(m[1], data);
      else if (m[2] === 'layout' && req.method === 'POST') result = await w.layout(m[1]);
      else if (m[2] === 'apply' && req.method === 'POST') result = w.apply(m[1], data.jobId, data.version);
      else if (m[2] === 'publish' && req.method === 'POST') result = w.publication(m[1], data);
      else if (m[2] === 'observe' && req.method === 'POST') result = w.observation(m[1], data);
      else if (m[2] === 'import' && req.method === 'POST') result = w.importImage(m[1], data);
      else { json(res, 405, { ok: false, error: '请求方式不支持。' }); return true; }
    }
    json(res, 200, { ok: true, data: result });
  } catch (e) { json(res, e.status || 500, { ok: false, error: e.message }); }
  return true;
}
module.exports = { tryRoute };
