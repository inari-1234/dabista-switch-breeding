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

assert.strictEqual(advisor.knownAbilityCount,298);
assert.strictEqual(advisor.totalMareCount,331);

const e=advisor.mareAssessment('エイスト');
assert.strictEqual(e.abilityKnown,true);
assert.strictEqual(e.ranks.st.rank,1);
assert.strictEqual(e.ranks.spst.rank,7);

const unknown=advisor.mareAssessment('アマリン');
assert.strictEqual(unknown.abilityKnown,false);
assert.strictEqual(unknown.ranks,null);
assert.strictEqual(unknown.tier,'未判明');

function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set(),keys=['sp','speedCross','production','st','balance','theory'];
 for(let i=0;i<maxEach;i++)for(const k of keys){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out;
}
function scan(iter,goal,{keep=false,poolN=24}={}){
 const collector=planner.createCollector({topN:3,poolN}),summary=advisor.emptySummary(),all=[];
 for(const r of iter){collector.push(r);advisor.addRoute(summary,r,goal);if(keep)all.push(r)}
 return{result:collector.finish(),summary,all};
}

function gateRoute({sp,st,record='A',speed=false,materialSpeed=false,long=false,materialLong=false,magnificent=false,elaborate=false,maxD=2000}){
  return{
    sires:['TEST'],
    materialSpeedCross:{has:materialSpeed,stages:materialSpeed?1:0,count:materialSpeed?1:0},
    materialLongCross:{has:materialLong,stages:materialLong?1:0,names:materialLong?['TEST-LONG']:[]},
    final:{
      sp,st,pw:0,
      sireStats:{record,stable:'B',guts:'B',minD:1200,maxD},
      speedCross:{has:speed,count:speed?1:0,effect:speed?1:0,short:0,speed:speed?1:0},
      crossEffects:{longDistance:long,gutsSupport:false,powerSupport:false,anyAbility:speed||long},
      theory:{interesting:false,magnificent,perfect:false},
      elaborate
    }
  };
}
const bcPrev=gateRoute({sp:12,st:7,record:'A',speed:true});
const bcWeakComp=gateRoute({sp:19,st:5,record:'B',speed:true});
const bcStrongComp=gateRoute({sp:18,st:6,record:'B',speed:true,materialSpeed:true});
const bcNoSupport=gateRoute({sp:19,st:7,record:'A',speed:false});
assert.strictEqual(advisor.bcUpgradeGate(bcPrev,bcWeakComp).allowed,false,'BC A→B must not pass on threshold gain alone');
assert.strictEqual(advisor.bcUpgradeGate(bcPrev,bcStrongComp).allowed,true,'BC A→B may pass with multiple independent compensation signals');
assert.strictEqual(advisor.bcUpgradeGate(bcPrev,bcNoSupport).allowed,false,'BC next generation must retain an effective SP-support path');
assert.strictEqual(advisor.goalFit(gateRoute({sp:18,st:6,record:'C',speed:true}),'bc').key,'conditional','BC record C must remain conditional');

const rebuildPrev=gateRoute({sp:10,st:10,record:'A'});
const rebuildWeakComp=gateRoute({sp:15,st:8,record:'B'});
const rebuildStrongComp=gateRoute({sp:15,st:10,record:'B',materialSpeed:true});
assert.strictEqual(advisor.rebuildUpgradeGate(rebuildPrev,rebuildWeakComp).allowed,false,'rebuild A→B must not pass on threshold gain alone');
assert.strictEqual(advisor.rebuildUpgradeGate(rebuildPrev,rebuildStrongComp).allowed,true,'rebuild A→B may pass with multiple independent compensation signals');

const goal='arc',name='エイスト';
const g1=scan(planner.iterateDirect(name),goal,{keep:true});
const g2=scan(planner.iterateTwo(name),goal);
const bases=previewBases(g2.result.shortlists,12);
const g3=scan(planner.iterateThirdPreview(name,bases),goal,{poolN:18});
assert.deepStrictEqual(g1.summary.bestRoute.sires,['グランプリボス']);
assert.strictEqual(g1.summary.bestRoute.final.sp,16);
assert.strictEqual(g1.summary.bestRoute.final.st,8);

const portfolios={
 1:planner.portfolioPareto(g1.all,3),
 2:planner.portfolioPareto(g2.result.pool,3),
 3:planner.portfolioPareto(g3.result.pool,3)
};
const rec=advisor.recommendGeneration({
 goal,
 assessment:e,
 generations:{1:g1,2:g2,3:g3},
 portfolios
});
assert.strictEqual(rec.generation,1);
assert.strictEqual(rec.label,'直仔推奨');

console.log(JSON.stringify({
 passed:true,
 knownAbilityCount:advisor.knownAbilityCount,
 eist:{spstRank:e.ranks.spst.rank,bestDirect:g1.summary.bestRoute.sires[0],recommendedGeneration:rec.generation}
},null,2));
