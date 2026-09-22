'use strict';

function canon(s){return String(s??'').normalize('NFKC').trim()}
function key(s){return canon(s).replace(/[\s・･]/g,'').toLowerCase()}
function makeCache(){
  const cache=new WeakMap();let builds=0,hits=0,invalidations=0;
  function prep(a){
    if(!Array.isArray(a))return{ancCanon:[],ancKey:[]};
    const sig=a.map(x=>String(x??'')).join('\u001f');
    const got=cache.get(a);
    if(got&&got.sig===sig){hits++;return got.value}
    if(got)invalidations++;
    builds++;
    const value={ancCanon:a.map(canon),ancKey:a.map(key)};
    cache.set(a,{sig,value});
    return value;
  }
  return{prep,stats:()=>({builds,hits,invalidations})};
}
const C=makeCache();
const a=Array.from({length:15},(_,i)=>' A '+i);
const p1=C.prep(a),p2=C.prep(a);
if(p1!==p2)throw Error('unchanged ancestor array not reused');
a[3]='変更';
const p3=C.prep(a);
if(p3===p2||p3.ancKey[3]!==key('変更'))throw Error('in-place ancestor mutation not invalidated');
a.splice(5,1,'差替');
const p4=C.prep(a);
if(p4===p3||p4.ancKey[5]!==key('差替'))throw Error('splice mutation not invalidated');
const b=[...a],p5=C.prep(b);
if(p5===p4)throw Error('new ancestor array identity must have separate cache entry');
const stats=C.stats();
if(stats.builds!==4||stats.hits!==1||stats.invalidations!==2)throw Error('unexpected stats '+JSON.stringify(stats));
console.log(JSON.stringify({
  passed:true,
  stats,
  contract:{
    supportsExistingCalcNitroArrayAPI:true,
    catchesInPlaceIndexEdit:true,
    catchesSplice:true,
    separatesNewArrayIdentity:true
  }
},null,2));
