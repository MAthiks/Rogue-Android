// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testTalents(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,advancedTalents,canLearnAdvanced,learnAdvanced,talentBonus,hit,activate,bandage,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  let paths=0,learned=0;
  for(const id of ['warrior','rogue','ranger','mage'])for(const spec of ['offense','defense']){
    const g=load(newHtml);g.newGame(id);let d=g.state(),s=d.S;d.monsters.splice(0);d.terrain.splice(0);s.points=10;
    assert(g.advancedTalents().length===6,'six nodes');
    s.level=7;s.nodes.o1=true;s.nodes.d1=true;assert(!g.learnAdvanced('vigor'),'level 8 gate');
    s.level=8;assert(g.learnAdvanced('vigor')&&g.learnAdvanced('resolve')&&s.points===8,'foundation cost');
    assert(!g.learnAdvanced('vigor')&&s.points===8,'no duplicate');
    s.level=30;assert(!g.learnAdvanced('frenzy')&&!g.learnAdvanced('bulwark'),'spec gate');
    s.spec=spec;const first=spec==='offense'?'frenzy':'bulwark',last=spec==='offense'?'execution':'laststand',other=spec==='offense'?'bulwark':'frenzy';
    assert(!g.learnAdvanced(last),'prerequisite');assert(!g.learnAdvanced(other),'exclusive branch');
    s.level=11;assert(!g.learnAdvanced(first),'level12 gate');s.level=12;assert(g.learnAdvanced(first),'first spec talent');
    s.level=19;assert(!g.learnAdvanced(last),'level20 gate');s.level=20;assert(g.learnAdvanced(last)&&s.points===6,'capstone cost');
    const expected={};for(const n of g.advancedTalents())if(s.nodes['adv_'+n[0]])for(const [k,v] of Object.entries(n[5]))expected[k]=(expected[k]||0)+v;
    for(const [k,v] of Object.entries(expected))assert(g.talentBonus(k)===v,'effect '+id+' '+k);
    s.points=0;assert(!g.learnAdvanced('unknown'),'invalid ID');
    g.save();const resumed=load(newHtml);assert(resumed.restore()&&resumed.state().S.points===0,'restore');
    for(const [k,v] of Object.entries(expected))assert(resumed.talentBonus(k)===v,'persisted effect');
    paths++;learned+=4;
  }
  const g=load(newHtml);g.newGame('mage');const d=g.state(),s=d.S;d.monsters.splice(0);d.terrain.splice(0);
  s.level=20;s.points=4;s.spec='defense';s.nodes.d1=true;
  const legacy=JSON.stringify(s.nodes);assert(g.talentBonus('shield')===0,'legacy no implicit buffs');
  g.save();const old=load(newHtml);assert(old.restore()&&JSON.stringify(old.state().S.nodes)===legacy,'legacy exact');
  assert(g.learnAdvanced('resolve')&&g.learnAdvanced('bulwark')&&g.learnAdvanced('laststand'),'mage path');
  s.cool[2]=0;s.res=s.maxRes;g.activate(2);assert(s.shield===14,'mage shield includes +8');
  const ranger=load(newHtml);ranger.newGame('ranger');const rd=ranger.state(),rs=rd.S;rd.monsters.splice(0);rd.terrain.splice(0);
  rs.level=20;rs.points=4;rs.spec='defense';rs.nodes.d1=true;assert(ranger.learnAdvanced('resolve')&&ranger.learnAdvanced('bulwark')&&ranger.learnAdvanced('laststand'),'ranger path');
  rs.hp=1;rs.maxHp=100;rs.bandages=1;ranger.bandage();assert(rs.hp===15,'bandage bonus');
  return {paths,learned,levelGates:'passed',prerequisites:'passed',points:'passed',persistence:'passed',shield:'passed',bandage:'passed'};
}
console.log(testTalents(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
