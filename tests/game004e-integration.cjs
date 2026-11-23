// Run: node tests/game004e-integration.cjs
const fs=require('node:fs'),path=require('node:path');
function testTerrainIntegration(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,enemyPhase,kill,hit,enemyAttack,enterTerrain,currentBiome,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }



  const g=load(newHtml);g.newGame('warrior');let d=g.state();
  d.monsters.splice(0);d.loot.splice(0);d.features.splice(0);d.terrain.splice(0);
  d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.S.hp=20;d.S.res=10;d.stairs.x=15;d.stairs.y=15;
  d.terrain.push({x:7,y:6,type:'water',spent:false},{x:8,y:6,type:'rubble',spent:false},{x:9,y:6,type:'ember',spent:false},{x:10,y:6,type:'font',spent:false});
  const initial=d.S.turn;g.move(1,0);assert(d.S.x===7&&d.S.res===9&&d.S.turn===initial+1,'water cost then normal regen');
  d.S.guard=5;g.move(1,0);assert(d.S.guard===2&&d.S.turn===initial+2,'rubble guard');
  let hp=d.S.hp;g.move(1,0);assert(d.S.hp===hp-3&&d.S.turn===initial+3,'ember damage');
  hp=d.S.hp;g.move(1,0);assert(d.S.hp===hp+5&&d.terrain[3].spent,'font heal');
  g.move(0,1);hp=d.S.hp;g.move(0,-1);assert(d.S.hp===hp,'font single use');
  d.S.dungeon.biome='sanctum';g.save();const resumed=load(newHtml);assert(resumed.restore(),'restore');
  let r=resumed.state();assert(JSON.stringify(r.terrain)===JSON.stringify(d.terrain)&&resumed.currentBiome().name==='Sanctuaire','terrain and biome persisted');
  resumed.resume();r.S.hp=2;resumed.move(-1,0);assert(r.S.dead&&!storage.has('rogue-android-game002-v1'),'lethal ember');
  return {water:'passed',rubble:'passed',ember:'passed',font:'passed',singleUse:'passed',persistence:'passed',permadeath:'passed',environment:'mock DOM'};
}

console.log(testTerrainIntegration(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
