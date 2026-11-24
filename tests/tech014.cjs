'use strict';
// Contrats de parité : l'oracle est un commit Git immuable, pas le candidat.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {BASE,CLASSES_IDS,rng32,createSession,catalogDocument,digest,referencePack}=require('../tools/godot/reference.cjs');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const baseline=execFileSync('git',['show',BASE+':index.html'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
assert.equal(html,baseline,'TECH-014 doit conserver le jeu octet pour octet');
const rng=rng32(1);
assert.equal(rng.next()*4294967296,1015568748);
assert.equal(rng.next()*4294967296,1586005467);
assert.deepEqual(rng.snapshot(),{state:1586005467,draws:2});
assert.throws(()=>rng32(-1));
const a=createSession(html,42),b=createSession(html,42),c=createSession(html,43);
assert.deepEqual(a.start('warrior'),b.start('warrior'));
assert.notEqual(a.start('warrior').S.dungeon.seed,c.start('warrior').S.dungeon.seed);
// Les instances ne partagent ni état, ni stockage, ni flux de tirages.
const before=b.snapshot(),beforeRng=b.randomState(),beforeSave=b.saveData();
a.action({type:'move',dx:1,dy:0});
assert.deepEqual(b.snapshot(),before);assert.deepEqual(b.randomState(),beforeRng);
assert.deepEqual(b.saveData(),beforeSave);
const snapshot=b.snapshot();snapshot.S.hp=-100;assert.notEqual(b.snapshot().S.hp,-100);
const saved=b.saveData();saved.S.hp=-100;assert.notEqual(b.saveData().S.hp,-100);
assert.throws(()=>b.action({type:'move',dx:2,dy:0}));
assert.throws(()=>b.action({type:'unknown'}));
const save=b.saveData();b.action({type:'reload'});assert.deepEqual(b.saveData(),save);
assert.deepEqual(b.snapshot().S,save.S);
const cat=catalogDocument(b);
assert.deepEqual(Object.keys(cat.catalogs.CLASSES),CLASSES_IDS);
assert.equal(Object.values(cat.catalogs.CLASSES).reduce((n,c)=>n+c.skills.length,0),20);
assert.equal(Object.keys(cat.catalogs.WEAPONS).length,7);
assert.equal(cat.catalogs.ATTR.length,6);
assert.equal(Object.keys(cat.catalogs.GEAR_SLOTS).length,5);
assert.equal(cat.catalogs.AFFIXES.length,5);
assert.deepEqual(cat.catalogs.AFFIXES[0].valuesByGrade,[1,1,2,2]);
const expected=referencePack(baseline),actual=referencePack(html);
assert.deepEqual(actual,expected,'catalogues, plans et traces des quatre classes');
assert.equal(actual.layouts.length,12);
assert.equal(actual.campaigns.length,4);
for(const run of actual.campaigns){
  assert.ok(run.commands.length>0,'campagne non vide');
  assert.equal(run.trace.length,run.commands.length+1);
  assert.ok(run.final.turn>=0&&run.final.floor>=1&&run.final.floor<=30);
  const replay=createSession(html,run.seed);replay.start(run.id);
  const initial=replay.snapshot();
  assert.equal(initial.S.classId,run.id);
  assert.deepEqual(initial,run.initialState);
  assert.equal(digest(initial),run.trace[0].stateHash);
  for(const [i,command] of run.commands.entries()){
    assert.equal(digest(replay.action(command)),run.trace[i+1].stateHash);
    assert.deepEqual(replay.randomState(),run.trace[i+1].rng);
  }
  assert.deepEqual(replay.snapshot(),run.finalState);
  assert.deepEqual(replay.randomState(),run.final.rng);
  assert.equal(replay.snapshot().S.turn,run.final.turn);
  assert.equal(replay.snapshot().S.floor,run.final.floor);
  assert.equal(replay.snapshot().S.hp,run.final.hp);
  assert.deepEqual(replay.history(),run.history);
}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(actual,null,2)+'\n');
console.log('TECH-014 : intégrité, isolation, RNG, catalogues, 12 plans et 4 campagnes déterministes');
console.log(JSON.stringify(actual.campaigns.map(r=>({id:r.id,seed:r.seed,reason:r.reason,actions:r.commands.length,turn:r.final.turn,floor:r.final.floor,hp:r.final.hp,outcome:r.final.outcome})),null,2));
