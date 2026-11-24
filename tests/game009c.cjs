// Run: node tests/game009c.cjs
const fs=require('node:fs'),path=require('node:path');
function testSheet(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {CLASSES,SPECS,ATTR,characterDossier,characterAttributeCard,characterRankCard,criticalChance,dodgeChance,resourceRegen,newGame,save,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain})};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const g=load(newHtml),key='rogue-android-game002-v1';let cases=0;
  for(const [id,c] of Object.entries(g.CLASSES)){
    g.newGame(id);const s=g.state().S;s.hp=7;s.res=3;s.xp=4;s.ap=1;s.points=1;s.level=3;s.kills=6;g.save();
    const before=JSON.stringify(g.state()),saved=storage.get(key),markup=g.characterDossier();
    assert(markup.includes(c.name)&&markup.includes('7/'+s.maxHp)&&markup.includes('3/'+s.maxRes)&&markup.includes('4/26'),'live meters');
    assert(markup.includes('Niveau 3')&&markup.includes('Sans spécialisation')&&markup.includes(g.criticalChance()+'%')&&markup.includes(g.dodgeChance()+'%'),'live sheet values');
    assert(markup.includes('sheet-sprite')&&markup.includes('class-portrait'),'dual portrait');
    for(let i=0;i<6;i++){const card=g.characterAttributeCard(g.ATTR[i],i);assert(card.includes('data-attr="'+i+'"')&&card.includes('Investir +1'),'attribute '+i)}
    for(let i=0;i<5;i++){const card=g.characterRankCard(c.skills[i],i);assert(card.includes('data-rank="'+i+'"')&&card.includes('skill-icon'),'rank '+i);assert(card.includes('disabled')===(i>=3),'rank eligibility')}
    assert(JSON.stringify(g.state())===before&&storage.get(key)===saved,'pure rendering');
    s.level=30;s.spec='defense';s.ap=0;s.ranks[0]=5;
    assert(g.characterDossier().includes('MAX')&&g.characterDossier().includes(g.SPECS[id][1]),'cap and spec');
    assert(g.characterAttributeCard(g.ATTR[0],0).includes('disabled'),'no points');assert(g.characterRankCard(c.skills[0],0).includes('Rang maximum'),'rank cap');
    cases++;
  }
  return {classes:cases,attributeCards:24,skillCards:20,meters:'passed',caps:'passed',state:'unchanged',environment:'mock DOM'};
}
console.log(testSheet(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
