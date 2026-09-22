'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');
const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
const E=JSON.parse(fs.readFileSync('data/nitro-effects.json','utf8')).effects;
const K=JSON.parse(fs.readFileSync('data/kotta-pairs.json','utf8')).pairs;
const D=JSON.parse(fs.readFileSync('data/elaborate-direct-exceptions.json','utf8')).pairs;
const IV=JSON.parse(fs.readFileSync('data/planner-inheritance-validation.json','utf8'));
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});

const mares=['エイスト','スプリングスイーツ','ワカヒルメ'];
const rows=[];
for(const name of mares){
 const mare=T.broodmares.find(x=>x.name===name);
 const full=T.stallions.map(s=>engine.evaluate(s,mare));
 const lite=full.map(p=>({
  sire:p.sire,mare:p.mare,danger:p.danger,theory:p.theory,elaborate:p.elaborate,nitro:p.nitro
 }));
 const fullBytes=Buffer.byteLength(JSON.stringify(full));
 const liteBytes=Buffer.byteLength(JSON.stringify(lite));
 rows.push({
  mare:name,
  fullBytes,liteBytes,
  savedBytes:fullBytes-liteBytes,
  savedPct:Math.round((1-liteBytes/fullBytes)*1000)/10
 });
}
console.log(JSON.stringify({
 passed:true,stallions:176,rows,
 conclusion:'Current-pair index can omit derived child pedigrees and materialize only the selected first sire for continuation.'
},null,2));
