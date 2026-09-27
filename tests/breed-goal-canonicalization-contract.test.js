'use strict';
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const v26=fs.readFileSync('v26.js','utf8');
const integration=fs.readFileSync('breed-integration.js','utf8');

const options=[...html.matchAll(/<select id="breedGoal">([\s\S]*?)<\/select>/g)]
  .flatMap(m=>[...m[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
  .map(x=>({value:x[1],label:x[2]})));
const values=options.map(x=>x.value);
const expected=['arc','bc','rebuild','stallion'];
if(JSON.stringify(values)!==JSON.stringify(expected))throw Error('canonical breed goals '+JSON.stringify(values));
if(/bc:'breaker'/.test(v26))throw Error('BC still collapses to breaker');
if(!/const goalMap=\{arc:'arc',bc:'bc',rebuild:'rebuild',stallion:'stallion'\}/.test(v26))throw Error('sale handoff canonical goal map missing');
if(!/const GOAL_ALIAS=\{breaker:'arc',successor:'stallion',arc:'arc',bc:'bc',rebuild:'rebuild',stallion:'stallion'\}/.test(integration))throw Error('integration compatibility aliases missing');
if(fs.existsSync('breed-helper.js'))throw Error('obsolete breed helper source must stay removed');
if(values.includes('breaker')||values.includes('successor'))throw Error('legacy goals leaked into canonical UI');

console.log(JSON.stringify({
  passed:true,
  method:'breed goal canonicalization contract',
  canonicalValues:values,
  labels:Object.fromEntries(options.map(x=>[x.value,x.label])),
  legacyCompatibility:'integration aliases only',
  bcHandoff:'preserved'
},null,2));
