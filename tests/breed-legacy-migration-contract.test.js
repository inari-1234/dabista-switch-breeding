'use strict';
const fs=require('fs');

const files={
  index:fs.readFileSync('index.html','utf8'),
  v18:fs.readFileSync('v18.js','utf8'),
  v19:fs.readFileSync('v19.js','utf8'),
  v25:fs.readFileSync('v25.js','utf8'),
  integration:fs.readFileSync('breed-integration.js','utf8')
};
function must(file,patterns,label){
  for(const p of patterns)if(!p.test(files[file]))throw Error(label+' missing in '+file+': '+p);
}

must('v18',[/fillMasterPedigree/,/installPedigreeGuidance/,/DABISTA_BREEDING_ENGINE\.ready/],'v18 shared-master support');
must('v19',[/deriveAll/,/ancOf/],'v19 homebred pedigree derivation');
must('v25',[/DABISTA_NITRO_ENGINE/,/source:'common-breeding-engine'/,/calcPairForHorse/],'v25 public nitro API');
if(/nitroSimulator|installSimulator|v25NitroFilter/.test(files.v25))throw Error('v25 must not retain hidden legacy simulator/filter UI');
for(const removed of ['breed-helper.js','v20.js','v21.js'])if(files.index.includes(removed+'?'))throw Error('legacy runtime layer still loaded: '+removed);

must('integration',[
  /createDirectPairIndex/,
  /data-sire-name/,
  /breedTheoryFilter/,
  /breedNitroFilter/,
  /pairDetailsHtml/,
  /DABISTA_BREED_FUTURE/
],'integration ownership');
if(!files.v19.includes('DABISTA_BREED_LEGACY_CLEANUPS'))throw Error('v19 missing takeover cleanup registry');
if(!files.v19.includes('removeEventListener')||!files.v19.includes('disconnect()'))throw Error('v19 does not release legacy breed listeners/observer');

console.log(JSON.stringify({
  passed:true,
  method:'optimized legacy responsibility contract',
  preservedResponsibilities:{
    v18:['master pedigree guidance/autofill via shared engine'],
    v19:['recursive 15-ancestor derivation for farm horses'],
    v25:['public nitro helper API only'],
    integration:['pair cache/current cards/filters/future continuation']
  },
  removedRuntime:['breed-helper.js','v20.js','v21.js','v25 hidden simulator/filter']
},null,2));
