'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');
const reco=require('../sale-recommendation-core.js');

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
const advisor=reco.create({planner,broodmareStats:M});

const cases=[['エイスト','グランプリボス'],['スプリングスイーツ','ステイゴールド'],['ワカヒルメ','ステイゴールド']];
const [mare,first]=cases[+process.env.CASE_INDEX||0];
if(!mare)throw Error('invalid case');
const widths=[4,8,12,16],axes=['sp','speedCross','production','st','balance','theory'],profiles=['sp','speedCross','production','st','balance'];

function bases(shortlists,n){
  const out=[],seen=new Set();
  for(let i=0;i<n;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i]; if(!r)continue;
    const id=planner.routeKey(r); if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function facts(r){return r?advisor.routeFacts(r):null}
function reasons(profile,a,b){
  if(!a||!b)return b?['candidate']:[];
  const A=facts(a),B=facts(b),out=[];
  if(profile==='sp'){
    if(B.sp>=A.sp+2)out.push('sp+2');
    else if(B.sp>A.sp&&B.st>=A.st-1)out.push('sp+1-st-kept');
    if(!A.magnificent&&B.magnificent&&B.speedCross&&B.sp>=A.sp-1)out.push('migoto-speed');
  }
  if(profile==='speedCross'){
    if(!A.speedCross&&B.speedCross&&B.sp>=A.sp-1)out.push('final-speed');
    if(B.sp>=A.sp+2)out.push('sp+2');
    if(B.materialSpeedCrossStages>A.materialSpeedCrossStages)out.push('material-speed-stage');
    if(B.speedCrossCount>A.speedCrossCount)out.push('speed-count');
  }
  if(profile==='production'){
    const a15=A.sp>=15&&A.st>=5,b15=B.sp>=15&&B.st>=5,a17=A.sp>=17&&A.st>=5,b17=B.sp>=17&&B.st>=5;
    if(!a15&&b15)out.push('sp15st5');
    if(!a17&&b17)out.push('sp17st5');
    if(B.recordGrade>A.recordGrade&&B.sp>=A.sp-1&&B.st>=A.st-1)out.push('record-up');
    if(!A.materialSpeedCross&&B.materialSpeedCross)out.push('material-speed');
    if(B.sp>=A.sp+2&&B.st>=A.st-1)out.push('sp-up-st-kept');
  }
  if(profile==='st'){
    if(B.st>=A.st+2&&B.sp>=A.sp-1)out.push('st+2-sp-kept');
    if(!A.longDistanceCross&&B.longDistanceCross&&B.sp>=A.sp-1)out.push('final-long');
    if(!A.materialLongCross&&B.materialLongCross&&B.sp>=A.sp-1)out.push('material-long');
    if(!A.distance2400&&B.distance2400&&B.sp>=A.sp-1)out.push('2400');
  }
  if(profile==='balance'){
    const a15=A.sp>=15&&A.st>=5,b15=B.sp>=15&&B.st>=5;
    if(!a15&&b15)out.push('sp15st5');
    if(B.spst>=A.spst+3&&B.sp>=A.sp-1&&B.st>=A.st-1)out.push('spst+3');
  }
  return out;
}
function classify(profile,a,b){
  if(!a||!b)return{kind:b?'material':'none'};
  const cmp=planner.compareProfile(profile)(b,a),rs=reasons(profile,a,b);
  if(cmp<0&&rs.length)return{kind:'material'};
  if(cmp<0)return{kind:'minor'};
  if(rs.length)return{kind:'tradeoff'};
  return{kind:'none'};
}
function goalFit(r,goal){
  const f=facts(r),speed=!!(f?.speedCross||f?.materialSpeedCross);
  if(!f)return'none';
  if(goal==='arc')return f.sp>=15&&f.st>=6?'strong':f.sp>=14&&f.st>=6?'qualified':'below';
  if(goal==='bc')return f.sp>=18&&f.st>=5&&speed?'strong':f.sp>=17&&f.st>=5&&speed?'qualified':'below';
  if(goal==='rebuild')return f.sp>=15&&f.st>=5?'qualified':'below';
  return'none';
}
function categorySemantic(gens,p){
  let chosen=gens[1]?.profiles?.[p]?.[0]||null,latest=chosen?1:0;
  for(let g=2;g<=4;g++){
    const next=gens[g]?.profiles?.[p]?.[0]||null;
    const q=classify(p,chosen,next);
    if(q.kind==='material'){chosen=next;latest=g}
  }
  const f=facts(chosen);
  return{
    generation:latest,
    sp:f?.sp??null,st:f?.st??null,pw:f?.pw??null,
    record:f?.record??null,stable:f?.stable??null,
    speedPath:!!(f&&(f.speedCross||f.materialSpeedCross)),
    arc:goalFit(chosen,'arc'),bc:goalFit(chosen,'bc'),rebuild:goalFit(chosen,'rebuild')
  };
}
function pvec(p){
  const a=p?.spst120||{},b=p?.spst130||{};
  return[a.safe,a.sp15st5,a.sp17st5,a.interesting,a.magnificent,a.perfect,a.elaborate,b.sp15st5,b.sp17st5,a.maxSp,a.maxSpSt].map(x=>+x||0);
}
function sireSemantic(gens){
  let best={generation:1,portfolio:planner.portfolioPareto(gens[1].pool,1).routes[0]?.portfolio||null};
  for(const g of [2,3,4]){
    const pp=planner.portfolioPareto(gens[g].pool,1).routes[0]?.portfolio||null;if(!pp)continue;
    const A=pvec(best.portfolio),B=pvec(pp),order=[2,1,0,8,7,10,9,4,3,5,6];let better=false;
    for(const idx of order){if(A[idx]!==B[idx]){better=B[idx]>A[idx];break}}
    if(better)best={generation:g,portfolio:pp};
  }
  return{generation:best.generation,portfolio:pvec(best.portfolio)};
}
function semantic(gens){
  const x=Object.fromEntries(profiles.map(p=>[p,categorySemantic(gens,p)]));
  x.sire=sireSemantic(gens);return x;
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}

const direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first);
if(!direct)throw Error('direct missing');
const twoRoutes=[],c2=planner.createCollector({topN:16,poolN:96});
for(const r of planner.iterateTwo(mare)){if(r.sires[0]!==first)continue;twoRoutes.push(r);c2.push(r)}
const r2=c2.finish(),directResult={profiles:Object.fromEntries(profiles.map(p=>[p,[direct]])),pool:[direct]};

// Reference: exact third generation + validated compact fourth-generation bridge.
const refC3=planner.createCollector({topN:16,poolN:96}),bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(mare,twoRoutes)){refC3.push(r);bridge.push(r)}
const ref3=refC3.finish(),refBridge=bridge.finish(),refC4=planner.createCollector({topN:16,poolN:96});
for(const r of planner.iterateFourthPreview(mare,refBridge.bases))refC4.push(r);
const ref4=refC4.finish(),reference=semantic({1:directResult,2:r2,3:ref3,4:ref4});

const results=[];
for(const width of widths){
  const started=Date.now(),b3=bases(r2.shortlists,width),c3=planner.createCollector({topN:16,poolN:96});
  let n3=0,n4=0;
  for(const r of planner.iterateThirdPreview(mare,b3)){n3++;c3.push(r)}
  const r3=c3.finish(),b4=bases(r3.shortlists,width),c4=planner.createCollector({topN:16,poolN:96});
  for(const r of planner.iterateFourthPreview(mare,b4)){n4++;c4.push(r)}
  const r4=c4.finish(),sem=semantic({1:directResult,2:r2,3:r3,4:r4});
  const matches=Object.fromEntries([...profiles,'sire'].map(p=>[p,same(sem[p],reference[p])]));
  results.push({width,runtimeMs:Date.now()-started,bases3:b3.length,bases4:b4.length,threeRoutes:n3,fourRoutes:n4,semantic:sem,matches,allMatch:Object.values(matches).every(Boolean)});
}
const firstFullMatch=results.find(x=>x.allMatch)?.width??null;
const output={passed:true,mare,first,reference,results,firstFullMatch};
if(process.env.OUTPUT_FILE)fs.writeFileSync(process.env.OUTPUT_FILE,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
