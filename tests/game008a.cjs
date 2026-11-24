// Run: node tests/game008a.cjs
const fs=require('node:fs'),path=require('node:path');
function testMigration008A(oldHtml,rc1Html,newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,die,render,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),resume:()=>{mode="game";hide()}};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const KEY='rogue-android-game002-v1',PREF='rogue-android-display-v1',HISTORY='rogue-android-history-v1';
  const same=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),msg);
  let cases=0;
  for(const [version,html] of [['GAME-004',oldHtml],['RC1',rc1Html]])for(const cls of ['warrior','rogue','ranger','mage']){
    storage.clear();storage.set(PREF,JSON.stringify({zoom:125,pad:115}));
    const source=load(html);
    if(version==='RC1'){source.newGame(cls);source.die();assert(storage.has(HISTORY),'RC1 history generated')}
    source.newGame(cls);
    const d=source.state(),s=d.S;
    s.turn=19;s.hp=Math.max(1,s.maxHp-4);s.res=Math.max(0,s.maxRes-2);s.xp=5;s.bandages=2;
    source.save();
    const original=JSON.parse(storage.get(KEY)),history=storage.get(HISTORY),prefs=storage.get(PREF);
    const target=load(newHtml);assert(target.restore(),version+' '+cls+' restores');
    const resumed=target.state();
    for(const field of ['classId','x','y','hp','maxHp','res','maxRes','level','floor','turn','xp','bandages','attrs','ranks','bar','equip','bag','serial'])same(resumed.S[field],original.S[field],version+' '+cls+' '+field);
    for(const field of ['map','seen','monsters','loot','stairs','features','terrain'])same(resumed[field],original[field],version+' '+cls+' '+field);
    same(resumed.prefs,{zoom:125,pad:115},'preferences loaded');
    target.resume();target.render();target.save();
    const migrated=storage.get(KEY);assert(migrated&&storage.get(PREF)===prefs&&storage.get(HISTORY)===history,'separate history/preferences retained');
    const again=load(newHtml);assert(again.restore(),'second restore');again.save();same(JSON.parse(storage.get(KEY)),JSON.parse(migrated),'idempotent migration');
    cases++;
  }
  storage.clear();storage.set(KEY,'invalid json');const broken=load(newHtml);assert(!broken.restore()&&storage.get(KEY)==='invalid json','restore alone does not overwrite damaged data');
  return {migrationCases:cases,preferences:'preserved',history:'preserved',idempotence:'passed',corruptRestore:'safe',environment:'mock DOM'};
}
console.log(testMigration008A(fs.readFileSync(process.argv[2],'utf8'),fs.readFileSync(process.argv[3],'utf8'),fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
