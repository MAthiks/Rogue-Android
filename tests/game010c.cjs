// Run: node tests/game010c.cjs
const fs=require('node:fs'),path=require('node:path');
function testCoordination(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,EXTENDED_BOSSES,selectBossVariant,extendedBossAction,extendedBossReward,promoteEnemies,bossReward,kill,BESTIARY,CREATURE_POWERS,populateBestiary,creatureAction,enemyPhase,aiFamily,aiLine,aiNeighbors,aiEscapeCells,aiThreatCells,prepareCoordinatedIntent,coordinatedAction,BOSS_PHASE_PATTERN,tacticalTurn,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');
  const walls=new Set(),clear=(x,y)=>x>=1&&y>=1&&x<=19&&y<=19&&!walls.has(x+','+y);
  const board={W:21,H:21,stepOK:(x,y,fx,fy)=>clear(x,y)&&Math.max(Math.abs(x-fx),Math.abs(y-fy))===1&&(!(x!==fx&&y!==fy)||clear(x,fy)&&clear(fx,y))};
  const p={x:7,y:5},mob=(role,x,y,extra={})=>({role,x,y,hp:10,maxHp:10,atk:2,...extra});
  const roles=['wanderer','brute','archer','ambusher','coward','tracker','guardian'];
  const species=Object.values(g.BESTIARY).flat().map(x=>x[0]);
  const families=new Set([...roles.map(role=>g.aiFamily({role})),...species.map(species=>g.aiFamily({species}))]);
  assert(roles.length+species.length===23&&families.size===5,'family coverage');
  assert(g.aiFamily({species:'wraith',role:'brute'})==='flank'&&g.aiFamily({species:'unknown',role:'archer'})==='ranged','species priority and legacy fallback');
  let ranged=mob('archer',3,5),ally=mob('brute',5,5);
  const moved=g.coordinatedAction(ranged,p,[ranged,ally],board,[],{type:'move',x:4,y:5});
  assert(moved.type==='move'&&g.aiLine(moved,p,board,[ranged,ally],ranged)&&moved.y!==5,'clear shooting lane');
  let flanker=mob('tracker',4,5),front=mob('brute',6,4);
  const flank=g.coordinatedAction(flanker,p,[flanker,front],board,[],{type:'move',x:5,y:4});
  assert(flank.type==='move'&&flank.y===6,'flank front line');
  walls.add('5,5');const hidden={type:'move',x:4,y:4};
  assert(g.coordinatedAction(ranged,p,[ranged,ally],board,[],hidden)===hidden,'no hidden pursuit');walls.clear();
  const bossIds=['stone','ash','veil',...Object.keys(g.EXTENDED_BOSSES)];
  assert(bossIds.length===8,'boss count');
  for(const boss of bossIds){
    const m=mob('guardian',5,5,{boss,phase:2,intent:{cells:[{...p}],power:3}});
    assert(g.prepareCoordinatedIntent(m,p,[m],board)&&m.intent.cells.length>1&&m.intent.power===3,'phase pattern '+boss);
    assert(g.aiEscapeCells(p,[m],board).length>0,'boss escape '+boss);
    assert(m.intent.cells.every(c=>g.aiLine(m,c,board)),'walls '+boss);
    m.phase=1;m.intent={cells:[{...p}],power:2};assert(g.prepareCoordinatedIntent(m,p,[m],board)&&m.intent.cells.length===1,'opening unchanged '+boss);
  }
  const cells=g.aiNeighbors(p,board),safe={x:6,y:5};
  const caster=mob('archer',4,4,{intent:{cells:[{...p},...cells.filter(c=>c.x!==safe.x||c.y!==safe.y)],power:2}});
  const mover=mob('brute',5,5);
  assert(g.aiEscapeCells(p,[caster,mover],board).length===1,'one safe exit');
  const protectedMove=g.coordinatedAction(mover,p,[caster,mover],board,[],{type:'move',...safe});
  assert(protectedMove.type==='wait'||protectedMove.x!==safe.x||protectedMove.y!==safe.y,'do not seal last exit');
  const second=mob('archer',5,4,{intent:{cells:[{...p},safe],power:2}});
  assert(g.prepareCoordinatedIntent(second,p,[caster,mover,second],board)&&!second.intent.cells.some(c=>c.x===safe.x&&c.y===safe.y),'combined telegraph escape');
  const blockers=cells.map(c=>mob('brute',c.x,c.y));second.intent={cells:[{...p}],power:2};
  assert(!g.prepareCoordinatedIntent(second,p,[second,...blockers],board)&&!second.intent,'no new unavoidable warning');
  // Integration: actual boss warning, persistence and stun cancellation.
  const d=g.state();d.monsters.splice(0);d.terrain.splice(0);d.features.splice(0);d.loot.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=7;d.S.y=7;d.S.floor=18;d.S.hp=d.S.maxHp;d.stairs.x=15;d.stairs.y=15;
  const boss=mob('guardian',5,7,{boss:'veil',phase:1,hp:10,maxHp:40,kind:'Veyl',color:'#aaaaaa',ability:'Marque du vide',specialCD:0});
  d.monsters.push(boss);const hp=d.S.hp;g.enemyPhase();
  assert(boss.intent&&boss.intent.cells.length>1&&d.S.hp===hp,'actual boss warning');
  const saved=JSON.stringify(boss.intent);g.save();const resumed=load(newHtml);assert(resumed.restore(),'restore');
  const r=resumed.state();assert(JSON.stringify(r.monsters[0].intent)===saved,'intent saved exactly');
  r.monsters[0].stun=1;resumed.enemyPhase();assert(!r.monsters[0].intent&&r.S.hp===hp,'stun interrupts');
  // Seeded formation stress: moves stay single-step, avoid walls and collisions.
  let turns=0;for(let seed=0;seed<30;seed++){
    const dungeon=g.buildDungeon(48,32,1+seed%30,seed),all=dungeon.monsters,player=dungeon.start;
    const clear=(x,y)=>x>=0&&y>=0&&x<48&&y<32&&dungeon.map[y*48+x]===0;
    const b={W:48,H:32,stepOK:(x,y,fx,fy)=>clear(x,y)&&(!(x!==fx&&y!==fy)||clear(x,fy)&&clear(fx,y))};
    for(let t=0;t<10;t++)for(const m of all){
      const base=g.tacticalTurn(m,player,all,b,[]),a=g.coordinatedAction(m,player,all,b,[],base);
      if(a.type==='move'){assert(b.stepOK(a.x,a.y,m.x,m.y)&&Math.max(Math.abs(a.x-m.x),Math.abs(a.y-m.y))===1,'legal step');assert(!all.some(z=>z!==m&&z.hp>0&&z.x===a.x&&z.y===a.y)&&!(a.x===player.x&&a.y===player.y),'collision');m.x=a.x;m.y=a.y}
      turns++;
    }
  }
  return {enemyTypes:23,families:families.size,bosses:bossIds.length,simulatedTurns:turns,escape:'passed',formation:'passed',persistence:'passed',interrupt:'passed'};
}
console.log(testCoordination(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
