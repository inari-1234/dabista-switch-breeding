'use strict';
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

const fit=advisor.mareAssessment('フィットレオタード');
assert.ok(fit?.abilityKnown,'Fit Leotard ability must be known');
assert.strictEqual(fit.stats.sp,52);
assert.strictEqual(fit.stats.st,50);
assert.strictEqual(fit.stats.pw,48);
assert.ok(fit.ranks.sp.topPercent>45,'screenshot mare is on SP-support side');

const direct=advisor.emptySummary('direct');
for(const r of planner.iterateDirect('フィットレオタード'))advisor.addRoute(direct,r,'arc');
const use=advisor.directUseLabels(fit,direct);
assert.strictEqual(use.arc,'2代以上を比較','pre-diagnosis label must not claim a 2-generation recommendation');
assert.ok(!use.arc.includes('推奨'),'only the generation advisor may publish a generation recommendation');

function fakeRoute(materialStages,sp=15,st=6,longStages=0){
  return{
    final:{
      sp,st,pw:1,
      speedCross:{has:false,count:0,effect:0,short:0,speed:0},
      crossEffects:{anyAbility:false,longDistance:false,gutsSupport:false,powerSupport:false},
      theory:{interesting:false,magnificent:false,perfect:false},
      elaborate:false,
      sireStats:{record:'B',guts:'B',stable:'B',minD:1600,maxD:2200}
    },
    materialSpeedCross:{has:materialStages>0,stages:materialStages,count:materialStages,short:0,speed:materialStages,effect:materialStages},
    materialLongCross:{has:longStages>0,stages:longStages,names:longStages?['Synthetic Long']:[]}
  };
}
const lowReasons=advisor.materialUpgradeReasons(fakeRoute(0),fakeRoute(1),'arc',fit);
assert.ok(lowReasons.some(x=>x.includes('中間世代で速力/短距離クロス')),'low-SP mare should value an intermediate SP-cross opportunity when final SP/ST are maintained');

const elite=advisor.mareAssessment('スプリングスイーツ');
const eliteReasons=advisor.materialUpgradeReasons(fakeRoute(0),fakeRoute(1),'arc',elite);
assert.ok(!eliteReasons.some(x=>x.includes('中間世代で速力/短距離クロス')),'elite mare must not extend generations only for an intermediate SP cross');

const uncertainArcSummary=advisor.emptySummary('synthetic-uncertain-distance');
uncertainArcSummary.arcQuantitative=1;
uncertainArcSummary.arcReady=1;
uncertainArcSummary.arcDistanceUncertain=1;
assert.strictEqual(
  advisor.directUseLabels(elite,uncertainArcSummary).arc,
  '直仔候補（距離根拠要確認）',
  'Arc quantitative/record eligibility must not be rejected solely because sire distance evidence is uncertain'
);

const lowSpDrop=advisor.materialUpgradeReasons(fakeRoute(0,15,6),fakeRoute(1,13,6),'arc',fit);
assert.ok(!lowSpDrop.some(x=>x.includes('中間世代で速力/短距離クロス')),'intermediate SP cross must not justify generation extension after a 2-point SP drop');
const lowStDrop=advisor.materialUpgradeReasons(fakeRoute(0,15,6),fakeRoute(1,15,4),'arc',fit);
assert.ok(!lowStDrop.some(x=>x.includes('中間世代で速力/短距離クロス')),'intermediate SP cross must not justify generation extension after a 2-point ST drop');

const unknownAssessment=advisor.mareAssessment('アマリン');
const unknownUpgrade=advisor.materialUpgradeReasons(fakeRoute(0),fakeRoute(1),'arc',unknownAssessment);
assert.ok(!unknownUpgrade.some(x=>x.includes('中間世代で速力/短距離クロス')),'unknown mare must not be treated as SP-deficient when recommending a deeper generation');

const stNeeds=advisor.mareAssessment('ミニミニデート');
const stReasons=advisor.materialUpgradeReasons(fakeRoute(0,15,6,0),fakeRoute(0,15,6,1),'arc',stNeeds);
assert.ok(stReasons.some(x=>x.includes('長距離クロス')&&x.includes('ST選抜機会')),'ST-needy mare should value an intermediate long-distance-cross selection opportunity when final SP/ST are maintained');
const eliteLongReasons=advisor.materialUpgradeReasons(fakeRoute(0,15,6,0),fakeRoute(0,15,6,1),'arc',elite);
assert.ok(!eliteLongReasons.some(x=>x.includes('ST選抜機会')),'elite mare must not extend generations only for an intermediate long-distance cross');
const unknownLongReasons=advisor.materialUpgradeReasons(fakeRoute(0,15,6,0),fakeRoute(0,15,6,1),'arc',unknownAssessment);
assert.ok(!unknownLongReasons.some(x=>x.includes('ST不足側')),'unknown mare must not be treated as ST-deficient when recommending a deeper generation');

let materialRoute=null;
for(const r of planner.iterateTwo('フィットレオタード')){
  if(r.materialSpeedCross?.has){materialRoute=r;break}
}
assert.ok(materialRoute,'two-generation route with an intermediate SP cross should exist');
assert.strictEqual(materialRoute.speedCrossPath.length,2);
assert.ok(materialRoute.speedCrossPath[0].has,'material cross must belong to generation 1');
assert.ok(materialRoute.materialSpeedCross.stages>=1);

const expanded=planner.expandRoute('フィットレオタード',materialRoute,'arc');
assert.strictEqual(expanded.stages.length,2);
assert.ok(expanded.stages[0].speedCross?.has,'expanded route must expose stage SP-cross information');
const advice=advisor.selectionAdvice('フィットレオタード','arc',expanded.stages[0],2);
assert.ok(advice.body.includes('選抜機会'),'intermediate cross must be described as a selection opportunity');
assert.ok(advice.body.includes('出生前の繁殖SPには加算しません')||advice.body.includes('実馬でSTを確認'),'must not invent intermediate broodmare ability');

let materialLongRoute=null;
for(const r of planner.iterateTwo('ミニミニデート')){
  if(r.materialLongCross?.has){materialLongRoute=r;break}
}
assert.ok(materialLongRoute,'two-generation route with an intermediate long-distance cross should exist');
assert.strictEqual(materialLongRoute.crossEffectPath.length,2);
assert.ok(materialLongRoute.crossEffectPath[0].longDistance,'material long-distance cross must belong to an intermediate generation');
const expandedLong=planner.expandRoute('ミニミニデート',materialLongRoute,'arc');
assert.ok(expandedLong.stages[0].crossEffects?.longDistance,'expanded route must expose direct long-distance cross effect');
const longAdvice=advisor.selectionAdvice('ミニミニデート','arc',expandedLong.stages[0],2);
assert.ok(longAdvice.body.includes('ST選抜機会'),'intermediate long-distance cross must be described as an ST selection opportunity');
assert.ok(longAdvice.body.includes('出生前の繁殖STへ加算せず'),'intermediate long-distance cross must not invent broodmare ST');

let unknownMaterialRoute=null;
for(const r of planner.iterateTwo('アマリン')){
  if(r.materialSpeedCross?.has){unknownMaterialRoute=r;break}
}
assert.ok(unknownMaterialRoute,'unknown mare should still be able to use an intermediate SP cross as bloodline design material');
const unknownExpanded=planner.expandRoute('アマリン',unknownMaterialRoute,'arc');
const unknownAdvice=advisor.selectionAdvice('アマリン','arc',unknownExpanded.stages[0],2);
assert.ok(unknownAdvice.body.includes('能力は未判明'),'unknown mare guidance must preserve unknown status');
assert.ok(unknownAdvice.body.includes('SP不足とは決めつけず'),'unknown mare guidance must explicitly avoid assuming SP deficiency');
assert.ok(!unknownAdvice.body.includes('SP不足を補う'),'unknown mare guidance must not claim SP deficiency');

function finishGeneration(mare){
  const c1=planner.createCollector({topN:3,poolN:24}),s1=advisor.emptySummary('exact-direct');
  for(const r of planner.iterateDirect(mare)){c1.push(r);advisor.addRoute(s1,r,'arc')}
  const r1=c1.finish();
  const c2=planner.createCollector({topN:3,poolN:24}),s2=advisor.emptySummary('exact-two');
  for(const r of planner.iterateTwo(mare)){c2.push(r);advisor.addRoute(s2,r,'arc')}
  const r2=c2.finish();
  const bases=[],seen=new Set(),axes=['sp','speedCross','production','st','balance','theory'];
  for(let i=0;i<12;i++)for(const k of axes){
    const r=r2.shortlists?.[k]?.[i];if(!r)continue;
    const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);bases.push(r)}
  }
  const c3=planner.createCollector({topN:3,poolN:18}),s3=advisor.emptySummary('preview-three');
  for(const r of planner.iterateThirdPreview(mare,bases)){c3.push(r);advisor.addRoute(s3,r,'arc')}
  const r3=c3.finish();
  const assessment=advisor.mareAssessment(mare);
  const generations={
    1:{result:r1,summary:s1,method:'exact'},
    2:{result:r2,summary:s2,method:'exact'},
    3:{result:r3,summary:s3,method:'conditional-preview',previewBaseCount:bases.length}
  };
  return{rec:advisor.recommendGeneration({goal:'arc',assessment,generations}),generations,bases};
}
const fitGeneration=finishGeneration('フィットレオタード');
assert.strictEqual(fitGeneration.rec.generation,2,'Fit Leotard Arc diagnosis must stop at generation 2');
assert.strictEqual(fitGeneration.rec.label,'2代推奨');
assert.ok(fitGeneration.rec.reasons.some(x=>x.includes('凱旋門向け数値・実績基準')),'generation 2 must be justified by Arc quantitative/record readiness rather than a 2400m hard gate');
assert.ok(!fitGeneration.rec.reasons.some(x=>x.startsWith('2代→3代')),'generation 3 must not be selected only for an intermediate SP cross');
assert.ok(fitGeneration.bases.some(r=>r.final?.speedCross?.has),'3-generation preview bases must include the SP-cross axis');

const v26=fs.readFileSync('v26.js','utf8');
const v27=fs.readFileSync('v27.js','utf8');
assert.ok(v26.includes('saleGoalSection'),'goal section must be an explicit UI block');
assert.ok(v26.includes("generationSource='unset'"),'generation selection must start neutral');
assert.ok(v26.includes("setGeneration(rec.generation")===false,'v26 must not invent advisor result');
assert.ok(v27.includes("keys=['sp','speedCross','production','st','balance','theory']"),'3-generation advisor must retain SP-cross and strong-horse production axes');
assert.ok(v27.includes("setGeneration?.(rec.generation,'diagnosis')"),'diagnosis must synchronize the selected generation');
assert.ok(v27.includes('母の補強方針'),'mare strategy wording must not be confused with the selected goal');
assert.ok(v27.includes('正式な推奨世代'),'pre-diagnosis note must distinguish itself from the formal generation diagnosis');
assert.ok(v26.includes("signalMareContext('search-empty','')"),'empty search must invalidate mare/generation context');
assert.ok(v26.includes("setPlannerMare(sel.value,'search-auto')"),'search-driven mare replacement must reset generation state');
assert.ok(v26.includes("signalMareContext('search-restore',keep)"),'mare advice must refresh when a previously empty search is cleared');
assert.ok(v26.includes("setPlannerMare(n,'rebuild-sync')"),'rebuild starter sync must reset generation state');
assert.ok(v26.includes("b.classList.toggle('diagnosed'"),'diagnosis-selected generation must have a distinct visual state');
assert.ok(v26.includes("b.classList.toggle('manual'"),'manual comparison generation must have a distinct visual state');
assert.ok(v26.includes('.sale-seg.gens button.on.manual'),'manual comparison must not reuse the diagnosis color');
assert.ok(v26.includes("q.value=''"),'rebuild starter sync must clear a conflicting mare search filter');
assert.ok(v27.includes("generationSection.insertAdjacentElement('beforebegin',gen)"),'formal generation diagnosis must appear before manual generation buttons');
assert.ok(v27.includes('この繁殖牝馬の基礎評価'),'mare card must not use recommendation wording for a pre-diagnosis assessment');
assert.ok(v27.includes('「基礎評価」は母能力と直仔の血統到達性を分けて判定しています。'),'pre-diagnosis note must consistently use evaluation wording');
assert.ok(v27.includes('目的別の直仔・母評価（事前）'),'purpose cards must be explicitly marked as pre-diagnosis evaluation');
assert.ok(v27.includes("if(!name){box.innerHTML='<div class=\"muted\">検索条件に一致する繁殖牝馬がありません。</div>';return}"),'empty mare search must clear stale mare advice');

console.log(JSON.stringify({
  passed:true,
  mare:'フィットレオタード',
  ranks:{sp:fit.ranks.sp,st:fit.ranks.st,pw:fit.ranks.pw,spst:fit.ranks.spst},
  preDiagnosisArc:use.arc,
  lowMaterialReason:lowReasons,
  eliteMaterialReason:eliteReasons,
  sampleMaterialRoute:materialRoute.sires,
  sampleMaterialCross:materialRoute.materialSpeedCross,
  formalGeneration:{
    generation:fitGeneration.rec.generation,
    label:fitGeneration.rec.label,
    reasons:fitGeneration.rec.reasons,
    direct:advisor.routeFacts(fitGeneration.rec.routes[1]),
    two:advisor.routeFacts(fitGeneration.rec.routes[2]),
    three:advisor.routeFacts(fitGeneration.rec.routes[3]),
    previewBases:fitGeneration.bases.length
  }
},null,2));
