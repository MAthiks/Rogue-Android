// GAME-005A: new metadata is additive; legacy items keep their exact stats.
const GEAR_SLOTS={weapon:'Arme',armor:'Armure',ring:'Anneau',helmet:'Casque',boots:'Bottes'};
const RARITIES=[
  {name:'Commun',color:'#c9cbd0'},{name:'Magique',color:'#82cf91'},
  {name:'Rare',color:'#87bbff'},{name:'Épique',color:'#c8a1ff'},
  {name:'Légendaire',color:'#f0b85d'}
];
const GEAR_BASES={weapon:['Lame','Hache','Masse','Dague','Lance','Arc','Bâton'],
  armor:['Cotte','Plastron','Cuirasse'],
  ring:['Anneau','Sceau','Jonc'],
  helmet:['Heaume','Capuche','Casque'],
  boots:['Bottes','Grèves','Bottines']};
// GAME-005B: weapon profiles affect basic attacks, not class skill formulas.
const WEAPONS={
  blade:{name:'Lame',range:1,cost:0,power:1,crit:0,desc:'+1 dégât de base'},
  axe:{name:'Hache',range:1,cost:0,power:2,crit:0,desc:'+2 dégâts, critique moins fréquent',critPenalty:4},
  mace:{name:'Masse',range:1,cost:0,power:0,crit:0,desc:'Ignore 2 points de réduction des élites blindés',pierce:2},
  dagger:{name:'Dague',range:1,cost:0,power:0,crit:10,desc:'+10% critique sur attaque de base'},
  spear:{name:'Lance',range:2,cost:0,power:0,crit:0,desc:'Estoc ciblé à deux cases'},
  bow:{name:'Arc',range:5,cost:2,power:0,crit:2,desc:'Tir ciblé à cinq cases, coût 2, contact −1 dégât'},
  staff:{name:'Bâton',range:4,cost:2,power:1,crit:0,desc:'Projectile ciblé à quatre cases, coût 2, contact −2 dégâts'}
};
const WEAPON_BASE_IDS={Lame:'blade',Hache:'axe',Masse:'mace',Dague:'dagger',Lance:'spear',Arc:'bow','Bâton':'staff'};
const STYLES={
  balanced:{name:'Équilibré',power:0,def:0,desc:'Aucun modificateur'},
  aggressive:{name:'Offensif',power:1,def:-1,desc:'+1 dégât de base, −1 défense'},
  defensive:{name:'Défensif',power:-1,def:1,desc:'−1 dégât de base, +1 défense'}
};
/* TECH-012C — Identifie la famille d'une arme reconnue ; retourne null pour les objets non compatibles. */
function weaponFamily(it){
  if(!it||it.slot!=='weapon')return null;
  if(it.family&&Object.hasOwn(WEAPONS,it.family))return it.family;
  return null
}
/* TECH-012C — Retourne le profil de l'arme équipée ou le profil historique de contact si aucune famille reconnue n'est disponible. */
function currentWeapon(){
  return WEAPONS[weaponFamily(S.equip.weapon)]??{name:'Arme classique',range:1,cost:0,power:0,crit:0,desc:'Attaque de contact historique'}
}
function currentStyle(){return STYLES[Object.hasOwn(STYLES,S.combatStyle)?S.combatStyle:'balanced']}
/* TECH-012C — Combine les propriétés de l'arme et du style de combat pour une attaque de base ; l'arc et le bâton subissent une pénalité au contact. */
function basicProfile(target,atRange=false){
  const w=currentWeapon(),style=currentStyle(),family=weaponFamily(S.equip.weapon);
  return {...(atRange?{ranged:true}:{}),power:w.power+style.power+(!atRange&&family==='bow'?-1:!atRange&&family==='staff'?-2:0),crit:w.crit-(w.critPenalty||0),pierce:w.pierce||0};
}
/* TECH-012C — Parcourt les cases dans la direction demandée jusqu'à la portée maximale. Le premier obstacle arrête la recherche ; le premier ennemi accessible est la cible. */
function aimedTarget(dx,dy,range){
  if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>1||Math.abs(dy)>1||(!dx&&!dy))return null;
  for(let k=1;k<=range;k++){const x=S.x+dx*k,y=S.y+dy*k;if(!stepOK(x,y,x-dx,y-dy))break;const m=mob(x,y);if(m)return {m,distance:k}}
  return null;
}
function aimWeapon(){
  if(mode!=='game'||!overlay.classList.contains('hidden'))return;
  const w=currentWeapon();if(w.range<=1||S.res<w.cost){say('Attaque à distance indisponible.');return}
  selected=selected==='weapon'?null:'weapon';say(selected===null?'Ciblage annulé.':'Arme : choisis une direction sur le pavé.');update();
}
function useWeaponDirection(dx,dy){
  selected=null;const w=currentWeapon(),t=aimedTarget(dx,dy,w.range);
  if(w.range<=1||!t||S.res<w.cost){say('Aucune cible accessible ou ressource insuffisante.');update();return}
  S.res-=w.cost;hit(t.m,2+rand(3),basicProfile(t.m,t.distance>1));finish(w.cost>0);
}