'use strict';
// TECH-014 — Coordination et validation de transferts, contrats de portage.
// Extraction fidèle de la référence : aucun DOM, aucun stockage, aucun RNG.
// Les identités d'objets et l'ordre de parcours doivent rester stables en Godot.
const {dist}=require('./simulation-contract.cjs');
function tactics(catalogs){
 const {AI_FAMILY,BOSS_PHASE_PATTERN}=catalogs;
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

 return {aiFamily,aiLine,aiNeighbors,aiSame,aiThreatCells,aiEscapeCells,prepareCoordinatedIntent,coordinatedAction};
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
