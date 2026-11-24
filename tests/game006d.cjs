// Run: node tests/qa004.cjs
const fs=require('node:fs'),path=require('node:path');
function testEconomy006D(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,MERCHANTS,GOLD_CAP,goldBalance,goldReward,gearPrice,salePrice,merchantStock,buildMerchant,merchantAvailable,canBuy,buyMerchant,canSell,sellMerchant,EXTENDED_BOSSES,selectBossVariant,extendedBossAction,extendedBossReward,promoteEnemies,bossReward,kill,BESTIARY,CREATURE_POWERS,populateBestiary,creatureAction,enemyPhase,BIOMES,biomeForFloor,buildDungeon,decorateDungeon,buildTerrain,currentBiome,enterTerrain,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let shops=0;const seen=new Set();
  for(let seed=0;seed<600;seed++){
    const floor=2+3*(seed%10),d=g.buildDungeon(48,32,floor,seed),deco=g.decorateDungeon(d,48,32,floor),t=g.buildTerrain(d,deco,48,32,floor,g.biomeForFloor(floor,seed)),f=g.buildMerchant(d,deco,t,d.loot,d.monsters,floor,48,32);
    assert(JSON.stringify(f)===JSON.stringify(g.buildMerchant(d,deco,t,d.loot,d.monsters,floor,48,32)),'determinism');
    assert(g.buildMerchant(d,deco,t,d.loot,d.monsters,floor+1,48,32)===null,'cadence');
    if(!f)continue;shops++;seen.add(f.merchantId);
    assert(![d.start,d.stairs,...d.monsters,...d.loot,...deco.features,...t].some(p=>p.x===f.x&&p.y===f.y),'no overlap');
    assert(Math.max(Math.abs(f.x-d.start.x),Math.abs(f.y-d.start.y))<=5,'start proximity');
    for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)assert(deco.map[(f.y+y)*48+f.x+x]===0,'nonblocking shop');
    for(const a of f.stock){assert(a.qty>0&&a.price>0,'stock');if(a.kind==='gear')assert(!a.item.id&&a.item.rarity<=4&&g.MERCHANTS[f.merchantId].slots.includes(a.item.slot)&&g.salePrice(a.item)<a.price,'gear pricing')}
  }
  assert(shops>=500&&seen.size===3,'shop coverage');
  let d=g.state();d.monsters.splice(0);d.terrain.splice(0);d.features.splice(0);d.loot.splice(0);d.map.fill(1);
  for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.S.floor=8;d.stairs.x=15;d.stairs.y=15;
  const f={x:7,y:6,type:'merchant',merchantId:'trader',found:true,stock:g.merchantStock(8,42,'trader')};d.features.push(f);
  assert(g.goldBalance()===0&&!g.buyMerchant(f,0),'legacy gold and insufficient funds');
  d.S.gold=300;g.resume();assert(g.merchantAvailable(f),'adjacent merchant');
  const price=f.stock[0].price,serial=d.S.serial,turn=d.S.turn;assert(g.buyMerchant(f,0)&&d.S.gold===300-price&&d.S.bag[0].id===serial+1&&f.stock[0].qty===0,'buy');
  assert(!g.buyMerchant(f,0)&&d.S.turn===turn,'no duplicate or turn cost');
  const it=d.S.bag[0],sale=g.salePrice(it);assert(g.sellMerchant(f,it.id)&&d.S.gold===300-price+sale&&!g.sellMerchant(f,it.id),'sale once');
  const potion=f.stock.findIndex(a=>a.kind==='consumable'),bandage=f.stock.findIndex(a=>a.kind==='bandage');
  assert(g.buyMerchant(f,potion)&&g.buyMerchant(f,bandage),'supplies');
  d.S.bag.push({id:++d.S.serial,bossRelic:true,rarity:5,slot:'ring'});assert(!g.sellMerchant(f,d.S.bag[0].id),'protect relic');
  d.monsters.push({x:9,y:6,hp:5,maxHp:5,atk:2,kind:'Errant'});assert(!g.buyMerchant(f,1),'danger blocks trade');
  let before=g.goldBalance();g.kill(d.monsters[0]);assert(g.goldBalance()===before+g.goldReward({},8),'kill gold');
  g.save();const r=load(newHtml);assert(r.restore()&&r.goldBalance()===g.goldBalance()&&JSON.stringify(r.state().features)===JSON.stringify(d.features),'save stock and balance');
  return {seeds:600,shops,merchantTypes:seen.size,transactions:'passed',persistence:'passed'};
}
console.log(testEconomy006D(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
