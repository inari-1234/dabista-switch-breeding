'use strict';
// CI status publishing is verified on the same candidate HEAD as this regression.
const fs=require('fs'),assert=require('assert');
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
const v26=fs.readFileSync('v26.js','utf8');
assert.ok(v26.includes('SPクロス補強型候補なし'),'SP-cross empty state must be explicit');

assert.strictEqual(planner.profileLabels.speedCross,'SPクロス補強型');
assert.ok(planner.profileCriteria.speedCross.includes('速力/短距離'));
assert.ok(planner.profileCriteria.speedCross.includes('完璧/見事'));
assert.ok(planner.goalOrder('arc').includes('speedCross'));
assert.strictEqual(planner.goalOrder('bc')[0],'speedCross');

let coverage=0,invalid=0,pureSpNoCross=0,lossSum=0,lossN=0,within2=0;
const topByMare={},missingDirect=[];
for(const mare of T.broodmares){
  const col=planner.createCollector({topN:3,poolN:24});
  for(const r of planner.iterateDirect(mare.name))col.push(r);
  const result=col.finish();
  const sp=result.profiles.sp?.[0]||null;
  const sx=result.profiles.speedCross?.[0]||null;

  if(sp&&!sp.final.speedCross?.has)pureSpNoCross++;
  if(sx){
    coverage++;
    if(!sx.final.speedCross?.has)invalid++;
    assert.ok(sx.final.speedCross.count>=1,mare.name+' speedCross count');
    assert.ok(sx.final.speedCross.short>0||sx.final.speedCross.speed>0,mare.name+' speed/short effect');
    if(sp){
      const loss=sp.final.sp-sx.final.sp;
      lossSum+=loss;lossN++;
      if(loss<=2)within2++;
    }
  }else missingDirect.push(mare.name);
  if(['スプリングスイーツ','エイスト','ミゼラブルウェイ','ミニミニデート','ラブアタック'].includes(mare.name)){
    topByMare[mare.name]={sp,sx};
  }
}
assert.strictEqual(coverage,323,'direct mares with a safe SP-cross route');
assert.strictEqual(invalid,0,'SP-cross profile must never contain a no-cross route');
assert.strictEqual(pureSpNoCross,292,'pure SP profile diagnostic baseline');
assert.strictEqual(within2,256,'SP-cross route should stay within NSP 2 for validated majority');
assert.ok(lossSum/lossN<1.3,'average NSP tradeoff should stay small');

assert.deepStrictEqual(missingDirect,[
  'セルン','ピアニー','ベルリンブルー','ロズウェルリポート',
  'ワイルドストロベリー','ジョアニナ','ツインコーラス','シリアルホールド'
],'direct SP-cross exceptions must stay explicit');
const recoveredTwo={};
for(const name of missingDirect){
  let found=null,checked=0;
  for(const r of planner.iterateTwo(name)){
    checked++;
    if(r.final.speedCross?.has){found=r;break}
  }
  assert.ok(found,name+' must be able to form an SP cross by generation 2');
  assert.strictEqual(found.method,'exact-two-generation',name+' generation-2 method');
  recoveredTwo[name]={checked,sires:found.sires,sp:found.final.sp,st:found.final.st,cross:found.final.speedCross};
}

function top(name,type){return topByMare[name][type]}
assert.strictEqual(top('スプリングスイーツ','sx').sires[0],'グランプリボス');
assert.deepStrictEqual([top('スプリングスイーツ','sx').final.sp,top('スプリングスイーツ','sx').final.st],[19,6]);
assert.strictEqual(top('スプリングスイーツ','sx').final.speedCross.short,1);

assert.strictEqual(top('エイスト','sx').sires[0],'ロードアルティマ');
assert.deepStrictEqual([top('エイスト','sx').final.sp,top('エイスト','sx').final.st],[15,8]);
assert.strictEqual(top('エイスト','sx').final.speedCross.speed,2);

assert.strictEqual(top('ラブアタック','sx').sires[0],'ワイルドラッシュ');
assert.deepStrictEqual([top('ラブアタック','sx').final.sp,top('ラブアタック','sx').final.st],[19,5]);
assert.strictEqual(top('ラブアタック','sx').final.speedCross.speed,1);

const base={final:{sp:15,st:6,pw:0,speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2400,record:'A',guts:'B'},theory:{},elaborate:false}};
const improved={final:{sp:15,st:6,pw:0,speedCross:{has:true,count:1,short:0,speed:1,effect:1},sireStats:{maxD:2400,record:'A',guts:'B'},theory:{},elaborate:false}};
assert.strictEqual(advisor.betterGoalRoute(base,improved,'arc'),improved,'arc route should prefer SP cross when quantitative target is tied');
assert.strictEqual(advisor.betterGoalRoute(base,improved,'bc'),improved,'BC route should prefer SP cross when quantitative target is tied');

const strongerArc={final:{sp:18,st:6,pw:0,speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2400,record:'A',guts:'B'},theory:{},elaborate:false}};
const weakerArcCross={final:{sp:15,st:6,pw:0,speedCross:{has:true,count:1,short:0,speed:1,effect:1},sireStats:{maxD:2400,record:'A',guts:'B'},theory:{},elaborate:false}};
assert.strictEqual(advisor.betterGoalRoute(strongerArc,weakerArcCross,'arc'),strongerArc,'arc route must keep superior SP/ST ahead of SP-cross tie-break');

const strongerBc={final:{sp:20,st:5,pw:0,speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2000,record:'A',guts:'B'},theory:{},elaborate:false}};
const weakerBcCross={final:{sp:17,st:5,pw:0,speedCross:{has:true,count:1,short:0,speed:1,effect:1},sireStats:{maxD:2000,record:'A',guts:'B'},theory:{},elaborate:false}};
assert.strictEqual(advisor.betterGoalRoute(strongerBc,weakerBcCross,'bc'),strongerBc,'BC route must keep superior SP ahead of SP-cross tie-break');

const higherStArc={final:{sp:16,st:7,pw:0,speedCross:{has:false,count:0,short:0,speed:0,effect:0},sireStats:{maxD:2400,record:'A',guts:'B'},theory:{},elaborate:false}};
const shortCrossArc={final:{sp:16,st:6,pw:0,speedCross:{has:true,count:1,short:1,speed:0,effect:2},sireStats:{maxD:2400,record:'A',guts:'B'},theory:{},elaborate:false}};
assert.strictEqual(advisor.betterGoalRoute(higherStArc,shortCrossArc,'arc'),higherStArc,'short-distance cross must not override the better ST quantitative profile');

assert.ok(advisor.materialUpgradeReasons(base,improved,'arc',{abilityKnown:true,ranks:{spst:{topPercent:50}}}).some(x=>x.includes('速力/短距離クロス')));

console.log(JSON.stringify({
  passed:true,
  mares:T.broodmares.length,
  coverage,
  pureSpNoCross,
  avgSpLoss:+(lossSum/lossN).toFixed(2),
  within2,
  missingDirect,
  recoveredTwo,
  examples:{
    spring:{sire:top('スプリングスイーツ','sx').sires[0],sp:top('スプリングスイーツ','sx').final.sp,st:top('スプリングスイーツ','sx').final.st,cross:top('スプリングスイーツ','sx').final.speedCross},
    eist:{sire:top('エイスト','sx').sires[0],sp:top('エイスト','sx').final.sp,st:top('エイスト','sx').final.st,cross:top('エイスト','sx').final.speedCross},
    love:{sire:top('ラブアタック','sx').sires[0],sp:top('ラブアタック','sx').final.sp,st:top('ラブアタック','sx').final.st,cross:top('ラブアタック','sx').final.speedCross}
  }
},null,2));
