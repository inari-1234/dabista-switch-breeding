(()=>{
'use strict';

const db=window.db,core=window.DABISTA_GROWTH_CORE,growthDb=window.DABISTA_GROWTH_DB;
if(!db||!core)return;
growthDb?.normalizeInPlace(db);

const $=s=>document.querySelector(s);
const esc=window.esc||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const marks=['◎','○','▲','△','－'];
const grades=['G1','G2','G3','OP','その他'];
const quickDistances=[1200,1600,1800,2000,2400];
const finishes=['1','2','3','4–5','6以下'];

function save(){
  window.saveFarm?.();
  window.renderHorses?.();
  window.renderRaces?.();
  decorateHorseCards();
  decorateRaceCards();
}
function horseById(id){return (db.horses||[]).find(h=>String(h.id)===String(id))||null}
function diagnosis(h){
  return core.diagnose({
    horse:h,
    races:(db.races||[]).filter(r=>r.horseId===h.id),
    growthChecks:[],
    growthCheckSets:[],
    currentCondition:h.currentCondition||{}
  });
}
function ageMonth(h){
  return h?.currentAge&&h?.currentMonth?esc(h.currentAge)+'歳'+esc(h.currentMonth)+'月':'現在月未設定';
}
function growthTypeText(d){
  const xs=d?.growthType?.candidates||[];
  if(!xs.length)return'成長型未推定';
  return xs.join(' / ')+'候補'+(d?.growthType?.conflict?'（情報不一致）':'');
}
function abilityReferenceText(d){
  const z=d?.abilityReferenceZones;
  if(!z)return'';
  if(z.fullOpenReached)return z.type+'の全能力全開目安以降（参考・完成確定ではありません）';
  if(z.speedOpenReached)return z.type+'のSP全開目安以降（参考）／全体目安前';
  return'';
}
function datedRaces(h){
  return (db.races||[]).filter(r=>r.horseId===h.id&&core.validAgeMonth(r)).slice().sort((a,b)=>{
    const d=core.monthIndex(a)-core.monthIndex(b);
    if(d)return d;
    return Number(a.observationOrder||0)-Number(b.observationOrder||0);
  });
}
function inferGrade(r){
  const g=String(r?.grade||'').trim();
  if(grades.includes(g))return g;
  const n=String(r?.name||'').toUpperCase();
  if(/G1/.test(n))return'G1';
  if(/G2/.test(n))return'G2';
  if(/G3/.test(n))return'G3';
  if(/\bOP\b/.test(n))return'OP';
  return g||'その他';
}
function weakMark(mark){return (core.MARK_ORDER[String(mark||'不明')]||0)<=2}
function friendlyAdvice(h,d){
  const rs=datedRaces(h),latest=d?.signal?.latest||rs.at(-1)||null;
  const fatigue=String(h?.currentCondition?.fatigue||'unknown');
  if(fatigue==='high'||fatigue==='大'||fatigue==='疲労大')return{key:'recover',label:'状態回復を優先',tone:'warn',reason:'疲労が大きいため、能力変化とは分けて休養を優先します。'};
  if(!rs.length)return{key:'empty',label:'まず1走記録',tone:'neutral',reason:'同じ馬の月ごとの印変化を見て、出走タイミングを判断します。'};
  const kind=d?.signal?.kind||'insufficient';
  if(kind==='progress')return{key:'go',label:'同格なら出走候補',tone:'up',reason:'前回より④印が改善しました。現在使える能力が上がった可能性があります。'};
  if(kind==='decline')return{key:'wait',label:'もう1か月待つ候補',tone:'warn',reason:'前回より④印が低下しています。条件差もあるため、急いで格上げせず再確認します。'};
  if(kind==='mixed'||kind==='hold')return{key:'hold',label:'同条件でもう1走確認',tone:'warn',reason:'印の動きが揃っていないため、同程度の条件でもう一度確認します。'};
  if(kind==='stall'){
    if(weakMark(latest?.mark4))return{key:'wait',label:'もう1か月待つ候補',tone:'warn',reason:'④印がまだ弱く、前回から明確な改善を確認できません。'};
    return{key:'same',label:'同格で確認',tone:'neutral',reason:'印は大きく変わっていません。同程度の条件で現在地を確認します。'};
  }
  if(kind==='insufficient'){
    if(weakMark(latest?.mark4))return{key:'wait',label:'もう1か月待つ候補',tone:'warn',reason:'直近は④印が弱く、月をまたいだ改善確認がまだありません。'};
    return{key:'check',label:'もう1走で確認',tone:'neutral',reason:'年月付きの比較記録がまだ1時点です。次の記録で変化を確認します。'};
  }
  return{key:'hold',label:'判断待ち',tone:'neutral',reason:d?.reason||'比較できる記録が不足しています。'};
}
function recentRaceHtml(h,limit=2){
  const rs=datedRaces(h).slice(-limit).reverse();
  if(!rs.length)return'<div class="growth-empty-line">年月付きレース記録はまだありません</div>';
  return rs.map(r=>'<div class="growth-recent-row"><b>'+esc(core.ageMonthLabel(r))+'</b><span>'+esc(inferGrade(r))+' '+esc(r.distance||'-')+'m</span><span>④'+esc(r.mark4||'不明')+'　⑤'+esc(r.mark5||'不明')+'</span><strong>'+esc(r.finish||'-')+'着</strong></div>').join('');
}
function nextMonth(age,month){
  let a=Number(age),m=Number(month);
  if(!Number.isInteger(a)||!Number.isInteger(m))return{age:a||'',month:m||''};
  m++;if(m>12){m=1;a++}
  return{age:a,month:m};
}
function selectOptions(from,to,value,labelSuffix){
  let out='<option value="">選択</option>';
  for(let i=from;i<=to;i++)out+='<option value="'+i+'"'+(Number(value)===i?' selected':'')+'>'+i+(labelSuffix||'')+'</option>';
  return out;
}
function markDelta(prev,cur){
  if(!prev||!cur)return null;
  const a=core.MARK_ORDER[String(prev.mark4||'不明')]||0,b=core.MARK_ORDER[String(cur.mark4||'不明')]||0;
  if(b>a)return'印改善';
  if(b<a)return'印低下';
  return'横ばい';
}

function ensureStyle(){
  if($('#growthTrackingStyle'))return;
  const s=document.createElement('style');s.id='growthTrackingStyle';s.textContent=[
  '.growth-mini{margin-top:10px;padding:11px 12px;border-radius:13px;background:#f4f7f5;border:1px solid #dce7e1}',
  '.growth-mini-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.growth-mini b{font-size:12px}.growth-mini small{display:block;color:#67776e;font-size:9px;line-height:1.45;margin-top:2px}',
  '.growth-state{font-size:9px;font-weight:900;padding:4px 7px;border-radius:999px;background:#e6eee9;color:#315643;white-space:nowrap}.growth-state.up{background:#e4f3e8;color:#24643a}.growth-state.warn{background:#fff0e5;color:#965229}',
  '.growth-advice{margin-top:8px;padding:9px 10px;border-radius:10px;background:#fff;border:1px solid #e1e9e5}.growth-advice b{display:block;font-size:13px}.growth-advice.up{background:#edf8f0;border-color:#cbe5d2}.growth-advice.warn{background:#fff4ef;border-color:#efd6ca}',
  '.growth-card-actions{display:grid;grid-template-columns:1fr;gap:7px;margin-top:9px}.growth-card-actions button{min-height:44px;font-size:11px;font-weight:900}',
  '.growth-recent-list{display:grid;gap:5px;margin-top:8px}.growth-recent-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:7px;align-items:center;padding:7px 8px;border-radius:9px;background:#fff;font-size:9px}.growth-recent-row strong{font-size:10px}.growth-empty-line{padding:9px;color:#75847c;text-align:center;font-size:10px}',
  '.growth-race-date{display:block;font-size:8px;color:#708078;margin-top:2px}.growth-race-diagnosis{margin:6px 0 8px;padding:8px 9px;border-radius:9px;background:#f4f7f5;font-size:10px;line-height:1.45}',
  '#growthHistoryDlg,#growthQuickRaceDlg{width:min(620px,calc(100vw - 16px));max-height:92dvh;border:0;border-radius:18px;padding:0;overflow:hidden}',
  '.growth-dialog{max-height:92dvh;overflow:auto;padding:14px;padding-bottom:78px}.growth-dialog-head{position:sticky;top:-14px;z-index:5;background:rgba(255,255,255,.98);padding:13px 0 10px;border-bottom:1px solid #e1e8e4;display:flex;justify-content:space-between;align-items:center;gap:8px}.growth-dialog-head h2{font-size:19px;margin:0}',
  '.growth-section{margin-top:12px;padding-top:10px;border-top:1px solid #e2e9e5}.growth-section h3{font-size:13px;margin:0 0 7px}.growth-help{font-size:10px;color:#66766e;line-height:1.55}',
  '.growth-dialog-actions{position:sticky;bottom:-78px;z-index:5;display:grid;grid-template-columns:auto 1fr;gap:7px;background:rgba(255,255,255,.98);border-top:1px solid #e1e8e4;padding:10px 14px calc(10px + env(safe-area-inset-bottom));margin:16px -14px -78px}.growth-dialog-actions .primary{width:100%}',
  '.growth-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.growth-kpis{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}.growth-kpi{padding:9px;border-radius:10px;background:#f4f7f5}.growth-kpi b{display:block;font-size:13px}.growth-kpi small{font-size:9px;color:#6a7971}',
  '.growth-timeline{display:grid;gap:7px}.growth-observation{padding:9px 10px;background:#f6f8f7;border-radius:10px;line-height:1.45}.growth-observation-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.growth-observation-meta{font-size:10px;color:#617269;margin-top:3px}.growth-observation-marks{font-size:11px;margin-top:5px}.growth-change-chip{font-size:8px;font-weight:900;padding:3px 6px;border-radius:999px;background:#e8efeb;color:#496257}.growth-change-chip.up{background:#e3f3e7;color:#226238}.growth-change-chip.down{background:#fff0e8;color:#97552f}',
  '.growth-choice-group{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.growth-choice{min-height:42px;padding:7px 4px;border-radius:10px;border:1px solid #d8e4dd;background:#fff;color:#365849;font-weight:900;font-size:11px}.growth-choice.on{border-color:#15825f;background:#e8f5ef;color:#0d6b4d;box-shadow:inset 0 0 0 1px #15825f}',
  '.growth-quick-date{display:grid;grid-template-columns:1fr 1fr;gap:8px}.growth-quick-date select{min-height:44px}.growth-horse-readonly{padding:10px 11px;border-radius:10px;background:#f4f7f5;font-weight:900}.growth-custom-distance{margin-top:7px}.growth-custom-distance[hidden]{display:none!important}',
  '.growth-settings-details{margin-top:14px;border-top:1px solid #e2e9e5;padding-top:10px}.growth-settings-details summary{font-size:11px;font-weight:900;color:#476356;cursor:pointer}.growth-settings-body{margin-top:9px}.growth-settings-body select{width:100%}',
  '@media(max-width:520px){.growth-two{grid-template-columns:1fr}.growth-choice-group{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.growth-choice{font-size:10px;padding:7px 2px}.growth-recent-row{grid-template-columns:auto 1fr auto}.growth-recent-row strong{grid-column:3}.growth-kpis{grid-template-columns:1fr 1fr}.growth-card-actions button{min-height:46px;font-size:12px}}'
  ].join('');document.head.appendChild(s);
}

function growthTrackable(h){
  if(!h)return false;
  if(h.role==='stallion')return false;
  if(h.role==='broodmare'&&!h.routeSource)return false;
  if(String(h.generation||'').includes('基準種牡馬'))return false;
  return true;
}
function syncCardLine(card,html){
  let x=card.querySelector('.growth-mini');
  if(!x){x=document.createElement('div');x.className='growth-mini';card.appendChild(x)}
  if(x.innerHTML!==html)x.innerHTML=html;
}
function decorateHorseCards(){
  document.querySelectorAll('#horseList [data-id]').forEach(card=>{
    const h=horseById(card.dataset.id);if(!h)return;
    if(!growthTrackable(h)){card.querySelector('.growth-mini')?.remove();return}
    const d=diagnosis(h),a=friendlyAdvice(h,d),stateClass=a.tone==='up'?'up':a.tone==='warn'?'warn':'';
    const html='<div class="growth-mini-head"><div><b>今月の出走判断</b><small>'+esc(ageMonth(h))+' ｜ '+esc(growthTypeText(d))+'</small></div><span class="growth-state '+stateClass+'">'+esc(a.label)+'</span></div>'+
      '<div class="growth-advice '+stateClass+'"><b>'+esc(a.label)+'</b><small>'+esc(a.reason)+'</small></div>'+
      '<div class="growth-recent-list">'+recentRaceHtml(h,2)+'</div>'+
      '<div class="growth-card-actions"><button type="button" class="primary" data-horse-action="growth-record" data-horse-id="'+esc(h.id)+'">＋ 今月のレースを記録</button><button type="button" class="secondary" data-horse-action="growth-history" data-horse-id="'+esc(h.id)+'">成長履歴を見る</button></div>';
    syncCardLine(card,html);
  });
}
function installHorseObserver(){
  const list=$('#horseList');if(!list)return;
  new MutationObserver(()=>decorateHorseCards()).observe(list,{childList:true,subtree:false});
  list.addEventListener('click',e=>{
    const b=e.target.closest('[data-horse-action]');if(!b)return;
    e.preventDefault();e.stopPropagation();
    const h=horseById(b.dataset.horseId);if(!h)return;
    if(b.dataset.horseAction==='growth-record')openRecord(h);
    if(b.dataset.horseAction==='growth-history')openHistory(h);
  });
  decorateHorseCards();
}
function decorateRaceCards(){
  document.querySelectorAll('#raceCards [data-race-horse-id]').forEach(card=>{
    const h=horseById(card.dataset.raceHorseId);if(!h)return;
    if(!growthTrackable(h)){card.querySelector('.growth-race-diagnosis')?.remove();return}
    const d=diagnosis(h),a=friendlyAdvice(h,d);
    const html='<b>出走判断：'+esc(a.label)+'</b>｜'+esc(a.reason);
    let x=card.querySelector('.growth-race-diagnosis');
    if(!x){x=document.createElement('div');x.className='growth-race-diagnosis';const table=card.querySelector('table');if(table)table.insertAdjacentElement('beforebegin',x);else card.appendChild(x)}
    if(x.innerHTML!==html)x.innerHTML=html;
  });
}
function installRaceObserver(){
  const list=$('#raceCards');if(!list)return;
  new MutationObserver(()=>decorateRaceCards()).observe(list,{childList:true,subtree:false});
  decorateRaceCards();
}

let activeHorse=null;
const quickState={grade:'',distance:'',mark4:'',mark5:'',finish:''};
function choiceHtml(name,values){
  return'<div class="growth-choice-group" data-growth-choice-group="'+name+'">'+values.map(v=>'<button type="button" class="growth-choice" data-growth-choice="'+name+'" data-value="'+esc(v)+'">'+esc(v)+'</button>').join('')+'</div>';
}
function setChoice(name,value){
  quickState[name]=String(value||'');
  document.querySelectorAll('[data-growth-choice="'+name+'"]').forEach(b=>b.classList.toggle('on',String(b.dataset.value)===String(quickState[name])));
  if(name==='distance'){
    const custom=$('#growthCustomDistanceWrap');
    if(custom)custom.hidden=quickState.distance!=='その他';
  }
}
function ensureDialogs(){
  if(!$('#growthHistoryDlg')){
    const d=document.createElement('dialog');d.id='growthHistoryDlg';
    d.innerHTML='<div class="growth-dialog"><div class="growth-dialog-head"><h2 id="growthHistoryTitle">成長履歴</h2><button type="button" class="secondary" data-growth-close>閉じる</button></div><div id="growthHistoryBody"></div></div>';
    document.body.appendChild(d);d.querySelectorAll('[data-growth-close]').forEach(b=>b.onclick=()=>d.close());
  }
  if(!$('#growthQuickRaceDlg')){
    const d=document.createElement('dialog');d.id='growthQuickRaceDlg';
    d.innerHTML='<div class="growth-dialog"><div class="growth-dialog-head"><h2>今月のレースを記録</h2><button type="button" class="secondary" data-growth-quick-close>閉じる</button></div>'+
    '<div id="growthQuickHorseRow"></div>'+
    '<div class="growth-section"><h3>年月</h3><div class="growth-quick-date"><select id="growthQuickAge"></select><select id="growthQuickMonth"></select></div><p class="growth-help">前回記録が現在月と同じなら、次の月を自動候補にします。</p></div>'+
    '<div class="growth-section"><h3>レース格</h3>'+choiceHtml('grade',grades)+'</div>'+
    '<div class="growth-section"><h3>距離</h3>'+choiceHtml('distance',quickDistances.map(String).concat(['その他']))+'<div id="growthCustomDistanceWrap" class="growth-custom-distance" hidden><select id="growthCustomDistance">'+Array.from({length:27},(_,i)=>1000+i*100).map(v=>'<option value="'+v+'">'+v+'m</option>').join('')+'</select></div></div>'+
    '<div class="growth-section"><h3>④印</h3>'+choiceHtml('mark4',marks)+'</div>'+
    '<div class="growth-section"><h3>⑤印</h3>'+choiceHtml('mark5',marks)+'</div>'+
    '<div class="growth-section"><h3>着順</h3>'+choiceHtml('finish',finishes)+'</div>'+
    '<div class="growth-dialog-actions"><button type="button" class="secondary" data-growth-quick-close>取消</button><button type="button" class="primary" id="saveGrowthQuickRace">この内容で保存</button></div></div>';
    document.body.appendChild(d);
    d.querySelectorAll('[data-growth-quick-close]').forEach(b=>b.onclick=()=>d.close());
    d.addEventListener('click',e=>{
      const b=e.target.closest('[data-growth-choice]');if(!b)return;
      setChoice(b.dataset.growthChoice,b.dataset.value);
    });
    $('#saveGrowthQuickRace').onclick=saveQuickRace;
  }
}
function fillQuickDefaults(h,showHorsePicker){
  activeHorse=h;
  const row=$('#growthQuickHorseRow');
  if(showHorsePicker){
    const candidates=(db.horses||[]).filter(growthTrackable);
    row.innerHTML='<div class="growth-section" style="border-top:0;padding-top:0"><h3>馬</h3><select id="growthQuickHorse">'+candidates.map(x=>'<option value="'+esc(x.id)+'"'+(h&&x.id===h.id?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>';
    $('#growthQuickHorse').onchange=()=>fillQuickDefaults(horseById($('#growthQuickHorse').value),true);
  }else row.innerHTML='<div class="growth-horse-readonly">'+esc(h.name)+'</div>';

  const rs=datedRaces(h),last=rs.at(-1)||null;
  let age=Number(h.currentAge)||'',month=Number(h.currentMonth)||'';
  if(last&&age&&month&&Number(last.age)===age&&Number(last.month)===month){
    const n=nextMonth(age,month);age=n.age;month=n.month;
  }
  $('#growthQuickAge').innerHTML=selectOptions(2,10,age,'歳');
  $('#growthQuickMonth').innerHTML=selectOptions(1,12,month,'月');
  setChoice('grade',last?inferGrade(last):'');
  const lastD=Number(last?.distance)||1600;
  if(quickDistances.includes(lastD))setChoice('distance',String(lastD));
  else{setChoice('distance','その他');$('#growthCustomDistance').value=String(lastD||1600)}
  setChoice('mark4','');setChoice('mark5','');setChoice('finish','');
}
function openRecord(h){
  ensureDialogs();
  const candidates=(db.horses||[]).filter(growthTrackable);
  if(!candidates.length){alert('育成中の登録馬がありません');return}
  const target=h&&growthTrackable(h)?h:candidates[0];
  fillQuickDefaults(target,!h);
  if(!$('#growthQuickRaceDlg').open)$('#growthQuickRaceDlg').showModal();
}
function saveQuickRace(){
  if(!activeHorse)return;
  const age=Number($('#growthQuickAge').value),month=Number($('#growthQuickMonth').value);
  const grade=quickState.grade;
  const distance=quickState.distance==='その他'?Number($('#growthCustomDistance').value):Number(quickState.distance);
  if(!Number.isInteger(age)||!Number.isInteger(month)||!grade||!distance||!quickState.mark4||!quickState.mark5||!quickState.finish){
    alert('年月・レース格・距離・④印・⑤印・着順を選択してください');return;
  }
  db.races.push({
    id:crypto.randomUUID(),horseId:activeHorse.id,name:grade,grade,distance,
    mark4:quickState.mark4,mark5:quickState.mark5,finish:quickState.finish,
    popularity:'',note:'',age,month,observationOrder:Date.now(),source:'timing-quick-record'
  });
  activeHorse.currentAge=age;activeHorse.currentMonth=month;
  save();$('#growthQuickRaceDlg').close();
}

function historyRows(h){
  const rs=datedRaces(h),rows=[];
  for(let i=0;i<rs.length;i++){
    const r=rs[i],prev=i?rs[i-1]:null,delta=markDelta(prev,r);
    const cls=delta==='印改善'?'up':delta==='印低下'?'down':'';
    rows.push('<div class="growth-observation"><div class="growth-observation-head"><b>'+esc(core.ageMonthLabel(r))+'</b>'+(delta?'<span class="growth-change-chip '+cls+'">'+esc(delta)+'</span>':'<span class="growth-change-chip">初回</span>')+'</div><div class="growth-observation-meta">'+esc(inferGrade(r))+' '+esc(r.distance||'-')+'m</div><div class="growth-observation-marks">④ '+esc(r.mark4||'不明')+'　⑤ '+esc(r.mark5||'不明')+'　<b>'+esc(r.finish||'-')+'着</b></div></div>');
  }
  return rows.reverse().join('')||'<div class="empty">年月付きレース記録はまだありません</div>';
}
function openHistory(h){
  activeHorse=h;ensureDialogs();
  const d=diagnosis(h),a=friendlyAdvice(h,d),ref=abilityReferenceText(d);
  $('#growthHistoryTitle').textContent=h.name+'｜成長履歴';
  $('#growthHistoryBody').innerHTML=
    '<div class="growth-kpis"><div class="growth-kpi"><small>現在</small><b>'+esc(ageMonth(h))+'</b></div><div class="growth-kpi"><small>出走判断</small><b>'+esc(a.label)+'</b></div></div>'+
    '<div class="growth-advice '+(a.tone==='up'?'up':a.tone==='warn'?'warn':'')+'"><b>'+esc(a.label)+'</b><small>'+esc(a.reason)+(ref?'<br>'+esc(ref):'')+'</small></div>'+
    '<div class="growth-section"><h3>レースと印の変化</h3><div class="growth-timeline">'+historyRows(h)+'</div></div>'+
    '<details class="growth-settings-details"><summary>必要なときだけ育成設定</summary><div class="growth-settings-body">'+
      '<div class="growth-two"><div><label>現在年齢</label><select id="growthCurrentAge">'+selectOptions(2,10,h.currentAge,'歳')+'</select></div><div><label>現在月</label><select id="growthCurrentMonth">'+selectOptions(1,12,h.currentMonth,'月')+'</select></div></div>'+
      '<div class="growth-two" style="margin-top:8px"><div><label>入厩月</label><select id="growthEntryMonth">'+selectOptions(1,12,h.entryMonth,'月')+'</select></div><div><label>成長型</label><select id="growthManualType"><option value="">自動推定</option>'+['超早熟','早熟','持続','普通','普通遅','晩成','超晩成'].map(x=>'<option value="'+x+'"'+(h.manualGrowthType===x?' selected':'')+'>'+x+'</option>').join('')+'</select></div></div>'+
      '<label style="margin-top:8px">現在の疲労</label><select id="growthFatigue"><option value="unknown">不明</option><option value="low"'+(h.currentCondition?.fatigue==='low'?' selected':'')+'>少</option><option value="medium"'+(h.currentCondition?.fatigue==='medium'?' selected':'')+'>中</option><option value="high"'+(h.currentCondition?.fatigue==='high'?' selected':'')+'>大</option></select>'+
      '<button type="button" class="secondary ui-wide-cta" id="saveGrowthSettings" style="margin-top:10px">育成設定を保存</button></div></details>';
  $('#saveGrowthSettings').onclick=saveGrowthSettings;
  if(!$('#growthHistoryDlg').open)$('#growthHistoryDlg').showModal();
}
function setOptionalNumber(obj,key,value,min,max){
  const n=Number(value);
  if(Number.isInteger(n)&&n>=min&&n<=max)obj[key]=n;else delete obj[key];
}
function saveGrowthSettings(){
  if(!activeHorse)return;
  setOptionalNumber(activeHorse,'currentAge',$('#growthCurrentAge').value,2,10);
  setOptionalNumber(activeHorse,'currentMonth',$('#growthCurrentMonth').value,1,12);
  setOptionalNumber(activeHorse,'entryMonth',$('#growthEntryMonth').value,1,12);
  const manual=$('#growthManualType').value,fatigue=$('#growthFatigue').value;
  if(manual)activeHorse.manualGrowthType=manual;else delete activeHorse.manualGrowthType;
  if(fatigue&&fatigue!=='unknown')activeHorse.currentCondition={...(activeHorse.currentCondition||{}),fatigue};
  else if(activeHorse.currentCondition){delete activeHorse.currentCondition.fatigue;if(!Object.keys(activeHorse.currentCondition).length)delete activeHorse.currentCondition}
  save();openHistory(activeHorse);
}

function tuneResultsSection(){
  const sec=$('#races');if(!sec)return;
  $('#growthResearchPanel')?.remove();
  const intro=sec.querySelector(':scope > .card');
  if(intro){
    const b=intro.querySelector('b'),p=intro.querySelector('p');
    if(b)b.textContent='レース記録から出走時期を判断';
    if(p)p.textContent='年月・レース格・④⑤印の変化から、今月出すか待つかの参考にします。勝敗だけでは判断しません。';
  }
  const add=$('#addRace');
  if(add){add.textContent='＋ レース結果を記録';add.onclick=()=>openRecord(null)}
}
function install(){
  ensureStyle();ensureDialogs();tuneResultsSection();installHorseObserver();installRaceObserver();
  window.DABISTA_GROWTH_UI={diagnosis,decorateHorseCards,decorateRaceCards,openHistory,openRecord,refresh:()=>{decorateHorseCards();decorateRaceCards();tuneResultsSection()}};
}
install();
})();