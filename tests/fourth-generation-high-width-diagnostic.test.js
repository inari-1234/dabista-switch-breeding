'use strict';
const fs=require('fs');
const assert=require('assert');
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
const widths=[120,176,240];

function bases(shortlists,maxEach){
  const out=[],seen=new Set();
  for(let i=0;i<maxEach;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function collect(iter,poolN=24){
  const c=planner.createCollector({topN:3,poolN});
  const arc=advisor.emptySummary('arc'),bc=advisor.emptySummary('bc');
  for(const r of iter){c.push(r);advisor.addRoute(arc,r,'arc');advisor.addRoute(bc,r,'bc')}
  const out=c.finish();out.goalBest={arc:arc.bestRoute,bc:bc.bestRoute};return out;
}
function multiCollect(iter){
  const cs=new Map(widths.map(n=>[n,planner.createCollector({topN:3,poolN:n})]));
  let count=0;
  for(const r of iter){count++;for(const c of cs.values())c.push(r)}
  const results={};for(const [n,c] of cs)results[n]=c.finish();
  return{count,results};
}
function facts(r){
  if(!r)return null;
  const f=r.final||{},s=f.sireStats||{};
  return{sires:r.sires,sp:f.sp,st:f.st,pw:f.pw,record:s.record,stable:s.stable,maxD:s.maxD,
    speedCross:!!f.speedCross?.has,longCross:!!f.crossEffects?.longDistance,
    materialSpeed:r.materialSpeedCross?.stages||0,materialLong:r.materialLongCross?.stages||0,
    theory:f.theory,elaborate:f.elaborate};
}
function snapshot(result){
  const goal=(g)=>{
    const s=advisor.emptySummary('goal');
    for(const r of result.__routes||[])advisor.addRoute(s,r,g);
    return s.bestRoute;
  };
  return{
    count:result.count,pool:result.pool.length,
    arc:facts(result.goalBest?.arc||goal('arc')),
    bc:facts(result.goalBest?.bc||goal('bc')),
    production:facts(result.profiles.production?.[0]),
    sp:facts(result.profiles.sp?.[0]),
    st:facts(result.profiles.st?.[0]),
    balance:facts(result.profiles.balance?.[0])
  };
}
function outcome(x){if(!x)return'null';const y={...x};delete y.sires;return JSON.stringify(y)}
function scanFourthVariants(mare,baseVariants){
  const maxWidth=Math.max(...widths);
  const largest=baseVariants[maxWidth];
  const sets=new Map(widths.map(n=>[n,new Set(baseVariants[n].map(r=>planner.routeKey(r)))]));
  for(const n of widths){
    for(const k of sets.get(n))assert(sets.get(maxWidth).has(k),`bridge pool ${n} must be a subset of ${maxWidth}`);
  }
  const states=new Map(widths.map(n=>[n,{
    collector:planner.createCollector({topN:3,poolN:120}),
    arc:advisor.emptySummary('arc'),
    bc:advisor.emptySummary('bc')
  }]));
  let scanned=0;
  for(const r of planner.iterateFourthPreview(mare,largest)){
    scanned++;
    const baseKey=planner.routeKey({sires:(r.sires||[]).slice(0,-1)});
    for(const n of widths){
      if(!sets.get(n).has(baseKey))continue;
      const s=states.get(n);s.collector.push(r);advisor.addRoute(s.arc,r,'arc');advisor.addRoute(s.bc,r,'bc');
    }
  }
  const results={};
  for(const n of widths){
    const s=states.get(n),out=s.collector.finish();out.goalBest={arc:s.arc.bestRoute,bc:s.bc.bestRoute};
    results[n]={scannedLargest:scanned,result:snapshot(out)};
  }
  return results;
}

const mares=['スプリングスイーツ','エイスト'];
const output=[];
const started=Date.now();
for(const mare of mares){
  currentMare=mare;
  const r2=collect(planner.iterateTwo(mare),24);
  const b3=bases(r2.shortlists,12);
  const third=multiCollect(planner.iterateThirdPreview(mare,b3));
  const baseVariants={};for(const n of widths)baseVariants[n]=third.results[n].pool;
  const scanned=scanFourthVariants(mare,baseVariants);
  const variants={};
  for(const n of widths)variants[n]={baseCount:baseVariants[n].length,...scanned[n]};
  const ref=variants[240].result;
  for(const n of widths){
    const cur=variants[n].result;
    variants[n].stabilityVs240={};
    for(const axis of ['arc','bc','production','sp','st','balance']){
      variants[n].stabilityVs240[axis]={
        sameRoute:JSON.stringify(cur[axis]?.sires||[])===JSON.stringify(ref[axis]?.sires||[]),
        sameOutcome:outcome(cur[axis])===outcome(ref[axis])
      };
    }
  }
  output.push({mare,thirdScanned:third.count,thirdBases:b3.length,variants});
}

console.log(JSON.stringify({passed:true,method:'fourth-convergence-width-sensitivity',runtimeMs:Date.now()-started,widths,output},null,2));
