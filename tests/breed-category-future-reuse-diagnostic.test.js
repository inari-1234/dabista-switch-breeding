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
const indexHtml=fs.readFileSync('index.html','utf8');
const integration=fs.readFileSync('breed-integration.js','utf8');

const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});
const bySire=new Map(T.stallions.map(x=>[x.name,x]));
const mare=T.broodmares.find(x=>x.name==='エイスト');
const sire=bySire.get('グランプリボス');
if(!mare||!sire)throw Error('fixture missing');

const pair=engine.evaluate(sire,mare);
if(pair.danger.dangerous)throw Error('fixture pair unexpectedly dangerous');
const direct=planner.replay(mare,['グランプリボス']);
if(!direct)throw Error('planner direct replay failed');

function same(a,b,k){if(JSON.stringify(a)!==JSON.stringify(b))throw Error(k+' mismatch '+JSON.stringify({a,b}))}
const replayPair=direct.stages?.[0]?.pair;
if(!replayPair)throw Error('planner replay pair missing');
same(replayPair.nitro.sp,pair.nitro.sp,'SP nitro');
same(replayPair.nitro.st,pair.nitro.st,'ST nitro');
same(replayPair.nitro.pw,pair.nitro.pw,'PW nitro');
same(!!replayPair.theory.interesting,!!pair.theory.interesting,'interesting');
same(!!replayPair.theory.magnificent,!!pair.theory.magnificent,'magnificent');
same(!!replayPair.theory.perfect,!!pair.theory.perfect,'perfect');
same(!!replayPair.elaborate.effective,!!pair.elaborate.effective,'elaborate');

const child=engine.deriveChild(sire,mare,'エイスト×グランプリボス娘');
if(!child||child.ancestor.length!==15||child.omoshiro.length!==4)throw Error('derived child incomplete');
const childAll=T.stallions.map(s=>engine.evaluate(s,child));
const childSafeCount=childAll.filter(p=>p&&!p.danger?.kiken&&!p.danger?.tyokiken).length;
const childDirect=[...planner.iterateDirect(child)];
if(childAll.length!==176)throw Error('derived child evaluated count '+childAll.length);
if(childDirect.length!==childSafeCount)throw Error('derived child safe-route mismatch '+childDirect.length+' vs '+childSafeCount);

const c2=planner.createCollector({topN:3,poolN:24});
let twoCount=0;
for(const r of planner.iterateTwo(child)){twoCount++;c2.push(r)}
if(twoCount<=0)throw Error('derived child two-generation scan empty');
const r2=c2.finish();

const axes=['sp','speedCross','production','st','balance','theory'];
function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set();
 for(let i=0;i<maxEach;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out;
}
const b3=previewBases(r2.shortlists,12),c3=planner.createCollector({topN:3,poolN:18}),bridge=planner.createFourthBridgeCollector();
let threeCount=0;
for(const r of planner.iterateThirdPreview(child,b3)){threeCount++;c3.push(r);bridge.push(r)}
const r3=c3.finish(),b4=bridge.finish().bases,c4=planner.createCollector({topN:3,poolN:16});
let fourCount=0;
for(const r of planner.iterateFourthPreview(child,b4)){fourCount++;c4.push(r)}
const r4=c4.finish();
if(!threeCount||!fourCount)throw Error('derived child deep scan empty');

const profiles=['sp','speedCross','production','st','balance'];
const categoryFuture={};
for(const p of profiles){
 const one=childDirect.sort(planner.compareProfile(p))[0]||null;
 const two=r2.profiles?.[p]?.[0]||null;
 const three=r3.profiles?.[p]?.[0]||null;
 const four=r4.profiles?.[p]?.[0]||null;
 categoryFuture[p]={
  label:planner.profileLabels[p],
  bestGenerations:[one,two,three,four].map(r=>r?advisor.routeFacts(r):null)
 };
}

const defaultAssessment=advisor.mareAssessment('エイスト');
const childAssessment=advisor.mareAssessment(child.name);
const goalSelect=indexHtml.match(/<select id="breedGoal">([\s\S]*?)<\/select>/);
if(!goalSelect)throw Error('breedGoal select missing');
const uiGoalValues=[...goalSelect[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
 .map(x=>({value:x[1],label:x[2]}));
const goalValues=uiGoalValues.map(x=>x.value);
if(JSON.stringify(goalValues)!==JSON.stringify(['arc','bc','rebuild','stallion']))throw Error('canonical goal UI drift '+JSON.stringify(goalValues));
if(!integration.includes('planner.createDirectPairIndex(resolved)'))throw Error('current breed UI is not Pair Index based');
if(!integration.includes("const PROFILES=['sp','speedCross','production','st','balance','sire']"))throw Error('six profile integration missing');

console.log(JSON.stringify({
 passed:true,
 method:'breed-category-to-sale-planner-reuse',
 pairConsistency:{
  mare:mare.name,sire:sire.name,
  nitro:{sp:pair.nitro.sp,st:pair.nitro.st,pw:pair.nitro.pw},
  theory:pair.theory,
  elaborate:pair.elaborate.effective,
  dangerous:pair.danger.dangerous
 },
 derivedChild:{
  name:child.name,ancestorCount:child.ancestor.length,omoshiro:child.omoshiro,migoto:child.migoto,
  evaluatedDirectPairs:childAll.length,safeDirectRoutes:childDirect.length,dangerFiltered:childAll.length-childDirect.length,twoRoutes:twoCount,thirdPreviewRoutes:threeCount,fourthPreviewRoutes:fourCount,
  categoryFuture
 },
 abilityContext:{
  defaultMare:{known:defaultAssessment?.abilityKnown||false,tier:defaultAssessment?.tier||null},
  derivedChild:{assessmentAvailable:!!childAssessment,note:'Homebred child has pedigree future potential, but broodmare SP/ST/PW rank is not available unless actual mare ability data is supplied.'}
 },
 currentBreedUi:{
  goalOptions:uiGoalValues,
  goalMap:{arc:'arc',bc:'bc',rebuild:'rebuild',stallion:'stallion'},
  bcDirectOptionPresent:uiGoalValues.some(x=>x.value==='bc'),
  currentRanking:'breed-integration Direct Pair Index; current ranking is mare-aware and pair facts drive the integrated card ordering/filtering',
  sixProfiles:['sp','speedCross','production','st','balance','sire'],
  helperRole:'fallback/bootstrap only when DABISTA_BREED_PAIR_INDEX is unavailable'
 }
},null,2));
