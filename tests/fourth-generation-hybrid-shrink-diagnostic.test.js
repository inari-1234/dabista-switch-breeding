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
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});
const axes=['sp','speedCross','production','st','balance','theory'];
const mare=process.env.MARE||'エイスト';
const val=x=>Number.isFinite(+x)?+x:0;
const grade=v=>v==='A'?3:v==='B'?2:v==='C'?1:0;

function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set();
 for(let i=0;i<maxEach;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out;
}
function bridgeFacts(r){
 const f=r.final||{},s=f.sireStats||{},t=f.theory||{},ce=f.crossEffects||{};
 return{
  sp:val(f.sp),st:val(f.st),pw:val(f.pw),sum:val(f.sp)+val(f.st),
  record:grade(s.record),stable:s.stable==='C'?3:s.stable==='B'?2:s.stable==='A'?1:0,
  speed:(f.speedCross?.has||r.materialSpeedCross?.has)?1:0,
  long:(ce.longDistance||r.materialLongCross?.has)?1:0,
  elaborate:f.elaborate?1:0,magnificent:t.magnificent?1:0,
  crossCount:val(f.speedCross?.count)+val(r.materialSpeedCross?.stages)
 };
}
const vectorA=x=>[x.speed,x.record,x.elaborate,x.magnificent,x.sum,x.st,x.sp,x.long,x.crossCount,x.stable];
const vectorD=x=>[x.speed,x.record,x.sum,x.elaborate,x.st,x.sp,x.long,x.crossCount,x.stable];
function cmpVec(A,B){for(let i=0;i<Math.max(A.length,B.length);i++){const a=A[i]||0,b=B[i]||0;if(a!==b)return b-a}return 0}
function rankRoutes(routes,fn){return routes.map((r,i)=>({r,i,f:bridgeFacts(r)})).sort((a,b)=>cmpVec(fn(a.f),fn(b.f))||a.i-b.i).map(x=>x.r)}
function unionBases(...lists){
 const out=[],seen=new Set();
 for(const list of lists)for(const r of list||[]){const k=planner.routeKey(r);if(seen.has(k))continue;seen.add(k);out.push(r)}
 return out;
}
function profileEligible(p,r){
 if(p==='speedCross'&&!r?.final?.speedCross?.has)return false;
 if(p==='production'&&!r?.final?.speedCross?.has&&!r?.materialSpeedCross?.has)return false;
 return true;
}
function pfVec(p){
 const a=p?.routes?.[0]?.portfolio?.spst120||{},b=p?.routes?.[0]?.portfolio?.spst130||{};
 return[val(a.sp17st5),val(a.sp15st5),val(a.safe),val(b.sp17st5),val(b.sp15st5),val(a.maxSpSt),val(a.maxSp)];
}
function vecNotWorse(a,b){return cmpVec(b,a)>=0}
function finalKey(r){return planner.routeKey(r||{})}

const c2=planner.createCollector({topN:3,poolN:24});
for(const r of planner.iterateTwo(mare))c2.push(r);
const b3=previewBases(c2.finish().shortlists,12);
const routes=[...planner.iterateThirdPreview(mare,b3)];
const official={};
for(const p of axes)official[p]=routes.filter(r=>profileEligible(p,r)).sort(planner.compareProfile(p));
const rankA=rankRoutes(routes,vectorA),rankD=rankRoutes(routes,vectorD);

function officialBases(g,x){
 return unionBases(...axes.map(p=>official[p].slice(0,p==='speedCross'?x:g)));
}
const defs={
 full:{g:128,x:320,a:96,d:160},
 noA:{g:128,x:320,a:0,d:160},
 d144:{g:128,x:320,a:0,d:144},
 g96:{g:96,x:320,a:0,d:144},
 g64:{g:64,x:320,a:0,d:144},
 d128:{g:96,x:320,a:0,d:128}
};
const bases={};
for(const [name,z] of Object.entries(defs))bases[name]=unionBases(officialBases(z.g,z.x),rankA.slice(0,z.a),rankD.slice(0,z.d));
bases.wide=officialBases(480,480);
const all=unionBases(...Object.values(bases));
const sets=new Map(Object.entries(bases).map(([k,v])=>[k,new Set(v.map(r=>planner.routeKey(r)))]));
const states=new Map(Object.keys(bases).map(k=>[k,{
 c:planner.createCollector({topN:3,poolN:120}),
 arc:advisor.emptySummary(k+'-arc'),bc:advisor.emptySummary(k+'-bc'),rebuild:advisor.emptySummary(k+'-rebuild')
}]));
let scanned=0;
for(const r of planner.iterateFourthPreview(mare,all)){
 scanned++;
 const source=planner.routeKey({sires:r.sires.slice(0,-1)});
 for(const [name,set] of sets){
  if(!set.has(source))continue;
  const s=states.get(name);s.c.push(r);advisor.addRoute(s.arc,r,'arc');advisor.addRoute(s.bc,r,'bc');advisor.addRoute(s.rebuild,r,'rebuild');
 }
}
const results={};
for(const [name,s] of states){
 const base=s.c.finish();
 results[name]={base,goals:{arc:s.arc.bestRoute,bc:s.bc.bestRoute,rebuild:s.rebuild.bestRoute},portfolio:planner.portfolioPareto(base.pool,3)};
}
const wide=results.wide,summary={};
for(const [name,z] of Object.entries(defs)){
 const cur=results[name],checks={};
 for(const goal of ['arc','bc','rebuild']){
  const cv=advisor.goalVector(cur.goals[goal],goal),wv=advisor.goalVector(wide.goals[goal],goal);
  checks[goal]={notWorse:cmpVec(wv,cv)>=0,sameRoute:finalKey(cur.goals[goal])===finalKey(wide.goals[goal])};
 }
 for(const p of ['sp','speedCross','production','st','balance']){
  const c=cur.base.profiles[p]?.[0],w=wide.base.profiles[p]?.[0];
  checks[p]={notWorse:planner.compareProfile(p)(c,w)<=0,sameRoute:finalKey(c)===finalKey(w)};
 }
 checks.portfolio={notWorse:vecNotWorse(pfVec(cur.portfolio),pfVec(wide.portfolio)),sameRoute:finalKey(cur.portfolio.routes?.[0])===finalKey(wide.portfolio.routes?.[0])};
 summary[name]={config:z,baseCount:bases[name].length,checks,allNotWorse:Object.values(checks).every(x=>x.notWorse)};
}
console.log(JSON.stringify({passed:true,method:'fourth-hybrid-shrink',mare,thirdScanned:routes.length,thirdBases:b3.length,baseCounts:Object.fromEntries(Object.entries(bases).map(([k,v])=>[k,v.length])),union:all.length,fourthScanned:scanned,summary},null,2));
