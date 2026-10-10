import {localApi} from '../api.js';
import {esc,safeExternalUrl} from '../utils.js';
import {gotoPage} from '../navigation.js';
import {toast} from '../components.js';

export function renderCreatorNews(){
  const root=document.getElementById('creator-news-root'),life=new AbortController();let data,disposed=false,busy=false,limit=60;
  const date=n=>n?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(n)):'未提供';
  function paint(){
    if(disposed)return;
    const selected=root.querySelector('#news-source').value,q=root.querySelector('#news-query').value.trim().toLowerCase(),seen=new Set();
    const items=data.items.filter(x=>(!selected||x.sourceId===selected)&&(!q||`${x.title} ${x.summary} ${x.source}`.toLowerCase().includes(q))).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;});
    root.querySelector('#news-count').textContent=`${items.length} 条 · 已显示 ${Math.min(limit,items.length)} 条 · 摘要尚未实测`;
    root.querySelector('#news-health').innerHTML=data.sources.map(s=>`<details class="news-source-state"><summary>${esc(s.name)} · ${esc({ok:'可读',empty:'暂无条目',cached:'读取缓存',failed:'连接失败',unfetched:'待刷新'}[s.status])} · ${s.count} 条</summary><p>${esc(s.error||s.note)}</p><small>最近成功：${date(s.successAt)}</small></details>`).join('');
    root.querySelector('#news-list').innerHTML=items.length?items.slice(0,limit).map(x=>`<article class="glass news-item"><small>${esc(x.source)} · 发布时间 ${date(x.publishedAt)}</small><h3>${esc(x.title)}</h3><p>${esc(x.summary||'来源未提供摘要，请阅读原文。')}</p><div class="news-actions"><a class="btn btn-ghost" href="${esc(safeExternalUrl(x.url))}" target="_blank" rel="noopener noreferrer">阅读原文</a>${x.readingUrl?`<a class="btn btn-ghost" href="${esc(safeExternalUrl(x.readingUrl))}" target="_blank" rel="noopener noreferrer">精选阅读</a>`:''}<button class="btn btn-primary" data-news="${esc(x.id)}" data-source="${esc(x.sourceId)}">转为选题</button></div></article>`).join(''):'<p class="news-empty">没有匹配资讯；可换个关键词或刷新信源。</p>';
    root.querySelector('#news-more').hidden=items.length<=limit;
  }
  async function load(refresh=false){
    if(busy)return;busy=true;const b=root.querySelector('#news-refresh');b.disabled=true;b.textContent='读取中';root.querySelector('#news-error').textContent='';
    try{data=await localApi(`workbench/news${refresh?'/refresh':''}`,{method:refresh?'POST':'GET',body:refresh?{}:undefined,signal:life.signal});if(disposed)return;const select=root.querySelector('#news-source'),value=select.value;select.innerHTML='<option value="">全部信源</option>'+data.sources.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');select.value=value;paint();if(refresh&&data.throttled)toast('已读取缓存；信源刷新间隔为 60 秒','info');}
    catch(e){if(!disposed)root.querySelector('#news-error').textContent=e.message;}
    finally{busy=false;if(!disposed){b.disabled=false;b.textContent='刷新信源';}}
  }
  root.addEventListener('input',e=>{if(data&&['news-query','news-source'].includes(e.target.id)){limit=60;paint();}},{signal:life.signal});
  root.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='news-refresh')return load(true);
    if(b.id==='news-more'){limit+=60;return paint();}
    if(!b.dataset.news||busy)return;busy=true;b.disabled=true;
    try{const r=await localApi('workbench/news/handoff',{method:'POST',body:{id:b.dataset.news,sourceId:b.dataset.source},signal:life.signal});if(disposed)return;await gotoPage('workbench',{workbench:{projectId:r.project.id}});toast(r.reused?'已打开关联选题，原稿未覆盖':'资讯已转为选题，实测证据仍需补充','success');}
    catch(e){if(!disposed)toast(e.message,'error');}finally{busy=false;if(!disposed)b.disabled=false;}
  },{signal:life.signal});
  (async()=>{await load();if(!disposed&&data&&!data.lastAttemptAt)await load(true);})();
  return {dispose(){disposed=true;life.abort();}};
}
