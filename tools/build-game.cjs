'use strict';
// TECH-013A : assemble les sources sans modifier leurs espaces ni leurs chaînes.
// index.html reste un artefact versionné, utilisable sans serveur ni bundler.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function include(template,marker,content){
  if(template.split(marker).length!==2)throw Error('Missing or duplicate marker: '+marker);
  return template.replace(marker,()=>content);
}

function assemble(){
  let engine=include(read('src/game/engine.template.js'),
    '/* @include:dungeon */',read('src/game/dungeon.js'));
  engine=include(engine,'/* @include:geometry */',read('src/game/geometry.js'));
  // Les fichiers sont assemblés à leur emplacement historique, sans import à l'exécution.
  for(const id of ["persistence","weapons","talents","consumables","exploration","combat-formulas","items","history-transfer","title-screen","bestiary-bosses","economy","special-rooms","floor-exploration","object-art","biomes","tile-renderer","progression","combat-turns","hud","sprite-renderer","inventory-ui"]){
    engine=include(engine,'/* @include:'+id+' */',read('src/game/'+id+'.js'));
  }
  let html=read('src/index.template.html');
  html=include(html,'/* @include:styles */',read('src/styles/game.css'));
  html=include(html,'/* @include:engine */',engine);
  html=include(html,'/* @include:pwa */',read('src/platform/pwa.js'));
  if(html.includes('/* @include:'))throw Error('Unresolved source marker');
  return html;
}

if(require.main===module){
  const mode=process.argv[2];
  const html=assemble();
  if(mode==='--write'){
    fs.writeFileSync(path.join(root,'index.html'),html,'utf8');
    console.log('index.html regenerated');
  }else if(mode==='--check'){
    if(html!==read('index.html'))throw Error('index.html is stale. Run node tools/build-game.cjs --write');
    console.log('Generated index.html matches source exactly');
  }else{
    throw Error('Usage: node tools/build-game.cjs --check|--write');
  }
}
module.exports={assemble};
