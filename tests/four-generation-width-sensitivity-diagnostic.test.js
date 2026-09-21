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
function facts(r){if(!r)return null;return{sires:r.sires,sp:r.final.sp,st:r.final.st,pw:r.final.pw,record:r.final.sireStats?.record,stable:r.final.sireStats?.stable,maxD:r.final.sireStats?.maxD,speedCross:!!r.final.speedCross?.has,materialStages:r.materialSpeedCross?.stages||0,theory:r.final.theory,elaborate:r.final.elaborate}}
function goalBest(result,goal){
  return result?.goalBest?.[goal]||null;
}
const mares=['スプリングスイーツ','フィットレオタード','エイスト','ミニミニデート'];
const widths=[4,8,12,18];
const output=[];
for(const mare of mares){
 const r2=collect(planner.iterateTwo(mare),24);
 const b3=bases(r2.shortlists,12);
 const r3=collect(planner.iterateThirdPreview(mare,b3),24);
 const row={mare,twoPool:r2.pool.length,thirdBases:b3.length,thirdPool:r3.pool.length,widths:{}};
 for(const w of widths){
   const b4=bases(r3.shortlists,w);
   const r4=collect(planner.iterateFourthPreview(mare,b4),24);
   row.widths[w]={
     baseCount:b4.length,safe:r4.count,pool:r4.pool.length,
     arc:facts(goalBest(r4,'arc')),
     bc:facts(goalBest(r4,'bc')),
     production:facts(r4.profiles.production?.[0]||null),
     sp:facts(r4.profiles.sp?.[0]||null),
     st:facts(r4.profiles.st?.[0]||null),
     balance:facts(r4.profiles.balance?.[0]||null)
   };
 }
 output.push(row);
}
function key(x){return JSON.stringify(x?.sires||[])}
const stability=output.map(row=>{
 const w8=row.widths[8],w18=row.widths[18];
 return{
   mare:row.mare,
   sameArc:key(w8.arc)===key(w18.arc),
   sameBc:key(w8.bc)===key(w18.bc),
   sameProduction:key(w8.production)===key(w18.production),
   sameSp:key(w8.sp)===key(w18.sp),
   sameSt:key(w8.st)===key(w18.st),
   sameBalance:key(w8.balance)===key(w18.balance)
 };
});
console.log(JSON.stringify({passed:true,mares,widths,stability,output},null,2));
