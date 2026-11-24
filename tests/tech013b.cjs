'use strict';
// TECH-013B : vérifie la géométrie extraite avec un état injecté dans un contexte isolé.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/game/geometry.js'),'utf8');
const W=48,H=32;
function fixture(map,x,y,seen=Array(W*H).fill(0)){
  const S={x,y},idx=(x,y)=>y*W+x,inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
  const clear=(x,y)=>inside(x,y)&&map[idx(x,y)]===0;
  const context={S,W,H,idx,inside,clear,seen};
  return vm.runInNewContext(source+'\n;({los,reveal,stepOK})',context,{timeout:1000});
}
const open=Array(W*H).fill(0),pos=(x,y)=>y*W+x;
let g=fixture(open,20,15);
assert.equal(g.los(20,15),true);
assert.equal(g.los(30,15),true);
assert.equal(g.los(31,15),false);
assert.equal(g.los(28,23),false);
assert.equal(g.los(-1,15),false);
assert.equal(g.stepOK(21,16,20,15),true);
const walls=open.slice();
walls[pos(21,15)]=1;
g=fixture(walls,20,15);
assert.equal(g.los(21,15),true,'wall itself visible');
assert.equal(g.los(22,15),false,'wall hides beyond');
assert.equal(g.los(21,16),false,'closed diagonal');
assert.equal(g.stepOK(21,16,20,15),false,'no corner cutting');
assert.equal(g.stepOK(21,15,20,15),false,'blocked destination');
const memory=Array(W*H).fill(0);memory[pos(0,0)]=1;
g=fixture(walls,20,15,memory);g.reveal();
assert.equal(memory[pos(0,0)],1,'previous discovery preserved');
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(x===0&&y===0)continue;
  assert.equal(memory[pos(x,y)],Number(g.los(x,y)),'visibility memory '+x+','+y);
}
for(const [x,y] of [[0,0],[W-1,H-1],[0,H-1],[W-1,0]]){
 const edge=Array(W*H).fill(0),api=fixture(open,x,y,edge);
 api.reveal();
 assert.equal(edge[pos(x,y)],1);
 assert.equal(edge.length,W*H);
 for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++)assert.equal(edge[pos(xx,yy)],Number(api.los(xx,yy)));
}
console.log('TECH-013B: visibility radius, walls, diagonal movement, memory and 4 map boundaries validated');
