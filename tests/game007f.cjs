// Run: node tests/game007f.cjs
const fs=require('node:fs'),path=require('node:path');
function testInterfaceArt007F(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {CLASSES,SKILL_ART,skillIcon,classIcon,meterPercent,hudData,updateHud,combatFx,clearCombatFx,bandage,hit,newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,tileArt,tileVariant,knownTileEdges,TILE_ART_CACHE,render,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const g=load(newHtml),icons=new Set();
  for(const [id,cls] of Object.entries(g.CLASSES)){
    assert(g.SKILL_ART[id].length===cls.skills.length&&cls.skills.length===5,'five icons per class');
    for(let i=0;i<5;i++){
      const rows=g.SKILL_ART[id][i],svg=g.skillIcon(id,i);
      assert(rows.length===7&&rows.every(v=>Number.isInteger(v)&&v>=0&&v<128),'native glyph bounds');
      assert(svg.includes('viewBox="0 0 7 7"')&&svg.includes('<rect'),'pixel svg');
      icons.add(JSON.stringify(rows));
    }
    assert(g.classIcon(id).includes('viewBox="0 0 16 16"'),'class portrait');
  }
  assert(icons.size===20,'20 distinct glyphs');
  assert(g.meterPercent(5,10)===50&&g.meterPercent(-1,10)===0&&g.meterPercent(11,10)===100&&g.meterPercent(1,0)===0&&g.meterPercent(NaN,10)===0,'safe meter bounds');
  g.newGame('warrior');const s=g.state().S;
  s.hp=10;s.maxHp=28;s.res=3;s.maxRes=12;s.xp=7;
  const meters=g.hudData(s);assert(meters[0].value===10&&meters[1].value===3&&meters[2].max===14,'exact HUD values');
  const before=JSON.stringify(g.state());g.updateHud();assert(JSON.stringify(g.state())===before,'HUD is pure');
  const hud=g.nodes.get('hudMeters').innerHTML;assert(hud.includes('10/28')&&hud.includes('3/12')&&hud.includes('7/14'),'visible HUD values');
  for(const kind of ['hit','critical','hurt','heal','guard']){g.combatFx(kind,3);assert(g.nodes.get('combatFx').innerHTML.includes('fx-'+kind),'effect '+kind)}
  assert(JSON.stringify(g.state())===before,'FX cannot mutate simulation');
  g.clearCombatFx();assert(g.nodes.get('combatFx').innerHTML==='','clear effect');
  g.save();assert(g.restore()&&g.state().S.hp===10&&g.nodes.get('combatFx').innerHTML==='','FX not persisted');
  s.level=30;assert(g.hudData(s)[2].cap&&g.hudData(s)[2].value===1,'max level display');
  return {icons:icons.size,meters:3,effects:5,save:'passed',state:'unchanged'};
}
console.log(testInterfaceArt007F(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
