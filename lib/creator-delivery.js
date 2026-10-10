// Shared production contract: one fact draft, separate platform manuscripts.
const crypto = require('crypto');
const { cardPages, esc } = require('./workbench-render');
const LIMITS = { master:60000, wechatTitle:120, wechatSummary:300, xhsTitle:60, xhsCaption:4000, douyinPhoto:12000, douyinTitle:120, douyinCaption:4000, videoTitle:120, videoCaption:4000, subtitles:16000, videoSettings:2000 };
const PACKS = {
  wechatPack:{wechatTitle:120,wechatSummary:300,wechat:60000},
  xhsPack:{xhsTitle:60,xhsCaption:4000,xhs:12000},
  douyinPack:{douyinTitle:120,douyinCaption:4000,douyinPhoto:12000},
  videoPack:{videoTitle:120,videoCaption:4000,video:30000},
};
const hash = text => crypto.createHash('sha256').update(text || '').digest('hex');
function bad(message){const e=new Error(message);e.status=400;throw e;}
function parsePack(kind, result) {
  if(!Object.hasOwn(PACKS,kind))bad('稿件类型无效。');const contract=PACKS[kind];
  let raw;try{raw=JSON.parse(result.trim().replace(/^```(?:json)?\s*\n/, '').replace(/\n```$/, ''));}catch{bad('生成结果不是完整的平台稿，请重试；原稿未改动。');}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))bad('平台稿结构无效。');
  const out={};for(const [key,max] of Object.entries(contract)){
    if(typeof raw[key]!=='string'||!raw[key].trim()||raw[key].length>max)bad('平台稿缺少标题、正文或发布说明，或内容超限。');
    out[key]=raw[key];
  }
  if(out.xhs)cardPages(out.xhs);if(out.douyinPhoto)cardPages(out.douyinPhoto);
  return out;
}
function parseTopics(result){
  let raw;try{raw=JSON.parse(result.trim().replace(/^```(?:json)?\s*\n/,'').replace(/\n```$/,''));}catch{bad('选题结果格式不完整，请重试。');}
  if(!Array.isArray(raw)||raw.length<1||raw.length>3)bad('选题建议需要 1～3 个选题。');
  return raw.map(p=>{const item={};for(const [key,max] of Object.entries({title:120,problem:500,action:2000,reason:1000})){if(typeof p?.[key]!=='string'||!p[key].trim()||p[key].length>max)bad('选题缺少读者问题或验证动作。');item[key]=p[key];}return item;});
}
// Only use the complete, current series. Never silently mix old drafts or covers.
function imagesFor(p,jobs,platform){
  const field=platform==='xhs'?'xhs':'douyinPhoto', key=hash(p[field]);
  const pages=cardPages(p[field]);
  const ready=jobs.filter(j=>j.projectId===p.id&&j.status==='done'&&j.seriesKey===key);
  const card=ready.find(j=>j.kind===(platform==='xhs'?'cards':'douyinCards'));
  if(card){const files=card.assets.filter(f=>f.endsWith('.png'));if(files.length===pages.length)return files.map(file=>({jobId:card.id,file}));}
  if(platform==='xhs'){
    const cover=ready.find(j=>j.kind==='xhsImage'&&j.pageIndex===0);
    const images=pages.map((_,i)=>ready.find(j=>j.kind==='xhsImage'&&j.pageIndex===i&&(i===0||j.coverJobId===cover?.id)));
    if(images.every(Boolean))return images.map(j=>({jobId:j.id,file:j.assets.find(f=>/\.(png|jpe?g|webp)$/i.test(f))}));
  }
  return [];
}
function readiness(p,jobs){
  const item=(platform,title,body,caption)=>{
    const missing=[];if(!title?.trim())missing.push('发布标题');if(!body?.trim())missing.push('正文内容');if(!caption?.trim())missing.push(platform==='公众号'?'文章摘要':'发布配文');
    let images=[];if(platform!=='公众号'&&body?.trim()){try{images=imagesFor(p,jobs,platform==='小红书'?'xhs':'douyin');if(!images.length)missing.push('当前稿图片');}catch(e){missing.push(e.message);}}
    return {platform,missing,images,ready:missing.length===0};
  };
  return [item('公众号',p.wechatTitle,p.wechat,p.wechatSummary),item('小红书',p.xhsTitle,p.xhs,p.xhsCaption),item('抖音图文',p.douyinTitle,p.douyinPhoto,p.douyinCaption)];
}
function publishHtml(p,platform,body,images=[]){
  const title=platform==='公众号'?p.wechatTitle:platform==='小红书'?p.xhsTitle:p.douyinTitle;
  const caption=platform==='公众号'?p.wechatSummary:platform==='小红书'?p.xhsCaption:p.douyinCaption;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>${esc(title)}</title><style>body{margin:0;background:#f6f7f3;color:#243d32;font-family:'PingFang SC',sans-serif;line-height:1.8}main{max-width:760px;margin:auto;padding:24px}h1{font-size:26px;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;padding:20px;background:white}img{width:100%;height:auto;display:block;margin:24px 0}section{overflow-wrap:anywhere}small{color:#69766e}</style><main><small>点灯的曾曾 / ${esc(platform)} / 草稿第 ${p.version} 版</small><h1>${esc(title)}</h1><h2>${platform==='公众号'?'文章摘要':'发布配文'}</h2><pre>${esc(caption)}</pre>${platform==='公众号'?`<h2>排版正文</h2>${body}`:`<h2>有序图文</h2>${images.map((src,i)=>`<img src="${src}" alt="第 ${i+1} 页">`).join('')}<h2>逐页原稿</h2><pre>${esc(body)}</pre>`}<p><small>请人工核验事实、图片和链接，再在平台后台发布。此文件不代表已发布。</small></p></main></html>`;
}
module.exports={LIMITS,PACKS,parsePack,parseTopics,hash,imagesFor,readiness,publishHtml};
