// GAME-004C interaction tests using mocked DOM. Run: node tests/game004c-integration.cjs
const fs=require('node:fs'),path=require('node:path');
function testInteractions(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features}),searchNearby,finish,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }

  const g=load(newHtml);g.newGame('warrior');
  let d=g.state();d.monsters.splice(0);d.loot.splice(0);d.features.splice(0);
  d.map.fill(1);for(let y=4;y<=12;y++)for(let x=4;x<=12;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.S.hp=28;d.stairs.x=12;d.stairs.y=12;
  const door={x:7,y:6,type:'door',found:true,open:false};d.features.push(door);d.map[6*48+7]=1;
  let turn=d.S.turn;g.move(1,0);assert(door.open&&d.S.x===6&&d.S.turn===++turn&&d.map[6*48+7]===0,'open door, one turn');
  g.move(1,0);assert(d.S.x===7&&d.S.turn===++turn,'walk through');
  const chest={x:8,y:6,type:'chest',found:true,open:false,reward:'gear'};d.features.push(chest);
  d.S.bag=Array.from({length:24},(_,i)=>({id:i+1}));d.S.serial=24;
  g.move(1,0);assert(!chest.open&&d.S.bag.length===24&&d.S.turn===++turn,'full bag preserves chest');
  d.S.bag=[];g.move(1,0);assert(chest.open&&d.S.bag.length===1&&d.S.x===7&&d.S.turn===++turn,'open chest');
  g.move(1,0);assert(d.S.bag.length===1&&d.S.x===8&&d.S.turn===++turn,'no duplicate reward');
  const trap={x:9,y:6,type:'trap',found:false,spent:false,damage:4};d.features.push(trap);
  g.searchNearby();g.finish();assert(trap.found&&!trap.spent&&d.S.turn===++turn,'detect trap');
  g.searchNearby();g.finish();assert(trap.spent&&d.S.turn===++turn,'disarm trap');
  let hp=d.S.hp;g.move(1,0);assert(d.S.hp===hp&&d.S.x===9&&d.S.turn===++turn,'disarmed safe');
  const trap2={x:10,y:6,type:'trap',found:false,spent:false,damage:4};d.features.push(trap2);
  g.move(1,0);assert(trap2.spent&&trap2.found&&d.S.hp===hp-4&&d.S.turn===++turn,'trap damage');
  const secret={x:11,y:6,type:'secret',found:false,open:false};d.features.push(secret);d.map[6*48+11]=1;
  g.move(1,0);assert(!secret.open&&d.S.turn===turn,'hidden wall blocks');
  g.searchNearby();g.finish();assert(secret.found&&!secret.open&&d.S.turn===++turn,'search secret');
  g.move(1,0);assert(secret.open&&d.S.x===10&&d.S.turn===++turn,'open secret');
  g.save();const again=load(newHtml);assert(again.restore(),'restore');
  const r=again.state();assert(JSON.stringify(r.features)===JSON.stringify(d.features)&&JSON.stringify(r.map)===JSON.stringify(d.map),'feature persistence');
  again.resume();r.S.hp=1;const lethal={x:10,y:7,type:'trap',found:false,spent:false,damage:4};r.features.push(lethal);again.move(0,1);assert(r.S.dead&&!storage.has('rogue-android-game002-v1'),'lethal trap permadeath');
  return {door:'passed',chest:'passed',fullBag:'passed',disarm:'passed',trapDamage:'passed',secret:'passed',persistence:'passed',lethalTrap:'passed',environment:'mock DOM'};
}

console.log(testInteractions(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
