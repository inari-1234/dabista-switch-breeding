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
const mare='フィットレオタード',goal='arc',axes=['sp','speedCross','production','st','balance','theory'];
function basesOf(shortlists,n=12){const out=[],seen=new Set();for(let i=0;i<n;i++)for(const k of axes){const r=shortlists?.[k]?.[i];if(!r)continue;const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}}return out}
function collect(iter,goal,poolN){const c=planner.createCollector({topN:3,poolN}),s=advisor.emptySummary('diag');for(const r of iter){c.push(r);advisor.addRoute(s,r,goal)}return{result:c.finish(),summary:s}}
const g1=collect(planner.iterateDirect(mare),goal,24);
const g2=collect(planner.iterateTwo(mare),goal,24);
const bases=basesOf(g2.result.shortlists,12);
const g3=collect(planner.iterateThirdPreview(mare,bases),goal,18);
const assessment=advisor.mareAssessment(mare);
const generations={1:{...g1,method:'exact'},2:{...g2,method:'exact'},3:{...g3,method:'conditional-preview',previewBaseCount:bases.length}};
const rec=advisor.recommendGeneration({goal,assessment,generations});
const routes={1:g1.summary.bestRoute,2:g2.summary.bestRoute,3:g3.summary.bestRoute};
const out={passed:true,method:'fit-generation-transition-diagnostic',assessment,previewBaseCount:bases.length,rec,generations:{}};
for(const n of [1,2,3]){
 const r=routes[n];
 out.generations[n]={
  route:r?{sires:r.sires,facts:advisor.routeFacts(r),production:advisor.productionQuality(r,assessment),expanded:planner.expandRoute(mare,r,goal)}:null,
  summary:{
   count:generations[n].summary.count,maxSp:generations[n].summary.maxSp,maxSt:generations[n].summary.maxSt,maxSpSt:generations[n].summary.maxSpSt,
   sp15st5:generations[n].summary.sp15st5,sp17st5:generations[n].summary.sp17st5,
   arcRecordA:generations[n].summary.arcRecordA,arcRecordB:generations[n].summary.arcRecordB,arcRecordC:generations[n].summary.arcRecordC
  }
 };
}
out.upgrades={
 oneToTwo:advisor.materialUpgradeReasons(routes[1],routes[2],goal,assessment),
 twoToThree:advisor.materialUpgradeReasons(routes[2],routes[3],goal,assessment),
 oneToThree:advisor.materialUpgradeReasons(routes[1],routes[3],goal,assessment)
};
console.log(JSON.stringify(out,null,2));
