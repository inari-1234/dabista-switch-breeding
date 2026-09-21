'use strict';

const categories=[
  {key:'production',short:'強馬生産',full:'強馬生産型'},
  {key:'sp',short:'SP上限',full:'SP上限型'},
  {key:'speedCross',short:'SPクロス',full:'SPクロス補強型'},
  {key:'st',short:'ST・距離',full:'ST・距離適性型'},
  {key:'balance',short:'バランス',full:'バランス型'},
  {key:'sire',short:'血統価値',full:'自家製種牡馬・血統価値型'}
];
const futures=[
 '直仔で完成度高',
 '2代まで有意改善',
 '3代まで有意改善・条件付き',
 '4代まで有意改善・条件付き',
 '血統上の追加有意改善なし'
];
const fits=['凱旋門：強基準','凱旋門：基準到達','凱旋門：未達','BC：強基準','BC：基準到達','BC：未達','血統価値：別軸評価'];

for(const c of categories){
  if([...c.short].length>7)throw Error('summary category label too long '+c.short);
}
for(const f of futures){
  if([...f].length>15)throw Error('future label too long '+f);
}
for(const f of fits){
  if([...f].length>12)throw Error('fit label too long '+f);
}

const mobile={
  assumedViewportPx:390,
  wrapHorizontalPx:20,
  cardHorizontalPaddingPx:28,
  innerWidthPx:390-20-28,
  summaryLayout:'one row per category: short label + future badge + fit badge',
  estimatedRows:6,
  collapsedCandidateFields:['順位・父名','現在配合値','選択カテゴリ将来性','目的適合'],
  expandOnly:['全6カテゴリ','2〜4代ルート','配合理論根拠','クロス根拠','トレードオフ詳細']
};

if(mobile.innerWidthPx<330)throw Error('unexpected mobile inner width');
if(mobile.collapsedCandidateFields.length>4)throw Error('collapsed candidate too dense');

console.log(JSON.stringify({passed:true,categories,futures,fits,mobile},null,2));
