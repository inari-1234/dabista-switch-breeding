'use strict';
const fs=require('fs');
const src=fs.readFileSync('breed-integration.js','utf8');

const required=[
  'planner.createDirectPairIndex(resolved)',
  'planner.evaluateDirectPair(token.mare,firstSire)',
  'planner.iterateTwoFromDirect(g1)',
  'planner.iterateThirdPreview(token.mare,routes2)',
  'planner.createFourthBridgeCollector()',
  'planner.iterateFourthPreview(token.mare,b4.bases)',
  'advisor.profileFutureStatus',
  'advisor.goalFit',
  'pending.has(key)',
  'token.epoch!==epoch',
  'token.fingerprint!==currentFingerprint',
  'data-sire-name',
  'window.DABISTA_BREED_PAIR_INDEX',
  'window.DABISTA_BREED_FUTURE'
];
for(const s of required)if(!src.includes(s))throw Error('integration contract missing '+s);
if(/iterateThirdPreview\(token\.mare,g2\.pool/.test(src))throw Error('3rd generation must use all exact fixed-first g2 routes, not shortlist pool');
if(!/routes2\.push\(r\)/.test(src))throw Error('exact g2 route retention missing');
if(!/generation3:\{method:'exact-fixed-first'/.test(src))throw Error('fixed-first exact generation-3 metadata missing');
if(!/generation4:\{method:'conditional-compact-bridge'/.test(src))throw Error('conditional compact generation-4 metadata missing');
if(!/lruGet\(continuationCache,key\)/.test(src)||!/if\(pending\.has\(key\)\)/.test(src))throw Error('continuation cache/dedupe missing');
if(!/lruSet\(continuationCache,key,result,CONTINUATION_CACHE_LIMIT\)/.test(src))throw Error('bounded continuation cache commit missing');
if(src.indexOf('checkToken(token);\n      lruSet(continuationCache,key,result,CONTINUATION_CACHE_LIMIT)')<0)throw Error('cache commit is not protected by stale-token check');
if(!src.includes('PAIR_CACHE_LIMIT=4')||!src.includes('CONTINUATION_CACHE_LIMIT=12'))throw Error('mobile cache bounds missing');
if(!src.includes('cancelOtherContinuations(nextSire)'))throw Error('first-sire switch cancellation missing');
if(!src.includes('clearFutureOverview()'))throw Error('stale future overview reset missing');
if(!/currentPairIndex=null;\s*activeSire='';\s*clearFutureOverview\(\);\s*epoch\+\+/.test(src))throw Error('lineage change must clear old future overview before advancing epoch');
if(!/if\(nextSire!==activeSire\)\{[\s\S]{0,180}clearFutureOverview\(\)/.test(src))throw Error('first-sire switch must clear previous overview while new scan starts');
const hiddenActive=src.match(/if\(activeSire&&!lists\.ranked\.some\(e=>e\.sire===activeSire\)\)\{([\s\S]{0,220}?)\}/);
if(!hiddenActive||!hiddenActive[1].includes('clearFutureOverview()'))throw Error('filtered-out active sire must not leave stale overview');
if(hiddenActive[1].includes('cancelOtherContinuations'))throw Error('view filtering/category changes must not cancel reusable continuation scan');
if(!src.includes('if(pending.get(key)===token)pending.delete(key)'))throw Error('pending cleanup must not delete a restarted same-key scan');

console.log(JSON.stringify({
  passed:true,
  method:'breed integration runtime contract',
  pairIndex:'one reusable direct-pair index per mare fingerprint',
  generation2:'exact fixed-first',
  generation3:'exact fixed-first over all safe generation-2 routes',
  generation4:'conditional compact bridge',
  async:'dedupe + first-sire cancellation + stale rejection before cache commit',
  cache:'LRU bounded pair and continuation caches',
  identity:'data-sire-name'
},null,2));
