'use strict';
const fs=require('fs');

const src=fs.readFileSync('breed-integration.js','utf8');

const categories=[
  {key:'sp',short:'SP上限',full:'SP上限型'},
  {key:'speedCross',short:'SPクロス',full:'SPクロス補強型'},
  {key:'production',short:'強馬生産',full:'強馬生産型'},
  {key:'st',short:'ST・距離',full:'ST・距離適性型'},
  {key:'balance',short:'バランス',full:'バランス型'},
  {key:'sire',short:'血統価値',full:'自家製種牡馬・血統価値型'}
];

if(categories.length!==6)throw Error('six categories required');
for(const c of categories){
  if([...c.short].length>7)throw Error('summary category label too long '+c.short);
  if(!src.includes(c.full))throw Error('runtime category label missing '+c.full);
}

const requiredRuntime=[
  "const PROFILES=['sp','speedCross','production','st','balance','sire']",
  "overview.className='card breed-future-overview'",
  "(notice.closest('.card')||notice).insertAdjacentElement('afterend',overview)",
  "@media(max-width:520px)",
  ".breed-integration-tools{grid-template-columns:1fr}",
  ".breed-future-head,.breed-future-row{grid-template-columns:1fr 1.15fr}",
  ".breed-future-row b{grid-row:1 / span 2}",
  "data-breed-future",
  "class=\"breed-pair-details\"",
  "<b>現在配合の目的適合：</b>'+esc(fitLabel)",
  "class=\"breed-future-detail\"",
  "4代compact bridge",
  "4代は検証済みcompact bridgeによる条件付き探索"
];
for(const s of requiredRuntime)if(!src.includes(s))throw Error('mobile runtime contract missing '+s);

if(src.includes('4代全探索'))throw Error('runtime must not describe compact generation 4 as exhaustive');
const cardBlock=src.match(/function renderCard\([\s\S]*?\n\}\nfunction renderUnsafe/);
if(!cardBlock)throw Error('renderCard block missing');
if(/class="score"[^\n]*fitLabel/.test(cardBlock[0]))throw Error('candidate header repeats long goal-fit label');

const mobile={
  assumedViewportPx:390,
  wrapHorizontalPx:20,
  cardHorizontalPaddingPx:28,
  innerWidthPx:390-20-28,
  overviewLocation:'separate card immediately after breed control card',
  summaryLayout:'category spans two rows; future and goal-fit stack in second column',
  estimatedRows:12,
  collapsedCandidateFields:['順位・父名','現在配合値','選択カテゴリ将来性','目的適合'],
  expandOnly:['現在Pair根拠','全6カテゴリ診断','2〜4代ルート','トレードオフ詳細']
};
if(mobile.innerWidthPx<330)throw Error('unexpected mobile inner width');
if(mobile.collapsedCandidateFields.length>4)throw Error('collapsed candidate too dense');
if(mobile.expandOnly.length>4)throw Error('expand-only grouping drift');

console.log(JSON.stringify({
  passed:true,
  method:'runtime-linked breed future mobile density contract',
  categories,
  mobile,
  generation3:'exact fixed-first',
  generation4:'conditional compact bridge'
},null,2));
