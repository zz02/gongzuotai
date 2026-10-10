// Local recording production only. No remote media URLs or user-built commands.
const fs=require('fs');const path=require('path');const {spawn}=require('child_process');
const {locateExecutable}=require('./exec');
const {esc}=require('./workbench-render');
function chromePath(){return process.env.WORKBENCH_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';}
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function executable(name){
  const override=process.env[name==='ffmpeg'?'FFMPEG_BIN':'FFPROBE_BIN'];
  if(override)return locateExecutable(override).path;
  const full=`/opt/homebrew/opt/ffmpeg-full/bin/${name}`;
  return fs.existsSync(full)?full:locateExecutable(name).path;
}
function run(exe,args,{cwd,timeout=15000}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(exe,args,{cwd,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,HOME:process.env.HOME,LANG:'zh_CN.UTF-8'}});
    let out='',err='',failure,timer,kill;
    const stop=message=>{if(failure)return;failure=new Error(message);child.kill('SIGTERM');kill=setTimeout(()=>child.kill('SIGKILL'),1500);kill.unref();};
    timer=setTimeout(()=>stop('视频处理超时，原始素材仍保留。'),timeout);
    child.stdout.on('data',d=>{out+=d;if(out.length>1024*1024)stop('视频响应异常，处理已停止。');});
    child.stderr.on('data',d=>{err=(err+d).slice(-8000);});
    child.on('error',e=>{clearTimeout(timer);clearTimeout(kill);reject(e);});
    child.on('close',code=>{clearTimeout(timer);clearTimeout(kill);if(failure)return reject(failure);if(code!==0)return reject(new Error('视频无法解码或处理失败，请检查素材与本地视频环境。'));resolve(out);});
  });
}
async function runtime(){
  const ffmpeg=executable('ffmpeg'),ffprobe=executable('ffprobe');
  if(!ffmpeg||!ffprobe)return {available:false,subtitles:false,note:'需要本机安装 FFmpeg 和 ffprobe；图文功能不受影响。'};
  try{const filters=await run(ffmpeg,['-hide_banner','-filters']);const encoders=await run(ffmpeg,['-hide_banner','-encoders']);const native=/\bsubtitles\s/.test(filters);const canvas=fs.existsSync(chromePath())&&/\boverlay\s/.test(filters);return {available:/\blibx264\b/.test(encoders)&&/\baac\b/.test(encoders),subtitles:native||canvas,subtitlesEngine:native?'libass':canvas?'本地文字画布':'不可用',note:'本地生成 MP4；录屏与配音不上传第三方。'};}catch{return {available:false,subtitles:false,note:'本地视频环境检测失败，请检查 FFmpeg。'};}
}
async function probe(file){
  const exe=executable('ffprobe');if(!exe)fail('没有找到 ffprobe，无法检查视频素材。',503);
  let raw;try{raw=JSON.parse(await run(exe,['-v','error','-protocol_whitelist','file,pipe','-format_whitelist','mov,mp3,wav','-show_entries','format=duration:stream=codec_type,codec_name,width,height','-of','json',file]));}catch{fail('素材无法解码，请导入有效的 MP4、MOV、MP3、WAV 或 M4A。');}
  const duration=Number(raw.format?.duration),video=raw.streams?.find(s=>s.codec_type==='video'),audio=raw.streams?.some(s=>s.codec_type==='audio');
  if(!Number.isFinite(duration)||duration<=0||duration>1800)fail('素材时长需要在 0～30 分钟之间。');
  if(video&&(!video.width||!video.height||video.width>7680||video.height>7680))fail('录屏分辨率过大或无效。');
  return {duration,width:video?.width||0,height:video?.height||0,video:Boolean(video),audio:Boolean(audio)};
}
function parseSrt(text,duration){
  if(typeof text!=='string'||text.length>16000)fail('字幕不能超过 16,000 字符。');
  if(!text.trim())return '';
  const blocks=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/);if(blocks.length>150)fail('字幕最多 150 段。');
  let previous=0;
  const time=s=>{const m=s.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);if(!m||+m[2]>59||+m[3]>59)fail('字幕时间格式需要 HH:MM:SS,mmm。');return +m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000;};
  return blocks.map((b,i)=>{
    const lines=b.split('\n');if(/^\d+$/.test(lines[0]))lines.shift();const parts=lines.shift()?.split(/\s+-->\s+/);
    if(parts?.length!==2)fail('字幕需要有效的 SRT 时间轴。');
    const start=time(parts[0]),end=time(parts[1]);if(start<previous||end<=start||end>duration+0.05)fail('字幕不能重叠或超出成片时长；时间从成片 0 秒开始。');previous=end;
    const body=lines.join('\n');if(!body.trim()||lines.length>2||lines.some(l=>[...l].length>24)||/[<>{}\\\x00-\x08]/.test(body))fail('每段字幕最多两行，每行 24 字，不支持格式标签。');
    return `${i+1}\n${parts[0]} --> ${parts[1]}\n${body}`;
  }).join('\n\n')+'\n';
}
function spec(input,recording,narration){
  const start=input.start??0,end=input.end??recording.duration;
  if(typeof start!=='number'||typeof end!=='number'||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>recording.duration+0.05||end-start>300)fail('截取范围无效，单条成片最多 300 秒。');
  if(!['vertical','landscape'].includes(input.aspect))fail('请选择竖屏或横屏画幅。');
  if(!recording.video)fail('请选择包含画面的录屏。');
  if(narration&&!narration.audio)fail('配音素材没有可用音轨。');
  if(narration&&narration.duration<end-start-0.15)fail('配音比成片短，请缩短截取范围或补齐配音。');
  return {start,end,duration:end-start,aspect:input.aspect,subtitles:parseSrt(input.subtitles||'',end-start)};
}
async function captionTrack(dir,text,duration,width){
  // A local PNG timeline works even when this FFmpeg build has no libass.
  // Chromium renders text only, never loads user URLs or executes input markup.
  const {chromium}=require('playwright');
  const browser=await chromium.launch({headless:true,executablePath:chromePath()});
  const clock=s=>{const [h,m,rest]=s.split(':');return +h*3600+ +m*60+Number(rest.replace(',','.'));};
  const blocks=text.trim().split('\n\n');let cursor=0;const sequence=[];
  const add=(file,length)=>{if(length>0)sequence.push(`file '${file}'\nduration ${length.toFixed(3)}`);};
  try{
    const page=await browser.newPage({viewport:{width,height:180},deviceScaleFactor:1});await page.route('**/*',route=>route.abort());
    await page.setContent('<html><body style="margin:0;background:transparent"></body></html>');
    await page.screenshot({path:path.join(dir,'caption-empty.png'),omitBackground:true});
    for(let i=0;i<blocks.length;i++){
      const [,times,...lines]=blocks[i].split('\n');const [from,to]=times.split(' --> ').map(clock);
      add('caption-empty.png',from-cursor);
      const file=`caption-${i+1}.png`;
      await page.setContent(`<html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}body{height:180px;display:flex;align-items:center;justify-content:center}p{max-width:calc(100% - 80px);margin:0;padding:12px 20px;border-radius:8px;background:#10241dcc;color:white;font:40px/1.45 'PingFang SC',sans-serif;text-align:center;white-space:pre;box-sizing:border-box}</style><body><p>${esc(lines.join('\n'))}</p></body></html>`);
      await page.evaluate(()=>document.fonts.ready);
      if(await page.locator('p').evaluate(el=>el.scrollWidth>el.clientWidth||el.scrollHeight>180))throw new Error('字幕排版溢出，请缩短单行文字。');
      await page.screenshot({path:path.join(dir,file),omitBackground:true});add(file,to-from);cursor=to;
    }
    add('caption-empty.png',duration-cursor);sequence.push("file 'caption-empty.png'");
    fs.writeFileSync(path.join(dir,'captions.ffconcat'),'ffconcat version 1.0\n'+sequence.join('\n')+'\n',{flag:'wx'});
  }finally{await browser.close();}
}
async function render({dir,recording,narration,settings}){
  const env=await runtime();if(!env.available)fail(env.note,503);if(settings.subtitles&&!env.subtitles)fail('本机 FFmpeg 不支持字幕烧录，请配置带 libass 的 FFmpeg，或清空字幕后生成。',503);
  const [width,height]=settings.aspect==='vertical'?[1080,1920]:[1920,1080];
  let filters=`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x12291f,setsar=1`;
  if(settings.subtitles){fs.writeFileSync(path.join(dir,'subtitles.srt'),settings.subtitles,{flag:'wx'});if(env.subtitlesEngine==='libass')filters+=",subtitles=subtitles.srt:force_style='FontName=PingFang SC,FontSize=18,Outline=1,MarginV=28'";else await captionTrack(dir,settings.subtitles,settings.duration,width);}
  const args=['-hide_banner','-loglevel','error','-nostdin','-n','-protocol_whitelist','file,pipe','-format_whitelist','mov','-ss',String(settings.start),'-i',recording];
  if(narration)args.push('-protocol_whitelist','file,pipe','-format_whitelist','mov,mp3,wav','-i',narration);
  if(settings.subtitles&&env.subtitlesEngine!=='libass'){
    args.push('-protocol_whitelist','file,pipe','-f','concat','-safe','1','-i','captions.ffconcat','-filter_complex_threads','1','-filter_complex',`[0:v]${filters}[canvas];[canvas][${narration?2:1}:v]overlay=0:${height-240}:eof_action=pass[v]`,'-map','[v]');
  }else args.push('-vf',filters,'-map','0:v:0');
  args.push('-t',String(settings.duration),'-map',narration?'1:a:0':'0:a:0?','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-r','30','-threads','2','-c:a','aac','-b:a','160k','-map_metadata','-1','-map_chapters','-1','-movflags','+faststart',path.join(dir,'final.mp4'));
  await run(executable('ffmpeg'),args,{cwd:dir,timeout:600000});
  const output=await probe(path.join(dir,'final.mp4'));
  if(!output.video||output.width!==width||output.height!==height||Math.abs(output.duration-settings.duration)>0.2)throw new Error('成片完整性检查未通过，请重试；原始素材未修改。');
  if(narration&&!output.audio)throw new Error('成片缺少配音，请重试。');
  return {output,assets:settings.subtitles?['final.mp4','subtitles.srt']:['final.mp4']};
}
module.exports={runtime,probe,spec,render,parseSrt};
