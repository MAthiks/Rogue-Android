'use strict';
// TECH-014 — Effets du monde, transactions et clôture du tour.
// Les fonctions historiques sont adaptées à un état explicite. Les ports
// réalisent les effets externes (RNG, combat, journal, génération, persistance).
// Aucun DOM, aucune écriture disque. La génération et la fin de partie restent des ports explicites ; reference.cjs
// demeure l'oracle de commandes complet.
const {dist,geometry,combat}=require('./simulation-contract.cjs');
const domain=require('./domain-contract.cjs');
const {tactics}=require('./tactical-contract.cjs');
function world(state,catalogs,ports){
 const W=48,H=32;
 const {CONSUMABLES,POUCH_CAP,MERCHANTS,GEAR_SLOTS,GOLD_CAP,EXPLORATION_EVENTS,SPECIAL_ROOMS,EXTENDED_BOSSES,WEAPONS,STYLES,CLASSES,BIOMES}=catalogs;
 const {bossAction,extendedBossAction,creatureAction,prepareCoordinatedIntent,tacticalTurn,coordinatedAction}=tactics(catalogs);
 const required=['say','rand','update','save','combatFx','generate','endRun'];
 for(const key of required)if(typeof ports[key]!=='function')throw Error('Port monde manquant : '+key);
 const {say,rand,update,save,combatFx,generate,endRun}=ports;
 const FINAL_FLOOR=30;
 const die=()=>endRun('death');
 const gear=domain.items(catalogs);
 const createGear=(id,floor,min=1,rng=rand,forced=null)=>gear.createGear(id,floor,min,rng,forced);
 const item=forcedTier=>createGear(++state.S.serial,state.S.floor,1,rand,forcedTier===2?3:null);
 const gainXP=n=>domain.gainXP(state.S,n).forEach(say);
 const enemyXP=domain.enemyXP,goldReward=domain.goldReward,bandageValue=domain.bandageValue;
 const healingLeft=()=>domain.healingLeft(state.S);
 const unlocked=i=>i<3||!!state.S.activeTalents[i];
 const currentBiome=()=>BIOMES[state.S.dungeon?.biome]||BIOMES.crypt;
 const talent=domain.talents(state.S,catalogs);
 const {talentBonus,synergyDamage,synergyHeal,synergyGuard,synergyShield,synergyDuration,hasSynergy}=talent;
 const {criticalChance,dodgeChance,outgoingDamage,incomingDamage,resourceRegen}=combat(state.S,{bonus:k=>gear.bonus(state.S.equip,k),talentBonus,weaponFamily,currentStyle,synergyDamage});
 const merchantMenu=f=>{if(!merchantAvailable(f)){say('Commerce indisponible : éloigne les ennemis.');return}state.selected=null;state.overlayOpen=true};
 const explorationMenu=f=>{if(EXPLORATION_EVENTS[f.eventId]&&!f.spent){state.selected=null;state.overlayOpen=true}};
 const specialRoomMenu=f=>{if(SPECIAL_ROOMS[f.roomId]&&!f.spent){state.selected=null;state.overlayOpen=true}};
 const idx=(x,y)=>y*W+x;
 const clear=(x,y)=>geometry(W,H,state.map).clear(x,y);
 const stepOK=(...args)=>geometry(W,H,state.map).stepOK(...args);
 const los=(x,y)=>geometry(W,H,state.map).los(state.S,x,y);
 const mob=(x,y)=>state.monsters.find(m=>m.hp>0&&m.x===x&&m.y===y);
 const reveal=()=>{state.seen=geometry(W,H,state.map).reveal(state.S,state.seen)};
 const goldBalance=()=>domain.goldBalance(state.S),salePrice=domain.salePrice;
 const hide=()=>{state.overlayOpen=false};
function featureAt(x,y){return state.features.find(f=>f.x===x&&f.y===y)}

function searchNearby(){
  let found=0,disarmed=0;
  for(const f of state.features){
    if(Math.abs(f.x-state.S.x)+Math.abs(f.y-state.S.y)>1)continue;
    if((f.type==='secret'||f.type==='trap')&&!f.found&&!f.spent){f.found=true;found++;say(f.type==='secret'?'Passage secret découvert.':'Piège repéré.')}
    else if(f.type==='trap'&&f.found&&!f.spent){f.spent=true;disarmed++;say('Piège désamorcé.')}
  }
  if(!found&&!disarmed)say('Tu attends et fouilles les environs.');
}

function interactFeature(f){
  if(!f)return false;
  if((f.type==='door'||f.type==='secret')&&!f.open&&(f.type!=='secret'||f.found)){
    f.open=true;state.map[idx(f.x,f.y)]=0;say(f.type==='secret'?'Passage secret ouvert.':'Porte ouverte.');return true;
  }
  if(f.type==='chest'&&!f.open){
    if(f.reward==='gear'&&state.S.bag.length>=24){say('Sac plein : coffre laissé fermé.');return true}
    f.open=true;if(f.reward==='bandage'){state.S.bandages+=2;say('Coffre : 2 bandages.')}else{const it=item();state.S.bag.push(it);say('Coffre : '+it.name);}
    return true;
  }
  return false;
}

function triggerTrap(x,y){
  const f=featureAt(x,y);if(!f||f.type!=='trap'||f.spent)return;
  f.found=true;f.spent=true;state.S.hp=Math.max(0,state.S.hp-f.damage);say('Piège déclenché : -'+f.damage+' PV.');if(state.S.hp===0)die();
}

function enterTerrain(x,y){
  const t=state.terrain.find(t=>t.x===x&&t.y===y);if(!t)return;
  if(t.type==='water'){state.S.res=Math.max(0,state.S.res-2);say('Eau froide : -2 ressource.')}
  else if(t.type==='rubble'){state.S.guard=Math.max(0,state.S.guard-2);say('Décombres : garde réduite.')}
  else if(t.type==='ember'){state.S.hp=Math.max(0,state.S.hp-3);say('Braises : -3 PV.');if(state.S.hp===0)die()}
  else if(t.type==='spores'){state.S.hp=Math.max(0,state.S.hp-2);state.S.res=Math.max(0,state.S.res-1);say('Spores irritantes : -2 PV, -1 ressource.');if(state.S.hp===0)die()}
  else if(t.type==='ice'){state.S.guard=Math.max(0,state.S.guard-2);state.S.boost=Math.max(0,state.S.boost-2);say('Glace : garde et puissance réduites.')}
  else if(t.type==='void'){state.S.res=Math.max(0,state.S.res-3);state.S.shield=Math.max(0,state.S.shield-2);say('Faille : -3 ressource, -2 protection.')}
  else if(t.type==='font'&&!t.spent&&state.S.hp<state.S.maxHp){const gain=Math.min(5,state.S.maxHp-state.S.hp);state.S.hp+=gain;t.spent=true;say('Fontaine : +'+gain+' PV.')}
}

function collectLoot(x,y){
  let full=false;
  for(const found of state.loot.filter(l=>l.x===x&&l.y===y)){
    if(found.kind==='bandage'){state.S.bandages++;say('Bandage trouvé.')}
    else if(found.kind==='consumable'){if(!addConsumable(found.consumable)){full=true;continue}say(CONSUMABLES[found.consumable].name+' trouvé.')}
    else if(state.S.bag.length<24){const it=found.item??item();state.S.bag.push(it);say(it.name+' trouvé.')}
    else{found.item??=item();full=true;continue}
    state.loot=state.loot.filter(l=>l!==found);
  }
  if(full)say('Sac ou sacoche pleine : butin laissé au sol.');
}

function enemyPhase(){
  /* TECH-012C — Les contacts sont relevés au début de la phase ennemie pour alimenter la coordination. */
  const contacts=state.monsters.filter(m=>{
    if(m.hp<=0||m.stun>0||dist(m,state.S)>8)return false;
    const n=dist(m,state.S);let prev=m;
    for(let i=1;i<=n;i++){const p={x:Math.round(m.x+(state.S.x-m.x)*i/n),y:Math.round(m.y+(state.S.y-m.y)*i/n)};if(!stepOK(p.x,p.y,prev.x,prev.y))return false;prev=p}
    return true;
  }).map(m=>({x:m.x,y:m.y,source:m}));
  /* TECH-012C — Parcourt une copie de la liste : les effets de saignement peuvent retirer un ennemi pendant la phase. */
  for(const m of [...state.monsters]){
    if(state.S.dead)break;
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
    const enemyStep=(x,y,fx,fy)=>stepOK(x,y,fx,fy)&&featureAt(x,y)?.type!=='merchant'&&(!(x===state.stairs.x&&y===state.stairs.y)||(x===state.S.x&&y===state.S.y));
    /* TECH-012C — Priorité aux actions spéciales des boss, puis aux capacités de créatures et enfin à la tactique ordinaire. */
    const special=Object.hasOwn(EXTENDED_BOSSES,m.boss)?extendedBossAction(m,state.S,{W,H,stepOK},state.monsters):bossAction(m,state.S,{W,H,stepOK});
    if(special){
      if(special.changed)say(m.kind+' entre en phase '+m.phase+' !');
      if(special.type==='announce'){
        if(prepareCoordinatedIntent(m,state.S,state.monsters,{W,H,stepOK:enemyStep})){
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
    const creature=creatureAction(m,state.S,state.monsters,{W,H,stepOK:enemyStep});
    if(creature){
      delete m.aim;
      if(creature.type==='announce'){
        if(prepareCoordinatedIntent(m,state.S,state.monsters,{W,H,stepOK:enemyStep})){
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
    const baseAction=tacticalTurn(m,state.S,state.monsters,board,contacts);
    const action=coordinatedAction(m,state.S,state.monsters,board,contacts,baseAction);
    if(action.type==='attack')enemyAttack(m,action.ranged);
    else if(action.type==='move'){m.x=action.x;m.y=action.y}
    else if(action.type==='aim'&&los(m.x,m.y))say(m.kind+' te vise ! Déplace-toi.');
  }
}

function finish(rangedWeapon=false,offensiveSkill=false){
  state.S.turn++;
  enemyPhase();
  if(state.S.dead)return;
  state.S.veil=Math.max(0,state.S.veil-1);
  state.S.cool=state.S.cool.map(x=>Math.max(0,x-1));
  state.S.guard=Math.max(0,state.S.guard-1);
  state.S.boost=Math.max(0,state.S.boost-1);
  state.S.res=Math.min(state.S.maxRes,state.S.res+resourceRegen(rangedWeapon,offensiveSkill));
  reveal();
  update();
  save()
}

function pouchCount(id){
  return Object.hasOwn(CONSUMABLES,id)?Math.max(0,Math.min(POUCH_CAP,Math.floor(Number(state.S.pouch?.[id])||0))):0
}

function addConsumable(id){
  if(!Object.hasOwn(CONSUMABLES,id)||pouchCount(id)>=POUCH_CAP)return false;
  state.S.pouch??={};
  state.S.pouch[id]=pouchCount(id)+1;
  return true
}

function rollConsumable(floor,rng=rand){
  const entries=Object.entries(CONSUMABLES).filter(([,v])=>floor>=v.min);
  let n=rng(entries.reduce((s,[,v])=>s+v.weight,0));
  for(const [id,v] of entries){if(n<v.weight)return id;
    n-=v.weight}return 'heal'
}

function consumableTargets(id){
 if(id==='insight')return state.features.filter(f=>['trap','secret'].includes(f.type)&&!f.found&&!f.spent&&dist(f,state.S)<=6);
 if(id==='toolkit')return state.features.filter(f=>f.type==='trap'&&!f.spent&&Math.abs(f.x-state.S.x)+Math.abs(f.y-state.S.y)<=1);
 if(id==='smoke')return state.monsters.filter(m=>m.hp>0&&dist(m,state.S)<=2&&los(m.x,m.y)&&!(m.stun>0));
 return [];
}

function canUseConsumable(id){
 if(!pouchCount(id)||state.S.dead)return false;
 if(id==='heal')return state.S.hp<state.S.maxHp;if(id==='focus')return state.S.res<state.S.maxRes;
 if(id==='guard')return state.S.guard<4;if(id==='power')return state.S.boost<5;
 if(id==='ward')return state.S.shield<8+Math.floor(state.S.level/3);
 return consumableTargets(id).length>0;
}

function useConsumable(id){
 if(state.mode!=='game'||state.overlayOpen||!canUseConsumable(id))return false;
 state.selected=null;state.S.pouch[id]=pouchCount(id)-1;let msg=CONSUMABLES[id].name;
 if(id==='heal'){const n=Math.min(state.S.maxHp-state.S.hp,12+Math.floor(state.S.level/3));state.S.hp+=n;combatFx('heal',n);msg+=' : +'+n+' PV'}
 else if(id==='focus'){const n=Math.min(state.S.maxRes-state.S.res,6+Math.floor(state.S.level/5));state.S.res+=n;msg+=' : +'+n+' ressource'}
 else if(id==='guard')state.S.guard=4;
 else if(id==='power')state.S.boost=5;
 else if(id==='ward')state.S.shield=8+Math.floor(state.S.level/3);
 else if(id==='smoke'){const targets=consumableTargets(id);for(const m of targets){m.stun=1;delete m.aim;delete m.intent}msg+=' : '+targets.length+' ennemis étourdis'}
 else{const targets=consumableTargets(id);for(const f of targets){f.found=true;if(id==='toolkit')f.spent=true}msg+=' : '+targets.length+' éléments'}
 say(msg);finish();return true;
}

function merchantAvailable(f){
 return state.mode==='game'&&state.S&&!state.S.dead&&f?.type==='merchant'&&Object.hasOwn(MERCHANTS,f.merchantId)
   &&state.features.includes(f)&&dist(f,state.S)===1&&stepOK(f.x,f.y,state.S.x,state.S.y)
   &&!mob(f.x,f.y)&&!state.monsters.some(m=>m.hp>0&&dist(m,state.S)<=6);
}

function canBuy(f,index){
 if(!merchantAvailable(f)||!Number.isInteger(index))return false;
 const a=f.stock?.[index];if(!a||!Number.isInteger(a.qty)||a.qty<=0||!Number.isInteger(a.price)||a.price<=0||goldBalance()<a.price)return false;
 if(a.kind==='gear')return state.S.bag.length<24&&!!a.item&&Object.hasOwn(GEAR_SLOTS,a.item.slot);
 if(a.kind==='consumable')return Object.hasOwn(CONSUMABLES,a.id)&&pouchCount(a.id)<POUCH_CAP;
 return a.kind==='bandage';
}

function buyMerchant(f,index){
 if(!canBuy(f,index))return false;
 const a=f.stock[index];
 if(a.kind==='gear')state.S.bag.push({...a.item,id:++state.S.serial});
 else if(a.kind==='consumable'){if(!addConsumable(a.id))return false}
 else state.S.bandages++;
 state.S.gold=goldBalance()-a.price;
 a.qty--;
 say('Achat : -'+a.price+' or.');
 save();
 update();
 return true;
}

function canSell(f,id){
 if(!merchantAvailable(f)||!Number.isInteger(id))return false;
 const it=state.S.bag.find(v=>v.id===id);
 return !!it&&!it.bossRelic&&goldBalance()+salePrice(it)<=GOLD_CAP;
}

function sellMerchant(f,id){
 if(!canSell(f,id))return false;
 const i=state.S.bag.findIndex(v=>v.id===id),it=state.S.bag[i],price=salePrice(it);
 state.S.bag.splice(i,1);
 state.S.gold=goldBalance()+price;
 say('Vente : +'+price+' or.');
 save();
 update();
 return true;
}

function eventChoiceAllowed(f,choice){
 if(!f||f.type!=='event'||f.spent||!Object.hasOwn(EXPLORATION_EVENTS,f.eventId)||!state.features.includes(f)||dist(f,state.S)>1||!stepOK(f.x,f.y,state.S.x,state.S.y)||mob(f.x,f.y))return false;
 if(choice==='skip')return true;
 if(!EXPLORATION_EVENTS[f.eventId].choices.some(c=>c[0]===choice))return false;
 if(choice==='blessing')return state.S.hp<state.S.maxHp||state.S.res<state.S.maxRes;
 if(choice==='offering')return state.S.bandages>=1&&state.S.shield<10;
 if(choice==='drink')return state.S.hp<state.S.maxHp;
 if(choice==='bottle')return pouchCount('heal')<POUCH_CAP;
 if(choice==='study')return state.S.res>=4&&state.S.level<30;
 if(choice==='sacrifice')return state.S.hp>6&&state.S.bag.length<24;
 if(choice==='gear')return state.S.bag.length<24;
 if(choice==='aid')return state.S.bandages>=1&&pouchCount('heal')<POUCH_CAP&&pouchCount('focus')<POUCH_CAP;
 if(choice==='trade')return state.S.res>=2&&pouchCount('insight')<POUCH_CAP;
 if(choice==='forgeGear')return goldBalance()>=20&&state.S.bag.length<24;
 if(choice==='forgeWard')return state.S.res>=5&&state.S.shield<16;
 if(choice==='boneGold')return goldBalance()<GOLD_CAP;
 if(choice==='boneAid')return state.S.bandages>=1&&pouchCount('ward')<POUCH_CAP&&pouchCount('focus')<POUCH_CAP;
 if(choice==='mirrorStudy')return state.S.hp>5&&state.S.level<30;
 if(choice==='mirrorFocus')return goldBalance()>=8&&state.S.res<state.S.maxRes;
 if(choice==='caravanBuy')return goldBalance()>=12&&pouchCount('heal')<POUCH_CAP&&pouchCount('smoke')<POUCH_CAP;
 if(choice==='caravanTrade')return state.S.bandages>=1&&goldBalance()<=GOLD_CAP-16;
 if(choice==='relicBlood')return state.S.hp>10&&state.S.res>=4&&state.S.bag.length<24;
 if(choice==='relicWard')return state.S.res>=6&&pouchCount('ward')<POUCH_CAP&&pouchCount('insight')<POUCH_CAP;
 return choice==='supplies';
}

function resolveEvent(f,choice){
 if(state.mode!=='game'||state.S.dead||!eventChoiceAllowed(f,choice))return false;
 f.spent=true;f.choice=choice;state.selected=null;hide();let msg=EXPLORATION_EVENTS[f.eventId].name;
 if(choice==='blessing'){state.S.hp=Math.min(state.S.maxHp,state.S.hp+10);state.S.res=Math.min(state.S.maxRes,state.S.res+4)}
 else if(choice==='offering'){state.S.bandages--;state.S.shield=10}
 else if(choice==='supplies')state.S.bandages+=2;
 else if(choice==='gear')state.S.bag.push(createGear(++state.S.serial,state.S.floor,2));
 else if(choice==='drink')state.S.hp=Math.min(state.S.maxHp,state.S.hp+8);
 else if(choice==='bottle')addConsumable('heal');
 else if(choice==='study'){state.S.res-=4;gainXP(8+Math.min(30,state.S.floor))}
 else if(choice==='sacrifice'){state.S.hp-=6;state.S.bag.push(createGear(++state.S.serial,state.S.floor,3))}
 else if(choice==='aid'){state.S.bandages--;addConsumable('heal');addConsumable('focus')}
 else if(choice==='trade'){state.S.res-=2;addConsumable('insight')}
 else if(choice==='forgeGear'){state.S.gold=goldBalance()-20;state.S.bag.push(createGear(++state.S.serial,state.S.floor,3))}
 else if(choice==='forgeWard'){state.S.res-=5;state.S.shield=16}
 else if(choice==='boneGold')state.S.gold=Math.min(GOLD_CAP,goldBalance()+12);
 else if(choice==='boneAid'){state.S.bandages--;addConsumable('ward');addConsumable('focus')}
 else if(choice==='mirrorStudy'){state.S.hp-=5;gainXP(15+Math.min(30,state.S.floor))}
 else if(choice==='mirrorFocus'){state.S.gold=goldBalance()-8;state.S.res=Math.min(state.S.maxRes,state.S.res+8)}
 else if(choice==='caravanBuy'){state.S.gold=goldBalance()-12;addConsumable('heal');addConsumable('smoke')}
 else if(choice==='caravanTrade'){state.S.bandages--;state.S.gold=goldBalance()+16}
 else if(choice==='relicBlood'){state.S.hp-=10;state.S.res-=4;state.S.bag.push(createGear(++state.S.serial,state.S.floor,4))}
 else if(choice==='relicWard'){state.S.res-=6;addConsumable('ward');addConsumable('insight')}
 say(msg+(choice==='skip'?' : laissé de côté.':' : événement résolu.'));finish();return true;
}

function specialRoomAllowed(f,choice){
 if(state.mode!=='game'||!state.S||state.S.dead||f?.type!=='specialRoom'||f.spent||!state.features.includes(f)||!Object.hasOwn(SPECIAL_ROOMS,f.roomId)||dist(f,state.S)!==1||!stepOK(f.x,f.y,state.S.x,state.S.y)||mob(f.x,f.y))return false;
 if(!SPECIAL_ROOMS[f.roomId].choices.some(c=>c[0]===choice))return false;
 if(choice==='rest')return state.S.hp<state.S.maxHp||state.S.res<state.S.maxRes;
 if(choice==='protect')return state.S.shield<12;
 if(choice==='study')return state.S.level<30;
 if(choice==='scroll')return pouchCount('insight')<POUCH_CAP&&pouchCount('ward')<POUCH_CAP;
 if(choice==='gold')return goldBalance()<GOLD_CAP;
 if(choice==='gear'||choice==='relic')return state.S.bag.length<24;
 if(choice==='blood')return state.S.hp>8&&state.S.bag.length<24;
 if(choice==='purify')return state.S.res>=4&&state.S.shield<10;
 if(choice==='supplies')return pouchCount('heal')<POUCH_CAP;
 if(choice==='oathHeal')return state.S.bandages>=2&&(state.S.hp<state.S.maxHp||state.S.res<state.S.maxRes);
 if(choice==='oathWard')return goldBalance()>=15&&state.S.shield<20;
 if(choice==='archiveStudy')return state.S.level<30;
 if(choice==='archiveScroll')return pouchCount('insight')<POUCH_CAP&&pouchCount('ward')<POUCH_CAP;
 if(choice==='treasuryGold')return goldBalance()<GOLD_CAP;
 if(choice==='treasuryGear')return state.S.bag.length<24;
 return false;
}

function resolveSpecialRoom(f,choice){
 if(!specialRoomAllowed(f,choice))return false;
 const floor=Math.max(1,Math.min(30,state.S.floor));
 f.spent=true;f.choice=choice;state.selected=null;hide();
 if(choice==='rest'){state.S.hp=Math.min(state.S.maxHp,state.S.hp+14);state.S.res=Math.min(state.S.maxRes,state.S.res+6)}
 else if(choice==='protect')state.S.shield=12;
 else if(choice==='study')gainXP(12+floor*2);
 else if(choice==='scroll'){addConsumable('insight');addConsumable('ward')}
 else if(choice==='gold')state.S.gold=Math.min(GOLD_CAP,goldBalance()+15+floor*2);
 else if(choice==='gear'||choice==='relic')state.S.bag.push(createGear(++state.S.serial,floor,3));
 else if(choice==='blood'){state.S.hp-=8;state.S.bag.push(createGear(++state.S.serial,floor,4))}
 else if(choice==='purify'){state.S.res-=4;state.S.shield=10}
 else if(choice==='supplies'){state.S.bandages+=2;addConsumable('heal')}
 else if(choice==='oathHeal'){state.S.bandages-=2;state.S.hp=Math.min(state.S.maxHp,state.S.hp+24);state.S.res=Math.min(state.S.maxRes,state.S.res+8)}
 else if(choice==='oathWard'){state.S.gold=goldBalance()-15;state.S.shield=20}
 else if(choice==='archiveStudy')gainXP(20+floor*2);
 else if(choice==='archiveScroll'){addConsumable('insight');addConsumable('ward')}
 else if(choice==='treasuryGold')state.S.gold=Math.min(GOLD_CAP,goldBalance()+25+floor*2);
 else if(choice==='treasuryGear')state.S.bag.push(createGear(++state.S.serial,floor,4));
 say(SPECIAL_ROOMS[f.roomId].name+' : choix résolu.');finish();return true;
}
function hit(m,damage,profile=null){
  const critical=rand(100)<criticalChance(profile),
        d=outgoingDamage(m,damage,profile,critical);
  if(critical&&talentBonus('bleed'))
    m.bleed=Math.max(m.bleed||0,talentBonus('bleed'));
  m.hp-=d;
  state.S.boost=0;
  if(los(m.x,m.y))combatFx(critical?'critical':'hit',d);
  say(m.kind+' : -'+d+' PV');
  if(m.hp<=0)kill(m)
}

function kill(m){
  if(!state.monsters.includes(m))return;
  state.monsters=state.monsters.filter(x=>x!==m);
  state.S.gold=Math.min(GOLD_CAP,goldBalance()+goldReward(m,state.S.floor));
  state.S.kills++;
  gainXP(enemyXP(m,state.S.floor));
  if(m.boss)
    state.loot.unshift({x:m.x,y:m.y,kind:'gear',item:Object.hasOwn(EXTENDED_BOSSES,m.boss)?extendedBossReward(m):bossReward(m)});
  else if(m.rare){
    state.loot.push({x:m.x,y:m.y,kind:'gear',item:createGear(++state.S.serial,state.S.floor,4)},
              {x:m.x,y:m.y,kind:'consumable',consumable:rollConsumable(state.S.floor)})
  }else if(m.affix)
    state.loot.push({x:m.x,y:m.y,kind:'gear',item:eliteReward()});
  else if(rand(5)===0){
    const gear=rand(3)===0;
    state.loot.push({x:m.x,y:m.y,kind:gear?'gear':'bandage',...(gear?{item:item()}: {})})
  }
  if(!m.boss&&!m.affix&&rand(12)===0)
    state.loot.push({x:m.x,y:m.y,kind:'consumable',consumable:rollConsumable(state.S.floor)});
  say(m.kind+' vaincu !')
}

function bossReward(m){
  const slot=m.boss==='stone'?'armor':m.boss==='ash'?'weapon':'ring';
  return {id:++state.S.serial,slot,name:({stone:'Cuirasse de Kharok',ash:'Lame de Syrha',veil:'Anneau de Veyl'})[m.boss],atk:slot==='weapon'?4:slot==='ring'?2:0,def:slot==='armor'?4:0,crit:slot==='ring'?6:0,regen:slot==='ring'?1:0,bossRelic:true,rarity:5,itemLevel:Math.max(1,Math.min(30,state.S.floor)),uniqueId:'boss-'+m.boss,...(slot==='weapon'?{family:'blade'}:{})};
}

function eliteReward(){return item(2)}

function enemyAttack(m,ranged,power=0,drain=false){
  if(state.S.veil>0){state.S.veil=0;say('Attaque évitée par Disparition.');return}
  if(rand(100)<dodgeChance()){say('Attaque esquivée.');return}
  let dmg=incomingDamage(m,power,rand(2));
  /* TECH-012C — Le bouclier absorbe les dégâts après la réduction défensive. */
  if(state.S.shield>0){let absorbed=Math.min(dmg,state.S.shield);state.S.shield-=absorbed;dmg-=absorbed}
  const actual=Math.min(state.S.hp,dmg);
  state.S.hp=Math.max(0,state.S.hp-dmg);
  combatFx(actual>0?'hurt':'guard',actual>0?actual:undefined);
  if(m.affix==='vampiric'&&actual>0)m.hp=Math.min(m.maxHp,m.hp+Math.min(2,actual));
  say(m.kind+(ranged?(m.species?' lance un projectile : -':' te décoche une flèche : -'):' te frappe : -')+dmg+' PV');
  if(drain&&actual>0){
    const n=Math.min(2,state.S.res);
    state.S.res-=n;
    say('Drain : -'+n+' ressources.')
  }
  if(state.S.hp===0)die();
}

function move(dx,dy){
  if(state.mode!=='game'||state.overlayOpen)return;
  if(state.selected!==null){
    if(state.selected==='weapon')useWeaponDirection(dx,dy);
    else useDirection(dx,dy);
    return
  }
  let x=state.S.x+dx,y=state.S.y+dy;
  const f=featureAt(x,y);
  /* TECH-012C — Une interaction en diagonale respecte la même contrainte d'angle que le déplacement. */
  const legalAngle=!dx||!dy||clear(state.S.x+dx,state.S.y)&&clear(state.S.x,state.S.y+dy);
  if(legalAngle&&!mob(x,y)&&f?.type==='merchant'&&stepOK(x,y,state.S.x,state.S.y)){
    merchantMenu(f);
    return
  }
  if(legalAngle&&!mob(x,y)&&f?.type==='specialRoom'&&!f.spent&&stepOK(x,y,state.S.x,state.S.y)){
    specialRoomMenu(f);
    return
  }
  if(legalAngle&&!mob(x,y)&&f?.type==='event'&&!f.spent&&stepOK(x,y,state.S.x,state.S.y)){
    explorationMenu(f);
    return
  }
  if(legalAngle&&!mob(x,y)&&interactFeature(f)){
    finish();
    return
  }
  if(!stepOK(x,y,state.S.x,state.S.y)){
    say('Passage ou angle bloqué.');
    return
  }
  let m=mob(x,y);
  if(m){
    hit(m,2+rand(3),basicProfile(m));
    finish();
    return
  }
  state.S.x=x;
  state.S.y=y;
  triggerTrap(x,y);
  if(state.S.dead)return;
  enterTerrain(x,y);
  if(state.S.dead)return;
  collectLoot(x,y);
  /* TECH-012C — La descente est bloquée tant qu'un boss survit ou qu'un butin encombre les escaliers. */
  if(x===state.stairs.x&&y===state.stairs.y){
    if(state.monsters.some(m=>m.boss&&m.hp>0)){
      say('Le boss doit être vaincu avant de descendre.');
      finish();
      return
    }
    if(state.loot.some(l=>l.x===x&&l.y===y)){
      say('Butin sur les escaliers : libère de la place avant de descendre.');
      finish();
      return
    }
  /* TECH-012C — La sortie du dernier étage valide la victoire sans générer un nouvel étage. */
    if(state.S.floor>=FINAL_FLOOR){
      state.S.turn++;
      endRun('victory');
      return
    }
    state.S.floor++;
    const recovery=4+Math.floor(Math.min(30,state.S.floor-1)/6);
    const recovered=Math.min(recovery,state.S.maxHp-state.S.hp);
    state.S.hp+=recovered;
    state.S.res=state.S.maxRes;
    generate();
    say('Étage '+state.S.floor+' · '+currentBiome().name+' · +'+recovered+' PV.')
  }
  finish()
}

function activate(i){
  if(state.mode!=='game'||state.overlayOpen)return;
  i=state.S.bar[i];
  if(!unlocked(i))return;
  let c=CLASSES[state.S.classId],sk=c.skills[i],cost=sk[1];
  if(state.S.cool[i]||state.S.res<cost){
    say('Compétence indisponible.');
    return
  }
  /* TECH-012C — Une compétence directionnelle attend une cible : aucun coût n'est encore prélevé. */
  if(sk[3]==='direction'||sk[3]==='ranged'){
    state.selected=state.selected===i?null:i;
    say(state.selected===null?'Ciblage annulé.':'Choisis une direction sur le pavé.');
    update();
    return
  }
  if(sk[3]==='heal'&&!healingLeft()){
    say('Soins de compétence épuisés pour cet étage.');
    return
  }
  if(sk[3]==='heal'&&state.S.hp===state.S.maxHp){
    say('PV déjà au maximum.');
    return
  }
  state.selected=null;
  state.S.res-=cost;
  /* TECH-012C — Le tour de lancement décrémente aussi la recharge ; ajouter un tour conserve la durée annoncée. */
  state.S.cool[i]=sk[2]+1;
  if(sk[3]==='heal'){
    state.S.healUses=(state.S.healUses||0)+1;
    let n=Math.min(7+state.S.level+talentBonus('heal')+synergyHeal()+2*(state.S.ranks[i]-1)+Math.floor(state.S.attrs[4]/3)+(i===4?5:0),state.S.maxHp-state.S.hp);
    state.S.hp+=n;
    if(i===4&&state.S.classId==='ranger')state.S.res=Math.min(state.S.maxRes,state.S.res+4);
    if(hasSynergy('reserve'))state.S.res=Math.min(state.S.maxRes,state.S.res+2);
    combatFx('heal',n);
    say('Soin : +'+n+' PV.')
  }else if(sk[3]==='guard'){
    state.S.guard=2+state.S.ranks[i]+(i===4?3:0)+talentBonus('guard')+synergyGuard();
    if(i===4&&state.S.classId==='rogue')state.S.veil=3;
    if(state.S.classId==='mage')state.S.shield=Math.max(state.S.shield,4+state.S.ranks[i]*2+(i===4?6:0)+talentBonus('shield')+synergyShield());
    combatFx('guard');
    say('Protection activée.')
  }else{
    state.S.boost=3+state.S.ranks[i];
    say('Prochaine attaque renforcée.')
  }
  finish()
}

function useDirection(dx,dy){
  let i=state.selected;
  state.selected=null;
  let sk=CLASSES[state.S.classId].skills[i],target=null,targets=[];
  if(!unlocked(i)||state.S.cool[i]||state.S.res<sk[1]){
    update();
    return
  }
  if(sk[3]==='direction'){
    let x=state.S.x+dx,y=state.S.y+dy;
    if(stepOK(x,y,state.S.x,state.S.y))target=mob(x,y)
  }else{
    for(let k=1;k<=5;k++){
      let x=state.S.x+dx*k,y=state.S.y+dy*k;
      if(!clear(x,y))break;
      if(!stepOK(x,y,x-dx,y-dy))break;
      let m=mob(x,y);
      if(m){
        targets.push(m);
        target??=m;
        if(!(i===3&&state.S.classId==='ranger'))break
      }
    }
  }
  /* TECH-012C — Une direction sans cible ne dépense ni ressource ni tour. */
  if(!target){
    say('Aucune cible dans cette direction.');
    update();
    return
  }
  state.S.res-=sk[1];
  state.S.cool[i]=sk[2]+1;
  let damage=(sk[3]==='ranged'?5:6)+rand(3)+Math.floor(state.S.level/3)+2*(state.S.ranks[i]-1)+(i===3?4+(state.S.nodes.o2?2:0):0);
  if(state.S.classId==='rogue'&&i===3&&target.hp<=target.maxHp/2)damage+=5;
  hit(target,damage,{skill:true,ranged:sk[3]==='ranged',index:i});
  if(state.monsters.includes(target)){
    if(state.S.classId==='warrior'&&i===3)target.exposed=Math.max(target.exposed||0,synergyDuration('exposed',target));
    if(state.S.classId==='rogue')target.bleed=Math.max(target.bleed||0,synergyDuration('bleed',target));
    if(state.S.classId==='mage'&&i===3)target.stun=Math.max(target.stun||0,synergyDuration('stun',target))
  }
  if(state.S.classId==='ranger'&&i===3)
    for(const m of targets.slice(1))
      if(state.monsters.includes(m))hit(m,Math.max(1,Math.floor(damage/2)),{skill:true,ranged:true,index:i,secondary:true});
  finish(false,true)
}

function bandage(){
  if(state.mode!=='game'||state.overlayOpen||
     state.S.bandages<1||state.S.hp===state.S.maxHp)return;
  state.selected=null;
  state.S.bandages--;
  let n=Math.min(bandageValue(state.S.level)+talentBonus('bandage'),state.S.maxHp-state.S.hp);
  state.S.hp+=n;
  combatFx('heal',n);
  say('Bandage : +'+n+' PV.');
  finish()
}

function weaponFamily(it){
  if(!it||it.slot!=='weapon')return null;
  if(it.family&&Object.hasOwn(WEAPONS,it.family))return it.family;
  return null
}

function currentWeapon(){
  return WEAPONS[weaponFamily(state.S.equip.weapon)]??{name:'Arme classique',range:1,cost:0,power:0,crit:0,desc:'Attaque de contact historique'}
}

function currentStyle(){return STYLES[Object.hasOwn(STYLES,state.S.combatStyle)?state.S.combatStyle:'balanced']}

function basicProfile(target,atRange=false){
  const w=currentWeapon(),style=currentStyle(),family=weaponFamily(state.S.equip.weapon);
  return {...(atRange?{ranged:true}:{}),power:w.power+style.power+(!atRange&&family==='bow'?-1:!atRange&&family==='staff'?-2:0),crit:w.crit-(w.critPenalty||0),pierce:w.pierce||0};
}

function aimedTarget(dx,dy,range){
  if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>1||Math.abs(dy)>1||(!dx&&!dy))return null;
  for(let k=1;k<=range;k++){const x=state.S.x+dx*k,y=state.S.y+dy*k;if(!stepOK(x,y,x-dx,y-dy))break;const m=mob(x,y);if(m)return {m,distance:k}}
  return null;
}

function aimWeapon(){
  if(state.mode!=='game'||state.overlayOpen)return;
  const w=currentWeapon();if(w.range<=1||state.S.res<w.cost){say('Attaque à distance indisponible.');return}
  state.selected=state.selected==='weapon'?null:'weapon';say(state.selected===null?'Ciblage annulé.':'Arme : choisis une direction sur le pavé.');update();
}

function useWeaponDirection(dx,dy){
  state.selected=null;const w=currentWeapon(),t=aimedTarget(dx,dy,w.range);
  if(w.range<=1||!t||state.S.res<w.cost){say('Aucune cible accessible ou ressource insuffisante.');update();return}
  state.S.res-=w.cost;hit(t.m,2+rand(3),basicProfile(t.m,t.distance>1));finish(w.cost>0);
}

function extendedBossReward(m){
 const b=EXTENDED_BOSSES[m.boss];
 return {id:++state.S.serial,slot:b.slot,name:b.relic,atk:b.atk||0,def:b.def||0,crit:b.crit||0,regen:b.regen||0,dodge:b.dodge||0,bossRelic:true,rarity:5,itemLevel:Math.max(1,Math.min(30,state.S.floor)),uniqueId:'boss-'+m.boss,...(b.family?{family:b.family}:{})};
}
 return {move,activate,bandage,aimWeapon,hit,enemyAttack,kill,featureAt,searchNearby,interactFeature,triggerTrap,enterTerrain,collectLoot,enemyPhase,finish,pouchCount,addConsumable,rollConsumable,consumableTargets,canUseConsumable,useConsumable,merchantAvailable,canBuy,buyMerchant,canSell,sellMerchant,eventChoiceAllowed,resolveEvent,specialRoomAllowed,resolveSpecialRoom};
}
module.exports={world};
