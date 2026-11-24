'use strict';
// TECH-013C-E : contrat des sources et premiers tests isolés des systèmes extraits.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {assemble}=require('../tools/build-game.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sourceDir=path.join(root,'src/game');
const template=read('src/game/engine.template.js');
const ids=[...template.matchAll(/\/\* @include:([a-z-]+) \*\//g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'unique markers');
const filenames=fs.readdirSync(sourceDir).filter(f=>f.endsWith('.js')&&f!=='engine.template.js').sort();
assert.deepEqual(ids.map(id=>id+'.js').sort(),filenames,'every module included exactly once');
for(const name of filenames)new vm.Script(read('src/game/'+name),{filename:name});
const html=assemble();
assert.equal(html,read('index.html'),'assembly exact');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,2);
for(const [,script] of scripts)new vm.Script(script);
function load(id,api,context={}){
  return vm.runInNewContext(read('src/game/'+id+'.js')+'\n;('+api+')',context,{timeout:1000});
}
// Formules : seuils, planchers, ressource et doctrine.
const S={classId:'warrior',level:5,floor:7,hp:10,maxHp:20,res:4,maxRes:12,turn:1,attrs:[4,2,6,12,1,2],nodes:{},equip:{weapon:null},atk:0,armor:100,guard:0,boost:0,spec:null};
const combat=load('combat-formulas','{diminishingChance,criticalChance,dodgeChance,incomingDamage,outgoingDamage,resourceRegen,doctrineBonus}',{S,bonus:()=>0,talentBonus:()=>0,currentStyle:()=>({def:0}),weaponFamily:()=>null,synergyDamage:()=>0,dist:(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))});
assert.equal(combat.diminishingChance(41,35,50),37);
assert.equal(combat.diminishingChance(999,35,50),50);
assert.equal(combat.diminishingChance(-1,35,50),0);
assert.equal(combat.criticalChance(),7);
assert.equal(combat.dodgeChance(),2);
assert.equal(combat.incomingDamage({atk:10,hp:10,maxHp:10}),2);
assert.equal(combat.incomingDamage({atk:10,hp:10,maxHp:10,boss:true}),3);
S.floor=6;assert.equal(combat.incomingDamage({atk:10,hp:10,maxHp:10}),1);
assert.equal(combat.outgoingDamage({hp:10,maxHp:10},3),4);
assert.equal(combat.outgoingDamage({hp:10,maxHp:10,affix:'armored'},3,null,true),4);
assert.equal(combat.resourceRegen(),2);
assert.equal(combat.resourceRegen(true),1);
S.spec='offense';assert.equal(combat.doctrineBonus(S,'damage'),2);
// Progression et plafonds.
const player={level:1,xp:0,points:0,ap:0,maxHp:20,hp:10,maxRes:10,res:0,healUses:0};
const progress=load('progression','{gainXP,enemyXP,healingLeft,bandageValue}',{S:player,say:()=>{}});
progress.gainXP(14);assert.equal(player.level,2);assert.equal(player.ap,2);assert.equal(player.points,1);assert.equal(player.maxHp,24);
progress.gainXP(100000);assert.equal(player.level,30);assert.equal(player.xp,0);assert.equal(player.points,29);
assert.equal(progress.healingLeft(),3);assert.equal(progress.bandageValue(30),14);
assert.ok(progress.enemyXP({boss:true},30)>progress.enemyXP({},30));
// Économie : bornes et rapport de revente.
const wallet={gold:100001};
const economy=load('economy','{goldBalance,goldReward,gearPrice,salePrice}',{S:wallet,rarityOf:i=>i.rarity});
assert.equal(economy.goldBalance(),99999);
wallet.gold=-1;assert.equal(economy.goldBalance(),0);
assert.equal(economy.goldReward({boss:true},30),55);
for(let depth=1;depth<=30;depth++)for(let rarity=1;rarity<=5;rarity++){
 const it={itemLevel:depth,rarity};assert.ok(economy.gearPrice(it)>0);
 assert.equal(economy.salePrice(it),Math.floor(economy.gearPrice(it)*0.4));
}
// Transfert : format et limites, aucune écriture réelle.
const history=load('history-transfer','{historyNumber,emptyHistory,parseTransfer}',{});
assert.equal(history.historyNumber(-1),0);
assert.equal(history.historyNumber(1e12),1e9);
assert.equal(history.emptyHistory().total,0);
const bundle={format:'cryptgrave-transfer-v1',run:null,history:null,prefs:{zoom:100,pad:100}};
assert.equal(history.parseTransfer(JSON.stringify(bundle)).prefs.zoom,100);
assert.throws(()=>history.parseTransfer(JSON.stringify({...bundle,format:'unknown'})));
assert.throws(()=>history.parseTransfer(JSON.stringify({...bundle,prefs:{zoom:999,pad:100}})));
assert.throws(()=>history.parseTransfer('x'.repeat(524289)));
console.log('TECH-013C-E: '+ids.length+' source units, exact assembly, syntax and isolated combat/progression/economy/transfer contracts');
