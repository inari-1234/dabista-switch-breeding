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
const key=engine.key||((s)=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase());
const statsMap=new Map(S.map(x=>[key(x.name),x])),sireMap=new Map(T.stallions.map(x=>[key(x.name),x]));
const statsForSire=name=>statsMap.get(key(name))||null,sire=name=>sireMap.get(key(name))||null;
const val=(x,d=0)=>Number.isFinite(+x)?+x:d,profiles=['sp','speedCross','production','st','balance'];
const mare='エイスト',first='グランプリボス';

function evaluateFacts(s,m){
 const d=engine.danger(s,m),t=engine.theoryFlags(s,m),e=engine.elaborate(s,m,d),n=engine.calcNitro(s?.ancestor,m?.ancestor);
 return{sire:s?.name||'',mare:m?.name||'',danger:d,theory:t,elaborate:e,nitro:n,child:null};
}
function safe(p){return !!p&&!p.danger?.kiken&&!p.danger?.tyokiken}
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
function routeLite(base,s4,p4){
 const sires=[...base.sires,s4.name],cp=compactCrossPath([...(base.speedCrossPath||[]),p4]),ep=compactEffectPath([...(base.crossEffectPath||[]),p4]);
 return{id:sires.map(x=>key(x)).join('__'),sires,generation:4,method:'facts-only-four',final:compactFinal(p4,s4),speedCrossPath:cp.path,materialSpeedCross:cp.material,crossEffectPath:ep.path,materialLongCross:ep.materialLong,finalChild:null};
}
function routeSig(r){return{key:planner.routeKey(r),sp:r?.final?.sp,st:r?.final?.st,pw:r?.final?.pw,record:r?.final?.sireStats?.record,stable:r?.final?.sireStats?.stable,speed:!!r?.final?.speedCross?.has,material:!!r?.materialSpeedCross?.has}}
function abilityKnown(s){return !!s&&!((val(s.sp)===0)&&(val(s.st)===0)&&(val(s.pw)===0))}
const mareMap=new Map(T.broodmares.map(x=>[key(x.name),x]));
const cohort120=M.filter(abilityKnown).filter(x=>val(x.sp)+val(x.st)>=120).map(x=>mareMap.get(key(x.name))).filter(Boolean);
const cohort130=M.filter(abilityKnown).filter(x=>val(x.sp)+val(x.st)>=130).map(x=>mareMap.get(key(x.name))).filter(Boolean);
function portfolioFacts(child,cohort){
 const out={population:cohort.length,safe:0,sp15st5:0,sp17st5:0,interesting:0,magnificent:0,perfect:0,elaborate:0,maxSp:0,maxSt:0,maxSpSt:0};
 for(const m of cohort){const p=evaluateFacts(child,m);if(!safe(p))continue;out.safe++;const sp=val(p.nitro?.sp),st=val(p.nitro?.st);if(sp>=15&&st>=5)out.sp15st5++;if(sp>=17&&st>=5)out.sp17st5++;if(p.theory?.interesting)out.interesting++;if(p.theory?.magnificent)out.magnificent++;if(p.theory?.perfect)out.perfect++;if(p.elaborate?.effective)out.elaborate++;out.maxSp=Math.max(out.maxSp,sp);out.maxSt=Math.max(out.maxSt,st);out.maxSpSt=Math.max(out.maxSpSt,sp+st)}
 return out;
}

// Build exact third-generation bridge bases canonically.
const twoRoutes=[];
for(const r of planner.iterateTwo(mare))if(r.sires[0]===first)twoRoutes.push(r);
const bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(mare,twoRoutes))bridge.push(r);
const b=bridge.finish(),baseByKey=new Map(b.bases.map(x=>[planner.routeKey(x),x]));

// Canonical terminal fourth generation.
let t=Date.now(),canonicalCount=0;
const cc=planner.createCollector({topN:16,poolN:96});
for(const r of planner.iterateFourthPreview(mare,b.bases)){canonicalCount++;cc.push(r)}
const canonical=cc.finish(),canonicalMs=Date.now()-t;

// Facts-only terminal fourth generation.
t=Date.now();let factsCount=0;
const fc=planner.createCollector({topN:16,poolN:96});
const meta=new Map();
for(const base of b.bases){
 for(const s4 of T.stallions){
  const p4=evaluateFacts(s4,base.finalChild);if(!safe(p4))continue;
  const r=routeLite(base,s4,p4);factsCount++;fc.push(r);meta.set(planner.routeKey(r),{base,s4});
 }
}
const factsOnly=fc.finish(),factsOnlyMs=Date.now()-t;
if(factsCount!==canonicalCount)throw Error('route count mismatch '+factsCount+' vs '+canonicalCount);

const profileCompare={};
for(const p of profiles){
 const a=canonical.profiles?.[p]?.[0],b0=factsOnly.profiles?.[p]?.[0];
 profileCompare[p]={sameRoute:planner.routeKey(a)===planner.routeKey(b0),equivalent:planner.compareProfile(p)(a,b0)===0,canonical:routeSig(a),factsOnly:routeSig(b0)};
 if(!profileCompare[p].equivalent)throw Error('profile mismatch '+p);
}

// Materialize only final pool routes for portfolio evaluation.
t=Date.now();
const materialized=factsOnly.pool.map(r=>{
 const m=meta.get(planner.routeKey(r));if(!m)throw Error('missing route meta '+planner.routeKey(r));
 const p=engine.evaluate(m.s4,m.base.finalChild);if(!safe(p)||!p.child)throw Error('materialize failed');
 return{...r,finalChild:p.child};
});
const materializePoolMs=Date.now()-t;
const cp=planner.portfolioPareto(canonical.pool,1),fp=planner.portfolioPareto(materialized,1);
const portfolioSame=JSON.stringify(cp.routes?.[0]?.portfolio||null)===JSON.stringify(fp.routes?.[0]?.portfolio||null)&&planner.routeKey(cp.routes?.[0])===planner.routeKey(fp.routes?.[0]);
if(!portfolioSame)throw Error('portfolio result mismatch');

// Compare facts-only portfolio for the same selected child.
const top=fp.routes?.[0];
t=Date.now();const fullP=planner.withPortfolio(top).portfolio;const fullPortfolioMs=Date.now()-t;
t=Date.now();const lightP={spst120:portfolioFacts(top.finalChild,cohort120),spst130:portfolioFacts(top.finalChild,cohort130)};const factsPortfolioMs=Date.now()-t;
if(JSON.stringify(fullP)!==JSON.stringify(lightP))throw Error('facts-only portfolio mismatch');

console.log(JSON.stringify({
 passed:true,mare,first,
 counts:{bridgeBases:b.bases.length,canonicalRoutes:canonicalCount,factsRoutes:factsCount,canonicalPool:canonical.pool.length,factsPool:factsOnly.pool.length},
 timingMs:{canonicalFourth:canonicalMs,factsOnlyFourth:factsOnlyMs,materializePool:materializePoolMs,fullPortfolioOne:fullPortfolioMs,factsPortfolioOne:factsPortfolioMs},
 speedup:{terminal:canonicalMs/Math.max(1,factsOnlyMs+materializePoolMs),portfolioOne:fullPortfolioMs/Math.max(1,factsPortfolioMs)},
 profileCompare,portfolioSame,
 conclusion:'Terminal fourth-generation and portfolio scoring can omit child derivation until retained routes without changing ranking semantics.'
},null,2));
