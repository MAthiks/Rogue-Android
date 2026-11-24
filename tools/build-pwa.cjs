// node tools/build-pwa.cjs <output-directory>
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.join(__dirname,'..'),out=path.resolve(process.argv[2]||'pwa-dist');
if(out===root||!process.argv[2])throw Error('Specify a separate output directory');
fs.mkdirSync(path.join(out,'icons'),{recursive:true});
const files=['index.html','manifest.webmanifest','icon.svg'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
const palette=['#14181e','#554737','#25282e','#b99b62','#d6d9d2','#c8a469'];
const pixels=Array.from({length:32},()=>Array(32).fill(0));
const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels[j][i]=c};
rect(5,5,22,22,1);rect(7,7,18,18,2);rect(9,9,14,2,3);rect(9,21,14,2,3);
for(let i=0;i<6;i++)rect(21-2*i,9+2*i,2,4,4);
for(const [x,y] of [[10,16],[12,18],[14,20],[10,20],[8,22]])rect(x,y,2,2,5);
const crc32=b=>{let n=0xffffffff;for(const v of b){n^=v;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0)}return (n^0xffffffff)>>>0};
const chunk=(type,data)=>{const name=Buffer.from(type),body=Buffer.concat([name,data]),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(body));return Buffer.concat([len,body,crc])};
function png(size){
 const raw=Buffer.alloc(size*(1+size*3)),colors=palette.map(v=>Buffer.from(v.slice(1),'hex'));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)colors[pixels[Math.floor(y*32/size)][Math.floor(x*32/size)]].copy(raw,y*(1+size*3)+1+x*3);
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
for(const size of [192,512]){const name='icons/icon-'+size+'.png';fs.writeFileSync(path.join(out,name),png(size));files.push(name)}
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const hash=crypto.createHash('sha256');for(const file of files)hash.update(fs.readFileSync(path.join(out,file)));hash.update(worker);
const version=hash.digest('hex').slice(0,24);
fs.writeFileSync(path.join(out,'sw.js'),worker.replace('__BUILD_ID__',version));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('PWA build '+version+' — '+out);
