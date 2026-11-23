// Run: node tests/game004e.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];new vm.Script(js);
const extract=(a,b)=>vm.runInNewContext('('+js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a))).trim()+')');
const biome=extract('function biomeForFloor(','function buildTerrain(');
const terrain=vm.runInNewContext('('+js.slice(js.indexOf('function buildTerrain('),js.indexOf('const BIOMES=')).trim()+')',{biomeForFloor:biome});
function testBiomes(build,decorate,biomeForFloor,buildTerrain){
  const assert=(v,m)=>{if(!v)throw Error(m)},W=48,H=32,k=p=>p.y*W+p.x,counts={},hazards={};
  for(let seed=0;seed<600;seed++){
    const floor=1+seed%30,d=build(W,H,floor,seed),deco=decorate(d,W,H,floor),biome=biomeForFloor(floor),t=buildTerrain(d,deco,W,H,floor);
    assert(JSON.stringify(t)===JSON.stringify(buildTerrain(d,deco,W,H,floor)),'deterministic');
    const used=new Set([d.start,d.stairs,...d.monsters,...d.loot,...deco.features].map(k)),blocked=new Set();
    for(const p of t){const id=k(p);assert(!used.has(id)&&deco.map[id]===0&&d.map[id]===0,'overlap');assert(Math.max(Math.abs(p.x-d.start.x),Math.abs(p.y-d.start.y))>8,'start safety');used.add(id);blocked.add(id);hazards[p.type]=(hazards[p.type]||0)+1}
    const q=[k(d.start)],seen=new Set(q);
    for(let i=0;i<q.length;i++){let n=q[i],x=n%W,y=Math.floor(n/W);for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){let j=ny*W+nx;if(nx>=0&&ny>=0&&nx<W&&ny<H&&d.map[j]===0&&!blocked.has(j)&&!seen.has(j)){seen.add(j);q.push(j)}}}
    assert(seen.has(k(d.stairs))&&d.rooms.every(r=>seen.has(r.cy*W+r.cx)),'hazards avoidable');
    assert(biome!=='crypt'||!t.length,'crypt safe');counts[biome]=(counts[biome]||0)+1;
  }
  assert(Object.keys(counts).length===5&&Object.keys(hazards).length===4,'diversity');
  return {seeds:600,counts,hazards};
}
console.log(testBiomes(extract('function buildDungeon(','function generate(){'),extract('function decorateDungeon(','function featureAt('),biome,terrain));
