// Run: node tests/game010a.cjs
const fs=require('node:fs'),path=require('node:path');
function testDoctrines(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {CLASSES,SPECS,ATTR,characterDossier,characterAttributeCard,characterRankCard,criticalChance,dodgeChance,resourceRegen,doctrineBonus,doctrineDescription,outgoingDamage,incomingDamage,newGame,save,restore,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain})};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  let cases=0;
  for(const id of Object.keys(load(newHtml).CLASSES))for(const spec of ['offense','defense']){
    const g=load(newHtml);g.newGame(id);const s=g.state().S;
    s.level=5;s.spec=spec;s.floor=1;s.x=5;s.y=5;s.hp=Math.floor(s.maxHp/2);s.res=Math.floor(s.maxRes/2);
    s.guard=2;s.shield=4;
    const target={x:8,y:5,hp:30,maxHp:30,atk:30,bleed:2};
    const profile=id==='ranger'?{ranged:true}:id==='mage'?{skill:true,ranged:true}:{skill:true};
    const kind=spec==='offense'?'damage':id==='rogue'?'dodge':'def';
    const expected=kind==='dodge'?5:2;
    assert(g.doctrineBonus(s,kind,target,profile)===expected,'active '+id+' '+spec);
    const effect=()=>kind==='damage'?g.outgoingDamage(target,6,profile,false):kind==='def'?g.incomingDamage(target):g.dodgeChance();
    const active=effect();s.level=4;const inactive=effect();
    assert(g.doctrineBonus(s,kind,target,profile)===0,'level gate');
    assert(active-inactive===(kind==='def'?-expected:expected),'actual combat '+id+' '+spec);
    s.level=5;s.spec=null;assert(g.doctrineBonus(s,kind,target,profile)===0,'no specialization');s.spec=spec;
    // Inactive condition, without changing specialization or any permanent value.
    if(spec==='offense'){
      if(id==='warrior')s.hp=s.maxHp;
      if(id==='rogue')target.bleed=0;
      if(id==='ranger')target.x=7;
      if(id==='mage')s.res=s.maxRes;
    }else{
      if(id==='warrior'||id==='rogue')s.guard=0;
      if(id==='ranger')s.hp=s.maxHp;
      if(id==='mage')s.shield=0;
    }
    assert(g.doctrineBonus(s,kind,target,profile)===0,'inactive '+id+' '+spec);
    assert(g.characterDossier().includes(g.doctrineDescription(id,spec)),'dossier description');
    g.save();const resumed=load(newHtml);assert(resumed.restore(),'restore '+id);
    const rs=resumed.state().S;
    for(const k of ['classId','spec','level','hp','res','guard','shield','nodes','points','ranks','bar'])assert(JSON.stringify(rs[k])===JSON.stringify(s[k]),'save '+k);
    assert(resumed.doctrineBonus(rs,kind,target,profile)===0,'restore condition');
    if(id==='rogue'&&spec==='defense'){rs.guard=3;rs.attrs[1]=100;assert(resumed.dodgeChance()===35,'dodge cap')}
    if(kind==='def'){rs.floor=20;rs.armor=100;assert(resumed.incomingDamage({...target,elite:true})===9,'armor floor')}
    cases++;
  }
  const g=load(newHtml);g.newGame('ranger');const s=g.state().S;s.level=5;s.spec='offense';
  assert(g.doctrineBonus(s,'damage',{x:s.x+3,y:s.y},{})===0,'no ranged bonus in melee');
  assert(g.doctrineBonus(s,'damage',{hp:20},{ranged:true})===0,'no invented distance');
  g.newGame('mage');const m=g.state().S;m.level=5;m.spec='offense';m.res=0;
  assert(g.doctrineBonus(m,'damage',{}, {ranged:true})===0,'not a spell');
  return {specializations:cases,activation:'passed',combat:'passed',gates:'passed',caps:'passed',save:'passed',dossier:'passed'};
}
console.log(testDoctrines(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
