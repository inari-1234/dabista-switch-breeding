'use strict';
const fs=require('fs');
const vm=require('vm');

const core=require('../breeding-core.js');
const src=fs.readFileSync('breeding-core.js','utf8');

const topKeys=Object.keys(core).sort();
const expectedTop=['CHAR_BY_SYSTEM','SYSTEM_BY_CHAR','canon','collectRawCrosses','create','danger','decodeCode','depth','deriveChild','deriveChildAncestor','descendantLocks','encodeSystems','key','theoryFlags','version'].sort();
if(JSON.stringify(topKeys)!==JSON.stringify(expectedTop))throw Error('top-level API drift '+JSON.stringify({topKeys,expectedTop}));

const engine=core.create({effects:[],elaboratePairs:[],directElaboratePairs:[],elaborateKnownDifferences:[]});
const engineKeys=Object.keys(engine).sort();
const expectedEngine=['calcNitro','canon','danger','decodeCode','depth','deriveChild','deriveChildAncestor','elaborate','encodeSystems','evaluate','key','theoryFlags','version'].sort();
if(JSON.stringify(engineKeys)!==JSON.stringify(expectedEngine))throw Error('created-engine API drift '+JSON.stringify({engineKeys,expectedEngine}));

const forbiddenPublic=['prepareHorse','prepared','preparedCache','dangerPrepared','calcNitroPrepared'];
for(const x of forbiddenPublic)if(topKeys.includes(x)||engineKeys.includes(x))throw Error('internal optimization leaked to public API '+x);

const requiredInternalPreservation=[
  'return{version:1,canon,key,depth,decodeCode,encodeSystems,calcNitro,danger,theoryFlags,deriveChild,deriveChildAncestor,elaborate,evaluate}',
  'return{version:1,SYSTEM_BY_CHAR,CHAR_BY_SYSTEM,canon,key,depth,decodeCode,encodeSystems,collectRawCrosses,descendantLocks,danger,theoryFlags,deriveChild,deriveChildAncestor,create}'
];
for(const s of requiredInternalPreservation)if(!src.includes(s))throw Error('public return shape changed');

const contract={
  allowedCoreChanges:[
    'add private WeakMap prepared pedigree cache inside module/create scope',
    'add private raw name+15-ancestor signature invalidation',
    'reuse prepared canonical/key arrays in danger/calcNitro/elaborate',
    'produce rawCrosses during the same 15x15 scan used by danger'
  ],
  forbiddenCoreChanges:[
    'change exported key names or version',
    'change danger return object fields/order semantics',
    'change calcNitro factor order',
    'change elaborate evidence order/dedup semantics',
    'change deriveChild output',
    'change known Monte Rosso x Day Science discrepancy handling',
    'add approximation or ranking logic to breeding-core'
  ],
  postPatchMandatory:[
    '58256 exact common regression',
    'prepared-core exhaustive equivalence 58256/58256',
    'representative 2-4 generation end-to-end equivalence',
    'mutation-safe prepared cache contract',
    'common and sale workflows'
  ]
};
console.log(JSON.stringify({passed:true,topKeys,engineKeys,contract},null,2));
