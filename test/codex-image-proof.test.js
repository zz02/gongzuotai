const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {verify}=require('../lib/codex-image-proof');
test('Codex 原生证据只接受本次线程、有效 PNG 和一致原图',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'creator-native-proof-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const threadId='019edc1c-e7a3-74f0-a276-13bea71d32d6',dir=path.join(root,'generated_images',threadId);fs.mkdirSync(dir,{recursive:true});
 const bytes=Buffer.alloc(1500);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);bytes.write('IHDR',12);
 const output=path.join(root,'image.png'),source=path.join(dir,'ig_test.png');fs.writeFileSync(output,bytes);fs.writeFileSync(source,bytes);
 const opts={threadId,output,startedAt:Date.now(),codexHome:root};
 assert.equal(verify(opts).engine,'codex-native-image');assert.equal(verify(opts).bytes,1500);
 assert.equal(verify({...opts,threadId:'../escape'}),null);
 assert.equal(verify({...opts,threadId:'019edc1c-e7a3-74f0-a276-13bea71d32d7'}),null);
 fs.utimesSync(source,0,0);assert.equal(verify(opts),null);fs.writeFileSync(source,bytes);
 const changed=Buffer.from(bytes);changed[100]=1;fs.writeFileSync(output,changed);assert.equal(verify(opts),null);
 fs.writeFileSync(output,bytes);fs.unlinkSync(source);fs.symlinkSync(output,source);assert.equal(verify(opts),null);
 fs.unlinkSync(source);fs.writeFileSync(source,'<svg>not native</svg>');fs.writeFileSync(output,'<svg>not native</svg>');assert.equal(verify(opts),null);
});
