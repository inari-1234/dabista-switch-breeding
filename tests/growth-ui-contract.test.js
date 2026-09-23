'use strict';
const fs=require('fs');
const assert=require('assert');

const app=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const v16=fs.readFileSync('v16.js','utf8');
const db=fs.readFileSync('growth-db.js','utf8');
const model=fs.readFileSync('growth-model.js','utf8');
const core=fs.readFileSync('growth-core.js','utf8');
const ui=fs.readFileSync('growth-ui.js','utf8');

assert.ok(index.includes('growth-db.js?v=1.19.1-b53'),'growth DB script missing');
assert.ok(index.includes('growth-model.js?v=1.19.1-b53'),'growth model script missing');
assert.ok(index.includes('growth-core.js?v=1.19.1-b53'),'growth core script missing');
assert.ok(index.includes('growth-ui.js?v=1.19.1-b53'),'growth UI script missing');
assert.ok(index.indexOf('growth-db.js?v=1.19.1-b53')<index.indexOf('app.js?v=1.19.1-b53'),'growth DB must load before app initialization');
assert.ok(index.indexOf('growth-model.js?v=1.19.1-b53')<index.indexOf('growth-core.js?v=1.19.1-b53'),'growth model must load before growth core');
assert.ok(index.indexOf('ui-refresh.js?v=1.19.1-b53')<index.indexOf('growth-ui.js?v=1.19.1-b53'),'growth UI must load after existing UI refresh');

assert.ok(app.includes('window.DABISTA_GROWTH_DB?.normalizeInPlace(db)'),'startup DB growth normalization missing');
assert.ok(app.includes('window.DABISTA_GROWTH_DB?.normalizeInPlace(restored)'),'restored backup growth normalization missing');
assert.ok(app.includes("age:+($('#raceAge')?.value)||''"),'new race age snapshot missing');
assert.ok(app.includes("month:+($('#raceMonth')?.value)||''"),'new race month snapshot missing');
assert.ok(app.includes("function score(id){const r=db.races.filter"),'legacy lifetime score must remain separate');
assert.ok(!core.includes('horseScore'),'growth core must not depend on lifetime score');
assert.ok(!core.includes('breeding-core')&&!core.includes('sale-planner-core')&&!core.includes('breed-integration'),'growth core must not depend on breeding engine');
assert.ok(!model.includes('breeding-core')&&!db.includes('breeding-core'),'growth model/DB must remain independent from breeding engine');
for(const src of [model,core,ui]){
  assert.ok(!src.includes('growthRate')&&!src.includes('completionRate'),'unverified fixed growth/completion coefficients must not be introduced');
  assert.ok(!src.includes('currentWeek'),'normal product workflow must remain month-centered');
}

assert.ok(v16.includes("if(e.target.closest('[data-horse-action]'))return"),'horse card action guard missing');
assert.ok(app.includes("if(e.target.closest('[data-horse-action]'))return"),'base horse card action guard missing');
assert.ok(ui.includes('data-horse-action="growth-record"'),'growth record card action missing');
assert.ok(ui.includes('data-horse-action="growth-history"'),'growth history card action missing');
assert.ok(ui.includes("const sec=$('#races')"),'growth research tools must integrate into existing results tab');
assert.ok(!ui.includes('data-tab="growth"')&&!ui.includes("dataset.tab='growth'"),'growth feature must not add a new top-level tab');

assert.ok(ui.includes('growthCheckSets'),'comparison set storage missing');
assert.ok(ui.includes('conditionFingerprint'),'comparison condition fingerprint missing');
assert.ok(ui.includes("Number(prev.revision||1)+1"),'condition changes must create a new comparison-set revision');
assert.ok(ui.includes('db.growthChecks.push'),'research observation persistence missing');
assert.ok(ui.includes('<option value="">未観測</option>'),'baseline comparison must default to unobserved');
assert.ok(ui.includes(".filter(x=>x.value).map(x=>({baselineId:x.dataset.growthBaseline,result:x.value}))"),'unobserved baselines must not be persisted');
assert.ok(ui.includes("growthChecks:(db.growthChecks||[]).filter"),'diagnosis must derive from stored observations');
assert.ok(ui.includes("races:(db.races||[]).filter"),'dated normal races must feed diagnosis without copying');
assert.ok(ui.includes('疲労は成長判定には使わず、出走判断だけに反映します。'),'fatigue/growth UI boundary missing');
assert.ok(ui.includes('旧レースへは推測補完しません。'),'legacy race no-inference warning missing');
assert.ok(app.includes('class="growth-race-date"'),'dated race snapshot must be visible in the existing results table');
assert.ok(app.includes('data-race-horse-id'),'race cards must expose stable horse identity for growth decoration');
assert.ok(ui.includes('function decorateRaceCards()'),'results tab growth summary missing');
assert.ok(ui.includes('growth-race-diagnosis'),'growth diagnosis must appear alongside race results');
assert.ok(app.includes('window.DABISTA_GROWTH_UI?.refresh?.()'),'backup restore must refresh growth UI without reload');
assert.ok(ui.includes('refresh:()=>{decorateHorseCards();decorateRaceCards();renderResearchPanel()}'),'growth UI refresh API missing');
assert.ok(ui.includes('data-growth-delete-check'),'research observations must be removable');
assert.ok(ui.includes('advanceGrowthMonth'),'monthly workflow advance helper missing');
assert.ok(ui.includes('完成確定ではない'),'growth milestones must never be presented as confirmed completion');
assert.ok(!ui.includes('growthState:')&&!ui.includes('raceAdvice:'),'derived diagnosis results must not be persisted into DB records');

assert.ok(db.includes('SCHEMA_VERSION=2'),'growth DB schema version missing');
assert.ok(!/for\s*\([^)]*db\.horses/.test(db),'growth migration must not mass-mutate horse records');
assert.ok(!/for\s*\([^)]*db\.races/.test(db),'growth migration must not mass-mutate race records');

console.log(JSON.stringify({
  passed:true,
  loadOrder:true,
  noNewTab:true,
  horseActionGuard:true,
  scoreSeparated:true,
  breedingIndependence:true,
  comparisonRevision:true,
  noLegacyDateInference:true
},null,2));
