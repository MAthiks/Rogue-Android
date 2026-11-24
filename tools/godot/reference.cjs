'use strict';
// TECH-014A-D : adaptateur de référence hors ligne, réservé aux outils Node.
// Le moteur historique n'est ni réécrit ni chargé dans le navigateur par cet outil.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const BASE='952af81a872f3e0e584c251b54d2206eacaed4ec';
const KEY='rogue-android-game002-v1';
const CLASSES_IDS=['warrior','rogue','ranger','mage'];
const root=path.resolve(__dirname,'../..');

// Même LCG que les tests GAME-010E et GAME-011B. Les PRNG locaux du jeu
// (donjon, décoration, etc.) restent inchangés. L'état RNG est externe aux saves.
function rng32(seed){
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Graine uint32 attendue');
  let state=seed>>>0,draws=0;
  return {next(){state=(Math.imul(state,1664525)+1013904223)>>>0;draws++;return state/4294967296},
    snapshot(){return {state,draws}}};
}
const clone=value=>JSON.parse(JSON.stringify(value));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Plateforme minimale et isolée par session, suivant le banc GAME-011B.
// Aucun stockage réel, aucun DOM de navigateur, aucune publication.
function createSession(html,seed){
  const rng=rng32(seed),math=Object.create(Math);math.random=()=>rng.next();
  const nodes=new Map(),storage=new Map(),ctx={fillRect(){},strokeRect(){}};
  function element(id){
    if(!nodes.has(id)){
      const classes=new Set();
      nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},
        classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),
          toggle(v,on){if(on===undefined)on=!classes.has(v);if(on)classes.add(v);else classes.delete(v);return on}},
        getContext:()=>ctx,parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,
        querySelectorAll:()=>[],addEventListener(){}});
    }
    return nodes.get(id);
  }
  const document={getElementById:element,querySelectorAll:()=>[],documentElement:element('html'),addEventListener(){}};
  const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const source=scripts[0]?.[1];
  const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
  if(!source||source.split(marker).length!==2)throw Error('Contrat de démarrage du moteur modifié');
  // L'instrumentation se fait uniquement en mémoire. Ne jamais écrire ce script dans index.html.
  const hook=source.slice(0,source.indexOf(marker))+ 
    'return {newGame,move,activate,bandage,finish,hide,los,stepOK,canUseConsumable,useConsumable,healingLeft,save,restore,readHistory,buildDungeon,'+
    'eventChoiceAllowed,resolveEvent,specialRoomAllowed,resolveSpecialRoom,EXPLORATION_EVENTS,SPECIAL_ROOMS,'+
    'resume:()=>{mode="game";hide()},state:()=>({S,map,seen,monsters,loot,stairs,features,terrain,selected,mode,messages,overlayOpen:!overlay.classList.contains("hidden")}),'+
    'catalogs:()=>({CLASSES,ATTR,BASE,GEAR_SLOTS,RARITIES,GEAR_BASES,WEAPONS,WEAPON_BASE_IDS,STYLES,ADV_TALENTS,SYNERGIES,CONSUMABLES,POUCH_CAP,EXPLORATION_EVENTS,RARE_ENCOUNTERS,DOCTRINES,BALANCE,GEAR_SETS,UNIQUES,BESTIARY,CREATURE_POWERS,EXTENDED_BOSSES,MERCHANTS,GOLD_CAP,SPECIAL_ROOMS,BIOMES,AI_FAMILY,BOSS_PHASE_PATTERN,'+
    'AFFIXES:AFFIXES.map(({value,...meta})=>({...meta,valuesByGrade:[1,2,3,4].map(g=>value(g))}))})};})();';
  const engine=vm.runInNewContext(hook,{document,localStorage,window:{},innerHeight:800,ResizeObserver:undefined,Math:math},{timeout:5000});
  const snapshot=()=>clone(engine.state());
  function action(command){
    const {type}=command;
    if(type==='move'){
      const {dx,dy}=command;
      if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>1||Math.abs(dy)>1||(!dx&&!dy))throw Error('Direction invalide');
      engine.move(dx,dy);
    }else if(type==='skill'){
      if(!Number.isInteger(command.slot)||command.slot<0||command.slot>2)throw Error('Emplacement invalide');
      engine.activate(command.slot);
    }else if(type==='bandage')engine.bandage();
    else if(type==='heal')engine.useConsumable('heal');
    else if(type==='event'||type==='room'){
      const f=engine.state().features.find(v=>v.x===command.x&&v.y===command.y);
      const event=type==='event';
      if(overlay.classList.contains('hidden')||!f||f.type!==(event?'event':'specialRoom')||!(event?engine.eventChoiceAllowed:engine.specialRoomAllowed)(f,command.choice))throw Error('Choix invalide');
      (event?engine.resolveEvent:engine.resolveSpecialRoom)(f,command.choice);
    }else if(type==='reload'){
      engine.save();if(!engine.restore())throw Error('Restauration impossible');engine.resume();
    }else throw Error('Commande inconnue : '+type);
    return snapshot();
  }
  function start(id){
    if(!CLASSES_IDS.includes(id))throw Error('Classe inconnue');
    engine.newGame(id);return snapshot();
  }
  return {start,action,snapshot,randomState:rng.snapshot,
    catalogs:()=>clone(engine.catalogs()),history:()=>clone(engine.readHistory()),
    saveData:()=>storage.has(KEY)?JSON.parse(storage.get(KEY)):null,
    // Requête pure sur la carte et la géométrie, sans références mutables exposées.
    visible:(x,y)=>engine.los(x,y),
    dungeon:(floor,seed)=>clone(engine.buildDungeon(48,32,floor,seed))};
}

function catalogDocument(session){
  return {schema:'cryptgrave-catalog-v1',reference:BASE,
    grid:{width:48,height:32,directions:8,sourceTilePixels:16,targetTilePixels:32},
    affixGrades:[1,2,3,4],catalogs:session.catalogs()};
}
function record(session){
  const state=session.snapshot();
  return {stateHash:digest(state),rng:session.randomState(),turn:state.S.turn,floor:state.S.floor,
    hp:state.S.hp,outcome:state.S.ended||(state.S.dead?'death':null)};
}

// Parcours de référence : la stratégie peut connaître le plan complet (banc de test,
// pas un joueur humain). Aucun téléport, gain artificiel ou suppression d'ennemis.
const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const key=p=>p.y*48+p.x;
function route(d,target){
  const start=key(d.S),goal=key(target),q=[start],prev=new Map([[start,null]]);
  for(let i=0;i<q.length;i++){
    const n=q[i];if(n===goal)break;
    const x=n%48,y=Math.floor(n/48);
    for(const [dx,dy] of dirs){
      const nx=x+dx,ny=y+dy,k=ny*48+nx;
      if(nx<=0||nx>=47||ny<=0||ny>=31||prev.has(k))continue;
      const f=d.features.find(f=>key(f)===k);
      if(f?.type==='merchant'||(f?.type==='secret'&&!f.open))continue;
      if(d.map[k]!==0&&f?.type!=='door')continue;
      if(dx&&dy&&(d.map[y*48+nx]!==0||d.map[ny*48+x]!==0))continue;
      prev.set(k,n);q.push(k);
    }
  }
  if(!prev.has(goal)||goal===start)return null;
  let n=goal;while(prev.get(n)!==start)n=prev.get(n);
  return {type:'move',dx:n%48-d.S.x,dy:Math.floor(n/48)-d.S.y};
}
function campaign(html,id,seed,budget=400){
  const s=createSession(html,seed);s.start(id);
  const initialState=s.snapshot(),catalogs=s.catalogs(),trace=[record(s)],commands=[];
  let stuck=0,reason='budget',last=s.snapshot().S.turn;
  while(commands.length<budget){
    const d=s.snapshot(),p=d.S;
    if(p.dead||p.ended){reason=p.ended||'death';break}
    const visible=d.monsters.filter(m=>s.visible(m.x,m.y)).sort((a,b)=>dist(a,p)-dist(b,p));
    const target=visible[0];
    const heal=p.bar.findIndex(i=>catalogs.CLASSES[id].skills[i][3]==='heal'&&!p.cool[i]&&p.res>=catalogs.CLASSES[id].skills[i][1]);
    let cmd;
    if(!d.selected&&p.hp*2<p.maxHp&&heal>=0&&(p.healUses??0)<3)cmd={type:'skill',slot:heal};
    else if(d.selected===null&&p.hp*2<p.maxHp&&p.bandages>0)cmd={type:'bandage'};
    else{
      const aligned=target&&(target.x===p.x||target.y===p.y||Math.abs(target.x-p.x)===Math.abs(target.y-p.y));
      const skill=p.bar[0],spec=catalogs.CLASSES[id].skills[skill];
      if(target&&p.cool[skill]===0&&p.res>=spec[1]&&((spec[3]==='ranged'&&aligned&&dist(target,p)<=5)||(spec[3]==='direction'&&dist(target,p)===1))&&d.selected===null)
        cmd={type:'skill',slot:0};
      else cmd=route(d,target||d.monsters.find(m=>m.boss)||d.stairs);
    }
    if(!cmd){reason='no-route';break}
    // Si un déplacement ouvre une interaction, le prochain choix est explicite.
    const f=cmd.type==='move'?d.features.find(v=>v.x===p.x+cmd.dx&&v.y===p.y+cmd.dy):null;
    s.action(cmd);commands.push(cmd);trace.push(record(s));
    if(d.selected===null&&f&&!f.spent&&['event','specialRoom'].includes(f.type)&&commands.length<budget){
      const next=s.snapshot();
      if(next.overlayOpen&&!next.S.dead&&!next.S.ended){
        const choices=[...((f.type==='event'?catalogs.EXPLORATION_EVENTS[f.eventId]:catalogs.SPECIAL_ROOMS[f.roomId])?.choices||[])];
        if(f.type==='event')choices.push(['skip']);
        // Les choix indisponibles ne consomment aucune action de simulation.
        for(const [choice] of choices){
          const c={type:f.type==='event'?'event':'room',x:f.x,y:f.y,choice};
          try{s.action(c);commands.push(c);trace.push(record(s));break}catch(e){if(e.message!=='Choix invalide')throw e}
        }
      }
    }
    const now=s.snapshot().S;
    stuck=now.turn===last?stuck+1:0;last=now.turn;
    if(now.dead||now.ended){reason=now.ended||'death';break}
    if(stuck>=20){reason='policy-stall';break}
  }
  return {id,seed,reason,commands,trace,initialState,finalState:s.snapshot(),final:record(s),history:s.history()};
}

function referencePack(html){
  const session=createSession(html,0);
  const layouts=[1,6,15,30].flatMap(floor=>[0,1,4294967295].map(seed=>({floor,seed,hash:digest(session.dungeon(floor,seed)),data:session.dungeon(floor,seed)})));
  const campaigns=CLASSES_IDS.map((id,i)=>campaign(html,id,1234567+i*104729));
  return {schema:'cryptgrave-reference-v1',reference:BASE,catalog:catalogDocument(session),layouts,campaigns};
}
if(require.main===module){
  const mode=process.argv[2],input=process.argv[3]||path.join(root,'index.html'),output=process.argv[4];
  if(!output||!['catalog','reference'].includes(mode))throw Error('Usage: node tools/godot/reference.cjs catalog|reference index.html sortie.json');
  const html=fs.readFileSync(input,'utf8');
  const data=mode==='catalog'?catalogDocument(createSession(html,0)):referencePack(html);
  fs.writeFileSync(output,JSON.stringify(data,null,2)+'\n');
}
module.exports={BASE,CLASSES_IDS,rng32,createSession,catalogDocument,digest,campaign,referencePack};
