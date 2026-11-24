// GAME-007A: 16x16 procedural pixel tiles; purely visual, no RNG or save mutations.
const TILE_ART_CACHE=new Map();
/* TECH-012C — Multiplie les trois composantes RGB et les borne pour produire une variation de luminosité. */
function tileTint(hex,mul){
 const n=parseInt(hex.slice(1),16);
 return '#'+[n>>16&255,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*mul))).toString(16).padStart(2,'0')).join('');
}
/* TECH-012C — Calcule une variante stable à partir des coordonnées, sans consommer de tirage aléatoire de gameplay. */
function tileVariant(x,y){
  let n=(Math.imul(x+1,73856093)^Math.imul(y+1,19349663))>>>0;
  n=Math.imul(n^(n>>>16),0x7feb352d);
  return (n^(n>>>15))&3
}
/* TECH-012C — Encode les frontières nord, est, sud et ouest sur quatre bits, seulement si le voisin est découvert. */
function knownTileEdges(x,y,wall,grid,memory,w,h){
 let mask=0;for(const [dx,dy,bit] of [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]]){
   const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
   const k=ny*w+nx;if(memory[k]&&(grid[k]===1)!==wall)mask|=bit;
 }return mask;
}
/* TECH-012C — Construit les rectangles d'une case selon le biome, le brouillard, le motif et les frontières connues. */
function tileArt(b,wall,visible,variant,edges){
 const i=visible?0:1,v=variant&3,e=edges&15,key=[b.motif,wall?1:0,i,v,e].join(':');
 if(TILE_ART_CACHE.has(key))return TILE_ART_CACHE.get(key);
 const base=wall?b.wall[i]:b.floor[i],highlight=wall?b.edge[i]:b.detail[i],dark=tileTint(base,.69),mid=tileTint(base,1.10),light=tileTint(highlight,1.12);
 const ops=[],r=(c,x,y,w,h)=>ops.push([c,x,y,w,h]);
 r(base,0,0,16,16);
 if(wall){
   if(['brick','mosaic','rune'].includes(b.motif)){
     for(let row=0;row<3;row++){
       const yy=row*5,split=(v*3+row*7)%10+3;
       r(mid,1,yy+1,split-1,3);r(mid,split+1,yy+1,14-split,3);
       r(dark,0,yy+4,16,1);r(dark,split,yy,1,4);
       r(highlight,1,yy,split-1,1);r(highlight,split+1,yy,14-split,1);
     }
     if(b.motif==='rune'&&v===1){r(dark,5,5,6,7);r(highlight,7,6,2,5);r(highlight,6,8,4,1)}
     if(b.motif==='mosaic'&&v===2){r(dark,2,7,3,3);r(light,3,7,1,2)}
   }else{
     r(mid,1,1,9,5);r(dark,0,6,7,1);r(dark,10,0,1,7);r(mid,8,8,7,5);r(dark,5,11,3,4);r(highlight,2+v,2,4,1);r(highlight,9,8,4,1);r(dark,0,15,16,1);
     if(b.motif==='fungus'){r(highlight,2+v,8,4,2);r(mid,3+v,10,2,3);r(light,3+v,8,1,1)}
     if(b.motif==='ice'){r(light,5+v,2,1,7);r(highlight,4+v,5,3,1);r(highlight,11,10,2,4)}
     if(b.motif==='crack'){r(highlight,9,3,1,5);r(highlight,7,7,3,1);r(highlight,7,8,1,5)}
     if(b.motif==='void'){r(highlight,5+v,3,1,4);r(dark,6+v,6,3,4);r(highlight,8+v,10,1,3)}
   }
   // Exposed wall faces only when the neighbouring tile has been discovered.
   if(e&1)r(highlight,0,0,16,2);
   if(e&2)r(dark,14,0,2,16);
   if(e&4){r(dark,0,12,16,4);r(highlight,0,12,16,1)}
   if(e&8)r(highlight,0,0,1,16);
 }else{
   r(mid,2+v,2,4,2);r(dark,10-v,12,3,1);
   if(b.motif==='brick'){r(dark,0,7,16,1);r(dark,v%2?5:11,0,1,7);r(dark,v%2?11:5,8,1,8);r(highlight,2,8,4,1)}
   if(b.motif==='rock'){r(dark,3+v,5,3,2);r(highlight,3+v,5,2,1);r(highlight,11,10,2,1);r(dark,1,13,2,2)}
   if(b.motif==='mosaic'){r(dark,7,0,1,16);r(dark,0,7,16,1);r(highlight,2,2,4,1);r(highlight,9,9,4,1)}
   if(b.motif==='crack'){r(dark,2,4+v,6,1);r(dark,7,5+v,1,4);r(highlight,8,8+v,4,1)}
   if(b.motif==='rune'){r(dark,0,0,16,1);r(dark,0,15,16,1);if(v===0){r(highlight,7,4,2,8);r(highlight,4,7,8,2)}else r(highlight,3+v,10,2,1)}
   if(b.motif==='fungus'){r(dark,3+v,5,4,5);r(highlight,2+v,4,5,2);r(mid,4+v,6,1,4);r(highlight,11,11,2,2)}
   if(b.motif==='ice'){r(highlight,2,4+v,8,1);r(highlight,6,11,8,1);r(dark,10,5+v,1,4)}
   if(b.motif==='void'){r(dark,4,3,1,6);r(highlight,5,8,5,1);r(dark,10,9,1,4)}
   // One-pixel contact shadows preserve the exact walkable 16px tile.
   if(e&1)r(dark,0,0,16,1);if(e&2)r(dark,15,0,1,16);if(e&4)r(dark,0,15,16,1);if(e&8)r(dark,0,0,1,16);
 }
 TILE_ART_CACHE.set(key,ops);return ops;
}
// GAME-011C2: one bounded, lazy 256x256 opaque atlas for the current biome.
// Keep the original rect path for environments without a Canvas image API.
let tileAtlas=null,tileAtlasCtx=null,tileAtlasBiome=null;
const tileAtlasReady=new Uint8Array(256);
/* TECH-012C — Dessine une case à partir de l'atlas Canvas calculé à la demande ; conserve un rendu par rectangles comme solution de repli. */
function drawBiomeTile(b,x,y,wall,visible,px,py){
 const variant=tileVariant(x,y),edges=knownTileEdges(x,y,wall,map,seen,W,H);
 if(typeof ctx.drawImage==='function'&&typeof document.createElement==='function'){
   if(!tileAtlas){
     tileAtlas=document.createElement('canvas');tileAtlas.width=256;tileAtlas.height=256;
     tileAtlasCtx=tileAtlas.getContext('2d');
   }
   if(tileAtlasCtx){
     /* TECH-012C — Invalide les cases préparées lors d'un changement de biome. */
     if(tileAtlasBiome!==b){tileAtlasBiome=b;tileAtlasReady.fill(0)}
     /* TECH-012C — Les 256 cases de l'atlas couvrent les combinaisons mur/sol, visible/mémorisé, quatre variantes et seize masques de bord. */
     const slot=(wall?128:0)+(visible?0:64)+variant*16+edges;
     const ax=(slot%16)*T,ay=Math.floor(slot/16)*T;
     if(!tileAtlasReady[slot]){
       for(const [color,dx,dy,w,h] of tileArt(b,wall,visible,variant,edges)){
         tileAtlasCtx.fillStyle=color;tileAtlasCtx.fillRect(ax+dx,ay+dy,w,h);
       }
       tileAtlasReady[slot]=1;
     }
     ctx.drawImage(tileAtlas,ax,ay,T,T,px,py,T,T);return;
   }
 }
 const ops=tileArt(b,wall,visible,variant,edges);
 for(const [color,dx,dy,w,h] of ops){ctx.fillStyle=color;ctx.fillRect(px+dx,py+dy,w,h)}
}