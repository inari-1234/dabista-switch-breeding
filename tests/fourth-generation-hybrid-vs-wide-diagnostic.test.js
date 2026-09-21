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
const mare=process.env.MARE||'エイスト';
const val=x=>Number.isFinite(+x)?+x:0;
const grade=v=>v==='A'?3:v==='B'?2:v==='C'?1:0;

function previewBases(shortlists,maxEach=12){
  const out=[],seen=new Set();
  for(let i=0;i<maxEach;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function collect(iter,poolN=24){
  const c=planner.createCollector({topN:3,poolN});
  for(const r of iter)c.push(r);
  return c.finish();
}
function bridgeFacts(r){
  const f=r.final||{},s=f.sireStats||{},t=f.theory||{},ce=f.crossEffects||{};
  return{
    sp:val(f.sp),st:val(f.st),pw:val(f.pw),sum:val(f.sp)+val(f.st),
    record:grade(s.record),stable:s.stable==='C'?3:s.stable==='B'?2:s.stable==='A'?1:0,
    speed:(f.speedCross?.has||r.materialSpeedCross?.has)?1:0,
    long:(ce.longDistance||r.materialLongCross?.has)?1:0,
    elaborate:f.elaborate?1:0,magnificent:t.magnificent?1:0,
    crossCount:val(f.speedCross?.count)+val(r.materialSpeedCross?.stages)
  };
}
const vectorA=x=>[x.speed,x.record,x.elaborate,x.magnificent,x.sum,x.st,x.sp,x.long,x.crossCount,x.stable];
const vectorD=x=>[x.speed,x.record,x.sum,x.elaborate,x.st,x.sp,x.long,x.crossCount,x.stable];
function cmpVec(A,B){for(let i=0;i<Math.max(A.length,B.length);i++){const a=A[i]||0,b=B[i]||0;if(a!==b)return b-a}return 0}
function rankRoutes(routes,fn){
  return routes.map((r,i)=>({r,i,f:bridgeFacts(r)})).sort((a,b)=>cmpVec(fn(a.f),fn(b.f))||a.i-b.i).map(x=>x.r);
}
function unionBases(...lists){
  const out=[],seen=new Set();
  for(const list of lists)for(const r of list||[]){const k=planner.routeKey(r);if(seen.has(k))continue;seen.add(k);out.push(r)}
  return out;
}
function finalFacts(r){
  if(!r)return null;
  const f=r.final||{},s=f.sireStats||{};
  return{sires:r.sires,sp:f.sp,st:f.st,pw:f.pw,record:s.record,stable:s.stable,maxD:s.maxD,
    speedCross:!!f.speedCross?.has,longCross:!!f.crossEffects?.longDistance,
    materialSpeed:r.materialSpeedCross?.stages||0,materialLong:r.materialLongCross?.stages||0,
    elaborate:!!f.elaborate};
}
function portfolioFacts(p){
  const r=p?.routes?.[0];if(!r)return null;
  return{sires:r.sires,portfolio:r.portfolio||null};
}

const r2=collect(planner.iterateTwo(mare),24);
const b3=previewBases(r2.shortlists,12);
const routes=[];
for(const r of planner.iterateThirdPreview(mare,b3))routes.push(r);

const officialRanked={};
for(const p of axes){
  officialRanked[p]=routes.filter(r=>{
    if(p==='speedCross'&&!r?.final?.speedCross?.has)return false;
    if(p==='production'&&!r?.final?.speedCross?.has&&!r?.materialSpeedCross?.has)return false;
    return true;
  }).sort(planner.compareProfile(p));
}
const officialBases=n=>unionBases(...axes.map(p=>officialRanked[p].slice(0,n)));
const hybridOfficial=()=>unionBases(...axes.map(p=>officialRanked[p].slice(0,p==='speedCross'?320:128)));
const rankA=rankRoutes(routes,vectorA),rankD=rankRoutes(routes,vectorD);
const hybrid=unionBases(hybridOfficial(),rankA.slice(0,96),rankD.slice(0,160));
const wide=officialBases(480);
const all=unionBases(hybrid,wide);
const sets={hybrid:new Set(hybrid.map(r=>planner.routeKey(r))),wide:new Set(wide.map(r=>planner.routeKey(r)))};
const states={};
for(const name of ['hybrid','wide']){
  states[name]={
    c:planner.createCollector({topN:3,poolN:120}),
    arc:advisor.emptySummary(name+'-arc'),
    bc:advisor.emptySummary(name+'-bc'),
    rebuild:advisor.emptySummary(name+'-rebuild')
  };
}
let scanned=0;
for(const r of planner.iterateFourthPreview(mare,all)){
  scanned++;
  const key=planner.routeKey({sires:r.sires.slice(0,-1)});
  for(const name of ['hybrid','wide']){
    if(!sets[name].has(key))continue;
    const s=states[name];s.c.push(r);
    advisor.addRoute(s.arc,r,'arc');advisor.addRoute(s.bc,r,'bc');advisor.addRoute(s.rebuild,r,'rebuild');
  }
}
const results={};
for(const name of ['hybrid','wide']){
  const s=states[name],base=s.c.finish();
  results[name]={
    base,
    goals:{arc:s.arc.bestRoute,bc:s.bc.bestRoute,rebuild:s.rebuild.bestRoute},
    portfolio:planner.portfolioPareto(base.pool,3)
  };
}
const comparison={};
for(const goal of ['arc','bc','rebuild']){
  const h=results.hybrid.goals[goal],w=results.wide.goals[goal],best=advisor.betterGoalRoute(w,h,goal);
  comparison[goal]={
    hybridNotWorse:planner.routeKey(best)===planner.routeKey(h),
    sameRoute:planner.routeKey(h)===planner.routeKey(w),
    hybrid:finalFacts(h),wide:finalFacts(w)
  };
}
for(const p of ['sp','speedCross','production','st','balance']){
  const h=results.hybrid.base.profiles[p]?.[0],w=results.wide.base.profiles[p]?.[0];
  comparison[p]={
    hybridNotWorse:planner.compareProfile(p)(h,w)<=0,
    sameRoute:planner.routeKey(h)===planner.routeKey(w),
    hybrid:finalFacts(h),wide:finalFacts(w)
  };
}
const hpf=portfolioFacts(results.hybrid.portfolio),wpf=portfolioFacts(results.wide.portfolio);
console.log(JSON.stringify({
  passed:true,method:'hybrid-vs-wide-fourth-generation',mare,
  thirdScanned:routes.length,thirdBases:b3.length,
  strategy:{official:128,speedCross:320,bridgeA:96,bridgeD:160},
  baseCounts:{hybrid:hybrid.length,wide:wide.length,union:all.length},
  fourthScannedUnion:scanned,
  comparison,
  portfolio:{hybrid:hpf,wide:wpf,sameTopRoute:JSON.stringify(hpf?.sires||[])===JSON.stringify(wpf?.sires||[])}
},null,2));
