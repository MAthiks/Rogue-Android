// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testQA(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features}),searchNearby,finish,los,collectLoot,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let d=g.state();
  d.monsters.splice(0);d.loot.splice(0);d.features.splice(0);d.map.fill(1);
  for(let y=4;y<=12;y++)for(let x=4;x<=12;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.stairs.x=12;d.stairs.y=12;
  d.map[6*48+7]=1;assert(!g.los(7,7),'blocked diagonal visibility');assert(g.los(7,6),'wall itself visible');d.map[6*48+7]=0;
  let b=d.S.bandages;d.loot.push({x:7,y:6,kind:'bandage'},{x:7,y:6,kind:'bandage'},{x:7,y:6,kind:'gear'});
  g.move(1,0);d=g.state();assert(d.S.bandages===b+2&&d.S.bag.length===1&&!d.loot.length,'stack pickup');
  d.S.bag=Array.from({length:24},(_,i)=>({id:i+1}));d.S.serial=24;
  d.loot.push({x:8,y:6,kind:'gear'},{x:8,y:6,kind:'bandage'});
  g.move(1,0);d=g.state();assert(d.loot.length===1&&d.loot[0].item&&d.S.bandages===b+3,'full bag preserves gear and picks bandage');
  d.S.serial=0;g.save();const resumed=load(newHtml);assert(resumed.restore()&&resumed.state().S.serial>=d.loot[0].item.id,'ground item serial migration');
  return {cornerVisibility:'passed',stackPickup:'passed',fullBag:'passed',serial:'passed',environment:'mock DOM'};
}

console.log(testQA(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
