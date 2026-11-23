// Run: node tests/game004d.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];new vm.Script(js);
const extract=(a,b)=>vm.runInNewContext('('+js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a))).trim()+')');
function testBosses(build,promote,bossAction){
  const assert=(v,m)=>{if(!v)throw Error(m)},types=new Set(),affixes=new Set();let bosses=0,elites=0;
  for(let seed=0;seed<600;seed++){
    const floor=1+seed%30,d=build(48,32,floor,seed),p=promote(d.monsters,floor,seed,d.stairs);
    assert(JSON.stringify(p)===JSON.stringify(promote(d.monsters,floor,seed,d.stairs)),'determinism');
    assert(p.length===d.monsters.length&&p.every((m,i)=>m.x===d.monsters[i].x&&m.y===d.monsters[i].y&&m.hp===m.maxHp),'positions');
    const bs=p.filter(m=>m.boss),es=p.filter(m=>m.affix);assert(bs.length===(floor%6===0?1:0),'boss cadence');assert(es.length===(floor<4?0:floor<12?1:2),'elite cadence');
    bs.forEach(m=>types.add(m.boss));es.forEach(m=>affixes.add(m.affix));bosses+=bs.length;elites+=es.length;
  }
  const walls=new Set(),clear=(x,y)=>x>=1&&y>=1&&x<=10&&y<=10&&!walls.has(x+','+y);
  const board={stepOK:(x,y,fx,fy)=>clear(x,y)&&(!(x!==fx&&y!==fy)||clear(x,fy)&&clear(fx,y))};
  const m={boss:'ash',x:4,y:4,hp:30,maxHp:30,phase:1,specialCD:0},p={x:6,y:4};
  assert(bossAction(m,p,board).type==='announce'&&m.intent.cells.length===5,'telegraph cross');
  assert(bossAction(m,{x:7,y:5},board).hit===false&&!m.intent,'dodge');
  assert(m.specialCD===3,'cooldown');assert(bossAction(m,p,board)===null&&m.specialCD===2,'cooldown tick');
  m.specialCD=0;m.hp=15;let a=bossAction(m,p,board);assert(a.changed&&m.phase===2&&m.intent.power===3,'phase2');
  assert(bossAction(m,p,board).hit&&m.specialCD===2,'release');
  m.specialCD=0;walls.add('5,4');assert(bossAction(m,p,board)===null,'wall blocks announcement');walls.clear();
  m.specialCD=0;bossAction(m,p,board);walls.add('5,4');assert(!bossAction(m,p,board).hit,'wall blocks release');
  assert(types.size===3&&affixes.size===3,'diversity');return {seeds:600,bosses,elites,types:[...types],affixes:[...affixes],specialScenarios:8};
}
console.log(testBosses(extract('function buildDungeon(','function generate(){'),extract('function promoteEnemies(','function bossAction('),extract('function bossAction(','function bossReward(')));
