// Run: node tests/game007e.cjs
const fs=require('node:fs'),path=require('node:path');
function testObjectArt007E(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {OBJECT_ART,OBJECT_ART_CACHE,objectSprite,objectIcon,lootArt,featureArt,drawFeature,CONSUMABLES,WEAPONS,MERCHANTS,EXPLORATION_EVENTS,SPECIAL_ROOMS,newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,tileArt,tileVariant,knownTileEdges,TILE_ART_CACHE,render,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws});
  }


  const g=load(newHtml);let variants=0;
  const colors=['#c9cbd0','#82cf91','#87bbff','#c8a1ff','#f0b85d'];
  for(const [id,rows] of Object.entries(g.OBJECT_ART)){
    assert(rows.length===10&&rows.every(r=>r.length===10&&/^[.oHhe]+$/.test(r)),'valid pixel grid '+id);
    for(const c of colors)for(const spent of [false,true]){
      const live=g.objectSprite(id,c,true,spent),memory=g.objectSprite(id,c,false,spent);
      assert(live===g.objectSprite(id,c,true,spent)&&JSON.stringify(live)!==JSON.stringify(memory),'deterministic memory palette');
      for(const ops of [live,memory])for(const [color,x,y,w,h] of ops)assert(/^#[0-9a-f]{6}$/i.test(color)&&[x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=16&&y+h<=16,'native bounds');
      variants+=2;
    }
  }
  assert(Object.keys(g.OBJECT_ART).length===38&&g.OBJECT_ART_CACHE.size<=256,'bounded cache');
  for(const family of Object.keys(g.WEAPONS))for(let rarity=1;rarity<=5;rarity++){
    const it={slot:'weapon',family,rarity};const [id,color]=g.lootArt({kind:'gear',item:it});assert(id===family&&color===colors[rarity-1],'weapon rarity');
  }
  for(const slot of ['armor','ring','helmet','boots'])assert(g.lootArt({kind:'gear',item:{slot,rarity:1}})[0]===slot,'gear slot');
  const consumables=new Set();for(const id of Object.keys(g.CONSUMABLES)){const [shape,c]=g.lootArt({kind:'consumable',consumable:id});assert(Object.hasOwn(g.OBJECT_ART,shape)&&c===g.CONSUMABLES[id].color,'consumable');consumables.add(shape+':'+c)}
  assert(consumables.size===8&&g.lootArt({kind:'gear'})[0]==='gear'&&g.lootArt({kind:'bandage'})[0]==='bandage','all loot and legacy fallback');
  for(const [type,field,table] of [['merchant','merchantId',g.MERCHANTS],['event','eventId',g.EXPLORATION_EVENTS],['specialRoom','roomId',g.SPECIAL_ROOMS]])for(const id of Object.keys(table)){
    const f={type,[field]:id,found:true};assert(g.featureArt(f)[0]===id&&g.featureArt({...f,found:false})===null,'feature identity and discovery');
  }
  for(const [type,closed,open] of [['door','door','doorOpen'],['secret','secret','doorOpen'],['chest','chest','chestOpen'],['trap','trap','trapSpent']]){
    assert(g.featureArt({type,found:true})[0]===closed&&g.featureArt({type,found:true,open:true,spent:true})[0]===open,'feature state');
    g.draws.length=0;g.drawFeature({type,found:false},0,0,true);assert(g.draws.length===0,'undiscovered feature hidden');
  }
  assert(g.objectIcon('blade','#87bbff').includes('viewBox="0 0 16 16"'),'shared icon');
  g.newGame('warrior');const st=g.state();st.map.fill(0);st.seen.fill(1);st.S.x=20;st.S.y=15;st.monsters.splice(0);st.loot.splice(0);st.features.splice(0);st.terrain.splice(0);
  const l={x:32,y:15,kind:'consumable',consumable:'heal'},f={x:21,y:15,type:'secret',found:false};
  g.draws.length=0;g.render();const empty=JSON.stringify(g.draws);st.loot.push(l);st.features.push(f);g.draws.length=0;g.render();assert(JSON.stringify(g.draws)===empty,'hidden loot and secret do not leak');
  l.x=22;f.found=true;g.draws.length=0;g.render();assert(JSON.stringify(g.draws)!==empty,'visible objects');
  const before=JSON.stringify(g.state());g.render();assert(JSON.stringify(g.state())===before,'pure render');
  g.save();assert(g.restore()&&g.state().loot[0].consumable==='heal'&&g.state().features[0].found,'save compatibility');
  return {patterns:38,variants,consumables:consumables.size,cache:g.OBJECT_ART_CACHE.size,fog:'passed',state:'unchanged'};
}
console.log(testObjectArt007E(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
