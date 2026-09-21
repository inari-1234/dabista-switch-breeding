'use strict';

function makeState(){
  let lineageKey='none',epoch=0;
  const cache=new Map(),pending=new Map();
  return{
    setLineage(key){
      key=String(key);
      if(key!==lineageKey){lineageKey=key;epoch++}
      return{lineageKey,epoch};
    },
    beginContinuation(firstSire){
      const key=lineageKey+'|'+firstSire;
      if(cache.has(key))return{kind:'cached',key,value:cache.get(key)};
      if(pending.has(key))return{kind:'deduped',key,token:pending.get(key)};
      const token={key,lineageKey,epoch,cancelled:false};
      pending.set(key,token);return{kind:'started',key,token};
    },
    commit(token,value){
      pending.delete(token.key);
      if(token.cancelled||token.epoch!==epoch||token.lineageKey!==lineageKey)return false;
      cache.set(token.key,value);return true;
    },
    changeView(){return{lineageKey,epoch}},
    cancelLineage(){
      epoch++;
      for(const token of pending.values())token.cancelled=true;
      pending.clear();
    },
    cache,
    pending,
    get epoch(){return epoch},
    get lineageKey(){return lineageKey}
  };
}

const s=makeState();
s.setLineage('mareA');
const a=s.beginContinuation('バゴ');
if(a.kind!=='started')throw Error('first scan must start');

// Goal/category/search changes must not invalidate route exploration.
const before=s.epoch;
s.changeView();s.changeView();
if(s.epoch!==before)throw Error('view change invalidated continuation');
const dup=s.beginContinuation('バゴ');
if(dup.kind!=='deduped'||dup.token!==a.token)throw Error('duplicate scan not deduped');
if(!s.commit(a.token,{ok:'A-bago'}))throw Error('same-lineage result should commit');
if(s.beginContinuation('バゴ').kind!=='cached')throw Error('committed continuation not cached');

// Mare/pedigree change must reject stale result.
const old=s.beginContinuation('ステイゴールド');
s.setLineage('mareB');
if(s.commit(old.token,{stale:true}))throw Error('stale mare result committed');

// First-sire keys must be independent.
const b1=s.beginContinuation('バゴ'),b2=s.beginContinuation('ステイゴールド');
if(b1.key===b2.key)throw Error('first sire not in continuation key');

// Explicit cancellation must reject pending result.
s.cancelLineage();
if(s.commit(b1.token,{stale:true}))throw Error('cancelled result committed');

const contract={
  continuationKey:['resolved mare/pedigree fingerprint','fixed first sire'],
  invalidatesOn:['mare change','pedigree edit','theory-code edit','first-sire change for the requested detail'],
  doesNotInvalidateOn:['goal change','category change','search text','pair filters','detail collapse/expand'],
  asyncRules:[
    'chunk loop checks token between chunks',
    'stale/cancelled token never mutates DOM or cache',
    'same continuation key is deduplicated',
    'goal/category presentation derives from cached routes after completion',
    'renderBreed may run while continuation is pending without losing pair-index state'
  ],
  browserYield:'requestAnimationFrame or setTimeout(0); route ordering must match synchronous collector'
};
console.log(JSON.stringify({passed:true,method:'async continuation state-machine contract',contract},null,2));
