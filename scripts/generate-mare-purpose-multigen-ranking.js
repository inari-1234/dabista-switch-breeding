'use strict';
const fs=require('fs');
const crypto=require('crypto');
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
const goals=['arc','bc','rebuild','stallion'];
const SOURCE_FILES=[
  'breeding-core.js','sale-planner-core.js','sale-recommendation-core.js',
  'data/theory-master.json','data/stallions.json','data/default-broodmares.json',
  'data/nitro-effects.json','data/kotta-pairs.json','data/elaborate-direct-exceptions.json',
  'data/planner-inheritance-validation.json',
  'scripts/generate-mare-purpose-multigen-ranking.js','scripts/merge-mare-purpose-multigen-shards.js'
];
function gitBlobSha(path){
  const b=fs.readFileSync(path),h=crypto.createHash('sha1');
  h.update('blob '+b.length+'\0');h.update(b);return h.digest('hex');
}
function sourceFingerprint(){return SOURCE_FILES.slice().sort().map(p=>p+'@'+gitBlobSha(p)).join('|')}

function previewBases(shortlists,maxEach=12){
  const out=[],seen=new Set(),keys=['sp','speedCross','production','st','balance','theory'];
  for(let i=0;i<maxEach;i++)for(const k of keys){
    const r=shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
  }
  return out;
}
function summaries(method){return Object.fromEntries(goals.map(g=>[g,advisor.emptySummary(method)]))}
function scan(iter,collector,sums,{keepAll=false,sideCollector=null}={}){
  const all=[];
  for(const r of iter){
    collector.push(r);if(sideCollector)sideCollector.push(r);
    for(const g of goals)advisor.addRoute(sums[g],r,g);
    if(keepAll)all.push(r);
  }
  return all;
}
function compactPortfolio(route){
  if(!route?.portfolio)return null;
  const p=advisor.portfolioFacts(route.portfolio);
  return{sp17:p.sp17,sp15:p.sp15,safe:p.safe,sp17hi:p.sp17hi,sp15hi:p.sp15hi,maxSp:p.maxSp,maxSpSt:p.maxSpSt,magnificent:p.magnificent,elaborate:p.elaborate};
}
function methodForGeneration(n){return n<=2?'exact':n===3?'conditional-preview':'conditional-bridge-preview'}
function analyzeMare(name){
  const c1=planner.createCollector({topN:3,poolN:24}),s1=summaries('exact-direct');
  const all1=scan(planner.iterateDirect(name),c1,s1,{keepAll:true}),r1=c1.finish();

  const c2=planner.createCollector({topN:3,poolN:24}),s2=summaries('exact-two');
  scan(planner.iterateTwo(name),c2,s2);const r2=c2.finish();

  const bases=previewBases(r2.shortlists,12);
  const c3=planner.createCollector({topN:3,poolN:18}),s3=summaries('preview-three');
  const bridge4=planner.createFourthBridgeCollector();
  scan(planner.iterateThirdPreview(name,bases),c3,s3,{sideCollector:bridge4});const r3=c3.finish();

  const bridge4Result=bridge4.finish(),bases4=bridge4Result.bases;
  const c4=planner.createCollector({topN:3,poolN:16}),s4=summaries('preview-four');
  scan(planner.iterateFourthPreview(name,bases4),c4,s4);const r4=c4.finish();

  const portfolios={
    1:planner.portfolioPareto(all1,3),
    2:planner.portfolioPareto(r2.pool,3),
    3:planner.portfolioPareto(r3.pool,3),
    4:planner.portfolioPareto(r4.pool,3)
  };
  const result={name,goals:{},diagnostic:{counts:{1:s1.arc.count,2:s2.arc.count,3:s3.arc.count,4:s4.arc.count},bases3:bases.length,bases4:bases4.length}};
  const assessment=advisor.mareAssessment(name);
  const byGeneration={1:r1,2:r2,3:r3,4:r4},bySummary={1:s1,2:s2,3:s3,4:s4};
  for(const goal of goals){
    const generations={};
    for(const n of [1,2,3,4])generations[n]={result:byGeneration[n],summary:bySummary[n][goal],method:methodForGeneration(n)};
    const rec=advisor.recommendGeneration({goal,assessment,generations,portfolios});
    const n=rec.generation;
    let route=goal==='stallion'?(portfolios[n]?.routes?.[0]||rec.routes?.[n]):rec.routes?.[n];
    if(!route)route=advisor.routeForGoal(byGeneration[n],goal);
    const portfolio=goal==='stallion'?(route?.portfolio||portfolios[n]?.routes?.[0]?.portfolio||null):null;
    const grade=advisor.purposeGradeForRoute(name,goal,route,portfolio);
    const cand=advisor.marePurposeCandidate(name,goal,bySummary[n][goal],route,{grade,generation:n});
    result.goals[goal]={
      generation:n,method:methodForGeneration(n),grade,
      sires:[...(route?.sires||[])],
      facts:advisor.routeFacts(route),
      portfolio:compactPortfolio(route),
      reasons:(rec.reasons||[]).slice(0,4),
      conditional:!!rec.conditional,
      sortVector:[...(cand?.vector||[])],
      candidate:cand
    };
  }
  return result;
}

const args=process.argv.slice(2);
const limitArg=args.find(x=>x.startsWith('--limit='));
const namesArg=args.find(x=>x.startsWith('--names='));
const outArg=args.find(x=>x.startsWith('--output='));
const shardIndexArg=args.find(x=>x.startsWith('--shard-index='));
const shardCountArg=args.find(x=>x.startsWith('--shard-count='));
let names=M.filter(x=>advisor.mareAssessment(x.name)?.abilityKnown).map(x=>x.name);
if(namesArg){
  const wanted=new Set(namesArg.slice(8).split(',').map(x=>x.trim()).filter(Boolean));
  names=names.filter(x=>wanted.has(x));
}
if(shardIndexArg||shardCountArg){
  const shardCount=Math.max(1,Number(shardCountArg?.slice(14))||1);
  const shardIndex=Math.max(0,Number(shardIndexArg?.slice(14))||0);
  if(shardIndex>=shardCount)throw Error('invalid shard '+shardIndex+'/'+shardCount);
  names=names.filter((_,i)=>i%shardCount===shardIndex);
}
if(limitArg)names=names.slice(0,Math.max(1,Number(limitArg.slice(8))||1));

const analyzed=[];
const started=Date.now();
for(let i=0;i<names.length;i++){
  const t=Date.now(),row=analyzeMare(names[i]);analyzed.push(row);
  process.stderr.write('[multigen] '+(i+1)+'/'+names.length+' '+names[i]+' '+((Date.now()-t)/1000).toFixed(1)+'s\n');
}
const ranked={};
for(const goal of goals){
  const candidates=analyzed.map(x=>x.goals[goal].candidate).filter(Boolean);
  ranked[goal]=advisor.rankMarePurposeCandidates(candidates);
  const map=new Map(ranked[goal].map(x=>[x.name,x]));
  for(const row of analyzed){
    const rank=map.get(row.name);
    const g=row.goals[goal];
    delete g.candidate;
    g.rank=rank?.rank||null;g.total=rank?.total||candidates.length;
  }
}
const payload={
  schema:1,
  sourceFingerprint:sourceFingerprint(),
  generatedAt:new Date().toISOString(),
  method:'direct+exact-two+conditional-three+conditional-four',
  knownAbilityCount:advisor.knownAbilityCount,
  analyzedCount:analyzed.length,
  elapsedSeconds:Math.round((Date.now()-started)/1000),
  caveat:'3代・4代は条件付き探索。中間牝馬の能力は出生前に仮定しない。',
  mares:Object.fromEntries(analyzed.map(x=>[x.name,{goals:x.goals,diagnostic:x.diagnostic}]))
};
const json=JSON.stringify(payload,null,2)+'\n';
if(outArg)fs.writeFileSync(outArg.slice(9),json);
else process.stdout.write('MULTIGEN_JSON_BEGIN\n'+json+'MULTIGEN_JSON_END\n');
