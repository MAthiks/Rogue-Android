/* TECH-012A — Teste la ligne de vue entre le joueur et une case, dans un rayon de 10 cases. Les obstacles intermédiaires et les angles fermés interrompent la visibilité. */
function los(x,y){
  const dx=x-S.x,dy=y-S.y;if(!inside(x,y)||dx*dx+dy*dy>100)return false;
  const n=Math.max(Math.abs(dx),Math.abs(dy));let px=S.x,py=S.y;
  for(let i=1;i<=n;i++){const nx=Math.round(S.x+dx*i/n),ny=Math.round(S.y+dy*i/n);
    if(nx!==px&&ny!==py&&(!clear(nx,py)||!clear(px,ny)))return false;
    if(i<n&&!clear(nx,ny))return false;px=nx;py=ny;
  }return true;
}
// GAME-011C3: only cells within the existing LOS radius can be revealed.
/* TECH-012A — Marque comme découvertes les cases actuellement visibles dans le voisinage du joueur. Les anciennes découvertes restent mémorisées. */
function reveal(){
 const minX=Math.max(0,Math.ceil(S.x-10)),maxX=Math.min(W-1,Math.floor(S.x+10));
 const minY=Math.max(0,Math.ceil(S.y-10)),maxY=Math.min(H-1,Math.floor(S.y+10));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(los(x,y))seen[idx(x,y)]=1;
}
/* TECH-012A — Vérifie que la destination est praticable. En diagonale, les deux cases orthogonales doivent aussi être libres pour interdire le passage à travers un angle fermé. */
function stepOK(x,y,fx,fy){
  if(!clear(x,y))return false;
  let dx=x-fx,dy=y-fy;
  return !(dx&&dy&&(!clear(fx+dx,fy)||!clear(fx,fy+dy)))
}