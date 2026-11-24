// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testRooms006E(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,SPECIAL_ROOMS,buildSpecialRooms,specialRoomAllowed,resolveSpecialRoom,MERCHANTS,GOLD_CAP,goldBalance,goldReward,gearPrice,salePrice,merchantStock,buildMerchant,merchantAvailable,canBuy,buyMerchant,canSell,sellMerchant,EXTENDED_BOSSES,selectBossVariant,extendedBossAction,extendedBossReward,promoteEnemies,bossReward,kill,BESTIARY,CREATURE_POWERS,populateBestiary,creatureAction,enemyPhase,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');const counts={};let regular=0,hidden=0;
  for(let seed=0;seed<600;seed++){
    const floor=4+seed%27,d=g.buildDungeon(48,32,floor,seed),deco=g.decorateDungeon(d,48,32,floor),t=g.buildTerrain(d,deco,48,32,floor,g.biomeForFloor(floor,seed));
    const m=g.buildMerchant(d,deco,t,d.loot,d.monsters,floor,48,32);if(m)deco.features.push(m);
    const rooms=g.buildSpecialRooms(d,deco,t,d.loot,d.monsters,floor,48,32);
    assert(JSON.stringify(rooms)===JSON.stringify(g.buildSpecialRooms(d,deco,t,d.loot,d.monsters,floor,48,32)),'determinism');
    assert(!g.buildSpecialRooms(d,deco,t,d.loot,d.monsters,3,48,32).length,'early floors');
    assert(rooms.length<=2,'bounded rooms');
    for(const f of rooms){
      counts[f.roomId]=(counts[f.roomId]||0)+1;assert(g.SPECIAL_ROOMS[f.roomId].min<=floor,'min floor');
      assert(![d.start,d.stairs,...d.monsters,...d.loot,...t].some(p=>p.x===f.x&&p.y===f.y),'no overlap');
      if(f.secret){hidden++;assert(deco.features.some(x=>x.secret&&x.type==='chest'&&x.x===f.x&&x.y===f.y),'existing hidden chamber')}
      else {regular++;assert(!deco.features.some(x=>x.x===f.x&&x.y===f.y),'no feature overlap');for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)assert(deco.map[(f.y+y)*48+f.x+x]===0,'nonblocking')}
    }
  }
  assert(Object.keys(counts).length===5&&regular>350&&hidden>0,'coverage');
  const d=g.state();d.monsters.splice(0);d.terrain.splice(0);d.features.splice(0);d.loot.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.S.floor=10;d.S.maxHp=50;d.S.hp=20;d.S.maxRes=30;d.S.res=10;d.stairs.x=15;d.stairs.y=15;g.resume();
  const site=id=>{const f={x:7,y:6,type:'specialRoom',roomId:id,found:true,spent:false};d.features.splice(0,d.features.length,f);return f};
  let f=site('sanctuary'),turn=d.S.turn;assert(!g.resolveSpecialRoom(f,'blood'),'wrong choice');
  assert(g.resolveSpecialRoom(f,'rest')&&d.S.hp===34&&d.S.res>=16&&d.S.turn===turn+1&&!g.resolveSpecialRoom(f,'rest'),'once and one turn');
  f=site('sanctuary');assert(g.resolveSpecialRoom(f,'protect')&&d.S.shield===12,'shield');
  f=site('library');const xp=d.S.xp,level=d.S.level;assert(g.resolveSpecialRoom(f,'study')&&(d.S.level>level||d.S.xp>xp),'study');
  f=site('library');assert(g.resolveSpecialRoom(f,'scroll')&&d.S.pouch.insight>0&&d.S.pouch.ward>0,'scrolls');
  f=site('vault');const gold=g.goldBalance();assert(g.resolveSpecialRoom(f,'gold')&&g.goldBalance()===gold+35,'gold');
  f=site('vault');assert(g.resolveSpecialRoom(f,'gear')&&d.S.bag.at(-1).rarity>=3,'rare gear');
  f=site('cursed');d.S.hp=8;assert(!g.resolveSpecialRoom(f,'blood')&&!f.spent,'nonlethal sacrifice');
  d.S.hp=20;assert(g.resolveSpecialRoom(f,'blood')&&d.S.hp===12&&d.S.bag.at(-1).rarity>=4,'blood');
  f=site('cursed');d.S.shield=0;d.S.res=10;assert(g.resolveSpecialRoom(f,'purify')&&d.S.shield===10,'purify');
  f=site('hidden');assert(g.resolveSpecialRoom(f,'relic')&&d.S.bag.at(-1).rarity>=3,'hidden gear');
  f=site('hidden');const bandages=d.S.bandages;assert(g.resolveSpecialRoom(f,'supplies')&&d.S.bandages===bandages+2&&d.S.pouch.heal>0,'hidden supplies');
  g.save();const r=load(newHtml);assert(r.restore()&&r.state().features[0].spent&&r.state().features[0].choice==='supplies','persistent consumed site');r.resume();assert(!r.resolveSpecialRoom(r.state().features[0],'supplies'),'no repeat after reload');
  return {seeds:600,regular,hidden,counts,choices:10,persistence:'passed'};
}
console.log(testRooms006E(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
