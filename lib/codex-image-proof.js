const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
// Codex CLI currently omits image_gen from its JSONL events. Verify this fresh
// thread's native output, not an agent message or a copy from another thread.
function verify({threadId,output,startedAt,codexHome=process.env.CODEX_HOME||path.join(os.homedir(),'.codex')}){
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(threadId||''))return null;
  try{
    const read=file=>{
      const s=fs.lstatSync(file);
      if(!s.isFile()||s.isSymbolicLink()||s.size<1000||s.size>20*1024*1024||s.mtimeMs<startedAt-2000)return null;
      const bytes=fs.readFileSync(file);
      if(!bytes.subarray(0,8).equals(PNG)||bytes.toString('ascii',12,16)!=='IHDR')return null;
      return {sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
    };
    const target=read(output);if(!target)return null;
    const base=path.join(codexHome,'generated_images'),dir=path.join(base,threadId);
    if(fs.lstatSync(dir).isSymbolicLink()||!fs.realpathSync(dir).startsWith(fs.realpathSync(base)+path.sep))return null;
    for(const name of fs.readdirSync(dir)){
      if(!/^[a-zA-Z0-9_.-]+\.png$/i.test(name))continue;
      const native=read(path.join(dir,name));
      if(native&&native.sha256===target.sha256)return {engine:'codex-native-image',threadId,...target};
    }
  }catch{}
  return null;
}
module.exports={verify};
