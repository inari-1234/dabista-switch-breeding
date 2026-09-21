'use strict';
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';
const files=fs.readdirSync(dir).filter(x=>/^fixed-opt-\d+\.json$/.test(x)).sort();
if(files.length!==5)throw Error('expected 5 fixed-opt files, got '+files.length);
const rows=files.map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
for(const x of rows){
 if(!x.passed)throw Error('failed '+x.mare);
 for(const [k,v] of Object.entries(x.compare||{}))if(!v.sameGeneration||!v.sameRoute)throw Error(x.mare+' '+k+' mismatch');
}
const speedups=rows.map(x=>x.speedup);
console.log(JSON.stringify({
 passed:true,count:rows.length,
 speedup:{min:Math.min(...speedups),max:Math.max(...speedups),avg:speedups.reduce((a,b)=>a+b,0)/speedups.length},
 summary:rows.map(x=>({mare:x.mare,first:x.first,canonicalRuntimeMs:x.canonicalRuntimeMs,optimizedRuntimeMs:x.optimizedRuntimeMs,speedup:x.speedup,fit:x.fit}))
},null,2));
