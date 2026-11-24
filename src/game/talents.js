// GAME-005C: additive talent IDs; old nodes and points never reset.
const ADV_TALENTS={
 warrior:[
 ['vigor','Endurance de fer',8,'','o1',{basic:1},'+1 dégât de base'],
 ['resolve','Ténacité',8,'','d1',{guard:1},'+1 tour de garde'],
 ['frenzy','Rage maîtrisée',12,'offense','vigor',{skill:2},'+2 dégâts de compétence'],
 ['execution','Frappe du colosse',20,'offense','frenzy',{crit:5,lowHp:2},'+5% critique, +2 dégâts sur cible à mi-vie'],
 ['bulwark','Rempart',12,'defense','resolve',{def:1},'+1 défense'],
 ['laststand','Dernier rempart',20,'defense','bulwark',{def:1,guard:1},'+1 défense, +1 tour de garde']
 ],
 rogue:[
 ['vigor','Lame silencieuse',8,'','o1',{crit:4},'+4% critique'],
 ['resolve','Agilité',8,'','d1',{dodge:3},'+3% esquive'],
 ['frenzy','Poison de lame',12,'offense','vigor',{basic:1,bleed:2},'+1 dégât de base, saignement 2 tours sur critique'],
 ['execution','Frappe fatale',20,'offense','frenzy',{lowHp:3,crit:4},'+3 dégâts sur cible à mi-vie, +4% critique'],
 ['bulwark','Riposte agile',12,'defense','resolve',{basic:1,dodge:2},'+1 dégât de base, +2% esquive'],
 ['laststand','Fantôme',20,'defense','bulwark',{dodge:4,guard:1},'+4% esquive, +1 tour de garde']
 ],
 ranger:[
 ['vigor','Précision du pisteur',8,'','o1',{ranged:1},'+1 dégât à distance'],
 ['resolve','Instinct de survie',8,'','d1',{heal:2},'+2 PV par compétence de soin'],
 ['frenzy','Tir chirurgical',12,'offense','vigor',{ranged:2},'+2 dégâts à distance'],
 ['execution','Œil du faucon',20,'offense','frenzy',{crit:5,ranged:1},'+5% critique, +1 dégât à distance'],
 ['bulwark','Herboriste',12,'defense','resolve',{heal:3,bandage:2},'+3 PV de soin, +2 PV par bandage'],
 ['laststand','Survivant aguerri',20,'defense','bulwark',{def:1,heal:2},'+1 défense, +2 PV de soin']
 ],
 mage:[
 ['vigor','Flux arcanique',8,'','o1',{skill:1},'+1 dégât de compétence'],
 ['resolve','Concentration',8,'','d1',{shield:2},'+2 absorption de barrière'],
 ['frenzy','Surcharge mystique',12,'offense','vigor',{skill:2},'+2 dégâts de compétence'],
 ['execution','Maître du flux',20,'offense','frenzy',{skill:1,crit:5},'+1 dégât de compétence, +5% critique'],
 ['bulwark','Égide renforcée',12,'defense','resolve',{shield:3},'+3 absorption de barrière'],
 ['laststand','Gardien du voile',20,'defense','bulwark',{shield:3,def:1},'+3 absorption, +1 défense']
 ]
};
function advancedTalents(){return ADV_TALENTS[S.classId]||[]}
/* TECH-012C — Vérifie niveau, points disponibles, spécialisation, absence d'achat antérieur et prérequis. */
function canLearnAdvanced(id){
  const n=advancedTalents().find(n=>n[0]===id);
  return !!(n&&S.points>0&&!S.nodes['adv_'+id]&&
    S.level>=n[2]&&(!n[3]||S.spec===n[3])&&
    (S.nodes[n[4]]||S.nodes['adv_'+n[4]]))
}
function learnAdvanced(id){
  if(!canLearnAdvanced(id))return false;
  S.points--;
  S.nodes['adv_'+id]=true;
  return true
}
/* TECH-012C — Additionne les bonus de la statistique k issus des talents avancés acquis et compatibles avec la spécialisation. */
function talentBonus(k){
  return advancedTalents().reduce((sum,n)=>sum+(S.nodes['adv_'+n[0]]&&(!n[3]||S.spec===n[3])?(n[5][k]||0):0),0)
}
function advancedTalentUI(refresh){
 const el=document.createElement('section'),nodes=advancedTalents();
 el.innerHTML='<h2>Talents avancés</h2><p>1 point par talent. Spécialisation définitive au niveau 5 ; maîtrises aux niveaux 12 et 20.</p>'+[['','Fondamentaux'],['offense',SPECS[S.classId][0]],['defense',SPECS[S.classId][1]]].map(([spec,name])=>'<h3>'+name+'</h3><div class="classes">'+nodes.filter(n=>n[3]===spec).map(n=>'<button data-advanced="'+n[0]+'" '+(canLearnAdvanced(n[0])?'':'disabled')+'>'+n[1]+'<small>'+n[6]+' · Niv. '+n[2]+' · '+(S.nodes['adv_'+n[0]]?'Acquis':spec&&S.spec!==spec?'Spécialisation requise':('Prérequis : '+(nodes.find(x=>x[0]===n[4])?.[1]||(n[4]==='o1'?'Talent offensif initial':'Talent défensif initial'))))+'</small></button>').join('')+'</div>').join('');
 el.querySelectorAll('[data-advanced]').forEach(b=>b.onclick=()=>{if(learnAdvanced(b.dataset.advanced))refresh()});return el;
}
// GAME-010B: additive specialization combos; stored in the existing nodes dictionary.
/* TECH-012C — Chaque synergie définit un identifiant, un nom, un niveau requis, une spécialisation, un prérequis et une description. */
const SYNERGIES={
 warrior:[
 ['fracture','Fracture',10,'offense','adv_vigor','Frappe : +3 dégâts sur cible exposée.'],
 ['rend','Brèche profonde',18,'offense','syn_fracture','Brise-garde : exposition de 6 tours au lieu de 4.'],
 ['counter','Contre-garde',10,'defense','adv_resolve','Attaque normale de contact : +2 dégâts sous garde.'],
 ['fortress','Forteresse',18,'defense','syn_counter','Garde et Bastion : +1 tour de garde.']],
 rogue:[
 ['focus','Estoc préparé',10,'offense','adv_vigor','Estoc : +3 dégâts sous puissance (Focus ou consommable).'],
 ['hemorrhage','Hémorragie',18,'offense','syn_focus','Estoc et Exécution : saignement de 5 tours au lieu de 3.'],
 ['riposte','Riposte',10,'defense','adv_resolve','Estoc et Exécution : +2 dégâts sous garde.'],
 ['footwork','Pas du duelliste',18,'defense','syn_riposte','Esquive et Disparition : +1 tour de garde.']],
 ranger:[
 ['aim','Tir préparé',10,'offense','adv_vigor','Tir et Tir perforant : +3 dégâts sous puissance (Visée ou consommable, première cible).'],
 ['penetration','Percée',18,'offense','syn_aim','Tir perforant : +2 dégâts sur chaque cible secondaire.'],
 ['recovery','Soin d’urgence',10,'defense','adv_resolve','Soin et Second souffle : +3 PV si à mi-vie ou moins.'],
 ['reserve','Réserves',18,'defense','syn_recovery','Soin et Second souffle : récupèrent 2 points de ressource.']],
 mage:[
 ['shock','Flux protégé',10,'offense','adv_vigor','Éclair et Décharge : +2 dégâts tant que la barrière est active.'],
 ['overload','Surcharge paralysante',18,'offense','syn_shock','Décharge : étourdit 2 tours les ennemis non-boss au lieu de 1.'],
 ['ward','Soin sous le voile',10,'defense','adv_resolve','Soin : +3 PV tant que la barrière est active.'],
 ['restoration','Égide de réserve',18,'defense','syn_ward','Barrière et Égide : +3 absorption à moitié de mana ou moins après coût.']]
};
function synergyTalents(){return SYNERGIES[S.classId]||[]}
function canLearnSynergy(id){
 const n=synergyTalents().find(n=>n[0]===id);
 return !!(n&&S.spec===n[3]&&S.level>=n[2]&&S.points>0&&!S.nodes['syn_'+id]&&S.nodes[n[4]]);
}
function learnSynergy(id){
  if(!canLearnSynergy(id))return false;
  S.points--;
  S.nodes['syn_'+id]=true;
  return true
}
function hasSynergy(id){
  const n=synergyTalents().find(n=>n[0]===id);
  return !!(n&&S.spec===n[3]&&S.level>=n[2]&&S.nodes['syn_'+id]&&S.nodes[n[4]])
}
/* TECH-012C — Applique un bonus conditionnel selon la compétence, les états de combat et le rang de la cible. */
function synergyDamage(m,p){
 if(p?.skill){
  if(hasSynergy('fracture')&&p.index===0&&m.exposed>0)return 3;
  if(hasSynergy('focus')&&p.index===0&&S.boost>0)return 3;
  if(hasSynergy('riposte')&&[0,3].includes(p.index)&&S.guard>0)return 2;
  if(hasSynergy('aim')&&[0,3].includes(p.index)&&!p.secondary&&S.boost>0)return 3;
  if(hasSynergy('penetration')&&p.index===3&&p.secondary)return 2;
  if(hasSynergy('shock')&&[0,3].includes(p.index)&&S.shield>0)return 2;
 }else if(hasSynergy('counter')&&!p?.ranged&&S.guard>0)return 2;
 return 0;
}
function synergyHeal(){return (hasSynergy('recovery')&&S.hp*2<=S.maxHp?3:0)+(hasSynergy('ward')&&S.shield>0?3:0)}
function synergyGuard(){return hasSynergy('fortress')||hasSynergy('footwork')?1:0}
function synergyShield(){return hasSynergy('restoration')&&S.res*2<=S.maxRes?3:0}
/* TECH-012C — Retourne les durées des effets selon les synergies acquises ; les boss résistent à la prolongation de l'étourdissement. */
function synergyDuration(kind,m){
 if(kind==='exposed')return hasSynergy('rend')?6:4;
 if(kind==='bleed')return hasSynergy('hemorrhage')?5:3;
 if(kind==='stun')return hasSynergy('overload')&&!m.boss?2:1;
 return 0;
}
function synergyTalentUI(refresh){
 const el=document.createElement('section'),nodes=synergyTalents();
 el.innerHTML='<h2>Synergies de combat</h2><p>1 point par talent · niveaux 10 et 18 · spécialisation requise.</p>'+['offense','defense'].map(spec=>'<h3>'+SPECS[S.classId][spec==='offense'?0:1]+'</h3><div class="classes">'+nodes.filter(n=>n[3]===spec).map(n=>'<button data-synergy="'+n[0]+'" '+(canLearnSynergy(n[0])?'':'disabled')+'>'+n[1]+'<small>'+n[5]+' · Niv. '+n[2]+' · '+(S.nodes['syn_'+n[0]]?'Acquis':S.spec!==spec?'Spécialisation requise':'Prérequis : '+(nodes.find(x=>'syn_'+x[0]===n[4])?.[1]||advancedTalents().find(x=>'adv_'+x[0]===n[4])?.[1]||n[4]))+'</small></button>').join('')+'</div>').join('');
 el.querySelectorAll('[data-synergy]').forEach(b=>b.onclick=()=>{if(learnSynergy(b.dataset.synergy))refresh()});return el;
}