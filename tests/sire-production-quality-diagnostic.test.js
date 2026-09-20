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

const sireByName=new Map(S.map(x=>[x.name,x]));
const known=M.filter(x=>+x.sp||+x.st||+x.pw).sort((a,b)=>(b.sp+b.st)-(a.sp+a.st));
const bottom=[...known].sort((a,b)=>(a.sp+a.st)-(b.sp+b.st)).slice(0,3).map(x=>x.name);
const names=[...new Set(['スプリングスイーツ','フィットレオタード','エイスト',bottom[0]])];

function brief(route){
  if(!route)return null;
  const f=route.final||{},s=f.sireStats||{},p=route.speedCrossPath||[];
  return{
    sires:route.sires,
    sp:f.sp,st:f.st,pw:f.pw,
    firstCross:!!p[0]?.has,
    finalCross:!!f.speedCross?.has,
    finalCrossCount:f.speedCross?.count||0,
    materialCrossStages:route.materialSpeedCross?.stages||0,
    finalSire:{record:s.record,stable:s.stable,guts:s.guts,minD:s.minD,maxD:s.maxD},
    firstSire:(()=>{const x=sireByName.get(route.sires?.[0]);return x?{record:x.record,stable:x.stable,guts:x.guts,minD:x.minD,maxD:x.maxD}:null})()
  };
}

const output=[];
for(const mare of names){
  const all=planner.createCollector({topN:5,poolN:24});
  const recA=planner.createCollector({topN:5,poolN:24});
  const recAC=planner.createCollector({topN:5,poolN:24});
  let total=0,noFirstThenFinal=0,noFirstThenFinalBA=0,finalCrossRecA=0,finalCrossRecB=0;
  const combos={};
  for(const r of planner.iterateTwo(mare)){
    total++;all.push(r);
    const f=r.final||{},ss=f.sireStats||{},cross=!!f.speedCross?.has,first=!!r.speedCrossPath?.[0]?.has;
    if(cross){
      if(ss.record==='A')finalCrossRecA++;
      if(ss.record==='B')finalCrossRecB++;
      const k=(ss.record||'?')+'/'+(ss.stable||'?');combos[k]=(combos[k]||0)+1;
      if(!first){
        noFirstThenFinal++;
        if(ss.record==='B'&&ss.stable==='A')noFirstThenFinalBA++;
      }
    }
    if(ss.record==='A')recA.push(r);
    if(ss.record==='A'&&ss.stable==='C')recAC.push(r);
  }
  const a=all.finish(),ra=recA.finish(),rac=recAC.finish();
  output.push({
    mare,
    mareStats:M.find(x=>x.name===mare),
    total,
    finalCrossRecA,finalCrossRecB,noFirstThenFinal,noFirstThenFinalBA,
    finalCrossSireCombos:Object.fromEntries(Object.entries(combos).sort((a,b)=>b[1]-a[1])),
    currentTopSpeedCross:brief(a.profiles.speedCross?.[0]),
    currentTopSpeedCrossSet:(a.profiles.speedCross||[]).map(brief),
    bestRecordASpeedCross:brief(ra.profiles.speedCross?.[0]),
    bestRecordAStableCSpeedCross:brief(rac.profiles.speedCross?.[0]),
    currentBalance:brief(a.profiles.balance?.[0]),
    recordABalance:brief(ra.profiles.balance?.[0])
  });
}
console.log(JSON.stringify({passed:true,names,bottom,output},null,2));
