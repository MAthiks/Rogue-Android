// GAME-006D: deterministic merchants, optional gold field for legacy saves.
const MERCHANTS={
 arms:{name:'Armurier itinérant',color:'#d2a66c',slots:['weapon','armor','helmet'],goods:['heal','guard']},
 apothecary:{name:'Apothicaire',color:'#82c7a1',slots:['ring','boots'],goods:['heal','focus','guard','power','ward']},
 trader:{name:'Colporteur',color:'#b7a3d9',slots:['weapon','ring','boots'],goods:['insight','smoke','toolkit','heal']}
};
const GOLD_CAP=99999;
function goldBalance(){return Math.max(0,Math.min(GOLD_CAP,Math.floor(Number(S?.gold)||0)))}
/* TECH-012C — Récompense en or proportionnelle à la profondeur et au type de l'ennemi. */
function goldReward(m,floor){
  const depth=Math.max(1,Math.min(30,floor));
  return m.boss?25+depth:m.rare?15+Math.floor(depth/2):m.elite?8+Math.floor(depth/3):2+Math.floor(depth/5)
}
/* TECH-012C — Prix d'achat calculé à partir du niveau de l'objet, de sa rareté et d'une majoration après le niveau 15. */
function gearPrice(it){
  const depth=Math.max(1,Math.min(30,Math.floor(Number(it.itemLevel)||1))),rarity=rarityOf(it);
  return 12+depth*2+[0,9,23,48,95][rarity-1]+Math.max(0,depth-15)
}
/* TECH-012C — La revente rapporte 40 % du prix d'achat, arrondis à l'entier inférieur avec un minimum de 1. */
function salePrice(it){return Math.max(1,Math.floor(gearPrice(it)*0.4))}
/* TECH-012C — Génère un stock déterministe par étage, graine et marchand, sans attribuer les identifiants des futurs objets achetés. */
function merchantStock(floor,seed,merchantId){
 const v=MERCHANTS[merchantId];if(!v)return [];
 let n=(seed^Math.imul(floor,0x9e3779b1)^0x26d08fa9)>>>0;
 const rnd=k=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return Math.floor(n/4294967296*k)};
 const stock=[],slots=Object.keys(GEAR_SLOTS),depth=Math.max(1,Math.min(30,floor));
 for(let i=0;i<(merchantId==='apothecary'?2:3);i++){
   const slot=v.slots[rnd(v.slots.length)];let first=true;
   const rarity=1+Number(depth>=5&&rnd(100)<70)+Number(depth>=10&&rnd(100)<45)+Number(depth>=20&&rnd(100)<25);
   const item=createGear(0,depth,1,k=>{if(first){first=false;return slots.indexOf(slot)}return rnd(k)},rarity);
   delete item.id;stock.push({kind:'gear',item,price:gearPrice(item),qty:1});
 }
 for(const id of v.goods.filter(id=>CONSUMABLES[id].min<=depth))stock.push({kind:'consumable',id,price:8+Math.floor(depth/3)+(['guard','power','ward'].includes(id)?4:0),qty:merchantId==='apothecary'?2:1});
 stock.push({kind:'bandage',price:5+Math.floor(depth/5),qty:2});
 return stock;
}
/* TECH-012C — Place un marchand tous les trois étages à partir du deuxième, près du départ, sans occuper les positions déjà réservées. */
function buildMerchant(d,decorated,terrain,loot,all,floor,W,H){
 if(floor<2||floor>30||(floor-2)%3!==0)return null;
 const used=new Set([d.start,d.stairs,...all,...loot,...decorated.features,...terrain].map(p=>p.y*W+p.x)),candidates=[];
 for(let y=d.start.y-5;y<=d.start.y+5;y++)for(let x=d.start.x-5;x<=d.start.x+5;x++){
   if(x<2||y<2||x>=W-2||y>=H-2||used.has(y*W+x)||Math.max(Math.abs(x-d.start.x),Math.abs(y-d.start.y))>5)continue;
   // Full open neighborhood prevents a non-walkable shop from blocking corridors.
   let open=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(decorated.map[(y+dy)*W+x+dx]!==0)open=false;
   if(open)candidates.push({x,y});
 }
 if(!candidates.length)return null;
 const n=(d.seed^Math.imul(floor,0x85ebca6b))>>>0,merchantId=['arms','apothecary','trader'][Math.floor((floor-2)/3)%3],p=candidates[n%candidates.length];
 return {...p,type:'merchant',merchantId,found:true,stock:merchantStock(floor,d.seed,merchantId)};
}
/* TECH-012C — Le commerce exige un marchand adjacent et accessible, ainsi qu'une zone sans ennemi vivant à six cases ou moins. */
function merchantAvailable(f){
 return mode==='game'&&S&&!S.dead&&f?.type==='merchant'&&Object.hasOwn(MERCHANTS,f.merchantId)
   &&features.includes(f)&&dist(f,S)===1&&stepOK(f.x,f.y,S.x,S.y)
   &&!mob(f.x,f.y)&&!monsters.some(m=>m.hp>0&&dist(m,S)<=6);
}
/* TECH-012C — Contrôle le stock, le prix, l'or et la capacité de rangement avant toute transaction. */
function canBuy(f,index){
 if(!merchantAvailable(f)||!Number.isInteger(index))return false;
 const a=f.stock?.[index];if(!a||!Number.isInteger(a.qty)||a.qty<=0||!Number.isInteger(a.price)||a.price<=0||goldBalance()<a.price)return false;
 if(a.kind==='gear')return S.bag.length<24&&!!a.item&&Object.hasOwn(GEAR_SLOTS,a.item.slot);
 if(a.kind==='consumable')return Object.hasOwn(CONSUMABLES,a.id)&&pouchCount(a.id)<POUCH_CAP;
 return a.kind==='bandage';
}
/* TECH-012C — Vérifie l'achat, ajoute la marchandise, débite l'or et réduit le stock. Un équipement acheté reçoit un nouvel identifiant. */
function buyMerchant(f,index){
 if(!canBuy(f,index))return false;
 const a=f.stock[index];
 if(a.kind==='gear')S.bag.push({...a.item,id:++S.serial});
 else if(a.kind==='consumable'){if(!addConsumable(a.id))return false}
 else S.bandages++;
 S.gold=goldBalance()-a.price;
 a.qty--;
 say('Achat : -'+a.price+' or.');
 save();
 update();
 return true;
}
/* TECH-012C — Exclut les reliques de boss et les ventes qui dépasseraient le plafond d'or. */
function canSell(f,id){
 if(!merchantAvailable(f)||!Number.isInteger(id))return false;
 const it=S.bag.find(v=>v.id===id);
 return !!it&&!it.bossRelic&&goldBalance()+salePrice(it)<=GOLD_CAP;
}
/* TECH-012C — Vend uniquement un objet admissible du sac, le retire et crédite son prix de revente. */
function sellMerchant(f,id){
 if(!canSell(f,id))return false;
 const i=S.bag.findIndex(v=>v.id===id),it=S.bag[i],price=salePrice(it);
 S.bag.splice(i,1);
 S.gold=goldBalance()+price;
 say('Vente : +'+price+' or.');
 save();
 update();
 return true;
}
function merchantMenu(f,tab='buy'){
 if(!merchantAvailable(f)){say('Commerce indisponible : éloigne les ennemis.');return}
 selected=null;
 const title=MERCHANTS[f.merchantId].name;
 const body=tab==='buy'?f.stock.map((a,i)=>'<button class="wide" data-buy="'+i+'" '+(canBuy(f,i)?'':'disabled')+'>'+(a.kind==='gear'?gearLabel(a.item):a.kind==='bandage'?'Bandage':escapeGear(CONSUMABLES[a.id].name))+' · '+a.price+' or · stock '+a.qty+'</button>').join(''):
 S.bag.map(it=>'<button class="wide" data-sell="'+it.id+'" '+(canSell(f,it.id)?'':'disabled')+'>'+gearLabel(it)+' · '+(it.bossRelic?'Relique invendable':salePrice(it)+' or')+'</button>').join('')||'<p>Sac vide.</p>';
 show('<h1>'+title+'</h1><p>Or : <b>'+goldBalance()+'</b> · Sac '+S.bag.length+'/24</p><div class="classes"><button id="shopBuy" '+(tab==='buy'?'disabled':'')+'>Acheter</button><button id="shopSell" '+(tab==='sell'?'disabled':'')+'>Vendre</button></div>'+body+'<button class="wide" id="shopBack">Retour au donjon</button>');
 document.getElementById('shopBuy').onclick=()=>merchantMenu(f,'buy');document.getElementById('shopSell').onclick=()=>merchantMenu(f,'sell');document.getElementById('shopBack').onclick=hide;
 panel.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{buyMerchant(f,+b.dataset.buy);merchantMenu(f,'buy')});
 panel.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{sellMerchant(f,+b.dataset.sell);merchantMenu(f,'sell')});
}