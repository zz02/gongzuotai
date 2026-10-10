const {execFile}=require('child_process');
const {locateExecutable}=require('./exec');
let cache,pending;
function command(bin,args){return new Promise(resolve=>execFile(bin,args,{timeout:6000,maxBuffer:100000,encoding:'utf8'},(error,stdout,stderr)=>resolve({ok:!error,text:(stdout||'')+(stderr||'')})));}
async function check(){
  if(cache&&Date.now()-cache.checkedAt<60000)return cache;if(pending)return pending;
  pending=(async()=>{
    const bin=locateExecutable(process.env.CODEX_BIN||'codex').path,checkedAt=Date.now();
    if(!bin)return cache={installed:false,loggedIn:false,imageEnabled:false,checkedAt,note:'未找到 Codex CLI，请先安装并登录。'};
    const [v,login,features]=await Promise.all([command(bin,['--version']),command(bin,['login','status']),command(bin,['features','list'])]);
    const loggedIn=login.ok&&/Logged in/i.test(login.text),imageEnabled=features.ok&&/^image_generation\s+\S+(?:\s+\S+)*\s+true\s*$/m.test(features.text);
    return cache={installed:true,loggedIn,imageEnabled,version:v.ok?v.text.trim().slice(0,100):'版本检测失败',checkedAt,note:!loggedIn?'Codex 尚未登录或登录状态检测失败，请运行 codex login。':!imageEnabled?'写作可提交；生图功能检测未通过。':'已登录；写作与原生生图可提交，网络与额度以任务结果为准。'};
  })().finally(()=>pending=null);return pending;
}
module.exports={check};
