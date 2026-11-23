// Run: node tests/game004d-integration.cjs
const fs=require('node:fs'),path=require('node:path');
function testBossIntegration(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features}),searchNearby,finish,enemyPhase,kill,hit,enemyAttack,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined);
  }


  const g=load(newHtml);g.newGame('warrior');let d=g.state();
  d.monsters.splice(0);d.loot.splice(0);d.features.splice(0);
  d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
  d.S.x=6;d.S.y=6;d.S.floor=6;d.S.hp=28;d.stairs.x=7;d.stairs.y=6;
  const boss={x:12,y:12,role:'guardian',boss:'stone',kind:'Kharok',hp:36,maxHp:36,atk:5,phase:1,ability:'Frappe tellurique',specialCD:0,elite:true,color:'#d9a36d'};d.monsters.push(boss);
  g.move(1,0);assert(d.S.floor===6&&d.S.x===7,'exit locked');d.S.x=6;d.S.y=6;
  boss.x=8;boss.y=6;g.enemyPhase();assert(boss.intent&&boss.intent.cells.some(p=>p.x===6&&p.y===6),'boss warning');
  g.save();const saved=load(newHtml);assert(saved.restore(),'restore pending boss');assert(JSON.stringify(saved.state().monsters[0].intent)===JSON.stringify(boss.intent),'intent persisted');
  boss.stun=1;g.enemyPhase();assert(!boss.intent&&boss.stun===0,'stun cancels');boss.hp=17;g.enemyPhase();assert(boss.phase===2&&boss.intent,'phase 2');
  boss.hp=0;g.kill(boss);d=g.state();assert(!d.monsters.length&&d.loot[0].item.bossRelic&&d.loot[0].item.slot==='armor','relic');
  const id=d.loot[0].item.id;g.move(1,0);assert(g.state().S.floor===7,'exit unlocked');
  const e=g.state();e.monsters.splice(0);e.loot.splice(0);
  const elite={x:e.S.x+1,y:e.S.y,affix:'armored',hp:8,maxHp:8,kind:'elite',elite:true};e.monsters.push(elite);g.kill(elite);assert(g.state().loot[0].item.name.startsWith('Rare')&&g.state().loot[0].item.id>id,'rare reward');
  const loot=g.state().loot[0].item;assert(loot.crit>0&&loot.regen===0,'rare stats');
  return {exitGate:'passed',intent:'passed',saveIntent:'passed',stun:'passed',phase2:'passed',relic:'passed',rareReward:'passed',environment:'mock DOM'};
}

console.log(testBossIntegration(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
