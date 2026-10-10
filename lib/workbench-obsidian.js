// Local, opt-in vault bridge. Existing notes are read-only; exports are immutable snapshots.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { parseFrontmatter } = require('../kb_obsidian');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function relative(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500 || value.includes('\\') || /[\x00-\x1f\[\]|#]/.test(value)) fail('请输入有效的库内目录或笔记路径。');
  if (path.isAbsolute(value) || value.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.'))) fail('不允许访问隐藏目录或库外路径。');
  return value;
}
function safe(root, rel, createDirs = false) {
  relative(rel);
  const segments = rel.split('/');
  let file = root;
  for (let i = 0; i < segments.length; i++) {
    file = path.join(file, segments[i]);
    const stat = fs.lstatSync(file, { throwIfNoEntry:false });
    if (stat?.isSymbolicLink()) fail('不能通过符号链接访问知识库。');
    if (!stat) {
      if (createDirs && i < segments.length - 1) fs.mkdirSync(file);
      else continue;
    }
    if (i < segments.length - 1 && fs.existsSync(file) && !fs.statSync(file).isDirectory()) fail('目录路径无效。');
  }
  return file;
}
function vault(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || !fs.existsSync(value)) fail('请填写有效的 Obsidian 库绝对路径。');
  const root = fs.realpathSync(value);
  if (!fs.statSync(root).isDirectory() || !fs.existsSync(path.join(root, '.obsidian')) || fs.lstatSync(path.join(root, '.obsidian')).isSymbolicLink() || !fs.statSync(path.join(root, '.obsidian')).isDirectory()) fail('该目录不是 Obsidian 知识库。');
  return root;
}
function discover() {
  // Read only app-level vault metadata. Do not read plugins' keys or note bodies.
  try {
    const file = path.join(os.homedir(), 'Library/Application Support/obsidian/obsidian.json');
    return Object.values(JSON.parse(fs.readFileSync(file, 'utf8')).vaults || {}).map(v => ({ path: v.path, name: path.basename(v.path), open: Boolean(v.open) }));
  } catch { return []; }
}
function walk(root, scopes, extension = /\.md$/) {
  const files = new Set(); let visited = 0;
  function visit(dir, depth) {
    if (depth > 20) fail('目录层级过深，请缩小接入范围。');
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (++visited > 20000) fail('接入范围过大，请缩小目录范围。');
      if (e.name.startsWith('.') || e.isSymbolicLink()) continue;
      const file = path.join(dir, e.name);
      if (e.isDirectory()) visit(file, depth + 1);
      else if (e.isFile() && extension.test(e.name)) {
        const rel = path.relative(root, file).split(path.sep).join('/');
        try { relative(rel); files.add(rel); } catch {}
      }
    }
  }
  for (const scope of scopes) {
    const dir = safe(root, scope);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail(`接入目录不存在：${scope}`);
    visit(dir, 0);
  }
  return [...files];
}
function make({ db, get, mutate, jobs, asset, putJob, assetRoot }) {
  db.exec(`CREATE TABLE IF NOT EXISTS creator_vault (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS creator_vault_sources (project_id TEXT NOT NULL, note_path TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(project_id,note_path));`);
  const config = () => JSON.parse(db.prepare('SELECT body FROM creator_vault WHERE id=1').get()?.body || 'null');
  function context() {
    const c = config(); if (!c) fail('请先连接 Obsidian 知识库。');
    if (vault(c.path) !== c.path) fail('知识库路径已变更，请重新连接。');
    return c;
  }
  function connect(input) {
    const root = vault(input.path);
    if (!Array.isArray(input.scopes) || !input.scopes.length || input.scopes.length > 8) fail('请选择 1～8 个接入目录。');
    const scopes = [...new Set(input.scopes.map(relative))];
    const output = relative(input.output || '03-内容创作/点灯创作台');
    safe(root, output);
    const count = walk(root, scopes).length;
    const c = { path: root, name: path.basename(root), scopes, output };
    db.prepare('INSERT OR REPLACE INTO creator_vault VALUES (1,?)').run(JSON.stringify(c));
    return { ...c, count };
  }
  function list(query = '') {
    if (typeof query !== 'string' || query.length > 100) fail('搜索词不能超过 100 字符。');
    const c = context(), paths = walk(c.path, c.scopes);
    const matches = paths.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    const notes = matches.slice(0, 100).map(p => ({ path: p, title: path.basename(p, '.md'), modifiedAt: fs.statSync(safe(c.path, p)).mtimeMs, uri: uri(p) }));
    return { notes, total: matches.length, limited: matches.length > 100 };
  }
  function uri(rel) { const c = context(); return `obsidian://open?path=${encodeURIComponent(path.join(c.path, relative(rel)))}`; }
  function read(rel) {
    const c = context(); relative(rel);
    if (!rel.endsWith('.md') || !c.scopes.some(s => rel.startsWith(s + '/'))) fail('这篇笔记不在接入范围内。');
    const file = safe(c.path, rel);
    if (!fs.existsSync(file)) fail('原笔记不存在，可能已重命名。', 404);
    if (!fs.statSync(file).isFile() || fs.statSync(file).size > 1024 * 1024) fail('笔记必须是小于 1 MB 的 Markdown 文件。');
    const raw = fs.readFileSync(file, 'utf8');
    if (raw.length > 30000) fail('笔记超过 30,000 字符，请拆成学习卡再使用。');
    const { body, frontmatter } = parseFrontmatter(raw);
    return { path: rel, vault: c.path, title: String(frontmatter.title || path.basename(rel, '.md')), content: body.trim(), hash: hash(raw), uri: uri(rel), selectedAt: Date.now() };
  }
  function sourceRows(id) { get(id); return db.prepare('SELECT body FROM creator_vault_sources WHERE project_id=?').all(id).map(r => JSON.parse(r.body)); }
  function selected(id) {
    const c = config();
    return sourceRows(id).map(n => {
      let status = '未连接';
      if (c?.path === n.vault) {
        try { status = read(n.path).hash === n.hash ? '已同步' : '原文已改'; }
        catch { status = '原文不可读'; }
      } else if(c) status = '其他知识库';
      const { content, vault: _, ...summary } = n;
      return { ...summary, status, characters: content.length };
    });
  }
  function select(id, input) {
    const n = read(input.path);
    const existing = sourceRows(id);
    if (existing.length >= 8 && !existing.some(x => x.path === n.path)) fail('每篇内容最多关联 8 篇笔记。');
    if (existing.filter(x => x.path !== n.path).reduce((sum,x) => sum + x.content.length, n.content.length) > 60000) fail('已选素材超过 60,000 字符，请减少笔记。');
    return db.transaction(() => {
      const p = mutate(id, input.version, () => {});
      db.prepare('INSERT OR REPLACE INTO creator_vault_sources VALUES (?,?,?)').run(id, n.path, JSON.stringify(n));
      return { project: p, selected: selected(id) };
    })();
  }
  function remove(id, input) {
    relative(input.path);
    return db.transaction(() => {
      const p = mutate(id, input.version, () => {});
      db.prepare('DELETE FROM creator_vault_sources WHERE project_id=? AND note_path=?').run(id, input.path);
      return { project: p, selected: selected(id) };
    })();
  }
  function material(id) {
    const notes = sourceRows(id);
    if (!notes.length) return [];
    if (selected(id).some(n => n.status !== '已同步')) fail('关联笔记已变化或不可读，请在知识库页刷新或移除后生成。', 409);
    return notes.map(({ path, title, content }) => ({ path, title, content }));
  }
  function candidate(id, input) {
    if (!['wechat', 'xhs', 'video'].includes(input.kind)) fail('请选择稿件类型。');
    const p = get(id);
    if (input.version !== p.version) fail('内容已更新，请重新打开。', 409);
    const n = read(input.path);
    // No AI call. Copy only explicitly embedded images in allowed folders, never nested note embeds.
    const c = context(), images = new Map();
    const available = walk(c.path,c.scopes,/\.(png|jpe?g|webp)$/i);
    function image(target) {
      target = target.split('|')[0];
      try { target = decodeURIComponent(target); } catch { fail('图片路径编码无效。'); }
      if (!/\.(png|jpe?g|webp)$/i.test(target) || target.includes('#') || path.isAbsolute(target) || target.includes('\\')) fail('只支持库内 PNG、JPEG、WebP 图片，不自动展开嵌入笔记。');
      const sibling=path.posix.normalize(path.posix.join(path.posix.dirname(n.path),target));
      const direct=available.includes(target)?target:available.includes(sibling)?sibling:null;
      const matches=direct?[direct]:available.filter(p=>!target.includes('/')&&path.posix.basename(p)===target);
      if(matches.length!==1) fail('图片缺失、重名或不在接入范围内，请用完整库内路径。');
      const rel=matches[0],file=safe(c.path,rel);
      if(fs.statSync(file).size>20*1024*1024)fail('单张笔记图片不能超过 20 MB。');
      const bytes=fs.readFileSync(file);
      const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
      const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
      if(!png&&!jpeg&&!webp)fail('笔记附件不是有效的图片格式。');
      if(!images.has(rel))images.set(rel,{bytes,name:`image-${images.size+1}.${png?'png':jpeg?'jpg':'webp'}`});
      if(images.size>20 || [...images.values()].reduce((sum,a)=>sum+a.bytes.length,0)>100*1024*1024)fail('稿件图片超过 20 张或 100 MB。');
      return images.get(rel).name;
    }
    const idJob=crypto.randomUUID();
    let content=n.content.replace(/!\[\[([^\]]+)\]\]/g,(_,target)=>`![配图](/api/_/workbench/assets/${idJob}/${image(target)})`);
    content=content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(original,alt,url)=>{
      if(url.startsWith(`/api/_/workbench/assets/${idJob}/`)||/^https?:\/\//.test(url))return original;
      return `![${alt}](/api/_/workbench/assets/${idJob}/${image(url)})`;
    });
    const limits = { wechat:60000, xhs:12000, video:30000 };
    if(content.length > limits[input.kind]) fail('这篇笔记超过对应稿件的长度上限。');
    const j = { id:idJob, projectId:id, kind:input.kind, baseVersion:p.version, status:'done', startedAt:Date.now(), assets:[...images.values()].map(a=>a.name), result:content, error:'', origin:'obsidian', notePath:n.path };
    if(images.size){const dir=path.join(assetRoot,idJob);fs.mkdirSync(dir);for(const a of images.values())fs.writeFileSync(path.join(dir,a.name),a.bytes,{flag:'wx'});}
    putJob(j); return j;
  }
  function archive(id, input) {
    const c = context(), p = get(id);
    if (p.version !== input.version) fail('内容已更新，请先保存后再归档。', 409);
    const selectedNotes = sourceRows(id);
    if(selectedNotes.some(n => n.vault !== c.path)) fail('素材来自其他知识库，请重新选择后归档。');
    // Each archive has a unique directory. Never rewrite an existing note, attachment, or .base file.
    const date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
    const title = p.title.replace(/[\\/:*?"<>|\[\]#\x00-\x1f]/g,'-').trim().slice(0,60);
    const ready = jobs().filter(j => j.projectId === id && ['done','applied'].includes(j.status));
    const planned = ready.flatMap(j => j.assets.filter(f => /\.(png|jpe?g|webp|mp4)$/i.test(f)).map(f => ({ job:j.id, filename:f, source:asset(j.id,f) })));
    if(planned.length > 200 || planned.reduce((sum,a)=>sum+fs.statSync(a.source).size,0)>500*1024*1024) fail('附件超过 200 个或 500 MB，请拆分内容再归档。');
    const urls = new Set(planned.map(a=>`/api/_/workbench/assets/${a.job}/${encodeURIComponent(a.filename)}`));
    for(const body of [p.wechat,p.xhs,p.video]) for(const m of body.matchAll(/!\[[^\]]*\]\((\/api\/_\/workbench\/assets\/[^)]+)\)/g)) if(!urls.has(m[1])) fail('正文引用的图片没有归档来源，请检查图片记录。');
    const dirRel = `${c.output}/${date}-${title}-${crypto.randomUUID()}`;
    const parent = path.dirname(safe(c.path, `${c.output}/placeholder`, true));
    const destination = safe(c.path, dirRel);
    if(fs.existsSync(destination)) fail('归档目录已存在，请重试。',409);
    const dir = fs.mkdtempSync(path.join(parent,'.creator-staging-')), assets = new Map();
    try {
    const manifest = [];
    for (const job of ready) {
      for (const filename of job.assets.filter(f => /\.(png|jpe?g|webp|mp4)$/i.test(f))) {
        const source = asset(job.id, filename);
        const local = `${job.id}-${filename}`;
        const attachments=path.join(dir,'附件');fs.mkdirSync(attachments,{recursive:true});
        const target = path.join(attachments,local);
        fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
        const key = `/api/_/workbench/assets/${job.id}/${encodeURIComponent(filename)}`;
        assets.set(key, `${dirRel}/附件/${local}`); manifest.push({ local, size:fs.statSync(target).size });
      }
    }
    function portable(text) {
      return text.replace(/!\[([^\]]*)\]\((\/api\/_\/workbench\/assets\/[^)]+)\)/g, (_,alt,url) => {
        if (!assets.has(url)) fail('正文引用的图片没有归档来源，请检查图片记录。');
        return `![[${assets.get(url)}]]`;
      });
    }
    function note(file, platform, content) {
      const status = ['公众号','小红书','抖音'].includes(platform) ? (p.publications.some(r=>r.platform===platform)?'已登记':'草稿') : platform==='复盘' ? (p.observations.length?'已复盘':'待复盘') : '已归档';
      const raw = `---\ntitle: ${JSON.stringify(p.title)}\n日期: ${date}\n平台: ${JSON.stringify(platform)}\n状态: ${JSON.stringify(status)}\n内容编号: ${JSON.stringify(p.id)}\n版本: ${p.version}\ntags: ["点灯创作台"]\n---\n\n${content}\n`;
      fs.writeFileSync(path.join(dir,file),raw,{flag:'wx'});
      return `${dirRel}/${file}`;
    }
    const refs = selectedNotes.map(n => `- [[${n.path.slice(0,-3)}|${n.title.replace(/[\[\]|\r\n]/g,' ')}]]（引用快照 ${n.hash.slice(0,12)}）`).join('\n');
    note('素材与来源.md','素材',`${p.brief}\n\n## 参考来源\n\n${p.sources}\n\n## 关联知识\n\n${refs || '未关联笔记'}\n\n> [!note] 引用说明\n> 此处保留来源链接，不复制整篇原文，也不更新原笔记。`);
    note('公众号.md','公众号',portable(p.wechat));
    note('小红书.md','小红书',portable(p.xhs));
    note('抖音脚本.md','抖音',portable(p.video));
    const observations = p.observations.map(o => {
      const publication=p.publications.find(r=>r.id===o.publicationId);
      return `### ${publication?.platform || '作品'}\n\n${['views','likes','saves','follows'].map((k,i)=>`${['阅读播放','点赞数量','收藏数量','新增关注'][i]}：${o[k]===null?'未填':o[k]}`).join(' / ')}\n\n${o.note}`;
    }).join('\n\n');
    note('发布与复盘.md','复盘',`## 发布记录\n\n${p.publications.map(r=>`- ${r.platform} / ${r.at} / ${r.url}`).join('\n') || '未登记作品'}\n\n## 作品表现\n\n${observations || '未记录指标'}\n\n## 下一步改进\n\n${p.nextAction || '待填写'}`);
    const overview = note('内容总览.md','总览',`# ${p.title}\n\n> [!info] 创作快照\n> 工作台第 ${p.version} 版，归档后不会自动覆盖；在 OB 修改的文本可作为候选稿导回工作台。\n\n${['素材与来源','公众号','小红书','抖音脚本','发布与复盘'].map(f=>`- [[${dirRel}/${f}]]`).join('\n')}\n\n## 成品附件\n\n${[...assets.values()].map(f=>`![[${f}]]`).join('\n\n') || '暂无附件'}\n\n## 来源笔记\n\n${refs || '未关联笔记'}`);
    fs.writeFileSync(path.join(dir,'创作看板.base'),`filters:\n  and:\n    - ${JSON.stringify(`内容编号 == "${p.id}"`)}\n    - ${JSON.stringify(`file.inFolder(${JSON.stringify(dirRel)})`)}\nviews:\n  - type: table\n    name: "本次创作"\n    order:\n      - file.name\n      - 平台\n      - 状态\n      - 日期\n      - 版本\n`,{flag:'wx'});
    fs.writeFileSync(path.join(dir,'归档清单.json'),JSON.stringify({projectId:id,version:p.version,notes:6,assets:manifest},null,2),{flag:'wx'});
    // Rename within the same filesystem exposes a complete snapshot only after all files succeed.
    if(fs.existsSync(destination)) fail('归档目录已存在，请重试。',409);
    fs.renameSync(dir,destination);
    return { path:overview, uri:uri(overview), files:6, assets:manifest.length, version:p.version };
    } catch(e) {
      // Retain only our newly-created staging directory for recovery; do not delete user files.
      const error=new Error(`归档未完成：${e.message}。临时文件保留在 ${path.relative(c.path,dir)}，原笔记未改动。`);error.status=e.status||500;throw error;
    }
  }
  return { config, connect, list, read, select, remove, selected, material, candidate, archive, discover };
}
module.exports = { make, relative, safe, vault };
