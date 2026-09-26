'use strict';
const fs=require('fs');
const path=require('path');
const args=process.argv.slice(2);
const outArg=args.find(x=>x.startsWith('--output='));
const files=args.filter(x=>!x.startsWith('--')).sort();
if(!files.length)throw Error('usage: node merge-mare-purpose-multigen-shards.js shard1.json ... --output=...');
const shards=files.map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
const goals=['arc','bc','rebuild','stallion'];
const mares={};
for(const s of shards){
  for(const [name,row] of Object.entries(s.mares||{})){
    if(mares[name])throw Error('duplicate mare '+name);
    mares[name]=row;
  }
}
const names=Object.keys(mares);
if(names.length!==298)throw Error('expected 298 mares, got '+names.length);
function cmpVec(A=[],B=[]){
  for(let i=0;i<Math.max(A.length,B.length);i++){
    const a=Number(A[i]||0),b=Number(B[i]||0);
    if(a!==b)return b-a;
  }
  return 0;
}
for(const goal of goals){
  const rows=names.map(name=>({name,g:mares[name].goals[goal]}));
  rows.sort((a,b)=>cmpVec(a.g.sortVector,b.g.sortVector)||a.name.localeCompare(b.name,'ja'));
  for(let i=0;i<rows.length;i++){
    rows[i].g.rank=i+1;rows[i].g.total=rows.length;
    delete rows[i].g.sortVector;
  }
}
const runtimeFactKeys=['speedCross','materialSpeedCross','longDistanceCross','materialLongCross','magnificent','elaborate','record'];
for(const row of Object.values(mares)){
  delete row.diagnostic;
  for(const v of Object.values(row.goals||{})){
    const facts=v.facts||{};
    v.facts=Object.fromEntries(runtimeFactKeys.map(k=>[k,facts[k]]));
    delete v.sortVector;
  }
}
const elapsedSeconds=shards.reduce((n,s)=>Math.max(n,Number(s.elapsedSeconds||0)),0);
const payload={
  schema:1,
  generatedAt:new Date().toISOString(),
  method:'direct+exact-two+conditional-three+conditional-four;6-shard-parallel',
  knownAbilityCount:298,
  analyzedCount:298,
  elapsedSeconds,
  caveat:'3代・4代は条件付き探索。中間牝馬の能力は出生前に仮定しない。',
  mares
};
const json=JSON.stringify(payload)+'\n';
if(outArg)fs.writeFileSync(outArg.slice(9),json);
else process.stdout.write(json);
