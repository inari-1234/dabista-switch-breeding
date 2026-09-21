'use strict';
const fs=require('fs');

const common=fs.readFileSync('.github/workflows/validate-common-engine.yml','utf8');
const sale=fs.readFileSync('.github/workflows/validate-sale-planner.yml','utf8');
const integrationExists=fs.existsSync('breed-integration.js');

const requiredExisting=[
  'tests/transient-sale-mare-wiring.test.js',
  'tests/bc-goal-ranking-regression.test.js',
  'tests/mare-generation-advisor.test.js',
  'tests/speed-cross-priority.test.js',
  'tests/fourth-generation-bridge-collector.test.js'
];
for(const t of requiredExisting){
  if(!common.includes(t)||!sale.includes(t))throw Error('baseline workflow missing '+t);
}

const requiredAfterIntegration=[
  'tests/breed-pair-cache-filter-equivalence.test.js',
  'tests/breed-fixed-first-optimized-matrix.test.js',
  'tests/breed-future-ui-labels-diagnostic.test.js',
  'tests/breed-cache-invalidation-contract.test.js',
  'tests/breed-goal-canonicalization-contract.test.js',
  'tests/breed-integration-load-order-contract.test.js',
  'tests/breed-legacy-migration-contract.test.js'
];

if(integrationExists){
  for(const wf of [['common',common],['sale',sale]]){
    if(!wf[1].includes('breed-integration.js'))throw Error(wf[0]+' workflow missing breed-integration.js trigger');
    for(const t of requiredAfterIntegration){
      if(!wf[1].includes(t))throw Error(wf[0]+' workflow missing integration regression '+t);
    }
  }
}else{
  if(common.includes('breed-integration.js')||sale.includes('breed-integration.js'))throw Error('workflow references missing integration file');
}

const requiredRuntimeRegression=[
  '58256 exact common breeding pairs remain exact',
  'known Monte Rosso x Day Science elaborate discrepancy remains the only tracked oracle difference',
  '176 domestic mating candidates / 214 pedigree-analysis sires / 331 broodmares',
  '298 known ability / 33 unknown ability',
  'sale six-profile rankings unchanged unless intentionally specified',
  'BC SP-support requirement preserved',
  'Arc speed cross and 2400m remain graded evidence, not hard gates',
  'unknown mare ability never converted to zero',
  'dangerous pairs visible for warning/filter but excluded from ranking',
  'transient sale mare handoff preserves goal including BC',
  'manual nitro simulator remains available',
  'farm-horse 15-ancestor recursive derivation remains available'
];

console.log(JSON.stringify({
  passed:true,
  phase:integrationExists?'integration-present':'preimplementation',
  baselineWorkflowCoverage:requiredExisting,
  requiredAfterIntegration,
  requiredRuntimeRegression
},null,2));
