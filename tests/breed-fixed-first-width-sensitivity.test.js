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

const cases=[
 ['エイスト','グランプリボス'],
 ['スプリングスイーツ','ステイゴールド'],
 ['フィットレオタード','ワイルドラッシュ'],
 ['ミニミニデート','ステイゴールド'],
 ['ワカヒルメ','ステイゴールド']
];
const CASE_INDEX=+process.env.CASE_INDEX||0;
const [mare,first]=cases[CASE_INDEX];
if(!mare)throw Error('bad CASE_INDEX');
const widths=[1,2,4,8],axes=['sp','speedCross','production','st','balance','theory'],profiles=['sp','speedCross','production','st','balance'];

function bases(shortlists,n){
 const out=[],seen=new Set();
 for(let i=0;i<n;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const key=planner.routeKey(r);if(!seen.has(key)){seen.add(key);out.push(r)}
 }
 return out;
}
function bestAcross(gens,profile){
 let best=null,gen=0;
 for(let g=1;g<=4;g++){
  const r=gens[g]?.profiles?.[profile]?.[0]||null;
  if(r&&(!best||planner.compareProfile(profile)(best,r)>0)){best=r;gen=g}
 }
 return{route:best,generation:gen};
}
function portfolioSig(p){
 const a=p?.spst120||{},b=p?.spst130||{};
 return [a.safe,a.sp15st5,a.sp17st5,a.interesting,a.magnificent,a.perfect,a.elaborate,b.sp15st5,b.sp17st5,a.maxSp,a.maxSpSt].map(x=>+x||0);
}
function compareVec(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function routeFacts(r){
 if(!r)return null;
 const f=r.final||{},s=f.sireStats||{};
 return{sires:r.sires,sp:+f.sp||0,st:+f.st||0,pw:+f.pw||0,record:s.record||'-',stable:s.stable||'-',speed:!!f.speedCross?.has,materialSpeed:!!r.materialSpeedCross?.has};
}

const direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first);
if(!direct)throw Error('direct missing');
const c2=planner.createCollector({topN:8,poolN:64});let twoCount=0;
for(const r of planner.iterateTwo(mare)){if(r.sires[0]!==first)continue;twoCount++;c2.push(r)}
const r2=c2.finish();

const results=[];
for(const width of widths){
 const started=Date.now(),b3=bases(r2.shortlists,width),c3=planner.createCollector({topN:8,poolN:64});let threeCount=0;
 for(const r of planner.iterateThirdPreview(mare,b3)){threeCount++;c3.push(r)}
 const r3=c3.finish(),b4=bases(r3.shortlists,width),c4=planner.createCollector({topN:8,poolN:64});let fourCount=0;
 for(const r of planner.iterateFourthPreview(mare,b4)){fourCount++;c4.push(r)}
 const r4=c4.finish();
 const directResult={profiles:Object.fromEntries(profiles.map(p=>[p,[direct]])),pool:[direct]};
 const gens={1:directResult,2:r2,3:r3,4:r4};
 const cat={};
 for(const p of profiles){
   const x=bestAcross(gens,p);
   cat[p]={generation:x.generation,facts:routeFacts(x.route)};
 }
 let sireBest={generation:1,portfolio:planner.portfolioPareto([direct],1).routes[0]?.portfolio||null};
 for(const g of [2,3,4]){
   const pp=planner.portfolioPareto(gens[g].pool,1).routes[0]?.portfolio||null;
   if(!pp)continue;
   const cur=portfolioSig(sireBest.portfolio),next=portfolioSig(pp);
   // Match planner's display priority for the leading portfolio candidate.
   const order=[2,1,0,8,7,10,9,4,3,5,6];
   let better=false;
   for(const idx of order){if(next[idx]!==cur[idx]){better=next[idx]>cur[idx];break}}
   if(better)sireBest={generation:g,portfolio:pp};
 }
 cat.sire={generation:sireBest.generation,portfolio:portfolioSig(sireBest.portfolio)};
 results.push({width,runtimeMs:Date.now()-started,bases3:b3.length,bases4:b4.length,threeCount,fourCount,categories:cat});
}

const w4=results.find(x=>x.width===4),w8=results.find(x=>x.width===8);
const stability={};
for(const p of [...profiles,'sire']){
 const a=w4.categories[p],b=w8.categories[p];
 if(p==='sire')stability[p]={sameGeneration:a.generation===b.generation,samePortfolio:compareVec(a.portfolio,b.portfolio)};
 else stability[p]={sameGeneration:a.generation===b.generation,equivalent:planner.compareProfile(p)({final:{sp:a.facts.sp,st:a.facts.st,pw:a.facts.pw,sireStats:{record:a.facts.record,stable:a.facts.stable},speedCross:{has:a.facts.speed},theory:{}},materialSpeedCross:{has:a.facts.materialSpeed},sires:a.facts.sires},{final:{sp:b.facts.sp,st:b.facts.st,pw:b.facts.pw,sireStats:{record:b.facts.record,stable:b.facts.stable},speedCross:{has:b.facts.speed},theory:{}},materialSpeedCross:{has:b.facts.materialSpeed},sires:b.facts.sires})===0};
}
const output={passed:true,mare,first,twoCount,results,stability4vs8:stability};
if(process.env.OUTPUT_FILE)fs.writeFileSync(process.env.OUTPUT_FILE,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
