// GAME-006B: biome-specific species, independent deterministic stream.
const BESTIARY={
 crypt:[['boneguard','Garde ossuaire','#d1c4a1','brute','crush'],['wraith','Spectre funéraire','#9cafd0','tracker','drain']],
 cave:[['cavefang','Croc cavernicole','#b79b78','ambusher','crush'],['spitter','Cracheur des cavernes','#9bb16b','archer','bolt']],
 ruins:[['sentinel','Sentinelle brisée','#aaa392','brute','crush'],['runecaster','Runiste errant','#d3ae79','archer','burst']],
 volcanic:[['slag','Golem de scories','#bd795c','brute','burst'],['cinder','Salamandre de braise','#e6a35e','tracker','bolt']],
 sanctum:[['templar','Templier déchu','#c3b4e4','brute','crush'],['oracle','Oracle profané','#a79bdc','archer','drain']],
 fungal:[['mycelium','Colosse mycélien','#a9be75','brute','burst'],['sporeling','Porte-spores','#c5a8d5','coward','bolt']],
 frozen:[['frostfang','Loup des glaces','#a8d8e8','tracker','crush'],['icecaller','Sorcière du givre','#80a8dc','archer','bolt']],
 abyss:[['voidstalker','Rôdeur abyssal','#bc84bc','ambusher','drain'],['riftspawn','Rejeton de la faille','#d49ace','tracker','burst']]
};
const CREATURE_POWERS={
 crush:{name:'Frappe lourde',range:1,power:2,cd:3,ranged:false},
 bolt:{name:'Projectile',range:4,power:1,cd:3,ranged:true},
 drain:{name:'Drain vital',range:3,power:0,cd:3,ranged:true},
 burst:{name:'Onde',range:2,power:1,cd:4,ranged:false}
};
function populateBestiary(all,biome,floor,seed){
 if(floor<4||!Object.hasOwn(BESTIARY,biome))return all;
 let state=(seed^Math.imul(floor,0x51ed270b)^0xe245b891)>>>0;
 const rnd=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*n)};
 const depth=Math.max(1,Math.min(30,floor)),bonus=Math.floor((depth-1)/6);
 return all.map(m=>{
   if(m.boss||m.elite||m.rare||rnd(100)>=55)return m;
   const [species,kind,color,role,skill]=BESTIARY[biome][rnd(2)];
   const hp=5+Math.floor(depth/2)+bonus+(role==='brute'?4:role==='tracker'?1:0);
   return {...m,species,kind,color,role,creatureSkill:skill,creatureCD:0,hp,maxHp:hp,atk:2+bonus+(role==='brute'?1:0)};
 });
}
function creatureAction(m,player,all,board){
 if(!m.species||m.boss||!Object.hasOwn(CREATURE_POWERS,m.creatureSkill))return null;
 const skill=CREATURE_POWERS[m.creatureSkill],distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),same=(a,b)=>a.x===b.x&&a.y===b.y;
 const ray=(a,b)=>{const n=distance(a,b);let prev=a;for(let i=1;i<=n;i++){const p={x:Math.round(a.x+(b.x-a.x)*i/n),y:Math.round(a.y+(b.y-a.y)*i/n)};if(!board.stepOK(p.x,p.y,prev.x,prev.y)||(i<n&&all.some(z=>z!==m&&z.hp>0&&same(z,p))))return false;prev=p}return true};
 if(m.intent){const intent=m.intent;
   delete m.intent;
   m.creatureCD=skill.cd;
   return {type:'release',hit:distance(m,player)<=skill.range+Number(m.creatureSkill==='burst')&&intent.cells.some(p=>same(p,player))&&ray(m,player),power:skill.power,ranged:skill.ranged,drain:m.creatureSkill==='drain',name:skill.name}}
 if(m.creatureCD>0){m.creatureCD--;return null}
 if(distance(m,player)>skill.range||!ray(m,player))return null;
 const cells=[{x:player.x,y:player.y}];
 if(m.creatureSkill==='burst')for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const p={x:player.x+dx,y:player.y+dy};
   if(!same(m,p)&&board.stepOK(p.x,p.y,player.x,player.y)&&ray(m,p))cells.push(p);
 }
 if(m.role==='ambusher')m.awake=true;
 m.intent={cells,power:skill.power};return {type:'announce',name:skill.name};
}
function drawCreatureMark(m,px,py){
 if(!m.species)return;
 ctx.fillStyle='#f2dcb3';
 if(m.creatureSkill==='crush'){ctx.fillRect(px+1,py+5,3,7);ctx.fillRect(px+12,py+5,3,7)}
 else if(m.creatureSkill==='bolt'){ctx.fillRect(px+12,py+3,2,9);ctx.fillRect(px+10,py+3,4,2)}
 else if(m.creatureSkill==='drain'){ctx.fillRect(px+7,py+9,2,4);ctx.fillRect(px+5,py+11,6,2)}
 else if(m.creatureSkill==='burst'){ctx.fillRect(px+6,py+2,4,2);ctx.fillRect(px+2,py+9,2,3);ctx.fillRect(px+12,py+9,2,3)}
}
// GAME-006C: seeded boss alternatives, without changing historic promotion or saves.
const EXTENDED_BOSSES={
 ossuary:{floor:6,name:'Morvath, le Roi ossuaire',color:'#d6c5a0',ability:'Mur d’ossements',pattern:'wall',range:3,slot:'helmet',relic:'Couronne de Morvath',def:3,atk:1},
 mire:{floor:12,name:'Mykora, la Mère des spores',color:'#a9bf72',ability:'Floraison toxique',pattern:'diagonal',range:3,slot:'boots',relic:'Bottes de Mykora',def:2,dodge:5},
 runes:{floor:18,name:'Asterion, le Gardien des runes',color:'#c9ad77',ability:'Lance runique',pattern:'beam',range:4,slot:'weapon',relic:'Lance d’Asterion',family:'blade',atk:5,crit:3},
 frost:{floor:24,name:'Iskarn, le Cœur de givre',color:'#9bd7ed',ability:'Fracture glaciaire',pattern:'cross',range:3,slot:'armor',relic:'Armure d’Iskarn',def:5},
 abyssal:{floor:30,name:'Nox, le Dévoreur du vide',color:'#c296da',ability:'Déchirure abyssale',pattern:'wings',range:4,slot:'ring',relic:'Sceau de Nox',atk:2,crit:5,regen:1,drain:true}
};
function selectBossVariant(all,floor,seed){
 const entry=Object.entries(EXTENDED_BOSSES).find(([,b])=>b.floor===floor);
 if(!entry||!Number.isInteger(seed))return all;
 let n=(seed^Math.imul(floor,0x85ebca6b)^0x68bc21eb)>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0;
 if(n%100>=50)return all;
 const [boss,b]=entry;
 return all.map(m=>m.boss?{...m,boss,kind:b.name,color:b.color,ability:b.ability,phase:1,specialCD:0}:m);
}
function extendedBossAction(m,player,board,all=[]){
 const b=EXTENDED_BOSSES[m.boss];if(!Object.hasOwn(EXTENDED_BOSSES,m.boss))return null;
 const dist=(a,z)=>Math.max(Math.abs(a.x-z.x),Math.abs(a.y-z.y)),same=(a,z)=>a.x===z.x&&a.y===z.y;
 const ray=(a,z)=>{const n=dist(a,z);let prev=a;for(let i=1;i<=n;i++){const p={x:Math.round(a.x+(z.x-a.x)*i/n),y:Math.round(a.y+(z.y-a.y)*i/n)};if(!board.stepOK(p.x,p.y,prev.x,prev.y))return false;prev=p}return true};
 const phase=m.hp*3<=m.maxHp?3:m.hp*3<=2*m.maxHp?2:1;
 const changed=phase>(m.phase||1);m.phase=Math.max(m.phase||1,phase);
 const cd=m.phase===1?3:2;
 if(m.intent){const intent=m.intent;delete m.intent;m.specialCD=cd;return {type:'release',hit:intent.cells.some(p=>same(p,player))&&ray(m,player),power:intent.power,drain:!!b.drain,changed}}
 if(m.specialCD>0){m.specialCD--;return changed?{type:'phase',changed}:null}
 if(dist(m,player)>b.range||!ray(m,player))return changed?{type:'phase',changed}:null;
 const dx=Math.sign(player.x-m.x),dy=Math.sign(player.y-m.y);
 const offsets=b.pattern==='wall'?(Math.abs(player.x-m.x)>=Math.abs(player.y-m.y)?[[0,-1],[0,1]]:[[-1,0],[1,0]]):
 b.pattern==='diagonal'?[[-1,-1],[1,1],[-1,1],[1,-1]]:
 b.pattern==='beam'?[[-dx,-dy],[dx,dy]]:
 b.pattern==='cross'?[[1,0],[-1,0],[0,1],[0,-1]]:
 [[-dy,dx],[dy,-dx],[dx,dy]];
 const cells=[{x:player.x,y:player.y}];
 const add=(ox,oy)=>{const p={x:player.x+ox,y:player.y+oy};if(!same(p,m)&&!cells.some(z=>same(z,p))&&board.stepOK(p.x,p.y,player.x,player.y)&&ray(m,p))cells.push(p)};
 // Phase one uses two peripheral cells at most, later phases extend the pattern.
 for(const [ox,oy] of offsets.slice(0,m.phase===1?2:offsets.length))add(ox,oy);
 if(m.phase===3&&b.pattern==='beam'){add(-dy,dx);add(dy,-dx)}
 const escapes=[];
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(x||y){
   const p={x:player.x+x,y:player.y+y};
   if(board.stepOK(p.x,p.y,player.x,player.y)&&!same(p,m)&&!all.some(z=>z.hp>0&&same(p,z)))escapes.push(p);
 }
 if(!escapes.length)return changed?{type:'phase',changed}:null;
 if(!escapes.some(p=>!cells.some(z=>same(z,p)))){
   const safe=escapes[0],i=cells.findIndex(p=>same(p,safe));if(i>0)cells.splice(i,1);
 }
 m.intent={cells,power:m.phase+1};
 return {type:'announce',changed};
}
function extendedBossReward(m){
 const b=EXTENDED_BOSSES[m.boss];
 return {id:++S.serial,slot:b.slot,name:b.relic,atk:b.atk||0,def:b.def||0,crit:b.crit||0,regen:b.regen||0,dodge:b.dodge||0,bossRelic:true,rarity:5,itemLevel:Math.max(1,Math.min(30,S.floor)),uniqueId:'boss-'+m.boss,...(b.family?{family:b.family}:{})};
}
function drawBossPhase(m,px,py){
 if(!m.boss)return;
 ctx.fillStyle='#f7e3b5';for(let i=0;i<Math.max(1,Math.min(Object.hasOwn(EXTENDED_BOSSES,m.boss)?3:2,m.phase||1));i++)ctx.fillRect(px+3+i*4,py+13,2,2);
}