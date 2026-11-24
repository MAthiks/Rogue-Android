'use strict';
// Comparaison des contrats autonomes avec les fichiers du commit immuable.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {BASE,CLASSES_IDS,createSession}=require('../tools/godot/reference.cjs');
const {generator}=require('../tools/godot/simulation-contract.cjs');
const d=require('../tools/godot/domain-contract.cjs');
const root=path.resolve(__dirname,'..'),cache=new Map();
function source(name){if(!cache.has(name))cache.set(name,execFileSync('git',['show',BASE+':src/game/'+name+'.js'],{cwd:root,encoding:'utf8'}));return cache.get(name)}
const load=(names,api,ctx={})=>vm.runInNewContext(names.map(source).join('\n')+'\n;('+api+')',ctx,{timeout:1000});
const clone=x=>JSON.parse(JSON.stringify(x));
const eq=(a,b)=>assert.deepEqual(clone(a),clone(b));
const c=createSession(fs.readFileSync(path.join(root,'index.html'),'utf8'),0).catalogs();
const items=d.items(c),rng=seed=>generator(seed,'lcg32').integer;
const legacy=load(['weapons','items','consumables','economy'],'{createGear,rarityOf,rollRarity,setCount,setBonus,gearPrice,salePrice,merchantStock,goldReward}');
const progression=load(['progression'],'{enemyXP,balanceEnemies,bandageValue}');
let checks=0;const gearCases=[],merchantCases=[],progressCases=[],migrationCases=[],talentCases=[];
for(let floor=1;floor<=30;floor++){
 for(const m of [{hp:9,maxHp:9,atk:3},{hp:9,maxHp:9,atk:3,elite:true},{hp:9,maxHp:9,atk:3,boss:true},{hp:9,maxHp:9,atk:3,rare:true}]){
  eq(d.enemyXP(m,floor),progression.enemyXP(m,floor));eq(d.balanceEnemies([m],floor),progression.balanceEnemies([m],floor));eq(d.goldReward(m,floor),legacy.goldReward(m,floor));checks+=3;
 }
 eq(d.bandageValue(floor),progression.bandageValue(floor));checks++;
 for(let roll=0;roll<100;roll++)for(let min=1;min<=5;min++){eq(d.rollRarity(floor,roll,min),legacy.rollRarity(floor,roll,min));checks++}
 for(const seed of [0,1,1234567,0xffffffff]){
  for(const forced of [null,1,2,3,4,5]){
   const a=items.createGear(1,floor,1,rng(seed),forced),b=legacy.createGear(1,floor,1,rng(seed),forced);
   eq(a,b);eq(d.gearPrice(a),legacy.gearPrice(b));eq(d.salePrice(a),legacy.salePrice(b));checks+=3;
   if([1,8,9,16,17,24,25,30].includes(floor)&&seed===1234567)gearCases.push({floor,seed,forced,item:a,buy:d.gearPrice(a),sell:d.salePrice(a)});
  }
  for(const merchantId of Object.keys(c.MERCHANTS)){
   const a=d.merchantStock(c,floor,seed,merchantId);eq(a,legacy.merchantStock(floor,seed,merchantId));checks++;
   if([2,14,29].includes(floor)&&seed===1234567)merchantCases.push({floor,seed,merchantId,stock:a});
  }
 }
}
for(const [key,set] of Object.entries(c.GEAR_SETS)){
 const equip={};for(const [slot,name] of Object.entries(set.pieces)){
  equip[slot]={slot,name,setId:key,atk:2};
  eq(items.setCount(equip,key),legacy.setCount(equip,key));checks++;
  for(const stat of ['atk','def','crit','dodge','regen']){eq(items.setBonus(equip,stat),legacy.setBonus(equip,stat));checks++}
 }
}
for(const it of [{name:'Rare · Hache'},{name:'Épique · Arc'},{bossRelic:true},{rarity:2},{name:'Hache'}]){eq(d.rarityOf(it),legacy.rarityOf(it));checks++}
for(const classId of CLASSES_IDS){
 for(const level of [1,5,15,29,30])for(const xp of [0,14,500,100000]){
  const input={classId,level,xp:0,points:0,ap:0,hp:10,maxHp:20,res:0,maxRes:12},a=clone(input),b=clone(input),events=[];
  const p=load(['progression'],'{gainXP,healingLeft}',{S:b,say:t=>events.push(t)});
  const out=d.gainXP(a,xp);p.gainXP(xp);eq(a,b);eq(out,events);eq(d.healingLeft(a),p.healingLeft());checks+=3;
  if(level===1||level===29)progressCases.push({input,xp,output:a,events:out});
 }
 for(const bar of [undefined,[0,1,3],[0,0,2],[0,1,4]]){
  const input={classId,cool:[0,1,2],bar,activeTalents:{3:true},bag:[{id:5}],equip:{weapon:{id:7}},serial:2},loot=[{item:{id:15}}],b=clone(input);
  const a=d.migrate(input,loot,c.BASE);
  load(['persistence'],'migrate()',{S:b,loot,unlocked:i=>i<3||!!b.activeTalents[i]});eq(a,b);assert.equal(input.serial,2);checks+=2;
  migrationCases.push({input,loot,output:a});
 }
 for(const spec of ['offense','defense'])for(const level of [5,10,18,30]){
  const input={classId,spec,level,points:20,nodes:{o1:true,d1:true},hp:8,maxHp:20,res:3,maxRes:12,guard:2,shield:3,boost:2},a=clone(input),b=clone(input);
  const x=d.talents(a,c),y=load(['talents'],'{canLearnAdvanced,learnAdvanced,talentBonus,canLearnSynergy,learnSynergy,hasSynergy,synergyDamage,synergyHeal,synergyGuard,synergyShield,synergyDuration}',{S:b});
  const purchases=[];
  for(const [id] of c.ADV_TALENTS[classId]){eq(x.canLearnAdvanced(id),y.canLearnAdvanced(id));const ok=x.learnAdvanced(id);eq(ok,y.learnAdvanced(id));checks+=2;purchases.push({type:'advanced',id,ok})}
  for(const [id] of c.SYNERGIES[classId]){eq(x.canLearnSynergy(id),y.canLearnSynergy(id));const ok=x.learnSynergy(id);eq(ok,y.learnSynergy(id));eq(x.hasSynergy(id),y.hasSynergy(id));checks+=3;purchases.push({type:'synergy',id,ok})}
  eq(a,b);checks++;
  const stats={};for(const k of ['basic','skill','ranged','crit','dodge','def','heal','guard','shield','lowHp','bleed','bandage']){stats[k]=x.talentBonus(k);eq(stats[k],y.talentBonus(k));checks++}
  const target={exposed:2,boss:false};const profiles=[null,{skill:true,index:0},{skill:true,index:3,secondary:true}];
  const damage=profiles.map(p=>{const v=x.synergyDamage(target,p);eq(v,y.synergyDamage(target,p));checks++;return v});
  const effects={heal:x.synergyHeal(),guard:x.synergyGuard(),shield:x.synergyShield(),durations:['exposed','bleed','stun'].map(k=>x.synergyDuration(k,target))};
  eq(effects,{heal:y.synergyHeal(),guard:y.synergyGuard(),shield:y.synergyShield(),durations:['exposed','bleed','stun'].map(k=>y.synergyDuration(k,target))});checks+=6;
  talentCases.push({input,purchases,output:a,stats,target,profiles,damage,effects});
 }
}
const pack={schema:'cryptgrave-domain-contract-v1',reference:BASE,checks,gearCases,merchantCases,progressCases,migrationCases,talentCases};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({checks,gearCases:gearCases.length,merchantCases:merchantCases.length,progressCases:progressCases.length,migrationCases:migrationCases.length,talentCases:talentCases.length}));
