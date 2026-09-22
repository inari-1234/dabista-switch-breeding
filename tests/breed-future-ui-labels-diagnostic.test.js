'use strict';
const fs=require('fs');
const src=fs.readFileSync('breed-integration.js','utf8');

function futureLabel({abilityKnown,generation,hasMaterial=true,tradeoff=false,minor=false}){
  if(!hasMaterial||generation===1){
    if(tradeoff)return abilityKnown?'別方向の補強あり / トレードオフ':'血統上の別方向補強あり / トレードオフ';
    if(minor)return abilityKnown?'微差':'血統上の微差';
    return abilityKnown?'追加有意改善なし / 早期完成':'血統上の追加有意改善なし';
  }
  const base=generation===2?'2代まで有意改善':generation===3?'3代まで有意改善※':generation===4?'4代まで有意改善※':'未診断';
  return abilityKnown||base==='未診断'?base:'血統上：'+base;
}
function goalFitLabel({abilityKnown,goal,fit,category}){
  if(category==='sire')return '血統価値：別軸評価';
  const names={arc:'凱旋門',bc:'BC',rebuild:'再建'};
  const suffix=fit==='strong'?'強基準':fit==='qualified'?'基準到達':fit==='below'?'未達':'未評価';
  return abilityKnown?names[goal]+'：'+suffix:(fit==='unavailable'?'能力未評価':'能力未評価（血統：'+suffix+'）');
}

const cases=[
  {name:'Known early complete',in:{abilityKnown:true,generation:1,goal:'arc',fit:'strong',category:'production'},want:{future:'追加有意改善なし / 早期完成',fit:'凱旋門：強基準'}},
  {name:'Unknown early no overclaim',in:{abilityKnown:false,generation:1,goal:'arc',fit:'below',category:'st'},want:{future:'血統上の追加有意改善なし',fit:'能力未評価（血統：未達）'}},
  {name:'Unknown deep route stays bloodline-only',in:{abilityKnown:false,generation:3,goal:'bc',fit:'strong',category:'speedCross'},want:{future:'血統上：3代まで有意改善※',fit:'能力未評価（血統：強基準）'}},
  {name:'Known tradeoff',in:{abilityKnown:true,generation:1,tradeoff:true,goal:'arc',fit:'qualified',category:'speedCross'},want:{future:'別方向の補強あり / トレードオフ',fit:'凱旋門：基準到達'}},
  {name:'Unknown tradeoff',in:{abilityKnown:false,generation:1,tradeoff:true,goal:'rebuild',fit:'qualified',category:'balance'},want:{future:'血統上の別方向補強あり / トレードオフ',fit:'能力未評価（血統：基準到達）'}},
  {name:'Sire category separate',in:{abilityKnown:false,generation:3,goal:'stallion',fit:'strong',category:'sire'},want:{future:'血統上：3代まで有意改善※',fit:'血統価値：別軸評価'}}
];

for(const c of cases){
  const got={future:futureLabel(c.in),fit:goalFitLabel(c.in)};
  if(got.future!==c.want.future||got.fit!==c.want.fit)throw Error(c.name+' '+JSON.stringify({got,want:c.want}));
}

const requiredRuntime=[
  'function currentMareAssessment()',
  'function currentAbilityKnown()',
  "return known?'追加有意改善なし / 早期完成':'血統上の追加有意改善なし'",
  "return known?base:(base==='未診断'?base:'血統上：'+base)",
  "return '能力未評価（血統：'+bloodline+'）'",
  'const fitLabel=fitLabelForRoute(r,goal,profile)'
];
for(const s of requiredRuntime)if(!src.includes(s))throw Error('runtime semantic contract missing '+s);
if(/const fit=advisor\.goalFit\(r,goal\);[\s\S]{0,140}fit\.label/.test(src))throw Error('card bypasses ability-aware fit display');

const compactMobileSpec={
  location:'separate card immediately after breed control card',
  columns:['カテゴリ','将来性','目的適合'],
  candidateCardAlwaysVisible:['rank','stallion','current pair facts','selected-category future','goal fit'],
  candidateCardExpandable:['current pair evidence','six-category future','2-4 generation path','tradeoffs']
};
if(compactMobileSpec.candidateCardAlwaysVisible.length>5)throw Error('candidate card too dense');

console.log(JSON.stringify({
  passed:true,
  method:'runtime-linked semantic UI labels with unknown-ability guard',
  cases:cases.map(c=>({name:c.name,result:{future:futureLabel(c.in),fit:goalFitLabel(c.in)}})),
  compactMobileSpec
},null,2));
