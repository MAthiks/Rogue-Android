// Run: node tests/game007f.cjs
const fs=require('node:fs'),path=require('node:path');
function testClassCards(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {CLASSES,SPECS,CLASS_CARD_ART,classCard,classCardPortrait,newGame,save,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain})};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const g=load(newHtml),key='rogue-android-game002-v1';g.newGame('warrior');const saved=storage.get(key),before=JSON.stringify(g.state()),portraits=new Set();
  for(const [id,c] of Object.entries(g.CLASSES)){
    const card=g.classCard(id,c),portrait=g.classCardPortrait(id);portraits.add(portrait);
    assert(card.includes('data-class="'+id+'"')&&card.includes(c.name)&&card.includes('PV '+c.hp)&&card.includes(c.res+' '+c.maxRes)&&card.includes(g.SPECS[id].join(' · ')),'accurate card '+id);
    assert(portrait.includes('viewBox="0 0 68 68"')&&portrait.includes('aria-hidden="true"'),'native portrait');
    assert(card.includes('class-icon'),'original sprite retained');
  }
  assert(portraits.size===4,'distinct portraits');assert(storage.get(key)===saved&&JSON.stringify(g.state())===before,'rendering is pure');
  return {cards:4,distinctPortraits:4,stats:'passed',state:'unchanged',environment:'mock DOM'};
}
console.log(testClassCards(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
