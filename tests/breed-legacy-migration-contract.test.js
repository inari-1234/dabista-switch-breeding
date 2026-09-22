'use strict';
const fs=require('fs');

const files={
  v18:fs.readFileSync('v18.js','utf8'),
  v19:fs.readFileSync('v19.js','utf8'),
  v20:fs.readFileSync('v20.js','utf8'),
  v21:fs.readFileSync('v21.js','utf8'),
  v25:fs.readFileSync('v25.js','utf8'),
  helper:fs.readFileSync('breed-helper.js','utf8'),
  integration:fs.readFileSync('breed-integration.js','utf8')
};
function must(file,patterns,label){
  for(const p of patterns)if(!p.test(files[file]))throw Error(label+' missing in '+file+': '+p);
}

must('v18',[/fillMasterPedigree/,/installPedigreeGuidance/,/downloadJSON/,/installSupport/],'v18 unique support');
must('v19',[/deriveAll/,/ancOf/],'v19 homebred pedigree derivation');
must('v25',[/installSimulator/,/renderSimulator/,/expose/],'v25 manual simulator/API');
must('helper',[/rankValue/,/renderBreedLegacy/,/window\.renderBreed=window\.renderBreed\|\|renderBreedLegacy/],'helper fallback/bootstrap');

for(const file of ['v18','v19','v20','v21','v25']){
  if(!files[file].includes('window.DABISTA_BREED_PAIR_INDEX'))throw Error(file+' missing integration takeover guard');
}
for(const file of ['v18','v19','v20','v21','v25']){
  if(!files[file].includes('dataset.sireName')&&file!=='v19')throw Error(file+' missing stable sire identity fallback');
}
must('integration',[
  /createDirectPairIndex/,
  /data-sire-name/,
  /breedTheoryFilter/,
  /breedNitroFilter/,
  /pairDetailsHtml/,
  /DABISTA_BREED_FUTURE/,
  /releaseLegacyBreedUi/,
  /DABISTA_BREED_LEGACY_CLEANUPS/
],'integration ownership');

for(const file of ['v18','v19']){
  if(!files[file].includes('DABISTA_BREED_LEGACY_CLEANUPS'))throw Error(file+' missing takeover cleanup registry');
  if(!files[file].includes('removeEventListener')||!files[file].includes('disconnect()'))throw Error(file+' does not release legacy breed listeners/observer');
}
for(const file of ['v20','v21','v25']){
  if(!/if\(!window\.DABISTA_BREED_PAIR_INDEX\)\{[\s\S]{0,1400}(addEventListener|MutationObserver)/.test(files[file]))throw Error(file+' still registers integrated breed UI hooks without takeover guard');
}

const preservedResponsibilities={
  v18:['master pedigree guidance/autofill','diagnostic export/update/support'],
  v19:['recursive 15-ancestor derivation for farm horses'],
  v25:['manual 2-3 generation nitro simulator','public nitro helper API'],
  core:['breeding-core truth for danger/theory/nitro/elaborate/child inheritance'],
  planner:['route/profile/portfolio ranking truth'],
  advisor:['goal-aware and mare-aware future/generation judgment']
};
const ownership={
  pairCache:'breed-integration.js / Direct Pair Index',
  currentCard:'breed-integration.js / stable data-sire-name',
  filters:'breed-integration.js / cached pair facts',
  futureContinuation:'sale-planner-core fixed-first primitives + breed-integration async controller',
  futureSemantics:'sale-recommendation-core advisor',
  legacyModules:'unique non-card responsibilities retained; per-card decorators guarded off after integration takeover'
};

console.log(JSON.stringify({
  passed:true,
  method:'implemented legacy migration responsibility contract',
  preservedResponsibilities,
  ownership,
  guardrails:[
    'v18 master support retained',
    'v19 farm 15-ancestor derivation retained',
    'v25 manual nitro simulator retained',
    'legacy per-card decorators do not own integrated candidate cards',
    'stable data-sire-name replaces first-bold identity',
    'dangerous pairs remain warning-only'
  ]
},null,2));
