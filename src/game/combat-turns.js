function promoteEnemies(monsters,floor,seed,stairs){
  // Independent deterministic stream; no changes to layouts or original spawns.
  let n=(seed^0x9e3779b9)>>>0;const rnd=k=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return Math.floor(n/4294967296*k)};
  const out=monsters.map(m=>({...m}));
  const guardian=out.find(m=>m.role==='guardian'&&m.elite);
  if(guardian&&floor%6===0){
    const types=[['stone','Kharok, le Briseur','#d9a36d','Frappe tellurique'],['ash','Syrha, la Cendre','#da826e','Croix de cendres'],['veil','Veyl, le Sans-Visage','#b49add','Marque du vide']];
    const [boss,kind,color,ability]=types[(Math.floor(floor/6)-1)%types.length];
    Object.assign(guardian,{boss,kind,color,ability,phase:1,specialCD:0,maxHp:24+floor*2,hp:24+floor*2,atk:4+Math.min(4,Math.floor(floor/6))});
  }
  if(floor>=4){
    const pool=out.filter(m=>!m.elite).sort((a,b)=>Math.max(Math.abs(b.x-stairs.x),Math.abs(b.y-stairs.y))-Math.max(Math.abs(a.x-stairs.x),Math.abs(a.y-stairs.y)));
    const count=Math.min(pool.length,floor>=12?2:1);
    for(let i=0;i<count;i++){
      const m=pool.splice(rnd(pool.length),1)[0],affix=['armored','furious','vampiric'][rnd(3)];
      m.elite=true;m.affix=affix;m.maxHp=Math.ceil(m.maxHp*1.45)+2;m.hp=m.maxHp;
      m.kind+=({armored:' cuirassé',furious:' furieux',vampiric:' vampirique'})[affix];
    }
  }
  return out;
}
/* TECH-012C — Gère les attaques spéciales des boss historiques : annonce, résolution, recharge et changement de phase à mi-vie. */
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
function bossReward(m){
  const slot=m.boss==='stone'?'armor':m.boss==='ash'?'weapon':'ring';
  return {id:++S.serial,slot,name:({stone:'Cuirasse de Kharok',ash:'Lame de Syrha',veil:'Anneau de Veyl'})[m.boss],atk:slot==='weapon'?4:slot==='ring'?2:0,def:slot==='armor'?4:0,crit:slot==='ring'?6:0,regen:slot==='ring'?1:0,bossRelic:true,rarity:5,itemLevel:Math.max(1,Math.min(30,S.floor)),uniqueId:'boss-'+m.boss,...(slot==='weapon'?{family:'blade'}:{})};
}
function eliteReward(){return item(2)}
/* TECH-012C — Retire un ennemi vaincu, attribue or et expérience, puis distribue le butin selon son type et les tirages aléatoires. */
function kill(m){
  if(!monsters.includes(m))return;
  monsters=monsters.filter(x=>x!==m);
  S.gold=Math.min(GOLD_CAP,goldBalance()+goldReward(m,S.floor));
  S.kills++;
  gainXP(enemyXP(m,S.floor));
  if(m.boss)
    loot.unshift({x:m.x,y:m.y,kind:'gear',item:Object.hasOwn(EXTENDED_BOSSES,m.boss)?extendedBossReward(m):bossReward(m)});
  else if(m.rare){
    loot.push({x:m.x,y:m.y,kind:'gear',item:createGear(++S.serial,S.floor,4)},
              {x:m.x,y:m.y,kind:'consumable',consumable:rollConsumable(S.floor)})
  }else if(m.affix)
    loot.push({x:m.x,y:m.y,kind:'gear',item:eliteReward()});
  else if(rand(5)===0){
    const gear=rand(3)===0;
    loot.push({x:m.x,y:m.y,kind:gear?'gear':'bandage',...(gear?{item:item()}: {})})
  }
  if(!m.boss&&!m.affix&&rand(12)===0)
    loot.push({x:m.x,y:m.y,kind:'consumable',consumable:rollConsumable(S.floor)});
  say(m.kind+' vaincu !')
}
/* TECH-012A — Résout l'attaque du joueur contre un ennemi : critique, dégâts, effets de talent, retour visuel et traitement de la mort si les PV tombent à zéro. */
function hit(m,damage,profile=null){
  const critical=rand(100)<criticalChance(profile),
        d=outgoingDamage(m,damage,profile,critical);
  if(critical&&talentBonus('bleed'))
    m.bleed=Math.max(m.bleed||0,talentBonus('bleed'));
  m.hp-=d;
  S.boost=0;
  if(los(m.x,m.y))combatFx(critical?'critical':'hit',d);
  say(m.kind+' : -'+d+' PV');
  if(m.hp<=0)kill(m)
}
/* TECH-012A — Évalue les actions tactiques d'un ennemi à partir de son rôle, de la carte et des acteurs. Les déplacements candidats doivent respecter les obstacles et l'occupation des cases. */
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
/* TECH-012C — Résout une attaque ennemie : disparition, esquive, réduction, absorption par le bouclier, dégâts réels, drain et mort éventuelle. */
function enemyAttack(m,ranged,power=0,drain=false){
  if(S.veil>0){S.veil=0;say('Attaque évitée par Disparition.');return}
  if(rand(100)<dodgeChance()){say('Attaque esquivée.');return}
  let dmg=incomingDamage(m,power,rand(2));
  /* TECH-012C — Le bouclier absorbe les dégâts après la réduction défensive. */
  if(S.shield>0){let absorbed=Math.min(dmg,S.shield);S.shield-=absorbed;dmg-=absorbed}
  const actual=Math.min(S.hp,dmg);
  S.hp=Math.max(0,S.hp-dmg);
  combatFx(actual>0?'hurt':'guard',actual>0?actual:undefined);
  if(m.affix==='vampiric'&&actual>0)m.hp=Math.min(m.maxHp,m.hp+Math.min(2,actual));
  say(m.kind+(ranged?(m.species?' lance un projectile : -':' te décoche une flèche : -'):' te frappe : -')+dmg+' PV');
  if(drain&&actual>0){
    const n=Math.min(2,S.res);
    S.res-=n;
    say('Drain : -'+n+' ressources.')
  }
  if(S.hp===0)die();
}
// GAME-010C: coordination uses live positions and existing intent fields only.
const AI_FAMILY={
 wanderer:'pressure',brute:'pressure',archer:'ranged',ambusher:'flank',coward:'retreat',tracker:'flank',guardian:'escort',
 boneguard:'escort',wraith:'flank',cavefang:'flank',spitter:'ranged',sentinel:'escort',runecaster:'ranged',
 slag:'pressure',cinder:'flank',templar:'escort',oracle:'ranged',mycelium:'pressure',sporeling:'retreat',
 frostfang:'flank',icecaller:'ranged',voidstalker:'flank',riftspawn:'pressure'
};
const BOSS_PHASE_PATTERN={
 stone:[[2,0],[-2,0],[0,2],[0,-2]],ash:[[1,1],[-1,-1]],veil:[[1,0],[-1,0],[0,1],[0,-1]],
 ossuary:[[1,-1],[-1,1]],mire:[[0,1],[0,-1]],runes:[[2,0],[-2,0]],
 frost:[[1,1],[-1,-1],[1,-1],[-1,1]],abyssal:[[2,2],[-2,-2],[1,-1],[-1,1]]
};
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
/* TECH-012A — Joue la phase des ennemis après une action du joueur. Traite les états temporaires et interrompt la boucle si le personnage meurt. */
function enemyPhase(){
  /* TECH-012C — Les contacts sont relevés au début de la phase ennemie pour alimenter la coordination. */
  const contacts=monsters.filter(m=>{
    if(m.hp<=0||m.stun>0||dist(m,S)>8)return false;
    const n=dist(m,S);let prev=m;
    for(let i=1;i<=n;i++){const p={x:Math.round(m.x+(S.x-m.x)*i/n),y:Math.round(m.y+(S.y-m.y)*i/n)};if(!stepOK(p.x,p.y,prev.x,prev.y))return false;prev=p}
    return true;
  }).map(m=>({x:m.x,y:m.y,source:m}));
  /* TECH-012C — Parcourt une copie de la liste : les effets de saignement peuvent retirer un ennemi pendant la phase. */
  for(const m of [...monsters]){
    if(S.dead)break;
    if(m.bleed>0){
      m.bleed--;
      m.hp-=2;
      say(m.kind+' saigne : -2 PV');
      if(m.hp<=0){
        kill(m);
        continue
      }
    }
    if(m.exposed>0)m.exposed--;
    if(m.stun>0){
      m.stun--;
      delete m.aim;
      delete m.intent;
      continue
    }
    const enemyStep=(x,y,fx,fy)=>stepOK(x,y,fx,fy)&&featureAt(x,y)?.type!=='merchant'&&(!(x===stairs.x&&y===stairs.y)||(x===S.x&&y===S.y));
    /* TECH-012C — Priorité aux actions spéciales des boss, puis aux capacités de créatures et enfin à la tactique ordinaire. */
    const special=Object.hasOwn(EXTENDED_BOSSES,m.boss)?extendedBossAction(m,S,{W,H,stepOK},monsters):bossAction(m,S,{W,H,stepOK});
    if(special){
      if(special.changed)say(m.kind+' entre en phase '+m.phase+' !');
      if(special.type==='announce'){
        if(prepareCoordinatedIntent(m,S,monsters,{W,H,stepOK:enemyStep})){
          say(m.kind+' prépare '+m.ability+' ! Évite les cases rouges.')
        }else{
          m.specialCD=1;
          say(m.kind+' retient son attaque.')
        }
        continue
      }
      if(special.type==='release'){
        if(special.hit)enemyAttack(m,false,special.power,special.drain);
        else say(m.ability+' manque sa cible.');
        continue
      }
    }
    const creature=creatureAction(m,S,monsters,{W,H,stepOK:enemyStep});
    if(creature){
      delete m.aim;
      if(creature.type==='announce'){
        if(prepareCoordinatedIntent(m,S,monsters,{W,H,stepOK:enemyStep})){
          say(m.kind+' prépare '+creature.name+' ! Évite les cases rouges.')
        }else m.creatureCD=1;
        continue
      }
      if(creature.hit)enemyAttack(m,creature.ranged,creature.power,creature.drain);
      else say(creature.name+' manque sa cible.');
      continue
    }
    const board={W,H,stepOK:enemyStep};
    /* TECH-012C — La coordination ajuste l'action individuelle en fonction des positions et menaces des alliés. */
    const baseAction=tacticalTurn(m,S,monsters,board,contacts);
    const action=coordinatedAction(m,S,monsters,board,contacts,baseAction);
    if(action.type==='attack')enemyAttack(m,action.ranged);
    else if(action.type==='move'){m.x=action.x;m.y=action.y}
    else if(action.type==='aim'&&los(m.x,m.y))say(m.kind+' te vise ! Déplace-toi.');
  }
}
/* TECH-012A — Clôt un tour consommé : avance le compteur, joue la phase ennemie puis actualise les états, la ressource, la visibilité, l'affichage et la sauvegarde si le joueur survit. */
function finish(rangedWeapon=false,offensiveSkill=false){
  S.turn++;
  enemyPhase();
  if(S.dead)return;
  S.veil=Math.max(0,S.veil-1);
  S.cool=S.cool.map(x=>Math.max(0,x-1));
  S.guard=Math.max(0,S.guard-1);
  S.boost=Math.max(0,S.boost-1);
  S.res=Math.min(S.maxRes,S.res+resourceRegen(rangedWeapon,offensiveSkill));
  reveal();
  update();
  save()
}
/* TECH-012A — Délègue la mort permanente à la procédure commune de fin de partie. */
function die(){
  endRun('death')
}
/* TECH-012A — Ramasse les objets présents sur la case. Les objets qui ne tiennent pas dans le sac ou la sacoche restent au sol. */
function collectLoot(x,y){
  let full=false;
  for(const found of loot.filter(l=>l.x===x&&l.y===y)){
    if(found.kind==='bandage'){S.bandages++;say('Bandage trouvé.')}
    else if(found.kind==='consumable'){if(!addConsumable(found.consumable)){full=true;continue}say(CONSUMABLES[found.consumable].name+' trouvé.')}
    else if(S.bag.length<24){const it=found.item??item();S.bag.push(it);say(it.name+' trouvé.')}
    else{found.item??=item();full=true;continue}
    loot=loot.filter(l=>l!==found);
  }
  if(full)say('Sac ou sacoche pleine : butin laissé au sol.');
}
/* TECH-012A — Interprète une commande du pavé selon le contexte : ciblage de compétence, interaction, déplacement ou combat. Une fenêtre ouverte bloque les déplacements. */
function move(dx,dy){
  if(mode!=='game'||!overlay.classList.contains('hidden'))return;
  if(selected!==null){
    if(selected==='weapon')useWeaponDirection(dx,dy);
    else useDirection(dx,dy);
    return
  }
  let x=S.x+dx,y=S.y+dy;
  const f=featureAt(x,y);
  /* TECH-012C — Une interaction en diagonale respecte la même contrainte d'angle que le déplacement. */
  const legalAngle=!dx||!dy||clear(S.x+dx,S.y)&&clear(S.x,S.y+dy);
  if(legalAngle&&!mob(x,y)&&f?.type==='merchant'&&stepOK(x,y,S.x,S.y)){
    merchantMenu(f);
    return
  }
  if(legalAngle&&!mob(x,y)&&f?.type==='specialRoom'&&!f.spent&&stepOK(x,y,S.x,S.y)){
    specialRoomMenu(f);
    return
  }
  if(legalAngle&&!mob(x,y)&&f?.type==='event'&&!f.spent&&stepOK(x,y,S.x,S.y)){
    explorationMenu(f);
    return
  }
  if(legalAngle&&!mob(x,y)&&interactFeature(f)){
    finish();
    return
  }
  if(!stepOK(x,y,S.x,S.y)){
    say('Passage ou angle bloqué.');
    return
  }
  let m=mob(x,y);
  if(m){
    hit(m,2+rand(3),basicProfile(m));
    finish();
    return
  }
  S.x=x;
  S.y=y;
  triggerTrap(x,y);
  if(S.dead)return;
  enterTerrain(x,y);
  if(S.dead)return;
  collectLoot(x,y);
  /* TECH-012C — La descente est bloquée tant qu'un boss survit ou qu'un butin encombre les escaliers. */
  if(x===stairs.x&&y===stairs.y){
    if(monsters.some(m=>m.boss&&m.hp>0)){
      say('Le boss doit être vaincu avant de descendre.');
      finish();
      return
    }
    if(loot.some(l=>l.x===x&&l.y===y)){
      say('Butin sur les escaliers : libère de la place avant de descendre.');
      finish();
      return
    }
  /* TECH-012C — La sortie du dernier étage valide la victoire sans générer un nouvel étage. */
    if(S.floor>=FINAL_FLOOR){
      S.turn++;
      endRun('victory');
      return
    }
    S.floor++;
    const recovery=4+Math.floor(Math.min(30,S.floor-1)/6);
    const recovered=Math.min(recovery,S.maxHp-S.hp);
    S.hp+=recovered;
    S.res=S.maxRes;
    generate();
    say('Étage '+S.floor+' · '+currentBiome().name+' · +'+recovered+' PV.')
  }
  finish()
}
/* TECH-012C — Convertit le bouton de barre rapide en indice de compétence ; vérifie son déblocage, sa recharge et son coût. Une compétence directionnelle attend une commande du pavé. */
function activate(i){
  if(mode!=='game'||!overlay.classList.contains('hidden'))return;
  i=S.bar[i];
  if(!unlocked(i))return;
  let c=CLASSES[S.classId],sk=c.skills[i],cost=sk[1];
  if(S.cool[i]||S.res<cost){
    say('Compétence indisponible.');
    return
  }
  /* TECH-012C — Une compétence directionnelle attend une cible : aucun coût n'est encore prélevé. */
  if(sk[3]==='direction'||sk[3]==='ranged'){
    selected=selected===i?null:i;
    say(selected===null?'Ciblage annulé.':'Choisis une direction sur le pavé.');
    update();
    return
  }
  if(sk[3]==='heal'&&!healingLeft()){
    say('Soins de compétence épuisés pour cet étage.');
    return
  }
  if(sk[3]==='heal'&&S.hp===S.maxHp){
    say('PV déjà au maximum.');
    return
  }
  selected=null;
  S.res-=cost;
  /* TECH-012C — Le tour de lancement décrémente aussi la recharge ; ajouter un tour conserve la durée annoncée. */
  S.cool[i]=sk[2]+1;
  if(sk[3]==='heal'){
    S.healUses=(S.healUses||0)+1;
    let n=Math.min(7+S.level+talentBonus('heal')+synergyHeal()+2*(S.ranks[i]-1)+Math.floor(S.attrs[4]/3)+(i===4?5:0),S.maxHp-S.hp);
    S.hp+=n;
    if(i===4&&S.classId==='ranger')S.res=Math.min(S.maxRes,S.res+4);
    if(hasSynergy('reserve'))S.res=Math.min(S.maxRes,S.res+2);
    combatFx('heal',n);
    say('Soin : +'+n+' PV.')
  }else if(sk[3]==='guard'){
    S.guard=2+S.ranks[i]+(i===4?3:0)+talentBonus('guard')+synergyGuard();
    if(i===4&&S.classId==='rogue')S.veil=3;
    if(S.classId==='mage')S.shield=Math.max(S.shield,4+S.ranks[i]*2+(i===4?6:0)+talentBonus('shield')+synergyShield());
    combatFx('guard');
    say('Protection activée.')
  }else{
    S.boost=3+S.ranks[i];
    say('Prochaine attaque renforcée.')
  }
  finish()
}
/* TECH-012A — Résout la compétence sélectionnée dans une direction et recherche les cibles admissibles. Vérifie les ressources et le temps de recharge avant de dépenser le coût. */
function useDirection(dx,dy){
  let i=selected;
  selected=null;
  let sk=CLASSES[S.classId].skills[i],target=null,targets=[];
  if(!unlocked(i)||S.cool[i]||S.res<sk[1]){
    update();
    return
  }
  if(sk[3]==='direction'){
    let x=S.x+dx,y=S.y+dy;
    if(stepOK(x,y,S.x,S.y))target=mob(x,y)
  }else{
    for(let k=1;k<=5;k++){
      let x=S.x+dx*k,y=S.y+dy*k;
      if(!clear(x,y))break;
      if(!stepOK(x,y,x-dx,y-dy))break;
      let m=mob(x,y);
      if(m){
        targets.push(m);
        target??=m;
        if(!(i===3&&S.classId==='ranger'))break
      }
    }
  }
  /* TECH-012C — Une direction sans cible ne dépense ni ressource ni tour. */
  if(!target){
    say('Aucune cible dans cette direction.');
    update();
    return
  }
  S.res-=sk[1];
  S.cool[i]=sk[2]+1;
  let damage=(sk[3]==='ranged'?5:6)+rand(3)+Math.floor(S.level/3)+2*(S.ranks[i]-1)+(i===3?4+(S.nodes.o2?2:0):0);
  if(S.classId==='rogue'&&i===3&&target.hp<=target.maxHp/2)damage+=5;
  hit(target,damage,{skill:true,ranged:sk[3]==='ranged',index:i});
  if(monsters.includes(target)){
    if(S.classId==='warrior'&&i===3)target.exposed=Math.max(target.exposed||0,synergyDuration('exposed',target));
    if(S.classId==='rogue')target.bleed=Math.max(target.bleed||0,synergyDuration('bleed',target));
    if(S.classId==='mage'&&i===3)target.stun=Math.max(target.stun||0,synergyDuration('stun',target))
  }
  if(S.classId==='ranger'&&i===3)
    for(const m of targets.slice(1))
      if(monsters.includes(m))hit(m,Math.max(1,Math.floor(damage/2)),{skill:true,ranged:true,index:i,secondary:true});
  finish(false,true)
}
/* TECH-012C — Consomme un bandage uniquement si le personnage peut se soigner. La guérison est plafonnée aux PV manquants et consomme un tour. */
function bandage(){
  if(mode!=='game'||!overlay.classList.contains('hidden')||
     S.bandages<1||S.hp===S.maxHp)return;
  selected=null;
  S.bandages--;
  let n=Math.min(bandageValue(S.level)+talentBonus('bandage'),S.maxHp-S.hp);
  S.hp+=n;
  combatFx('heal',n);
  say('Bandage : +'+n+' PV.');
  finish()
}