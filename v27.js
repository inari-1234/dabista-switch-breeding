(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=window.esc||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
let advisor=null,planner=null,engine=null,diagSeq=0;

function style(){
 if($('#v27style'))return;
 const s=document.createElement('style');s.id='v27style';s.textContent=`
 .mare-advice{margin-top:8px;border:1px solid #d8e5de;border-radius:12px;background:#fbfcfb;padding:10px}
 .mare-advice-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
 .mare-advice-head h4{margin:0;font-size:12px}.mare-advice-head small{font-size:9px;color:#66736c}
 .mare-tier{display:inline-block;padding:7px 11px;border-radius:999px;background:#dcefe3;color:#1b5a35;font-size:14px;font-weight:900;white-space:nowrap}
 .mare-tier.unknown{background:#fff0c9;color:#6f5200}
 .mare-ranks{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}
 .mare-rank{background:#f2f6f3;border-radius:8px;padding:7px 4px;text-align:center}
 .mare-rank b{display:block;font-size:13px}.mare-rank small{display:block;font-size:8px;color:#66736c;line-height:1.35}
 .mare-use-title{margin-top:8px;font-size:9px;font-weight:800;color:#405048}
 .mare-use{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:5px}
 .mare-use>div{border:1px solid #e1e8e4;border-radius:8px;padding:7px;background:#fff}
 .mare-use>div.selected{border-color:#77ad91;background:#eef7f2;box-shadow:0 0 0 1px #77ad91 inset}
 .mare-use b{display:block;font-size:9px;color:#405048}.mare-use span{display:block;margin-top:2px;font-size:10px;font-weight:700}
 .mare-direct{margin-top:7px;font-size:9px;line-height:1.55;color:#66736c}
 .generation-advisor{margin-top:8px;border:1px solid #cdded5;border-radius:12px;background:linear-gradient(145deg,#fff,#f5faf7);padding:10px}
 .generation-advisor h4{margin:0;font-size:12px}
 .generation-advisor p{font-size:9px;line-height:1.55;color:#66736c;margin:5px 0}
 .generation-progress{font-size:10px;line-height:1.5;color:#66736c;margin-top:7px}
 .generation-result{margin-top:9px}
 .generation-pick{border-left:4px solid #17855f;background:#edf7f2;border-radius:0 10px 10px 0;padding:9px}
 .generation-pick b{display:block;font-size:14px;color:#174b37}.generation-pick span{font-size:9px;line-height:1.55;color:#50665b}
 .generation-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
 .generation-card{border:1px solid #dfe7e3;border-radius:10px;background:#fff;padding:8px}
 .generation-card.recommended{border-color:#77ad91;box-shadow:0 0 0 1px #77ad91 inset}
 .generation-card h5{margin:0 0 5px;font-size:10px}.generation-card small{display:block;color:#66736c;font-size:8px;line-height:1.45}
 .generation-card .gmetric{display:flex;justify-content:space-between;gap:6px;font-size:9px;padding:2px 0}
 .generation-reasons{margin:8px 0 0;padding:0 0 0 16px;color:#53675e;font-size:9px;line-height:1.55}
 .generation-decision{margin-top:8px;padding:9px;border-radius:10px;background:#eef7f2;border:1px solid #cde1d6}
 .generation-decision b{display:block;font-size:10px;color:#23543e;margin-bottom:4px}
 .generation-decision ul{margin:0;padding-left:17px;font-size:9px;line-height:1.55;color:#456055}
 .generation-why{margin-top:8px;padding:9px;border:1px solid #dce7e1;border-radius:10px;background:#fff}
 .generation-why>strong{display:block;font-size:11px;color:#264f3c}
 .generation-delta{margin-top:5px;padding:6px 7px;border-radius:8px;background:#f2f6f3;font-size:9px;line-height:1.5}
 .generation-timeline{display:grid;gap:5px;margin-top:7px}
 .generation-step{padding:6px 7px;border-left:3px solid #79ad90;background:#f8faf9;border-radius:0 8px 8px 0}
 .generation-step b{display:block;font-size:9px}.generation-step span{display:block;margin-top:2px;color:#617169;font-size:8px;line-height:1.45}
 .generation-action{margin-top:8px;width:100%}
 .advisor-note{margin-top:7px;padding:7px;border-radius:8px;background:#f1f5f2;font-size:8px;line-height:1.5;color:#66736c}
 .mare-advice{transition:border-color .15s ease,background .15s ease}
 .mare-advice.tier-elite{border-color:#8fc8aa;background:linear-gradient(145deg,#edf8f2,#f9fcfa)}
 .mare-advice.tier-high{border-color:#9fc3e6;background:linear-gradient(145deg,#eef5fc,#fafcff)}
 .mare-advice.tier-upper{border-color:#a9d3ca;background:linear-gradient(145deg,#eef8f6,#fbfdfc)}
 .mare-advice.tier-middle{border-color:#e1c46f;background:linear-gradient(145deg,#fff8e5,#fffdf7)}
 .mare-advice.tier-rebuild{border-color:#dfb283;background:linear-gradient(145deg,#fff4e8,#fffaf5)}
 .mare-advice.tier-unknown{border-color:#cfd7d3;background:linear-gradient(145deg,#f3f5f4,#fafbfa)}
 .mare-advice-head{align-items:center}
 .mare-advice-head h4{font-size:17px;line-height:1.2;letter-spacing:-.02em}
 .mare-advice-head small{display:block;margin-top:4px;font-size:10px}
 .mare-tier{padding:7px 11px;font-size:14px;font-weight:900;white-space:nowrap}
 .tier-high .mare-tier{background:#e4effa;color:#285d91}
 .tier-upper .mare-tier{background:#dff1ed;color:#24685a}
 .tier-middle .mare-tier{background:#fff0bd;color:#76540c}
 .tier-rebuild .mare-tier{background:#ffe7cf;color:#875118}
 .tier-unknown .mare-tier{background:#e7ece9;color:#596660}
 .mare-priority{margin-top:9px;padding:10px 11px;border-radius:10px;background:rgba(255,255,255,.78);border:1px solid rgba(90,120,105,.16)}
 .mare-priority small{display:block;font-size:9px;font-weight:800;color:#65766e}
 .mare-priority b{display:block;margin-top:2px;font-size:13px;line-height:1.4;color:#243f33}
 .mare-ranks{gap:6px}
 .mare-rank{padding:8px 5px;background:rgba(255,255,255,.82);border:1px solid rgba(80,110,95,.10)}
 .mare-rank>span{display:block;font-size:9px;font-weight:900;color:#60736a}
 .mare-rank b{font-size:17px;margin-top:2px}
 .mare-rank small{font-size:9px;line-height:1.35}
 .mare-goal-now{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:8px;padding:10px 11px;border-radius:10px;background:#fff;border:1px solid rgba(70,105,88,.14)}
 .mare-goal-now span{font-size:10px;font-weight:800;color:#60736a}
 .mare-goal-now b{font-size:12px;text-align:right;color:#254b39}
 .mare-detail{margin-top:8px;border-top:1px solid rgba(90,120,105,.16);padding-top:7px}
 .mare-detail>summary{cursor:pointer;font-size:10px;font-weight:800;color:#53675e}
 .mare-detail .advisor-note{font-size:9px}
 .mare-direct{font-size:9px}
 .mare-why{margin-top:9px;padding:11px 12px;border-radius:11px;background:rgba(255,255,255,.86);border:1px solid rgba(70,105,88,.14)}
 .mare-why small{display:block;font-size:9px;font-weight:900;color:#687970}
 .mare-why b{display:block;margin-top:3px;font-size:13px;line-height:1.45;color:#203d30}
 .mare-scoreline{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
 .mare-scoreline span,.mare-scoreline b{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.82);border:1px solid rgba(80,110,95,.10);font-size:10px}
 .mare-scoreline b{font-size:11px;color:#244b39}
 .mare-color-note{font-size:8px!important;color:#738077!important}
 .generation-compare{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
 .generation-compare-card{display:block;width:100%;text-align:left;border:1px solid #dfe7e3;border-radius:10px;background:#fff;padding:9px;cursor:pointer;color:inherit}
 .generation-compare-card.recommended{border-color:#9bc7b0;background:#f3f9f6}
 .generation-compare-card.selected{border-color:#2f7d5d;background:#eaf6f0;box-shadow:0 0 0 2px #2f7d5d inset}
 .generation-compare-card:focus-visible{outline:3px solid rgba(47,125,93,.25);outline-offset:2px}
 .generation-compare-card span{display:block;font-size:9px;font-weight:900;color:#65766e}
 .generation-compare-card b{display:block;margin-top:3px;font-size:13px;color:#234b38}
 .generation-compare-card small{display:block;margin-top:2px;font-size:8px;color:#6a7871}
 .generation-key-reason{margin-top:8px;padding:10px 11px;border-radius:10px;background:#f3f7f5}
 .generation-key-reason b{display:block;font-size:11px;color:#264f3c}
 .generation-key-reason ul{margin:5px 0 0;padding-left:17px;font-size:9px;line-height:1.5;color:#53675e}
 .generation-tech{margin-top:8px}
 .generation-tech>summary{cursor:pointer;font-size:9px;font-weight:800;color:#65766e}
 @media(max-width:420px){.mare-ranks{grid-template-columns:repeat(2,1fr)}.generation-grid{grid-template-columns:1fr}.mare-use{grid-template-columns:1fr 1fr}.mare-advice-head h4{font-size:16px}.mare-tier{font-size:13px}}
 `;document.head.appendChild(s)
}
function fmtRank(r){
 if(!r)return'<b>—</b><small>未判明</small>';
 return `<b>${r.value}</b><small>${r.rank}/${r.total}位<br>上位${r.topPercent}%</small>`
}
function directSnapshot(name){
 const sum=advisor.emptySummary('direct');
 for(const r of planner.iterateDirect(name))advisor.addRoute(sum,r);
 return sum
}
function mareTierTone(a){
 if(!a?.abilityKnown)return'unknown';
 const p=Number(a?.ranks?.spst?.topPercent||100);
 if(p<=5)return'elite';
 if(p<=15)return'high';
 if(p<=35)return'upper';
 if(p<=60)return'middle';
 return'rebuild';
}
function mareRankCell(label,r){
 if(!r)return`<div class="mare-rank"><span>${esc(label)}</span><b>—</b><small>未判明</small></div>`;
 return `<div class="mare-rank"><span>${esc(label)}</span><b>${r.value}</b><small>${r.rank}/${r.total}位・上位${r.topPercent}%</small></div>`;
}
function mareDecisionText(a,strategy,goal){
 const tone=mareTierTone(a),improve=(strategy?.improve||[]).slice(0,2).join('・')||'弱点';
 if(!a?.abilityKnown)return'能力は未判明です。血統だけで候補を比較し、能力値0を弱さとして扱いません。';
 if(tone==='elite'||tone==='high')return'上位母です。能力を崩さず、'+improve+'だけを補う配合を優先します。';
 if(tone==='upper')return'中上位母です。母の長所を残しながら、'+improve+'を補う配合を優先します。';
 if(tone==='middle')return'中位母です。父実績Aを強く評価し、'+improve+'・ニトロ・クロス・短距離側の距離適性で明確に上回る場合だけB/Cを逆転候補にします。';
 return'再建向きの母です。父実績Aを基準に、SP/ST底上げ・短距離側の距離適性・クロスで明確な利点がある場合だけB/Cや安定Cを採用します。';
}
function renderMareAdvice(){
 const box=$('#saleMareRecommendation'),name=$('#saleMareSelect')?.value;
 if(!box||!advisor)return;
 if(!name){box.className='mare-advice tier-unknown';box.innerHTML='<div class="muted">検索条件に一致する繁殖牝馬がありません。</div>';return}
 const a=advisor.mareAssessment(name);
 if(!a){box.className='mare-advice tier-unknown';box.innerHTML='<div class="muted">牝馬評価を取得できませんでした。</div>';return}
 const direct=directSnapshot(name),use=advisor.directUseLabels(a,direct),strategy=advisor.mareStrategy(name),goal=window.db?.salePlanner?.goal||'arc';
 const tone=mareTierTone(a),goalNames={arc:'凱旋門賞',bc:'BC長期',rebuild:'繁殖再建',stallion:'自家製種牡馬'};
 box.className='mare-advice tier-'+tone;
 const rankHtml=a.abilityKnown
  ?`<div class="mare-scoreline"><span>SP ${a.ranks.sp?.value??'—'}</span><span>ST ${a.ranks.st?.value??'—'}</span><span>PW ${a.ranks.pw?.value??'—'}</span><b>SP+ST ${a.ranks.spst?.value??'—'}</b></div>`
  :'<div class="mare-scoreline"><b>能力未判明</b></div>';
 const currentUse=use?.[goal]||'評価保留';
 const decision=mareDecisionText(a,strategy,goal);
 box.innerHTML=`
   <div class="mare-advice-head">
    <div><h4>${esc(name)}</h4><small>能力既知 ${advisor.knownAbilityCount}頭で比較</small><small class="mare-color-note">カード色＝母能力帯</small></div>
    <span class="mare-tier">${esc(a.tier)}</span>
   </div>
   <div class="mare-why"><small>この牝馬を使う理由｜${esc(goalNames[goal]||goal)}</small><b>${esc(decision)}</b></div>
   ${rankHtml}
   <details class="mare-detail">
    <summary>順位・他目的・血統評価を見る</summary>
    ${a.abilityKnown?`<div class="mare-ranks">
     ${mareRankCell('繁殖SP',a.ranks.sp)}
     ${mareRankCell('繁殖ST',a.ranks.st)}
     ${mareRankCell('繁殖PW',a.ranks.pw)}
     ${mareRankCell('SP+ST',a.ranks.spst)}
    </div>`:''}
    ${strategy?`<div class="advisor-note"><b>補強タイプ：${esc(strategy.label)}</b><br>維持：${strategy.preserve.length?esc(strategy.preserve.join('・')):'—'} / 補強：${strategy.improve.length?esc(strategy.improve.join('・')):'—'}</div>`:''}
    <div class="mare-use-title">目的別の事前評価</div>
    <div class="mare-use">
     <div class="${goal==='arc'?'selected':''}"><b>凱旋門賞</b><span>${esc(use.arc)}</span></div>
     <div class="${goal==='bc'?'selected':''}"><b>BC長期</b><span>${esc(use.bc)}</span></div>
     <div class="${goal==='rebuild'?'selected':''}"><b>繁殖再建</b><span>${esc(use.rebuild)}</span></div>
     <div class="${goal==='stallion'?'selected':''}"><b>自家製種牡馬</b><span>${esc(use.stallion)}</span></div>
    </div>
    <div class="mare-direct">直仔安全 ${direct.count}件 / SP15・ST5以上 ${direct.sp15st5}件 / 最大SP ${direct.maxSp} / 最大SP+ST ${direct.maxSpSt}</div>
    <div class="advisor-note">${esc(a.note)}</div>
   </details>`;
}
function invalidateGeneration(message='条件を変更したため、世代診断を更新してください。'){
 diagSeq++;
 const out=$('#generationAdvisorResult');if(out)out.innerHTML='';
 const p=$('#generationAdvisorProgress');if(p)p.textContent=message;
 const b=$('#runGenerationAdvisor');if(b)b.disabled=false;
}
const yieldUi=()=>new Promise(r=>setTimeout(r,0));
function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set(),keys=['sp','speedCross','production','st','balance','theory'];
 for(let i=0;i<maxEach;i++)for(const k of keys){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out
}
async function scan(iter,collector,summary,seq,label,goal,keepAll=false,sideCollector=null){
 const all=[];let n=0;
 for(const r of iter){
  if(seq!==diagSeq)throw Error('cancelled');
  collector.push(r);if(sideCollector)sideCollector.push(r);advisor.addRoute(summary,r,goal);if(keepAll)all.push(r);n++;
  if(n%700===0){$('#generationAdvisorProgress').textContent=`${label}：安全ルート ${n.toLocaleString()}件を比較中…`;await yieldUi()}
 }
 return{count:n,all}
}
function bestFacts(result,goal){
 const route=result?.summary?.bestRoute||advisor.routeForGoal(result?.result||result,goal);
 return{route,facts:advisor.routeFacts(route)}
}
function generationCard(n,g,goal,recommended,selected){
 const b=bestFacts(g,goal),f=b.facts,label=n===1?'直仔':n+'代';
 const method=n>=3?'条件付き':'全探索';
 const state=selected===n?(recommended===n?'★ おすすめ・選択中':'✓ 選択中'):(recommended===n?'★ おすすめ':'比較');
 return `<button type="button" class="generation-compare-card ${recommended===n?'recommended':''} ${selected===n?'selected':''}" data-generation-choice="${n}" aria-pressed="${selected===n?'true':'false'}">
  <span>${state}｜${label}</span>
  <b>SP/ST ${f.sp}/${f.st}</b>
  <small>SP+ST ${f.spst}・${method}</small>
 </button>`;
}
function recommendationDetail(name,goal,rec,selected){
 const chosen=rec.routes?.[selected],direct=rec.routes?.[1];
 if(!chosen)return'';
 const expanded=planner.expandRoute(name,chosen,goal);
 if(!expanded)return'';
 const a=advisor.routeFacts(direct),b=advisor.routeFacts(chosen);
 const label=selected===1?'直仔':selected+'代';
 const transition=selected===4?rec.transitions?.to4:selected===3?rec.transitions?.to3:selected===2?rec.transitions?.to2:null;
 let reasons=[];
 if(selected===rec.generation){
  reasons=(transition?.reasons?.length?transition.reasons:rec.reasons||[]).slice(0,2);
 }else if(selected===1){
  reasons=['代重ねをせず、最短で配合を完了する比較案'];
 }else{
  reasons=(transition?.reasons||[]).slice(0,2);
  if(!reasons.length)reasons=['自動推奨とは別に、この世代のSP/STと血統条件を比較するための手動選択'];
 }
 const reasonHtml=reasons.map(x=>'<li>'+esc(x)+'</li>').join('');
 const state=selected===rec.generation?'おすすめ世代':'手動で比較中（自動推奨は'+esc(rec.label)+'）';
 return '<div class="generation-key-reason"><b>'+esc(state)+'｜なぜ'+label+'？</b><ul>'+reasonHtml+'</ul></div>'+
  '<details class="generation-tech"><summary>比較データ・探索条件を見る</summary>'+
  '<div class="advisor-note">直仔 SP/ST '+a.sp+'/'+a.st+' → '+label+' '+b.sp+'/'+b.st+'。3代・4代は条件付き探索で、中間牝馬の実能力は出生前に仮定しません。</div>'+
  '</details>';
}

async function runGenerationAdvisor(){
 if(!advisor||!planner)return;
 const name=$('#saleMareSelect')?.value,goal=window.db?.salePlanner?.goal||'arc';
 if(!name)return;
 const seq=++diagSeq,btn=$('#runGenerationAdvisor');btn.disabled=true;
 $('#generationAdvisorResult').innerHTML='';
 $('#generationAdvisorProgress').textContent='直仔・2代・3代・4代を同じ条件で比較します…';
 try{
  const c1=planner.createCollector({topN:3,poolN:24}),s1=advisor.emptySummary('exact-direct');
  const a1=await scan(planner.iterateDirect(name),c1,s1,seq,'直仔',goal,true),r1=c1.finish();
  const c2=planner.createCollector({topN:3,poolN:24}),s2=advisor.emptySummary('exact-two');
  await scan(planner.iterateTwo(name),c2,s2,seq,'2代',goal,false);const r2=c2.finish();
  const bases=previewBases(r2.shortlists,12);
  const c3=planner.createCollector({topN:3,poolN:18}),s3=advisor.emptySummary('preview-three');
  const bridge4=planner.createFourthBridgeCollector();
  await scan(planner.iterateThirdPreview(name,bases),c3,s3,seq,'3代プレビュー',goal,false,bridge4);const r3=c3.finish();
  const bridge4Result=bridge4.finish(),bases4=bridge4Result.bases;
  const c4=planner.createCollector({topN:3,poolN:16}),s4=advisor.emptySummary('preview-four');
  await scan(planner.iterateFourthPreview(name,bases4),c4,s4,seq,'4代bridgeプレビュー',goal,false);const r4=c4.finish();
  if(seq!==diagSeq)return;
  $('#generationAdvisorProgress').textContent='自家製種牡馬の血統汎用性も世代別に比較中…';await yieldUi();
  const portfolios={
    1:planner.portfolioPareto(a1.all,3),
    2:planner.portfolioPareto(r2.pool,3),
    3:planner.portfolioPareto(r3.pool,3),
    4:planner.portfolioPareto(r4.pool,3)
  };
  if(seq!==diagSeq)return;
  const assessment=advisor.mareAssessment(name);
  const generations={
    1:{result:r1,summary:s1,method:'exact'},
    2:{result:r2,summary:s2,method:'exact'},
    3:{result:r3,summary:s3,method:'conditional-preview',previewBaseCount:bases.length},
    4:{result:r4,summary:s4,method:'conditional-bridge-preview',previewBaseCount:bases4.length,bridgeConfig:bridge4Result.config}
  };
  const rec=advisor.recommendGeneration({goal,assessment,generations,portfolios});
  window.DABISTA_SALE_PLANNER?.setGeneration?.(rec.generation,'diagnosis');
  const goalLabel=planner.goalLabels[goal]||goal;
  const resultBox=$('#generationAdvisorResult');
  let selectedGeneration=rec.generation;
  const paintGenerationResult=()=>{
   resultBox.innerHTML=`
    <div class="generation-result">
     <div class="generation-pick"><span>自動おすすめ</span><b>${esc(rec.label)}</b></div>
     <div class="generation-compare">${generationCard(1,generations[1],goal,rec.generation,selectedGeneration)}${generationCard(2,generations[2],goal,rec.generation,selectedGeneration)}${generationCard(3,generations[3],goal,rec.generation,selectedGeneration)}${generationCard(4,generations[4],goal,rec.generation,selectedGeneration)}</div>
     ${recommendationDetail(name,goal,rec,selectedGeneration)}
     <button class="primary generation-action" type="button" id="applyRecommendedGeneration">${selectedGeneration===rec.generation?'おすすめ':'選択した'}${selectedGeneration===1?'直仔':selectedGeneration+'代'}で本命配合を見る</button>
    </div>`;
  };
  resultBox.onclick=e=>{
    const card=e.target.closest('[data-generation-choice]');
    if(card){
      selectedGeneration=+card.dataset.generationChoice;
      window.DABISTA_SALE_PLANNER?.setGeneration?.(selectedGeneration,selectedGeneration===rec.generation?'diagnosis':'manual');
      paintGenerationResult();
      return;
    }
    if(e.target.closest('#applyRecommendedGeneration')){
      window.DABISTA_SALE_PLANNER?.setGeneration?.(selectedGeneration,selectedGeneration===rec.generation?'diagnosis':'manual');
      setTimeout(()=>$('#runSalePlanner')?.click(),30);
    }
  };
  paintGenerationResult();
  $('#generationAdvisorProgress').textContent=`診断完了：直仔 ${s1.count.toLocaleString()}件、2代 ${s2.count.toLocaleString()}件、3代プレビュー ${s3.count.toLocaleString()}件、4代プレビュー ${s4.count.toLocaleString()}件を比較しました。`;
 }catch(e){
  if(String(e).includes('cancelled'))return;
  window.APP_ERRORS?.push({at:new Date().toISOString(),message:'generation-advisor: '+String(e)});
  $('#generationAdvisorProgress').textContent='世代診断中にエラーが発生しました。診断JSONに記録しました。';
 }finally{btn.disabled=false}
}
function inject(){
 if($('#saleMareRecommendation')||!$('#salePlanner'))return;
 style();
 const summary=$('#saleMareSummary');
 const mareBox=document.createElement('div');mareBox.id='saleMareRecommendation';mareBox.className='mare-advice';
 const goalSection=$('#saleGoalSection');
 if(goalSection)goalSection.insertAdjacentElement('afterend',mareBox);else summary?.insertAdjacentElement('afterend',mareBox);
 const notice=$('#salePlannerNotice'),generationSection=$('#saleGenerationSection');
 const gen=document.createElement('div');gen.id='saleGenerationAdvisor';gen.className='generation-advisor';
 gen.innerHTML=`<h4>何代で締めるか比較</h4><p>直仔・2代・3代・4代を同条件で比較し、おすすめ世代を1つ決めます。</p><button type="button" class="secondary" id="runGenerationAdvisor">おすすめ世代を決める</button><div id="generationAdvisorProgress" class="generation-progress"></div><div id="generationAdvisorResult"></div>`;
 if(generationSection){generationSection.hidden=true;generationSection.insertAdjacentElement('beforebegin',gen)}else notice?.insertAdjacentElement('beforebegin',gen);
 if(notice)notice.hidden=true;
 const run=$('#runSalePlanner');if(run)run.hidden=true;
 window.addEventListener('dabista:sale-mare-context',()=>{setTimeout(renderMareAdvice,0);invalidateGeneration('繁殖牝馬を変更したため、世代診断を更新してください。')});
 $('#saleGoalButtons')?.addEventListener('click',e=>{if(e.target.closest('[data-sale-goal]'))setTimeout(()=>{renderMareAdvice();invalidateGeneration('目的を変更したため、世代診断を更新してください。')},0)});
 $('#runGenerationAdvisor').onclick=runGenerationAdvisor;
 renderMareAdvice();
}
async function boot(){
 for(let i=0;i<40;i++){
  planner=window.DABISTA_SALE_PLANNER?.planner;
  engine=window.DABISTA_BREEDING_ENGINE;
  if(planner&&engine?.mareData&&window.DABISTA_SALE_RECOMMENDATION_CORE)break;
  await new Promise(r=>setTimeout(r,250));
 }
 if(!planner||!engine?.mareData||!window.DABISTA_SALE_RECOMMENDATION_CORE){
  window.APP_ERRORS?.push({at:new Date().toISOString(),message:'mare-generation-advisor: dependencies not ready'});return;
 }
 advisor=window.DABISTA_SALE_RECOMMENDATION_CORE.create({planner,broodmareStats:engine.mareData.broodmares||[]});
 inject();
 window.DABISTA_MARE_GENERATION_ADVISOR={version:1,advisor,run:runGenerationAdvisor,render:renderMareAdvice};
}
boot();
})();