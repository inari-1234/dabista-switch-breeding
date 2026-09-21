'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');

const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
const S=JSON.parse(fs.readFileSync('data/stallions.json','utf8')).stallions;
const E=JSON.parse(fs.readFileSync('data/nitro-effects.json','utf8')).effects;
const K=JSON.parse(fs.readFileSync('data/kotta-pairs.json','utf8')).pairs;
const D=JSON.parse(fs.readFileSync('data/elaborate-direct-exceptions.json','utf8')).pairs;
const IV=JSON.parse(fs.readFileSync('data/planner-inheritance-validation.json','utf8'));
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});
const mares=['エイスト','スプリングスイーツ','フィットレオタード','ミニミニデート','ワカヒルメ'];

let checked=0,mismatch=0;
const examples=[];
for(const mareName of mares){
 const m=T.broodmares.find(x=>x.name===mareName);if(!m)throw Error('mare missing '+mareName);
 for(const s of T.stallions){
  const p=engine.evaluate(s,m);if(!p)throw Error('pair missing '+s.name+' x '+mareName);
  const n=engine.calcNitro(s.ancestor,m.ancestor);if(!n)throw Error('nitro missing '+s.name+' x '+mareName);
  checked++;
  const same=+p.nitro.sp===+n.sp&&+p.nitro.st===+n.st&&+p.nitro.pw===+n.pw&&+p.nitro.factorCount===+n.factorCount;
  if(!same){
   mismatch++;
   if(examples.length<10)examples.push({mare:mareName,sire:s.name,pair:p.nitro,calc:n});
  }
 }
}
if(checked!==mares.length*176)throw Error('checked '+checked);
if(mismatch)throw Error('nitro mismatches '+mismatch+' '+JSON.stringify(examples));
console.log(JSON.stringify({passed:true,mares:mares.length,stallions:176,checked,mismatch,conclusion:'evaluatePair.nitro can replace duplicate v25 per-card calcNitro for current pair display/filtering'},null,2));
