(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DABISTA_GROWTH_DB=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const SCHEMA_VERSION=2;

function isObject(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}

function normalizeInPlace(db){
  if(!isObject(db))throw new TypeError('growth db must be an object');
  if(!Array.isArray(db.horses))db.horses=[];
  if(!Array.isArray(db.races))db.races=[];
  if(!Array.isArray(db.growthCheckSets))db.growthCheckSets=[];
  if(!Array.isArray(db.growthChecks))db.growthChecks=[];
  if(typeof db.memo!=='string')db.memo=db.memo==null?'':String(db.memo);
  const current=Number(db.schemaVersion)||0;
  if(current<SCHEMA_VERSION)db.schemaVersion=SCHEMA_VERSION;
  return db;
}

function normalizedClone(input){
  if(!isObject(input))throw new TypeError('growth backup must be an object');
  const clone=JSON.parse(JSON.stringify(input));
  return normalizeInPlace(clone);
}

return{SCHEMA_VERSION,normalizeInPlace,normalizedClone};
});
