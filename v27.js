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
 .mare-use{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:8px}
 .mare-use>div{border:1px solid #e1e8e4;border-radius:8px;padding:7px;background:#fff}
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
 .generation-why{margin-top:8px;padding:9px;border:1px solid #dce7e1;border-radius:10px;background:#fff}
 .generation-why>strong{display:block;font-size:11px;color:#264f3c}
 .generation-delta{margin-top:5px;padding:6px 7px;border-radius:8px;background:#f2f6f3;font-size:9px;line-height:1.5}
 .generation-timeline{display:grid;gap:5px;margin-top:7px}
 .generation-step{padding:6px 7px;border-left:3px solid #79ad90;background:#f8faf9;border-radius:0 8px 8px 0}
 .generation-step b{display:block;font-size:9px}.generation-step span{display:block;margin-top:2px;color:#617169;font-size:8px;line-height:1.45}
 .generation-action{margin-top:8px;width:100%}
 .advisor-note{margin-top:7px;padding:7px;border-radius:8px;background:#f1f5f2;font-size:8px;line-height:1.5;color:#66736c}
 @media(max-width:420px){.mare-ranks{grid-template-columns:repeat(2,1fr)}.generation-grid{grid-template-columns:1fr}.mare-use{grid-template-columns:1fr 1fr}}
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
function renderMareAdvice(){
 const box=$('#saleMareRecommendation'),name=$('#saleMareSelect')?.value;
 if(!box||!name||!advisor)return;
 const a=advisor.mareAssessment(name);
 if(!a){box.innerHTML='<div class="muted">牝馬評価を取得できませんでした。</div>';return}
 const direct=directSnapshot(name),use=advisor.directUseLabels(a,direct),strategy=advisor.mareStrategy(name);
 const tierClass=a.abilityKnown?'':' unknown';
 const rankHtml=a.abilityKnown?
   `<div class="mare-ranks">
     <div class="mare-rank">${fmtRank(a.ranks.sp)}<small>繁殖SP</small></div>
     <div class="mare-rank">${fmtRank(a.ranks.st)}<small>繁殖ST</small></div>
     <div class="mare-rank">${fmtRank(a.ranks.pw)}<small>繁殖PW</small></div>
     <div class="mare-rank">${fmtRank(a.ranks.spst)}<small>SP+ST</small></div>
   </div>`:
   '<div class="advisor-note"><b>繁殖能力：未判明</b><br>能力既知298頭の順位には含めません。0を低能力として扱いません。</div>';
 box.innerHTML=`
   <div class="mare-advice-head">
    <div><h4>この繁殖牝馬のおすすめ具合</h4><small>${esc(a.archetype)} / 能力既知 ${advisor.knownAbilityCount}頭で比較</small></div>
    <span class="mare-tier${tierClass}">${esc(a.tier)}</span>
   </div>
   ${rankHtml}
   ${strategy?`<div class="advisor-note"><b>配合方針：${esc(strategy.label)}</b><br>${esc(strategy.priority)}<br><span style="display:block;margin-top:3px">維持したい能力：${strategy.preserve.length?esc(strategy.preserve.join('・')):'—'} / 補強したい能力：${strategy.improve.length?esc(strategy.improve.join('・')):'—'}</span></div>`:''}
   <div class="mare-use">
    <div><b>凱旋門賞</b><span>${esc(use.arc)}</span></div>
    <div><b>BC長期</b><span>${esc(use.bc)}</span></div>
    <div><b>繁殖再建</b><span>${esc(use.rebuild)}</span></div>
    <div><b>自家製種牡馬</b><span>${esc(use.stallion)}</span></div>
   </div>
   <div class="mare-direct">直仔の安全配合 ${direct.count}件 / SP15・ST5以上 ${direct.sp15st5}件 / SP17・ST5以上 ${direct.sp17st5}件 / 2400m対応父 ${direct.long2400}件 / 最大SPニトロ ${direct.maxSp} / 最大SP+ST ${direct.maxSpSt}</div>
   <div class="advisor-note">${esc(a.note)} 「おすすめ」は母能力と直仔の血統到達性を分けて判定しています。</div>`;
}
function invalidateGeneration(message='条件を変更したため、世代診断を更新してください。'){
 diagSeq++;
 const out=$('#generationAdvisorResult');if(out)out.innerHTML='';
 const p=$('#generationAdvisorProgress');if(p)p.textContent=message;
 const b=$('#runGenerationAdvisor');if(b)b.disabled=false;
}
const yieldUi=()=>new Promise(r=>setTimeout(r,0));
function previewBases(shortlists,maxEach=12){
 const out=[],seen=new Set(),keys=['sp','st','balance','theory'];
 for(let i=0;i<maxEach;i++)for(const k of keys){
  const r=shortlists?.[k]?.[i];if(!r)continue;
  const id=planner.routeKey(r);if(!seen.has(id)){seen.add(id);out.push(r)}
 }
 return out
}
async function scan(iter,collector,summary,seq,label,goal,keepAll=false){
 const all=[];let n=0;
 for(const r of iter){
  if(seq!==diagSeq)throw Error('cancelled');
  collector.push(r);advisor.addRoute(summary,r,goal);if(keepAll)all.push(r);n++;
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
 const method=n===3?'条件付きプレビュー':'全探索';
 return `<div class="generation-card ${recommended===n?'recommended':''}">
  <h5>${recommended===n?'★ ':''}${label} <small>${method}</small></h5>
  <div class="gmetric"><span>代表SP/ST</span><b>${f.sp}/${f.st}</b></div>
  <div class="gmetric"><span>最大SP</span><b>${s.maxSp}</b></div>
  <div class="gmetric"><span>最大SP+ST</span><b>${s.maxSpSt}</b></div>
  <div class="gmetric"><span>SP15/ST5</span><b>${s.sp15st5}</b></div>
  <div class="gmetric"><span>SP17/ST5</span><b>${s.sp17st5}</b></div>
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
 const goalRule=goal==='arc'?'凱旋門では最終父の2400m対応・実績A・SP/STバランスを優先します。'
  :goal==='bc'?'BCではSP上限を優先しつつ、STを極端に落とさないルートを選びます。'
  :goal==='rebuild'?'繁殖再建では一頭の最大値より、次代に残しやすいSP/STバランスを優先します。'
  :'自家製種牡馬では高能力繁殖牝馬群への血統汎用性を優先します。';
 const steps=expanded.stages.map(st=>{
   const adv=advisor.selectionAdvice(name,goal,st,expanded.stages.length);
   if(!adv)return'';
   return '<div class="generation-step"><b>'+st.generation+'代目｜'+esc(adv.phase)+'</b><span>'+esc(adv.headline)+'。'+esc(adv.body)+'</span></div>';
 }).join('');
 const label=rec.generation===1?'直仔':rec.generation+'代';
 return '<div class="generation-why"><strong>なぜ'+label+'なのか</strong><div class="generation-delta">直仔代表 → '+label+'代表：SP '+a.sp+'→'+b.sp+'（'+signed(dSp)+'） / ST '+a.st+'→'+b.st+'（'+signed(dSt)+'） / SP+ST '+a.spst+'→'+b.spst+'（'+signed(dSum)+'）<br>'+esc(goalRule)+'</div><div class="generation-timeline">'+steps+'</div></div>';
}
async function runGenerationAdvisor(){
 if(!advisor||!planner)return;
 const name=$('#saleMareSelect')?.value,goal=window.db?.salePlanner?.goal||'arc';
 if(!name)return;
 const seq=++diagSeq,btn=$('#runGenerationAdvisor');btn.disabled=true;
 $('#generationAdvisorResult').innerHTML='';
 $('#generationAdvisorProgress').textContent='直仔・2代・3代を同じ条件で比較します…';
 try{
  const c1=planner.createCollector({topN:3,poolN:24}),s1=advisor.emptySummary('exact-direct');
  const a1=await scan(planner.iterateDirect(name),c1,s1,seq,'直仔',goal,true),r1=c1.finish();
  const c2=planner.createCollector({topN:3,poolN:24}),s2=advisor.emptySummary('exact-two');
  await scan(planner.iterateTwo(name),c2,s2,seq,'2代',goal,false);const r2=c2.finish();
  const bases=previewBases(r2.shortlists,12);
  const c3=planner.createCollector({topN:3,poolN:18}),s3=advisor.emptySummary('preview-three');
  await scan(planner.iterateThirdPreview(name,bases),c3,s3,seq,'3代プレビュー',goal,false);const r3=c3.finish();
  if(seq!==diagSeq)return;
  $('#generationAdvisorProgress').textContent='自家製種牡馬の血統汎用性も世代別に比較中…';await yieldUi();
  const portfolios={
    1:planner.portfolioPareto(a1.all,3),
    2:planner.portfolioPareto(r2.pool,3),
    3:planner.portfolioPareto(r3.pool,3)
  };
  if(seq!==diagSeq)return;
  const assessment=advisor.mareAssessment(name);
  const generations={
    1:{result:r1,summary:s1,method:'exact'},
    2:{result:r2,summary:s2,method:'exact'},
    3:{result:r3,summary:s3,method:'conditional-preview',previewBaseCount:bases.length}
  };
  const rec=advisor.recommendGeneration({goal,assessment,generations,portfolios});
  const goalLabel=planner.goalLabels[goal]||goal;
  $('#generationAdvisorResult').innerHTML=`
   <div class="generation-result">
    <div class="generation-pick"><b>${esc(goalLabel)}：${esc(rec.label)}</b><span>${rec.conditional?'3代目は条件付き探索です。':''} 短い世代で十分なら無理に代重ねしない判定です。</span></div>
    <div class="generation-grid">${generationCard(1,generations[1],goal,rec.generation)}${generationCard(2,generations[2],goal,rec.generation)}${generationCard(3,generations[3],goal,rec.generation)}</div>
    ${recommendationDetail(name,goal,rec)}
    <ul class="generation-reasons">${rec.reasons.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>
    <button class="primary generation-action" type="button" id="applyRecommendedGeneration">${rec.generation===1?'直仔':rec.generation+'代'}で詳しく設計する</button>
    <div class="advisor-note">世代推奨は勝率・産駒能力の確率予測ではありません。安全配合、最終ニトロ、距離適性、配合理論、血統汎用性と、代重ねに必要な実馬選抜回数を比較した設計判断です。3代は2代目多軸候補からの条件付きプレビューで、全176³最適解とは表示しません。</div>
   </div>`;
  $('#applyRecommendedGeneration').onclick=()=>{
    const b=$('[data-sale-gen="'+rec.generation+'"]');if(b)b.click();
    setTimeout(()=>$('#runSalePlanner')?.click(),30);
  };
  $('#generationAdvisorProgress').textContent=`診断完了：直仔 ${s1.count.toLocaleString()}件、2代 ${s2.count.toLocaleString()}件、3代プレビュー ${s3.count.toLocaleString()}件を比較しました。`;
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
 summary?.insertAdjacentElement('afterend',mareBox);
 const notice=$('#salePlannerNotice');
 const gen=document.createElement('div');gen.id='saleGenerationAdvisor';gen.className='generation-advisor';
 gen.innerHTML=`<h4>おすすめ配合世代を診断</h4><p>直仔・2代・3代を横断して、「どこで締めるのが妥当か」を比較します。深い世代を自動的に高評価にはしません。</p><button type="button" class="secondary" id="runGenerationAdvisor">直仔・2代・3代を比較</button><div id="generationAdvisorProgress" class="generation-progress"></div><div id="generationAdvisorResult"></div>`;
 notice?.insertAdjacentElement('afterend',gen);
 const run=$('#runSalePlanner');if(run)run.textContent='選択した世代を詳しく設計';
 $('#saleMareSelect')?.addEventListener('change',()=>{setTimeout(renderMareAdvice,0);invalidateGeneration()});
 $('#saleGoalButtons')?.addEventListener('click',e=>{if(e.target.closest('[data-sale-goal]'))setTimeout(()=>invalidateGeneration('目的を変更したため、世代診断を更新してください。'),0)});
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