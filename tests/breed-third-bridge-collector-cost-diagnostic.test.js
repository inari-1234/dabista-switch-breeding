'use strict';
const fs=require('fs');
const crypto=require('crypto');
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
const d=planner.evaluateDirectPair(mare,first);
if(!d.safe||!d.route)throw Error('direct unavailable');
const two=[...planner.iterateTwoFromDirect(d.route)];
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
const timed=fn=>{const t=process.hrtime.bigint(),value=fn();return{ms:Number(process.hrtime.bigint()-t)/1e6,value}};
function only(){let n=0;for(const r of planner.iterateThirdPreview(mare,two)){void r;n++}return n}
function c3Only(){const c=planner.createCollector({topN:16,poolN:96});let n=0;for(const r of planner.iterateThirdPreview(mare,two)){c.push(r);n++}const o=c.finish();return{n,pool:o.pool.length,profiles:Object.fromEntries(['sp','speedCross','production','st','balance'].map(p=>[p,planner.routeKey(o.profiles[p]?.[0])]))}}
function c3Bridge(){const c=planner.createCollector({topN:16,poolN:96}),b=planner.createFourthBridgeCollector();let n=0;for(const r of planner.iterateThirdPreview(mare,two)){c.push(r);b.push(r);n++}const co=c.finish(),bo=b.finish();const keys=bo.bases.map(planner.routeKey);return{n,pool:co.pool.length,profiles:Object.fromEntries(['sp','speedCross','production','st','balance'].map(p=>[p,planner.routeKey(co.profiles[p]?.[0])])),bridgeBases:keys.length,bridgeHash:crypto.createHash('sha256').update(JSON.stringify(keys)).digest('hex'),sourceCounts:bo.sourceCounts,bridgeCounts:bo.bridgeCounts}}
const a=[],b=[],c=[];
for(const order of [['only','c3','bridge'],['bridge','c3','only']]){
 for(const kind of order){
  const x=timed(kind==='only'?only:kind==='c3'?c3Only:c3Bridge);
  (kind==='only'?a:kind==='c3'?b:c).push(x);
 }
}
const n=a[0].value;if(a.some(x=>x.value!==n)||b.some(x=>x.value.n!==n)||c.some(x=>x.value.n!==n))throw Error('route count mismatch');
const am=median(a.map(x=>x.ms)),bm=median(b.map(x=>x.ms)),cm=median(c.map(x=>x.ms));
console.log(JSON.stringify({
 passed:true,twoBases:two.length,thirdRoutes:n,
 timesMs:{enumerateOnly:a.map(x=>Math.round(x.ms*10)/10),withC3:b.map(x=>Math.round(x.ms*10)/10),withC3AndBridge:c.map(x=>Math.round(x.ms*10)/10),onlyMedian:Math.round(am*10)/10,c3Median:Math.round(bm*10)/10,fullMedian:Math.round(cm*10)/10},
 estimatedMs:{c3Collector:Math.round(Math.max(0,bm-am)*10)/10,bridgeCollector:Math.round(Math.max(0,cm-bm)*10)/10},
 sharesPct:{enumerate:Math.round(am/cm*1000)/10,c3Collector:Math.round(Math.max(0,bm-am)/cm*1000)/10,bridgeCollector:Math.round(Math.max(0,cm-bm)/cm*1000)/10},
 result:c[0].value
},null,2));
