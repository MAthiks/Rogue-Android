// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testDungeonArt007A(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,tileArt,tileVariant,knownTileEdges,TILE_ART_CACHE,render,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let combinations=0;const motifs=new Set();
  for(const b of Object.values(g.BIOMES)){
    motifs.add(JSON.stringify(g.tileArt(b,false,true,0,0)));
    for(const wall of [false,true])for(const visible of [false,true])for(let v=0;v<4;v++)for(let mask=0;mask<16;mask++){
      const p=g.tileArt(b,wall,visible,v,mask);assert(p===g.tileArt(b,wall,visible,v,mask),'cached deterministic tile');
      assert(p.length<=32&&p.length>1&&p[0][3]===16&&p[0][4]===16,'bounded work and coverage');
      for(const [c,x,y,w,h] of p)assert(/^#[0-9a-f]{6}$/i.test(c)&&[x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=16&&y+h<=16,'pixel bounds');
      combinations++;
    }
    assert(JSON.stringify(g.tileArt(b,false,true,0,0))!==JSON.stringify(g.tileArt(b,false,false,0,0)),'fog palette');
  }
  assert(motifs.size===8&&g.TILE_ART_CACHE.size===2048,'eight distinct motifs and bounded atlas');
  const grid=Array(9).fill(0),seen=Array(9).fill(0);grid[1]=grid[5]=grid[7]=grid[3]=1;
  assert(g.knownTileEdges(1,1,false,grid,seen,3,3)===0,'no hidden neighbour leak');
  seen[1]=seen[5]=1;assert(g.knownTileEdges(1,1,false,grid,seen,3,3)===3,'known north east');
  grid[7]=0;assert(g.knownTileEdges(1,1,false,grid,seen,3,3)===3,'unknown tile changes invisible');
  const variants=new Set();for(let x=0;x<48;x++)for(let y=0;y<32;y++)variants.add(g.tileVariant(x,y));assert(variants.size===4,'four spatial variants');
  const before=JSON.stringify(g.state());g.render();g.render();assert(JSON.stringify(g.state())===before,'render cannot mutate simulation');
  return {combinations,motifs:motifs.size,cache:g.TILE_ART_CACHE.size,fog:'passed',state:'unchanged'};
}
console.log(testDungeonArt007A(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
