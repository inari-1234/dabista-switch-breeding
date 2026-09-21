'use strict';
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';
const files=fs.readdirSync(dir).filter(x=>/^third-shard-\d+\.json$/.test(x)).sort();
if(!files.length)throw Error('no third-generation shard files');
const totals={mares:0,twoRoutes:0,thirdRoutes:0,thirdBasesTotal:0,bridgeBasesTotal:0,runtimeMsSum:0};
const matrix={arc:{},bc:{},rebuild:{}},focus={},fourth={arc:new Set(),bc:new Set(),rebuild:new Set()};
function merge(dst,src){for(const [b,v] of Object.entries(src||{})){dst[b]??={};for(const [g,n] of Object.entries(v||{}))dst[b][g]=(dst[b][g]||0)+(+n||0)}}
for(const file of files){
 const x=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));if(!x.passed)throw Error(file+' failed');
 totals.mares+=x.totals.mares;totals.twoRoutes+=x.totals.twoRoutes;totals.thirdRoutes+=x.totals.thirdRoutes;
 totals.thirdBasesTotal+=x.totals.thirdBasesTotal;totals.bridgeBasesTotal+=x.totals.bridgeBasesTotal;totals.runtimeMsSum+=x.totals.runtimeMs;
 for(const g of ['arc','bc','rebuild']){merge(matrix[g],x.matrix[g]);for(const n of x.fourthCandidates[g]||[])fourth[g].add(n)}
 Object.assign(focus,x.focus||{});
}
if(totals.mares!==331)throw Error('mare count '+totals.mares);
for(const n of ['スプリングスイーツ','エイスト','フィットレオタード','ミニミニデート','ワカヒルメ','ミムラス','エトワルセリータ','アマリン'])if(!focus[n])throw Error('missing focus '+n);
if(focus['スプリングスイーツ'].goals.arc.recommendedGeneration!==1)throw Error('Spring Arc regression');
if(focus['エイスト'].goals.arc.recommendedGeneration!==1)throw Error('Eist Arc regression');
if(focus['フィットレオタード'].goals.arc.recommendedGeneration<2)throw Error('Fit Arc regression');
if(focus['ミニミニデート'].goals.arc.recommendedGeneration<2)throw Error('Mini Arc regression');
console.log(JSON.stringify({
 passed:true,shardCount:files.length,totals,matrix,focus,
 fourthCandidates:{arc:[...fourth.arc],bc:[...fourth.bc],rebuild:[...fourth.rebuild]},
 fourthCandidateCounts:{arc:fourth.arc.size,bc:fourth.bc.size,rebuild:fourth.rebuild.size}
},null,2));
