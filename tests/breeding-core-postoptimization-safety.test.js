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

const sire=JSON.parse(JSON.stringify(T.stallions.find(x=>x.name==='ステイゴールド')));
const mare=JSON.parse(JSON.stringify(T.broodmares.find(x=>x.name==='エイスト')));
if(!sire||!mare)throw Error('fixtures missing');

const first=engine.evaluate(sire,mare);
const firstNitro=engine.calcNitro(sire.ancestor,mare.ancestor);
if(JSON.stringify(firstNitro)!==JSON.stringify(first.nitro))throw Error('baseline nitro mismatch');

// Warm the prepared ancestor cache, then mutate in place.
const original=mare.ancestor[14];
mare.ancestor[14]='Northern Dancer';
const mutated=engine.evaluate(sire,mare);
const freshMare=JSON.parse(JSON.stringify(mare));
const fresh=engine.evaluate(JSON.parse(JSON.stringify(sire)),freshMare);
if(JSON.stringify(mutated)!==JSON.stringify(fresh))throw Error('in-place ancestor mutation left stale cached result');

// Restore in place and ensure cache invalidates again.
mare.ancestor[14]=original;
const restored=engine.evaluate(sire,mare);
const freshRestored=engine.evaluate(JSON.parse(JSON.stringify(sire)),JSON.parse(JSON.stringify(mare)));
if(JSON.stringify(restored)!==JSON.stringify(freshRestored))throw Error('restored in-place ancestor mutation left stale cached result');
if(JSON.stringify(restored)!==JSON.stringify(first))throw Error('restored evaluation did not return to baseline');

// Public raw-cross helper and danger.rawCrosses must remain identical.
let checked=0;
for(const m of T.broodmares){
  for(const s of T.stallions){
    const d=core.danger(s,m);
    const raw=core.collectRawCrosses(s,m);
    checked++;
    if(JSON.stringify(d.rawCrosses)!==JSON.stringify(raw))throw Error('raw cross drift '+s.name+' x '+m.name);
  }
}
if(checked!==331*176)throw Error('pair count '+checked);

console.log(JSON.stringify({
  passed:true,
  mutationChecks:3,
  rawCrossPairs:checked,
  baseline:[first.nitro.sp,first.nitro.st,first.nitro.pw],
  conclusion:'Actual optimized core invalidates in-place ancestor edits and preserves public raw-cross semantics.'
},null,2));
