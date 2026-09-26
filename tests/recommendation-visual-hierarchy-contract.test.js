'use strict';
const fs=require('fs');

const v26=fs.readFileSync('v26.js','utf8');
const v27=fs.readFileSync('v27.js','utf8');
const breed=fs.readFileSync('breed-integration.js','utf8');
const advisor=fs.readFileSync('sale-recommendation-core.js','utf8');
const planner=fs.readFileSync('sale-planner-core.js','utf8');
const css=fs.readFileSync('ui-refresh.css','utf8');
const v24=fs.readFileSync('v24.js','utf8');
const v25=fs.readFileSync('v25.js','utf8');

const need=(src,token,msg)=>{if(!src.includes(token))throw Error(msg+' missing: '+token)};

for(const token of ['tier-elite','tier-high','tier-upper','tier-middle','tier-rebuild','tier-unknown'])need(v27,token,'mare tier tone');
need(v27,'.mare-tier{padding:7px 11px;font-size:14px','mare tier prominence');
need(v27,'purpose-focus','selected purpose must lead the mare card');
need(v27,"if(summary)summary.hidden=true",'legacy selected-mare summary must be hidden when purpose-first UI is active');
need(v27,'AI順位','purpose-specific AI rank');
need(v27,'purpose-stats','mare ability must live inside the selected purpose');
need(v27,'purpose-nitro','nitro must live inside the selected purpose');
need(v27,'focusFactorHtml','key ancestor factors must be compactly visible');
need(v27,'quickGoalRecommendations','purpose recommendation must use core criteria');
need(v27,'buildPurposeRankings','purpose rankings must be computed for all known mares');
need(v27,'paintPurposeRanks','purpose tabs must show their own ranks');
need(v27,'marePurposeCandidate','ranking must use the shared recommendation core');
need(v27,'function mareAttentionGroups','attention facts must stay structured');
need(v27,'AI配合シミュレーション','purpose card must expose the concrete AI breeding example');
need(v27,'pedigreeTreeHtml','complete pedigree must be available on demand');
need(v27,'ゲーム内マスタの15祖先','pedigree dialog must declare full 15-ancestor game-master data');
need(v27,'見事コード','pedigree dialog must expose migoto code');
need(v27,'見事系統','pedigree dialog must expose migoto systems');
need(v27,'stallionPortfolioRoute','stallion purpose must use future breeding portfolio');
need(v27,'nitro.sp??facts.sp??0','simulation must preserve a true zero SP nitro');
need(v27,'nitro.st??facts.st??0','simulation must preserve a true zero ST nitro');
need(v27,'nitro.pw??facts.pw??0','simulation must preserve a true zero PW nitro');
if(v27.includes('nitro.sp||facts.sp||0')||v27.includes('nitro.st||facts.st||0')||v27.includes('nitro.pw||facts.pw||0'))throw Error('simulation must not replace zero nitro with fallback values');
need(v27,'詳しい評価根拠を見る','secondary evidence must stay collapsed');
need(v27,".slice(0,4)",'purpose attention must cap primary evidence density');
need(v27,'purpose-actions','purpose card must keep only the two primary detail actions');
need(v27,'marePurposeSimulationDlg','AI simulation must open outside the primary card');
need(v27,'marePedigreeDlg','full pedigree must open outside the primary card');
if(/purpose-stats[\s\S]{0,800}SP\+ST/.test(v27))throw Error('SP+ST must not return to the primary purpose stat block');
need(v27,'目的横断の総合点や第7評価軸は作りません','purpose ranking must not become a seventh overall score');
if(v26.includes('ニトロ・価格・血統を見る')||v26.includes('価格 ${fmt(s.price)}万円'))throw Error('price must be removed from mare primary/detail UI');
if(v26.includes("SP+ST '+info.spst"))throw Error('SP+ST summary must be removed from selected mare UI');
need(v27,'おすすめ世代を決める','generation purpose must be recommendation-first');
need(v27,'おすすめ世代を決める','generation single primary action');
need(v27,'secondary ui-wide-cta generation-run-cta','generation diagnostic action must use shared wide CTA');
need(breed,'secondary ui-wide-cta breed-future-cta','future diagnostic action must use shared wide CTA');
need(css,'body.ui-refresh .ui-wide-cta{','shared wide CTA style');
need(css,'min-height:52px!important','wide CTA minimum height');
need(css,'font-size:15px!important','wide CTA readable desktop text');
need(css,'font-size:16px!important','wide CTA readable iPhone text');
need(v27,'data-generation-choice','generation comparison cards must be selectable');
need(v27,'selectedGeneration=rec.generation','automatic recommendation must remain the initial selected generation');
need(v27,"selectedGeneration===rec.generation?'diagnosis':'manual'","manual generation choice must remain distinguishable from diagnosis");
need(v27,"selected===n?'selected':''",'generation card selected state');
need(v27,"'選択中：'+label",'manual generation choice must be visible without a long sentence');
need(v27,'generationSection.hidden=true','legacy generation selector must stay hidden');
need(v27,'if(notice)notice.hidden=true','technical generation notice must not be primary');
need(v27,'if(run)run.hidden=true','duplicate old design button must stay hidden');
need(v27,'generation-key-reason','selected generation must show a concise reason');
if(v27.includes('父実績Aを強く評価し'))throw Error('generic record-A mare sentence must not return; the visible reason must change by goal');
if(v27.includes('世代推奨は勝率・産駒能力の確率予測ではありません。安全配合'))throw Error('long generation disclaimer must not return to primary result');
if(/\.mare-tier\{[^}]*font-size:(?:8|9)px/.test(v27))throw Error('mare tier regressed to tiny text');

for(const token of [
  'function mareBand(','function goalMareReason(','function quickSaleOutlook(','function quickGoalRecommendations(','function productionContext(','function compareProductionForMare(','function candidateDisplayFacts(',
  'function productionCandidateCue(','function selectProductionRecommendations(','function shortDistanceTier('
])need(advisor,token,'mare-aware production recommendation');
need(advisor,"const requiredSignals=record==='A'?2:record==='B'?3:record==='C'?4:99","record A>B>C must require progressively stronger evidence to overturn");
need(advisor,"凱旋門はSP/STを守り、距離根拠を持つ配合へつなぐ","Arc mare reason must be purpose-specific");
need(advisor,"BCはSP上限と速力・短距離クロスの経路を優先","BC mare reason must be purpose-specific");
need(advisor,"繁殖再建は完成馬より、次代で使いやすい母系を作る","rebuild mare reason must be purpose-specific");
need(advisor,"自家製種牡馬は産駒能力だけでなく、後代で使える血統汎用性を作る","stallion mare reason must be purpose-specific");
need(advisor,'const overrideEligible=compensationCount>=requiredSignals','production reversal must use an explicit evidence gate rather than a weighted overall score');
if(advisor.includes('evidenceScore='))throw Error('production ranking must not collapse evidence into a weighted overall score');
need(advisor,"if(d<=1000)return 3","1000m lower-bound SP evidence");
need(advisor,"if(d<=1200)return 2","1200m lower-bound SP evidence");
need(advisor,"key='longshot';label='上振れ枠'","C/C must stay available as an upside role rather than be globally excluded");
need(advisor,"実績C・安定Cを許容する代わりに明確な血統上積みが必要","C/C must require an explicit compensating rationale");
if(advisor.includes("const middleMain=band==='middle'&&practical&&stable!=='C'"))throw Error('stable C must not be hard-excluded from the middle-mare main comparison');

need(planner,'実績A>B>Cを強い基礎差として評価','planner criteria must document record ordering');
need(planner,'距離下限1000/1200m側をSP補助根拠','planner criteria must document short-distance SP evidence');
need(planner,'B/Cは他要素の明確な上積みがある場合のみ逆転','planner criteria must document compensated reversal');

need(v26,"const labels={arc:'凱旋門賞',bc:'BC長期',rebuild:'繁殖再建',stallion:'自家製種牡馬'}",'goal buttons must be Arc/BC then rebuild/stallion');
need(v26,'331頭中 ','all mare data visibility');
need(v26,'件を表示・選択できます','all mare data visibility count');
need(v26,'色＝候補の役割','candidate colors must explain their meaning');
need(v26,'緑：本命','main color semantics');
need(v26,'青：実績','record color semantics');
need(v26,'紫：SP補強','SP-support color semantics');
need(v26,'青緑：ニトロ','nitro color semantics');
need(v26,'黄：上振れ','upside color semantics');
need(v26,'白：参考軸','reference color semantics');
need(v26,'別強み候補 ','non-top recommendations must explain a distinct reason instead of repeating main/standard');
need(v26,'productionCandidateCue','candidate cards must use peer-relative explanations');
need(v26,'candidateDisplayFacts','sale candidate cards must use shared display-priority facts');
need(v26,"candidateBlock('加算'",'sale candidate cards must show additions first');
need(v26,"candidateBlock('減算'",'sale candidate cards must show subtractions after additions');
need(v26,"candidateBlock('注意'",'sale candidate cards must show cautions after subtractions');
need(v26,'selectProductionRecommendations','candidate list must select meaningful alternatives');
need(v26,'recordAReference','lower-record main recommendation must be compared with the best record-A route');
need(advisor,"'実績'+p.record+'だが、'+lead+'で実績'+b.record+'候補を逆転'","lower-record main card must explain its compensated reversal");
need(v26,'距離下限（1000/1200m側）','sale UI must disclose lower-distance evidence');
need(v26,'本命配合を表示','hidden compatibility button must no longer say この条件で設計');
if(v26.includes('もう一度「この条件で設計」を実行してください'))throw Error('stale design instruction must be removed');
need(v26,'参考軸を見る（SP上限・クロス・ST・バランス・血統価値）','secondary axes must stay collapsed');
need(v26,"const tone=isMain","non-main axes must not own recommendation colors");
need(v26,'function createMareProductionCollector(','sale production recommendations must be collected across the scanned generation');
need(v26,'詳しい血統根拠を見る','route bridge evidence must remain collapsed per generation');
need(v26,'route-stage-action-row','route registration CTA must live in its own action row');
need(v26,'sale-route-details route-stage-details','route evidence details must be structurally separated from CTA');
need(v26,'route-stage-action-row .route-register-btn{position:static!important;float:none!important;transform:none!important;width:auto;max-width:100%;min-height:44px','route CTA must not rely on overlapping positioning');
need(v26,'.route-stage-action-row .route-register-btn{width:100%;min-height:46px','route CTA must become full-width on narrow screens');
need(v26,'.sale-route-details.route-stage-details{clear:both;margin-top:16px;padding-top:12px','route details need protected vertical separation from CTA');
need(v26,'連携・最終父の操作','route bridge actions must be secondary');
need(v24,'<div id="rebuildBody" hidden aria-hidden="true"></div>','legacy four-mare research body must stay hidden');
need(v24,'<div hidden aria-hidden="true"><select id="rebuildGoal"','legacy four-mare starter controls must stay hidden');
need(v25,"card.hidden=true;card.setAttribute('aria-hidden','true')",'legacy manual nitro simulator must stay hidden');

need(breed,"advisor?.compareProductionForMare","breed production must use the same mare-aware comparator");
need(breed,'candidateDisplayFacts','breed cards must inherit the same display-priority facts used by sale cards');
need(breed,"breedCandidateBlock('加算'",'breed cards must inherit addition grouping');
need(breed,"breedCandidateBlock('減算'",'breed cards must inherit subtraction grouping');
need(breed,"breedCandidateBlock('注意'",'breed cards must inherit caution grouping');
need(breed,'function createFutureProductionCollector(','breed future production must remain full-scan');
need(breed,'function renderFutureOverview(result){}','separate six-axis future overview must stay removed');
need(breed,"profile=selectedCategory()","future result must focus on the selected category");
if(breed.includes("overview.className='card breed-future-overview'"))throw Error('six-category overview card must not return to primary UI');

for(const token of ['.sale-route.tone-main','.sale-route.tone-record','.sale-route.tone-speed','.sale-route.tone-nitro','.sale-route.tone-upside','.sale-route.tone-neutral'])need(css,token,'candidate role color');
need(css,'.sale-other-axes','secondary axes container');
for(const token of ['.candidate-chip.cross','.candidate-chip.theory','.candidate-chip.warning','.candidate-chip.record','.candidate-chip.trait','.candidate-chip.metric'])need(css,token,'shared candidate fact colors');
for(const token of ['.candidate-block.addition','.candidate-block.subtraction','.candidate-block.caution','.candidate-none'])need(css,token,'compact grouped candidate layout');

console.log(JSON.stringify({
  passed:true,
  contract:{
    mare:'record A is the strong baseline; B/C need explicit compensating bloodline evidence',
    generation:'auto recommendation starts selected, but all four comparison cards are tappable',
    candidates:'top plus differentiated alternatives with reason/tradeoff; role colors are explained',
    distance:'1000/1200m lower bound is SP-side evidence for middle/rebuild/SP-deficient mares',
    variance:'stable C and C/C remain available but are never promoted by variance alone',
    scoring:'six independent axes remain separate; no seventh overall score'
  }
},null,2));
