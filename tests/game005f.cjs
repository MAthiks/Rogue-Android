// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testBalance005(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,BALANCE,diminishingChance,criticalChance,dodgeChance,attackAttribute,outgoingDamage,incomingDamage,resourceRegen,basicProfile,createGear,learnAdvanced,WEAPONS,GEAR_SETS,aimWeapon,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let d=g.state(),s=d.S;
  const check=g.diminishingChance;
  for(let i=0;i<200;i++){assert(check(i,35,50)<=50&&check(i,25,35)<=35,'cap');assert(check(i+1,35,50)>=check(i,35,50),'monotonic')}
  assert(check(-1,35,50)===0&&check(35,35,50)===35&&check(44,35,50)===38&&check(100,35,50)===50,'crit softcap');
  assert(check(25,25,35)===25&&check(34,25,35)===28&&check(100,25,35)===35,'dodge softcap');
  s.floor=20;s.attrs=[24,12,30,40,8,40];s.equip.weapon={slot:'weapon',family:'blade',atk:3,crit:20,regen:1};s.equip.armor={slot:'armor',def:100,dodge:100};s.equip.ring={slot:'ring',regen:3};s.nodes.master=true;
  const mob={atk:20,hp:40,maxHp:40};
  assert(g.incomingDamage(mob)===4&&g.incomingDamage({...mob,elite:true})===6&&g.incomingDamage({...mob,boss:'stone'})===6,'armor floors');
  s.floor=1;assert(g.incomingDamage(mob)===1,'early armor unchanged');s.floor=20;
  assert(g.criticalChance()===50&&g.dodgeChance()===35&&g.resourceRegen()===4&&g.resourceRegen(true)===1,'effective caps');
  const oldWeapon={slot:'weapon',name:'ancienne lame',atk:2};s.equip.weapon=oldWeapon;assert(g.attackAttribute()===24,'legacy attribute');
  const attributes={blade:24,axe:24,mace:24,dagger:12,bow:12,spear:24,staff:8};
  for(const [family,value] of Object.entries(attributes)){s.equip.weapon={slot:'weapon',family};assert(g.attackAttribute()===value&&g.attackAttribute({skill:true})===24,'weapon attribute '+family)}
  d.monsters.splice(0);d.features.splice(0);d.terrain.splice(0);d.loot.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  s.x=6;s.y=6;d.stairs.x=15;d.stairs.y=15;s.res=8;s.maxRes=50;
  s.equip.weapon={slot:'weapon',family:'bow',atk:1,regen:1};d.monsters.push({x:9,y:6,kind:'cible',role:'melee',hp:999,maxHp:999,atk:1,stun:10,color:'#ccc'});
  g.aimWeapon();g.move(1,0);assert(s.res===7,'paid shot with maximal regen');
  g.save();const resumed=load(newHtml);assert(resumed.restore()&&JSON.stringify(resumed.state().S.equip)===JSON.stringify(s.equip),'gear not rewritten');
  let count=0;const rows=[];
  const rngFrom=seed=>n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n)};
  for(const level of [1,5,10,15,20,30]){
    const samples=[];
    for(const id of ['warrior','rogue','ranger','mage'])for(const spec of ['offense','defense']){
      const b=load(newHtml);b.newGame(id);const state=b.state().S;state.level=level;state.floor=level;state.spec=level>=5?spec:null;
      const stat=id==='warrior'?0:id==='mage'?4:1;
      // Two attribute points per level, split between offense and survival.
      state.attrs[stat]+=level-1;state.attrs[spec==='defense'?2:5]+=level-1;
      state.points=level-1;
      const spend=k=>{if(state.points>0){state.nodes[k]=true;state.points--}};
      if(level>=2){spend('o1');spend('d1')}if(level>=5){spend('o2');spend('d2')}if(level>=10)spend('master');
      if(level>=8){b.learnAdvanced('vigor');b.learnAdvanced('resolve')}
      if(level>=12)b.learnAdvanced(spec==='offense'?'frenzy':'bulwark');
      if(level>=20)b.learnAdvanced(spec==='offense'?'execution':'laststand');
      assert(state.points>=0,'legal budget');
      const random=rngFrom(level*313+id.length*73);
      for(let i=0;i<80;i++){const item=b.createGear(i+1,level,1,random);if(!state.equip[item.slot])state.equip[item.slot]=item}
      for(const family of Object.keys(b.WEAPONS)){
        state.equip.weapon={...state.equip.weapon,family};state.combatStyle=spec==='offense'?'aggressive':'defensive';
        const target={hp:20+level*2,maxHp:20+level*2,atk:4+Math.floor(level/3),elite:true,affix:'armored'};
        const profile=b.basicProfile(target,b.WEAPONS[family].range>1);
        const normal=b.outgoingDamage(target,3,profile,false),critical=b.outgoingDamage(target,3,profile,true),taken=b.incomingDamage(target),crit=b.criticalChance(profile),dodge=b.dodgeChance();
        assert(normal>=1&&critical>=normal&&taken>=1&&crit<=50&&dodge<=35&&b.resourceRegen()<=4,'bounded build');
        const expected=normal*(1-crit/100)+critical*crit/100;
        samples.push({expected,taken});count++;
      }
    }
    rows.push({level,meanAttack:+(samples.reduce((a,v)=>a+v.expected,0)/samples.length).toFixed(2),meanIncoming:+(samples.reduce((a,v)=>a+v.taken,0)/samples.length).toFixed(2)});
  }
  return {profiles:count,rows,crit:'passed',dodge:'passed',armor:'passed',resource:'passed',attribute:'passed',persistence:'passed'};
}
console.log(testBalance005(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
