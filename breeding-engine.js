(()=>{
'use strict';
const BUILD=window.APP_BUILD||'2026.09.25-63',core=window.DABISTA_BREEDING_CORE;
const host={version:1,status:'loading',ready:null,error:null};window.DABISTA_BREEDING_ENGINE=host;
if(!core){host.status='failed';host.error='breeding-core missing';window.APP_ERRORS?.push({at:new Date().toISOString(),message:host.error});return}
const json=async path=>{const u=new URL(path,location.href);u.searchParams.set('_',BUILD);const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()};
const cloneRecord=(x,source)=>x?{name:x.name,kind:x.kind||'',system:x.system||'',ancestor:Array.isArray(x.ancestor)?[...x.ancestor]:[],omoshiro:String(x.omoshiro||''),migoto:String(x.migoto||''),omoshiroSystems:Array.isArray(x.omoshiroSystems)?[...x.omoshiroSystems]:core.decodeCode(x.omoshiro),migotoSystems:Array.isArray(x.migotoSystems)?[...x.migotoSystems]:core.decodeCode(x.migoto),theorySource:source||'master'}:null;
host.ready=(async()=>{
 const [theory,pedigree,effects,kotta,direct,stallionData,mareData,inheritanceValidation]=await Promise.all([
  json('data/theory-master.json'),json('data/pedigree-master.json'),json('data/nitro-effects.json'),json('data/kotta-pairs.json'),json('data/elaborate-direct-exceptions.json'),json('data/stallions.json'),json('data/default-broodmares.json'),json('data/planner-inheritance-validation.json')
 ]);
 const allTheory=[...(theory.stallions||[]),...(theory.broodmares||[])],masterMap=new Map(allTheory.map(x=>[core.key(x.name),x]));
 const pedigreeMap=new Map((pedigree.horses||[]).map(x=>[core.key(x.name),x]));
 const stallionStatsMap=new Map((stallionData.stallions||[]).map(x=>[core.key(x.name),x]));
 const mareStatsMap=new Map((mareData.broodmares||[]).map(x=>[core.key(x.name),x]));
 const knownDifferences=(inheritanceValidation.samples||[]).filter(x=>x?.sire&&x?.mare&&x?.ours?.kc!==x?.oracle?.k).map(x=>({sire:x.sire,mare:x.mare,oracle:x.oracle,ours:x.ours}));
 const engine=core.create({effects:effects.effects||[],elaboratePairs:kotta.pairs||[],directElaboratePairs:direct.pairs||[],elaborateKnownDifferences:knownDifferences});
 const master=name=>{const k=core.key(name),t=masterMap.get(k);if(t)return cloneRecord(t,'switch-master');const p=pedigreeMap.get(k);return p?cloneRecord(p,p.kind==='pedigree-stallion'?'pedigree-analysis-only':'pedigree-master'):null};
 const pedigreeRecord=name=>{const p=pedigreeMap.get(core.key(name));return p?cloneRecord(p,p.kind==='pedigree-stallion'?'pedigree-analysis-only':'pedigree-master'):null};
 const stallionStats=name=>stallionStatsMap.get(core.key(name))||null;
 const mareStats=name=>mareStatsMap.get(core.key(name))||null;
 function findDbHorse(name){return window.db?.horses?.find(x=>core.key(x.name)===core.key(name))||null}
 function resolveHorse(h,stack=new Set()){
  if(!h)return null;
  if(typeof h==='string')return master(h)||resolveHorse(findDbHorse(h),stack);
  const refName=h.masterRef?.name||'',refMaster=refName?master(refName):null;
  if(refMaster)return refMaster;
  const id=h.id||h.name||'';if(id&&stack.has(id))return null;const next=new Set(stack);if(id)next.add(id);
  const derivedCacheSource=h.theorySource==='derived'||String(h.theorySource||'').startsWith('parent-code-inheritance');
  const anc=!derivedCacheSource&&Array.isArray(h.ancestor15)&&h.ancestor15.length===15?[...h.ancestor15]:null;
  const directOm=String(h.omoshiroCode||h.omoshiro||''),directMg=String(h.migotoCode||h.migoto||'');
  const hasFarmIdentity=!!(anc||directOm||directMg||h.sire||h.dam);
  if(!hasFarmIdentity){const legacyMaster=master(h.name);if(legacyMaster)return legacyMaster;}
  if(anc&&directOm.length===4)return{name:h.name,kind:'farm-horse',system:h.system||'',ancestor:anc,omoshiro:directOm,migoto:directMg,omoshiroSystems:core.decodeCode(directOm),migotoSystems:core.decodeCode(directMg),theorySource:h.theorySource||'farm-stored-code'};
  if(h.sire&&h.dam){
    const sire=master(h.sire)||resolveHorse(findDbHorse(h.sire),next),mare=master(h.dam)||resolveHorse(findDbHorse(h.dam),next);
    const child=sire&&mare?core.deriveChild(sire,mare,h.name):null;
    if(child){if(anc)child.ancestor=anc;child.theorySource=anc?'parent-code-inheritance+registered-ancestor':'parent-code-inheritance';return child}
  }
  const legacyOm=core.encodeSystems(h.omoshiroSystems);
  if(anc&&legacyOm.length===4)return{name:h.name,kind:'farm-horse',system:h.system||'',ancestor:anc,omoshiro:legacyOm,migoto:'',omoshiroSystems:[...h.omoshiroSystems],migotoSystems:[],theorySource:'legacy-persisted-systems'};
  if(anc)return{name:h.name,kind:'farm-horse',system:h.system||'',ancestor:anc,omoshiro:'',migoto:'',omoshiroSystems:[],migotoSystems:[],theorySource:'registered-ancestor-only'};
  return null;
 }
 function record(x){if(!x)return null;if(typeof x==='string')return master(x)||resolveHorse(findDbHorse(x));if(Array.isArray(x.ancestor)&&x.ancestor.length===15)return x;return resolveHorse(x)}
 function evaluatePair(sireInput,mareInput){const sire=record(sireInput),mare=record(mareInput);return sire&&mare?engine.evaluate(sire,mare):null}
 const allPedigreeStallions=()=>[...(pedigree.horses||[])].filter(x=>x.kind==='default-stallion'||x.kind==='pedigree-stallion').map(x=>cloneRecord(x,x.kind==='pedigree-stallion'?'pedigree-analysis-only':'switch-master'));
 Object.assign(host,{status:'ready',theory,pedigree,effects,kotta,directExceptions:direct,stallionData,mareData,knownDifferences,master,pedigreeRecord,stallionStats,mareStats,resolveHorse,record,evaluatePair,calcNitro:engine.calcNitro,danger:engine.danger,theoryFlags:engine.theoryFlags,elaborate:engine.elaborate,deriveChild:engine.deriveChild,deriveChildAncestor:engine.deriveChildAncestor,core:engine,domesticStallions:()=>theory.stallions.map(x=>cloneRecord(x,'switch-master')),allPedigreeStallions,broodmares:()=>theory.broodmares.map(x=>cloneRecord(x,'switch-master'))});
 window.DABISTA_BREEDING_ENGINE_STATUS={status:'ok',domesticStallions:theory.stallions?.length||0,pedigreeStallions:pedigree.pedigreeStallionCount||allPedigreeStallions().length,broodmares:theory.broodmares?.length||0,directExceptions:direct.pairs?.length||0,kottaPairs:kotta.pairs?.length||0};
 return host;
})().catch(e=>{host.status='failed';host.error=String(e);window.DABISTA_BREEDING_ENGINE_STATUS={status:'failed',error:String(e)};window.APP_ERRORS?.push({at:new Date().toISOString(),message:'breeding-engine: '+String(e)});throw e});
})();
