'use strict';
// Campagnes longues : exclusivement des commandes réellement disponibles.
// Le pilote est omniscient sur la carte (test technique), pas sur les tirages.
const {CLASSES_IDS,createSession,route,record,digest}=require('./reference.cjs');
const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
const score=i=>i?i.atk*3+i.def*3+i.crit*.25+i.dodge*.3+i.regen*2:0;
const inv=(kind,id,value)=>({type:'inventory',kind,id,...(value===undefined?{}:{value})});
function longCampaign(html,id,seed,budget=2500){
 const s=createSession(html,seed);s.start(id);
 const initialState=s.snapshot(),catalog=s.catalogs(),commands=[],trace=[record(s)];
 let reason='budget',stuck=0,lastTurn=0,pending=null,lastProgress=0,lastKills=0,lastFloor=1;
 const blocked=new Set();
 function execute(c){
  const before=s.snapshot(),after=s.action(c);
  commands.push(c);trace.push(record(s));
  if(after.S.floor!==before.S.floor)blocked.clear();
  const p=after.S;
  if(!p.dead&&!p.ended){
   if(!(p.hp>0&&p.hp<=p.maxHp&&p.res>=0&&p.res<=p.maxRes&&p.floor>=1&&p.floor<=30&&p.bag.length<=24))throw Error('Bornes de campagne');
   const ids=[...p.bag,...Object.values(p.equip).filter(Boolean),...after.loot.filter(l=>l.kind==='gear'&&l.item).map(l=>l.item)].map(it=>it.id);
   if(new Set(ids).size!==ids.length||ids.some(i=>!Number.isInteger(i)||i>p.serial))throw Error('Identité équipement');
  }
  return after;
 }
 while(commands.length<budget){
  const d=s.snapshot(),p=d.S;
  if(p.dead||p.ended){reason=p.ended||'death';break}
  let cmd;
  if(d.overlayOpen){
   if(pending&&['event','specialRoom'].includes(pending.type)){
    const choices=[...((pending.type==='event'?catalog.EXPLORATION_EVENTS[pending.eventId]:catalog.SPECIAL_ROOMS[pending.roomId])?.choices||[])];
    if(pending.type==='event')choices.push(['skip']);
    let resolved=false;
    for(const [choice] of choices){
     const c={type:pending.type==='event'?'event':'room',x:pending.x,y:pending.y,choice};
     try{execute(c);resolved=true;break}catch(e){if(e.message!=='Choix invalide')throw e}
    }
    if(!resolved){blocked.add(pending.x+','+pending.y);execute({type:'close'})}
    pending=null;continue;
   }
   execute({type:'close'});pending=null;continue;
  }
  const enemies=d.monsters.filter(m=>s.visible(m.x,m.y)).sort((a,b)=>dist(a,p)-dist(b,p));
  if(p.kills!==lastKills||p.floor!==lastFloor){lastProgress=p.turn;lastKills=p.kills;lastFloor=p.floor}
  // Après une longue poursuite stérile, privilégier la sortie (ou le boss
  // obligatoire). Le combat adjacent reste prioritaire.
  const boss=d.monsters.find(m=>m.boss);
  const pursuing=p.turn-lastProgress<45;
  const target=pursuing?enemies[0]:enemies.find(m=>dist(m,p)===1)||enemies.find(m=>m.boss);
  const skill=catalog.CLASSES[id].skills;
  const heal=p.bar.findIndex(i=>skill[i][3]==='heal'&&!p.cool[i]&&p.res>=skill[i][1]);
  const threats=enemies.flatMap(m=>m.intent?.cells||(m.aim?[m.aim]:[]));
  const same=(a,b)=>a.x===b.x&&a.y===b.y;
  const goal=target||boss||d.stairs;
  // Éviter une oscillation entre deux cases face aux archers : une esquive
  // ordinaire doit aussi rapprocher du but ; les annonces de boss priment.
  const bossThreat=enemies.some(m=>m.boss&&m.intent?.cells.some(t=>same(t,p)));
  const dodge=(pursuing||bossThreat)&&threats.some(t=>same(t,p))&&dirs.filter(([dx,dy])=>{const q={x:p.x+dx,y:p.y+dy};return (bossThreat||dist(q,goal)<dist(p,goal))&&!threats.some(t=>same(t,q))&&!d.monsters.some(t=>same(t,q))&&!d.features.some(f=>same(f,q)&&!f.spent)&&d.map[q.y*48+q.x]===0&&(!dx||!dy||(d.map[p.y*48+q.x]===0&&d.map[q.y*48+p.x]===0))}).sort((a,b)=>dist({x:p.x+a[0],y:p.y+a[1]},goal)-dist({x:p.x+b[0],y:p.y+b[1]},goal))[0];
  if(d.selected!==null){
   cmd=target?{type:'move',dx:Math.sign(target.x-p.x),dy:Math.sign(target.y-p.y)}:{type:'wait'};
  }else if(dodge)cmd={type:'move',dx:dodge[0],dy:dodge[1]};
  else if(p.hp*2<p.maxHp&&heal>=0&&(p.healUses??0)<3)cmd={type:'skill',slot:heal};
  else if(p.hp*2<p.maxHp&&(p.pouch?.heal||0)>0)cmd={type:'consume',id:'heal'};
  else if(p.hp*2<p.maxHp&&p.bandages>0)cmd={type:'bandage'};
  else if(p.level>=5&&!p.spec)cmd=inv('spec','offense');
  else if(p.ap>0)cmd=inv('attr',p.ap%2===0?2:id==='warrior'?0:id==='mage'?4:1);
  else {
   const upgrade=p.bag.find(it=>score(it)>score(p.equip[it.slot]));
   if(upgrade)cmd=inv('equip',upgrade.id);
   else if(p.bag.length>=23){const drop=p.bag.find(it=>!it.bossRelic);if(drop)cmd=inv('drop',drop.id)}
   if(!cmd&&p.points>0){
    const basic=[['o1',2,[]],['o2',5,['o1']],['d1',2,[]],['d2',5,['d1']],['master',10,['o2','d2']]];
    const n=basic.findIndex(([k,l,req])=>p.level>=l&&!p.nodes[k]&&req.every(x=>p.nodes[x]));
    if(n>=0)cmd=inv('node',n);
    else if(!p.activeTalents[3]&&p.level>=5&&p.nodes.o1)cmd=inv('learn',3);
    else if(p.activeTalents[3]&&!p.bar.includes(3))cmd=inv('bar',2,3);
    else{
     const adv=catalog.ADV_TALENTS[id].find(n=>p.level>=n[2]&&!p.nodes['adv_'+n[0]]&&(!n[3]||p.spec===n[3])&&(p.nodes[n[4]]||p.nodes['adv_'+n[4]]));
     const syn=catalog.SYNERGIES[id].find(n=>p.level>=n[2]&&p.spec===n[3]&&!p.nodes['syn_'+n[0]]&&p.nodes[n[4]]);
     if(adv)cmd=inv('advanced',adv[0]);else if(syn)cmd=inv('synergy',syn[0]);
     else if(p.ranks[0]<5&&p.level>=p.ranks[0]*2)cmd=inv('rank',0);
    }
   }
   if(!cmd&&target){
    const aligned=target.x===p.x||target.y===p.y||Math.abs(target.x-p.x)===Math.abs(target.y-p.y);
    const k=[3,0].find(i=>p.bar.includes(i)&&!p.cool[i]&&p.res>=skill[i][1]&&(skill[i][3]==='ranged'?aligned&&dist(target,p)<=5:dist(target,p)===1));
    if(k!==undefined)cmd={type:'skill',slot:p.bar.indexOf(k)};
   }
   if(!cmd){
    // Écarte les salles momentanément inutilisables du plan de recherche.
    const routed={...d,features:d.features.map(f=>blocked.has(f.x+','+f.y)?{...f,type:'merchant'}:f)};
    cmd=route(routed,goal);
    if(!cmd)cmd={type:'wait'};
   }
  }
  if(cmd.type==='move'&&d.selected===null)pending=d.features.find(f=>f.x===p.x+cmd.dx&&f.y===p.y+cmd.dy&&!f.spent)||null;
  const after=execute(cmd),changed=after.S.turn!==lastTurn;lastTurn=after.S.turn;
  // Une transaction sans tour doit changer l'état ; une série de commandes
  // stériles ne doit pas être prise pour une progression.
  const prev=trace[trace.length-2];stuck=changed||prev.stateHash!==trace[trace.length-1].stateHash?0:stuck+1;
  if(stuck>=20){reason='policy-stall';break}
  if(after.S.dead||after.S.ended){reason=after.S.ended||'death';break}
 }
 return {id,seed,budget,reason,commands,trace,initialState,finalState:s.snapshot(),final:record(s),history:s.history()};
}
module.exports={longCampaign};
