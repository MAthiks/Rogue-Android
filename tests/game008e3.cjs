// Run: node tests/game008e3.cjs
const fs=require('node:fs'),path=require('node:path');
function testTransfer(oldHtml,newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  let failKey=null;
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(failKey===k){failKey=null;throw Error('simulated quota')}storage.set(k,String(v))},removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,generate,save,restore,die,startMenu,readHistory,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),exportTransfer:typeof exportTransfer==="function"?exportTransfer:null,importTransfer:typeof importTransfer==="function"?importTransfer:null,parseTransfer:typeof parseTransfer==="function"?parseTransfer:null};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const key='rogue-android-game002-v1',history='rogue-android-history-v1',pref='rogue-android-display-v1';
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const eq=(a,b,msg)=>assert(JSON.stringify(canonical(a))===JSON.stringify(canonical(b)),msg);
  const old=load(oldHtml),g=load(newHtml);
  let count=0;
  for(const cls of ['warrior','rogue','ranger','mage']){
    storage.clear();old.newGame(cls);old.die();old.newGame(cls);
    for(const floor of [1,6,12,18,24,30]){
      old.state().S.floor=floor;old.generate();old.save();
      const original=JSON.parse(storage.get(key));const data=g.exportTransfer();const b=g.parseTransfer(data);eq(b.run,original,'authentic legacy run');
      const origHistory=old.readHistory();
      g.startMenu();g.importTransfer(data);assert(g.state().S===null,'stale in-memory game cleared');g.save();assert(g.restore(),'imported run resumes');eq(g.state().S,original.S,'preserved player');eq(g.readHistory(),origHistory,'preserved history');count++;
    }
  }
  g.startMenu();const valid=g.exportTransfer();const before=JSON.stringify([...storage]);const bad=(mutate)=>{const b=JSON.parse(valid);mutate(b);let rejected=false;try{g.importTransfer(JSON.stringify(b))}catch(e){rejected=true}assert(rejected,'invalid transfer rejected');assert(JSON.stringify([...storage])===before,'invalid transfer never writes')};
  bad(b=>b.format='unknown');bad(b=>b.run.S.dead=true);bad(b=>b.run.S.ended='victory');bad(b=>b.run.S.classId='constructor');bad(b=>b.run.map.pop());bad(b=>b.run.monsters[0].kind='<img src=x onerror=alert(1)>');bad(b=>b.run.S.x=999);bad(b=>b.prefs.zoom=999);bad(b=>b.history.runs[0].outcome='other');bad(b=>Object.defineProperty(b.run.S,'__proto__',{value:{bad:1},enumerable:true}));
  const replacement=JSON.parse(valid);replacement.prefs.zoom=200;replacement.run.S.turn+=1;failKey=pref;let rejected=false;try{g.importTransfer(JSON.stringify(replacement))}catch(e){rejected=true}assert(rejected&&JSON.stringify([...storage])===before,'rollback after failed write');
  g.importTransfer(JSON.stringify(replacement));assert(g.restore()&&g.state().S.turn===replacement.run.S.turn,'valid replacement');g.die();g.startMenu();const empty=g.exportTransfer();assert(g.parseTransfer(empty).run===null,'death not exported as active run');
  return {legacyCases:count,malformedRejected:10,rollback:'passed',death:'passed',environment:'mock DOM'};
}
console.log(testTransfer(fs.readFileSync(process.argv[2],'utf8'),fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
