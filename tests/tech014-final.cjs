'use strict';
// Dernier bloc TECH-014 : commandes, interactions, tours et campagnes.
// Les fixtures synthétiques sont séparées des campagnes organiques.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {BASE,CLASSES_IDS,createSession,digest,record}=require('../tools/godot/reference.cjs');
const {generator}=require('../tools/godot/simulation-contract.cjs');
const domain=require('../tools/godot/domain-contract.cjs');
const {world}=require('../tools/godot/world-contract.cjs');
const {longCampaign}=require('../tools/godot/campaign-contract.cjs');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const original=execFileSync('git',['show',BASE+':index.html'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
assert.equal(html,original,'jeu distribué inchangé');
const clone=x=>JSON.parse(JSON.stringify(x));
const eq=(a,b)=>assert.deepEqual(clone(a),clone(b));
const seed=424242;
const source=createSession(original,1);source.start('warrior');
const catalog=source.catalogs(),gear=domain.items(catalog);
function fixture(id='warrior'){
 const src=createSession(original,1);src.start(id);
 const d=src.saveData();d.map.fill(1);d.seen.fill(0);
 for(let y=5;y<=13;y++)for(let x=5;x<=13;x++)d.map[y*48+x]=0;
 d.monsters=[];d.features=[];d.terrain=[];d.loot=[];d.stairs={x:13,y:13};
 Object.assign(d.S,{x:8,y:8,floor:10,level:10,hp:15,maxHp:40,res:8,maxRes:16,bandages:4,gold:100,points:8,ap:4,turn:0,serial:0,bag:[],equip:{weapon:null,armor:null,ring:null,helmet:null,boots:null},guard:0,boost:0,shield:0,veil:0,pouch:{heal:1,focus:1,guard:1,power:1,insight:1,ward:1,smoke:1,toolkit:1},cool:[0,0,0,0,0]});
 return d;
}
const mob=(x,y,extra={})=>({x,y,hp:12,maxHp:12,atk:3,kind:'Brute',role:'brute',color:'#aa9999',...extra});
const action=(w,d,c)=>{
 if(c.type==='move')w.move(c.dx,c.dy);
 else if(c.type==='skill')w.activate(c.slot);
 else if(c.type==='weapon')w.aimWeapon();
 else if(c.type==='bandage')w.bandage();
 else if(c.type==='wait'){d.selected=null;w.searchNearby();w.finish()}
 else if(c.type==='consume')w.useConsumable(c.id);
 else if(c.type==='close')d.overlayOpen=false;
 else if(c.type==='buy'||c.type==='sell')w[c.type==='buy'?'buyMerchant':'sellMerchant'](w.featureAt(c.x,c.y),c.id);
 else if(c.type==='event'||c.type==='room')w[c.type==='event'?'resolveEvent':'resolveSpecialRoom'](w.featureAt(c.x,c.y),c.choice);
 else throw Error('Commande monde inconnue');
};
let checks=0;const cases=[];
function compare(label,run,commands){
 const oracle=createSession(original,seed),candidate=createSession(html,seed);
 const initial=oracle.loadFixture(run);eq(candidate.loadFixture(run),initial);
 const state=clone(initial),rng=generator(seed,'lcg32');
 const ports={rand:rng.integer,generate:()=>{throw Error('Génération : fixture séparée')},endRun:outcome=>{state.S.ended=outcome;if(outcome==='death')state.S.dead=true;state.mode=outcome==='death'?'dead':'ended';state.selected=null;state.overlayOpen=true},
   say:t=>{state.messages.unshift(t);state.messages=state.messages.slice(0,3)},save(){},update(){},combatFx(){}};
 const w=world(state,catalog,ports),steps=[];
 for(const c of commands){
  const expected=oracle.action(c);eq(candidate.action(c),expected);
  action(w,state,c);eq(state,expected);
  eq(rng.snapshot().state,oracle.randomState().state);eq(rng.snapshot().draws,oracle.randomState().draws);
  checks+=4;steps.push({command:c,state:clone(expected),rng:oracle.randomState()});
 }
 cases.push({label,seed,run,steps});
 return state;
}
const move={type:'move',dx:1,dy:0},wait={type:'wait'};
for(const type of ['water','rubble','ember','spores','ice','void','font']){
 const d=fixture();d.terrain.push({x:9,y:8,type});compare('terrain '+type,d,[move,wait]);
}
for(const type of ['door','secret']){
 const d=fixture();d.map[8*48+9]=1;d.features.push({x:9,y:8,type,found:type==='door',open:false});
 compare(type,d,[wait,move,move]);
}
for(const reward of ['gear','bandage']){
 const d=fixture();d.features.push({x:9,y:8,type:'chest',reward,open:false,found:true});compare('coffre '+reward,d,[move,move]);
}
{
 const d=fixture();d.features.push({x:9,y:8,type:'trap',found:false,spent:false,damage:4});compare('piège découvert et désarmé',d,[wait,wait,move]);
 compare('piège déclenché',d,[move]);
 d.S.hp=1;compare('piège mortel',d,[move]);
}
{
 const d=fixture();d.loot.push({x:9,y:8,kind:'bandage'},{x:9,y:8,kind:'consumable',consumable:'heal'},{x:9,y:8,kind:'gear',item:gear.createGear(++d.S.serial,10,1,generator(4,'lcg32').integer)});
 compare('butin',d,[move]);
}
for(const id of Object.keys(catalog.CONSUMABLES)){
 const d=fixture();d.features.push({x:9,y:8,type:'trap',found:false,spent:false,damage:3});
 if(id==='smoke')d.monsters.push(mob(10,8));
 compare('consommable '+id,d,[{type:'consume',id}]);
}
for(const [id,e] of Object.entries(catalog.EXPLORATION_EVENTS)){
 for(const [choice] of [...e.choices,['skip']]){
  const d=fixture();d.features.push({x:9,y:8,type:'event',eventId:id,found:true,spent:false});
  compare('événement '+id+' '+choice,d,[move,{type:'event',x:9,y:8,choice}]);
 }
}
for(const [id,e] of Object.entries(catalog.SPECIAL_ROOMS))for(const [choice] of e.choices){
 const d=fixture();d.features.push({x:9,y:8,type:'specialRoom',roomId:id,found:true,spent:false});
 compare('salle '+id+' '+choice,d,[move,{type:'room',x:9,y:8,choice}]);
}
{
 const d=fixture();d.features.push({x:9,y:8,type:'merchant',merchantId:'arms',found:true,stock:domain.merchantStock(catalog,10,5,'arms')});
 compare('achat et revente',d,[move,{type:'buy',x:9,y:8,id:0},{type:'sell',x:9,y:8,id:1},{type:'close'}]);
}
for(const id of CLASSES_IDS){
 const d=fixture(id);d.monsters.push(mob(9,8),mob(11,8,{role:'archer'}));
 compare('tour de combat '+id,d,[{type:'skill',slot:0},move,wait,{type:'bandage'},wait]);
}
// Transactions de l'inventaire : vrais callbacks, sans tour supplémentaire.
const inventoryCases=[];
{
 const d=fixture();d.S.bag.push(gear.createGear(++d.S.serial,10,1,generator(8,'lcg32').integer));
 const slot=d.S.bag[0].slot,commands=[{type:'inventory',kind:'equip',id:1},{type:'inventory',kind:'off',id:slot},{type:'inventory',kind:'drop',id:1},{type:'inventory',kind:'attr',id:2},{type:'inventory',kind:'spec',id:'offense'},{type:'inventory',kind:'node',id:0},{type:'inventory',kind:'learn',id:3},{type:'inventory',kind:'bar',id:2,value:3},{type:'inventory',kind:'rank',id:0},{type:'inventory',kind:'style',id:'defensive'}];
 const a=createSession(original,seed),b=createSession(html,seed);a.loadFixture(d);b.loadFixture(d);
 const independent=clone(a.snapshot().S);
 const steps=[];for(const c of commands){const expected=a.action(c);eq(b.action(c),expected);assert.equal(expected.S.turn,0);assert.equal(domain.inventoryAction(independent,catalog,c),true);eq(independent,expected.S);checks+=4;steps.push({command:c,state:expected})}
 for(const c of [{kind:'equip',id:9999},{kind:'off',id:'weapon'},{kind:'drop',id:9999},{kind:'spec',id:'defense'},{kind:'attr',id:-1},{kind:'node',id:0},{kind:'learn',id:3},{kind:'bar',id:9,value:0},{kind:'rank',id:4}]){const before=clone(independent);assert.equal(domain.inventoryAction(independent,catalog,c),false);eq(independent,before);checks+=2}
 assert.equal(steps[0].state.S.equip[slot].id,1);assert.equal(steps[1].state.S.bag[0].id,1);assert.equal(steps[2].state.S.bag.length,0);
 assert.equal(steps[3].state.S.maxHp,42);assert.equal(steps[4].state.S.spec,'offense');assert.equal(steps[5].state.S.nodes.o1,true);assert.equal(steps[6].state.S.activeTalents[3],true);assert.equal(steps[7].state.S.bar[2],3);assert.equal(steps[8].state.S.ranks[0],2);assert.equal(steps[9].state.S.combatStyle,'defensive');
 checks+=10;inventoryCases.push({run:d,seed,steps});
}
// La génération et la victoire sont vérifiées sur le moteur complet,
// jamais en les présentant comme des victoires organiques.
const terminalCases=[];
for(const id of CLASSES_IDS){
 const d=fixture(id);d.S.floor=30;d.stairs={x:9,y:8};
 const a=createSession(html,seed);a.loadFixture(d);const end=a.action(move);
 assert.equal(end.S.ended,'victory');assert.equal(a.saveData(),null);assert.equal(a.history().wins,1);checks+=3;
 terminalCases.push({id,run:d,command:move,end,history:a.history()});
 const e=fixture(id);e.S.floor=29;e.stairs={x:9,y:8};
 const b=createSession(html,seed);b.loadFixture(e);const next=b.action(move);
 assert.equal(next.S.floor,30);assert.equal(next.S.turn,1);eq(b.action({type:'reload'}).S,next.S);checks+=3;
}
const campaigns=[];
for(const [i,id] of CLASSES_IDS.entries()){
 const run=longCampaign(html,id,1234567+i*104729,3200),replay=createSession(original,run.seed);
 eq(replay.start(id),run.initialState);checks++;
 for(const [j,c] of run.commands.entries()){replay.action(c);eq(record(replay),run.trace[j+1]);checks++}
 eq(replay.snapshot(),run.finalState);eq(replay.history(),run.history);checks+=2;
 // Les quatre graines validées constituent désormais une recette de victoire.
 assert.equal(run.final.outcome,'victory',id+' : victoire organique attendue');
 assert.equal(run.final.floor,30);assert.equal(replay.saveData(),null);
 assert.equal(run.history.wins,1);assert.equal(run.history.total,1);checks+=5;
 campaigns.push(run);
 console.log(JSON.stringify({id,reason:run.reason,actions:run.commands.length,turn:run.final.turn,floor:run.final.floor,hp:run.final.hp,outcome:run.final.outcome}));
}
const pack={schema:'cryptgrave-final-contract-v1',reference:BASE,checks,cases,inventoryCases,terminalCases,campaigns};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({checks,worldCases:cases.length,inventoryCases:inventoryCases.length,terminalCases:terminalCases.length,campaigns:campaigns.length}));
