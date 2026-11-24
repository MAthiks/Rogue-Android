'use strict';
// TECH-014A/B — Contrats de simulation indépendants du navigateur.
// Les fonctions reçoivent toutes leurs données explicitement. Aucun accès au
// DOM, à localStorage, à Math.random ou à un état global du jeu.
// Ce module de préparation n'est pas inclus dans l'artefact de production.

// Les deux familles de RNG sont distinctes. Garder les débordements uint32
// et les multiplications basses 32 bits lors de leur transcription GDScript.
function generator(seed,kind){
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Graine uint32 attendue');
  if(!['lcg32','mulberry32'].includes(kind))throw Error('RNG inconnu');
  let state=seed>>>0,draws=0;
  function uint32(){
    draws++;
    if(kind==='lcg32'){
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      return state;
    }
    state=(state+0x6D2B79F5)>>>0;
    let t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return (t^(t>>>14))>>>0;
  }
  return {uint32,integer(n){
    if(!Number.isInteger(n)||n<1||n>0xffffffff)throw Error('Borne RNG invalide');
    return Math.floor(uint32()/4294967296*n);
  },snapshot:()=>({kind,state,draws})};
}

// Une grille contient uniquement des valeurs 0 (libre) et non-zéro (bloquée).
// stepOK reproduit le prédicat historique : le contrôle des deltas -1..1
// relève de la couche Command, pas de ce prédicat.
function geometry(width,height,map){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||map.length!==width*height)throw Error('Grille invalide');
  const idx=(x,y)=>y*width+x;
  const inside=(x,y)=>x>=0&&y>=0&&x<width&&y<height;
  const clear=(x,y)=>inside(x,y)&&map[idx(x,y)]===0;
  function stepOK(x,y,fx,fy){
    if(!clear(x,y))return false;
    const dx=x-fx,dy=y-fy;
    return !(dx&&dy&&(!clear(fx+dx,fy)||!clear(fx,fy+dy)));
  }
  function los(player,x,y){
    const dx=x-player.x,dy=y-player.y;
    if(!inside(x,y)||dx*dx+dy*dy>100)return false;
    const n=Math.max(Math.abs(dx),Math.abs(dy));let px=player.x,py=player.y;
    for(let i=1;i<=n;i++){
      const nx=Math.round(player.x+dx*i/n),ny=Math.round(player.y+dy*i/n);
      if(nx!==px&&ny!==py&&(!clear(nx,py)||!clear(px,ny)))return false;
      if(i<n&&!clear(nx,ny))return false;
      px=nx;py=ny;
    }
    return true;
  }
  // Renvoie une nouvelle mémoire : ne jamais modifier l'état du caller.
  function reveal(player,seen){
    if(seen.length!==map.length)throw Error('Mémoire invalide');
    const result=Array.from(seen);
    for(let y=Math.max(0,Math.ceil(player.y-10));y<=Math.min(height-1,Math.floor(player.y+10));y++)
      for(let x=Math.max(0,Math.ceil(player.x-10));x<=Math.min(width-1,Math.floor(player.x+10));x++)
        if(los(player,x,y))result[idx(x,y)]=1;
    return result;
  }
  return {idx,inside,clear,stepOK,los,reveal};
}

const BALANCE=Object.freeze({critSoft:35,critMax:50,dodgeSoft:25,dodgeMax:35,regenMax:4});
const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
function diminishingChance(raw,soft,max){return Math.max(0,Math.min(max,raw<=soft?raw:soft+Math.floor((raw-soft)/3)))}
function doctrineBonus(s,kind,target=null,profile=null){
  if(!s||s.level<5||!['warrior','rogue','ranger','mage'].includes(s.classId)||!['offense','defense'].includes(s.spec))return 0;
  const low=s.hp*2<=s.maxHp;
  if(s.spec==='offense'&&kind==='damage'){
    if(s.classId==='warrior'&&!profile?.ranged&&low)return 2;
    if(s.classId==='rogue'&&!profile?.ranged&&target?.bleed>0)return 2;
    if(s.classId==='ranger'&&profile?.ranged&&Number.isFinite(target?.x)&&Number.isFinite(target?.y)&&dist(s,target)>=3)return 2;
    if(s.classId==='mage'&&profile?.skill&&s.res*2<=s.maxRes)return 2;
  }
  if(s.spec==='defense'){
    if(kind==='def'&&((s.classId==='warrior'&&s.guard>0)||(s.classId==='ranger'&&low)||(s.classId==='mage'&&s.shield>0)))return 2;
    if(kind==='dodge'&&s.classId==='rogue'&&s.guard>0)return 5;
  }
  return 0;
}
// Ports explicites : l'équipement, les talents et synergies sont calculés
// par leurs propres systèmes. Aucun fallback silencieux si un port manque.
function combat(S,{bonus,talentBonus,weaponFamily,currentStyle,synergyDamage}){
  for(const f of [bonus,talentBonus,weaponFamily,currentStyle,synergyDamage])if(typeof f!=='function')throw Error('Port de combat manquant');
  function criticalChance(profile=null){
    return diminishingChance(3+S.attrs[5]*2+bonus('crit')+(profile?.crit||0)+(S.classId==='rogue'?5:0)+(S.nodes.o2?8:0)+talentBonus('crit'),BALANCE.critSoft,BALANCE.critMax);
  }
  function dodgeChance(){
    return diminishingChance(S.attrs[1]+bonus('dodge')+talentBonus('dodge')+(S.nodes.d2?5:0)+(S.spec==='defense'?5:0)+doctrineBonus(S,'dodge'),BALANCE.dodgeSoft,BALANCE.dodgeMax);
  }
  function attackAttribute(profile=null){
    const fallback=S.classId==='mage'?4:S.classId==='warrior'?0:1;
    if(profile?.skill)return S.attrs[fallback];
    const family=weaponFamily(S.equip.weapon);
    if(family==='spear')return Math.max(S.attrs[0],S.attrs[1]);
    const index={blade:0,axe:0,mace:0,dagger:1,bow:1,staff:4}[family];
    return S.attrs[index??fallback];
  }
  function outgoingDamage(m,damage,profile=null,critical=false){
    let d=Math.max(1,damage+(profile?.power||0)+S.atk+bonus('atk')+Math.floor(attackAttribute(profile)/4)+(S.boost>0?3:0));
    if(S.spec==='offense')d+=2;
    if(m.exposed>0)d+=2;
    if(S.nodes.o1)d++;
    if(S.nodes.master)d+=2;
    d+=talentBonus(profile?.skill?'skill':'basic')+(profile?.ranged?talentBonus('ranged'):0)+(m.hp*2<=m.maxHp?talentBonus('lowHp'):0);
    d+=doctrineBonus(S,'damage',m,profile)+synergyDamage(m,profile);
    if(critical)d=Math.ceil(d*1.5);
    if(m.affix==='armored')d=Math.max(1,d-Math.max(0,2-(profile?.pierce||0)));
    return d;
  }
  function incomingDamage(m,power=0,variance=0){
    const raw=m.atk+power+(m.affix==='furious'&&m.hp*2<=m.maxHp?2:0)+variance;
    const reduction=S.armor+bonus('def')+currentStyle().def+talentBonus('def')+Math.floor(S.attrs[2]/6)+(S.guard>0?2:0)+(S.spec==='defense'?1:0)+(S.nodes.d1?1:0)+doctrineBonus(S,'def');
    const minimum=S.floor>=7?Math.ceil(raw*(m.boss||m.elite?0.30:0.20)):1;
    return Math.max(1,minimum,raw-reduction);
  }
  function resourceRegen(rangedWeapon=false,offensiveSkill=false){
    if(rangedWeapon)return 1;
    return Math.min(offensiveSkill?2:BALANCE.regenMax,1+(S.classId==='rogue'&&S.turn%2===0?1:0)+Math.min(2,Math.floor(S.attrs[3]/12))+Math.min(2,bonus('regen'))+(S.nodes.master?1:0));
  }
  return {criticalChance,dodgeChance,attackAttribute,outgoingDamage,incomingDamage,resourceRegen};
}
module.exports={generator,geometry,BALANCE,dist,diminishingChance,doctrineBonus,combat};
