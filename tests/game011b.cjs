// Run: node tests/game011b.cjs
const fs=require('node:fs'),path=require('node:path');
function testCampaignStress(newHtml){
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
    script=script.slice(0,script.indexOf(marker))+'return {newGame,restore,save,generate,move,stepOK,applyPrefs,die,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain}),searchNearby,finish,los,collectLoot,BALANCE,diminishingChance,criticalChance,dodgeChance,attackAttribute,outgoingDamage,incomingDamage,resourceRegen,basicProfile,createGear,learnAdvanced,learnSynergy,synergyTalents,CLASSES,buildDungeon,promoteEnemies,balanceEnemies,selectBossVariant,populateBestiary,biomeForFloor,enemyXP,goldReward,merchantStock,gearPrice,salePrice,bandage,activate,validateTransferRun,exportTransfer,parseTransfer,readHistory,resolveEvent,eventChoiceAllowed,resolveSpecialRoom,specialRoomAllowed,EXPLORATION_EVENTS,SPECIAL_ROOMS,canUseConsumable,useConsumable,healingLeft,advancedTalents,canLearnAdvanced,canLearnSynergy,hide,WEAPONS,GEAR_SETS,aimWeapon,resume:()=>{mode="game";hide()},setZoom:z=>{prefs.zoom=z;applyPrefs()}};})();';
    return new Function('document','localStorage','window','innerHeight','ResizeObserver','Math','return '+script.trim())(document,localStorage,{},800,undefined,random);
  }


  const key='rogue-android-game002-v1',paths=['warrior','rogue','ranger','mage'].flatMap(id=>['offense','defense'].map(spec=>[id,spec]));
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]],dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)),k=p=>p.y*48+p.x;
  let checks=0,reloads=0,turns=0,transitions=0,actions=0;const results=[];
  const equal=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),msg);
  const verify=(b)=>{
    const d=b.state(),s=d.S;
    assert(s.hp>0&&s.hp<=s.maxHp&&s.res>=0&&s.res<=s.maxRes&&s.level>=1&&s.level<=30&&s.floor>=1&&s.floor<=30,'live bounds');
    assert(d.map[k(s)]===0&&d.map[k(d.stairs)]===0,'walkable player and stairs');
    const occupied=new Set([k(s)]);
    for(const m of d.monsters){assert(m.hp>0&&m.hp<=m.maxHp&&d.map[k(m)]===0&&!occupied.has(k(m)),'monster occupancy');occupied.add(k(m))}
    const ids=[...s.bag,...Object.values(s.equip).filter(Boolean),...d.loot.filter(l=>l.kind==='gear'&&l.item).map(l=>l.item)].map(i=>i.id);
    assert(s.bag.length<=24&&new Set(ids).size===ids.length&&ids.every(i=>Number.isInteger(i)&&i<=s.serial),'item identity and capacity');
    assert(s.points>=0&&s.ap>=0&&s.bandages>=0&&s.cool.every(x=>x>=0),'progression bounds');
    b.save();const raw=storage.get(key);assert(raw,'active run persists');const portable=b.parseTransfer(b.exportTransfer());equal(portable.run,JSON.parse(raw),'portable run');checks++;
  };
  const progress=(b,s,id,spec)=>{
    if(s.level>=5&&!s.spec)s.spec=spec;
    while(s.ap>0){const a=s.ap%2===0?2:id==='warrior'?0:id==='mage'?4:1;s.ap--;s.attrs[a]++;if(a===2){s.maxHp+=2;s.hp+=2}}
    for(const [n,l,req] of [['o1',2,[]],['d1',2,[]],['o2',5,['o1']],['d2',5,['d1']],['master',10,['o2','d2']]])if(s.points&&s.level>=l&&!s.nodes[n]&&req.every(r=>s.nodes[r])){s.points--;s.nodes[n]=true}
    if(s.points&&s.level>=5&&s.nodes.o1&&!s.activeTalents[3]){s.points--;s.activeTalents[3]=true;s.bar=[0,1,3]}
    for(const n of b.advancedTalents())if(b.canLearnAdvanced(n[0]))b.learnAdvanced(n[0]);
    for(const n of b.synergyTalents())if(b.canLearnSynergy(n[0]))b.learnSynergy(n[0]);
    if(s.points&&s.ranks[0]<5&&s.level>=2*s.ranks[0]){s.points--;s.ranks[0]++}
    const score=i=>i?i.atk*3+i.def*3+i.crit*.25+i.dodge*.3+i.regen*2:0;
    for(const it of [...s.bag])if(score(it)>score(s.equip[it.slot])){s.bag.splice(s.bag.indexOf(it),1);if(s.equip[it.slot])s.bag.push(s.equip[it.slot]);s.equip[it.slot]=it}
    if(s.bag.length>=22)s.bag=s.bag.filter(x=>x.bossRelic||score(x)>score(s.equip[x.slot])).slice(0,22);
  };
  const route=(d,target)=>{
    const start=k(d.S),goal=k(target),q=[start],prev=new Map([[start,null]]);
    for(let i=0;i<q.length;i++){const n=q[i];if(n===goal)break;const x=n%48,y=Math.floor(n/48);for(const [dx,dy] of dirs){
      const nx=x+dx,ny=y+dy;if(nx<=0||nx>=47||ny<=0||ny>=31)continue;const p=ny*48+nx;if(prev.has(p))continue;
      const f=d.features.find(f=>k(f)===p);
      if(f?.type==='merchant'||(f?.type==='secret'&&!f.open))continue;
      if(d.map[p]!==0&&f?.type!=='door')continue;
      if(dx&&dy&&(d.map[y*48+nx]!==0||d.map[ny*48+x]!==0))continue;
      prev.set(p,n);q.push(p);
    }}
    if(!prev.has(goal)||goal===start)return null;let p=goal;while(prev.get(p)!==start)p=prev.get(p);return [p%48-d.S.x,Math.floor(p/48)-d.S.y];
  };
  for(const [id,spec] of paths)for(let seed=0;seed<2;seed++){
    storage.clear();let b=load(newHtml,1234567+seed*104729+id.length*313+(spec==='offense'?0:17));b.newGame(id);
    let maxFloor=1,stuck=0,previous=0;const used=new Map();
    for(let n=0;n<900;n++){
      const d=b.state(),s=d.S;if(s.dead||s.ended)break;progress(b,s,id,spec);const before=s.turn,oldFloor=s.floor;
      const enemies=d.monsters.filter(m=>b.los(m.x,m.y)).sort((a,c)=>dist(a,s)-dist(c,s));
      const target=enemies[0],heal=s.bar.find(i=>b.CLASSES[id].skills[i][3]==='heal'&&s.cool[i]===0&&s.res>=b.CLASSES[id].skills[i][1]&&b.healingLeft()>0);
      if(s.hp*2<s.maxHp&&heal!==undefined)b.activate(s.bar.indexOf(heal));
      else if(s.hp*2<s.maxHp&&b.canUseConsumable('heal'))b.useConsumable('heal');
      else if(s.hp*2<s.maxHp&&s.bandages>0)b.bandage();
      else {
        const threat=enemies.flatMap(m=>m.intent?.cells|| (m.aim?[m.aim]:[]));
        const dodge=threat.some(p=>p.x===s.x&&p.y===s.y)?dirs.find(([dx,dy])=>b.stepOK(s.x+dx,s.y+dy,s.x,s.y)&&!d.monsters.some(m=>m.x===s.x+dx&&m.y===s.y+dy)&&!threat.some(p=>p.x===s.x+dx&&p.y===s.y+dy)&&!d.features.some(f=>f.x===s.x+dx&&f.y===s.y+dy&&!f.spent&&['event','specialRoom','merchant','chest'].includes(f.type))):null;
        if(dodge)b.move(...dodge);
        else{
          const aligned=target&&(target.x===s.x||target.y===s.y||Math.abs(target.x-s.x)===Math.abs(target.y-s.y));
          const skill=target&&[3,0].find(i=>s.bar.includes(i)&&!s.cool[i]&&s.res>=b.CLASSES[id].skills[i][1]&&(b.CLASSES[id].skills[i][3]==='ranged'?aligned&&dist(target,s)<=5:dist(target,s)===1&&b.stepOK(target.x,target.y,s.x,s.y)));
          if(skill!==false&&skill!==undefined&&skill!==null){b.activate(s.bar.indexOf(skill));b.move(Math.sign(target.x-s.x),Math.sign(target.y-s.y))}
          else{
            let goal=target||d.monsters.find(m=>m.boss)||d.stairs;
            let step=route(d,goal);
            if(!step)step=dirs.find(([dx,dy])=>b.stepOK(s.x+dx,s.y+dy,s.x,s.y)&&!d.features.some(f=>f.x===s.x+dx&&f.y===s.y+dy&&f.type==='merchant'));
            if(step){const f=d.features.find(f=>f.x===s.x+step[0]&&f.y===s.y+step[1]);
              if(f&&!f.spent&&['event','specialRoom'].includes(f.type)&&b.stepOK(f.x,f.y,s.x,s.y)){
                b.move(...step);
                const choices=(f.type==='event'?b.EXPLORATION_EVENTS[f.eventId]:b.SPECIAL_ROOMS[f.roomId]).choices.map(c=>c[0]);
                const allow=f.type==='event'?b.eventChoiceAllowed:b.specialRoomAllowed,resolve=f.type==='event'?b.resolveEvent:b.resolveSpecialRoom;
                const choice=choices.find(c=>allow(f,c));
                if(choice)resolve(f,choice);else if(f.type==='event')resolve(f,'skip');else b.hide();
              }else b.move(...step);
            }else b.finish();
          }
        }
      }
      actions++;const now=b.state().S;turns+=now.turn-before;
      if(now.dead||now.ended){assert(!storage.has(key),'terminal save removed');const count=b.readHistory().total;assert(count===1,'single terminal record');break}
      if(now.floor!==oldFloor){transitions++;maxFloor=Math.max(maxFloor,now.floor)}
      if(now.turn===before)stuck++;else stuck=0;
      if(n%30===0||now.floor!==oldFloor){verify(b);const raw=storage.get(key);assert(b.restore(),'periodic restore');b.resume();equal(b.state().S,JSON.parse(raw).S,'restored player');reloads++}
      if(stuck>=20){b.hide();break}
    }
    const s=b.state().S;results.push({id,spec,seed,floor:s.floor,level:s.level,turn:s.turn,outcome:s.ended||'budget-or-policy-limit'});
  }
  assert(checks>20&&turns>300&&transitions>0,'stress coverage');
  return {runs:results.length,actions,turns,transitions,checks,reloads,results};
}
console.log(testCampaignStress(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
