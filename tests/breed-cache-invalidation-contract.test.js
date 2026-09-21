'use strict';

function norm(x){return String(x??'').normalize('NFKC').trim();}
function mareBloodlineFingerprint(m){
  if(!m)return 'none';
  return JSON.stringify({
    name:norm(m.name),
    ancestor:(m.ancestor||m.ancestor15||[]).map(norm),
    omoshiro:norm(m.omoshiro),
    migoto:norm(m.migoto)
  });
}
function pairIndexKey(m){return 'pair|'+mareBloodlineFingerprint(m)}
function continuationKey(m,firstSire){
  return 'cont|'+mareBloodlineFingerprint(m)+'|'+norm(firstSire);
}
function futureViewKey(m,firstSire,goal,category){
  return 'view|'+continuationKey(m,firstSire)+'|'+norm(goal)+'|'+norm(category);
}

const base={
  name:'自家製A',
  ancestor:['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'],
  omoshiro:'abcd',
  migoto:'efgh'
};
const sameIdChangedPedigree={...base,ancestor:[...base.ancestor.slice(0,14),'P']};
const renamed={...base,name:'自家製A改'};
const codeChanged={...base,omoshiro:'abce'};
const cloned=JSON.parse(JSON.stringify(base));

if(pairIndexKey(base)!==pairIndexKey(cloned))throw Error('stable clone fingerprint');
if(pairIndexKey(base)===pairIndexKey(sameIdChangedPedigree))throw Error('pedigree edit must invalidate pair cache');
if(pairIndexKey(base)===pairIndexKey(renamed))throw Error('name edit must invalidate direct-exception-sensitive pair cache');
if(pairIndexKey(base)===pairIndexKey(codeChanged))throw Error('theory-code edit must invalidate pair cache');
if(continuationKey(base,'バゴ')===continuationKey(base,'ステイゴールド'))throw Error('first sire must split continuation cache');

const goalA=futureViewKey(base,'バゴ','arc','production');
const goalB=futureViewKey(base,'バゴ','bc','production');
if(goalA===goalB)throw Error('view semantics must reflect goal');
if(continuationKey(base,'バゴ')!==continuationKey(base,'バゴ'))throw Error('continuation stable');

const contract={
  pairIndex:{
    key:['resolved mare name','15 ancestors','omoshiro code','migoto code'],
    rebuild:['selected mare changes','resolved pedigree changes','theory code changes','mare name changes'],
    keep:['goal changes','category changes','stallion search changes','pair filters change']
  },
  continuation:{
    key:['pairIndex bloodline fingerprint','fixed first sire'],
    rebuild:['pair-index key changes','fixed first sire changes'],
    keep:['goal changes','category changes','search/filter changes','detail collapse/expand'],
    note:'route exploration is goal/category agnostic; presentation semantics are derived afterward'
  },
  view:{
    derivesFrom:['continuation cache','goal','category','ability context'],
    noRouteRecalc:['goal/category change'],
    unknownAbility:'must not substitute zero ability'
  },
  render:{
    publicEntry:'window.renderBreed',
    callers:['app tab activation','horse save/edit','farm save','rebuild route handoff','sale route handoff'],
    rule:'all callers must be safe before/after async engine readiness'
  }
};

console.log(JSON.stringify({passed:true,method:'breed cache invalidation and render contract',contract},null,2));
