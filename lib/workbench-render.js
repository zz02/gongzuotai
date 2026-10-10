const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { marked } = require('marked');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const leaf = s => `<span leaf="">${s}</span>`;
function prose(s) {
  return String(s).replace(/([\u3400-\u9fff])([,;!?])/g, (_, a, b) => a + ({',':'，',';':'；','!':'！','?':'？'}[b]))
    .replace(/"([^"\n]*)"/g, '“$1”').replace(/'/g, '’');
}
function safeUrl(s, image = false) {
  if (/^https?:\/\//i.test(s) || (image && /^\/api\/_\/workbench\/assets\/[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp)$/.test(s))) return esc(s);
  throw new Error('正文包含不支持的链接或图片路径，请使用 HTTP(S) 或工作台图片地址。');
}
function components(rootDir) {
  const file = path.join(rootDir, 'skill-sources/gzh-design/references/theme-graphite-minimal.md');
  if (!fs.existsSync(file)) throw new Error('缺少 gzh-design 组件，请运行 npm run skills:sync。');
  const src = fs.readFileSync(file, 'utf8');
  return (title, n = 0) => {
    const start = src.indexOf(title);
    if (start < 0) throw new Error('排版组件版本不兼容。');
    const rest = src.slice(start).split(/\n---\n/)[0];
    const blocks = [...rest.matchAll(/```html\n([\s\S]*?)\n```/g)];
    if (!blocks[n]) throw new Error('排版组件缺失。');
    return blocks[n][1];
  };
}
async function renderWechat(markdown, profile, rootDir) {
  const component = components(rootDir);
  const paragraph = body => component('## 组件 6 正文段落').replace(leaf('{{正文内容}}'), body);
  const inline = tokens => (tokens || []).map(t => {
    if (t.type === 'strong') return `<span style="border-bottom:2px solid #52525B;font-weight:600;color:#27272A;">${inline(t.tokens)}</span>`;
    if (t.type === 'em') return `<span style="font-style:italic;">${inline(t.tokens)}</span>`;
    if (t.type === 'del') return `<span style="text-decoration:line-through;">${inline(t.tokens)}</span>`;
    if (t.type === 'codespan') return `<span style="font-family:Consolas,monospace;background:#F4F4F5;padding:1px 4px;">${leaf(esc(t.text))}</span>`;
    if (t.type === 'link') return `<a href="${safeUrl(t.href)}" style="color:#52525B;text-decoration:underline;">${inline(t.tokens)}</a>`;
    if (t.type === 'image') return component('## 组件 14 图片容器').replace('{{图片URL}}', safeUrl(t.href, true)) + (t.text ? paragraph(leaf(esc(prose(t.text)))) : '');
    if (t.type === 'br') return leaf('<br>');
    return t.tokens ? inline(t.tokens) : leaf(esc(prose(t.text ?? t.raw ?? '')));
  }).join('');
  let sectionNumber = 0;
  function blocks(tokens) {
    return tokens.map(t => {
      if (t.type === 'space') return '';
      if (t.type === 'heading') {
        if (t.depth === 1) return paragraph(inline(t.tokens)); // Retain user content; external headline is separate.
        if (t.depth > 2) return component('## 组件 6b 子标题').replace(leaf('{{子标题}}'), inline(t.tokens));
        sectionNumber++;
        const last = /^(结语|小结|最后|总结)/.test(t.text);
        let h = component('## 组件 5 章节标题').replace('>01<', `>${last ? '∞' : String(sectionNumber).padStart(2,'0')}<`).replace('{{ENGLISH TAG}}', last ? 'THE END' : 'FIELD NOTES').replace(leaf('{{中文章节标题}}'), inline(t.tokens)).replace('<!-- 本章节正文内容放在这里 -->', '');
        if (sectionNumber === 1) h = h.replace('margin-top:56px', 'margin-top:16px');
        return (sectionNumber > 1 ? component('## 组件 4 章节分割线') : '') + h;
      }
      if (t.type === 'paragraph' || t.type === 'text') return paragraph(t.tokens ? inline(t.tokens) : leaf(esc(prose(t.text))));
      if (t.type === 'html') return paragraph(leaf(esc(prose(t.text)))); // Never execute user HTML.
      if (t.type === 'blockquote') return `<section style="border-left:3px solid #52525B;padding:12px 20px;margin:0 10px 24px;">${blocks(t.tokens)}</section>`;
      if (t.type === 'list') return `<section style="margin-bottom:24px;">${t.items.map((item,i) => `<section style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:#27272A;color:#fff;font-size:12px;border-radius:50%;flex-shrink:0;">${leaf(t.ordered ? Number(t.start || 1)+i : '•')}</span><section style="flex:1;">${blocks(item.tokens)}</section></section>`).join('')}</section>`;
      if (t.type === 'code') return `<section style="margin:0 0 20px;border-radius:8px;overflow:hidden;background:#F6F8FA;border:1px solid #E5E7EB;border-left:3px solid #52525B;"><section style="padding:7px 14px;border-bottom:1px solid #E5E7EB;"><span style="font-size:12px;color:#71717A;font-family:Consolas,monospace;">${leaf(esc(t.lang || 'CODE'))}</span></section><section style="padding:11px 14px;">${t.text.split('\n').map(line => `<p style="margin:0;font-family:Consolas,monospace;font-size:13px;line-height:1.6;color:#24292F;overflow-wrap:anywhere;">${leaf(esc(line).replace(/ /g,'&#160;').replace(/\t/g,'&#160;&#160;&#160;&#160;') || '<br>')}</p>`).join('')}</section></section>`;
      if (t.type === 'table') {
        const row = (cells,head) => `<tr>${cells.map(c => `<${head?'th':'td'} style="padding:8px 12px;border-bottom:1px solid #E4E4E7;text-align:left;${head?'background:#27272A;color:#fff;':'color:#52525B;'}">${inline(c.tokens)}</${head?'th':'td'}>`).join('')}</tr>`;
        return `<section style="margin:0 10px 24px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead>${row(t.header,true)}</thead><tbody>${t.rows.map(r=>row(r,false)).join('')}</tbody></table></section>`;
      }
      if (t.type === 'hr') return component('## 组件 4 章节分割线');
      throw new Error(`暂不支持这类 Markdown：${t.type}，请转成正文后排版。`);
    }).join('\n');
  }
  const tokens = marked.lexer(markdown, { gfm: true });
  const intro = tokens.find(t => t.type === 'paragraph');
  // An excerpt stays in the body as well; don't silently drop an opening paragraph.
  const excerpt = intro ? intro.text.replace(/[*_`]/g,'').split(/(?<=[。！？])/)[0] : '';
  const quote = intro ? component('## 组件 2 开头引言卡片').replace(leaf('{{金句前段}}'), leaf(esc(prose(excerpt.length>100?excerpt.slice(0,100)+'…':excerpt)))).replace(/\s*<span style="border-bottom:2px solid #52525B;">[\s\S]*?\{\{石墨下划线关键词\}\}[\s\S]*?<\/span><\/span>/, '').replace(leaf('{{金句收尾}}'), '').replace('{{作者名，未知则删整行}}',esc(prose(profile.name))) : '';
  const signature = component('## 组件 16 尾部作者签名区').replace('{{作者名}}',esc(prose(profile.name))).replace('{{一句话简介，如：热衷于分享 AI 观察与干货}}',esc(prose(profile.promise)));
  const chapters=tokens.filter(t=>t.type==='heading'&&t.depth===2);
  let guide='';
  if(chapters.length>=3){guide=component('## 组件 3 前言导读区域');['一','二','三'].forEach((n,i)=>guide=guide.replace(`{{看点${n}}}`,esc(prose(chapters[i].text.replace(/[*_`]/g,'')))));}
  const first=tokens.findIndex(t=>t.type==='heading'&&t.depth===2);
  const body=first<0?blocks(tokens):blocks(tokens.slice(0,first))+guide+blocks(tokens.slice(first));
  const html = component('## 组件 1 全局容器').replace('<!-- 所有组件放在这里 -->', quote + body + component('## 组件 15 END 结尾分割线') + signature);
  const check = spawnSync('python3', [path.join(rootDir,'skill-sources/gzh-design/scripts/validate_gzh_html.py'),'--stdin'], { input: html, encoding:'utf8', timeout:10000, maxBuffer:1024*1024 });
  if (check.error || check.status !== 0 || /WARNING/.test(check.stdout)) throw new Error(`排版校验未通过：${check.error?.message || check.stdout || check.stderr}`);
  return html;
}
function cardPages(markdown) {
  const pages = markdown.split(/^\s*---\s*$/m).map(p=>p.trim()).filter(Boolean);
  if (!pages.length || pages.length > 8) throw new Error('卡片需要 1～8 页，请用独立 --- 分页。');
  return pages.map((s,i) => {
    const m = s.match(/^#{1,3}\s+([^\n]+)\n?([\s\S]*)$/);
    if (!m) throw new Error(`第 ${i+1} 页缺少 ## 标题。`);
    if ([...m[1]].length > 18) throw new Error(`第 ${i+1} 页标题过长，请缩至 18 字以内。`);
    if ([...m[2].trim()].length > 160) throw new Error(`第 ${i+1} 页正文过长，请缩至 160 字以内。`);
    return { title: m[1], body: m[2].trim() };
  });
}
async function renderCards(project, dir, rootDir) {
  const pages = cardPages(project.xhs);
  const template = fs.readFileSync(path.join(rootDir,'skill-sources/guizang-social-card/assets/template-swiss-card.html'),'utf8');
  const seedCss = template.match(/<style>([\s\S]*?)<\/style>/)[1];
  const cards = pages.map((p,i) => {
    const lines = p.body.split('\n').filter(Boolean);
    const rows = lines.map((s,n) => `<div class="wb-row"><span class="wb-number">${String(n+1).padStart(2,'0')}</span><p>${esc(s.replace(/^[-*]\s+/,''))}</p></div>`).join('');
    const shape = i===0 ? 'cover' : i%3===1 ? 'ledger' : i%3===2 ? 'essay' : 'closing';
    const titleChars=[...p.title];
    const title=i===0&&titleChars.length>5?esc(titleChars.slice(0,Math.ceil(titleChars.length/2)).join(''))+'<br>'+esc(titleChars.slice(Math.ceil(titleChars.length/2)).join('')):esc(p.title);
    return `<section class="poster xhs ${shape}" id="page-${i+1}"><div class="content stack"><div class="chrome-min"><span>点灯的曾曾 / AI 实验笔记</span><span>${String(i+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}</span></div><p class="t-cat">${i===0?'实测 · 方法 · 边界':'FIELD NOTES'}</p><h1 class="${i===0?'h-statement':'h-xl'}">${title}</h1><div class="wb-body">${rows}</div><div class="wb-foot"><span>把一个想法做成看得见的成果</span><span>点灯的曾曾</span></div></div></section>`;
  }).join('');
  const css = `:root{--sans:"Helvetica Neue","PingFang SC",sans-serif;--mono:Consolas,monospace}body{padding:0;background:#fafaf8}.sheet{gap:32px}.content{gap:36px}.chrome-min{margin-bottom:0}.wb-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:28px;min-height:0}.wb-row{display:flex;gap:28px;border-top:1px solid var(--grey-2);padding:30px 0;font-size:38px;line-height:1.65;overflow-wrap:anywhere}.wb-row p{margin:0}.wb-number{font-size:22px;color:var(--accent);flex-shrink:0;padding-top:14px}.wb-foot{border-top:2px solid var(--accent);padding-top:28px;display:flex;justify-content:space-between;font-size:20px;gap:20px}.cover{background:var(--accent);color:white}.cover .chrome-min,.cover .t-cat,.cover .wb-number{color:#dbe4ff}.cover .wb-foot{border-color:white}.cover .wb-row{border-color:#6786d8;font-size:42px}.ledger .wb-row{flex:1;align-items:center;padding:24px 0}.essay .wb-body{border-left:5px solid var(--accent);padding-left:32px}.essay .wb-row{border:0}.closing .wb-row{background:var(--grey-1);padding:32px}.h-xl,.h-statement{overflow-wrap:anywhere}.content>*{flex-shrink:0}.content>.wb-body{flex-shrink:1}`;
  const html = `<!doctype html><html lang="zh-CN" data-accent="ikb"><meta charset="utf-8"><title>${esc(project.title)}</title><style>${seedCss}\n${css}\n.cover .h-statement{color:#fff}.cover .wb-row{font-size:52px;line-height:1.6}.cover .wb-body{justify-content:center}</style><body><main class="sheet">${cards}</main></body></html>`;
  fs.writeFileSync(path.join(dir,'cards.html'),html);
  const { chromium } = require('playwright');
  const executablePath = process.env.WORKBENCH_CHROME || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ headless:true, executablePath });
  try {
    const page = await browser.newPage({ viewport:{width:1200,height:1600}, deviceScaleFactor:1 });
    await page.route('**/*',route=>route.abort());
    await page.setContent(html, {waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    const assets=[];
    for (let i=0;i<pages.length;i++) {
      const target=page.locator(`#page-${i+1}`);
      const overflow = await target.evaluate(el => {
        const box=el.getBoundingClientRect();
        return [...el.querySelectorAll('.wb-row,h1,.wb-foot,.chrome-min')].some(c=>{const r=c.getBoundingClientRect();return r.bottom>box.bottom-40||r.right>box.right-40||c.scrollWidth>c.clientWidth+2;}) || el.querySelector('.content').scrollHeight>el.clientHeight;
      });
      if(overflow) throw new Error(`第 ${i+1} 页排版溢出，请减少文字或拆页后重试。未缩小文字或裁掉正文。`);
      const file=`card-${String(i+1).padStart(2,'0')}.png`;
      await target.screenshot({path:path.join(dir,file)}); assets.push(file);
    }
    return [...assets,'cards.html'];
  } finally { await browser.close(); }
}
module.exports = { renderWechat, renderCards, cardPages, esc };
