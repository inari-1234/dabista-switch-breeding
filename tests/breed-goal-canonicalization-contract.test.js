'use strict';
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const v26=fs.readFileSync('v26.js','utf8');
const helper=fs.readFileSync('breed-helper.js','utf8');

const current={
  breedOptions:[...html.matchAll(/<select id="breedGoal">([\s\S]*?)<\/select>/g)].flatMap(m=>[...m[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(x=>({value:x[1],label:x[2]}))),
  v26MapsBcToBreaker:/bc:'breaker'/.test(v26),
  helperLegacyValues:/goal==='breaker'/.test(helper)&&/goal==='successor'/.test(helper)
};
if(!current.v26MapsBcToBreaker)throw Error('expected current BC collapse not found');
if(current.breedOptions.length!==3)throw Error('unexpected current goal option count');

const planned={
  canonicalValues:['arc','bc','rebuild','stallion'],
  labels:{
    arc:'凱旋門',
    bc:'BC',
    rebuild:'繁殖再建',
    stallion:'自家製種牡馬'
  },
  noMappingNeededBetween:['sale planner','breed tab','future diagnostics'],
  rebuildResearch:'already uses arc/rebuild/bc; when opening breed, set breed goal directly from route.goal when supported',
  fallbackLegacyMapOnlyIfNeeded:{
    breaker:'arc',
    successor:'stallion',
    rebuild:'rebuild'
  }
};
if(new Set(planned.canonicalValues).size!==4)throw Error('canonical goal values must be unique');
if(planned.canonicalValues.includes('breaker')||planned.canonicalValues.includes('successor'))throw Error('legacy values leaked into canonical goal set');

console.log(JSON.stringify({passed:true,method:'breed goal canonicalization contract',current,planned},null,2));
