'use strict';
const fs=require('fs'),assert=require('assert');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');
const reco=require('../sale-recommendation-core.js');

const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
const S=JSON.parse(fs.readFileSync('data/stallions.json','utf8')).stallions;
const M=JSON.parse(fs.readFileSync('data/default-broodmares.json','utf8')).broodmares;
const E=JSON.parse(fs.readFileSync('data/nitro-effects.json','utf8')).effects;
const K=JSON.parse(fs.readFileSync('data/kotta-pairs.json','utf8')).pairs;
const D=JSON.parse(fs.readFileSync('data/elaborate-direct-exceptions.json','utf8')).pairs;
const IV=JSON.parse(fs.readFileSync('data/planner-inheritance-validation.json','utf8'));
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));

const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});

const mare='フィットレオタード';
const two=planner.iterateTwo(mare).next().value;
assert.ok(two&&two.generation===2,'need a safe two-generation base');
const third=planner.iterateThirdPreview(mare,[two]).next().value;
assert.ok(third&&third.generation===3,'third preview must extend a two-generation base');
assert.strictEqual(third.method,'conditional-three-generation-preview');
const fourth=planner.iterateFourthPreview(mare,[third]).next().value;
assert.ok(fourth&&fourth.generation===4,'fourth preview must extend a three-generation base');
assert.strictEqual(fourth.method,'conditional-four-generation-preview');
assert.strictEqual(fourth.sires.length,4);
assert.strictEqual(fourth.speedCrossPath.length,4,'fourth route must retain all four stage cross summaries');
assert.strictEqual(fourth.crossEffectPath.length,4,'fourth route must retain all four stage direct-effect summaries');

let longTwo=null;
for(const r of planner.iterateTwo('ミムラス')){
  if(r.materialLongCross?.has){longTwo=r;break}
}
assert.ok(longTwo,'need a two-generation base with an intermediate long-distance cross');
const longThree=planner.iterateThirdPreview('ミムラス',[longTwo]).next().value;
assert.ok(longThree&&longThree.crossEffectPath.length===3,'third preview must preserve cross-effect history');
assert.ok(longThree.materialLongCross?.has,'third preview must preserve an earlier long-distance-cross selection stage');
const longFour=planner.iterateFourthPreview('ミムラス',[longThree]).next().value;
assert.ok(longFour&&longFour.crossEffectPath.length===4,'fourth preview must preserve cross-effect history');
assert.ok(longFour.materialLongCross?.has,'fourth preview must preserve earlier long-distance-cross selection stages');

assert.strictEqual(planner.iterateFourthPreview(mare,[two]).next().done,true,'fourth preview must reject a two-generation base');
assert.strictEqual(planner.iterateThirdPreview(mare,[third]).next().done,true,'third preview must reject a three-generation base');

function route({
  sp=15,st=6,pw=1,cross=false,longCross=false,gutsCross=false,powerCross=false,material=false,
  interesting=false,magnificent=false,perfect=false,elaborate=false,
  record='A',stable='C',maxD=2600,sires=['a','b']
}={}){
  return{
    sires,
    materialSpeedCross:{has:material,stages:material?1:0,count:material?1:0,short:0,speed:material?1:0,effect:material?1:0},
    final:{
      sp,st,pw,
      speedCross:{has:cross,count:cross?1:0,short:0,speed:cross?1:0,effect:cross?1:0},
      crossEffects:{
        anyAbility:cross||longCross||gutsCross||powerCross,
        speedSupport:cross,longDistance:longCross,gutsSupport:gutsCross,powerSupport:powerCross,
        short:0,speed:cross?1:0,long:longCross?1:0,guts:gutsCross?1:0,power:powerCross?1:0
      },
      theory:{interesting,magnificent,perfect},
      elaborate,
      sireStats:{record,stable,guts:'B',minD:1600,maxD}
    }
  };
}

// Perfect is only the simultaneous label for interesting+magnificent.
// With all real effects otherwise equal, toggling only "perfect" must not change theory ranking.
const combinedNoPerfect=route({cross:true,interesting:true,magnificent:true,perfect:false});
const combinedPerfect=route({cross:true,interesting:true,magnificent:true,perfect:true});
assert.strictEqual(planner.compareProfile('theory')(combinedNoPerfect,combinedPerfect),0,'perfect label must not be an independent theory bonus');

// Magnificent without a useful SP cross must not beat the same quantitative level with magnificent+SP-cross synergy.
const perfectNoCross=route({cross:false,interesting:true,magnificent:true,perfect:true});
const magnificentCross=route({cross:true,interesting:false,magnificent:true,perfect:false});
assert.ok(planner.compareProfile('theory')(magnificentCross,perfectNoCross)<0,'magnificent + effective ability cross must rank ahead of the same theory labels without useful cross support');

// Generation extension: a new perfect flag alone is insufficient.
const prev=route({cross:false,interesting:false,magnificent:false,perfect:false});
const perfectOnly=route({cross:false,interesting:true,magnificent:true,perfect:true});
const noCrossReasons=advisor.materialUpgradeReasons(prev,perfectOnly,'arc',advisor.mareAssessment(mare));
assert.ok(!noCrossReasons.some(x=>x.includes('見事')||x.includes('完璧')),'theory flag alone must not extend generations');

// But theory + useful cross + maintained quantitative level is valid supporting evidence.
const theoryCross=route({cross:true,interesting:false,magnificent:true,perfect:false});
const synergyReasons=advisor.materialUpgradeReasons(prev,theoryCross,'arc',advisor.mareAssessment(mare));
assert.ok(synergyReasons.some(x=>x.includes('見事配合')&&x.includes('クロス')),'magnificent + goal-relevant cross synergy should be an allowed upgrade reason');

// Synthetic four-generation upgrade to lock recommendation plumbing.
const r1=route({sp:14,st:6,cross:false,sires:['a']});
const r2=route({sp:14,st:6,cross:false,sires:['a','b']});
const r3=route({sp:14,st:6,cross:false,sires:['a','b','c']});
const r4=route({sp:17,st:6,cross:true,magnificent:true,sires:['a','b','c','d']});
const generations={
  1:{summary:{bestRoute:r1},result:null},
  2:{summary:{bestRoute:r2},result:null},
  3:{summary:{bestRoute:r3},result:null},
  4:{summary:{bestRoute:r4},result:null}
};
const rec=advisor.recommendGeneration({goal:'arc',assessment:advisor.mareAssessment(mare),generations});
assert.strictEqual(rec.generation,4,'meaningful fourth-generation improvement must be recommendable');
assert.strictEqual(rec.label,'4代候補（条件付き）');
assert.ok(rec.transitions.to4.reasons.length>0,'fourth-generation transition must explain its gain');
assert.strictEqual(rec.routes[4],r4);

const v26=fs.readFileSync('v26.js','utf8');
const v27=fs.readFileSync('v27.js','utf8');
assert.ok(v26.includes('return [1,2,3,4].map'),'manual generation selector must include generation 4');
assert.ok(v26.includes('iterateFourthPreview'),'manual design must execute fourth-generation preview');
assert.ok(v26.includes('全176⁴の最適解ではなく'),'manual UI must not describe generation 4 as exhaustive');
assert.ok(v27.includes('iterateFourthPreview'),'formal advisor must execute fourth-generation preview');
assert.ok(v27.includes('generationCard(4,generations[4]'),'formal advisor must render generation 4');
assert.ok(v27.includes('全176³・176⁴最適解とは表示しません'),'formal advisor must disclose conditional depth');
assert.ok(v27.includes('createFourthBridgeCollector'),'formal advisor must retain the validated fourth-generation bridge pool');
assert.ok(v26.includes('createFourthBridgeCollector'),'manual design must use the same fourth-generation bridge pool as the formal advisor');
assert.ok(!v27.includes('previewBases(r3.shortlists,8)'),'obsolete 8-per-axis fourth-generation bridge must not return');

console.log(JSON.stringify({
  passed:true,
  fourGeneration:{
    two:two.sires,
    three:third.sires,
    four:fourth.sires,
    method:fourth.method,
    speedCrossPath:fourth.speedCrossPath.length
  },
  theory:{
    noCrossReasons,
    synergyReasons,
    perfectIndependentComparator:planner.compareProfile('theory')(combinedNoPerfect,combinedPerfect)
  },
  syntheticRecommendation:{
    generation:rec.generation,label:rec.label,reasons:rec.reasons,transition:rec.transitions.to4
  }
},null,2));
