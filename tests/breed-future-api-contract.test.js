'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');
const reco=require('../sale-recommendation-core.js');

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
const advisor=reco.create({planner,broodmareStats:M});

function createPairIndex(mareInput){
  const mare=planner.mare(mareInput);if(!mare)throw Error('mare not found');
  const entries=T.stallions.map(s=>{
    const pair=engine.evaluate(s,mare);
    return{
      sire:s.name,
      safe:!!pair&&!pair.danger?.kiken&&!pair.danger?.tyokiken,
      pair,
      stats:planner.statsForSire(s.name)
    };
  });
  return{
    mare,
    entries,
    bySire:new Map(entries.map(x=>[x.sire,x])),
    safeEntries:entries.filter(x=>x.safe),
    filter(fn){return entries.filter(fn)},
    safeFilter(fn){return entries.filter(x=>x.safe&&fn(x))}
  };
}
function directRoutesFromIndex(index){
  const out=[];
  for(const e of index.safeEntries){
    const r=[...planner.iterateDirect(index.mare)].find(x=>x.sires[0]===e.sire);
    if(r)out.push(r);
  }
  return out;
}
function summaryForGoal(routes,goal){
  const s=advisor.emptySummary('pair-index');
  for(const r of routes)advisor.addRoute(s,r,goal);
  return s;
}

const mares=['スプリングスイーツ','フィットレオタード','ワカヒルメ','アマリン'];
const results=[];
for(const mare of mares){
  const index=createPairIndex(mare);
  if(index.entries.length!==176)throw Error(mare+' entries '+index.entries.length);
  if(index.bySire.size!==176)throw Error(mare+' bySire '+index.bySire.size);
  const canonical=[...planner.iterateDirect(mare)];
  if(index.safeEntries.length!==canonical.length)throw Error(mare+' safe count mismatch '+index.safeEntries.length+' vs '+canonical.length);

  const routes=directRoutesFromIndex(index);
  if(routes.length!==canonical.length)throw Error(mare+' route reconstruction count');
  for(const goal of ['arc','bc','rebuild']){
    const a=summaryForGoal(canonical,goal),b=summaryForGoal(routes,goal);
    const af=a.bestRoute?.sires?.[0]||null,bf=b.bestRoute?.sires?.[0]||null;
    if(af!==bf)throw Error(mare+' '+goal+' best mismatch '+af+' vs '+bf);
  }

  const filterCounts={
    safe:index.safeEntries.length,
    interesting:index.safeFilter(x=>!!x.pair.theory?.interesting).length,
    magnificent:index.safeFilter(x=>!!x.pair.theory?.magnificent).length,
    elaborate:index.safeFilter(x=>!!x.pair.elaborate?.effective).length,
    sp15:index.safeFilter(x=>+x.pair.nitro?.sp>=15).length,
    balance:index.safeFilter(x=>+x.pair.nitro?.sp>=15&&+x.pair.nitro?.st>=5).length
  };
  results.push({mare,abilityKnown:advisor.mareAssessment(mare)?.abilityKnown||false,filterCounts});
}
if(results.find(x=>x.mare==='アマリン')?.abilityKnown)throw Error('Amarin ability regression');

const contract={
 pairIndex:{
   storesDangerous:true,
   safeRankingOnly:true,
   oneEvaluatePairPerDomesticStallion:true,
   stableKey:'sire name / future card data-sire-name',
   reusableFor:['theory filters','elaborate/cross/safety filters','nitro filters','current-pair card','ranking input']
 },
 continuation:{
   separateFromPairIndex:true,
   firstSireRequired:true,
   generations:'2 exact continuation; 3-4 conditional stratified preview',
   output:['categoryFuture','goalFit','routes','tradeoffs','portfolioFuture']
 },
 ui:{
   pairIndexRebuildOn:['mare change'],
   rerankWithoutPairRecalcOn:['goal change','category change','search/filter change'],
   continuationOn:['explicit candidate expansion / cached result']
 }
};

console.log(JSON.stringify({passed:true,method:'planned breed future API contract against current engines',results,contract},null,2));
