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
function bridgeFacts(r){
 const f=r.final||{},s=f.sireStats||{},t=f.theory||{},ce=f.crossEffects||{};
 return{
  sp:val(f.sp),st:val(f.st),pw:val(f.pw),sum:val(f.sp)+val(f.st),
  record:grade(s.record),stable:s.stable==='C'?3:s.stable==='B'?2:s.stable==='A'?1:0,
  maxD:val(s.maxD),speed:(f.speedCross?.has||r.materialSpeedCross?.has)?1:0,
  finalSpeed:f.speedCross?.has?1:0,materialSpeed:val(r.materialSpeedCross?.stages),
  long:(ce.longDistance||r.materialLongCross?.has)?1:0,
  elaborate:f.elaborate?1:0,interesting:t.interesting?1:0,magnificent:t.magnificent?1:0,
  crossCount:val(f.speedCross?.count)+val(r.materialSpeedCross?.stages)
 };
}
const vecs={
 A:x=>[x.speed,x.record,x.elaborate,x.magnificent,x.sum,x.st,x.sp,x.long,x.crossCount,x.stable],
 D:x=>[x.speed,x.record,x.sum,x.elaborate,x.st,x.sp,x.long,x.crossCount,x.stable],
 S:x=>[x.sp,x.speed,x.st,x.elaborate,x.record,x.pw,x.crossCount,x.stable],
 X:x=>[x.speed,x.sp,x.st,x.record,x.elaborate,x.crossCount,x.materialSpeed,x.stable],
 B:x=>[x.speed,x.record,x.sp,x.st,x.pw,x.stable,x.elaborate,x.crossCount]
};
function cmpVec(A,B){for(let i=0;i<Math.max(A.length,B.length);i++){const a=A[i]||0,b=B[i]||0;if(a!==b)return b-a}return 0}
function rank(routes,fn){return routes.map((r,i)=>({r,i,f:bridgeFacts(r)})).sort((a,b)=>cmpVec(fn(a.f),fn(b.f))||a.i-b.i).map(x=>x.r)}

const targets={
 'スプリングスイーツ':{
  sp:['グランプリボス','ハードスパン','ヴァンセンヌ'],
  speedCross:['グランプリボス','ロードアルティマ','ディープスカイ']
 },
 'フィットレオタード':{
  bc:['ビッグアーサー','ストラヴィンスキー','フサイチセブン'],
  sp:['ビッグアーサー','ワイルドラッシュ','ヴァンセンヌ']
 },
 'エイスト':{
  speedCross:['グランプリボス','ロードアルティマ','ディープスカイ']
 },
 'ミニミニデート':{
  bc:['ストラヴィンスキー','グランプリボス','フサイチセブン'],
  sp:['グランプリボス','ハードスパン','ヴァンセンヌ']
 }
};
const output=[];
for(const [mare,need] of Object.entries(targets)){
 const c2=planner.createCollector({topN:3,poolN:24});
 for(const r of planner.iterateTwo(mare))c2.push(r);
 const b3=previewBases(c2.finish().shortlists,12);
 const routes=[...planner.iterateThirdPreview(mare,b3)];
 const official={};
 for(const p of axes){
  official[p]=routes.filter(r=>{
   if(p==='speedCross'&&!r?.final?.speedCross?.has)return false;
   if(p==='production'&&!r?.final?.speedCross?.has&&!r?.materialSpeedCross?.has)return false;
   return true;
  }).sort(planner.compareProfile(p));
 }
 const ranked={};for(const [k,fn] of Object.entries(vecs))ranked[k]=rank(routes,fn);
 const found={};
 for(const [axis,sires] of Object.entries(need)){
  const key=sires.join('>'),r=routes.find(x=>planner.routeKey(x)===key);
  const off={};for(const p of axes){const i=official[p].findIndex(x=>planner.routeKey(x)===key);off[p]=i>=0?i+1:null}
  const custom={};for(const k of Object.keys(ranked)){const i=ranked[k].findIndex(x=>planner.routeKey(x)===key);custom[k]=i>=0?i+1:null}
  found[axis]={key,found:!!r,facts:r?bridgeFacts(r):null,official:off,custom};
 }
 output.push({mare,thirdScanned:routes.length,thirdBases:b3.length,targets:found});
}
console.log(JSON.stringify({passed:true,method:'missing-fourth-bridge-ranks',output},null,2));
