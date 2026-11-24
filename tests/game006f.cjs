// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testEndgame006F(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,HISTORY_KEY,FINAL_FLOOR,HISTORY_LIMIT,readHistory,runSummary,recordRun,endRun,SPECIAL_ROOMS,buildSpecialRooms,specialRoomAllowed,resolveSpecialRoom,MERCHANTS,GOLD_CAP,goldBalance,goldReward,gearPrice,salePrice,merchantStock,buildMerchant,merchantAvailable,canBuy,buyMerchant,canSell,sellMerchant,EXTENDED_BOSSES,selectBossVariant,extendedBossAction,extendedBossReward,promoteEnemies,bossReward,kill,BESTIARY,CREATURE_POWERS,populateBestiary,creatureAction,enemyPhase,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml),key='rogue-android-game002-v1';g.newGame('warrior');
  const fixture=(game,floor)=>{const d=game.state();d.monsters.splice(0);d.features.splice(0);d.terrain.splice(0);d.loot.splice(0);d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;d.S.x=6;d.S.y=6;d.S.floor=floor;d.stairs.x=7;d.stairs.y=6;game.resume();return d};
  let d=fixture(g,29);assert(!g.endRun('victory'),'no early victory');
  d=fixture(g,30);assert(!g.endRun('victory'),'must reach exit');
  d.S.x=7;d.monsters.push({x:9,y:6,hp:10,maxHp:10,atk:2,boss:'abyssal',role:'guardian',kind:'Nox'});assert(!g.endRun('victory'),'living boss blocks victory');
  d.monsters.splice(0);d.loot.push({x:7,y:6,kind:'gear'});assert(!g.endRun('victory'),'exit loot blocks victory');d.loot.splice(0);
  d.S.x=6;d.S.level=20;d.S.turn=100;d.S.kills=120;d.S.gold=50;d.S.bag=[{id:1,bossRelic:true,uniqueId:'boss-stone'},{id:2,bossRelic:true,uniqueId:'boss-ash'},{id:3,bossRelic:true,uniqueId:'boss-veil'},{id:4,bossRelic:true,uniqueId:'boss-veil'}];g.save();g.move(1,0);
  let h=g.readHistory();assert(d.S.ended==='victory'&&d.S.floor===30&&h.total===1&&h.wins===1&&h.fastestWin===101,'victory and turn');
  assert(h.runs[0].score===7550&&h.runs[0].relics===3,'score and unique relics');assert(!storage.has(key),'victory save removed');
  assert(!g.endRun('victory'),'duplicate blocked');g.save();assert(!storage.has(key),'no resurrected save');
  const resumed=load(newHtml);assert(!resumed.restore()&&resumed.readHistory().wins===1,'history separate');
  for(const cls of ['rogue','ranger','mage']){resumed.newGame(cls);const d=fixture(resumed,30);d.S.turn=250;resumed.move(1,0)}
  h=resumed.readHistory();assert(h.wins===4&&h.challenges.length===4,'all challenges');
  resumed.newGame('warrior');resumed.die();assert(resumed.readHistory().deaths===1&&!storage.has(key),'death');resumed.newGame('mage');assert(resumed.endRun('abandoned')&&resumed.readHistory().abandoned===1,'abandon');
  for(let i=0;i<55;i++){resumed.newGame('rogue');resumed.die()}
  h=resumed.readHistory();assert(h.runs.length===50&&h.total===61&&h.wins===4&&h.bestScore===7550,'bounded history and durable records');
  storage.set(g.HISTORY_KEY,'invalid json');assert(g.readHistory().total===0,'corrupt history safe');
  return {victory:'passed',death:'passed',abandon:'passed',historyLimit:50,records:'passed',challenges:4};
}
console.log(testEndgame006F(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
