// GAME-007F: cosmetic HUD, pixel glyphs, transient combat feedback.
const SKILL_ART={
 warrior:[[2,6,12,24,48,24,36],[28,34,73,85,73,34,28],[62,99,107,107,54,28,8],[65,42,28,127,28,42,65],[127,73,93,93,42,28,8]],
 rogue:[[1,3,6,12,56,24,32],[6,24,96,28,3,24,96],[8,28,42,119,42,28,8],[65,34,20,8,28,42,65],[62,99,85,65,34,20,8]],
 ranger:[[34,18,127,18,34,4,0],[8,28,8,62,8,28,8],[28,34,73,93,73,34,28],[4,6,127,6,4,124,0],[28,54,99,73,28,62,8]],
 mage:[[28,12,24,62,12,24,16],[8,28,62,127,62,28,8],[62,65,93,85,93,65,62],[73,42,28,127,28,42,73],[28,62,107,127,62,28,8]]
};
const SKILL_COLORS={warrior:'#c9d8dd',rogue:'#b5c990',ranger:'#e4c18a',mage:'#cbb4ef'};
/* TECH-012C — Construit une icône SVG de 7 × 7 pixels à partir de masques binaires ; chaque bit actif correspond à un pixel. */
function skillIcon(id,index){
 const rows=SKILL_ART[id]?.[index];if(!rows)return '';
 let pixels='';rows.forEach((row,y)=>{for(let x=0;x<7;x++)if(row&(1<<(6-x)))pixels+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+SKILL_COLORS[id]+'"/>'});
 return '<svg aria-hidden="true" class="skill-icon" viewBox="0 0 7 7">'+pixels+'</svg>';
}
/* TECH-012C — Réutilise le sprite de classe pour produire une icône SVG sans équipement. */
function classIcon(id){
  return '<svg aria-hidden="true" class="class-icon" viewBox="0 0 16 16">'+playerSprite(id).map(([c,x,y,w,h])=>'<rect fill="'+c+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>').join('')+'</svg>'
}
/* TECH-012C — Transforme une valeur en pourcentage entier borné entre 0 et 100 ; protège contre les valeurs non finies et les divisions par zéro. */
function meterPercent(value,max){return Number.isFinite(value)&&Number.isFinite(max)&&max>0?Math.max(0,Math.min(100,Math.round(100*value/max))):0}
/* TECH-012C — Prépare les trois jauges du personnage : vie, ressource de classe et expérience ; le niveau maximal affiche MAX. */
function hudData(s){
  return [{id:'hp',label:'PV',value:s.hp,max:s.maxHp},{id:'res',label:CLASSES[s.classId].res,value:s.res,max:s.maxRes},{id:'xp',label:'XP',value:s.level>=30?1:s.xp,max:s.level>=30?1:8+s.level*6,cap:s.level>=30}]
}
// GAME-011C4: retain identical HUD markup; no changes to input or turn scheduling.
/* TECH-012C — Mémorise le dernier contenu HTML par élément DOM pour éviter des reconstructions identiques. */
const hudMarkup=new WeakMap();
/* TECH-012C — Ne remplace le contenu d'un élément que si son HTML a changé. */
function setHudMarkup(el,html){
  if(hudMarkup.get(el)!==html){
    el.innerHTML=html;
    hudMarkup.set(el,html)
  }
}
/* TECH-012C — Actualise l'emblème de classe et les jauges accessibles sans modifier l'état du moteur. */
function updateHud(){
 const el=document.getElementById('hudMeters'),crest=document.getElementById('hudClass');
 if(!S){
  setHudMarkup(el,'');
  setHudMarkup(crest,'');
  return
 }
 setHudMarkup(crest,classIcon(S.classId));
 setHudMarkup(el,hudData(S).map(m=>'<div class="hud-meter meter-'+m.id+'"><div class="meter-label"><span>'+m.label+'</span><span>'+(m.cap?'MAX':m.value+'/'+m.max)+'</span></div><div class="meter-track" role="progressbar" aria-label="'+m.label+'" aria-valuemin="0" aria-valuemax="'+m.max+'" aria-valuenow="'+Math.max(0,Math.min(m.max,m.value))+'"><span class="meter-fill" style="width:'+meterPercent(m.value,m.max)+'%"></span></div></div>').join(''));
}
const FX_LABELS={hit:'Frappe',critical:'Critique',hurt:'Dégâts',heal:'Soin',guard:'Protection'};
function clearCombatFx(){document.getElementById('combatFx').innerHTML=''}
/* TECH-012C — Affiche le retour visuel d'une action de combat ; le CSS pilote l'animation, sans consommer de tour. */
function combatFx(kind,amount){
  if(!Object.hasOwn(FX_LABELS,kind)||!S||mode!=='game')return;
  const el=document.getElementById('combatFx'),n=Number.isFinite(amount)?Math.max(0,Math.round(amount)):null;
  el.innerHTML='<div class="fx-chip fx-'+kind+'">'+FX_LABELS[kind]+(n===null?'':(kind==='heal'?' +':' −')+n)+'</div>'
}
/* TECH-012C — Synchronise les informations affichées, les commandes disponibles et le rendu avec l'état courant du personnage. */
function update(){
  if(!S)return;
  updateHud();
  document.getElementById('biomeName').textContent=currentBiome().name;
    stats.textContent=`${CLASSES[S.classId].name} N${S.level} · PV ${S.hp}/${S.maxHp} · ${CLASSES[S.classId].res} ${S.res}/${S.maxRes} · Étage ${S.floor} · T${S.turn}`;
  const weaponButton=document.getElementById('weaponAction'),w=currentWeapon();
  weaponButton.textContent=w.range>1?w.name+' · '+w.range+' c.':'Arme · contact';
  weaponButton.disabled=mode!=='game'||w.range<=1||S.res<w.cost;
  weaponButton.classList.toggle('active',selected==='weapon');
  document.getElementById('consumables').textContent='Objets ('+Object.keys(CONSUMABLES).reduce((n,k)=>n+pouchCount(k),0)+')';
  document.getElementById('bandage').textContent='Bandage ('+S.bandages+')';
  document.querySelectorAll('[data-skill]').forEach(b=>{
    let i=S.bar[+b.dataset.skill],s=CLASSES[S.classId].skills[i];
      setHudMarkup(b,skillIcon(S.classId,i)+'<span class="skill-caption">'+s[0]+(s[3]==='heal'?' ('+healingLeft()+')':'')+(S.cool[i]?' · '+S.cool[i]+' t':'')+'</span><small class="skill-cost">Coût '+s[1]+'</small>');
    b.disabled=mode!=='game'||S.cool[i]>0||S.res<s[1]||(s[3]==='heal'&&!healingLeft());
    b.classList.toggle('active',selected===i)
  });
  render()
}