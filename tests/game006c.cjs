// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testBosses006C(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,EXTENDED_BOSSES,selectBossVariant,extendedBossAction,extendedBossReward,promoteEnemies,bossReward,kill,BESTIARY,CREATURE_POWERS,populateBestiary,creatureAction,enemyPhase,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');const seen=new Set(),counts={};
  for(let seed=0;seed<600;seed++)for(const floor of [6,12,18,24,30]){
    const old={x:10,y:10,hp:30,maxHp:30,atk:5,boss:['stone','ash','veil'][(floor/6-1)%3],elite:true,role:'guardian'},base=[old,{x:11,y:10,hp:5}],out=g.selectBossVariant(base,floor,seed);
    assert(JSON.stringify(out)===JSON.stringify(g.selectBossVariant(base,floor,seed)),'deterministic variant');
    assert(out[1]===base[1]&&out[0].x===old.x&&out[0].hp===old.hp&&out[0].atk===old.atk&&out[0].elite,'preserved spawn stats');
    assert(old.boss===['stone','ash','veil'][(floor/6-1)%3],'no mutation');seen.add(out[0].boss);counts[out[0].boss]=(counts[out[0].boss]||0)+1;
    assert(g.selectBossVariant(base,floor-1,seed)===base,'no extra bosses');
    if(g.EXTENDED_BOSSES[out[0].boss])assert(g.EXTENDED_BOSSES[out[0].boss].floor===floor,'depth');
  }
  assert(seen.size===8,'eight bosses');
  const board={stepOK:(x,y,fx,fy)=>x>=1&&x<=19&&y>=1&&y<=19&&Math.max(Math.abs(x-fx),Math.abs(y-fy))===1},p={x:8,y:8},rewards=new Set();
  for(const [boss,b] of Object.entries(g.EXTENDED_BOSSES)){
    const m={boss,x:6,y:8,hp:30,maxHp:30,phase:1,specialCD:0};
    for(const [hp,phase] of [[30,1],[20,2],[10,3]]){
      m.hp=hp;m.specialCD=0;let a=g.extendedBossAction(m,p,board);assert(a.type==='announce'&&m.phase===phase&&m.intent.power===phase+1,'phase '+boss);
      assert(m.intent.cells.some(c=>c.x===p.x&&c.y===p.y),'target');
      let escape;for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if((x||y)&&!m.intent.cells.some(c=>c.x===p.x+x&&c.y===p.y+y))escape={x:p.x+x,y:p.y+y};
      assert(escape&&!g.extendedBossAction(m,escape,board).hit&&!m.intent,'evadable');
      assert(m.specialCD===(phase===1?3:2),'cooldown');
      assert(g.extendedBossAction(m,p,board)===null,'cooldown tick');
      m.specialCD=0;g.extendedBossAction(m,p,board);assert(g.extendedBossAction(m,p,board).hit,'hit');
      m.specialCD=0;assert(g.extendedBossAction(m,p,{stepOK:()=>false})===null,'wall block');
    }
    const it=g.extendedBossReward(m);assert(it.rarity===5&&it.bossRelic&&it.slot===b.slot&&it.name===b.relic&&it.uniqueId==='boss-'+boss,'reward');rewards.add(it.slot);
  }
  assert(rewards.size===5,'all gear slots');
  const d=g.state();d.monsters.splice(0);d.terrain.splice(0);d.features.splice(0);d.loot.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.S.floor=30;d.S.hp=30;d.stairs.x=15;d.stairs.y=15;
  const boss={x:8,y:6,hp:10,maxHp:30,atk:4,role:'guardian',boss:'abyssal',kind:'Nox',color:'#ccc',ability:'Déchirure abyssale',elite:true,phase:1,specialCD:0};
  d.monsters.push(boss);g.enemyPhase();assert(boss.phase===3&&boss.intent&&d.S.hp===30,'integration warning');
  g.save();const r=load(newHtml);assert(r.restore()&&r.state().monsters[0].phase===3&&r.state().monsters[0].intent,'restore');
  r.state().monsters[0].stun=1;r.enemyPhase();assert(!r.state().monsters[0].intent&&r.state().S.hp===30,'interrupt');
  g.kill(boss);assert(g.state().loot.some(l=>l.item?.uniqueId==='boss-abyssal')&&g.state().monsters.length===0,'kill reward');
  return {cases:3000,bosses:seen.size,counts,newBosses:5,phases:3,rewards:rewards.size,persistence:'passed'};
}
console.log(testBosses006C(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
