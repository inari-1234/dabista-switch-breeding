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

const sireByName=new Map(S.map(x=>[x.name,x]));
const known=M.filter(x=>+x.sp||+x.st||+x.pw).sort((a,b)=>(b.sp+b.st)-(a.sp+a.st));
const bottom=[...known].sort((a,b)=>(a.sp+a.st)-(b.sp+b.st)).slice(0,3).map(x=>x.name);
const names=['スプリングスイーツ','フィットレオタード','エイスト','ミニミニデート'];

function brief(route){
  if(!route)return null;
  const f=route.final||{},s=f.sireStats||{},p=route.speedCrossPath||[];
  return{
    sires:route.sires,
    sp:f.sp,st:f.st,pw:f.pw,
    firstCross:!!p[0]?.has,
    finalCross:!!f.speedCross?.has,
    finalCrossCount:f.speedCross?.count||0,
    materialCrossStages:route.materialSpeedCross?.stages||0,
    finalSire:{record:s.record,stable:s.stable,guts:s.guts,minD:s.minD,maxD:s.maxD},
    firstSire:(()=>{const x=sireByName.get(route.sires?.[0]);return x?{record:x.record,stable:x.stable,guts:x.guts,minD:x.minD,maxD:x.maxD}:null})()
  };
}

const output=[];
let miniSpeedRoute=null,miniProductionRoute=null,fitProductionRoute=null;
const groupFocus=new Set(['A/A','A/B','A/C','B/A','B/B','B/C','C/A','C/B','C/C']);
for(const mare of names){
  const all=planner.createCollector({topN:5,poolN:24});
  const recA=planner.createCollector({topN:5,poolN:24});
  const recAC=planner.createCollector({topN:5,poolN:24});
  let total=0,noFirstThenFinal=0,noFirstThenFinalBA=0,finalCrossRecA=0,finalCrossRecB=0;
  const combos={},bestByGroup={};
  const routeVec=r=>{
    const f=r.final||{},x=f.speedCross||{};
    return[+f.sp||0,+f.st||0,+x.count||0,+f.pw||0];
  };
  const better=(a,b)=>{
    if(!a)return b;
    const A=routeVec(a),B=routeVec(b);
    for(let i=0;i<A.length;i++){if(A[i]!==B[i])return B[i]>A[i]?b:a}
    return a;
  };
  for(const r of planner.iterateTwo(mare)){
    total++;all.push(r);
    const f=r.final||{},ss=f.sireStats||{},cross=!!f.speedCross?.has,first=!!r.speedCrossPath?.[0]?.has;
    if(cross){
      if(ss.record==='A')finalCrossRecA++;
      if(ss.record==='B')finalCrossRecB++;
      const k=(ss.record||'?')+'/'+(ss.stable||'?');combos[k]=(combos[k]||0)+1;
      if(groupFocus.has(k))bestByGroup[k]=better(bestByGroup[k],r);
      if(!first){
        noFirstThenFinal++;
        if(ss.record==='B'&&ss.stable==='A')noFirstThenFinalBA++;
      }
    }
    if(ss.record==='A')recA.push(r);
    if(ss.record==='A'&&ss.stable==='C')recAC.push(r);
  }
  const a=all.finish(),ra=recA.finish(),rac=recAC.finish();
  const productionTop=a.profiles.production?.[0]||null;
  if(mare==='ミニミニデート'){
    const speedTop=a.profiles.speedCross?.[0];
    if(speedTop?.final?.sireStats?.record!=='B'||speedTop?.final?.sireStats?.stable!=='A')throw Error('MiniMini speed-cross baseline must remain B/A');
    if(speedTop?.speedCrossPath?.[0]?.has)throw Error('MiniMini speed-cross baseline must have no first-stage SP cross');
    if(productionTop?.final?.sireStats?.record!=='B'||productionTop?.final?.sireStats?.stable!=='C')throw Error('MiniMini production profile must prefer B/C within viable pedigree range');
    if((productionTop?.final?.sp||0)<17||(productionTop?.final?.st||0)<5)throw Error('MiniMini production profile must retain BC-level SP/ST');
  }
  if(mare==='フィットレオタード'){
    if(productionTop?.final?.sireStats?.record!=='A')throw Error('Fit production profile should find viable record-A closure');
    if((productionTop?.final?.sp||0)<15||(productionTop?.final?.st||0)<5)throw Error('Fit production record-A route must keep SP15/ST5 floor');
  }
  if(mare==='スプリングスイーツ'){
    if(productionTop?.final?.sireStats?.record!=='A')throw Error('Spring production profile should prefer record A inside viability floor');
  }
  if(mare==='ミニミニデート'){miniSpeedRoute=a.profiles.speedCross?.[0]||null;miniProductionRoute=productionTop}
  if(mare==='フィットレオタード')fitProductionRoute=productionTop;
  output.push({
    mare,
    mareStats:M.find(x=>x.name===mare),
    total,
    finalCrossRecA,finalCrossRecB,noFirstThenFinal,noFirstThenFinalBA,
    finalCrossSireCombos:Object.fromEntries(Object.entries(combos).sort((a,b)=>b[1]-a[1])),
    bestSpeedCrossBySireGroup:Object.fromEntries([...groupFocus].map(k=>[k,brief(bestByGroup[k])]).filter(([,v])=>v)),
    currentTopSpeedCross:brief(a.profiles.speedCross?.[0]),
    currentTopProduction:brief(a.profiles.production?.[0]),
    currentTopSpeedCrossSet:(a.profiles.speedCross||[]).map(brief),
    bestRecordASpeedCross:brief(ra.profiles.speedCross?.[0]),
    bestRecordAStableCSpeedCross:brief(rac.profiles.speedCross?.[0]),
    currentBalance:brief(a.profiles.balance?.[0]),
    recordABalance:brief(ra.profiles.balance?.[0])
  });
}
const miniAssessment=advisor.mareAssessment('ミニミニデート');
const miniSpeedQuality=advisor.productionQuality(miniSpeedRoute,miniAssessment);
const miniProdQuality=advisor.productionQuality(miniProductionRoute,miniAssessment);
if(miniSpeedQuality.key!=='selection-dependent')throw Error('MiniMini B/A no-material route must be selection-dependent');
if(!miniSpeedQuality.requiresSelectedMare)throw Error('MiniMini B/A route must require selected high-quality intermediate mare');
if(!miniSpeedQuality.warnings.some(x=>x.includes('途中SP系クロス補強がなく')))throw Error('MiniMini B/A route must explain missing material SP-cross support');
if(miniProdQuality.key!=='upside')throw Error('MiniMini B/C production route must be described as upside-oriented');

const fitQuality=advisor.productionQuality(fitProductionRoute,advisor.mareAssessment('フィットレオタード'));
if(fitQuality.key!=='ceiling'||fitQuality.record!=='A')throw Error('Fit production route should expose record-A ceiling condition');

const directAA={
  sires:['ダイワメジャー'],
  final:{sp:15,st:5,pw:0,speedCross:{has:true,count:1},sireStats:{record:'A',stable:'A',guts:'B'},theory:{},elaborate:false},
  materialSpeedCross:{has:false,stages:0}
};
const highDirect=advisor.productionQuality(directAA,advisor.mareAssessment('スプリングスイーツ'));
if(highDirect.key!=='ceiling')throw Error('record-A/stable-A direct route on a high mare must not be penalized');
if(!highDirect.notes.some(x=>x.includes('高能力の起点牝馬')))throw Error('stable A must be contextualized positively for a known high mare');

console.log(JSON.stringify({
  passed:true,names,bottom,output,
  qualityChecks:{
    miniSpeed:{key:miniSpeedQuality.key,label:miniSpeedQuality.label,warnings:miniSpeedQuality.warnings},
    miniProduction:{key:miniProdQuality.key,label:miniProdQuality.label},
    fitProduction:{key:fitQuality.key,label:fitQuality.label},
    highDirect:{key:highDirect.key,label:highDirect.label,notes:highDirect.notes}
  }
},null,2));
