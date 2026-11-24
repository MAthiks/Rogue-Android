function mob(x,y){return monsters.find(m=>m.hp>0&&m.x===x&&m.y===y)}
function enemyXP(m,floor){
  const depth=Math.max(1,Math.min(30,floor));
  return m.boss?30+depth*2:m.elite?12+Math.floor(depth/3):4+Math.floor((depth-1)/4);
}
function balanceEnemies(monsters,floor){
  const depth=Math.max(1,Math.min(30,floor)),bonus=Math.floor((depth-1)/6);
  return monsters.map(m=>{
    const lateBoss=m.boss?Math.max(0,Math.floor((depth-13)/6)+1)*6:0;
    const hp=m.maxHp+(m.boss?bonus*3+lateBoss:m.elite?bonus*2:bonus),atk=m.atk+(m.boss?Math.floor(bonus/2):bonus);
    return {...m,hp,maxHp:hp,atk};
  });
}
function addSupplies(d,decorated,terrain){
  const taken=new Set([d.start,d.stairs,...d.monsters,...d.loot,...decorated.features,...terrain].map(p=>p.x+','+p.y));
  const r=d.rooms.find(r=>r.cx===d.start.x&&r.cy===d.start.y);
  if(!r)return d.loot.slice();
  const choices=[];
  for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
    if(decorated.map[y*48+x]!==0||taken.has(x+','+y)||Math.max(Math.abs(x-d.start.x),Math.abs(y-d.start.y))>3)continue;
    choices.push({x,y,kind:'bandage'});
  }
  choices.sort((a,b)=>Math.abs(a.x-d.start.x)+Math.abs(a.y-d.start.y)-Math.abs(b.x-d.start.x)-Math.abs(b.y-d.start.y)||a.y-b.y||a.x-b.x);
  return choices.length?[...d.loot,choices[0]]:d.loot.slice();
}
function healingLeft(){return Math.max(0,3-(S.healUses||0))}
function bandageValue(level){return 9+Math.floor(Math.max(0,Math.min(30,level)-1)/5)}
/* TECH-012A — Convertit l'expérience en niveaux et attribue les gains correspondants. Plusieurs niveaux peuvent être obtenus en une seule récompense, sans dépasser le niveau 30. */
function gainXP(n){
  if(S.level>=30){
    S.xp=0;
    return
  }
  S.xp+=n;
  let threshold=8+S.level*6;
  while(S.level<30&&S.xp>=threshold){
    S.xp-=threshold;
    S.level++;
    threshold=8+S.level*6;
    S.points++;
    S.ap+=2;
    S.maxHp+=4;
    S.hp=Math.min(S.maxHp,S.hp+8);
    S.maxRes+=1;
    S.res=S.maxRes;
    say('Niveau '+S.level+' ! +4 PV max, +1 ressource,  +2 caractéristiques, +1 talent.')
  }
  if(S.level>=30)S.xp=0
}