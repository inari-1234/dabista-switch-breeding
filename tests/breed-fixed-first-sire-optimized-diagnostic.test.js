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
const mare='エイスト',first='グランプリボス',profiles=['sp','speedCross','production','st','balance'],axes=['sp','speedCross','production','st','balance','theory'];
const val=(x,d=0)=>Number.isFinite(+x)?+x:d,key=engine.key||((s)=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase());
const statsMap=new Map(S.map(x=>[key(x.name),x])),sireMap=new Map(T.stallions.map(x=>[key(x.name),x]));
const statsForSire=name=>statsMap.get(key(name))||null,sire=name=>sireMap.get(key(name))||null;

function crossEffectSummary(pair){
 const eff=pair?.danger?.effectiveCrosses||[],factors=pair?.nitro?.factors||[],fm=new Map(factors.map(x=>[key(x.name),x])),seen=new Set(),names=[];
 let short=0,speed=0,power=0,guts=0,long=0;
 for(const x of eff){const k=key(x.name);if(!k||seen.has(k))continue;seen.add(k);const f=fm.get(k);if(!f)continue;const sh=val(f.short),sp=val(f.speed),pw=val(f.power),gu=val(f.guts),lo=val(f.long);if(!sh&&!sp&&!pw&&!gu&&!lo)continue;short+=sh;speed+=sp;power+=pw;guts+=gu;long+=lo;names.push(x.name)}
 return{anyAbility:names.length>0,names,short,speed,power,guts,long,speedSupport:short>0||speed>0,longDistance:long>0,gutsSupport:guts>0,powerSupport:power>0,spNitroContribution:short*2+speed,stNitroContribution:long+guts-short,pwNitroContribution:power};
}
function speedCrossSummary(pair){
 const fx=crossEffectSummary(pair),names=[],eff=pair?.danger?.effectiveCrosses||[],factors=pair?.nitro?.factors||[],fm=new Map(factors.map(x=>[key(x.name),x])),seen=new Set();
 for(const x of eff){const k=key(x.name);if(!k||seen.has(k))continue;seen.add(k);const f=fm.get(k);if(!f)continue;if(val(f.short)||val(f.speed))names.push(x.name)}
 return{has:names.length>0,count:names.length,short:fx.short,speed:fx.speed,effect:fx.spNitroContribution,names};
}
function compactEffectPath(items){
 const path=(items||[]).map((item,i)=>{const fx=item?.danger?crossEffectSummary(item):(item||{});return{...fx,generation:i+1}});
 const material=path.slice(0,-1),longStages=material.filter(x=>x.longDistance);
 return{path,materialLong:{has:longStages.length>0,stages:longStages.length,names:[...new Set(longStages.flatMap(x=>x.names||[]))]}};
}
function compactCrossPath(items){
 const path=(items||[]).map((x,i)=>{const s=x?.danger?speedCrossSummary(x):x||{};return{generation:i+1,has:!!s.has,count:val(s.count),short:val(s.short),speed:val(s.speed),effect:val(s.effect),names:[...(s.names||[])]}});
 const material=path.slice(0,-1),active=material.filter(x=>x.has);
 return{path,material:{has:active.length>0,stages:active.length,count:active.reduce((n,x)=>n+x.count,0),short:active.reduce((n,x)=>n+x.short,0),speed:active.reduce((n,x)=>n+x.speed,0),effect:active.reduce((n,x)=>n+x.effect,0)}};
}
function compactFinal(pair,sireRecord){
 const n=pair.nitro||{},t=pair.theory||{},ss=statsForSire(sireRecord.name)||{};
 return{sp:val(n.sp),st:val(n.st),pw:val(n.pw),speedCross:speedCrossSummary(pair),crossEffects:crossEffectSummary(pair),theory:{interesting:!!t.interesting,magnificent:!!t.magnificent,perfect:!!t.perfect},elaborate:!!pair.elaborate?.effective,sireStats:{record:ss.record||'-',guts:ss.guts||'-',stable:ss.stable||'-',minD:val(ss.minD),maxD:val(ss.maxD),price:val(ss.price)}};
}
function routeFrom(sires,pair,method,stageCrossItems,stageEffectItems){
 const crossPath=compactCrossPath(stageCrossItems),effectPath=compactEffectPath(stageEffectItems);
 return{id:sires.map(x=>key(x)).join('__'),sires:[...sires],generation:sires.length,method,final:compactFinal(pair,sire(sires[sires.length-1])||{name:sires[sires.length-1]}),speedCrossPath:crossPath.path,materialSpeedCross:crossPath.material,crossEffectPath:effectPath.path,materialLongCross:effectPath.materialLong,finalChild:pair.child};
}
const safe=p=>!!p&&!p.danger?.kiken&&!p.danger?.tyokiken;
function bases(shortlists,maxEach=1){const out=[],seen=new Set();for(let i=0;i<maxEach;i++)for(const k of axes){const r=shortlists?.[k]?.[i];if(!r)continue;const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}}return out}
function bestFuture(direct,r2,r3,r4){
 const out={};
 for(const p of profiles){let best={route:direct,generation:1};for(const [g,r] of [[2,r2.profiles?.[p]?.[0]],[3,r3.profiles?.[p]?.[0]],[4,r4.profiles?.[p]?.[0]]])if(r&&planner.compareProfile(p)(best.route,r)>0)best={route:r,generation:g};out[p]={generation:best.generation,sires:best.route.sires,facts:advisor.routeFacts(best.route)}}
 return out;
}
function canonical(){
 const t=Date.now(),direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first),c2=planner.createCollector({topN:1,poolN:4});
 for(const r of planner.iterateTwo(mare))if(r.sires[0]===first)c2.push(r);
 const r2=c2.finish(),b3=bases(r2.shortlists,1),c3=planner.createCollector({topN:1,poolN:4});
 for(const r of planner.iterateThirdPreview(mare,b3))c3.push(r);
 const r3=c3.finish(),b4=bases(r3.shortlists,1),c4=planner.createCollector({topN:1,poolN:4});
 for(const r of planner.iterateFourthPreview(mare,b4))c4.push(r);
 const r4=c4.finish();
 return{runtimeMs:Date.now()-t,future:bestFuture(direct,r2,r3,r4)};
}
function optimized(){
 const t=Date.now(),m=T.broodmares.find(x=>x.name===mare),s1=sire(first),p1=engine.evaluate(s1,m);
 if(!safe(p1))throw Error('unsafe fixed first');
 const direct=routeFrom([first],p1,'optimized-direct',[p1],[p1]),c2=planner.createCollector({topN:1,poolN:4});
 for(const s2 of T.stallions){const p2=engine.evaluate(s2,p1.child);if(!safe(p2))continue;c2.push(routeFrom([first,s2.name],p2,'optimized-two',[p1,p2],[p1,p2]))}
 const r2=c2.finish(),b3=bases(r2.shortlists,1),c3=planner.createCollector({topN:1,poolN:4});
 for(const r of planner.iterateThirdPreview(mare,b3))c3.push(r);
 const r3=c3.finish(),b4=bases(r3.shortlists,1),c4=planner.createCollector({topN:1,poolN:4});
 for(const r of planner.iterateFourthPreview(mare,b4))c4.push(r);
 const r4=c4.finish();
 return{runtimeMs:Date.now()-t,future:bestFuture(direct,r2,r3,r4),counts:{two:r2.count,three:r3.count,four:r4.count}};
}
const A=canonical(),B=optimized(),compare={};
for(const p of profiles)compare[p]={sameGeneration:A.future[p].generation===B.future[p].generation,sameRoute:JSON.stringify(A.future[p].sires)===JSON.stringify(B.future[p].sires),canonical:A.future[p],optimized:B.future[p]};
if(Object.values(compare).some(x=>!x.sameGeneration||!x.sameRoute))throw Error('optimized mismatch');
console.log(JSON.stringify({passed:true,mare,first,canonicalRuntimeMs:A.runtimeMs,optimizedRuntimeMs:B.runtimeMs,speedup:A.runtimeMs/Math.max(1,B.runtimeMs),optimizedCounts:B.counts,compare},null,2));
