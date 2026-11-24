// GAME-005F: shared combat formulas, displayed by the character screen.
// GAME-010A: class-specific specialization doctrines; derived exclusively from existing state.
const DOCTRINES={
 warrior:{offense:'Fureur : +2 dégâts de contact à mi-vie ou moins.',defense:'Rempart : +2 réduction des dégâts pendant la garde.'},
 rogue:{offense:'Lame sanglante : +2 dégâts de contact sur une cible qui saigne.',defense:'Jeu de jambes : +5 points d’esquive pendant la garde (plafond conservé).'},
 ranger:{offense:'Longue portée : +2 dégâts à distance à partir de 3 cases.',defense:'Instinct : +2 réduction des dégâts à mi-vie ou moins.'},
 mage:{offense:'Dernières réserves : +2 dégâts de compétence à moitié de mana ou moins (après coût).',defense:'Voile protecteur : +2 réduction des dégâts tant que la barrière absorbe encore.'}
};
function doctrineDescription(id,spec){return DOCTRINES[id]?.[spec]||''}
function doctrineBonus(s,kind,target=null,profile=null){
 if(!s||s.level<5||!doctrineDescription(s.classId,s.spec))return 0;
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
/* TECH-012C — Seuils de rendement décroissant et plafonds des probabilités de critique, d'esquive et de régénération. */
const BALANCE={critSoft:35,critMax:50,dodgeSoft:25,dodgeMax:35,regenMax:4};
/* TECH-012C — Au-delà du seuil souple, chaque tranche de trois points bruts apporte un point de probabilité, dans la limite du plafond. */
function diminishingChance(raw,soft,max){return Math.max(0,Math.min(max,raw<=soft?raw:soft+Math.floor((raw-soft)/3)))}
/* TECH-012C — Calcule la probabilité de critique en combinant perception, équipement, classe, profil d'attaque et talents. */
function criticalChance(profile=null){
  return diminishingChance(3+S.attrs[5]*2+bonus('crit')+(profile?.crit||0)+(S.classId==='rogue'?5:0)+(S.nodes.o2?8:0)+talentBonus('crit'),BALANCE.critSoft,BALANCE.critMax)
}
/* TECH-012C — Calcule la probabilité d'esquive en combinant dextérité, équipement, talents et spécialisation. */
function dodgeChance(){
  return diminishingChance(S.attrs[1]+bonus('dodge')+talentBonus('dodge')+(S.nodes.d2?5:0)+(S.spec==='defense'?5:0)+doctrineBonus(S,'dodge'),BALANCE.dodgeSoft,BALANCE.dodgeMax)
}
/* TECH-012C — Sélectionne l'attribut offensif approprié à la compétence ou à l'arme ; la lance utilise le meilleur de Force et Dextérité. */
function attackAttribute(profile=null){
 const fallback=S.classId==='mage'?4:S.classId==='warrior'?0:1;
 if(profile?.skill)return S.attrs[fallback];
 const family=weaponFamily(S.equip.weapon);
 if(family==='spear')return Math.max(S.attrs[0],S.attrs[1]);
 const index={blade:0,axe:0,mace:0,dagger:1,bow:1,staff:4}[family];
 return S.attrs[index??fallback];
}
/* TECH-012A — Calcule les dégâts du joueur en combinant arme, attribut, équipement, talents et effets contextuels. Applique ensuite le critique puis la protection de l'affixe armored. */
function outgoingDamage(m,damage,profile=null,critical=false){
 let d=Math.max(1,damage+(profile?.power||0)+S.atk+bonus('atk')+Math.floor(attackAttribute(profile)/4)+(S.boost>0?3:0));
 if(S.spec==='offense')d+=2;
 if(m.exposed>0)d+=2;
 if(S.nodes.o1)d++;
 if(S.nodes.master)d+=2;
 d+=talentBonus(profile?.skill?'skill':'basic')+(profile?.ranged?talentBonus('ranged'):0)+(m.hp*2<=m.maxHp?talentBonus('lowHp'):0);
 d+=doctrineBonus(S,'damage',m,profile)+synergyDamage(m,profile);
 /* TECH-012C — Le critique multiplie les dégâts par 1,5 avant la réduction de l'affixe blindé. */
 if(critical)d=Math.ceil(d*1.5);
 if(m.affix==='armored')d=Math.max(1,d-Math.max(0,2-(profile?.pierce||0)));
 return d;
}
/* TECH-012A — Calcule les dégâts subis après réduction défensive. À partir de l'étage 7, une fraction minimale des dégâts bruts empêche l'armure de neutraliser totalement les attaques. */
function incomingDamage(m,power=0,variance=0){
 const raw=m.atk+power+(m.affix==='furious'&&m.hp*2<=m.maxHp?2:0)+variance;
 const reduction=S.armor+bonus('def')+currentStyle().def+
   talentBonus('def')+Math.floor(S.attrs[2]/6)+(S.guard>0?2:0)+
   (S.spec==='defense'?1:0)+(S.nodes.d1?1:0)+doctrineBonus(S,'def');
 // Above early floors, armor alone cannot nullify heavy strikes; shields still absorb damage.
 const minimum=S.floor>=7?Math.ceil(raw*(m.boss||m.elite?0.30:0.20)):1;
 return Math.max(1,minimum,raw-reduction);
}
/* TECH-012C — Régénération par tour : les attaques à distance payantes et compétences offensives ont des plafonds propres. */
function resourceRegen(rangedWeapon=false,offensiveSkill=false){
 if(rangedWeapon)return 1;
 return Math.min(offensiveSkill?2:BALANCE.regenMax,1+(S.classId==='rogue'&&S.turn%2===0?1:0)+Math.min(2,Math.floor(S.attrs[3]/12))+Math.min(2,bonus('regen'))+(S.nodes.master?1:0));
}
function combatSummary(){
 return '<p class="tiny">Combat effectif : critique '+criticalChance()+'% · esquive '+dodgeChance()+'% · régénération '+resourceRegen(false)+'/tour (tir payant : 1). Compétence offensive : régénération plafonnée à 2. Attribut d’arme '+attackAttribute()+' · rendement décroissant au-delà de 35% critique et 25% esquive.</p>';
}