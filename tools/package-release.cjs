// Candidate packaging only: no network, no deployment, no signing credentials.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),meta=require('../release.json');
if(process.argv[2]==='--assert-publishable'){
 if(meta.stage!=='stable')throw Error('Publication blocked: release candidate is not stable');
 process.exit(0);
}
if(!process.argv[2]||!process.argv[3])throw Error('Specify input PWA directory and separate output directory');
const input=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
if(input===out||out===root||input.startsWith(out+path.sep)||out.startsWith(input+path.sep)||fs.existsSync(out))throw Error('Output must be a new separate directory');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=['index.html','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png','sw.js','.nojekyll'];
for(const file of files)if(!fs.statSync(path.join(input,file)).isFile())throw Error('Missing '+file);
const html=fs.readFileSync(path.join(input,'index.html'),'utf8');
if(!html.includes(meta.displayVersion+' · Mort permanente'))throw Error('Version mismatch');
const worker=fs.readFileSync(path.join(input,'sw.js'),'utf8');
if(worker.includes('__BUILD_ID__'))throw Error('Unresolved PWA build id');
fs.mkdirSync(path.join(out,'pwa'),{recursive:true});
for(const file of files){const dest=path.join(out,'pwa',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(input,file),dest)}
fs.copyFileSync(path.join(root,'docs/GAME011D_RELEASE_PACKAGING.md'),path.join(out,'RECETTE.md'));
fs.writeFileSync(path.join(out,'RELEASE.json'),JSON.stringify(meta,null,2)+'\n');
fs.writeFileSync(path.join(out,'BUILD_SHA.txt'),execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()+'\n');
const entries=[...files.map(f=>'pwa/'+f),'RECETTE.md','RELEASE.json','BUILD_SHA.txt'].sort();
const checksums=entries.map(f=>sha(fs.readFileSync(path.join(out,f)))+'  '+f).join('\n')+'\n';
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),checksums);
console.log('Prepared '+meta.version+' '+out+' ('+entries.length+' files, SHA256 manifest)');
