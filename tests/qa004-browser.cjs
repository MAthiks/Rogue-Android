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
    // GAME-007A: actual canvas palette and repeat-render determinism, no saved-state change.
    const artPixels=()=>page.locator('canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();let hash=2166136261;for(let i=0;i<d.length;i+=4){colors.add(d[i]+','+d[i+1]+','+d[i+2]);for(let j=0;j<4;j++)hash=Math.imul(hash^d[i+j],16777619)}return {colors:colors.size,hash:hash>>>0}});
    const artBefore=await artPixels(),artSave=await read();assert.ok(artBefore.colors>=8);
    await page.reload();await page.locator('#resume').tap();assert.deepEqual(await artPixels(),artBefore);assert.deepEqual(await read(),artSave);
    if(process.env.ROGUE_ART_PREVIEW){fs.mkdirSync('art-preview',{recursive:true});await page.screenshot({path:'art-preview/crypt-mobile.png'})}
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
    // GAME-005D: use a potion on touch and persist pouch quantity.
    const fixture4=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.hp=5;d.S.maxHp=50;d.S.pouch={heal:2,ward:1};d.monsters=[];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-4')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-4','1')}},{key,data:fixture4});
    await page.reload();await page.locator('#resume').tap();
    const beforePotion=await read();await page.locator('#consumables').tap();
    assert.ok(await page.locator('[data-consume="focus"]').isDisabled());
    await page.locator('[data-consume="heal"]').tap();
    const afterPotion=await read();
    assert.equal(afterPotion.S.hp,23);assert.equal(afterPotion.S.pouch.heal,1);
    assert.equal(afterPotion.S.turn,beforePotion.S.turn+1);
    assert.equal(afterPotion.S.x,beforePotion.S.x);assert.equal(afterPotion.S.y,beforePotion.S.y);
    await page.reload();await page.locator('#resume').tap();
    assert.equal((await read()).S.pouch.heal,1);
    // GAME-005E: approach with the pad, cancel, resolve once, and reload.
    const fixture5=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=6;d.S.y=6;d.features=[{x:7,y:6,type:'event',eventId:'cache',found:true,spent:false}];d.monsters=[];d.terrain=[];d.loot=[];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-5')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-5','1')}},{key,data:fixture5});
    await page.reload();await page.locator('#resume').tap();const beforeEvent=await read();
    await page.locator('[data-d="1,0"]').tap();await page.locator('#eventBack').tap();
    assert.equal((await read()).S.turn,beforeEvent.S.turn);
    await page.locator('[data-d="1,0"]').tap();await page.locator('[data-event-choice="supplies"]').tap();
    const afterEvent=await read();assert.equal(afterEvent.S.bandages,beforeEvent.S.bandages+2);assert.equal(afterEvent.S.turn,beforeEvent.S.turn+1);assert.equal(afterEvent.features[0].spent,true);assert.equal(afterEvent.S.x,6);
    await page.reload();await page.locator('#resume').tap();await page.locator('[data-d="1,0"]').tap();
    assert.equal((await read()).S.x,7);assert.equal((await read()).S.bandages,afterEvent.S.bandages);
    // GAME-005F: high regeneration must not make paid ranged attacks free.
    const fixture6=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=6;d.S.y=6;d.S.res=8;d.S.maxRes=40;d.S.attrs[3]=40;d.S.nodes.master=true;d.S.equip.weapon={id:++d.S.serial,slot:'weapon',name:'Arc',family:'bow',rarity:4,atk:3,regen:1};d.S.equip.ring={id:++d.S.serial,slot:'ring',name:'Anneau',rarity:4,regen:3};d.monsters=[{x:9,y:6,hp:999,maxHp:999,atk:1,kind:'Cible',role:'melee',color:'#ccc',stun:10}];d.features=[];d.terrain=[];d.loot=[];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-6')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-6','1')}},{key,data:fixture6});
    await page.reload();await page.locator('#resume').tap();
    await page.locator('#weaponAction').tap();await page.locator('[data-d="1,0"]').tap();
    assert.equal((await read()).S.res,7);
    await page.locator('#inventory').tap();
    assert.ok((await page.locator('#panel').textContent()).includes('Combat effectif'));
    await page.locator('#close').tap();
    // GAME-006A: a new biome and its hazard persist across mobile reload.
    const fixture7=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=6;d.S.y=6;d.S.hp=30;d.S.maxHp=50;d.S.dungeon.biome='fungal';d.features=[];d.loot=[];d.monsters=[];d.terrain=[{x:7,y:6,type:'spores',spent:false}];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-7')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-7','1')}},{key,data:fixture7});
    await page.reload();await page.locator('#resume').tap();
    assert.equal(await page.locator('#biomeName').textContent(),'Grottes fongiques');
    await page.locator('[data-d="1,0"]').tap();assert.equal((await read()).S.hp,28);
    await page.reload();await page.locator('#resume').tap();
    assert.equal(await page.locator('#biomeName').textContent(),'Grottes fongiques');
    assert.equal((await read()).S.hp,28);
    // GAME-006B: a creature telegraphs, persists across reload, then misses a sidestep.
    const fixture8=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=5;d.S.y=6;d.S.hp=30;d.S.maxHp=50;d.S.dungeon.biome='cave';d.features=[];d.terrain=[];d.loot=[];for(let y=4;y<=10;y++)for(let x=4;x<=10;x++)d.map[y*48+x]=0;d.stairs={x:15,y:15};d.monsters=[{x:8,y:6,hp:12,maxHp:12,atk:3,role:'archer',kind:'Cracheur des cavernes',color:'#9bb16b',species:'spitter',creatureSkill:'bolt',creatureCD:0}];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-8')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-8','1')}},{key,data:fixture8});
    await page.reload();await page.locator('#resume').tap();
    await page.locator('[data-d="1,0"]').tap();
    let warned=await read();assert.equal(warned.S.hp,30);assert.deepEqual(warned.monsters[0].intent.cells,[{x:6,y:6}]);
    await page.reload();await page.locator('#resume').tap();
    assert.equal((await read()).monsters[0].species,'spitter');
    await page.locator('[data-d="0,1"]').tap();
    let avoided=await read();assert.equal(avoided.S.hp,30);assert.equal(avoided.S.y,7);assert.equal(avoided.monsters[0].intent,undefined);assert.equal(avoided.monsters[0].creatureCD,3);
    // GAME-006C: phase-three boss announces, persists, and grants an escape.
    const fixture9=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=5;d.S.y=6;d.S.hp=30;d.S.maxHp=50;d.S.floor=6;d.features=[];d.terrain=[];d.loot=[];for(let y=4;y<=10;y++)for(let x=4;x<=10;x++)d.map[y*48+x]=0;d.stairs={x:15,y:15};d.monsters=[{x:8,y:6,hp:10,maxHp:30,atk:4,role:'guardian',kind:'Morvath',color:'#d6c5a0',boss:'ossuary',ability:'Mur d’ossements',elite:true,phase:1,specialCD:0}];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-9')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-9','1')}},{key,data:fixture9});
    await page.reload();await page.locator('#resume').tap();
    await page.locator('[data-d="1,0"]').tap();
    let bossWarned=await read();assert.equal(bossWarned.S.hp,30);assert.equal(bossWarned.monsters[0].phase,3);assert.ok(bossWarned.monsters[0].intent.cells.some(c=>c.x===6&&c.y===6));
    await page.reload();await page.locator('#resume').tap();
    assert.equal((await read()).monsters[0].phase,3);
    await page.locator('[data-d="-1,0"]').tap();
    let bossAvoided=await read();assert.equal(bossAvoided.S.hp,30);assert.equal(bossAvoided.S.x,5);assert.equal(bossAvoided.monsters[0].intent,undefined);assert.equal(bossAvoided.monsters[0].specialCD,2);
    // GAME-006D: touch merchant, buy/sell, persist stock and wallet.
    const fixture10=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=6;d.S.y=6;d.S.gold=100;d.S.bag=[];d.monsters=[];d.terrain=[];d.loot=[];d.features=[{x:7,y:6,type:'merchant',merchantId:'arms',found:true,stock:[{kind:'gear',item:{slot:'armor',name:'Armure de test',rarity:1,itemLevel:5,def:1},price:22,qty:1}]}];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-10')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-10','1')}},{key,data:fixture10});
    await page.reload();await page.locator('#resume').tap();await page.locator('[data-d="1,0"]').tap();
    assert.ok((await page.locator('#panel').textContent()).includes('Armurier itinérant'));
    await page.locator('[data-buy="0"]').tap();let bought=await read();assert.equal(bought.S.gold,78);assert.equal(bought.features[0].stock[0].qty,0);assert.equal(bought.S.bag.length,1);assert.equal(bought.S.x,6);
    await page.locator('#shopSell').tap();await page.locator('[data-sell]').tap();let sold=await read();assert.equal(sold.S.gold,86);assert.equal(sold.S.bag.length,0);
    await page.locator('#shopBack').tap();await page.reload();await page.locator('#resume').tap();assert.equal((await read()).S.gold,86);assert.equal((await read()).features[0].stock[0].qty,0);
    // GAME-006E: special room via direction pad, single choice, persistence.
    const fixture11=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=6;d.S.y=6;d.S.hp=20;d.S.maxHp=50;d.S.res=5;d.S.maxRes=30;d.monsters=[];d.terrain=[];d.loot=[];d.features=[{x:7,y:6,type:'specialRoom',roomId:'sanctuary',found:true,spent:false}];return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-11')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-11','1')}},{key,data:fixture11});
    await page.reload();await page.locator('#resume').tap();await page.locator('[data-d="1,0"]').tap();
    assert.ok((await page.locator('#panel').textContent()).includes('Sanctuaire de repos'));
    await page.locator('#roomBack').tap();assert.equal((await read()).features[0].spent,false);
    await page.locator('[data-d="1,0"]').tap();await page.locator('[data-room-choice="rest"]').tap();
    let rested=await read();assert.equal(rested.S.hp,34);assert.equal(rested.features[0].spent,true);assert.equal(rested.features[0].choice,'rest');assert.equal(rested.S.turn,fixture11.S.turn+1);
    await page.reload();await page.locator('#resume').tap();assert.equal((await read()).features[0].spent,true);
    await page.locator('[data-d="1,0"]').tap();assert.equal((await read()).S.x,7);assert.equal((await read()).S.hp,34);
    await page.locator('#menu').tap();await page.locator('#pauseopts').tap();
    await page.locator('#zoom').selectOption('150');assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).zoom,pref),150);
    await page.locator('#optback').tap();await page.locator('#back').tap();
    d=await read();await page.reload();await page.locator('#resume').tap();assert.equal((await read()).S.turn,d.S.turn);
    await page.setViewportSize({width:851,height:393});
    assert.ok(await page.locator('[data-d]').evaluateAll(a=>a.every(b=>{const r=b.getBoundingClientRect();return r.width>=30&&r.height>=30&&r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})));
    // GAME-006F: final exit, history persists independently, new game remains available.
    await page.setViewportSize({width:393,height:851});
    const fixture12=await page.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.S.x=6;d.S.y=6;d.S.floor=30;d.S.hp=30;d.S.maxHp=50;d.S.turn=150;d.S.kills=20;d.monsters=[];d.terrain=[];d.loot=[];d.features=[];d.stairs={x:7,y:6};for(let y=4;y<=10;y++)for(let x=4;x<=10;x++)d.map[y*48+x]=0;return d},key);
    await page.addInitScript(({key,data})=>{if(!sessionStorage.getItem('fixture-12')){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('fixture-12','1')}},{key,data:fixture12});
    await page.reload();await page.locator('#resume').tap();await page.locator('[data-d="1,0"]').tap();
    assert.equal(await read(),null);assert.ok((await page.locator('#panel').textContent()).includes('Victoire'));
    await page.locator('#endHistory').tap();assert.ok((await page.locator('#panel').textContent()).includes('Panthéon des aventuriers'));
    const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('rogue-android-history-v1')));assert.equal(records.wins,1);assert.equal(records.fastestWin,151);
    await page.reload();assert.equal(await page.locator('#resume').count(),0);await page.locator('#startHistory').tap();
    assert.ok((await page.locator('#panel').textContent()).includes('Victoires : 1'));await page.locator('#historyBack').tap();
    await page.locator('[data-class="rogue"]').tap();assert.equal((await read()).S.floor,1);assert.equal((await read()).S.classId,'rogue');
    // GAME-007B: actual 16px center tile, same board and gear fixtures for each hero.
    const playerPixels=()=>page.locator('canvas').evaluate(c=>{
      const x=Math.floor(c.width/16/2)*16,y=Math.floor(c.height/16/2)*16;
      return Array.from(c.getContext('2d').getImageData(x,y,16,16).data).join(',');
    });
    const heroFixture=await read(),heroPixels=new Set();
    for(const [classId,family] of [['warrior','axe'],['rogue','dagger'],['ranger','bow'],['mage','staff']]){
      const fixture=JSON.parse(JSON.stringify(heroFixture));fixture.S.classId=classId;
      fixture.S.equip={weapon:null,armor:null,ring:null,helmet:null,boots:null};
      fixture.S.bag=[{id:++fixture.S.serial,slot:'weapon',family,name:'Arme de test',rarity:3,atk:1,def:0,crit:0,regen:0,dodge:0}];
      fixture.monsters=[];fixture.features=[];fixture.terrain=[];fixture.loot=[];
      // Inject after navigation: the previous document saves on visibilitychange.
      await page.addInitScript(({key,fixture,marker})=>{if(!sessionStorage.getItem(marker)){localStorage.setItem(key,JSON.stringify(fixture));sessionStorage.setItem(marker,'1')}},{key,fixture,marker:'hero-art-'+classId});
      await page.reload();await page.locator('#resume').tap();
      assert.equal((await read()).S.classId,classId);assert.equal((await read()).S.bag[0].id,fixture.S.bag[0].id);
      const bare=await playerPixels();heroPixels.add(bare);
      if(process.env.ROGUE_ART_PREVIEW)await page.screenshot({path:'art-preview/hero-'+classId+'-bare.png'});
      await page.locator('#inventory').tap();await page.locator('[data-equip="'+fixture.S.bag[0].id+'"]').tap();
      await page.locator('#close').tap();const equipped=await playerPixels(),saved=await read();
      assert.notEqual(equipped,bare);assert.equal(saved.S.equip.weapon.family,family);
      assert.equal(saved.S.turn,fixture.S.turn);assert.equal(saved.S.x,fixture.S.x);assert.equal(saved.S.y,fixture.S.y);
      await page.reload();await page.locator('#resume').tap();
      assert.equal(await playerPixels(),equipped);assert.deepEqual(await read(),saved);
      if(process.env.ROGUE_ART_PREVIEW)await page.screenshot({path:'art-preview/hero-'+classId+'-equipped.png'});
    }
    assert.equal(heroPixels.size,4);
    // GAME-007C: all 23 ordinary enemy identities on a controlled real canvas.
    const enemyFixture=await read();
    enemyFixture.S.x=20;enemyFixture.S.y=15;enemyFixture.map.fill(0);enemyFixture.seen.fill(1);
    enemyFixture.terrain=[];enemyFixture.features=[];enemyFixture.loot=[];enemyFixture.stairs={x:30,y:25};
    const roles=['guardian','brute','wanderer','archer','ambusher','coward','tracker'];
    const species=['boneguard','wraith','cavefang','spitter','sentinel','runecaster','slag','cinder','templar','oracle','mycelium','sporeling','frostfang','icecaller','voidstalker','riftspawn'];
    const cells=[];for(let y=13;y<=17;y++)for(let x=18;x<=22;x++)if(x!==20||y!==15)cells.push({x,y});
    const mobs=[...roles.map(role=>({role})),...species.map(species=>({role:'brute',species}))].map((m,i)=>({...m,...cells[i],hp:10,maxHp:10,atk:1,color:'#bbb',kind:'Test '+i}));
    let enemyLoad=0;
    const loadEnemies=async monsters=>{
      await page.addInitScript(({key,data,marker})=>{if(!sessionStorage.getItem(marker)){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem(marker,'1')}},{key,data:{...enemyFixture,monsters},marker:'enemy-art-'+(++enemyLoad)});
      await page.reload();await page.locator('#resume').tap();
    };
    const enemyPixels=()=>page.locator('canvas').evaluate((c,cells)=>{
      const ctx=c.getContext('2d'),ox=20-Math.floor(c.width/16/2),oy=15-Math.floor(c.height/16/2);
      return cells.map(({x,y})=>Array.from(ctx.getImageData((x-ox)*16,(y-oy)*16,16,16).data).join(','));
    },cells.slice(0,23));
    await loadEnemies([]);const emptyTiles=await enemyPixels();
    await loadEnemies(mobs);const fullTiles=await enemyPixels();
    assert.ok(fullTiles.every((v,i)=>v!==emptyTiles[i]));assert.equal((await read()).monsters.length,23);
    const fullSave=await read();await page.reload();await page.locator('#resume').tap();
    assert.deepEqual(await enemyPixels(),fullTiles);assert.deepEqual(await read(),fullSave);
    if(process.env.ROGUE_ART_PREVIEW)await page.screenshot({path:'art-preview/enemies-23-mobile.png'});
    // An undisplayed monster in explored memory must not alter the canvas.
    const hidden={...mobs[0],x:32,y:15};await loadEnemies([...mobs,hidden]);const hiddenArt=await artPixels();
    await loadEnemies(mobs);assert.deepEqual(await artPixels(),hiddenArt);
    // GAME-007D: all eight bosses on the same board, phase changes and save purity.
    const bossIds=['stone','ash','veil','ossuary','mire','runes','frost','abyssal'];
    const bossCells=cells.slice(0,8);
    const bossMobs=bossIds.map((boss,i)=>({...bossCells[i],boss,phase:1,hp:30,maxHp:30,atk:1,role:'guardian',elite:true,kind:boss,color:'#bbb'}));
    await loadEnemies([]);const noBoss=await enemyPixels();
    await loadEnemies(bossMobs);const phaseOne=await enemyPixels();
    assert.ok(phaseOne.slice(0,8).every((v,i)=>v!==noBoss[i]));
    assert.equal(new Set(phaseOne.slice(0,8)).size,8);
    if(process.env.ROGUE_ART_PREVIEW)await page.screenshot({path:'art-preview/bosses-8-mobile.png'});
    const finalBosses=bossMobs.map((m,i)=>({...m,phase:i<3?2:3}));
    await loadEnemies(finalBosses);const finalArt=await enemyPixels();
    assert.ok(finalArt.slice(0,8).every((v,i)=>v!==phaseOne[i]));
    const bossSave=await read();await page.reload();await page.locator('#resume').tap();
    assert.deepEqual(await enemyPixels(),finalArt);assert.deepEqual(await read(),bossSave);
    if(process.env.ROGUE_ART_PREVIEW)await page.screenshot({path:'art-preview/bosses-8-final-phases-mobile.png'});
    await loadEnemies([...finalBosses,{...finalBosses[0],x:32,y:15}]);const hiddenBoss=await artPixels();
    await loadEnemies(finalBosses);assert.deepEqual(await artPixels(),hiddenBoss);
    // GAME-007E: real canvas object states and shared inventory icon.
    const objectFixture=JSON.parse(JSON.stringify(enemyFixture));
    objectFixture.monsters=[];objectFixture.S.bag=[{id:900,slot:'weapon',family:'axe',rarity:3,name:'Hache de test',atk:1}];objectFixture.S.serial=900;
    const objectFeatures=[
      {type:'door',open:false},{type:'chest',open:false},{type:'trap',spent:false},
      {type:'merchant',merchantId:'arms',stock:[]},{type:'event',eventId:'shrine',spent:false},
      {type:'specialRoom',roomId:'library',spent:false},{type:'secret',found:false,open:false}
    ].map((f,i)=>({found:true,...f,...cells[i]}));
    const objectLoot=[
      ...['blade','axe','mace','dagger','spear','bow','staff'].map(family=>({kind:'gear',item:{slot:'weapon',family,rarity:3}})),
      ...['heal','focus','insight','ward','smoke','toolkit'].map(consumable=>({kind:'consumable',consumable})),
      {kind:'bandage'}
    ].map((l,i)=>({...l,...cells[i+7]}));
    let objectLoad=0;
    const loadObjects=async(features,loot)=>{
      await page.addInitScript(({key,data,marker})=>{if(!sessionStorage.getItem(marker)){localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem(marker,'1')}},{key,data:{...objectFixture,features,loot},marker:'object-art-'+(++objectLoad)});
      await page.reload();await page.locator('#resume').tap();
    };
    await loadObjects([],[]);const objectEmpty=await enemyPixels();
    await loadObjects(objectFeatures,objectLoot);const objectFull=await enemyPixels();
    assert.ok(objectFull.slice(0,21).every((v,i)=>i===6?v===objectEmpty[i]:v!==objectEmpty[i]));
    if(process.env.ROGUE_ART_PREVIEW)await page.screenshot({path:'art-preview/objects-mobile.png'});
    await page.locator('#inventory').tap();assert.equal(await page.locator('[data-equip="900"] svg').count(),1);
    if(process.env.ROGUE_ART_PREVIEW)await page.locator('[data-equip="900"]').screenshot({path:'art-preview/inventory-object-icon.png'});
    await page.locator('#close').tap();
    const changedFeatures=objectFeatures.map((f,i)=>i<3?{...f,open:true,spent:true}:f);
    await loadObjects(changedFeatures,objectLoot);const changedArt=await enemyPixels();
    assert.ok(changedArt.slice(0,3).every((v,i)=>v!==objectFull[i]));
    const objectSave=await read();await page.reload();await page.locator('#resume').tap();
    assert.deepEqual(await enemyPixels(),changedArt);assert.deepEqual(await read(),objectSave);
    if(process.env.ROGUE_ART_PREVIEW)await page.screenshot({path:'art-preview/objects-open-mobile.png'});
    await loadObjects(changedFeatures,[...objectLoot,{x:32,y:15,kind:'bandage'}]);const hiddenLoot=await artPixels();
    await loadObjects(changedFeatures,objectLoot);assert.deepEqual(await artPixels(),hiddenLoot);
    assert.deepEqual(errors,[]);console.log('Chromium mobile: touch, 8 directions, wait, inventory, zoom, reload, landscape and canvas OK');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
