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
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));

const base=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});
let calls=0;
const counted={...base,evaluate:(s,m)=>{calls++;return base.evaluate(s,m)}};
const planner=sale.create({engine:counted,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});

calls=0;
const direct=[...planner.iterateDirect('エイスト')];
const directCalls=calls;
if(directCalls!==176)throw Error('iterateDirect evaluate count '+directCalls);

calls=0;
const mare=T.broodmares.find(x=>x.name==='エイスト');
for(const s of T.stallions)counted.evaluate(s,mare);
const pairCacheCalls=calls;
if(pairCacheCalls!==176)throw Error('pair cache evaluate count '+pairCacheCalls);

const naiveCombined=directCalls+pairCacheCalls;
const plannedCombined=176;
if(naiveCombined!==352)throw Error('naive combined '+naiveCombined);

console.log(JSON.stringify({
 passed:true,
 mare:'エイスト',
 directSafeRoutes:direct.length,
 evaluateCalls:{iterateDirect:directCalls,pairCache:pairCacheCalls,naiveCombined,plannedUnified:plannedCombined},
 reduction:{calls:naiveCombined-plannedCombined,percent:(1-plannedCombined/naiveCombined)*100},
 recommendedPlannerAPI:{
   name:'evaluateDirectPair',
   input:['mareInput','sireInput'],
   output:['pair','safe','route'],
   rule:'exactly one common-engine evaluate call; route null when dangerous',
   reuse:'iterateDirect and breed Pair Index both call this API'
 }
},null,2));
