const AFFIXES=[
  {id:'force',name:'de force',stat:'atk',slots:['weapon','ring'],value:g=>1+Math.floor(g/3)},
  {id:'garde',name:'de garde',stat:'def',slots:['armor','helmet','boots','ring'],value:g=>1+Math.floor(g/4)},
  {id:'precision',name:'de précision',stat:'crit',slots:Object.keys(GEAR_SLOTS),value:g=>2+g},
  {id:'elan',name:'d’élan',stat:'dodge',slots:['boots','helmet','ring','armor'],value:g=>2+Math.floor(g/2)},
  {id:'source',name:'de source',stat:'regen',slots:['ring','weapon','helmet'],value:()=>1,min:4}
];
const GEAR_SETS={
  bastion:{name:'Bastion de fer',pieces:{weapon:'Brise-rempart',armor:'Cuirasse du Bastion',helmet:'Heaume du Bastion'},two:{def:1},three:{atk:1,def:1}},
  ombre:{name:'Voile des ombres',pieces:{weapon:'Crochet nocturne',boots:'Pas de brume',ring:'Sceau nocturne'},two:{dodge:3},three:{crit:5}},
  astral:{name:'Conclave astral',pieces:{ring:'Orbite d’argent',helmet:'Diadème astral',armor:'Manteau astral'},two:{regen:1},three:{atk:2}}
};
const UNIQUES=[
  {key:'aube',slot:'weapon',name:'Dernière Aube',stats:{atk:2,crit:4}},
  {key:'sentinelle',slot:'armor',name:'Peau de la Sentinelle',stats:{def:2}},
  {key:'echo',slot:'ring',name:'Écho du vide',stats:{regen:1,crit:4}},
  {key:'oracle',slot:'helmet',name:'Regard de l’Oracle',stats:{crit:5,def:1}},
  {key:'vent',slot:'boots',name:'Marche du Vent',stats:{dodge:5,def:1}}
];
/* TECH-012C — Compte uniquement les pièces d'ensemble dont l'identifiant, l'emplacement et le nom correspondent au catalogue. */
function setCount(equip,key){
  const set=GEAR_SETS[key];
  return set?Object.entries(set.pieces).filter(([slot,name])=>equip[slot]?.setId===key&&equip[slot]?.slot===slot&&equip[slot]?.name===name).length:0
}
/* TECH-012C — Cumule les bonus de chaque ensemble équipé aux seuils de deux et trois pièces. */
function setBonus(equip,k){
  return Object.keys(GEAR_SETS).reduce((n,key)=>{const count=setCount(equip,key),set=GEAR_SETS[key];return n+(count>=2?(set.two[k]||0):0)+(count>=3?(set.three[k]||0):0)},0)
}
/* TECH-012C — Additionne les propriétés des objets équipés et les bonus d'ensemble pour la statistique demandée. */
function bonus(k){return Object.values(S.equip).reduce((n,i)=>n+(i?.[k]||0),0)+setBonus(S.equip,k)}
/* TECH-012C — Normalise la rareté des objets, y compris les anciens objets dépourvus de métadonnée de rareté. */
function rarityOf(it){
  if(Number.isInteger(it.rarity)&&it.rarity>=1&&it.rarity<=5)return it.rarity;
  if(it.bossRelic)return 5;
  return it.name?.startsWith('Épique')?4:it.name?.startsWith('Rare')?3:1
}
function rollRarity(floor,roll,minimum=1){
  const depth=Math.max(1,Math.min(30,floor)),shift=Math.floor((depth-1)/5);
  const tier=roll<1+shift?5:roll<5+2*shift?4:roll<20+4*shift?3:roll<45+5*shift?2:1;
  return Math.max(minimum,tier);
}
/* TECH-012C — Génère un équipement selon la profondeur, le niveau de rareté minimal et le générateur fourni. L'identifiant est transmis par l'appelant. */
function createGear(id,floor,minimum=1,rng=rand,forcedRarity=null){
  /* TECH-012C — La profondeur est bornée de 1 à 30 ; le grade augmente tous les huit étages. */
  const depth=Math.max(1,Math.min(30,floor)),grade=1+Math.floor((depth-1)/8);
  const slots=Object.keys(GEAR_SLOTS),slot=slots[rng(slots.length)];
  const rarity=forcedRarity??rollRarity(depth,rng(100),minimum);
  const it={id,slot,name:'',rarity,itemLevel:depth,grade,
    atk:slot==='weapon'?grade:slot==='ring'?Math.ceil(grade/2):0,
    def:slot==='armor'?grade:slot==='helmet'||slot==='boots'?Math.ceil(grade/2):0,
    crit:0,regen:0,dodge:0,affixes:[]};
  const base=GEAR_BASES[slot][rng(GEAR_BASES[slot].length)];
  it.name=RARITIES[rarity-1].name+' · '+base;
  if(slot==='weapon')it.family=WEAPON_BASE_IDS[base];
  /* TECH-012C — Un objet légendaire peut recevoir une pièce d'ensemble compatible ou un objet unique du même emplacement. */
  if(rarity===5){
    const sets=Object.entries(GEAR_SETS).filter(([,set])=>set.pieces[slot]);
    if(sets.length&&rng(2)===0){const [key,set]=sets[rng(sets.length)];it.setId=key;it.name=set.pieces[slot]}
    else{const u=UNIQUES.find(x=>x.slot===slot);it.uniqueId=u.key;it.name=u.name;for(const [k,v] of Object.entries(u.stats))it[k]+=v}
  }
  if(slot==='weapon'&&rarity===5)it.family=it.setId==='bastion'?'mace':it.setId==='ombre'?'dagger':it.uniqueId==='aube'?'blade':it.family;
  // Preserve GAME-004 elite reward: rare, positive crit, no regen.
  const count=rarity-1;
  let pool=AFFIXES.filter(a=>a.slots.includes(slot)&&rarity>=(a.min||2));
  if(rarity===3){
    const a=pool.find(a=>a.id==='precision');
    const value=a.value(grade);
    it.crit+=value;
    it.affixes.push({id:a.id,name:a.name,stat:a.stat,value});
    pool=pool.filter(x=>x!==a)
  }
  /* TECH-012C — Les affixes sont tirés sans remise dans une liste filtrée par emplacement et rareté. */
  while(it.affixes.length<count&&pool.length){
    const a=pool.splice(rng(pool.length),1)[0],value=a.value(grade);
    it[a.stat]+=value;it.affixes.push({id:a.id,name:a.name,stat:a.stat,value});
  }
  return it;
}
function item(forcedTier){return createGear(++S.serial,S.floor,1,rand,forcedTier===2?3:null)}
function gearStats(it){
  return [['atk','ATQ'],['def','DEF'],['crit','CRIT'],['regen','REG'],['dodge','ESQ']].filter(([k])=>it[k]>0).map(([k,label])=>label+' +'+it[k]+(['crit','dodge'].includes(k)?'%':'')).join(' · ')||'Aucun bonus'
}
/* TECH-012C — Échappe les caractères spéciaux avant insertion d'un nom d'objet dans du HTML. */
function escapeGear(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function gearLabel(it){
  const rarity=RARITIES[rarityOf(it)-1],set=GEAR_SETS[it.setId];
  return objectIcon(...lootArt({kind:'gear',item:it}))+'<span style="color:'+rarity.color+'">'+escapeGear(it.name)+'</span><small class="gear-detail">'+rarity.name+(it.itemLevel?' · Niv. objet '+it.itemLevel:'')+' · '+gearStats(it)+(weaponFamily(it)?' · '+WEAPONS[weaponFamily(it)].desc:'')+(set?' · Ensemble '+set.name+' ('+setCount(S.equip,it.setId)+'/3)':it.uniqueId||it.bossRelic?' · Unique':'')+'</small>';
}
function setSummary(){
  const line=stats=>Object.entries(stats).map(([k,v])=>gearStats({[k]:v})).join(', ');
  return Object.entries(GEAR_SETS).filter(([key])=>Object.values(S.equip).concat(S.bag).some(it=>it?.setId===key)).map(([key,set])=>'<p>'+set.name+' : '+setCount(S.equip,key)+'/3 · 2 pièces : '+line(set.two)+' · 3 pièces (cumul) : '+line(set.three)+'</p>').join('');
}