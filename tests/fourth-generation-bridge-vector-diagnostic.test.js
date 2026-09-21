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
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const axes=['sp','speedCross','production','st','balance','theory'];
const grade=v=>v==='A'?3:v==='B'?2:v==='C'?1:0;
const val=x=>Number.isFinite(+x)?+x:0;

function previewBases(shortlists,maxEach=12){
  const out=[],seen=new Set();
  for(let i=0;i<maxEach;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function collect(iter,poolN=24){
  const c=planner.createCollector({topN:3,poolN});for(const r of iter)c.push(r);return c.finish();
}
function facts(r){
  const f=r.final||{},s=f.sireStats||{},t=f.theory||{},ce=f.crossEffects||{};
  const speed=!!f.speedCross?.has||!!r.materialSpeedCross?.has;
  const long=!!ce.longDistance||!!r.materialLongCross?.has;
  return{
    sp:val(f.sp),st:val(f.st),pw:val(f.pw),sum:val(f.sp)+val(f.st),
    record:grade(s.record),stable:s.stable==='C'?3:s.stable==='B'?2:s.stable==='A'?1:0,
    maxD:val(s.maxD),speed: speed?1:0,long:long?1:0,
    elaborate:f.elaborate?1:0,interesting:t.interesting?1:0,magnificent:t.magnificent?1:0,perfect:t.perfect?1:0,
    crossCount:val(f.speedCross?.count)+val(r.materialSpeedCross?.stages)
  };
}
function cmpVec(A,B){
  for(let i=0;i<Math.max(A.length,B.length);i++){const a=A[i]||0,b=B[i]||0;if(a!==b)return b-a}
  return 0;
}
const vectors={
  bridgeA:x=>[x.speed,x.record,x.elaborate,x.magnificent,x.sum,x.st,x.sp,x.long,x.crossCount,x.stable],
  bridgeB:x=>[x.record,x.speed,x.elaborate,x.sum,x.st,x.sp,x.long,x.crossCount,x.stable],
  bridgeC:x=>[x.speed,x.elaborate,x.record,x.sum,x.st,x.sp,x.long,x.crossCount,x.stable],
  bridgeD:x=>[x.speed,x.record,x.sum,x.elaborate,x.st,x.sp,x.long,x.crossCount,x.stable],
  bridgeE:x=>[x.record,x.elaborate,x.speed,x.sum,x.st,x.sp,x.long,x.crossCount,x.stable],
  bridgeBalance:x=>[x.sum,Math.min(x.sp,x.st),x.record,x.speed,x.elaborate,x.st,x.sp,x.long,x.stable]
};

const mare='エイスト';
const r2=collect(planner.iterateTwo(mare),24),b3=previewBases(r2.shortlists,12);
const routes=[...planner.iterateThirdPreview(mare,b3)];
const targets={
  arc240:'グランプリボス>ストラヴィンスキー>スペシャルウィーク',
  bc480:'グランプリボス>ワイルドラッシュ>ダンスインザダーク',
  st320:'キンシャサノキセキ>エスケンデレヤ>スペシャルウィーク'
};
const out={};
for(const [vname,vfn] of Object.entries(vectors)){
  const ranked=routes.map((r,i)=>({r,i,f:facts(r)})).sort((a,b)=>cmpVec(vfn(a.f),vfn(b.f))||a.i-b.i);
  out[vname]={};
  for(const [tname,key] of Object.entries(targets)){
    const idx=ranked.findIndex(x=>planner.routeKey(x.r)===key);
    out[vname][tname]={rank:idx<0?null:idx+1,vector:idx<0?null:vfn(ranked[idx].f),facts:idx<0?null:ranked[idx].f};
  }
}
console.log(JSON.stringify({passed:true,method:'bridge-vector-diagnostic',mare,scanned:routes.length,thirdBases:b3.length,vectors:out},null,2));
