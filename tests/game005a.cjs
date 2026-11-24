// Run: node tests/game005a.cjs
const fs=require('node:fs'),path=require('node:path');
function testLoot(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features}),searchNearby,finish,los,collectLoot,item,createGear,rollRarity,rarityOf,bonus,setCount,setBonus,gearLabel,GEAR_SETS,GEAR_SLOTS,interactFeature,kill,bossReward,eliteReward,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let d=g.state();
  const equal=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),msg);
  const seeded=seed=>n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n)};
  const counts=f=>Array.from({length:100},(_,r)=>g.rollRarity(f,r)).reduce((a,x)=>(a[x-1]++,a),[0,0,0,0,0]);
  equal(counts(1),[55,25,15,4,1],'early rates');
  equal(counts(30),[30,30,25,9,6],'late rates');
  const slots=new Set(),uniques=new Set(),pieces=new Map();let rolls=0;
  for(let f=1;f<=30;f++)for(let r=1;r<=5;r++)for(let n=0;n<100;n++){
    const it=g.createGear(++rolls,f,1,seeded(rolls*7919),r);
    assert(it.rarity===r&&it.itemLevel===f&&it.grade===1+Math.floor((f-1)/8),'metadata');
    assert(g.GEAR_SLOTS[it.slot]&&it.name&&it.id===rolls,'identity');
    assert(new Set(it.affixes.map(a=>a.id)).size===it.affixes.length,'distinct affixes');
    assert(it.affixes.length<=r-1&&it.affixes.every(a=>a.value>0&&it[a.stat]>=a.value),'affixes applied');
    assert(r!==1||it.affixes.length===0,'common');assert(r!==2||it.affixes.length===1,'magic');
    assert(r!==3||it.crit>0&&it.regen===0,'rare');assert(r!==5||!!it.setId!==!!it.uniqueId,'legendary identity');
    for(const k of ['atk','def','crit','regen','dodge'])assert(Number.isInteger(it[k])&&it[k]>=0&&it[k]<=15,'bounded '+k);
    slots.add(it.slot);if(it.uniqueId)uniques.add(it.uniqueId);if(it.setId)pieces.set(it.setId+':'+it.slot,it);
  }
  assert(slots.size===5&&uniques.size===5&&pieces.size===9,'catalog coverage');
  for(const [key,set] of Object.entries(g.GEAR_SETS)){
    const equip={},entries=Object.keys(set.pieces);
    equip[entries[0]]=pieces.get(key+':'+entries[0]);assert(g.setCount(equip,key)===1,'one piece');
    for(const k of Object.keys(set.two))assert(g.setBonus(equip,k)===0,'no premature bonus');
    equip[entries[1]]=pieces.get(key+':'+entries[1]);assert(g.setCount(equip,key)===2,'two pieces');
    for(const [k,v] of Object.entries(set.two))assert(g.setBonus(equip,k)===v,'two bonus');
    equip[entries[2]]=pieces.get(key+':'+entries[2]);assert(g.setCount(equip,key)===3,'three pieces');
    for(const [k,v] of Object.entries(set.three))assert(g.setBonus(equip,k)===v+(set.two[k]||0),'three cumulative');
    d.S.equip={weapon:null,armor:null,ring:null,helmet:null,boots:null,...equip};
    for(const k of ['atk','def','crit','regen','dodge'])assert(g.bonus(k)===Object.values(equip).reduce((a,it)=>a+it[k],0)+g.setBonus(equip,k),'combat aggregation');
    d.S.equip[entries[0]]=null;assert(g.setCount(d.S.equip,key)===2,'unequip removes bonus');
  }
  d.S.equip={weapon:null,armor:null,ring:null,helmet:null,boots:null};d.S.bag=[];
  d.loot.splice(0);d.monsters.splice(0);d.features.splice(0);
  const legacy={id:10000,slot:'weapon',name:'Épique · Arme',atk:3,def:0,crit:4,regen:1};
  d.S.equip.weapon=legacy;d.S.serial=10000;assert(g.rarityOf(legacy)===4&&g.bonus('atk')===3,'legacy unchanged');
  assert(g.gearLabel(legacy).includes('Épique'),'legacy label');
  d.S.floor=18;const fresh=g.item();d.S.bag.push(fresh);
  const chest={type:'chest',reward:'gear',open:false};assert(g.interactFeature(chest)&&chest.open&&d.S.bag.length===2,'chest gear');
  const elite=g.eliteReward();assert(elite.rarity===3&&elite.itemLevel===18,'elite rare');
  const boss=g.bossReward({boss:'stone'});assert(boss.bossRelic&&boss.rarity===5&&boss.uniqueId==='boss-stone'&&boss.def===4,'boss reward preserved');
  const ground=g.item();d.loot.push({x:d.S.x,y:d.S.y,kind:'gear',item:ground});
  d.S.bag=Array.from({length:24},(_,i)=>({...fresh,id:20000+i}));
  const x=d.S.x,y=d.S.y;g.collectLoot(x,y);assert(d.loot[0].item.id===ground.id,'full bag stable');
  d.S.bag.pop();g.collectLoot(x,y);d=g.state();assert(d.S.bag.at(-1).id===ground.id&&!d.loot.length,'pickup exact');
  d.S.bag=[fresh,...pieces.values(),boss];g.save();const saved=JSON.parse(storage.get('rogue-android-game002-v1'));
  const resumed=load(newHtml);assert(resumed.restore(),'restore');const restored=resumed.state();
  equal(restored.S.equip,saved.S.equip,'legacy equip unchanged');equal(restored.S.bag,saved.S.bag,'new items exact');
  assert(restored.S.serial>=Math.max(...restored.S.bag.map(it=>it.id)),'serial');
  resumed.generate();assert(resumed.state().loot.filter(l=>l.kind==='gear').every(l=>l.item?.itemLevel===18),'generated floor loot');
  return {rolls,slots:slots.size,uniques:uniques.size,setPieces:pieces.size,legacy:'passed',fullBag:'passed',sets:'passed',rewards:'passed',persistence:'passed'};
}
console.log(testLoot(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
