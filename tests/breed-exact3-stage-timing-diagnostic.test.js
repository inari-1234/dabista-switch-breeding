'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');

const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
const S=JSON.parse(fs.readFileSync('data/stallions.json','utf8')).stallions;
const M=JSON.parse(fs.readFileSync('data/default-broodmares.json','utf8')).broodmares;
const E=JSON.parse(fs.readFileSync('data/nitro-effects.json','utf8')).effects;
const K=JSON.parse(fs.readFileSync('data/kotta-pairs.json','utf8')).pairs;
const D=JSON.parse(fs.readFileSync('data/elaborate-direct-exceptions.json','utf8')).pairs;
const IV=JSON.parse(fs.readFileSync('data/planner-inheritance-validation.json','utf8'));
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});

const mare='エイスト',first='グランプリボス';
const profiles=['sp','speedCross','production','st','balance'];
const times={};let t=Date.now();

const direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first);
times.direct=Date.now()-t;t=Date.now();

const twoRoutes=[],c2=planner.createCollector({topN:16,poolN:96});
for(const r of planner.iterateTwo(mare)){if(r.sires[0]!==first)continue;twoRoutes.push(r);c2.push(r)}
const r2=c2.finish();
times.two=Date.now()-t;t=Date.now();

const c3=planner.createCollector({topN:16,poolN:96}),bridge=planner.createFourthBridgeCollector();let n3=0;
for(const r of planner.iterateThirdPreview(mare,twoRoutes)){n3++;c3.push(r);bridge.push(r)}
const r3=c3.finish();
times.threeEnumerateCollect=Date.now()-t;t=Date.now();

const b=bridge.finish();
times.bridgeFinish=Date.now()-t;t=Date.now();

const c4=planner.createCollector({topN:16,poolN:96});let n4=0;
for(const r of planner.iterateFourthPreview(mare,b.bases)){n4++;c4.push(r)}
const r4=c4.finish();
times.fourEnumerateCollect=Date.now()-t;t=Date.now();

const portfolioTimes={};
for(const [name,pool] of [['direct',[direct]],['two',r2.pool],['three',r3.pool],['four',r4.pool]]){
 const s=Date.now();planner.portfolioPareto(pool,1);portfolioTimes[name]=Date.now()-s;
}
times.portfolioTotal=Object.values(portfolioTimes).reduce((a,b)=>a+b,0);

const routeMemoryShape={
 directPool:1,twoPool:r2.pool.length,threePool:r3.pool.length,fourPool:r4.pool.length,
 thirdBases:twoRoutes.length,fourthBases:b.bases.length
};
const totalMeasured=Object.values(times).reduce((a,b)=>a+b,0);
console.log(JSON.stringify({
 passed:true,mare,first,
 counts:{two:twoRoutes.length,three:n3,four:n4,bridgeBases:b.bases.length},
 timesMs:times,portfolioTimesMs:portfolioTimes,totalMeasured,
 share:Object.fromEntries(Object.entries(times).map(([k,v])=>[k,totalMeasured?Math.round(v/totalMeasured*1000)/10:0])),
 routeMemoryShape,
 conclusion:'Use stage timing to target optimization; do not reduce search precision before locating dominant cost.'
},null,2));
