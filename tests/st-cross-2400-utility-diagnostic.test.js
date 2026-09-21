'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');

const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
const S=JSON.parse(fs.readFileSync('data/stallions.json','utf8')).stallions;
const E=JSON.parse(fs.readFileSync('data/nitro-effects.json','utf8')).effects;
const K=JSON.parse(fs.readFileSync('data/kotta-pairs.json','utf8')).pairs;
const D=JSON.parse(fs.readFileSync('data/elaborate-direct-exceptions.json','utf8')).pairs;
const IV=JSON.parse(fs.readFileSync('data/planner-inheritance-validation.json','utf8'));
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const effectMap=new Map(E.map(x=>[core.key(x.name),x]));
const sireStats=new Map(S.map(x=>[core.key(x.name),x]));
const grade=x=>x==='A'?3:x==='B'?2:x==='C'?1:0;

function activeEffects(pair){
  const seen=new Set(),names=[];let long=0,guts=0,short=0,speed=0,power=0;
  for(const x of pair?.danger?.effectiveCrosses||[]){
    const k=core.key(x.name);if(!k||seen.has(k))continue;seen.add(k);
    const e=effectMap.get(k);if(!e)continue;
    if(e.long||e.guts||e.short||e.speed||e.power)names.push(x.name);
    long+=e.long||0;guts+=e.guts||0;short+=e.short||0;speed+=e.speed||0;power+=e.power||0;
  }
  return{
    names,long,guts,short,speed,power,
    directStamina:long>0,
    gutsCross:guts>0,
    speedCross:short>0||speed>0,
    stNitroCrossContribution:long+guts-short
  };
}
const out={
 total:0,safe:0,
 longCross:0,gutsCross:0,longAndGuts:0,
 highStNitro:{st5:0,st6:0,st7:0},
 currentArcReady:0,
 quantitativeArcWithout2400:0,
 quantitativeArcWith2400:0,
 quantitativeArcByMaxD:{},
 highBalanceRecordAUnder2400:[],
 longCrossRecordAUnder2400:[],
 sireDistance:{ge2400:0,lt2400:0,recordAGe2400:0,recordALt2400:0}
};
for(const s of S){
  if(+s.maxD>=2400)out.sireDistance.ge2400++;else out.sireDistance.lt2400++;
  if(grade(s.record)>=3){if(+s.maxD>=2400)out.sireDistance.recordAGe2400++;else out.sireDistance.recordALt2400++}
}
for(const s of T.stallions){
  const ss=sireStats.get(core.key(s.name))||{};
  for(const m of T.broodmares){
    out.total++;
    const p=engine.evaluate(s,m);if(!p||p.danger.kiken||p.danger.tyokiken)continue;
    out.safe++;
    const fx=activeEffects(p),sp=+p.nitro.sp||0,st=+p.nitro.st||0,maxD=+ss.maxD||0,recordA=grade(ss.record)>=3;
    if(fx.directStamina)out.longCross++;
    if(fx.gutsCross)out.gutsCross++;
    if(fx.directStamina&&fx.gutsCross)out.longAndGuts++;
    if(st>=5)out.highStNitro.st5++;
    if(st>=6)out.highStNitro.st6++;
    if(st>=7)out.highStNitro.st7++;
    const quantitative=sp>=14&&st>=6&&recordA;
    if(quantitative){
      out.quantitativeArcByMaxD[maxD]=(out.quantitativeArcByMaxD[maxD]||0)+1;
      if(maxD>=2400){out.quantitativeArcWith2400++;out.currentArcReady++}
      else{
        out.quantitativeArcWithout2400++;
        if(out.highBalanceRecordAUnder2400.length<40)out.highBalanceRecordAUnder2400.push({
          sire:s.name,mare:m.name,maxD,record:ss.record,sp,st,pw:+p.nitro.pw||0,
          longCross:fx.directStamina,gutsCross:fx.gutsCross,speedCross:fx.speedCross,crosses:fx.names
        });
        if(fx.directStamina&&out.longCrossRecordAUnder2400.length<40)out.longCrossRecordAUnder2400.push({
          sire:s.name,mare:m.name,maxD,sp,st,pw:+p.nitro.pw||0,crosses:fx.names
        });
      }
    }
  }
}
console.log(JSON.stringify({passed:true,...out},null,2));
