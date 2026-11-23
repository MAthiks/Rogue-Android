// Run: node tests/game004f-integration.cjs
const fs=require('node:fs'),path=require('node:path');
function testBalanceIntegration(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,enemyPhase,kill,hit,enemyAttack,enterTerrain,currentBiome,activate,bandage,healingLeft,gainXP,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }




  for(const id of ['warrior','ranger','mage']){
    const g=load(newHtml);g.newGame(id);let d=g.state();
    d.monsters.splice(0);d.features.splice(0);d.terrain.splice(0);
    for(let n=0;n<3;n++){d.S.hp=1;d.S.res=d.S.maxRes;d.S.cool[1]=0;const turn=d.S.turn;g.activate(1);assert(g.healingLeft()===2-n&&d.S.hp>1&&d.S.turn===turn+1,'heal '+id)}
    d.S.hp=1;d.S.cool[1]=0;d.S.res=d.S.maxRes;const turn=d.S.turn;g.activate(1);assert(d.S.hp===1&&d.S.turn===turn,'no fourth heal');
    g.save();const resumed=load(newHtml);assert(resumed.restore()&&resumed.healingLeft()===0,'heal persistence');
    d.S.floor=1;d.S.x=6;d.S.y=6;d.stairs.x=7;d.stairs.y=6;d.map[6*48+6]=0;d.map[6*48+7]=0;g.move(1,0);assert(g.state().S.floor===2&&g.healingLeft()===3,'heal reset at descent');
  }
  const g=load(newHtml);g.newGame('rogue');let d=g.state();d.monsters.splice(0);d.features.splice(0);d.terrain.splice(0);
  d.S.level=30;d.S.maxHp=100;d.S.hp=10;d.S.bandages=1;g.bandage();assert(d.S.hp===24&&d.S.bandages===0,'bandage scaling');
  g.gainXP(10000);assert(d.S.level===30&&d.S.xp===0,'level cap');
  d.S.level=29;d.S.xp=0;g.gainXP(10000);assert(d.S.level===30&&d.S.xp===0,'cap crossing');
  delete d.S.healUses;g.save();const legacy=load(newHtml);assert(legacy.restore()&&legacy.healingLeft()===3,'legacy default');
  return {classes:4,healBudget:'passed',blockedFourth:'passed',persistence:'passed',descentReset:'passed',bandageScaling:'passed',levelCap:'passed',legacyDefault:'passed',environment:'mock DOM'};
}

console.log(testBalanceIntegration(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
