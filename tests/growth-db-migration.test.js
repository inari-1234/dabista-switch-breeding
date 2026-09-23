'use strict';
const assert=require('assert');
const growthDb=require('../growth-db.js');

const oldBackup={
  horses:[{id:'h1',name:'旧馬',sex:'牝',note:'そのまま'}],
  races:[{id:'r1',horseId:'h1',name:'旧レース',distance:2000,mark4:'○',mark5:'△'}],
  memo:'legacy',
  legacyRoot:{keep:true}
};
const horseBefore=JSON.stringify(oldBackup.horses);
const raceBefore=JSON.stringify(oldBackup.races);
const retained=oldBackup;
const result=growthDb.normalizeInPlace(oldBackup);

assert.strictEqual(result,retained,'normalize must preserve root object identity');
assert.strictEqual(result.schemaVersion,2);
assert.deepStrictEqual(result.growthCheckSets,[]);
assert.deepStrictEqual(result.growthChecks,[]);
assert.strictEqual(JSON.stringify(result.horses),horseBefore,'legacy horses must remain byte-equivalent JSON');
assert.strictEqual(JSON.stringify(result.races),raceBefore,'legacy races must remain byte-equivalent JSON');
assert.ok(!('currentAge' in result.horses[0]),'migration must not inject empty horse growth fields');
assert.ok(!('age' in result.races[0]),'migration must not invent historical race age');
assert.ok(!('month' in result.races[0]),'migration must not invent historical race month');
assert.deepStrictEqual(result.legacyRoot,{keep:true});

const same=growthDb.normalizeInPlace(result);
assert.strictEqual(same,result,'normalization must be idempotent by identity');
assert.strictEqual(same.schemaVersion,2);

const withGrowth={
  schemaVersion:2,
  horses:[{id:'h2',currentAge:4,currentMonth:6}],
  races:[{id:'r2',age:4,month:5}],
  growthCheckSets:[{id:'s1',revision:1}],
  growthChecks:[{id:'c1',setId:'s1',setRevision:1}]
};
const preserved=JSON.stringify(withGrowth);
growthDb.normalizeInPlace(withGrowth);
assert.strictEqual(JSON.stringify(withGrowth),preserved,'current schema data must remain unchanged');

const original={
  horses:[{id:'h3'}],
  races:[],
  custom:'x'
};
const clone=growthDb.normalizedClone(original);
assert.notStrictEqual(clone,original);
assert.deepStrictEqual(original,{horses:[{id:'h3'}],races:[],custom:'x'},'normalizedClone must not mutate backup input');
assert.strictEqual(clone.schemaVersion,2);
assert.deepStrictEqual(clone.growthCheckSets,[]);
assert.deepStrictEqual(clone.growthChecks,[]);

const shared={horses:[{id:'old'}],races:[],memo:'old',stale:true};
const identity=shared;
const restored=growthDb.normalizedClone({horses:[{id:'new'}],memo:'new'});
Object.keys(shared).forEach(k=>delete shared[k]);
Object.assign(shared,restored);
assert.strictEqual(shared,identity,'backup restore must preserve shared root identity');
assert.strictEqual(shared.horses[0].id,'new');
assert.ok(!('stale' in shared));
assert.strictEqual(shared.schemaVersion,2);
assert.deepStrictEqual(shared.races,[]);
assert.deepStrictEqual(shared.growthCheckSets,[]);
assert.deepStrictEqual(shared.growthChecks,[]);

console.log(JSON.stringify({
  passed:true,
  schemaVersion:growthDb.SCHEMA_VERSION,
  legacyHorseUnchanged:true,
  legacyRaceUnchanged:true,
  rootIdentityPreserved:true,
  noInventedHistoricalAgeMonth:true
},null,2));
