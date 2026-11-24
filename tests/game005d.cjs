// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testConsumables(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,CONSUMABLES,pouchCount,addConsumable,rollConsumable,canUseConsumable,useConsumable,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let d=g.state(),s=d.S;
  d.monsters.splice(0);d.features.splice(0);d.terrain.splice(0);d.loot.splice(0);
  d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  s.x=6;s.y=6;d.stairs.x=15;d.stairs.y=15;s.level=12;s.maxHp=100;s.hp=20;s.maxRes=30;s.res=5;
  for(const id of Object.keys(g.CONSUMABLES)){for(let i=0;i<5;i++)assert(g.addConsumable(id),'add');assert(!g.addConsumable(id)&&g.pouchCount(id)===5,'cap')}
  assert(!g.addConsumable('unknown'),'invalid');
  let t=s.turn;assert(g.useConsumable('heal')&&s.hp===36&&s.turn===++t&&g.pouchCount('heal')===4,'heal turn');
  s.hp=100;assert(!g.useConsumable('heal')&&s.turn===t&&g.pouchCount('heal')===4,'no waste');
  s.res=5;assert(g.useConsumable('focus')&&s.res===14&&s.turn===++t,'focus plus regen');
  assert(g.useConsumable('guard')&&s.guard===3&&s.turn===++t,'guard');
  assert(g.useConsumable('power')&&s.boost===4&&s.turn===++t,'power');
  assert(g.useConsumable('ward')&&s.shield===12&&s.turn===++t,'ward');
  const trap={x:7,y:6,type:'trap',found:false,spent:false},secret={x:10,y:6,type:'secret',found:false,spent:false},far={x:14,y:6,type:'trap',found:false,spent:false};
  d.features.push(trap,secret,far);
  assert(g.useConsumable('insight')&&trap.found&&secret.found&&!far.found&&!trap.spent&&s.turn===++t,'detection');
  assert(!g.useConsumable('insight')&&s.turn===t,'no target');
  assert(g.useConsumable('toolkit')&&trap.spent&&!far.spent&&s.turn===++t,'disarm');
  const m={x:7,y:6,hp:30,maxHp:30,atk:5,kind:'cible',role:'melee',color:'#ccc'};d.monsters.push(m);
  const hp=s.hp;assert(g.useConsumable('smoke')&&s.hp===hp&&m.stun===0&&s.turn===++t,'smoke prevents action');
  d.monsters.splice(0);s.pouch.heal=5;d.loot.push({x:6,y:6,kind:'consumable',consumable:'heal'});
  g.collectLoot(6,6);assert(d.loot.length===1&&g.pouchCount('heal')===5,'full pouch preserves ground');
  s.pouch.heal=4;s.bag=Array.from({length:24},(_,i)=>({id:i+1}));g.collectLoot(6,6);d=g.state();assert(!d.loot.length&&g.pouchCount('heal')===5&&s.bag.length===24,'independent pouch');
  g.save();const resumed=load(newHtml);assert(resumed.restore()&&JSON.stringify(resumed.state().S.pouch)===JSON.stringify(s.pouch),'persist');
  delete s.pouch;g.save();const legacy=load(newHtml);assert(legacy.restore()&&legacy.pouchCount('heal')===0,'legacy');
  for(let floor=1;floor<=30;floor++){for(let i=0;i<100;i++){const id=g.rollConsumable(floor,n=>i%n);assert(g.CONSUMABLES[id].min<=floor,'depth gate')}legacy.state().S.floor=floor;legacy.generate();const q=legacy.state();const occupied=new Set([q.S,q.stairs,...q.monsters,...q.features,...q.terrain,...q.loot.filter(l=>l.kind!=='consumable')].map(p=>p.x+','+p.y));for(const l of q.loot.filter(l=>l.kind==='consumable')){const key=l.x+','+l.y;assert(!occupied.has(key)&&q.map[l.y*48+l.x]===0,'safe loot');occupied.add(key)}assert(q.loot.filter(l=>l.kind==='consumable').length===(floor>=10?2:1),'floor supplies')}
  return {items:8,depthRolls:3000,floors:30,effects:'passed',turns:'passed',pouch:'passed',persistence:'passed'};
}
console.log(testConsumables(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
