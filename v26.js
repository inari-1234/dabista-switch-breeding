(()=>{
'use strict';
const V=window.APP_VERSION||'1.17.0',BUILD=window.APP_BUILD||'2026.09.20-38',db=window.db,$=s=>document.querySelector(s),esc=window.esc||((s)=>String(s??''));
if(!db)return;
window.APP_VERSION=V;window.APP_BUILD=BUILD;
const ve=$('#ver');if(ve)ve.textContent=`v${V} / Build ${BUILD}`;
let engine=null,planner=null,recommendationAdvisor=null,runSeq=0,routeContextSeq=0;const routeContexts=new Map();
db.salePlanner=db.salePlanner||{mare:'エイスト',goal:'arc',generation:0,generationSource:'unset'};
db.salePlanner.generation=0;db.salePlanner.generationSource='unset';

function save(){window.saveFarm?.()}
function invalidateResults(msg='条件を変更しました。もう一度「この条件で設計」を実行してください。'){
 runSeq++;
 const out=$('#salePlannerResults');if(out)out.innerHTML='';
 const p=$('#salePlannerProgress');if(p)p.textContent=msg;
 const b=$('#runSalePlanner');if(b)b.disabled=false;
}
function style(){
 if($('#v26style'))return;
 const s=document.createElement('style');s.id='v26style';s.textContent=`
 .sale-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
 .sale-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 .sale-seg{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:6px 0 10px}
 .sale-seg.gens{grid-template-columns:repeat(3,1fr)}
 .sale-seg button{border:1px solid #d6ddd8;background:#fff;border-radius:9px;padding:9px 6px;font-size:11px;color:#405048}
 .sale-seg button.on{background:#173f2e;color:#fff;border-color:#173f2e;font-weight:700}
 .sale-seg.gens button.on.manual{background:#fff7df;color:#725109;border-color:#d6b566}
 .sale-seg.gens button.on.diagnosed{background:#173f2e;color:#fff;border-color:#173f2e}
 .sale-mare-summary{margin-top:8px;padding:10px;border-radius:10px;background:#f4f7f4;font-size:11px;line-height:1.55}
 .sale-ability-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}
 .sale-ability-grid>div{background:#fff;border-radius:8px;padding:7px;text-align:center}
 .sale-ability-grid b{display:block;font-size:16px}.sale-ability-grid small{font-size:9px;color:#66736c}
 .sale-profile{border-left:4px solid #dce2dd}
 .sale-profile h3{margin:0 0 3px}
 .sale-route{border:1px solid #dce2dd;border-radius:11px;padding:10px;margin:9px 0;background:#fbfcfa}
 .sale-route-title{display:flex;justify-content:space-between;gap:8px;align-items:center}
 .sale-path{font-size:12px;font-weight:700;line-height:1.5;margin:6px 0}
 .sale-stage{margin-top:8px;padding:9px;border-radius:9px;background:#f1f5f2;font-size:11px;line-height:1.55}
 .sale-stage .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:6px 0}
 .sale-stage .metrics>span{background:#fff;border-radius:7px;padding:5px;text-align:center}
 .sale-chip{display:inline-block;border-radius:999px;padding:2px 6px;margin:2px 3px 2px 0;background:#e8eee9;font-size:9px}
 .sale-chip.good{background:#dcefe3;color:#1b5a35}.sale-chip.warn{background:#fff0c9;color:#6f5200}

 .sale-chip.theory-perfect{background:#fff0c9;color:#725109;border:1px solid #e2bf63;font-weight:800}
 .sale-chip.theory-migoto{background:#e8eff9;color:#365f8a;border:1px solid #c8d7ed;font-weight:800}
 .sale-chip.theory-interesting{background:#e3f1ea;color:#1c694b;border:1px solid #c5dfd1;font-weight:800}
 .sale-chip.theory-elaborate{background:#eee8f7;color:#664f91;border:1px solid #d7ccec;font-weight:800}
 .sale-effect-block{margin-top:7px;padding:8px;border-radius:10px;background:#fff;border:1px solid #e1e8e4}
 .sale-effect-title{font-size:9px;font-weight:800;color:#50665b;margin-right:5px}
 .cross-list{display:grid;gap:5px;margin-top:6px}
 .cross-item{padding:6px 7px;border-radius:8px;background:#f4f7f5;border:1px solid #e5ebe8}
 .cross-item.high{background:#fff7df;border-color:#e7ca75}
 .cross-item.medium{background:#edf6f1;border-color:#cfe2d8}
 .cross-head{display:flex;justify-content:space-between;gap:8px;align-items:center}
 .cross-head b{font-size:10px}
 .cross-priority{font-size:8px;font-weight:800;padding:2px 5px;border-radius:999px;background:#e9eeeb;color:#52655c}
 .cross-item.high .cross-priority{background:#f4d98b;color:#725109}
 .cross-factor{font-size:8px;color:#65766e;margin-top:3px}
 .cross-effects{font-size:9px;color:#344d41;margin-top:4px;font-weight:700}
 .cross-tradeoff{display:inline-block;margin-left:3px;padding:1px 5px;border-radius:999px;background:#fff0d8;color:#815d13;font-size:8px}
 .cross-speed-ok{background:#e4f3e8!important;color:#1f6138!important;border-color:#b9dcc4!important}
 .cross-speed-missing{background:#fff0df!important;color:#875610!important;border-color:#efd0a4!important}
 .route-breed-link{width:100%;margin-top:8px}
 .sale-route-bridge{border-color:#bcd8ca!important;background:linear-gradient(145deg,#fff,#f2f8f5)!important}
 .route-bridge-path{font-weight:800;font-size:12px;line-height:1.55;margin:6px 0}
 .route-bridge-stage{padding:8px;border-radius:9px;background:#fff;border:1px solid #e0e8e4;margin-top:6px;font-size:10px;line-height:1.5}
 .sale-select{margin-top:7px;padding:7px;border-left:3px solid #d6b566;background:#fff9e7;border-radius:0 7px 7px 0}
 .sale-portfolio{font-size:10px;line-height:1.55;background:#eef2f6;border-radius:8px;padding:7px;margin-top:7px}
 .sale-progress{font-size:11px;line-height:1.5;margin-top:8px}
 .production-quality{margin-top:7px;padding:8px;border-radius:9px;border:1px solid #dbe5df;background:#f7faf8;font-size:9px;line-height:1.55}
 .production-quality b{font-size:10px}
 .production-quality.ceiling{background:#edf7f2;border-color:#bcd8ca}
 .production-quality.upside{background:#eef3fa;border-color:#cad8eb}
 .production-quality.selection-dependent,.production-quality.low-ceiling,.production-quality.tradeoff,.production-quality.no-speed-support{background:#fff7df;border-color:#e7ca75}
 .production-warning{display:block;margin-top:3px;color:#7a5610}
 .sale-method{font-size:10px;line-height:1.5;color:#66736c}
 .sale-generation-state{margin:-4px 0 9px;font-size:9px;line-height:1.45;color:#66736c}
 @media(max-width:520px){.sale-controls{grid-template-columns:1fr}.sale-seg{grid-template-columns:1fr 1fr}}
 `;document.head.appendChild(s)
}
function goalButtons(){
 const labels={arc:'凱旋門賞',stallion:'自家製種牡馬',rebuild:'繁殖再建',bc:'BC長期'};
 return Object.entries(labels).map(([k,v])=>`<button type="button" data-sale-goal="${k}" class="${db.salePlanner.goal===k?'on':''}">${v}</button>`).join('')
}
function genButtons(){
 return [1,2,3,4].map(n=>`<button type="button" data-sale-gen="${n}" class="${+db.salePlanner.generation===n?'on':''}">${n===1?'直仔':n+'代'}</button>`).join('')
}
function inject(){
 if($('#salePlanner')||!$('#rebuild'))return;
 style();
 const card=document.createElement('div');card.className='card';card.id='salePlanner';
 card.innerHTML=`
  <div class="sale-head"><div><h3 class="section-title">セリ牝馬から設計</h3><p class="muted">繁殖牝馬331頭から、国内176種牡馬だけを種付け候補として探索します。外国種牡馬38頭は血統解析には使いますが、種付け候補には出しません。</p></div><span class="badge gold">Switch版限定</span></div>
  <div class="sale-controls">
    <div class="field"><label>繁殖牝馬を検索</label><input id="saleMareSearch" type="search" placeholder="牝馬名を入力"></div>
    <div class="field"><label>繁殖牝馬</label><select id="saleMareSelect"></select></div>
  </div>
  <div id="saleMareSummary" class="sale-mare-summary">繁殖牝馬マスタを読み込み中…</div>
  <div id="saleGoalSection"><label>目的</label><div class="sale-seg" id="saleGoalButtons">${goalButtons()}</div></div>
  <div id="saleGenerationSection"><label>診断結果／比較する世代</label><div class="sale-seg gens" id="saleGenButtons">${genButtons()}</div><div id="saleGenerationState" class="sale-generation-state"></div></div>
  <div id="salePlannerNotice" class="notice">直仔は176頭全探索、2代は安全な1代目から約3万ルートを全探索します。3代は2代目の多軸候補、4代は3代目の多軸候補を起点にした条件付きプレビューです。</div>
  <div class="actions"><button class="primary" id="runSalePlanner">この条件で設計</button></div>
  <div id="salePlannerProgress" class="sale-progress"></div>
 `;
 const intro=$('#rebuild .card');intro?.insertAdjacentElement('afterend',card);
 const results=document.createElement('div');results.id='salePlannerResults';card.insertAdjacentElement('afterend',results);
 results.addEventListener('click',e=>{const b=e.target.closest('[data-route-breed]');if(b)openRouteInBreed(b.dataset.routeBreed)});
 $('#saleMareSearch').oninput=()=>{invalidateResults('検索条件を変更しました。');fillMares()};
 $('#saleMareSelect').onchange=()=>{setPlannerMare($('#saleMareSelect').value,'select');invalidateResults()};
 $('#saleGoalButtons').onclick=e=>{const b=e.target.closest('[data-sale-goal]');if(!b)return;db.salePlanner.goal=b.dataset.saleGoal;resetGenerationSelection();save();paintButtons();renderNotice();invalidateResults()};
 $('#saleGenButtons').onclick=e=>{const b=e.target.closest('[data-sale-gen]');if(!b)return;setGeneration(+b.dataset.saleGen,'manual');invalidateResults('手動で世代を選択しました。「選択した世代を詳しく設計」で確認できます。')};
 $('#runSalePlanner').onclick=runDesign;
 $('#rebuildStarter')?.addEventListener('change',()=>{
  const n=$('#rebuildStarter').value;if(!planner?.mare(n))return;
  const q=$('#saleMareSearch');if(q)q.value='';
  fillMares();
  const sel=$('#saleMareSelect');if(sel)sel.value=n;
  setPlannerMare(n,'rebuild-sync');
  invalidateResults('起点牝馬を同期しました。');
 });
}
function resetGenerationSelection(){
 db.salePlanner.generation=0;db.salePlanner.generationSource='unset';paintButtons();renderNotice();
}
function signalMareContext(reason,name=db.salePlanner.mare){
 window.dispatchEvent(new CustomEvent('dabista:sale-mare-context',{detail:{name,reason}}));
}
function setPlannerMare(name,reason='select'){
 if(!name)return false;
 const changed=db.salePlanner.mare!==name;
 db.salePlanner.mare=name;
 if(changed){resetGenerationSelection();save();signalMareContext(reason,name)}
 renderMare();
 return changed;
}
function setGeneration(n,source='manual'){
 db.salePlanner.generation=[1,2,3,4].includes(+n)?+n:0;
 db.salePlanner.generationSource=db.salePlanner.generation?source:'unset';
 save();paintButtons();renderNotice();
}
function paintButtons(){
 document.querySelectorAll('[data-sale-goal]').forEach(b=>b.classList.toggle('on',b.dataset.saleGoal===db.salePlanner.goal));
 document.querySelectorAll('[data-sale-gen]').forEach(b=>{
  const selected=+b.dataset.saleGen===+db.salePlanner.generation;
  b.classList.toggle('on',selected);
  b.classList.toggle('diagnosed',selected&&db.salePlanner.generationSource==='diagnosis');
  b.classList.toggle('manual',selected&&db.salePlanner.generationSource==='manual');
 });
 const st=$('#saleGenerationState');
 if(st){
  if(!db.salePlanner.generation)st.textContent='未選択：「おすすめ配合世代を診断」を実行するか、比較したい世代を手動で選択してください。';
  else if(db.salePlanner.generationSource==='diagnosis')st.textContent='世代診断の推奨を選択中です。';
  else st.textContent='手動選択中です。世代診断の推奨とは別に比較できます。';
 }
}
function fillMares(){
 if(!planner)return;
 const q=String($('#saleMareSearch')?.value||'').normalize('NFKC').toLowerCase();
 const stats=engine.mareData.broodmares||[],names=stats.filter(x=>!q||x.name.normalize('NFKC').toLowerCase().includes(q)).map(x=>x.name);
 const sel=$('#saleMareSelect');if(!sel)return;
 const previousUiMare=sel.value;
 const keep=db.salePlanner.mare||'エイスト';
 if(!names.length){
  sel.innerHTML='<option value="">該当なし</option>';
  $('#saleMareSummary').textContent='検索条件に一致する繁殖牝馬がありません。';
  resetGenerationSelection();signalMareContext('search-empty','');
  if($('#runSalePlanner'))$('#runSalePlanner').disabled=true;
  return;
 }
 sel.innerHTML=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
 if(names.includes(keep)){
  sel.value=keep;
  if(previousUiMare!==keep)signalMareContext('search-restore',keep);
 }else{sel.value=names[0];setPlannerMare(sel.value,'search-auto')}
 if($('#runSalePlanner'))$('#runSalePlanner').disabled=false;
 renderMare()
}
function fmt(v){return v===null||v===undefined?'—':v}
function pedigreeDetails(info){
 const a=info?.record?.ancestor||[];if(a.length!==15)return'<div>血統15祖先：未取得</div>';
 return `<details style="margin-top:7px"><summary><b>血統15祖先</b></summary><div style="margin-top:5px;line-height:1.55">${a.map((n,i)=>`${i+1}. ${esc(n)}`).join('<br>')}</div></details>`
}
function renderMare(){
 if(!planner||!$('#saleMareSummary'))return;
 const name=$('#saleMareSelect')?.value||db.salePlanner.mare,info=planner.mareInfo(name),s=info?.stats;
 if(!info?.record||!s){$('#saleMareSummary').textContent='繁殖牝馬情報を取得できませんでした。';return}
 if(!info.abilityKnown){
  $('#saleMareSummary').innerHTML=`<div class="row"><b>${esc(name)}</b><span>価格 ${fmt(s.price)}万円</span></div><span class="sale-chip warn">繁殖能力：未判明</span><div class="sale-ability-grid"><div><b>未判明</b><small>繁殖SP</small></div><div><b>未判明</b><small>繁殖ST</small></div><div><b>未判明</b><small>繁殖PW</small></div><div><b>${fmt(s.nsp)}</b><small>NSP</small></div><div><b>${fmt(s.nst)}</b><small>NST</small></div><div><b>${fmt(s.npw)}</b><small>NPW</small></div></div><div style="margin-top:6px"><b>血統・ニトロ・配合理論による設計は可能</b><br>母能力を含む総合評価は保留します。SP/ST/PW=0を低能力値として順位付けには使用しません。</div>${pedigreeDetails(info)}`;
 }else{
  $('#saleMareSummary').innerHTML=`<div class="row"><b>${esc(name)}</b><span>SP+ST ${info.spst}</span></div><div class="sale-ability-grid"><div><b>${fmt(s.sp)}</b><small>繁殖SP</small></div><div><b>${fmt(s.st)}</b><small>繁殖ST</small></div><div><b>${fmt(s.pw)}</b><small>繁殖PW</small></div><div><b>${fmt(s.nsp)}</b><small>NSP</small></div><div><b>${fmt(s.nst)}</b><small>NST</small></div><div><b>${fmt(s.npw)}</b><small>NPW</small></div></div><div style="margin-top:6px">価格 ${fmt(s.price)}万円。母能力は当たり率・平均能力側、ニトロは上限側として別軸で扱います。</div>${pedigreeDetails(info)}`;
 }
}
function renderNotice(){
 const n=+db.salePlanner.generation,el=$('#salePlannerNotice');if(!el)return;
 if(!n){el.innerHTML='<b>世代未選択：</b>正式な推奨は「おすすめ配合世代を診断」で決定します。手動で比較することもできます。';return}
 if(n===1)el.innerHTML='<b>直仔：</b>国内176種牡馬を全探索。危険・超危険を除外し、複数軸で候補を表示します。';
 else if(n===2)el.innerHTML='<b>2代：</b>安全な1代目から国内176頭を掛け合わせ、約3万ルートを全探索します。中間牝馬の繁殖能力は出生前に仮定しません。';
 else if(n===3)el.innerHTML='<b>3代：</b>2代目までは全探索。3代目はSP上限/SPクロス補強/強馬生産/ST/バランス/配合理論の多軸候補を起点に条件付き探索する仮プレビューです。全176³の最適解とは表示しません。';
 else el.innerHTML='<b>4代：</b>2代目までは全探索。3代目の条件付き多軸候補をさらに絞り、4代目を条件付き探索します。全176⁴の最適解ではなく、条件付きの深掘り候補です。';
}
const yieldUi=()=>new Promise(r=>setTimeout(r,0));
function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set(),keys=['sp','speedCross','production','st','balance','theory'];
 for(let i=0;i<maxEach;i++)for(const k of keys){
  const r=shortlists?.[k]?.[i];if(!r)continue;const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out
}
async function scanIterator(iter,collector,seq,label){
 let n=0;
 for(const r of iter){
  if(seq!==runSeq)throw Error('cancelled');
  collector.push(r);n++;
  if(n%700===0){$('#salePlannerProgress').textContent=`${label}：安全ルート ${n.toLocaleString()}件を確認中…`;await yieldUi()}
 }
 return n
}
function theoryChips(t,e){
 let x='';
 if(t?.perfect)x+='<span class="sale-chip theory-perfect">完璧＝面白＋見事</span>';
 else{
  if(t?.interesting)x+='<span class="sale-chip theory-interesting">面白</span>';
  if(t?.magnificent)x+='<span class="sale-chip theory-migoto">見事</span>';
 }
 if(e?.effective)x+='<span class="sale-chip theory-elaborate">凝った</span>';
 return x||'<span class="sale-chip">追加理論なし</span>'
}
const signed=n=>n>0?'+'+n:String(n||0);
function crossHtml(st){
 const insight=recommendationAdvisor?.crossInsights?.(st);
 if(!insight)return '<div class="sale-effect-block"><span class="sale-effect-title">クロス</span><span class="muted">判定情報なし</span></div>';
 const spItems=(insight.items||[]).filter(x=>(x.effects||[]).some(e=>e.key==='short'||e.key==='speed'));
 const spStatus=spItems.length
  ?'<div style="margin:4px 0"><span class="sale-chip cross-speed-ok">SP系クロスあり '+spItems.length+'祖先</span></div>'
  :'<div style="margin:4px 0"><span class="sale-chip cross-speed-missing">SP系クロスなし</span><div class="sale-method">SPニトロは能力上限側。最終配合に速力/短距離クロスによる直接のスピード補強はありません。</div></div>';
 if(!insight.rawCount)return '<div class="sale-effect-block"><span class="sale-effect-title">有効クロス</span>'+spStatus+'<span class="muted">クロスなし</span></div>';
 let items='';
 for(const x of insight.items){
  const factor=x.factor?'ニトロ寄与 SP'+signed(x.factor.sp)+' / ST'+signed(x.factor.st)+' / PW'+signed(x.factor.pw):'ニトロ寄与なし';
  const effectText=x.effects?.length?x.effects.map(e=>e.label+'（'+e.detail+'）').join('・'):'個別効果データなし';
  const trade=x.hasTradeoff?'<span class="cross-tradeoff">トレードオフあり</span>':'';
  items+='<div class="cross-item '+x.priority+'"><div class="cross-head"><b>'+esc(x.name)+' '+x.sireGen+'×'+x.mareGen+'</b><span class="cross-priority">'+esc(x.priorityLabel||'クロス成立')+'</span></div><div class="cross-effects">'+esc(effectText)+' '+trade+'</div><div class="cross-factor">'+factor+'</div></div>';
 }
 const note=insight.suppressedCount
  ?'生クロス '+insight.rawCount+'件 / 祖先内包を除く有効クロス '+insight.effectiveCount+'件 / 除外 '+insight.suppressedCount+'件'
  :'有効クロス '+insight.effectiveCount+'件。色の強調は祖先因子の影響量で、クロス成立そのものの強弱評価ではありません。';
 return '<div class="sale-effect-block"><span class="sale-effect-title">有効クロス</span>'+spStatus+(items?'<div class="cross-list">'+items+'</div>':'<span class="muted">有効クロスなし</span>')+'<div class="sale-method">'+note+'</div></div>';
}

function stageHtml(st,totalStages,goal){
 const advice=recommendationAdvisor?.selectionAdvice?.(db.salePlanner.mare,goal,st,totalStages)||null;
 const ss=st.sireStats||{},n=st.nitro||{},d=st.danger||{},crosses=st.crosses||[];
 const dist=ss.minD&&ss.maxD?`${ss.minD}–${ss.maxD}m`:'距離不明';
 const cross=crosses.length?crosses.slice(0,5).map(x=>`${esc(x.name)} ${x.sireGen}×${x.mareGen}`).join(' / ')+(crosses.length>5?' ほか':''):'なし';
 const ev=st.elaborate?.evidence?.length?st.elaborate.evidence.slice(0,2).map(x=>x.kind==='direct-exception'?'直接成立例外':`${esc(x.a)}×${esc(x.b)}`).join(' / '):'';
 return `<div class="sale-stage"><b>${st.generation}代目父：${esc(st.sire)}</b><div>${dist} / 実績${esc(ss.record||'-')}・底力${esc(ss.guts||'-')}・安定${esc(ss.stable||'-')}</div><div class="metrics"><span><b>${fmt(n.sp)}</b><br>SPニトロ</span><span><b>${fmt(n.st)}</b><br>STニトロ</span><span><b>${fmt(n.pw)}</b><br>PWニトロ</span></div><div class="sale-effect-block"><span class="sale-effect-title">配合理論</span>${theoryChips(st.theory,st.elaborate)}</div>${crossHtml(st)}<div><span class="sale-chip good">危険判定：安全</span></div>${ev?`<div>凝った根拠：${ev}</div>`:''}${advice&&st.generation<totalStages?`<div class="sale-select"><b>${esc(advice.phase)}｜${esc(advice.headline)}</b><br>${esc(advice.body)}<div class="sale-method" style="margin-top:4px">${esc(advice.routeNote)} / 起点母：${esc(advice.strategy.label)}</div></div>`:(st.selection?`<div class="sale-select"><b>次世代へ進む条件</b><br>${esc(st.selection)}</div>`:'')}</div>`
}
function portfolioHtml(r){
 const p=r.portfolio;if(!p)return'';
 const line=(label,x)=>`<b>${label}</b>：安全 ${x.safe}/${x.population}・SP15/ST5 ${x.sp15st5}・SP17/ST5 ${x.sp17st5}・面白 ${x.interesting}・見事 ${x.magnificent}・完璧 ${x.perfect}・凝った ${x.elaborate}・最大SP ${x.maxSp}・最大SP+ST ${x.maxSpSt}`;
 return `<div class="sale-portfolio">${line('母SP+ST≥120',p.spst120)}<br>${line('母SP+ST≥130',p.spst130)}<br>※自家製種牡馬の実績・安定・底力は出生前に仮定せず、血統汎用性だけを比較。</div>`
}
function productionHtml(route){
 const assessment=recommendationAdvisor?.mareAssessment?.(db.salePlanner.mare)||null;
 const q=recommendationAdvisor?.productionQuality?.(route,assessment);if(!q)return'';
 const notes=(q.notes||[]).slice(0,2).map(x=>esc(x)).join(' / ');
 const warnings=(q.warnings||[]).slice(0,3).map(x=>'<span class="production-warning">⚠ '+esc(x)+'</span>').join('');
 return '<div class="production-quality '+esc(q.key)+'"><b>強馬生産条件：'+esc(q.label)+'｜実績'+esc(q.record)+'・安定'+esc(q.stable)+'</b>'+(notes?'<div>'+notes+'</div>':'')+warnings+'</div>';
}
function routeHtml(route,index,goal,profile){
 const x=planner.expandRoute(db.salePlanner.mare,route,goal);if(!x)return'';
 const f=route.final||{},sx=f.speedCross||{},method=route.method==='conditional-four-generation-preview'?'4代目は条件付き仮プレビュー':route.method==='conditional-three-generation-preview'?'3代目は条件付き仮プレビュー':'この表示範囲は全探索結果';
 const speedBadge=sx.has?'<span class="sale-chip cross-speed-ok">SP系クロス '+fmt(sx.count)+'祖先</span>':'<span class="sale-chip cross-speed-missing">SP系クロスなし</span>';
 const ctxId='route-'+(++routeContextSeq);
 routeContexts.set(ctxId,{mare:db.salePlanner.mare,route,x,goal,profile});
 return '<div class="sale-route"><div class="sale-route-title"><b>候補 '+(index+1)+'</b><span class="badge">SP '+f.sp+' / ST '+f.st+' / PW '+f.pw+'</span></div><div style="margin-top:4px">'+speedBadge+'</div><div class="sale-path">'+route.sires.map(esc).join(' → ')+'</div><div class="sale-method">'+method+'。途中世代の繁殖SP/ST/PWは仮定していません。</div>'+productionHtml(route)+x.stages.map(st=>stageHtml(st,x.stages.length,goal)).join('')+(profile==='sire'?portfolioHtml(route):'')+'<button type="button" class="secondary route-breed-link" data-route-breed="'+ctxId+'">このルートを「配合」で詳しく見る</button></div>';
}
function bridgeStageHtml(st){
 const n=st.nitro||{},ss=st.sireStats||{};
 return '<div class="route-bridge-stage"><b>'+st.generation+'代目：'+esc(st.sire)+'</b><br>SP '+fmt(n.sp)+' / ST '+fmt(n.st)+' / PW '+fmt(n.pw)+'　・　'+(ss.minD||'?')+'–'+(ss.maxD||'?')+'m　・　実績'+esc(ss.record||'-')+' / 底力'+esc(ss.guts||'-')+' / 安定'+esc(ss.stable||'-')+'<div class="sale-effect-block"><span class="sale-effect-title">配合理論</span>'+theoryChips(st.theory,st.elaborate)+'</div>'+crossHtml(st)+'</div>';
}
function renderRouteBreedBridge(ctx,syncedHorse){
 const sec=$('#breed');if(!sec||!ctx)return;
 let card=$('#saleRouteBreedBridge');
 if(!card){card=document.createElement('div');card.id='saleRouteBreedBridge';card.className='card sale-route-bridge';sec.insertBefore(card,sec.firstChild)}
 const syncNote=syncedHorse
  ?'<div class="sale-method">起点牝馬「'+esc(ctx.mare)+'」を配合確認用に同期済みです。下の通常候補欄もこの牝馬を選択した状態にしています。</div>'
  :'<div class="notice">起点牝馬を通常候補欄へ同期できなかったため、ルート判定はこの連携カードの表示を基準にしてください。</div>';
 card.innerHTML='<div class="row"><div><span class="badge gold">セリ設計から連携</span><h3 class="section-title" style="margin-top:7px">'+esc(ctx.mare)+'｜'+esc(planner.goalLabels[ctx.goal]||ctx.goal)+'</h3></div><button type="button" class="secondary" id="closeRouteBridge">閉じる</button></div><div class="route-bridge-path">'+ctx.route.sires.map(esc).join(' → ')+'</div><div class="sale-method">セリ設計で選んだルートの判定を、配合カテゴリでも同じ計算結果で確認できます。</div>'+syncNote+ctx.x.stages.map(bridgeStageHtml).join('')+'<button type="button" class="secondary route-breed-link" id="filterFinalSire">最終父を候補欄で検索</button>';
 $('#closeRouteBridge').onclick=()=>card.remove();
 $('#filterFinalSire').onclick=()=>{
  const q=$('#stallionSearch');if(!q)return;
  q.value=ctx.route.sires[ctx.route.sires.length-1]||'';
  q.dispatchEvent(new Event('input',{bubbles:true}));
  q.scrollIntoView({behavior:'smooth',block:'center'});
 };
 card.scrollIntoView({behavior:'smooth',block:'start'});
}
function cleanupLegacySaleSync(){
 const races=db.races||[];
 const keySafe=x=>engine?.core?.key?.(x)||String(x||'').normalize('NFKC').trim().toLowerCase();
 const before=db.horses.length;
 db.horses=db.horses.filter(h=>!(
   h?.salePlannerSync===true&&
   h.generation==='セリ牝馬（配合確認用）'&&
   h.note==='セリ牝馬設計から配合確認用に同期'&&
   h.masterRef?.type==='default-broodmare'&&
   keySafe(h.name)===keySafe(h.masterRef.name)&&
   (h.role===undefined||h.role==='broodmare')&&
   (h.record||'-')==='-'&&(h.guts||'-')==='-'&&(h.stable||'-')==='-'&&
   !String(h.minD||'').trim()&&!String(h.maxD||'').trim()&&
   !String(h.starts||'').trim()&&!String(h.g1||'').trim()&&!String(h.roleMemo||'').trim()&&
   !String(h.dam||'').trim()&&!String(h.damSire||'').trim()&&!String(h.sireSire||'').trim()&&
   !String(h.sireDam||'').trim()&&!String(h.damDam||'').trim()&&!String(h.sireDamSire||'').trim()&&!String(h.damDamSire||'').trim()&&
   !races.some(r=>r.horseId===h.id)
 ));
 if(db.horses.length!==before){save();window.renderHorses?.();window.renderBreed?.()}
}
function ensureSaleMareForBreed(name){
 if(!engine||!name)return null;
 const key=engine.core?.key||((x)=>String(x||'').normalize('NFKC').trim().toLowerCase());
 const saved=(db.horses||[]).find(x=>x.sex==='牝'&&x.masterRef?.type==='default-broodmare'&&key(x.masterRef.name||x.name)===key(name))||null;
 if(saved){window.DABISTA_TRANSIENT_BREED_MARE=null;return saved}
 const m=engine.master?.(name),stats=engine.mareStats?.(name);
 if(!m||!Array.isArray(m.ancestor)||m.ancestor.length!==15)return null;
 const h={
   id:'transient-sale:'+key(name),name,sex:'牝',role:'broodmare',generation:'セリ牝馬（閲覧用）',
   sire:m.ancestor[0]||'',dam:'',minD:'',maxD:'',record:'-',guts:'-',stable:'-',starts:'',g1:'',
   note:'セリ牝馬設計から一時表示',
   masterRef:{type:'default-broodmare',name},
   ancestor15:[...m.ancestor],omoshiroCode:m.omoshiro||'',migotoCode:m.migoto||'',
   mareStats:stats?{...stats}:undefined,transientBreedOnly:true
 };
 window.DABISTA_TRANSIENT_BREED_MARE=h;
 window.renderBreed?.();
 return h;
}

function openRouteInBreed(id){
 const ctx=routeContexts.get(id);if(!ctx)return;
 window.DABISTA_SELECTED_SALE_ROUTE=ctx;
 const synced=ensureSaleMareForBreed(ctx.mare);
 const goalMap={arc:'breaker',bc:'breaker',rebuild:'rebuild',stallion:'successor'};
 const goal=$('#breedGoal');
 if(goal&&goalMap[ctx.goal]){goal.value=goalMap[ctx.goal];goal.dispatchEvent(new Event('change',{bubbles:true}))}
 $('.tab[data-tab="breed"]')?.click();
 setTimeout(()=>{
  window.renderBreed?.();
  const ms=$('#breedMare');
  if(ms&&synced){
   ms.value=synced.id;
   ms.dispatchEvent(new Event('change',{bubbles:true}));
  }
  renderRouteBreedBridge(ctx,synced);
 },80);
}

function profileHtml(profile,routes,goal,scope){
 const label=planner.profileLabels[profile],criteria=planner.profileCriteria[profile];
 if(!routes?.length){
  const empty=profile==='speedCross'
   ?'SPクロス補強型候補なし。この世代の探索範囲では、安全な候補に速力/短距離の有効クロスが成立しません。SP上限型など他の軸と比較してください。'
   :'条件を満たす候補を取得できませんでした。';
  return`<div class="card sale-profile"><h3>${esc(label)}</h3><p class="muted">${esc(empty)}</p></div>`
 }
 const crossNote=profile==='speedCross'
  ?'<div class="notice">速力または短距離の有効クロスを持つ候補だけを表示する<b>血統上限側の軸</b>です。ここで1位でも強馬生産の確度1位とは限りません。最終父の実績・安定と中間牝馬の選抜条件も確認してください。</div>'
  :profile==='production'
   ?'<div class="notice"><b>強馬生産型：</b>多世代では途中または締めに速力/短距離クロスを最低1回確保し、SP15/ST5を最低線に最終父の実績を評価します。安定C/B/Aは「上振れ幅の違い」として比較し、安定Aは高能力の中間牝馬を実際に選抜できた場合に向く条件として扱います。</div>'
   :'';
 return `<div class="card sale-profile"><h3>${esc(label)}</h3><div class="sale-method">並び順：${esc(criteria)}</div>${crossNote}${profile==='sire'?`<div class="sale-method">評価範囲：${esc(scope)}</div>`:''}${routes.map((r,i)=>routeHtml(r,i,goal,profile)).join('')}</div>`
}
function renderResults(result){
 routeContexts.clear();routeContextSeq=0;
 const goal=db.salePlanner.goal,order=planner.goalOrder(goal),gen=+db.salePlanner.generation,info=planner.mareInfo(db.salePlanner.mare);
 const method=gen===1?`直仔176頭を全探索（安全ルート ${result.safeCount.toLocaleString()}件）`
  :gen===2?`2代の安全ルート ${result.safeCount.toLocaleString()}件を全探索`
  :gen===3?`2代目まで ${result.baseSafeCount.toLocaleString()}件を全探索後、${result.previewBaseCount3}本の多軸候補から3代目 ${result.safeCount.toLocaleString()}安全ルートを条件付き探索`
  :`2代目まで ${result.baseSafeCount.toLocaleString()}件を全探索し、3代目を${result.previewBaseCount3}本から条件付き探索後、${result.previewBaseCount4}本の3代候補から4代目 ${result.safeCount.toLocaleString()}安全ルートを条件付き探索`;
 const caution=!info.abilityKnown?'<div class="notice"><b>繁殖能力未判明：</b>母能力を含む総合評価は保留。血統・ニトロ・配合理論だけで候補を表示しています。</div>':'';
 const profiles={...result.base.profiles,sire:result.portfolio.routes};
 $('#salePlannerResults').innerHTML=`<div class="card"><div class="row"><h3 class="section-title">${esc(db.salePlanner.mare)}｜${esc(planner.goalLabels[goal])}</h3><span class="badge gold">${gen===1?'直仔':gen+'代'}設計</span></div><p class="muted">${esc(method)}</p>${caution}<div class="notice">6軸は合算して総合1位を作りません。<b>強馬生産型</b>は最終父の実績・安定とSP/ST最低線を重視し、SP上限型・SPクロス補強型は血統上限側として別に残します。実際に生産した中間牝馬の能力を確認して次世代へ進めてください。</div></div>`+order.map(p=>profileHtml(p,profiles[p],goal,result.portfolioScope)).join('');
}
async function runDesign(){
 if(!planner)return;
 const name=$('#saleMareSelect')?.value;if(!name)return;
 const gen=+db.salePlanner.generation;
 if(![1,2,3,4].includes(gen)){const p=$('#salePlannerProgress');if(p)p.textContent='世代が未選択です。世代診断を実行するか、直仔・2代・3代・4代を手動で選択してください。';return}
 db.salePlanner.mare=name;save();const seq=++runSeq,btn=$('#runSalePlanner');btn.disabled=true;
 $('#salePlannerResults').innerHTML='';$('#salePlannerProgress').textContent='設計を開始します…';
 try{
  const baseCollector=planner.createCollector({topN:3,poolN:24});
  let baseSafe=0,directAll=[];
  if(gen===1){
   for(const r of planner.iterateDirect(name)){baseCollector.push(r);directAll.push(r);baseSafe++}
  }else{
   baseSafe=await scanIterator(planner.iterateTwo(name),baseCollector,seq,'2代全探索');
  }
  const base=baseCollector.finish();
  let finalBase=base,safeCount=baseSafe,previewBaseCount3=0,previewBaseCount4=0,thirdSafeCount=0,portfolioSource,portfolioScope;
  if(gen>=3){
   const bases3=previewBases(base.shortlists,12);previewBaseCount3=bases3.length;
   const c3=planner.createCollector({topN:3,poolN:18});
   thirdSafeCount=await scanIterator(planner.iterateThirdPreview(name,bases3),c3,seq,'3代条件付きプレビュー');
   const r3=c3.finish();
   if(gen===4){
    const bases4=previewBases(r3.shortlists,8);previewBaseCount4=bases4.length;
    const c4=planner.createCollector({topN:3,poolN:16});
    safeCount=await scanIterator(planner.iterateFourthPreview(name,bases4),c4,seq,'4代条件付きプレビュー');
    finalBase=c4.finish();portfolioSource=finalBase.pool;
    portfolioScope=`4代目条件付き候補プール ${portfolioSource.length}件。2代目までは全探索、3代・4代は段階的な多軸候補探索で、全176⁴探索ではありません。`;
   }else{
    safeCount=thirdSafeCount;finalBase=r3;portfolioSource=finalBase.pool;
    portfolioScope=`3代目条件付き候補プール ${portfolioSource.length}件。2代目までは全探索、3代目は全176³探索ではありません。`;
   }
  }else if(gen===2){
   portfolioSource=base.pool;portfolioScope=`2代全探索後の多軸候補プール ${portfolioSource.length}件。将来価値はこの候補群で比較。`;
  }else{
   portfolioSource=directAll;portfolioScope=`直仔の安全候補 ${portfolioSource.length}件すべてで将来価値を比較。`;
  }
  $('#salePlannerProgress').textContent='自家製種牡馬としての血統汎用性をSP+ST≥120 / ≥130の2母集団で比較中…';await yieldUi();
  const portfolio=planner.portfolioPareto(portfolioSource,3);
  if(seq!==runSeq)return;
  renderResults({base:finalBase,portfolio,safeCount,baseSafeCount:baseSafe,previewBaseCount3,previewBaseCount4,thirdSafeCount,portfolioScope});
  $('#salePlannerProgress').textContent=`設計完了：${gen===4?'4代目は条件付き仮プレビューです。':gen===3?'3代目は条件付き仮プレビューです。':'対象範囲を全探索しました。'}`;
 }catch(e){
  if(String(e).includes('cancelled'))return;
  window.APP_ERRORS?.push({at:new Date().toISOString(),message:'sale-planner: '+String(e)});
  $('#salePlannerProgress').textContent='設計中にエラーが発生しました。診断JSONに記録しました。';
 }finally{btn.disabled=false}
}
async function load(){
 try{
  engine=await window.DABISTA_BREEDING_ENGINE.ready;
  if(!window.DABISTA_SALE_PLANNER_CORE)throw Error('sale-planner-core missing');
  planner=window.DABISTA_SALE_PLANNER_CORE.create({
    engine:engine.core,
    stallions:engine.domesticStallions(),
    stallionStats:engine.stallionData.stallions||[],
    broodmares:engine.broodmares(),
    broodmareStats:engine.mareData.broodmares||[]
  });
  if(window.DABISTA_SALE_RECOMMENDATION_CORE){
   recommendationAdvisor=window.DABISTA_SALE_RECOMMENDATION_CORE.create({planner,broodmareStats:engine.mareData.broodmares||[]});
  }
  cleanupLegacySaleSync();inject();fillMares();paintButtons();renderNotice();
  window.DABISTA_SALE_PLANNER={version:1,planner,run:runDesign,openRouteInBreed,routeContexts,setGeneration,resetGenerationSelection};
 }catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'sale-planner-load: '+String(e)})}
}
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}
async function checkUpdate(show=false){try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store'}),v=await r.json();if(newer(v.version,V)||v.build!==BUILD){$('#updateText').textContent=`最新版 v${v.version} / ${v.build} があります`;$('#updatebar').classList.add('show')}else{$('#updatebar').classList.remove('show');if(show)alert(`最新版です\nv${V} / ${BUILD}`)}}catch{if(show)alert('更新確認に失敗しました。')}}
setTimeout(load,2200);
setTimeout(()=>{if($('#refreshBtn'))$('#refreshBtn').onclick=()=>checkUpdate(true)},5200);
})();
