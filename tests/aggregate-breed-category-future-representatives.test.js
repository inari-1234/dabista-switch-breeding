'use strict';
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';
const files=fs.readdirSync(dir).filter(x=>/^breed-cat-future-\d+\.json$/.test(x)).sort();
if(files.length!==5)throw Error('expected 5 shard files, got '+files.length);
const rows=files.map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
for(const x of rows)if(!x.passed)throw Error('failed shard '+x.mare);
const expected=['スプリングスイーツ','フィットレオタード','ミニミニデート','ワカヒルメ','アマリン'];
for(const n of expected)if(!rows.some(x=>x.mare===n))throw Error('missing '+n);
const am=rows.find(x=>x.mare==='アマリン');
if(am.assessment.abilityKnown)throw Error('Amarin ability must remain unknown');
for(const x of rows){
 if(Object.keys(x.categories||{}).length!==6)throw Error(x.mare+' category count');
 for(const [k,v] of Object.entries(x.categories||{})){
  if(![1,2,3,4].includes(v.latestMaterialGeneration))throw Error(x.mare+' '+k+' bad generation');
  if(!['early-complete','improves-to-2','improves-to-3-conditional','improves-to-4-conditional'].includes(v.state))throw Error(x.mare+' '+k+' bad state');
 }
}
const signatures=new Set(rows.map(x=>Object.values(x.categories).map(v=>v.latestMaterialGeneration).join('-')));
if(signatures.size<3)throw Error('representatives insufficiently differentiated '+JSON.stringify([...signatures]));
console.log(JSON.stringify({
 passed:true,count:rows.length,signatureCount:signatures.size,
 summary:rows.map(x=>({
  mare:x.mare,first:x.first,assessment:x.assessment,
  future:Object.fromEntries(Object.entries(x.categories).map(([k,v])=>[k,{label:v.label,state:v.state,generation:v.latestMaterialGeneration}]))
 }))
},null,2));
