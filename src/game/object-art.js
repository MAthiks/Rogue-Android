// GAME-007E: native item and feature pixel plans, shared by map and inventory.
const OBJECT_ART={
 blade:['........o.','.......oho','......oho.','.....oho..','....oho...','...oho....','.ooho.....','..oho.....','.oHo......','oo........'],
 axe:['.....oooo.','....oHHHHo','....ohHHHo','.....oooo.','....oHo...','...oHo....','..oHo.....','.oHo......','oHo.......','oo........'],
 mace:['.....ooo..','....oHhHo.','...oHhHhHo','....oHHHo.','.....ooo..','....oHo...','...oHo....','..oHo.....','.oHo......','oo........'],
 dagger:['..........','..........','......oo..','.....oho..','....oho...','...oho....','..ooo.....','..oHo.....','.oHo......','.oo.......'],
 spear:['........oo','.......oho','......oho.','.....ooo..','....oHo...','...oHo....','..oHo.....','.oHo......','oHo.......','oo........'],
 bow:['..oo......','..oHo.....','..o.Ho....','..o..Ho...','..o...Ho..','..o...Ho..','..o..Ho...','..o.Ho....','..oHo.....','..oo......'],
 staff:['.....oooo.','....ohhHHo','....oheHHo','.....oooo.','.....oHo..','....oHo...','...oHo....','..oHo.....','.oHo......','oo........'],
 armor:['.oo....oo.','oHHooooHHo','oHhHHHHhHo','ooHHHHHHoo','..oHHHHo..','..oHhhHo..','..oHHHHo..','..oHHHHo..','..oooooo..','..........'],
 helmet:['..........','...oooo...','..ohhhHo..','.oHHHHHHo.','.oHeeHHHo.','.oHooooHo.','.oHH..HHo.','..oo..oo..','..........','..........'],
 boots:['..........','..oo..oo..','..oH..oH..','..oH..oH..','..oH..oH..','.ooH.ooH..','oHHHoHHHo.','ooooooooo.','..........','..........'],
 ring:['....oo....','...oeeo...','..oHhHHo..','.oHo..oHo.','.oH....Ho.','.oH....Ho.','.oHo..oHo.','..oHHHHo..','...oooo...','..........'],
 gear:['...oooo...','..oHHHHo..','..ohhhHo..','.oHHHHHHo.','.oHHeHHHo.','.oHHHHHHo.','.oHHHHHHo.','..oooooo..','..........','..........'],
 bandage:['..........','..oooooo..','.ohhHHHHo.','.oHhHHhHo.','.oHHhhHHo.','.oHhHHhHo.','.oHHHhhHo.','..oooooo..','..........','..........'],
 potion:['....oo....','...oHHo...','...oooo...','...oHHo...','..oHhhHo..','.oHhhhhHo.','.oHHheHHo.','.oHHHHHHo.','..oooooo..','..........'],
 scroll:['..oooooo..','.ohhhhHHo.','.oHooooHo.','.oHHHHHHo.','.oHoooHHo.','.oHHHeHHo.','.oHHHHHHo.','.oHHHHHHo.','..oooooo..','..........'],
 smoke:['......oo..','.....oHo..','....ooo...','..ooHHoo..','.oHHHHHHo.','.oHhHeHHo.','.oHHHHHHo.','..oHHHHo..','...oooo...','..........'],
 toolkit:['..........','...oooo...','...o..o...','.oooooooo.','oHHHHHHHHo','oHhhHHhhHo','oHHHeeHHHo','oHHHHHHHHo','.oooooooo.','..........'],
 door:['oooooooooo','oHhHHhHHHo','oHhHHhHHHo','oHhHHhHHHo','oHhHHhHeHo','oHhHHhHHHo','oHhHHhHHHo','oHhHHhHHHo','oHhHHhHHHo','oooooooooo'],
 secret:['oooooooooo','oHHhHHHHHo','oHHhHHHHHo','oHhhhhHHHo','oHHhHHeHHo','oHHhHHHHHo','oHHHHhHHHo','oHHHHhHHHo','oHHHHHHHHo','oooooooooo'],
 doorOpen:['oo......oo','oH......Ho','oH......Ho','oH......Ho','oH......Ho','oH......Ho','oH......Ho','oH......Ho','oH......Ho','oo......oo'],
 chest:['..........','..........','..oooooo..','.oHHHHHHo.','oHhhhhHHHo','oooooooooo','oHHHeeHHHo','oHHHeeHHHo','oooooooooo','..........'],
 chestOpen:['..........','..oooooo..','.oHHHHHHo.','.oooooooo.','oHo....oHo','oHooooooHo','oHHHHHHHHo','oHHHHHHHHo','oooooooooo','..........'],
 trap:['..........','..o....o..','..h....h..','.oHo..oHo.','.oHo..oHo.','oHHooooHHo','oHhHHhHHHo','oooooooooo','..........','..........'],
 trapSpent:['..........','..........','..........','..........','..........','..oo..oo..','oHHooooHHo','oooooooooo','..........','..........'],
 stairs:['oooooooooo','ohhhhhhhho','oHHHHHHHHo','oohhhhhhho','ooHHHHHHHo','ooohhhhhho','oooHHHHHHo','oooohhhhho','ooooHHHHHo','oooooooooo'],
 arms:['...oooo...','..oHHHHo..','..oHeeHo..','...oooo..o','..oHHHHo.h','.oHhHHHHoH','.oHHHHHHoH','..oHHHHo.o','..oHooHo..','..oo..oo..'],
 apothecary:['...oooo...','..oHHHHo..','..oHeeHo..','...oooo...','..oHHHHo..','.oHHhHHHo.','.oHhooHHo.','.oHheehHo.','..oHHHHo..','..oooooo..'],
 trader:['..oooooo..','.ohhhHHHo.','..oHeeHo..','...oooo...','ooHooooHoo','oHHHHHHHHo','oHhHHHHhHo','ooHHHHHHoo','..oHooHo..','..oo..oo..'],
 shrine:['....oo....','...oeeo...','...oHHo...','..oHHHHo..','..ohhhHo..','.oHHHHHHo.','.oHHHHHHo.','oooooooooo','oHHHHHHHHo','oooooooooo'],
 cache:['..........','...oooo...','..oHHHHo..','.oHhHHhHo.','.oHHHHHHo.','.oHHHHHHo.','.oHheehHo.','..oHHHHo..','...oooo...','..........'],
 fountain:['..........','....oo....','...oeeo...','..oHeeHo..','.oHHHHHHo.','oooooooooo','oheeeeehHo','oHHHHHHHHo','.oooooooo.','..........'],
 obelisk:['....oo....','...ohHo...','...ohHo...','...oHeo...','...oeHo...','...ohHo...','...ohHo...','..oHHHHo..','.oooooooo.','..........'],
 survivor:['...oooo...','..oHHHHo..','..oHeeHo..','...oooo...','..oHHHHo..','.oHhhhHHo.','..oHHHHo..','..oHHHHo..','.oHooHHo..','.ooo.ooo..'],
 sanctuary:['....oo....','....ee....','..oooooo..','..oHhhHo..','..oHHHHo..','.oHHHHHHo.','.oHHHHHHo.','oooooooooo','oHHHHHHHHo','oooooooooo'],
 library:['oooooooooo','ohHhHhHhHo','ohHhHhHhHo','oooooooooo','oHhHhHhHho','oHhHhHhHho','oooooooooo','oHhHhHhHho','oHhHhHhHho','oooooooooo'],
 vault:['.oooooooo.','oHhHHHHhHo','oHhHHHHhHo','oHhHeeHhHo','oHhHeeHhHo','oHhHHHHhHo','oHhHHHHhHo','.oooooooo.','..........','..........'],
 cursed:['o........o','oh......ho','.oH....Ho.','..oHeeHo..','..oHeeHo..','.oHHHHHHo.','..oHHHHo..','.oHHHHHHo.','oooooooooo','..........'],
 hidden:['...oooo...','..ohhhHo..','.oHeeeeHo.','.oHHHHHHo.','.oHHeeHHo.','.oHHHHHHo.','..oHHHHo..','..oooooo..','..........','..........'],
 forge:["..........","..o....o..","..oe..eo..",".oHeeeHHo.",".oHHHHHHo.","..oHHHHo..","...oHHo...","..ohhhho..",".oHHHHHHo.","oooooooooo"],
 ossuary:["..oooooo..",".ohhhhhho.","ohohhhohho","ohohhhohho","ohhhHhhhho",".ohHHHho..","..oHoHo...","..ooooo...",".oHHHHHHo.","oooooooooo"],
 mirror:["...oooo...","..ohehho..",".oheeehho.",".oheehhho.",".ohheehho.",".ohhhheho.","..ohhhho..","...oHHo...","..oHHHHo..","..oooooo.."],
 caravan:["..........",".oooooooo.",".ohhhHhho.","oHHHHHHHHo","oeHHHHHHeo","oHHHHHHHHo",".oooooooo.","..oo..oo..",".ohhoohho.","..oo..oo.."],
 reliquary:["....oo....","...oeeo...","..oeeHHo..",".oeeHhHHo.",".oHHhHHHo.","..oHheHo..","...oHHo...","..ohhhho..",".oHHHHHHo.","oooooooooo"],
 shrineTrial:["..o....o..",".oeo..oeo.","..o.oo.o..","..ohehho..",".oHHHHHHo.",".oHeeHHHo.",".oHHHHHHo.","..oHHHHo..",".ohhhhhho.","oooooooooo"],
 hiddenArchive:["oooooooooo","ohHoHHoHho","oHHoHHoHHo","oooooooooo","ohHoHHoHho","oHHoHHoHHo","oooooooooo","ohhHhhHhho","oHHHHHHHHo","oooooooooo"],
 hiddenTreasury:["..........","...oooo...","..oheeho..",".oHHHHHHo.","oooooooooo","oHeHHHHeHo","oHHeeeHHHo","oHHHeHHHHo","oHHHHHHHHo","oooooooooo"]
};
const OBJECT_ART_CACHE=new Map(),OBJECT_CACHE_LIMIT=256;
/* TECH-012C — Produit les rectangles d'un objet selon son type, sa couleur et son état ; les variantes sont mises en cache. */
function objectSprite(id,color,visible=true,spent=false){
 id=Object.hasOwn(OBJECT_ART,id)?id:'gear';
 color=/^#[0-9a-f]{6}$/i.test(color||'')?color:'#a6b8ba';
 const key=[id,color,visible,spent].join(':');if(OBJECT_ART_CACHE.has(key))return OBJECT_ART_CACHE.get(key);
 const base=spent?tileTint('#858990',.72):color;
 const tint=visible?1:.48;
 const palette={o:tileTint('#22202a',tint),H:tileTint(base,tint),h:tileTint(base,1.3*tint),e:tileTint(spent?'#858990':'#ffe7ae',tint)};
 const ops=[];OBJECT_ART[id].forEach((row,y)=>{for(let x=0;x<row.length;){const v=row[x];let end=x+1;while(end<row.length&&row[end]===v)end++;if(v!=='.')ops.push([palette[v],x+3,y+3,end-x,1]);x=end}});
 /* TECH-012C — Évite la croissance illimitée du cache en retirant la première entrée lorsque la limite est atteinte. */
 if(OBJECT_ART_CACHE.size>=OBJECT_CACHE_LIMIT)OBJECT_ART_CACHE.delete(OBJECT_ART_CACHE.keys().next().value);
 OBJECT_ART_CACHE.set(key,ops);return ops;
}
/* TECH-012C — Associe le butin à une silhouette et une couleur de rareté ou de catégorie. */
function lootArt(l){
 if(l.kind==='bandage')return ['bandage','#d5c7a4'];
 if(l.kind==='consumable'){const v=CONSUMABLES[l.consumable];return [v?.type==='Potion'?'potion':v?.type==='Parchemin'?'scroll':l.consumable==='smoke'?'smoke':l.consumable==='toolkit'?'toolkit':'gear',v?.color||'#a6b8ba']}
 const it=l.item;if(!it)return ['gear','#85b8d5'];
 return [it.slot==='weapon'?weaponFamily(it)||'blade':Object.hasOwn(OBJECT_ART,it.slot)?it.slot:'gear',RARITIES[rarityOf(it)-1].color];
}
/* TECH-012C — Retourne le dessin approprié à un élément découvert, y compris ses états ouvert ou utilisé. */
function featureArt(f){
 if(!f||!f.found)return null;
 if(f.type==='door'||f.type==='secret')return [f.open?'doorOpen':f.type,'#a58150',false];
 if(f.type==='chest')return [f.open?'chestOpen':'chest','#c18b47',false];
 if(f.type==='trap')return [f.spent?'trapSpent':'trap','#cf7965',!!f.spent];
 if(f.type==='merchant')return [f.merchantId,MERCHANTS[f.merchantId]?.color||'#bba67c',false];
 if(f.type==='event')return [f.eventId,EXPLORATION_EVENTS[f.eventId]?.color||'#b6a0d9',!!f.spent];
 if(f.type==='specialRoom')return [f.roomId,SPECIAL_ROOMS[f.roomId]?.color||'#d2c5a1',!!f.spent];
 return null;
}
function drawObject(id,color,px,py,visible=true,spent=false){
 for(const [c,x,y,w,h] of objectSprite(id,color,visible,spent)){ctx.fillStyle=c;ctx.fillRect(px+x,py+y,w,h)}
}
/* TECH-012C — Convertit les mêmes opérations de dessin du donjon en SVG pour l'inventaire. */
function objectIcon(id,color){
 return '<svg aria-hidden="true" viewBox="0 0 16 16" width="24" height="24" style="vertical-align:middle;shape-rendering:crispEdges;margin-right:5px">'+objectSprite(id,color).map(([c,x,y,w,h])=>'<rect fill="'+c+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>').join('')+'</svg>';
}
function drawFeature(f,px,py,visible){
  const a=featureArt(f);
  if(a)drawObject(a[0],a[1],px,py,visible,a[2])
}