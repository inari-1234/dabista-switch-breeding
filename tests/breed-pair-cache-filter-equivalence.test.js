'use strict';
const fs=require('fs');
const core=require('../breeding-core.js');

const T=JSON.parse(fs.readFileSync('data/theory-master.json','utf8'));
const E=JSON.parse(fs.readFileSync('data/nitro-effects.json','utf8')).effects;
const K=JSON.parse(fs.readFileSync('data/kotta-pairs.json','utf8')).pairs;
const D=JSON.parse(fs.readFileSync('data/elaborate-direct-exceptions.json','utf8')).pairs;
const IV=JSON.parse(fs.readFileSync('data/planner-inheritance-validation.json','utf8'));
const kd=(IV.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare}));
const engine=core.create({effects:E,elaboratePairs:K,directElaboratePairs:D,elaborateKnownDifferences:kd});

const mareNames=['エイスト','スプリングスイーツ','フィットレオタード','ミニミニデート','ワカヒルメ'];
const byName=new Map(T.stallions.map(x=>[x.name,x]));
const eist=T.broodmares.find(x=>x.name==='エイスト');
const gp=byName.get('グランプリボス');
const derived=engine.deriveChild(gp,eist,'自家製テスト牝馬');
if(!derived||derived.ancestor?.length!==15)throw Error('derived fixture failed');

const mares=mareNames.map(n=>T.broodmares.find(x=>x.name===n)).concat([derived]);
const filters={
 theory:{
  all:p=>true,
  any:p=>!!(p.theory?.interesting||p.theory?.magnificent),
  interesting:p=>!!p.theory?.interesting,
  magnificent:p=>!!p.theory?.magnificent,
  perfect:p=>!!p.theory?.perfect
 },
 extra:{
  all:p=>true,
  elaborate:p=>!!p.elaborate?.effective,
  cross:p=>(p.danger?.rawCrosses||[]).length>0,
  safe:p=>!p.danger?.kiken&&!p.danger?.tyokiken
 },
 nitro:{
  all:p=>true,
  sp15:p=>+p.nitro?.sp>=15,
  sp18:p=>+p.nitro?.sp>=18,
  st5:p=>+p.nitro?.st>=5,
  bal:p=>+p.nitro?.sp>=15&&+p.nitro?.st>=5
 }
};

let checked=0,mismatch=0;
const summaries=[];
for(const mare of mares){
 const cache=T.stallions.map(s=>({sire:s,pair:engine.evaluate(s,mare)}));
 const summary={mare:mare.name,kind:mare.kind||'switch-master',counts:{theory:{},extra:{},nitro:{}}};
 for(const [group,rules] of Object.entries(filters)){
  for(const [name,fn] of Object.entries(rules)){
   const cacheNames=cache.filter(x=>fn(x.pair)).map(x=>x.sire.name);
   const legacyNames=[];
   for(const s of T.stallions){
    const p=engine.evaluate(s,mare);
    let ok=false;
    if(group==='theory'){
      const t=p.theory||{};
      ok=name==='all'||(name==='any'&&(t.interesting||t.magnificent))||(name==='interesting'&&t.interesting)||(name==='magnificent'&&t.magnificent)||(name==='perfect'&&t.perfect);
    }else if(group==='extra'){
      const d=p.danger||{},e=p.elaborate||{},xs=d.rawCrosses||[];
      ok=name==='all'||(name==='elaborate'&&e.effective)||(name==='cross'&&xs.length>0)||(name==='safe'&&!d.kiken&&!d.tyokiken);
    }else{
      const n=engine.calcNitro(s.ancestor,mare.ancestor);
      ok=name==='all'||(name==='sp15'&&n.sp>=15)||(name==='sp18'&&n.sp>=18)||(name==='st5'&&n.st>=5)||(name==='bal'&&n.sp>=15&&n.st>=5);
    }
    if(ok)legacyNames.push(s.name);
   }
   checked++;
   if(JSON.stringify(cacheNames)!==JSON.stringify(legacyNames))mismatch++;
   summary.counts[group][name]=cacheNames.length;
  }
 }
 summaries.push(summary);
}
if(mismatch)throw Error('filter mismatch '+mismatch);
console.log(JSON.stringify({
 passed:true,
 method:'single evaluatePair cache vs legacy repeated per-filter calculations',
 mares:mares.length,
 stallions:176,
 filterComparisons:checked,
 mismatch,
 summaries,
 conclusion:'Pair cache can preserve current theory/extra/nitro filter semantics, including a derived homebred mare.'
},null,2));
