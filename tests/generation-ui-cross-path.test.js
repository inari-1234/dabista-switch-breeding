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
assert.strictEqual(use.arc,'直仔候補（距離根拠要確認）','pre-diagnosis label should keep a numerically viable direct Arc route as a candidate while exposing uncertain distance evidence');
assert.ok(!use.arc.includes('推奨'),'only the generation advisor may publish a generation recommendation');

// Purpose-specific mare reasons must actually change when the user changes the goal.
const rose=advisor.mareAssessment('ローズティンテッド');
assert.ok(rose?.abilityKnown&&rose.stats.sp===64&&rose.stats.st===54,'Rose Tinted screenshot fixture must remain stable');
const roseStrategy=advisor.mareStrategy('ローズティンテッド');
assert.deepStrictEqual(roseStrategy.strengths,['SP','PW'],'Rose Tinted must expose SP/PW as explicit strengths');
assert.deepStrictEqual(roseStrategy.improve,[],'Rose Tinted must not manufacture a deficit axis');
assert.deepStrictEqual(roseStrategy.relativeAdjust,['ST'],'Rose Tinted ST must be a relative adjustment axis, not a weakness');
const roseDirect=advisor.emptySummary('rose-direct');
for(const r of planner.iterateDirect('ローズティンテッド'))advisor.addRoute(roseDirect,r);
const roseReasons=['arc','bc','rebuild','stallion'].map(g=>advisor.goalMareReason('ローズティンテッド',g,roseDirect));
assert.strictEqual(new Set(roseReasons.map(x=>x.headline)).size,4,'changing the goal must change the visible reason, not only the goal label');
assert.ok(roseReasons[0].headline.includes('SP/ST')&&roseReasons[0].headline.includes('距離'),'Arc reason must expose SP/ST and distance evidence');
assert.ok(roseReasons[1].headline.includes('SP上限'),'BC reason must expose SP ceiling');
assert.ok(roseReasons[2].headline.includes('次代'),'rebuild reason must expose next-generation broodmare value');
assert.ok(roseReasons[3].headline.includes('血統汎用性'),'stallion reason must expose future sire bloodline utility');
const fitArcReason=advisor.goalMareReason('フィットレオタード','arc',direct);
assert.notStrictEqual(
  roseReasons[0].reasons.slice(0,2).join('|'),
  fitArcReason.reasons.slice(0,2).join('|'),
  'the same Arc goal must expose mare-specific visible reasons when the selected mare changes'
);
const roseQuick=advisor.quickSaleOutlook('ローズティンテッド',roseDirect);
assert.ok(roseQuick.label&&roseQuick.goalLabels.arc&&roseQuick.goalLabels.bc,'sale quick view must expose an immediate non-numeric outlook and purpose labels');
assert.ok(!Object.prototype.hasOwnProperty.call(roseQuick,'score'),'sale quick view must not introduce a seventh weighted score');

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
uncertainArcSummary.arcRecordB=1;
uncertainArcSummary.arcDistanceUncertain=1;
uncertainArcSummary.arcUncertainB=1;
assert.strictEqual(
  advisor.directUseLabels(elite,uncertainArcSummary).arc,
  '直仔候補（距離根拠要確認）',
  'Arc quantitative/record eligibility must not be rejected solely because sire distance evidence is uncertain'
);

const lowSpDrop=advisor.materialUpgradeReasons(fakeRoute(0,15,6),fakeRoute(1,13,6),'arc',fit);
assert.ok(!lowSpDrop.some(x=>x.includes('中間世代で速力/短距離クロス')),'intermediate SP cross must not justify generation extension after a 2-point SP drop');
const lowStDrop=advisor.materialUpgradeReasons(fakeRoute(0,15,6),fakeRoute(1,15,4),'arc',fit);
assert.ok(!lowStDrop.some(x=>x.includes('中間世代で速力/短距離クロス')),'intermediate SP cross must not justify generation extension after a 2-point ST drop');

function withFinalSpeedCross(route){
  return{
    ...route,
    final:{
      ...route.final,
      speedCross:{has:true,count:1,effect:1,short:0,speed:1},
      crossEffects:{...(route.final.crossEffects||{}),anyAbility:true,speedSupport:true}
    }
  };
}
const finalCrossOnePoint=advisor.materialUpgradeReasons(
  fakeRoute(0,19,9),
  withFinalSpeedCross(fakeRoute(0,18,9)),
  'arc',fit
);
assert.ok(finalCrossOnePoint.some(x=>x.includes('最終配合で速力/短距離クロス')),
  'Arc may extend for a new final SP cross when SP/ST are otherwise almost maintained');
const finalCrossTwoPoint=advisor.materialUpgradeReasons(
  fakeRoute(0,19,9),
  withFinalSpeedCross(fakeRoute(0,17,10)),
  'arc',fit
);
assert.ok(!finalCrossTwoPoint.some(x=>x.includes('最終配合で速力/短距離クロス')),
  'Arc must not extend a generation solely for a final SP cross after a 2-point SP drop');

function withFinalLongCross(route,maxD=2200){
  return{
    ...route,
    final:{
      ...route.final,
      sireStats:{...(route.final.sireStats||{}),maxD},
      crossEffects:{...(route.final.crossEffects||{}),anyAbility:true,longDistance:true,long:1}
    }
  };
}
const finalLongOnePoint=advisor.materialUpgradeReasons(
  fakeRoute(0,18,8),
  withFinalLongCross(fakeRoute(0,17,8)),
  'arc',fit
);
assert.ok(finalLongOnePoint.some(x=>x.includes('最終配合で長距離クロス')),
  'Arc may extend for a new final long-distance cross when SP/ST are otherwise almost maintained');
const finalLongTwoPoint=advisor.materialUpgradeReasons(
  fakeRoute(0,18,8),
  withFinalLongCross(fakeRoute(0,16,9)),
  'arc',fit
);
assert.ok(!finalLongTwoPoint.some(x=>x.includes('最終配合で長距離クロス')),
  'Arc must not extend a generation solely for a final long-distance cross after a 2-point SP drop');

const distanceNear=advisor.materialUpgradeReasons(
  fakeRoute(0,18,8),
  withFinalLongCross(fakeRoute(0,17,8),2400),
  'arc',fit
);
assert.ok(distanceNear.some(x=>x.includes('2400m対応')),
  'Arc may value new 2400m sire evidence when SP/ST are almost maintained');
const distanceWeak=advisor.materialUpgradeReasons(
  fakeRoute(0,18,8),
  withFinalLongCross(fakeRoute(0,15,8),2400),
  'arc',fit
);
assert.ok(!distanceWeak.some(x=>x.includes('2400m対応')),
  '2400m sire evidence must not justify a generation after a large SP loss');

function withSireEvidence(route,record,maxD){
  return{
    ...route,
    final:{...route.final,sireStats:{...(route.final.sireStats||{}),record,maxD}}
  };
}
const severeArcLossA=withSireEvidence(fakeRoute(0,13,8),'A',2600);
const severeArcLossB=withSireEvidence(fakeRoute(0,15,9),'C',1600);
const severeArcGate=advisor.arcUpgradeGate(severeArcLossA,severeArcLossB);
assert.strictEqual(severeArcGate.allowed,false,'Arc must not trade record A + 2400m evidence for record C + 1600m on threshold gain alone');
assert.strictEqual(severeArcGate.requiredSignals,4,'A->C plus distance-evidence loss must require four independent compensating signals');
assert.deepStrictEqual(advisor.materialUpgradeReasons(severeArcLossA,severeArcLossB,'arc',fit),[],
  'blocked Arc evidence loss must not leak generation-extension reasons');
const severeFit=advisor.goalFit(severeArcLossB,'arc');
assert.strictEqual(severeFit.key,'conditional','SP/ST alone must not be labelled a complete Arc fit');
assert.ok(severeFit.label.includes('父実績/距離要確認'),'Arc fit must disclose missing record and distance support');

const compensatedArcA=withSireEvidence(fakeRoute(0,16,12),'C',2600);
const compensatedArcB=withFinalSpeedCross(withSireEvidence(fakeRoute(0,15,14),'B',1600));
const compensatedArcGate=advisor.arcUpgradeGate(compensatedArcA,compensatedArcB);
assert.strictEqual(compensatedArcGate.allowed,true,
  'distance loss may remain viable when record improves and multiple independent Arc compensations are present');
assert.ok(compensatedArcGate.compensationCount>=2,'compensated Arc transition must expose multiple independent signals');

const eliteFinalSpeed=advisor.materialUpgradeReasons(
  fakeRoute(0,18,9),
  withFinalSpeedCross(fakeRoute(0,18,9)),
  'arc',elite
);
assert.ok(!eliteFinalSpeed.some(x=>x.includes('最終配合で速力/短距離クロス')),
  'elite dam without an SP weakness must not extend generations only for a final SP cross');

const eistAssessment=advisor.mareAssessment('エイスト');
const eliteFinalLong=advisor.materialUpgradeReasons(
  fakeRoute(0,16,8),
  withFinalLongCross(fakeRoute(0,15,12)),
  'arc',eistAssessment
);
assert.ok(!eliteFinalLong.some(x=>x.includes('最終配合で長距離クロス')),
  'elite dam without an ST weakness must not extend generations only for a final long-distance cross');

const highMotherNeedsSp={abilityKnown:true,ranks:{sp:{topPercent:70},st:{topPercent:10},spst:{topPercent:20}}};
const targetedFinalSpeed=advisor.materialUpgradeReasons(
  fakeRoute(0,16,9),
  withFinalSpeedCross(fakeRoute(0,16,9)),
  'arc',highMotherNeedsSp
);
assert.ok(targetedFinalSpeed.some(x=>x.includes('最終配合で速力/短距離クロス')),
  'elite dam may use a final SP cross when SP is the identified weak axis');

const highMotherNeedsSt={abilityKnown:true,ranks:{sp:{topPercent:10},st:{topPercent:70},spst:{topPercent:20}}};
const targetedFinalLong=advisor.materialUpgradeReasons(
  fakeRoute(0,18,8),
  withFinalLongCross(fakeRoute(0,17,8)),
  'arc',highMotherNeedsSt
);
assert.ok(targetedFinalLong.some(x=>x.includes('最終配合で長距離クロス')),
  'elite dam may use a final long-distance cross when ST is the identified weak axis');

const eistSumOnly=advisor.materialUpgradeReasons(
  fakeRoute(0,16,8),
  fakeRoute(0,15,14),
  'arc',eistAssessment
);
assert.ok(!eistSumOnly.some(x=>x.includes('大きく上積み')||x.includes('SP+STを')),
  'elite ST-dominant dam must not extend generations from extra ST alone when SP is the improvement axis');

const eliteSpDirectional=advisor.materialUpgradeReasons(
  fakeRoute(0,16,9),
  fakeRoute(0,18,9),
  'arc',highMotherNeedsSp
);
assert.ok(eliteSpDirectional.some(x=>x.includes('SPを16→18')),
  'elite ST-dominant profile may extend when the identified SP axis materially improves');

const eliteStDirectional=advisor.materialUpgradeReasons(
  fakeRoute(0,18,8),
  fakeRoute(0,17,10),
  'arc',highMotherNeedsSt
);
assert.ok(eliteStDirectional.some(x=>x.includes('STを8→10')),
  'elite SP-dominant profile may extend when the identified ST axis materially improves');

const unknownAssessment=advisor.mareAssessment('アマリン');
const unknownLabel=advisor.recommendGeneration({
  goal:'arc',assessment:unknownAssessment,
  generations:{1:{summary:{bestRoute:fakeRoute(0,15,6)}}}
}).label;
assert.strictEqual(unknownLabel,'血統上は直仔条件付き（能力/根拠確認前提）',
  'unknown mare with quantitative Arc bloodline but missing distance support must stay conditional, not a confirmed recommendation');
const unknownBelowLabel=advisor.recommendGeneration({
  goal:'arc',assessment:unknownAssessment,
  generations:{1:{summary:{bestRoute:fakeRoute(0,8,14)}}}
}).label;
assert.ok(unknownBelowLabel.includes('基準未達')&&unknownBelowLabel.includes('能力確認前提'),
  'unknown mare kept at generation 1 must distinguish Arc threshold failure from a qualified direct candidate');
const unknownDirect=advisor.emptySummary('unknown-direct');
for(const r of planner.iterateDirect('アマリン'))advisor.addRoute(unknownDirect,r);
const unknownQuick=advisor.quickSaleOutlook('アマリン',unknownDirect);
assert.strictEqual(unknownQuick.abilityKnown,false,'unknown mare quick view must preserve unknown ability');
assert.ok(unknownQuick.label.includes('能力未判明'),'unknown mare quick view must state uncertainty explicitly');
assert.ok(unknownQuick.caution.includes('価格から能力値を確定しません'),'price must never be converted into a confirmed hidden ability value');
const unknownGoal=advisor.goalMareReason('アマリン','bc',unknownDirect);
assert.ok(unknownGoal.headline.includes('母能力を仮定せず'),'unknown mare goal reason must not infer SP deficiency');
const unknownUpgrade=advisor.materialUpgradeReasons(fakeRoute(0),fakeRoute(1),'arc',unknownAssessment);
assert.ok(!unknownUpgrade.some(x=>x.includes('中間世代で速力/短距離クロス')),'unknown mare must not be treated as SP-deficient when recommending a deeper generation');

const unknownVisibleReasons=[];
for(const m of M){
  const a=advisor.mareAssessment(m.name);
  if(!a||a.abilityKnown)continue;
  const summary=advisor.emptySummary('unknown-bloodline-variation');
  for(const r of planner.iterateDirect(m.name))advisor.addRoute(summary,r);
  const reason=advisor.goalMareReason(m.name,'arc',summary);
  unknownVisibleReasons.push({name:m.name,visible:(reason.reasons||[])[0]||'',detail:reason.detail||''});
}
assert.strictEqual(unknownVisibleReasons.length,33,'all 33 unknown-ability mares must remain in the bloodline comparison');
assert.ok(new Set(unknownVisibleReasons.map(x=>x.visible)).size>=2,
  'unknown-ability mares must expose different visible bloodline outlooks when their pedigrees differ');
assert.ok(unknownVisibleReasons.every(x=>x.visible.includes('直仔血統')),
  'unknown-ability variation must come from bloodline evidence, not inferred hidden ability');
const unknownFinalCross=advisor.materialUpgradeReasons(
  fakeRoute(0,16,8),
  withFinalSpeedCross(fakeRoute(0,16,8)),
  'arc',unknownAssessment
);
assert.ok(!unknownFinalCross.some(x=>x.includes('最終配合で速力/短距離クロス')),
  'unknown mare must not be pushed deeper solely by a final SP cross');

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
const springGeneration=finishGeneration('スプリングスイーツ');
assert.strictEqual(springGeneration.rec.generation,1,'Spring Sweets must stay at direct Arc generation unless a deeper route materially improves an already elite dam');

const eistGeneration=finishGeneration('エイスト');
assert.strictEqual(eistGeneration.rec.generation,1,'Eist must not be pushed deeper by extra ST or cross evidence when SP is the mare-specific improvement axis');

const fitGeneration=finishGeneration('フィットレオタード');
assert.strictEqual(fitGeneration.rec.generation,2,'Fit Leotard Arc diagnosis must stop at generation 2');
assert.strictEqual(fitGeneration.rec.label,'2代推奨');
assert.ok(fitGeneration.rec.reasons.some(x=>x.includes('中間世代で速力/短距離クロス')||x.includes('凱旋門向けSP/ST基準')||x.includes('最終父の実績')),'generation 2 must be justified by a mare-aware material improvement rather than a hard 2400m or record-A gate');
assert.ok(!fitGeneration.rec.reasons.some(x=>x.startsWith('2代→3代')),'generation 3 must not be selected only for a final SP cross after losing too much SP');
assert.ok(fitGeneration.bases.some(r=>r.final?.speedCross?.has),'3-generation preview bases must include the SP-cross axis');

const miniGeneration=finishGeneration('ミニミニデート');
assert.strictEqual(miniGeneration.rec.generation,2,'Mini Mini Date must retain the validated two-generation Arc recommendation');
assert.ok(!miniGeneration.rec.reasons.some(x=>x.startsWith('2代→3代')),'Mini Mini Date must not be extended after the validated generation-2 gain is already captured');

const v26=fs.readFileSync('v26.js','utf8');
const v27=fs.readFileSync('v27.js','utf8');
assert.ok(v26.includes('saleGoalSection'),'goal section must remain explicit');
assert.ok(v26.includes("generationSource='unset'"),'generation state must still start neutral internally');
assert.ok(v26.includes("setGeneration(rec.generation")===false,'v26 must not invent advisor result');
assert.ok(v27.includes("keys=['sp','speedCross','production','st','balance','theory']"),'generation advisor must retain all six internal axes');
assert.ok(v27.includes("setGeneration?.(rec.generation,'diagnosis')"),'diagnosis must synchronize the recommended generation first');
assert.ok(v27.includes('data-generation-choice'),'all four compact generation cards must be tappable');
assert.ok(v27.includes('selectedGeneration=rec.generation'),'automatic recommendation must remain the initial selection');
assert.ok(v27.includes("selectedGeneration===rec.generation?'diagnosis':'manual'"),'manual generation override must be recorded separately from diagnosis');
assert.ok(v27.includes('aria-pressed'),'generation card selection must expose button state');
assert.ok(v27.includes("'選択中：'+label"),'manual override must remain visible without long explanatory copy');
assert.ok(v27.includes('この世代で本命配合を見る'),'manual generation must be directly actionable');
assert.ok(v27.includes('purpose-focus'),'selected purpose must lead the mare card');
assert.ok(v27.includes('AI順位'),'purpose card must expose purpose-specific AI rank');
assert.ok(v27.includes('purpose-stats')&&v27.includes('繁殖SP')&&v27.includes('繁殖ST')&&v27.includes('繁殖PW'),'purpose card must integrate mare ability stats');
assert.ok(v27.includes('purpose-nitro')&&v27.includes('ニトロ'),'purpose card must integrate nitro');
assert.ok(v27.includes('focusFactorHtml'),'father/dam-sire/sire-sire factors must be surfaced when present');
assert.ok(v27.includes('quickGoalRecommendations'),'sale purpose panel must come from the shared recommendation core');
assert.ok(v27.includes('function mareAttentionGroups'),'mare attention must use structured recommendation evidence');
assert.ok(v27.includes('goalMareReason'),'purpose-specific mare reason must come from the shared recommendation core');
assert.ok(v27.includes('AI配合シミュレーション'),'purpose card must offer a concrete AI breeding simulation');
assert.ok(v27.includes('pedigreeTreeHtml'),'purpose card must expose the complete 15-ancestor pedigree view');
assert.ok(v27.includes('.mare-tier{padding:7px 11px;font-size:14px'),'ability tier must remain prominent');
assert.ok(v27.includes('tier-middle'),'middle-tier mares must retain a distinct whole-card tone');
assert.ok(v27.includes('tier-unknown'),'unknown ability must retain a neutral whole-card tone');
const mareAdviceBlock=v27.match(/function renderMareAdvice\(\)\{[\s\S]*?\n\}\nfunction invalidateGeneration/)?.[0]||'';
assert.ok(mareAdviceBlock&&!mareAdviceBlock.includes('推奨世代'),'mare summary must not masquerade as the formal generation recommendation');
assert.ok(v27.includes('おすすめ世代を決める'),'formal generation diagnosis must be recommendation-first');
assert.ok(v27.includes('おすすめ世代を決める'),'generation diagnosis must have one primary action');
assert.ok(v27.includes('generationSection.hidden=true'),'legacy generation selector must stay hidden');
assert.ok(v27.includes('if(notice)notice.hidden=true'),'technical generation notice must stay hidden from the primary flow');
assert.ok(v27.includes('if(run)run.hidden=true'),'duplicate old design action must stay hidden');
assert.ok(v27.includes('generation-compare'),'four-generation comparison must remain compact');
assert.ok(v27.includes('generation-key-reason'),'selected generation must include a concise reason');
assert.ok(v26.includes("signalMareContext('search-empty','')"),'empty search must invalidate mare/generation context');
assert.ok(v26.includes("setPlannerMare(sel.value,'search-auto')"),'search-driven mare replacement must reset generation state');
assert.ok(v26.includes("signalMareContext('search-restore',keep)"),'mare advice must refresh when a previously empty search is cleared');
assert.ok(v26.includes("setPlannerMare(n,'rebuild-sync')"),'rebuild starter sync must reset generation state');
assert.ok(v26.includes("q.value=''"),'rebuild starter sync must clear a conflicting mare search filter');
assert.ok(v26.includes('331頭中 '),'UI must reveal that the full mare master is available');
assert.ok(!v26.includes('もう一度「この条件で設計」を実行してください'),'stale hidden-button instruction must be removed');
assert.ok(v27.includes("box.className='mare-advice tier-'"),'mare card must carry a whole-card ability-tier tone');
assert.ok(v27.includes("esc(name)+'</h4>"),'mare identity must remain the primary card heading');
assert.ok(v27.includes('詳しい評価根拠を見る'),'secondary mare data must remain collapsed');
assert.ok(v27.includes('buildPurposeRankings')&&v27.includes('paintPurposeRanks'),'all four purpose tabs must receive AI ranks');
assert.ok(v27.includes("if(!name){box.className='mare-advice tier-unknown';box.innerHTML='<div class=\"muted\">検索条件に一致する繁殖牝馬がありません。</div>';return}"),'empty mare search must clear stale mare advice and reset card tone');
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
