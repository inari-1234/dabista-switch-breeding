'use strict';

function rawSig(h){
  const a=Array.isArray(h?.ancestor)?h.ancestor:[];
  return String(h?.name??'')+'\u001f'+a.map(x=>String(x??'')).join('\u001f');
}
function makePrepared(canon,key){
  const cache=new WeakMap();let builds=0,hits=0,invalidations=0;
  function prep(h){
    if(!h||typeof h!=='object')return{nameCanon:'',ancCanon:[],ancKey:[]};
    const sig=rawSig(h),got=cache.get(h);
    if(got&&got.sig===sig){hits++;return got.value}
    if(got)invalidations++;
    builds++;
    const a=Array.isArray(h.ancestor)?h.ancestor:[];
    const value={nameCanon:canon(h.name),ancCanon:a.map(canon),ancKey:a.map(key)};
    cache.set(h,{sig,value});
    return value;
  }
  return{prep,stats:()=>({builds,hits,invalidations})};
}
const canon=s=>String(s??'').normalize('NFKC').trim();
const key=s=>canon(s).replace(/[\s・･]/g,'').toLowerCase();
const P=makePrepared(canon,key);
const horse={name:' テスト馬 ',ancestor:Array.from({length:15},(_,i)=>' A '+i)};
const a=P.prep(horse);
const b=P.prep(horse);
if(a!==b)throw Error('unchanged horse should reuse prepared value');
if(P.stats().hits!==1)throw Error('cache hit missing');

horse.ancestor[14]='変更';
const c=P.prep(horse);
if(c===b||c.ancKey[14]!==key('変更'))throw Error('in-place ancestor mutation not invalidated');

horse.name='改名';
const d=P.prep(horse);
if(d===c||d.nameCanon!==canon('改名'))throw Error('in-place name mutation not invalidated');

horse.ancestor=[...horse.ancestor.slice(0,14),'配列差替'];
const e=P.prep(horse);
if(e===d||e.ancKey[14]!==key('配列差替'))throw Error('ancestor array replacement not invalidated');

const stats=P.stats();
if(stats.builds!==4||stats.invalidations!==3)throw Error('unexpected cache lifecycle '+JSON.stringify(stats));

console.log(JSON.stringify({
  passed:true,
  method:'WeakMap identity cache guarded by raw name+15-ancestor signature',
  stats,
  contract:{
    invalidateOn:['name edit','any ancestor edit','ancestor array replacement'],
    noInvalidateOn:['goal/category/search/filter changes'],
    note:'theory-code changes invalidate Pair Index separately; prepared pedigree cache contains only normalized name/ancestor data'
  }
},null,2));
