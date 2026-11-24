// Compare identical fixtures from the same runner; timings are descriptive, equality is mandatory.
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const a=read(process.argv[2]),b=read(process.argv[3]);
assert.notEqual(a.sourceSha256,b.sourceSha256,'candidate must differ from baseline');
for(const key of ['browser','node','platform','arch'])assert.equal(a[key],b[key],key);
assert.equal(a.profiles.length,b.profiles.length);
const rows=a.profiles.map((x,i)=>{
 const y=b.profiles[i],label=x.width+'x'+x.height;
 for(const key of ['width','height','canvas','visibilitySha256','sceneHashes','saveSha256','turns','saveBytes','pageErrors'])assert.deepEqual(y[key],x[key],label+' '+key);
 const metrics={};
 for(const name of ['render','reveal','update','save','pointerToNextFrame','stress100Turns']){
  const before=(x.functions[name]||x[name]).mean,after=(y.functions[name]||y[name]).mean;
  metrics[name]={before,after,changePercent:before?+((after-before)/before*100).toFixed(1):null};
 }
 return {viewport:label,scenes:x.sceneHashes.length,metrics,heapBeforeBaseline:x.memoryBefore.usedSize,heapAfterBaseline:x.memoryAfter.usedSize,heapBeforeCandidate:y.memoryBefore.usedSize,heapAfterCandidate:y.memoryAfter.usedSize};
});
const report={equivalence:'passed',baseline:a.sourceSha256,candidate:b.sourceSha256,rows};
fs.writeFileSync('perf-results/game011c-comparison.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
