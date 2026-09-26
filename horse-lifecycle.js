(()=>{
'use strict';
const CURRENT_STATES=['race','broodmare','stallion'];
const FUTURE_USES=['none','broodmare','stallion'];

function currentState(h){
  const explicit=String(h?.currentState||'');
  if(CURRENT_STATES.includes(explicit))return explicit;
  if(h?.routeSource&&(h?.role==='broodmare'||h?.role==='sire-candidate'))return'race';
  if(h?.role==='stallion')return'stallion';
  if(h?.role==='broodmare')return'broodmare';
  return'race';
}
function futureUse(h){
  const explicit=String(h?.futureUse||'');
  if(FUTURE_USES.includes(explicit))return explicit;
  if(h?.routeSource){
    if(h?.role==='broodmare')return'broodmare';
    if(h?.role==='sire-candidate')return'stallion';
  }
  if(h?.role==='sire-candidate')return'stallion';
  return'none';
}
function legacyRole(state){
  return state==='broodmare'?'broodmare':state==='stallion'?'stallion':'race';
}
function currentLabel(v){
  return({race:'現役競走馬',broodmare:'繁殖牝馬',stallion:'種牡馬'})[v]||'現役競走馬';
}
function futureLabel(v){
  return({none:'',broodmare:'次世代牝馬候補',stallion:'種牡馬候補'})[v]||'';
}
function normalizeForSave(h){
  const x={...h};
  x.currentState=currentState(x);
  x.futureUse=futureUse(x);
  x.role=legacyRole(x.currentState);
  if(x.currentState==='broodmare')x.sex='牝';
  if(x.currentState==='stallion')x.sex='牡';
  return x;
}
function isBreedingMare(h){return currentState(h)==='broodmare'}
function isActiveStallion(h){return currentState(h)==='stallion'}
function isRacehorse(h){return currentState(h)==='race'}

window.DABISTA_HORSE_LIFECYCLE={
  version:1,
  CURRENT_STATES:[...CURRENT_STATES],
  FUTURE_USES:[...FUTURE_USES],
  currentState,
  futureUse,
  legacyRole,
  currentLabel,
  futureLabel,
  normalizeForSave,
  isBreedingMare,
  isActiveStallion,
  isRacehorse
};
})();