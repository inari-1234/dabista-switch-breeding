'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');

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

const mares=['エイスト','スプリングスイーツ','フィットレオタード','ミニミニデート','ワカヒルメ'];
const mare=mares[+process.env.CASE_INDEX||0];
if(!mare)throw Error('invalid case');

const t0=Date.now();
const routes=[...planner.iterateDirect(mare)];
const directMs=Date.now()-t0;
const t1=Date.now();
const portfolio=planner.portfolioPareto(routes,10);
const portfolioMs=Date.now()-t1;
if(!portfolio.routes.length)throw Error('portfolio empty');

const output={
 passed:true,mare,
 directRoutes:routes.length,
 cohorts:planner.cohorts,
 directMs,portfolioMs,totalMs:directMs+portfolioMs,
 paretoCount:portfolio.paretoCount,
 top:portfolio.routes.slice(0,5).map(r=>({sire:r.sires[0],portfolio:r.portfolio}))
};
if(process.env.OUTPUT_FILE)fs.writeFileSync(process.env.OUTPUT_FILE,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
