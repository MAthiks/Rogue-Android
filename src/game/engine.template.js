
(()=>{'use strict';
/* TECH-012C — Dimensions de la grille logique (W, H), taille native des sprites (T) et références DOM. KEY est une clé historique : la renommer empêcherait de retrouver les sauvegardes existantes. */
const W=48,H=32,T=16,VIEWW=40,VIEWH=24,KEY='rogue-android-game002-v1',
  canvas=document.getElementById('game'),
  ctx=canvas.getContext('2d'),
  log=document.getElementById('log'),
  stats=document.getElementById('stats'),
  overlay=document.getElementById('overlay'),
  panel=document.getElementById('panel');
/* TECH-012C — Catalogue des quatre classes. Chaque compétence est décrite par [nom, coût en ressource, recharge en tours, mode de ciblage]. */
const CLASSES={warrior:{name:'Guerrier',desc:'Robuste · parade et frappe',hp:28,res:'Endurance',maxRes:12,color:'#a5c8ce',skills:[['Frappe',3,3,'direction'],['Souffle',4,6,'heal'],['Garde',2,5,'guard']]},
  rogue:{name:'Voleur',desc:'Rapide · critique et esquive',hp:21,res:'Énergie',maxRes:14,color:'#b8c49a',skills:[['Estoc',3,3,'direction'],['Esquive',3,5,'guard'],['Focus',2,5,'boost']]},
  ranger:{name:'Rôdeur',desc:'Précis · tirs et survie',hp:23,res:'Concentration',maxRes:12,color:'#d2bd88',skills:[['Tir',3,3,'ranged'],['Soin',4,6,'heal'],['Visée',2,5,'boost']]},
  mage:{name:'Arcaniste',desc:'Fragile · magie à distance',hp:18,res:'Mana',maxRes:16,color:'#b4a8db',skills:[['Éclair',4,3,'ranged'],['Soin',5,6,'heal'],['Barrière',3,5,'guard']]}};
const ADV={warrior:[['Brise-garde',5,5,'direction'],['Bastion',5,8,'guard']],
  rogue:[['Exécution',6,5,'direction'],['Disparition',4,8,'guard']],
  ranger:[['Tir perforant',5,5,'ranged'],['Second souffle',5,8,'heal']],
  mage:[['Décharge',6,5,'ranged'],['Égide',5,8,'guard']]};
  for(const k of Object.keys(ADV))CLASSES[k].skills.push(...ADV[k]);
  const unlocked=i=>i<3||!!S.activeTalents[i];
  const PREF='rogue-android-display-v1';
  let prefs={zoom:100,pad:100};
  try{const p=JSON.parse(localStorage.getItem(PREF));if(p){if([75,100,125,150,200].includes(p.zoom))prefs.zoom=p.zoom;if([85,100,115].includes(p.pad))prefs.pad=p.pad}}catch(e){};
/* TECH-012A — Applique les préférences d'affichage et de commandes tactiles, puis recalcule la taille de la carte. L'échec du stockage des préférences ne doit pas bloquer le jeu. */
function applyPrefs(){
  const small=innerHeight<=430;
  document.documentElement.style.setProperty('--padw',Math.round((small?42:46)*prefs.pad/100)+'px');
  document.documentElement.style.setProperty('--padh',Math.round((small?38:43)*prefs.pad/100)+'px');
  try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch(e){};
  resizeMap()
}
/* TECH-012A — Dimensionne le canvas par cases entières à partir de l'espace disponible et du zoom. Ne réalloue le canvas que si sa taille change, pour limiter le coût du rendu. */
function resizeMap(){
  const m=canvas.parentElement;
  const w=Math.max(16,m.clientWidth-6),h=Math.max(16,m.clientHeight-6);
  const scale= Math.max(1,Math.floor(Math.min(w/40,h/24)/16*16));
  const tile=Math.max(1,Math.round(scale*prefs.zoom/100));
  const cw=Math.max(1,Math.floor(w/tile))*T,ch=Math.max(1,Math.floor(h/tile))*T;
  if(canvas.width!==cw)canvas.width=cw;
  if(canvas.height!==ch)canvas.height=ch;
  const sw=(cw/T*tile)+'px',sh=(ch/T*tile)+'px';
  if(canvas.style.width!==sw)canvas.style.width=sw;
  if(canvas.style.height!==sh)canvas.style.height=sh;
  render()
}
/* TECH-012C — Présente le zoom, la taille du pavé et le plein écran ; le rappel back retourne à l'écran précédent. */
function options(back){
  show(`<h1>Options graphiques</h1><label for="zoom">Zoom du donjon</label><select id="zoom">${[75,100,125,150,200].map(n=>`<option value="${n}" ${prefs.zoom===n?'selected':''}>${n}%</option>`).join('')}</select><label for="padsize">Taille du pavé</label><select id="padsize">${[85,100,115].map(n=>`<option value="${n}" ${prefs.pad===n?'selected':''}>${n}%</option>`).join('')}</select><button class="wide" id="full">Basculer plein écran</button><p id="fullstatus" aria-live="polite"></p><button class="wide" id="defaults">Réglages par défaut</button><button class="wide" id="optback">Retour</button>`);
  document.getElementById('zoom').onchange=e=>{prefs.zoom=+e.target.value;
    applyPrefs()};
  document.getElementById('padsize').onchange=e=>{prefs.pad=+e.target.value;
    applyPrefs()};
  document.getElementById('defaults').onclick=()=>{prefs={zoom:100,pad:100};
    applyPrefs();
    options(back)};
  document.getElementById('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen()}catch(e){document.getElementById('fullstatus').textContent='Plein écran indisponible dans ce navigateur.'}};
  document.getElementById('optback').onclick=back
}
/* TECH-012C — État partagé du moteur : S contient le personnage et sa progression ; map, seen, monsters, loot, stairs, features et terrain décrivent l'étage. selected désigne le ciblage en attente ; mode distingue le menu et la partie. */
let S=null,map=[],seen=[],monsters=[],loot=[],stairs=null,features=[],terrain=[],selected=null,mode='start',messages=[];
/* TECH-012C — Utilitaires de grille : idx convertit une coordonnée en index linéaire, clear teste une case libre, dist utilise la distance de Chebyshev adaptée aux huit directions. */
const rand=n=>Math.floor(Math.random()*n),idx=(x,y)=>y*W+x,inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H,clear=(x,y)=>inside(x,y)&&map[idx(x,y)]===0,dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
/* TECH-012C — Ajoute un message au journal et conserve les trois plus récents. */
function say(t){
  messages.unshift(t);
  messages=messages.slice(0,3);
  log.textContent=messages.join('\n')
}
/* TECH-012C — Affiche une fenêtre superposée en remplaçant le contenu du panneau. */
function show(html){
  panel.innerHTML=html;
  overlay.classList.remove('hidden')
}
/* TECH-012C — Masque le panneau superposé. */
function hide(){
  overlay.classList.add('hidden')
}
/* @include:persistence */
/* @include:weapons */
/* @include:talents */
/* @include:consumables */
/* @include:exploration */
/* @include:combat-formulas */
/* @include:items */
/* @include:history-transfer */
/* @include:title-screen */
/* TECH-012A — Crée l'état initial à partir de la classe choisie, initialise les champs compatibles avec les sauvegardes, génère le premier étage et enregistre la partie. */
function newGame(id){
  let c=CLASSES[id];
  S={
    classId:id,x:0,y:0,hp:c.hp,maxHp:c.hp,res:c.maxRes,maxRes:c.maxRes,
    level:1,xp:0,points:0,floor:1,turn:0,bandages:3,atk:0,armor:0,
    guard:0,boost:0,cool:[0,0,0],kills:0,dead:false
  };
  migrate();
  selected=null;
  generate();
  mode='game';
  hide();
  say('Un nouveau destin commence · '+currentBiome().name+'.');
  update();
  save()
}
/* @include:bestiary-bosses */
/* @include:economy */
/* @include:special-rooms */
/* @include:dungeon */
/* @include:floor-exploration */
/* @include:object-art */
/* @include:biomes */
/* @include:tile-renderer */
/* @include:geometry */
/* @include:progression */
/* @include:combat-turns */
/* @include:hud */
/* @include:sprite-renderer */
/* @include:inventory-ui */
document.querySelectorAll('[data-d]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();let [dx,dy]=b.dataset.d.split(',').map(Number);move(dx,dy)}));document.getElementById('wait').addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='game'&&overlay.classList.contains('hidden')){selected=null;searchNearby();finish()}});document.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>activate(+b.dataset.skill)));document.getElementById('consumables').onclick=consumablesMenu;document.getElementById('weaponAction').onclick=aimWeapon;document.getElementById('bandage').onclick=bandage;document.getElementById('inventory').onclick=inventory;document.getElementById('menu').onclick=menu;document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);if(typeof ResizeObserver!=="undefined")new ResizeObserver(resizeMap).observe(canvas.parentElement);
})();
