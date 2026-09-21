'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');

const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
const E=JSON.parse(fs.readFileSync('data/nitro-effects.json','utf8')).effects;
const K=JSON.parse(fs.readFileSync('data/kotta-pairs.json','utf8')).pairs;
const D=JSON.parse(fs.readFileSync('data/elaborate-direct-exceptions.json','utf8')).pairs;
const IV=JSON.parse(fs.readFileSync('data/planner-inheritance-validation.json','utf8'));
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const effectMap=new Map(E.map(x=>[core.key(x.name),x]));

const out={
 total:0,safe:0,magnificent:0,magnificentSafe:0,
 withEffectiveCross:0,withoutEffectiveCross:0,
 withSpeed:0,withStamina:0,withPower:0,
 nonSpeedUseful:0,onlySpeed:0,onlyStamina:0,onlyPower:0,
 samples:{nonSpeedUseful:[],noCross:[],multiAxis:[]}
};
function classify(pair){
 const seen=new Set();let sp=false,st=false,pw=false,count=0;
 for(const x of pair?.danger?.effectiveCrosses||[]){
   const k=core.key(x.name);if(!k||seen.has(k))continue;seen.add(k);
   const e=effectMap.get(k);if(!e)continue;
   const dsp=(e.short||0)*2+(e.speed||0);
   const dst=(e.guts||0)+(e.long||0)-(e.short||0);
   const dp=e.power||0;
   if(dsp>0)sp=true;if(dst>0)st=true;if(dp>0)pw=true;
   if(dsp>0||dst>0||dp>0)count++;
 }
 return{sp,st,pw,count,any:count>0};
}
for(const s of T.stallions){
 for(const m of T.broodmares){
   out.total++;
   const p=engine.evaluate(s,m);if(!p)continue;
   const safe=!p.danger.kiken&&!p.danger.tyokiken;if(safe)out.safe++;
   if(!p.theory.magnificent)continue;
   out.magnificent++;if(!safe)continue;out.magnificentSafe++;
   const c=classify(p);
   if(c.any)out.withEffectiveCross++;else out.withoutEffectiveCross++;
   if(c.sp)out.withSpeed++;if(c.st)out.withStamina++;if(c.pw)out.withPower++;
   if(c.any&&!c.sp){
     out.nonSpeedUseful++;
     if(out.samples.nonSpeedUseful.length<20)out.samples.nonSpeedUseful.push({sire:s.name,mare:m.name,sp:c.sp,st:c.st,pw:c.pw,crosses:p.danger.effectiveCrosses.map(x=>x.name)});
   }
   if(!c.any&&out.samples.noCross.length<20)out.samples.noCross.push({sire:s.name,mare:m.name});
   if(c.sp&&!c.st&&!c.pw)out.onlySpeed++;
   if(!c.sp&&c.st&&!c.pw)out.onlyStamina++;
   if(!c.sp&&!c.st&&c.pw)out.onlyPower++;
   if([c.sp,c.st,c.pw].filter(Boolean).length>=2&&out.samples.multiAxis.length<20){
     out.samples.multiAxis.push({sire:s.name,mare:m.name,sp:c.sp,st:c.st,pw:c.pw,crosses:p.danger.effectiveCrosses.map(x=>x.name)});
   }
 }
}
console.log(JSON.stringify({passed:true,...out},null,2));
