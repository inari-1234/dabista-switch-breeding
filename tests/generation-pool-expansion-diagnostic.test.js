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

function bases(shortlists,maxEach){
  const out=[],seen=new Set();
  for(let i=0;i<maxEach;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function collect(iter,poolN=24){
  const c=planner.createCollector({topN:3,poolN});
  const arc=advisor.emptySummary('diagnostic-arc'),bc=advisor.emptySummary('diagnostic-bc');
  for(const r of iter){c.push(r);advisor.addRoute(arc,r,'arc');advisor.addRoute(bc,r,'bc')}
  const out=c.finish();
  out.goalBest={arc:arc.bestRoute,bc:bc.bestRoute};
  return out;
}
function facts(r){
  if(!r)return null;
  return{
    sires:r.sires,sp:r.final.sp,st:r.final.st,pw:r.final.pw,
    record:r.final.sireStats?.record,stable:r.final.sireStats?.stable,maxD:r.final.sireStats?.maxD,
    speedCross:!!r.final.speedCross?.has,longCross:!!r.final.crossEffects?.longDistance,
    materialStages:r.materialSpeedCross?.stages||0,theory:r.final.theory,elaborate:r.final.elaborate
  };
}
function goalBest(result,goal){
  return result?.goalBest?.[goal]||null;
}
function snapshot(result){
  return{
    count:result.count,pool:result.pool.length,
    arc:facts(goalBest(result,'arc')),
    bc:facts(goalBest(result,'bc')),
    production:facts(result.profiles.production?.[0]||null),
    sp:facts(result.profiles.sp?.[0]||null),
    st:facts(result.profiles.st?.[0]||null),
    balance:facts(result.profiles.balance?.[0]||null)
  };
}
function key(x){return JSON.stringify(x?.sires||[])}

const mares=['スプリングスイーツ','フィットレオタード','エイスト','ミニミニデート'];
const output=[];
const started=Date.now();

for(const mare of mares){
  const r2=collect(planner.iterateTwo(mare),24);
  const third12Bases=bases(r2.shortlists,12);
  const third12=collect(planner.iterateThirdPreview(mare,third12Bases),24);

  const thirdFullBases=r2.pool;
  const thirdFull=collect(planner.iterateThirdPreview(mare,thirdFullBases),24);

  const fourth8Bases=bases(third12.shortlists,8);
  const fourth8=collect(planner.iterateFourthPreview(mare,fourth8Bases),24);

  const fourthPoolBases=third12.pool;
  const fourthPool=collect(planner.iterateFourthPreview(mare,fourthPoolBases),24);

  const fourthFullPoolBases=thirdFull.pool;
  const fourthFullPool=collect(planner.iterateFourthPreview(mare,fourthFullPoolBases),24);

  const current3=snapshot(third12),full3=snapshot(thirdFull);
  const current4=snapshot(fourth8),pool4=snapshot(fourthPool),fullPool4=snapshot(fourthFullPool);

  output.push({
    mare,
    bases:{
      twoPool:r2.pool.length,
      third12:third12Bases.length,
      thirdFull:thirdFullBases.length,
      fourth8:fourth8Bases.length,
      fourthPool:fourthPoolBases.length,
      fourthFullPool:fourthFullPoolBases.length
    },
    third:{
      current:current3,fullPool:full3,
      same:{
        arc:key(current3.arc)===key(full3.arc),
        bc:key(current3.bc)===key(full3.bc),
        production:key(current3.production)===key(full3.production),
        sp:key(current3.sp)===key(full3.sp),
        st:key(current3.st)===key(full3.st),
        balance:key(current3.balance)===key(full3.balance)
      }
    },
    fourth:{
      current8:current4,
      currentThirdPool:pool4,
      fullThirdPool:fullPool4,
      same8VsCurrentPool:{
        arc:key(current4.arc)===key(pool4.arc),
        bc:key(current4.bc)===key(pool4.bc),
        production:key(current4.production)===key(pool4.production),
        sp:key(current4.sp)===key(pool4.sp),
        st:key(current4.st)===key(pool4.st),
        balance:key(current4.balance)===key(pool4.balance)
      },
      sameCurrentPoolVsFullPool:{
        arc:key(pool4.arc)===key(fullPool4.arc),
        bc:key(pool4.bc)===key(fullPool4.bc),
        production:key(pool4.production)===key(fullPool4.production),
        sp:key(pool4.sp)===key(fullPool4.sp),
        st:key(pool4.st)===key(fullPool4.st),
        balance:key(pool4.balance)===key(fullPool4.balance)
      }
    }
  });
}

console.log(JSON.stringify({
  passed:true,
  method:'pool-expansion-diagnostic',
  runtimeMs:Date.now()-started,
  mares,
  output
},null,2));
