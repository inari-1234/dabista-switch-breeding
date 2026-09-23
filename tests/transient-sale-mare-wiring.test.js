'use strict';
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const app=read('app.js');
const helper=read('breed-helper.js');
const v15=read('v15.js');
const v16=read('v16.js');
const v18=read('v18.js');
const v19=read('v19.js');
const v20=read('v20.js');
const v21=read('v21.js');
const v25=read('v25.js');
const v26=read('v26.js');
const v28=read('v28.js');
const breedingEngine=read('breeding-engine.js');
const idx=read('index.html');
const version=JSON.parse(read('version.json'));

assert.strictEqual(version.version,'1.19.1');
assert.strictEqual(version.build,'2026.09.23-52');
assert.ok(app.includes("const APP_VERSION='1.19.1';"));
assert.ok(app.includes("const APP_BUILD='2026.09.23-52';"));
assert.ok(app.includes('window.DABISTA_TRANSIENT_BREED_MARE=null'));
assert.ok(breedingEngine.includes("BUILD=window.APP_BUILD||'2026.09.23-52'"),'breeding-engine must use shared APP_BUILD');
assert.ok(app.includes('window.getBreedHorseById=id=>'));
assert.strictEqual((app.match(/setTimeout\(\(\)=>checkUpdate\(false\)/g)||[]).length,1,'automatic update check must be centralized in app.js');
for(const p of ['v15.js','v16.js','v18.js','v26.js']){
  const legacy=read(p);
  assert.strictEqual((legacy.match(/setTimeout\(\(\)=>checkUpdate\(false\)/g)||[]).length,0,p+' must not auto-check updates');
}

for(const p of ['v15.js','v16.js','v18.js','v19.js','v20.js','v21.js','v22.js','v24.js','v25.js','v26.js','v28.js']){
  const c=read(p);
  assert.ok(c.includes("V=window.APP_VERSION||'1.19.1'"),p+' must use shared APP_VERSION');
  assert.ok(c.includes("BUILD=window.APP_BUILD||'2026.09.23-52'"),p+' must use shared APP_BUILD');
  assert.ok(!c.includes('2026.09.21-44'),p+' stale Build 44');
  assert.ok(!c.includes('2026.09.20-35'),p+' stale Build 35');
  assert.ok(!c.includes('2026.09.20-37'),p+' stale Build 37');
  assert.ok(!c.includes('2026.09.20-38'),p+' stale Build 38');
  assert.ok(!c.includes('2026.09.21-43'),p+' stale Build 43');
}

const ensureStart=v26.indexOf('function ensureSaleMareForBreed(name){');
const ensureEnd=v26.indexOf('\nfunction openRouteInBreed(id){',ensureStart);
assert.ok(ensureStart>=0&&ensureEnd>ensureStart);
const ensureBlock=v26.slice(ensureStart,ensureEnd);
assert.ok(ensureBlock.includes('window.DABISTA_TRANSIENT_BREED_MARE=h'));
assert.ok(ensureBlock.includes('transientBreedOnly:true'));
assert.ok(!ensureBlock.includes('db.horses.push('),'route viewing must not persist a sale mare');
assert.ok(!ensureBlock.includes('save();'),'route viewing must not save a transient mare');
assert.ok(!v26.includes('salePlannerSync:true'),'new Build must not create legacy persistent sync records');
assert.ok(v26.includes('function cleanupLegacySaleSync()'));
assert.ok(v26.includes("h?.salePlannerSync===true"));
assert.ok(v26.includes("!races.some(r=>r.horseId===h.id)"));

assert.ok(helper.includes('window.DABISTA_TRANSIENT_BREED_MARE'));
assert.ok(helper.includes('window.getBreedHorseById?.(id)'));
assert.ok(helper.includes('（セリ設計・一時）'));

for(const [p,c] of [['v15.js',v15],['v18.js',v18],['v19.js',v19],['v20.js',v20],['v21.js',v21],['v25.js',v25]]){
  assert.ok(c.includes('getBreedHorseById'),p+' must resolve transient breed mare');
}
assert.ok(v15.includes('15祖先内蔵'));
assert.ok(v15.includes('馬DB・バックアップJSONには保存されません'));

assert.ok(v16.includes('function installCompactHorseForm()'),'compact horse form installer missing');
assert.ok(v16.includes('horse-form-sticky-head'),'sticky save/cancel header missing');
assert.ok(v16.includes('血統を詳しく入力・自動補完'),'pedigree details must be collapsible');
assert.ok(v16.includes('距離・実績・戦績・メモ'),'performance details must be collapsible');
assert.ok(v16.includes("roleMemoWrap=roleMemo?.parentElement"),'usage memo must move out of the top-level form');
assert.ok(v16.includes("generationWrap=generation?.parentElement"),'generation/classification must move into details');
assert.ok(v16.includes("if(brood&&sex)sex.value='牝'"),'broodmare role must auto-set female sex');
assert.ok(v16.includes("if(sireRole&&sex)sex.value='牡'"),'sire roles must auto-set male sex');
assert.ok(v16.includes("sexRow.hidden=brood||sireRole"),'redundant sex row must be hidden for fixed-sex breeding roles');
assert.ok(v16.includes("form.requestSubmit()"),'top save action must submit without scrolling to form bottom');
assert.ok(v26.includes('function openRouteRegister(ctx,generation)'),'route offspring registration action missing');
assert.ok(v26.includes("role==='broodmare'?'牝':'牡'"),'route registration must support broodmare and sire-candidate roles');
assert.ok(v26.includes('<option value="stallion">種牡馬</option>'),'route registration must also allow an active stallion role');
assert.ok(v26.includes('ancestor15:[...a]'),'route registration must persist exact 15-ancestor pedigree');
assert.ok(v26.includes("SP/ST/PWは血統上のニトロ"),'route registration must not mislabel pedigree nitro as horse ability');
assert.ok(v26.includes("pair-pedigree-evidence-not-horse-ability"),'route registration must persist pair evidence with an explicit non-ability boundary');
assert.ok(v16.includes('配合時血統評価'),'registered horse card must expose route provenance');
assert.ok(v16.includes('※馬自身の能力値ではありません'),'route pedigree evidence must be visibly separated from horse ability');
assert.ok(v26.includes('matchingPreviousMares(ctx,generation)'),'multi-generation registration must require the actual prior broodmare pedigree');
assert.ok(v26.includes('この産駒を牧場DBへ登録'),'route bridge registration CTA missing');

assert.ok(idx.includes('breed-helper.js?v=1.19.1-b52'),'breed-helper.js cache key');
for(const p of ['v15.js','v16.js','v18.js','v19.js','v20.js','v21.js','v22.js','v24.js','v25.js']){
  assert.ok(idx.includes(p+'?v=1.19.1-b52'),p+' cache key');
}
assert.ok(idx.includes('app.js?v=1.19.1-b52'),'app cache key');
assert.ok(idx.includes('sale-planner-core.js?v=1.19.1-b52'),'sale planner core cache key');
assert.ok(idx.includes('sale-recommendation-core.js?v=1.19.1-b52'),'sale recommendation core cache key');
assert.ok(idx.includes('v26.js?v=1.19.1-b52'),'v26 cache key');
assert.ok(idx.includes('v27.js?v=1.19.1-b52'),'v27 cache key');
assert.ok(idx.includes('v28.js?v=1.19.1-b52'),'v28 cache key');

console.log(JSON.stringify({
  passed:true,
  build:version.build,
  transientResolver:true,
  persistentRouteSync:false,
  legacyCleanup:true,
  integrationFiles:6
},null,2));
