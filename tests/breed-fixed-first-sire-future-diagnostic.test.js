'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');
const reco=require('../sale-recommendation-core.js');

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
const advisor=reco.create({planner,broodmareStats:M});

const mare='エイスト', first='グランプリボス';
const axes=['sp','speedCross','production','st','balance','theory'];
const profiles=['sp','speedCross','production','st','balance'];

function bases(shortlists,maxEach=1){
 const out=[],seen=new Set();
 for(let i=0;i<maxEach;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out;
}
function facts(r){if(!r)return null;const f=advisor.routeFacts(r);return{sires:r.sires,sp:f.sp,st:f.st,pw:f.pw,spst:f.spst,record:f.record,stable:f.stable,speedCross:f.speedCross,materialSpeedCrossStages:f.materialSpeedCrossStages,maxD:f.maxD,elaborate:f.elaborate}}
function update(best,p,r,g){if(!r)return;if(!best[p]||planner.compareProfile(p)(best[p].route,r)>0)best[p]={route:r,generation:g}}

const started=Date.now();
const direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first);
if(!direct)throw Error('direct route missing');

const c2=planner.createCollector({topN:1,poolN:4});let two=0;
for(const r of planner.iterateTwo(mare)){if(r.sires[0]!==first)continue;two++;c2.push(r)}
const r2=c2.finish(),b3=bases(r2.shortlists,1);

const c3=planner.createCollector({topN:1,poolN:4});let three=0;
for(const r of planner.iterateThirdPreview(mare,b3)){three++;c3.push(r)}
const r3=c3.finish(),b4=bases(r3.shortlists,1);

const c4=planner.createCollector({topN:1,poolN:4});let four=0;
for(const r of planner.iterateFourthPreview(mare,b4)){four++;c4.push(r)}
const r4=c4.finish();

const best={};for(const p of profiles)best[p]=null;
for(const p of profiles){
 update(best,p,direct,1);
 update(best,p,r2.profiles?.[p]?.[0],2);
 update(best,p,r3.profiles?.[p]?.[0],3);
 update(best,p,r4.profiles?.[p]?.[0],4);
}
console.log(JSON.stringify({
 passed:true,method:'fixed-first-sire-on-demand-stratified-future',
 mare,first,
 counts:{direct:1,two,three,four,thirdBases:b3.length,fourthBases:b4.length,total:1+two+three+four,runtimeMs:Date.now()-started},
 future:Object.fromEntries(profiles.map(p=>[p,{generation:best[p]?.generation||null,facts:facts(best[p]?.route)}]))
},null,2));
