// Run: node tests/game007d.cjs
const fs=require('node:fs'),path=require('node:path');
function testBossArt007D(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {BOSS_ART,bossSprite,BOSS_ART_CACHE,drawBossPhase,EXTENDED_BOSSES,enemySprite,drawEnemySprite,newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,tileArt,tileVariant,knownTileEdges,TILE_ART_CACHE,render,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws});
  }


  const g=load(newHtml),ids=['stone','ash','veil',...Object.keys(g.EXTENDED_BOSSES)],shapes=new Set();let variants=0;
  assert(ids.length===8&&Object.keys(g.BOSS_ART).length===8,'all bosses');
  for(const id of ids){
    const a=g.BOSS_ART[id],max=Object.hasOwn(g.EXTENDED_BOSSES,id)?3:2,stages=new Set();
    assert(a.rows.length===10&&a.rows.every(r=>r.length===12&&/^[.oHhe]+$/.test(r)),'valid grid');
    shapes.add(a.rows.map(r=>r.replace(/[^.]/g,'x')).join(''));
    for(let phase=1;phase<=max;phase++){
      const m={boss:id,phase},before=JSON.stringify(m),ops=g.bossSprite(m);
      assert(ops===g.bossSprite(m)&&JSON.stringify(m)===before,'pure cached art');
      for(const [c,x,y,w,h] of ops)assert(/^#[0-9a-f]{6}$/i.test(c)&&[x,y,w,h].every(Number.isInteger)&&x>=2&&y>=3&&w>0&&h>0&&x+w<=14&&y+h<=13,'body bounds, HP and markers reserved');
      stages.add(JSON.stringify(ops));variants++;
      g.draws.length=0;g.drawBossPhase(m,0,0);assert(g.draws.length===phase&&g.draws.every(p=>p[2]===13),'phase overlay');
      g.draws.length=0;g.drawEnemySprite(m,0,0);assert(JSON.stringify(g.draws)===JSON.stringify(ops),'boss dispatch');
    }
    assert(stages.size===max,'different phases');
    assert(g.bossSprite({boss:id})===g.bossSprite({boss:id,phase:1}),'legacy missing phase');
    assert(g.bossSprite({boss:id,phase:999})===g.bossSprite({boss:id,phase:max}),'bounded phase');
  }
  assert(shapes.size===8&&variants===21&&g.BOSS_ART_CACHE.size===21,'eight silhouettes and bounded cache');
  const regular={role:'brute',species:'slag'};g.draws.length=0;g.drawEnemySprite(regular,0,0);assert(JSON.stringify(g.draws)===JSON.stringify(g.enemySprite(regular)),'ordinary sprite unchanged');
  g.newGame('warrior');const st=g.state();st.map.fill(0);st.seen.fill(1);st.S.x=20;st.S.y=15;st.monsters.splice(0);st.loot.splice(0);st.features.splice(0);st.terrain.splice(0);
  const m={x:32,y:15,hp:9,maxHp:30,role:'guardian',boss:'abyssal',phase:3,color:'#c296da',elite:true};
  g.draws.length=0;g.render();const empty=JSON.stringify(g.draws);
  st.monsters.push(m);assert(!g.los(m.x,m.y),'outside vision');g.draws.length=0;g.render();assert(JSON.stringify(g.draws)===empty,'hidden boss cannot leak');
  m.x=21;g.draws.length=0;g.render();assert(JSON.stringify(g.draws)!==empty,'visible boss rendered');
  const before=JSON.stringify(g.state());g.render();assert(JSON.stringify(g.state())===before,'pure render');
  g.save();assert(g.restore()&&g.state().monsters[0].boss==='abyssal'&&g.state().monsters[0].phase===3,'existing save format');
  return {bosses:shapes.size,variants,cache:g.BOSS_ART_CACHE.size,fog:'passed',state:'unchanged'};
}
console.log(testBossArt007D(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
