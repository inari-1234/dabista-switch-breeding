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
const q1=advisor.profileTransition('sp',springLike1,springLike3);
if(q1.kind!=='material')throw Error('SP profile should recognize ceiling improvement');
if(advisor.goalFit(springLike3,'arc').key!=='below'||advisor.goalFit(springLike3,'bc').key!=='below'||advisor.goalFit(springLike3,'rebuild').key!=='below')throw Error('deep SP route must remain goal-below when ST is insufficient');

const production1=fake({sp:15,st:6,record:'B'});
const production4=fake({sp:17,st:8,record:'B',material:true});
const q2=advisor.profileTransition('production',production1,production4);
if(q2.kind!=='material')throw Error('production profile should recognize SP17/ST5 plus material support');
if(advisor.goalFit(production4,'arc').key!=='strong'||advisor.goalFit(production4,'bc').key!=='qualified'||advisor.goalFit(production4,'rebuild').key!=='qualified')throw Error('production goal-fit boundary regression');

const tradeA=fake({sp:18,st:6,speed:true});
const tradeB=fake({sp:16,st:6,speed:true,material:true});
const qt=advisor.profileTransition('speedCross',tradeA,tradeB);
if(qt.kind!=='tradeoff')throw Error('added material SP stage with worse profile route must be tradeoff, not material');

const stA=fake({sp:16,st:9,maxD:1600});
const stB=fake({sp:15,st:11,maxD:2600});
if(advisor.profileTransition('st',stA,stB).kind!=='material')throw Error('ST profile meaningful improvement regression');

if(advisor.goalFit(production4,'stallion').key!=='separate')throw Error('stallion fit must remain separate');

// The API contract to move into sale-recommendation-core.

// Formal future-state contract: depth is derived from material transitions only.
const fstate=advisor.profileFutureStatus({
  profile:'sp',
  routes:{1:springLike1,2:springLike1,3:springLike3,4:springLike3}
});
if(fstate.generation!==3||fstate.state!=='improves-to-3-conditional')throw Error('profileFutureStatus depth regression '+JSON.stringify(fstate));
if(fstate.transitions[0].kind!=='none'||fstate.transitions[1].kind!=='material'||fstate.transitions[2].kind!=='none')throw Error('profileFutureStatus transitions regression '+JSON.stringify(fstate.transitions));

const p0={spst120:{safe:10,sp15st5:1,sp17st5:0,maxSp:15,maxSpSt:20},spst130:{sp15st5:0,sp17st5:0}};
const p2={spst120:{safe:10,sp15st5:5,sp17st5:0,maxSp:15,maxSpSt:20},spst130:{sp15st5:0,sp17st5:0}};
const sf=advisor.profileFutureStatus({profile:'sire',portfolios:{1:p0,2:p2,3:p2,4:p2}});
if(sf.generation!==2||sf.state!=='improves-to-2'||sf.transitions[0].kind!=='material')throw Error('sire future regression '+JSON.stringify(sf));

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

console.log(JSON.stringify({passed:true,synthetic:{sp:q1,production:q2,tradeoff:qt,st:advisor.profileTransition('st',stA,stB)},contract},null,2));
