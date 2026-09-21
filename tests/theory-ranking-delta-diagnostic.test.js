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

const grade=v=>v==='A'?3:v==='B'?2:v==='C'?1:0;
const bool=v=>v?1:0;
const val=x=>Number.isFinite(+x)?+x:0;
function cmpVec(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(b[i]||0)-(a[i]||0);if(d)return d}return 0}
function oldSpVector(r){
 const f=r.final||{},s=f.sireStats||{},t=f.theory||{};
 return[val(f.sp),val(f.st),val(f.pw),bool(t.perfect),bool(t.magnificent),bool(t.interesting),bool(f.elaborate),grade(s.record)];
}
function oldBest(routes){
 let best=null;
 for(const r of routes){if(!best||cmpVec(oldSpVector(r),oldSpVector(best))<0)best=r}
 return best;
}
const changed=[],crossLost=[],crossGained=[];
for(const m of T.broodmares){
 const routes=[...planner.iterateDirect(m.name)];
 const old=oldBest(routes);
 const col=planner.createCollector({topN:3,poolN:24});for(const r of routes)col.push(r);
 const neu=col.finish().profiles.sp[0]||null;
 if(!old||!neu)continue;
 const same=planner.routeKey(old)===planner.routeKey(neu);
 if(!same){
   const row={
     mare:m.name,
     old:{sire:old.sires[0],sp:old.final.sp,st:old.final.st,pw:old.final.pw,cross:!!old.final.speedCross?.has,crossCount:old.final.speedCross?.count||0,theory:old.final.theory,elaborate:old.final.elaborate,record:old.final.sireStats?.record},
     neu:{sire:neu.sires[0],sp:neu.final.sp,st:neu.final.st,pw:neu.final.pw,cross:!!neu.final.speedCross?.has,crossCount:neu.final.speedCross?.count||0,theory:neu.final.theory,elaborate:neu.final.elaborate,record:neu.final.sireStats?.record}
   };
   changed.push(row);
   if(row.old.cross&&!row.neu.cross)crossLost.push(row);
   if(!row.old.cross&&row.neu.cross)crossGained.push(row);
 }
}
console.log(JSON.stringify({
 passed:true,
 counts:{mares:T.broodmares.length,changed:changed.length,crossLost:crossLost.length,crossGained:crossGained.length},
 crossLost,crossGained,changed
},null,2));
