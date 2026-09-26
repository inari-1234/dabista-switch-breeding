'use strict';
const assert=require('assert');

global.window={};
require('../horse-lifecycle.js');
const L=window.DABISTA_HORSE_LIFECYCLE;
assert.ok(L,'lifecycle API missing');

assert.strictEqual(L.currentState({role:'stallion'}),'stallion');
assert.strictEqual(L.currentState({role:'broodmare'}),'broodmare');
assert.strictEqual(L.currentState({role:'broodmare',routeSource:{type:'sale-route'}}),'race');
assert.strictEqual(L.currentState({role:'sire-candidate',routeSource:{type:'sale-route'}}),'race');
assert.strictEqual(L.futureUse({role:'broodmare',routeSource:{type:'sale-route'}}),'broodmare');
assert.strictEqual(L.futureUse({role:'sire-candidate',routeSource:{type:'sale-route'}}),'stallion');

const routeFilly=L.normalizeForSave({sex:'牝',currentState:'race',futureUse:'broodmare',role:'broodmare'});
assert.strictEqual(routeFilly.role,'race');
assert.strictEqual(routeFilly.currentState,'race');
assert.strictEqual(routeFilly.futureUse,'broodmare');
assert.strictEqual(L.isBreedingMare(routeFilly),false);
assert.strictEqual(L.isRacehorse(routeFilly),true);

const promotedMare=L.normalizeForSave({...routeFilly,currentState:'broodmare'});
assert.strictEqual(promotedMare.role,'broodmare');
assert.strictEqual(L.isBreedingMare(promotedMare),true);

const stallion=L.normalizeForSave({sex:'牡',currentState:'stallion',futureUse:'none'});
assert.strictEqual(stallion.role,'stallion');
assert.strictEqual(L.isActiveStallion(stallion),true);

console.log(JSON.stringify({passed:true,currentStateSeparated:true,futureUseSeparated:true,legacyRouteCompatible:true},null,2));
