'use strict';
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const integration=fs.readFileSync('breed-integration.js','utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g)].map(m=>m[1]);
function pos(x){const i=scripts.indexOf(x);if(i<0)throw Error('script missing '+x);return i}

for(const removed of ['breed-helper.js','v19.js','v20.js','v21.js']){
  if(scripts.includes(removed))throw Error('inactive legacy runtime layer must not load: '+removed);
}
const p={
  app:pos('app.js'),
  core:pos('breeding-core.js'),
  engine:pos('breeding-engine.js'),
  v15:pos('v15.js'),
  v16:pos('v16.js'),
  v18:pos('v18.js'),
  planner:pos('sale-planner-core.js'),
  advisor:pos('sale-recommendation-core.js'),
  integration:pos('breed-integration.js'),
  v26:pos('v26.js'),
  v27:pos('v27.js'),
  v28:pos('v28.js')
};
if(!(p.app<p.core&&p.core<p.engine&&p.engine<p.v15&&p.engine<p.v16&&p.engine<p.v18))throw Error('shared engine must load before master-consuming UI layers');
if(!(p.engine<p.planner&&p.planner<p.advisor&&p.advisor<p.integration))throw Error('core/integration dependency order broken');
for(const x of ['v26','v27','v28'])if(!(p.integration<p[x]))throw Error('integration must precede '+x);
for(const s of ['window.renderBreed=renderBreed','window.DABISTA_BREED_PAIR_INDEX','window.DABISTA_BREED_FUTURE'])if(!integration.includes(s))throw Error('integration export missing '+s);

console.log(JSON.stringify({
  passed:true,
  method:'single-owner breed runtime load-order contract',
  scriptOrder:scripts,
  positions:p,
  removedLegacyRuntime:['breed-helper.js','v20.js','v21.js'],
  ownership:'breeding-engine owns master data; breed-integration owns candidate UI'
},null,2));
