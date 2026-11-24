// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testExploration(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,EXPLORATION_EVENTS,RARE_ENCOUNTERS,buildDungeon,decorateDungeon,buildTerrain,buildExploration,promoteEnemies,balanceEnemies,resolveEvent,eventChoiceAllowed,kill,pouchCount,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let d=g.state(),s=d.S;
  const kinds=new Set(),rares=new Set();let events=0,encounters=0;
  for(let seed=0;seed<600;seed++){
    const floor=1+seed%30,layout=g.buildDungeon(48,32,floor,seed),deco=g.decorateDungeon(layout,48,32,floor),terrain=g.buildTerrain(layout,deco,48,32,floor);
    const mobs=g.balanceEnemies(g.promoteEnemies(layout.monsters,floor,seed,layout.stairs),floor);
    const e=g.buildExploration(layout,deco,terrain,layout.loot,mobs,floor);
    assert(JSON.stringify(e)===JSON.stringify(g.buildExploration(layout,deco,terrain,layout.loot,mobs,floor)),'determinism');
    const used=new Set([layout.start,layout.stairs,...mobs,...layout.loot,...deco.features,...terrain].map(p=>p.x+','+p.y));
    for(const f of e.events){assert(!used.has(f.x+','+f.y)&&deco.map[f.y*48+f.x]===0,'no overlap');used.add(f.x+','+f.y);assert(g.EXPLORATION_EVENTS[f.eventId].min<=floor,'depth gate');kinds.add(f.eventId);events++}
    if(e.rare){const original=mobs.find(m=>m.x===e.rare.x&&m.y===e.rare.y);assert(floor>=3&&original&&!original.elite&&!original.boss&&e.rare.maxHp>original.maxHp,'rare promotion');rares.add(e.rare.rare);encounters++}
  }
  assert(kinds.size===10&&rares.size===6&&encounters>30,'catalog coverage');
  d.monsters.splice(0);d.features.splice(0);d.terrain.splice(0);d.loot.splice(0);
  d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  s.x=6;s.y=6;d.stairs.x=15;d.stairs.y=15;s.level=12;s.floor=12;s.maxHp=100;s.hp=30;s.maxRes=30;s.res=10;s.bandages=5;
  const event=id=>{const f={x:7,y:6,type:'event',eventId:id,found:true,spent:false};d.features.splice(0,d.features.length,f);return f};
  let f=event('shrine'),t=s.turn;assert(g.resolveEvent(f,'blessing')&&s.hp===40&&s.res===15&&s.turn===++t,'blessing');
  assert(!g.resolveEvent(f,'offering')&&s.turn===t,'single use');
  f=event('shrine');assert(g.resolveEvent(f,'offering')&&s.bandages===4&&s.shield===10&&s.turn===++t,'offering');
  f=event('cache');assert(g.resolveEvent(f,'supplies')&&s.bandages===6&&s.turn===++t,'supplies');
  f=event('cache');assert(g.resolveEvent(f,'gear')&&s.bag.at(-1).rarity>=2&&s.turn===++t,'gear');
  f=event('fountain');assert(g.resolveEvent(f,'drink')&&s.hp===48&&s.turn===++t,'drink');
  f=event('fountain');assert(g.resolveEvent(f,'bottle')&&g.pouchCount('heal')===1&&s.turn===++t,'bottle');
  f=event('obelisk');s.res=10;s.xp=0;assert(g.resolveEvent(f,'study')&&s.xp===20&&s.res===7&&s.turn===++t,'study');
  f=event('obelisk');s.hp=6;assert(!g.resolveEvent(f,'sacrifice')&&s.turn===t&&!f.spent,'no lethal sacrifice');s.hp=30;
  assert(g.resolveEvent(f,'sacrifice')&&s.hp===24&&s.bag.at(-1).rarity>=3&&s.turn===++t,'sacrifice');
  f=event('survivor');assert(g.resolveEvent(f,'aid')&&s.bandages===5&&g.pouchCount('heal')===2&&g.pouchCount('focus')===1&&s.turn===++t,'aid');
  f=event('survivor');assert(g.resolveEvent(f,'trade')&&g.pouchCount('insight')===1&&s.turn===++t,'trade');
  f=event('cache');assert(!g.resolveEvent(f,'drink'),'wrong choice');s.bag=Array.from({length:24},(_,i)=>({id:i+1}));assert(!g.resolveEvent(f,'gear'),'full bag');assert(g.resolveEvent(f,'skip')&&s.turn===++t,'skip');
  g.save();const resumed=load(newHtml);assert(resumed.restore()&&resumed.state().features[0].spent&&resumed.state().features[0].choice==='skip','persist choice');
  resumed.resume();const q=resumed.state();let prev=q.S.turn;resumed.move(1,0);assert(q.S.x===7&&q.S.turn===prev+1,'resolved walkable');
  const m={x:9,y:6,kind:'rare',rare:'iron',affix:'armored',elite:true,hp:0,maxHp:25};q.monsters.push(m);resumed.kill(m);const drops=resumed.state().loot.filter(l=>l.x===9&&l.y===6);assert(drops.length===2&&drops.some(l=>l.kind==='gear'&&l.item.rarity>=4)&&drops.some(l=>l.kind==='consumable'),'rare reward');
  return {seeds:600,events,encounters,kinds:kinds.size,rareTypes:rares.size,choices:'passed',persistence:'passed',rewards:'passed'};
}
console.log(testExploration(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
