// GAME-005D: bounded, separately stored consumables; no changes to old equipment slots.
const CONSUMABLES={
 heal:{name:'Potion de soin',type:'Potion',color:'#ed8585',min:1,weight:24,desc:'Rend 12 PV + 1 par 3 niveaux.'},
 focus:{name:'Potion de concentration',type:'Potion',color:'#82b8f0',min:1,weight:20,desc:'Rend 6 points de ressource + 1 par 5 niveaux.'},
 guard:{name:'Potion de pierre',type:'Potion',color:'#c1a68c',min:3,weight:12,desc:'Garde pendant 4 tours, activation comprise.'},
 power:{name:'Potion de puissance',type:'Potion',color:'#e6b76e',min:4,weight:12,desc:'Renforce la prochaine attaque durant les 4 prochains tours.'},
 insight:{name:'Parchemin de détection',type:'Parchemin',color:'#eee0a6',min:1,weight:12,desc:'Repère pièges et passages secrets à 6 cases.'},
 ward:{name:'Parchemin de protection',type:'Parchemin',color:'#bfa4ed',min:5,weight:8,desc:'Absorbe 8 dégâts + 1 par 3 niveaux.'},
 smoke:{name:'Bombe fumigène',type:'Utilitaire',color:'#a6b8ba',min:2,weight:8,desc:'Étourdit les ennemis visibles à 2 cases pendant leur prochaine action.'},
 toolkit:{name:'Trousse de désamorçage',type:'Utilitaire',color:'#91c6a1',min:1,weight:12,desc:'Désamorce les pièges adjacents, même cachés.'}
};
/* TECH-012C — Capacité maximale par type de consommable, indépendante du sac d'équipement. */
const POUCH_CAP=5;
/* TECH-012C — Retourne le nombre de consommables du type demandé, borné par la capacité. */
function pouchCount(id){
  return Object.hasOwn(CONSUMABLES,id)?Math.max(0,Math.min(POUCH_CAP,Math.floor(Number(S.pouch?.[id])||0))):0
}
/* TECH-012C — Ajoute un consommable si son type est reconnu et si sa capacité n'est pas atteinte. */
function addConsumable(id){
  if(!Object.hasOwn(CONSUMABLES,id)||pouchCount(id)>=POUCH_CAP)return false;
  S.pouch??={};
  S.pouch[id]=pouchCount(id)+1;
  return true
}
/* TECH-012C — Tire un consommable parmi les types disponibles à cette profondeur, selon leurs poids relatifs. */
function rollConsumable(floor,rng=rand){
  const entries=Object.entries(CONSUMABLES).filter(([,v])=>floor>=v.min);
  let n=rng(entries.reduce((s,[,v])=>s+v.weight,0));
  for(const [id,v] of entries){if(n<v.weight)return id;
    n-=v.weight}return 'heal'
}
function placeConsumable(d,decorated,terrain,existing,floor,rng=rand){
 const used=new Set([d.start,d.stairs,...d.monsters,...existing,...decorated.features,...terrain].map(p=>p.x+','+p.y));
 const candidates=[];
   for(const room of d.rooms){for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++){if(decorated.map[y*W+x]===0&&!used.has(x+','+y)&&Math.max(Math.abs(x-d.start.x),Math.abs(y-d.start.y))>=4)candidates.push({x,y})}}
 if(!candidates.length)return [];
   const result=[];
   for(let i=0;i<(floor>=10?2:1)&&candidates.length;i++){const p=candidates.splice(rng(candidates.length),1)[0];result.push({...p,kind:'consumable',consumable:rollConsumable(floor,rng)})}return result;
}
function consumableTargets(id){
 if(id==='insight')return features.filter(f=>['trap','secret'].includes(f.type)&&!f.found&&!f.spent&&dist(f,S)<=6);
 if(id==='toolkit')return features.filter(f=>f.type==='trap'&&!f.spent&&Math.abs(f.x-S.x)+Math.abs(f.y-S.y)<=1);
 if(id==='smoke')return monsters.filter(m=>m.hp>0&&dist(m,S)<=2&&los(m.x,m.y)&&!(m.stun>0));
 return [];
}
function canUseConsumable(id){
 if(!pouchCount(id)||S.dead)return false;
 if(id==='heal')return S.hp<S.maxHp;if(id==='focus')return S.res<S.maxRes;
 if(id==='guard')return S.guard<4;if(id==='power')return S.boost<5;
 if(id==='ward')return S.shield<8+Math.floor(S.level/3);
 return consumableTargets(id).length>0;
}
/* TECH-012C — Vérifie que le consommable est utilisable avant de le retirer de la sacoche et d'appliquer son effet. */
function useConsumable(id){
 if(mode!=='game'||!overlay.classList.contains('hidden')||!canUseConsumable(id))return false;
 selected=null;S.pouch[id]=pouchCount(id)-1;let msg=CONSUMABLES[id].name;
 if(id==='heal'){const n=Math.min(S.maxHp-S.hp,12+Math.floor(S.level/3));S.hp+=n;combatFx('heal',n);msg+=' : +'+n+' PV'}
 else if(id==='focus'){const n=Math.min(S.maxRes-S.res,6+Math.floor(S.level/5));S.res+=n;msg+=' : +'+n+' ressource'}
 else if(id==='guard')S.guard=4;
 else if(id==='power')S.boost=5;
 else if(id==='ward')S.shield=8+Math.floor(S.level/3);
 else if(id==='smoke'){const targets=consumableTargets(id);for(const m of targets){m.stun=1;delete m.aim;delete m.intent}msg+=' : '+targets.length+' ennemis étourdis'}
 else{const targets=consumableTargets(id);for(const f of targets){f.found=true;if(id==='toolkit')f.spent=true}msg+=' : '+targets.length+' éléments'}
 say(msg);finish();return true;
}
function consumablesMenu(){
 if(mode!=='game')return;selected=null;update();
 show('<h1>Consommables</h1><p>Sacoche indépendante · maximum 5 par type. Utiliser un objet coûte un tour ; aucun déplacement automatique.</p>'+['Potion','Parchemin','Utilitaire'].map(type=>'<h2>'+type+'s</h2><div class="classes">'+Object.entries(CONSUMABLES).filter(([,v])=>v.type===type).map(([id,v])=>'<button data-consume="'+id+'" '+(canUseConsumable(id)?'':'disabled')+'>'+objectIcon(...lootArt({kind:'consumable',consumable:id}))+'<span style="color:'+v.color+'">'+v.name+' ('+pouchCount(id)+'/5)</span><small>'+v.desc+'</small></button>').join('')+'</div>').join('')+'<button class="wide" id="close">Retour au donjon</button>');
 panel.querySelectorAll('[data-consume]').forEach(b=>b.onclick=()=>{const id=b.dataset.consume;if(!canUseConsumable(id))return;hide();useConsumable(id)});
 document.getElementById('close').onclick=hide;
}