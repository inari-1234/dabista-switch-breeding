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
const profiles=['sp','speedCross','production','st','balance'];
const axes=['sp','speedCross','production','st','balance','theory'];
const mare='エイスト';

function bases(shortlists,maxEach=12){
 const out=[],seen=new Set();
 for(let i=0;i<maxEach;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out;
}
function update(group,route,generation){
 const first=route?.sires?.[0];if(!first)return;
 let rec=group.get(first);
 if(!rec){rec={firstSire:first,bestByProfile:{},maxGenerationByProfile:{}};group.set(first,rec)}
 for(const p of profiles){
  const old=rec.bestByProfile[p];
  if(!old||planner.compareProfile(p)(old,route)>0){
   rec.bestByProfile[p]=route;
   rec.maxGenerationByProfile[p]=generation;
  }
 }
}
function facts(r){if(!r)return null;const f=advisor.routeFacts(r);return{sires:r.sires,sp:f.sp,st:f.st,pw:f.pw,spst:f.spst,record:f.record,stable:f.stable,speedCross:f.speedCross,materialSpeedCrossStages:f.materialSpeedCrossStages,maxD:f.maxD,elaborate:f.elaborate}}

const group=new Map();
let directCount=0,twoCount=0,threeCount=0,fourCount=0;
const c2=planner.createCollector({topN:3,poolN:24});
for(const r of planner.iterateDirect(mare)){directCount++;update(group,r,1)}
for(const r of planner.iterateTwo(mare)){twoCount++;c2.push(r);update(group,r,2)}
const r2=c2.finish(),b3=bases(r2.shortlists,12),c3=planner.createCollector({topN:3,poolN:18}),bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(mare,b3)){threeCount++;c3.push(r);bridge.push(r);update(group,r,3)}
const r3=c3.finish(),b4=bridge.finish().bases;
for(const r of planner.iterateFourthPreview(mare,b4)){fourCount++;update(group,r,4)}

const summary=[...group.values()].map(rec=>({
 firstSire:rec.firstSire,
 future:Object.fromEntries(profiles.map(p=>[p,{generation:rec.maxGenerationByProfile[p]||null,facts:facts(rec.bestByProfile[p])}]))
}));
const gp=summary.find(x=>x.firstSire==='グランプリボス');
if(!gp)throw Error('Grand Prix Boss first-sire provenance missing');
if(summary.length<150)throw Error('too few first-sire groups '+summary.length);
if(!profiles.some(p=>summary.some(x=>(x.future[p].generation||0)>=3)))throw Error('no deep future provenance recorded');

const categoryDeepCounts={};
for(const p of profiles){
 categoryDeepCounts[p]={
  gen1:summary.filter(x=>x.future[p].generation===1).length,
  gen2:summary.filter(x=>x.future[p].generation===2).length,
  gen3:summary.filter(x=>x.future[p].generation===3).length,
  gen4:summary.filter(x=>x.future[p].generation===4).length
 };
}
console.log(JSON.stringify({
 passed:true,
 method:'single-mare-scan-grouped-by-first-sire',
 mare,
 counts:{firstSireGroups:summary.length,directCount,twoCount,threeCount,fourCount,thirdBases:b3.length,fourthBases:b4.length},
 categoryDeepCounts,
 grandPrixBoss:gp,
 examples:summary.filter(x=>['グランプリボス','ワイルドラッシュ','バゴ','ロードアルティマ'].includes(x.firstSire))
},null,2));
