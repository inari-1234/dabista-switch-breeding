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
  const arc=advisor.emptySummary('arc'),bc=advisor.emptySummary('bc');
  for(const r of iter){c.push(r);advisor.addRoute(arc,r,'arc');advisor.addRoute(bc,r,'bc')}
  const out=c.finish();out.goalBest={arc:arc.bestRoute,bc:bc.bestRoute};return out;
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
function cmpVec(A,B){
  for(let i=0;i<Math.max(A.length,B.length);i++){const a=A[i]||0,b=B[i]||0;if(a!==b)return b-a}
  return 0;
}
function rankRoutes(routes,fn){
  return routes.map((r,i)=>({r,i,f:bridgeFacts(r)})).sort((a,b)=>cmpVec(fn(a.f),fn(b.f))||a.i-b.i).map(x=>x.r);
}
function unionBases(...lists){
  const out=[],seen=new Set();
  for(const list of lists)for(const r of list||[]){
    const k=planner.routeKey(r);if(seen.has(k))continue;seen.add(k);out.push(r);
  }
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
function snapshot(result){
  return{
    count:result.count,pool:result.pool.length,
    arc:finalFacts(result.goalBest.arc),bc:finalFacts(result.goalBest.bc),
    production:finalFacts(result.profiles.production?.[0]),
    sp:finalFacts(result.profiles.sp?.[0]),
    st:finalFacts(result.profiles.st?.[0]),
    balance:finalFacts(result.profiles.balance?.[0])
  };
}

const reference={
  arc:['グランプリボス','ストラヴィンスキー','スペシャルウィーク','ワイルドラッシュ'],
  bc:['グランプリボス','ワイルドラッシュ','ダンスインザダーク','ストラヴィンスキー'],
  production:['グランプリボス','ストラヴィンスキー','アグネスデジタル','ステイゴールド'],
  sp:['グランプリボス','ワイルドラッシュ','ヴァンセンヌ','ロードアルティマ'],
  st:['キンシャサノキセキ','エスケンデレヤ','スペシャルウィーク','フリオーソ'],
  balance:['グランプリボス','ストラヴィンスキー','スペシャルウィーク','ワイルドラッシュ']
};
const mare='エイスト',widths=[64,96,128,160,192];
const r2=collect(planner.iterateTwo(mare),24);
const b3=previewBases(r2.shortlists,12);
const c3=planner.createCollector({topN:3,poolN:24});
const routes=[];for(const r of planner.iterateThirdPreview(mare,b3)){c3.push(r);routes.push(r)}
const generic=c3.finish().pool,rankA=rankRoutes(routes,vectorA),rankD=rankRoutes(routes,vectorD);

const referenceSourceRanks={};
for(const [axis,sires] of Object.entries(reference)){
  const sourceKey=sires.slice(0,-1).join('>');
  const src=routes.find(r=>planner.routeKey(r)===sourceKey);
  if(!src){referenceSourceRanks[axis]={sourceKey,found:false};continue}
  const official={};
  for(const p of axes){
    const eligible=p!=='speedCross'||src?.final?.speedCross?.has;
    official[p]=eligible?(routes.filter(r=>p!=='speedCross'||r?.final?.speedCross?.has).sort(planner.compareProfile(p)).findIndex(r=>planner.routeKey(r)===sourceKey)+1):null;
  }
  referenceSourceRanks[axis]={
    sourceKey,found:true,
    vectorA:rankA.findIndex(r=>planner.routeKey(r)===sourceKey)+1,
    vectorD:rankD.findIndex(r=>planner.routeKey(r)===sourceKey)+1,
    official,
    facts:bridgeFacts(src)
  };
}
const baseMap={};
for(const n of widths)baseMap[n]=unionBases(generic,rankA.slice(0,n),rankD.slice(0,n));
const max=widths[widths.length-1],maxBases=baseMap[max],sets=new Map(widths.map(n=>[n,new Set(baseMap[n].map(r=>planner.routeKey(r)))]));
const states=new Map(widths.map(n=>[n,{c:planner.createCollector({topN:3,poolN:120}),arc:advisor.emptySummary('arc'),bc:advisor.emptySummary('bc')}]));
let scanned=0;
for(const r of planner.iterateFourthPreview(mare,maxBases)){
  scanned++;
  const key=planner.routeKey({sires:r.sires.slice(0,-1)});
  for(const n of widths){
    if(!sets.get(n).has(key))continue;
    const s=states.get(n);s.c.push(r);advisor.addRoute(s.arc,r,'arc');advisor.addRoute(s.bc,r,'bc');
  }
}
const variants={};
for(const n of widths){
  const s=states.get(n),res=s.c.finish();res.goalBest={arc:s.arc.bestRoute,bc:s.bc.bestRoute};
  const snap=snapshot(res),matches={};
  for(const axis of Object.keys(reference))matches[axis]=JSON.stringify(snap[axis]?.sires||[])===JSON.stringify(reference[axis]);
  variants[n]={baseCount:baseMap[n].length,result:snap,matchesReference:matches,allReferenceAxes:Object.values(matches).every(Boolean)};
}
console.log(JSON.stringify({passed:true,method:'bridge-strategy-diagnostic',mare,thirdScanned:routes.length,thirdBases:b3.length,genericBases:generic.length,scannedLargest:scanned,widths,referenceSourceRanks,variants},null,2));
