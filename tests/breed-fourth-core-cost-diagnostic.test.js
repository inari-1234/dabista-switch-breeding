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

const mare=planner.mare('エイスト'),first='グランプリボス';
const direct=planner.evaluateDirectPair(mare,first);
if(!direct.safe||!direct.route)throw Error('direct fixture unavailable');
const two=[...planner.iterateTwoFromDirect(direct.route)];
const bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(mare,two))bridge.push(r);
const allBases=bridge.finish().bases;
const bases=allBases.slice(0,64);
const stallions=T.stallions;
if(!bases.length||stallions.length!==176)throw Error('fixture width mismatch');


const pairSet=new Map();
for(const p of K){const k=core.key(p.a)+'|'+core.key(p.b);if(!pairSet.has(k))pairSet.set(k,p)}
const directSet=new Map();
for(const p of D){const sire=p.sire??p.a,mareName=p.mare??p.b,k=core.key(sire)+'|'+core.key(mareName);if(!directSet.has(k))directSet.set(k,p)}
const knownDiff=new Set(kd.map(x=>core.key(x.sire)+'|'+core.key(x.mare)));
const oldPreparedKeys=new WeakMap();
function oldKeys(a){
  if(!Array.isArray(a))return[];
  const got=oldPreparedKeys.get(a);if(got)return got;
  const value=a.map(core.key);oldPreparedKeys.set(a,value);return value;
}
function oldElaborate(sire,mare,dangerResult){
  if(!sire||!mare||!Array.isArray(sire.ancestor)||sire.ancestor.length!==15||!Array.isArray(mare.ancestor)||mare.ancestor.length!==15)return{available:false,raw:false,effective:false,evidence:[],knownDifference:false};
  const evidence=[],S=oldKeys(sire.ancestor),M=oldKeys(mare.ancestor),directKey=core.key(sire.name)+'|'+core.key(mare.name),direct=directSet.get(directKey);
  if(direct)evidence.push({kind:'direct-exception',source:'upstream-kakutei',sire:sire.name,mare:mare.name,raw:direct.raw||null});
  for(let i=0;i<7;i++)for(let j=0;j<7;j++){
    const p=pairSet.get(S[i]+'|'+M[j]);
    if(p)evidence.push({kind:'confirmed-pair',source:'kotta-pairs',a:p.a,b:p.b,sireAncestorIndex:i,mareAncestorIndex:j});
  }
  const dedup=[],seen=new Set();
  for(const e of evidence){const k=JSON.stringify([e.kind,e.sire,e.mare,e.a,e.b,e.sireAncestorIndex,e.mareAncestorIndex]);if(!seen.has(k)){seen.add(k);dedup.push(e)}}
  const raw=dedup.length>0,d=dangerResult||engine.danger(sire,mare),effective=raw&&!d.kiken&&!d.tyokiken;
  return{available:true,raw,effective,evidence:dedup,knownDifference:knownDiff.has(directKey),invalidatedByDanger:raw&&!effective};
}
function oldEvaluate(sire,mare){
  const d=engine.danger(sire,mare),theory=engine.theoryFlags(sire,mare),elaborate=oldElaborate(sire,mare,d),nitro=engine.calcNitro(sire?.ancestor,mare?.ancestor),child=engine.deriveChild(sire,mare);
  return{sire:sire?.name||'',mare:mare?.name||'',danger:d,theory,elaborate,nitro,child};
}

function bench(name,fn){
  const start=process.hrtime.bigint();let calls=0,truthy=0;
  for(const b of bases)for(const s of stallions){if(fn(s,b.finalChild))truthy++;calls++;}
  const ms=Number(process.hrtime.bigint()-start)/1e6;
  return{name,calls,truthy,ms:Math.round(ms*10)/10,perCallUs:Math.round(ms*1000/calls*10)/10};
}
function median(a){
  const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}
function timed(fn){
  const start=process.hrtime.bigint();let truthy=0;
  for(const b of bases)for(const s of stallions){if(fn(s,b.finalChild))truthy++;}
  return{ms:Number(process.hrtime.bigint()-start)/1e6,truthy};
}
function alternatingAB(rounds=6){
  const oldTimes=[],newTimes=[];
  for(let r=0;r<rounds;r++){
    const order=r%2===0?['old','new']:['new','old'];
    for(const kind of order){
      const x=kind==='old'?timed((s,m)=>!!oldEvaluate(s,m)?.child):timed((s,m)=>!!engine.evaluate(s,m)?.child);
      if(kind==='old')oldTimes.push(x.ms);else newTimes.push(x.ms);
    }
  }
  return{
    rounds,
    oldMs:oldTimes.map(x=>Math.round(x*10)/10),
    newMs:newTimes.map(x=>Math.round(x*10)/10),
    oldMedianMs:Math.round(median(oldTimes)*10)/10,
    newMedianMs:Math.round(median(newTimes)*10)/10
  };
}
for(let i=0;i<8;i++){engine.evaluate(stallions[i],bases[0].finalChild);oldEvaluate(stallions[i],bases[0].finalChild)}
let elaborateMismatch=0;
for(const b of bases)for(const s of stallions){
  const d=engine.danger(s,b.finalChild);
  const a=oldElaborate(s,b.finalChild,d),z=engine.elaborate(s,b.finalChild,d);
  if(JSON.stringify(a)!==JSON.stringify(z))elaborateMismatch++;
}
if(elaborateMismatch)throw Error('old/new elaborate mismatch '+elaborateMismatch);

const danger=bench('danger',(s,m)=>engine.danger(s,m)?.available);
const theory=bench('theory',(s,m)=>engine.theoryFlags(s,m)?.available);
const elaborate=bench('elaborate-no-danger',(s,m)=>engine.elaborate(s,m,{kiken:false,tyokiken:false})?.available);
const nitro=bench('nitro',(s,m)=>engine.calcNitro(s.ancestor,m.ancestor)?.factorCount>=0);
const child=bench('deriveChild',(s,m)=>!!engine.deriveChild(s,m));
const evaluateReference=bench('evaluate-reference-old-elaborate',(s,m)=>!!oldEvaluate(s,m)?.child);
const evaluate=bench('evaluate',(s,m)=>!!engine.evaluate(s,m)?.child);
const ab=alternatingAB(6);
const abSpeedupPct=Math.round((1-ab.newMedianMs/ab.oldMedianMs)*1000)/10;

const parts=[danger,theory,elaborate,nitro,child];
const partSum=parts.reduce((a,x)=>a+x.ms,0);
console.log(JSON.stringify({
  passed:true,mare:mare.name,first,
  totalBridgeBases:allBases.length,sampledBases:bases.length,stallions:stallions.length,
  measurements:{danger,theory,elaborate,nitro,child,evaluateReference,evaluate},
  elaborateMismatch,
  alternatingAB:ab,
  abSpeedupPct,
  evaluateSpeedupPct:Math.round((1-evaluate.ms/evaluateReference.ms)*1000)/10,
  partSharePct:Object.fromEntries(parts.map(x=>[x.name,Math.round(x.ms/partSum*1000)/10])),
  note:'Parts are isolated hot-loop measurements on the same 64 bridge bases; evaluate is measured separately, so partSum is diagnostic rather than additive wall time.'
},null,2));
