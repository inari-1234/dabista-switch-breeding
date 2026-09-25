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

assert.ok(index.includes('growth-db.js?v=1.19.1-b68'),'growth DB script missing');
assert.ok(index.includes('growth-model.js?v=1.19.1-b68'),'growth model script missing');
assert.ok(index.includes('growth-core.js?v=1.19.1-b68'),'growth core script missing');
assert.ok(index.includes('growth-ui.js?v=1.19.1-b68'),'growth UI script missing');
assert.ok(index.indexOf('growth-db.js?v=1.19.1-b68')<index.indexOf('app.js?v=1.19.1-b68'),'growth DB must load before app initialization');
assert.ok(index.indexOf('growth-model.js?v=1.19.1-b68')<index.indexOf('growth-core.js?v=1.19.1-b68'),'growth model must load before growth core');
assert.ok(index.indexOf('ui-refresh.js?v=1.19.1-b68')<index.indexOf('growth-ui.js?v=1.19.1-b68'),'growth UI must load after existing UI refresh');

assert.ok(app.includes('window.DABISTA_GROWTH_DB?.normalizeInPlace(db)'),'startup DB growth normalization missing');
assert.ok(app.includes('window.DABISTA_GROWTH_DB?.normalizeInPlace(restored)'),'restored backup growth normalization missing');
assert.ok(app.includes("function score(id){const r=db.races.filter"),'legacy lifetime score must remain separate');
assert.ok(!core.includes('horseScore'),'growth core must not depend on lifetime score');
assert.ok(!core.includes('breeding-core')&&!core.includes('sale-planner-core')&&!core.includes('breed-integration'),'growth core must not depend on breeding engine');
assert.ok(!model.includes('breeding-core')&&!db.includes('breeding-core'),'growth model/DB must remain independent from breeding engine');
for(const src of [model,core,ui]){
  assert.ok(!src.includes('growthRate')&&!src.includes('completionRate'),'unverified fixed growth/completion coefficients must not be introduced');
  assert.ok(!src.includes('currentWeek'),'normal product workflow must remain month-centered');
}

assert.ok(v16.includes("if(e.target.closest('[data-horse-action],details,button,input,select,textarea,a,label'))return"),'horse card nested-control guard missing');
assert.ok(ui.includes('data-horse-action="growth-record"'),'quick race action missing');
assert.ok(ui.includes('data-horse-action="growth-history"'),'history action missing');
assert.ok(ui.includes('今月の出走判断'),'timing decision headline missing');
assert.ok(ui.includes('＋ 今月のレースを記録'),'quick race CTA missing');
assert.ok(ui.includes('成長履歴を見る'),'history CTA missing');
assert.ok(ui.includes("if(h.role==='broodmare'&&!h.routeSource)return false"),'route-source mares must stay growth-trackable while ordinary broodmares remain hidden');
assert.ok(ui.includes("String(h.generation||'').includes('基準種牡馬')"),'baseline stallion must not show timing diagnosis');

assert.ok(ui.includes("growthChecks:[]"),'legacy BC observations must not drive user-facing timing diagnosis');
assert.ok(ui.includes("growthCheckSets:[]"),'legacy BC comparison sets must not drive user-facing timing diagnosis');
assert.ok(!ui.includes('固定BC比較'),'fixed BC comparison UI must be removed');
assert.ok(!ui.includes('比較セット管理'),'comparison-set management UI must be removed');
assert.ok(!ui.includes('db.growthChecks.push'),'new BC research observations must not be created');
assert.ok(!ui.includes('growthSetDlg'),'comparison-set dialog must be removed');

assert.ok(ui.includes("const grades=['G1','G2','G3','OP','その他']"),'race grade choices missing');
assert.ok(ui.includes("const quickDistances=[1200,1600,1800,2000,2400]"),'quick distance choices missing');
assert.ok(ui.includes("const marks=['◎','○','▲','△','－']"),'mark choices missing');
assert.ok(ui.includes("const finishes=['1','2','3','4–5','6以下']"),'finish choices missing');
assert.ok(ui.includes("source:'timing-quick-record'"),'quick timing record source marker missing');
assert.ok(ui.includes("name:grade,grade,distance"),'grade and distance must be saved without manual race-name entry');
assert.ok(ui.includes("observationOrder:Date.now()"),'same-month observation order missing');
assert.ok(ui.includes("activeHorse.currentAge=age;activeHorse.currentMonth=month"),'horse current month must advance from saved observation');
assert.ok(ui.includes("if(last&&age&&month&&Number(last.age)===age&&Number(last.month)===month)"),'next-month suggestion missing');
assert.ok(ui.includes("add.onclick=()=>openRecord(null)"),'results-tab add action must open quick selector');
assert.ok(ui.includes("add.textContent='＋ レース結果を記録'"),'results-tab quick record label missing');

assert.ok(ui.includes("label:'もう1か月待つ候補'"),'wait-a-month decision missing');
assert.ok(ui.includes("label:'同格なら出走候補'"),'same-class go decision missing');
assert.ok(ui.includes("kind==='progress'"),'mark improvement must feed go decision');
assert.ok(ui.includes("weakMark(latest?.mark4)"),'weak latest mark must feed wait decision');
assert.ok(ui.includes('レースと印の変化'),'timeline section missing');
assert.ok(ui.includes("const cls=delta==='印改善'?'up':delta==='印低下'?'down':''"),'history change classification missing');

assert.ok(ui.includes('必要なときだけ育成設定'),'advanced settings must be collapsed by default');
assert.ok(ui.includes('完成確定ではありません'),'growth milestones must remain reference-only');
assert.ok(!ui.includes('growthState:')&&!ui.includes('raceAdvice:'),'derived diagnosis results must not be persisted into DB records');

assert.ok(db.includes('SCHEMA_VERSION=2'),'growth DB schema version missing');
assert.ok(db.includes('growthCheckSets')&&db.includes('growthChecks'),'legacy BC arrays must remain for backup compatibility');
assert.ok(!/for\s*\([^)]*db\.horses/.test(db),'growth migration must not mass-mutate horse records');
assert.ok(!/for\s*\([^)]*db\.races/.test(db),'growth migration must not invent historical race dates');

assert.ok(index.indexOf('v16.js?v=1.19.1-b68')<index.indexOf('growth-ui.js?v=1.19.1-b68'),'dialog patch must load before dynamically-created timing dialogs');
assert.ok(v16.includes("HTMLDialogElement.prototype.showModal=function(){lockBody();if(!this.__dabistaUnlockBound){this.__dabistaUnlockBound=true;this.addEventListener('close',unlockBody)}return nativeShow.call(this)}"),'dynamic dialog showModal must bind unlockBody');
assert.ok(ui.includes("d.id='growthQuickRaceDlg'"),'quick race dialog missing');
assert.ok(ui.includes("d.id='growthHistoryDlg'"),'growth history dialog missing');

console.log(JSON.stringify({
  passed:true,
  raceOnlyTiming:true,
  fixedBcUiRemoved:true,
  quickSelectRecording:true,
  waitOrGoDecision:true,
  historyTimeline:true,
  legacyBackupCompatible:true
},null,2));