// GAME-004A integration checks using a mocked DOM (not a browser/Android test).
// Run: node tests/game004a-integration.cjs /path/to/GAME-003B-index.html
const fs=require('node:fs');const path=require('node:path');
function regression(oldHtml,newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs}),resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }
  const old=load(oldHtml);old.newGame('mage');
  const state=old.state();state.S.level=8;state.S.points=3;state.S.activeTalents[3]=true;state.S.bar=[3,1,2];state.S.spec='offense';old.setZoom(150);old.save();
  const key='rogue-android-game002-v1',saved=JSON.parse(storage.get(key));
  const game=load(newHtml);assert(game.restore(),'legacy save load');let s=game.state();
  for(const k of ['S','map','seen','monsters','loot','stairs'])assert(JSON.stringify(s[k])===JSON.stringify(saved[k]),'legacy changed '+k);
  assert(s.prefs.zoom===150,'zoom migration');game.resume();
  const {stairs}=s;let previous;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(game.stepOK(stairs.x,stairs.y,stairs.x-dx,stairs.y-dy)){previous={x:stairs.x-dx,y:stairs.y-dy,dx,dy};break}
  assert(previous,'stairs adjacent');s.S.x=previous.x;s.S.y=previous.y;
  for(let i=s.monsters.length-1;i>=0;i--)if(s.monsters[i].x===stairs.x&&s.monsters[i].y===stairs.y)s.monsters.splice(i,1);
  game.move(previous.dx,previous.dy);s=game.state();
  assert(s.S.floor===2&&s.S.dungeon.version===1&&s.S.level===8&&s.S.spec==='offense','transition');
  assert(s.S.turn===saved.S.turn+1,'one turn');assert(s.S.bar.join(',')==='3,1,2','bar preserved');
  assert(JSON.parse(storage.get(key)).S.dungeon.seed===s.S.dungeon.seed,'autosave new floor');
  const reloaded=load(newHtml);assert(reloaded.restore(),'new save load');
  for(const k of ['S','map','seen','monsters','loot','stairs'])assert(JSON.stringify(reloaded.state()[k])===JSON.stringify(s[k]),'new save mismatch '+k);
  reloaded.resume();reloaded.die();assert(!storage.has(key),'permadeath');
  for(const id of ['warrior','rogue','ranger','mage']){
    const g=load(newHtml);g.newGame(id);const d=g.state();assert(d.S.classId===id&&d.S.floor===1&&d.map.length===1536&&d.S.dungeon.version===1,'new game '+id);
    let moved=false;for(const [dx,dy] of [[1,1],[-1,-1],[1,-1],[-1,1],[1,0],[-1,0],[0,1],[0,-1]])if(g.stepOK(d.S.x+dx,d.S.y+dy,d.S.x,d.S.y)){g.move(dx,dy);moved=true;break}
    assert(moved&&g.state().S.turn===1,'movement '+id);g.setZoom(200);assert(g.state().prefs.zoom===200,'zoom');
  }
  return {legacySave:'unchanged on restore',transition:'passed',newSave:'passed',permadeath:'passed',classes:4,movement:'passed',zoom:'passed',environment:'mock DOM'};
}
if(!process.argv[2])throw Error('Provide the baseline index.html from 087621f');
console.log(regression(fs.readFileSync(process.argv[2],'utf8'),fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
