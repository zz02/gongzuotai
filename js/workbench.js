/* Personal workbench controller. No generated HTML or AI text is inserted unsanitized. */
export function renderWorkbench(options = {}) {
  const root = document.getElementById('workbench-root');
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const lifetime = new AbortController();
  let disposed = false, operations = 0;
  const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const base = '/api/_/workbench';
  const labels = {wechat:'公众号初稿',xhs:'图文逐页稿',video:'录屏脚本',review:'内容价值检查',audience:'读者需求',contentPlan:'内容组织',resonate:'共鸣审稿',expression:'表达检查',risk:'发布检查',topics:'选题建议',image:'Codex 生图',xhsImage:'AI 图卡',imagePrompt:'封面提示词',hooks:'标题封面建议',cards:'文字卡片 · 非 AI 生图',import:'导入图片',footage:'导入成片',master:'事实母稿',topicPlan:'可立项选题',wechatPack:'公众号整稿',xhsPack:'小红书整稿',douyinPack:'抖音图文整稿',videoPack:'视频整稿',douyinCards:'抖音图文卡片',draftImport:'导入候选稿',recording:'原始录屏',narration:'本人配音',videoRender:'录屏成片'};
  const statuses = {running:'生成中',done:'已完成',failed:'失败',applied:'已采用'};
  const fields=['title','audience','brief','sources','wechat','xhs','video','imagePrompt','nextAction','master','wechatTitle','wechatSummary','xhsTitle','xhsCaption','douyinPhoto','douyinTitle','douyinCaption','videoTitle','videoCaption','subtitles'];
  const names=['内容标题','目标读者','实测素材','参考来源','公众号正文','图文逐页稿','视频脚本','图片提示词','下一步改进','事实母稿','公众号标题','文章摘要','小红书标题','小红书配文','抖音图文稿','抖音图文标题','抖音图文配文','视频标题','视频配文','字幕时间轴'];
  let state, current, dirty=false, layoutHtml='', toastTimer, pollTimer, polling=false, recoveryDraft, recoverySaved=false, savePromise;
  let draftFlow=null, flowNotice='';
  const draftFlowKey='creator-two-platform-flow';
  let capabilities=[],selectedCapability,runtime;
  const datetime = d => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
  function toast(s) { if(disposed)return; $('#toast').textContent=s; $('#toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').hidden=true,6500); }
  async function api(url,method='GET',data) {
    const r=await fetch(url,{method,headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined,signal:lifetime.signal});
    if(disposed)throw new DOMException('页面已关闭','AbortError');
    const j=await r.json();
    if (!r.ok || !j.ok) {const error=new Error(j.error || '请求失败，请重试。');error.status=r.status;throw error;}
    return j.data ?? j;
  }
  function modal(title,html) { $('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal(); }
  function close(){ $('#dialog').close(); }
  function projectPath(action='') { if(!current)throw new Error('请先新建内容。');return `${base}/projects/${current.id}${action?'/'+action:''}`; }
  function updateStatus(){ $('#save-status').textContent=dirty?'有未保存修改':`已保存 · ${datetime(current.updatedAt)}`; }
  function readDraft(){ const input={version:current.version};fields.forEach(f=>input[f]=$(`[data-field="${f}"]`).value);input.videoSettings=JSON.stringify(Object.fromEntries(new FormData($('#video-render-form'))));return input; }
  async function save(){
    if(savePromise)return savePromise;
    savePromise=persistDraft();
    try{return await savePromise;}finally{savePromise=null;}
  }
  async function persistDraft(){
    if(!current)throw new Error('请先新建内容。');if(!dirty)return current;
    const controls=$$('[data-field]');controls.forEach(c=>c.disabled=true);
    try{const p=await api(projectPath(),'PUT',readDraft());current=p;dirty=false;updateStatus();state.projects=state.projects.map(x=>x.id===p.id?p:x);$('#project-heading').textContent=p.title;renderList();renderJobs();return p;}
    catch(e){if(e.status===409 || e.status===401){recoveryDraft=readDraft();recoverySaved=false;$('#recovery-export').hidden=false;modal(e.status===401?'登录已失效':'保存冲突',`<p class="panel-note">${e.status===401?'请先导出当前修改，再重新登录。':'其他窗口已保存新版本。请先导出当前修改，再手工合并。'}</p><div class="dialog-actions"><button class="pui-btn pui-btn-primary" data-action="export-recovery">导出副本</button><button class="pui-btn" data-action="reload-project">载入最新</button><button class="pui-btn" data-action="close">保留编辑</button></div><p class="pui-help">副本在本窗口保留，刷新前请先导出。</p>`);}throw e;}
    finally{controls.forEach(c=>c.disabled=false);}
  }
  function setCurrent(p){ if(current?.id!==p.id)flowNotice='';current=p;state.projects=state.projects.map(x=>x.id===p.id?p:x);dirty=false;$('#video-render-form').reset();fields.forEach(f=>$(`[data-field="${f}"]`).value=p[f]||'');$('#delivery-summary').innerHTML='<p class="muted">点击“检查成品”核对当前版本。</p>';$('#project-heading').textContent=p.title;$('#editor').hidden=false;$('#empty').hidden=true;localStorage.setItem('creator-project',p.id);updateStatus();renderList();renderJobs();try{const s=JSON.parse(p.videoSettings||'{}');for(const key of ['recordingId','narrationId','start','end','aspect'])if(typeof s[key]==='string')$('#video-render-form').elements[key].value=s[key];}catch{}renderPublications(); }
  function renderList(){ $('#project-list').innerHTML=state.projects.map(p=>`<button data-project="${p.id}" class="${current?.id===p.id?'is-active':''}" ${current?.id===p.id?'aria-current="page"':''}>${escape(p.title)}<small>${p.publications.length?'已登记 '+p.publications.length+' 条作品':'创作中'} · ${datetime(p.updatedAt).slice(0,10)}</small></button>`).join(''); }
  function renderProfile(){ $('#fans-value').textContent=state.profile.fans===null?'未更新':state.profile.fans.toLocaleString();$('#runtime').textContent=runtime?(runtime.loggedIn?runtime.imageEnabled?'Codex 已登录 · 生图已启用':'Codex 已登录 · 生图待检查':runtime.installed?'Codex 待登录':'Codex 未安装'):'Codex 待检查'; }
  function showCapability(){const c=selectedCapability;$('#capability-callout').hidden=!c;if(c)$('#capability-callout').innerHTML=`<div><strong>${escape(c.name)} · ${escape(c.author)}</strong><p>${escape(c.description)} / ${escape(c.mode)}。请确认当前稿件再运行。</p></div><button class="pui-btn pui-btn-primary" data-action="run-capability">运行能力</button>`;}
  function renderAssistant(){
    const items=capabilities.filter(c=>c.assistant);
    const previous=$('#assistant-kind').value;
    $('#assistant-kind').innerHTML=items.map(c=>`<option value="${escape(c.kind)}" ${c.available?'':'disabled'}>${escape(c.name)}${c.available?'':' · 源码缺失'}</option>`).join('');
    const chosen=selectedCapability?.assistant?selectedCapability.kind:previous;
    if(items.some(c=>c.kind===chosen&&c.available))$('#assistant-kind').value=chosen;
    assistantDescription();
  }
  function assistantDescription(){
    const c=capabilities.find(c=>c.kind===$('#assistant-kind').value&&c.assistant);
    const fixed={wechat:'公众号',xhs:'小红书',douyinPhoto:'抖音图文'}[$('#assistant-target').value];
    $('#assistant-platform').disabled=Boolean(fixed);
    if(fixed)$('#assistant-platform').value=fixed;
    $('#assistant-description').textContent=c?`${c.description}。${c.requiresDraft?'请先填写选中的稿件；':''}结果见下方生成记录，需人工核对。`:'助手方法未就绪，请在 Skills 中心同步来源。';
    $('#assistant-run').disabled=!c?.available||Boolean(state?.busy);
  }
  function assistantTarget(name){
    const field={wechat:'wechat',xhs:'xhs',douyin:'douyinPhoto'}[name];
    if(field)$('#assistant-target').value=field;
    else if(name==='materials'||name==='knowledge')$('#assistant-target').value=current?.master?.trim()?'master':'brief';
    assistantDescription();
  }
  function saveDraftFlow(){if(draftFlow)localStorage.setItem(draftFlowKey,JSON.stringify(draftFlow));else localStorage.removeItem(draftFlowKey);}
  function readDraftFlow(){
    try{const value=JSON.parse(localStorage.getItem(draftFlowKey)||'null');if(value&&typeof value.projectId==='string'&&Array.isArray(value.kinds)&&value.kinds.every(k=>['wechatPack','xhsPack'].includes(k))&&(!value.activeJobId||typeof value.activeJobId==='string'))return value;}catch{}
    localStorage.removeItem(draftFlowKey);return null;
  }
  function renderDraftPath(){
    if(!current)return;
    const active=draftFlow?.projectId===current.id?draftFlow:null;
    for(const [field,id,kind] of [['wechat','draft-wechat-state','wechatPack'],['xhs','draft-xhs-state','xhsPack']]){
      const latest=state.jobs.find(j=>j.projectId===current.id&&j.kind===kind);
      $("#"+id).textContent=current[field]?.trim()?'已有草稿':active?.activeJobId===latest?.id&&latest?.status==='running'?'生成中':latest?.status==='failed'?'生成失败':latest?.status==='done'?'候选待采用':'未生成';
    }
    const missing=[['wechat','公众号'],['xhs','小红书']].filter(([field])=>!current[field]?.trim()).map(([,name])=>name);
    const button=$('#draft-both-button');button.disabled=!missing.length||Boolean(state.busy)||Boolean(active);
    button.textContent=!missing.length?'双平台草稿已齐':'生成'+missing.join('与')+'初稿';
    const failure=state.jobs.find(j=>j.projectId===current.id&&['wechatPack','xhsPack'].includes(j.kind)&&j.status==='failed');
    const assistantFailure=missing.length===2&&state.jobs.find(j=>j.projectId===current.id&&['topicPlan','audience'].includes(j.kind)&&j.status==='failed');
    $('#draft-path-status').textContent=active?.activeJobId?`正在生成${active.kinds[0]==='wechatPack'?'公众号':'小红书'}初稿，完成后写入对应稿件。`:active?'正在准备生成…':flowNotice||(!missing.length?'两端稿件均可在下方页签编辑。':failure?`上次生成失败：${failure.error} 可重试缺少的稿件。`:assistantFailure?`上次助手任务失败：${assistantFailure.error} 双平台正文仍待生成。`:'选题已保存，平台正文尚未生成。点击按钮制作可编辑的初稿。');
  }
  async function advanceDraftFlow(){
    if(!draftFlow||draftFlow.projectId!==current?.id)return;
    const field=kind=>kind==='wechatPack'?'wechat':'xhs';
    if(draftFlow.activeJobId){
      const job=state.jobs.find(j=>j.id===draftFlow.activeJobId);
      if(!job){flowNotice='生成记录未找到，请重新打开当前项目。';draftFlow=null;saveDraftFlow();renderDraftPath();return;}
      if(job.status==='running'){renderDraftPath();return;}
      if(job.status==='applied'&&job.projectId===current.id&&job.kind===draftFlow.kinds[0]&&current[field(job.kind)]?.trim()){
        draftFlow.kinds.shift();draftFlow.activeJobId=null;saveDraftFlow();
      }else{
        if(job.projectId!==current.id||job.kind!==draftFlow.kinds[0]||job.status!=='done'||dirty||job.baseVersion!==current.version||current[field(job.kind)]?.trim()){
          flowNotice=job.status==='failed'?`生成失败：${job.error} 请重试。`:'稿件已有新修改，候选稿保留在生成记录中，请核对后手动合并。';
          draftFlow=null;saveDraftFlow();renderDraftPath();toast(flowNotice);return;
        }
        const p=await api(projectPath('apply'),'POST',{jobId:job.id,version:current.version});
        job.status='applied';draftFlow.kinds.shift();draftFlow.activeJobId=null;saveDraftFlow();setCurrent(p);
      }
    }
    while(draftFlow?.kinds.length&&current[field(draftFlow.kinds[0])]?.trim())draftFlow.kinds.shift();
    if(!draftFlow?.kinds.length){draftFlow=null;saveDraftFlow();flowNotice='双平台草稿已写入，可切换页签修改。';renderDraftPath();tab('wechat');toast(flowNotice);return;}
    const kind=draftFlow.kinds[0];
    const job=await api(projectPath('generate'),'POST',{kind,version:current.version});
    draftFlow.activeJobId=job.id;saveDraftFlow();state.jobs.unshift(job);state.busy=job.status==='running';renderJobs();schedulePoll();
  }
  async function safeAdvanceDraftFlow(){try{await advanceDraftFlow();}catch(error){flowNotice=`生成未完成：${error.message}。已完成的稿件仍在对应页签。`;draftFlow=null;saveDraftFlow();renderDraftPath();toast(flowNotice);}}
  async function startDraftFlow(){
    if(draftFlow?.projectId===current.id){await safeAdvanceDraftFlow();return;}
    if(state.busy)throw new Error('已有任务运行中，请完成后再生成双平台初稿。');
    await save();
    const kinds=[['wechatPack','wechat'],['xhsPack','xhs']].filter(([,field])=>!current[field]?.trim()).map(([kind])=>kind);
    if(!kinds.length){tab('wechat');toast('公众号和小红书草稿均已存在。');return;}
    flowNotice='';draftFlow={projectId:current.id,kinds,activeJobId:null};saveDraftFlow();renderDraftPath();await safeAdvanceDraftFlow();
  }
  function methodNote(j){
    if(!j.method)return '';
    const stale=dirty||j.baseVersion!==current.version;
    return `<p class="method-note">${escape(j.method.draftName)} · ${escape(j.method.platform)} · db ${escape(j.method.commit?.slice(0,12)||'版本未确认')} · <span data-method-version="${j.baseVersion}">${stale?'稿件有修改，请重新核对建议。':'建议未写入原稿。'}</span></p>`;
  }
  const assetUrl=(j,file)=>`${base}/assets/${j.id}/${encodeURIComponent(file)}`;
  const jobTitle=j=>j.kind==='xhsImage'?`AI 图卡 · 第 ${j.pageIndex+1} 页${j.pageIndex===0?' · 封面':''}`:labels[j.kind]||j.kind;
  function renderJobs(){
    if(!current)return;
    const jobs=state.jobs.filter(j=>j.projectId===current.id);
    const cover=jobs.find(j=>j.kind==='xhsImage'&&j.pageIndex===0&&j.status==='done'&&j.seriesKey===current.xhsSeriesKey);
    const imageNote=j=>j.kind!=='xhsImage'?'':(j.seriesKey!==current.xhsSeriesKey||$('[data-field="xhs"]').value!==current.xhs)?'旧稿图片，请勿与当前稿混用。':j.pageIndex>0&&j.status==='done'?(!j.coverJobId?'封面参考待核对。':j.coverJobId!==cover?.id?'参考封面已更新，请重新生成本页。':'当前逐页稿'):'当前逐页稿';
    $('#job-status').textContent=state.busy?'有任务运行中，草稿仍可编辑':'候选稿需要采用后写入正文';
    $('#jobs').innerHTML=jobs.length?jobs.map(j=>`<article class="job"><div class="job-head"><strong>${escape(jobTitle(j))}</strong><span class="state-${j.status}">${escape(statuses[j.status]||j.status)}</span><span class="job-date">${datetime(j.startedAt)}</span>${j.result?`<button class="plain-button" data-preview="${j.id}">查看结果</button>`:''}${j.status==='failed'?j.kind==='videoRender'?'<button class="plain-button" data-tab="video">调整重试</button>':`<button class="plain-button" data-kind="${j.kind}" ${j.method?`data-retry="${j.id}"`:''} data-page-index="${j.pageIndex??0}">重新生成</button>`:''}</div>${methodNote(j)}${imageNote(j)?`<p class="panel-note">${escape(imageNote(j))}</p>`:''}${j.error?`<p class="job-error">${escape(j.error)}</p>`:''}${j.assets.length?`<div class="job-assets">${j.assets.map(file=>{
      const url=assetUrl(j,file);
      const filename=j.kind==='xhsImage'?`图卡-${String(j.seriesKey||'旧版').slice(0,8)}-${String(j.pageIndex+1).padStart(2,'0')}-${j.id.slice(0,8)}.${file.split('.').pop()}`:file;
      return /\.(png|jpg|jpeg|webp)$/i.test(file)?`<div class="asset-card"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${escape(jobTitle(j)+' · '+file)}" loading="lazy"></a><span>${escape(filename)}</span><div class="actions"><a href="${url}" download="${escape(filename)}">下载原图</a><button class="plain-button" data-insert="${escape(url)}">插入正文</button></div></div>`:/\.mp4$/i.test(file)?`<div><video controls preload="metadata" src="${url}"></video><p><a href="${url}" download>${j.kind==='recording'?'下载录屏':'下载成片'}</a></p></div>`:/\.(mp3|wav|m4a)$/i.test(file)?`<div><audio controls preload="metadata" src="${url}"></audio><a href="${url}" download>下载配音</a></div>`:`<a href="${url}" download="${escape(file)}">下载 ${escape(file)}</a>`;
    }).join('')}</div>`:''}</article>`).join(''):'<p class="muted panel-note">还没有生成记录。先保存素材，再生成候选稿。</p>';
    $$('[data-kind], [data-action="run-capability"], [data-action="xhs-image-plan"]').forEach(b=>b.disabled=state.busy);
    $('#render-video-button').disabled=state.busy;
    assistantDescription();
    renderDraftPath();
    renderMedia();
  }
  function renderMedia(){
    const jobs=state.jobs.filter(j=>j.projectId===current.id&&j.status==='done');
    for(const [kind,id,placeholder] of [['recording','recording-select','请先导入录屏'],['narration','narration-select','保留录屏声音']]){
      const sel=$('#'+id),old=sel.value;sel.innerHTML=`<option value="">${placeholder}</option>`+jobs.filter(j=>j.kind===kind).map(j=>`<option value="${j.id}">${datetime(j.startedAt)} · ${j.media.duration.toFixed(1)} 秒${kind==='recording'?` · ${j.media.width} × ${j.media.height}`:''}</option>`).join('');
      if([...sel.options].some(o=>o.value===old))sel.value=old;
    }
  }
  function renderPublications(){
    $('#publications').innerHTML=current.publications.length?current.publications.map(p=>{
      const o=current.observations.filter(x=>x.publicationId===p.id).at(-1);
      return `<article class="publication"><strong>${escape(p.platform)} · ${escape(p.at)}</strong><a href="${escape(p.url)}" target="_blank" rel="noopener">${escape(p.url)}</a><small>${o?['views','likes','saves','follows'].map((k,i)=>`${['阅读／播放','点赞','收藏','新增关注'][i]} ${o[k]===null?'未填':o[k]}`).join(' · '):'尚未记录表现'}</small>${o?.note?`<p>${escape(o.note)}</p>`:''}<button class="plain-button" data-observe="${p.id}">记录表现</button></article>`;
    }).join(''):'<p class="muted">还没有登记作品，发布后再回来记录。</p>';
  }
  function tab(name){ localStorage.setItem('creator-tab',name); $$('[data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===name));b.tabIndex=b.dataset.tab===name?0:-1;});$$('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==name);assistantTarget(name); }
  function newForm(){modal('新建内容',`<form id="create-form"><label class="pui-field"><span class="pui-label">内容标题</span><input name="title" class="pui-control" maxlength="120" placeholder="例如：我用 AI 做了一次需求评审" required></label><label class="pui-field"><span class="pui-label">读者问题</span><textarea name="brief" class="pui-control" maxlength="30000" placeholder="谁遇到了什么问题？你想验证什么？"></textarea></label><button class="pui-btn pui-btn-primary" type="submit">创建内容</button></form>`); }
  async function create(input){ await saveIfNeeded();const p=await api(`${base}/projects`,'POST',input);state.projects.unshift(p);setCurrent(p);tab(selectedCapability?.tab||'materials');close();toast('内容已创建。'); }
  async function saveIfNeeded(){if(savePromise)await savePromise;if(recoveryDraft&&!recoverySaved)throw new Error('请先导出未合并修改。');if(current&&dirty)await save();}
  async function generate(kind,extra={}){ await save();const assistant=capabilities.some(c=>c.kind===kind&&c.assistant)||kind==='topics';const input={kind,version:current.version,...(assistant?{draftField:$('#assistant-target').value,platform:$('#assistant-platform').value}:{}),...extra};const j=await api(projectPath('generate'),'POST',input);state.jobs.unshift(j);state.busy=j.status==='running';renderJobs();toast(assistant?'已提交助手任务，建议不会覆盖原稿。':kind==='cards'?'正在导出文字卡片。':'已提交生成任务，完成后会出现在下方。');schedulePoll(); }
  function schedulePoll(){ clearTimeout(pollTimer);if(disposed)return;pollTimer=setTimeout(poll,4000); }
  async function poll(){
    if(polling||disposed)return;polling=true;
    try{const fresh=await api(base);const completed=fresh.jobs.find(j=>['done','failed'].includes(j.status)&&state.jobs.some(old=>old.id===j.id&&old.status==='running'));const flowCompleted=Boolean(completed&&draftFlow?.activeJobId===completed.id);const changed=JSON.stringify(fresh.jobs)!==JSON.stringify(state.jobs)||fresh.busy!==state.busy;state.jobs=fresh.jobs;state.busy=fresh.busy;state.codex=fresh.codex;if(changed)renderJobs();renderProfile();if(draftFlow?.projectId===current?.id)await safeAdvanceDraftFlow();if(completed&&!flowCompleted)toast(completed.status==='failed'?'生成失败，原稿未改动。':'生成已完成，请查看候选稿或成品。');}
    catch(e){if(state.busy)toast('暂时无法读取任务状态；原稿仍在编辑器中。');}
    finally{polling=false;schedulePoll();}
  }
  function preview(id){const j=state.jobs.find(x=>x.id===id);if(!j)return;const draft=j.draft?Object.entries(j.draft).map(([key,value])=>`${names[fields.indexOf(key)]||'稿件'}\n\n${value}`).join('\n\n────────\n\n'):j.result;modal(jobTitle(j)||'生成结果',`<p class="panel-note">候选结果未修改原稿。生成后有修改时，请复制后手工合并。</p>${methodNote(j)}${j.topics?j.topics.map((t,i)=>`<article class="topic-choice"><h3>${escape(t.title)}</h3><p>${escape(t.problem)}</p><p>${escape(t.reason)}</p><p>${escape(t.action)}</p><button class="pui-btn pui-btn-primary" data-topic="${j.id}" data-index="${i}">创建选题</button></article>`).join(''):`<pre class="candidate">${escape(draft)}</pre>`}<div class="dialog-actions"><button class="pui-btn" data-copy-result="${j.id}">复制结果</button>${(['wechat','xhs','video','imagePrompt','master'].includes(j.kind)||j.draft)&&j.status==='done'?`<button class="pui-btn pui-btn-primary" data-apply="${j.id}">采用稿件</button>`:''}</div>`); }
  function downloadText(text,name,type='text/markdown;charset=utf-8'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function copyText(text){await navigator.clipboard.writeText(text);toast('已复制。');}
  function importForm(){const name=$('[data-tab][aria-selected="true"]').dataset.tab;const field={wechat:'wechat',xhs:'xhs',douyin:'douyinPhoto',video:'video'}[name]||'master';modal('导入已有正文',`<form id="draft-import-form"><p class="panel-note">粘贴或读取本机 Markdown／TXT，先形成候选稿，不覆盖原文。</p><label class="pui-field"><span class="pui-label">导入位置</span><select name="field" class="pui-control">${[['master','事实母稿'],['wechat','公众号正文'],['xhs','小红书逐页稿'],['douyinPhoto','抖音图文稿'],['video','视频脚本']].map(([f,label])=>`<option value="${f}" ${field===f?'selected':''}>${label}</option>`).join('')}</select></label><label class="pui-field"><span class="pui-label">本机文件</span><input id="draft-file" type="file" class="pui-control" accept=".md,.txt,text/plain,text/markdown"></label><label class="pui-field"><span class="pui-label">正文内容</span><textarea name="content" class="pui-control tall" maxlength="60000" required></textarea></label><button class="pui-btn pui-btn-primary" type="submit">导入候选</button></form>`);}
  async function deliveryCheck(){
    await save();const checks=await api(projectPath('readiness'));tab('publish');
    $('#delivery-summary').innerHTML=checks.map(c=>`<article class="delivery-item"><div><strong>${escape(c.platform)}</strong><p>${c.ready?'标题、配文与当前稿成品已齐全。':`尚缺：${escape(c.missing.join('、'))}`}</p></div>${c.ready?`<button class="pui-btn" data-delivery="${escape(c.platform)}">导出发布包</button>`:`<button class="pui-btn" data-tab="${c.platform==='公众号'?'wechat':c.platform==='小红书'?'xhs':'douyin'}">继续制作</button>`}</article>`).join('')+'<p class="pui-help">齐全不等于事实核验或已经发布；请自行审校。</p>';
    toast('已检查当前稿件；缺失项不会伪装完成。');
  }
  function noteRow(n, selected=false){
    return `<article class="vault-note"><div><strong>${escape(n.title)}</strong><small>${escape(n.path)}</small>${selected?`<span class="pui-tag">${escape(n.status)}</span> <small>${n.characters.toLocaleString()} 字符</small>`:''}</div><div class="actions"><a class="pui-link" href="${escape(n.uri)}">打开 OB</a><button class="pui-btn" data-note="${escape(n.path)}">预览</button>${selected?`<button class="pui-btn" data-note-select="${escape(n.path)}">刷新引用</button><button class="pui-btn" data-note-remove="${escape(n.path)}">移除</button>`:''}</div></article>`;
  }
  async function loadKnowledge(query=''){
    if(!current)return;
    const id=current.id;
    const [connection,selected]=await Promise.all([api(`${base}/obsidian`),api(projectPath('knowledge'))]);
    if(current.id!==id)return;
    $('#vault-status').textContent=connection.config?`${connection.config.name} / 输出到 ${connection.config.output}`:'尚未连接，请先选择接入目录。';
    $('#vault-selected').innerHTML=selected.length?selected.map(n=>noteRow(n,true)).join(''):'<p class="muted">尚未关联笔记，原库不会自动上传。</p>';
    if(!connection.config){$('#vault-notes').innerHTML='';$('#vault-count').textContent='';return;}
    const result=await api(`${base}/obsidian/notes?q=${encodeURIComponent(query)}`);
    if(current.id!==id)return;
    $('#vault-count').textContent=`找到 ${result.total} 篇${result.limited?'，仅显示前 100 篇，请输入关键词缩小范围':''}。`;
    $('#vault-notes').innerHTML=result.notes.length?result.notes.map(n=>noteRow(n)).join(''):'<p class="muted">没有匹配笔记，请换个关键词。</p>';
  }
  async function vaultConfig(){
    const {config:c,vaults}=await api(`${base}/obsidian`);
    const candidate=vaults.find(v=>v.open)||vaults[0];
    modal('连接 Obsidian',`<form id="vault-form"><p class="panel-note">连接只保存本机设置，不移动笔记、不安装插件。</p><label class="pui-field"><span class="pui-label">知识库路径</span><input name="path" class="pui-control" required value="${escape(c?.path||candidate?.path||'')}" list="vault-paths"><datalist id="vault-paths">${vaults.map(v=>`<option value="${escape(v.path)}">${escape(v.name)}</option>`).join('')}</datalist></label><label class="pui-field"><span class="pui-label">接入目录</span><textarea name="scopes" class="pui-control" required placeholder="每行一个库内目录">${escape(c?.scopes.join('\n')||'02-素材库\n06-知识学习\n03-内容创作')}</textarea><span class="pui-help">只搜索这些目录，不含日记与隐藏文件。</span></label><label class="pui-field"><span class="pui-label">归档目录</span><input name="output" class="pui-control" required value="${escape(c?.output||'03-内容创作/点灯创作台')}"><span class="pui-help">每次归档新建快照，不覆盖已有文件。</span></label><button class="pui-btn pui-btn-primary" type="submit">连接知识库</button></form>`);
  }
  async function notePreview(notePath){
    const n=await api(`${base}/obsidian/note?path=${encodeURIComponent(notePath)}`);
    modal('笔记预览',`<p class="panel-note">${escape(n.path)} / 选为素材后，文字可用于 AI 生成。</p><pre class="candidate">${escape(n.content)}</pre><div class="dialog-actions"><a class="pui-btn" href="${escape(n.uri)}">打开 OB</a><button class="pui-btn pui-btn-primary" data-note-select="${escape(n.path)}">选为素材</button><button class="pui-btn" data-note-draft="${escape(n.path)}">导入稿件</button></div>`);
  }
  async function selectNote(notePath,remove=false){
    await saveIfNeeded();
    const id=current.id;
    const result=await api(projectPath(remove?'knowledge-remove':'knowledge'),'POST',{path:notePath,version:current.version});
    if(current.id!==id){state.projects=state.projects.map(p=>p.id===id?result.project:p);return toast('原项目的引用已更新。');}
    setCurrent(result.project);close();tab('knowledge');await loadKnowledge($('#vault-search [name=q]').value);toast(remove?'已移除引用，原笔记未改动。':'已保存引用快照，原笔记未改动。');
  }
  async function layout(){await save();const result=await api(projectPath('layout'),'POST',{});layoutHtml=result.html;modal('公众号排版预览',`<p class="panel-note">${escape(result.note)}</p><iframe class="preview-frame" sandbox="allow-same-origin" title="公众号正文预览"></iframe><div class="dialog-actions"><button class="pui-btn pui-btn-primary" data-action="copy-layout">复制排版</button><button class="pui-btn" data-action="download-layout">导出 HTML</button></div>`);$('.preview-frame').srcdoc=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: http:; style-src 'unsafe-inline'"><body>${layoutHtml}</body>`; }
  async function copyLayout(){
    const html=layoutHtml.replace(/src="(\/api\/[^" ]+)"/g,(_,p)=>`src="${location.origin}${p}"`);
    if(navigator.clipboard.write&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([$('.preview-frame').contentDocument.body.innerText],{type:'text/plain'})})]);toast('已复制排版，请在公众号后台粘贴并核对。');}
    else{throw new Error('浏览器不支持富文本复制，请导出 HTML 后打开复制。');}
  }
  function publishForm(){modal('登记作品',`<form id="publish-form"><label class="pui-field"><span class="pui-label">发布平台</span><select name="platform" class="pui-control"><option>公众号</option><option>小红书</option><option>抖音</option></select></label><label class="pui-field"><span class="pui-label">作品链接</span><input name="url" class="pui-control" type="url" required placeholder="https://"></label><label class="pui-field"><span class="pui-label">发布时间</span><input name="at" class="pui-control" value="${datetime(Date.now())}" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}" required><span class="pui-help">北京时间，YYYY-MM-DD HH:mm</span></label><button class="pui-btn pui-btn-primary" type="submit">登记作品</button></form>`); }
  function observeForm(id){modal('记录作品表现',`<form id="observe-form" data-publication="${id}"><div class="pui-form-columns">${['views','likes','saves','follows'].map((k,i)=>`<label class="pui-field"><span class="pui-label">${['阅读播放','点赞数量','收藏数量','新增关注'][i]}</span><input name="${k}" class="pui-control" type="number" min="0" max="100000000" step="1" placeholder="未填"></label>`).join('')}</div><label class="pui-field"><span class="pui-label">复盘结论</span><textarea name="note" class="pui-control" maxlength="2000" placeholder="观众在哪里停下？下一篇准备改什么？"></textarea></label><button class="pui-btn pui-btn-primary" type="submit">保存记录</button></form>`); }
  async function doAction(action,details={}){
    if(action==='close')return close();
    if(action==='retry')return init();
    if(!state)throw new Error('工作区尚未加载，请稍后重试。');
    if(action==='runtime'){runtime=await api(`${base}/runtime`);renderProfile();const done=state.jobs.filter(j=>j.status==='done'||j.status==='applied');return modal('创作能力检测',`<p>${escape(runtime.note)}</p><p class="panel-note">${escape(runtime.version||'')} · 检测时间 ${datetime(runtime.checkedAt)}</p><p>当前账号任务：${done.length} 次已完成。安装、登录和启用不保证网络与额度；最终以生成记录为准。</p><p class="pui-help">无需 RedFox；登录失效时在终端运行 codex login。</p>`);}
    if(action==='run-capability'){const c=selectedCapability;if(!c)throw new Error('请先选择能力。');if(!c.available)throw new Error('能力源码缺失，请先同步 Skills。');if(c.kind==='layout')return layout();if(c.kind==='archive')return doAction('archive-confirm');if(c.kind==='xhsImage')return doAction('xhs-image-plan');return generate(c.kind);}
    if(action==='xhs-image-plan'){
      await save();const pages=current.xhs.split(/^\s*---\s*$/m).map(s=>s.trim()).filter(Boolean);if(!pages.length)throw new Error('请先生成并采用逐页稿。');
      return modal('确认 AI 图卡',`<form id="xhs-image-form"><p class="panel-note">读者：${escape(current.audience)}。策略：信息先行；风格：notion 手绘知识卡；布局：封面稀疏、内容平衡；配色：暖白深绿；画幅 3:4。</p><p class="pui-help">单次生成 1 张并消耗 Codex 额度。先生成封面，后续页用最新封面作风格参考。请确认稿件，生成后检查文字。</p><label class="pui-field"><span class="pui-label">生成页面</span><select class="pui-control" name="pageIndex">${pages.map((s,i)=>`<option value="${i}" ${i===(details.pageIndex||0)?'selected':''}>第 ${i+1} 页 · ${escape(s.split('\n')[0].replace(/^#+\s*/,''))}</option>`).join('')}</select></label><pre class="candidate">${escape(current.xhs)}</pre><button class="pui-btn pui-btn-primary" type="submit">确认生成</button></form>`);
    }
    if(action==='vault-config'){await saveIfNeeded();return vaultConfig();}
    if(action==='archive-confirm'){
      await saveIfNeeded();const {config:c}=await api(`${base}/obsidian`);if(!c)throw new Error('请先连接 Obsidian 知识库。');
      return modal('归档到 Obsidian',`<p class="panel-note">将在 ${escape(c.output)} 新建本篇快照，包含三平台稿件、来源、复盘和全部成品附件。</p><p class="pui-help">不会覆盖原文件；视频也会复制，请留足磁盘空间。</p><div class="dialog-actions"><button class="pui-btn" data-action="close">取消</button><button class="pui-btn pui-btn-primary" data-action="archive">确认归档</button></div>`);
    }
    if(action==='archive'){
      const button=$('[data-action="archive"]');if(button?.disabled)return;if(button){button.disabled=true;button.textContent='归档中';}
      try{await saveIfNeeded();const result=await api(projectPath('archive'),'POST',{version:current.version});
        return modal('归档完成',`<p class="panel-note">${escape(result.path)}</p><p>已归档 ${result.files} 篇笔记、${result.assets} 个附件。</p><a class="pui-btn pui-btn-primary" href="${escape(result.uri)}">打开 OB</a><p class="pui-help">独立快照，不会自动覆盖 OB 内的修改。</p>`);
      }finally{if(button){button.disabled=false;button.textContent='确认归档';}}
    }
    if(action==='export-recovery'){if(dirty)recoveryDraft=readDraft();if(!recoveryDraft)throw new Error('没有待合并副本。');downloadText(fields.map((f,i)=>`# ${names[i]}\n\n${recoveryDraft[f]||''}`).join('\n\n')+'\n\n# 视频制作设置\n\n'+(recoveryDraft.videoSettings||''),'未合并修改.md');recoverySaved=true;return;}
    if(action==='reload-project'){const p=await api(projectPath());setCurrent(p);close();return modal('合并修改',`<p class="panel-note">已载入最新版本。之前的修改仍可导出，供你手工合并。</p><div class="dialog-actions"><button class="pui-btn" data-action="export-recovery">导出副本</button><button class="pui-btn pui-btn-primary" data-action="close">继续编辑</button></div>`);}
    if(action==='new'){await saveIfNeeded();return newForm();}
    if(action==='import-draft'){await saveIfNeeded();return importForm();}
    if(action==='delivery')return deliveryCheck();
    if(action==='save'){await save();return toast('草稿已保存。');}
    if(action==='draft-both')return startDraftFlow();
    if(action==='layout')return layout();
    if(action==='copy-layout')return copyLayout();
    if(action==='download-layout')return downloadText(layoutHtml,'公众号正文.html','text/html;charset=utf-8');
    if(action==='publish'){await save();return publishForm();}
    if(action==='fans')return modal('更新粉丝总量',`<form id="fans-form"><p class="panel-note">三个平台当前粉丝数相加；同一人可能被重复计算。</p><label class="pui-field"><span class="pui-label">粉丝总量</span><input name="fans" type="number" min="0" max="100000000" step="1" class="pui-control" value="${state.profile.fans??''}" placeholder="未填"></label><button class="pui-btn pui-btn-primary" type="submit">保存数据</button></form>`);
    if(action==='image-brief'){
      const title=$('[data-field="title"]').value;
      const prompt=`用途：AI 实测内容的封面或配图。主题：${title}。画幅：${$('#aspect').value}。色调：${$('#palette').value}。风格：${$('#image-style').value}。构图：一个清晰视觉主体，留出 40% 呼吸空间；用台灯照亮卡片或步骤，表达从想法到作品。不要工作台界面、虚构工具截图、人物肖像、商标、水印。默认不含文字。若加入标题，只能使用“${title}”，确保文字准确。`;
      $('[data-field="imagePrompt"]').value=prompt;dirty=true;return updateStatus();
    }
    if(action==='example')return create({title:'一篇 AI 实测，先回答这三个问题',brief:'这是演示素材，不是已完成的实测。目标读者：第一次写 AI 工具实测的新手。要验证：能否把一个明确问题、可复现步骤与真实结果讲清楚。未知：具体工具、成本、实际截图和测试结果。'}).then(async()=>{
      $('[data-field="wechat"]').value='AI 工具很多，**能解决哪个具体问题**才是读者想知道的。\n\n## 先确定问题\n\n不要从功能列表开始。先写下谁在什么场景遇到了什么困难。\n\n## 留下可复现步骤\n\n1. 说明工具版本和成本。\n2. 录下关键操作。\n3. 保存结果和失败案例。\n\n## 结语\n\n这是一篇演示稿，还没有具体测试结果。发布前补齐工具、截图与实际结论。';
      $('[data-field="xhs"]').value='## 实测先问三件事\n功能再多，也要回答一个具体问题。\n\n---\n\n## 谁真的需要\n- 写清读者和使用场景。\n- 不把所有人都当作目标用户。\n\n---\n\n## 怎样复现\n- 记录版本与成本。\n- 录下关键步骤。\n- 保存失败案例。\n\n---\n\n## 结果是什么\n- 对照最初的问题。\n- 说清适用条件。\n- 没测过的部分标明待验证。';
      $('[data-field="video"]').value='| 段落 | 口播 | 需录画面 | 核对 |\n| --- | --- | --- | --- |\n| 开头 0～10 秒 | 先展示一个真实结果 | 实际输出，待录 | 不用演示图冒充结果 |\n| 步骤 10～70 秒 | 讲清最短操作路径 | 关键操作，待录 | 标明版本、成本 |\n| 总结 70～90 秒 | 说明适合谁，不适合谁 | 前后对照，待录 | 未测部分明确说明 |';dirty=true;await save();tab('wechat');toast('示例已载入，发布前请替换成你的真实素材。');
    });
  }
  root.addEventListener('click',async e=>{
    const b=e.target.closest('button,a[data-action]');if(!b || !root.contains(b))return;
    e.stopPropagation();
    if(operations){toast('当前操作尚未完成，请稍后重试。');return;}
    operations++;
    try{
      if(b.dataset.action)await doAction(b.dataset.action);
      else if(b.dataset.tab){tab(b.dataset.tab);if(b.dataset.tab==='knowledge')await loadKnowledge();}
      else if(b.dataset.project){await saveIfNeeded();setCurrent(await api(`${base}/projects/${b.dataset.project}`));if(draftFlow?.projectId===current.id)await safeAdvanceDraftFlow();if(!$('[data-panel="knowledge"]').hidden)await loadKnowledge();}
      else if(b.dataset.topic){await saveIfNeeded();const r=await api(projectPath('topic-create'),'POST',{jobId:b.dataset.topic,index:Number(b.dataset.index)});if(!state.projects.some(p=>p.id===r.project.id))state.projects.unshift(r.project);setCurrent(r.project);tab('materials');close();toast(r.reused?'已打开原选题；可生成双平台初稿。':'选题已创建，点击上方按钮生成双平台初稿。');}
      else if(b.dataset.delivery){await save();const result=await api(projectPath('export-platform'),'POST',{platform:b.dataset.delivery,version:current.version});downloadText(result.html,`${current.title.replace(/[\\/:*?"<>|]/g,'-')}-${b.dataset.delivery}-发布包.html`,'text/html;charset=utf-8');toast(result.note);}
      else if(b.dataset.note)await notePreview(b.dataset.note);
      else if(b.dataset.noteSelect)await selectNote(b.dataset.noteSelect);
      else if(b.dataset.noteRemove)await selectNote(b.dataset.noteRemove,true);
      else if(b.dataset.noteDraft){await saveIfNeeded();modal('导入候选稿',`<form id="vault-draft" data-path="${escape(b.dataset.noteDraft)}"><p class="panel-note">原稿不会直接覆盖；导入后需在生成记录中确认采用。</p><label class="pui-field"><span class="pui-label">稿件类型</span><select name="kind" class="pui-control"><option value="master">事实母稿</option><option value="wechat">公众号</option><option value="xhs">小红书</option><option value="douyinPhoto">抖音图文</option><option value="video">视频脚本</option></select></label><button class="pui-btn pui-btn-primary" type="submit">导入稿件</button></form>`);}
      else if(b.dataset.retry){const j=state.jobs.find(j=>j.id===b.dataset.retry);if(!j?.method)throw new Error('重试任务不存在。');await generate(j.kind,{draftField:j.method.draftField,platform:j.method.platform});}
      else if(b.dataset.kind==='xhsImage')await doAction('xhs-image-plan',{pageIndex:Number(b.dataset.pageIndex||0)});
      else if(b.dataset.kind)await generate(b.dataset.kind);
      else if(b.dataset.preview)preview(b.dataset.preview);
      else if(b.dataset.export){await save();downloadText(current[b.dataset.export],`${current.title.replace(/[\\/:*?"<>|]/g,'-')}-${b.dataset.export}.md`);}
      else if(b.dataset.copyResult)await copyText(state.jobs.find(j=>j.id===b.dataset.copyResult).result);
      else if(b.dataset.apply){if(dirty)throw new Error('编辑器中有未保存修改，请复制结果后手工合并。');const job=state.jobs.find(j=>j.id===b.dataset.apply);const p=await api(projectPath('apply'),'POST',{jobId:b.dataset.apply,version:current.version});job.status='applied';state.projects=state.projects.map(x=>x.id===p.id?p:x);setCurrent(p);close();const field=job.kind==='draftImport'?Object.keys(job.draft)[0]:job.kind;tab(({imagePrompt:'images',master:'materials',wechatPack:'wechat',xhsPack:'xhs',douyinPack:'douyin',douyinPhoto:'douyin',videoPack:'video'})[field]||field);toast('候选稿已采用。');}
      else if(b.dataset.insert){const input=$('[data-field="wechat"]');input.value+=`\n\n![配图](${b.dataset.insert})\n`;dirty=true;updateStatus();tab('wechat');toast('已插入正文，请保存草稿。');}
      else if(b.dataset.observe){await save();observeForm(b.dataset.observe);}
    }catch(err){toast(err.message);}finally{operations--;}
  },{signal:lifetime.signal});
  root.addEventListener('change',e=>{if(['assistant-kind','assistant-target','assistant-platform'].includes(e.target.id))assistantDescription();},{signal:lifetime.signal});
  root.addEventListener('input',e=>{if((e.target.dataset.field||e.target.closest('#video-render-form'))&&current){dirty=true;if(recoveryDraft)recoverySaved=false;$('#delivery-summary').innerHTML='<p class="muted">稿件已修改，请重新检查成品。</p>';updateStatus();$$('[data-method-version]').forEach(n=>n.textContent='稿件有修改，请重新核对建议。');if(e.target.dataset.field==='xhs')renderJobs();}},{signal:lifetime.signal});
  root.addEventListener('keydown',e=>{
    if(!e.target.dataset.tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const tabs=$$('[data-tab]');const i=tabs.indexOf(e.target);
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus();tabs[next].click();
  },{signal:lifetime.signal});
  root.addEventListener('submit',async e=>{
    e.preventDefault();e.stopPropagation();if(operations){toast('当前操作尚未完成，请稍后重试。');return;}operations++;const f=e.target;const values=Object.fromEntries(new FormData(f));const button=f.querySelector('button[type=submit]');if(button)button.disabled=true;
    try{
      if(f.id==='create-form')await create(values);
      else if(f.id==='assistant-form'){const c=capabilities.find(c=>c.kind===values.kind&&c.assistant);if(!c?.available)throw new Error('助手方法未就绪，请先同步来源。');await generate(values.kind,{draftField:values.draftField,platform:$('#assistant-platform').value});}
      else if(f.id==='draft-import-form'){const j=await api(projectPath('draft-import'),'POST',{...values,version:current.version});state.jobs.unshift(j);renderJobs();preview(j.id);toast('已导入候选稿，请核对后采用。');}
      else if(f.id==='video-render-form'){
        await save();const input={recordingId:values.recordingId,narrationId:values.narrationId,aspect:values.aspect,start:Number(values.start),version:current.version};if(values.end!=='')input.end=Number(values.end);
        const env=await api(`${base}/video-runtime`);$('#video-runtime-status').textContent=env.note+(env.subtitles?` 字幕：${env.subtitlesEngine}。`:'');if(!env.available)throw new Error(env.note);
        const j=await api(projectPath('video-render'),'POST',input);state.jobs.unshift(j);state.busy=true;renderJobs();toast('正在本地生成成片，原始素材不会覆盖。');schedulePoll();
      }
      else if(f.id==='xhs-image-form'){await generate('xhsImage',{pageIndex:Number(values.pageIndex)});close();}
      else if(f.id==='vault-form'){const connected=await api(`${base}/obsidian`,'PUT',{...values,scopes:values.scopes.split('\n').map(s=>s.trim()).filter(Boolean)});close();toast(`已连接知识库，范围内有 ${connected.count} 篇笔记。`);if(current){tab('knowledge');await loadKnowledge();}}
      else if(f.id==='vault-search')await loadKnowledge(values.q);
      else if(f.id==='vault-draft'){const j=await api(projectPath('knowledge-draft'),'POST',{path:f.dataset.path,kind:values.kind,version:current.version});state.jobs.unshift(j);renderJobs();preview(j.id);toast('已导入候选稿，请核对后采用。');}
      else if(f.id==='fans-form'){state.profile=await api(`${base}/profile`,'PUT',{fans:values.fans===''?null:Number(values.fans)});renderProfile();close();toast('粉丝总量已更新。');}
      else if(f.id==='publish-form'){const p=await api(projectPath('publish'),'POST',{...values,version:current.version});setCurrent(p);close();toast('作品已登记。');}
      else if(f.id==='observe-form'){const data={...values,publicationId:f.dataset.publication,version:current.version};['views','likes','saves','follows'].forEach(k=>data[k]=values[k]===''?null:Number(values[k]));setCurrent(await api(projectPath('observe'),'POST',data));close();toast('表现已记录。');}
    }catch(err){toast(err.message);}
    finally{operations--;if(button)button.disabled=['video-render-form','assistant-form'].includes(f.id)&&Boolean(state?.busy);if(f.id==='assistant-form')assistantDescription();}
  },{signal:lifetime.signal});
  root.addEventListener('change',async e=>{
    if(e.target.id==='draft-file'){
      const file=e.target.files[0];if(!file)return;try{if(file.size>200*1024||! /\.(md|txt)$/i.test(file.name))throw new Error('请选择不超过 200 KB 的 Markdown 或 TXT。');const content=await file.text();if(content.includes('\u0000')||content.length>60000)throw new Error('文件不是有效文本或正文超限。');$('#draft-import-form [name=content]').value=content;}catch(err){toast(err.message);}return;
    }
    const kind={'recording-file':'recording','narration-file':'narration'}[e.target.id];if(!kind)return;
    const file=e.target.files[0];if(!file)return;if(operations){e.target.value='';return toast('当前操作尚未完成。');}operations++;
    try{await save();if(file.size>(kind==='recording'?200:30)*1024*1024)throw new Error('素材文件超过大小限制。');const ext=file.name.split('.').pop().toLowerCase(),mime=kind==='recording'?({mp4:'video/mp4',mov:'video/quicktime'})[ext]:({mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4'})[ext];if(!mime)throw new Error('录屏支持 MP4、MOV；配音支持 MP3、WAV、M4A。');const r=await fetch(projectPath(kind),{method:'POST',headers:{'Content-Type':mime},body:file,signal:lifetime.signal});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'素材导入失败。');state.jobs.unshift(j.data);renderJobs();$(kind==='recording'?'#recording-select':'#narration-select').value=j.data.id;dirty=true;updateStatus();toast('素材已导入并检查，可设置截取范围后生成成片。');}catch(err){toast(err.message);}finally{operations--;e.target.value='';}
  },{signal:lifetime.signal});
  $('#image-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;if(operations){e.target.value='';return toast('当前操作尚未完成。');}operations++;
    try{await save();if(file.size>1048576)throw new Error('导入图片不能超过 1 MB，请先压缩。');const encoded=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(new Error('读取图片失败。'));r.readAsDataURL(file);});const j=await api(projectPath('import'),'POST',{base64:encoded});state.jobs.unshift(j);renderJobs();toast('原图已导入。');}catch(err){toast(err.message);}finally{operations--;e.target.value='';}
  },{signal:lifetime.signal});
  $('#video-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;if(operations){e.target.value='';return toast('当前操作尚未完成。');}operations++;
    try{await save();if(file.size>100*1024*1024)throw new Error('成片不能超过 100 MB。');const r=await fetch(projectPath('footage'),{method:'POST',headers:{'Content-Type':'video/mp4'},body:file,signal:lifetime.signal});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'导入失败。');state.jobs.unshift(j.data);renderJobs();toast('成片已归档。');}catch(err){toast(err.message);}finally{operations--;e.target.value='';}
  },{signal:lifetime.signal});
  const beforeUnload=e=>{if((dirty && !recoverySaved)||(recoveryDraft&&!recoverySaved)||operations){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',beforeUnload);
  async function beforeLeave(){
    if(operations){toast('当前操作尚未完成，请稍后切换。');return false;}
    if(recoveryDraft){
      if(recoverySaved)return true;
      toast('请先导出未合并修改，再切换页面。');return false;
    }
    try{await saveIfNeeded();return true;}catch(e){toast('切页前保存失败：'+e.message);return false;}
  }
  function dispose(){disposed=true;clearTimeout(pollTimer);clearTimeout(toastTimer);lifetime.abort();window.removeEventListener('beforeunload',beforeUnload);if($('#dialog').open)$('#dialog').close();}
  async function init(){
    $('#workspace-loading').hidden=false;$('#workspace-error').hidden=true;
    try{
      [state,capabilities,runtime]=await Promise.all([api(base),api(`${base}/capabilities`),api(`${base}/runtime`)]);draftFlow=readDraftFlow();selectedCapability=capabilities.find(c=>c.id===options.capability);renderProfile();renderList();showCapability();renderAssistant();
      const selected=state.projects.find(p=>p.id===options.projectId)||state.projects.find(p=>p.id===localStorage.getItem('creator-project'))||state.projects[0];
      if(options.projectId&&!state.projects.some(p=>p.id===options.projectId))toast('关联稿件不存在，请选择已有内容。');
      if(selected){setCurrent(selected);const name=options.projectId?'materials':localStorage.getItem('creator-tab')||'materials';if($$('[data-tab]').some(b=>b.dataset.tab===name)){tab(name);if(name==='knowledge')await loadKnowledge();}}
      else{$('#editor').hidden=true;$('#empty').hidden=false;}
      if(selectedCapability&&selected){const previousTarget=$('#assistant-target').value;tab(selectedCapability.tab);if(selectedCapability.assistant){$('#assistant-target').value=previousTarget;assistantDescription();}if(selectedCapability.tab==='knowledge')await loadKnowledge();toast('已选择能力，请确认素材后运行。');}
      schedulePoll();
      if(selected&&options.autoDrafts)await startDraftFlow();
      else if(selected&&draftFlow?.projectId===selected.id)await safeAdvanceDraftFlow();
      if(options.new)newForm();
    }catch(err){
      if(disposed)return;
      $('#workspace-error').hidden=false;$('#workspace-error-text').textContent=err.message;
    }finally{$('#workspace-loading').hidden=true;}
  }
  const ready=init();
  return {beforeLeave,dispose,ready};
}
