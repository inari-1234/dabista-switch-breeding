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

const mare='エイスト',first='グランプリボス';
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
function facts(r){return advisor.routeFacts(r)}
function categoryReasons(profile,aRoute,bRoute){
 if(!aRoute||!bRoute)return bRoute?['次世代候補が成立']:[];
 const A=facts(aRoute),B=facts(bRoute),reasons=[];
 if(profile==='sp'){
  if(B.sp>=A.sp+2)reasons.push('SP '+A.sp+'→'+B.sp);
  else if(B.sp>A.sp&&B.st>=A.st-1)reasons.push('SP '+A.sp+'→'+B.sp+'、STほぼ維持');
  if(!A.magnificent&&B.magnificent&&B.speedCross&&B.sp>=A.sp-1)reasons.push('見事×SPクロス追加');
 }
 if(profile==='speedCross'){
  if(!A.speedCross&&B.speedCross&&B.sp>=A.sp-1)reasons.push('最終SPクロス追加');
  if(B.sp>=A.sp+2)reasons.push('SP '+A.sp+'→'+B.sp);
  if(B.materialSpeedCrossStages>A.materialSpeedCrossStages)reasons.push('中間SP補強工程 '+A.materialSpeedCrossStages+'→'+B.materialSpeedCrossStages);
  if(B.speedCrossCount>A.speedCrossCount)reasons.push('最終SPクロス本数 '+A.speedCrossCount+'→'+B.speedCrossCount);
 }
 if(profile==='production'){
  const aLine=A.sp>=15&&A.st>=5,bLine=B.sp>=15&&B.st>=5,aElite=A.sp>=17&&A.st>=5,bElite=B.sp>=17&&B.st>=5;
  if(!aLine&&bLine)reasons.push('SP15/ST5へ到達');
  if(!aElite&&bElite)reasons.push('SP17/ST5へ到達');
  if(B.recordGrade>A.recordGrade&&B.sp>=A.sp-1&&B.st>=A.st-1)reasons.push('父実績 '+A.record+'→'+B.record);
  if(!A.materialSpeedCross&&B.materialSpeedCross)reasons.push('中間SP補強経路を追加');
  if(B.sp>=A.sp+2&&B.st>=A.st-1)reasons.push('SP '+A.sp+'→'+B.sp+'、ST維持');
 }
 if(profile==='st'){
  if(B.st>=A.st+2&&B.sp>=A.sp-1)reasons.push('ST '+A.st+'→'+B.st+'、SP維持');
  if(!A.longDistanceCross&&B.longDistanceCross&&B.sp>=A.sp-1)reasons.push('最終長距離クロス追加');
  if(!A.materialLongCross&&B.materialLongCross&&B.sp>=A.sp-1)reasons.push('中間ST補強経路を追加');
  if(!A.distance2400&&B.distance2400&&B.sp>=A.sp-1)reasons.push('2400m根拠追加');
 }
 if(profile==='balance'){
  const aLine=A.sp>=15&&A.st>=5,bLine=B.sp>=15&&B.st>=5;
  if(!aLine&&bLine)reasons.push('SP15/ST5へ到達');
  if(B.spst>=A.spst+3&&B.sp>=A.sp-1&&B.st>=A.st-1)reasons.push('SP+ST '+A.spst+'→'+B.spst);
 }
 return reasons;
}
function classifyTransition(profile,a,b){
 if(!a||!b)return{kind:b?'material':'none',reasons:b?['次世代候補が成立']:[]};
 const cmp=planner.compareProfile(profile)(b,a);
 const reasons=categoryReasons(profile,a,b);
 if(cmp<0&&reasons.length)return{kind:'material',reasons};
 if(cmp<0)return{kind:'minor',reasons:[]};
 if(reasons.length)return{kind:'tradeoff',reasons};
 return{kind:'none',reasons:[]};
}

const direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first);
const c2=planner.createCollector({topN:3,poolN:6});
for(const r of planner.iterateTwo(mare))if(r.sires[0]===first)c2.push(r);
const r2=c2.finish(),b3=bases(r2.shortlists,1);
const c3=planner.createCollector({topN:3,poolN:6});
for(const r of planner.iterateThirdPreview(mare,b3))c3.push(r);
const r3=c3.finish(),b4=bases(r3.shortlists,1);
const c4=planner.createCollector({topN:3,poolN:6});
for(const r of planner.iterateFourthPreview(mare,b4))c4.push(r);
const r4=c4.finish();

const generations={
 1:{profiles:Object.fromEntries(profiles.map(p=>[p,direct])),pool:[direct]},
 2:{profiles:Object.fromEntries(profiles.map(p=>[p,r2.profiles?.[p]?.[0]||null])),pool:r2.pool},
 3:{profiles:Object.fromEntries(profiles.map(p=>[p,r3.profiles?.[p]?.[0]||null])),pool:r3.pool},
 4:{profiles:Object.fromEntries(profiles.map(p=>[p,r4.profiles?.[p]?.[0]||null])),pool:r4.pool}
};

const categories={};
for(const p of profiles){
 let chosen=generations[1].profiles[p],latest=1;
 const transitions=[];
 for(let g=2;g<=4;g++){
  const next=generations[g].profiles[p],q=classifyTransition(p,chosen,next);
  transitions.push({to:g,...q});
  if(q.kind==='material'){chosen=next;latest=g}
 }
 categories[p]={
  label:planner.profileLabels[p],
  latestMaterialGeneration:latest,
  state:latest===1?'early-complete':latest===2?'improves-to-2':latest===3?'improves-to-3-conditional':'improves-to-4-conditional',
  transitions,
  selected:chosen?{sires:chosen.sires,facts:facts(chosen)}:null
 };
}

const portfolios={};
for(let g=1;g<=4;g++)portfolios[g]=planner.portfolioPareto(generations[g].pool,3);
let sireLatest=1,sireChosen=portfolios[1]?.routes?.[0]?.portfolio||null;
const sireTransitions=[];
for(let g=2;g<=4;g++){
 const next=portfolios[g]?.routes?.[0]?.portfolio||null;
 const reasons=advisor.portfolioUpgradeReasons(sireChosen,next);
 const material=reasons.length>0;
 sireTransitions.push({to:g,kind:material?'material':'none',reasons});
 if(material){sireLatest=g;sireChosen=next}
}
categories.sire={
 label:planner.profileLabels.sire,
 latestMaterialGeneration:sireLatest,
 state:sireLatest===1?'early-complete':sireLatest===2?'improves-to-2':sireLatest===3?'improves-to-3-conditional':'improves-to-4-conditional',
 transitions:sireTransitions,
 selected:sireChosen
};

if(Object.keys(categories).length!==6)throw Error('six categories required');
console.log(JSON.stringify({passed:true,mare,first,categories},null,2));
