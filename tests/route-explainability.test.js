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
assert.ok(danzig.effects.some(x=>x.label==='短距離'&&x.detail==='SP+2 / ST-1'&&x.tradeoff===true));

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
const g={1:{summary:{bestRoute:route1}},2:{summary:{bestRoute:route2}},3:{summary:{bestRoute:route3}}};
const rec=advisor.recommendGeneration({goal:'arc',assessment:syntheticAssessment,generations:g,portfolios:{}});
assert.strictEqual(rec.generation,3,'generation decision reasons');
assert.strictEqual(rec.transitions.to2.from,1);
assert.ok(rec.transitions.to2.reasons.some(x=>x.includes('凱旋門向け数値・実績基準')),'Arc transition must use SP/ST + record as the gate and keep distance as separate evidence');
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
