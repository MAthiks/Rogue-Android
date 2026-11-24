/* TECH-012C — Ancienne interface de progression conservée dans le source ; ne pas la supprimer sans vérifier les références et la compatibilité. */
function legacyInventory(){
  if(mode!=='game')return;
  show(`<h1>Personnage</h1><p><b>${CLASSES[S.classId].name}</b> · niveau ${S.level} · ${S.xp}/${8+S.level*6} XP<br>Attaque +${S.atk} · Armure +${S.armor} · Bandages ${S.bandages}<br>Ennemis vaincus : ${S.kills}</p><p>Points de talent : <b>${S.points}</b></p><p>Investis un point pour augmenter tes dégâts ou ta santé maximale.</p><button class="wide" id="upatk" ${S.points?'':'disabled'}>+1 Attaque (1 point)</button><button class="wide" id="uphp" ${S.points?'':'disabled'}>+5 PV maximum (1 point)</button><button class="wide" id="close">Retour au donjon</button>`);
  document.getElementById('close').onclick=hide;
  for(let [id,key] of [['upatk','atk'],['uphp','hp']])document.getElementById(id).onclick=()=>{if(!S.points)return;
    S.points--;
    if(key==='atk')S.atk++;
    else{S.maxHp+=5;
      S.hp+=5}save();
    update();
    inventory()}
}
const SPECS={warrior:['Berserker','Sentinelle'],rogue:['Assassin','Duelliste'],ranger:['Tireur','Survivant'],mage:['Évocateur','Protecteur']};
const ATTRHELP=['Dégâts du guerrier','Dégâts du voleur et du rôdeur, esquive','PV et défense','Ressource maximale et régénération','Dégâts magiques et soins','Chance de critique'];

// GAME-009C: read-only dossier presentation; all values come from live state.
/* TECH-012C — Construit la synthèse du personnage à partir de ses statistiques actuelles, sans attribuer de bonus. */
function characterDossier(){
 const c=CLASSES[S.classId],spec=S.spec?SPECS[S.classId][S.spec==='offense'?0:1]:'Sans spécialisation';
 const sprite='<svg class="sheet-sprite" viewBox="0 0 16 16" aria-hidden="true">'+playerSprite(S.classId,S.equip).map(([color,x,y,w,h])=>'<rect fill="'+color+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>').join('')+'</svg>';
 const meters=hudData(S).map(m=>'<div class="sheet-meter-'+m.id+'"><div class="sheet-meter-label"><span>'+m.label+'</span><span data-sheet-meter="'+m.id+'">'+(m.cap?'MAX':m.value+'/'+m.max)+'</span></div><div class="sheet-meter-track" role="progressbar" aria-label="'+m.label+'" aria-valuemin="0" aria-valuemax="'+m.max+'" aria-valuenow="'+Math.max(0,Math.min(m.max,m.value))+'"><span class="sheet-meter-fill" style="width:'+meterPercent(m.value,m.max)+'%"></span></div></div>').join('');
 const values=[['Attaque (bonus)','+'+(S.atk+bonus('atk'))],['Défense (bonus)','+'+(S.armor+bonus('def'))],['Critique',criticalChance()+'%'],['Esquive',dodgeChance()+'%'],['Régénération',resourceRegen(false)+'/t'],['Éliminations',S.kills]];
 return '<section class="crypt-sheet"><p class="sheet-kicker">CRYPTGRAVE · CHRONIQUE DU PERSONNAGE</p><div class="sheet-top"><div class="sheet-art">'+classCardPortrait(S.classId)+sprite+'</div><div><h1>'+c.name+'</h1><p class="sheet-spec">'+spec+'</p>'+(S.spec?'<p class="tiny">'+doctrineDescription(S.classId,S.spec)+'</p>':'')+'<div class="sheet-meta"><span>Niveau '+S.level+'</span><span>Étage '+S.floor+'</span><span class="sheet-gold">Or '+goldBalance()+'</span></div><div class="sheet-meters">'+meters+'</div></div></div><div class="sheet-combat">'+values.map(([label,value])=>'<div><b>'+value+'</b><span>'+label+'</span></div>').join('')+'</div></section>';
}
/* TECH-012C — Affiche une caractéristique et indique si un point peut être investi. */
function characterAttributeCard(name,i){
 return '<button data-attr="'+i+'" '+(!S.ap?'disabled':'')+'><span class="sheet-attr-name">'+name+'</span><span class="sheet-attr-value">'+S.attrs[i]+'</span><small>'+ATTRHELP[i]+'</small><span class="sheet-attr-up">'+(S.ap?'Investir +1':'Aucun point')+'</span></button>';
}
/* TECH-012C — Affiche le rang d'une compétence et désactive son amélioration si les conditions ne sont pas remplies. */
function characterRankCard(a,i){
 const rank=S.ranks[i],locked=!unlocked(i),disabled=locked||!S.points||rank>=5||S.level<rank*2;
 return '<button class="wide" data-rank="'+i+'" '+(disabled?'disabled':'')+'>'+skillIcon(S.classId,i)+'<span class="sheet-rank-text">'+a[0]+'<small>'+(locked?'Compétence verrouillée':rank>=5?'Rang maximum':'Niveau requis : '+rank*2)+'</small></span><span><span class="sheet-rank-text">'+(locked?'—':rank+'/5')+'</span><span class="sheet-rank-dots" aria-hidden="true">'+Array.from({length:5},(_,j)=>'<i class="'+(!locked&&j<rank?'filled':'')+'"></i>').join('')+'</span></span></button>';
}


/* GAME-009D: read-only equipment presentation; actions remain in inventory(). */
function equipmentSprite(){
 return '<svg viewBox="0 0 16 16" aria-hidden="true" class="equipment-sprite">'+playerSprite(S.classId,S.equip).map(([c,x,y,w,h])=>'<rect fill="'+c+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>').join('')+'</svg>';
}
/* TECH-012C — Affiche un emplacement équipé ou vide ; le retrait est indisponible lorsque le sac est plein. */
function equipmentSlotCard(slot){
 const it=S.equip[slot],label=GEAR_SLOTS[slot],rarity=it?RARITIES[rarityOf(it)-1]:null,tone=rarity?.color||'#8d8271';
 const disabled=!it||S.bag.length>=24;
 return '<button class="gear-slot gear-slot-'+slot+(it?'':' empty')+'" data-off="'+slot+'" style="--gear-tone:'+tone+'" '+(disabled?'disabled':'')+'><span class="slot-label">'+label+'</span>'+objectIcon(...(it?lootArt({kind:'gear',item:it}):[slot==='weapon'?'blade':slot,tone]))+'<span class="slot-name">'+(it?escapeGear(it.name):'Vide')+'</span><small>'+(it?(disabled?'Sac plein':rarity.name+' · Retirer'):'Non équipé')+'</small></button>';
}
/* TECH-012C — Compose la silhouette équipée et les détails des cinq emplacements. */
function equipmentRack(){
 return '<div class="crypt-gear"><div class="gear-rack">'+['helmet','ring','weapon','armor','boots'].map(equipmentSlotCard).join('')+'<div class="gear-hero">'+equipmentSprite()+'</div></div><div class="gear-equipped-details">'+Object.entries(S.equip).filter(([k,it])=>it).map(([k,it])=>'<div class="gear-equipped-line"><span>'+GEAR_SLOTS[k]+'</span><div><span style="color:'+RARITIES[rarityOf(it)-1].color+'">'+escapeGear(it.name)+'</span><small class="gear-detail">'+gearStats(it)+(weaponFamily(it)?' · '+WEAPONS[weaponFamily(it)].desc:'')+(it.itemLevel?' · Niv. objet '+it.itemLevel:'')+(GEAR_SETS[it.setId]?' · '+GEAR_SETS[it.setId].name+' ('+setCount(S.equip,it.setId)+'/3)':it.uniqueId||it.bossRelic?' · Unique':'')+'</small></div></div>').join('')+'</div></div>';
}
/* TECH-012C — Présente un objet du sac avec ses statistiques, sa rareté et les actions d'équipement ou de suppression. */
function bagItemCard(it){
 const rarity=RARITIES[rarityOf(it)-1],set=GEAR_SETS[it.setId];
 return '<div class="gear-row"><button class="wide gear-item" data-equip="'+it.id+'" style="--gear-tone:'+rarity.color+'">'+objectIcon(...lootArt({kind:'gear',item:it}))+'<span><span class="gear-item-name">'+escapeGear(it.name)+'</span><small class="gear-detail">'+rarity.name+' · '+GEAR_SLOTS[it.slot]+(it.itemLevel?' · Niv. objet '+it.itemLevel:'')+' · '+gearStats(it)+(weaponFamily(it)?' · '+WEAPONS[weaponFamily(it)].desc:'')+(set?' · Ensemble '+set.name+' ('+setCount(S.equip,it.setId)+'/3)':it.uniqueId||it.bossRelic?' · Unique':'')+'</small><span class="gear-action">'+(S.equip[it.slot]?'Remplacer':'Équiper')+'</span></span></button><button class="wide" data-drop="'+it.id+'">Jeter</button></div>';
}
/* TECH-012C — Affiche la capacité du sac et la liste des objets ; ne modifie pas l'inventaire. */
function bagCards(){
 return '<div class="crypt-bag"><div class="bag-capacity"><span>Emplacements occupés</span><b>'+S.bag.length+'/24</b></div><div class="bag-capacity-track" role="progressbar" aria-label="Capacité du sac" aria-valuemin="0" aria-valuemax="24" aria-valuenow="'+S.bag.length+'"><span style="width:'+meterPercent(S.bag.length,24)+'%"></span></div>'+(S.bag.length?S.bag.map(bagItemCard).join(''):'<p class="bag-empty">Le sac est vide.</p>')+'</div>';
}

/* TECH-012C — Construit l'écran de personnage, de progression et d'équipement à partir de l'état de la partie active. */
function inventory(){
  if(mode!=='game')return;
  selected=null;
  update();
  show(characterDossier()+'<div class="gear-quick"><button id="jump-equipment">Équipement</button><button id="jump-bag">Sac</button></div><h2>Caractéristiques ('+S.ap+' points)</h2><div class="classes sheet-attributes">'+ATTR.map(characterAttributeCard).join('')+'</div><h2>Talents ('+S.points+' points)</h2>'+CLASSES[S.classId].skills.map(characterRankCard).join('')+'<h2 id="equipment-heading">Équipement</h2><p>Attaque +'+(S.atk+bonus('atk'))+' · Défense +'+(S.armor+bonus('def'))+' · Critique +'+bonus('crit')+'% · Esquive +'+bonus('dodge')+'% · Régénération +'+bonus('regen')+'</p>'+combatSummary()+setSummary()+equipmentRack()+'<h2 id="bag-heading">Sac '+S.bag.length+'/24</h2>'+bagCards()+'<button class="wide" id="close">Retour au donjon</button>');
  const spec=document.createElement('section');
  spec.innerHTML='<h2>Spécialisation</h2>'+(S.spec?'<p>'+SPECS[S.classId][S.spec==='offense'?0:1]+'</p><p>'+doctrineDescription(S.classId,S.spec)+'</p>':S.level<5?'<p>Débloquée au niveau 5.</p>':'<div class="classes"><button data-spec="offense">'+SPECS[S.classId][0]+'<small>+2 dégâts · '+doctrineDescription(S.classId,'offense')+'</small></button><button data-spec="defense">'+SPECS[S.classId][1]+'<small>+1 défense, +5% esquive · '+doctrineDescription(S.classId,'defense')+'</small></button></div>');
  panel.querySelector('h2').before(spec);
  /* TECH-012C — Après une modification de personnage, sauvegarde et reconstruit l'interface pour refléter les nouvelles valeurs. */
  const refresh=()=>{save();update();inventory()};
  const styles=document.createElement('section');
  styles.innerHTML='<h2>Style de combat</h2><p>Style actuel : '+currentStyle().name+'</p><div class="classes">'+Object.entries(STYLES).map(([key,v])=>'<button data-style="'+key+'" '+(v===currentStyle()?'disabled':'')+'>'+v.name+'<small>'+v.desc+'</small></button>').join('')+'</div>';
  panel.querySelector('h2').before(styles);
  styles.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{const key=b.dataset.style;if(Object.hasOwn(STYLES,key)){S.combatStyle=key;refresh()}});
  const tree=document.createElement('section');
  const names={warrior:['Force brute','Fureur','Armure renforcée','Réflexes','Maître d’armes'],rogue:['Lame affûtée','Précision mortelle','Souplesse','Pas furtif','Maître des ombres'],ranger:['Flèche lourde','Œil de lynx','Peau dure','Instinct','Maître pisteur'],mage:['Puissance arcanique','Surcharge','Peau de pierre','Voile','Maître des arcanes']}[S.classId];
  const nodes=[['o1',2,[], '+1 dégât'],['o2',5,['o1'],'+8% critique'],['d1',2,[],'+1 défense'],['d2',5,['d1'],'+5% esquive'],['master',10,['o2','d2'],'+2 dégâts, +1 régénération']];
  /* TECH-012C — Vérifie les conditions d'achat d'un talent passif de base. */
  const eligible=n=>S.points>0&&!S.nodes[n[0]]&&S.level>=n[1]&&n[2].every(k=>S.nodes[k]);
    tree.innerHTML='<h2>Arbre de talents passifs</h2><p>Chaque talent coûte 1 point. Maîtrise : les deux branches avancées requises.</p><div class="classes">'+nodes.map((n,i)=>'<button data-node="'+i+'" '+(eligible(n)?'':'disabled')+'>'+names[i]+'<small>'+n[3]+' · Niv. '+n[1]+(S.nodes[n[0]]?' · acquis':n[2].length?' · prérequis : '+n[2].map(k=>names[nodes.findIndex(x=>x[0]===k)]).join(', '):'')+'</small></button>').join('')+'</div>';
  panel.querySelector('[data-rank]').before(tree);
  const advanced=advancedTalentUI(refresh);
  tree.after(advanced);
  advanced.after(synergyTalentUI(refresh));
  const active=document.createElement('section');
  const canLearn=i=>!unlocked(i)&&S.points>0&&S.level>= (i===3?5:8)&&S.nodes[i===3?'o1':'d1'];
  active.innerHTML='<h2>Compétences avancées</h2>'+[3,4].map(i=>'<button class="wide" data-learn="'+i+'" '+(canLearn(i)?'':'disabled')+'>'+CLASSES[S.classId].skills[i][0]+' · '+(unlocked(i)?'acquis':'1 point · niveau '+(i===3?5:8)+' · branche '+(i===3?'offensive':'défensive'))+'</button>').join('')+'<h2>Barre de compétences</h2>'+S.bar.map((v,j)=>'<label>Emplacement '+(j+1)+'</label><select data-bar="'+j+'">'+CLASSES[S.classId].skills.map((sk,i)=>unlocked(i)?'<option value="'+i+'" '+(v===i?'selected':'')+'>'+sk[0]+'</option>':'').join('')+'</select>').join('');
  tree.before(active);
  active.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{let i=+b.dataset.learn;if(canLearn(i)){S.points--;S.activeTalents[i]=true;refresh()}});
  /* TECH-012C — Si une compétence figure déjà dans la barre rapide, échange les deux emplacements plutôt que créer un doublon. */
  active.querySelectorAll('[data-bar]').forEach(b=>b.onchange=()=>{let j=+b.dataset.bar,i=+b.value;
    if(!unlocked(i))return;
    let other=S.bar.indexOf(i);
    if(other>=0)S.bar[other]=S.bar[j];
    S.bar[j]=i;
    refresh()});
  tree.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>{let n=nodes[+b.dataset.node];if(eligible(n)){S.points--;S.nodes[n[0]]=true;refresh()}});
  panel.querySelectorAll('[data-spec]').forEach(b=>b.onclick=()=>{if(S.level>=5&&!S.spec&&confirm('Choisir définitivement cette spécialisation ?')){S.spec=b.dataset.spec;refresh()}});
  panel.querySelectorAll('[data-attr]').forEach(b=>b.onclick=()=>{if(!S.ap)return;let i=+b.dataset.attr;S.ap--;S.attrs[i]++;if(i===2){S.maxHp+=2;S.hp+=2}if(i===3){S.maxRes++;S.res++}refresh()});
  panel.querySelectorAll('[data-rank]').forEach(b=>b.onclick=()=>{let i=+b.dataset.rank;if(!unlocked(i)||!S.points||S.ranks[i]>=5||S.level<S.ranks[i]*2)return;S.points--;S.ranks[i]++;refresh()});
  /* TECH-012C — Équipe l'objet sélectionné et replace l'ancien équipement dans le sac si nécessaire. */
  panel.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{let i=S.bag.findIndex(it=>it.id===+b.dataset.equip);
    if(i<0)return;
    let it=S.bag.splice(i,1)[0];
    if(S.equip[it.slot])S.bag.push(S.equip[it.slot]);
    S.equip[it.slot]=it;
    refresh()});
  panel.querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>{let k=b.dataset.off;if(S.equip[k]&&S.bag.length<24){S.bag.push(S.equip[k]);S.equip[k]=null;refresh()}});
  panel.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>{if(confirm('Jeter cet objet ?')){S.bag=S.bag.filter(it=>it.id!==+b.dataset.drop);refresh()}});
  document.getElementById('jump-equipment').onclick=()=>document.getElementById('equipment-heading').scrollIntoView({block:'start'});
  document.getElementById('jump-bag').onclick=()=>document.getElementById('bag-heading').scrollIntoView({block:'start'});
  document.getElementById('close').onclick=hide
}
/* TECH-012C — Ouvre le menu de pause ; l'abandon définitif de la partie demande confirmation. */
function menu(){
  if(mode!=='game')return;
  selected=null;
  update();
  show(`<h1>Pause</h1><p>Partie sauvegardée automatiquement sur cet appareil. Une mort supprime la sauvegarde.</p><button class="wide" id="back">Continuer</button><button class="wide" id="pauseopts">Options graphiques</button><button class="wide" id="reset">Abandonner et recommencer</button>`);
  document.getElementById('back').onclick=hide;
  document.getElementById('pauseopts').onclick=()=>options(menu);
  document.getElementById('reset').onclick=()=>{if(confirm('Abandonner définitivement cette partie ?'))endRun('abandoned')}
}