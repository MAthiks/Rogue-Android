// Run: node tests/game008c-pwa.cjs
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const key='rogue-android-game002-v1',pref='rogue-android-display-v1';
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rogue-pwa-'));
 execFileSync(process.execPath,[path.join(__dirname,'../tools/build-pwa.cjs'),dir]);
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
 for(const size of [192,512]){const png=fs.readFileSync(path.join(dir,'icons/icon-'+size+'.png'));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size)}
 const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
 const server=http.createServer((req,res)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(!pathname.startsWith('/Rogue-Android/')){res.writeHead(404);return res.end()}
   const name=pathname.slice('/Rogue-Android/'.length)||'index.html';
   if(!['index.html','manifest.webmanifest','sw.js','icon.svg','icons/icon-192.png','icons/icon-512.png'].includes(name)){res.writeHead(404);return res.end()}
   res.setHeader('Content-Type',mime[path.extname(name)]);res.end(fs.readFileSync(path.join(dir,name)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
   browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const url='http://127.0.0.1:'+server.address().port+'/Rogue-Android/';
   await page.goto(url);
   await page.evaluate(async()=>{await caches.open('rogov-test-sibling-cache');localStorage.setItem('rogov-web-v1','sibling sentinel')});
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:30000});
   assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL.endsWith('/Rogue-Android/sw.js')),true);
   assert.ok(await page.evaluate(async()=>{const names=await caches.keys();return names.includes('rogov-test-sibling-cache')&&names.some(n=>n.startsWith('rogue-pwa:/Rogue-Android/:'))}));
   const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
   await page.locator('[data-class="warrior"]').tap();
   const saved=await read();assert.equal(saved.S.floor,1);
   await context.setOffline(true);await page.reload();await page.locator('#resume').tap();
   assert.deepEqual(await read(),saved);await page.locator('#wait').tap();const moved=await read();assert.equal(moved.S.turn,saved.S.turn+1);
   await page.reload();await page.locator('#resume').tap();assert.deepEqual(await read(),moved);
   assert.equal(await page.evaluate(()=>localStorage.getItem('rogov-web-v1')),'sibling sentinel');
   assert.ok(await page.evaluate(k=>!!localStorage.getItem(k),pref));
   await context.setOffline(false);await page.reload();
   await page.locator('#startTransfer').tap();await page.locator('#transferExport').tap();
   const exported=await page.locator('#transferData').inputValue();
   assert.deepEqual(JSON.parse(exported).run,moved);
   const receiver=await browser.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true});
   try{
     const dest=await receiver.newPage();dest.on('pageerror',e=>errors.push(e.message));
     await dest.goto(url);await dest.locator('#startTransfer').tap();
     await dest.locator('#transferData').fill('invalid JSON');await dest.locator('#transferImport').tap();
     assert.equal(await dest.evaluate(k=>localStorage.getItem(k),key),null);
     await dest.locator('#transferData').fill(exported);
     dest.once('dialog',d=>d.dismiss());await dest.locator('#transferImport').tap();
     assert.equal(await dest.evaluate(k=>localStorage.getItem(k),key),null);
     dest.once('dialog',d=>d.accept());await dest.locator('#transferImport').tap();
     await dest.locator('#resume').tap();
     assert.deepEqual(await dest.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),moved);
     await dest.reload();await dest.locator('#resume').tap();
     assert.deepEqual(await dest.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),moved);
   }finally{await receiver.close()}
   assert.deepEqual(await read(),moved);
   assert.deepEqual(errors,[]);
   console.log('PWA: PNG sizes, scope, offline reload, real gameplay, save and sibling isolation passed');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
