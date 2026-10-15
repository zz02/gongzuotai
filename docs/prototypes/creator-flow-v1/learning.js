/* Collection and explicit writing-preference learning: browser-only simulation. */
window.CreatorLearning = function(h) {
  const {state,esc,input,select,button,panel,head,modal,close,notify,save,render,route,current,draft,fmt,uid}=h;
  state.knowledge??=[];state.styleRules??=[];state.editReviews??=[];
  let clipping=null,review=null;
  const scopeLabel=s=>({article:'仅本篇',wechat:'公众号',xhs:'小红书',douyin:'抖音图文',all:'三平台通用'})[s]||s;
  const sameSource=(n,s)=>{if(n.sourceId===s.id)return true;try{return Boolean(s.url&&n.url&&new URL(s.url).href===new URL(n.url).href);}catch{return false;}};
  function comparison(before,after){
    const a=Array.from(before),b=Array.from(after);let left=0,right=0;
    while(left<Math.min(a.length,b.length)&&a[left]===b[left])left++;
    while(right<Math.min(a.length,b.length)-left&&a[a.length-1-right]===b[b.length-1-right])right++;
    const excerpt=(v,tag)=>{const end=v.length-right,changed=v.slice(left,end);return `${left>60?'…':''}${esc(v.slice(Math.max(0,left-60),left).join(''))}<${tag}>${esc(changed.slice(0,1200).join('')||'（此处没有文字）')}${changed.length>1200?'…':''}</${tag}>${esc(v.slice(end,end+60).join(''))}${right>60?'…':''}`;};
    return `<div class="compare-grid learning-comparison"><section><h3>修改前</h3><div class="unified-plain">${excerpt(a,'del')}</div></section><section><h3>修改后</h3><div class="unified-plain">${excerpt(b,'ins')}</div></section></div><details class="context-block"><summary>查看完整对照</summary><h3>修改前全文</h3><pre class="unified-plain">${esc(before||'（空稿）')}</pre><h3>修改后全文</h3><pre class="unified-plain">${esc(after)}</pre></details>`;
  }
  const safeName=s=>s.replace(/[\\/:*?"<>|\[\]#]/g,'-').slice(0,80);
  const ruleText=r=>`# ${r.title}\n\n偏好：${r.text}\n适用范围：${scopeLabel(r.scope)}\n状态：${r.enabled?'已启用':'未启用'}\n\n修改前：\n${r.before}\n\n修改后：\n${r.after}\n\n修改原因：${r.reason}\n来源内容：${r.originTitle}\n记录时间：${r.at}`;
  function syncRule(r){const note=state.knowledge.find(n=>n.ruleId===r.id);if(note)note.text=ruleText(r);}
  function collect(source){clipping=source;const found=state.knowledge.find(n=>sameSource(n,source));if(found)return modal('已收藏到 OB（模拟）',`<p>${esc(found.path)}</p><p>不会重复创建笔记。需要补充判断可在笔记详情查看。</p>${button('查看笔记','learn-open-note',true,`data-id="${found.id}"`)}`);
    modal('收藏到 OB（模拟）',`<form id="learn-collect-form">${input('笔记标题','title',source.title)}${input('原文链接','url',source.url||'')}${input('收藏理由','reason','',true)}${select('保存内容','mode',[['summary','链接、摘要与本人判断'],['excerpt','选定摘录与本人判断']],'summary')}${input('摘录内容','excerpt',source.text||'',true)}${input('目标目录','folder','点灯创作/信源收藏')}<p class="pui-help">仅保存你选定的内容；未读全文不标已核验。</p><p>来源：${esc(source.group||'RedFox')} · 发布时间：${esc(source.published||'来源未提供')}<br>原型无真实链接时可留空，明确标“演示来源”。</p><label class="pui-checkbox"><input name="fail" type="checkbox">模拟 OB 无法写入</label><p class="pui-error" id="learn-error" role="alert"></p><button class="pui-btn pui-btn-primary" type="submit">确认收藏</button></form>`);
  }
  function noteDetail(id){const n=state.knowledge.find(n=>n.id===id);if(!n)return;modal(n.title,`<p class="unified-meta">${esc(n.path)} · 浏览器模拟笔记</p><div class="unified-plain">${esc(n.text)}</div><p>知识与文风分开使用：外部资料不能自动当成个人文风。</p><div class="inline-actions">${button('用于创作','learn-use-note',true,`data-id="${n.id}"`)}${button('关闭','close')}</div>`);}
  function reviewForm(){const d=draft(),w=current();if(!d)return notify('先选择一篇稿件。');const before=d.revisionBase?.body;
    if(before===undefined)return modal('还没有修改对照',`<p>先写入或采用一版正文，再修改它。系统保留修改前后的版本，不把单次输入当文风。</p>${button('开始记录','learn-baseline',true)}`);
    if(before===d.body)return notify('正文尚无新的修改，不重复记录经验。');
    review={workId:w.id,platform:state.platform,before,after:d.body,title:w.title,token:uid()};
    modal('复盘这次修改',`<form id="learn-review-form"><p>第一步：看差异，区分“改事实”和“改表达”。</p>${comparison(before,d.body)}${select('修改类型','kind',[['article','仅本篇调整'],['fact','事实纠错'],['expression','表达偏好'],['format','平台格式']],'article')}${input('修改原因','reason','',true)}${input('偏好规则','rule','',true)}${select('适用范围','scope',[['article','仅本篇'],['wechat','公众号'],['xhs','小红书'],['douyin','抖音图文'],['all','三平台通用']],'article')}<details class="context-block"><summary>检查已有偏好</summary>${state.styleRules.filter(r=>r.enabled).map(r=>`<p>${esc(scopeLabel(r.scope))} · ${esc(r.text)}</p>`).join('')||'<p>暂无启用的偏好。</p>'}<p>如果要求相反，先不启用；去“我的文风”停用旧偏好后再启用。</p></details><p class="pui-help">只有表达偏好可启用为文风规则；其他修改只存经验。</p><label class="pui-checkbox"><input name="enable" type="checkbox">确认后用于所选范围的后续写作</label><label class="pui-checkbox"><input name="fail" type="checkbox">模拟 OB 保存失败</label><p class="pui-error" id="learn-error" role="alert"></p><button class="pui-btn pui-btn-primary" type="submit">保存经验</button></form>`);
  }
  function applicable(platform=state.platform,workId=current()?.id){return state.styleRules.filter(r=>r.enabled&&(r.scope==='all'||r.scope===platform||r.scope==='article'&&r.workId===workId));}
  function runContext(){const list=applicable();return `<fieldset><legend>个人文风依据</legend><p>引用材料 ${current()?.refs.length||0} 份；文风只使用你已确认的偏好。</p>${list.length?list.map(r=>`<label class="unified-reference"><input name="style-rule" type="checkbox" value="${r.id}" checked><span>${esc(r.text)}<br><span class="unified-meta">来自《${esc(r.originTitle)}》的改稿 · ${esc(r.at)}</span></span></label>`).join(''):'<p class="unified-meta">暂无适用的已确认偏好，按本次要求写，不假装已经学会你的文风。</p>'}</fieldset>`;}
  function view(){return head('我的文风','修改记录不是写作规则；只有本人确认的偏好才参与后续写作。',`<a class="pui-btn" href="#knowledge">返回知识库</a>`)+panel('表达偏好',state.styleRules.length?`<div class="unified-list">${state.styleRules.map(r=>`<article><div><span class="pui-tag">${r.enabled?'已启用':'未启用'}</span><h2>${esc(r.text)}</h2><p>${({article:'仅本篇',wechat:'公众号',xhs:'小红书',douyin:'抖音图文',all:'三平台通用'})[r.scope]} · 来自《${esc(r.originTitle)}》</p><p class="unified-meta">${esc(r.at)} · 不修改历史稿件</p></div><div class="inline-actions">${button('查看依据','learn-rule-detail',false,`data-id="${r.id}"`)}${button(r.enabled?'停用偏好':'启用偏好','learn-toggle',false,`data-id="${r.id}"`)}</div></article>`).join('')}</div>`:'<p>还没有确认的偏好。写完一篇、亲手修改，再复盘这次修改。</p>')+panel('修改经验记录',state.editReviews.map(r=>`<div class="skill-row"><h3>${esc(r.title)}</h3><p>${esc(r.kindLabel)} · ${esc(r.at)} · ${esc(r.reason)}</p>${button('查看记录','learn-review-detail',false,`data-id="${r.id}"`)}</div>`).join('')||'<p>尚无记录；不会自动扫描你的整个知识库。</p>');}
  function mount(v){if(v==='knowledge')document.querySelector('#screen .unified-toolbar')?.insertAdjacentHTML('beforeend','<a class="pui-btn" href="#style">我的文风</a>');if(v==='editor'&&draft()){
      document.querySelector('#screen .unified-tabs[aria-label]')?.insertAdjacentHTML('afterend',`<div class="unified-toolbar">${button('复盘修改','learn-review')}<a class="pui-link" href="#style">我的文风 · ${applicable().length} 条适用偏好</a></div>`);
      if(draft().lastStyleUse?.length)document.querySelector('#screen .unified-toolbar')?.insertAdjacentHTML('afterend',`<p class="unified-meta">本次模拟生成采用：${draft().lastStyleUse.map(r=>esc(r.text)).join('；')}。可在“我的文风”查看来源或停用。</p>`);
    }}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="learn-"]');if(!b||b.disabled)return;const a=b.dataset.action,id=b.dataset.id;
    if(a==='learn-collect'){const r=h.findSource(id);if(r)return collect(r);}
    if(a==='learn-open-note')return noteDetail(id);
    if(a==='learn-use-note'){const n=state.knowledge.find(n=>n.id===id);return h.handoff([n]);}
    if(a==='learn-review')return reviewForm();
    if(a==='learn-baseline'){draft().revisionBase={body:draft().body,at:fmt()};save();close();return notify('已记录当前稿，修改后可复盘。');}
    if(a==='learn-toggle'){const r=state.styleRules.find(r=>r.id===id);if(!r)return;if(!r.enabled)return modal('确认启用偏好',`<p>${esc(r.text)}</p><h3>已启用的偏好</h3>${state.styleRules.filter(x=>x.enabled&&(x.scope==='all'||r.scope==='all'||x.scope===r.scope)).map(x=>`<p>${esc(scopeLabel(x.scope))} · ${esc(x.text)}</p>`).join('')||'<p>暂无同范围偏好。</p>'}<p>如有冲突，请先关闭此窗口并停用旧偏好。</p>${button('确认启用','learn-enable',true,`data-id="${r.id}"`)}`);r.enabled=false;syncRule(r);if(!save()){r.enabled=true;syncRule(r);return notify('未保存，偏好状态保持不变。');}return render();}
    if(a==='learn-enable'){const r=state.styleRules.find(r=>r.id===id);if(!r)return;r.enabled=true;syncRule(r);if(!save()){r.enabled=false;syncRule(r);return notify('未保存，偏好仍未启用。');}close();return render();}
    if(a==='learn-rule-detail'){const r=state.styleRules.find(r=>r.id===id);return modal('偏好依据',`<div class="unified-plain">${esc(ruleText(r))}</div><p>后续新任务按当前开关使用，已有稿不变。</p>`);}
    if(a==='learn-review-detail'){const r=state.editReviews.find(r=>r.id===id);return modal('修改经验',`<h3>${esc(r.title)}</h3><p>${esc(r.reason)}</p>${comparison(r.before,r.after)}<p>${esc(r.path)} · 模拟保存</p>`);}
  });
  document.addEventListener('submit',e=>{const f=e.target;if(!['learn-collect-form','learn-review-form'].includes(f.id))return;e.preventDefault();const v=new FormData(f),get=k=>String(v.get(k)||'').trim(),error=t=>{document.querySelector('#learn-error').textContent=t;};
    if(v.has('fail'))return error('模拟 OB 保存失败，内容保留，可重试。');
    if(f.id==='learn-collect-form'){
      if(!get('title')||!get('reason'))return error('请填写标题和收藏理由。');if(!get('folder')||get('folder').includes('..'))return error('请填写有效的目标目录。');
      if(get('url')){try{if(!['http:','https:'].includes(new URL(get('url')).protocol))throw Error();}catch{return error('原文链接需要完整的 http 或 https 地址。');}}
      if(state.knowledge.some(n=>sameSource(n,{...clipping,url:get('url')})))return error('该来源已收藏，不重复创建。');
      const n={id:uid(),sourceId:clipping.id,group:'OB 收藏',title:get('title'),url:get('url'),path:get('folder')+'/'+safeName(get('title'))+'.md',at:fmt(),text:`# ${get('title')}\n\n来源：${clipping.group||'RedFox'}\n原文：${get('url')||'演示来源，无真实链接'}\n发布时间：${clipping.published||'来源未提供'}\n采集时间：${fmt()}\n核验状态：未核验\n\n## ${get('mode')==='excerpt'?'选定摘录':'资料摘要'}\n${get('excerpt')}\n\n## 本人收藏理由\n${get('reason')}`};
      if(state.knowledge.some(x=>x.path===n.path))n.path=n.path.replace(/\.md$/, '-'+n.id.slice(0,8)+'.md');state.knowledge.push(n);if(!save()){state.knowledge.pop();return error('模拟存档未保存，请下载备份或重试。');}return noteDetail(n.id);
    }
    const d=draft();if(!review||current()?.id!==review.workId||state.platform!==review.platform||d.body!==review.after)return error('文稿已变化，请关闭后重新复盘。');
    if(!get('reason'))return error('请说明为什么这样修改。');if(v.has('enable')&&get('kind')!=='expression')return error('事实纠错、格式和本篇调整不自动变成文风。');if(get('kind')==='expression'&&!get('rule'))return error('请写清可复用的表达偏好。');
    if(state.editReviews.some(r=>r.token===review.token))return error('这次修改已保存。');
    if(get('kind')==='expression'&&state.styleRules.some(r=>r.text===get('rule')&&r.scope===get('scope')&&(r.scope!=='article'||r.workId===review.workId)))return error('同范围已有这条偏好，请勿重复新增。');
    const previous={knowledge:state.knowledge.slice(),rules:state.styleRules.slice(),reviews:state.editReviews.slice(),base:d.revisionBase};
    const kindLabel={article:'仅本篇调整',fact:'事实纠错',expression:'表达偏好',format:'平台格式'}[get('kind')];
    const r={...review,id:uid(),kind:get('kind'),kindLabel,reason:get('reason'),at:fmt(),path:'点灯创作/修改经验/'+review.token+'.md'};state.editReviews.push(r);
    state.knowledge.push({id:uid(),group:'修改经验',title:review.title+' · '+kindLabel,path:r.path,text:`来源内容：${r.title}\n平台：${scopeLabel(r.platform)}\n记录时间：${r.at}\n\n修改前：\n${r.before}\n\n修改后：\n${r.after}\n\n原因：${r.reason}\n分类：${kindLabel}`});
    if(get('kind')==='expression'){const rule={id:uid(),title:review.title+' · 文风偏好',text:get('rule'),before:r.before,after:r.after,reason:r.reason,scope:get('scope'),enabled:v.has('enable'),workId:review.workId,originTitle:review.title,at:fmt()};state.styleRules.push(rule);state.knowledge.push({id:uid(),ruleId:rule.id,group:'文风偏好',title:rule.title,path:'点灯创作/文风偏好/'+rule.id+'.md',text:ruleText(rule)});}
    d.revisionBase={body:d.body,at:fmt()};if(!save()){state.knowledge=previous.knowledge;state.styleRules=previous.rules;state.editReviews=previous.reviews;d.revisionBase=previous.base;return error('模拟存档未保存，对照保留，请重试。');}close();render();notify('修改经验已模拟保存；下一次写作前可查看适用偏好。');
  });
  return {collect,view,mount,runContext,applicable};
};
