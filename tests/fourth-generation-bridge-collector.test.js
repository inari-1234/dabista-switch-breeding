'use strict';
const assert=require('assert');
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
const knownDiff=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:knownDiff});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});

const axes=['sp','speedCross','production','st','balance','theory'];
function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set();
 for(let i=0;i<maxEach;i++)for(const k of axes){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out;
}

const mare='エイスト';
const c2=planner.createCollector({topN:3,poolN:24});
for(const r of planner.iterateTwo(mare))c2.push(r);
const b3=previewBases(c2.finish().shortlists,12);
const bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(mare,b3))bridge.push(r);
const out=bridge.finish();

assert.ok(out.count>9000,'third-generation bridge scan unexpectedly small: '+out.count);
assert.strictEqual(out.sourceCounts.speedCross,320,'speedCross bridge depth must stay explicit');
assert.strictEqual(out.sourceCounts.sp,64);
assert.strictEqual(out.sourceCounts.production,64);
assert.strictEqual(out.sourceCounts.st,64);
assert.strictEqual(out.sourceCounts.balance,64);
assert.strictEqual(out.sourceCounts.theory,64);
assert.strictEqual(out.bridgeCounts.A,0);
assert.strictEqual(out.bridgeCounts.D,144);
assert.ok(out.bases.length<650,'validated compact bridge union should remain substantially below the old wide pool');

const keys=new Set(out.bases.map(r=>planner.routeKey(r)));
for(const key of [
 'グランプリボス>ストラヴィンスキー>スペシャルウィーク',
 'ストラヴィンスキー>グランプリボス>フサイチセブン',
 'グランプリボス>ストラヴィンスキー>アグネスデジタル',
 'グランプリボス>ワイルドラッシュ>ヴァンセンヌ',
 'キンシャサノキセキ>エスケンデレヤ>スペシャルウィーク',
 'グランプリボス>ロードアルティマ>ディープスカイ'
]){
 assert.ok(keys.has(key),'critical fourth-generation bridge source missing: '+key);
}
assert.strictEqual(keys.size,out.bases.length,'bridge bases must be deduplicated by route');

console.log(JSON.stringify({
 passed:true,method:'fourth-generation-bridge-collector',
 scanned:out.count,bases:out.bases.length,config:out.config,sourceCounts:out.sourceCounts,bridgeCounts:out.bridgeCounts
}));
