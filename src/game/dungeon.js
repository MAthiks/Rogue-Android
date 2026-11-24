/* TECH-012A — Construit un donjon à partir de ses dimensions, de sa profondeur et d'une graine. Le flux pseudo-aléatoire local sépare cette génération des tirages du combat. */
function buildDungeon(W,H,floor,seed){
  // Local deterministic PRNG: combat RNG remains independent.
  let state=seed>>>0;
  const rand=n=>{
    state=(state+0x6D2B79F5)>>>0;
    let t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return Math.floor(((t^(t>>>14))>>>0)/4294967296*n)
  };
  /* TECH-012C — Trois profils définissent le nombre, les dimensions des salles et le nombre de raccourcis recherchés. */
  const profiles=[{id:'chambres',target:11,w:5,h:4,dw:5,dh:4,loops:3},{id:'galeries',target:12,w:4,h:4,dw:8,dh:3,loops:4},{id:'halles',target:8,w:7,h:5,dw:5,dh:5,loops:2}];
  const p=profiles[rand(profiles.length)], map=Array(W*H).fill(1),rooms=[];
  /* TECH-012C — Le creusement conserve une bordure extérieure de murs infranchissables. */
  const index=(x,y)=>y*W+x, carve=(x,y)=>{if(x>0&&y>0&&x<W-1&&y<H-1)map[index(x,y)]=0};
  const add=(x,y,w,h,shape)=>{
    const r={x,y,w,h,cx:x+(w>>1),cy:y+(h>>1),shape};
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      if(shape==='chamfer'&&(xx===x||xx===x+w-1)&&(yy===y||yy===y+h-1))continue;
      carve(xx,yy);
    }
    rooms.push(r);
  };
  /* TECH-012C — Le placement est borné à 360 essais ; une marge sépare les salles pour limiter les chevauchements. */
  for(let n=0;n<360&&rooms.length<p.target;n++){
    const w=p.w+rand(p.dw),h=p.h+rand(p.dh),x=1+rand(W-w-1),y=1+rand(H-h-1);
    if(rooms.some(r=>x<r.x+r.w+1&&x+w+1>r.x&&y<r.y+r.h+1&&y+h+1>r.y))continue;
    add(x,y,w,h,w>=5&&h>=5&&rand(3)===0?'chamfer':'rect');
  }
  // Finite, connected fallback for the supported 48x32 board.
  if(rooms.length<6){
    map.fill(1);rooms.length=0;
    for(const y of [3,19])for(const x of [3,18,34])add(x,y,8,7,'rect');
  }
  const center=r=>({x:r.cx,y:r.cy}),edges=[];
  for(let a=0;a<rooms.length;a++)for(let b=a+1;b<rooms.length;b++)
    edges.push({a,b,d:Math.abs(rooms[a].cx-rooms[b].cx)+Math.abs(rooms[a].cy-rooms[b].cy),tie:rand(10000)});
  edges.sort((a,b)=>a.d-b.d||a.tie-b.tie);
  /* TECH-012C — Structure union-find : relie les composantes sans cycle lors de la construction de l'arbre couvrant minimal. */
  const parent=rooms.map((_,i)=>i),root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
  const tree=[],extra=[];
  const corridor=e=>{
    const a=center(rooms[e.a]),b=center(rooms[e.b]);
    if(rand(2)){for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)carve(x,a.y);for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)carve(b.x,y)}
    else{for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)carve(a.x,y);for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)carve(x,b.y)}
  };
  /* TECH-012C — L'algorithme de Kruskal sélectionne d'abord les liaisons les plus courtes ; les arêtes restantes servent aux raccourcis. */
  for(const e of edges){
    const a=root(e.a),b=root(e.b);
    if(a===b){
      extra.push(e);
      continue
    }
    parent[a]=b;
    tree.push(e);
    corridor(e)
  }
  let shortcuts=0;
  // Only count added links that actually open at least one new cell.
  for(const e of extra){
    if(shortcuts>=p.loops)break;
    const before=map.reduce((n,v)=>n+(v===0),0);
    corridor(e);
    if(map.reduce((n,v)=>n+(v===0),0)>before)shortcuts++
  }
  /* TECH-012C — Le point de départ est choisi dans une salle feuille de l'arbre. */
  const degree=rooms.map(()=>0);for(const e of tree){degree[e.a]++;degree[e.b]++}
  const leaves=rooms.map((_,i)=>i).filter(i=>degree[i]===1),startRoom=leaves[rand(leaves.length)],start=center(rooms[startRoom]);
  /* TECH-012C — Parcours en largeur orthogonal : mesure la distance réelle dans les couloirs et vérifie la connexité du plan. */
  const distance=Array(W*H).fill(-1),queue=[index(start.x,start.y)];distance[queue[0]]=0;
  for(let i=0;i<queue.length;i++){
    const k=queue[i],x=k%W,y=Math.floor(k/W);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;
      const next=index(nx,ny);if(map[next]===0&&distance[next]<0){distance[next]=distance[k]+1;queue.push(next)}
    }
  }
  if(queue.length!==map.filter(v=>v===0).length)throw new Error('Disconnected dungeon');
  /* TECH-012C — Les escaliers occupent le centre de la salle la plus éloignée du départ selon la distance parcourable. */
  const exitRoom=rooms.reduce((best,r,i)=>distance[index(r.cx,r.cy)]>distance[index(rooms[best].cx,rooms[best].cy)]?i:best,startRoom);
  const stairs=center(rooms[exitRoom]),occupied=new Set([index(start.x,start.y),index(stairs.x,stairs.y)]),monsters=[],loot=[];
  /* TECH-012C — Les ennemis initiaux sont placés à plus de huit cases du départ, en distance de Chebyshev. */
  const safe=(x,y)=>Math.max(Math.abs(x-start.x),Math.abs(y-start.y))>8;
  /* TECH-012C — Choisit une case libre d'une salle et la réserve afin d'éviter les superpositions. */
  const pick=(r,enemy)=>{
    const candidates=[];
    for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
      const k=index(x,y);if(map[k]===0&&!occupied.has(k)&&(!enemy||safe(x,y)))candidates.push({x,y});
    }
    if(!candidates.length)return null;
    const pos=candidates[rand(candidates.length)];occupied.add(index(pos.x,pos.y));return pos;
  };
  /* TECH-012C — Détermine le rôle, les PV et l'attaque de base de l'ennemi selon la profondeur et le tirage. */
  const spawn=(pos,elite)=>{
    const roll=rand(100),role=elite?'guardian':roll<24?'brute':roll<49||floor===1?'wanderer':roll<69?'archer':roll<82?'ambusher':floor<3?'wanderer':roll<91?'coward':'tracker';
    const types={guardian:['Gardien','#e6ad65',16+floor*2,5],
      brute:['Brute','#c87961',8+floor,3],
      wanderer:['Errant','#bd777d',4+Math.floor(floor/2),2],
      archer:['Archer','#91ab6e',4+Math.floor(floor/2),2],
      ambusher:['Guetteur','#9282bb',5+Math.floor(floor/2),2],
      coward:['Fuyard','#c0b58a',5+Math.floor(floor/2),2],
      tracker:['Traqueur','#75b0b7',6+Math.floor(floor/2),2]};
    const [kind,color,hp,atk]=types[role];
    monsters.push({...pos,hp,maxHp:hp,atk,kind,elite,color,role});
  };
  if(floor%3===0){
    let pos=pick(rooms[exitRoom],true);
    if(!pos){for(const r of [...rooms].sort((a,b)=>distance[index(b.cx,b.cy)]-distance[index(a.cx,a.cy)])){pos=pick(r,true);if(pos)break}}
    if(pos)spawn(pos,true);
  }
  for(let i=0;i<rooms.length;i++){
    if(i===startRoom)continue;
    const r=rooms[i],count=1+(rand(3)===0?1:0);
    for(let j=0;j<count;j++){if(i===exitRoom&&floor%3===0&&j===0)continue;const pos=pick(r,true);if(pos)spawn(pos,false)}
    if(rand(3)===0){const pos=pick(r,false);if(pos)loot.push({...pos,kind:rand(3)===0?'gear':'bandage'})}
  }
  return {map,start,stairs,monsters,loot,rooms,seed:seed>>>0,profile:p.id,shortcuts};
}