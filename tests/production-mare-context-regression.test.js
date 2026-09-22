'use strict';
const assert=require('assert');
const fs=require('fs');
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
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});

function topProduction(iter,assessment,limit=3){
  const cmp=advisor.compareProductionForMare(assessment),list=[];
  for(const r of iter){
    let i=0;while(i<list.length&&cmp(list[i],r)<=0)i++;
    if(list.length>=limit&&i>=limit)continue;
    list.splice(i,0,r);if(list.length>limit)list.length=limit;
  }
  return list;
}
function fake({
  record='B',stable='B',sp=15,st=5,pw=1,minD=1600,maxD=2200,
  multi=false,speedCross=true,material=false,magnificent=false,elaborate=false,
  sire='父1'
}={}){
  return{
    sires:multi?['中間父',sire]:[sire],
    final:{
      sp,st,pw,
      speedCross:{has:speedCross,count:speedCross?1:0},
      crossEffects:{},
      theory:{magnificent,interesting:false,perfect:false},
      elaborate,
      sireStats:{record,stable,guts:'B',minD,maxD}
    },
    materialSpeedCross:{has:material,stages:material?1:0}
  };
}
const middle={abilityKnown:true,ranks:{sp:{topPercent:70},spst:{topPercent:50}}};
const high={abilityKnown:true,ranks:{sp:{topPercent:15},spst:{topPercent:10}}};
const low={abilityKnown:true,ranks:{sp:{topPercent:75},spst:{topPercent:80}}};
const unknown={abilityKnown:false,ranks:null};

// A > B > C is the strong base fact when the other evidence is equal.
const equalA=fake({record:'A',stable:'C',speedCross:false,sire:'A父'});
const equalB=fake({record:'B',stable:'B',speedCross:false,sire:'B父'});
const equalC=fake({record:'C',stable:'B',speedCross:false,sire:'C父'});
assert.ok(advisor.compareProductionForMare(middle)(equalA,equalB)<0,'equal evidence must preserve record A > B even when A has stable C');
assert.ok(advisor.compareProductionForMare(middle)(equalB,equalC)<0,'equal evidence must preserve record B > C');

// B can overturn A only with clear compensating evidence.
const strongB=fake({
  record:'B',stable:'B',sp:19,st:7,pw:2,minD:1000,
  multi:true,speedCross:true,material:true,magnificent:true,elaborate:true,sire:'短距離B父'
});
assert.ok(advisor.compareProductionForMare(middle)(strongB,equalA)<0,'record B may beat A only when nitro/cross/theory/short-distance evidence is materially stronger');
const strongBCtx=advisor.productionContext(strongB,middle);
assert.ok(strongBCtx.shortDistanceRelevant&&strongBCtx.shortTier>=2,'1000m lower bound must become SP-side evidence for an SP-needy/middle mare');
assert.ok(strongBCtx.crossEvidence>=5&&strongBCtx.nitroEvidence>0,'B-over-A fixture must contain explicit compensating evidence');

// C/C is not banned. It may win only when the bloodline upside is materially stronger.
const weakAB=fake({record:'A',stable:'B',sp:15,st:5,pw:1,minD:1600,speedCross:true,sire:'堅実A父'});
const strongCC=fake({
  record:'C',stable:'C',sp:22,st:8,pw:3,minD:1000,
  multi:true,speedCross:true,material:true,magnificent:true,elaborate:true,sire:'上振れC父'
});
assert.ok(advisor.compareProductionForMare(low)(strongCC,weakAB)<0,'C/C must remain selectable when its nitro/cross/distance/theory upside clearly overcomes the record disadvantage');
assert.strictEqual(advisor.productionContext(strongCC,low).key,'longshot');
assert.strictEqual(advisor.productionContext(strongCC,low).label,'上振れ枠');

// But a plain C/C route must not win only because of variance.
const plainCC=fake({record:'C',stable:'C',sp:16,st:6,pw:1,minD:1600,speedCross:false,sire:'平凡C父'});
assert.ok(advisor.compareProductionForMare(low)(weakAB,plainCC)<0,'plain C/C must lose to a comparable A/B route; variance alone is not a recommendation reason');

// Lower distance matters only where SP-side support is relevant.
const shortMiddle=fake({record:'B',stable:'B',sp:16,st:6,minD:1000,speedCross:false,sire:'1000父'});
const longMiddle=fake({record:'B',stable:'B',sp:16,st:6,minD:1600,speedCross:false,sire:'1600父'});
assert.ok(advisor.compareProductionForMare(middle)(shortMiddle,longMiddle)<0,'middle/SP-needy mare should prefer 1000m lower-bound evidence at otherwise equal facts');
assert.ok(advisor.productionContext(shortMiddle,middle).distanceEvidence>advisor.productionContext(longMiddle,middle).distanceEvidence);
assert.strictEqual(advisor.productionContext(shortMiddle,high).distanceEvidence,0,'high non-SP-needy mare must not receive an automatic short-distance bonus');
assert.strictEqual(advisor.productionContext(shortMiddle,unknown).distanceEvidence,0,'unknown ability must not be assumed SP-deficient');

// Candidate cards must explain why an alternative exists.
const shortCue=advisor.productionCandidateCue(shortMiddle,longMiddle,middle,1);
assert.ok(shortCue.advantages.some(x=>x.includes('距離下限1000m')),'alternative cue must expose the short-distance SP-side advantage');

const nitroAlt=fake({record:'B',stable:'B',sp:19,st:6,minD:1600,speedCross:false,sire:'ニトロ父'});
const candidates=advisor.selectProductionRecommendations([longMiddle,shortMiddle,nitroAlt],middle,3);
assert.strictEqual(candidates.length,3);
assert.strictEqual(new Set(candidates.map(r=>r.sires[r.sires.length-1])).size,3,'recommendation list should preserve distinct final-sire alternatives when useful');

// High mare: stable A remains preferable to stable C at equal facts.
const highA=fake({record:'A',stable:'A',sp:16,st:6,speedCross:false,sire:'高母A'});
const highC=fake({record:'A',stable:'C',sp:16,st:6,speedCross:false,sire:'高母C'});
assert.ok(advisor.compareProductionForMare(high)(highA,highC)<0,'high mare should prefer stable A over stable C at equal facts');

// Broad real-data regression: comparator must be self-consistent and alternatives must carry reasons.
const allMiddle=M.map(x=>x.name).filter(name=>advisor.mareAssessment(name)?.tier==='中位');
let allMiddleDirectChecked=0;
for(const name of allMiddle){
  const assessment=advisor.mareAssessment(name);
  const direct=[...planner.iterateDirect(name)];
  const ranked=advisor.rankProductionRoutes(direct,assessment,3);
  allMiddleDirectChecked++;
  for(let i=1;i<ranked.length;i++){
    assert.ok(advisor.compareProductionForMare(assessment)(ranked[i-1],ranked[i])<=0,name+' production ranking must remain sorted');
  }
  const chosen=advisor.selectProductionRecommendations(direct,assessment,3);
  assert.ok(chosen.length>0,name+' must expose at least one production recommendation');
  chosen.forEach((r,i)=>{
    const cue=advisor.productionCandidateCue(r,chosen[0],assessment,i);
    assert.ok(cue.headline&&cue.reasons.length,name+' candidate '+(i+1)+' must explain its recommendation role');
  });
}
if(allMiddleDirectChecked<20)throw Error('middle-tier coverage unexpectedly small '+allMiddleDirectChecked);

const mediumNames=['ミニミニデート','フィットレオタード','ラブアタック'];
const actual=[];
for(const name of mediumNames){
  const assessment=advisor.mareAssessment(name);
  assert.strictEqual(assessment.tier,'中位',name+' fixture must stay middle tier');

  const direct=[...planner.iterateDirect(name)];
  const directRanked=advisor.rankProductionRoutes(direct,assessment,3);
  const directSelected=advisor.selectProductionRecommendations(direct,assessment,3);

  const twoRoutes=[...planner.iterateTwo(name)];
  const ranked=topProduction(twoRoutes,assessment,3);
  const selected=advisor.selectProductionRecommendations(twoRoutes,assessment,3);
  for(let i=1;i<ranked.length;i++)assert.ok(advisor.compareProductionForMare(assessment)(ranked[i-1],ranked[i])<=0);

  actual.push({
    mare:name,
    tier:assessment.tier,
    directTop:advisor.productionContext(directRanked[0],assessment),
    directSires:directRanked[0]?.sires,
    directChoices:directSelected.map((r,i)=>({sires:r.sires,cue:advisor.productionCandidateCue(r,directSelected[0],assessment,i)})),
    twoTop:advisor.productionContext(ranked[0],assessment),
    twoSires:ranked[0]?.sires,
    twoChoices:selected.map((r,i)=>({sires:r.sires,cue:advisor.productionCandidateCue(r,selected[0],assessment,i)})),
    twoSource:twoRoutes.length
  });
}

console.log(JSON.stringify({
  passed:true,
  rule:'record A>B>C is a strong base difference; B/C can overturn only through clear nitro/cross/theory/short-distance evidence; stable C is never banned but variance alone is not enough',
  synthetic:{recordOrder:true,compensatedB:true,compensatedCC:true,shortDistance:true},
  coverage:{allMiddleDirectChecked},
  actual
},null,2));
