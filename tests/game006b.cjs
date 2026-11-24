// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testBestiary006B(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,BESTIARY,CREATURE_POWERS,populateBestiary,creatureAction,enemyPhase,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');
  const seenSpecies=new Set(),counts={},base=[{x:10,y:10,hp:8,maxHp:8,atk:2,role:'wanderer',kind:'Errant',color:'#fff'},{x:11,y:10,hp:20,maxHp:20,elite:true},{x:12,y:10,hp:30,maxHp:30,boss:'stone'},{x:13,y:10,hp:20,maxHp:20,rare:'iron'}];
  for(const biome of Object.keys(g.BESTIARY))for(let seed=0;seed<180;seed++){
    const floor=4+seed%27,a=g.populateBestiary(base,biome,floor,seed),b=g.populateBestiary(base,biome,floor,seed);
    assert(JSON.stringify(a)===JSON.stringify(b),'deterministic species');assert(a.slice(1).every((m,i)=>m===base[i+1]),'protected monsters');
    assert(a[0].x===base[0].x&&a[0].y===base[0].y&&base[0].species===undefined,'coordinates and input unchanged');
    assert(g.populateBestiary(base,biome,3,seed)===base,'historic opening');
    if(a[0].species){assert(g.BESTIARY[biome].some(x=>x[0]===a[0].species),'native species');assert(a[0].hp===a[0].maxHp&&a[0].atk<=7,'bounded stats');seenSpecies.add(a[0].species);counts[biome]=(counts[biome]||0)+1}
  }
  assert(seenSpecies.size===16&&Object.keys(counts).length===8,'coverage');
  const board={W:20,H:20,stepOK:(x,y,fx,fy)=>x>=0&&y>=0&&x<20&&y<20&&Math.max(Math.abs(x-fx),Math.abs(y-fy))===1};
  const player={x:6,y:5};
  for(const skill of Object.keys(g.CREATURE_POWERS)){
    const m={x:5,y:5,hp:10,maxHp:10,species:'test',creatureSkill:skill,creatureCD:0};
    assert(g.creatureAction(m,player,[m],board).type==='announce'&&m.intent.cells.length===(skill==='burst'?4:1),'telegraph '+skill);
    const hit=g.creatureAction(m,player,[m],board);assert(hit.type==='release'&&hit.hit&&!m.intent&&m.creatureCD>0,'hit '+skill);
    assert(g.creatureAction(m,player,[m],board)===null,'cooldown '+skill);
    m.creatureCD=0;g.creatureAction(m,player,[m],board);
    assert(!g.creatureAction(m,{x:10,y:10},[m],board).hit,'dodge '+skill);
  }
  const m={x:5,y:5,hp:10,maxHp:10,species:'test',creatureSkill:'bolt'};
  assert(g.creatureAction(m,{x:8,y:5},[m,{x:6,y:5,hp:5}],board)===null,'actor blocks ray');
  assert(g.creatureAction(m,{x:8,y:5},[m],{...board,stepOK:()=>false})===null,'wall blocks ray');
  let d=g.state();d.monsters.splice(0);d.terrain.splice(0);d.features.splice(0);d.loot.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.S.floor=10;d.S.hp=30;d.S.res=10;d.S.dungeon.biome='fungal';d.stairs.x=15;d.stairs.y=15;
  const enemy={x:8,y:6,hp:10,maxHp:10,atk:3,role:'tracker',species:'wraith',creatureSkill:'drain',kind:'Spectre',color:'#fff'};
  d.monsters.push(enemy);g.enemyPhase();assert(enemy.intent&&d.S.hp===30,'no damage on announce');
  g.save();const resumed=load(newHtml);assert(resumed.restore(),'restore');let r=resumed.state();assert(r.monsters[0].species==='wraith'&&r.monsters[0].intent.cells[0].x===6,'intent persists');
  r.monsters[0].stun=1;resumed.enemyPhase();assert(!r.monsters[0].intent&&r.S.hp===30,'stun cancels');
  g.enemyPhase();assert(!enemy.intent&&enemy.creatureCD>0,'release integration');
  return {seeds:1440,species:seenSpecies.size,counts,powers:4,persistence:'passed'};
}
console.log(testBestiary006B(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
