/* TECH-012A — Enregistre la partie active et les données du donjon dans le stockage local. Une partie morte ou terminée ne doit pas redevenir une sauvegarde reprenable. */
function save(){
  if(S&&!S.dead&&!S.ended){
    try{
      localStorage.setItem(KEY,JSON.stringify({S,map,seen,monsters,loot,stairs,features,terrain}))
    }catch(e){
      say('Sauvegarde indisponible.')
    }
  }
}
/* TECH-012A — Vérifie les données persistées avant de restaurer le donjon et le personnage. Retourne false si la sauvegarde est absente ou invalide, puis applique la migration si elle est valide. */
function restore(){
  clearCombatFx();
  S=null;
  selected=null;
  try{
    let d=JSON.parse(localStorage.getItem(KEY));
    if(!d||!Object.hasOwn(CLASSES,d.S?.classId)||d.S.dead||d.S.ended||
       d.map.length!==W*H||d.seen.length!==W*H||
       !Array.isArray(d.monsters)||!Array.isArray(d.loot)||!d.stairs)return false;
    ({S,map,seen,monsters,loot,stairs}=d);
    features=Array.isArray(d.features)?d.features:[];
    terrain=Array.isArray(d.terrain)?d.terrain:[];
    migrate();
    return true
  }catch(e){
    S=null;
    selected=null;
    return false
  }
}
const ATTR=['Force','Dextérité','Constitution','Volonté','Intelligence','Perception'];
const BASE={warrior:[4,2,4,2,1,2],rogue:[2,4,2,2,1,4],ranger:[2,4,2,3,1,4],mage:[1,2,2,4,4,2]};
/* TECH-012A — Complète les champs absents des anciennes sauvegardes et remet en état la barre de compétences. Le compteur d'objets doit rester au moins égal aux identifiants déjà attribués. */
function migrate(){
  S.attrs??=[...BASE[S.classId]];
  S.ap??=0;
  S.ranks??=[1,1,1];
  S.bag??=[];
  S.equip??={weapon:null,armor:null,ring:null};
  S.serial??=0;
  S.spec??=null;
  S.nodes??={};
  S.activeTalents??={};
  S.veil??=0;
  S.shield??=0;
  S.bar??=[0,1,2];
  if(!Array.isArray(S.bar)||S.bar.length!==3||
     new Set(S.bar).size!==3||
     S.bar.some(i=>!Number.isInteger(i)||i<0||i>4||!unlocked(i)))S.bar=[0,1,2];
  while(S.cool.length<5)S.cool.push(0);
  while(S.ranks.length<5)S.ranks.push(1);
  S.equip.helmet??=null;
  S.equip.boots??=null;
  /* TECH-012C — Préserver l'unicité des identifiants d'objets après migration. */
  S.serial=Math.max(S.serial,
    ...S.bag.map(i=>i.id||0),
    ...Object.values(S.equip).map(i=>i?.id||0),
    ...loot.map(l=>l.item?.id||0))
}