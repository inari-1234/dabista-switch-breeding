'use strict';
const fs=require('fs');
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
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});
const planner=sale.create({engine,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const advisor=reco.create({planner,broodmareStats:M});

function profileUpgradeReasons(profile,prev,next){
  if(!prev||!next)return next?['次世代候補が成立']:[];
  const A=advisor.routeFacts(prev),B=advisor.routeFacts(next),r=[];
  if(profile==='sp'){
    if(B.sp>=A.sp+2)r.push('SPを明確に上積み');
    else if(B.sp>A.sp&&B.st>=A.st-1)r.push('STをほぼ維持してSPを上積み');
    if(!A.magnificent&&B.magnificent&&B.speedCross&&B.sp>=A.sp-1)r.push('見事×SPクロスを追加');
  }else if(profile==='speedCross'){
    if(!A.speedCross&&B.speedCross&&B.sp>=A.sp-1)r.push('最終SPクロスを追加');
    if(B.sp>=A.sp+2)r.push('SPを明確に上積み');
    if(B.materialSpeedCrossStages>A.materialSpeedCrossStages)r.push('中間SP補強工程を追加');
    if(B.speedCrossCount>A.speedCrossCount)r.push('最終SPクロス本数を増加');
  }else if(profile==='production'){
    const a15=A.sp>=15&&A.st>=5,b15=B.sp>=15&&B.st>=5,a17=A.sp>=17&&A.st>=5,b17=B.sp>=17&&B.st>=5;
    if(!a15&&b15)r.push('SP15/ST5へ到達');
    if(!a17&&b17)r.push('SP17/ST5へ到達');
    if(B.recordGrade>A.recordGrade&&B.sp>=A.sp-1&&B.st>=A.st-1)r.push('父実績を改善しSP/STを維持');
    if(!A.materialSpeedCross&&B.materialSpeedCross)r.push('中間SP補強経路を追加');
    if(B.sp>=A.sp+2&&B.st>=A.st-1)r.push('STを維持してSPを上積み');
  }else if(profile==='st'){
    if(B.st>=A.st+2&&B.sp>=A.sp-1)r.push('SPを維持してSTを上積み');
    if(!A.longDistanceCross&&B.longDistanceCross&&B.sp>=A.sp-1)r.push('最終長距離クロスを追加');
    if(!A.materialLongCross&&B.materialLongCross&&B.sp>=A.sp-1)r.push('中間ST補強経路を追加');
    if(!A.distance2400&&B.distance2400&&B.sp>=A.sp-1)r.push('2400m根拠を追加');
  }else if(profile==='balance'){
    const a15=A.sp>=15&&A.st>=5,b15=B.sp>=15&&B.st>=5;
    if(!a15&&b15)r.push('SP15/ST5へ到達');
    if(B.spst>=A.spst+3&&B.sp>=A.sp-1&&B.st>=A.st-1)r.push('SP/ST双方を維持して合計を上積み');
  }
  return r;
}
function transition(profile,prev,next){
  if(!prev||!next)return{kind:next?'material':'none',reasons:next?['次世代候補が成立']:[]};
  const cmp=planner.compareProfile(profile)(next,prev),reasons=profileUpgradeReasons(profile,prev,next);
  if(cmp<0&&reasons.length)return{kind:'material',reasons};
  if(cmp<0)return{kind:'minor',reasons:[]};
  if(reasons.length)return{kind:'tradeoff',reasons};
  return{kind:'none',reasons:[]};
}
function goalFit(route,goal){
  const f=advisor.routeFacts(route),speedPath=!!(f.speedCross||f.materialSpeedCross);
  if(goal==='arc')return f.sp>=15&&f.st>=6?'strong':f.sp>=14&&f.st>=6?'qualified':'below';
  if(goal==='bc')return f.sp>=18&&f.st>=5&&speedPath?'strong':f.sp>=17&&f.st>=5&&speedPath?'qualified':'below';
  if(goal==='rebuild')return f.sp>=15&&f.st>=5?'qualified':'below';
  if(goal==='stallion')return'separate';
  return'unknown';
}

// Synthetic boundaries: profile improvement and goal fit must stay independent.
function fake({sp,st,pw=0,record='B',stable='B',speed=false,material=false,long=false,maxD=1600,magnificent=false}){
  return{
    sires:['X'],
    final:{
      sp,st,pw,
      speedCross:{has:speed,count:speed?1:0,effect:speed?1:0,short:0,speed:speed?1:0},
      crossEffects:{longDistance:long,anyAbility:speed||long,gutsSupport:false,powerSupport:false},
      theory:{interesting:false,magnificent,perfect:false},
      elaborate:false,
      sireStats:{record,stable,guts:'B',maxD,minD:1200,price:0}
    },
    materialSpeedCross:{has:material,stages:material?1:0,count:material?1:0},
    materialLongCross:{has:false,stages:0,names:[]}
  };
}
const springLike1=fake({sp:18,st:4});
const springLike3=fake({sp:20,st:3,speed:true,material:true});
const q1=transition('sp',springLike1,springLike3);
if(q1.kind!=='material')throw Error('SP profile should recognize ceiling improvement');
if(goalFit(springLike3,'arc')!=='below'||goalFit(springLike3,'bc')!=='below'||goalFit(springLike3,'rebuild')!=='below')throw Error('deep SP route must remain goal-below when ST is insufficient');

const production1=fake({sp:15,st:6,record:'B'});
const production4=fake({sp:17,st:8,record:'B',material:true});
const q2=transition('production',production1,production4);
if(q2.kind!=='material')throw Error('production profile should recognize SP17/ST5 plus material support');
if(goalFit(production4,'arc')!=='strong'||goalFit(production4,'bc')!=='qualified'||goalFit(production4,'rebuild')!=='qualified')throw Error('production goal-fit boundary regression');

const tradeA=fake({sp:18,st:6,speed:true});
const tradeB=fake({sp:16,st:6,speed:true,material:true});
const qt=transition('speedCross',tradeA,tradeB);
if(qt.kind!=='tradeoff')throw Error('added material SP stage with worse profile route must be tradeoff, not material');

const stA=fake({sp:16,st:9,maxD:1600});
const stB=fake({sp:15,st:11,maxD:2600});
if(transition('st',stA,stB).kind!=='material')throw Error('ST profile meaningful improvement regression');

if(goalFit(production4,'stallion')!=='separate')throw Error('stallion fit must remain separate');

// The API contract to move into sale-recommendation-core.
const contract={
  profileUpgradeReasons:{
    input:['profile','previous route','next route'],
    profiles:['sp','speedCross','production','st','balance'],
    uses:['routeFacts','planner.compareProfile'],
    mustNotUse:['selected user goal','mare ability rank as an automatic promotion','probabilities']
  },
  profileTransition:{
    states:['material','minor','tradeoff','none'],
    rule:'material requires both profile comparator improvement and a meaningful profile-specific reason'
  },
  goalFit:{
    independent:true,
    arc:{strong:'SP>=15 && ST>=6',qualified:'SP>=14 && ST>=6'},
    bc:{strong:'SP>=18 && ST>=5 && SP-support path',qualified:'SP>=17 && ST>=5 && SP-support path'},
    rebuild:{qualified:'SP>=15 && ST>=5'},
    stallion:'separate portfolio axis'
  },
  uiRule:'generation depth and goal fit are displayed separately; a deeper profile route is never promoted solely because it is deeper'
};

console.log(JSON.stringify({passed:true,synthetic:{sp:q1,production:q2,tradeoff:qt,st:transition('st',stA,stB)},contract},null,2));
