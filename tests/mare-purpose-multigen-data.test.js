'use strict';
const fs=require('fs'),assert=require('assert');
const path='data/mare-purpose-multigen-ranking.json';
const raw=fs.readFileSync(path,'utf8'),x=JSON.parse(raw);
const goals=['arc','bc','rebuild','stallion'];

assert.strictEqual(x.schema,1);
assert.strictEqual(x.knownAbilityCount,298);
assert.strictEqual(x.analyzedCount,298);
assert.strictEqual(Object.keys(x.mares||{}).length,298);
assert.ok(Buffer.byteLength(raw,'utf8')<1200000,'runtime ranking data must stay compact enough for iPhone-first loading');

for(const goal of goals){
  const rows=Object.entries(x.mares).map(([name,row])=>({name,v:row.goals?.[goal]}));
  assert.strictEqual(rows.length,298,goal+' coverage');
  const ranks=rows.map(x=>x.v?.rank).sort((a,b)=>a-b);
  assert.deepStrictEqual(ranks,Array.from({length:298},(_,i)=>i+1),goal+' ranks must be unique 1..298');
  for(const {name,v} of rows){
    assert.ok(v,name+' '+goal+' missing');
    assert.ok([1,2,3,4].includes(v.generation),name+' '+goal+' generation');
    assert.strictEqual(v.sires.length,v.generation,name+' '+goal+' route length');
    assert.ok(['recommend','candidate','conditional','insufficient'].includes(v.grade?.key),name+' '+goal+' grade');
    if(v.generation>=3)assert.ok(String(v.method).startsWith('conditional'),name+' '+goal+' 3/4 generation must be conditional exploration');
  }
}
assert.strictEqual(x.mares['エイスト'].goals.arc.rank,1,'Eist must remain first in Arc AI use priority');
assert.strictEqual(x.mares['スプリングスイーツ'].goals.arc.rank,2,'Spring Sweets must remain second in Arc AI use priority');
assert.strictEqual(x.mares['エイスト'].goals.arc.grade.key,'conditional','rank and absolute grade must remain separate dimensions');
assert.strictEqual(x.mares['クイーンズスミレ'].goals.arc.generation,2,'Queens Sumire Arc simulation must exercise multigeneration route');
assert.strictEqual(x.mares['クイーンズスミレ'].goals.stallion.generation,3,'Queens Sumire stallion simulation must exercise conditional third generation');
assert.ok(Object.values(x.mares).some(r=>Object.values(r.goals).some(v=>v.generation===4)),'dataset must contain at least one fourth-generation recommendation');

const forbidden=['evidenceScore','weightedScore','overallScore','totalScore'];
const dump=raw;
for(const k of forbidden)assert.ok(!dump.includes('"'+k+'"'),'forbidden overall score in runtime data: '+k);

console.log(JSON.stringify({
  passed:true,sizeBytes:Buffer.byteLength(raw,'utf8'),
  arcTop10:Object.entries(x.mares).sort((a,b)=>a[1].goals.arc.rank-b[1].goals.arc.rank).slice(0,10).map(([name,row])=>({name,rank:row.goals.arc.rank,grade:row.goals.arc.grade.key,generation:row.goals.arc.generation})),
  queens:Object.fromEntries(goals.map(g=>[g,{rank:x.mares['クイーンズスミレ'].goals[g].rank,grade:x.mares['クイーンズスミレ'].goals[g].grade.key,generation:x.mares['クイーンズスミレ'].goals[g].generation}]))
},null,2));
