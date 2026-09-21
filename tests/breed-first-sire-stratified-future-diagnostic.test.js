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

const mare='エイスト';
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
function collectorMap(){return new Map(T.stallions.map(s=>[s.name,planner.createCollector({topN:1,poolN:4})]))}
function facts(r){if(!r)return null;const f=advisor.routeFacts(r);return{sires:r.sires,sp:f.sp,st:f.st,pw:f.pw,spst:f.spst,record:f.record,stable:f.stable,speedCross:f.speedCross,materialSpeedCrossStages:f.materialSpeedCrossStages,maxD:f.maxD,elaborate:f.elaborate}}
function bestByProfile(result){const o={};for(const p of profiles)o[p]=result.profiles?.[p]?.[0]||null;return o}
function updateBest(dst,p,r,g){
 if(!r)return;
 if(!dst[p]||planner.compareProfile(p)(dst[p].route,r)>0)dst[p]={route:r,generation:g};
}

const started=Date.now();
const directByFirst=new Map();
for(const r of planner.iterateDirect(mare))directByFirst.set(r.sires[0],r);

const c2=collectorMap();let twoCount=0;
for(const r of planner.iterateTwo(mare)){twoCount++;c2.get(r.sires[0])?.push(r)}
const b3=[];const twoResult=new Map();
for(const s of T.stallions){
 const x=c2.get(s.name).finish();twoResult.set(s.name,x);
 for(const r of bases(x.shortlists,1))b3.push(r);
}

const c3=collectorMap();let threeCount=0;
for(const r of planner.iterateThirdPreview(mare,b3)){threeCount++;c3.get(r.sires[0])?.push(r)}
const b4=[];const threeResult=new Map();
for(const s of T.stallions){
 const x=c3.get(s.name).finish();threeResult.set(s.name,x);
 for(const r of bases(x.shortlists,1))b4.push(r);
}

const c4=collectorMap();let fourCount=0;
for(const r of planner.iterateFourthPreview(mare,b4)){fourCount++;c4.get(r.sires[0])?.push(r)}
const fourResult=new Map(T.stallions.map(s=>[s.name,c4.get(s.name).finish()]));

const rows=[];
for(const s of T.stallions){
 const name=s.name,best={};
 for(const p of profiles){
  best[p]=null;
  updateBest(best,p,directByFirst.get(name),1);
  updateBest(best,p,twoResult.get(name)?.profiles?.[p]?.[0],2);
  updateBest(best,p,threeResult.get(name)?.profiles?.[p]?.[0],3);
  updateBest(best,p,fourResult.get(name)?.profiles?.[p]?.[0],4);
 }
 rows.push({
  firstSire:name,
  explored:{
   direct:!!directByFirst.get(name),
   two:(twoResult.get(name)?.count||0)>0,
   three:(threeResult.get(name)?.count||0)>0,
   four:(fourResult.get(name)?.count||0)>0
  },
  future:Object.fromEntries(profiles.map(p=>[p,{generation:best[p]?.generation||null,facts:facts(best[p]?.route)}]))
 });
}
const coverage={
 direct:rows.filter(x=>x.explored.direct).length,
 two:rows.filter(x=>x.explored.two).length,
 three:rows.filter(x=>x.explored.three).length,
 four:rows.filter(x=>x.explored.four).length
};
if(coverage.direct!==176||coverage.two!==176||coverage.three!==176||coverage.four!==176)throw Error('coverage '+JSON.stringify(coverage));

const counts={};
for(const p of profiles){
 counts[p]={gen1:0,gen2:0,gen3:0,gen4:0};
 for(const x of rows){const g=x.future[p].generation;if(g)counts[p]['gen'+g]++}
}
console.log(JSON.stringify({
 passed:true,
 method:'first-sire-stratified-one-per-axis-through-four-generations',
 mare,
 counts:{twoCount,threeCount,fourCount,thirdBases:b3.length,fourthBases:b4.length,runtimeMs:Date.now()-started},
 coverage,
 categoryBestGenerationCounts:counts,
 examples:rows.filter(x=>['グランプリボス','ワイルドラッシュ','バゴ','ロードアルティマ','ステイゴールド'].includes(x.firstSire))
},null,2));
