'use strict';
// TECH-014 — Règles métier indépendantes du DOM, hors moteur distribué.
// Les catalogues viennent de reference.cjs ; leurs tableaux conservent l'ordre
// historique (important pour les tirages). Les mutations sont explicites.
const {generator}=require('./simulation-contract.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const depthOf=f=>Math.max(1,Math.min(30,f));
function enemyXP(m,floor){
 const d=depthOf(floor);return m.boss?30+d*2:m.elite?12+Math.floor(d/3):4+Math.floor((d-1)/4);
}
function balanceEnemies(monsters,floor){
 const d=depthOf(floor),b=Math.floor((d-1)/6);
 return monsters.map(m=>{
  const late=m.boss?Math.max(0,Math.floor((d-13)/6)+1)*6:0;
  const hp=m.maxHp+(m.boss?b*3+late:m.elite?b*2:b);
  return {...m,hp,maxHp:hp,atk:m.atk+(m.boss?Math.floor(b/2):b)};
 });
}
const healingLeft=s=>Math.max(0,3-(s.healUses||0));
const bandageValue=level=>9+Math.floor(Math.max(0,Math.min(30,level)-1)/5);
// Retourne les événements au lieu d'appeler le journal de l'interface.
function gainXP(s,n){
 const events=[];
 if(s.level>=30){s.xp=0;return events}
 s.xp+=n;
 let threshold=8+s.level*6;
 while(s.level<30&&s.xp>=threshold){
  s.xp-=threshold;s.level++;threshold=8+s.level*6;
  s.points++;s.ap+=2;s.maxHp+=4;s.hp=Math.min(s.maxHp,s.hp+8);s.maxRes++;s.res=s.maxRes;
  events.push('Niveau '+s.level+' ! +4 PV max, +1 ressource,  +2 caractéristiques, +1 talent.');
 }
 if(s.level>=30)s.xp=0;
 return events;
}
// Migration d'un état déjà décodé ; la validation du fichier et le stockage
// atomique relèvent d'un autre port. Ne jamais modifier la sauvegarde source.
function migrate(player,loot,base){
 const s=copy(player);
 s.attrs??=[...base[s.classId]];s.ap??=0;s.ranks??=[1,1,1];s.bag??=[];
 s.equip??={weapon:null,armor:null,ring:null};s.serial??=0;s.spec??=null;s.nodes??={};
 s.activeTalents??={};s.veil??=0;s.shield??=0;s.bar??=[0,1,2];
 if(!Array.isArray(s.bar)||s.bar.length!==3||new Set(s.bar).size!==3||
    s.bar.some(i=>!Number.isInteger(i)||i<0||i>4||!(i<3||!!s.activeTalents[i])))s.bar=[0,1,2];
 while(s.cool.length<5)s.cool.push(0);
 while(s.ranks.length<5)s.ranks.push(1);
 s.equip.helmet??=null;s.equip.boots??=null;
 s.serial=Math.max(s.serial,...s.bag.map(i=>i.id||0),...Object.values(s.equip).map(i=>i?.id||0),...loot.map(l=>l.item?.id||0));
 return s;
}
function rarityOf(it){
 if(Number.isInteger(it.rarity)&&it.rarity>=1&&it.rarity<=5)return it.rarity;
 if(it.bossRelic)return 5;
 return it.name?.startsWith('Épique')?4:it.name?.startsWith('Rare')?3:1;
}
function rollRarity(floor,roll,minimum=1){
 const shift=Math.floor((depthOf(floor)-1)/5);
 return Math.max(minimum,roll<1+shift?5:roll<5+2*shift?4:roll<20+4*shift?3:roll<45+5*shift?2:1);
}
function items(c){
 const {GEAR_SLOTS,GEAR_BASES,RARITIES,WEAPON_BASE_IDS,GEAR_SETS,UNIQUES,AFFIXES}=c;
 function setCount(equip,key){
  const set=GEAR_SETS[key];
  return set?Object.entries(set.pieces).filter(([slot,name])=>equip[slot]?.setId===key&&equip[slot]?.slot===slot&&equip[slot]?.name===name).length:0;
 }
 function setBonus(equip,k){
  return Object.keys(GEAR_SETS).reduce((n,key)=>{const count=setCount(equip,key),set=GEAR_SETS[key];return n+(count>=2?(set.two[k]||0):0)+(count>=3?(set.three[k]||0):0)},0);
 }
 const bonus=(equip,k)=>Object.values(equip).reduce((n,i)=>n+(i?.[k]||0),0)+setBonus(equip,k);
 function createGear(id,floor,minimum,rng,forcedRarity=null){
  if(typeof rng!=='function')throw Error('RNG équipement requis');
  const depth=depthOf(floor),grade=1+Math.floor((depth-1)/8);
  const slots=Object.keys(GEAR_SLOTS),slot=slots[rng(slots.length)];
  const rarity=forcedRarity??rollRarity(depth,rng(100),minimum);
  const it={id,slot,name:'',rarity,itemLevel:depth,grade,atk:slot==='weapon'?grade:slot==='ring'?Math.ceil(grade/2):0,
   def:slot==='armor'?grade:slot==='helmet'||slot==='boots'?Math.ceil(grade/2):0,crit:0,regen:0,dodge:0,affixes:[]};
  const base=GEAR_BASES[slot][rng(GEAR_BASES[slot].length)];
  it.name=RARITIES[rarity-1].name+' · '+base;
  if(slot==='weapon')it.family=WEAPON_BASE_IDS[base];
  if(rarity===5){
   const sets=Object.entries(GEAR_SETS).filter(([,set])=>set.pieces[slot]);
   if(sets.length&&rng(2)===0){const [key,set]=sets[rng(sets.length)];it.setId=key;it.name=set.pieces[slot]}
   else{const u=UNIQUES.find(x=>x.slot===slot);it.uniqueId=u.key;it.name=u.name;for(const [k,v] of Object.entries(u.stats))it[k]+=v}
  }
  if(slot==='weapon'&&rarity===5)it.family=it.setId==='bastion'?'mace':it.setId==='ombre'?'dagger':it.uniqueId==='aube'?'blade':it.family;
  let pool=AFFIXES.filter(a=>a.slots.includes(slot)&&rarity>=(a.min||2));
  function apply(a){const value=a.valuesByGrade[grade-1];it[a.stat]+=value;it.affixes.push({id:a.id,name:a.name,stat:a.stat,value})}
  if(rarity===3){const a=pool.find(a=>a.id==='precision');apply(a);pool=pool.filter(x=>x!==a)}
  while(it.affixes.length<rarity-1&&pool.length)apply(pool.splice(rng(pool.length),1)[0]);
  return it;
 }
 return {setCount,setBonus,bonus,createGear};
}
const goldBalance=s=>Math.max(0,Math.min(99999,Math.floor(Number(s?.gold)||0)));
function goldReward(m,floor){const d=depthOf(floor);return m.boss?25+d:m.rare?15+Math.floor(d/2):m.elite?8+Math.floor(d/3):2+Math.floor(d/5)}
function gearPrice(it){const d=depthOf(Math.floor(Number(it.itemLevel)||1));return 12+d*2+[0,9,23,48,95][rarityOf(it)-1]+Math.max(0,d-15)}
const salePrice=it=>Math.max(1,Math.floor(gearPrice(it)*0.4));
function merchantStock(c,floor,seed,merchantId){
 const v=c.MERCHANTS[merchantId];if(!v)return [];
 const rnd=generator((seed^Math.imul(floor,0x9e3779b1)^0x26d08fa9)>>>0,'lcg32').integer;
 const stock=[],slots=Object.keys(c.GEAR_SLOTS),d=depthOf(floor),gear=items(c);
 for(let i=0;i<(merchantId==='apothecary'?2:3);i++){
  const slot=v.slots[rnd(v.slots.length)];let first=true;
  const rarity=1+Number(d>=5&&rnd(100)<70)+Number(d>=10&&rnd(100)<45)+Number(d>=20&&rnd(100)<25);
  const item=gear.createGear(0,d,1,k=>{if(first){first=false;return slots.indexOf(slot)}return rnd(k)},rarity);
  delete item.id;stock.push({kind:'gear',item,price:gearPrice(item),qty:1});
 }
 for(const id of v.goods.filter(id=>c.CONSUMABLES[id].min<=d))stock.push({kind:'consumable',id,price:8+Math.floor(d/3)+(['guard','power','ward'].includes(id)?4:0),qty:merchantId==='apothecary'?2:1});
 stock.push({kind:'bandage',price:5+Math.floor(d/5),qty:2});return stock;
}
// Talents : le joueur est fourni, les achats modifient exclusivement son état.
function talents(s,c){
 const advanced=()=>c.ADV_TALENTS[s.classId]||[],synergies=()=>c.SYNERGIES[s.classId]||[];
 function canLearnAdvanced(id){const n=advanced().find(n=>n[0]===id);return !!(n&&s.points>0&&!s.nodes['adv_'+id]&&s.level>=n[2]&&(!n[3]||s.spec===n[3])&&(s.nodes[n[4]]||s.nodes['adv_'+n[4]]))}
 function learnAdvanced(id){if(!canLearnAdvanced(id))return false;s.points--;s.nodes['adv_'+id]=true;return true}
 function talentBonus(k){return advanced().reduce((sum,n)=>sum+(s.nodes['adv_'+n[0]]&&(!n[3]||s.spec===n[3])?(n[5][k]||0):0),0)}
 function canLearnSynergy(id){const n=synergies().find(n=>n[0]===id);return !!(n&&s.spec===n[3]&&s.level>=n[2]&&s.points>0&&!s.nodes['syn_'+id]&&s.nodes[n[4]])}
 function learnSynergy(id){if(!canLearnSynergy(id))return false;s.points--;s.nodes['syn_'+id]=true;return true}
 function hasSynergy(id){const n=synergies().find(n=>n[0]===id);return !!(n&&s.spec===n[3]&&s.level>=n[2]&&s.nodes['syn_'+id]&&s.nodes[n[4]])}
 function synergyDamage(m,p){
  if(p?.skill){
   if(hasSynergy('fracture')&&p.index===0&&m.exposed>0)return 3;
   if(hasSynergy('focus')&&p.index===0&&s.boost>0)return 3;
   if(hasSynergy('riposte')&&[0,3].includes(p.index)&&s.guard>0)return 2;
   if(hasSynergy('aim')&&[0,3].includes(p.index)&&!p.secondary&&s.boost>0)return 3;
   if(hasSynergy('penetration')&&p.index===3&&p.secondary)return 2;
   if(hasSynergy('shock')&&[0,3].includes(p.index)&&s.shield>0)return 2;
  }else if(hasSynergy('counter')&&!p?.ranged&&s.guard>0)return 2;
  return 0;
 }
 const synergyHeal=()=> (hasSynergy('recovery')&&s.hp*2<=s.maxHp?3:0)+(hasSynergy('ward')&&s.shield>0?3:0);
 const synergyGuard=()=>hasSynergy('fortress')||hasSynergy('footwork')?1:0;
 const synergyShield=()=>hasSynergy('restoration')&&s.res*2<=s.maxRes?3:0;
 function synergyDuration(kind,m){if(kind==='exposed')return hasSynergy('rend')?6:4;if(kind==='bleed')return hasSynergy('hemorrhage')?5:3;if(kind==='stun')return hasSynergy('overload')&&!m.boss?2:1;return 0}
 return {canLearnAdvanced,learnAdvanced,talentBonus,canLearnSynergy,learnSynergy,hasSynergy,synergyDamage,synergyHeal,synergyGuard,synergyShield,synergyDuration};
}
module.exports={enemyXP,balanceEnemies,healingLeft,bandageValue,gainXP,migrate,rarityOf,rollRarity,items,goldBalance,goldReward,gearPrice,salePrice,merchantStock,talents};
