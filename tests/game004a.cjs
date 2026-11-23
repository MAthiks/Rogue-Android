// GAME-004A regression tests. Run: node tests/game004a.cjs
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');const js=html.split('<script>')[1].split('</script>')[0];new vm.Script(js);
const begin=js.indexOf('function buildDungeon('),end=js.indexOf('function generate(){',begin);if(begin<0||end<0)throw Error('generator not found');
const buildDungeon=vm.runInNewContext('('+js.slice(begin,end).trim()+')');
function checkDungeon(buildDungeon){
  const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
  const profiles={},shapes=new Set(),W=48,H=32;
  let minRooms=99,maxRooms=0,minDistance=999,maxDistance=0,minEnemies=999,maxEnemies=0,minShortcuts=99;
  for(let seed=0;seed<600;seed++){
    const floor=1+seed%30,d=buildDungeon(W,H,floor,seed),a=d.map,key=p=>p.y*W+p.x;
    assert(JSON.stringify(d)===JSON.stringify(buildDungeon(W,H,floor,seed)),'seed '+seed+' not deterministic');
    assert(a.length===W*H&&a.every(v=>v===0||v===1),'format');
    assert(d.rooms.length>=6,'rooms');
    for(let x=0;x<W;x++)assert(a[x]===1&&a[(H-1)*W+x]===1,'horizontal border');
    for(let y=0;y<H;y++)assert(a[y*W]===1&&a[y*W+W-1]===1,'vertical border');
    const q=[key(d.start)],dist=new Map([[q[0],0]]);
    for(let i=0;i<q.length;i++){
      const k=q[i],x=k%W,y=Math.floor(k/W);
      for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
        if(nx<0||ny<0||nx>=W||ny>=H)continue;
        const n=ny*W+nx;if(a[n]===0&&!dist.has(n)){dist.set(n,dist.get(k)+1);q.push(n)}
      }
    }
    assert(q.length===a.filter(v=>v===0).length,'connectivity');
    const exitDistance=dist.get(key(d.stairs));
    assert(exitDistance>0&&d.rooms.every(r=>dist.get(r.cy*W+r.cx)<=exitDistance),'stairs distance');
    const entities=[d.start,d.stairs,...d.monsters,...d.loot],occupied=new Set();
    for(const e of entities){assert(Number.isInteger(e.x)&&Number.isInteger(e.y)&&a[key(e)]===0&&!occupied.has(key(e)),'entity overlap/wall');occupied.add(key(e))}
    assert(d.monsters.every(m=>Math.max(Math.abs(m.x-d.start.x),Math.abs(m.y-d.start.y))>8),'unsafe start');
    assert(d.monsters.filter(m=>m.elite).length===(floor%3===0?1:0),'elite count');
    assert(d.monsters.length>0&&d.monsters.every(m=>m.hp===m.maxHp&&m.hp>0),'enemies');
    profiles[d.profile]=(profiles[d.profile]||0)+1;d.rooms.forEach(r=>shapes.add(r.shape));
    minRooms=Math.min(minRooms,d.rooms.length);maxRooms=Math.max(maxRooms,d.rooms.length);
    minDistance=Math.min(minDistance,exitDistance);maxDistance=Math.max(maxDistance,exitDistance);
    minEnemies=Math.min(minEnemies,d.monsters.length);maxEnemies=Math.max(maxEnemies,d.monsters.length);
    minShortcuts=Math.min(minShortcuts,d.shortcuts);
  }
  assert(Object.keys(profiles).length===3&&shapes.size===2&&minShortcuts>=1,'diversity');
  return {seeds:600,profiles,shapes:[...shapes],rooms:[minRooms,maxRooms],stairsDistance:[minDistance,maxDistance],enemies:[minEnemies,maxEnemies],minShortcuts};
}
console.log(JSON.stringify(checkDungeon(buildDungeon),null,2));
