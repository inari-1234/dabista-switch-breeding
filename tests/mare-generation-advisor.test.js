'use strict';
const assert=require('assert');
const core=require('../breeding-core.js');
const plannerCore=require('../sale-planner-core.js');
const advisorCore=require('../sale-recommendation-core.js');
const theory=require('../data/theory-master.json');
const effects=require('../data/nitro-effects.json');
const kotta=require('../data/kotta-pairs.json');
const direct=require('../data/elaborate-direct-exceptions.json');
const stallionData=require('../data/stallions.json');
const mareData=require('../data/default-broodmares.json');
const inheritance=require('../data/planner-inheritance-validation.json');

const knownDifferences=(inheritance.samples||[])
 .filter(x=>x&&x.sire&&x.mare&&x.ours&&x.ours.kc!==x.oracle?.k)
 .map(x=>({sire:x.sire,mare:x.mare,oracle:x.oracle,ours:x.ours}));
const engine=core.create({
 effects:effects.effects||[],
 elaboratePairs:kotta.pairs||[],
 directElaboratePairs:direct.pairs||[],
 elaborateKnownDifferences:knownDifferences
});
const planner=plannerCore.create({
 engine,
 stallions:theory.stallions||[],
 stallionStats:stallionData.stallions||[],
 broodmares:theory.broodmares||[],
 broodmareStats:mareData.broodmares||[]
});
const advisor=advisorCore.create({planner,broodmareStats:mareData.broodmares||[]});

assert.strictEqual(advisor.knownAbilityCount,298);
assert.strictEqual(advisor.totalMareCount,331);

const e=advisor.mareAssessment('エイスト');
assert.strictEqual(e.abilityKnown,true);
assert.strictEqual(e.ranks.st.rank,1);
assert.strictEqual(e.ranks.spst.rank,7);

const unknown=advisor.mareAssessment('アマリン');
assert.strictEqual(unknown.abilityKnown,false);
assert.strictEqual(unknown.ranks,null);
assert.strictEqual(unknown.tier,'未判明');

function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set(),keys=['sp','spCross','st','balance','theory'];
 for(let i=0;i<maxEach;i++)for(const k of keys){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out;
}
function scan(iter,goal,{keep=false,poolN=24}={}){
 const collector=planner.createCollector({topN:3,poolN}),summary=advisor.emptySummary(),all=[];
 for(const r of iter){collector.push(r);advisor.addRoute(summary,r,goal);if(keep)all.push(r)}
 return{result:collector.finish(),summary,all};
}

const goal='arc',name='エイスト';
const g1=scan(planner.iterateDirect(name),goal,{keep:true});
const g2=scan(planner.iterateTwo(name),goal);
const bases=previewBases(g2.result.shortlists,12);
const g3=scan(planner.iterateThirdPreview(name,bases),goal,{poolN:18});
assert.deepStrictEqual(g1.summary.bestRoute.sires,['ステイゴールド']);
assert.strictEqual(g1.summary.bestRoute.final.sp,14);
assert.strictEqual(g1.summary.bestRoute.final.st,8);

const portfolios={
 1:planner.portfolioPareto(g1.all,3),
 2:planner.portfolioPareto(g2.result.pool,3),
 3:planner.portfolioPareto(g3.result.pool,3)
};
const rec=advisor.recommendGeneration({
 goal,
 assessment:e,
 generations:{1:g1,2:g2,3:g3},
 portfolios
});
assert.strictEqual(rec.generation,1);
assert.strictEqual(rec.label,'直仔推奨');

console.log(JSON.stringify({
 passed:true,
 knownAbilityCount:advisor.knownAbilityCount,
 eist:{spstRank:e.ranks.spst.rank,bestDirect:g1.summary.bestRoute.sires[0],recommendedGeneration:rec.generation}
},null,2));
