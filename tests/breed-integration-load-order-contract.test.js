'use strict';
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const integration=fs.readFileSync('breed-integration.js','utf8');
const helper=fs.readFileSync('breed-helper.js','utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g)].map(m=>m[1]);
function pos(x){const i=scripts.indexOf(x);if(i<0)throw Error('script missing '+x);return i}

const p={
  app:pos('app.js'),
  helper:pos('breed-helper.js'),
  core:pos('breeding-core.js'),
  engine:pos('breeding-engine.js'),
  planner:pos('sale-planner-core.js'),
  advisor:pos('sale-recommendation-core.js'),
  integration:pos('breed-integration.js'),
  v20:pos('v20.js'),
  v21:pos('v21.js'),
  v25:pos('v25.js'),
  v26:pos('v26.js')
};
if(!(p.core<p.engine&&p.engine<p.planner&&p.planner<p.advisor&&p.advisor<p.integration))throw Error('core/integration dependency order broken');
for(const x of ['v20','v21','v25','v26'])if(!(p.integration<p[x]))throw Error('integration must precede '+x);
for(const s of ['window.renderBreed=renderBreed','window.DABISTA_BREED_PAIR_INDEX','window.DABISTA_BREED_FUTURE'])if(!integration.includes(s))throw Error('integration export missing '+s);
if(!helper.includes('window.renderBreed=window.renderBreed||renderBreedLegacy'))throw Error('helper is not fallback/bootstrap');
if(!helper.includes('if(window.DABISTA_BREED_PAIR_INDEX)return;'))throw Error('helper fallback does not yield ownership');

console.log(JSON.stringify({
  passed:true,
  method:'breed integration load-order contract',
  scriptOrder:scripts,
  positions:p,
  ownership:'breed-integration owns public render entry; helper is pre-readiness fallback'
},null,2));
