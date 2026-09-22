'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');

const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
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
const prepCache=new WeakMap();
function validAnc(a){return Array.isArray(a)&&a.length===15}
function prep(h){
 if(!h||typeof h!=='object')return{nameCanon:'',ancCanon:[],ancKey:[]};
 const a=Array.isArray(h.ancestor)?h.ancestor:[],sig=String(h.name??'')+'\u001f'+a.map(x=>String(x??'')).join('\u001f');
 const got=prepCache.get(h);if(got&&got.sig===sig)return got.value;
 const value={nameCanon:core.canon(h.name),ancCanon:a.map(core.canon),ancKey:a.map(core.key)};
 prepCache.set(h,{sig,value});return value;
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
   if(!S0.ancCanon[j]||S0.ancCanon[j]!==M0.ancCanon[i])continue;
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
 for(let i=0;i<keys.length;i++){
  const k=keys[i];if(!k||seen.has(k))continue;seen.add(k);const e=effectMap.get(k);if(!e)continue;
  const dsp=(e.short||0)*2+(e.speed||0),dst=(e.guts||0)+(e.long||0)-(e.short||0),dp=e.power||0;
  sp+=dsp;st+=dst;pw+=dp;factors.push({name:names[i],dsp,dst,dp,short:e.short||0,speed:e.speed||0,power:e.power||0,guts:e.guts||0,long:e.long||0});
 }
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

const shard=+process.env.SHARD_INDEX||0,count=+process.env.SHARD_COUNT||8;
let checked=0;
for(let mi=shard;mi<T.broodmares.length;mi+=count){
 const mare=T.broodmares[mi];
 for(const sire of T.stallions){
  const a=base.evaluate(sire,mare),b=fastEvaluate(sire,mare);
  checked++;
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error('mismatch '+sire.name+' x '+mare.name+' '+JSON.stringify({a,b}));
 }
}
console.log(JSON.stringify({passed:true,shard,count,checked},null,2));
