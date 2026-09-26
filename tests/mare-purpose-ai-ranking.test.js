'use strict';
const fs=require('fs'),assert=require('assert');
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
const goals=['arc','bc','rebuild','stallion'];
const buckets=Object.fromEntries(goals.map(g=>[g,[]]));

for(const m of M){
  const a=advisor.mareAssessment(m.name);
  if(!a?.abilityKnown)continue;
  const summary=advisor.emptySummary('purpose-rank'),bestByGoal={arc:null,bc:null,rebuild:null,stallion:null};
  const rankPool=planner.createCollector({topN:2,poolN:4});
  for(const r of planner.iterateDirect(m.name)){
    advisor.addRoute(summary,r);rankPool.push(r);
    for(const g of goals)bestByGoal[g]=advisor.betterGoalRoute(bestByGoal[g],r,g);
  }
  summary.bestByGoal=bestByGoal;
  const stallionRoute=planner.portfolioPareto(rankPool.finish().pool.slice(0,24),1).routes[0]||bestByGoal.stallion;
  for(const g of goals){
    const route=g==='stallion'?stallionRoute:bestByGoal[g];
    buckets[g].push(advisor.marePurposeCandidate(m.name,g,summary,route));
  }
}

const ranked={};
for(const g of goals){
  ranked[g]=advisor.rankMarePurposeCandidates(buckets[g]);
  assert.strictEqual(ranked[g].length,advisor.knownAbilityCount,g+' ranking must cover all known-ability mares');
  assert.strictEqual(ranked[g][0].rank,1);
  assert.strictEqual(ranked[g].at(-1).rank,advisor.knownAbilityCount);
  assert.ok(ranked[g].every(x=>!Object.prototype.hasOwnProperty.call(x,'score')),'purpose rank must not introduce an overall score');
}
const lookup=(goal,name)=>ranked[goal].find(x=>x.name===name)?.rank||null;
assert.ok(lookup('arc','エイスト')&&lookup('arc','スプリングスイーツ'),'known reference mares must receive Arc ranks');
assert.strictEqual(lookup('arc','エイスト'),1,'Arc AI rank must place Eist first under the validated purpose logic');
assert.strictEqual(lookup('arc','スプリングスイーツ'),2,'Arc AI rank must place Spring Sweets second under the validated purpose logic');
assert.ok(ranked.stallion.every(x=>x.route?.portfolio),'stallion purpose ranking must use portfolio-backed routes');
const stallionTopFacts=advisor.portfolioFacts(ranked.stallion[0].route.portfolio);
assert.deepStrictEqual(
  ranked.stallion[0].vector.slice(0,7),
  [stallionTopFacts.sp17,stallionTopFacts.sp15,stallionTopFacts.safe,stallionTopFacts.sp17hi,stallionTopFacts.sp15hi,stallionTopFacts.maxSpSt,stallionTopFacts.maxSp],
  'stallion purpose rank must begin with future breeding utility, not direct offspring SP/ST'
);

const pedigreeRows=JSON.parse(fs.readFileSync('data/pedigree-master.json','utf8')).horses;
const pedigreeMap=new Map(pedigreeRows.map(x=>[core.key(x.name),x]));
for(const mare of T.broodmares){
  const pedRow=pedigreeMap.get(core.key(mare.name));
  assert.ok(pedRow,mare.name+' must exist in pedigree master');
  assert.strictEqual(mare.ancestor.length,15,mare.name+' theory master must retain 15 ancestors');
  assert.deepStrictEqual(mare.ancestor,pedRow.ancestor,mare.name+' 15 ancestors must exactly match pedigree master');
}
const ped=pedigreeMap.get(core.key('クイーンズスミレ'));
assert.strictEqual(ped.ancestor.length,15,'Queens Sumire must retain the full 15-ancestor game pedigree');
const effectMap=new Map(E.map(x=>[core.key(x.name),x]));
assert.ok(effectMap.get(core.key(ped.sire))?.speed,'Queens Sumire sire factor must be available');
assert.ok(effectMap.get(core.key(ped.damSire))?.long,'Queens Sumire dam-sire factor must be available');
assert.ok(effectMap.get(core.key(ped.sireSire))?.short,'Queens Sumire sire-sire factor must be available');

console.log(JSON.stringify({
  passed:true,
  knownAbilityCount:advisor.knownAbilityCount,
  top10:Object.fromEntries(goals.map(g=>[g,ranked[g].slice(0,10).map(x=>x.name)])),
  references:{
    eistArc:lookup('arc','エイスト'),
    springArc:lookup('arc','スプリングスイーツ'),
    queens:{
      arc:lookup('arc','クイーンズスミレ'),
      bc:lookup('bc','クイーンズスミレ'),
      rebuild:lookup('rebuild','クイーンズスミレ'),
      stallion:lookup('stallion','クイーンズスミレ')
    }
  },
  queensPedigree:{ancestors:ped.ancestor.length,sire:ped.sire,damSire:ped.damSire,sireSire:ped.sireSire}
},null,2));
