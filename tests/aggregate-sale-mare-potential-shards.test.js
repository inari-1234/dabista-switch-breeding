'use strict';
const fs=require('fs');
const path=require('path');

const dir=process.argv[2]||'.';
const files=fs.readdirSync(dir).filter(x=>/^potential-shard-\d+\.json$/.test(x)).sort();
if(!files.length)throw Error('no shard files in '+dir);

function mergeNestedCounts(dst,src){
  for(const [a,v] of Object.entries(src||{})){
    dst[a]??={};
    for(const [b,n] of Object.entries(v||{}))dst[a][b]=(dst[a][b]||0)+(+n||0);
  }
}
const total={mares:0,known:0,unknown:0,twoRoutes:0,runtimeMsSum:0};
const matrix={arc:{},bc:{},rebuild:{}};
const preferredMatrix={arc:{},bc:{},rebuild:{}};
const focus={};
const samples={};
const tradeoffs={bc:{},rebuild:{}};
function mergeTradeoff(dst,src){
  for(const [k,v] of Object.entries(src||{})){
    if(k==='samples'){
      dst.samples??=[];
      for(const item of v||[])if(dst.samples.length<24)dst.samples.push(item);
    }else if(typeof v==='number'){
      dst[k]=(dst[k]||0)+v;
    }else if(v&&typeof v==='object'){
      dst[k]??={};
      mergeTradeoff(dst[k],v);
    }
  }
}
const shardIds=[];
for(const file of files){
  const x=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  if(!x.passed)throw Error(file+' not passed');
  shardIds.push(x.shard?.index);
  total.mares+=x.totals.mares;
  total.known+=x.totals.known;
  total.unknown+=x.totals.unknown;
  total.twoRoutes+=x.totals.twoRoutes;
  total.runtimeMsSum+=x.totals.runtimeMs;
  for(const g of ['arc','bc','rebuild']){
    mergeNestedCounts(matrix[g],x.matrix[g]);
    mergeNestedCounts(preferredMatrix[g],x.preferredMatrix[g]);
  }
  Object.assign(focus,x.focus||{});
  mergeTradeoff(tradeoffs.bc,x.tradeoffs?.bc);
  mergeTradeoff(tradeoffs.rebuild,x.tradeoffs?.rebuild);
  for(const [k,arr] of Object.entries(x.samples||{})){
    samples[k]??=[];
    for(const item of arr)if(samples[k].length<8)samples[k].push(item);
  }
}
if(total.mares!==331||total.known!==298||total.unknown!==33)throw Error('aggregate counts '+JSON.stringify(total));
if(new Set(shardIds).size!==files.length)throw Error('duplicate shard ids '+JSON.stringify(shardIds));
for(const n of ['スプリングスイーツ','エイスト','フィットレオタード','ミニミニデート','ワカヒルメ','ミムラス','エトワルセリータ','アマリン']){
  if(!focus[n])throw Error('missing focus '+n);
}
if(focus['アマリン'].band!=='unknown')throw Error('unknown mare misclassified');
if(focus['エイスト'].band!=='high')throw Error('Eist ability band');
if(focus['フィットレオタード'].band!=='middle')throw Error('Fit ability band');
if(focus['ワカヒルメ'].band!=='low')throw Error('Wakahirume ability band');
if(focus['ミムラス'].band!=='low'||focus['ミムラス'].goals.arc.status!=='direct-supported')throw Error('low/high-pedigree edge');
if(focus['エトワルセリータ'].band!=='high'||focus['エトワルセリータ'].goals.arc.recommendedGeneration!==1)throw Error('high/Arc-compensation-gate edge');
if(focus['スプリングスイーツ'].goals.arc.recommendedGeneration!==1)throw Error('Spring Arc generation regression');
if(focus['エイスト'].goals.arc.recommendedGeneration!==1)throw Error('Eist Arc generation regression');
if(focus['フィットレオタード'].goals.arc.recommendedGeneration!==2)throw Error('Fit Arc generation regression');
if(focus['ミニミニデート'].goals.arc.recommendedGeneration!==2)throw Error('Mini Arc generation regression');

console.log(JSON.stringify({
  passed:true,
  shardCount:files.length,
  totals:total,
  matrix,
  preferredMatrix,
  tradeoffs,
  focus,
  samples
},null,2));
