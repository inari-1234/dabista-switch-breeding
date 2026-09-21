'use strict';

function futureLabel({abilityKnown,generation,hasMaterial=true}){
  if(!hasMaterial)return abilityKnown?'追加有意改善なし':'血統上の追加有意改善なし';
  if(generation===1)return abilityKnown?'直仔で完成度高':'血統上の追加有意改善なし';
  if(generation===2)return '2代まで有意改善';
  if(generation===3)return '3代まで有意改善・条件付き';
  if(generation===4)return '4代まで有意改善・条件付き';
  return '未評価';
}
function goalFitLabel(goal,fit){
  const names={arc:'凱旋門',bc:'BC',rebuild:'再建'};
  if(goal==='sire')return null;
  if(fit==='strong')return names[goal]+'：強基準';
  if(fit==='qualified')return names[goal]+'：基準到達';
  if(fit==='below')return names[goal]+'：未達';
  return names[goal]+'：未評価';
}
function tone({abilityKnown,generation,fit,tradeoff=false,category}){
  if(tradeoff)return 'warn';
  if(category==='sire')return generation>=3?'info-deep':generation===2?'info':'neutral';
  if(fit==='strong')return generation>=3?'good-deep':'good';
  if(fit==='qualified')return generation>=3?'info-deep':'info';
  if(fit==='below')return 'muted';
  if(!abilityKnown)return 'unknown';
  return 'neutral';
}
function compactRow(x){
  return{
    category:x.category,
    future:futureLabel(x),
    fit:x.category==='sire'?'血統価値：別軸評価':goalFitLabel(x.goal,x.fit),
    tone:tone(x)
  };
}

const cases=[
  {
    name:'Spring SP deep but Arc miss',
    in:{abilityKnown:true,generation:3,hasMaterial:true,fit:'below',goal:'arc',category:'sp'},
    want:{future:'3代まで有意改善・条件付き',fit:'凱旋門：未達',tone:'muted'}
  },
  {
    name:'Wakahirume production deep Arc strong',
    in:{abilityKnown:true,generation:4,hasMaterial:true,fit:'strong',goal:'arc',category:'production'},
    want:{future:'4代まで有意改善・条件付き',fit:'凱旋門：強基準',tone:'good-deep'}
  },
  {
    name:'Known early complete',
    in:{abilityKnown:true,generation:1,hasMaterial:true,fit:'strong',goal:'arc',category:'production'},
    want:{future:'直仔で完成度高',fit:'凱旋門：強基準',tone:'good'}
  },
  {
    name:'Unknown early no overclaim',
    in:{abilityKnown:false,generation:1,hasMaterial:true,fit:'below',goal:'arc',category:'st'},
    want:{future:'血統上の追加有意改善なし',fit:'凱旋門：未達',tone:'muted'}
  },
  {
    name:'Tradeoff never green',
    in:{abilityKnown:true,generation:4,hasMaterial:true,fit:'strong',goal:'arc',category:'speedCross',tradeoff:true},
    want:{future:'4代まで有意改善・条件付き',fit:'凱旋門：強基準',tone:'warn'}
  },
  {
    name:'Sire category stays separate',
    in:{abilityKnown:true,generation:3,hasMaterial:true,goal:'sire',fit:'n/a',category:'sire'},
    want:{future:'3代まで有意改善・条件付き',fit:'血統価値：別軸評価',tone:'info-deep'}
  }
];

for(const c of cases){
  const got=compactRow(c.in);
  for(const k of Object.keys(c.want)){
    if(got[k]!==c.want[k])throw Error(c.name+' '+k+' '+JSON.stringify({got:got[k],want:c.want[k]}));
  }
}

const compactMobileSpec={
  location:'breed control card, below breedNotice',
  rows:6,
  columns:['カテゴリ','将来性','目的適合'],
  alwaysVisible:['category','future','fit'],
  hiddenUntilExpand:['route','all six category details per stallion','theory evidence detail','cross evidence detail'],
  candidateCardAlwaysVisible:['rank','stallion','current pair facts','selected-category future','goal fit'],
  candidateCardExpandable:['six-category future','2-4 generation path','reason/evidence','tradeoffs']
};

if(compactMobileSpec.rows!==6)throw Error('six categories required');
if(compactMobileSpec.candidateCardAlwaysVisible.length>5)throw Error('candidate card too dense');

console.log(JSON.stringify({
  passed:true,
  method:'semantic UI labels plus mobile information-density contract',
  cases:cases.map(c=>({name:c.name,result:compactRow(c.in)})),
  compactMobileSpec
},null,2));
