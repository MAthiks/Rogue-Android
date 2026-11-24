// GAME-006E: special room sites and optional upgrades to existing hidden chambers.
const SPECIAL_ROOMS={
 sanctuary:{name:'Sanctuaire de repos',color:'#82c7a1',min:4,desc:'Un autel intact offre un bref répit.',choices:[['rest','Récupérer jusqu’à 14 PV et 6 ressources.'],['protect','Obtenir un bouclier de 12 points.']]},
 library:{name:'Bibliothèque ancienne',color:'#aab4e7',min:4,desc:'Des manuscrits ont survécu à la ruine.',choices:[['study','Étudier : gagner de l’expérience.'],['scroll','Prendre un parchemin de détection et un de protection.']]},
 vault:{name:'Salle du trésor',color:'#e5bc6a',min:5,desc:'Un coffre scellé renferme les richesses de cet étage.',choices:[['gold','Prendre de l’or.'],['gear','Prendre un équipement rare ou mieux.']]},
 cursed:{name:'Chambre maudite',color:'#c485ae',min:7,desc:'Le sceau exige un prix en sang, mais il peut être dissipé.',choices:[['blood','Sacrifier 8 PV : obtenir un équipement épique ou mieux.'],['purify','Dépenser 4 ressources : obtenir un bouclier de 10 points.']]},
 hidden:{name:'Reliquaire secret',color:'#8cc8d7',min:4,desc:'Une cache oubliée, dissimulée derrière un passage secret.',choices:[['relic','Prendre un équipement rare ou mieux.'],['supplies','Prendre 2 bandages et une potion de soin.']]},
 shrineTrial:{name:'Sanctuaire du serment',color:'#b9b6dc',min:8,desc:'Deux serments s’offrent à vous. L’un soigne, l’autre protège.',choices:[['oathHeal','Offrir 2 bandages : restaurer jusqu’à 24 PV et 8 ressources.'],['oathWard','Offrir 15 or : obtenir un bouclier de 20 points.']]},
 hiddenArchive:{name:'Archives scellées',color:'#a7b4df',min:8,secret:true,desc:'Derrière les murs, les dernières chroniques du royaume.',choices:[['archiveStudy','Gagner 20 + 2 × étage XP.'],['archiveScroll','Prendre un parchemin de détection et un de protection.']]},
 hiddenTreasury:{name:'Trésor des disparus',color:'#d5b780',min:12,secret:true,desc:'Les bijoux des disparus reposent dans une chambre oubliée.',choices:[['treasuryGold','Prendre 25 + 2 × étage or.'],['treasuryGear','Prendre un équipement épique ou mieux.']]}
};
/* TECH-012C — Génère des salles spéciales dans les étages admissibles à partir d'un flux pseudo-aléatoire local ; exclut les positions déjà occupées. */
function buildSpecialRooms(d,decorated,terrain,loot,all,floor,W,H){
 if(floor<4||floor>30)return [];
 let n=(d.seed^Math.imul(floor,0x9e3779b1)^0xb2c137ad)>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);n=(n^(n>>>16))>>>0;
 const rnd=k=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return Math.floor(n/4294967296*k)};
 const result=[],used=new Set([d.start,d.stairs,...all,...loot,...decorated.features,...terrain].map(p=>p.y*W+p.x));
 const contains=(r,p)=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h;
 const candidates=[];
 for(const r of d.rooms){
   if(contains(r,d.start)||contains(r,d.stairs))continue;
   const cells=[];
   for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++){
     if(x<2||y<2||x>=W-2||y>=H-2||used.has(y*W+x)||Math.max(Math.abs(x-d.start.x),Math.abs(y-d.start.y))<=6)continue;
     let open=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(decorated.map[(y+dy)*W+x+dx]!==0)open=false;
     if(open)cells.push({x,y});
   }
   if(cells.length)candidates.push({r,cells});
 }
 const types=Object.keys(SPECIAL_ROOMS).filter(k=>k!=='hidden'&&!SPECIAL_ROOMS[k].secret&&floor>=SPECIAL_ROOMS[k].min);
 if(candidates.length&&rnd(100)<80){
   const {r,cells}=candidates[rnd(candidates.length)],p=cells[rnd(cells.length)];
   result.push({...p,type:'specialRoom',roomId:types[rnd(types.length)],found:true,spent:false,room:{x:r.x,y:r.y,w:r.w,h:r.h}});
 }
 const secretTypes=['hidden',...Object.keys(SPECIAL_ROOMS).filter(k=>SPECIAL_ROOMS[k].secret&&floor>=SPECIAL_ROOMS[k].min)];
 for(const secret of decorated.features.filter(f=>f.type==='chest'&&f.secret&&!f.open)){
  if(rnd(100)<65)result.push({x:secret.x,y:secret.y,type:'specialRoom',roomId:secretTypes[rnd(secretTypes.length)],found:true,spent:false,secret:true,room:{x:secret.x-1,y:secret.y-1,w:3,h:3}});
 }
 return result;
}
function specialRoomAllowed(f,choice){
 if(mode!=='game'||!S||S.dead||f?.type!=='specialRoom'||f.spent||!features.includes(f)||!Object.hasOwn(SPECIAL_ROOMS,f.roomId)||dist(f,S)!==1||!stepOK(f.x,f.y,S.x,S.y)||mob(f.x,f.y))return false;
 if(!SPECIAL_ROOMS[f.roomId].choices.some(c=>c[0]===choice))return false;
 if(choice==='rest')return S.hp<S.maxHp||S.res<S.maxRes;
 if(choice==='protect')return S.shield<12;
 if(choice==='study')return S.level<30;
 if(choice==='scroll')return pouchCount('insight')<POUCH_CAP&&pouchCount('ward')<POUCH_CAP;
 if(choice==='gold')return goldBalance()<GOLD_CAP;
 if(choice==='gear'||choice==='relic')return S.bag.length<24;
 if(choice==='blood')return S.hp>8&&S.bag.length<24;
 if(choice==='purify')return S.res>=4&&S.shield<10;
 if(choice==='supplies')return pouchCount('heal')<POUCH_CAP;
 if(choice==='oathHeal')return S.bandages>=2&&(S.hp<S.maxHp||S.res<S.maxRes);
 if(choice==='oathWard')return goldBalance()>=15&&S.shield<20;
 if(choice==='archiveStudy')return S.level<30;
 if(choice==='archiveScroll')return pouchCount('insight')<POUCH_CAP&&pouchCount('ward')<POUCH_CAP;
 if(choice==='treasuryGold')return goldBalance()<GOLD_CAP;
 if(choice==='treasuryGear')return S.bag.length<24;
 return false;
}
/* TECH-012C — Valide le choix, marque la salle comme utilisée et applique sa récompense. La salle conserve le choix effectué. */
function resolveSpecialRoom(f,choice){
 if(!specialRoomAllowed(f,choice))return false;
 const floor=Math.max(1,Math.min(30,S.floor));
 f.spent=true;f.choice=choice;selected=null;hide();
 if(choice==='rest'){S.hp=Math.min(S.maxHp,S.hp+14);S.res=Math.min(S.maxRes,S.res+6)}
 else if(choice==='protect')S.shield=12;
 else if(choice==='study')gainXP(12+floor*2);
 else if(choice==='scroll'){addConsumable('insight');addConsumable('ward')}
 else if(choice==='gold')S.gold=Math.min(GOLD_CAP,goldBalance()+15+floor*2);
 else if(choice==='gear'||choice==='relic')S.bag.push(createGear(++S.serial,floor,3));
 else if(choice==='blood'){S.hp-=8;S.bag.push(createGear(++S.serial,floor,4))}
 else if(choice==='purify'){S.res-=4;S.shield=10}
 else if(choice==='supplies'){S.bandages+=2;addConsumable('heal')}
 else if(choice==='oathHeal'){S.bandages-=2;S.hp=Math.min(S.maxHp,S.hp+24);S.res=Math.min(S.maxRes,S.res+8)}
 else if(choice==='oathWard'){S.gold=goldBalance()-15;S.shield=20}
 else if(choice==='archiveStudy')gainXP(20+floor*2);
 else if(choice==='archiveScroll'){addConsumable('insight');addConsumable('ward')}
 else if(choice==='treasuryGold')S.gold=Math.min(GOLD_CAP,goldBalance()+25+floor*2);
 else if(choice==='treasuryGear')S.bag.push(createGear(++S.serial,floor,4));
 say(SPECIAL_ROOMS[f.roomId].name+' : choix résolu.');finish();return true;
}
function specialRoomMenu(f){
 const r=SPECIAL_ROOMS[f.roomId];if(!r||f.spent)return;
 selected=null;show('<h1>'+r.name+'</h1><p>'+r.desc+'</p><p>Une seule récompense. Le choix coûte un tour : les ennemis peuvent agir.</p>'+r.choices.map(([id,label])=>'<button class="wide" data-room-choice="'+id+'" '+(specialRoomAllowed(f,id)?'':'disabled')+'>'+label+'</button>').join('')+'<button class="wide" id="roomBack">Revenir plus tard</button>');
 panel.querySelectorAll('[data-room-choice]').forEach(b=>b.onclick=()=>resolveSpecialRoom(f,b.dataset.roomChoice));document.getElementById('roomBack').onclick=hide;
}
function drawSpecialRoom(f,px,py,visible){
 ctx.fillStyle=f.spent||!visible?'#666b70':SPECIAL_ROOMS[f.roomId]?.color||'#d2c5a1';
 ctx.fillRect(px+3,py+10,10,3);ctx.fillRect(px+5,py+5,6,5);
 if(f.roomId==='library'){ctx.fillRect(px+2,py+3,12,2);ctx.fillRect(px+2,py+3,2,7);ctx.fillRect(px+12,py+3,2,7)}
 else if(f.roomId==='vault'||f.roomId==='hidden'){ctx.fillRect(px+3,py+5,10,4)}
 else if(f.roomId==='cursed'){ctx.fillRect(px+2,py+3,2,5);ctx.fillRect(px+12,py+3,2,5)}
 else{ctx.fillRect(px+7,py+2,2,5);ctx.fillRect(px+5,py+4,6,2)}
 if(!f.spent&&visible){ctx.fillStyle='#f7e7bc';ctx.fillRect(px+7,py+7,2,2)}
}