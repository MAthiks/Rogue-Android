// GAME-011C1: reproducible real Chromium measurements; production HTML remains unchanged.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const source=fs.readFileSync(process.argv[2]||'index.html','utf8');
const marker='})();\n</script><script>';
assert.equal(source.split(marker).length,2,'unique test hook insertion point');
const hook=`
window.__perf011c={
 fixture(dense){
  S.x=24;S.y=16;S.turn=0;S.hp=S.maxHp;selected=null;mode='game';hide();
  map=Array(W*H).fill(0);seen=Array(W*H).fill(1);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x===0||y===0||x===W-1||y===H-1)map[idx(x,y)]=1;
  stairs={x:46,y:30};monsters=[];features=[];terrain=[];loot=[];
  if(dense){
   for(let y=5;y<28;y+=5)for(let x=5;x<44;x+=6)map[idx(x,y)]=1;
   for(let i=0;i<23;i++){
    const x=18+i%8,y=11+Math.floor(i/8);
    map[idx(x,y)]=0;
    monsters.push({x,y,hp:10,maxHp:10,atk:1,role:'brute',kind:'Fixture',color:'#bbb',intent:{cells:[{x,y:y+1}]}});
   }
   for(let i=0;i<40;i++){
    const x=7+i%20,y=19+Math.floor(i/20)*2;
    map[idx(x,y)]=0;features.push({x,y,type:'door',found:true,open:false});
    terrain.push({x,y:y+1,type:'spores',spent:false});loot.push({x,y:y+2,kind:'bandage'});
   }
  }
  update();save();
 },
 sample(name,n){
  const fn={render,reveal,update,save}[name],values=[];
  for(let i=0;i<8;i++)fn();
  for(let i=0;i<n;i++){const t=performance.now();fn();values.push(performance.now()-t)}
  return values;
 },
 pixels(){
  let h=2166136261;for(const v of ctx.getImageData(0,0,canvas.width,canvas.height).data)h=Math.imul(h^v,16777619);
  return {width:canvas.width,height:canvas.height,hash:h>>>0};
 },
 visibility(){
  seen.fill(0);reveal();return seen.join('');
 },
 snapshot(){return JSON.stringify({S,map,seen,monsters,loot,stairs,features,terrain})},
 turn(){return S.turn},
 cacheEntries(){return TILE_ART_CACHE.size},
 stress(n){
  const t=performance.now();for(let i=0;i<n;i++)move(i%2===0?1:-1,0);
  return performance.now()-t;
 }
};
`;
const html=source.replace(marker,hook+marker);
function stats(values){
 const a=[...values].sort((x,y)=>x-y),q=p=>a[Math.ceil(p*a.length)-1];
 return {n:a.length,mean:+(a.reduce((s,x)=>s+x,0)/a.length).toFixed(3),p50:q(.5),p95:q(.95),max:a[a.length-1]};
}
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const report={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),browser:browser.version(),node:process.version,platform:process.platform,arch:process.arch,units:'ms; heap bytes; synthetic fixture',profiles:[]};
  for(const [width,height] of [[393,851],[320,640],[851,393]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{let seed=123456789;Math.random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296)});
   await page.goto('http://127.0.0.1:'+server.address().port);
   await page.locator('[data-class="warrior"]').tap();
   const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await page.evaluate(()=>window.__perf011c.fixture(true));await settle();
   const profile=await page.evaluate(()=>{
    const p=window.__perf011c,before=p.snapshot(),pixels=p.pixels(),samples={};
    for(const name of ['render','reveal','update','save'])samples[name]=p.sample(name,60);
    const after=p.snapshot(),afterPixels=p.pixels(),visibility=p.visibility();
    return {samples,pixels,afterPixels,stateUnchanged:before===after,visibility,cacheEntries:p.cacheEntries()};
   });
   assert.equal(profile.stateUnchanged,true);assert.deepEqual(profile.pixels,profile.afterPixels);
   const visibilitySha256=crypto.createHash('sha256').update(profile.visibility).digest('hex');
   await page.evaluate(()=>window.__perf011c.fixture(false));await settle();
   await page.evaluate(()=>{
    window.__inputSamples=[];
    document.querySelector('#pad').addEventListener('pointerdown',()=>{
     const start=performance.now();requestAnimationFrame(()=>window.__inputSamples.push(performance.now()-start));
    },true);
   });
   for(let i=0;i<24;i++){
    await page.locator('[data-d="'+(i%2===0?'1,0':'-1,0')+'"]').tap();
    await page.waitForFunction(n=>window.__inputSamples.length===n,i+1);
   }
   const input=await page.evaluate(()=>({samples:window.__inputSamples,turn:window.__perf011c.turn()}));
   assert.equal(input.turn,24,'one turn per valid tap');
   const session=await context.newCDPSession(page);
   const heap=async()=>{await session.send('HeapProfiler.collectGarbage');return {...await session.send('Runtime.getHeapUsage'),...await session.send('Memory.getDOMCounters')}};
   const memoryBefore=await heap(),stress=[];
   for(let i=0;i<6;i++){stress.push(await page.evaluate(()=>window.__perf011c.stress(100)));await settle()}
   assert.equal(await page.evaluate(()=>window.__perf011c.turn()),624);
   const memoryAfter=await heap();
   assert.deepEqual(errors,[]);
   const raw=await page.evaluate(()=>localStorage.getItem('rogue-android-game002-v1'));
   assert.equal(JSON.parse(raw).S.turn,624);
   report.profiles.push({width,height,canvas:profile.pixels,visibilitySha256,cacheEntries:profile.cacheEntries,
    functions:Object.fromEntries(Object.entries(profile.samples).map(([k,v])=>[k,stats(v)])),
    pointerToNextFrame:stats(input.samples),stress100Turns:stats(stress),turns:624,memoryBefore,memoryAfter,
    saveBytes:Buffer.byteLength(raw),pageErrors:errors});
   await context.close();
  }
  fs.mkdirSync('perf-results',{recursive:true});
  const json=JSON.stringify(report,null,2);fs.writeFileSync(process.argv[3]||'perf-results/game011c-baseline.json',json+'\n');console.log(json);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
