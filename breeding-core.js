(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DABISTA_BREEDING_CORE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SYSTEM_BY_CHAR={a:'Ec',b:'Ph',c:'Ns',d:'Ro',e:'Ne',f:'Na',g:'Fa',h:'To',i:'Te',j:'Sw',k:'Ha',l:'Hi',m:'St',n:'Ma',o:'He'};
  const CHAR_BY_SYSTEM=Object.fromEntries(Object.entries(SYSTEM_BY_CHAR).map(([k,v])=>[v,k]));
  const canon=s=>String(s??'').normalize('NFKC').trim();
  const key=s=>canon(s).replace(/[\s・･]/g,'').toLowerCase();
  const depth=i=>i<1?2:i<3?3:i<7?4:5;
  const validAnc=a=>Array.isArray(a)&&a.length===15;
  const validCode=s=>typeof s==='string'&&s.length===4;
  const decodeCode=s=>validCode(s)?[...s].map(c=>SYSTEM_BY_CHAR[c]||c):[];
  const encodeSystems=a=>Array.isArray(a)&&a.length===4?a.map(x=>CHAR_BY_SYSTEM[x]||'').join(''):'';
  const sortedCode=s=>[...new Set(String(s||'').split(''))].sort().join('');
  const uniqueCode=s=>new Set(String(s||'').split('').filter(Boolean)).size;

  function descendantLocks(mother,father){
    const out=[],add=(...a)=>out.push(...a);
    if(father===0){
      if(mother===0)add('1,1','3,3','4,4','7,7','8,8','9,9','10,10');
      else if(mother===1)add('1,3','3,7','4,8'); else if(mother===2)add('1,5','3,11','4,12');
      else if(mother===3)add('1,7'); else if(mother===4)add('1,9'); else if(mother===5)add('1,11'); else if(mother===6)add('1,13');
    }else if(father===1){
      if(mother===0)add('3,1','7,3','8,4'); else if(mother===1)add('3,3','7,7','8,8'); else if(mother===2)add('3,5','7,11','8,12');
      else if(mother===3)add('3,7'); else if(mother===4)add('3,9'); else if(mother===5)add('3,11'); else if(mother===6)add('3,13');
    }else if(father===2){
      if(mother===0)add('5,1','11,3','12,4'); else if(mother===1)add('5,3','11,7','12,8'); else if(mother===2)add('5,5','11,11','12,12');
      else if(mother===3)add('5,7'); else if(mother===4)add('5,9'); else if(mother===5)add('5,11'); else if(mother===6)add('5,13');
    }else if(father===3&&mother<=6)add('7,'+(mother*2+1));
    else if(father===4&&mother<=6)add('9,'+(mother*2+1));
    else if(father===5&&mother<=6)add('11,'+(mother*2+1));
    else if(father===6&&mother<=6)add('13,'+(mother*2+1));
    return out;
  }

  const preparedAncestorCache=new WeakMap();
  function prepareAncestor(a){
    if(!Array.isArray(a))return{canon:[],key:[]};
    const sig=a.map(x=>String(x??'')).join('\u001f');
    const got=preparedAncestorCache.get(a);
    if(got&&got.sig===sig)return got.value;
    const value={canon:a.map(canon),key:a.map(key)};
    preparedAncestorCache.set(a,{sig,value});
    return value;
  }

  function collectRawCrosses(sire,mare){
    if(!sire||!mare||!validAnc(sire.ancestor)||!validAnc(mare.ancestor))return[];
    const sa=sire.ancestor,ma=mare.ancestor,S=prepareAncestor(sa),M=prepareAncestor(ma),sireName=canon(sire.name),out=[];
    for(let i=0;i<ma.length;i++){
      if(sireName&&sireName===M.canon[i])out.push({name:ma[i],sireGen:1,mareGen:depth(i),sireIndex:-1,mareIndex:i,directSire:true});
      for(let j=0;j<sa.length;j++){
        if(S.canon[j]&&S.canon[j]===M.canon[i])out.push({name:sa[j],sireGen:depth(j),mareGen:depth(i),sireIndex:j,mareIndex:i,directSire:false});
      }
    }
    return out;
  }

  function danger(sire,mare){
    const sa=sire?.ancestor||[],ma=mare?.ancestor||[];
    if(!validAnc(sa)||!validAnc(ma))return{available:false,inbreedCount:0,kiken:false,tyokiken:false,dangerous:false,effectiveCrosses:[],rawCrosses:[],reason:'15祖先不足'};
    const S=prepareAncestor(sa),M=prepareAncestor(ma),sireName=canon(sire?.name),blocked=new Set(),effective=[],raw=[];let cnt=0,tyokiken=false,stop2=false,direct=null,twoByTwo=null;
    for(let i=0;i<ma.length;i++){
      const directMatch=!!sireName&&sireName===M.canon[i];
      if(directMatch){
        const x={name:ma[i],sireGen:1,mareGen:depth(i),sireIndex:-1,mareIndex:i,directSire:true};
        raw.push(x);tyokiken=true;stop2=true;
        if(!direct)direct=x;
      }
      const allowEffective=!stop2;
      for(let j=0;j<sa.length;j++){
        if(!S.canon[j]||S.canon[j]!==M.canon[i])continue;
        const x={name:sa[j],sireGen:depth(j),mareGen:depth(i),sireIndex:j,mareIndex:i,directSire:false};
        raw.push(x);
        if(!allowEffective||blocked.has(j+','+i))continue;
        cnt++;effective.push(x);
        if(i===0&&j===0){tyokiken=true;if(!twoByTwo)twoByTwo=x}
        for(const lock of descendantLocks(i,j))blocked.add(lock);
      }
    }
    const kiken=cnt>6;
    const reasons=[];
    if(direct)reasons.push(`${direct.name} 1×${direct.mareGen}`);
    if(twoByTwo)reasons.push(`${twoByTwo.name} 2×2`);
    if(kiken)reasons.push(`有効クロス${cnt}本`);
    return{available:true,inbreedCount:cnt,kiken,tyokiken,dangerous:kiken||tyokiken,effectiveCrosses:effective,rawCrosses:raw,directSireCross:direct,twoByTwo,reason:reasons.join(' / ')};
  }

  function theoryFlags(sire,mare){
    const so=String(sire?.omoshiro||''),sm=String(sire?.migoto||''),mo=String(mare?.omoshiro||'');
    const available=validCode(so)&&validCode(sm)&&validCode(mo);
    if(!available)return{available:false,interesting:false,magnificent:false,perfect:false,uniqueSystems:null};
    const uniqueSystems=uniqueCode(so+mo);
    const interesting=uniqueSystems>=7;
    const magnificent=sortedCode(sm)===sortedCode(mo);
    return{available:true,interesting,magnificent,perfect:interesting&&magnificent,uniqueSystems};
  }

  function deriveChild(sire,mare,name){
    if(!sire||!mare||!validAnc(sire.ancestor)||!validAnc(mare.ancestor)||!validCode(sire.omoshiro)||!validCode(mare.omoshiro))return null;
    const sa=sire.ancestor,ma=mare.ancestor;
    const ancestor=[sire.name,sa[0],ma[0],sa[1],sa[2],ma[1],ma[2],sa[3],sa[4],sa[5],sa[6],ma[3],ma[4],ma[5],ma[6]];
    const omoshiro=sire.omoshiro[0]+sire.omoshiro[2]+mare.omoshiro[0]+mare.omoshiro[2];
    const migoto=sire.omoshiro[1]+sire.omoshiro[3]+mare.omoshiro[1]+mare.omoshiro[3];
    return{name:name||`${sire.name}×${mare.name}`,kind:'homebred-derived',ancestor,omoshiro,migoto,omoshiroSystems:decodeCode(omoshiro),migotoSystems:decodeCode(migoto),theorySource:'parent-code-inheritance'};
  }

  function deriveChildAncestor(sireName,sa,ma){
    if(!sireName||!validAnc(sa)||!validAnc(ma))return null;
    return[sireName,sa[0],ma[0],sa[1],sa[2],ma[1],ma[2],sa[3],sa[4],sa[5],sa[6],ma[3],ma[4],ma[5],ma[6]];
  }

  function create(config={}){
    const effects=config.effects||[];
    const effectMap=new Map(effects.map(x=>[key(x.name),x]));
    const pairSet=new Map();
    for(const p of config.elaboratePairs||[]){
      const k=key(p.a)+'|'+key(p.b);if(!pairSet.has(k))pairSet.set(k,p);
    }
    const directSet=new Map();
    for(const p of config.directElaboratePairs||[]){
      const sire=p.sire??p.a,mare=p.mare??p.b,k=key(sire)+'|'+key(mare);if(!directSet.has(k))directSet.set(k,p);
    }
    const knownDiff=new Set((config.elaborateKnownDifferences||[]).map(x=>key(x.sire)+'|'+key(x.mare)));

    function calcNitro(a,b){
      if(!validAnc(a)||!validAnc(b))return null;
      const A=prepareAncestor(a),B=prepareAncestor(b),seen=new Set(),factors=[];let sp=0,st=0,pw=0;
      const names=[...a,...b],keys=[...A.key,...B.key];
      for(let i=0;i<keys.length;i++){
        const k=keys[i];if(!k||seen.has(k))continue;seen.add(k);
        const e=effectMap.get(k);if(!e)continue;
        const name=names[i],dsp=(e.short||0)*2+(e.speed||0),dst=(e.guts||0)+(e.long||0)-(e.short||0),dp=e.power||0;
        sp+=dsp;st+=dst;pw+=dp;
        factors.push({name,dsp,dst,dp,short:e.short||0,speed:e.speed||0,power:e.power||0,guts:e.guts||0,long:e.long||0});
      }
      return{sp,st,pw,factorCount:factors.length,factors};
    }

    function elaborate(sire,mare,dangerResult){
      if(!sire||!mare||!validAnc(sire.ancestor)||!validAnc(mare.ancestor))return{available:false,raw:false,effective:false,evidence:[],knownDifference:false};
      const evidence=[],S=prepareAncestor(sire.ancestor),M=prepareAncestor(mare.ancestor);
      const directKey=key(sire.name)+'|'+key(mare.name),direct=directSet.get(directKey);
      if(direct)evidence.push({kind:'direct-exception',source:'upstream-kakutei',sire:sire.name,mare:mare.name,raw:direct.raw||null});
      for(let i=0;i<7;i++)for(let j=0;j<7;j++){
        const p=pairSet.get(S.key[i]+'|'+M.key[j]);
        if(p)evidence.push({kind:'confirmed-pair',source:'kotta-pairs',a:p.a,b:p.b,sireAncestorIndex:i,mareAncestorIndex:j});
      }
      const dedup=[],seen=new Set();
      for(const e of evidence){const k=JSON.stringify([e.kind,e.sire,e.mare,e.a,e.b,e.sireAncestorIndex,e.mareAncestorIndex]);if(!seen.has(k)){seen.add(k);dedup.push(e)}}
      const raw=dedup.length>0,d=dangerResult||danger(sire,mare),effective=raw&&!d.kiken&&!d.tyokiken;
      return{available:true,raw,effective,evidence:dedup,knownDifference:knownDiff.has(directKey),invalidatedByDanger:raw&&!effective};
    }

    function evaluate(sire,mare){
      const d=danger(sire,mare),t=theoryFlags(sire,mare),e=elaborate(sire,mare,d),n=calcNitro(sire?.ancestor,mare?.ancestor),child=deriveChild(sire,mare);
      return{sire:sire?.name||'',mare:mare?.name||'',danger:d,theory:t,elaborate:e,nitro:n,child};
    }

    return{version:1,canon,key,depth,decodeCode,encodeSystems,calcNitro,danger,theoryFlags,deriveChild,deriveChildAncestor,elaborate,evaluate};
  }

  return{version:1,SYSTEM_BY_CHAR,CHAR_BY_SYSTEM,canon,key,depth,decodeCode,encodeSystems,collectRawCrosses,descendantLocks,danger,theoryFlags,deriveChild,deriveChildAncestor,create};
});
