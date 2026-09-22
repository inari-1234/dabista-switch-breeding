'use strict';
const assert=require('assert');
const fs=require('fs');
const core=require('../breeding-core.js');
const plannerCore=require('../sale-planner-core.js');
const advisorCore=require('../sale-recommendation-core.js');
const theory=require('../data/theory-master.json');
const effects=require('../data/nitro-effects.json');
const kotta=require('../data/kotta-pairs.json');
const direct=require('../data/elaborate-direct-exceptions.json');
const stallionData=require('../data/stallions.json');
const mareData=require('../data/default-broodmares.json');
const inheritance=require('../data/planner-inheritance-validation.json');

const knownDifferences=(inheritance.samples||[])
  .filter(x=>x&&x.sire&&x.mare&&x.ours&&x.ours.kc!==x.oracle?.k)
  .map(x=>({sire:x.sire,mare:x.mare,oracle:x.oracle,ours:x.ours}));

const engine=core.create({
  effects:effects.effects||[],
  elaboratePairs:kotta.pairs||[],
  directElaboratePairs:direct.pairs||[],
  elaborateKnownDifferences:knownDifferences
});
const planner=plannerCore.create({
  engine,
  stallions:theory.stallions||[],
  stallionStats:stallionData.stallions||[],
  broodmares:theory.broodmares||[],
  broodmareStats:mareData.broodmares||[]
});
const advisor=advisorCore.create({planner,broodmareStats:mareData.broodmares||[]});

const cases={
  'スプリングスイーツ':'elite-complete',
  'エイスト':'elite-st-sp',
  'ミゼラブルウェイ':'high-balanced',
  'ミニミニデート':'sp-st-repair',
  'アルムナイ':'st-sp-repair',
  'アオイツキアカリ':'rebuild',
  'アマリン':'unknown'
};
for(const [name,id] of Object.entries(cases)){
  assert.strictEqual(advisor.mareStrategy(name).id,id,name+' strategy');
}

const spring=advisor.mareAssessment('スプリングスイーツ');
assert.strictEqual(spring.ranks.spst.rank,2);
assert.strictEqual(spring.ranks.st.rank,1);
assert.strictEqual(spring.ranks.pw.rank,3);
assert.deepStrictEqual(advisor.mareStrategy('スプリングスイーツ').preserve,['SP','ST','PW']);
assert.deepStrictEqual(advisor.mareStrategy('スプリングスイーツ').improve,[]);
assert.deepStrictEqual(advisor.mareStrategy('エイスト').preserve,['ST','PW']);
assert.deepStrictEqual(advisor.mareStrategy('エイスト').improve,['SP']);

const roseStrategy=advisor.mareStrategy('ローズティンテッド');
assert.deepStrictEqual(roseStrategy.improve,[],'Rose Tinted has no confirmed deficiency axis');
assert.deepStrictEqual(roseStrategy.strengths,['SP','PW'],'Rose Tinted strengths must expose SP/PW');
assert.deepStrictEqual(roseStrategy.relativeAdjust,['ST'],'Rose Tinted ST must be relative adjustment, not a deficiency');

function directSummary(name){
  const s=advisor.emptySummary('direct');
  for(const r of planner.iterateDirect(name))advisor.addRoute(s,r);
  return s;
}
const roseReason=advisor.goalMareReason('ローズティンテッド','arc',directSummary('ローズティンテッド'));
assert.ok(roseReason.reasons.includes('強み：SP・PW'),'Rose Tinted reason must expose actual strengths');
assert.ok(roseReason.reasons.some(x=>x.includes('相対調整：ST')&&x.includes('弱点扱いではない')),'Rose Tinted reason must distinguish relative adjustment from weakness');

for(const mare of mareData.broodmares.filter(x=>advisor.mareAssessment(x.name)?.abilityKnown)){
  for(const goal of ['arc','bc','rebuild','stallion']){
    const decision=advisor.goalMareReason(mare.name,goal,advisor.emptySummary('test'));
    assert.ok(!(decision.reasons||[]).some(x=>x.includes('不足軸')),mare.name+' '+goal+' must not use the generic deficiency-axis wording');
  }
}

const unknownArcReasonVariants=new Set();
for(const mare of mareData.broodmares.filter(x=>!advisor.mareAssessment(x.name)?.abilityKnown)){
  const decision=advisor.goalMareReason(mare.name,'arc',directSummary(mare.name));
  assert.strictEqual(advisor.mareAssessment(mare.name).abilityKnown,false,mare.name+' ability must remain unknown');
  unknownArcReasonVariants.add((decision.reasons||[]).join('|'));
}
assert.ok(unknownArcReasonVariants.size>1,'unknown mares must expose different bloodline outlooks without inventing ability values');

const ui=fs.readFileSync('v27.js','utf8');
assert.ok(ui.includes("decision.reasons||[]"),'v27 must render mare-specific decision reasons');
assert.ok(ui.includes('mare-why-reasons'),'v27 must include compact reason UI');
assert.ok(ui.includes('相対調整：'),'v27 must render relative adjustment wording');
assert.ok(!ui.includes('不足軸'),'v27 must not restore generic deficiency-axis wording');

function firstThree(name){
  const two=planner.iterateTwo(name).next();
  assert.strictEqual(two.done,false,name+' two-gen route exists');
  const three=planner.iterateThirdPreview(name,[two.value]).next();
  assert.strictEqual(three.done,false,name+' three-gen route exists');
  return planner.expandRoute(name,three.value,'arc');
}
const route=firstThree('スプリングスイーツ');
const a1=advisor.selectionAdvice('スプリングスイーツ','arc',route.stages[0],3);
const a2=advisor.selectionAdvice('スプリングスイーツ','arc',route.stages[1],3);
const a3=advisor.selectionAdvice('スプリングスイーツ','arc',route.stages[2],3);
assert.strictEqual(a1.phase,'素材づくり');
assert.strictEqual(a1.headline,'母の高能力を崩さないことを最優先');
assert.ok(a1.body.includes('2400m適性を必須にしません'));
assert.strictEqual(a2.phase,'締め前の方向付け');
assert.ok(a2.body.includes('2400m印は絶対条件にせず'),'Arc guidance must explicitly keep 2400m as evidence rather than a hard gate');
assert.strictEqual(a3.phase,'締め');
assert.ok(a3.body.includes('最終世代ではじめて'));

const mini=firstThree('ミニミニデート');
const mini1=advisor.selectionAdvice('ミニミニデート','arc',mini.stages[0],3);
const mini2=advisor.selectionAdvice('ミニミニデート','arc',mini.stages[1],3);
assert.strictEqual(mini1.headline,'SPを残しながらST改善の兆候を拾う');
assert.strictEqual(mini2.headline,'締め前にST不足を解消する');

const alma=firstThree('アルムナイ');
assert.strictEqual(advisor.selectionAdvice('アルムナイ','arc',alma.stages[0],3).headline,'STを残しながらSP改善を優先');

const low=firstThree('アオイツキアカリ');
assert.strictEqual(advisor.selectionAdvice('アオイツキアカリ','arc',low.stages[0],3).headline,'完成形ではなく「母より一段改善」を狙う');

const unknown=firstThree('アマリン');
const u1=advisor.selectionAdvice('アマリン','arc',unknown.stages[0],3);
assert.strictEqual(u1.phase,'能力確認を兼ねた素材づくり');
assert.ok(u1.body.includes('特定距離の印を最初から必須にしません'));

const generic='高SP・高STの牝馬だけを選抜し、2000～2400mの印・距離対応を実馬で確認して次世代へ進む。';
let allMaresChecked=0,unknownChecked=0;
for(const mare of mareData.broodmares){
  const first=planner.iterateDirect(mare.name).next();
  assert.strictEqual(first.done,false,mare.name+' direct route exists');
  const expanded=planner.expandRoute(mare.name,first.value,'arc');
  const adv=advisor.selectionAdvice(mare.name,'arc',expanded.stages[0],3);
  assert.ok(adv&&adv.body,mare.name+' stage advice exists');
  assert.notStrictEqual(adv.body,generic,mare.name+' must not use old generic selection text');
  allMaresChecked++;
  if(advisor.mareStrategy(mare.name).id==='unknown'){
    unknownChecked++;
    assert.strictEqual(adv.headline,'まず母系の実力を把握する',mare.name+' unknown mare guidance');
  }
}
assert.strictEqual(allMaresChecked,331);
assert.strictEqual(unknownChecked,33);
for(const name of Object.keys(cases)){
  const r=firstThree(name);
  for(const st of r.stages.slice(0,-1)){
    const adv=advisor.selectionAdvice(name,'arc',st,r.stages.length);
    assert.notStrictEqual(adv.body,generic,name+' must not use old generic selection text');
  }
}

console.log(JSON.stringify({
  passed:true,
  spring:{spstRank:spring.ranks.spst.rank,stage1:a1.headline,stage2:a2.headline,final:a3.headline},
  strategies:cases,
  allMaresChecked,
  unknownChecked,
  rose:{strengths:roseStrategy.strengths,relativeAdjust:roseStrategy.relativeAdjust,reasons:roseReason.reasons},
  unknownArcReasonVariants:unknownArcReasonVariants.size
},null,2));
