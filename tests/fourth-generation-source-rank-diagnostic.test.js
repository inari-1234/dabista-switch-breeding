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

function previewBases(shortlists,maxEach=12){
  const out=[],seen=new Set();
  for(let i=0;i<maxEach;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function collect(iter,poolN){
  const c=planner.createCollector({topN:3,poolN});
  for(const r of iter)c.push(r);
  return c.finish();
}
function brief(r){
  if(!r)return null;
  const f=r.final||{},s=f.sireStats||{};
  return{
    sires:r.sires,sp:f.sp,st:f.st,pw:f.pw,record:s.record,stable:s.stable,maxD:s.maxD,
    speedCross:!!f.speedCross?.has,longCross:!!f.crossEffects?.longDistance,
    materialSpeed:r.materialSpeedCross?.stages||0,materialLong:r.materialLongCross?.stages||0,
    theory:f.theory,elaborate:f.elaborate,
    arcVector:advisor.goalVector(r,'arc'),
    bcVector:advisor.goalVector(r,'bc')
  };
}

const mare='エイスト';
const r2=collect(planner.iterateTwo(mare),24);
const b3=previewBases(r2.shortlists,12);
const c3=planner.createCollector({topN:3,poolN:600});
let scanned=0;
for(const r of planner.iterateThirdPreview(mare,b3)){c3.push(r);scanned++}
const r3=c3.finish();

const targets={
  arc240:['グランプリボス','ストラヴィンスキー','スペシャルウィーク'],
  bc240:['グランプリボス','ロードアルティマ','ディープスカイ'],
  arc176:['グランプリボス','ストラヴィンスキー','サクラプレジデント'],
  bc176:['アドマイヤムーン','ワイルドラッシュ','グランプリボス'],
  bc480:['グランプリボス','ワイルドラッシュ','ダンスインザダーク'],
  st320:['キンシャサノキセキ','エスケンデレヤ','スペシャルウィーク']
};
const output={};
for(const [name,sires] of Object.entries(targets)){
  const key=sires.join('>');
  const positions={};
  let route=null;
  for(const axis of axes){
    const list=r3.shortlists[axis]||[];
    const idx=list.findIndex(r=>planner.routeKey(r)===key);
    positions[axis]=idx<0?null:idx+1;
    if(idx>=0&&!route)route=list[idx];
  }
  output[name]={key,positions,bestRank:Math.min(...Object.values(positions).filter(Number.isFinite),Infinity),route:brief(route)};
}
console.log(JSON.stringify({passed:true,method:'fourth-source-rank-diagnostic',mare,scanned,thirdBases:b3.length,pool:r3.pool.length,targets:output},null,2));
