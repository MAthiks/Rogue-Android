// Run: node tests/game004b.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];new vm.Script(js);
const extract=(a,b)=>vm.runInNewContext('('+js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a))).trim()+')');
function testTactics(tacticalTurn,build){
  const assert=(v,m)=>{if(!v)throw Error(m)},W=12,H=12;
  const walls=new Set(),clear=(x,y)=>x>0&&y>0&&x<W-1&&y<H-1&&!walls.has(x+','+y);
  const stepOK=(x,y,fx,fy)=>clear(x,y)&&(!(x!==fx&&y!==fy)||clear(x,fy)&&clear(fx,y));
  const board={W,H,stepOK},p={x:7,y:5},make=(role,x,y,extra={})=>({role,x,y,hp:9,maxHp:9,...extra});
  const act=(m,all=[m],contacts=[],player=p)=>tacticalTurn(m,player,all,board,contacts);
  let m=make('wanderer',3,5);assert(act(m).type==='move','pursuit');
  m=make('brute',6,5);assert(act(m).type==='attack','melee');
  m=make('archer',3,5);assert(act(m).type==='aim'&&m.aim.x===7,'telegraph');assert(act(m).ranged===true&&!m.aim,'shot');
  m=make('archer',3,5);act(m);assert(act(m,[m],[],{x:7,y:6}).type==='wait'&&!m.aim,'dodge telegraph');
  m=make('archer',3,5);let ally=make('brute',5,5);assert(act(m,[m,ally]).type!=='aim','friendly blocks fire');
  m=make('archer',6,5);assert(act(m).type==='move','archer retreat');
  m=make('ambusher',2,5);assert(act(m).type==='wait','ambush waits');m.x=4;assert(act(m).type==='move'&&m.awake,'ambush awake');
  m=make('coward',6,5,{hp:2});let r=act(m);assert(r.type==='move'&&Math.max(Math.abs(r.x-p.x),Math.abs(r.y-p.y))>1,'flee');
  m=make('tracker',3,5);walls.add('5,5');ally=make('brute',4,4);r=act(m,[m,ally],[ally]);assert(r.type==='move'&&m.memory===5,'cooperation');
  walls.clear();m=make('wanderer',3,5);act(m);walls.add('5,5');r=act(m);assert(r.type==='move'&&r.y!==5&&m.memory===4,'route around obstacle '+JSON.stringify(r));
  for(let i=0;i<5;i++)act(m);assert(!m.lastSeen,'memory expires');
  walls.clear();m=make('wanderer',6,4);walls.add('7,4');assert(act(m).type!=='attack','no diagonal corner attack');walls.clear();
  m=make(undefined,6,5,{kind:'Brute'});assert(act(m).type==='attack','legacy role');
  const roles=new Set();let turns=0;
  for(let seed=0;seed<100;seed++){
    const d=build(48,32,1+seed%30,seed),all=d.monsters,player=d.start;
    const clear=(x,y)=>x>=0&&y>=0&&x<48&&y<32&&d.map[y*48+x]===0;
    const b={W:48,H:32,stepOK:(x,y,fx,fy)=>clear(x,y)&&(!(x!==fx&&y!==fy)||clear(x,fy)&&clear(fx,y))};
    for(const e of all)roles.add(e.role);
    for(let t=0;t<20;t++)for(const e of all){if(t===0){e.lastSeen={...player};e.memory=5}const a=tacticalTurn(e,player,all,b,[]);
      if(a.type==='move'){assert(b.stepOK(a.x,a.y,e.x,e.y)&&Math.max(Math.abs(a.x-e.x),Math.abs(a.y-e.y))===1,'legal single step');assert(!all.some(o=>o!==e&&o.x===a.x&&o.y===a.y)&&!(player.x===a.x&&player.y===a.y),'collision');e.x=a.x;e.y=a.y}turns++;
    }
  }
  assert(roles.size===7,'role diversity');return {scenarios:14,simulatedEnemyTurns:turns,roles:[...roles]};
}
console.log(testTactics(extract('function tacticalTurn(','function enemyAttack('),extract('function buildDungeon(','function generate(){')));
