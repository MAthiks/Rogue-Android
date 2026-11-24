// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testDeepExploration(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,EXPLORATION_EVENTS,RARE_ENCOUNTERS,buildDungeon,decorateDungeon,buildTerrain,buildExploration,addDeepSecret,buildSpecialRooms,buildMerchant,placeConsumable,addSupplies,promoteEnemies,balanceEnemies,resolveEvent,eventChoiceAllowed,resolveSpecialRoom,specialRoomAllowed,SPECIAL_ROOMS,goldBalance,GOLD_CAP,POUCH_CAP,validateTransferRun,exportTransfer,parseTransfer,kill,pouchCount,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');
  const k=p=>p.y*48+p.x,reach=(map,start)=>{
    const q=[k(start)],seen=new Set(q);
    for(let i=0;i<q.length;i++){const x=q[i]%48,y=Math.floor(q[i]/48);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*48+nx;if(nx>=0&&ny>=0&&nx<48&&ny<32&&map[n]===0&&!seen.has(n)){seen.add(n);q.push(n)}}}return seen;
  };
  let second=0,rooms=0;const kinds=new Set(),rares=new Set(),roomKinds=new Set();
  for(let seed=0;seed<600;seed++){
    const floor=1+seed%30,d=g.buildDungeon(48,32,floor,seed),a=g.decorateDungeon(d,48,32,floor),b=g.decorateDungeon(d,48,32,floor);
    const first=a.features.filter(f=>f.type==='secret').length;
    const added=g.addDeepSecret(d,a,48,32,floor);
    assert(added===g.addDeepSecret(d,b,48,32,floor)&&JSON.stringify(a)===JSON.stringify(b),'secret determinism');
    assert(a.features.filter(f=>f.type==='secret').length===first+Number(added),'bounded secret count');
    if(added){second++;assert(floor>=8&&first===1,'deep gate');}
    const opened=a.map.slice();for(const f of a.features.filter(f=>f.type==='door'))opened[k(f)]=0;
    const seen=reach(opened,d.start);assert(seen.has(k(d.stairs))&&d.map.every((v,i)=>v!==0||seen.has(i)),'main route preserved');
    for(const f of a.features.filter(f=>f.type==='chest'&&f.secret))assert(!seen.has(k(f)),'secret sealed');
    for(const f of a.features.filter(f=>f.type==='secret'))opened[k(f)]=0;
    assert(reach(opened,d.start).size===opened.filter(x=>x===0).length,'all secret floors reachable after discovery');
    const terrain=g.buildTerrain(d,a,48,32,floor),loot=g.addSupplies(d,a,terrain);loot.push(...g.placeConsumable(d,a,terrain,loot,floor));
    const mobs=g.balanceEnemies(g.promoteEnemies(d.monsters,floor,seed,d.stairs),floor);
    const e=g.buildExploration(d,a,terrain,loot,mobs,floor);a.features.push(...e.events);
    for(const f of e.events)kinds.add(f.eventId);if(e.rare){rares.add(e.rare.rare);const v=g.RARE_ENCOUNTERS.find(x=>x.id===e.rare.rare);assert(floor>=(v.min||3)&&(!v.role||e.rare.role===v.role),'rare gate and role')}
    const merchant=g.buildMerchant(d,a,terrain,loot,mobs,floor,48,32);if(merchant)a.features.push(merchant);
    const special=g.buildSpecialRooms(d,a,terrain,loot,mobs,floor,48,32);
    assert(special.length<=3,'room bound');
    for(const f of special){roomKinds.add(f.roomId);rooms++;if(f.secret){const i=a.features.findIndex(z=>z.type==='chest'&&z.secret&&k(z)===k(f));assert(i>=0,'secret replacement');a.features.splice(i,1,f)}else a.features.push(f)}
    const used=new Set([d.start,d.stairs,...mobs,...loot,...terrain].map(k));
    for(const f of a.features){assert(!used.has(k(f)),'feature collision '+f.type);used.add(k(f))}
  }
  assert(second>30&&kinds.size===10&&rares.size===6&&roomKinds.size===8,'expanded coverage');
  const d=g.state(),s=d.S;d.monsters.splice(0);d.features.splice(0);d.terrain.splice(0);d.loot.splice(0);
  d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  s.x=6;s.y=6;d.stairs.x=15;d.stairs.y=15;s.level=20;s.floor=18;s.xp=0;s.maxHp=100;s.maxRes=30;
  const reset=()=>{s.hp=30;s.res=10;s.gold=100;s.bandages=5;s.shield=0;s.pouch={};s.bag=[];s.xp=0};
  const fixture=(type,id)=>{const f={x:7,y:6,type,[type==='event'?'eventId':'roomId']:id,found:true,spent:false};d.features.splice(0,d.features.length,f);return f};
  const cases=[
    ['event','forge','forgeGear',()=>s.gold===80&&s.bag[0].rarity>=3],
    ['event','forge','forgeWard',()=>s.res===6&&s.shield===16],
    ['event','ossuary','boneGold',()=>s.gold===112],
    ['event','ossuary','boneAid',()=>s.bandages===4&&g.pouchCount('ward')===1&&g.pouchCount('focus')===1],
    ['event','mirror','mirrorStudy',()=>s.hp===25&&s.xp===33],
    ['event','mirror','mirrorFocus',()=>s.gold===92&&s.res===19],
    ['event','caravan','caravanBuy',()=>s.gold===88&&g.pouchCount('heal')===1&&g.pouchCount('smoke')===1],
    ['event','caravan','caravanTrade',()=>s.gold===116&&s.bandages===4],
    ['event','reliquary','relicBlood',()=>s.hp===20&&s.res===7&&s.bag[0].rarity>=4],
    ['event','reliquary','relicWard',()=>s.res===5&&g.pouchCount('ward')===1&&g.pouchCount('insight')===1],
    ['specialRoom','shrineTrial','oathHeal',()=>s.bandages===3&&s.hp===54&&s.res===19],
    ['specialRoom','shrineTrial','oathWard',()=>s.gold===85&&s.shield===20],
    ['specialRoom','hiddenArchive','archiveStudy',()=>s.xp===56],
    ['specialRoom','hiddenArchive','archiveScroll',()=>g.pouchCount('insight')===1&&g.pouchCount('ward')===1],
    ['specialRoom','hiddenTreasury','treasuryGold',()=>s.gold===161],
    ['specialRoom','hiddenTreasury','treasuryGear',()=>s.bag[0].rarity>=4]];
  for(const [type,id,choice,verify] of cases){
    reset();const f=fixture(type,id),resolve=type==='event'?g.resolveEvent:g.resolveSpecialRoom,t=s.turn;
    assert(!resolve(f,'wrong')&&s.turn===t&&!f.spent,'wrong choice');
    assert(resolve(f,choice)&&verify()&&s.turn===t+1&&f.spent&&f.choice===choice,'consequence '+choice);
    assert(!resolve(f,choice)&&s.turn===t+1,'one use '+choice);
  }
  reset();let f=fixture('event','reliquary');s.hp=10;assert(!g.resolveEvent(f,'relicBlood')&&!f.spent,'nonlethal');s.hp=30;s.res=3;assert(!g.resolveEvent(f,'relicBlood'),'resource check');
  reset();f=fixture('event','caravan');s.gold=11;assert(!g.resolveEvent(f,'caravanBuy'),'gold check');s.gold=100;s.pouch.heal=g.POUCH_CAP;assert(!g.resolveEvent(f,'caravanBuy'),'atomic pouch capacity');
  reset();f=fixture('specialRoom','hiddenTreasury');s.bag=Array.from({length:24},(_,i)=>({id:i+1}));assert(!g.resolveSpecialRoom(f,'treasuryGear'),'bag capacity');
  reset();f=fixture('specialRoom','shrineTrial');assert(g.resolveSpecialRoom(f,'oathWard'),'save fixture');g.save();const r=load(newHtml);assert(r.restore()&&r.state().features[0].choice==='oathWard','restore choice');r.resume();assert(!r.resolveSpecialRoom(r.state().features[0],'oathWard'),'no repeat after restore');assert(g.parseTransfer(g.exportTransfer()).run.features[0].choice==='oathWard','portable choice');
  return {seeds:600,secondSecrets:second,events:kinds.size,rareTypes:rares.size,roomTypes:roomKinds.size,rooms,choices:cases.length,persistence:'passed',transfer:'passed',accessibility:'passed'};
}
console.log(testDeepExploration(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
