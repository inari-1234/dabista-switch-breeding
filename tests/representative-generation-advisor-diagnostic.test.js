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
const mare=process.env.MARE||'フィットレオタード',goal='arc';

function previewBases(shortlists,maxEach=12){
  const out=[],seen=new Set();
  for(let i=0;i<maxEach;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function scan(iter,poolN,summary,side=null){
  const c=planner.createCollector({topN:3,poolN});
  for(const r of iter){c.push(r);if(side)side.push(r);advisor.addRoute(summary,r,goal)}
  return c.finish();
}
function routeSnap(r){
  if(!r)return null;
  return{sires:r.sires,facts:advisor.routeFacts(r),production:advisor.productionQuality(r,advisor.mareAssessment(mare))};
}

const assessment=advisor.mareAssessment(mare);
const s1=advisor.emptySummary('exact-direct'),r1=scan(planner.iterateDirect(mare),24,s1);
const s2=advisor.emptySummary('exact-two'),r2=scan(planner.iterateTwo(mare),24,s2);
const b3=previewBases(r2.shortlists,12),bridge=planner.createFourthBridgeCollector();
const s3=advisor.emptySummary('preview-three'),r3=scan(planner.iterateThirdPreview(mare,b3),18,s3,bridge);
const br=bridge.finish();
const s4=advisor.emptySummary('preview-four'),r4=scan(planner.iterateFourthPreview(mare,br.bases),16,s4);

const generations={
  1:{result:r1,summary:s1,method:'exact'},
  2:{result:r2,summary:s2,method:'exact'},
  3:{result:r3,summary:s3,method:'conditional-preview',previewBaseCount:b3.length},
  4:{result:r4,summary:s4,method:'conditional-bridge-preview',previewBaseCount:br.bases.length,bridgeConfig:br.config}
};
const rec=advisor.recommendGeneration({goal,assessment,generations});
console.log(JSON.stringify({
  passed:true,method:'representative-generation-advisor',
  mare,assessment,
  rec:{
    generation:rec.generation,label:rec.label,conditional:rec.conditional,reasons:rec.reasons,transitions:rec.transitions
  },
  bases:{third:b3.length,fourth:br.bases.length,bridgeConfig:br.config},
  routes:{
    1:routeSnap(s1.bestRoute),2:routeSnap(s2.bestRoute),3:routeSnap(s3.bestRoute),4:routeSnap(s4.bestRoute)
  }
},null,2));
