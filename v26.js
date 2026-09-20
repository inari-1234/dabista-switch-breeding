(()=>{
'use strict';
const V='1.17.0',BUILD='2026.09.20-36',db=window.db,$=s=>document.querySelector(s),esc=window.esc||((s)=>String(s??''));
if(!db)return;
window.APP_VERSION=V;window.APP_BUILD=BUILD;
const ve=$('#ver');if(ve)ve.textContent=`v${V} / Build ${BUILD}`;
let engine=null,planner=null,recommendationAdvisor=null,runSeq=0,routeContextSeq=0;const routeContexts=new Map();
db.salePlanner=db.salePlanner||{mare:'エイスト',goal:'arc',generation:1};

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
 .route-breed-link{width:100%;margin-top:8px}
 .sale-route-bridge{border-color:#bcd8ca!important;background:linear-gradient(145deg,#fff,#f2f8f5)!important}
 .route-bridge-path{font-weight:800;font-size:12px;line-height:1.55;margin:6px 0}
 .route-bridge-stage{padding:8px;border-radius:9px;background:#fff;border:1px solid #e0e8e4;margin-top:6px;font-size:10px;line-height:1.5}
 .sale-select{margin-top:7px;padding:7px;border-left:3px solid #d6b566;background:#fff9e7;border-radius:0 7px 7px 0}
 .sale-portfolio{font-size:10px;line-height:1.55;background:#eef2f6;border-radius:8px;padding:7px;margin-top:7px}
 .sale-progress{font-size:11px;line-height:1.5;margin-top:8px}
 .sale-method{font-size:10px;line-height:1.5;color:#66736c}
 @media(max-width:520px){.sale-controls{grid-template-columns:1fr}.sale-seg{grid-template-columns:1fr 1fr}}
 `;document.head.appendChild(s)
}
function goalButtons(){
 const labels={arc:'凱旋門賞',stallion:'自家製種牡馬',rebuild:'繁殖再建',bc:'BC長期'};
 return Object.entries(labels).map(([k,v])=>`<button type="button" data-sale-goal="${k}" class="${db.salePlanner.goal===k?'on':''}">${v}</button>`).join('')
}
function genButtons(){
 return [1,2,3].map(n=>`<button type="button" data-sale-gen="${n}" class="${+db.salePlanner.generation===n?'on':''}">${n===1?'直仔':n+'代'}</button>`).join('')
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
  <label>目的</label><div class="sale-seg" id="saleGoalButtons">${goalButtons()}</div>
  <label>世代</label><div class="sale-seg gens" id="saleGenButtons">${genButtons()}</div>
  <div id="salePlannerNotice" class="notice">直仔は176頭全探索、2代は安全な1代目から約3万ルートを全探索します。3代は2代目まで全探索した候補を起点に条件付きプレビューします。</div>
  <div class="actions"><button class="primary" id="runSalePlanner">この条件で設計</button></div>
  <div id="salePlannerProgress" class="sale-progress"></div>
 `;
 const intro=$('#rebuild .card');intro?.insertAdjacentElement('afterend',card);
 const results=document.createElement('div');results.id='salePlannerResults';card.insertAdjacentElement('afterend',results);
 $('#saleMareSearch').oninput=()=>{invalidateResults('検索条件を変更しました。');fillMares()};
 $('#saleMareSelect').onchange=()=>{db.salePlanner.mare=$('#saleMareSelect').value;save();renderMare();invalidateResults()};
 $('#saleGoalButtons').onclick=e=>{const b=e.target.closest('[data-sale-goal]');if(!b)return;db.salePlanner.goal=b.dataset.saleGoal;save();paintButtons();renderNotice();invalidateResults()};
 $('#saleGenButtons').onclick=e=>{const b=e.target.closest('[data-sale-gen]');if(!b)return;db.salePlanner.generation=+b.dataset.saleGen;save();paintButtons();renderNotice();invalidateResults()};
 $('#runSalePlanner').onclick=runDesign;
 $('#rebuildStarter')?.addEventListener('change',()=>{const n=$('#rebuildStarter').value;if(planner?.mare(n)){db.salePlanner.mare=n;save();fillMares();renderMare();invalidateResults('起点牝馬を同期しました。')}});
}
function paintButtons(){
 document.querySelectorAll('[data-sale-goal]').forEach(b=>b.classList.toggle('on',b.dataset.saleGoal===db.salePlanner.goal));
 document.querySelectorAll('[data-sale-gen]').forEach(b=>b.classList.toggle('on',+b.dataset.saleGen===+db.salePlanner.generation));
}
function fillMares(){
 if(!planner)return;
 const q=String($('#saleMareSearch')?.value||'').normalize('NFKC').toLowerCase();
 const stats=engine.mareData.broodmares||[],names=stats.filter(x=>!q||x.name.normalize('NFKC').toLowerCase().includes(q)).map(x=>x.name);
 const sel=$('#saleMareSelect');if(!sel)return;
 const keep=db.salePlanner.mare||'エイスト';
 if(!names.length){
  sel.innerHTML='<option value="">該当なし</option>';
  $('#saleMareSummary').textContent='検索条件に一致する繁殖牝馬がありません。';
  if($('#runSalePlanner'))$('#runSalePlanner').disabled=true;
  return;
 }
 sel.innerHTML=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
 if(names.includes(keep))sel.value=keep;else{sel.value=names[0];db.salePlanner.mare=sel.value;save()}
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
 if(n===1)el.innerHTML='<b>直仔：</b>国内176種牡馬を全探索。危険・超危険を除外し、複数軸で候補を表示します。';
 else if(n===2)el.innerHTML='<b>2代：</b>安全な1代目から国内176頭を掛け合わせ、約3万ルートを全探索します。中間牝馬の繁殖能力は出生前に仮定しません。';
 else el.innerHTML='<b>3代：</b>2代目までは全探索。3代目はSP/ST/バランス/配合理論の多軸候補を起点に条件付き探索する仮プレビューです。全176³の最適解とは表示しません。';
}
const yieldUi=()=>new Promise(r=>setTimeout(r,0));
function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set(),keys=['sp','st','balance','theory'];
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
 if(!insight.rawCount)return '<div class="sale-effect-block"><span class="sale-effect-title">クロス</span><span class="muted">なし</span></div>';
 let items='';
 for(const x of insight.items){
  const factor=x.factor?'祖先因子寄与 SP'+signed(x.factor.sp)+' / ST'+signed(x.factor.st)+' / PW'+signed(x.factor.pw):'祖先因子寄与なし';
  const priority=x.priority==='high'?'注目':'有効';
  items+='<div class="cross-item '+x.priority+'"><div class="cross-head"><b>'+esc(x.name)+' '+x.sireGen+'×'+x.mareGen+'</b><span class="cross-priority">'+priority+'</span></div><div class="cross-factor">'+factor+'</div></div>';
 }
 const note=insight.suppressedCount
  ?'生クロス '+insight.rawCount+'件 / 祖先内包を除く有効クロス '+insight.effectiveCount+'件 / 除外 '+insight.suppressedCount+'件'
  :'有効クロス '+insight.effectiveCount+'件。因子寄与はニトロ側の表示で、クロス効果そのものとは分けて扱います。';
 return '<div class="sale-effect-block"><span class="sale-effect-title">有効クロス</span>'+(items?'<div class="cross-list">'+items+'</div>':'<span class="muted">有効クロスなし</span>')+'<div class="sale-method">'+note+'</div></div>';
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
function routeHtml(route,index,goal,profile){
 const x=planner.expandRoute(db.salePlanner.mare,route,goal);if(!x)return'';
 const f=route.final||{},method=route.method==='conditional-three-generation-preview'?'3代目は条件付き仮プレビュー':'この表示範囲は全探索結果';
 return `<div class="sale-route"><div class="sale-route-title"><b>候補 ${index+1}</b><span class="badge">SP ${f.sp} / ST ${f.st} / PW ${f.pw}</span></div><div class="sale-path">${route.sires.map(esc).join(' → ')}</div><div class="sale-method">${method}。途中世代の繁殖SP/ST/PWは仮定していません。</div>${x.stages.map(st=>stageHtml(st,x.stages.length,goal)).join('')}${profile==='sire'?portfolioHtml(route):''}</div>`
}
function profileHtml(profile,routes,goal,scope){
 const label=planner.profileLabels[profile],criteria=planner.profileCriteria[profile];
 if(!routes?.length)return`<div class="card sale-profile"><h3>${esc(label)}</h3><p class="muted">条件を満たす候補を取得できませんでした。</p></div>`;
 return `<div class="card sale-profile"><h3>${esc(label)}</h3><div class="sale-method">並び順：${esc(criteria)}</div>${profile==='sire'?`<div class="sale-method">評価範囲：${esc(scope)}</div>`:''}${routes.map((r,i)=>routeHtml(r,i,goal,profile)).join('')}</div>`
}
function renderResults(result){
 const goal=db.salePlanner.goal,order=planner.goalOrder(goal),gen=+db.salePlanner.generation,info=planner.mareInfo(db.salePlanner.mare);
 const method=gen===1?`直仔176頭を全探索（安全ルート ${result.safeCount.toLocaleString()}件）`:gen===2?`2代の安全ルート ${result.safeCount.toLocaleString()}件を全探索`:`2代目まで ${result.baseSafeCount.toLocaleString()}件を全探索後、${result.previewBaseCount}本の多軸候補から3代目 ${result.safeCount.toLocaleString()}安全ルートを条件付き探索`;
 const caution=!info.abilityKnown?'<div class="notice"><b>繁殖能力未判明：</b>母能力を含む総合評価は保留。血統・ニトロ・配合理論だけで候補を表示しています。</div>':'';
 const profiles={...result.base.profiles,sire:result.portfolio.routes};
 $('#salePlannerResults').innerHTML=`<div class="card"><div class="row"><h3 class="section-title">${esc(db.salePlanner.mare)}｜${esc(planner.goalLabels[goal])}</h3><span class="badge gold">${gen===1?'直仔':gen+'代'}設計</span></div><p class="muted">${esc(method)}</p>${caution}<div class="notice">4軸は合算して総合1位を作りません。最終締め時の血統を重視し、実際に生産した中間牝馬の能力を確認して次世代へ進めてください。</div></div>`+order.map(p=>profileHtml(p,profiles[p],goal,result.portfolioScope)).join('');
}
async function runDesign(){
 if(!planner)return;
 const name=$('#saleMareSelect')?.value;if(!name)return;
 db.salePlanner.mare=name;save();const gen=+db.salePlanner.generation,seq=++runSeq,btn=$('#runSalePlanner');btn.disabled=true;
 $('#salePlannerResults').innerHTML='';$('#salePlannerProgress').textContent='設計を開始します…';
 try{
  const baseCollector=planner.createCollector({topN:3,poolN:24});
  let baseSafe=0,directAll=[];
  if(gen===1){
   for(const r of planner.iterateDirect(name)){baseCollector.push(r);directAll.push(r);baseSafe++}
  }else{
   baseSafe=await scanIterator(planner.iterateTwo(name),baseCollector,seq,'2代全探索');
  }
  const base=baseCollector.finish();let finalBase=base,safeCount=baseSafe,previewBaseCount=0,portfolioSource,portfolioScope;
  if(gen===3){
   const bases=previewBases(base.shortlists,12);previewBaseCount=bases.length;
   const c=planner.createCollector({topN:3,poolN:18});
   safeCount=await scanIterator(planner.iterateThirdPreview(name,bases),c,seq,'3代条件付きプレビュー');
   finalBase=c.finish();portfolioSource=finalBase.pool;
   portfolioScope=`3代目条件付き候補プール ${portfolioSource.length}件。2代目までは全探索、3代目は全176³探索ではありません。`;
  }else if(gen===2){
   portfolioSource=base.pool;portfolioScope=`2代全探索後の多軸候補プール ${portfolioSource.length}件。将来価値はこの候補群で比較。`;
  }else{
   portfolioSource=directAll;portfolioScope=`直仔の安全候補 ${portfolioSource.length}件すべてで将来価値を比較。`;
  }
  $('#salePlannerProgress').textContent='自家製種牡馬としての血統汎用性をSP+ST≥120 / ≥130の2母集団で比較中…';await yieldUi();
  const portfolio=planner.portfolioPareto(portfolioSource,3);
  if(seq!==runSeq)return;
  renderResults({base:finalBase,portfolio,safeCount,baseSafeCount:baseSafe,previewBaseCount,portfolioScope});
  $('#salePlannerProgress').textContent=`設計完了：${gen===3?'3代目は条件付き仮プレビューです。':'対象範囲を全探索しました。'}`;
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
  inject();fillMares();paintButtons();renderNotice();
  window.DABISTA_SALE_PLANNER={version:1,planner,run:runDesign};
 }catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'sale-planner-load: '+String(e)})}
}
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}
async function checkUpdate(show=false){try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store'}),v=await r.json();if(newer(v.version,V)||v.build!==BUILD){$('#updateText').textContent=`最新版 v${v.version} / ${v.build} があります`;$('#updatebar').classList.add('show')}else{$('#updatebar').classList.remove('show');if(show)alert(`最新版です\nv${V} / ${BUILD}`)}}catch{if(show)alert('更新確認に失敗しました。')}}
setTimeout(load,2200);
setTimeout(()=>{if($('#refreshBtn'))$('#refreshBtn').onclick=()=>checkUpdate(true);checkUpdate(false)},5200);
})();
