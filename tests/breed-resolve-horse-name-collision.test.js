'use strict';
const fs=require('fs');
const path=require('path');

global.window=global;
global.location={href:'https://example.invalid/'};
global.APP_ERRORS=[];
global.DABISTA_BREEDING_CORE=require('../breeding-core.js');

const clone=x=>JSON.parse(JSON.stringify(x));
const dataRoot=path.resolve(__dirname,'..');
global.fetch=async input=>{
  const u=new URL(String(input),global.location.href);
  const rel=u.pathname.replace(/^\//,'');
  const full=path.join(dataRoot,rel);
  if(!fs.existsSync(full))return{ok:false,status:404,json:async()=>({})};
  return{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(full,'utf8'))};
};

const customAncestor=['CustomSire','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'];
const custom={
  id:'custom-eist',
  name:'エイスト',
  sex:'牝',
  ancestor15:[...customAncestor],
  omoshiroCode:'',
  migotoCode:''
};
const legacy={id:'legacy-eist',name:'エイスト',sex:'牝'};
const tagged={
  id:'tagged-eist',
  name:'別名エイスト',
  sex:'牝',
  masterRef:{type:'default-broodmare',name:'エイスト'}
};
global.db={horses:[custom,legacy,tagged]};

require('../breeding-engine.js');

(async()=>{
  const e=await global.DABISTA_BREEDING_ENGINE.ready;
  const a=e.resolveHorse(custom);
  if(!a||a.kind!=='farm-horse')throw Error('explicit farm pedigree was replaced by same-name master '+JSON.stringify(a));
  if(JSON.stringify(a.ancestor)!==JSON.stringify(customAncestor))throw Error('explicit farm ancestor not preserved');

  const b=e.resolveHorse(legacy);
  if(!b||b.name!=='エイスト'||b.theorySource!=='switch-master')throw Error('legacy name-only master fallback lost '+JSON.stringify(b));

  const c=e.resolveHorse(tagged);
  if(!c||c.name!=='エイスト'||c.theorySource!=='switch-master')throw Error('masterRef resolution lost '+JSON.stringify(c));

  const master=e.master('エイスト');
  if(!master||JSON.stringify(a.ancestor)===JSON.stringify(master.ancestor))throw Error('collision fixture did not separate farm/master pedigree');

  const staleDerived={
    id:'derived-cache',name:'自家製キャッシュ馬',sex:'牡',role:'sire-candidate',
    sire:'バゴ',dam:'エイスト',ancestor15:Array(15).fill('STALE'),theorySource:'derived'
  };
  global.db={horses:[staleDerived]};
  const refreshed=e.resolveHorse(staleDerived);
  if(!refreshed||refreshed.kind!=='homebred-derived'||refreshed.ancestor[0]!=='バゴ')throw Error('derived pedigree cache was not recomputed '+JSON.stringify(refreshed));
  if(refreshed.ancestor.includes('STALE'))throw Error('stale derived ancestor leaked after parent-based recompute');
  if(refreshed.theorySource!=='parent-code-inheritance')throw Error('derived pedigree cache source was not refreshed '+JSON.stringify(refreshed));

  const routeChild=e.deriveChild(e.master('バゴ'),e.master('エイスト'),'ルート登録牝馬');
  if(!routeChild||!Array.isArray(routeChild.ancestor)||routeChild.ancestor.length!==15)throw Error('route registration fixture could not derive 15 ancestors');
  const routeSaved={
    id:'route-registered-mare',name:'ルート登録牝馬',sex:'牝',role:'broodmare',
    sire:'バゴ',dam:'エイスト',
    ancestor15:[...routeChild.ancestor],omoshiroCode:routeChild.omoshiro,migotoCode:routeChild.migoto,
    theorySource:'route-registration',
    routeSource:{type:'sale-route',startMare:'エイスト',goal:'rebuild',generation:1,sires:['バゴ']}
  };
  global.db={horses:[routeSaved]};
  const routeResolved=e.resolveHorse(routeSaved);
  if(!routeResolved||routeResolved.kind!=='farm-horse'||routeResolved.ancestor.length!==15)
    throw Error('route-registered horse is not reusable as a farm pedigree '+JSON.stringify(routeResolved));
  const routeNextPair=e.evaluatePair('バゴ',routeSaved);
  if(!routeNextPair||!routeNextPair.child||routeNextPair.child.ancestor.length!==15)
    throw Error('route-registered broodmare cannot be used for the next mating');

  const restored={
    id:'restored-mare',name:'復元牝馬',sex:'牝',
    ancestor15:[...customAncestor],omoshiroCode:master.omoshiro,migotoCode:master.migoto
  };
  global.db={horses:[restored]};
  const afterRestore=e.resolveHorse('復元牝馬');
  if(!afterRestore||afterRestore.kind!=='farm-horse'||afterRestore.name!=='復元牝馬')throw Error('engine kept stale pre-restore db reference '+JSON.stringify(afterRestore));

  console.log(JSON.stringify({
    passed:true,
    method:'breeding-engine explicit farm identity beats same-name master',
    custom:{kind:a.kind,firstAncestor:a.ancestor[0]},
    legacyFallback:{name:b.name,source:b.theorySource},
    masterRef:{name:c.name,source:c.theorySource},
    restoreRebind:{name:afterRestore.name,source:afterRestore.theorySource},
    derivedCacheRefresh:{name:refreshed.name,kind:refreshed.kind,firstAncestor:refreshed.ancestor[0],source:refreshed.theorySource},
    routeRegistrationReuse:{name:routeResolved.name,kind:routeResolved.kind,nextChildAncestors:routeNextPair.child.ancestor.length}
  },null,2));
})().catch(e=>{console.error(e);process.exit(1)});
