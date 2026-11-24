// GAME-006F: local hall of fame; independent from the active run save.
const HISTORY_KEY='rogue-android-history-v1',FINAL_FLOOR=30,HISTORY_LIMIT=50;
/* TECH-012C — Normalise les compteurs de l'historique en entiers positifs ou nuls, bornés à un milliard. */
function historyNumber(v){return Number.isFinite(v)?Math.max(0,Math.min(1000000000,Math.floor(v))):0}
/* TECH-012C — Crée un historique vide au format version 1, avec un compteur de victoires par classe. */
function emptyHistory(){
  return {version:1,runs:[],total:0,wins:0,deaths:0,abandoned:0,bestScore:0,bestFloor:0,bestKills:0,fastestWin:null,classWins:{warrior:0,rogue:0,ranger:0,mage:0},challenges:[]}
}
/* TECH-012C — Reconstruit un historique exploitable depuis le stockage local ; les données illisibles ne bloquent pas le jeu. */
function readHistory(){
 const h=emptyHistory();
 try{
   const raw=JSON.parse(localStorage.getItem(HISTORY_KEY));if(!raw||raw.version!==1)return h;
   for(const k of ['total','wins','deaths','abandoned','bestScore','bestFloor','bestKills'])h[k]=historyNumber(raw[k]);
   h.fastestWin=Number.isFinite(raw.fastestWin)&&raw.fastestWin>=0?historyNumber(raw.fastestWin):null;
   for(const k of Object.keys(h.classWins))h.classWins[k]=historyNumber(raw.classWins?.[k]);
   h.challenges=Array.isArray(raw.challenges)?raw.challenges.filter(x=>['first-win','swift','collector','all-classes'].includes(x)):[];
   h.runs=Array.isArray(raw.runs)?raw.runs.filter(r=>r&&Object.hasOwn(CLASSES,r.classId)
     &&['victory','death','abandoned'].includes(r.outcome))
     .slice(0,HISTORY_LIMIT)
     .map(r=>({classId:r.classId,outcome:r.outcome,floor:historyNumber(r.floor),level:historyNumber(r.level),kills:historyNumber(r.kills),turns:historyNumber(r.turns),gold:historyNumber(r.gold),relics:historyNumber(r.relics),score:historyNumber(r.score),spec:['offense','defense'].includes(r.spec)?r.spec:null})):[];
 }catch(e){}
 return h;
}
/* TECH-012C — Calcule le score final et compte les reliques de boss distinctes dans le sac et l'équipement. */
function runSummary(outcome){
 const floor=historyNumber(S.floor),level=historyNumber(S.level),kills=historyNumber(S.kills),
   turns=historyNumber(S.turn),gold=goldBalance(),
   relics=new Set([...S.bag,...Object.values(S.equip)].filter(it=>it?.bossRelic&&it.uniqueId).map(it=>it.uniqueId)).size;
 const score=Math.min(1000000000,floor*100+level*50+kills*10+relics*100+gold+(outcome==='victory'?2000:0));
 return {classId:S.classId,spec:S.spec||null,outcome,floor,level,kills,turns,gold,relics,score};
}
/* TECH-012A — Ajoute le bilan au journal des parties, limite la liste récente et actualise les statistiques cumulées et les défis débloqués. */
function recordRun(r){
 const h=readHistory();
 h.runs.unshift(r);
 h.runs=h.runs.slice(0,HISTORY_LIMIT);
 h.total++;
 if(r.outcome==='victory'){h.wins++;h.classWins[r.classId]++;h.fastestWin=h.fastestWin===null?r.turns:Math.min(h.fastestWin,r.turns)}
 else if(r.outcome==='death')h.deaths++;else h.abandoned++;
 h.bestScore=Math.max(h.bestScore,r.score);h.bestFloor=Math.max(h.bestFloor,r.floor);h.bestKills=Math.max(h.bestKills,r.kills);
 const add=id=>{if(!h.challenges.includes(id))h.challenges.push(id)};
 if(h.wins)add('first-win');if(r.outcome==='victory'&&r.turns<=2000)add('swift');if(r.relics>=3)add('collector');if(Object.values(h.classWins).every(x=>x>0))add('all-classes');
 try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h));return true}catch(e){return false}
}
function outcomeLabel(outcome){return outcome==='victory'?'Victoire':outcome==='death'?'Mort permanente':'Abandon'}
function summaryMarkup(r){
  return '<p>'+CLASSES[r.classId].name+' · Niveau '+r.level+' · Étage '+r.floor+'</p><p><b>Score : '+r.score+'</b> · '+r.kills+' ennemis vaincus · '+r.turns+' tours<br>Or : '+r.gold+' · Reliques distinctes : '+r.relics+'</p>'
}
/* TECH-012C — Affiche les records, défis et parties récentes ; le rappel back détermine l'écran de retour. */
function historyMenu(back=startMenu){
 const h=readHistory(),challenges=[['first-win','Première victoire','Terminer le donjon'],['swift','Course contre le temps','Gagner en 2 000 tours maximum'],['collector','Collectionneur','Terminer avec 3 reliques de boss distinctes'],['all-classes','Maître des quatre classes','Gagner avec chaque classe']];
 show('<h1>Panthéon des aventuriers</h1><p>Parties : '+h.total+' · Victoires : '+h.wins+' · Morts : '+h.deaths+' · Abandons : '+h.abandoned+'</p><p>Meilleur score : '+h.bestScore+' · Étage record : '+h.bestFloor+' · Ennemis record : '+h.bestKills+'<br>Victoire la plus rapide : '+(h.fastestWin===null?'—':h.fastestWin+' tours')+'</p><h2>Défis</h2>'+challenges.map(([id,name,desc])=>'<p><b>'+(h.challenges.includes(id)?'✓ ':'○ ')+name+'</b><br><small>'+desc+'</small></p>').join('')+'<h2>Victoires par classe</h2>'+Object.keys(CLASSES).map(k=>'<p>'+CLASSES[k].name+' : '+h.classWins[k]+'</p>').join('')+'<h2>Dernières parties (50 max.)</h2>'+(h.runs.map(r=>'<h3>'+outcomeLabel(r.outcome)+'</h3>'+summaryMarkup(r)).join('')||'<p>Aucune partie terminée.</p>')+'<button class="wide" id="historyBack">Retour</button>');
 document.getElementById('historyBack').onclick=back;
}
/* TECH-012C — Centralise la fin de partie et empêche de la comptabiliser deux fois. La victoire exige la sortie finale accessible, le joueur vivant et les boss vaincus. */
function endRun(outcome){
 if(!S||S.ended||!['victory','death','abandoned'].includes(outcome))return false;
 if(outcome==='victory'&&(S.dead||S.hp<=0||S.floor<FINAL_FLOOR||S.x!==stairs.x||S.y!==stairs.y||monsters.some(m=>m.boss&&m.hp>0)||loot.some(l=>l.x===stairs.x&&l.y===stairs.y)))return false;
 const r=runSummary(outcome);
 S.ended=outcome;
 if(outcome==='death')S.dead=true;
 mode=outcome==='death'?'dead':'ended';
 selected=null;
 const saved=recordRun(r);try{localStorage.removeItem(KEY)}catch(e){}
 const result=()=>{show('<h1>'+outcomeLabel(outcome)+'</h1>'+(outcome==='victory'?'<p>Le dernier gardien est tombé. Tu quittes le donjon victorieux.</p>':'')+summaryMarkup(r)+'<p>'+(saved?'Bilan enregistré sur cet appareil.':'Historique indisponible.')+'</p><button class="wide" id="endHistory">Panthéon et records</button><button class="wide" id="again">Nouvelle partie</button>');document.getElementById('endHistory').onclick=()=>historyMenu(result);document.getElementById('again').onclick=startMenu};
 result();return true;
}

/* GAME-008E3: explicit, portable local transfer; no automatic checkpoints. */
/* TECH-012C — Limite la taille du texte importé à 524 288 unités de chaîne et identifie le format de transfert versionné. */
const TRANSFER_LIMIT=524288,TRANSFER_FORMAT='cryptgrave-transfer-v1';
const transferObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const transferInt=(v,min=0,max=1000000000)=>Number.isInteger(v)&&v>=min&&v<=max;
function transferAssert(ok){if(!ok)throw Error('Sauvegarde incompatible ou invalide.')}
/* TECH-012C — Contrôle récursivement les types, la profondeur, le nombre de valeurs, les longueurs et les noms de propriétés avant la validation métier. */
function transferTree(v,depth=0,budget={n:0}){
 transferAssert(depth<=16&&++budget.n<=40000);
 if(v===null||typeof v==='boolean')return;
 if(typeof v==='number'){transferAssert(Number.isFinite(v)&&Math.abs(v)<=4294967296);return}
 if(typeof v==='string'){transferAssert(v.length<=256&&!/[<>&"`\\\u0000-\u001f]/.test(v));return}
 if(Array.isArray(v)){transferAssert(v.length<=4096);for(const x of v)transferTree(x,depth+1,budget);return}
 transferAssert(transferObject(v));
 const keys=Object.keys(v);
 transferAssert(keys.length<=128);
 for(const k of keys){transferAssert(/^[a-zA-Z0-9_-]{1,80}$/.test(k)&&!['__proto__','prototype','constructor'].includes(k));transferTree(v[k],depth+1,budget)}
}
/* TECH-012C — Vérifie qu'une position possède des coordonnées entières dans les limites de la grille. */
function transferPoint(p){return transferObject(p)&&transferInt(p.x,0,W-1)&&transferInt(p.y,0,H-1)}
/* TECH-012C — Contrôle les champs de base d'un équipement importé et ses statistiques numériques éventuelles. */
function transferGear(it){
 transferAssert(transferObject(it)&&transferInt(it.id,1)&&['weapon','armor','helmet','boots','ring'].includes(it.slot)&&typeof it.name==='string');
 for(const k of ['atk','def','crit','regen','dodge','itemLevel','rarity'])if(it[k]!==undefined)transferAssert(transferInt(it[k],0,1000000));
}
/* TECH-012C — Contrôle la structure d'une partie importée : personnage vivant, progression, inventaire, dimensions, positions et entités. */
function validateTransferRun(d){
 if(d===null)return;
 transferAssert(transferObject(d)&&transferObject(d.S));const s=d.S;
 transferAssert(Object.hasOwn(CLASSES,s.classId)&&s.dead===false&&!s.ended&&transferPoint(s)&&transferPoint(d.stairs));
 transferAssert(transferInt(s.floor,1,30)&&transferInt(s.level,1,30)&&transferInt(s.hp,1)&&transferInt(s.maxHp,1)&&s.hp<=s.maxHp&&transferInt(s.res)&&transferInt(s.maxRes,1)&&s.res<=s.maxRes);
 for(const k of ['turn','xp','points','bandages','atk','armor','guard','boost','kills','serial','ap'])transferAssert(transferInt(s[k]));
 for(const [k,n,min,max] of [['attrs',6,0,100000],['cool',5,0,100000],['ranks',5,1,100000],['bar',3,0,4]])transferAssert(Array.isArray(s[k])&&s[k].length===n&&s[k].every(v=>transferInt(v,min,max)));
 transferAssert(new Set(s.bar).size===3&&s.bar.every(i=>i<3||s.activeTalents?.[i])&&transferObject(s.nodes)&&transferObject(s.activeTalents)&&[null,'offense','defense'].includes(s.spec));
 transferAssert(Array.isArray(s.bag)&&s.bag.length<=24&&transferObject(s.equip));for(const it of s.bag)transferGear(it);
 for(const slot of ['weapon','armor','helmet','boots','ring']){const it=s.equip[slot];if(it!==null){transferGear(it);transferAssert(it.slot===slot)}}
 for(const k of ['map','seen'])transferAssert(Array.isArray(d[k])&&d[k].length===W*H&&d[k].every(v=>v===0||v===1));
 transferAssert(d.map[s.y*W+s.x]===0&&d.map[d.stairs.y*W+d.stairs.x]===0);
 for(const k of ['monsters','loot','features','terrain'])transferAssert(Array.isArray(d[k])&&d[k].length<=W*H&&d[k].every(transferPoint));
 for(const m of d.monsters)transferAssert(transferInt(m.hp,1)&&transferInt(m.maxHp,1)&&m.hp<=m.maxHp&&transferInt(m.atk)&&typeof m.kind==='string'&&typeof m.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(m.color)&&typeof m.role==='string');
 for(const l of d.loot){transferAssert(['gear','bandage','consumable'].includes(l.kind));if(l.kind==='gear')transferGear(l.item)}
 for(const p of [...d.features,...d.terrain])transferAssert(typeof p.type==='string');
 if(s.dungeon!==undefined)transferAssert(transferObject(s.dungeon)&&Object.hasOwn(BIOMES,s.dungeon.biome));
}
/* TECH-012C — Contrôle le format de l'historique importé, les compteurs, les classes, les résultats et les défis. */
function validateTransferHistory(h){
 if(h===null)return;
 transferAssert(transferObject(h)&&h.version===1&&Array.isArray(h.runs)&&h.runs.length<=HISTORY_LIMIT&&transferObject(h.classWins)&&Array.isArray(h.challenges)&&h.challenges.length<=4);
 for(const k of ['total','wins','deaths','abandoned','bestScore','bestFloor','bestKills'])transferAssert(transferInt(h[k]));
 transferAssert(h.fastestWin===null||transferInt(h.fastestWin));for(const k of Object.keys(CLASSES))transferAssert(transferInt(h.classWins[k]));
 transferAssert(h.challenges.every(k=>['first-win','swift','collector','all-classes'].includes(k)));
 for(const r of h.runs){transferAssert(transferObject(r)&&Object.hasOwn(CLASSES,r.classId)&&['victory','death','abandoned'].includes(r.outcome)&&[null,'offense','defense'].includes(r.spec));for(const k of ['floor','level','kills','turns','gold','relics','score'])transferAssert(transferInt(r[k]))}
}
/* TECH-012A — Valide le format, la structure et les préférences d'un paquet de transfert avant son utilisation. Une donnée invalide provoque une erreur plutôt qu'une restauration partielle. */
function parseTransfer(text){
 transferAssert(typeof text==='string'&&text.length>0&&text.length<=TRANSFER_LIMIT);
 const b=JSON.parse(text);
 transferTree(b);
 transferAssert(transferObject(b)&&b.format===TRANSFER_FORMAT&&Object.keys(b).length===4);
 validateTransferRun(b.run);
 validateTransferHistory(b.history);
 transferAssert(transferObject(b.prefs)&&Object.keys(b.prefs).length===2&&[75,100,125,150,200].includes(b.prefs.zoom)&&[85,100,115].includes(b.prefs.pad));return b;
}
/* TECH-012C — Assemble la partie active, l'historique et les options dans un paquet JSON validé avant export. */
function exportTransfer(){
 const raw=localStorage.getItem(KEY),h=localStorage.getItem(HISTORY_KEY);
 const data=JSON.stringify({format:TRANSFER_FORMAT,run:raw===null?null:JSON.parse(raw),history:h===null?null:readHistory(),prefs:{zoom:prefs.zoom,pad:prefs.pad}});
 parseTransfer(data);
 return data;
}
/* TECH-012C — Autorise l'import uniquement au menu principal. Valide le paquet avant l'écriture et tente de restaurer les anciennes données si le stockage échoue. */
function importTransfer(text){
 if(mode!=='start')throw Error('Retourne au menu principal.');
 const b=parseTransfer(text),entries=[[KEY,b.run],[HISTORY_KEY,b.history],[PREF,b.prefs]],old=entries.map(([k])=>[k,localStorage.getItem(k)]);
 try{for(const [k,v] of entries){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}}
 catch(e){let restored=true;
   for(const [k,v] of old)try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(err){restored=false
   }throw Error(restored?'Import impossible : données précédentes conservées.':'Stockage indisponible : vérifie tes données avant de continuer.')}
 // Do not let the previous in-memory run overwrite the imported state on visibilitychange.
 S=null;
 selected=null;
 prefs={...b.prefs};
 return b;
}
/* TECH-012C — Permet de copier ou coller un paquet de transfert ; l'import demande confirmation avant le remplacement des données locales. */
function transferMenu(){
 if(mode!=='start')return;
 show('<h1>Transfert de sauvegarde</h1><p>Copie le texte dans un fichier privé, puis colle-le sur le nouvel appareil. Un import remplace la partie, les records et les options. Un ancien export peut revenir à un état antérieur : à réserver aux migrations, pas aux reprises après une mort.</p><textarea id="transferData" aria-label="Texte de transfert" spellcheck="false" style="width:100%;height:140px;resize:vertical;background:#101318;color:#eee5d4;border:1px solid #514534"></textarea><button class="wide" id="transferExport">Exporter et sélectionner</button><button class="wide" id="transferImport">Importer le texte</button><p id="transferStatus" aria-live="polite"></p><button class="wide" id="transferBack">Retour</button>');
 const field=document.getElementById('transferData'),status=document.getElementById('transferStatus');
 document.getElementById('transferExport').onclick=()=>{try{field.value=exportTransfer();
   field.focus();
   field.select();
   status.textContent='Texte sélectionné. Utilise Copier dans le menu de sélection Android.'}catch(e){status.textContent='Export impossible : sauvegarde incompatible ou stockage indisponible.'}};
 document.getElementById('transferImport').onclick=()=>{try{const b=parseTransfer(field.value);
   const label=b.run?CLASSES[b.run.S.classId].name+' · étage '+b.run.S.floor+' · tour '+b.run.S.turn:'Aucune partie active';
   if(!confirm('Importer '+label+' ? La partie, le Panthéon et les options actuels seront remplacés.'))return;
   importTransfer(field.value);
   applyPrefs();
   startMenu()}catch(e){status.textContent=e.message||'Import impossible.'}};
 document.getElementById('transferBack').onclick=startMenu;
}

