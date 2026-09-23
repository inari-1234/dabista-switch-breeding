'use strict';
const assert=require('assert');
const growth=require('../growth-core.js');
const model=require('../growth-model.js');

const legacyHorse={id:'legacy',name:'旧馬'};
let d=growth.diagnose({
  horse:legacyHorse,
  races:[{id:'old',horseId:'legacy',mark4:'△',mark5:'△',distance:2000}],
  growthChecks:[],growthCheckSets:[]
});
assert.strictEqual(d.state.key,'data-insufficient','undated legacy race must be excluded from growth diagnosis');
assert.strictEqual(d.signal,null,'undated legacy race must not enter the growth signal');

const horse={id:'h1',name:'テスト馬',currentAge:4,currentMonth:6,entryMonth:9};
d=growth.diagnose({
  horse:{id:'marks-only',name:'印欠測テスト'},
  races:[
    {id:'ru1',horseId:'marks-only',age:4,month:2,mark4:'不明',mark5:'不明'},
    {id:'ru2',horseId:'marks-only',age:4,month:3,mark4:'△',mark5:'△'}
  ]
});
assert.strictEqual(d.state.key,'data-insufficient','unknown mark must be treated as missing, not as the weakest mark');
assert.strictEqual(d.signal.kind,'insufficient');

d=growth.diagnose({
  horse,
  races:[
    {id:'r1',horseId:'h1',age:4,month:3,mark4:'△',mark5:'△'},
    {id:'r2',horseId:'h1',age:4,month:6,mark4:'○',mark5:'△'}
  ]
});
assert.strictEqual(d.state.key,'growth-progressing');
assert.strictEqual(d.confidence,'参考');
assert.strictEqual(d.previousComparisonMonths,3,'missing months must remain a gap, not be filled as no-change');
assert.strictEqual(d.signal.mark4.before,'△');
assert.strictEqual(d.signal.mark4.after,'○');

d=growth.diagnose({
  horse,
  races:[
    {id:'r1',age:4,month:5,mark4:'○',mark5:'△',observationOrder:1},
    {id:'r2',age:4,month:6,mark4:'○',mark5:'△',observationOrder:1},
    {id:'r3',age:4,month:6,mark4:'◎',mark5:'△',observationOrder:2}
  ]
});
assert.strictEqual(d.state.key,'hold','conflicting observations in the same month must be held');
assert.match(d.reason,/同月/);

const setV1={id:'sp-a',name:'SPチェックA',revision:1,conditionFingerprint:'tokyo1600-fixed',baselineHorses:[{id:'A'},{id:'B'}]};
const checks=[
  {id:'c1',horseId:'h1',setId:'sp-a',setRevision:1,conditionFingerprint:'tokyo1600-fixed',age:4,month:5,comparisons:[{baselineId:'A',result:'below'},{baselineId:'B',result:'above'}]},
  {id:'c2',horseId:'h1',setId:'sp-a',setRevision:1,conditionFingerprint:'tokyo1600-fixed',age:4,month:6,comparisons:[{baselineId:'A',result:'above'},{baselineId:'B',result:'above'}]}
];
d=growth.diagnose({horse,races:[],growthChecks:checks,growthCheckSets:[setV1]});
assert.strictEqual(d.state.key,'growth-change');
assert.strictEqual(d.confidence,'高');
assert.strictEqual(d.raceAdvice.key,'one-step-up');
assert.ok(d.signal.changes.some(x=>x.baselineId==='A'&&x.before==='below'&&x.after==='above'));

const changedSet={id:'sp-a',name:'SPチェックA',revision:2,conditionFingerprint:'tokyo1800-fixed',baselineHorses:[{id:'A'}]};
d=growth.diagnose({
  horse,races:[],
  growthCheckSets:[setV1,changedSet],
  growthChecks:[
    checks[0],
    {id:'c3',horseId:'h1',setId:'sp-a',setRevision:2,conditionFingerprint:'tokyo1800-fixed',age:4,month:6,comparisons:[{baselineId:'A',result:'above'}]}
  ]
});
assert.notStrictEqual(d.state.key,'growth-change','different set revisions must not create a high-confidence threshold crossing');
assert.strictEqual(d.signal.mode,'research');
assert.strictEqual(d.signal.kind,'insufficient');

d=growth.diagnose({
  horse,races:[],growthCheckSets:[setV1],
  growthChecks:[
    {id:'m1',setId:'sp-a',setRevision:1,conditionFingerprint:'tokyo1600-fixed',age:4,month:6,observationOrder:1,comparisons:[{baselineId:'A',result:'below'}]},
    {id:'m2',setId:'sp-a',setRevision:1,conditionFingerprint:'tokyo1600-fixed',age:4,month:6,observationOrder:2,comparisons:[{baselineId:'A',result:'above'}]}
  ]
});
assert.strictEqual(d.state.key,'hold','same-month research disagreement must not be averaged');

const setB={id:'sp-b',name:'SPチェックB',revision:1,conditionFingerprint:'nakayama1800-fixed',baselineHorses:[{id:'A',name:'別セットA'}]};
d=growth.diagnose({
  horse,races:[],growthCheckSets:[setV1,setB],
  growthChecks:[
    {id:'sa1',setId:'sp-a',setRevision:1,conditionFingerprint:'tokyo1600-fixed',age:4,month:5,observationOrder:1,comparisons:[{baselineId:'A',result:'below'}]},
    {id:'sa2',setId:'sp-a',setRevision:1,conditionFingerprint:'tokyo1600-fixed',age:4,month:6,observationOrder:1,comparisons:[{baselineId:'A',result:'above'}]},
    {id:'sb2',setId:'sp-b',setRevision:1,conditionFingerprint:'nakayama1800-fixed',age:4,month:6,observationOrder:2,comparisons:[{baselineId:'A',result:'below'}]}
  ]
});
assert.notStrictEqual(d.state.key,'hold','different comparison sets in the same month must not conflict merely because baseline IDs match');
assert.strictEqual(d.signal.latest.setId,'sp-b','latest research scope should be evaluated independently');

const lateHorse={id:'late',manualGrowthType:'晩成',currentAge:5,currentMonth:1};
d=growth.diagnose({horse:lateHorse,races:[],growthChecks:[],growthCheckSets:[]});
assert.strictEqual(d.state.key,'completion-zone-candidate');
assert.notStrictEqual(d.state.label,'完成');
assert.ok(d.completionZone);
assert.strictEqual(d.completionZone.target.age,5);
assert.strictEqual(d.completionZone.target.month,1);
assert.strictEqual(d.raceAdvice.key,'wait','growth-type milestone alone must not recommend racing up');
assert.strictEqual(d.abilityReferenceZones.speedOpenReached,true);
assert.strictEqual(d.abilityReferenceZones.fullOpenReached,true);

const lateSpeedOnly=growth.diagnose({horse:{id:'late-speed',manualGrowthType:'晩成',currentAge:4,currentMonth:11},races:[],growthChecks:[],growthCheckSets:[]});
assert.strictEqual(lateSpeedOnly.abilityReferenceZones.speedOpenReached,true);
assert.strictEqual(lateSpeedOnly.abilityReferenceZones.fullOpenReached,false);
assert.strictEqual(lateSpeedOnly.state.key,'data-insufficient','SP reference milestone must not be promoted to whole-horse completion');

const lateMilestone=model.milestoneFor('晩成');
assert.deepStrictEqual(lateMilestone.speedOpen,{age:4,month:11},'ability-specific milestone must remain distinct from full-open reference');
assert.deepStrictEqual(lateMilestone.fullOpen,{age:5,month:1});
assert.strictEqual(lateMilestone.source.official,false);

const inferred=model.inferCandidates({entryMonth:9});
assert.deepStrictEqual(inferred.candidates,['普通遅']);
assert.strictEqual(inferred.confidence,'中');
const inferredLate=model.inferCandidates({entryMonth:9,growthComment:'晩成コメントあり'});
assert.deepStrictEqual(inferredLate.candidates,['晩成']);
const manual=model.inferCandidates({entryMonth:4,manualGrowthType:'超晩成'});
assert.deepStrictEqual(manual.candidates,['超晩成']);
assert.strictEqual(manual.confidence,'高');

const conflictType=model.inferCandidates({entryMonth:8,growthComment:'早熟コメントあり'});
assert.deepStrictEqual(conflictType.candidates,['普通'],'conflicting comment must not overwrite entry-month evidence');
assert.strictEqual(conflictType.confidence,'参考');
assert.strictEqual(conflictType.conflict,true);

const researchInput={horse:{...horse,currentCondition:{fatigue:'low'}},races:[],growthChecks:checks,growthCheckSets:[setV1],futurePotential:{stars:1}};
const low=growth.diagnose(researchInput);
const futureChanged=growth.diagnose({...researchInput,futurePotential:{stars:5}});
assert.deepStrictEqual(futureChanged.raceAdvice,low.raceAdvice,'future potential must not influence current race advice');
assert.deepStrictEqual(futureChanged.state,low.state);

const tired=growth.diagnose({...researchInput,currentCondition:{fatigue:'high'}});
assert.deepStrictEqual(tired.state,low.state,'fatigue must not change growth evidence');
assert.strictEqual(tired.confidence,low.confidence);
assert.strictEqual(tired.raceAdvice.key,'recover-first','fatigue must affect race advice');
assert.strictEqual(tired.raceAdvice.abilityAdvice,'1段上候補');

const changedGrowthType=growth.diagnose({horse:{...lateHorse,manualGrowthType:'普通',currentAge:4,currentMonth:1},races:[],growthChecks:[],growthCheckSets:[]});
assert.strictEqual(changedGrowthType.growthType.candidates[0],'普通');
assert.strictEqual(changedGrowthType.state.key,'completion-zone-candidate','derived result must be recalculated from observations and current growth-type input');

console.log(JSON.stringify({
  passed:true,
  legacyUndatedRaceExcluded:true,
  missingMonthsNotFilled:true,
  sameMonthConflictHeld:true,
  fixedComparisonThresholdCrossing:'high-confidence',
  conditionRevisionBoundary:true,
  completionNeverCertain:true,
  futurePotentialSeparated:true,
  fatigueSeparated:true
},null,2));
