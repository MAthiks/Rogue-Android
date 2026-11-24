// Run: node tests/game010e.cjs
const fs=require('node:fs'),path=require('node:path');
function testCampaignBalance(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html,seed=1){
    const random=Object.create(Math);random.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    const nodes=new Map(),ctx={fillRect(){},strokeRect(){}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,BALANCE,diminishingChance,criticalChance,dodgeChance,attackAttribute,outgoingDamage,incomingDamage,resourceRegen,basicProfile,createGear,learnAdvanced,learnSynergy,synergyTalents,CLASSES,buildDungeon,promoteEnemies,balanceEnemies,selectBossVariant,populateBestiary,biomeForFloor,enemyXP,goldReward,merchantStock,gearPrice,salePrice,bandage,activate,validateTransferRun,WEAPONS,GEAR_SETS,aimWeapon,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','Math','return '+script.trim())(document,localStorage,{},800,undefined,random);
  }


  const g=load(newHtml);g.newGame('warrior');
  const paths=['warrior','rogue','ranger','mage'].flatMap(id=>['offense','defense'].map(spec=>[id,spec]));
  const rngFrom=seed=>n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n)};
  let floors=0,transactions=0;const progression=[];
  for(let seed=0;seed<40;seed++){
    let xp=0,level=1,gold=0,kills=0,spend=0;
    for(let f=1;f<=30;f++){
      const d=g.buildDungeon(48,32,f,seed*101+f),mobs=g.balanceEnemies(g.promoteEnemies(d.monsters,f,d.seed,d.stairs),f);
      for(const m of mobs){xp+=g.enemyXP(m,f);gold+=g.goldReward(m,f);kills++;assert(m.hp>0&&m.atk>=1,'enemy bounds')}
      while(level<30&&xp>=8+level*6){xp-=8+level*6;level++}if(level===30)xp=0;
      if((f-2)%3===0&&f>=2){
        const stock=g.merchantStock(f,d.seed,['arms','apothecary','trader'][Math.floor((f-2)/3)%3]);
        for(const a of stock){assert(a.price>0&&a.qty>0,'stock bounds');if(a.kind==='gear')assert(g.salePrice(a.item)<a.price,'no buy/sell arbitrage')}
        for(const a of [stock.find(a=>a.kind==='gear'),stock.find(a=>a.kind==='bandage')])if(a&&gold>=a.price){gold-=a.price;spend+=a.price;transactions++}
      }
      assert(gold>=0&&level<=30,'budget');floors++;
    }
    assert(level===30,'full-clear progression reaches cap');progression.push({level,kills,gold,spend});
  }
  const setup=(b,id,spec,floor,seed)=>{
    b.newGame(id);const d=b.state(),s=d.S,level=Math.min(30,Math.max(1,Math.floor(floor*1.15)+1));
    s.level=level;s.floor=floor;s.spec=level>=5?spec:null;s.points=level-1;
    s.attrs[id==='warrior'?0:id==='mage'?4:1]+=level-1;s.attrs[spec==='defense'?2:5]+=level-1;s.ap=0;
    s.maxHp+=4*(level-1)+(spec==='defense'?2*(level-1):0);s.hp=s.maxHp;s.maxRes+=level-1;s.res=s.maxRes;
    s.combatStyle=spec==='offense'?'aggressive':'defensive';
    for(const k of ['o1','d1','o2','d2','master'])if(s.points&&level>=(k==='master'?10:['o2','d2'].includes(k)?5:2)){s.nodes[k]=true;s.points--}
    if(level>=8){b.learnAdvanced('vigor');b.learnAdvanced('resolve')}
    if(level>=12)b.learnAdvanced(spec==='offense'?'frenzy':'bulwark');
    if(level>=20)b.learnAdvanced(spec==='offense'?'execution':'laststand');
    for(const n of b.synergyTalents())b.learnSynergy(n[0]);
    if(level>=5&&s.nodes.o1&&s.points){s.activeTalents[3]=true;s.points--;s.bar=[0,3,id==='rogue'?1:2]}
    if(id==='ranger'||id==='mage')s.bar=s.activeTalents[3]?[0,3,1]:[0,1,2];
    for(const i of [0,3,0,3])if((i===0||s.activeTalents[3])&&s.points&&s.ranks[i]<5&&level>=s.ranks[i]*2){s.ranks[i]++;s.points--}
    const rng=rngFrom(seed);for(let i=0;i<60;i++){const it=b.createGear(++s.serial,floor,1,rng);if(!s.equip[it.slot])s.equip[it.slot]=it}
    assert(s.points>=0&&s.bar.every(i=>i<3||s.activeTalents[i]),'legal build');
    d.map.fill(1);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)d.map[y*48+x]=0;
    d.features.splice(0);d.terrain.splice(0);d.loot.splice(0);d.monsters.splice(0);
    s.x=7;s.y=7;d.stairs.x=15;d.stairs.y=15;s.bandages=2;s.healUses=0;
    return {d,s};
  };
  const results=[];let turns=0;
  for(const [id,spec] of paths){
    let wins=0,losses=0,stalls=0;const failed=[];
    for(let floor=1;floor<=30;floor++)for(let n=0;n<2;n++){
      const seed=104729*floor+37*n+id.length*17,b=load(newHtml,seed),{d,s}=setup(b,id,spec,floor,seed);
      const layout=b.buildDungeon(48,32,floor,seed),all=b.selectBossVariant(b.balanceEnemies(b.promoteEnemies(layout.monsters,floor,seed,layout.stairs),floor),floor,seed);
      const pool=b.populateBestiary(all,b.biomeForFloor(floor,seed),floor,seed);
      const source=pool.find(m=>m.boss)||pool.find(m=>m.elite)||pool[0];
      const m={...source,x:10,y:7};d.monsters.push(m);
      const before=s.turn;
      for(let t=0;t<100&&!s.dead&&b.state().monsters.includes(m);t++){
        const dx=Math.sign(m.x-s.x),dy=Math.sign(m.y-s.y),distance=Math.max(Math.abs(m.x-s.x),Math.abs(m.y-s.y));
        if(s.hp*3<s.maxHp&&s.bandages){b.bandage();continue}
        // Avoid telegraphs while moving towards the enemy where possible.
        if(m.intent?.cells.some(p=>p.x===s.x&&p.y===s.y)||m.aim?.x===s.x&&m.aim?.y===s.y){
          const escapes=[];for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if((xx||yy)&&b.stepOK(s.x+xx,s.y+yy,s.x,s.y)&&!(m.x===s.x+xx&&m.y===s.y+yy)&&!m.intent?.cells.some(p=>p.x===s.x+xx&&p.y===s.y+yy))escapes.push([xx,yy]);
          escapes.sort((a,b)=>Math.max(Math.abs(s.x+a[0]-m.x),Math.abs(s.y+a[1]-m.y))-Math.max(Math.abs(s.x+b[0]-m.x),Math.abs(s.y+b[1]-m.y)));
          if(escapes.length){b.move(...escapes[0]);continue}
        }
        const aligned=m.x===s.x||m.y===s.y||Math.abs(m.x-s.x)===Math.abs(m.y-s.y);
        const skill=id==='warrior'||id==='rogue'?distance===1:distance<=5&&aligned;
        const chosen=[3,0].find(i=>skill&&s.bar.includes(i)&&!s.cool[i]&&s.res>=b.CLASSES[id].skills[i][1]);
        if(chosen!==undefined){b.activate(s.bar.indexOf(chosen));b.move(dx,dy)}else b.move(dx,dy);
      }
      turns+=s.turn-before;
      if(s.dead){losses++;failed.push([floor,n,'death'])}else if(!b.state().monsters.includes(m))wins++;else{stalls++;failed.push([floor,n,'stall',m.role,m.boss||null,s.x,s.y,m.x,m.y,s.turn-before])}
      assert(s.res>=0&&s.res<=s.maxRes&&s.hp>=0&&s.hp<=s.maxHp,'bounded combat state');
    }
    results.push({id,spec,wins,losses,stalls,failed});
  }
  const b=load(newHtml),{d,s}=setup(b,'warrior','offense',24,5);s.attrs[3]=36;s.res=10;s.cool[0]=0;s.bar=[0,1,2];s.equip.weapon=null;
  const enemy={x:8,y:7,hp:999,maxHp:999,atk:1,role:'brute',kind:'Cible',color:'#aaaaaa',stun:5};
  d.monsters.push(enemy);assert(b.resourceRegen()>2&&b.resourceRegen(false,true)===2&&b.resourceRegen(true)===1,'regen ceilings');
  b.activate(0);b.move(1,0);assert(s.res===9,'paid skill regeneration');
  const boss={hp:60,maxHp:60,atk:6,boss:'veil',elite:true};assert(b.balanceEnemies([boss],12)[0].maxHp===63&&b.balanceEnemies([boss],30)[0].maxHp===90,'late boss HP');
  assert(b.gearPrice({itemLevel:15,rarity:3})===65&&b.gearPrice({itemLevel:30,rarity:3})===110,'late pricing');
  const sum=k=>progression.reduce((n,v)=>n+v[k],0)/progression.length;
  assert(results.every(r=>r.wins+r.losses+r.stalls===60),'all paths exercised');
  assert(results.every(r=>r.wins>=50&&r.stalls<=5),'isolated encounter regression threshold');
  return {campaignModels:40,floors,transactions,meanKills:Math.round(sum('kills')),meanGoldAfterPurchases:Math.round(sum('gold')),meanSpend:Math.round(sum('spend')),duels:480,turns,results,regen:'passed',bossHP:'passed',pricing:'passed'};
}
console.log(testCampaignBalance(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
