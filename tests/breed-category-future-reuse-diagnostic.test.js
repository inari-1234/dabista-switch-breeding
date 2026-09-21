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
same(direct.final.sp,pair.nitro.sp,'SP nitro');
same(direct.final.st,pair.nitro.st,'ST nitro');
same(direct.final.pw,pair.nitro.pw,'PW nitro');
same(!!direct.final.theory.interesting,!!pair.theory.interesting,'interesting');
same(!!direct.final.theory.magnificent,!!pair.theory.magnificent,'magnificent');
same(!!direct.final.theory.perfect,!!pair.theory.perfect,'perfect');
same(!!direct.final.elaborate,!!pair.elaborate.effective,'elaborate');

const child=engine.deriveChild(sire,mare,'エイスト×グランプリボス娘');
if(!child||child.ancestor.length!==15||child.omoshiro.length!==4)throw Error('derived child incomplete');
const childDirect=[...planner.iterateDirect(child)];
if(childDirect.length!==176)throw Error('derived child direct count '+childDirect.length);

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
const uiGoalValues=[...indexHtml.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
 .map(x=>({value:x[1],label:x[2]}))
 .filter(x=>['breaker','successor','rebuild','bc'].includes(x.value));

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
  directRoutes:childDirect.length,twoRoutes:twoCount,thirdPreviewRoutes:threeCount,fourthPreviewRoutes:fourCount,
  categoryFuture
 },
 abilityContext:{
  defaultMare:{known:defaultAssessment?.abilityKnown||false,tier:defaultAssessment?.tier||null},
  derivedChild:{assessmentAvailable:!!childAssessment,note:'Homebred child has pedigree future potential, but broodmare SP/ST/PW rank is not available unless actual mare ability data is supplied.'}
 },
 currentBreedUi:{
  goalOptions:uiGoalValues,
  goalMap:{breaker:'arc',successor:'stallion',rebuild:'rebuild'},
  bcDirectOptionPresent:uiGoalValues.some(x=>x.value==='bc'),
  currentRanking:'breed-helper legacy scalar rankValue; pair-specific pedigree data is decorated later and does not drive base ordering'
 }
},null,2));
