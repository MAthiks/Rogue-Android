'use strict';
// TECH-014 : comparer actions, mutations et refus aux sources du checkpoint.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {BASE,CLASSES_IDS,createSession}=require('../tools/godot/reference.cjs');
const {geometry,dist,generator}=require('../tools/godot/simulation-contract.cjs');
const {tactics,transfer}=require('../tools/godot/tactical-contract.cjs');
const root=path.resolve(__dirname,'..');
const source=n=>execFileSync('git',['show',BASE+':src/game/'+n+'.js'],{cwd:root,encoding:'utf8'});
const clone=x=>JSON.parse(JSON.stringify(x));
const eq=(a,b)=>assert.deepEqual(clone(a),clone(b));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),catalogs=createSession(html,0).catalogs();
const a=tactics(catalogs);
const api='{bossAction,tacticalTurn,creatureAction,extendedBossAction,aiFamily,aiLine,aiNeighbors,aiThreatCells,aiEscapeCells,prepareCoordinatedIntent,coordinatedAction}';
const b=vm.runInNewContext(source('combat-turns')+'\n'+source('bestiary-bosses')+'\n;('+api+')',{dist});
let checks=0;const tacticalCases=[],transferCases=[];
const mob=(role,x,y,extra={})=>({role,x,y,hp:12,maxHp:12,atk:3,...extra});
const W=17,H=17;
const roles=['wanderer','brute','archer','ambusher','coward','tracker','guardian'];
const bosses=['stone','ash','veil',...Object.keys(catalogs.EXTENDED_BOSSES)];
for(let seed=0;seed<12;seed++){
 const r=generator(seed,'lcg32').integer,map=Array(W*H).fill(0);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x===0||y===0||x===W-1||y===H-1||(r(10)===0&&!(x>=3&&x<=12&&y>=5&&y<=9)))map[y*W+x]=1;
 const board={W,H,stepOK:geometry(W,H,map).stepOK},player={x:8,y:7};
 for(const role of roles){
  const initial=[mob(role,4,7,{hp:seed%2?3:12}),mob('archer',5,6),mob('brute',7,6)],left=clone(initial),right=clone(initial),steps=[];
  for(let i=0;i<5;i++){
   const x=a.tacticalTurn(left[0],player,left,board,left.slice(1)),y=b.tacticalTurn(right[0],player,right,board,right.slice(1));
   eq(x,y);eq(left,right);checks+=2;
   const u=a.coordinatedAction(left[0],player,left,board,[],x),v=b.coordinatedAction(right[0],player,right,board,[],y);
   eq(u,v);eq(left,right);checks+=2;
   if(u.type==='move'){Object.assign(left[0],{x:u.x,y:u.y});Object.assign(right[0],{x:v.x,y:v.y})}
   steps.push({base:x,action:u,state:clone(left)});
  }
  eq(a.aiEscapeCells(player,left,board),b.aiEscapeCells(player,right,board));checks++;
  if(seed===0||seed===11)tacticalCases.push({type:'role',role,seed,map,player,initial,steps});
 }
 for(const boss of bosses)for(const hp of [12,7,3]){
  const initial=[mob('guardian',6,7,{boss,hp,phase:1,specialCD:0})],left=clone(initial),right=clone(initial),steps=[];
  const fn=Object.hasOwn(catalogs.EXTENDED_BOSSES,boss)?'extendedBossAction':'bossAction';
  for(let i=0;i<5;i++){
   const x=a[fn](left[0],player,board,left),y=b[fn](right[0],player,board,right);eq(x,y);eq(left,right);checks+=2;
   const u=a.prepareCoordinatedIntent(left[0],player,left,board),v=b.prepareCoordinatedIntent(right[0],player,right,board);eq(u,v);eq(left,right);checks+=2;
   steps.push({action:x,coordinated:u,state:clone(left)});
  }
  if(seed===0)tacticalCases.push({type:'boss',boss,hp,map,player,initial,steps});
 }
 for(const creatureSkill of Object.keys(catalogs.CREATURE_POWERS)){
  const initial=[mob('ambusher',7,7,{species:'wraith',creatureSkill})],left=clone(initial),right=clone(initial),steps=[];
  for(let i=0;i<5;i++){const x=a.creatureAction(left[0],player,left,board),y=b.creatureAction(right[0],player,right,board);eq(x,y);eq(left,right);checks+=2;steps.push({action:x,state:clone(left)})}
  if(seed===0)tacticalCases.push({type:'creature',creatureSkill,map,player,initial,steps});
 }
}
const parser=transfer(catalogs),legacy=vm.runInNewContext(source('history-transfer')+'\n;({parseTransfer})',{W:48,H:32,CLASSES:catalogs.CLASSES,BIOMES:catalogs.BIOMES});
const accepted=(f,t)=>{try{return {ok:true,output:f(t)}}catch(e){return {ok:false}}};
function compare(text,ok,label,keep=false){
 const x=accepted(parser.parseTransfer,text),y=accepted(legacy.parseTransfer,text);eq(x,y);assert.equal(x.ok,ok,label);checks+=2;
 if(keep)transferCases.push({label,text,accepted:ok});
}
for(const id of CLASSES_IDS){
 const session=createSession(html,1234567);session.start(id);
 const bundle={format:'cryptgrave-transfer-v1',run:session.saveData(),history:session.history(),prefs:{zoom:100,pad:100}};
 const valid=JSON.stringify(bundle);compare(valid,true,id+' valide',true);
 const mutations=[
 ['format',b=>b.format='unknown'],['mort',b=>b.run.S.dead=true],['fin',b=>b.run.S.ended='victory'],
 ['classe',b=>b.run.S.classId='constructor'],['carte',b=>b.run.map.pop()],['position',b=>b.run.S.x=999],
 ['pv',b=>b.run.S.hp=b.run.S.maxHp+1],['niveau',b=>b.run.S.level=31],['barre',b=>b.run.S.bar=[0,0,2]],
 ['inventaire',b=>b.run.S.bag=Array.from({length:25},()=>({}))],['zoom',b=>b.prefs.zoom=999],
 ['historique',b=>b.history.total=-1],['propriété',b=>Object.defineProperty(b.run.S,'__proto__',{value:{bad:1},enumerable:true})],
 ['chaîne',b=>b.run.S.invalid='<invalid>'],['terrain',b=>b.run.terrain.push({x:-1,y:0,type:'trap'})]
 ];
 for(const [label,mutate] of mutations){const bad=clone(bundle);mutate(bad);compare(JSON.stringify(bad),false,id+' '+label,id==='warrior')}
}
compare(JSON.stringify({format:'cryptgrave-transfer-v1',run:null,history:null,prefs:{zoom:100,pad:100}}),true,'vide',true);
compare('{',false,'JSON tronqué',true);compare('x'.repeat(524289),false,'taille');
const pack={schema:'cryptgrave-tactical-contract-v1',reference:BASE,checks,tacticalCases,transferCases};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({checks,tacticalCases:tacticalCases.length,transferCases:transferCases.length,bosses:bosses.length,roles:roles.length}));
