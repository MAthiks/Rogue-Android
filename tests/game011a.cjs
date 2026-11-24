// Run: node tests/game008e3.cjs
const fs=require('node:fs'),path=require('node:path');
function testRecovery(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  let failKey=null;
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},focus(){},select(){this.selected=true},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(failKey===k){failKey=null;throw Error('simulated quota')}storage.set(k,String(v))},removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,generate,save,restore,die,startMenu,recoveryMenu,readHistory,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),exportTransfer:typeof exportTransfer==="function"?exportTransfer:null,importTransfer:typeof importTransfer==="function"?importTransfer:null,parseTransfer:typeof parseTransfer==="function"?parseTransfer:null};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const g=load(newHtml),key='rogue-android-game002-v1',history='rogue-android-history-v1',pref='rogue-android-display-v1';
  g.newGame('warrior');const original=storage.get(key);g.die();g.newGame('mage');const h=storage.get(history);storage.set(pref,JSON.stringify({zoom:125,pad:100}));
  const damaged=['invalid json','<img src=x onerror=alert(1)>',JSON.stringify({...JSON.parse(original),S:{...JSON.parse(original).S,classId:'constructor'}}),JSON.stringify({...JSON.parse(original),S:{...JSON.parse(original).S,cool:null}}),JSON.stringify({...JSON.parse(original),monsters:null})];
  for(const raw of damaged){
    storage.set(key,raw);g.startMenu();g.nodes.get('resume').onclick();
    assert(g.state().S===null,'no stale active run');assert(storage.get(key)===raw,'original retained');
    assert(g.nodes.get('recoveryData').value===raw,'raw data available only via textarea value');
    g.nodes.get('recoveryCopy').onclick();assert(g.nodes.get('recoveryData').selected,'copy selectable');
    g.save();assert(storage.get(key)===raw,'autosave cannot overwrite');g.nodes.get('recoveryBack').onclick();
    assert(storage.get(key)===raw&&storage.get(history)===h,'back preserves save and history');
  }
  storage.set(key,original);g.startMenu();g.nodes.get('resume').onclick();assert(g.state().S.classId==='warrior','valid resume');
  g.die();assert(!storage.has(key),'permadeath preserved');
  return {damagedCases:damaged.length,recovery:'passed',autosave:'passed',validResume:'passed',permadeath:'passed'};
}
console.log(testRecovery(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
