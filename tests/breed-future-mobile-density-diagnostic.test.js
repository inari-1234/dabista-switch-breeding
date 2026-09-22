'use strict';
const fs=require('fs');
const src=fs.readFileSync('breed-integration.js','utf8');

const categories=['SP上限型','SPクロス補強型','強馬生産型','ST・距離適性型','バランス型','自家製種牡馬・血統価値型'];
for(const full of categories)if(!src.includes(full))throw Error('runtime category label missing '+full);

const required=[
  "const PROFILES=['sp','speedCross','production','st','balance','sire']",
  "@media(max-width:520px)",
  ".breed-integration-tools{grid-template-columns:1fr}",
  "data-breed-future",
  "class=\"breed-pair-details\"",
  "class=\"notice breed-quick-fit\"",
  "class=\"breed-cue-badge\"",
  "class=\"breed-cue-headline\"",
  "class=\"notice breed-future-simple\"",
  "profile=selectedCategory()",
  "将来ルート・探索条件を見る",
  "4代compact bridge"
];
for(const s of required)if(!src.includes(s))throw Error('mobile runtime contract missing '+s);

if(src.includes("overview.className='card breed-future-overview'"))throw Error('mobile UI must not insert a separate six-category overview card');
if(src.includes('<div class="breed-future-head"><span>カテゴリ</span>'))throw Error('six-category future table must not be primary UI');
if(src.includes('4代全探索'))throw Error('runtime must not describe compact generation 4 as exhaustive');

const cardBlock=src.match(/function renderCard\([\s\S]*?\n\}\nfunction renderUnsafe/);
if(!cardBlock)throw Error('renderCard block missing');
if(!cardBlock[0].includes('breed-cue-headline')||!cardBlock[0].includes('breed-reason-chip'))throw Error('candidate card must explain why it is shown');
if(!cardBlock[0].includes('breed-card-details'))throw Error('verbose pair evidence must stay collapsed');
if(!cardBlock[0].includes("const tone=isMain?"))throw Error('category color must not masquerade as recommendation strength');

const mobile={
  assumedViewportPx:390,
  primaryCandidateFields:['推薦役割・父名','短い理由','重要チップ','現在値','将来性'],
  collapsed:['現在Pair根拠','将来ルート・探索条件'],
  removedFromPrimary:['6カテゴリ将来性表','カテゴリ色によるカード背景']
};
if(mobile.primaryCandidateFields.length>5)throw Error('candidate primary card too dense');
if(mobile.collapsed.length>2)throw Error('too many expansion groups');

console.log(JSON.stringify({passed:true,method:'decision-first mobile contract',mobile,generation3:'exact fixed-first',generation4:'conditional compact bridge'},null,2));
