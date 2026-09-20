'use strict';
const assert=require('assert');
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
  'スプリングスイーツ':'elite-preserve',
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
assert.ok(a2.body.includes('2400m印を絶対条件にはせず'));
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
  strategies:cases
},null,2));
