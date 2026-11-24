// Run: node tests/game009e.cjs
const fs=require('node:fs'),path=require('node:path');
function testDungeonHud(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {say,startMenu,update,CLASSES,SKILL_ART,skillIcon,classIcon,meterPercent,hudData,updateHud,combatFx,clearCombatFx,bandage,hit,newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,tileArt,tileVariant,knownTileEdges,TILE_ART_CACHE,render,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const g=load(newHtml),key='rogue-android-game002-v1';
  for(const [id,c] of Object.entries(g.CLASSES)){
    g.newGame(id);const s=g.state().S;s.hp=5;s.res=3;s.xp=4;g.save();
    const saved=storage.get(key),before=JSON.stringify(g.state());
    g.updateHud();assert(g.nodes.get('hudClass').innerHTML===g.classIcon(id),'class crest');
    const hud=g.nodes.get('hudMeters').innerHTML;assert(hud.includes('5/'+s.maxHp)&&hud.includes('3/'+s.maxRes)&&hud.includes('4/14'),'live meters');
    g.say('Un');g.say('Deux');g.say('Trois');g.say('Quatre');assert(g.nodes.get('log').textContent==='Quatre\nTrois\nDeux','three most recent messages');
    assert(storage.get(key)===saved&&JSON.stringify(g.state())===before,'cosmetic only');
    g.startMenu();assert(g.nodes.get('hudClass').innerHTML===''&&g.nodes.get('hudMeters').innerHTML==='','menu clears HUD');
  }
  return {classes:4,meters:3,journal:3,state:'unchanged',environment:'mock DOM'};
}
console.log(testDungeonHud(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
