'use strict';
const fs=require('fs'),assert=require('assert');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');
const reco=require('../sale-recommendation-core.js');
const T=require('../data/theory-master.json');
const S=require('../data/stallions.json').stallions;
const M=require('../data/default-broodmares.json').broodmares;
const E=require('../data/nitro-effects.json').effects;
const K=require('../data/kotta-pairs.json').pairs;
const D=require('../data/elaborate-direct-exceptions.json').pairs;
const IV=require('../data/planner-inheritance-validation.json');
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});

const base={sires:['TEST'],final:{sp:16,st:8,pw:4,sireStats:{record:'A',stable:'B',guts:'B',minD:1600,maxD:2400},speedCross:{has:true,count:1},crossEffects:{longDistance:true},theory:{},elaborate:false},materialSpeedCross:{has:false,stages:0},materialLongCross:{has:false,stages:0}};
const arc=advisor.purposeGradeForRoute('エイスト','arc',base,null);
assert.ok(['recommend','candidate'].includes(arc.key),'strong Arc route must not be conditional/insufficient');

const weak={...base,final:{...base.final,sp:10,st:4,sireStats:{...base.final.sireStats,maxD:1800},speedCross:{has:false,count:0},crossEffects:{longDistance:false}}};
assert.strictEqual(advisor.purposeGradeForRoute('エイスト','arc',weak,null).key,'insufficient');

const stallionRoute={...base,portfolio:{
 spst120:{safe:50,sp15st5:14,sp17st5:6,interesting:0,magnificent:0,perfect:0,elaborate:0,maxSp:19,maxSt:8,maxSpSt:26},
 spst130:{safe:20,sp15st5:5,sp17st5:2,interesting:0,magnificent:0,perfect:0,elaborate:0,maxSp:19,maxSt:8,maxSpSt:26}
}};
assert.strictEqual(advisor.purposeGradeForRoute('エイスト','stallion',stallionRoute,stallionRoute.portfolio).key,'recommend');

const v27=fs.readFileSync('v27.js','utf8');
assert.ok(v27.includes("mare-purpose-multigen-ranking.json"),'runtime must load precomputed multigeneration ranking');
assert.ok(v27.includes("順位・○△判定・この配合シミュレーション"),'rank grade and simulation must declare one shared route');
assert.ok(v27.includes("simulationStageHtml"),'simulation must render every generation stage');
assert.ok(v27.includes("次の世代へ進む条件"),'multigeneration simulation must show selection gates');
assert.ok(v27.includes("3代・4代は条件付き探索"),'conditional exploration caveat must remain visible');
assert.ok(v27.includes("rank?.grade||recommendations"),'purpose grade must prefer multigeneration verdict');
assert.ok(v27.includes("ranked?.sires?.length"),'simulation must replay the ranked multigeneration route');

console.log(JSON.stringify({passed:true,arcGrade:arc.key,stallionGrade:'recommend'},null,2));
