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

const cases=[['スプリングスイーツ','ステイゴールド'],['ワカヒルメ','ステイゴールド']];
const [mare,first]=cases[+process.env.CASE_INDEX||0];
if(!mare)throw Error('invalid case');
const widths=[8,12,16],axes=['sp','speedCross','production','st','balance','theory'],profiles=['sp','speedCross','production','st','balance'];

function bases(shortlists,n){
 const out=[],seen=new Set();
 for(let i=0;i<n;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const key=planner.routeKey(r);if(!seen.has(key)){seen.add(key);out.push(r)}
 }
 return out;
}
function bestAcross(gens,p){
 let best=null,gen=0;
 for(let g=1;g<=4;g++){
  const r=gens[g]?.profiles?.[p]?.[0]||null;
  if(r&&(!best||planner.compareProfile(p)(best,r)>0)){best=r;gen=g}
 }
 return{route:best,generation:gen};
}
function pvec(p){
 const a=p?.spst120||{},b=p?.spst130||{};
 return [a.safe,a.sp15st5,a.sp17st5,a.interesting,a.magnificent,a.perfect,a.elaborate,b.sp15st5,b.sp17st5,a.maxSp,a.maxSpSt].map(x=>+x||0);
}
function routeFacts(r){
 if(!r)return null;const f=r.final||{},s=f.sireStats||{},t=f.theory||{},ce=f.crossEffects||{};
 return{sires:r.sires,sp:+f.sp||0,st:+f.st||0,pw:+f.pw||0,record:s.record||'-',stable:s.stable||'-',speed:!!f.speedCross?.has,materialSpeed:!!r.materialSpeedCross?.has,long:!!ce.longDistance,materialLong:!!r.materialLongCross?.has,interesting:!!t.interesting,magnificent:!!t.magnificent,elaborate:!!f.elaborate};
}

const direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first);
const c2=planner.createCollector({topN:16,poolN:96});let twoCount=0;
for(const r of planner.iterateTwo(mare)){if(r.sires[0]!==first)continue;twoCount++;c2.push(r)}
const r2=c2.finish();
const directResult={profiles:Object.fromEntries(profiles.map(p=>[p,[direct]])),pool:[direct]};

const results=[],raw=new Map();
for(const width of widths){
 const started=Date.now(),b3=bases(r2.shortlists,width),c3=planner.createCollector({topN:16,poolN:96});let threeCount=0;
 for(const r of planner.iterateThirdPreview(mare,b3)){threeCount++;c3.push(r)}
 const r3=c3.finish(),b4=bases(r3.shortlists,width),c4=planner.createCollector({topN:16,poolN:96});let fourCount=0;
 for(const r of planner.iterateFourthPreview(mare,b4)){fourCount++;c4.push(r)}
 const r4=c4.finish(),gens={1:directResult,2:r2,3:r3,4:r4},cats={};
 const rawCats={};
 for(const p of profiles){const x=bestAcross(gens,p);cats[p]={generation:x.generation,facts:routeFacts(x.route)};rawCats[p]=x}
 let sireBest={generation:1,portfolio:planner.portfolioPareto([direct],1).routes[0]?.portfolio||null};
 for(const g of [2,3,4]){
  const pp=planner.portfolioPareto(gens[g].pool,1).routes[0]?.portfolio||null;if(!pp)continue;
  const A=pvec(sireBest.portfolio),B=pvec(pp),order=[2,1,0,8,7,10,9,4,3,5,6];let better=false;
  for(const idx of order){if(A[idx]!==B[idx]){better=B[idx]>A[idx];break}}
  if(better)sireBest={generation:g,portfolio:pp};
 }
 cats.sire={generation:sireBest.generation,portfolio:pvec(sireBest.portfolio)};
 raw.set(width,{cats:rawCats,sire:sireBest});
 results.push({width,runtimeMs:Date.now()-started,bases3:b3.length,bases4:b4.length,threeCount,fourCount,categories:cats});
}
function compareWidths(a,b){
 const A=raw.get(a),B=raw.get(b),out={};
 for(const p of profiles){
  out[p]={sameGeneration:A.cats[p].generation===B.cats[p].generation,equivalent:planner.compareProfile(p)(A.cats[p].route,B.cats[p].route)===0,sameRoute:planner.routeKey(A.cats[p].route)===planner.routeKey(B.cats[p].route)};
 }
 out.sire={sameGeneration:A.sire.generation===B.sire.generation,samePortfolio:JSON.stringify(pvec(A.sire.portfolio))===JSON.stringify(pvec(B.sire.portfolio))};
 return out;
}
const output={passed:true,mare,first,twoCount,results,stability8vs12:compareWidths(8,12),stability12vs16:compareWidths(12,16)};
if(process.env.OUTPUT_FILE)fs.writeFileSync(process.env.OUTPUT_FILE,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
