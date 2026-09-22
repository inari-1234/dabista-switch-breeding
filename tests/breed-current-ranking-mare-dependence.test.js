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

const mares=['エイスト','スプリングスイーツ','ミニミニデート','ワカヒルメ'];
const profiles=['sp','speedCross','production','st','balance'];

function newTop(mare,profile){
  const index=planner.createDirectPairIndex(mare);
  let a=index.entries.filter(e=>e.safe&&e.currentRoute);
  if(profile==='speedCross')a=a.filter(e=>!!e.currentRoute.final?.speedCross?.has);
  a.sort((x,y)=>planner.compareProfile(profile)(x.currentRoute,y.currentRoute));
  return a.slice(0,10).map(x=>x.sire);
}
function grade(v){return v==='A'?3:v==='B'?2:v==='C'?1:0}
function oldRankValue(x,goal='breaker'){
  let s=0;
  if(goal==='breaker'){
    s+=(x.minD<=1200?28:x.minD<=1400?23:x.minD<=1600?14:x.minD<=1800?6:0);
    s+=grade(x.record)*5+grade(x.guts)*2;
    s+=x.nsp*1.4+x.nst*.55+x.npw*.4;
    s+=(x.stable==='C'?7:x.stable==='B'?4:2);
    s+=(x.maxD>=1800&&x.maxD<=2200?7:x.maxD<=1600?4:x.maxD>=2600?-5:2);
  }
  return Math.round(s*10)/10;
}
const oldTop=[...S].map(x=>({...x,score:oldRankValue(x)})).sort((a,b)=>b.score-a.score).slice(0,10).map(x=>x.name);
const result={};
for(const p of profiles)result[p]=Object.fromEntries(mares.map(m=>[m,newTop(m,p)]));

const profileVariety={};
for(const p of profiles){
  profileVariety[p]=new Set(mares.map(m=>JSON.stringify(result[p][m]))).size;
}
const combinedVariety=new Set(mares.map(m=>JSON.stringify(profiles.map(p=>result[p][m])))).size;
if(combinedVariety!==mares.length)throw Error('mare-aware combined ranking signatures are not unique '+JSON.stringify({combinedVariety,result}));
if(Object.values(profileVariety).filter(n=>n>1).length<4)throw Error('too few mare-dependent profile rankings '+JSON.stringify(profileVariety));

console.log(JSON.stringify({
  passed:true,
  method:'legacy sire-only ranking vs common-planner mare-aware direct rankings',
  legacyTop10:oldTop,
  legacyProperty:'identical for every mare because mare is not an input',
  mares,
  profileVariety,
  combinedVariety,
  top10:result
},null,2));
