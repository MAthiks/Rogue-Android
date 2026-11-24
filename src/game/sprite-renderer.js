// GAME-007B: native 16px silhouettes; gear layers are purely cosmetic.
/* TECH-012C — Chaque classe possède une palette et une silhouette codée ligne par ligne ; le point représente un pixel transparent. */
const PLAYER_ART={
 warrior:{palette:['#263747','#506c7c','#9dbbc3','#d7e4da','#c39a69'],rows:['...oooo...','..oHHHHo..','..oHhHHo..','..oFffFo..','...offo...','ooHooooHoo','oHHhHhHHHo','oHhHHHHhHo','oohHHHHhoo','..oBbbBo..','..oHHHHo..','..oHooHo..','..oHo.oHo.','..ooo.ooo.']},
 rogue:{palette:['#282b2c','#55594d','#8e9b70','#c4cba0','#bf926b'],rows:['....oo....','...oHHo...','..oHHHHo..','..oHffHo..','...offo...','..oHHHoo..','.oHhHHHHo.','.oHhHHhHo.','..oHHHHo..','..oBbbBo..','.oHHHHHHo.','.oHooHHHo.','..oHo.oHo.','..ooo.ooo.']},
 ranger:{palette:['#30392b','#57704a','#8aa66c','#cbd59a','#c3a06e'],rows:['...oooo...','..oHHHHo..','.oHHhHHHo.','.oHffffHo.','..ooffoo..','..oHHHHo.o','.oHHhHHooo','.oHhHHHoHo','.oHHHHHoHo','..oBbbBooo','..oHHHHo..','..oHooHo..','..oHo.oHo.','..ooo.ooo.']},
 mage:{palette:['#332b4b','#66517f','#a18bbc','#d6c5ed','#c8a47d'],rows:['....o.....','...oHo....','...oHHo...','..oHHHHo..','.ooHHHHoo.','..oFffFo..','...offo...','..oHhHHo..','.oHHhHHHo.','.oHHbHHHo.','.oHhHHHHo.','oHHhHHHHHo','oHHhHHhHHo','oooooooooo']}
};
/* TECH-012C — Compose une silhouette de 16 × 16 pixels et ajoute les couches cosmétiques de l'équipement ; retourne des opérations de dessin. */
function playerSprite(classId,equip={}){
 const art=Object.hasOwn(PLAYER_ART,classId)?PLAYER_ART[classId]:PLAYER_ART.warrior;
 const [dark,mid,light,shine,skin]=art.palette,outline='#141922';
 const palette={o:outline,H:mid,h:light,F:skin,f:'#936a50',B:dark,b:shine};
 const pixels=Array.from({length:16},()=>Array(16).fill(null));
 const rect=(c,x,y,w=1,h=1)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels[j][i]=c};
 const tone=it=>RARITIES[rarityOf(it)-1].color;
 rect('#181c22',3,15,10);
 art.rows.forEach((row,y)=>Array.from(row).forEach((v,x)=>{if(v!=='.')rect(palette[v],x+2,y+1)}));
 if(equip.armor){const c=tone(equip.armor);rect(dark,5,8,6,3);rect(c,5,8,6);rect(c,6,9,1,2);rect(c,9,9,1,2);rect(shine,7,10,2)}
 if(equip.helmet){const c=tone(equip.helmet);rect(c,6,3,4);rect(c,5,4);rect(c,10,4)}
 if(equip.boots){const c=tone(equip.boots);rect(c,5,13,2);rect(c,9,13,2);rect(dark,5,14,2);rect(dark,9,14,2)}
 if(equip.ring){rect(outline,3,9,2,2);rect(tone(equip.ring),4,9)}
 /* TECH-012C — La famille de l'arme détermine la silhouette ; la rareté fournit une couleur cosmétique. */
 const weapon=equip.weapon;
 if(weapon){
   const c=tone(weapon),metal='#d7dedb',wood='#a57a51';
   const line=(color,points)=>points.forEach(([x,y])=>rect(color,x,y));
   switch(weaponFamily(weapon)){
     case 'axe':rect(outline,13,2,3,5);rect(c,13,3,2,3);rect(wood,12,5,1,9);rect(metal,13,3,1,2);break;
     case 'mace':rect(outline,12,2,4,5);rect(c,13,3,2,3);rect(metal,13,3);rect(wood,13,7,1,7);break;
     case 'dagger':rect(outline,13,7,2,6);rect(c,13,7,1,4);rect(metal,13,7);rect(wood,12,11,3);break;
     case 'spear':rect(outline,13,1,3,4);rect(c,14,1,1,4);rect(metal,13,3);rect(wood,14,5,1,9);break;
     case 'bow':line(outline,[[12,2],[13,3],[14,4],[15,5],[15,6],[15,7],[15,8],[15,9],[14,10],[13,11],[12,12]]);line(c,[[12,3],[13,4],[14,5],[14,6],[14,7],[14,8],[14,9],[13,10],[12,11]]);rect(wood,12,4,1,7);break;
     case 'staff':rect(outline,12,1,4,5);rect(c,13,2,2,3);rect(shine,13,2);rect(wood,13,6,1,8);break;
     default:rect(outline,13,2,2,9);rect(c,13,2,1,8);rect(metal,13,3,1,5);rect(wood,12,10,3);rect(dark,13,11,1,3);
   }
 }
 /* TECH-012C — Regroupe les pixels contigus de même couleur en rectangles horizontaux pour réduire les appels de dessin. */
 const ops=[];
 for(let y=0;y<16;y++)for(let x=0;x<16;){const c=pixels[y][x];let end=x+1;while(end<16&&pixels[y][end]===c)end++;if(c)ops.push([c,x,y,end-x,1]);x=end}
 return ops;
}
function drawPlayerSprite(px,py){
 for(const [c,x,y,w,h] of playerSprite(S.classId,S.equip)){ctx.fillStyle=c;ctx.fillRect(px+x,py+y,w,h)}
}
// GAME-007C: 23 hand-authored pixel silhouettes. Bosses keep their previous rendering.
const ENEMY_ART={
 guardian:['...oooo...','..oHHHHo..','..oHeeHo..','oooHHHHooo','oHhHHHHhHo','oHhHHHHhHo','oHhHHHHhHo','ooohhhhooo','..oHooHo..','..oHooHo..','..ooo.ooo.'],
 brute:['..oo..oo..','.oHooooHo.','.oHHHHHHo.','ooHeeeHHoo','oHHHHHHHHo','oHhHHHHhHo','oHhHHHHhHo','ooHHHHHHoo','..oHooHo..','.oHHo.oHHo','.oooo.oooo'],
 wanderer:['....ooo...','...oHHHo..','...oeeHo..','....ooo...','..ooHHoo..','.oHoHHHo..','.o.oHHoHo.','...oHHo.o.','...oHoo...','..oHoHo...','..ooo.oo..'],
 archer:['...oooo...','..oHHHHo..','..oHeeHo.o','...oooo.oh','..oHHHo.oh','..oHHHoooh','..oHHHo.oh','..oHHHo.oh','..oHooHo.o','..oHoHo...','..ooo.oo..'],
 ambusher:['....oo....','...oHHo...','..oHHHHo..','..oHeeHo..','.ooHHHHoo.','oHhHHHHhHo','oHHHHHHHHo','.oHHHHHHo.','..oHHHHo..','.oHHooHHo.','oooo..oooo'],
 coward:['....oo....','...oHHo...','...oeeo...','....oo....','..ooHHoo..','..oHHHHo..','...oHHo...','...oHHo...','..oHooHo..','.oHo..oHo.','.oo....oo.'],
 tracker:['..........','..oo..oo..','.oHooooHo.','oHHeeHHHHo','oHHHHHHHHo','.oHHHHHHo.','..oHHHHo..','.oHHHHHHo.','oHoHooHoHo','oo.oooo.oo','..........'],
 boneguard:['...oooo...','..ohhhho..','..oeeHHo..','...ohho...','oo.oooo.oo','ohohohohho','ohohohohho','oo.ohho.oo','...o..o...','..oh..ho..','..oo..oo..'],
 wraith:['....oo....','...oHHo...','..oHHHHo..','..oHeeHo..','.oHHHHHHo.','oHhHHHHhHo','oHHHHHHHHo','.oHHHHHHo.','..oHHHHo..','...oHHo...','....oo....'],
 cavefang:['o........o','oH......Ho','.oHooooHo.','..oHeeHo..','.oHHHHHHo.','oHHhhhhHHo','oHoHHHHoHo','oo.oHHo.oo','..oHoHo...','.oo...oo..','..........'],
 spitter:['..........','...oooo...','..oHHHHo..','.oHHHHHHo.','oHHeeHHHHo','oHHHhhHHHo','.oHheehHo.','..oHHHHo..','.oHHHHHHo.','oHo.oo.oHo','oo......oo'],
 sentinel:['..oooooo..','..ohhhho..','..oHeeHo..','..oooooo..','oooHHHHooo','oHohhhoHHo','oHoHoHoHHo','ooohhhoooo','..oHooHo..','..oHooHo..','..ooo.ooo.'],
 runecaster:['....o.....','...oHo....','..oHHHo...','..oHeeo..o','...ooo...h','.ooHHoo..h','oHoheHo..o','oHoHHHoooo','..oHHHHo.o','.oHHHHHHo.','oooooooooo'],
 slag:['.ooo..ooo.','oHhHooHhHo','oHHHHHHHHo','.oHeeeHHo.','ooHHHHHHoo','oHheHHehHo','oHHHhhHHHo','ooHHHHHHoo','..oHooHo..','.oHHo.oHHo','.oooo.oooo'],
 cinder:['..........','.......o..','..oo..oHo.','.oHeooHHo.','oHHHHHHHHo','oHHheHHHHo','.oHHHHHHo.','..oHHHHo..','.oo.oo.oo.','oo......oo','..........'],
 templar:['...oooo...','..oHHHHo..','..ohheHo..','...oooo...','ooohhhhooo','oHHhehHHHo','oHHhehHHHo','ooohhhhooo','..oHHHHo..','..oHooHo..','..ooo.ooo.'],
 oracle:['...o..o...','..oHooHo..','..oHHHHo..','..oheeh..o','...oooo..h','..oHHHHo.h','.oHHhHHHo.','oHHhehHHHo','.oHHhHHHo.','..oHHHHo..','...oooo...'],
 mycelium:['...oooo...','.ooHHHHoo.','oHHhHHhHHo','oooooooooo','..oHeeHo..','ooHHHHHHoo','oHhHHHHhHo','oHHHHHHHHo','ooohhhhooo','..oHooHo..','..ooo.ooo.'],
 sporeling:['..........','..oooooo..','.oHhHHhHo.','oHHHHHHHHo','oooooooooo','...oeeo...','..oHHHHo..','..oHHHHo..','...oHHo...','..oo..oo..','..........'],
 frostfang:['..........','.o...o....','.oHooHo...','oHeeHHoooo','oHHHHHHHHo','.oHHHHHHo.','..oHHHHo..','..oHooHo..','.oo.oo.oo.','..........','..........'],
 icecaller:['....o.....','...oho....','..ohHho..o','..oHeeo.oh','...ooo...h','..ohHHoooh','.oHhHHHHo.','.oHHhHHHo.','oHHhHHHHHo','oHhHHHHhHo','oooooooooo'],
 voidstalker:['o........o','.o......o.','..o.oo.o..','..ooHeoo..','.oHHeeHHo.','oHoHHHHoHo','o..oHHo..o','..oHHHHo..','.oHo..oHo.','oo......oo','..........'],
 riftspawn:['..o....o..','.oHo..oHo.','oHHooooHHo','oHHeeeHHHo','.oHHhHHHo.','..ohehHo..','.oHHhHHHo.','oHoHHHHoHo','o..oHHo..o','..oHooHo..','..oo..oo..']
};
const ENEMY_COLORS={guardian:'#e6ad65',brute:'#c87961',wanderer:'#bd777d',archer:'#91ab6e',ambusher:'#9282bb',coward:'#c0b58a',tracker:'#75b0b7'};
for(const entries of Object.values(BESTIARY))for(const [id,,color] of entries)ENEMY_COLORS[id]=color;
/* TECH-012C — Sélectionne d'abord le dessin de l'espèce, puis celui du rôle, avec un errant comme solution de repli. */
function enemyArtId(m){
 return Object.hasOwn(ENEMY_ART,m.species)?m.species:Object.hasOwn(ENEMY_ART,m.role)?m.role:'wanderer';
}
/* TECH-012C — Réutilise les opérations graphiques des ennemis par espèce ou variante rare. */
const ENEMY_ART_CACHE=new Map();
/* TECH-012C — Convertit les lignes de pixels en rectangles colorés et met en cache le résultat. */
function enemySprite(m){
 const id=enemyArtId(m),rare=RARE_ENCOUNTERS.find(v=>v.id===m.rare),base=rare?.color||ENEMY_COLORS[id],key=rare?id+':'+rare.id:id;
 if(ENEMY_ART_CACHE.has(key))return ENEMY_ART_CACHE.get(key);
 const palette={o:'#151820',H:base,h:tileTint(base,1.35),e:['boneguard','wraith','frostfang','icecaller','voidstalker','riftspawn'].includes(id)?'#bdf4f3':'#ffe0a3'};
 const ops=[];
 ENEMY_ART[id].forEach((row,y)=>{for(let x=0;x<row.length;){const v=row[x];let end=x+1;while(end<row.length&&row[end]===v)end++;if(v!=='.')ops.push([palette[v],x+3,y+4,end-x,1]);x=end}});
 ENEMY_ART_CACHE.set(key,ops);return ops;
}
// GAME-007D: eight boss silhouettes; reserved HP/phase rows, no change to hitboxes.
const BOSS_ART={
 stone:{color:'#a68d70',glow:'#efc280',rows:['..oo....oo..','.ohHo..oHho.','oHHHooooHHHo','oHHHHeeHHHHo','oHhHHHHHHhHo','oHHHHhhHHHHo','ooHhHHHHhHoo','..oHHHHHHo..','.oHHooHHHHo.','.oooo..oooo.']},
 ash:{color:'#bb6251',glow:'#ffb56b',rows:['...o.oo.o...','..oHohhoHo..','.oHHHHHHHHo.','oHHHHeeHHHHo','.oHHHHHHHHo.','oHHhhHHhhHHo','oHHHHHHHHHHo','.oHHhHHhHHo.','..oHHHHHHo..','.oooo..oooo.']},
 veil:{color:'#81749f',glow:'#cbb7fa',rows:['....oooo....','...oHHHHo...','..oHHHHHHo..','..oHooooHo..','.oHHooooHHo.','oHHHHhhHHHHo','oHhHHHHHHhHo','.oHHHHHHHHo.','..oHHHHHHo..','...oooooo...']},
 ossuary:{color:'#c2b28b',glow:'#f9e7b5',rows:['..o.o..o.o..','..oho..oho..','..ohhhhHHo..','..oeehheeo..','...ohhhho...','oo.oooooo.oo','ohohohhohoho','ohohohhohoho','...oHooHo...','..ooo..ooo..']},
 mire:{color:'#829b58',glow:'#c9ed7e',rows:['....oooo....','..ooHHHHoo..','.oHhHHhHHHo.','oHHHHHHHHHHo','oooooooooooo','..oHHeeHHo..','.oHHhHHhHHo.','oHHHHHHHHHHo','oHoHHHHHHoHo','oo.oooooo.oo']},
 runes:{color:'#a88b55',glow:'#ffd879',rows:['..oooooo..o.','..ohhhhH..h.','..oHeeHo..h.','oooHHHHoooo.','oHhHHHHhHoH.','oHHheehHHoH.','oHHheehHHoH.','ooohhhhoooH.','..oHooHo..H.','..ooo.ooo.o.']},
 frost:{color:'#739ebd',glow:'#c3f4ff',rows:['.o...oo...o.','oho.oHHo.oho','oHHooHHooHHo','.oHHHeeHHHo.','ooHHHHHHHHoo','oHhHHHHHHhHo','oHHhhHHhhHHo','ooHHHHHHHHoo','..oHooooHo..','.oooo..oooo.']},
 abyssal:{color:'#9268ad',glow:'#eca7ff',rows:['o..........o','oHo..oo..oHo','.oHooHHooHo.','oHHHHeeHHHHo','oHhHHhhHHhHo','.oHHoeeoHHo.','oHoHHhhHHoHo','o..oHHHHo..o','..oHo..oHo..','.ooo....ooo.']}
};
const BOSS_ART_CACHE=new Map();
/* TECH-012C — La phase du boss change les accents lumineux du sprite ; les règles de combat restent indépendantes de ce rendu. */
function bossSprite(m){
 const id=Object.hasOwn(BOSS_ART,m.boss)?m.boss:'stone',a=BOSS_ART[id];
 const maxPhase=Object.hasOwn(EXTENDED_BOSSES,id)?3:2;
 const phase=Math.max(1,Math.min(maxPhase,Number.isInteger(m.phase)?m.phase:1));
 const key=id+':'+phase;if(BOSS_ART_CACHE.has(key))return BOSS_ART_CACHE.get(key);
 const palette={o:'#151820',H:a.color,h:tileTint(a.color,1.32),e:phase===1?a.glow:phase===2?tileTint(a.glow,1.17):'#fff1db'};
 const ops=[];
 a.rows.forEach((row,y)=>{for(let x=0;x<row.length;){const v=row[x];let end=x+1;while(end<row.length&&row[end]===v)end++;if(v!=='.')ops.push([palette[v],x+2,y+3,end-x,1]);x=end}});
 // Stage accents: body only, leave phase markers and health bar readable.
 if(phase>=2){ops.push([a.glow,4,8,1,2],[a.glow,11,8,1,2]);}
 if(phase===3){ops.push(['#fff1db',7,10,2,1],[a.glow,6,11,1,1],[a.glow,9,11,1,1]);}
 BOSS_ART_CACHE.set(key,ops);return ops;
}
function drawBossSprite(m,px,py){
 for(const [c,x,y,w,h] of bossSprite(m)){ctx.fillStyle=c;ctx.fillRect(px+x,py+y,w,h)}
}
/* TECH-012C — Dessine un boss ou un ennemi ordinaire à la position écran indiquée. */
function drawEnemySprite(m,px,py){
 if(m.boss){drawBossSprite(m,px,py);return}
 for(const [c,x,y,w,h] of enemySprite(m)){ctx.fillStyle=c;ctx.fillRect(px+x,py+y,w,h)}
}
// Frame-local indexes preserve the first matching entity and never survive a map mutation.
/* TECH-012C — Indexe les entités par case pour cette image uniquement et conserve la première entité rencontrée. */
function renderCellIndex(items){
 const cells=new Map();
 for(const item of items)if(Number.isInteger(item.x)&&Number.isInteger(item.y)&&inside(item.x,item.y)){
   const k=idx(item.x,item.y);if(!cells.has(k))cells.set(k,item);
 }
 return cells;
}
/* TECH-012A — Dessine le voisinage du joueur dans le canvas à partir des cases connues. Les index de terrain et de features accélèrent la recherche des éléments par case. */
function render(){
  if(!S)return;
  const biome=currentBiome(),VIEWW=canvas.width/T,VIEWH=canvas.height/T,
        ox=S.x-Math.floor(VIEWW/2),oy=S.y-Math.floor(VIEWH/2);
 /* TECH-012C — Construit les index temporaires du terrain, des éléments et des menaces avant le parcours de la zone visible. */
 const terrainCells=renderCellIndex(terrain),featureCells=renderCellIndex(features),intentCells=new Set();
 for(const m of monsters)if(m.intent)for(const p of m.intent.cells)if(Number.isInteger(p.x)&&Number.isInteger(p.y)&&inside(p.x,p.y))intentCells.add(idx(p.x,p.y));
 ctx.fillStyle='#090e13';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let vy=Math.max(0,-oy);vy<Math.min(VIEWH,H-oy);vy++)for(let vx=Math.max(0,-ox);vx<Math.min(VIEWW,W-ox);vx++){
  let x=vx+ox,y=vy+oy,i=idx(x,y);
  /* TECH-012C — Le brouillard de guerre masque les cases jamais découvertes ; les cases connues mais hors ligne de vue restent dessinées avec une teinte sombre. */
  if(!seen[i])continue;
  let visible=los(x,y),wall=map[i]===1,px=vx*T,py=vy*T;
  drawBiomeTile(biome,x,y,wall,visible,px,py);
  drawTerrain(terrainCells.get(i),px,py,visible);
  drawFeature(featureCells.get(i),px,py,visible);
  if(visible&&intentCells.has(i)){
    ctx.fillStyle='#813d3d';
    ctx.fillRect(px+1,py+1,14,14);
    ctx.strokeStyle='#ff9274';
    ctx.strokeRect(px+1,py+1,14,14)
  }
  if(visible&&x===stairs.x&&y===stairs.y){
    drawObject('stairs','#d4b46f',px,py)
  }
 }
 /* TECH-012C — Le butin et les ennemis ne sont affichés que lorsqu'ils sont actuellement visibles. */
 for(const l of loot){
  if(!los(l.x,l.y))continue;
  let px=(l.x-ox)*T,py=(l.y-oy)*T;
  const [id,color]=lootArt(l);
  drawObject(id,color,px,py)
 }
 for(const m of monsters){
  if(!los(m.x,m.y))continue;
  let px=(m.x-ox)*T,py=(m.y-oy)*T;
  drawEnemySprite(m,px,py);
  drawCreatureMark(m,px,py);
  drawBossPhase(m,px,py);
  if(m.boss||m.rare){
    ctx.strokeStyle=m.rare?'#d6b7ff':'#e4a15d';
    ctx.strokeRect(px,py,16,16)
  }
  if(!m.boss&&(m.role==='guardian'||m.elite)){
    ctx.fillStyle='#f1cd7b';
    ctx.fillRect(px+4,py+3,8,2)
  }
  if(m.aim){
    ctx.strokeStyle='#f2c979';
    ctx.strokeRect(px+1,py+1,14,14)
  }
  ctx.fillStyle='#3d2529';
  ctx.fillRect(px+2,py+1,12,2);
  ctx.fillStyle='#dfb17a';
  ctx.fillRect(px+2,py+1,Math.max(1,Math.round(12*m.hp/m.maxHp)),2)
 }
 let px=(S.x-ox)*T,py=(S.y-oy)*T;
 drawPlayerSprite(px,py);
 if(selected!==null){
  ctx.strokeStyle='#f2c979';
  ctx.strokeRect(px+1,py+1,14,14)
 }
}