'use strict';
const fs=require('fs'),assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const idx=read('index.html'),app=read('app.js'),v15=read('v15.js'),v16=read('v16.js'),v18=read('v18.js'),v19=read('v19.js'),v22=read('v22.js'),v24=read('v24.js'),v25=read('v25.js'),v26=read('v26.js'),v27=read('v27.js'),v28=read('v28.js'),refresh=read('ui-refresh.js'),engine=read('breeding-engine.js');
const scripts=[...idx.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);

for(const x of ['breed-helper.js','v19.js','v20.js','v21.js'])assert.ok(!scripts.includes(x),'inactive legacy layer loaded: '+x);
assert.ok(!fs.existsSync('v20.js'),'obsolete v20 source must be physically removed');
for(const x of ['breeding-core.js','breeding-engine.js','v15.js','v16.js','v18.js','sale-planner-core.js','sale-recommendation-core.js','breed-integration.js','v25.js','v26.js','v27.js','v28.js'])assert.ok(scripts.includes(x),'runtime script missing '+x);
assert.ok(scripts.indexOf('breeding-engine.js')<scripts.indexOf('v15.js'));
assert.ok(scripts.indexOf('breeding-engine.js')<scripts.indexOf('v16.js'));
assert.ok(scripts.indexOf('breeding-engine.js')<scripts.indexOf('v18.js'));

const runtime={app,v15,v16,v18,v19,v22,v24,v25,v26,v27,v28,refresh};
for(const [name,src] of Object.entries(runtime)){
  if(name==='app')continue;
  assert.ok(!src.includes('version.json'),name+' must not independently check version.json');
}
assert.strictEqual((app.match(/version\.json/g)||[]).length,1,'only one update service may fetch version.json');
assert.ok(app.includes('window.DABISTA_UPDATE_SERVICE'),'central update service missing');
assert.ok(app.includes('multigenRanking'),'central diagnostic must report multigeneration state');
assert.ok(app.includes('breedingEngine'),'central diagnostic must report breeding-engine state');
for(const token of ['sourceFingerprint','generatedAt','fallbackOccurred','fallbackMode','freshnessBasis','pendingCount','cachedCount','planner:{generationAdvisor']){
  assert.ok(app.includes(token),'central diagnostic missing '+token);
}

for(const token of ['data/theory-master.json','data/pedigree-master.json','data/default-broodmares.json','data/stallions.json']){
  assert.ok(engine.includes(token),'shared engine missing '+token);
  for(const [name,src] of Object.entries({v16,v18,v19,v22,v24,v25,v26,v27,v28})){
    assert.ok(!src.includes("fetch('"+token)&&!src.includes('json(\''+token),name+' refetches shared master '+token);
  }
}
assert.ok(v16.includes('DABISTA_BREEDING_ENGINE.ready'),'v16 must reuse shared engine masters');
assert.ok(v18.includes('DABISTA_BREEDING_ENGINE.ready'),'v18 must reuse shared theory master');
assert.ok(!v24.includes('rebuild-research.json'),'legacy research dataset must not load in primary runtime');
assert.ok(!v24.includes('SP+ST'),'legacy SP+ST research summary must be removed from primary runtime');
assert.ok(v24.includes("b.textContent='再建'"),'rebuild tab rename requires explicit user approval');
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
  centralized:['master data loading','update check','diagnostic export'],
  fallback:'selected mare only; no 298-mare device scan'
},null,2));
