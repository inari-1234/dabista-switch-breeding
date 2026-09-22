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
const unknownUpgrade=advisor.materialUpgradeReasons(fakeRoute(0),fakeRoute(1),'arc',unknownAssessment);
assert.ok(!unknownUpgrade.some(x=>x.includes('中間世代で速力/短距離クロス')),'unknown mare must not be treated as SP-deficient when recommending a deeper generation');
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
assert.ok(v26.includes('saleGoalSection'),'goal section must be an explicit UI block');
assert.ok(v26.includes("generationSource='unset'"),'generation selection must start neutral');
assert.ok(v26.includes("setGeneration(rec.generation")===false,'v26 must not invent advisor result');
assert.ok(v27.includes("keys=['sp','speedCross','production','st','balance','theory']"),'3-generation advisor must retain SP-cross and strong-horse production axes');
assert.ok(v27.includes("setGeneration?.(rec.generation,'diagnosis')"),'diagnosis must synchronize the selected generation');
assert.ok(v27.includes('今の育成方針'),'mare strategy must be promoted as the primary actionable cue and kept distinct from the selected goal');
assert.ok(v27.includes('.mare-tier{padding:7px 11px;font-size:14px'),'ability tier must be visually prominent rather than 8-9px metadata');
assert.ok(v27.includes('tier-middle'),'middle-tier mares must have a distinct whole-card tone');
assert.ok(v27.includes('tier-unknown'),'unknown ability must have a neutral whole-card tone');
const mareAdviceBlock=v27.match(/function renderMareAdvice\(\)\{[\s\S]*?\n\}\nfunction invalidateGeneration/)?.[0]||'';
assert.ok(mareAdviceBlock&&!mareAdviceBlock.includes('推奨世代'),'mare summary must not masquerade as the formal generation recommendation');
assert.ok(v27.includes('おすすめ配合世代を診断'),'formal generation diagnosis must remain a separate explicit UI action');
assert.ok(v26.includes("signalMareContext('search-empty','')"),'empty search must invalidate mare/generation context');
assert.ok(v26.includes("setPlannerMare(sel.value,'search-auto')"),'search-driven mare replacement must reset generation state');
assert.ok(v26.includes("signalMareContext('search-restore',keep)"),'mare advice must refresh when a previously empty search is cleared');
assert.ok(v26.includes("setPlannerMare(n,'rebuild-sync')"),'rebuild starter sync must reset generation state');
assert.ok(v26.includes("b.classList.toggle('diagnosed'"),'diagnosis-selected generation must have a distinct visual state');
assert.ok(v26.includes("b.classList.toggle('manual'"),'manual comparison generation must have a distinct visual state');
assert.ok(v26.includes('.sale-seg.gens button.on.manual'),'manual comparison must not reuse the diagnosis color');
assert.ok(v26.includes("q.value=''"),'rebuild starter sync must clear a conflicting mare search filter');
assert.ok(v27.includes("generationSection.insertAdjacentElement('beforebegin',gen)"),'formal generation diagnosis must appear before manual generation buttons');
assert.ok(v27.includes("box.className='mare-advice tier-'"),'mare card must carry a whole-card ability-tier tone');
assert.ok(v27.includes('<h4>${esc(name)}</h4>'),'mare identity must be the primary card heading');
assert.ok(v27.includes('他の目的・補強方針・直仔データを見る'),'secondary explanation must be collapsed behind an explicit details control');
assert.ok(v27.includes('目的別の事前評価'),'purpose cards inside details must remain explicitly pre-diagnosis evaluation');
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
