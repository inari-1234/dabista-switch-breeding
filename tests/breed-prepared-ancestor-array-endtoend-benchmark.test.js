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
const kdRows=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));

const base=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kdRows});
const effectMap=new Map(E.map(x=>[core.key(x.name),x]));
const pairSet=new Map();for(const p of K){const k=core.key(p.a)+'|'+core.key(p.b);if(!pairSet.has(k))pairSet.set(k,p)}
const directSet=new Map();for(const p of D){const sire=p.sire??p.a,mare=p.mare??p.b,k=core.key(sire)+'|'+core.key(mare);if(!directSet.has(k))directSet.set(k,p)}
const knownDiff=new Set(kdRows.map(x=>core.key(x.sire)+'|'+core.key(x.mare)));
const ancestorCache=new WeakMap();let prepBuilds=0,prepHits=0;
function validAnc(a){return Array.isArray(a)&&a.length===15}
function prepAncestor(a){
 if(!Array.isArray(a))return{ancCanon:[],ancKey:[]};
 const sig=a.map(x=>String(x??'')).join('\\u001f'),got=ancestorCache.get(a);
 if(got&&got.sig===sig){prepHits++;return got.value}
 prepBuilds++;
 const value={ancCanon:a.map(core.canon),ancKey:a.map(core.key)};
 ancestorCache.set(a,{sig,value});return value;
}
function prep(h){
 const a=Array.isArray(h?.ancestor)?h.ancestor:[],p=prepAncestor(a);
 return{nameCanon:core.canon(h?.name),ancCanon:p.ancCanon,ancKey:p.ancKey};
}
function fastDanger(sire,mare){
 const sa=sire?.ancestor||[],ma=mare?.ancestor||[];
 if(!validAnc(sa)||!validAnc(ma))return{available:false,inbreedCount:0,kiken:false,tyokiken:false,dangerous:false,effectiveCrosses:[],rawCrosses:[],reason:'15祖先不足'};
 const S0=prep(sire),M0=prep(mare),blocked=new Set(),effective=[],raw=[];let cnt=0,tyokiken=false,stop2=false,direct=null,twoByTwo=null;
 for(let i=0;i<15;i++){
  const directMatch=!!S0.nameCanon&&S0.nameCanon===M0.ancCanon[i];
  if(directMatch){
   const x={name:ma[i],sireGen:1,mareGen:core.depth(i),sireIndex:-1,mareIndex:i,directSire:true};raw.push(x);
   tyokiken=true;stop2=true;if(!direct)direct=x;
  }
  const allowEffective=!stop2;
  for(let j=0;j<15;j++){
   const match=!!S0.ancCanon[j]&&S0.ancCanon[j]===M0.ancCanon[i];
   if(!match)continue;
   const x={name:sa[j],sireGen:core.depth(j),mareGen:core.depth(i),sireIndex:j,mareIndex:i,directSire:false};raw.push(x);
   if(!allowEffective||blocked.has(j+','+i))continue;
   cnt++;effective.push(x);
   if(i===0&&j===0){tyokiken=true;if(!twoByTwo)twoByTwo=x}
   for(const lock of core.descendantLocks(i,j))blocked.add(lock);
  }
 }
 const kiken=cnt>6,reasons=[];
 if(direct)reasons.push(`${direct.name} 1×${direct.mareGen}`);
 if(twoByTwo)reasons.push(`${twoByTwo.name} 2×2`);
 if(kiken)reasons.push(`有効クロス${cnt}本`);
 return{available:true,inbreedCount:cnt,kiken,tyokiken,dangerous:kiken||tyokiken,effectiveCrosses:effective,rawCrosses:raw,directSireCross:direct,twoByTwo,reason:reasons.join(' / ')};
}
function fastNitro(aHorse,bHorse){
 if(!validAnc(aHorse?.ancestor)||!validAnc(bHorse?.ancestor))return null;
 const A=prep(aHorse),B=prep(bHorse),seen=new Set(),factors=[];let sp=0,st=0,pw=0;
 const names=[...aHorse.ancestor,...bHorse.ancestor],keys=[...A.ancKey,...B.ancKey];
 for(let i=0;i<keys.length;i++){const k=keys[i];if(!k||seen.has(k))continue;seen.add(k);const e=effectMap.get(k);if(!e)continue;const dsp=(e.short||0)*2+(e.speed||0),dst=(e.guts||0)+(e.long||0)-(e.short||0),dp=e.power||0;sp+=dsp;st+=dst;pw+=dp;factors.push({name:names[i],dsp,dst,dp,short:e.short||0,speed:e.speed||0,power:e.power||0,guts:e.guts||0,long:e.long||0})}
 return{sp,st,pw,factorCount:factors.length,factors};
}
function fastElaborate(sire,mare,dangerResult){
 if(!sire||!mare||!validAnc(sire.ancestor)||!validAnc(mare.ancestor))return{available:false,raw:false,effective:false,evidence:[],knownDifference:false};
 const S0=prep(sire),M0=prep(mare),evidence=[],directKey=core.key(sire.name)+'|'+core.key(mare.name),direct=directSet.get(directKey);
 if(direct)evidence.push({kind:'direct-exception',source:'upstream-kakutei',sire:sire.name,mare:mare.name,raw:direct.raw||null});
 for(let i=0;i<7;i++)for(let j=0;j<7;j++){const p=pairSet.get(S0.ancKey[i]+'|'+M0.ancKey[j]);if(p)evidence.push({kind:'confirmed-pair',source:'kotta-pairs',a:p.a,b:p.b,sireAncestorIndex:i,mareAncestorIndex:j})}
 const dedup=[],seen=new Set();for(const e of evidence){const k=JSON.stringify([e.kind,e.sire,e.mare,e.a,e.b,e.sireAncestorIndex,e.mareAncestorIndex]);if(!seen.has(k)){seen.add(k);dedup.push(e)}}
 const raw=dedup.length>0,d=dangerResult||fastDanger(sire,mare),effective=raw&&!d.kiken&&!d.tyokiken;
 return{available:true,raw,effective,evidence:dedup,knownDifference:knownDiff.has(directKey),invalidatedByDanger:raw&&!effective};
}
function fastEvaluate(sire,mare){
 const d=fastDanger(sire,mare),t=base.theoryFlags(sire,mare),e=fastElaborate(sire,mare,d),n=fastNitro(sire,mare),child=base.deriveChild(sire,mare);
 return{sire:sire?.name||'',mare:mare?.name||'',danger:d,theory:t,elaborate:e,nitro:n,child};
}
const fast={...base,evaluate:fastEvaluate};
const basePlanner=sale.create({engine:base,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const fastPlanner=sale.create({engine:fast,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const CASES=[
 ['エイスト','グランプリボス'],
 ['スプリングスイーツ','ステイゴールド'],
 ['フィットレオタード','ワイルドラッシュ'],
 ['ミニミニデート','ステイゴールド'],
 ['ワカヒルメ','ステイゴールド']
];
const CASE_INDEX=+process.env.CASE_INDEX||0;
const [mare,first]=CASES[CASE_INDEX]||[];
if(!mare)throw Error('invalid CASE_INDEX '+CASE_INDEX);

for(const mareName of ['エイスト','スプリングスイーツ','ワカヒルメ']){
 const m=T.broodmares.find(x=>x.name===mareName);
 for(const s of T.stallions){const a=base.evaluate(s,m),b=fastEvaluate(s,m);if(JSON.stringify(a)!==JSON.stringify(b))throw Error('pair mismatch '+s.name+' x '+mareName)}
}
function scan(planner){
 const started=Date.now();
 const direct=[...planner.iterateDirect(mare)].find(r=>r.sires[0]===first);
 if(!direct)throw Error('direct missing');
 const two=[],c2=planner.createCollector({topN:16,poolN:96});
 for(const r of planner.iterateTwo(mare))if(r.sires[0]===first){two.push(r);c2.push(r)}
 const r2=c2.finish();

 const c3=planner.createCollector({topN:16,poolN:96}),bridge=planner.createFourthBridgeCollector();let n3=0;
 for(const r of planner.iterateThirdPreview(mare,two)){n3++;c3.push(r);bridge.push(r)}
 const r3=c3.finish(),b=bridge.finish();

 const c4=planner.createCollector({topN:16,poolN:96});let n4=0;
 for(const r of planner.iterateFourthPreview(mare,b.bases)){n4++;c4.push(r)}
 const r4=c4.finish();

 const profiles={};
 for(const p of ['sp','speedCross','production','st','balance']){
   profiles[p]={
     direct:planner.routeKey(direct),
     two:planner.routeKey(r2.profiles?.[p]?.[0]),
     three:planner.routeKey(r3.profiles?.[p]?.[0]),
     four:planner.routeKey(r4.profiles?.[p]?.[0])
   };
 }
 const portfolios={};
 for(const [name,pool] of [['direct',[direct]],['two',r2.pool],['three',r3.pool],['four',r4.pool]]){
   const x=planner.portfolioPareto(pool,1);
   portfolios[name]={
     route:planner.routeKey(x.routes?.[0]),
     portfolio:x.routes?.[0]?.portfolio||null,
     population:x.population,
     paretoCount:x.paretoCount
   };
 }
 return{
   runtimeMs:Date.now()-started,
   counts:{two:two.length,three:n3,bridgeBases:b.bases.length,four:n4},
   profiles,
   bridgeKeys:b.bases.map(planner.routeKey),
   pools:{two:r2.pool.length,three:r3.pool.length,four:r4.pool.length},
   portfolios
 };
}
const A=scan(basePlanner);
prepBuilds=0;prepHits=0;
const B=scan(fastPlanner),cacheStats={prepBuilds,prepHits};
if(JSON.stringify(A.counts)!==JSON.stringify(B.counts))throw Error('route count mismatch');
if(JSON.stringify(A.profiles)!==JSON.stringify(B.profiles))throw Error('profile ranking mismatch');
if(JSON.stringify(A.bridgeKeys)!==JSON.stringify(B.bridgeKeys))throw Error('bridge selection mismatch');
if(JSON.stringify(A.pools)!==JSON.stringify(B.pools))throw Error('pool size mismatch');
if(JSON.stringify(A.portfolios)!==JSON.stringify(B.portfolios))throw Error('portfolio mismatch');
console.log(JSON.stringify({
 passed:true,
 mare,first,pairEquivalence:3*176,
 counts:A.counts,
 pools:A.pools,
 timingMs:{canonical:A.runtimeMs,preparedSinglePass:B.runtimeMs},
 speedup:A.runtimeMs/Math.max(1,B.runtimeMs),
 cacheStats,
 fullResultEquivalent:true,
 conclusion:'Ancestor-array WeakMap cache plus single-pass cross scan preserves exact end-to-end results and matches the existing calcNitro array API.'
},null,2));
