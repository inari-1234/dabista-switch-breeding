'use strict';
const fs=require('fs');
const path=require('path');
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

const SHARD_COUNT=Math.max(1,+process.env.SHARD_COUNT||1);
const SHARD_INDEX=Math.max(0,+process.env.SHARD_INDEX||0);
if(SHARD_INDEX>=SHARD_COUNT)throw Error('invalid shard '+SHARD_INDEX+'/'+SHARD_COUNT);
const mares=M.filter((_,i)=>i%SHARD_COUNT===SHARD_INDEX);

function abilityBand(a){
  if(!a?.abilityKnown)return 'unknown';
  const p=a.ranks.spst.topPercent;
  if(p<=15)return 'high';
  if(p<=60)return 'middle';
  return 'low';
}
function routeEvidenceFromFacts(f,goal){
  const speedPath=!!(f.speedCross||f.materialSpeedCross);
  if(goal==='arc'){
    return{
      qualified:f.sp>=14&&f.st>=6,
      strong:f.sp>=15&&f.st>=6,
      supported:f.sp>=15&&f.st>=6&&f.recordBPlus&&f.distanceEvidence>0
    };
  }
  if(goal==='bc'){
    return{
      qualified:f.sp>=17&&f.st>=5&&speedPath,
      strong:f.sp>=18&&f.st>=5&&speedPath,
      supported:f.sp>=18&&f.st>=5&&speedPath&&f.recordBPlus
    };
  }
  return{
    qualified:f.sp>=15&&f.st>=5,
    strong:f.sp>=15&&f.st>=5,
    supported:f.sp>=15&&f.st>=5
  };
}
function emptyGoal(){return{qualified:0,strong:0,supported:0,best:null}}
function addGoal(bucket,route,facts,goal){
  const e=routeEvidenceFromFacts(facts,goal);
  if(e.qualified)bucket.qualified++;
  if(e.strong)bucket.strong++;
  if(e.supported)bucket.supported++;
  bucket.best=advisor.betterGoalRoute(bucket.best,route,goal);
}
function statusFor(direct,two,goal,assessment){
  const reasons=advisor.materialUpgradeReasons(direct.best,two.best,goal,assessment);
  if(direct.supported>0)return{status:'direct-supported',upgrade:reasons};
  if(direct.strong>0||direct.qualified>0)return{status:'direct-conditional',upgrade:reasons};
  if(reasons.length&&two.supported>0)return{status:'two-supported',upgrade:reasons};
  if(reasons.length&&(two.strong>0||two.qualified>0))return{status:'two-conditional',upgrade:reasons};
  if(two.supported>0||two.strong>0||two.qualified>0)return{status:'two-possible',upgrade:reasons};
  return{status:'difficult-2gen',upgrade:reasons};
}
function bump(obj,a,b){obj[a]??={};obj[a][b]=(obj[a][b]||0)+1}
function samplePush(samples,key,item,limit=4){samples[key]??=[];if(samples[key].length<limit)samples[key].push(item)}

const started=Date.now();
const matrix={arc:{},bc:{},rebuild:{}};
const samples={};
const rows=[];
let twoRoutes=0;
for(let mi=0;mi<mares.length;mi++){
  const m=mares[mi];
  const a=advisor.mareAssessment(m.name);
  const band=abilityBand(a);
  const direct={arc:emptyGoal(),bc:emptyGoal(),rebuild:emptyGoal()};
  for(const r of planner.iterateDirect(m.name)){
    const facts=advisor.routeFacts(r);
    for(const g of ['arc','bc','rebuild'])addGoal(direct[g],r,facts,g);
  }
  const two={arc:emptyGoal(),bc:emptyGoal(),rebuild:emptyGoal()};
  for(const r of planner.iterateTwo(m.name)){
    twoRoutes++;
    const facts=advisor.routeFacts(r);
    for(const g of ['arc','bc','rebuild'])addGoal(two[g],r,facts,g);
  }
  const goalRows={};
  for(const g of ['arc','bc','rebuild']){
    const s=statusFor(direct[g],two[g],g,a);
    bump(matrix[g],band,s.status);
    goalRows[g]={
      status:s.status,
      upgrade:s.upgrade,
      direct:{qualified:direct[g].qualified,strong:direct[g].strong,supported:direct[g].supported,best:advisor.routeFacts(direct[g].best)},
      two:{qualified:two[g].qualified,strong:two[g].strong,supported:two[g].supported,best:advisor.routeFacts(two[g].best)}
    };
    samplePush(samples,band+'|'+g+'|'+s.status,{mare:m.name,tier:a?.tier||'未判明',spstPct:a?.ranks?.spst?.topPercent??null});
  }
  rows.push({mare:m.name,band,tier:a?.tier||'未判明',spstPct:a?.ranks?.spst?.topPercent??null,strategy:advisor.mareStrategy(m.name)?.label||'',goals:goalRows});
  if((mi+1)%10===0||mi===mares.length-1)console.error('progress shard '+SHARD_INDEX+': '+(mi+1)+'/'+mares.length);
}
const byName=Object.fromEntries(rows.map(x=>[x.mare,x]));
const focusNames=['スプリングスイーツ','エイスト','フィットレオタード','ミニミニデート','ワカヒルメ','ミムラス','エトワルセリータ','アマリン'];
const focus={};
for(const n of focusNames)if(byName[n])focus[n]=byName[n];

if(SHARD_COUNT===1){
  if(rows.length!==331)throw Error('mare count '+rows.length);
  if(rows.filter(x=>x.band==='unknown').length!==33)throw Error('unknown count');
}
if(focus['アマリン']&&focus['アマリン'].band!=='unknown')throw Error('unknown mare misclassified');
if(focus['エイスト']&&focus['エイスト'].band!=='high')throw Error('Eist ability band');
if(focus['フィットレオタード']&&focus['フィットレオタード'].band!=='middle')throw Error('Fit ability band');
if(focus['ワカヒルメ']&&focus['ワカヒルメ'].band!=='low')throw Error('Wakahirume ability band');
if(focus['ミムラス']&&(focus['ミムラス'].band!=='low'||focus['ミムラス'].goals.arc.status!=='direct-supported'))throw Error('low-ability/high-pedigree edge case');
if(focus['エトワルセリータ']&&(focus['エトワルセリータ'].band!=='high'||!focus['エトワルセリータ'].goals.arc.status.startsWith('two-')))throw Error('high-ability/staged edge case');

const output={
  passed:true,
  method:'ability-band-x-exact-direct-and-two-generation-future-potential',
  shard:{index:SHARD_INDEX,count:SHARD_COUNT},
  rules:{
    ability:'high=SP+ST top15%, middle=top16-60%, low=below60%, unknown kept separate',
    arc:'SP14/ST6 qualified, SP15/ST6 strong; supported additionally requires sire record B+ and distance evidence. Speed cross is not a hard Arc gate.',
    bc:'SP17/ST5 + effective SP support qualified; SP18/ST5 strong; supported additionally requires sire record B+.',
    rebuild:'SP15/ST5 used only as a reconstruction reference line.',
    staging:'two-generation labels require an actual materialUpgradeReasons improvement when direct generation has no qualifying route.',
    caution:'This diagnostic does not convert the matrix into a single numeric score.'
  },
  totals:{mares:rows.length,known:rows.filter(x=>x.band!=='unknown').length,unknown:rows.filter(x=>x.band==='unknown').length,twoRoutes,runtimeMs:Date.now()-started},
  matrix,focus,samples
};
const outFile=process.env.OUTPUT_FILE;
if(outFile)fs.writeFileSync(outFile,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
