'use strict';
const fs=require('fs');
const runtime=fs.readFileSync('breed-integration.js','utf8');

function makeState(){
  let lineageKey='none',epoch=0;
  const cache=new Map(),pending=new Map();
  return{
    setLineage(key){
      key=String(key);
      if(key!==lineageKey){
        lineageKey=key;
        epoch++;
        for(const token of pending.values())token.cancelled=true;
        pending.clear();
      }
      return{lineageKey,epoch};
    },
    beginContinuation(firstSire){
      const key=lineageKey+'|'+firstSire;
      if(cache.has(key))return{kind:'cached',key,value:cache.get(key)};
      if(pending.has(key))return{kind:'deduped',key,token:pending.get(key)};
      const token={key,lineageKey,epoch,firstSire,cancelled:false};
      pending.set(key,token);return{kind:'started',key,token};
    },
    cancelOtherContinuations(keepSire=''){
      for(const [key,token] of pending){
        if(token.lineageKey===lineageKey&&token.firstSire!==keepSire){
          token.cancelled=true;
          pending.delete(key);
        }
      }
    },
    commit(token,value){
      if(pending.get(token.key)===token)pending.delete(token.key);
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

// A -> B -> A: the old cancelled A must never remove or overwrite the restarted A.
const race=makeState();
race.setLineage('mareRace');
const a1=race.beginContinuation('バゴ');
race.cancelOtherContinuations('ステイゴールド');
const b=race.beginContinuation('ステイゴールド');
race.cancelOtherContinuations('バゴ');
const a2=race.beginContinuation('バゴ');
if(a2.kind!=='started'||a2.token===a1.token)throw Error('A -> B -> A must restart A with a fresh token');
if(race.commit(a1.token,{stale:'old-A'}))throw Error('old cancelled A committed after restart');
if(race.pending.get(a2.key)!==a2.token)throw Error('old A cleanup deleted restarted A');
if(race.commit(b.token,{stale:'B'}))throw Error('cancelled B committed after A restart');
if(!race.commit(a2.token,{ok:'new-A'}))throw Error('restarted A failed to commit');
if(race.cache.get(a2.key)?.ok!=='new-A')throw Error('restarted A cache value missing');

const hiddenActive=runtime.match(/if\(activeSire&&!lists\.ranked\.some\(e=>e\.sire===activeSire\)\)\{([\s\S]{0,220}?)\}/);
if(!hiddenActive)throw Error('runtime hidden-active branch missing');
if(hiddenActive[1].includes('cancelOtherContinuations'))throw Error('runtime cancels continuation on category/search/filter view change');
if(!hiddenActive[1].includes("activeSire=''")||!hiddenActive[1].includes('clearFutureOverview()'))throw Error('runtime must clear hidden active UI without discarding scan');
if(!/if\(goal\)goal\.onchange=\(\)=>\{[\s\S]{0,220}window\.renderBreed\(\)/.test(runtime))throw Error('goal view handler missing');
if(!/if\(cat\)cat\.onchange=\(\)=>\{[\s\S]{0,220}window\.renderBreed\(\)/.test(runtime))throw Error('category view handler missing');
if(!runtime.includes('if(pending.get(key)===token)pending.delete(key)'))throw Error('runtime restarted-key cleanup guard missing');

const contract={
  continuationKey:['resolved mare/pedigree fingerprint','fixed first sire'],
  invalidatesOn:['mare change','pedigree edit','theory-code edit','first-sire change for the requested detail'],
  doesNotInvalidateOn:['goal change','category change','search text','pair filters','detail collapse/expand'],
  asyncRules:[
    'chunk loop checks token between chunks',
    'stale/cancelled token never mutates DOM or cache',
    'same continuation key is deduplicated',
    'A -> B -> A restart cannot be deleted by the old A finally path',
    'goal/category presentation derives from cached routes after completion',
    'renderBreed may run while continuation is pending without losing pair-index state'
  ],
  browserYield:'requestAnimationFrame or setTimeout(0); route ordering must match synchronous collector'
};
console.log(JSON.stringify({passed:true,method:'async continuation state-machine contract',contract},null,2));
