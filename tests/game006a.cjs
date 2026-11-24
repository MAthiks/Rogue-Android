// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testBiomes006(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');const counts={},hazards={};let variants=0;
  const types={cave:'water',ruins:'rubble',volcanic:'ember',sanctum:'font',fungal:'spores',frozen:'ice',abyss:'void'};
  for(let seed=0;seed<600;seed++){
    const floor=1+seed%30,biome=g.biomeForFloor(floor,seed),old=g.biomeForFloor(floor);
    assert(g.BIOMES[biome]&&biome===g.biomeForFloor(floor,seed),'deterministic biome');
    if(floor<4||floor%6===0)assert(biome===old,'historic opening and bosses');
    if(biome!==old){variants++;assert(biome===(floor<=12?'fungal':floor<=24?'frozen':'abyss'),'depth bands')}
    counts[biome]=(counts[biome]||0)+1;
    const d=g.buildDungeon(48,32,floor,seed),deco=g.decorateDungeon(d,48,32,floor),t=g.buildTerrain(d,deco,48,32,floor,biome);
    const occupied=new Set([d.start,d.stairs,...d.monsters,...d.loot,...deco.features].map(p=>p.x+','+p.y));
    const blocked=new Set(t.map(p=>p.y*48+p.x));
    for(const p of t){assert(!occupied.has(p.x+','+p.y)&&deco.map[p.y*48+p.x]===0&&p.type===types[biome],'hazard tile');hazards[p.type]=(hazards[p.type]||0)+1}
    const start=d.start.y*48+d.start.x,q=[start],seen=new Set(q);
    for(let i=0;i<q.length;i++){const n=q[i],x=n%48,y=Math.floor(n/48);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*48+xx;if(xx>0&&xx<47&&yy>0&&yy<31&&d.map[j]===0&&!blocked.has(j)&&!seen.has(j)){seen.add(j);q.push(j)}}}
    assert(seen.has(d.stairs.y*48+d.stairs.x)&&d.rooms.every(r=>seen.has(r.cy*48+r.cx)),'avoidable hazards');
  }
  assert(Object.keys(counts).length===8&&['spores','ice','void'].every(k=>hazards[k]>0),'coverage');
  let d=g.state(),s=d.S;d.monsters.splice(0);d.terrain.splice(0);d.features.splice(0);d.loot.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  s.x=6;s.y=6;s.hp=30;s.res=10;s.guard=5;s.boost=5;s.shield=6;d.stairs.x=15;d.stairs.y=15;
  d.terrain.push({x:7,y:6,type:'spores',spent:false},{x:8,y:6,type:'ice',spent:false},{x:9,y:6,type:'void',spent:false});
  g.enterTerrain(7,6);assert(s.hp===28&&s.res===9,'spores');
  g.enterTerrain(8,6);assert(s.guard===3&&s.boost===3,'ice');
  g.enterTerrain(9,6);assert(s.res===6&&s.shield===4,'void');
  s.dungeon.biome='abyss';g.save();const resumed=load(newHtml);assert(resumed.restore()&&resumed.currentBiome().name==='Failles abyssales'&&JSON.stringify(resumed.state().terrain)===JSON.stringify(d.terrain),'persisted biome');
  s.hp=1;g.enterTerrain(7,6);assert(s.dead,'spores can kill');
  return {seeds:600,counts,variants,hazards,effects:'passed',persistence:'passed'};
}
console.log(testBiomes006(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
