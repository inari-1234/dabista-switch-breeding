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
const key=engine.key, mareMap=new Map(T.broodmares.map(x=>[key(x.name),x]));
const abilityKnown=s=>!!s&&!((+s.sp||0)===0&&(+s.st||0)===0&&(+s.pw||0)===0);
const cohort120=M.filter(abilityKnown).filter(x=>(+x.sp||0)+(+x.st||0)>=120).map(x=>mareMap.get(key(x.name))).filter(Boolean);
const cohort130=M.filter(abilityKnown).filter(x=>(+x.sp||0)+(+x.st||0)>=130).map(x=>mareMap.get(key(x.name))).filter(Boolean);
const c130=new Set(cohort130);
const safe=p=>!!p&&!p.danger?.kiken&&!p.danger?.tyokiken;
function empty(population){return{population,safe:0,sp15st5:0,sp17st5:0,interesting:0,magnificent:0,perfect:0,elaborate:0,maxSp:0,maxSt:0,maxSpSt:0}}
function add(out,p){
 if(!safe(p))return;
 out.safe++;const sp=+p.nitro?.sp||0,st=+p.nitro?.st||0;
 if(sp>=15&&st>=5)out.sp15st5++;if(sp>=17&&st>=5)out.sp17st5++;
 if(p.theory?.interesting)out.interesting++;if(p.theory?.magnificent)out.magnificent++;if(p.theory?.perfect)out.perfect++;if(p.elaborate?.effective)out.elaborate++;
 out.maxSp=Math.max(out.maxSp,sp);out.maxSt=Math.max(out.maxSt,st);out.maxSpSt=Math.max(out.maxSpSt,sp+st);
}
function combined(child){
 const a=empty(cohort120.length),b=empty(cohort130.length);
 if(!child)return{spst120:a,spst130:b};
 for(const m of cohort120){const p=engine.evaluate(child,m);add(a,p);if(c130.has(m))add(b,p)}
 return{spst120:a,spst130:b};
}
const start=planner.mare('エイスト'),direct=planner.evaluateDirectPair(start,'グランプリボス');
const two=[...planner.iterateTwoFromDirect(direct.route)],bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(start,two))bridge.push(r);
const c4=planner.createCollector({topN:16,poolN:96});
for(const r of planner.iterateFourthPreview(start,bridge.finish().bases))c4.push(r);
const routes=c4.finish().pool;
if(routes.length!==518)throw Error('g4 pool drift '+routes.length);
for(const r of routes.slice(0,50)){
 const a=planner.withPortfolio(r).portfolio,b=combined(r.finalChild);
 if(JSON.stringify(a)!==JSON.stringify(b))throw Error('combined portfolio mismatch '+r.id);
}
const timed=fn=>{const t=process.hrtime.bigint(),v=fn();return{ms:Number(process.hrtime.bigint()-t)/1e6,v}};
const old=timed(()=>routes.map(r=>planner.withPortfolio(r).portfolio));
const fast=timed(()=>routes.map(r=>combined(r.finalChild)));
if(JSON.stringify(old.v)!==JSON.stringify(fast.v))throw Error('all portfolio mismatch');
const val=(x,d=0)=>Number.isFinite(+x)?+x:d;
const vector=p=>{const a=p.spst120||{},b=p.spst130||{};return[val(a.safe),val(a.sp15st5),val(a.sp17st5),val(a.interesting),val(a.magnificent),val(a.perfect),val(a.elaborate),val(b.sp15st5),val(b.sp17st5),val(a.maxSp),val(a.maxSpSt)]};
const enriched=routes.map((r,i)=>({i,route:r,portfolio:old.v[i]}));
function dominatesSlow(a,b){const A=vector(a.portfolio),B=vector(b.portfolio);let better=false;for(let i=0;i<A.length;i++){if(A[i]<B[i])return false;if(A[i]>B[i])better=true}return better}
function dominatesVec(A,B){let better=false;for(let i=0;i<A.length;i++){if(A[i]<B[i])return false;if(A[i]>B[i])better=true}return better}
const slowPareto=timed(()=>enriched.filter((r,i)=>!enriched.some((x,j)=>j!==i&&dominatesSlow(x,r))));
const rows=enriched.map(x=>({...x,vec:vector(x.portfolio)}));
const fastPareto=timed(()=>rows.filter((r,i)=>!rows.some((x,j)=>j!==i&&dominatesVec(x.vec,r.vec))));
if(JSON.stringify(slowPareto.v.map(x=>x.i))!==JSON.stringify(fastPareto.v.map(x=>x.i)))throw Error('pareto front mismatch');
console.log(JSON.stringify({
 passed:true,
 cohorts:{spst120:cohort120.length,spst130:cohort130.length,overlap:cohort130.filter(x=>cohort120.includes(x)).length},
 pool:routes.length,
 evaluateCallsPerRoute:{current:cohort120.length+cohort130.length,combined:cohort120.length,reductionPct:Math.round(cohort130.length/(cohort120.length+cohort130.length)*1000)/10},
 portfolioMs:{current:Math.round(old.ms*10)/10,combined:Math.round(fast.ms*10)/10,speedupPct:Math.round((1-fast.ms/old.ms)*1000)/10},
 paretoMs:{currentVectorRecompute:Math.round(slowPareto.ms*10)/10,cachedVector:Math.round(fastPareto.ms*10)/10,speedupPct:Math.round((1-fastPareto.ms/slowPareto.ms)*1000)/10},
 paretoCount:slowPareto.v.length,
 exactPortfolioMatch:true,exactParetoFrontMatch:true
},null,2));
