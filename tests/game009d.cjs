// Run: node tests/game009d.cjs
const fs=require('node:fs'),path=require('node:path');
function testEquipment(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {CLASSES,GEAR_SLOTS,RARITIES,equipmentSprite,equipmentSlotCard,equipmentRack,bagItemCard,bagCards,createGear,newGame,save,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain})};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const g=load(newHtml),key='rogue-android-game002-v1';let cards=0;
  for(const id of Object.keys(g.CLASSES)){
    g.newGame(id);const s=g.state().S;
    const naked=g.equipmentSprite(),empty=g.equipmentRack();
    assert((empty.match(/data-off=/g)||[]).length===5,'five slots');
    assert((empty.match(/disabled/g)||[]).length===5,'empty slots disabled');
    assert(g.bagCards().includes('Le sac est vide.'),'empty bag');
    for(const [index,slot] of Object.keys(g.GEAR_SLOTS).entries()){
      const it={id:++s.serial,slot,name:'Objet '+slot,rarity:index+1,itemLevel:12,atk:1,def:2,crit:3,regen:1,dodge:4,affixes:[]};
      if(slot==='weapon')it.family='bow';
      s.equip[slot]=it;s.bag.push({...it,id:++s.serial,name:'Double '+slot});
      const card=g.equipmentSlotCard(slot);assert(card.includes('data-off="'+slot+'"')&&card.includes(g.RARITIES[index].color)&&card.includes(g.RARITIES[index].name)&&!card.includes('disabled'),'equipped slot '+slot);
      const bag=g.bagItemCard(s.bag[s.bag.length-1]);assert(bag.includes('Remplacer')&&bag.includes('ATQ +1')&&bag.includes('DEF +2')&&bag.includes('data-drop=')&&bag.includes(g.RARITIES[index].color),'bag card '+slot);cards++;
    }
    assert(g.equipmentSprite()!==naked,'equipped sprite changes');
    assert(g.bagCards().includes('5/24'),'capacity');
    g.save();const before=JSON.stringify(g.state()),saved=storage.get(key);
    g.equipmentRack();g.bagCards();assert(JSON.stringify(g.state())===before&&storage.get(key)===saved,'rendering is pure');
    while(s.bag.length<24)s.bag.push({...s.bag[0],id:++s.serial});
    assert(g.bagCards().includes('24/24'),'full capacity');
    assert(g.equipmentSlotCard('weapon').includes('disabled')&&g.equipmentSlotCard('weapon').includes('Sac plein'),'full bag blocks unequip');
    assert(!g.bagItemCard(s.bag[0]).includes('disabled'),'replacement still allowed');
    assert(g.bagItemCard({...s.bag[0],name:'<script>'}).includes('&lt;script&gt;'),'escape names');
  }
  return {classes:4,slotCards:cards,bagCards:cards,rarities:5,capacity:'passed',state:'unchanged',environment:'mock DOM'};
}
console.log(testEquipment(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
