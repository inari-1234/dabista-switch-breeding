'use strict';
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g)].map(m=>m[1]);
function pos(x){const i=scripts.indexOf(x);if(i<0)throw Error('script missing '+x);return i}

const current={
  app:pos('app.js'),
  helper:pos('breed-helper.js'),
  core:pos('breeding-core.js'),
  engine:pos('breeding-engine.js'),
  planner:pos('sale-planner-core.js'),
  advisor:pos('sale-recommendation-core.js'),
  v20:pos('v20.js'),
  v21:pos('v21.js'),
  v25:pos('v25.js')
};
if(!(current.core<current.engine&&current.engine<current.planner&&current.planner<current.advisor))throw Error('core dependency order broken');
if(!(current.advisor<current.v20&&current.advisor<current.v21&&current.advisor<current.v25))throw Error('no safe integration slot before breed decorators');

const planned={
  newScript:'breed-integration.js',
  insertAfter:'sale-recommendation-core.js',
  insertBefore:['v20.js','v21.js','v22.js','v24.js','v25.js','v26.js'],
  dependencies:['window.db','window.DABISTA_BREEDING_ENGINE.ready','DABISTA_SALE_PLANNER_CORE','DABISTA_SALE_RECOMMENDATION_CORE'],
  exports:['window.renderBreed','window.DABISTA_BREED_PAIR_INDEX','window.DABISTA_BREED_FUTURE'],
  startup:'install public render entry immediately; async data/engine readiness handled internally',
  migration:'breed-helper becomes fallback/bootstrap only and must not retain an independent ranking render after integration activates'
};

const forbidden=[
  'load breed-integration before breeding-engine/planner/advisor',
  'let helper and integration both own independent breed event handlers',
  'require v20/v21/v25 MutationObserver decorators for core candidate identity',
  'block app startup while deep 2-4 generation continuation is computed'
];

console.log(JSON.stringify({passed:true,currentScriptOrder:scripts,current,planned,forbidden},null,2));
