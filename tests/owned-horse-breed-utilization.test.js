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
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});
const by=new Map([...T.stallions,...T.broodmares].map(x=>[core.key(x.name),x]));

const farm=engine.deriveChild(by.get(core.key('バゴ')),by.get(core.key('エイスト')),'自家製テスト牡馬');
farm.kind='farm-stallion';
const farmStats={name:farm.name,record:'A',guts:'B',stable:'B',minD:1600,maxD:2400,price:0,source:'牧場DB',farm:true};
const planner=sale.create({
  engine,
  stallions:[...T.stallions,farm],
  stallionStats:[...S,farmStats],
  broodmares:T.broodmares,
  broodmareStats:M
});
if(planner.stallionCount!==177)throw Error('owned sire was not added to candidate pool '+planner.stallionCount);
const index=planner.createDirectPairIndex('スプリングスイーツ');
const compact=index.get(farm.name);
if(!compact||!compact.safe||!compact.currentRoute)throw Error('owned sire direct pair unavailable');
if(compact.currentRoute.finalChild!==null)throw Error('direct pair index must remain memory-compact');
const exact=planner.evaluateDirectPair('スプリングスイーツ',farm.name);
if(!exact.safe||!exact.route?.finalChild)throw Error('owned sire exact route cannot be reconstructed');
const portfolio=planner.withPortfolio(exact.route).portfolio?.spst120;
if(!portfolio||portfolio.population!==54)throw Error('owned sire portfolio cohort drift '+JSON.stringify(portfolio));

const advisor=reco.create({planner,broodmareStats:M});
const mareAssessment=advisor.mareAssessment('スプリングスイーツ');
const nextStarted=Date.now();let nextSafe=0,nextMaterial=0;
for(const r of planner.iterateTwoFromDirect(exact.route)){
  nextSafe++;
  if(advisor.materialUpgradeReasons(exact.route,r,'bc',mareAssessment).length)nextMaterial++;
}
const nextRuntimeMs=Date.now()-nextStarted;
if(nextSafe<=0)throw Error('owned sire next-generation scan produced no safe routes');

const twoRoute=[...planner.iterateTwoFromDirect(exact.route)][0];
if(!twoRoute)throw Error('route registration fixture needs a two-generation route');
const expanded=planner.expandRoute('スプリングスイーツ',twoRoute,'bc');
if(!expanded||expanded.stages.length!==2)throw Error('expanded route missing stages for registration');
if(expanded.stages.some(s=>!s.child||!Array.isArray(s.child.ancestor)||s.child.ancestor.length!==15))
  throw Error('every expanded stage must expose an exact 15-ancestor child for farm registration');

const ui=fs.readFileSync('breed-integration.js','utf8');
for(const token of [
  'function farmSirePool()',
  'lifecycle.isActiveStallion(h)',
  'function ensurePlannerFresh()',
  'ownedSireCount',
  'function compareSirePortfolio(',
  'planner.evaluateDirectPair(currentResolvedMare,entry.sire)',
  "archetype:'自家製牝馬'",
  '繁殖SP/ST/PWは推定せず',
  '実馬補助情報'
])if(!ui.includes(token))throw Error('owned-horse integration missing '+token);
if(ui.includes("if(profile==='sire')ranked=[...ranked].sort((a,b)=>a.sire.localeCompare"))
  throw Error('sire bloodline category regressed to alphabetical ordering');
if(/abilityKnown:true[\s\S]{0,300}自家製牝馬/.test(ui))
  throw Error('farm mare real-race evidence must not be converted into breeding SP/ST/PW');

console.log(JSON.stringify({
  passed:true,
  candidatePool:{domestic:176,withOwned:planner.stallionCount},
  compactIndex:true,
  exactOwnedSireReconstruction:true,
  nextGeneration:{safeRoutes:nextSafe,materialRoutes:nextMaterial,runtimeMs:nextRuntimeMs},
  routeRegistrationStages:expanded.stages.length,
  portfolioCohort:portfolio.population,
  farmMareBoundary:'real-race evidence remains separate from breeding SP/ST/PW',
  sireOrdering:'portfolio facts, not alphabetical'
},null,2));
