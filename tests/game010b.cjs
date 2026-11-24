// Run: node tests/game010b.cjs
const fs=require('node:fs'),path=require('node:path');
function testSynergies(newHtml){
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},storage=new Map();
  function load(html){
    const nodes=new Map(),draws=[],ctx={fillRect(...a){draws.push([this.fillStyle,...a])},strokeRect(...a){draws.push([this.strokeStyle,...a])}};
    const element=id=>{if(!nodes.has(id)){let classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},contains(v){return classes.has(v)},toggle(v,on){if(on)classes.add(v);else classes.delete(v)}},getContext(){return ctx},parentElement:{clientWidth:480,clientHeight:500},width:640,height:384,querySelectorAll(){return []},addEventListener(){}})}return nodes.get(id)};
    const document={getElementById:element,querySelectorAll(){return []},documentElement:element('html'),addEventListener(){}};
    const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
    let script=html.split('<script>')[1].split('</script>')[0];
    const marker='startMenu();applyPrefs();window.addEventListener("resize",applyPrefs);';
    assert(script.includes(marker),'bootstrap marker');
    script=script.slice(0,script.indexOf(marker))+'return {CLASSES,SPECS,ATTR,characterDossier,characterAttributeCard,characterRankCard,criticalChance,dodgeChance,resourceRegen,doctrineBonus,doctrineDescription,outgoingDamage,incomingDamage,synergyTalents,canLearnSynergy,learnSynergy,hasSynergy,synergyDamage,synergyHeal,synergyGuard,synergyShield,synergyDuration,talentBonus,activate,move,validateTransferRun,newGame,save,restore,state:()=>({S,map,seen,monsters,loot,stairs,prefs,features,terrain})};})();';
    return Object.assign(new Function('document','localStorage','window','innerHeight','ResizeObserver','return '+script.trim())(document,localStorage,{},800,undefined),{draws,nodes});
  }


  const expected={warrior:{offense:['fracture','rend'],defense:['counter','fortress']},rogue:{offense:['focus','hemorrhage'],defense:['riposte','footwork']},ranger:{offense:['aim','penetration'],defense:['recovery','reserve']},mage:{offense:['shock','overload'],defense:['ward','restoration']}};
  let paths=0,learned=0;
  for(const [id,branches] of Object.entries(expected))for(const [spec,[first,last]] of Object.entries(branches)){
    const g=load(newHtml);g.newGame(id);const d=g.state(),s=d.S;d.monsters.splice(0);d.terrain.splice(0);s.spec=spec;s.points=2;
    const opposite=branches[spec==='offense'?'defense':'offense'][0],prereq=spec==='offense'?'adv_vigor':'adv_resolve';
    assert(g.synergyTalents().length===4,'four talents '+id);
    s.level=10;assert(!g.learnSynergy(first),'prerequisite');
    s.nodes[prereq]=true;s.level=9;assert(!g.learnSynergy(first),'level 10');
    s.level=10;assert(g.learnSynergy(first)&&s.points===1&&!g.learnSynergy(first),'first cost');
    assert(!g.learnSynergy(last),'level 18');s.level=18;
    assert(g.learnSynergy(last)&&s.points===0,'second cost');s.points=1;
    s.nodes[spec==='offense'?'adv_resolve':'adv_vigor']=true;assert(!g.learnSynergy(opposite),'branch exclusive');
    s.hp=Math.floor(s.maxHp/2);s.res=Math.floor(s.maxRes/2);s.guard=2;s.shield=6;s.boost=3;
    const m={hp:100,maxHp:100,atk:20,exposed:3};
    const p={skill:true,index:0,ranged:id==='ranger'||id==='mage'};
    if(spec==='offense'){
      const value={warrior:3,rogue:3,ranger:3,mage:2}[id];
      assert(g.synergyDamage(m,p)===value,'offensive synergy '+id);
      const before=g.outgoingDamage(m,8,p,false);s.nodes['syn_'+first]=false;
      assert(before-g.outgoingDamage(m,8,p,false)===value,'combat formula '+id);s.nodes['syn_'+first]=true;
      if(id==='warrior'){assert(g.synergyDuration('exposed',m)===6,'exposure');m.exposed=0;}
      if(id==='rogue'){assert(g.synergyDuration('bleed',m)===5,'bleeding');s.boost=0;}
      if(id==='ranger'){assert(g.synergyDamage(m,{skill:true,index:3,ranged:true,secondary:true})===2,'secondary');assert(g.synergyDamage(m,{...p,secondary:true})===0,'no aim on secondary');s.boost=0;}
      if(id==='mage'){assert(g.synergyDuration('stun',m)===2&&g.synergyDuration('stun',{boss:'stone'})===1,'boss stun unchanged');s.shield=0;}
      assert(g.synergyDamage(m,p)===0,'inactive damage '+id);
    }else if(id==='warrior'||id==='rogue'){
      const attack=id==='warrior'?{}:p;
      assert(g.synergyDamage(m,attack)===2&&g.synergyGuard()===1,'defensive combo '+id);
      s.guard=0;assert(g.synergyDamage(m,attack)===0,'unguarded');
      const i=id==='warrior'?2:1;s.res=s.maxRes;s.cool[i]=0;g.activate(i);
      assert(s.guard===3+g.talentBonus('guard'),'actual guard duration '+id);
    }else{
      assert(g.synergyHeal()===3,'healing combo '+id);
      s.maxHp=100;s.hp=10;s.res=s.maxRes;s.cool[1]=0;s.healUses=0;
      const nextRegen=()=>{s.turn++;const n=g.resourceRegen();s.turn--;return n};
      const regen=nextRegen();g.activate(1);
      assert(s.hp===10+7+s.level+3+g.talentBonus('heal')+Math.floor(s.attrs[4]/3),'actual heal '+id);
      assert(s.healUses===1,'heal budget');
      if(id==='ranger')assert(s.res===Math.min(s.maxRes,s.maxRes-4+2+regen),'actual resource refund');
      if(id==='mage'){
        s.res=3;s.cool[2]=0;s.shield=0;g.activate(2);assert(s.shield===9+g.talentBonus('shield'),'actual shield bonus');
        s.shield=0;assert(g.synergyHeal()===0,'no shield heal');
      }else{s.hp=s.maxHp;assert(g.synergyHeal()===0,'no emergency heal')}
    }
    g.save();const resumed=load(newHtml);assert(resumed.restore()&&resumed.hasSynergy(first)&&resumed.hasSynergy(last),'persisted '+id+' '+spec);
    assert(resumed.state().S.points===s.points,'points saved');resumed.validateTransferRun(resumed.state());
    paths++;learned+=2;
  }
  const g=load(newHtml);g.newGame('warrior');const s=g.state().S;s.level=30;s.spec='offense';
  assert(!g.hasSynergy('fracture')&&!g.hasSynergy('rend')&&g.synergyDuration('exposed',{})===4,'legacy no implicit talents');
  assert(!g.learnSynergy('unknown'),'unknown ID');
  // Actual directional skill path: duration counts include the enemy phase.
  for(const [id,first,last,field,duration] of [['warrior','fracture','rend','exposed',5],['rogue','focus','hemorrhage','bleed',4],['mage','shock','overload','stun',1]]){
    const b=load(newHtml);b.newGame(id);const d=b.state(),s=d.S;
    d.map.fill(1);for(let y=4;y<15;y++)for(let x=4;x<15;x++)d.map[y*48+x]=0;
    d.features.splice(0);d.terrain.splice(0);d.loot.splice(0);d.monsters.splice(0);
    s.x=6;s.y=6;s.level=18;s.spec='offense';s.nodes.adv_vigor=true;s.nodes['syn_'+first]=true;s.nodes['syn_'+last]=true;
    s.activeTalents[3]=true;s.bar=[3,0,2];s.res=s.maxRes;
    const enemy={x:7,y:6,hp:999,maxHp:999,atk:1,kind:'Cible',role:'brute',color:'#aaaaaa'};
    d.monsters.push(enemy);const before=s.turn;b.activate(0);assert(s.turn===before,'aim costs no turn');b.move(1,0);
    assert(s.turn===before+1&&enemy[field]===duration,'actual directed duration '+id+' '+enemy[field]);
  }
  return {paths,learned,directed:3,damage:'passed',status:'passed',guard:'passed',healing:'passed',resources:'passed',shield:'passed',persistence:'passed',transfer:'passed'};
}
console.log(testSynergies(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')));
