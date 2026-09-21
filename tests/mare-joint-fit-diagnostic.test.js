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
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});

const known=M.filter(x=>+x.sp||+x.st||+x.pw).sort((a,b)=>(b.sp+b.st)-(a.sp+a.st));
const names=[...new Set([
  'スプリングスイーツ','フィットレオタード','エイスト','ミニミニデート',
  known[known.length-1]?.name
].filter(Boolean))];

const val=x=>Number.isFinite(+x)?+x:0;
const grade=x=>x==='A'?3:x==='B'?2:x==='C'?1:0;
function facts(r){
  const f=r?.final||{},s=f.sireStats||{},ce=f.crossEffects||{};
  return{
    sires:r?.sires||[],
    sp:val(f.sp),st:val(f.st),pw:val(f.pw),
    record:s.record||'?',stable:s.stable||'?',guts:s.guts||'?',
    minD:val(s.minD),maxD:val(s.maxD),
    finalCross:!!f.speedCross?.has,
    longCross:!!ce.longDistance,
    gutsCross:!!ce.gutsSupport,
    materialCross:!!r?.materialSpeedCross?.has,
    materialStages:val(r?.materialSpeedCross?.stages)
  };
}
function speedSupport(r){return !!r?.final?.speedCross?.has||!!r?.materialSpeedCross?.has}
function distanceEvidence(r){
  const f=r?.final||{},s=f.sireStats||{},ce=f.crossEffects||{};
  if(val(s.maxD)>=2400)return ce.longDistance?'STRONG_PLUS_LONG':'STRONG_2400';
  if(ce.longDistance)return 'COMPENSATED_LONG_CROSS';
  return 'UNCERTAIN';
}
function arcLevel(r,level){
  const f=r?.final||{},s=f.sireStats||{};
  const sp=val(f.sp),st=val(f.st),recordA=grade(s.record)>=3,speed=speedSupport(r);
  if(level==='min')return sp>=14&&st>=6&&recordA&&speed;
  if(level==='strong')return sp>=15&&st>=6&&recordA&&speed;
  return sp>=17&&st>=6&&recordA&&speed;
}
function bcLevel(r,level){
  const f=r?.final||{},s=f.sireStats||{};
  const sp=val(f.sp),st=val(f.st),recordA=grade(s.record)>=3,speed=speedSupport(r);
  if(level==='min')return sp>=17&&st>=5&&recordA&&speed;
  if(level==='strong')return sp>=18&&st>=5&&recordA&&speed;
  return sp>=19&&st>=6&&recordA&&speed;
}
function better(a,b,kind){
  if(!a)return b;
  const A=facts(a),B=facts(b);
  const dist=x=>x.maxD>=2400?(x.longCross?3:2):(x.longCross?1:0);
  const va=kind==='arc'
    ?[A.sp+A.st,A.sp,A.st,dist(A),A.finalCross?1:0,A.materialCross?1:0,grade(A.record)]
    :[A.sp,A.st,A.finalCross?1:0,A.materialCross?1:0,grade(A.record),A.pw];
  const vb=kind==='arc'
    ?[B.sp+B.st,B.sp,B.st,dist(B),B.finalCross?1:0,B.materialCross?1:0,grade(B.record)]
    :[B.sp,B.st,B.finalCross?1:0,B.materialCross?1:0,grade(B.record),B.pw];
  for(let i=0;i<va.length;i++){if(va[i]!==vb[i])return vb[i]>va[i]?b:a}
  return a;
}
function levelBucket(){
  return{count:0,distance:{strongPlusLong:0,strong2400:0,compensatedLong:0,uncertain:0},best:null};
}
function addDistance(bucket,r){
  const d=distanceEvidence(r);
  if(d==='STRONG_PLUS_LONG')bucket.distance.strongPlusLong++;
  else if(d==='STRONG_2400')bucket.distance.strong2400++;
  else if(d==='COMPENSATED_LONG_CROSS')bucket.distance.compensatedLong++;
  else bucket.distance.uncertain++;
}
function scan(iter){
  const out={
    count:0,
    arc:{min:levelBucket(),strong:levelBucket(),elite:levelBucket()},
    bc:{min:levelBucket(),strong:levelBucket(),elite:levelBucket()}
  };
  for(const r of iter){
    out.count++;
    for(const level of ['min','strong','elite']){
      if(arcLevel(r,level)){
        const b=out.arc[level];b.count++;addDistance(b,r);b.best=better(b.best,r,'arc');
      }
      if(bcLevel(r,level)){
        const b=out.bc[level];b.count++;b.best=better(b.best,r,'bc');
      }
    }
  }
  for(const goal of ['arc','bc'])for(const level of ['min','strong','elite']){
    out[goal][level].best=facts(out[goal][level].best);
  }
  return out;
}
function usableArcCount(bucket){
  const d=bucket?.distance||{};
  return val(d.strongPlusLong)+val(d.strong2400)+val(d.compensatedLong);
}
function tier(direct,two,goal,level='strong'){
  const d=direct?.[goal]?.[level],t=two?.[goal]?.[level];
  if(goal==='arc'){
    if(usableArcCount(d)>0)return 'DIRECT_JOINT';
    if(usableArcCount(t)>0)return 'TWO_GEN_JOINT';
    if(val(d?.count)>0)return 'DIRECT_NUMERIC_DISTANCE_UNCERTAIN';
    if(val(t?.count)>0)return 'TWO_GEN_NUMERIC_DISTANCE_UNCERTAIN';
    if(val(direct?.arc?.min?.count)>0||val(two?.arc?.min?.count)>0)return 'MIN_ONLY';
    return 'DIFFICULT_2GEN';
  }
  if(val(d?.count)>0)return 'DIRECT_JOINT';
  if(val(t?.count)>0)return 'TWO_GEN_JOINT';
  if(val(direct?.[goal]?.min?.count)>0||val(two?.[goal]?.min?.count)>0)return 'MIN_ONLY';
  return 'DIFFICULT_2GEN';
}
const output=[];
for(const name of names){
  const ms=M.find(x=>x.name===name)||{};
  const direct=scan(planner.iterateDirect(name));
  const two=scan(planner.iterateTwo(name));
  output.push({
    mare:name,
    stats:{sp:ms.sp,st:ms.st,pw:ms.pw,spst:val(ms.sp)+val(ms.st)},
    direct,two,
    fit:{
      arc:tier(direct,two,'arc','strong'),
      arcElite:tier(direct,two,'arc','elite'),
      bc:tier(direct,two,'bc','strong'),
      bcElite:tier(direct,two,'bc','elite')
    }
  });
}
console.log(JSON.stringify({
  passed:true,
  method:'joint-fit-with-separated-distance-evidence',
  rules:{
    arcNumeric:'SP/ST + record A + SP support',
    distance:'2400m+ = strong evidence; under 2400m + long-distance cross = compensating evidence; otherwise uncertain',
    noHard2400Gate:true
  },
  count:output.length,names,output
},null,2));
