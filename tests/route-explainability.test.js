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
assert.deepStrictEqual(danzig.factor,{sp:2,st:-1,pw:0});

const suppressed=directRoute('アドミニストレータ','ディープインパクト');
assert.ok(suppressed);
const si=advisor.crossInsights(suppressed.stages[0]);
assert.strictEqual(si.rawCount,2);
assert.strictEqual(si.effectiveCount,1);
assert.strictEqual(si.suppressedCount,1);

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
 highCross:{mare:'アイオーティー',sire:'スクリーンヒーロー',name:danzig.name,priority:danzig.priority,factor:danzig.factor},
 suppressed:{raw:si.rawCount,effective:si.effectiveCount,suppressed:si.suppressedCount},
 checked
},null,2));
