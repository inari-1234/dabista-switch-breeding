'use strict';
const fs=require('fs');

const files={
  index:fs.readFileSync('index.html','utf8'),
  v18:fs.readFileSync('v18.js','utf8'),
  v25:fs.readFileSync('v25.js','utf8'),
  engine:fs.readFileSync('breeding-engine.js','utf8'),
  integration:fs.readFileSync('breed-integration.js','utf8')
};
function must(file,patterns,label){
  for(const p of patterns)if(!p.test(files[file]))throw Error(label+' missing in '+file+': '+p);
}

must('v18',[/fillMasterPedigree/,/installPedigreeGuidance/,/DABISTA_BREEDING_ENGINE\.ready/],'v18 shared-master support');
must('engine',[/function resolveHorse\(/,/core\.deriveChild\(/,/findDbHorse\(/],'common engine homebred pedigree derivation');
must('v25',[/DABISTA_NITRO_ENGINE/,/source:'common-breeding-engine'/,/calcPairForHorse/],'v25 public nitro API');
if(/nitroSimulator|installSimulator|v25NitroFilter/.test(files.v25))throw Error('v25 must not retain hidden legacy simulator/filter UI');
for(const removed of ['breed-helper.js','v19.js','v20.js','v21.js'])if(files.index.includes(removed+'?'))throw Error('legacy runtime layer still loaded: '+removed);

must('integration',[
  /engine\.resolveHorse/,
  /createDirectPairIndex/,
  /data-sire-name/,
  /breedTheoryFilter/,
  /breedNitroFilter/,
  /pairDetailsHtml/,
  /DABISTA_BREED_FUTURE/
],'integration ownership');
if(/MutationObserver|installTheoryControls|decorateBreedCards|DABISTA_BREED_LEGACY_CLEANUPS/.test(files.v18))throw Error('v18 must not install legacy candidate UI/listeners');
if(/releaseLegacyBreedUi|DABISTA_BREED_LEGACY_CLEANUPS/.test(files.integration))throw Error('integration legacy cleanup shim must be removed');

console.log(JSON.stringify({
  passed:true,
  method:'optimized legacy responsibility contract',
  preservedResponsibilities:{
    v18:['master pedigree guidance/autofill via shared engine'],
    breedingEngine:['recursive 15-ancestor resolution for farm horses'],
    v25:['public nitro helper API only'],
    integration:['pair cache/current cards/filters/future continuation']
  },
  removedRuntime:['breed-helper.js','v19.js','v20.js','v21.js','v25 hidden simulator/filter']
},null,2));
