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
 .mare-tier{display:inline-block;padding:4px 7px;border-radius:999px;background:#dcefe3;color:#1b5a35;font-size:9px;font-weight:700}
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
function renderMareAdvice(){
 const box=$('#saleMareRecommendation'),name=$('#saleMareSelect')?.value;
 if(!box||!advisor)return;
 if(!name){box.className='mare-advice tier-unknown';box.innerHTML='<div class="muted">検索条件に一致する繁殖牝馬がありません。</div>';return}
 const a=advisor.mareAssessment(name);
 if(!a){box.className='mare-advice tier-unknown';box.innerHTML='<div class="muted">牝馬評価を取得できませんでした。</div>';return}
 const direct=directSnapshot(name),use=advisor.directUseLabels(a,direct),strategy=advisor.mareStrategy(name),goal=window.db?.salePlanner?.goal||'arc';
 const tone=mareTierTone(a),goalNames={arc:'凱旋門賞',bc:'BC長期',rebuild:'繁殖再建',stallion:'自家製種牡馬'};
 box.className='mare-advice tier-'+tone;
 const rankHtml=a.abilityKnown?
   `<div class="mare-ranks">
     ${mareRankCell('繁殖SP',a.ranks.sp)}
     ${mareRankCell('繁殖ST',a.ranks.st)}
     ${mareRankCell('繁殖PW',a.ranks.pw)}
     ${mareRankCell('SP+ST',a.ranks.spst)}
   </div>`:
   '<div class="advisor-note"><b>繁殖能力は未判明</b> — 0を低能力として扱わず、血統評価だけを続けます。</div>';
 const currentUse=use?.[goal]||'評価保留';
 box.innerHTML=`
   <div class="mare-advice-head">
    <div><h4>${esc(name)}</h4><small>${esc(a.archetype)} / 能力既知 ${advisor.knownAbilityCount}頭で比較</small></div>
    <span class="mare-tier">${esc(a.tier)}</span>
   </div>
   ${strategy?`<div class="mare-priority"><small>今の育成方針</small><b>${esc(strategy.priority)}</b></div>`:''}
   ${rankHtml}
   <div class="mare-goal-now"><span>${esc(goalNames[goal]||goal)}</span><b>${esc(currentUse)}</b></div>
   <details class="mare-detail">
    <summary>他の目的・補強方針・直仔データを見る</summary>
    ${strategy?`<div class="advisor-note"><b>補強タイプ：${esc(strategy.label)}</b><br>維持：${strategy.preserve.length?esc(strategy.preserve.join('・')):'—'} / 補強：${strategy.improve.length?esc(strategy.improve.join('・')):'—'}</div>`:''}
    <div class="mare-use-title">目的別の事前評価</div>
    <div class="mare-use">
     <div class="${goal==='arc'?'selected':''}"><b>凱旋門賞</b><span>${esc(use.arc)}</span></div>
     <div class="${goal==='bc'?'selected':''}"><b>BC長期</b><span>${esc(use.bc)}</span></div>
     <div class="${goal==='rebuild'?'selected':''}"><b>繁殖再建</b><span>${esc(use.rebuild)}</span></div>
     <div class="${goal==='stallion'?'selected':''}"><b>自家製種牡馬</b><span>${esc(use.stallion)}</span></div>
    </div>
    <div class="mare-direct">直仔安全 ${direct.count}件 / SP15・ST5以上 ${direct.sp15st5}件 / 凱旋門SP/ST基準 ${direct.arcQuantitative||0}件 / 基準内父実績 A/B/C ${direct.arcRecordA||0}/${direct.arcRecordB||0}/${direct.arcRecordC||0} / 最大SP ${direct.maxSp} / 最大SP+ST ${direct.maxSpSt}</div>
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
function generationCard(n,g,goal,recommended){
 const b=bestFacts(g,goal),f=b.facts,s=g.summary,label=n===1?'直仔':n+'代';
 const assessment=advisor.mareAssessment($('#saleMareSelect')?.value||'');
 const pq=advisor.productionQuality?.(b.route,assessment);
 const method=n>=3?'条件付きプレビュー':'全探索';
 const distanceLabel=f.distanceEvidence>=3?'2400m+父＋長距離クロス':f.distanceEvidence===2?'2400m+父':f.distanceEvidence===1?'長距離クロスで補完':'要実馬確認';
 return `<div class="generation-card ${recommended===n?'recommended':''}">
  <h5>${recommended===n?'★ ':''}${label} <small>${method}</small></h5>
  <div class="gmetric"><span>代表SP/ST</span><b>${f.sp}/${f.st}</b></div>
  <div class="gmetric"><span>最大SP</span><b>${s.maxSp}</b></div>
  <div class="gmetric"><span>最大SP+ST</span><b>${s.maxSpSt}</b></div>
  <div class="gmetric"><span>SP15/ST5</span><b>${s.sp15st5}</b></div>
  <div class="gmetric"><span>SP17/ST5</span><b>${s.sp17st5}</b></div>
  <div class="gmetric"><span>締め父</span><b>${esc(f.record||'?')}/${esc(f.stable||'?')}</b></div>
  ${pq?`<div class="gmetric"><span>強馬生産条件</span><b>${esc(pq.label)}</b></div>`:''}
  ${goal==='arc'?`<div class="gmetric"><span>最終距離根拠</span><b>${esc(distanceLabel)}</b></div>`:''}
  ${n>1?`<div class="gmetric"><span>途中SPクロス</span><b>${f.materialSpeedCrossStages||0}世代</b></div>`:''}
  ${n>1&&goal==='arc'?`<div class="gmetric"><span>途中長距離クロス</span><b>${f.materialLongCrossStages||0}世代</b></div>`:''}
  <small>安全ルート ${s.count.toLocaleString()}件 / 見事 ${s.magnificent} / 完璧 ${s.perfect} / 凝った ${s.elaborate}</small>
 </div>`
}
function recommendationDetail(name,goal,rec){
 const chosen=rec.routes?.[rec.generation],direct=rec.routes?.[1];
 if(!chosen)return'';
 const expanded=planner.expandRoute(name,chosen,goal);
 if(!expanded)return'';
 const a=advisor.routeFacts(direct),b=advisor.routeFacts(chosen);
 const dSp=b.sp-a.sp,dSt=b.st-a.st,dSum=b.spst-a.spst;
 const signed=n=>n>0?'+'+n:String(n);
 const goalRule=goal==='arc'?'凱旋門ではSP/STを基礎に、最終父実績はA>B>Cの強弱として比較します。実績Aや2400m対応を単独の必須条件にはせず、2400m対応は強い距離根拠、長距離クロスは補完根拠として扱います。'
  :goal==='bc'?'BCではSP17/ST5とSP系補強経路を確認したうえで、最終父の実績と多世代時の安定特性を比較します。実績・安定だけ、SPクロスだけのどちらにも寄せません。'
  :goal==='rebuild'?'繁殖再建では一頭の最大値より、次代に残しやすいSP/STバランスを優先します。'
  :'自家製種牡馬では高能力繁殖牝馬群への血統汎用性を優先します。';
 const steps=expanded.stages.map(st=>{
   const adv=advisor.selectionAdvice(name,goal,st,expanded.stages.length);
   if(!adv)return'';
   return '<div class="generation-step"><b>'+st.generation+'代目｜'+esc(adv.phase)+'</b><span>'+esc(adv.headline)+'。'+esc(adv.body)+'</span></div>';
 }).join('');
 const label=rec.generation===1?'直仔':rec.generation+'代';
 const transition=rec.generation===4?rec.transitions?.to4:rec.generation===3?rec.transitions?.to3:rec.generation===2?rec.transitions?.to2:null;
 const decisionReasons=transition?.reasons||[];
 const fromLabel=transition?.from===3?'3代':transition?.from===2?'2代':'直仔';
 const decision=decisionReasons.length
  ?'<div class="generation-decision"><b>'+fromLabel+'→'+label+'を選ぶ決め手</b><ul>'+decisionReasons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'
  :'<div class="generation-decision"><b>'+label+'を選ぶ理由</b><ul><li>追加世代による明確な上積み条件がないため、短い世代を優先します。</li></ul></div>';
 return '<div class="generation-why"><strong>なぜ'+label+'なのか</strong>'+decision+'<div class="generation-delta">直仔代表 → '+label+'代表：SP '+a.sp+'→'+b.sp+'（'+signed(dSp)+'） / ST '+a.st+'→'+b.st+'（'+signed(dSt)+'） / SP+ST '+a.spst+'→'+b.spst+'（'+signed(dSum)+'）<br>'+esc(goalRule)+'</div><div class="generation-timeline">'+steps+'</div></div>';
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
  $('#generationAdvisorResult').innerHTML=`
   <div class="generation-result">
    <div class="generation-pick"><b>${esc(goalLabel)}：${esc(rec.label)}</b><span>${rec.conditional?'3代・4代は条件付き探索です。':''} 短い世代で十分なら無理に代重ねしない判定です。</span></div>
    <div class="generation-grid">${generationCard(1,generations[1],goal,rec.generation)}${generationCard(2,generations[2],goal,rec.generation)}${generationCard(3,generations[3],goal,rec.generation)}${generationCard(4,generations[4],goal,rec.generation)}</div>
    ${recommendationDetail(name,goal,rec)}
    <ul class="generation-reasons">${rec.reasons.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>
    <button class="primary generation-action" type="button" id="applyRecommendedGeneration">${rec.generation===1?'直仔':rec.generation+'代'}で詳しく設計する</button>
    <div class="advisor-note">世代推奨は勝率・産駒能力の確率予測ではありません。安全配合、最終ニトロ、SPクロス、最終父の実績・安定、距離適性、配合理論と、代重ねに必要な実馬選抜回数を分けて比較した設計判断です。3代は前世代の多軸候補、4代は3代目の一般多軸候補にSPクロス深掘りとbridge候補を加えて展開する条件付きプレビューで、全176³・176⁴最適解とは表示しません。</div>
   </div>`;
  $('#applyRecommendedGeneration').onclick=()=>{
    window.DABISTA_SALE_PLANNER?.setGeneration?.(rec.generation,'diagnosis');
    setTimeout(()=>$('#runSalePlanner')?.click(),30);
  };
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
 gen.innerHTML=`<h4>おすすめ配合世代を診断</h4><p>直仔・2代・3代・4代を横断して、「どこで締めるのが妥当か」を比較します。深い世代を自動的に高評価にはしません。</p><button type="button" class="secondary" id="runGenerationAdvisor">直仔・2代・3代・4代を比較</button><div id="generationAdvisorProgress" class="generation-progress"></div><div id="generationAdvisorResult"></div>`;
 if(generationSection)generationSection.insertAdjacentElement('beforebegin',gen);else notice?.insertAdjacentElement('beforebegin',gen);
 const run=$('#runSalePlanner');if(run)run.textContent='選択した世代を詳しく設計';
 window.addEventListener('dabista:sale-mare-context',()=>{setTimeout(renderMareAdvice,0);invalidateGeneration('繁殖牝馬を変更したため、世代診断を更新してください。')});
 $('#saleGoalButtons')?.addEventListener('click',e=>{if(e.target.closest('[data-sale-goal]'))setTimeout(()=>{renderMareAdvice();invalidateGeneration('目的を変更したため、世代診断を更新してください。')},0)});
 $('#saleGenButtons')?.addEventListener('click',e=>{if(!e.target.closest('[data-sale-gen]'))return;setTimeout(()=>{if($('#generationAdvisorResult')?.innerHTML)$('#generationAdvisorProgress').textContent='手動で別世代を選択中です。診断結果は比較基準として残しています。'},0)});
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