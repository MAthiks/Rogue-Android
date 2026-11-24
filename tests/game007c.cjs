// Run: node tests/game007c.cjs
const fs=require('node:fs'),path=require('node:path');
function testEnemyArt007C(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {ENEMY_ART,enemySprite,enemyArtId,ENEMY_ART_CACHE,BESTIARY,RARE_ENCOUNTERS,drawEnemySprite,newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,tileArt,tileVariant,knownTileEdges,TILE_ART_CACHE,render,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws});
  }


  const g=load(newHtml),roles=['guardian','brute','wanderer','archer','ambusher','coward','tracker'],species=Object.values(g.BESTIARY).flat().map(e=>e[0]),ids=[...roles,...species];
  const shapes=new Set();let variants=0;
  assert(ids.length===23&&Object.keys(g.ENEMY_ART).length===23,'complete roster');
  for(const id of ids){
    const rows=g.ENEMY_ART[id];assert(rows.length===11&&rows.every(r=>r.length===10&&/^[.oHhe]+$/.test(r)),'valid grid');
    shapes.add(rows.map(r=>r.replace(/[^.]/g,'x')).join(''));
    const mob=roles.includes(id)?{role:id}:{species:id,role:'brute'};
    assert(g.enemyArtId(mob)===id,'correct identity');
    const base=g.enemySprite(mob),colors=new Set();
    for(const rare of [undefined,...g.RARE_ENCOUNTERS.map(v=>v.id)]){
      const m={...mob,rare},before=JSON.stringify(m),ops=g.enemySprite(m);
      assert(ops===g.enemySprite(m)&&JSON.stringify(m)===before,'cached pure rendering');
      for(const [c,x,y,w,h] of ops)assert(/^#[0-9a-f]{6}$/i.test(c)&&[x,y,w,h].every(Number.isInteger)&&x>=0&&y>=4&&w>0&&h>0&&x+w<=16&&y+h<=16,'pixel bounds and HP space');
      colors.add(JSON.stringify(ops));variants++;
    }
    assert(colors.size===4&&base.length>0,'rare palettes distinct');
  }
  assert(shapes.size===23&&g.ENEMY_ART_CACHE.size===92,'distinct silhouettes and bounded cache');
  assert(g.enemyArtId({role:'unknown',species:'unknown'})==='wanderer','legacy fallback');
  g.newGame('warrior');const st=g.state();st.map.fill(0);st.seen.fill(1);st.S.x=20;st.S.y=15;st.monsters.splice(0);st.loot.splice(0);st.features.splice(0);st.terrain.splice(0);
  const m={x:32,y:15,hp:9,maxHp:9,role:'brute',species:'slag',color:'#bd795c'};
  g.draws.length=0;g.render();const empty=JSON.stringify(g.draws);
  st.monsters.push(m);assert(!g.los(m.x,m.y),'fixture outside vision');g.draws.length=0;g.render();assert(JSON.stringify(g.draws)===empty,'hidden monster cannot leak');
  m.x=21;g.draws.length=0;g.render();assert(JSON.stringify(g.draws)!==empty,'visible sprite drawn');
  const before=JSON.stringify(g.state());g.render();assert(JSON.stringify(g.state())===before,'render cannot mutate state');
  g.save();assert(g.restore()&&g.state().monsters[0].species==='slag','legacy save structure');
  return {sprites:shapes.size,variants,cache:g.ENEMY_ART_CACHE.size,fog:'passed',state:'unchanged'};
}
console.log(testEnemyArt007C(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
