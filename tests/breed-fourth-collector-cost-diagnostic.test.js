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
const mare=planner.mare('エイスト'),first='グランプリボス';
const direct=planner.evaluateDirectPair(mare,first);
if(!direct.safe||!direct.route)throw Error('direct unavailable');
const two=[...planner.iterateTwoFromDirect(direct.route)];
const bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(mare,two))bridge.push(r);
const b=bridge.finish(),bases=b.bases,stallions=T.stallions;
if(bases.length!==702||stallions.length!==176)throw Error('fixture drift '+bases.length+' / '+stallions.length);
const safe=p=>!!p&&!p.danger?.kiken&&!p.danger?.tyokiken&&!!p.child;
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
function timed(fn){const t=process.hrtime.bigint(),value=fn();return{ms:Number(process.hrtime.bigint()-t)/1e6,value}}
function rawEvaluate(){
 let safeCount=0;
 for(const base of bases)for(const s of stallions){const p=engine.evaluate(s,base.finalChild);if(safe(p))safeCount++}
 return safeCount;
}
function enumerateOnly(){
 let n=0;for(const r of planner.iterateFourthPreview(mare,bases)){void r;n++}return n;
}
function enumerateCollect(){
 const c=planner.createCollector({topN:16,poolN:96});let n=0;
 for(const r of planner.iterateFourthPreview(mare,bases)){c.push(r);n++}
 const out=c.finish();return{n,pool:out.pool.length,profiles:Object.fromEntries(['sp','speedCross','production','st','balance'].map(p=>[p,planner.routeKey(out.profiles[p]?.[0])]))};
}
for(let i=0;i<8;i++)engine.evaluate(stallions[i],bases[0].finalChild);
const raw=[];
for(let i=0;i<2;i++)raw.push(timed(rawEvaluate));
const only=[],collect=[];
for(const order of [['only','collect'],['collect','only']]){
 for(const kind of order)(kind==='only'?only:collect).push(timed(kind==='only'?enumerateOnly:enumerateCollect));
}
const safeCount=raw[0].value,routeCount=only[0].value;
if(raw.some(x=>x.value!==safeCount))throw Error('raw count unstable');
if(only.some(x=>x.value!==routeCount))throw Error('enumerate count unstable');
for(const x of collect)if(x.value.n!==routeCount)throw Error('collector route count mismatch');
if(safeCount!==routeCount)throw Error('safe/generator count mismatch '+safeCount+' / '+routeCount);
const rawMedian=median(raw.map(x=>x.ms)),onlyMedian=median(only.map(x=>x.ms)),collectMedian=median(collect.map(x=>x.ms));
console.log(JSON.stringify({
 passed:true,
 bases:bases.length,stallions:stallions.length,pairs:bases.length*stallions.length,safeRoutes:routeCount,
 timesMs:{
   rawEvaluate:raw.map(x=>Math.round(x.ms*10)/10),
   enumerateOnly:only.map(x=>Math.round(x.ms*10)/10),
   enumerateCollect:collect.map(x=>Math.round(x.ms*10)/10),
   rawMedian:Math.round(rawMedian*10)/10,
   enumerateOnlyMedian:Math.round(onlyMedian*10)/10,
   enumerateCollectMedian:Math.round(collectMedian*10)/10
 },
 estimatedMs:{
   routeConstruction:Math.round(Math.max(0,onlyMedian-rawMedian)*10)/10,
   collector:Math.round(Math.max(0,collectMedian-onlyMedian)*10)/10
 },
 sharesPct:{
   rawEvaluate:Math.round(rawMedian/collectMedian*1000)/10,
   routeConstruction:Math.round(Math.max(0,onlyMedian-rawMedian)/collectMedian*1000)/10,
   collector:Math.round(Math.max(0,collectMedian-onlyMedian)/collectMedian*1000)/10
 },
 collectorResult:collect[0].value,
 note:'Same 702 bridge bases and 176 stallions. Differences estimate route-construction/generator and collector insertion cost without changing search precision.'
},null,2));
