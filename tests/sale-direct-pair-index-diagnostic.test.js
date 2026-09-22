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

function compactEntry(x){
  return{
    sire:x.sire?.name||'',
    safe:!!x.safe,
    pair:x.pair?{...x.pair,child:null}:null,
    currentRoute:x.route?{...x.route,finalChild:null}:null
  };
}
function profileKeys(routes){
  const c=planner.createCollector({topN:5,poolN:24});
  for(const r of routes)if(r)c.push(r);
  const f=c.finish();
  return Object.fromEntries(Object.entries(f.profiles).map(([k,v])=>[k,v.map(planner.routeKey)]));
}
function build(mareInput){
  const started=Date.now(),full=[],compact=[];
  for(const s of T.stallions){
    const x=planner.evaluateDirectPair(mareInput,s.name);
    full.push(x);compact.push(compactEntry(x));
  }
  const fullRoutes=full.filter(x=>x.route).map(x=>x.route);
  const compactRoutes=compact.filter(x=>x.currentRoute).map(x=>x.currentRoute);
  const a=profileKeys(fullRoutes),b=profileKeys(compactRoutes);
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error('ranking changed after child stripping '+(mareInput.name||mareInput));
  return{
    mare:typeof mareInput==='string'?mareInput:mareInput.name,
    entries:compact.length,
    safe:compact.filter(x=>x.safe).length,
    unsafe:compact.filter(x=>!x.safe).length,
    runtimeMs:Date.now()-started,
    fullBytes:Buffer.byteLength(JSON.stringify(full)),
    compactBytes:Buffer.byteLength(JSON.stringify(compact)),
    ranking:a
  };
}

const rows=[];
for(const name of ['エイスト','スプリングスイーツ','フィットレオタード','ワカヒルメ','アマリン'])rows.push(build(name));

const eist=planner.mare('エイスト'),gp=planner.sire('グランプリボス');
const derived=engine.deriveChild(gp,eist,'自家製テスト牝馬');
if(!derived||derived.ancestor?.length!==15)throw Error('derived mare fixture missing');
rows.push(build(derived));

for(const r of rows){
  if(r.entries!==176)throw Error(r.mare+' entries '+r.entries);
  if(!(r.compactBytes<r.fullBytes))throw Error(r.mare+' compact index did not shrink');
}
if(!rows.some(x=>x.unsafe>0))throw Error('diagnostic cases did not preserve any dangerous current pairs');

// Count contract for one complete current-pair index.
let calls=0;
const counted={...engine,evaluate:(s,m)=>{calls++;return engine.evaluate(s,m)}};
const cp=sale.create({engine:counted,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
for(const s of T.stallions)cp.evaluateDirectPair('エイスト',s.name);
if(calls!==176)throw Error('pair index evaluate count '+calls);

console.log(JSON.stringify({
  passed:true,
  evaluationCalls:calls,
  rows:rows.map(r=>({
    mare:r.mare,entries:r.entries,safe:r.safe,unsafe:r.unsafe,runtimeMs:r.runtimeMs,
    fullBytes:r.fullBytes,compactBytes:r.compactBytes,
    savedPct:Math.round((1-r.compactBytes/r.fullBytes)*1000)/10
  })),
  conclusion:'A 176-entry current-pair index can preserve dangerous pairs and all current five-profile rankings while omitting child pedigrees; custom derived mares are supported.'
},null,2));
