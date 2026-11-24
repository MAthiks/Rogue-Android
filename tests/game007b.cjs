// Run: node tests/game007b.cjs
const fs=require('node:fs'),path=require('node:path');
function testPlayerArt007B(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {PLAYER_ART,playerSprite,WEAPONS,newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,tileArt,tileVariant,knownTileEdges,TILE_ART_CACHE,render,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml),classes=Object.keys(g.PLAYER_ART),slots=['armor','helmet','boots','ring'];
  const signature=(id,equip)=>JSON.stringify(g.playerSprite(id,equip));
  const check=(id,equip)=>{const old=JSON.stringify(equip),ops=g.playerSprite(id,equip);
    assert(ops.length>20&&ops.length<=256,'bounded sprite');
    for(const [c,x,y,w,h] of ops)assert(/^#[0-9a-f]{6}$/i.test(c)&&[x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=16&&y+h<=16,'native pixel bounds');
    assert(JSON.stringify(ops)===signature(id,equip)&&JSON.stringify(equip)===old,'deterministic pure render');return JSON.stringify(ops);
  };
  const bases=new Set();let combinations=0;
  for(const id of classes){
    const art=g.PLAYER_ART[id];assert(art.rows.length===14&&art.rows.every(row=>row.length===10),'valid sprite grid');
    const bare=check(id,{});bases.add(bare);
    for(const slot of slots){const variants=new Set();for(let rarity=1;rarity<=5;rarity++){const sig=check(id,{[slot]:{slot,rarity}});assert(sig!==bare,'slot visible');variants.add(sig);combinations++}assert(variants.size===5,'five rarity colors per slot')}
    const families=new Set();
    for(const family of Object.keys(g.WEAPONS))for(let rarity=1;rarity<=5;rarity++){
      const gear={weapon:{slot:'weapon',family,rarity}};
      for(const slot of slots)gear[slot]={slot,rarity};
      const sig=check(id,gear);assert(sig!==bare,'equipped sprite');if(rarity===1)families.add(sig);combinations++;
    }
    assert(families.size===7,'all weapon silhouettes distinct');
    check(id,{weapon:{slot:'weapon',name:'Ancienne arme'},helmet:null});
    g.newGame(id);const state=g.state();state.S.equip={weapon:{slot:'weapon',family:'bow',rarity:3},armor:{slot:'armor',rarity:2},helmet:null,boots:null,ring:null};
    const before=JSON.stringify(g.state());g.render();g.render();assert(JSON.stringify(g.state())===before,'render cannot mutate gameplay');
    g.save();assert(g.restore(),'existing save restores');assert(g.state().S.equip.weapon.family==='bow','equipment persisted');assert(signature(id,g.state().S.equip)===signature(id,state.S.equip),'sprite after restore');
  }
  assert(bases.size===4,'four distinctive heroes');
  return {classes:bases.size,combinations,render:'pure',save:'compatible'};
}
console.log(testPlayerArt007B(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
