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

function profileKeys(routes){
  const c=planner.createCollector({topN:5,poolN:24});
  for(const r of routes)if(r)c.push(r);
  const f=c.finish();
  return Object.fromEntries(Object.entries(f.profiles).map(([k,v])=>[k,v.map(planner.routeKey)]));
}
function manualFullEntries(mareInput){
  const out=[];
  for(const s of T.stallions)out.push(planner.evaluateDirectPair(mareInput,s.name));
  return out;
}
function validate(mareInput){
  const name=typeof mareInput==='string'?mareInput:mareInput.name;
  const started=Date.now(),index=planner.createDirectPairIndex(mareInput);
  if(index.entries.length!==176)throw Error(name+' entries '+index.entries.length);
  if(index.safeCount+index.unsafeCount!==176)throw Error(name+' count total');
  if(index.currentRoutes.length!==index.safeCount)throw Error(name+' route/safe count');
  if(index.entries.some(x=>x.pair&&x.pair.child!==null))throw Error(name+' pair child retained');
  if(index.entries.some(x=>x.currentRoute&&x.currentRoute.finalChild!==null))throw Error(name+' route child retained');
  if(index.entries.some(x=>x.safe&&!x.currentRoute))throw Error(name+' safe entry lacks current route');
  if(index.entries.some(x=>!x.safe&&x.currentRoute))throw Error(name+' unsafe entry leaked route');
  if(index.entries.some(x=>!x.pair))throw Error(name+' valid sire entry lacks pair');

  const canonical=[...planner.iterateDirect(mareInput)];
  const a=profileKeys(canonical),b=profileKeys(index.currentRoutes);
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error(name+' profile ranking changed');

  const stay=index.get(' ステイゴールド ');
  if(!stay||stay.sire!=='ステイゴールド')throw Error(name+' normalized get failed');
  if(index.get('存在しない種牡馬')!==null)throw Error(name+' missing get must return null');

  // Selected sire can be re-materialized with child pedigree only when needed.
  const selected=index.entries.find(x=>x.safe);
  if(selected){
    const materialized=planner.evaluateDirectPair(index.mare,selected.sire);
    if(!materialized.route?.finalChild||!materialized.pair?.child)throw Error(name+' selected route did not re-materialize child');
    if(planner.routeKey(materialized.route)!==planner.routeKey(selected.currentRoute))throw Error(name+' re-materialized route key changed');
  }

  const full=manualFullEntries(mareInput);
  const fullBytes=Buffer.byteLength(JSON.stringify(full));
  const compactBytes=Buffer.byteLength(JSON.stringify(index.entries));
  if(!(compactBytes<fullBytes))throw Error(name+' compact index did not shrink');

  return{
    mare:name,entries:index.entries.length,safe:index.safeCount,unsafe:index.unsafeCount,
    runtimeMs:Date.now()-started,fullBytes,compactBytes,
    savedPct:Math.round((1-compactBytes/fullBytes)*1000)/10
  };
}

const rows=[];
for(const name of ['エイスト','スプリングスイーツ','フィットレオタード','ワカヒルメ','アマリン'])rows.push(validate(name));

const eist=planner.mare('エイスト'),gp=planner.sire('グランプリボス');
const derived=engine.deriveChild(gp,eist,'自家製テスト牝馬');
if(!derived||derived.ancestor?.length!==15)throw Error('derived mare fixture missing');
rows.push(validate(derived));
if(!rows.some(x=>x.unsafe>0))throw Error('cases did not preserve any dangerous pairs');

const invalid=planner.createDirectPairIndex('存在しない牝馬');
if(invalid.mare!==null||invalid.entries.length||invalid.currentRoutes.length||invalid.safeCount||invalid.unsafeCount||invalid.get('ステイゴールド')!==null)throw Error('invalid mare index contract');

// Evaluation count: one common-engine evaluation per domestic sire.
let calls=0;
const counted={...engine,evaluate:(s,m)=>{calls++;return engine.evaluate(s,m)}};
const cp=sale.create({engine:counted,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const countedIndex=cp.createDirectPairIndex('エイスト');
if(calls!==176||countedIndex.entries.length!==176)throw Error('pair index evaluate count '+calls);

console.log(JSON.stringify({
  passed:true,
  evaluationCalls:calls,
  rows,
  conclusion:'createDirectPairIndex performs exactly one evaluation per domestic sire, preserves dangerous-pair information and five-profile rankings, omits child pedigrees from persistent entries, and supports derived homebred mares.'
},null,2));
