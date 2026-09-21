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

const mare='エイスト',first='グランプリボス',width=8;
const axes=['sp','speedCross','production','st','balance','theory'];

function bases(shortlists,n){
 const out=[],seen=new Set();
 for(let i=0;i<n;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const key=planner.routeKey(r);if(!seen.has(key)){seen.add(key);out.push(r)}
 }
 return out;
}
function signature(result){
 return{
   count:result.count,
   profiles:Object.fromEntries(Object.entries(result.profiles||{}).map(([k,v])=>[k,(v||[]).map(planner.routeKey)])),
   shortlists:Object.fromEntries(Object.entries(result.shortlists||{}).map(([k,v])=>[k,(v||[]).map(planner.routeKey)])),
   pool:(result.pool||[]).map(planner.routeKey)
 };
}
function equal(a,b,label){
 const A=JSON.stringify(a),B=JSON.stringify(b);if(A!==B)throw Error(label+' mismatch');
}
async function collectAsync(iter,collector,chunkSize=250){
 let n=0,yields=0;
 for(const r of iter){
  collector.push(r);n++;
  if(n%chunkSize===0){yields++;await new Promise(resolve=>setImmediate(resolve))}
 }
 return{n,yields};
}

(async()=>{
 const c2=planner.createCollector({topN:16,poolN:96});
 for(const r of planner.iterateTwo(mare))if(r.sires[0]===first)c2.push(r);
 const r2=c2.finish(),b3=bases(r2.shortlists,width);

 const sync3=planner.createCollector({topN:16,poolN:96});let sync3Count=0;
 for(const r of planner.iterateThirdPreview(mare,b3)){sync3.push(r);sync3Count++}
 const rs3=sync3.finish();

 const async3=planner.createCollector({topN:16,poolN:96});
 const a3=await collectAsync(planner.iterateThirdPreview(mare,b3),async3,250);
 const ra3=async3.finish();
 equal(signature(rs3),signature(ra3),'third generation');

 const b4s=bases(rs3.shortlists,width),b4a=bases(ra3.shortlists,width);
 equal(b4s.map(planner.routeKey),b4a.map(planner.routeKey),'fourth bases');

 const sync4=planner.createCollector({topN:16,poolN:96});let sync4Count=0;
 for(const r of planner.iterateFourthPreview(mare,b4s)){sync4.push(r);sync4Count++}
 const rs4=sync4.finish();

 const async4=planner.createCollector({topN:16,poolN:96});
 const a4=await collectAsync(planner.iterateFourthPreview(mare,b4a),async4,250);
 const ra4=async4.finish();
 equal(signature(rs4),signature(ra4),'fourth generation');

 console.log(JSON.stringify({
  passed:true,
  mare,first,width,chunkSize:250,
  third:{bases:b3.length,routes:sync3Count,asyncRoutes:a3.n,yields:a3.yields},
  fourth:{bases:b4s.length,routes:sync4Count,asyncRoutes:a4.n,yields:a4.yields},
  conclusion:'Chunked yielding preserves collector ordering and route results exactly; browser implementation can replace setImmediate with requestAnimationFrame/setTimeout and add cancellation token checks between chunks.'
 },null,2));
})().catch(e=>{console.error(e);process.exit(2)});
