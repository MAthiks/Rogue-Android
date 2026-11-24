// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testCombat(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features}),searchNearby,finish,los,collectLoot,createGear,weaponFamily,currentWeapon,currentStyle,basicProfile,aimedTarget,aimWeapon,useWeaponDirection,hit,WEAPONS,STYLES,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let d=g.state();
  const eq=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),msg);
  const seeded=seed=>n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n)};
  const families=new Set();
  for(let n=1;n<=5000;n++){const it=g.createGear(n,1+n%30,1,seeded(n*7919));if(it.slot==='weapon'){assert(g.weaponFamily(it),'new weapon family');families.add(it.family)}else assert(!it.family,'nonweapon family')}
  assert(families.size===7,'all families generated');
  d.S.equip.weapon={id:999,slot:'weapon',name:'Ancienne arme',atk:2};assert(!g.weaponFamily(d.S.equip.weapon)&&g.currentWeapon().range===1,'legacy profile');
  eq(g.basicProfile(null),{power:0,crit:0,pierce:0},'legacy basic');
  const equip=family=>{d.S.equip.weapon={id:999,slot:'weapon',name:family,atk:0,family};};
  for(const [id,w] of Object.entries(g.WEAPONS)){equip(id);assert(g.currentWeapon()===w,'profile '+id)}
  equip('axe');eq(g.basicProfile(null),{power:2,crit:-4,pierce:0},'axe');
  equip('mace');assert(g.basicProfile(null).pierce===2,'mace');
  equip('dagger');assert(g.basicProfile(null).crit===10,'dagger');
  equip('bow');assert(g.basicProfile(null).power===-1&&g.basicProfile(null,true).power===0,'bow contact');
  equip('staff');assert(g.basicProfile(null).power===-1&&g.basicProfile(null,true).power===1,'staff contact');
  d.S.combatStyle='aggressive';assert(g.currentStyle().def===-1&&g.basicProfile(null,true).power===2,'aggressive');
  d.S.combatStyle='defensive';assert(g.currentStyle().def===1&&g.basicProfile(null,true).power===0,'defensive');
  d.S.combatStyle='balanced';
  d.monsters.splice(0);d.loot.splice(0);d.features.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.stairs.x=15;d.stairs.y=15;
  const mob=(x,y)=>({x,y,hp:100,maxHp:100,atk:1,kind:'cible',role:'melee',color:'#ccc',stun:10});
  const near=mob(8,6),far=mob(10,6);d.monsters.push(near,far);
  assert(g.aimedTarget(1,0,5).m===near,'first target');
  d.map[6*48+7]=1;assert(!g.aimedTarget(1,0,5),'wall');d.map[6*48+7]=0;
  const diagonal=mob(8,8);d.monsters.push(diagonal);d.map[6*48+7]=1;assert(!g.aimedTarget(1,1,5),'corner');d.map[6*48+7]=0;
  assert(!g.aimedTarget(2,0,5)&&!g.aimedTarget(0,0,5),'direction guard');
  equip('bow');d.S.res=8;let turn=d.S.turn;g.aimWeapon();g.move(1,0);
  assert(d.S.turn===turn+1&&d.S.x===6&&d.S.y===6&&near.hp<100&&far.hp===100,'one ranged turn without moving');
  assert(d.S.res===7,'bow cost plus ordinary regen');
  turn=d.S.turn;g.aimWeapon();g.move(-1,0);assert(d.S.turn===turn&&d.S.res===7,'empty aim free');
  equip('spear');assert(g.currentWeapon().range===2&&g.currentWeapon().cost===0,'spear');
  g.aimWeapon();g.move(1,0);assert(d.S.turn===turn+1,'spear reach');
  d.S.combatStyle='defensive';g.save();const resumed=load(newHtml);assert(resumed.restore()&&resumed.currentStyle().name==='Défensif'&&resumed.currentWeapon().name==='Lance','save style and family');
  return {generated:5000,families:families.size,legacy:'passed',styles:'passed',range:'passed',wall:'passed',corner:'passed',turns:'passed',persistence:'passed'};
}
console.log(testCombat(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
