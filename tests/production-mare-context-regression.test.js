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

function fake({record='B',stable='B',sp=15,st=5,pw=1,multi=false}={}){
  return{
    sires:multi?['父1','父2']:['父1'],
    final:{
      sp,st,pw,
      speedCross:{has:true,count:1},
      crossEffects:{},
      theory:{},
      elaborate:false,
      sireStats:{record,stable,guts:'B',minD:1600,maxD:2200}
    },
    materialSpeedCross:{has:multi,stages:multi?1:0}
  };
}
const middle={abilityKnown:true,ranks:{spst:{topPercent:50}}};
const high={abilityKnown:true,ranks:{spst:{topPercent:10}}};
const low={abilityKnown:true,ranks:{spst:{topPercent:80}}};

const midPractical=fake({record:'B',stable:'B',sp:15,st:5});
const midUpside=fake({record:'A',stable:'C',sp:19,st:7});
const midLongshot=fake({record:'C',stable:'C',sp:19,st:7});
assert.ok(advisor.compareProductionForMare(middle)(midPractical,midUpside)<0,'middle mare main lane must prefer Stable A/B practical route over Stable C upside even when the upside sire has record A');
assert.ok(advisor.compareProductionForMare(middle)(midPractical,midLongshot)<0,'middle mare must prefer practical A/B-record route over C/C longshot when both are viable');
assert.strictEqual(advisor.productionContext(midLongshot,middle).key,'longshot');
assert.strictEqual(advisor.productionContext(midLongshot,middle).label,'一発狙い');

const highA=fake({record:'A',stable:'A',sp:16,st:6});
const highC=fake({record:'A',stable:'C',sp:16,st:6});
assert.ok(advisor.compareProductionForMare(high)(highA,highC)<0,'high mare should prefer stable A over stable C at equal production facts');

const lowC=fake({record:'B',stable:'C',sp:16,st:6});
const lowA=fake({record:'B',stable:'A',sp:16,st:6});
assert.ok(advisor.compareProductionForMare(low)(lowC,lowA)<0,'rebuild mare must retain stable-C upside value instead of globally penalizing it');
assert.strictEqual(advisor.productionContext(lowC,low).key,'rebuild-upside');

const allMiddle=M.map(x=>x.name).filter(name=>advisor.mareAssessment(name)?.tier==='中位');
let allMiddleDirectChecked=0,allMiddleDirectWithPractical=0;
for(const name of allMiddle){
  const assessment=advisor.mareAssessment(name);
  const direct=[...planner.iterateDirect(name)];
  const ranked=advisor.rankProductionRoutes(direct,assessment,3);
  const practical=direct.filter(r=>advisor.productionContext(r,assessment).practical);
  allMiddleDirectChecked++;
  if(practical.length){
    allMiddleDirectWithPractical++;
    const top=advisor.productionContext(ranked[0],assessment);
    const repeatable=practical.filter(r=>advisor.productionContext(r,assessment).stable!=='C');
    assert.ok(top.record==='A'||top.record==='B',name+' direct top must not be record C while practical candidates exist');
    assert.notStrictEqual(top.key,'longshot',name+' direct top must not be C/C longshot');
    if(repeatable.length)assert.notStrictEqual(top.stable,'C',name+' direct top must keep Stable C in the upside lane while repeatable practical candidates exist');
  }
}
if(allMiddleDirectChecked<20)throw Error('middle-tier coverage unexpectedly small '+allMiddleDirectChecked);

const mediumNames=['ミニミニデート','フィットレオタード','ラブアタック'];
const actual=[];
for(const name of mediumNames){
  const assessment=advisor.mareAssessment(name);
  assert.strictEqual(assessment.tier,'中位',name+' fixture must stay middle tier');

  const direct=[...planner.iterateDirect(name)];
  const directRanked=advisor.rankProductionRoutes(direct,assessment,3);
  const directPractical=direct.filter(r=>advisor.productionContext(r,assessment).practical);
  if(directPractical.length){
    const p=advisor.productionContext(directRanked[0],assessment);
    assert.ok(p.record==='A'||p.record==='B',name+' direct top must not be record C while practical candidates exist');
    assert.notStrictEqual(p.key,'longshot',name+' direct top must not be C/C longshot');
  }

  const twoRoutes=[...planner.iterateTwo(name)];
  const ranked=topProduction(twoRoutes,assessment,3);
  const practical=twoRoutes.filter(r=>advisor.productionContext(r,assessment).practical);
  const repeatable=practical.filter(r=>advisor.productionContext(r,assessment).stable!=='C');
  if(practical.length){
    const p=advisor.productionContext(ranked[0],assessment);
    assert.ok(p.record==='A'||p.record==='B',name+' two-gen top must not be record C while practical candidates exist');
    assert.notStrictEqual(p.key,'longshot',name+' two-gen top must not be C/C longshot');
    if(repeatable.length){
      assert.notStrictEqual(p.stable,'C',name+' two-gen top must prefer Stable A/B main lane while repeatable practical candidates exist');
      assert.ok(p.middleMain,name+' two-gen top must be in the middle-mare main lane');
    }
  }
  actual.push({
    mare:name,
    tier:assessment.tier,
    directTop:advisor.productionContext(directRanked[0],assessment),
    directSires:directRanked[0]?.sires,
    twoTop:advisor.productionContext(ranked[0],assessment),
    twoSires:ranked[0]?.sires,
    twoSource:twoRoutes.length
  });
}

console.log(JSON.stringify({
  passed:true,
  rule:'middle mares prefer repeatable Stable A/B main-lane production routes across the full scanned generation; Stable C remains an upside lane; rebuild mares retain Stable-C upside context',
  synthetic:{middle:true,high:true,rebuild:true},
  coverage:{allMiddleDirectChecked,allMiddleDirectWithPractical},
  actual
},null,2));
