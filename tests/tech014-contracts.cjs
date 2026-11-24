'use strict';
// TECH-014A/B : comparaison indépendante avec les sources du checkpoint.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {BASE,CLASSES_IDS,rng32}=require('../tools/godot/reference.cjs');
const {generator,geometry,combat,dist,doctrineBonus,diminishingChance}=require('../tools/godot/simulation-contract.cjs');
const root=path.resolve(__dirname,'..');
const source=name=>execFileSync('git',['show',BASE+':src/game/'+name+'.js'],{cwd:root,encoding:'utf8'});
const load=(name,api,context={})=>vm.runInNewContext(source(name)+'\n;('+api+')',context,{timeout:1000});
const seeds=[0,1,1234567,0xffffffff],rngVectors=[];
const dungeon=load('dungeon','buildDungeon');
// Extraire exclusivement la petite fonction historique de tirage local.
// Si sa forme change, ce test échoue plutôt que d'accepter un autre RNG.
const legacyRng=source('dungeon').match(/let state=seed>>>0;\s*const rand=n=>\{[\s\S]*?\n  \};/);
assert.ok(legacyRng,'PRNG historique introuvable');
for(const seed of seeds){
  const lcg=generator(seed,'lcg32'),mul=generator(seed,'mulberry32');
  const original=rng32(seed);
  const legacy=vm.runInNewContext('(seed)=>{'+legacyRng[0]+'return rand;}')(seed);
  const vector={seed,lcg32:[],mulberry32:[]};
  for(let i=0;i<64;i++){
    const a=lcg.uint32(),b=mul.uint32();
    assert.equal(a,original.next()*4294967296);
    assert.equal(b,legacy(4294967296));
    if(i<16){vector.lcg32.push(a);vector.mulberry32.push(b)}
  }
  rngVectors.push(vector);
}
assert.throws(()=>generator(-1,'lcg32'));
assert.throws(()=>generator(1,'bad'));
assert.throws(()=>generator(1,'lcg32').integer(0));
let geometryChecks=0;
const geometryCases=[];
for(let floor=1;floor<=30;floor++)for(const seed of seeds){
  const d=dungeon(48,32,floor,seed),map=Array.from(d.map);
  const W=48,H=32,idx=(x,y)=>y*W+x,inside=(x,y)=>x>=0&&y>=0&&x<W&&y<H,clear=(x,y)=>inside(x,y)&&map[idx(x,y)]===0;
  const S={...d.start},seen=Array(W*H).fill(0),g=geometry(W,H,map);
  const legacy=load('geometry','{los,stepOK,reveal}',{W,H,idx,inside,clear,S,seen});
  // Toutes les cases, y compris les coordonnées extérieures et les huit directions.
  for(let y=-1;y<=H;y++)for(let x=-1;x<=W;x++){
    assert.equal(g.los(S,x,y),legacy.los(x,y));geometryChecks++;
    if(inside(x,y))for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      assert.equal(g.stepOK(x+dx,y+dy,x,y),legacy.stepOK(x+dx,y+dy,x,y));geometryChecks++;
    }
  }
  const revealed=g.reveal(S,seen);assert.ok(seen.every(x=>x===0));
  legacy.reveal();assert.deepEqual(revealed,seen);
  if([1,6,15,30].includes(floor)&&seed===1234567)geometryCases.push({floor,seed,map,player:S,seen:revealed});
}
let combatChecks=0;const combatCases=[];
for(const classId of CLASSES_IDS)for(const spec of [null,'offense','defense'])for(const floor of [1,6,7,15,30])for(const low of [false,true])for(const family of [null,'blade','spear','bow','staff']){
  const S={classId,spec,floor,level:floor,x:5,y:5,hp:low?10:20,maxHp:20,res:low?4:12,maxRes:12,turn:floor,attrs:[9,12,6,24,16,20],nodes:{o1:low,o2:low,d1:true,d2:true,master:floor>=15},atk:2,armor:4,guard:low?2:0,shield:low?3:0,boost:low?2:0,equip:{weapon:null}};
  const bonuses={atk:2,def:3,crit:11,dodge:6,regen:2},talents={crit:3,dodge:2,skill:2,basic:1,ranged:1,lowHp:2,def:2};
  const deps={bonus:k=>bonuses[k]||0,talentBonus:k=>talents[k]||0,weaponFamily:()=>family,currentStyle:()=>({def:1}),synergyDamage:()=>2};
  const a=combat(S,deps),b=load('combat-formulas','{criticalChance,dodgeChance,attackAttribute,outgoingDamage,incomingDamage,resourceRegen,doctrineBonus,diminishingChance}',{S,dist,...deps});
  const m={x:9,y:5,hp:8,maxHp:20,atk:19,bleed:1,exposed:2,affix:low?'armored':'furious',boss:floor%6===0,elite:floor>=7};
  const input={S,bonuses,talents,family,styleDef:1,synergyDamage:2,target:m};
  const outputs=[];
  for(const profile of [null,{skill:true,power:3,ranged:false,crit:5},{ranged:true,power:1,pierce:1,crit:4}]){
    const values={crit:a.criticalChance(profile),dodge:a.dodgeChance(),attribute:a.attackAttribute(profile),damage:a.outgoingDamage(m,5,profile),critical:a.outgoingDamage(m,5,profile,true),incoming:a.incomingDamage(m,2,1),regen:a.resourceRegen(!!profile?.ranged,!!profile?.skill),doctrine:doctrineBonus(S,'damage',m,profile)};
    assert.deepEqual(values,{crit:b.criticalChance(profile),dodge:b.dodgeChance(),attribute:b.attackAttribute(profile),damage:b.outgoingDamage(m,5,profile),critical:b.outgoingDamage(m,5,profile,true),incoming:b.incomingDamage(m,2,1),regen:b.resourceRegen(!!profile?.ranged,!!profile?.skill),doctrine:b.doctrineBonus(S,'damage',m,profile)});
    combatChecks+=8;outputs.push({profile,values});
  }
  if([1,7,30].includes(floor)&&family==='spear')combatCases.push({input,outputs});
}
for(let raw=-10;raw<=200;raw++)assert.equal(diminishingChance(raw,35,50),Math.max(0,Math.min(50,raw<=35?raw:35+Math.floor((raw-35)/3))));
const pack={schema:'cryptgrave-system-contract-v1',reference:BASE,rngVectors,geometryCases,combatCases,coverage:{layouts:120,geometryChecks,combatChecks}};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({layouts:120,geometryChecks,combatChecks,rngVectors:rngVectors.length,geometryFixtures:geometryCases.length,combatFixtures:combatCases.length}));
