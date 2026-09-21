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
const profiles=['sp','speedCross','production','st','balance'];
const axes=['sp','speedCross','production','st','balance','theory'];
const allMares=['スプリングスイーツ','エイスト','フィットレオタード','ミニミニデート','ワカヒルメ','ミムラス','エトワルセリータ','アマリン'];
const MARE_INDEX=process.env.MARE_INDEX==null?null:+process.env.MARE_INDEX;
if(MARE_INDEX!==null&&(MARE_INDEX<0||MARE_INDEX>=allMares.length))throw Error('invalid MARE_INDEX '+MARE_INDEX);
const mares=MARE_INDEX===null?allMares:[allMares[MARE_INDEX]];

function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set();
 for(let i=0;i<maxEach;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const key=planner.routeKey(r);if(!seen.has(key)){seen.add(key);out.push(r)}
 }
 return out;
}
function routeFacts(r){
 if(!r)return null;
 const f=advisor.routeFacts(r);
 return{
  sires:r.sires,
  sp:f.sp,st:f.st,pw:f.pw,spst:f.spst,
  speedCross:f.speedCross,speedCrossCount:f.speedCrossCount,
  materialSpeedCross:f.materialSpeedCross,materialSpeedCrossStages:f.materialSpeedCrossStages,
  longDistanceCross:f.longDistanceCross,materialLongCross:f.materialLongCross,materialLongCrossStages:f.materialLongCrossStages,
  record:f.record,stable:f.stable,guts:f.guts,maxD:f.maxD,distance2400:f.distance2400,
  interesting:f.interesting,magnificent:f.magnificent,perfect:f.perfect,elaborate:f.elaborate
 };
}
function firstRoutes(result){
 const out={};
 for(const p of profiles)out[p]=result.profiles?.[p]?.[0]||null;
 return out;
}
function transitionFacts(profile,a,b){
 if(!a||!b)return{better:!!b,reasons:b?['次世代候補が成立']:[]};
 const A=routeFacts(a),B=routeFacts(b),reasons=[];
 const better=planner.compareProfile(profile)(b,a)<0;
 if(profile==='sp'){
  if(B.sp>=A.sp+2)reasons.push('SP '+A.sp+'→'+B.sp);
  else if(B.sp>A.sp&&B.st>=A.st-1)reasons.push('SP '+A.sp+'→'+B.sp+'、STほぼ維持');
  if(!A.magnificent&&B.magnificent&&B.speedCross)reasons.push('見事×SPクロス追加');
 }
 if(profile==='speedCross'){
  if(B.sp>=A.sp+2)reasons.push('SP '+A.sp+'→'+B.sp);
  if(B.materialSpeedCrossStages>A.materialSpeedCrossStages)reasons.push('中間SP補強工程 '+A.materialSpeedCrossStages+'→'+B.materialSpeedCrossStages);
  if(B.speedCrossCount>A.speedCrossCount)reasons.push('最終SPクロス本数 '+A.speedCrossCount+'→'+B.speedCrossCount);
 }
 if(profile==='production'){
  const aLine=A.sp>=15&&A.st>=5,bLine=B.sp>=15&&B.st>=5,aElite=A.sp>=17&&A.st>=5,bElite=B.sp>=17&&B.st>=5;
  if(!aLine&&bLine)reasons.push('SP15/ST5へ到達');
  if(!aElite&&bElite)reasons.push('SP17/ST5へ到達');
  const grade=x=>x==='A'?3:x==='B'?2:x==='C'?1:0;
  if(grade(B.record)>grade(A.record)&&B.sp>=A.sp-1&&B.st>=A.st-1)reasons.push('父実績 '+A.record+'→'+B.record);
  if(!A.materialSpeedCross&&B.materialSpeedCross)reasons.push('中間SP補強経路を追加');
  if(B.sp>=A.sp+2&&B.st>=A.st-1)reasons.push('SP '+A.sp+'→'+B.sp+'、ST維持');
 }
 if(profile==='st'){
  if(B.st>=A.st+2&&B.sp>=A.sp-1)reasons.push('ST '+A.st+'→'+B.st+'、SP維持');
  if(!A.longDistanceCross&&B.longDistanceCross)reasons.push('最終長距離クロス追加');
  if(!A.materialLongCross&&B.materialLongCross)reasons.push('中間ST補強経路を追加');
  if(!A.distance2400&&B.distance2400&&B.sp>=A.sp-1)reasons.push('2400m根拠追加');
 }
 if(profile==='balance'){
  const aLine=A.sp>=15&&A.st>=5,bLine=B.sp>=15&&B.st>=5;
  if(!aLine&&bLine)reasons.push('SP15/ST5へ到達');
  if(B.spst>=A.spst+3&&B.sp>=A.sp-1&&B.st>=A.st-1)reasons.push('SP+ST '+A.spst+'→'+B.spst);
 }
 return{better,reasons};
}

const out=[];
for(const mare of mares){
 const c1=planner.createCollector({topN:3,poolN:24});
 const directAll=[];
 for(const r of planner.iterateDirect(mare)){c1.push(r);directAll.push(r)}
 const r1=c1.finish();

 const c2=planner.createCollector({topN:3,poolN:24});
 for(const r of planner.iterateTwo(mare))c2.push(r);
 const r2=c2.finish(),b3=previewBases(r2.shortlists,12);

 const c3=planner.createCollector({topN:3,poolN:18}),bridge=planner.createFourthBridgeCollector();
 for(const r of planner.iterateThirdPreview(mare,b3)){c3.push(r);bridge.push(r)}
 const r3=c3.finish(),b4=bridge.finish().bases;

 const c4=planner.createCollector({topN:3,poolN:16});
 for(const r of planner.iterateFourthPreview(mare,b4))c4.push(r);
 const r4=c4.finish();

 const gens={1:firstRoutes(r1),2:firstRoutes(r2),3:firstRoutes(r3),4:firstRoutes(r4)};
 const categories={};
 for(const p of profiles){
  const trans={
   '1to2':transitionFacts(p,gens[1][p],gens[2][p]),
   '2to3':transitionFacts(p,gens[2][p],gens[3][p]),
   '3to4':transitionFacts(p,gens[3][p],gens[4][p])
  };
  let latestMaterial=1;
  if(trans['1to2'].reasons.length)latestMaterial=2;
  if(trans['2to3'].reasons.length)latestMaterial=3;
  if(trans['3to4'].reasons.length)latestMaterial=4;
  categories[p]={
   label:planner.profileLabels[p],
   generations:{
    1:routeFacts(gens[1][p]),2:routeFacts(gens[2][p]),3:routeFacts(gens[3][p]),4:routeFacts(gens[4][p])
   },
   transitions:trans,
   latestMaterialGeneration:latestMaterial
  };
 }
 const portfolios={
  1:planner.portfolioPareto(directAll,3),
  2:planner.portfolioPareto(r2.pool,3),
  3:planner.portfolioPareto(r3.pool,3),
  4:planner.portfolioPareto(r4.pool,3)
 };
 const sireTrans={
  '1to2':advisor.portfolioUpgradeReasons(portfolios[1]?.routes?.[0]?.portfolio,portfolios[2]?.routes?.[0]?.portfolio),
  '2to3':advisor.portfolioUpgradeReasons(portfolios[2]?.routes?.[0]?.portfolio,portfolios[3]?.routes?.[0]?.portfolio),
  '3to4':advisor.portfolioUpgradeReasons(portfolios[3]?.routes?.[0]?.portfolio,portfolios[4]?.routes?.[0]?.portfolio)
 };
 let sireLatest=1;if(sireTrans['1to2'].length)sireLatest=2;if(sireTrans['2to3'].length)sireLatest=3;if(sireTrans['3to4'].length)sireLatest=4;
 categories.sire={label:planner.profileLabels.sire,transitions:sireTrans,latestMaterialGeneration:sireLatest};
 out.push({mare,assessment:advisor.mareAssessment(mare),categories,b3:b3.length,b4:b4.length});
}
const output={passed:true,method:'per-category-four-generation-future-potential',mareIndex:MARE_INDEX,out};
if(process.env.OUTPUT_FILE)fs.writeFileSync(process.env.OUTPUT_FILE,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
