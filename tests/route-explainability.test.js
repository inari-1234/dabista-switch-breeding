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

function directRoute(mare,sire){
 for(const r of planner.iterateDirect(mare)){
  if(r.sires[0]===sire)return planner.expandRoute(mare,r,'arc');
 }
 return null;
}

const high=directRoute('アイオーティー','スクリーンヒーロー');
assert.ok(high&&high.stages.length===1);
const hi=advisor.crossInsights(high.stages[0]);
const danzig=hi.items.find(x=>x.name==='Danzig');
assert.ok(danzig,'Danzig cross should exist');
assert.strictEqual(danzig.priority,'high');
assert.strictEqual(danzig.priorityLabel,'因子影響 大');
assert.deepStrictEqual(danzig.factor,{sp:2,st:-1,pw:0});
assert.strictEqual(danzig.hasTradeoff,true);
assert.ok(danzig.effects.some(x=>x.label==='短距離'&&x.detail==='スピードUP / SPニトロ+2・STニトロ-1'&&x.tradeoff===true));

const staminaRoute=directRoute('ミムラス','ゴールドアリュール');
assert.ok(staminaRoute,'Gold Allure x Mimulus should remain a safe direct route');
const staminaInsights=advisor.crossInsights(staminaRoute.stages[0]);
const vague=staminaInsights.items.find(x=>x.name==='Vaguely Noble');
assert.ok(vague,'Vaguely Noble long-distance cross should be exposed');
assert.ok(vague.effects.some(x=>x.label==='長距離'&&x.detail==='スタミナUP / STニトロ+1'),'long-distance cross must separate direct stamina effect from nitro contribution');

const suppressed=directRoute('アドミニストレータ','ディープインパクト');
assert.ok(suppressed);
const si=advisor.crossInsights(suppressed.stages[0]);
assert.strictEqual(si.rawCount,2);
assert.strictEqual(si.effectiveCount,1);
assert.strictEqual(si.suppressedCount,1);


const syntheticAssessment={abilityKnown:true,ranks:{spst:{topPercent:50}}};
const route1={final:{sp:14,st:5,pw:0,sireStats:{maxD:2200,record:'B',guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false}};
const route2={final:{sp:14,st:6,pw:0,sireStats:{maxD:2400,record:'A',guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false}};
const route3={final:{sp:16,st:7,pw:0,sireStats:{maxD:2400,record:'A',guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false}};
const routeUnder2400={final:{sp:16,st:7,pw:0,crossEffects:{anyAbility:true,longDistance:true,gutsSupport:false,powerSupport:false},speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2200,record:'A',guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false}};
assert.strictEqual(advisor.routeFacts(route2).distanceEvidence,2,'2400m sire without long-distance cross is strong distance evidence');
assert.strictEqual(advisor.routeFacts(routeUnder2400).distanceEvidence,1,'under-2400 sire with a long-distance cross remains compensable rather than rejected');
assert.strictEqual(advisor.betterGoalRoute(route1,routeUnder2400,'arc'),routeUnder2400,'under-2400 route that meets Arc quantitative/record conditions must remain eligible');
const recordBHigh={final:{sp:17,st:8,pw:0,crossEffects:{anyAbility:false,longDistance:false,gutsSupport:false,powerSupport:false},speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2200,record:'B',guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false}};
const recordASame={final:{sp:17,st:8,pw:0,crossEffects:{anyAbility:false,longDistance:false,gutsSupport:false,powerSupport:false},speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2200,record:'A',guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false}};
const recordALow={final:{sp:14,st:6,pw:0,crossEffects:{anyAbility:false,longDistance:false,gutsSupport:false,powerSupport:false},speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2400,record:'A',guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false}};
assert.strictEqual(advisor.betterGoalRoute(recordBHigh,recordASame,'arc'),recordASame,'same Arc ceiling should prefer the stronger sire record');
assert.strictEqual(advisor.betterGoalRoute(recordALow,recordBHigh,'arc'),recordBHigh,'record A must not hard-gate a materially stronger SP/ST route');

const recordRoute=(sp,st,record)=>({final:{sp,st,pw:0,crossEffects:{anyAbility:false,longDistance:false,gutsSupport:false,powerSupport:false},speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2200,record,guts:'B'},theory:{interesting:false,magnificent:false,perfect:false},elaborate:false},materialSpeedCross:{has:false,stages:0},materialLongCross:{has:false,stages:0}});
const bToASame=advisor.materialUpgradeReasons(recordRoute(15,6,'B'),recordRoute(15,6,'A'),'arc',syntheticAssessment);
assert.ok(bToASame.some(x=>x.includes('実績がB→A')),'B to A is a meaningful supporting upgrade when SP/ST is preserved');
const bToADrop=advisor.materialUpgradeReasons(recordRoute(15,6,'B'),recordRoute(14,6,'A'),'arc',syntheticAssessment);
assert.ok(!bToADrop.some(x=>x.includes('実績がB→A')),'B to A alone must not justify a generation after SP loss');
const cToBSmallDrop=advisor.materialUpgradeReasons(recordRoute(15,6,'C'),recordRoute(14,6,'B'),'arc',syntheticAssessment);
assert.ok(cToBSmallDrop.some(x=>x.includes('実績がC→B')),'escaping record C may justify a small SP tradeoff without making record A mandatory');
const g={1:{summary:{bestRoute:route1}},2:{summary:{bestRoute:route2}},3:{summary:{bestRoute:route3}}};
const rec=advisor.recommendGeneration({goal:'arc',assessment:syntheticAssessment,generations:g,portfolios:{}});
assert.strictEqual(rec.generation,3,'generation decision reasons');
assert.strictEqual(rec.transitions.to2.from,1);
assert.ok(rec.transitions.to2.reasons.some(x=>x.includes('凱旋門向けSP/ST基準')),'Arc transition must use SP/ST as the eligibility line while keeping sire record and distance as graded evidence');
assert.strictEqual(rec.transitions.to3.from,2);
assert.ok(rec.transitions.to3.reasons.some(x=>x.includes('SP+ST')));
assert.ok(rec.reasons.some(x=>x.includes('2代→3代')));

let checked=0,errors=0;
for(const m of mareData.broodmares){
 let first=null;
 for(const r of planner.iterateDirect(m.name)){first=r;break}
 if(!first){errors++;continue}
 const x=planner.expandRoute(m.name,first,'arc');
 const ci=advisor.crossInsights(x.stages[0]);
 checked++;
 if(ci.effectiveCount>ci.rawCount)errors++;
}
assert.strictEqual(checked,331);
assert.strictEqual(errors,0);

console.log(JSON.stringify({
 passed:true,
 highCross:{mare:'アイオーティー',sire:'スクリーンヒーロー',name:danzig.name,priority:danzig.priority,priorityLabel:danzig.priorityLabel,factor:danzig.factor,effects:danzig.effects},
 suppressed:{raw:si.rawCount,effective:si.effectiveCount,suppressed:si.suppressedCount},
 generationRecommendation:{generation:rec.generation,to2:rec.transitions.to2,to3:rec.transitions.to3},
 checked
},null,2));
