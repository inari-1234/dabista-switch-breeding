'use strict';
const fs=require('fs'),assert=require('assert');
const core=require('../breeding-core.js');
const plannerCore=require('../sale-planner-core.js');
const advisorCore=require('../sale-recommendation-core.js');
const theory=require('../data/theory-master.json');
const effects=require('../data/nitro-effects.json');
const kotta=require('../data/kotta-pairs.json');
const direct=require('../data/elaborate-direct-exceptions.json');
const stallionData=require('../data/stallions.json');
const mareData=require('../data/default-broodmares.json');

const engine=core.create({
 effects:effects.effects||[],
 elaboratePairs:kotta.pairs||[],
 directElaboratePairs:direct.pairs||[]
});
const planner=plannerCore.create({
 engine,
 stallions:theory.stallions||[],
 stallionStats:stallionData.stallions||[],
 broodmares:theory.broodmares||[],
 broodmareStats:mareData.broodmares||[]
});
const advisor=advisorCore.create({planner,broodmareStats:mareData.broodmares||[]});

assert.strictEqual(planner.profileLabels.spCross,'SPクロス補強型');
assert.ok(planner.profileCriteria.spCross.includes('速力/短距離の有効クロス成立'));

let have=0,none=0,lossSum=0,within2=0,checked=0;
const noDirect=[];
const samples={};
for(const mare of theory.broodmares||[]){
 const col=planner.createCollector({topN:3,poolN:24});
 const summary=advisor.emptySummary();
 for(const r of planner.iterateDirect(mare.name)){
  col.push(r);advisor.addRoute(summary,r,'bc');
 }
 const fin=col.finish(),sp=fin.profiles.sp?.[0]||null,sc=fin.profiles.spCross?.[0]||null;
 checked++;
 if(sc){
  have++;
  assert.strictEqual(sc.final.speedCross.has,true,mare.name+' speed-cross flag');
  assert.ok(sc.final.speedCross.spEffect>=1,mare.name+' speed-cross effect');
  const loss=sp.final.sp-sc.final.sp;
  lossSum+=loss;if(loss<=2)within2++;
  assert.strictEqual(sc.final.sp,sc.final.sp,'NSP must remain original value');
 }else{
  none++;noDirect.push(mare.name);
 }
 if(['スプリングスイーツ','エイスト','ミゼラブルウェイ','ミニミニデート','ラブアタック'].includes(mare.name)){
  samples[mare.name]={
   sp:sp&&{sire:sp.sires[0],sp:sp.final.sp,st:sp.final.st,has:sp.final.speedCross.has},
   spCross:sc&&{sire:sc.sires[0],sp:sc.final.sp,st:sc.final.st,effect:sc.final.speedCross.spEffect,names:sc.final.speedCross.names.map(x=>x.name)}
  };
 }
}
assert.strictEqual(checked,331);
assert.strictEqual(have,323);
assert.strictEqual(none,8);
assert.deepStrictEqual(noDirect,[
 'セルン','ピアニー','ベルリンブルー','ロズウェルリポート',
 'ワイルドストロベリー','ジョアニナ','ツインコーラス','シリアルホールド'
]);
assert.ok(Math.abs(lossSum/have-1.21671826625387)<1e-9);
assert.strictEqual(within2,256);

assert.deepStrictEqual(samples['スプリングスイーツ'].spCross,
 {sire:'グランプリボス',sp:19,st:6,effect:2,names:['Halo']});
assert.deepStrictEqual(samples['エイスト'].spCross,
 {sire:'ロードアルティマ',sp:15,st:8,effect:2,names:['Raise a Native','Native Dancer']});
assert.deepStrictEqual(samples['ラブアタック'].spCross,
 {sire:'ワイルドラッシュ',sp:19,st:5,effect:1,names:['Buckpasser']});

function bestGoal(name,goal){
 const col=planner.createCollector({topN:5,poolN:24}),sum=advisor.emptySummary();
 for(const r of planner.iterateDirect(name)){col.push(r);advisor.addRoute(sum,r,goal)}
 return{best:sum.bestRoute,result:col.finish()};
}
const eArc=bestGoal('エイスト','arc');
assert.deepStrictEqual(eArc.best.sires,['ステイゴールド']);
assert.deepStrictEqual([eArc.best.final.sp,eArc.best.final.st],[14,8]);
const eBc=bestGoal('エイスト','bc');
assert.deepStrictEqual(eBc.best.sires,['ロードアルティマ']);
assert.strictEqual(eBc.best.final.speedCross.has,true);
const lBc=bestGoal('ラブアタック','bc');
assert.deepStrictEqual(lBc.best.sires,['ワイルドラッシュ']);
assert.deepStrictEqual([lBc.best.final.sp,lBc.best.final.st],[19,5]);
assert.strictEqual(lBc.best.final.speedCross.has,true);

const v26=fs.readFileSync('v26.js','utf8');
const v27=fs.readFileSync('v27.js','utf8');
assert.ok(v26.includes("keys=['sp','spCross','st','balance','theory']"));
assert.ok(v27.includes("keys=['sp','spCross','st','balance','theory']"));
assert.ok(v26.includes('5軸は合算して総合1位を作りません'));
assert.ok(v26.includes('NSP上限は高い一方、速力/短距離の有効クロスはありません。'));
const labelPos=v27.indexOf("const label=rec.generation===1?'直仔':rec.generation+'代';");
const speedPos=v27.indexOf("const speedNote='SP系クロス");
assert.ok(labelPos>=0&&speedPos>labelPos,'generation detail must define label before speedNote');

console.log(JSON.stringify({
 passed:true,
 direct:{checked,have,none,coveragePct:+(have/checked*100).toFixed(1),avgSpLoss:+(lossSum/have).toFixed(2),within2,within2Pct:+(within2/have*100).toFixed(1)},
 noDirect,
 samples,
 goals:{eistArc:eArc.best.sires,eistBc:eBc.best.sires,loveBc:lBc.best.sires}
},null,2));
