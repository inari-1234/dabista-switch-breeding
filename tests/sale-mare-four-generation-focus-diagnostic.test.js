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
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});
const axes=['sp','speedCross','production','st','balance','theory'];
const mares=['スプリングスイーツ','エイスト','フィットレオタード','ミニミニデート','ワカヒルメ','ミムラス','エトワルセリータ','アマリン'];

function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set();
 for(let i=0;i<maxEach;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const key=planner.routeKey(r);if(!seen.has(key)){seen.add(key);out.push(r)}
 }
 return out;
}
function scan(iter,goal,{collector=null,bridge=null}={}){
 const summary=advisor.emptySummary(goal);let count=0;
 for(const r of iter){count++;advisor.addRoute(summary,r,goal);if(collector)collector.push(r);if(bridge)bridge.push(r)}
 return{summary,count};
}
function facts(r){const f=advisor.routeFacts(r);return{sires:r?.sires||[],sp:f.sp,st:f.st,pw:f.pw,spst:f.spst,record:f.record,stable:f.stable,maxD:f.maxD,speedCross:f.speedCross,materialSpeedCross:f.materialSpeedCross,magnificent:f.magnificent,elaborate:f.elaborate}}

const out=[];
for(const mare of mares){
 const assessment=advisor.mareAssessment(mare);
 const perGoal={};
 const directAll=[...planner.iterateDirect(mare)];
 const c2=planner.createCollector({topN:3,poolN:24});
 for(const r of planner.iterateTwo(mare))c2.push(r);
 const r2=c2.finish(),b3=previewBases(r2.shortlists,12);
 const c3=planner.createCollector({topN:3,poolN:18}),bridge=planner.createFourthBridgeCollector();
 for(const r of planner.iterateThirdPreview(mare,b3)){c3.push(r);bridge.push(r)}
 const r3=c3.finish(),b4=bridge.finish().bases;
 const c4=planner.createCollector({topN:3,poolN:16});
 for(const r of planner.iterateFourthPreview(mare,b4))c4.push(r);
 const r4=c4.finish();

 for(const goal of ['arc','bc','rebuild']){
  const g1=scan(directAll,goal);
  const g2=scan(r2.pool,goal);
  const g3=scan(r3.pool,goal);
  const g4=scan(r4.pool,goal);
  const rec=advisor.recommendGeneration({
    goal,assessment,
    generations:{1:g1,2:g2,3:g3,4:g4}
  });
  perGoal[goal]={
    generation:rec.generation,label:rec.label,conditional:rec.conditional,reasons:rec.reasons,transitions:rec.transitions,
    routes:{1:facts(rec.routes[1]),2:facts(rec.routes[2]),3:facts(rec.routes[3]),4:facts(rec.routes[4])}
  };
 }
 out.push({mare,tier:assessment.tier,strategy:advisor.mareStrategy(mare).label,b3:b3.length,b4:b4.length,goals:perGoal});
}
const by=Object.fromEntries(out.map(x=>[x.mare,x]));
if(by['スプリングスイーツ'].goals.arc.generation!==1)throw Error('Spring Arc over-extension');
if(by['エイスト'].goals.arc.generation!==1)throw Error('Eist Arc over-extension');
if(by['アマリン'].tier!=='未判明')throw Error('unknown ability regression');
console.log(JSON.stringify({passed:true,method:'focus-mares-validated-compact-bridge-four-generation',out},null,2));
