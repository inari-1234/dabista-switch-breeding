'use strict';
const fs=require('fs'),assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const idx=read('index.html'),app=read('app.js'),v15=read('v15.js'),v16=read('v16.js'),v18=read('v18.js'),v22=read('v22.js'),v25=read('v25.js'),v26=read('v26.js'),v27=read('v27.js'),v28=read('v28.js'),refresh=read('ui-refresh.js'),engine=read('breeding-engine.js');
const scripts=[...idx.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);

for(const x of ['breed-helper.js','v19.js','v20.js','v21.js'])assert.ok(!scripts.includes(x),'inactive legacy layer loaded: '+x);
assert.ok(!fs.existsSync('v20.js'),'obsolete v20 source must be physically removed');
assert.ok(!fs.existsSync('v21.js'),'obsolete v21 source must be physically removed');
assert.ok(!fs.existsSync('v19.js'),'obsolete v19 source must be physically removed');
assert.ok(!fs.existsSync('breed-helper.js'),'obsolete breed helper source must be physically removed');
for(const x of ['breeding-core.js','breeding-engine.js','v15.js','v16.js','v18.js','sale-planner-core.js','sale-recommendation-core.js','breed-integration.js','v25.js','v26.js','v27.js','v28.js'])assert.ok(scripts.includes(x),'runtime script missing '+x);
assert.ok(scripts.indexOf('breeding-engine.js')<scripts.indexOf('v15.js'));
assert.ok(scripts.indexOf('breeding-engine.js')<scripts.indexOf('v16.js'));
assert.ok(scripts.indexOf('breeding-engine.js')<scripts.indexOf('v18.js'));

const runtime={app,v15,v16,v18,v22,v25,v26,v27,v28,refresh};
for(const [name,src] of Object.entries(runtime)){
  if(name==='app')continue;
  assert.ok(!src.includes('version.json'),name+' must not independently check version.json');
}
assert.strictEqual((app.match(/version\.json/g)||[]).length,1,'only one update service may fetch version.json');
assert.ok(app.includes('window.DABISTA_UPDATE_SERVICE'),'central update service missing');
assert.ok(!app.includes("$('#photo').onchange"),'app must not own obsolete photo input placeholder');
assert.ok(v22.includes("p.onchange=e=>openMerge(e.target.files)"),'v22 must own photo merge input');
assert.ok(!v22.includes("setTimeout(()=>{migrate();installPhoto()"),'photo merge ownership must not wait for startup timer');
assert.ok(app.includes('multigenRanking'),'central diagnostic must report multigeneration state');
assert.ok(app.includes('breedingEngine'),'central diagnostic must report breeding-engine state');
for(const token of ['sourceFingerprint','generatedAt','fallbackOccurred','fallbackMode','freshnessBasis','pendingCount','cachedCount','planner:{generationAdvisor']){
  assert.ok(app.includes(token),'central diagnostic missing '+token);
}

for(const token of ['data/theory-master.json','data/pedigree-master.json','data/default-broodmares.json','data/stallions.json']){
  assert.ok(engine.includes(token),'shared engine missing '+token);
  for(const [name,src] of Object.entries({v16,v18,v22,v25,v26,v27,v28})){
    assert.ok(!src.includes("fetch('"+token)&&!src.includes('json(\''+token),name+' refetches shared master '+token);
  }
}
assert.ok(v16.includes('DABISTA_BREEDING_ENGINE.ready'),'v16 must reuse shared engine masters');
assert.ok(v18.includes('DABISTA_BREEDING_ENGINE.ready'),'v18 must reuse shared theory master');
assert.ok(v18.includes('fillMasterPedigree')&&v18.includes('installPedigreeGuidance'),'v18 pedigree guidance must remain');
assert.ok(!v18.includes('MutationObserver')&&!v18.includes('installTheoryControls')&&!v18.includes('decorateBreedCards'),'v18 must not install legacy candidate UI');
assert.ok(!v18.includes('DABISTA_BREED_LEGACY_CLEANUPS'),'v18 legacy cleanup registry must be gone');
assert.ok(!read('breed-integration.js').includes('releaseLegacyBreedUi'),'integration cleanup shim must be gone');
assert.ok(!fs.existsSync('data/rebuild-research.json'),'unused rebuild research dataset must be physically removed');
assert.ok(!fs.existsSync('v24.js'),'dynamic rebuild shell source must be physically removed');
assert.ok(idx.includes('data-tab="rebuild">再建</button>'),'rebuild tab rename requires explicit user approval');
assert.ok(idx.includes('<section id="rebuild" class="hidden">'),'rebuild shell must be static');
for(const id of ['rebuildGoal','rebuildStarter','rebuildStatus','rebuildBody'])assert.ok(!idx.includes('id="'+id+'"'),'dead rebuild placeholder remains: '+id);
assert.ok(app.includes("['horses','races','breed','rebuild','backup']"),'central tab switcher must own rebuild');
assert.ok(!v25.includes('fetch(')&&!v25.includes('MutationObserver'),'v25 compatibility API must stay DOM/network free');
assert.ok(v25.includes('DABISTA_NITRO_ENGINE'),'nitro compatibility API must remain');

assert.ok(v27.includes('multigen-unavailable'),'ranking unavailable state missing');
assert.ok(!v27.includes('setTimeout(buildPurposeRankings,120)'),'298-mare fallback scan must not run on device');
assert.ok(v27.includes('1〜4代AI順位データを取得できません'),'ranking failure must be visible');

assert.ok(!idx.includes('id="raceDlg"'),'legacy race dialog must be removed');
assert.ok(!app.includes("$('#raceForm').onsubmit"),'legacy race submit handler must be removed');
assert.ok(refresh.includes('4代先まで考える。'),'home copy must match Build71 generation scope');
assert.ok(refresh.includes("rebuild:'再建'"),'navigation label rename requires explicit user approval');
assert.ok(idx.indexOf('id="diagBtn"')>idx.indexOf('id="backup"'),'diagnostic export must live in save/support area, not primary header');

console.log(JSON.stringify({
  passed:true,
  runtimeScripts:scripts.length,
  removedLegacy:['breed-helper.js','v19.js','v20.js','v21.js','legacy race dialog','legacy rebuild research UI'],
  physicallyRemoved:['v20.js','v21.js','v19.js','breed-helper.js','v24.js','data/rebuild-research.json'],
  centralized:['master data loading','update check','diagnostic export'],
  fallback:'selected mare only; no 298-mare device scan'
},null,2));
