'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');
const sale=require('../sale-planner-core.js');

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
const safe=p=>!!p&&!p.danger?.kiken&&!p.danger?.tyokiken;

const cases=[
 ['エイスト','グランプリボス'],
 ['スプリングスイーツ','ステイゴールド'],
 ['フィットレオタード','ワイルドラッシュ'],
 ['ミニミニデート','ステイゴールド'],
 ['ワカヒルメ','ステイゴールド'],
 ['アマリン','ステイゴールド']
];

const rows=[];
for(const [mareName,firstName] of cases){
 const mare=planner.mare(mareName),first=planner.sire(firstName);
 if(!mare||!first)throw Error('fixture missing '+mareName+' / '+firstName);

 const expected1=engine.evaluate(first,mare);
 const got1=planner.evaluateDirectPair(mareName,firstName);
 if(JSON.stringify(got1.pair)!==JSON.stringify(expected1))throw Error('direct pair mismatch '+mareName+' / '+firstName);
 if(got1.safe!==safe(expected1))throw Error('direct safe mismatch '+mareName+' / '+firstName);
 if(got1.safe&&!got1.route)throw Error('safe direct route missing '+mareName+' / '+firstName);
 if(!got1.safe&&got1.route)throw Error('dangerous direct route leaked '+mareName+' / '+firstName);
 if(!got1.route){rows.push({mare:mareName,first:firstName,directSafe:false,twoSafe:0});continue}

 if(JSON.stringify(got1.route.finalChild)!==JSON.stringify(expected1.child))throw Error('direct child mismatch '+mareName);
 if(JSON.stringify([got1.route.final.sp,got1.route.final.st,got1.route.final.pw])!==JSON.stringify([expected1.nitro.sp,expected1.nitro.st,expected1.nitro.pw]))throw Error('direct nitro mismatch '+mareName);

 const actual=[...planner.iterateTwoFromDirect(got1.route)];
 const expected=[];
 for(const s2 of T.stallions){
   const p2=engine.evaluate(s2,expected1.child);
   if(!safe(p2)||!p2.child)continue;
   expected.push({sire:s2.name,pair:p2});
 }
 if(actual.length!==expected.length)throw Error('two count mismatch '+mareName+' '+actual.length+' vs '+expected.length);

 for(let i=0;i<expected.length;i++){
   const a=actual[i],e=expected[i];
   if(a.sires.length!==2||a.sires[0]!==firstName||a.sires[1]!==e.sire)throw Error('two sire/order mismatch '+mareName+' #'+i);
   if(a.method!=='exact-two-generation'||a.generation!==2)throw Error('two method mismatch '+mareName+' '+e.sire);
   if(JSON.stringify(a.finalChild)!==JSON.stringify(e.pair.child))throw Error('two child mismatch '+mareName+' '+e.sire);
   if(JSON.stringify([a.final.sp,a.final.st,a.final.pw])!==JSON.stringify([e.pair.nitro.sp,e.pair.nitro.st,e.pair.nitro.pw]))throw Error('two nitro mismatch '+mareName+' '+e.sire);
   const expanded=planner.expandRoute(mareName,a,'arc');
   if(!expanded||expanded.stages.length!==2)throw Error('expand missing '+mareName+' '+e.sire);
   if(JSON.stringify(expanded.stages[0].nitro)!==JSON.stringify(expected1.nitro)||JSON.stringify(expanded.stages[1].nitro)!==JSON.stringify(e.pair.nitro))throw Error('expand pair mismatch '+mareName+' '+e.sire);
 }
 rows.push({mare:mareName,first:firstName,directSafe:true,twoSafe:actual.length});
}

const badM=planner.evaluateDirectPair('存在しない牝馬','ステイゴールド');
const badS=planner.evaluateDirectPair('エイスト','存在しない種牡馬');
if(badM.safe||badM.route||badM.pair||badS.safe||badS.route||badS.pair)throw Error('invalid input contract regression');
if([...planner.iterateTwoFromDirect(null)].length!==0)throw Error('null direct route should yield none');

// Evaluation-count contract: one first-pair evaluation + exactly 176 second-sire evaluations.
let calls=0;
const counted={...engine,evaluate:(s,m)=>{calls++;return engine.evaluate(s,m)}};
const cp=sale.create({engine:counted,stallions:T.stallions,stallionStats:S,broodmares:T.broodmares,broodmareStats:M});
const dx=cp.evaluateDirectPair('エイスト','グランプリボス');
if(!dx.route)throw Error('count fixture direct route missing');
const countRoutes=[...cp.iterateTwoFromDirect(dx.route)];
if(calls!==177)throw Error('fixed-first evaluate calls '+calls+' expected 177');
if(!countRoutes.length)throw Error('count fixture two routes missing');

console.log(JSON.stringify({
 passed:true,
 cases:rows,
 fixedFirstEvaluationCalls:calls,
 expectedCalls:177,
 conclusion:'Direct-pair and fixed-first two-generation APIs match independent common-engine evaluation without scanning all first sires.'
},null,2));
