'use strict';
const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const engine=fs.readFileSync('breeding-engine.js','utf8');

const importBlock=app.match(/\$\('#importFile'\)\.onchange=async e=>\{([\s\S]*?)\};\nfunction newer/);
if(!importBlock)throw Error('backup import handler missing');
const body=importBlock[1];

if(/\bdb\s*=\s*x\b/.test(body))throw Error('backup restore replaces shared db object identity');
if(!body.includes('const restored={...x,races:x.races||[],memo:x.memo||\'\'}'))throw Error('normalized restored snapshot missing');
if(!body.includes('Object.keys(db).forEach(k=>delete db[k])'))throw Error('existing shared db keys are not cleared in place');
if(!body.includes('Object.assign(db,restored)'))throw Error('restored snapshot is not copied into shared db object');
if(!body.includes('window.db=db'))throw Error('window.db rebinding contract missing');

if(!engine.includes('function findDbHorse(name){return window.db?.horses?.find'))throw Error('breeding engine must resolve against current window.db after restore');
if(/core=window\.DABISTA_BREEDING_CORE,db=window\.db/.test(engine))throw Error('breeding engine captured stale db object');

const shared={horses:[{id:'old'}],memo:'old',legacy:true};
const retained=shared;
const restored={horses:[{id:'new'}],memo:'new',races:[]};
Object.keys(shared).forEach(k=>delete shared[k]);
Object.assign(shared,restored);
if(retained!==shared||retained.horses[0].id!=='new'||'legacy' in retained)throw Error('identity-preserving restore model failed');

console.log(JSON.stringify({
  passed:true,
  method:'backup restore preserves shared object identity and breeding engine reads current window.db',
  retainedIdentity:retained===shared,
  restoredHorse:retained.horses[0].id
},null,2));
