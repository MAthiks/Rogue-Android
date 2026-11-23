// Run: node tests/game004f.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];new vm.Script(js);
const extract=(a,b,context={})=>vm.runInNewContext('('+js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a))).trim()+')',context);
function testBalance(build,decorate,terrain,promote,enemyXP,balanceEnemies,addSupplies){
  const assert=(v,m)=>{if(!v)throw Error(m)},level=x=>{let l=1;while(l<30&&x>=8+l*6){x-=8+l*6;l++}return l};
  const runs=[],rows=[];let supply=0;
  for(let n=0;n<20;n++){
    let before=0,after=0;
    for(let floor=1;floor<=30;floor++){
      const seed=n*30+floor-1,d=build(48,32,floor,seed),deco=decorate(d,48,32,floor),t=terrain(d,deco,48,32,floor),p=promote(d.monsters,floor,seed,d.stairs),m=balanceEnemies(p,floor),l=addSupplies(d,deco,t);
      assert(m.length===p.length&&m.every((e,i)=>e.x===p[i].x&&e.y===p[i].y&&e.hp===e.maxHp&&e.atk>=p[i].atk),'stats and coordinates');
      assert(l.length===d.loot.length+1,'guaranteed supply');const a=l.at(-1);assert(a.kind==='bandage'&&deco.map[a.y*48+a.x]===0&&Math.max(Math.abs(a.x-d.start.x),Math.abs(a.y-d.start.y))<=3,'safe supply');
      assert(![d.start,d.stairs,...d.monsters,...d.loot,...deco.features,...t].some(q=>q.x===a.x&&q.y===a.y),'overlap');supply++;
      before+=p.reduce((s,m)=>s+(m.boss?24+floor:m.elite?12:4),0);after+=m.reduce((s,m)=>s+enemyXP(m,floor),0);
      if(floor%6===0){let r=rows.find(r=>r.floor===floor);if(!r){r={floor,before:0,after:0,full:0,partial:0};rows.push(r)}r.before+=before;r.after+=after;r.full+=level(after);r.partial+=level(after*.75)}
    }
    runs.push({before,after,full:level(after),partial:level(after*.75)});
  }
  assert(runs.every(r=>r.after>r.before),'xp increased');assert(runs.every(r=>r.full>=29),'full clear near cap');
  return {runs:runs.length,floors:600,supply,mean:rows.map(r=>({floor:r.floor,beforeXP:Math.round(r.before/20),afterXP:Math.round(r.after/20),fullLevel:r.full/20,level75:r.partial/20})),fullRange:[Math.min(...runs.map(r=>r.full)),Math.max(...runs.map(r=>r.full))]};
}
console.log(testBalance(extract('function buildDungeon(','function generate(){'),extract('function decorateDungeon(','function featureAt('),extract('function buildTerrain(','const BIOMES=',{biomeForFloor:extract('function biomeForFloor(','function buildTerrain(')}),extract('function promoteEnemies(','function bossAction('),extract('function enemyXP(','function balanceEnemies('),extract('function balanceEnemies(','function addSupplies('),extract('function addSupplies(','function healingLeft(')));
