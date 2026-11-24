// Chromium mobile smoke test. Run after npm install --no-save playwright@1.56.1.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const key='rogue-android-game002-v1',pref='rogue-android-display-v1';
(async()=>{
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:393,height:851},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const url='http://127.0.0.1:'+server.address().port;
    const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
    await page.goto(url);
    assert.equal(await page.locator('[data-class]').count(),4);
    await page.locator('[data-class="warrior"]').tap();
    let d=await read();assert.equal(d.S.floor,1);
    assert.equal(await page.locator('[data-d]').count(),8);
    const dirs=await page.locator('[data-d]').evaluateAll(a=>a.map(b=>b.dataset.d));
    const legal=dirs.find(s=>{const [dx,dy]=s.split(',').map(Number),x=d.S.x,y=d.S.y;
      const open=(a,b)=>d.map[b*48+a]===0;
      return open(x+dx,y+dy)&&(!dx||!dy||open(x+dx,y)&&open(x,y+dy))});
    assert.ok(legal);await page.locator('[data-d="'+legal+'"]').tap();
    let moved=await read();assert.equal(moved.S.turn,d.S.turn+1);
    await page.locator('#wait').tap();assert.equal((await read()).S.turn,moved.S.turn+1);
    // Verify real canvas geometry and nonempty rendered pixels.
    assert.ok(await page.locator('canvas').evaluate(c=>{const b=c.getBoundingClientRect(),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let colors=new Set();for(let i=0;i<p.length;i+=4)colors.add(p[i]+','+p[i+1]+','+p[i+2]);return b.width>0&&b.height>0&&colors.size>3}));
    await page.locator('#inventory').tap();assert.ok(await page.locator('#panel').isVisible());
    await page.locator('#close').tap();
    // GAME-005A: persisted legendary pieces, mobile inventory, and live set activation.
    const fixture1=await page.evaluate(k=>{
      const d=JSON.parse(localStorage.getItem(k));
      const gear=(slot,name)=>({id:++d.S.serial,slot,name,rarity:5,itemLevel:12,grade:2,atk:slot==='weapon'?3:0,def:slot==='armor'?3:1,crit:0,regen:0,dodge:0,affixes:[],setId:'bastion'});
      d.S.bag=[gear('weapon','Brise-rempart'),gear('armor','Cuirasse du Bastion'),gear('helmet','Heaume du Bastion')];
      return d;
    },key);
    await page.addInitScript(({key,data,marker})=>{if(!sessionStorage.getItem(marker)){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem(marker,'1')}},{key,data:fixture1,marker:'fixture-1'});
    await page.reload();await page.locator('#resume').tap();await page.locator('#inventory').tap();
    assert.ok(await page.locator('.gear-detail').first().textContent().then(s=>s.includes('Légendaire')));
    const ids=(await read()).S.bag.map(i=>i.id);
    for(const id of ids)await page.locator('[data-equip="'+id+'"]').tap();
    assert.ok((await page.locator('#panel').textContent()).includes('Bastion de fer : 3/3'));
    assert.equal((await read()).S.equip.weapon.id,ids[0]);
    await page.locator('[data-off="helmet"]').tap();
    assert.ok((await page.locator('#panel').textContent()).includes('Bastion de fer : 2/3'));
    assert.equal((await read()).S.equip.helmet,null);
    await page.locator('#close').tap();await page.reload();await page.locator('#resume').tap();
    assert.equal((await read()).S.equip.armor.id,ids[1]);
    // GAME-005B: aim a bow via touch without moving; persist combat style.
    const fixture2=await page.evaluate(k=>{
      const d=JSON.parse(localStorage.getItem(k));
      d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
      d.S.x=6;d.S.y=6;d.S.res=8;d.S.combatStyle='balanced';
      d.S.equip.weapon={id:++d.S.serial,slot:'weapon',name:'Arc de test',family:'bow',rarity:1,atk:1,def:0,crit:0,regen:0,dodge:0};
      d.monsters=[{x:9,y:6,hp:100,maxHp:100,atk:1,kind:'Cible',role:'melee',color:'#ccc',stun:10}];
      d.features=[];d.terrain=[];d.loot=[];d.stairs={x:15,y:15};
      return d;
    },key);
    await page.addInitScript(({key,data,marker})=>{if(!sessionStorage.getItem(marker)){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem(marker,'1')}},{key,data:fixture2,marker:'fixture-2'});
    await page.reload();await page.locator('#resume').tap();
    const beforeShot=await read();
    await page.locator('#weaponAction').tap();await page.locator('[data-d="1,0"]').tap();
    const afterShot=await read();
    assert.equal(afterShot.S.turn,beforeShot.S.turn+1);
    assert.equal(afterShot.S.x,beforeShot.S.x);assert.equal(afterShot.S.y,beforeShot.S.y);
    assert.ok(afterShot.monsters[0].hp<100);assert.equal(afterShot.S.res,7);
    await page.locator('#inventory').tap();await page.locator('[data-style="defensive"]').tap();
    assert.equal((await read()).S.combatStyle,'defensive');await page.locator('#close').tap();
    await page.reload();await page.locator('#resume').tap();
    assert.equal((await read()).S.combatStyle,'defensive');
    // GAME-005C: mobile talent purchase, gating, and persistence.
    const fixture3=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.level=20;d.S.points=5;d.S.spec='defense';d.S.nodes={d1:true};return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-3')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-3','1')}},{key,data:fixture3});
    await page.reload();await page.locator('#resume').tap();await page.locator('#inventory').tap();
    assert.ok(await page.locator('[data-advanced="laststand"]').isDisabled());
    for(const id of ['resolve','bulwark','laststand'])await page.locator('[data-advanced="'+id+'"]').tap();
    assert.ok(await page.locator('[data-advanced="frenzy"]').isDisabled());
    assert.equal((await read()).S.points,2);assert.equal((await read()).S.nodes.adv_laststand,true);
    await page.locator('#close').tap();await page.reload();await page.locator('#resume').tap();
    assert.equal((await read()).S.nodes.adv_laststand,true);
    await page.locator('#menu').tap();await page.locator('#pauseopts').tap();
    await page.locator('#zoom').selectOption('150');assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).zoom,pref),150);
    await page.locator('#optback').tap();await page.locator('#back').tap();
    d=await read();await page.reload();await page.locator('#resume').tap();assert.equal((await read()).S.turn,d.S.turn);
    await page.setViewportSize({width:851,height:393});
    assert.ok(await page.locator('[data-d]').evaluateAll(a=>a.every(b=>{const r=b.getBoundingClientRect();return r.width>=30&&r.height>=30&&r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})));
    assert.deepEqual(errors,[]);console.log('Chromium mobile: touch, 8 directions, wait, inventory, zoom, reload, landscape and canvas OK');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
