'use strict';
// Vérifie le premier module isolé et l'assemblage du jeu historique.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {assemble}=require('../tools/build-game.cjs');
const root=path.resolve(__dirname,'..');
const baseline='3a6df309669a9a0106e4d08c7718a0c3559cbe34';
const original=execFileSync('git',['show',baseline+':index.html'],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
const generated=assemble();
assert.equal(generated,fs.readFileSync(path.join(root,'index.html'),'utf8'),'generated file matches sources');
assert.equal(generated,original,'TECH-013A preserves the entire original HTML');
const moduleText=fs.readFileSync(path.join(root,'src/game/dungeon.js'),'utf8');
const isolated=vm.runInNewContext(moduleText+'\n;buildDungeon',{}, {timeout:1000});
const begin=original.indexOf('function buildDungeon(');
const end=original.indexOf('function generate(){',begin);
assert.ok(begin>=0&&end>begin);
const historical=vm.runInNewContext('('+original.slice(begin,end).trim()+')',{}, {timeout:1000});
for(let floor=1;floor<=30;floor++){
  for(let seed=0;seed<10;seed++){
    assert.equal(JSON.stringify(isolated(48,32,floor,seed)),
      JSON.stringify(historical(48,32,floor,seed)),'floor '+floor+' seed '+seed);
  }
}
console.log('TECH-013A: byte-identical HTML, standalone dungeon module, 300 equivalent cases');
