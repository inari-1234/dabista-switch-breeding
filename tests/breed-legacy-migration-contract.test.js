'use strict';
const fs=require('fs');

const files={
  v18:fs.readFileSync('v18.js','utf8'),
  v19:fs.readFileSync('v19.js','utf8'),
  v20:fs.readFileSync('v20.js','utf8'),
  v21:fs.readFileSync('v21.js','utf8'),
  v25:fs.readFileSync('v25.js','utf8'),
  helper:fs.readFileSync('breed-helper.js','utf8')
};
function must(file,patterns,label){
  for(const p of patterns)if(!p.test(files[file]))throw Error(label+' missing in '+file+': '+p);
}

must('v18',[/fillMasterPedigree/,/installPedigreeGuidance/,/downloadJSON/,/installSupport/],'v18 unique support');
must('v19',[/deriveAll/,/ancOf/],'v19 homebred pedigree derivation');
must('v25',[/installSimulator/,/renderSimulator/,/expose/],'v25 manual simulator/API');
must('helper',[/rankValue/,/renderBreed/,/breedCandidates/],'legacy breed rendering currently present');

const consolidateTargets={
  v18:['decorateBreedCards','theoryFilter UI'],
  v19:['addCrosses per-card decoration'],
  v20:['apply per-card theory decoration'],
  v21:['apply per-card danger/elaborate/cross decoration','v21Filter UI'],
  v25:['decorateBreed per-card nitro decoration','v25NitroFilter UI'],
  helper:['rankValue after mare selected','candidate rendering without stable data-sire-name']
};
for(const [file,names] of Object.entries(consolidateTargets)){
  if(!names.length)throw Error('empty consolidation target '+file);
}

const preservedResponsibilities={
  v18:['master pedigree guidance/autofill','diagnostic export/update/support'],
  v19:['recursive 15-ancestor derivation for farm horses'],
  v25:['manual 2-3 generation nitro simulator','public nitro helper API'],
  core:['breeding-core truth for danger/theory/nitro/elaborate/child inheritance'],
  planner:['route/profile/portfolio ranking truth'],
  advisor:['goal-aware and mare-aware future/generation judgment']
};

const plannedOwnership={
  pairCache:'new breed integration layer; one evaluatePair per domestic sire and selected mare',
  currentCard:'new breed integration layer; stable data-sire-name and cached pair facts',
  filters:'new breed integration layer; reuse pair cache',
  futureContinuation:'sale-planner-core thin fixed-first continuation API',
  futureSemantics:'sale-recommendation-core/advisor + breed UI presentation layer',
  legacyModules:'retain only unique responsibilities listed above'
};

console.log(JSON.stringify({
  passed:true,
  method:'legacy migration responsibility contract',
  consolidateTargets,
  preservedResponsibilities,
  plannedOwnership,
  guardrails:[
    'Do not delete whole v18/v19/v25 files solely to remove per-card decorators.',
    'Do not use first <b> text as stallion identity after new UI.',
    'Do not duplicate nitro/theory/danger calculations outside common engine.',
    'Do not let dangerous pairs enter ranking routes.',
    'Do not treat unknown homebred mare ability as zero.'
  ]
},null,2));
