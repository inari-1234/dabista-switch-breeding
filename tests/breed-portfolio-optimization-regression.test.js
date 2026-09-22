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
const key=engine.key,mareMap=new Map(T.broodmares.map(x=>[key(x.name),x]));
const known=s=>!!s&&!((+s.sp||0)===0&&(+s.st||0)===0&&(+s.pw||0)===0);
const c120=M.filter(known).filter(x=>(+x.sp||0)+(+x.st||0)>=120).map(x=>mareMap.get(key(x.name))).filter(Boolean);
const c130=M.filter(known).filter(x=>(+x.sp||0)+(+x.st||0)>=130).map(x=>mareMap.get(key(x.name))).filter(Boolean);
if(c120.length!==54||c130.length!==22)throw Error('portfolio cohort count drift '+c120.length+'/'+c130.length);
if(c130.some(x=>!c120.includes(x)))throw Error('spst130 must remain a subset of spst120');
const safe=p=>!!p&&!p.danger?.kiken&&!p.danger?.tyokiken;
const empty=n=>({population:n,safe:0,sp15st5:0,sp17st5:0,interesting:0,magnificent:0,perfect:0,elaborate:0,maxSp:0,maxSt:0,maxSpSt:0});
function add(out,p){
  if(!safe(p))return;out.safe++;
  const sp=+p.nitro?.sp||0,st=+p.nitro?.st||0;
  if(sp>=15&&st>=5)out.sp15st5++;if(sp>=17&&st>=5)out.sp17st5++;
  if(p.theory?.interesting)out.interesting++;if(p.theory?.magnificent)out.magnificent++;if(p.theory?.perfect)out.perfect++;if(p.elaborate?.effective)out.elaborate++;
  out.maxSp=Math.max(out.maxSp,sp);out.maxSt=Math.max(out.maxSt,st);out.maxSpSt=Math.max(out.maxSpSt,sp+st);
}
function reference(child){
  const a=empty(c120.length),b=empty(c130.length);
  for(const m of c120)add(a,engine.evaluate(child,m));
  for(const m of c130)add(b,engine.evaluate(child,m));
  return{spst120:a,spst130:b};
}
const mare=planner.mare('エイスト'),direct=planner.evaluateDirectPair(mare,'グランプリボス');
const two=[...planner.iterateTwoFromDirect(direct.route)],bridge=planner.createFourthBridgeCollector();
for(const r of planner.iterateThirdPreview(mare,two))bridge.push(r);
const c4=planner.createCollector({topN:16,poolN:96});
for(const r of planner.iterateFourthPreview(mare,bridge.finish().bases))c4.push(r);
const routes=c4.finish().pool;
if(routes.length!==518)throw Error('g4 pool drift '+routes.length);
const originalEvaluate=engine.evaluate;
let evaluateCallsPerPortfolio=0;
engine.evaluate=(...args)=>{evaluateCallsPerPortfolio++;return originalEvaluate(...args)};
planner.withPortfolio(routes[0]);
engine.evaluate=originalEvaluate;
if(evaluateCallsPerPortfolio!==54)throw Error('combined portfolio must evaluate 54 unique mares, got '+evaluateCallsPerPortfolio);
for(const r of routes){
  const actual=planner.withPortfolio(r).portfolio,expected=reference(r.finalChild);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('portfolio mismatch '+r.id);
}
const val=(x,d=0)=>Number.isFinite(+x)?+x:d;
const vec=r=>{const a=r.portfolio?.spst120||{},b=r.portfolio?.spst130||{};return[val(a.safe),val(a.sp15st5),val(a.sp17st5),val(a.interesting),val(a.magnificent),val(a.perfect),val(a.elaborate),val(b.sp15st5),val(b.sp17st5),val(a.maxSp),val(a.maxSpSt)]};
const cmp=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(b[i]||0)-(a[i]||0);if(d)return d}return 0};
const dom=(A,B)=>{let better=false;for(let i=0;i<A.length;i++){if(A[i]<B[i])return false;if(A[i]>B[i])better=true}return better};
const enriched=routes.map(r=>({...r,portfolio:reference(r.finalChild)}));
const front=enriched.filter((r,i)=>!enriched.some((x,j)=>j!==i&&dom(vec(x),vec(r))));
front.sort((a,b)=>cmp([
 val(a.portfolio.spst120.sp17st5),val(a.portfolio.spst120.sp15st5),val(a.portfolio.spst120.safe),
 val(a.portfolio.spst130.sp17st5),val(a.portfolio.spst130.sp15st5),val(a.portfolio.spst120.maxSpSt),val(a.portfolio.spst120.maxSp)
],[
 val(b.portfolio.spst120.sp17st5),val(b.portfolio.spst120.sp15st5),val(b.portfolio.spst120.safe),
 val(b.portfolio.spst130.sp17st5),val(b.portfolio.spst130.sp15st5),val(b.portfolio.spst120.maxSpSt),val(b.portfolio.spst120.maxSp)
]));
const expected={population:enriched.length,paretoCount:front.length,routes:front.slice(0,5)};
const actual=planner.portfolioPareto(routes,5);
if(actual.population!==expected.population||actual.paretoCount!==expected.paretoCount)throw Error('pareto count drift');
if(JSON.stringify(actual.routes.map(x=>x.id))!==JSON.stringify(expected.routes.map(x=>x.id)))throw Error('pareto ordering drift');
console.log(JSON.stringify({passed:true,pool:routes.length,cohorts:{spst120:c120.length,spst130:c130.length},evaluateCallsPerPortfolio,paretoCount:actual.paretoCount,portfolioMatch:true,paretoMatch:true},null,2));
