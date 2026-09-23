(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DABISTA_GROWTH_MODEL=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const SOURCE={
  kind:'community-switch-comparison',
  official:false,
  precision:'reference-only',
  note:'Switch版プレイヤー比較検証を弱い事前情報として扱い、固定成長率や月ごとの能力加算には使用しない。'
};

const TYPES={
  '超早熟':{key:'ultra-early',fullOpen:null},
  '早熟':{key:'early',fullOpen:null},
  '持続':{key:'persistent',fullOpen:null},
  '普通':{key:'normal',fullOpen:{age:4,month:1}},
  '普通遅':{key:'normal-late',fullOpen:{age:4,month:6}},
  '晩成':{key:'late',speedOpen:{age:4,month:11},fullOpen:{age:5,month:1}},
  '超晩成':{key:'ultra-late',fullOpen:{age:5,month:6}}
};

function validMonth(x){const n=Number(x);return Number.isInteger(n)&&n>=1&&n<=12?n:null}

function inferCandidates(horse={}){
  const manual=String(horse.manualGrowthType||'').trim();
  if(manual&&TYPES[manual])return{candidates:[manual],confidence:'高',basis:['手動指定'],manual:true};

  const entry=validMonth(horse.entryMonth);
  const comment=String(horse.growthComment||'').trim();
  const late=/晩成/.test(comment),early=/早熟/.test(comment);
  let candidates=[];
  if(entry===4)candidates=['超早熟','早熟'];
  else if(entry===5)candidates=['早熟','持続'];
  else if(entry===6||entry===7)candidates=['持続','普通'];
  else if(entry===8)candidates=late?['晩成']:['普通'];
  else if(entry===9)candidates=late?['晩成']:['普通遅'];
  else if(entry===10)candidates=['晩成','超晩成'];
  else if(entry===11)candidates=['超晩成'];

  if(early&&candidates.length)candidates=candidates.filter(x=>x==='超早熟'||x==='早熟'||x==='持続');
  if(late&&candidates.length)candidates=candidates.filter(x=>x==='晩成'||x==='超晩成');
  if(!candidates.length&&late)candidates=['晩成','超晩成'];
  if(!candidates.length&&early)candidates=['超早熟','早熟'];

  const basis=[];
  if(entry)basis.push('入厩月');
  if(comment)basis.push('成長コメント');
  return{
    candidates,
    confidence:candidates.length===1?'中':candidates.length>1?'参考':'データ不足',
    basis,
    manual:false
  };
}

function milestoneFor(type){
  const x=TYPES[type];
  return x?{...x,source:SOURCE}:null;
}

return{SOURCE,TYPES,inferCandidates,milestoneFor};
});
