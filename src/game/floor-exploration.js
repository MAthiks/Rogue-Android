/* TECH-012A — Orchestre la création d'un étage : plan, décoration, secrets, terrain, population et butin. Replace le joueur au départ et initialise les cases découvertes. */
function generate(){
  clearCombatFx();
  const seed=Math.floor(Math.random()*4294967296)>>>0;
  /* TECH-012C — Générer d'abord la géométrie, puis les éléments interactifs et le terrain. */
  const d=buildDungeon(W,H,S.floor,seed);
  const decorated=decorateDungeon(d,W,H,S.floor);
  addDeepSecret(d,decorated,W,H,S.floor);
  map=decorated.map;
  features=decorated.features;
  const biome=biomeForFloor(S.floor,d.seed);
  terrain=buildTerrain(d,decorated,W,H,S.floor,biome);
  seen=Array(W*H).fill(0);
  S.x=d.start.x;
  S.y=d.start.y;
  stairs=d.stairs;
  monsters=selectBossVariant(balanceEnemies(promoteEnemies(d.monsters,S.floor,seed,stairs),S.floor),S.floor,seed);
  loot=addSupplies(d,decorated,terrain);
  for(const l of loot)if(l.kind==='gear')l.item=item();
  loot.push(...placeConsumable(d,decorated,terrain,loot,S.floor));
  const exploration=buildExploration(d,decorated,terrain,loot,monsters,S.floor);
  features.push(...exploration.events);
  if(exploration.rare){
    const rare=exploration.rare;
    monsters=monsters.map(m=>m.x===rare.x&&m.y===rare.y?rare:m)
  }
  monsters=populateBestiary(monsters,biome,S.floor,d.seed);
  const merchant=buildMerchant(d,decorated,terrain,loot,monsters,S.floor,W,H);
  if(merchant)features.push(merchant);
  for(const room of buildSpecialRooms(d,decorated,terrain,loot,monsters,S.floor,W,H)){
    if(room.secret){
      const i=features.findIndex(f=>f.type==='chest'&&f.secret&&f.x===room.x&&f.y===room.y);
      if(i>=0)features.splice(i,1,room)
    }else features.push(room)
  }
  /* TECH-012C — Les utilisations de soins sont réinitialisées à chaque étage ; la graine est conservée dans l'état. */
  S.healUses=0;
  S.dungeon={version:1,seed:d.seed,profile:d.profile,biome};
  reveal()
}
/* TECH-012C — Copie la grille de base et ajoute les éléments interactifs en évitant les positions réservées. La graine dérivée garde les tirages séparés de la génération initiale. */
function decorateDungeon(d,W,H,floor){
  let s=(d.seed^0x43ac91d7)>>>0;
  const rnd=n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return Math.floor(s/4294967296*n)};
  const map=d.map.slice(),features=[],key=(x,y)=>y*W+x,inside=(x,y)=>x>0&&y>0&&x<W-1&&y<H-1;
  const open=(x,y)=>inside(x,y)&&map[key(x,y)]===0,occupied=new Set([d.start,d.stairs,...d.monsters,...d.loot].map(p=>key(p.x,p.y)));
  const far=(x,y)=>Math.max(Math.abs(x-d.start.x),Math.abs(y-d.start.y))>4;
  const add=(x,y,type,extra={})=>{features.push({x,y,type,...extra});occupied.add(key(x,y))};
  const candidates=pred=>{
    const a=[];
    for(let y=1;y<H-1;y++)
      for(let x=1;x<W-1;x++)
        if(!occupied.has(key(x,y))&&far(x,y)&&pred(x,y))a.push({x,y});
    return a
  };
  const select=(a,count,fn)=>{for(let i=0;i<count&&a.length;i++){const p=a.splice(rnd(a.length),1)[0];if(!occupied.has(key(p.x,p.y)))fn(p.x,p.y)}};
  /* TECH-012C — Une porte est placée dans un passage étroit : ouvert sur un axe, fermé sur l'autre. */
  const doors=candidates((x,y)=>open(x,y)&&((open(x-1,y)&&open(x+1,y)&&!open(x,y-1)&&!open(x,y+1))||(open(x,y-1)&&open(x,y+1)&&!open(x-1,y)&&!open(x+1,y))));
  select(doors,Math.min(5,2+Math.floor(floor/3)),(x,y)=>add(x,y,'door',{open:false,found:true}));
  select(candidates((x,y)=>open(x,y)&&d.rooms.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)),2+(floor>=5?1:0),(x,y)=>add(x,y,'chest',{open:false,found:true,reward:rnd(4)===0?'bandage':'gear'}));
  if(floor>=2)select(candidates((x,y)=>open(x,y)),Math.min(5,1+Math.floor(floor/3)),(x,y)=>add(x,y,'trap',{found:false,spent:false,damage:3+Math.min(5,Math.floor(floor/3))}));
  /* TECH-012C — Recherche une zone murée de 3 × 3 entourée de murs, avec une entrée adjacente à un passage existant. */
  const secrets=[];
  for(let y=2;y<H-4;y++)for(let x=2;x<W-4;x++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const ex=x+1-dx*2,ey=y+1-dy*2,ax=ex-dx,ay=ey-dy;
    if(!open(ax,ay)||occupied.has(key(ax,ay))||!far(ex,ey)||occupied.has(key(ex,ey)))continue;
    let valid=true;
    for(let yy=y-1;yy<=y+3;yy++)for(let xx=x-1;xx<=x+3;xx++)if(!inside(xx,yy)||map[key(xx,yy)]!==1)valid=false;
    if(valid)secrets.push({x,y,ex,ey});
  }
  if(secrets.length){
    const q=secrets[rnd(secrets.length)];
    for(let y=q.y;y<q.y+3;y++)for(let x=q.x;x<q.x+3;x++)map[key(x,y)]=0;
    add(q.ex,q.ey,'secret',{open:false,found:false});
    add(q.x+1,q.y+1,'chest',{open:false,found:true,reward:'gear',secret:true});
  }
  /* TECH-012C — Les portes fermées deviennent des obstacles dans la grille ; leur ouverture rétablit la case libre. */
  for(const f of features)if(f.type==='door')map[key(f.x,f.y)]=1;
  return {map,features};
}
function featureAt(x,y){return features.find(f=>f.x===x&&f.y===y)}
function searchNearby(){
  let found=0,disarmed=0;
  for(const f of features){
    if(Math.abs(f.x-S.x)+Math.abs(f.y-S.y)>1)continue;
    if((f.type==='secret'||f.type==='trap')&&!f.found&&!f.spent){f.found=true;found++;say(f.type==='secret'?'Passage secret découvert.':'Piège repéré.')}
    else if(f.type==='trap'&&f.found&&!f.spent){f.spent=true;disarmed++;say('Piège désamorcé.')}
  }
  if(!found&&!disarmed)say('Tu attends et fouilles les environs.');
}
/* TECH-012C — Traite les interactions avec les éléments du donjon, notamment portes, passages secrets et coffres ; une porte ouverte devient praticable dans map. */
function interactFeature(f){
  if(!f)return false;
  if((f.type==='door'||f.type==='secret')&&!f.open&&(f.type!=='secret'||f.found)){
    f.open=true;map[idx(f.x,f.y)]=0;say(f.type==='secret'?'Passage secret ouvert.':'Porte ouverte.');return true;
  }
  if(f.type==='chest'&&!f.open){
    if(f.reward==='gear'&&S.bag.length>=24){say('Sac plein : coffre laissé fermé.');return true}
    f.open=true;if(f.reward==='bandage'){S.bandages+=2;say('Coffre : 2 bandages.')}else{const it=item();S.bag.push(it);say('Coffre : '+it.name);}
    return true;
  }
  return false;
}
/* TECH-012C — Révèle et désactive définitivement le piège déclenché, retire les PV et lance la fin de partie si les dégâts sont mortels. */
function triggerTrap(x,y){
  const f=featureAt(x,y);if(!f||f.type!=='trap'||f.spent)return;
  f.found=true;f.spent=true;S.hp=Math.max(0,S.hp-f.damage);say('Piège déclenché : -'+f.damage+' PV.');if(S.hp===0)die();
}