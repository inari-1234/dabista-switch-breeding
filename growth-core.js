(function(root,factory){
  const api=factory(
    typeof module==='object'&&module.exports?require('./growth-model.js'):root.DABISTA_GROWTH_MODEL
  );
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DABISTA_GROWTH_CORE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(model){
'use strict';

const MARK_ORDER={'不明':0,'－':1,'△':2,'▲':3,'○':4,'◎':5};
const REL_ORDER={below:0,equal:1,above:2};

function validAgeMonth(x){
  const age=Number(x?.age),month=Number(x?.month);
  return Number.isInteger(age)&&age>=2&&age<=10&&Number.isInteger(month)&&month>=1&&month<=12;
}
function monthIndex(x){return validAgeMonth(x)?Number(x.age)*12+Number(x.month):null}
function ageMonthLabel(x){return validAgeMonth(x)?Number(x.age)+'歳'+Number(x.month)+'月':'年月不明'}
function sortObs(a,b){
  const d=monthIndex(a)-monthIndex(b);
  if(d)return d;
  const oa=Number(a.observationOrder??a.order??0),ob=Number(b.observationOrder??b.order??0);
  if(oa!==ob)return oa-ob;
  return String(a.id||'').localeCompare(String(b.id||''));
}
function monthsBetween(a,b){
  const x=monthIndex(a),y=monthIndex(b);
  return x==null||y==null?null:Math.max(0,y-x);
}
function usableRace(r){const m=String(r?.mark4||'不明');return validAgeMonth(r)&&m!=='不明'&&Object.prototype.hasOwnProperty.call(MARK_ORDER,m)}
function usableCheck(c){return validAgeMonth(c)&&c?.setId&&Number.isInteger(Number(c.setRevision))}

function researchSetMap(sets){
  const m=new Map();
  for(const s of sets||[])if(s?.id)m.set(String(s.id)+'@'+Number(s.revision||1),s);
  return m;
}
function conditionsMatch(check,set){
  if(!set)return false;
  const revision=Number(check.setRevision);
  if(revision!==Number(set.revision||1))return false;
  if(check.conditionFingerprint&&set.conditionFingerprint&&check.conditionFingerprint!==set.conditionFingerprint)return false;
  return true;
}
function comparisonMap(check){
  const m=new Map();
  for(const x of check?.comparisons||[])if(x?.baselineId&&Object.prototype.hasOwnProperty.call(REL_ORDER,x.result))m.set(String(x.baselineId),x.result);
  return m;
}
function sameMonthResearchConflict(group){
  const seen=new Map();
  for(const c of group){
    const scope=String(c.setId)+'@'+Number(c.setRevision);
    for(const [id,result] of comparisonMap(c)){
      const key=scope+'|'+id;
      if(!seen.has(key))seen.set(key,new Set());
      seen.get(key).add(result);
    }
    const m4=String(c.mark4||'');
    if(m4&&m4!=='不明'){
      const key=scope+'|__mark4';
      if(!seen.has(key))seen.set(key,new Set());
      seen.get(key).add(m4);
    }
    const m5=String(c.mark5||'');
    if(m5&&m5!=='不明'){
      const key=scope+'|__mark5';
      if(!seen.has(key))seen.set(key,new Set());
      seen.get(key).add(m5);
    }
  }
  return [...seen.values()].some(s=>s.size>1);
}
function sameMonthRaceConflict(group){
  const known=x=>{const v=String(x||'不明');return v&&v!=='不明'?v:null};
  const m4=new Set(group.map(x=>known(x.mark4)).filter(Boolean));
  const m5=new Set(group.map(x=>known(x.mark5)).filter(Boolean));
  return m4.size>1||m5.size>1;
}
function mergeResearchScope(items){
  const sorted=[...(items||[])].sort(sortObs),base={...(sorted.at(-1)||{})},merged=new Map();
  for(const item of sorted)for(const [id,result] of comparisonMap(item))if(!merged.has(id))merged.set(id,result);
  base.comparisons=[...merged].map(([baselineId,result])=>({baselineId,result}));
  for(const key of ['mark4','mark5']){
    const values=[...new Set(sorted.map(x=>String(x?.[key]||'')).filter(v=>v&&v!=='不明'))];
    base[key]=values.length===1?values[0]:'';
  }
  return base;
}
function mergeRaceMonth(items){
  const sorted=[...(items||[])].sort(sortObs),base={...(sorted.at(-1)||{})};
  for(const key of ['mark4','mark5']){
    const values=[...new Set(sorted.map(x=>String(x?.[key]||'')).filter(v=>v&&v!=='不明'))];
    base[key]=values.length===1?values[0]:'不明';
  }
  return base;
}
function groupByMonth(list){
  const m=new Map();
  for(const x of [...list].sort(sortObs)){
    const k=monthIndex(x);
    if(k==null)continue;
    if(!m.has(k))m.set(k,[]);
    m.get(k).push(x);
  }
  return [...m.entries()].sort((a,b)=>a[0]-b[0]).map(([index,items])=>({index,items}));
}

function latestResearchSignal(checks,sets){
  const setMap=researchSetMap(sets);
  const valid=(checks||[]).filter(usableCheck).filter(c=>conditionsMatch(c,setMap.get(String(c.setId)+'@'+Number(c.setRevision))));
  if(!valid.length)return null;
  const groups=groupByMonth(valid);
  const latest=groups.at(-1),latestRef=latest.items.at(-1);
  const sameScope=x=>String(x.setId)===String(latestRef.setId)&&Number(x.setRevision)===Number(latestRef.setRevision);
  const latestScope=latest.items.filter(sameScope);
  if(sameMonthResearchConflict(latestScope))return{
    kind:'hold',mode:'research',confidence:'高',reason:'同月の固定比較セット結果が一致しない',latest:latestRef,gapMonths:null
  };
  const b=mergeResearchScope(latestScope);

  for(let gi=groups.length-2;gi>=0;gi--){
    const prevScope=groups[gi].items.filter(sameScope);
    if(!prevScope.length||sameMonthResearchConflict(prevScope))continue;
    const a=mergeResearchScope(prevScope);
    const A=comparisonMap(a),B=comparisonMap(b),changes=[];
    for(const [id,after] of B){
      const before=A.get(id);
      if(before==null)continue;
      changes.push({baselineId:id,before,after,delta:REL_ORDER[after]-REL_ORDER[before]});
    }
    const a4=String(a.mark4||''),b4=String(b.mark4||'');
    const mark4Comparable=a4&&b4&&a4!=='不明'&&b4!=='不明'&&Object.prototype.hasOwnProperty.call(MARK_ORDER,a4)&&Object.prototype.hasOwnProperty.call(MARK_ORDER,b4);
    const mark4Delta=mark4Comparable?MARK_ORDER[b4]-MARK_ORDER[a4]:0;
    if(!changes.length){
      if(mark4Delta>0)return{kind:'growth-change',mode:'research',confidence:'高',reason:'同一比較セットで④が改善方向',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes:[],mark4:{before:a4,after:b4}};
      if(mark4Delta<0)return{kind:'decline',mode:'research',confidence:'高',reason:'同一比較セットで④が低下方向',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes:[],mark4:{before:a4,after:b4}};
      continue;
    }
    const up=changes.filter(x=>x.delta>0),down=changes.filter(x=>x.delta<0);
    if(up.length&&down.length)return{kind:'hold',mode:'research',confidence:'高',reason:'基準馬比較が改善・悪化で混在',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes};
    if(up.length)return{kind:'growth-change',mode:'research',confidence:'高',reason:'同一比較セットで基準馬との序列を上げた',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes:up};
    if(down.length)return{kind:'decline',mode:'research',confidence:'高',reason:'同一比較セットで基準馬との序列を下げた',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes:down};
    if(mark4Delta>0)return{kind:'growth-change',mode:'research',confidence:'高',reason:'同一比較セットで④が改善方向',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes,mark4:{before:a4,after:b4}};
    if(mark4Delta<0)return{kind:'decline',mode:'research',confidence:'高',reason:'同一比較セットで④が低下方向',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes,mark4:{before:a4,after:b4}};
    return{kind:'stall',mode:'research',confidence:'高',reason:'同一比較セットで序列・④の変化を観測しない',previous:a,latest:b,gapMonths:monthsBetween(a,b),changes};
  }
  return{kind:'insufficient',mode:'research',confidence:'参考',reason:'同一条件で比較できる過去観測が不足',latest:b,gapMonths:null};
}

function latestRaceSignal(races){
  const valid=(races||[]).filter(usableRace);
  if(!valid.length)return null;
  const groups=groupByMonth(valid),latest=groups.at(-1);
  if(sameMonthRaceConflict(latest.items))return{
    kind:'hold',mode:'normal',confidence:'参考',reason:'同月の通常レース印が一致しない',latest:latest.items.at(-1),gapMonths:null
  };
  const b=mergeRaceMonth(latest.items);
  if(groups.length<2)return{kind:'insufficient',mode:'normal',confidence:'参考',reason:'年月付き通常レースが1時点のみ',latest:b,gapMonths:null};
  let prevGroup=null;
  for(let i=groups.length-2;i>=0;i--){if(!sameMonthRaceConflict(groups[i].items)){prevGroup=groups[i];break}}
  if(!prevGroup)return{kind:'insufficient',mode:'normal',confidence:'参考',reason:'比較可能な過去月が不足',latest:b,gapMonths:null};
  const a=mergeRaceMonth(prevGroup.items),d4=MARK_ORDER[String(b.mark4)]-MARK_ORDER[String(a.mark4)];
  const a5=String(a.mark5||'不明'),b5=String(b.mark5||'不明');
  const d5=a5!=='不明'&&b5!=='不明'&&Object.prototype.hasOwnProperty.call(MARK_ORDER,a5)&&Object.prototype.hasOwnProperty.call(MARK_ORDER,b5)?MARK_ORDER[b5]-MARK_ORDER[a5]:0;
  if(d4>0)return{kind:'progress',mode:'normal',confidence:'参考',reason:'④が前回観測より改善方向',previous:a,latest:b,gapMonths:monthsBetween(a,b),mark4:{before:a.mark4,after:b.mark4},mark5:{before:a.mark5,after:b.mark5}};
  if(d4<0)return{kind:'decline',mode:'normal',confidence:'参考',reason:'④が前回観測より低下方向',previous:a,latest:b,gapMonths:monthsBetween(a,b)};
  if(d5!==0)return{kind:'mixed',mode:'normal',confidence:'参考',reason:'④は同等だが⑤が変化',previous:a,latest:b,gapMonths:monthsBetween(a,b)};
  return{kind:'stall',mode:'normal',confidence:'参考',reason:'前回観測から④⑤の変化を観測しない',previous:a,latest:b,gapMonths:monthsBetween(a,b)};
}

function reached(age,month,target){
  if(!target||!Number.isInteger(Number(age))||!Number.isInteger(Number(month)))return false;
  return Number(age)*12+Number(month)>=Number(target.age)*12+Number(target.month);
}
function growthTypeInfo(horse){
  return model?.inferCandidates?model.inferCandidates(horse||{}):{candidates:[],confidence:'データ不足',basis:[]};
}
function abilityReferenceZones(horse,typeInfo){
  const age=Number(horse?.currentAge),month=Number(horse?.currentMonth);
  if(!Number.isInteger(age)||!Number.isInteger(month)||typeInfo.candidates.length!==1)return null;
  const type=typeInfo.candidates[0],milestone=model?.milestoneFor?.(type);
  if(!milestone)return null;
  return{
    type,
    speedOpen:milestone.speedOpen||null,
    fullOpen:milestone.fullOpen||null,
    speedOpenReached:!!milestone.speedOpen&&reached(age,month,milestone.speedOpen),
    fullOpenReached:!!milestone.fullOpen&&reached(age,month,milestone.fullOpen),
    source:milestone.source
  };
}
function completionZone(horse,typeInfo){
  const z=abilityReferenceZones(horse,typeInfo);
  if(!z?.fullOpenReached)return null;
  return{type:z.type,target:z.fullOpen,label:z.type+'の全開目安以降（参考）',source:z.source};
}
function publicState(signal,zone){
  if(!signal)return zone?{key:'completion-zone-candidate',label:'完成域候補'}:{key:'data-insufficient',label:'データ不足'};
  if(signal.kind==='hold'||signal.kind==='mixed')return{key:'hold',label:'判定保留'};
  if(signal.kind==='growth-change')return{key:'growth-change',label:'成長変化あり'};
  if(signal.kind==='progress')return{key:'growth-progressing',label:'成長途中'};
  if(signal.kind==='stall')return zone?{key:'completion-zone-candidate',label:'完成域候補'}:{key:'observed-stall',label:'観測上の停滞'};
  if(signal.kind==='insufficient')return zone?{key:'completion-zone-candidate',label:'完成域候補'}:{key:'data-insufficient',label:'データ不足'};
  return{key:'hold',label:'判定保留'};
}
function raceAdvice(state,signal,condition={}){
  const fatigue=String(condition?.fatigue||'unknown');
  const highFatigue=fatigue==='high'||fatigue==='大'||fatigue==='疲労大';
  if(highFatigue)return{key:'recover-first',label:'状態回復待ち',abilityAdvice:state.key==='growth-change'?'1段上候補':state.key==='growth-progressing'?'同格で確認':'待つ'};
  if(state.key==='growth-change'&&signal?.confidence==='高')return{key:'one-step-up',label:'1段上候補'};
  if(state.key==='growth-progressing')return{key:'same-class-check',label:'同格で確認'};
  if(state.key==='observed-stall')return{key:'same-class-check',label:'同格で確認'};
  if(state.key==='completion-zone-candidate'&&signal&&signal.kind!=='insufficient')return{key:'same-class-check',label:'同格で確認'};
  return{key:'wait',label:'待つ'};
}

function diagnose(input={}){
  const horse=input.horse||{};
  const typeInfo=growthTypeInfo(horse);
  const zones=abilityReferenceZones(horse,typeInfo),zone=completionZone(horse,typeInfo);
  const research=latestResearchSignal(input.growthChecks||[],input.growthCheckSets||[]);
  const normal=latestRaceSignal(input.races||[]);
  const signal=research&&research.kind!=='insufficient'?research:(normal||research);
  const state=publicState(signal,zone);
  const confidence=signal?.confidence||(zone?'参考':'参考');
  return{
    state,
    confidence,
    reason:signal?.reason||(zone?zone.label:'比較できる観測が不足'),
    signal,
    growthType:typeInfo,
    completionZone:zone,
    abilityReferenceZones:zones,
    raceAdvice:raceAdvice(state,signal,input.currentCondition||horse.currentCondition||{}),
    previousComparisonMonths:signal?.gapMonths??null
  };
}

return{
  MARK_ORDER,REL_ORDER,validAgeMonth,monthIndex,ageMonthLabel,monthsBetween,
  latestResearchSignal,latestRaceSignal,growthTypeInfo,abilityReferenceZones,completionZone,mergeResearchScope,mergeRaceMonth,diagnose
};
});
