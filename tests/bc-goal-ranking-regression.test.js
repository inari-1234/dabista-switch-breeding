'use strict';
const assert=require('assert');
const reco=require('../sale-recommendation-core.js');
const advisor=reco.create({planner:{},broodmareStats:[]});

function route({sp,st,pw=0,record='B',stable='B',finalSpeed=false,materialSpeed=0}){
 return{
  sires:['S1','S2','S3','S4'],
  materialSpeedCross:{has:materialSpeed>0,stages:materialSpeed},
  materialLongCross:{has:false,stages:0},
  final:{
   sp,st,pw,
   sireStats:{record,stable,maxD:1800,guts:'B'},
   speedCross:{has:finalSpeed,count:finalSpeed?1:0},
   crossEffects:{longDistance:false,anyAbility:finalSpeed},
   theory:{interesting:false,magnificent:false,perfect:false},
   elaborate:false
  }
 };
}
function winner(a,b){return advisor.betterGoalRoute(a,b,'bc')}

const unsupportedStrong=route({sp:19,st:7,record:'A'});
const supportedQualified=route({sp:17,st:5,record:'B',materialSpeed:1});
assert.strictEqual(winner(unsupportedStrong,supportedQualified),supportedQualified,
 'BC multi-generation route must retain an effective SP-support path before chasing a higher unsupported ceiling');

const tier3=route({sp:19,st:6,record:'C',materialSpeed:1});
const tier2=route({sp:18,st:8,record:'A',materialSpeed:1});
assert.strictEqual(winner(tier2,tier3),tier3,
 'Within SP-supported qualified BC routes, SP19/ST6 tier must outrank SP18/ST5-class routes before sire record');

const tier2a=route({sp:18,st:5,record:'C',materialSpeed:1});
const tier1=route({sp:17,st:9,record:'A',materialSpeed:1});
assert.strictEqual(winner(tier1,tier2a),tier2a,
 'SP18/ST5 tier must outrank SP17/ST5-class routes before sire record');

const sameTierA=route({sp:19,st:6,record:'A',materialSpeed:1});
const sameTierC=route({sp:20,st:6,record:'C',materialSpeed:1});
assert.strictEqual(winner(sameTierC,sameTierA),sameTierA,
 'Within the same BC quality tier, sire record A/B/C is graded before small SP differences');

const sameTierSameRecordHighSp=route({sp:20,st:6,record:'B',stable:'A',materialSpeed:1});
const sameTierSameRecordStableC=route({sp:19,st:7,record:'B',stable:'C',materialSpeed:1});
assert.strictEqual(winner(sameTierSameRecordStableC,sameTierSameRecordHighSp),sameTierSameRecordHighSp,
 'Stability context must not outrank SP/ST quality inside the same BC tier and sire-record grade');

console.log(JSON.stringify({passed:true,method:'bc-goal-ranking-regression'}));
