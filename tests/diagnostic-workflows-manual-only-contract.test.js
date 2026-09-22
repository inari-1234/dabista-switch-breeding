'use strict';
const fs=require('fs');
const path=require('path');

const dir=path.join('.github','workflows');
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.yml'));
const diagnose=files.filter(x=>x.startsWith('diagnose-'));
if(!diagnose.length)throw Error('diagnostic workflows missing');

for(const file of diagnose){
  const src=fs.readFileSync(path.join(dir,file),'utf8');
  if(!/^on:\n  workflow_dispatch:/m.test(src))throw Error(file+' must start with manual workflow_dispatch trigger');
  if(/^  push:/m.test(src))throw Error(file+' must not auto-run on push');
}

for(const file of ['validate-common-engine.yml','validate-sale-planner.yml']){
  const src=fs.readFileSync(path.join(dir,file),'utf8');
  if(!/^  push:/m.test(src))throw Error(file+' must retain push validation');
  if(!/^  workflow_dispatch:/m.test(src))throw Error(file+' must retain manual dispatch');
}

console.log(JSON.stringify({
  passed:true,
  diagnoseCount:diagnose.length,
  policy:'diagnose manual-only; primary validates push+manual'
},null,2));
