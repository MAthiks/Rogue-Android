function biomeForFloor(floor,seed){
  const original=['crypt','cave','ruins','volcanic','sanctum'][Math.min(4,Math.max(0,Math.floor((floor-1)/6)))];
  // Preserve the historical route when no seed is supplied, and on boss floors.
  if(!Number.isInteger(seed)||floor<4||floor%6===0)return original;
  let n=(seed^Math.imul(floor,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0;
  if(n%100>=35)return original;
  return floor<=12?'fungal':floor<=24?'frozen':'abyss';
}
/* TECH-012A — Ajoute le terrain propre au biome sur les cases admissibles. Les positions réservées aux éléments du donjon et aux entités sont exclues. */
function buildTerrain(d,decorated,W,H,floor,chosenBiome){
  const biome=chosenBiome||biomeForFloor(floor),terrain=[],map=decorated.map;
  if(biome==='crypt')return terrain;
  let state=(d.seed^0xb19a45cf)>>>0;const rnd=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*n)};
  const k=(x,y)=>y*W+x,occupied=new Set([d.start,d.stairs,...d.monsters,...d.loot,...decorated.features].map(p=>k(p.x,p.y)));
  const baseOpen=(x,y)=>x>0&&y>0&&x<W-1&&y<H-1&&d.map[k(x,y)]===0;
  // Terrain only on original room interiors. Never on stairs, initial spawn, secrets, doors, or entities.
  const candidates=[];
  for(const r of d.rooms)for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++){
    if(!baseOpen(x,y)||map[k(x,y)]!==0||occupied.has(k(x,y))||Math.max(Math.abs(x-d.start.x),Math.abs(y-d.start.y))<=8)continue;
    if(![[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>baseOpen(x+dx,y+dy)))continue;
    candidates.push({x,y});
  }
  const type={cave:'water',ruins:'rubble',volcanic:'ember',sanctum:'font',fungal:'spores',frozen:'ice',abyss:'void'}[biome];
  const limit={water:6,rubble:6,ember:5,font:2,spores:5,ice:6,void:5}[type],blocked=new Set();
  // Every original room center and the exit must remain reachable without crossing environmental hazards.
  const accessible=()=>{
    const q=[k(d.start.x,d.start.y)],seen=new Set(q);
    for(let i=0;i<q.length;i++){const n=q[i],x=n%W,y=Math.floor(n/W);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,j=k(nx,ny);if(baseOpen(nx,ny)&&!blocked.has(j)&&!seen.has(j)){seen.add(j);q.push(j)}
    }}
    return seen.has(k(d.stairs.x,d.stairs.y))&&d.rooms.every(r=>seen.has(k(r.cx,r.cy)))&&decorated.features.filter(f=>f.type==='secret').every(f=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(k(f.x+dx,f.y+dy))));
  };
  while(candidates.length&&terrain.length<limit){
    const p=candidates.splice(rnd(candidates.length),1)[0],id=k(p.x,p.y);
    if(terrain.some(q=>Math.max(Math.abs(q.x-p.x),Math.abs(q.y-p.y))<=1))continue;
    blocked.add(id);if(!accessible()){blocked.delete(id);continue}
    terrain.push({...p,type,spent:false});
  }
  return terrain;
}
const BIOMES={
 crypt:{name:'Cryptes',wall:['#515d65','#252e36'],edge:['#74838a','#303d45'],floor:['#293c40','#17252c'],detail:['#3e5252','#26363b'],motif:'brick'},
 cave:{name:'Cavernes',wall:['#526b65','#293a37'],edge:['#819787','#3e5149'],floor:['#293e39','#172923'],detail:['#4b6251','#31433a'],motif:'rock'},
 ruins:{name:'Ruines',wall:['#77736a','#3c3933'],edge:['#a39a83','#514b3d'],floor:['#514a3b','#29251e'],detail:['#74644e','#3b3429'],motif:'mosaic'},
 volcanic:{name:'Forges',wall:['#66504a','#382a29'],edge:['#99715c','#513b34'],floor:['#3b2e30','#211b20'],detail:['#725046','#44302f'],motif:'crack'},
 sanctum:{name:'Sanctuaire',wall:['#555875','#2c2e40'],edge:['#8287ad','#41445e'],floor:['#353e54','#1f2537'],detail:['#667291','#39435f'],motif:'rune'},
 fungal:{name:'Grottes fongiques',wall:['#51694c','#25382b'],edge:['#95a96b','#3c563d'],floor:['#334539','#1c2b21'],detail:['#739859','#3a5338'],motif:'fungus'},
 frozen:{name:'Cavernes gelées',wall:['#52768a','#283e52'],edge:['#a2d1df','#466678'],floor:['#354e60','#20313f'],detail:['#719bae','#3b586c'],motif:'ice'},
 abyss:{name:'Failles abyssales',wall:['#57485f','#2b2438'],edge:['#9873a5','#503b61'],floor:['#352b45','#1c192b'],detail:['#80648f','#43304e'],motif:'void'}
};
function currentBiome(){return BIOMES[S?.dungeon?.biome]||BIOMES.crypt}
function drawTerrain(t,px,py,visible){
  if(!t)return;
  if(t.type==='water'){ctx.fillStyle=visible?'#315e75':'#263d48';ctx.fillRect(px+1,py+1,14,14);ctx.fillStyle=visible?'#75a9ba':'#416270';ctx.fillRect(px+3,py+5,9,1);ctx.fillRect(px+6,py+11,7,1)}
  if(t.type==='rubble'){ctx.fillStyle=visible?'#9a896b':'#544d3d';ctx.fillRect(px+2,py+7,5,5);ctx.fillRect(px+9,py+4,4,4);ctx.fillRect(px+8,py+12,3,2)}
  if(t.type==='ember'){ctx.fillStyle=visible?'#a7432d':'#5d322c';ctx.fillRect(px+2,py+2,12,12);ctx.fillStyle=visible?'#f4ac58':'#895637';ctx.fillRect(px+5,py+4,2,7);ctx.fillRect(px+9,py+7,3,5)}
  if(t.type==='spores'){ctx.fillStyle=visible?'#79964c':'#425738';ctx.fillRect(px+2,py+3,12,10);ctx.fillStyle=visible?'#c1cc76':'#65774b';for(const [x,y] of [[4,5],[10,4],[7,10]])ctx.fillRect(px+x,py+y,3,3)}
  if(t.type==='ice'){ctx.fillStyle=visible?'#91c4df':'#446b85';ctx.fillRect(px+1,py+1,14,14);ctx.fillStyle=visible?'#e1f2fa':'#7195ab';ctx.fillRect(px+3,py+5,10,1);ctx.fillRect(px+6,py+9,8,1)}
  if(t.type==='void'){ctx.fillStyle=visible?'#362341':'#251d31';ctx.fillRect(px+1,py+1,14,14);ctx.fillStyle=visible?'#bf8fe2':'#664c80';ctx.fillRect(px+7,py+2,2,12);ctx.fillRect(px+4,py+6,8,2)}
  if(t.type==='font'){ctx.fillStyle=visible?'#a9adc4':'#5b6279';ctx.fillRect(px+3,py+3,10,10);ctx.fillStyle=t.spent?'#454755':visible?'#69d1bc':'#477e7a';ctx.fillRect(px+5,py+5,6,6)}
}
function enterTerrain(x,y){
  const t=terrain.find(t=>t.x===x&&t.y===y);if(!t)return;
  if(t.type==='water'){S.res=Math.max(0,S.res-2);say('Eau froide : -2 ressource.')}
  else if(t.type==='rubble'){S.guard=Math.max(0,S.guard-2);say('Décombres : garde réduite.')}
  else if(t.type==='ember'){S.hp=Math.max(0,S.hp-3);say('Braises : -3 PV.');if(S.hp===0)die()}
  else if(t.type==='spores'){S.hp=Math.max(0,S.hp-2);S.res=Math.max(0,S.res-1);say('Spores irritantes : -2 PV, -1 ressource.');if(S.hp===0)die()}
  else if(t.type==='ice'){S.guard=Math.max(0,S.guard-2);S.boost=Math.max(0,S.boost-2);say('Glace : garde et puissance réduites.')}
  else if(t.type==='void'){S.res=Math.max(0,S.res-3);S.shield=Math.max(0,S.shield-2);say('Faille : -3 ressource, -2 protection.')}
  else if(t.type==='font'&&!t.spent&&S.hp<S.maxHp){const gain=Math.min(5,S.maxHp-S.hp);S.hp+=gain;t.spent=true;say('Fontaine : +'+gain+' PV.')}
}