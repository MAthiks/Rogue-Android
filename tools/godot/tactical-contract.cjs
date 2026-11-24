'use strict';
// TECH-014 — Coordination et validation de transferts, contrats de portage.
// Extraction fidèle de la référence : aucun DOM, aucun stockage, aucun RNG.
// Les identités d'objets et l'ordre de parcours doivent rester stables en Godot.
const {dist}=require('./simulation-contract.cjs');
function tactics(catalogs){
 const {AI_FAMILY,BOSS_PHASE_PATTERN,CREATURE_POWERS,EXTENDED_BOSSES}=catalogs;
function bossAction(m,player,board){
  if(!m.boss)return null;
  const d=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),same=(a,b)=>a.x===b.x&&a.y===b.y;
  const ray=(a,b)=>{let n=d(a,b),prev=a;if(!n)return true;for(let i=1;i<=n;i++){const p={x:Math.round(a.x+(b.x-a.x)*i/n),y:Math.round(a.y+(b.y-a.y)*i/n)};if(!board.stepOK(p.x,p.y,prev.x,prev.y))return false;prev=p}return true};
  const changed=m.phase!==2&&m.hp*2<=m.maxHp;
  if(changed)m.phase=2;
  /* TECH-012C — La résolution utilise les cases annoncées au tour précédent, et vérifie encore la ligne d'attaque. */
  if(m.intent){
    const intent=m.intent;
    delete m.intent;
    m.specialCD=m.phase===2?2:3;
    return {type:'release',hit:intent.cells.some(p=>same(p,player))&&ray(m,player),power:intent.power,changed};
  }
  if(m.specialCD>0){m.specialCD--;return changed?{type:'phase'}:null}
  const range=m.boss==='stone'?2:m.boss==='ash'?3:4;
  if(d(m,player)>range||!ray(m,player))return changed?{type:'phase'}:null;
  const cells=[{x:player.x,y:player.y}];
  if(m.boss==='ash'||m.phase===2&&m.boss==='stone')for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const p={x:player.x+dx,y:player.y+dy};if(board.stepOK(p.x,p.y,player.x,player.y)&&ray(m,p)&&!same(m,p))cells.push(p)
  }
  m.intent={cells,power:m.phase===2?3:2};
  return {type:'announce',changed};
}
function tacticalTurn(m,player,all,board,contacts){
  const {W,H,stepOK}=board,dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),key=p=>p.y*W+p.x;
  const same=(a,b)=>a.x===b.x&&a.y===b.y;
  const role=m.role||(m.elite?'guardian':m.kind==='Brute'?'brute':'wanderer');
  const occupied=(x,y)=>all.some(a=>a!==m&&a.hp>0&&a.x===x&&a.y===y);
  const legal=(a,b)=>stepOK(b.x,b.y,a.x,a.y)&&!occupied(b.x,b.y)&&!same(b,player);
  const neighbors=a=>{
    const out=[];
    for(let dy=-1;dy<=1;dy++)
      for(let dx=-1;dx<=1;dx++)
        if(dx||dy){
          let b={x:a.x+dx,y:a.y+dy};
          if(legal(a,b))out.push(b)
        }
    return out
  };
  const line=(a,b,blockActors=false)=>{
    const n=dist(a,b);if(!n)return true;let prev=a;
    for(let i=1;i<=n;i++){const p={x:Math.round(a.x+(b.x-a.x)*i/n),y:Math.round(a.y+(b.y-a.y)*i/n)};
      if(!stepOK(p.x,p.y,prev.x,prev.y)||(blockActors&&i<n&&occupied(p.x,p.y)))return false;prev=p}
    return true;
  };
  /* TECH-012C — Perception limitée à huit cases et à une ligne praticable ; le traqueur peut bénéficier d'un contact allié. */
  const d=dist(m,player),sees=d<=8&&line(m,player);
  const alert=role==='tracker'&&contacts.some(a=>a!==m&&a.source!==m&&(a.source?.hp??a.hp)>0&&dist(m,a)<=4&&line(m,a));
  const wait={type:'wait'};
  /* TECH-012C — Un tir annoncé n'atteint que la position visée si elle est encore occupée et accessible. */
  if(role==='archer'&&m.aim){
    const aimed=m.aim;
    delete m.aim;
    return same(aimed,player)&&d<=5&&d>=2&&line(m,player,true)?{type:'attack',ranged:true}:wait
  }
  if(role==='ambusher'&&!m.awake){if(!(sees&&(d<=4||m.hp<m.maxHp)))return wait;m.awake=true}
  /* TECH-012C — La mémoire de poursuite dure cinq tours après une perception ou une alerte. */
  if(sees||alert){m.lastSeen={x:player.x,y:player.y};m.memory=5}
  else if(m.memory>0)m.memory--;
  if(!m.memory){delete m.lastSeen;delete m.memory}
  const retreat=()=>{const opts=neighbors(m).filter(p=>dist(p,player)>d).sort((a,b)=>dist(b,player)-dist(a,player));return opts.length?{type:'move',...opts[0]}:null};
  if(role==='coward'&&m.hp*3<=m.maxHp&&sees&&d<6){const r=retreat();if(r)return r}
  if(d===1&&stepOK(player.x,player.y,m.x,m.y)){if(role==='archer'){const r=retreat();if(r)return r}return {type:'attack',ranged:false}}
  if(role==='archer'&&sees&&d<=5){if(d<=2){const r=retreat();if(r)return r}if(line(m,player,true)){m.aim={x:player.x,y:player.y};return {type:'aim'}}}
  if(!m.lastSeen)return wait;
  const target=m.lastSeen;
  // Search the remembered neighborhood rather than trying to step into the player.
  if(!sees&&!alert&&dist(m,target)<=1){delete m.lastSeen;delete m.memory;return wait}
  let goals=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){
    const p={x:target.x+dx,y:target.y+dy};
    if(p.x>=0&&p.y>=0&&p.x<W&&p.y<H&&stepOK(p.x,p.y,target.x,target.y)&&!occupied(p.x,p.y)&&!same(p,player))goals.push(p);
  }
  const ally=role==='tracker'&&(sees||alert)&&all.find(a=>a!==m&&a.hp>0&&dist(a,target)===1);
  if(ally)goals.sort((a,b)=>dist(b,ally)-dist(a,ally));
  /* TECH-012C — Recherche en largeur vers les cases voisines de la cible mémorisée ; le rang départage les chemins de même longueur. */
  const goalRank=new Map(goals.map((p,i)=>[key(p),i])),visited=new Set([key(m)]),queue=[{x:m.x,y:m.y,depth:0,first:null}];
  let best=null;
  for(let i=0;i<queue.length;i++){const a=queue[i];if(best&&a.depth>best.depth)break;
    if(a.first&&goalRank.has(key(a))){if(!best||goalRank.get(key(a))<goalRank.get(key(best)))best=a;continue}
    /* TECH-012C — Borne de profondeur pour limiter le coût de la recherche de chemin. */
    if(a.depth>=24)continue;
    for(const b of neighbors(a)){const k=key(b);if(visited.has(k))continue;visited.add(k);queue.push({...b,depth:a.depth+1,first:a.first||b})}
  }
  return best?{type:'move',...best.first}:wait;
}
function creatureAction(m,player,all,board){
 if(!m.species||m.boss||!Object.hasOwn(CREATURE_POWERS,m.creatureSkill))return null;
 const skill=CREATURE_POWERS[m.creatureSkill],distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),same=(a,b)=>a.x===b.x&&a.y===b.y;
 const ray=(a,b)=>{const n=distance(a,b);let prev=a;for(let i=1;i<=n;i++){const p={x:Math.round(a.x+(b.x-a.x)*i/n),y:Math.round(a.y+(b.y-a.y)*i/n)};if(!board.stepOK(p.x,p.y,prev.x,prev.y)||(i<n&&all.some(z=>z!==m&&z.hp>0&&same(z,p))))return false;prev=p}return true};
 if(m.intent){const intent=m.intent;
   delete m.intent;
   m.creatureCD=skill.cd;
   return {type:'release',hit:distance(m,player)<=skill.range+Number(m.creatureSkill==='burst')&&intent.cells.some(p=>same(p,player))&&ray(m,player),power:skill.power,ranged:skill.ranged,drain:m.creatureSkill==='drain',name:skill.name}}
 if(m.creatureCD>0){m.creatureCD--;return null}
 if(distance(m,player)>skill.range||!ray(m,player))return null;
 const cells=[{x:player.x,y:player.y}];
 if(m.creatureSkill==='burst')for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const p={x:player.x+dx,y:player.y+dy};
   if(!same(m,p)&&board.stepOK(p.x,p.y,player.x,player.y)&&ray(m,p))cells.push(p);
 }
 if(m.role==='ambusher')m.awake=true;
 m.intent={cells,power:skill.power};return {type:'announce',name:skill.name};
}
function extendedBossAction(m,player,board,all=[]){
 const b=EXTENDED_BOSSES[m.boss];if(!Object.hasOwn(EXTENDED_BOSSES,m.boss))return null;
 const dist=(a,z)=>Math.max(Math.abs(a.x-z.x),Math.abs(a.y-z.y)),same=(a,z)=>a.x===z.x&&a.y===z.y;
 const ray=(a,z)=>{const n=dist(a,z);let prev=a;for(let i=1;i<=n;i++){const p={x:Math.round(a.x+(z.x-a.x)*i/n),y:Math.round(a.y+(z.y-a.y)*i/n)};if(!board.stepOK(p.x,p.y,prev.x,prev.y))return false;prev=p}return true};
 const phase=m.hp*3<=m.maxHp?3:m.hp*3<=2*m.maxHp?2:1;
 const changed=phase>(m.phase||1);m.phase=Math.max(m.phase||1,phase);
 const cd=m.phase===1?3:2;
 if(m.intent){const intent=m.intent;delete m.intent;m.specialCD=cd;return {type:'release',hit:intent.cells.some(p=>same(p,player))&&ray(m,player),power:intent.power,drain:!!b.drain,changed}}
 if(m.specialCD>0){m.specialCD--;return changed?{type:'phase',changed}:null}
 if(dist(m,player)>b.range||!ray(m,player))return changed?{type:'phase',changed}:null;
 const dx=Math.sign(player.x-m.x),dy=Math.sign(player.y-m.y);
 const offsets=b.pattern==='wall'?(Math.abs(player.x-m.x)>=Math.abs(player.y-m.y)?[[0,-1],[0,1]]:[[-1,0],[1,0]]):
 b.pattern==='diagonal'?[[-1,-1],[1,1],[-1,1],[1,-1]]:
 b.pattern==='beam'?[[-dx,-dy],[dx,dy]]:
 b.pattern==='cross'?[[1,0],[-1,0],[0,1],[0,-1]]:
 [[-dy,dx],[dy,-dx],[dx,dy]];
 const cells=[{x:player.x,y:player.y}];
 const add=(ox,oy)=>{const p={x:player.x+ox,y:player.y+oy};if(!same(p,m)&&!cells.some(z=>same(z,p))&&board.stepOK(p.x,p.y,player.x,player.y)&&ray(m,p))cells.push(p)};
 // Phase one uses two peripheral cells at most, later phases extend the pattern.
 for(const [ox,oy] of offsets.slice(0,m.phase===1?2:offsets.length))add(ox,oy);
 if(m.phase===3&&b.pattern==='beam'){add(-dy,dx);add(dy,-dx)}
 const escapes=[];
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(x||y){
   const p={x:player.x+x,y:player.y+y};
   if(board.stepOK(p.x,p.y,player.x,player.y)&&!same(p,m)&&!all.some(z=>z.hp>0&&same(p,z)))escapes.push(p);
 }
 if(!escapes.length)return changed?{type:'phase',changed}:null;
 if(!escapes.some(p=>!cells.some(z=>same(z,p)))){
   const safe=escapes[0],i=cells.findIndex(p=>same(p,safe));if(i>0)cells.splice(i,1);
 }
 m.intent={cells,power:m.phase+1};
 return {type:'announce',changed};
}
function aiFamily(m){
  return Object.hasOwn(AI_FAMILY,m.species)?AI_FAMILY[m.species]:Object.hasOwn(AI_FAMILY,m.role)?AI_FAMILY[m.role]:'pressure'
}
function aiLine(a,b,board,all=[],ignore=null){
 const n=dist(a,b);let prev=a;
 for(let i=1;i<=n;i++){const p={x:Math.round(a.x+(b.x-a.x)*i/n),y:Math.round(a.y+(b.y-a.y)*i/n)};
  if(!board.stepOK(p.x,p.y,prev.x,prev.y)||(i<n&&all.some(z=>z!==ignore&&z.hp>0&&z.x===p.x&&z.y===p.y)))return false;prev=p}
 return true;
}
function aiNeighbors(p,board){
 const out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&board.stepOK(p.x+dx,p.y+dy,p.x,p.y))out.push({x:p.x+dx,y:p.y+dy});return out;
}
function aiSame(a,b){return a.x===b.x&&a.y===b.y}
/* TECH-012C — Recense les cases menacées par les intentions et visées des ennemis actifs. */
function aiThreatCells(all,skip=null){
 return all.filter(m=>m!==skip&&m.hp>0&&!m.stun).flatMap(m=>m.intent?.cells|| (m.aim?[m.aim]:[]));
}
/* TECH-012C — Simule les cases de fuite libres, éventuellement après un déplacement ennemi hypothétique. */
function aiEscapeCells(player,all,board,extra=[],moving=null,dest=null){
 const threats=[...aiThreatCells(all),...extra];
 return aiNeighbors(player,board).filter(p=>!all.some(m=>m.hp>0&&aiSame(m===moving?dest:m,p))&&!threats.some(t=>aiSame(t,p)));
}
/* TECH-012C — Vérifie les intentions d'attaque annoncées et les possibilités de fuite restantes avant d'adapter la zone menacée. */
function prepareCoordinatedIntent(m,player,all,board){
 if(!m.intent)return true;
 const intent=m.intent,prior=intent.cells.slice(),others=aiThreatCells(all,m);
 const escape=aiNeighbors(player,board).filter(p=>!all.some(z=>z.hp>0&&aiSame(z,p))&&!others.some(t=>aiSame(t,p)));
 if(!escape.length){delete m.intent;return false}
 const cells=prior.slice();
 // A late-phase boss gains a distinctive extension, but never seals every escape.
 if(m.boss&&(m.phase||1)>=2)for(const [dx,dy] of BOSS_PHASE_PATTERN[m.boss]||[]){
  const p={x:player.x+dx,y:player.y+dy};
  if(!aiSame(m,p)&&!cells.some(c=>aiSame(c,p))&&aiLine(player,p,board)&&aiLine(m,p,board))cells.push(p);
 }
 if(!escape.some(p=>!cells.some(c=>aiSame(c,p)))){
  const safe=escape[0];for(let i=cells.length-1;i>=0;i--)if(aiSame(cells[i],safe))cells.splice(i,1);
 }
 intent.cells=cells;return true;
}
/* TECH-012C — Ajuste les déplacements tactiques en fonction des menaces coordonnées. La formation ne doit pas servir à suivre un joueur caché ni fermer sa dernière issue sûre. */
function coordinatedAction(m,player,all,board,contacts,base){
 if(m.stun||base.type!=='move')return base;
 const d=dist(m,player),family=aiFamily(m),visible=d<=8&&aiLine(m,player,board);
 const threats=aiThreatCells(all),safeBefore=threats.length?aiEscapeCells(player,all,board):[];
 const legal=p=>!safeBefore.length||aiEscapeCells(player,all,board,[],m,p).length>0;
 // Never pursue a hidden player via the formation layer; only veto a move that seals the last exit.
 if(!visible)return legal(base)?base:{type:'wait'};
 const allies=all.filter(a=>a!==m&&a.hp>0&&!a.stun&&dist(m,a)<=4&&aiLine(m,a,board));
 const occupied=p=>all.some(a=>a!==m&&a.hp>0&&aiSame(a,p))||aiSame(p,player);
 const opts=aiNeighbors(m,board).filter(p=>!occupied(p));
 const candidates=opts.filter(legal);
 if(!legal(base))return candidates.length?{type:'move',...candidates.sort((a,b)=>dist(a,player)-dist(b,player))[0]}:{type:'wait'};
 if(m.boss||!allies.length)return base;
 if(family==='ranged'&&d>=2&&d<=6&&!aiLine(m,player,board,all,m)){
  const lane=candidates.filter(p=>dist(p,player)>=2&&dist(p,player)<=5&&aiLine(p,player,board,all,m)).sort((a,b)=>Math.abs(dist(a,player)-4)-Math.abs(dist(b,player)-4));
  if(lane.length)return {type:'move',...lane[0]};
 }
 if(family==='flank'){
  const front=allies.find(a=>dist(a,player)===1);
  if(front){
   const flank=candidates.filter(p=>dist(p,player)<=dist(base,player)&&dist(p,front)>dist(base,front)).sort((a,b)=>dist(b,front)-dist(a,front)||dist(a,player)-dist(b,player));
   if(flank.length)return {type:'move',...flank[0]};
  }
 }
 if(family==='escort'&&d>2){
  const leader=allies.find(a=>a.boss||aiFamily(a)==='ranged');
  if(leader&&dist(m,leader)<=2){
   const lanes=candidates.filter(p=>dist(p,leader)<=2&&dist(p,player)<=dist(base,player)&&aiLine(leader,player,board,[{...p,hp:1}]));
   if(lanes.length&&!aiLine(leader,player,board,[{x:base.x,y:base.y,hp:1}]))return {type:'move',...lanes[0]};
  }
 }
 if(family==='retreat'&&m.hp*3<=m.maxHp){
  const cover=candidates.filter(p=>dist(p,player)>=d&&!aiLine(p,player,board)).sort((a,b)=>dist(b,player)-dist(a,player));
  if(cover.length)return {type:'move',...cover[0]};
 }
 return base;
}

 return {bossAction,tacticalTurn,creatureAction,extendedBossAction,aiFamily,aiLine,aiNeighbors,aiSame,aiThreatCells,aiEscapeCells,prepareCoordinatedIntent,coordinatedAction};
}
// Validation du transfert historique seulement ; aucune écriture ni restauration.
// Le JSON est décodé dans le même contexte que le validateur.
function transfer(catalogs,width=48,height=32){
 const {CLASSES,BIOMES}=catalogs,W=width,H=height,HISTORY_LIMIT=50;
const TRANSFER_LIMIT=524288,TRANSFER_FORMAT='cryptgrave-transfer-v1';
const transferObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const transferInt=(v,min=0,max=1000000000)=>Number.isInteger(v)&&v>=min&&v<=max;
function transferAssert(ok){if(!ok)throw Error('Sauvegarde incompatible ou invalide.')}
/* TECH-012C — Contrôle récursivement les types, la profondeur, le nombre de valeurs, les longueurs et les noms de propriétés avant la validation métier. */
function transferTree(v,depth=0,budget={n:0}){
 transferAssert(depth<=16&&++budget.n<=40000);
 if(v===null||typeof v==='boolean')return;
 if(typeof v==='number'){transferAssert(Number.isFinite(v)&&Math.abs(v)<=4294967296);return}
 if(typeof v==='string'){transferAssert(v.length<=256&&!/[<>&"`\\\u0000-\u001f]/.test(v));return}
 if(Array.isArray(v)){transferAssert(v.length<=4096);for(const x of v)transferTree(x,depth+1,budget);return}
 transferAssert(transferObject(v));
 const keys=Object.keys(v);
 transferAssert(keys.length<=128);
 for(const k of keys){transferAssert(/^[a-zA-Z0-9_-]{1,80}$/.test(k)&&!['__proto__','prototype','constructor'].includes(k));transferTree(v[k],depth+1,budget)}
}
/* TECH-012C — Vérifie qu'une position possède des coordonnées entières dans les limites de la grille. */
function transferPoint(p){return transferObject(p)&&transferInt(p.x,0,W-1)&&transferInt(p.y,0,H-1)}
/* TECH-012C — Contrôle les champs de base d'un équipement importé et ses statistiques numériques éventuelles. */
function transferGear(it){
 transferAssert(transferObject(it)&&transferInt(it.id,1)&&['weapon','armor','helmet','boots','ring'].includes(it.slot)&&typeof it.name==='string');
 for(const k of ['atk','def','crit','regen','dodge','itemLevel','rarity'])if(it[k]!==undefined)transferAssert(transferInt(it[k],0,1000000));
}
/* TECH-012C — Contrôle la structure d'une partie importée : personnage vivant, progression, inventaire, dimensions, positions et entités. */
function validateTransferRun(d){
 if(d===null)return;
 transferAssert(transferObject(d)&&transferObject(d.S));const s=d.S;
 transferAssert(Object.hasOwn(CLASSES,s.classId)&&s.dead===false&&!s.ended&&transferPoint(s)&&transferPoint(d.stairs));
 transferAssert(transferInt(s.floor,1,30)&&transferInt(s.level,1,30)&&transferInt(s.hp,1)&&transferInt(s.maxHp,1)&&s.hp<=s.maxHp&&transferInt(s.res)&&transferInt(s.maxRes,1)&&s.res<=s.maxRes);
 for(const k of ['turn','xp','points','bandages','atk','armor','guard','boost','kills','serial','ap'])transferAssert(transferInt(s[k]));
 for(const [k,n,min,max] of [['attrs',6,0,100000],['cool',5,0,100000],['ranks',5,1,100000],['bar',3,0,4]])transferAssert(Array.isArray(s[k])&&s[k].length===n&&s[k].every(v=>transferInt(v,min,max)));
 transferAssert(new Set(s.bar).size===3&&s.bar.every(i=>i<3||s.activeTalents?.[i])&&transferObject(s.nodes)&&transferObject(s.activeTalents)&&[null,'offense','defense'].includes(s.spec));
 transferAssert(Array.isArray(s.bag)&&s.bag.length<=24&&transferObject(s.equip));for(const it of s.bag)transferGear(it);
 for(const slot of ['weapon','armor','helmet','boots','ring']){const it=s.equip[slot];if(it!==null){transferGear(it);transferAssert(it.slot===slot)}}
 for(const k of ['map','seen'])transferAssert(Array.isArray(d[k])&&d[k].length===W*H&&d[k].every(v=>v===0||v===1));
 transferAssert(d.map[s.y*W+s.x]===0&&d.map[d.stairs.y*W+d.stairs.x]===0);
 for(const k of ['monsters','loot','features','terrain'])transferAssert(Array.isArray(d[k])&&d[k].length<=W*H&&d[k].every(transferPoint));
 for(const m of d.monsters)transferAssert(transferInt(m.hp,1)&&transferInt(m.maxHp,1)&&m.hp<=m.maxHp&&transferInt(m.atk)&&typeof m.kind==='string'&&typeof m.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(m.color)&&typeof m.role==='string');
 for(const l of d.loot){transferAssert(['gear','bandage','consumable'].includes(l.kind));if(l.kind==='gear')transferGear(l.item)}
 for(const p of [...d.features,...d.terrain])transferAssert(typeof p.type==='string');
 if(s.dungeon!==undefined)transferAssert(transferObject(s.dungeon)&&Object.hasOwn(BIOMES,s.dungeon.biome));
}
/* TECH-012C — Contrôle le format de l'historique importé, les compteurs, les classes, les résultats et les défis. */
function validateTransferHistory(h){
 if(h===null)return;
 transferAssert(transferObject(h)&&h.version===1&&Array.isArray(h.runs)&&h.runs.length<=HISTORY_LIMIT&&transferObject(h.classWins)&&Array.isArray(h.challenges)&&h.challenges.length<=4);
 for(const k of ['total','wins','deaths','abandoned','bestScore','bestFloor','bestKills'])transferAssert(transferInt(h[k]));
 transferAssert(h.fastestWin===null||transferInt(h.fastestWin));for(const k of Object.keys(CLASSES))transferAssert(transferInt(h.classWins[k]));
 transferAssert(h.challenges.every(k=>['first-win','swift','collector','all-classes'].includes(k)));
 for(const r of h.runs){transferAssert(transferObject(r)&&Object.hasOwn(CLASSES,r.classId)&&['victory','death','abandoned'].includes(r.outcome)&&[null,'offense','defense'].includes(r.spec));for(const k of ['floor','level','kills','turns','gold','relics','score'])transferAssert(transferInt(r[k]))}
}
/* TECH-012A — Valide le format, la structure et les préférences d'un paquet de transfert avant son utilisation. Une donnée invalide provoque une erreur plutôt qu'une restauration partielle. */
function parseTransfer(text){
 transferAssert(typeof text==='string'&&text.length>0&&text.length<=TRANSFER_LIMIT);
 const b=JSON.parse(text);
 transferTree(b);
 transferAssert(transferObject(b)&&b.format===TRANSFER_FORMAT&&Object.keys(b).length===4);
 validateTransferRun(b.run);
 validateTransferHistory(b.history);
 transferAssert(transferObject(b.prefs)&&Object.keys(b.prefs).length===2&&[75,100,125,150,200].includes(b.prefs.zoom)&&[85,100,115].includes(b.prefs.pad));return b;
}

 return {parseTransfer,validateTransferRun,validateTransferHistory};
}
module.exports={tactics,transfer};
