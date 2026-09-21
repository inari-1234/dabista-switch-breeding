'use strict';
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';
const files=fs.readdirSync(dir).filter(x=>/^category-future-\d+\.json$/.test(x)).sort();
if(files.length!==8)throw Error('expected 8 category future shards, got '+files.length);
const rows=[];
for(const file of files){
 const x=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
 if(!x.passed)throw Error(file+' failed');
 if(!Array.isArray(x.out)||x.out.length!==1)throw Error(file+' invalid out');
 rows.push(x.out[0]);
}
const names=rows.map(x=>x.mare);
const expected=['スプリングスイーツ','エイスト','フィットレオタード','ミニミニデート','ワカヒルメ','ミムラス','エトワルセリータ','アマリン'];
for(const n of expected)if(!names.includes(n))throw Error('missing '+n);
for(const row of rows){
 for(const p of ['sp','speedCross','production','st','balance','sire']){
  if(!row.categories?.[p])throw Error(row.mare+' missing '+p);
  const g=row.categories[p].latestMaterialGeneration;
  if(![1,2,3,4].includes(g))throw Error(row.mare+' '+p+' invalid latest generation '+g);
 }
}
const summary=rows.map(row=>({
 mare:row.mare,
 categories:Object.fromEntries(Object.entries(row.categories).map(([k,v])=>[k,{
  label:v.label,
  latestMaterialGeneration:v.latestMaterialGeneration,
  transitions:v.transitions
 }]))
}));
console.log(JSON.stringify({passed:true,count:rows.length,summary},null,2));
