// GAME-005E: deterministic floor encounters, saved in the existing feature/monster arrays.
const EXPLORATION_EVENTS={
 shrine:{name:'Autel oublié',min:2,color:'#b6a0d9',desc:'Une pierre gravée pulse faiblement.',choices:[['blessing','Prier : restaurer jusqu’à 10 PV et 4 ressources.'],['offering','Offrir 1 bandage : obtenir une protection de 10 points.']]},
 cache:{name:'Cache du voyageur',min:1,color:'#d1b178',desc:'Un paquet de provisions abandonné.',choices:[['supplies','Prendre 2 bandages.'],['gear','Fouiller le double fond : obtenir un objet magique ou mieux.']]},
 fountain:{name:'Source ancienne',min:3,color:'#79b7cb',desc:'Une eau claire filtre entre les pierres.',choices:[['drink','Boire : restaurer jusqu’à 8 PV.'],['bottle','Remplir une fiole : obtenir une potion de soin.']]},
 obelisk:{name:'Obélisque fissuré',min:5,color:'#d58b83',desc:'La pierre réagit à votre énergie vitale.',choices:[['study','Étudier : dépenser 4 ressources pour gagner de l’expérience.'],['sacrifice','Sacrifier 6 PV pour obtenir un équipement rare.']]},
 survivor:{name:'Voyageur égaré',min:4,color:'#91c6a1',desc:'Un aventurier blessé cherche des provisions.',choices:[['aid','Donner 1 bandage : obtenir 2 consommables si la sacoche le permet.'],['trade','Échanger 2 ressources : obtenir un parchemin de détection.']]},
 forge:{name:'Forge funéraire',min:6,color:'#da9770',desc:'Des braises froides attendent une offrande.',choices:[['forgeGear','Payer 20 or : obtenir un équipement rare ou mieux.'],['forgeWard','Dépenser 5 ressources : obtenir un bouclier de 16 points.']]},
 ossuary:{name:'Ossuaire des pèlerins',min:4,color:'#c3bca4',desc:'Les morts gardent des présents sous leurs linceuls.',choices:[['boneGold','Prendre 12 or.'],['boneAid','Donner 1 bandage : obtenir un parchemin de protection et une potion de concentration.']]},
 mirror:{name:'Miroir du néant',min:9,color:'#ad9ad1',desc:'Un reflet de vous-même propose un échange.',choices:[['mirrorStudy','Sacrifier 5 PV : gagner 15 + étage XP.'],['mirrorFocus','Dépenser 8 or : restaurer jusqu’à 8 ressources.']]},
 caravan:{name:'Caravane perdue',min:5,color:'#c5a46e',desc:'Un coffre de marchandises a survécu à une embuscade.',choices:[['caravanBuy','Payer 12 or : obtenir une potion de soin et une bombe fumigène.'],['caravanTrade','Donner 1 bandage : recevoir 16 or.']]},
 reliquary:{name:'Relique brisée',min:12,color:'#b28cba',desc:'Une relique fendue contient encore un pouvoir instable.',choices:[['relicBlood','Sacrifier 10 PV et 4 ressources : obtenir un équipement épique ou mieux.'],['relicWard','Dépenser 6 ressources : obtenir deux parchemins distincts (protection et détection).']]}
};
const RARE_ENCOUNTERS=[
 {id:'iron',name:'Le Veilleur de fer',affix:'armored',color:'#a7c3d5'},
 {id:'hunger',name:'La Faim écarlate',affix:'vampiric',color:'#db898e'},
 {id:'hunt',name:'Le Chasseur sans nom',affix:'furious',color:'#d5b07c'},
 {id:'mourner',name:'La Veuve des cryptes',affix:'vampiric',color:'#a49ac9',min:7,role:'tracker'},
 {id:'warden',name:'Le Gardien des cendres',affix:'armored',color:'#b98f77',min:10,role:'guardian'},
 {id:'needle',name:'L’Aiguille noire',affix:'furious',color:'#939eab',min:12,role:'archer'}
];
// GAME-010D: optional second sealed chamber, without changing original layout or RNG.
function addDeepSecret(d,decorated,W,H,floor){
 if(floor<8||!decorated.features.some(f=>f.type==='secret'))return false;
 const rnd=explorationRng((d.seed^0x6c8e9cf5^Math.imul(floor,0x85ebca6b))>>>0);
 if(rnd(100)>=45)return false;
 const map=decorated.map,k=(x,y)=>y*W+x,used=new Set([d.start,d.stairs,...d.monsters,...d.loot,...decorated.features].map(p=>k(p.x,p.y)));
 const candidates=[];
 for(let y=2;y<H-4;y++)for(let x=2;x<W-4;x++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const ex=x+1-dx*2,ey=y+1-dy*2,ax=ex-dx,ay=ey-dy;
  if(ax<1||ay<1||ax>=W-1||ay>=H-1||d.map[k(ax,ay)]!==0||map[k(ax,ay)]!==0||used.has(k(ax,ay))||Math.max(Math.abs(ex-d.start.x),Math.abs(ey-d.start.y))<=7)continue;
  let valid=true;for(let yy=y-1;yy<=y+3;yy++)for(let xx=x-1;xx<=x+3;xx++)if(map[k(xx,yy)]!==1||used.has(k(xx,yy)))valid=false;
  if(valid)candidates.push({x,y,ex,ey});
 }
 if(!candidates.length)return false;
 const p=candidates[rnd(candidates.length)];
 for(let y=p.y;y<p.y+3;y++)for(let x=p.x;x<p.x+3;x++)map[k(x,y)]=0;
 decorated.features.push({x:p.ex,y:p.ey,type:'secret',open:false,found:false},{x:p.x+1,y:p.y+1,type:'chest',open:false,found:true,reward:'gear',secret:true});
 return true;
}
/* TECH-012C — Construit un flux pseudo-aléatoire propre à l'exploration, dérivé de la graine de l'étage. */
function explorationRng(seed){
  let s=(seed^0x75e12c4b)>>>0;
  s=Math.imul(s^(s>>>16),0x7feb352d);
  s=Math.imul(s^(s>>>15),0x846ca68b);
  s=(s^(s>>>16))>>>0;
  return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;
    return Math.floor(s/4294967296*n)}
}
/* TECH-012A — Sélectionne les événements disponibles selon la profondeur et cherche des emplacements libres à distance du départ. Utilise une source pseudo-aléatoire dérivée de la graine du donjon. */
function buildExploration(d,decorated,terrain,existing,monsters,floor){
 const rnd=explorationRng(d.seed),used=new Set([d.start,d.stairs,...monsters,...existing,...decorated.features,...terrain].map(p=>p.x+','+p.y));
 const eligible=Object.entries(EXPLORATION_EVENTS).filter(([,e])=>floor>=e.min),candidates=[];
 for(const r of d.rooms)for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++){
   if(decorated.map[y*W+x]===0&&!used.has(x+','+y)&&Math.max(Math.abs(x-d.start.x),Math.abs(y-d.start.y))>5&&[[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>decorated.map[(y+dy)*W+x+dx]===0))candidates.push({x,y});
 }
 const events=[];const count=rnd(100)<65?(floor>=10&&rnd(100)<35?2:1):0;
 for(let i=0;i<count&&candidates.length;i++){const p=candidates.splice(rnd(candidates.length),1)[0];events.push({...p,type:'event',eventId:eligible[rnd(eligible.length)][0],found:true,spent:false})}
 let rare=null;
   if(floor>=3&&rnd(100)<18){const pool=monsters.filter(m=>!m.boss&&!m.elite&&Math.max(Math.abs(m.x-d.start.x),Math.abs(m.y-d.start.y))>8);
   if(pool.length){const m=pool[rnd(pool.length)],variants=RARE_ENCOUNTERS.filter(v=>floor>=(v.min||3)),v=variants[rnd(variants.length)];rare={...m,...(v.role?{role:v.role}:{}),rare:v.id,kind:v.name,color:v.color,elite:true,affix:v.affix,hp:Math.ceil(m.maxHp*1.3)+2,maxHp:Math.ceil(m.maxHp*1.3)+2}}}
 return {events,rare};
}
function eventChoiceAllowed(f,choice){
 if(!f||f.type!=='event'||f.spent||!Object.hasOwn(EXPLORATION_EVENTS,f.eventId)||!features.includes(f)||dist(f,S)>1||!stepOK(f.x,f.y,S.x,S.y)||mob(f.x,f.y))return false;
 if(choice==='skip')return true;
 if(!EXPLORATION_EVENTS[f.eventId].choices.some(c=>c[0]===choice))return false;
 if(choice==='blessing')return S.hp<S.maxHp||S.res<S.maxRes;
 if(choice==='offering')return S.bandages>=1&&S.shield<10;
 if(choice==='drink')return S.hp<S.maxHp;
 if(choice==='bottle')return pouchCount('heal')<POUCH_CAP;
 if(choice==='study')return S.res>=4&&S.level<30;
 if(choice==='sacrifice')return S.hp>6&&S.bag.length<24;
 if(choice==='gear')return S.bag.length<24;
 if(choice==='aid')return S.bandages>=1&&pouchCount('heal')<POUCH_CAP&&pouchCount('focus')<POUCH_CAP;
 if(choice==='trade')return S.res>=2&&pouchCount('insight')<POUCH_CAP;
 if(choice==='forgeGear')return goldBalance()>=20&&S.bag.length<24;
 if(choice==='forgeWard')return S.res>=5&&S.shield<16;
 if(choice==='boneGold')return goldBalance()<GOLD_CAP;
 if(choice==='boneAid')return S.bandages>=1&&pouchCount('ward')<POUCH_CAP&&pouchCount('focus')<POUCH_CAP;
 if(choice==='mirrorStudy')return S.hp>5&&S.level<30;
 if(choice==='mirrorFocus')return goldBalance()>=8&&S.res<S.maxRes;
 if(choice==='caravanBuy')return goldBalance()>=12&&pouchCount('heal')<POUCH_CAP&&pouchCount('smoke')<POUCH_CAP;
 if(choice==='caravanTrade')return S.bandages>=1&&goldBalance()<=GOLD_CAP-16;
 if(choice==='relicBlood')return S.hp>10&&S.res>=4&&S.bag.length<24;
 if(choice==='relicWard')return S.res>=6&&pouchCount('ward')<POUCH_CAP&&pouchCount('insight')<POUCH_CAP;
 return choice==='supplies';
}
function resolveEvent(f,choice){
 if(mode!=='game'||S.dead||!eventChoiceAllowed(f,choice))return false;
 f.spent=true;f.choice=choice;selected=null;hide();let msg=EXPLORATION_EVENTS[f.eventId].name;
 if(choice==='blessing'){S.hp=Math.min(S.maxHp,S.hp+10);S.res=Math.min(S.maxRes,S.res+4)}
 else if(choice==='offering'){S.bandages--;S.shield=10}
 else if(choice==='supplies')S.bandages+=2;
 else if(choice==='gear')S.bag.push(createGear(++S.serial,S.floor,2));
 else if(choice==='drink')S.hp=Math.min(S.maxHp,S.hp+8);
 else if(choice==='bottle')addConsumable('heal');
 else if(choice==='study'){S.res-=4;gainXP(8+Math.min(30,S.floor))}
 else if(choice==='sacrifice'){S.hp-=6;S.bag.push(createGear(++S.serial,S.floor,3))}
 else if(choice==='aid'){S.bandages--;addConsumable('heal');addConsumable('focus')}
 else if(choice==='trade'){S.res-=2;addConsumable('insight')}
 else if(choice==='forgeGear'){S.gold=goldBalance()-20;S.bag.push(createGear(++S.serial,S.floor,3))}
 else if(choice==='forgeWard'){S.res-=5;S.shield=16}
 else if(choice==='boneGold')S.gold=Math.min(GOLD_CAP,goldBalance()+12);
 else if(choice==='boneAid'){S.bandages--;addConsumable('ward');addConsumable('focus')}
 else if(choice==='mirrorStudy'){S.hp-=5;gainXP(15+Math.min(30,S.floor))}
 else if(choice==='mirrorFocus'){S.gold=goldBalance()-8;S.res=Math.min(S.maxRes,S.res+8)}
 else if(choice==='caravanBuy'){S.gold=goldBalance()-12;addConsumable('heal');addConsumable('smoke')}
 else if(choice==='caravanTrade'){S.bandages--;S.gold=goldBalance()+16}
 else if(choice==='relicBlood'){S.hp-=10;S.res-=4;S.bag.push(createGear(++S.serial,S.floor,4))}
 else if(choice==='relicWard'){S.res-=6;addConsumable('ward');addConsumable('insight')}
 say(msg+(choice==='skip'?' : laissé de côté.':' : événement résolu.'));finish();return true;
}
function explorationMenu(f){
 const e=EXPLORATION_EVENTS[f.eventId];if(!e||f.spent)return;
 selected=null;show('<h1>'+e.name+'</h1><p>'+e.desc+'</p><p>Un choix définitif coûte un tour.</p>'+[...e.choices,['skip','Passer définitivement']].map(([id,label])=>'<button class="wide" data-event-choice="'+id+'" '+(eventChoiceAllowed(f,id)?'':'disabled')+'>'+label+'</button>').join('')+'<button class="wide" id="eventBack">Revenir plus tard</button>');
 panel.querySelectorAll('[data-event-choice]').forEach(b=>b.onclick=()=>resolveEvent(f,b.dataset.eventChoice));document.getElementById('eventBack').onclick=hide;
}