// Optional, isolated local UI fixture. No production credentials or real vault changes.
const fs=require('fs'),os=require('os'),path=require('path');
const {boot,close,req,TEST_ADMIN_PASSWORD}=require('../test/_server');
(async()=>{
 const vault=fs.mkdtempSync(path.join(os.tmpdir(),'creator-ob-ui-'));fs.mkdirSync(path.join(vault,'.obsidian'));fs.mkdirSync(path.join(vault,'素材'));fs.mkdirSync(path.join(vault,'输出'));
 fs.writeFileSync(path.join(vault,'素材/AI实测学习卡.md'),'---\ntitle: AI 实测学习卡\ntags: [AI, 学习卡]\n---\n\n## 读者问题\n\n怎样验证 AI 工具的真实用途？\n\n## 实测要求\n\n记录工具版本、成本与失败案例。还没有测过的结果标明待验证。');
 fs.writeFileSync(path.join(vault,'素材/公众号候选.md'),'## 先确定问题\n\nAI 工具很多，先回答谁遇到了什么问题。\n\n## 留下真实结果\n\n未做过的测试不要写成个人经历。');
 const base=await boot();const login=await req('/api/_/login',{method:'POST',body:{username:'admin',password:TEST_ADMIN_PASSWORD}});const cookie=login.headers.get('set-cookie').split(';')[0];
 const call=(p,method,body)=>req('/api/_/workbench'+p,{method,body,headers:{Cookie:cookie}});
 const p=(await call('/projects','POST',{title:'OB 接入验收',brief:'隔离测试素材，不是实际发布稿。'})).json.data;
 console.log(JSON.stringify({url:base+'/workbench.html',vault,project:p.id}));
 process.on('SIGTERM',async()=>{await close();process.exit(0);});
})().catch(e=>{console.error(e.message);process.exit(1);});
