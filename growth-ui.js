(()=>{
'use strict';

const db=window.db,core=window.DABISTA_GROWTH_CORE,growthDb=window.DABISTA_GROWTH_DB;
if(!db||!core)return;
growthDb?.normalizeInPlace(db);

const $=s=>document.querySelector(s);
const esc=window.esc||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase();
const marks=['◎','○','▲','△','－','不明'];

function save(){
  window.saveFarm?.();
  window.renderHorses?.();
  window.renderRaces?.();
  decorateHorseCards();
  renderResearchPanel();
}
function horseById(id){return (db.horses||[]).find(h=>h.id===id)||null}
function latestSets(){
  const m=new Map();
  for(const s of db.growthCheckSets||[]){
    if(!s?.id)continue;
    const prev=m.get(String(s.id));
    if(!prev||Number(s.revision||1)>Number(prev.revision||1))m.set(String(s.id),s);
  }
  return [...m.values()].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja'));
}
function setFor(id,rev){
  return (db.growthCheckSets||[]).find(s=>String(s.id)===String(id)&&Number(s.revision||1)===Number(rev))||null;
}
function fingerprint(condition,baselines){
  return JSON.stringify({
    course:String(condition.course||'').trim(),
    distance:Number(condition.distance)||0,
    styleRule:String(condition.styleRule||'').trim(),
    baselines:(baselines||[]).map(x=>norm(x.name)).filter(Boolean)
  });
}
function diagnosis(h){
  return core.diagnose({
    horse:h,
    races:(db.races||[]).filter(r=>r.horseId===h.id),
    growthChecks:(db.growthChecks||[]).filter(x=>x.horseId===h.id),
    growthCheckSets:db.growthCheckSets||[],
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
function adviceClass(k){return k==='recover-first'?'warn':k==='one-step-up'?'up':''}

function ensureStyle(){
  if($('#growthTrackingStyle'))return;
  const s=document.createElement('style');s.id='growthTrackingStyle';s.textContent=`
  .growth-mini{margin-top:9px;padding:9px 10px;border-radius:11px;background:#f4f7f5;border:1px solid #e0e8e3}
  .growth-mini-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.growth-mini b{font-size:11px}.growth-mini small{display:block;color:#67776e;font-size:9px;line-height:1.4;margin-top:2px}
  .growth-state{font-size:10px;font-weight:900;padding:3px 6px;border-radius:999px;background:#e6eee9;color:#315643;white-space:nowrap}.growth-state.up{background:#e7f2e8;color:#276338}.growth-state.warn{background:#fff1d7;color:#755614}
  .growth-card-actions{display:flex;gap:6px;margin-top:7px}.growth-card-actions button{flex:1;font-size:10px;padding:7px 6px}
  .growth-research-summary{display:grid;gap:5px;margin-top:8px}.growth-set-line{font-size:10px;padding:6px 8px;background:#f5f7f5;border-radius:8px}
  #growthHistoryDlg,#growthRecordDlg,#growthSetDlg{width:min(620px,calc(100vw - 16px));max-height:92dvh;border:0;border-radius:18px;padding:0;overflow:hidden}
  .growth-dialog{max-height:92dvh;overflow:auto;padding:14px;padding-bottom:72px}.growth-dialog-head{position:sticky;top:-14px;z-index:5;background:rgba(255,255,255,.97);padding:13px 0 10px;border-bottom:1px solid #e1e8e4;display:flex;justify-content:space-between;align-items:center;gap:8px}
  .growth-dialog-head h2{font-size:19px;margin:0}.growth-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:10px 0}.growth-kpi{padding:9px;border-radius:10px;background:#f4f7f5}.growth-kpi b{display:block;font-size:13px}.growth-kpi small{font-size:9px;color:#6a7971}
  .growth-section{margin-top:12px;padding-top:10px;border-top:1px solid #e2e9e5}.growth-section h3{font-size:13px;margin:0 0 7px}.growth-help{font-size:10px;color:#66766e;line-height:1.55}
  .growth-timeline{display:grid;gap:5px}.growth-observation{font-size:10px;padding:7px 8px;background:#f6f7f6;border-radius:8px;line-height:1.45}
  .growth-baselines{display:grid;gap:7px;margin-top:8px}.growth-baseline-row{display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;font-size:11px}
  .growth-dialog-actions{position:sticky;bottom:-72px;z-index:5;display:flex;gap:7px;justify-content:flex-end;background:rgba(255,255,255,.97);border-top:1px solid #e1e8e4;padding:10px 14px calc(10px + env(safe-area-inset-bottom));margin:16px -14px -72px}
  .growth-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.growth-three{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  #raceGrowthDate{margin:8px 0;padding:8px;background:#f4f7f5;border-radius:9px}
  @media(max-width:520px){.growth-two,.growth-three{grid-template-columns:1fr}.growth-baseline-row{grid-template-columns:1fr 120px}.growth-kpis{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s);
}

function syncCardLine(card,html){
  let x=card.querySelector('.growth-mini');
  if(!x){x=document.createElement('div');x.className='growth-mini';card.appendChild(x)}
  if(x.innerHTML!==html)x.innerHTML=html;
}
function decorateHorseCards(){
  document.querySelectorAll('#horseList [data-id]').forEach(card=>{
    const h=horseById(card.dataset.id);if(!h)return;
    const d=diagnosis(h),stateClass=d.state.key==='growth-change'||d.state.key==='growth-progressing'?'up':d.state.key==='hold'?'warn':'';
    const html='<div class="growth-mini-head"><div><b>育成診断</b><small>'+esc(ageMonth(h))+' ｜ '+esc(growthTypeText(d))+'</small></div><span class="growth-state '+stateClass+'">'+esc(d.state.label)+'</span></div>'+
      '<small>'+esc(d.reason)+' ｜ 信頼度 '+esc(d.confidence)+' ｜ 判断 '+esc(d.raceAdvice.label)+'</small>'+
      '<div class="growth-card-actions"><button type="button" class="secondary" data-horse-action="growth-record" data-horse-id="'+esc(h.id)+'">今月を記録</button><button type="button" class="secondary" data-horse-action="growth-history" data-horse-id="'+esc(h.id)+'">成長履歴</button></div>';
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

function ensureRaceAgeMonth(){
  const form=$('#raceForm');if(!form||$('#raceGrowthDate'))return;
  const horse=$('#raceHorse'),wrap=document.createElement('div');wrap.id='raceGrowthDate';
  wrap.innerHTML='<div class="growth-help">成長診断に使う年月です。旧レースへは推測補完しません。</div><div class="two"><div><label>年齢</label><input id="raceAge" type="number" min="2" max="10"></div><div><label>月</label><input id="raceMonth" type="number" min="1" max="12"></div></div>';
  horse.insertAdjacentElement('afterend',wrap);
  horse.addEventListener('change',()=>{
    const h=horseById(horse.value);if(!h)return;
    if($('#raceAge'))$('#raceAge').value=h.currentAge||'';
    if($('#raceMonth'))$('#raceMonth').value=h.currentMonth||'';
  });
}

function ensureDialogs(){
  if(!$('#growthHistoryDlg')){
    const d=document.createElement('dialog');d.id='growthHistoryDlg';d.innerHTML='<div class="growth-dialog"><div class="growth-dialog-head"><h2 id="growthHistoryTitle">成長履歴</h2><button type="button" class="secondary" data-growth-close>閉じる</button></div><div id="growthHistoryBody"></div><div class="growth-dialog-actions"><button type="button" class="secondary" data-growth-close>閉じる</button><button type="button" class="primary" id="saveGrowthSettings">育成設定を保存</button></div></div>';document.body.appendChild(d);
    d.querySelectorAll('[data-growth-close]').forEach(b=>b.onclick=()=>d.close());
  }
  if(!$('#growthRecordDlg')){
    const d=document.createElement('dialog');d.id='growthRecordDlg';d.innerHTML='<div class="growth-dialog"><div class="growth-dialog-head"><h2 id="growthRecordTitle">今月を記録</h2><button type="button" class="secondary" data-growth-record-close>閉じる</button></div><div class="growth-two"><div><label>年齢</label><input id="growthObsAge" type="number" min="2" max="10"></div><div><label>月</label><input id="growthObsMonth" type="number" min="1" max="12"></div></div><div class="growth-section"><h3>通常レース</h3><p class="growth-help">通常レースは既存の実績記録へ年月を付けて保存します。成長診断では参考観測として扱います。</p><button type="button" class="secondary" id="openGrowthRace">通常レースを記録</button></div><div class="growth-section"><h3>研究モード：固定BC比較</h3><div class="growth-two"><div><label>比較セット</label><select id="growthObsSet"></select></div><div style="align-self:end"><button type="button" class="secondary" id="manageGrowthSets">比較セット管理</button></div></div><div id="growthObsBaselines" class="growth-baselines"></div><div class="growth-two" style="margin-top:8px"><div><label>④（任意）</label><select id="growthObsMark4"></select></div><div><label>⑤（任意）</label><select id="growthObsMark5"></select></div></div><div class="growth-dialog-actions"><button type="button" class="secondary" data-growth-record-close>取消</button><button type="button" class="primary" id="saveGrowthCheck">BC比較を保存</button></div></div></div>';document.body.appendChild(d);
    d.querySelectorAll('[data-growth-record-close]').forEach(b=>b.onclick=()=>d.close());
    $('#growthObsSet').onchange=renderObservationBaselines;
    $('#manageGrowthSets').onclick=()=>openSetManager($('#growthObsSet').value||'');
  }
  if(!$('#growthSetDlg')){
    const d=document.createElement('dialog');d.id='growthSetDlg';d.innerHTML='<form class="growth-dialog" id="growthSetForm"><div class="growth-dialog-head"><h2>研究比較セット</h2><button type="button" class="secondary" data-growth-set-close>閉じる</button></div><input type="hidden" id="growthSetId"><label>編集するセット</label><select id="growthSetPick"></select><label>セット名</label><input id="growthSetName" required placeholder="SPチェックA"><div class="growth-two"><div><label>コース</label><input id="growthSetCourse" placeholder="東京"></div><div><label>距離</label><input id="growthSetDistance" type="number" step="100" placeholder="1600"></div></div><label>脚質・頭数など固定条件</label><input id="growthSetStyle" placeholder="同脚質4頭以上など"><label>基準馬（1行1頭）</label><textarea id="growthSetBaselines" rows="5" required placeholder="基準馬A\n基準馬B\n基準馬C"></textarea><p class="growth-help">条件を変更すると既存観測を書き換えず、新しいrevisionを作ります。</p><div class="growth-dialog-actions"><button type="button" class="secondary" data-growth-set-close>取消</button><button type="submit" class="primary">保存</button></div></form>';document.body.appendChild(d);
    d.querySelectorAll('[data-growth-set-close]').forEach(b=>b.onclick=()=>d.close());
    $('#growthSetPick').onchange=()=>loadSetForm($('#growthSetPick').value);
    $('#growthSetForm').onsubmit=saveSet;
  }
}

let activeHorse=null;
function historyRows(h){
  const races=(db.races||[]).filter(r=>r.horseId===h.id&&core.validAgeMonth(r)).sort((a,b)=>core.monthIndex(b)-core.monthIndex(a));
  const checks=(db.growthChecks||[]).filter(x=>x.horseId===h.id&&core.validAgeMonth(x)).sort((a,b)=>core.monthIndex(b)-core.monthIndex(a));
  const rows=[];
  for(const r of races)rows.push({idx:core.monthIndex(r),html:'<div class="growth-observation"><b>'+esc(core.ageMonthLabel(r))+' 通常</b>　④'+esc(r.mark4||'不明')+' / ⑤'+esc(r.mark5||'不明')+'<br><span class="growth-help">'+esc(r.name||'レース')+'</span></div>'});
  for(const x of checks){
    const set=setFor(x.setId,x.setRevision),cs=(x.comparisons||[]).map(c=>{
      const b=set?.baselineHorses?.find(z=>String(z.id)===String(c.baselineId));
      const rel=c.result==='above'?'より上':c.result==='below'?'より下':'と同等';
      return (b?.name||c.baselineId)+rel;
    }).join(' / ');
    rows.push({idx:core.monthIndex(x),html:'<div class="growth-observation"><b>'+esc(core.ageMonthLabel(x))+' 研究</b>　'+esc(set?.name||'比較セット')+' r'+esc(x.setRevision)+'<br><span class="growth-help">'+esc(cs)+'</span></div>'});
  }
  return rows.sort((a,b)=>b.idx-a.idx).map(x=>x.html).join('')||'<div class="empty">年月付き観測はまだありません</div>';
}
function openHistory(h){
  activeHorse=h;const d=diagnosis(h);ensureDialogs();
  $('#growthHistoryTitle').textContent=h.name+'｜成長履歴';
  $('#growthHistoryBody').innerHTML='<div class="growth-kpis"><div class="growth-kpi"><small>現在</small><b>'+esc(ageMonth(h))+'</b></div><div class="growth-kpi"><small>成長</small><b>'+esc(d.state.label)+'</b></div><div class="growth-kpi"><small>信頼度</small><b>'+esc(d.confidence)+'</b></div><div class="growth-kpi"><small>出走判断</small><b>'+esc(d.raceAdvice.label)+'</b></div></div><p class="growth-help">'+esc(d.reason)+(d.previousComparisonMonths!=null?'｜前回比較 '+esc(d.previousComparisonMonths)+'か月前':'')+'</p><div class="growth-section"><h3>育成設定</h3><div class="growth-two"><div><label>現在年齢</label><input id="growthCurrentAge" type="number" min="2" max="10" value="'+esc(h.currentAge||'')+'"></div><div><label>現在月</label><input id="growthCurrentMonth" type="number" min="1" max="12" value="'+esc(h.currentMonth||'')+'"></div></div><div class="growth-two"><div><label>入厩月</label><input id="growthEntryMonth" type="number" min="1" max="12" value="'+esc(h.entryMonth||'')+'"></div><div><label>手動成長型</label><select id="growthManualType"><option value="">自動推定</option>'+['超早熟','早熟','持続','普通','普通遅','晩成','超晩成'].map(x=>'<option'+(h.manualGrowthType===x?' selected':'')+'>'+x+'</option>').join('')+'</select></div></div><label>成長コメント</label><input id="growthComment" value="'+esc(h.growthComment||'')+'" placeholder="晩成コメントあり など"><label>現在の疲労</label><select id="growthFatigue"><option value="unknown">不明</option><option value="low"'+(h.currentCondition?.fatigue==='low'?' selected':'')+'>少</option><option value="medium"'+(h.currentCondition?.fatigue==='medium'?' selected':'')+'>中</option><option value="high"'+(h.currentCondition?.fatigue==='high'?' selected':'')+'>大</option></select><p class="growth-help">疲労は成長判定には使わず、出走判断だけに反映します。</p></div><div class="growth-section"><h3>観測履歴</h3><div class="growth-timeline">'+historyRows(h)+'</div></div>';
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
  const comment=$('#growthComment').value.trim(),manual=$('#growthManualType').value,fatigue=$('#growthFatigue').value;
  if(comment)activeHorse.growthComment=comment;else delete activeHorse.growthComment;
  if(manual)activeHorse.manualGrowthType=manual;else delete activeHorse.manualGrowthType;
  if(fatigue&&fatigue!=='unknown')activeHorse.currentCondition={...(activeHorse.currentCondition||{}),fatigue};
  else if(activeHorse.currentCondition){delete activeHorse.currentCondition.fatigue;if(!Object.keys(activeHorse.currentCondition).length)delete activeHorse.currentCondition}
  save();openHistory(activeHorse);
}

function fillMarkSelect(id){
  const x=$(id);if(!x)return;x.innerHTML='<option value="">未入力</option>'+marks.map(m=>'<option>'+m+'</option>').join('');
}
function openRecord(h){
  activeHorse=h;ensureDialogs();fillMarkSelect('#growthObsMark4');fillMarkSelect('#growthObsMark5');
  $('#growthRecordTitle').textContent=h.name+'｜今月を記録';
  $('#growthObsAge').value=h.currentAge||'';$('#growthObsMonth').value=h.currentMonth||'';
  const sets=latestSets();$('#growthObsSet').innerHTML=sets.length?sets.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' r'+esc(s.revision)+'</option>').join(''):'<option value="">比較セットなし</option>';
  renderObservationBaselines();
  $('#openGrowthRace').onclick=()=>openRaceFromGrowth(h);
  $('#saveGrowthCheck').onclick=saveGrowthCheck;
  if(!$('#growthRecordDlg').open)$('#growthRecordDlg').showModal();
}
function setHorseCurrentFromRecord(h){
  setOptionalNumber(h,'currentAge',$('#growthObsAge').value,2,10);
  setOptionalNumber(h,'currentMonth',$('#growthObsMonth').value,1,12);
}
function openRaceFromGrowth(h){
  setHorseCurrentFromRecord(h);window.saveFarm?.();
  $('#growthRecordDlg').close();$('#addRace')?.click();
  if($('#raceHorse')){$('#raceHorse').value=h.id;$('#raceHorse').dispatchEvent(new Event('change',{bubbles:true}))}
  if($('#raceAge'))$('#raceAge').value=h.currentAge||'';
  if($('#raceMonth'))$('#raceMonth').value=h.currentMonth||'';
}
function renderObservationBaselines(){
  const id=$('#growthObsSet')?.value,set=latestSets().find(s=>String(s.id)===String(id)),box=$('#growthObsBaselines');if(!box)return;
  if(!set){box.innerHTML='<div class="empty">比較セットを作成してください</div>';return}
  box.innerHTML=(set.baselineHorses||[]).map(b=>'<div class="growth-baseline-row"><b>'+esc(b.name)+'</b><select data-growth-baseline="'+esc(b.id)+'"><option value="below">基準馬より下</option><option value="equal">同等</option><option value="above">基準馬より上</option></select></div>').join('');
}
function saveGrowthCheck(){
  if(!activeHorse)return;
  const age=Number($('#growthObsAge').value),month=Number($('#growthObsMonth').value),set=latestSets().find(s=>String(s.id)===String($('#growthObsSet').value));
  if(!Number.isInteger(age)||age<2||age>10||!Number.isInteger(month)||month<1||month>12){alert('年齢と月を入力してください');return}
  if(!set){alert('比較セットを作成してください');return}
  const comparisons=[...document.querySelectorAll('#growthObsBaselines [data-growth-baseline]')].map(x=>({baselineId:x.dataset.growthBaseline,result:x.value}));
  if(!comparisons.length){alert('基準馬がありません');return}
  db.growthChecks.push({
    id:crypto.randomUUID(),horseId:activeHorse.id,setId:set.id,setRevision:Number(set.revision||1),
    conditionFingerprint:set.conditionFingerprint,age,month,observationOrder:Date.now(),observedAt:new Date().toISOString(),
    mark4:$('#growthObsMark4').value||'',mark5:$('#growthObsMark5').value||'',comparisons
  });
  activeHorse.currentAge=age;activeHorse.currentMonth=month;save();$('#growthRecordDlg').close();openHistory(activeHorse);
}

function renderResearchPanel(){
  const p=$('#growthResearchPanel');if(!p)return;
  const sets=latestSets();
  const summary=p.querySelector('.growth-research-summary');
  summary.innerHTML=sets.length?sets.map(s=>'<div class="growth-set-line"><b>'+esc(s.name)+'</b> r'+esc(s.revision)+'｜'+esc(s.condition?.course||'条件未設定')+' '+esc(s.condition?.distance||'')+'m｜基準'+esc((s.baselineHorses||[]).length)+'頭</div>').join(''):'<div class="empty">比較セット未登録</div>';
}
function ensureResearchPanel(){
  const sec=$('#races');if(!sec||$('#growthResearchPanel'))return;
  const p=document.createElement('div');p.id='growthResearchPanel';p.className='card';p.innerHTML='<div class="row"><div><b>成長研究・固定BC比較</b><p class="muted">同じ条件・同じ基準馬との序列変化を高信頼観測として使います。</p></div><button type="button" class="secondary" id="openGrowthSets">比較セット管理</button></div><div class="growth-research-summary"></div>';
  sec.insertBefore(p,$('#raceCards'));
  $('#openGrowthSets').onclick=()=>openSetManager('');
  renderResearchPanel();
}
function openSetManager(id){
  ensureDialogs();const sets=latestSets();
  $('#growthSetPick').innerHTML='<option value="">＋ 新規セット</option>'+sets.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' r'+esc(s.revision)+'</option>').join('');
  $('#growthSetPick').value=id&&sets.some(s=>String(s.id)===String(id))?id:'';
  loadSetForm($('#growthSetPick').value);
  $('#growthSetDlg').showModal();
}
function loadSetForm(id){
  const s=latestSets().find(x=>String(x.id)===String(id));
  $('#growthSetId').value=s?.id||'';$('#growthSetName').value=s?.name||'';$('#growthSetCourse').value=s?.condition?.course||'';$('#growthSetDistance').value=s?.condition?.distance||'';$('#growthSetStyle').value=s?.condition?.styleRule||'';$('#growthSetBaselines').value=(s?.baselineHorses||[]).map(x=>x.name).join('\n');
}
function saveSet(e){
  e.preventDefault();
  const existingId=$('#growthSetId').value,name=$('#growthSetName').value.trim(),condition={course:$('#growthSetCourse').value.trim(),distance:Number($('#growthSetDistance').value)||0,styleRule:$('#growthSetStyle').value.trim()};
  const names=$('#growthSetBaselines').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!name||!names.length)return;
  const baselines=names.map(n=>({id:'b:'+norm(n),name:n})),fp=fingerprint(condition,baselines),prev=latestSets().find(s=>String(s.id)===String(existingId));
  let savedId=prev?.id||'';
  if(prev&&prev.conditionFingerprint===fp){
    prev.name=name;prev.condition={...condition};prev.baselineHorses=baselines;savedId=prev.id;
  }else{
    const next={id:prev?.id||crypto.randomUUID(),name,revision:prev?Number(prev.revision||1)+1:1,condition,conditionFingerprint:fp,baselineHorses:baselines,createdAt:new Date().toISOString()};
    db.growthCheckSets.push(next);savedId=next.id;
  }
  save();$('#growthSetDlg').close();renderResearchPanel();
  if($('#growthRecordDlg')?.open&&activeHorse){
    openRecord(activeHorse);
    if([...$('#growthObsSet').options].some(o=>String(o.value)===String(savedId)))$('#growthObsSet').value=savedId;
    renderObservationBaselines();
  }
}

function install(){
  ensureStyle();ensureRaceAgeMonth();ensureDialogs();ensureResearchPanel();installHorseObserver();
  window.DABISTA_GROWTH_UI={diagnosis,decorateHorseCards,openHistory,openRecord,latestSets};
}
install();
})();