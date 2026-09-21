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
  const f=r?.final||{},s=f.sireStats||{};
  return{
    sires:r?.sires||[],
    sp:val(f.sp),st:val(f.st),pw:val(f.pw),
    record:s.record||'?',stable:s.stable||'?',guts:s.guts||'?',
    minD:val(s.minD),maxD:val(s.maxD),
    finalCross:!!f.speedCross?.has,
    materialCross:!!r?.materialSpeedCross?.has,
    materialStages:val(r?.materialSpeedCross?.stages)
  };
}
function speedSupport(r){return !!r?.final?.speedCross?.has||!!r?.materialSpeedCross?.has}
function arcMin(r){
  const f=r?.final||{},s=f.sireStats||{};
  return val(f.sp)>=14&&val(f.st)>=6&&val(s.maxD)>=2400&&grade(s.record)>=3&&speedSupport(r);
}
function arcStrong(r){
  const f=r?.final||{},s=f.sireStats||{};
  return val(f.sp)>=15&&val(f.st)>=6&&val(s.maxD)>=2400&&grade(s.record)>=3&&speedSupport(r);
}
function arcElite(r){
  const f=r?.final||{},s=f.sireStats||{};
  return val(f.sp)>=17&&val(f.st)>=6&&val(s.maxD)>=2400&&grade(s.record)>=3&&speedSupport(r);
}
function bcMin(r){
  const f=r?.final||{},s=f.sireStats||{};
  return val(f.sp)>=17&&val(f.st)>=5&&grade(s.record)>=3&&speedSupport(r);
}
function bcStrong(r){
  const f=r?.final||{},s=f.sireStats||{};
  return val(f.sp)>=18&&val(f.st)>=5&&grade(s.record)>=3&&speedSupport(r);
}
function bcElite(r){
  const f=r?.final||{},s=f.sireStats||{};
  return val(f.sp)>=19&&val(f.st)>=6&&grade(s.record)>=3&&speedSupport(r);
}
function better(a,b,kind){
  if(!a)return b;
  const A=facts(a),B=facts(b);
  const va=kind==='arc'
    ?[A.sp+A.st,A.sp,A.st,A.finalCross?1:0,A.materialCross?1:0,grade(A.record)]
    :[A.sp,A.st,A.finalCross?1:0,A.materialCross?1:0,grade(A.record),A.pw];
  const vb=kind==='arc'
    ?[B.sp+B.st,B.sp,B.st,B.finalCross?1:0,B.materialCross?1:0,grade(B.record)]
    :[B.sp,B.st,B.finalCross?1:0,B.materialCross?1:0,grade(B.record),B.pw];
  for(let i=0;i<va.length;i++){if(va[i]!==vb[i])return vb[i]>va[i]?b:a}
  return a;
}
function scan(iter){
  const out={
    count:0,
    arc:{min:0,strong:0,elite:0,bestMin:null,bestStrong:null,bestElite:null},
    bc:{min:0,strong:0,elite:0,bestMin:null,bestStrong:null,bestElite:null}
  };
  for(const r of iter){
    out.count++;
    if(arcMin(r)){out.arc.min++;out.arc.bestMin=better(out.arc.bestMin,r,'arc')}
    if(arcStrong(r)){out.arc.strong++;out.arc.bestStrong=better(out.arc.bestStrong,r,'arc')}
    if(arcElite(r)){out.arc.elite++;out.arc.bestElite=better(out.arc.bestElite,r,'arc')}
    if(bcMin(r)){out.bc.min++;out.bc.bestMin=better(out.bc.bestMin,r,'bc')}
    if(bcStrong(r)){out.bc.strong++;out.bc.bestStrong=better(out.bc.bestStrong,r,'bc')}
    if(bcElite(r)){out.bc.elite++;out.bc.bestElite=better(out.bc.bestElite,r,'bc')}
  }
  for(const g of [out.arc,out.bc]){
    g.bestMin=facts(g.bestMin);g.bestStrong=facts(g.bestStrong);g.bestElite=facts(g.bestElite);
  }
  return out;
}
function tier(direct,two,goal,level='strong'){
  if((direct?.[goal]?.[level]||0)>0)return 'DIRECT_JOINT';
  if((two?.[goal]?.[level]||0)>0)return 'TWO_GEN_JOINT';
  if((direct?.[goal]?.min||0)>0||(two?.[goal]?.min||0)>0)return 'MIN_ONLY';
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
console.log(JSON.stringify({passed:true,count:output.length,names,output},null,2));
