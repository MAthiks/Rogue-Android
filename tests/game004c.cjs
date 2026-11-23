// Run: node tests/game004c.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];new vm.Script(js);
const extract=(a,b)=>vm.runInNewContext('('+js.slice(js.indexOf(a),js.indexOf(b,js.indexOf(a))).trim()+')');
function checkFeatures(build,decorate){
  const assert=(v,m)=>{if(!v)throw Error(m)},W=48,H=32,k=p=>p.y*W+p.x;let totals={door:0,chest:0,trap:0,secret:0},minDoors=99;
  for(let seed=0;seed<600;seed++){
    const floor=1+seed%30,d=build(W,H,floor,seed),v=decorate(d,W,H,floor),map=v.map.slice();
    assert(JSON.stringify(v)===JSON.stringify(decorate(d,W,H,floor)),'determinism');
    const occupied=new Set([d.start,d.stairs,...d.monsters,...d.loot].map(k));
    for(const f of v.features){assert(!occupied.has(k(f)),'overlap');occupied.add(k(f));totals[f.type]++;assert(map[k(f)]===(['door','secret'].includes(f.type)?1:0),'map type');if(f.type==='door')map[k(f)]=0}
    const reach=()=>{const q=[k(d.start)],seen=new Set(q);for(let i=0;i<q.length;i++){let n=q[i],x=n%W,y=Math.floor(n/W);for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(nx>=0&&ny>=0&&nx<W&&ny<H){let j=ny*W+nx;if(map[j]===0&&!seen.has(j)){seen.add(j);q.push(j)}}}return seen};
    let seen=reach();assert(d.map.every((cell,i)=>cell!==0||seen.has(i))&&seen.has(k(d.stairs)),'main map accessible');
    const secret=v.features.find(f=>f.type==='secret'),chest=v.features.find(f=>f.secret);
    if(secret){assert(chest&&!seen.has(k(chest)),'secret hidden');map[k(secret)]=0;seen=reach();assert(seen.has(k(chest))&&seen.size===map.filter(x=>x===0).length,'secret accessible')}
    assert(!v.features.some(f=>f.type==='trap'&&floor===1),'floor one trap');
    minDoors=Math.min(minDoors,v.features.filter(f=>f.type==='door').length);
  }
  return {seeds:600,totals,minDoors};
}
console.log(checkFeatures(extract('function buildDungeon(','function generate(){'),extract('function decorateDungeon(','function featureAt(')));
