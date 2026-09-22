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
      supported:f.sp>=17&&f.st>=5&&speedPath&&f.recordBPlus
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
const preferredMatrix={arc:{},bc:{},rebuild:{}};
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
    const rec=advisor.recommendGeneration({
      goal:g,assessment:a,
      generations:{
        1:{summary:{bestRoute:direct[g].best}},
        2:{summary:{bestRoute:two[g].best}}
      }
    });
    const preferredBucket=rec.generation===2?two[g]:direct[g];
    const preferredStage=preferredBucket.qualified>0?(rec.generation===2?'two':'direct'):'difficult';
    bump(preferredMatrix[g],band,preferredStage);
    const directFreedom=g==='rebuild'&&direct[g].best?planner.broodmareFreedom(direct[g].best.finalChild):null;
    const twoFreedom=g==='rebuild'&&two[g].best?planner.broodmareFreedom(two[g].best.finalChild):null;
    goalRows[g]={
      status:s.status,
      recommendedGeneration:rec.generation,
      preferredStage,
      recommendationReasons:rec.reasons,
      upgrade:s.upgrade,
      direct:{qualified:direct[g].qualified,strong:direct[g].strong,supported:direct[g].supported,best:advisor.routeFacts(direct[g].best),freedom:directFreedom},
      two:{qualified:two[g].qualified,strong:two[g].strong,supported:two[g].supported,best:advisor.routeFacts(two[g].best),freedom:twoFreedom}
    };
    samplePush(samples,band+'|'+g+'|'+s.status,{mare:m.name,tier:a?.tier||'未判明',spstPct:a?.ranks?.spst?.topPercent??null});
  }
  rows.push({mare:m.name,band,tier:a?.tier||'未判明',spstPct:a?.ranks?.spst?.topPercent??null,strategy:advisor.mareStrategy(m.name)?.label||'',goals:goalRows});
  if((mi+1)%10===0||mi===mares.length-1)console.error('progress shard '+SHARD_INDEX+': '+(mi+1)+'/'+mares.length);
}
function transitionTradeoff(goal,row){
  const g=row?.goals?.[goal],a=g?.direct?.best,b=g?.two?.best;
  if(!g||g.recommendedGeneration!==2||!a||!b)return null;
  const speedA=!!(a.speedCross||a.materialSpeedCross),speedB=!!(b.speedCross||b.materialSpeedCross);
  const longA=!!(a.longDistanceCross||a.materialLongCross),longB=!!(b.longDistanceCross||b.materialLongCross);
  const theoryA=!!(a.magnificent||a.perfect||a.elaborate),theoryB=!!(b.magnificent||b.perfect||b.elaborate);
  const recordDrop=Math.max(0,(a.recordGrade||0)-(b.recordGrade||0));
  const signals={};
  if(goal==='bc'){
    const aq=a.sp>=17&&a.st>=5&&speedA,bq=b.sp>=17&&b.st>=5&&speedB;
    const as=a.sp>=18&&a.st>=5&&speedA,bs=b.sp>=18&&b.st>=5&&speedB;
    signals.qualityGain=(!aq&&bq)||(aq&&!as&&bs);
    signals.spAxisGain=b.sp>=a.sp+2&&b.st>=a.st-1;
    signals.speedSupportGain=(!speedA&&speedB)||(b.materialSpeedCrossStages||0)>(a.materialSpeedCrossStages||0)||(b.speedCrossCount||0)>(a.speedCrossCount||0);
    signals.theoryGain=!theoryA&&theoryB&&b.sp>=a.sp-1&&b.st>=a.st-1;
  }else{
    const aq=a.sp>=15&&a.st>=5,bq=b.sp>=15&&b.st>=5;
    signals.qualityGain=!aq&&bq;
    signals.spstGain=b.spst>=a.spst+3&&b.sp>=a.sp-1&&b.st>=a.st-1;
    signals.speedSupportGain=(!speedA&&speedB)||(b.materialSpeedCrossStages||0)>(a.materialSpeedCrossStages||0);
    signals.longSupportGain=(!longA&&longB)||(b.materialLongCrossStages||0)>(a.materialLongCrossStages||0);
    signals.theoryGain=!theoryA&&theoryB&&b.spst>=a.spst-1;
  }
  const compensationCount=Object.values(signals).filter(Boolean).length;
  const requiredSignals=recordDrop>=2?3:recordDrop===1?2:0;
  return{
    recordDrop,requiredSignals,compensationCount,
    trialAllowed:recordDrop===0||compensationCount>=requiredSignals,
    lostSpeedSupport:speedA&&!speedB,
    lostLongSupport:longA&&!longB,
    lostTheory:theoryA&&!theoryB,
    signals,a,b
  };
}
function summarizeTradeoffs(goal){
  const out={twoRecommended:0,recordDrop1:0,recordDrop2Plus:0,wouldBlockTrialGate:0,lostSpeedSupport:0,lostLongSupport:0,lostTheory:0,byBand:{},samples:[]};
  for(const row of rows){
    const t=transitionTradeoff(goal,row);if(!t)continue;
    out.twoRecommended++;
    const band=row.band||'unknown';out.byBand[band]??={twoRecommended:0,recordDrop:0,wouldBlockTrialGate:0};
    out.byBand[band].twoRecommended++;
    if(t.recordDrop===1){out.recordDrop1++;out.byBand[band].recordDrop++}
    if(t.recordDrop>=2){out.recordDrop2Plus++;out.byBand[band].recordDrop++}
    if(!t.trialAllowed){out.wouldBlockTrialGate++;out.byBand[band].wouldBlockTrialGate++}
    if(t.lostSpeedSupport)out.lostSpeedSupport++;
    if(t.lostLongSupport)out.lostLongSupport++;
    if(t.lostTheory)out.lostTheory++;
    if((t.recordDrop>0||!t.trialAllowed)&&out.samples.length<8)out.samples.push({
      mare:row.mare,band:row.band,record:t.a.record+'→'+t.b.record,
      sp:t.a.sp+'→'+t.b.sp,st:t.a.st+'→'+t.b.st,
      compensationCount:t.compensationCount,requiredSignals:t.requiredSignals,
      trialAllowed:t.trialAllowed,signals:t.signals
    });
  }
  return out;
}
const tradeoffs={bc:summarizeTradeoffs('bc'),rebuild:summarizeTradeoffs('rebuild')};

function summarizeRebuildFreedom(){
  const out={
    twoRecommended:0,directRecommended:0,
    twoLosesSafe5:0,twoLosesSp15:0,twoLosesSpeedQualified:0,twoLosesTheory:0,
    directMissesSafe5Gain:0,directMissesSp15Gain4:0,directMissesSpeedQualifiedGain3:0,directMissesTheoryGain2:0,
    samples:{twoLoss:[],directMiss:[]}
  };
  for(const row of rows){
    const g=row.goals?.rebuild,a=g?.direct?.freedom,b=g?.two?.freedom;
    if(!a||!b)continue;
    const theoryA=(a.magnificent||0)+(a.perfect||0)+(a.elaborate||0);
    const theoryB=(b.magnificent||0)+(b.perfect||0)+(b.elaborate||0);
    const delta={
      safe:(b.safe||0)-(a.safe||0),
      sp15:(b.sp15st5||0)-(a.sp15st5||0),
      sp17:(b.sp17st5||0)-(a.sp17st5||0),
      speedQualified:(b.speedQualified||0)-(a.speedQualified||0),
      longQualified:(b.longQualified||0)-(a.longQualified||0),
      magnificent:(b.magnificent||0)-(a.magnificent||0),
      perfect:(b.perfect||0)-(a.perfect||0),
      elaborate:(b.elaborate||0)-(a.elaborate||0),
      theory:theoryB-theoryA
    };
    if(g.recommendedGeneration===2){
      out.twoRecommended++;
      if(delta.safe<=-5)out.twoLosesSafe5++;
      if(delta.sp15<0)out.twoLosesSp15++;
      if(delta.speedQualified<0)out.twoLosesSpeedQualified++;
      if(delta.theory<0)out.twoLosesTheory++;
      if((delta.safe<=-5||delta.sp15<0||delta.speedQualified<0||delta.theory<0)&&out.samples.twoLoss.length<12){
        out.samples.twoLoss.push({mare:row.mare,band:row.band,delta,direct:a,two:b});
      }
    }else{
      out.directRecommended++;
      const safeGain=delta.safe>=5,sp15Gain=delta.sp15>=4,speedGain=delta.speedQualified>=3,theoryGain=delta.theory>=2;
      if(safeGain)out.directMissesSafe5Gain++;
      if(sp15Gain)out.directMissesSp15Gain4++;
      if(speedGain)out.directMissesSpeedQualifiedGain3++;
      if(theoryGain)out.directMissesTheoryGain2++;
      if((safeGain||sp15Gain||speedGain||theoryGain)&&out.samples.directMiss.length<12){
        out.samples.directMiss.push({mare:row.mare,band:row.band,delta,direct:a,two:b});
      }
    }
  }
  return out;
}
const rebuildFreedomAudit=summarizeRebuildFreedom();

function summarizeRebuildFreedomTrial(){
  const out={currentTwo:0,currentDirect:0,wouldBlockTwo:0,wouldPromoteDirect:0,blockByBand:{},promoteByBand:{},blockSamples:[],promoteSamples:[]};
  for(const row of rows){
    const g=row.goals?.rebuild,a=g?.direct?.freedom,b=g?.two?.freedom,af=g?.direct?.best,bf=g?.two?.best;
    if(!a||!b||!af||!bf)continue;
    const delta={
      safe:(b.safe||0)-(a.safe||0),
      sp15:(b.sp15st5||0)-(a.sp15st5||0),
      sp17:(b.sp17st5||0)-(a.sp17st5||0),
      speedQualified:(b.speedQualified||0)-(a.speedQualified||0),
      magnificent:(b.magnificent||0)-(a.magnificent||0),
      perfect:(b.perfect||0)-(a.perfect||0),
      elaborate:(b.elaborate||0)-(a.elaborate||0)
    };
    const severeLoss=delta.safe<=-5||delta.sp15<=-4||delta.sp17<=-2||delta.speedQualified<=-3;
    const highValueComp=delta.sp17>=2||delta.perfect>=1||(delta.magnificent>=2&&delta.sp15>=-1&&delta.speedQualified>=-1);
    const practicalGain=(delta.sp15>=4&&delta.speedQualified>=3&&delta.sp17>=0)||(delta.sp17>=2&&delta.speedQualified>=0);
    const nextImmediateQualified=bf.sp>=15&&bf.st>=5;
    if(g.recommendedGeneration===2){
      out.currentTwo++;
      if(severeLoss&&!highValueComp){
        out.wouldBlockTwo++;out.blockByBand[row.band]=(out.blockByBand[row.band]||0)+1;
        if(out.blockSamples.length<16)out.blockSamples.push({mare:row.mare,band:row.band,delta,directFacts:af,twoFacts:bf});
      }
    }else{
      out.currentDirect++;
      if(nextImmediateQualified&&practicalGain&&!severeLoss){
        out.wouldPromoteDirect++;out.promoteByBand[row.band]=(out.promoteByBand[row.band]||0)+1;
        if(out.promoteSamples.length<16)out.promoteSamples.push({mare:row.mare,band:row.band,delta,directFacts:af,twoFacts:bf});
      }
    }
  }
  return out;
}
const rebuildFreedomTrial=summarizeRebuildFreedomTrial();

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
if(focus['エトワルセリータ']&&(focus['エトワルセリータ'].band!=='high'||focus['エトワルセリータ'].goals.arc.recommendedGeneration!==1))throw Error('high-ability/Arc-compensation-gate edge case '+JSON.stringify(focus['エトワルセリータ'].goals.arc));
if(focus['スプリングスイーツ']&&focus['スプリングスイーツ'].goals.arc.recommendedGeneration!==1)throw Error('Spring Arc generation regression');
if(focus['エイスト']&&focus['エイスト'].goals.arc.recommendedGeneration!==1)throw Error('Eist Arc generation regression');
if(focus['フィットレオタード']&&focus['フィットレオタード'].goals.arc.recommendedGeneration!==2)throw Error('Fit Arc generation regression');
if(focus['ミニミニデート']&&focus['ミニミニデート'].goals.arc.recommendedGeneration!==2)throw Error('Mini Arc generation regression');

const output={
  passed:true,
  method:'ability-band-x-exact-direct-and-two-generation-future-potential',
  shard:{index:SHARD_INDEX,count:SHARD_COUNT},
  rules:{
    ability:'high=SP+ST top15%, middle=top16-60%, low=below60%, unknown kept separate',
    arc:'SP14/ST6 qualified, SP15/ST6 strong; supported additionally requires sire record B+ and distance evidence. Speed cross is not a hard Arc gate.',
    bc:'SP17/ST5 + effective SP support qualified; SP18/ST5 strong; supported means qualified plus sire record B+. Generation upgrades also require the explicit BC record-compensation gate.',
    rebuild:'SP15/ST5 used only as a reconstruction reference line.',
    staging:'two-generation labels require an actual materialUpgradeReasons improvement when direct generation has no qualifying route.',
    caution:'This diagnostic does not convert the matrix into a single numeric score.'
  },
  totals:{mares:rows.length,known:rows.filter(x=>x.band!=='unknown').length,unknown:rows.filter(x=>x.band==='unknown').length,twoRoutes,runtimeMs:Date.now()-started},
  matrix,preferredMatrix,tradeoffs,rebuildFreedomAudit,rebuildFreedomTrial,focus,samples
};
const outFile=process.env.OUTPUT_FILE;
if(outFile)fs.writeFileSync(outFile,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
