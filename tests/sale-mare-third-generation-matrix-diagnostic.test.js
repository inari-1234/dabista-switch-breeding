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
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});

const SHARD_COUNT=Math.max(1,+process.env.SHARD_COUNT||1);
const SHARD_INDEX=Math.max(0,+process.env.SHARD_INDEX||0);
const mares=M.filter((_,i)=>i%SHARD_COUNT===SHARD_INDEX);
const axes=['sp','speedCross','production','st','balance','theory'];

function previewBases(shortlists,maxEach=12){
  const out=[],seen=new Set();
  for(let i=0;i<maxEach;i++)for(const k of axes){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const key=planner.routeKey(r);if(!seen.has(key)){seen.add(key);out.push(r)}
  }
  return out;
}
function abilityBand(a){
  if(!a?.abilityKnown)return'unknown';
  const p=a.ranks.spst.topPercent;
  return p<=15?'high':p<=60?'middle':'low';
}
function empty(goal,method){return{summary:advisor.emptySummary(method),result:null,best:null}}
function add(x,r,goal){advisor.addRoute(x.summary,r,goal);x.best=advisor.betterGoalRoute(x.best,r,goal)}
function bump(obj,band,gen){obj[band]??={};obj[band][gen]=(obj[band][gen]||0)+1}

const started=Date.now(),matrix={arc:{},bc:{},rebuild:{}},rows=[];
let twoRoutes=0,thirdRoutes=0,thirdBasesTotal=0,bridgeBasesTotal=0;
for(let mi=0;mi<mares.length;mi++){
  const mare=mares[mi],a=advisor.mareAssessment(mare.name),band=abilityBand(a);
  const direct={arc:empty('arc','direct'),bc:empty('bc','direct'),rebuild:empty('rebuild','direct')};
  const directAll=[];
  for(const r of planner.iterateDirect(mare.name)){
    directAll.push(r);
    for(const g of ['arc','bc','rebuild'])add(direct[g],r,g);
  }

  const c2=planner.createCollector({topN:3,poolN:24});
  const two={arc:empty('arc','two'),bc:empty('bc','two'),rebuild:empty('rebuild','two')};
  for(const r of planner.iterateTwo(mare.name)){
    twoRoutes++;c2.push(r);
    for(const g of ['arc','bc','rebuild'])add(two[g],r,g);
  }
  const r2=c2.finish(),bases3=previewBases(r2.shortlists,12);
  thirdBasesTotal+=bases3.length;

  const c3=planner.createCollector({topN:3,poolN:18});
  const bridge=planner.createFourthBridgeCollector();
  const three={arc:empty('arc','three'),bc:empty('bc','three'),rebuild:empty('rebuild','three')};
  for(const r of planner.iterateThirdPreview(mare.name,bases3)){
    thirdRoutes++;c3.push(r);bridge.push(r);
    for(const g of ['arc','bc','rebuild'])add(three[g],r,g);
  }
  const r3=c3.finish(),bridgeOut=bridge.finish();
  bridgeBasesTotal+=bridgeOut.bases.length;

  const goals={};
  for(const g of ['arc','bc','rebuild']){
    const rec=advisor.recommendGeneration({
      goal:g,assessment:a,
      generations:{
        1:{summary:{bestRoute:direct[g].best}},
        2:{summary:{bestRoute:two[g].best}},
        3:{summary:{bestRoute:three[g].best}}
      }
    });
    bump(matrix[g],band,String(rec.generation));
    goals[g]={
      recommendedGeneration:rec.generation,
      label:rec.label,
      conditional:rec.conditional,
      reasons:rec.reasons,
      transitions:rec.transitions,
      routes:{
        direct:advisor.routeFacts(direct[g].best),
        two:advisor.routeFacts(two[g].best),
        three:advisor.routeFacts(three[g].best)
      }
    };
  }
  rows.push({
    mare:mare.name,band,tier:a?.tier||'未判明',spstPct:a?.ranks?.spst?.topPercent??null,
    strategy:advisor.mareStrategy(mare.name)?.label||'',
    thirdBases:bases3.length,thirdPool:r3.pool.length,fourthBridgeBases:bridgeOut.bases.length,goals
  });
  if((mi+1)%5===0||mi===mares.length-1)console.error('third-gen shard '+SHARD_INDEX+': '+(mi+1)+'/'+mares.length);
}
const focusNames=['スプリングスイーツ','エイスト','フィットレオタード','ミニミニデート','ワカヒルメ','ミムラス','エトワルセリータ','アマリン'];
const byName=Object.fromEntries(rows.map(x=>[x.mare,x])),focus={};
for(const n of focusNames)if(byName[n])focus[n]=byName[n];

if(focus['スプリングスイーツ']&&focus['スプリングスイーツ'].goals.arc.recommendedGeneration!==1)throw Error('Spring Arc regression');
if(focus['エイスト']&&focus['エイスト'].goals.arc.recommendedGeneration!==1)throw Error('Eist Arc regression');
if(focus['フィットレオタード']&&focus['フィットレオタード'].goals.arc.recommendedGeneration<2)throw Error('Fit Arc must not collapse to direct');
if(focus['ミニミニデート']&&focus['ミニミニデート'].goals.arc.recommendedGeneration<2)throw Error('Mini Arc must not collapse to direct');
if(focus['アマリン']&&focus['アマリン'].band!=='unknown')throw Error('unknown mare band');

const out={
  passed:true,
  method:'all-mares exact-through-2gen plus validated conditional-3gen-preview',
  shard:{index:SHARD_INDEX,count:SHARD_COUNT},
  totals:{mares:rows.length,twoRoutes,thirdRoutes,thirdBasesTotal,bridgeBasesTotal,runtimeMs:Date.now()-started},
  matrix,focus,
  fourthCandidates:{
    arc:rows.filter(x=>x.goals.arc.recommendedGeneration===3).map(x=>x.mare),
    bc:rows.filter(x=>x.goals.bc.recommendedGeneration===3).map(x=>x.mare),
    rebuild:rows.filter(x=>x.goals.rebuild.recommendedGeneration===3).map(x=>x.mare)
  }
};
if(process.env.OUTPUT_FILE)fs.writeFileSync(process.env.OUTPUT_FILE,JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
