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
 .generation-pick em{display:inline-block;margin-top:5px;padding:3px 6px;border-radius:999px;background:#fff0d7;color:#795914;font-size:8px;font-style:normal;font-weight:900}
 .generation-progress{min-height:14px;font-size:9px!important}
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
 .mare-why-detail{display:block;margin-top:4px;font-size:9px;line-height:1.45;color:#62736a}
 .mare-why-reasons{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}
 .mare-why-reasons span{font-size:8px;font-weight:800;line-height:1.35;padding:4px 6px;border-radius:999px;background:#eef4f0;color:#496056}
 .sale-quick{margin-top:9px;padding:10px 11px;border-radius:11px;background:#f7faf8;border:1px solid rgba(70,105,88,.14)}
 .sale-goal-summary{margin-bottom:8px;padding:9px 10px;border-radius:9px;background:#fff;border:1px solid rgba(80,110,95,.12)}
 .sale-goal-summary small{display:block;font-size:8px;font-weight:900;color:#687970}.sale-goal-summary b{display:block;margin-top:2px;font-size:13px;line-height:1.35;color:#204735}.sale-goal-summary span{display:block;margin-top:3px;font-size:8px;line-height:1.4;color:#687970}
 .sale-goal-grade{display:inline-block!important;margin-top:3px;font-size:10px!important;font-weight:900!important}.goal-recommend .sale-goal-grade{color:#176c4b}.goal-candidate .sale-goal-grade{color:#315f91}.goal-conditional .sale-goal-grade{color:#7a5a13}.goal-insufficient .sale-goal-grade{color:#7b817e}
 .mare-purpose-summary{margin-top:9px;padding:11px 12px;border-radius:11px;background:#fff;border:1px solid rgba(80,110,95,.13)}
 .mare-purpose-summary>small{display:block;font-size:8px;font-weight:900;color:#687970}
 .mare-purpose-main{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:3px}
 .mare-purpose-main>b{font-size:15px;line-height:1.35;color:#174b37}
 .mare-purpose-main>span{flex:0 0 auto;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;background:#eef4f0;color:#52675d}
 .mare-purpose-main>span.goal-recommend{background:#e5f4ec;color:#176748}.mare-purpose-main>span.goal-candidate{background:#eaf2fb;color:#315f91}.mare-purpose-main>span.goal-conditional{background:#fff3d7;color:#7a5a13}.mare-purpose-main>span.goal-insufficient{background:#eef0ef;color:#727b76}
 .mare-purpose-summary em{display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;background:#eef4f0;color:#5e7167;font-size:8px;font-style:normal;font-weight:800}
 .mare-goal-list{display:grid;gap:5px;margin-top:5px}
 .mare-goal-row{display:grid;grid-template-columns:minmax(82px,.8fr) auto minmax(110px,1.35fr);gap:7px;align-items:center;padding:7px 8px;border-radius:8px;background:#fff;border:1px solid rgba(80,110,95,.10);border-left-width:3px}
 .mare-goal-row.goal-recommend{border-left-color:#1f8b62}.mare-goal-row.goal-candidate{border-left-color:#3d79b8}.mare-goal-row.goal-conditional{border-left-color:#c38a28}.mare-goal-row.goal-insufficient{border-left-color:#a3aaa6}
 .mare-goal-name{font-size:9px;font-weight:900;color:#52655c}.mare-goal-row>b{font-size:9px;white-space:nowrap}.mare-goal-row.goal-recommend>b{color:#176748}.mare-goal-row.goal-candidate>b{color:#315f91}.mare-goal-row.goal-conditional>b{color:#8a6317}.mare-goal-row.goal-insufficient>b{color:#727b76}.mare-goal-row>small{font-size:8px;line-height:1.35;color:#65766e;text-align:right}
 .mare-attention{margin-top:9px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.72);border:1px solid rgba(80,110,95,.10)}
 .mare-attention-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px}.mare-attention-head small{font-size:8px;font-weight:900;color:#66766e}.mare-attention-head span{font-size:8px;font-weight:900;color:#365b4a}
 .mare-attention-group{display:grid;grid-template-columns:38px 1fr;gap:7px;align-items:start;padding:6px 0;border-top:1px solid rgba(80,110,95,.08)}.mare-attention-group:first-of-type{border-top:0}
 .mare-attention-group>b{font-size:8px;padding-top:5px}.mare-attention-group.addition>b{color:#176748}.mare-attention-group.subtraction>b{color:#9a5a16}.mare-attention-group.caution>b{color:#7a641e}
 .mare-attention-none{font-size:8px;color:#8a9690;padding:4px 0}
 .sale-quick-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.sale-quick-head small{font-size:9px;font-weight:900;color:#687970}.sale-quick-head b{font-size:12px;color:#1f4a37;text-align:right}
 .sale-quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:7px}.sale-quick-grid>div{padding:7px 8px;border-radius:8px;background:#fff;border:1px solid rgba(80,110,95,.10)}.sale-quick-grid small{display:block;font-size:8px;font-weight:900;color:#66766e}.sale-quick-grid span{display:block;margin-top:2px;font-size:9px;font-weight:800;line-height:1.35;color:#294a3b}
 .sale-quick-signals{margin-top:7px;font-size:8px;line-height:1.45;color:#65766e}.sale-quick-note{margin-top:5px;font-size:8px;line-height:1.4;color:#7a817d}
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
 .generation-key-reason ul{list-style:none;padding-left:0!important;display:grid;gap:6px}.generation-key-reason li{display:grid;grid-template-columns:20px 1fr;align-items:start;gap:7px}.generation-key-reason li>span{display:grid;place-items:center;width:20px;height:20px;border-radius:999px;background:#dff0e7;color:#176748;font-size:9px;font-weight:900}
 .generation-tech{margin-top:8px}
 .generation-tech>summary{cursor:pointer;font-size:9px;font-weight:800;color:#65766e}
 @media(max-width:420px){.mare-ranks{grid-template-columns:repeat(2,1fr)}.generation-grid{grid-template-columns:1fr}.mare-use{grid-template-columns:1fr 1fr}.mare-advice-head h4{font-size:16px}.mare-tier{font-size:13px}.mare-goal-row{grid-template-columns:78px auto 1fr;gap:5px}.mare-goal-row>small{font-size:7.5px}.mare-purpose-main>b{font-size:14px}}
 `;document.head.appendChild(s)
}
function fmtRank(r){
 if(!r)return'<b>—</b><small>未判明</small>';
 return `<b>${r.value}</b><small>${r.rank}/${r.total}位<br>上位${r.topPercent}%</small>`
}
const directCache=new Map();
function directSnapshot(name){
 if(directCache.has(name))return directCache.get(name);
 const sum=advisor.emptySummary('direct'),bestByGoal={arc:null,bc:null,rebuild:null,stallion:null};
 for(const r of planner.iterateDirect(name)){
  advisor.addRoute(sum,r);
  for(const g of ['arc','bc','rebuild','stallion'])bestByGoal[g]=advisor.betterGoalRoute(bestByGoal[g],r,g);
 }
 sum.bestByGoal=bestByGoal;directCache.set(name,sum);
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
function mareDecisionText(name,goal,direct){
 return advisor.goalMareReason(name,goal,direct);
}
function quickGoalReason(key,g){
 const state=g?.key||'insufficient',ok=state==='recommend'||state==='candidate';
 if(key==='arc')return ok?'SP/ST・距離候補':state==='conditional'?'距離根拠を確認':'成立根拠不足';
 if(key==='bc')return ok?'SP補強候補':state==='conditional'?'SP補強を確認':'成立根拠不足';
 if(key==='rebuild')return ok?'再建ライン候補':state==='conditional'?'再建条件を確認':'成立根拠不足';
 if(key==='stallion')return ok?'血統汎用性候補':state==='conditional'?'世代別比較':'根拠不足';
 return '評価保留';
}
const goalLabels={arc:'凱旋門賞',bc:'BC長期',rebuild:'繁殖再建',stallion:'自家製種牡馬'};
const goalBaseOrder=['arc','bc','rebuild','stallion'];
const goalGradeRank={recommend:4,candidate:3,conditional:2,insufficient:1};
const purposeRankingState={status:'idle',byGoal:{arc:new Map(),bc:new Map(),rebuild:new Map(),stallion:new Map()},total:0,progress:0};
function purposeRank(name,goal){return purposeRankingState.byGoal?.[goal]?.get(name)||null}
function paintPurposeRanks(){
 const name=$('#saleMareSelect')?.value;
 document.querySelectorAll('#saleGoalButtons [data-sale-goal]').forEach(b=>{
  const g=b.dataset.saleGoal,label=goalLabels[g]||g,r=purposeRank(name,g);
  const suffix=r?'<small>'+r.rank+'位</small>':(purposeRankingState.status==='running'?'<small>…</small>':'');
  b.innerHTML='<span>'+esc(label)+'</span>'+suffix;
 });
}
async function buildPurposeRankings(){
 if(!advisor||!engine?.mareData||purposeRankingState.status==='running'||purposeRankingState.status==='ready')return;
 purposeRankingState.status='running';
 const names=(engine.mareData.broodmares||[]).map(x=>x.name).filter(name=>advisor.mareAssessment(name)?.abilityKnown);
 const buckets={arc:[],bc:[],rebuild:[],stallion:[]};
 purposeRankingState.total=names.length;
 for(let i=0;i<names.length;i++){
  const name=names[i],direct=directSnapshot(name);
  for(const goal of goalBaseOrder){
   const cand=advisor.marePurposeCandidate?.(name,goal,direct,direct.bestByGoal?.[goal]);
   if(cand)buckets[goal].push(cand);
  }
  purposeRankingState.progress=i+1;
  if(i%10===9){paintPurposeRanks();await new Promise(r=>setTimeout(r,0))}
 }
 for(const goal of goalBaseOrder){
  const ranked=advisor.rankMarePurposeCandidates?.(buckets[goal])||[];
  purposeRankingState.byGoal[goal]=new Map(ranked.map(x=>[x.name,x]));
 }
 purposeRankingState.status='ready';paintPurposeRanks();renderMareAdvice();
}

function orderedGoalKeys(recommendations){
 return goalBaseOrder.slice().sort((a,b)=>{
  const d=(goalGradeRank[recommendations?.goals?.[b]?.key]||0)-(goalGradeRank[recommendations?.goals?.[a]?.key]||0);
  return d||goalBaseOrder.indexOf(a)-goalBaseOrder.indexOf(b);
 });
}
function primaryGoalKeys(recommendations){
 if(recommendations?.recommendedGoals?.length)return recommendations.recommendedGoals.slice();
 if(recommendations?.candidateGoals?.length)return recommendations.candidateGoals.slice();
 return[];
}
function quickGoalRow(key,recommendations){
 const g=recommendations?.goals?.[key]||{key:'insufficient',symbol:'—',label:'根拠不足'};
 return `<div class="mare-goal-row goal-${esc(g.key)}"><span class="mare-goal-name">${esc(goalLabels[key]||key)}</span><b>${esc(g.symbol)} ${esc(g.label)}</b><small>${esc(quickGoalReason(key,g))}</small></div>`;
}
function mareAttentionGroups(goal,direct,a,recommendations){
 const route=direct?.bestByGoal?.[goal]||null;
 if(!route||!advisor?.candidateDisplayFacts)return{additions:[],subtractions:[],cautions:[]};
 const d=advisor.candidateDisplayFacts(route,route,a,0,goal);
 const additions=[],subtractions=[],cautions=[];
 const push=(arr,x)=>{if(x?.label&&!arr.some(y=>y.label===x.label))arr.push(x)};
 const grade=recommendations?.goals?.[goal];
 if(grade&&(grade.key==='recommend'||grade.key==='candidate')){
  push(additions,{key:'purpose-fit',label:quickGoalReason(goal,grade),tone:'positive'});
 }
 for(const x of d.groups?.additions||[])push(additions,x);
 for(const x of d.groups?.subtractions||[])push(subtractions,x);
 for(const x of d.groups?.cautions||[])push(cautions,x);
 return{additions:additions.slice(0,3),subtractions:subtractions.slice(0,3),cautions:cautions.slice(0,3)};
}
function attentionGroupHtml(label,items,cls){
 const xs=(items||[]).filter(Boolean);
 const chips=xs.length?xs.map(x=>'<span class="candidate-chip '+esc(x.tone||'trait')+'">'+esc(x.label)+'</span>').join(''):'<span class="mare-attention-none">なし</span>';
 return '<div class="mare-attention-group '+esc(cls)+'"><b>'+esc(label)+'</b><div class="candidate-chip-row">'+chips+'</div></div>';
}
const FACTOR_KEYS=[
 ['short','短距離'],['speed','速力'],['power','パワー'],['guts','底力'],['long','長距離'],
 ['dirt','ダート'],['health','丈夫'],['early','早熟'],['late','晩成'],['steady','安定'],['temper','気性']
];
let factorMapCache=null;
function factorMap(){
 if(factorMapCache)return factorMapCache;
 const key=engine?.core?.key||((x)=>String(x||'').normalize('NFKC').trim().toLowerCase());
 factorMapCache=new Map((engine?.effects?.effects||[]).map(x=>[key(x.name),x]));
 return factorMapCache;
}
function factorTags(name){
 if(!name)return[];
 const key=engine?.core?.key||((x)=>String(x||'').normalize('NFKC').trim().toLowerCase()),f=factorMap().get(key(name));
 if(!f)return[];
 return FACTOR_KEYS.filter(([k])=>Number(f[k])>0).map(([,label])=>label);
}
function factorChips(name,compact=false){
 const xs=factorTags(name);if(!xs.length)return'';
 return '<span class="factor-chips">'+xs.map(x=>'<i class="'+(compact?'compact':'')+'">'+esc(x)+'</i>').join('')+'</span>';
}
function marePedigreeInfo(name){
 const info=planner?.mareInfo?.(name),record=info?.record||null,a=record?.ancestor||[];
 return{info,record,a};
}
function focusFactorHtml(name){
 const {record,a}=marePedigreeInfo(name);if(!record||a.length!==15)return'';
 const rows=[
  ['父',record.sire||a[0]],['母父',record.damSire||a[2]],['父父',record.sireSire||a[1]]
 ].map(([label,n])=>({label,name:n,tags:factorTags(n)})).filter(x=>x.tags.length);
 if(!rows.length)return'';
 return '<div class="mare-factor-row"><small>注目因子</small><div>'+rows.map(x=>'<span><b>'+esc(x.label)+'</b>'+esc(x.name)+factorChips(x.name,true)+'</span>').join('')+'</div></div>';
}
function pedigreeCell(name,rowStart,rowEnd,focus=''){
 return '<div class="pedigree-cell '+esc(focus)+'" style="grid-row:'+rowStart+'/'+rowEnd+'"><b>'+esc(name||'—')+'</b>'+factorChips(name)+'</div>';
}
function pedigreeTreeHtml(name){
 const {record,a}=marePedigreeInfo(name);
 if(!record||a.length!==15)return'<div class="notice">ゲーム内15祖先データを取得できません。</div>';
 return '<div class="pedigree-meta"><span>系統 <b>'+esc(record.system||'—')+'</b></span><span>面白コード <b>'+esc(record.omoshiro||'—')+'</b></span></div>'+
  '<div class="pedigree-scroll"><div class="pedigree-tree">'+
   '<div class="pedigree-col">'+pedigreeCell(a[0],1,9,'focus-sire')+'</div>'+
   '<div class="pedigree-col">'+pedigreeCell(a[1],1,5,'focus-siresire')+pedigreeCell(a[2],5,9,'focus-damsire')+'</div>'+
   '<div class="pedigree-col">'+pedigreeCell(a[3],1,3)+pedigreeCell(a[4],3,5)+pedigreeCell(a[5],5,7)+pedigreeCell(a[6],7,9)+'</div>'+
   '<div class="pedigree-col">'+a.slice(7,15).map((n,i)=>pedigreeCell(n,i+1,i+2)).join('')+'</div>'+
  '</div></div>'+
  '<div class="pedigree-systems"><small>面白系統</small><b>'+esc((record.omoshiroSystems||[]).join(' / ')||'—')+'</b><span>ゲーム内マスタの15祖先を1・2・4・8頭の配置で全件表示。因子がある祖先は併記します。</span></div>';
}
function ensurePedigreeDialog(){
 let d=$('#marePedigreeDlg');if(d)return d;
 d=document.createElement('dialog');d.id='marePedigreeDlg';d.className='mare-purpose-dialog';
 d.innerHTML='<div class="purpose-dialog-head"><div><small>ゲーム内血統情報</small><h2 id="marePedigreeTitle">血統表</h2></div><button type="button" class="secondary" data-close>閉じる</button></div><div id="marePedigreeBody" class="purpose-dialog-body"></div>';
 document.body.appendChild(d);d.querySelector('[data-close]').onclick=()=>d.close();return d;
}
function openPedigree(name){
 const d=ensurePedigreeDialog();$('#marePedigreeTitle').textContent=name+'｜血統表';$('#marePedigreeBody').innerHTML=pedigreeTreeHtml(name);d.showModal();
}
function simTheory(st){
 const t=st?.theory||{},xs=[];if(t.perfect)xs.push('完璧');else{if(t.magnificent)xs.push('見事');if(t.interesting)xs.push('面白')}if(st?.elaborate?.effective)xs.push('凝った');return xs.length?xs.join('・'):'追加理論なし';
}
function simCrosses(st){
 const xs=(st?.crosses||[]).slice(0,4).map(x=>x.name).filter(Boolean);
 if(st?.speedCross?.has&&!xs.some(x=>/速|短/.test(x)))xs.unshift('SP系クロス');
 if(st?.crossEffects?.longDistance)xs.push('長距離クロス');
 return [...new Set(xs)].slice(0,4);
}
function ensureSimulationDialog(){
 let d=$('#marePurposeSimulationDlg');if(d)return d;
 d=document.createElement('dialog');d.id='marePurposeSimulationDlg';d.className='mare-purpose-dialog';
 d.innerHTML='<div class="purpose-dialog-head"><div><small>AI運用シミュレーション</small><h2 id="mareSimTitle">配合例</h2></div><button type="button" class="secondary" data-close>閉じる</button></div><div id="mareSimBody" class="purpose-dialog-body"></div><div class="purpose-dialog-actions"><button type="button" class="secondary" id="mareSimDeep">2〜4代もAI診断</button><button type="button" class="primary" data-close>閉じる</button></div>';
 document.body.appendChild(d);d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());return d;
}
function openSimulation(name,goal,direct){
 const d=ensureSimulationDialog(),route=direct?.bestByGoal?.[goal]||null,rank=purposeRank(name,goal),label=goalLabels[goal]||goal;
 $('#mareSimTitle').textContent=name+'｜'+label;
 if(!route){$('#mareSimBody').innerHTML='<div class="notice">安全な直仔配合例を取得できませんでした。世代診断で条件を広げて確認してください。</div>';d.showModal();return}
 const x=planner.expandRoute(name,route,goal),st=x?.stages?.[0],facts=advisor.routeFacts(route),decision=advisor.goalMareReason(name,goal,direct);
 const crosses=simCrosses(st),rankText=rank?rank.rank+'位 / '+rank.total+'頭':'順位計算中';
 const sire=st?.sire||route?.sires?.[0]||'—',ss=st?.sireStats||{},nitro=st?.nitro||{};
 const keep=goal==='arc'?'SP/STを維持し、距離側の根拠が付く産駒を優先'
  :goal==='bc'?'SP印とSP補強経路を優先し、STを極端に落とさない産駒を残す'
  :goal==='rebuild'?'母の強みを落とさず、次代で使いやすい牝馬を残す'
  :'競走能力を確認しつつ、種牡馬入り後に使いやすい血統を持つ牡馬を残す';
 $('#mareSimBody').innerHTML=
  '<div class="sim-rank"><small>この目的でのAI順位</small><b>'+esc(rankText)+'</b><span>'+esc(decision?.headline||'目的別条件で判断')+'</span></div>'+
  '<div class="sim-pair"><small>AIがまず試す具体的な配合例</small><div><b>'+esc(name)+'</b><span>×</span><b>'+esc(sire)+'</b></div></div>'+
  '<div class="sim-grid"><div><small>SPニトロ</small><b>'+Number(nitro.sp||facts.sp||0)+'</b></div><div><small>STニトロ</small><b>'+Number(nitro.st||facts.st||0)+'</b></div><div><small>PWニトロ</small><b>'+Number(nitro.pw||facts.pw||0)+'</b></div></div>'+
  '<div class="sim-evidence"><b>配合の狙い</b><span>'+esc(decision?.detail||'目的条件を満たす血統根拠を優先します。')+'</span><div class="candidate-chip-row">'+
    (facts.speedCross?'<span class="candidate-chip cross">SPクロスあり</span>':'')+
    (facts.longDistanceCross?'<span class="candidate-chip trait">長距離クロス</span>':'')+
    '<span class="candidate-chip theory">'+esc(simTheory(st))+'</span>'+
    (crosses.length?crosses.map(n=>'<span class="candidate-chip trait">'+esc(n)+'</span>').join(''):'')+
  '</div></div>'+
  '<div class="sim-operate"><b>AIの運用</b><ol><li>上の配合を実行</li><li>'+esc(keep)+'</li><li>実馬能力を確認し、基準に届かなければ2〜4代診断へ進む</li></ol></div>'+
  '<details class="sim-tech"><summary>父の実績・距離根拠を見る</summary><div>実績 '+esc(ss.record||facts.record||'—')+' / 安定 '+esc(ss.stable||facts.stable||'—')+' / 距離 '+esc((ss.minD||facts.minD||'?')+'–'+(ss.maxD||facts.maxD||'?')+'m')+'</div></details>';
 const deep=$('#mareSimDeep');deep.onclick=()=>{d.close();$('#saleGenerationAdvisor')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#runGenerationAdvisor')?.click(),250)};
 d.showModal();
}

function renderMareAdvice(){
 const box=$('#saleMareRecommendation'),name=$('#saleMareSelect')?.value;
 if(!box||!advisor)return;
 if(!name){box.className='mare-advice tier-unknown';box.innerHTML='<div class="muted">検索条件に一致する繁殖牝馬がありません。</div>';return}
 const a=advisor.mareAssessment(name);
 if(!a){box.className='mare-advice tier-unknown';box.innerHTML='<div class="muted">牝馬評価を取得できませんでした。</div>';return}
 const direct=directSnapshot(name),strategy=advisor.mareStrategy(name),goal=window.db?.salePlanner?.goal||'arc';
 const recommendations=advisor.quickGoalRecommendations(name,direct,direct.bestByGoal),grade=recommendations?.goals?.[goal]||{key:'insufficient',symbol:'—',label:'根拠不足'};
 const decision=mareDecisionText(name,goal,direct),rank=purposeRank(name,goal),tone=mareTierTone(a),s=a.stats||{};
 const attention=mareAttentionGroups(goal,direct,a,recommendations);
 const attentionItems=[...(attention.additions||[]),...(attention.subtractions||[]),...(attention.cautions||[])].slice(0,4);
 const attentionHtml=attentionItems.length?attentionItems.map(x=>'<span class="candidate-chip '+esc(x.tone||'trait')+'">'+esc(x.label)+'</span>').join(''):'<span class="mare-attention-none">注目ポイントなし</span>';
 const rankText=!a.abilityKnown?'未順位':rank?rank.rank+'位':'計算中';
 const rankSub=a.abilityKnown?(rank?'/ '+rank.total+'頭':'/ '+advisor.knownAbilityCount+'頭'):'能力未判明';
 const decisionReasons=(decision.reasons||[]).slice(0,3).map(x=>'<span>'+esc(x)+'</span>').join('');
 box.className='mare-advice tier-'+tone;
 box.innerHTML=
  '<div class="mare-advice-head"><div><h4>'+esc(name)+'</h4><small>選択した目的に必要な情報だけを表示</small></div><span class="mare-tier">'+esc(a.tier)+'</span></div>'+
  '<section class="purpose-focus">'+
   '<div class="purpose-focus-head"><div><small>現在の目的</small><h3>'+esc(goalLabels[goal]||goal)+'</h3></div><div class="purpose-rank"><small>AI順位</small><b>'+esc(rankText)+'</b><span>'+esc(rankSub)+'</span></div></div>'+
   '<div class="purpose-grade goal-'+esc(grade.key||'insufficient')+'"><b>'+esc(grade.symbol)+' '+esc(grade.label)+'</b><span>'+esc(quickGoalReason(goal,grade))+'</span></div>'+
   (a.abilityKnown?'<div class="purpose-stats"><div><small>繁殖SP</small><b>'+Number(s.sp||0)+'</b></div><div><small>繁殖ST</small><b>'+Number(s.st||0)+'</b></div><div><small>繁殖PW</small><b>'+Number(s.pw||0)+'</b></div></div>':'<div class="purpose-unknown">繁殖SP / ST / PW は未判明です。</div>')+
   '<div class="purpose-nitro"><small>ニトロ</small><div><span>SP <b>'+Number(s.nsp||0)+'</b></span><span>ST <b>'+Number(s.nst||0)+'</b></span><span>PW <b>'+Number(s.npw||0)+'</b></span></div></div>'+
   focusFactorHtml(name)+
   '<div class="purpose-attention"><small>注目ポイント</small><div class="candidate-chip-row">'+attentionHtml+'</div></div>'+
   '<div class="purpose-actions"><button type="button" class="primary" data-purpose-sim>AI配合シミュレーション</button><button type="button" class="secondary" data-purpose-pedigree>血統表</button></div>'+
  '</section>'+
  '<details class="mare-detail"><summary>詳しい評価根拠を見る</summary>'+
   '<div class="mare-why"><small>'+esc(goalLabels[goal]||goal)+'</small><b>'+esc(decision.headline)+'</b><span class="mare-why-detail">'+esc(decision.detail)+'</span>'+(decisionReasons?'<div class="mare-why-reasons">'+decisionReasons+'</div>':'')+'</div>'+
   (strategy?'<div class="advisor-note"><b>補強タイプ：'+esc(strategy.label)+'</b><br>維持：'+(strategy.preserve.length?esc(strategy.preserve.join('・')):'—')+' / '+(strategy.improve.length?'補強：'+esc(strategy.improve.join('・')):strategy.relativeAdjust?.length?'相対調整：'+esc(strategy.relativeAdjust.join('・')):'明確な補強対象なし')+'</div>':'')+
   '<div class="mare-direct">直仔安全 '+direct.count+'件 / SP15・ST5以上 '+direct.sp15st5+'件 / 最大SP '+direct.maxSp+' / 最大ST '+direct.maxSt+'</div>'+
   '<div class="advisor-note">AI順位は4目的ごとに別々の条件を辞書式に比較します。目的横断の総合点や第7評価軸は作りません。</div>'+
  '</details>';
 box.onclick=e=>{
  if(e.target.closest('[data-purpose-pedigree]')){openPedigree(name);return}
  if(e.target.closest('[data-purpose-sim]')){openSimulation(name,goal,direct);return}
 };
 paintPurposeRanks();
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
 return `<button type="button" class="generation-compare-card ${recommended===n?'recommended':''} ${selected===n?'selected':''}" data-generation-choice="${n}" aria-pressed="${selected===n?'true':'false'}">
  <span>${recommended===n?'★ ':''}${label}</span>
  <b>SP/ST ${f.sp}/${f.st}</b>
  <small>${method}</small>
 </button>`;
}
function compactGenerationReason(x=''){
 const s=String(x);
 if(/上積み.*小|小さ.*上積み/.test(s))return'2代以降の上積みが小さい';
 if(/繁殖能力.*未判明|母能力.*未判明/.test(s))return'母能力未確認のため総合判断は保留';
 if(/SPクロス/.test(s)&&/成立相手|経路|維持/.test(s))return'SPクロス経路を維持できる';
 if(/成立相手/.test(s)&&/増|広/.test(s))return'次代で成立する相手が増える';
 if(/距離/.test(s)&&/根拠|適性/.test(s))return'距離根拠を維持できる';
 if(/実績/.test(s)&&/下|落|低/.test(s))return'父実績の低下に注意';
 if(s.length<=34)return s;
 return s.slice(0,32)+'…';
}
function recommendationDetail(name,goal,rec,selected,diagnosticText=''){
 const chosen=rec.routes?.[selected],direct=rec.routes?.[1];
 if(!chosen)return'';
 const expanded=planner.expandRoute(name,chosen,goal);
 if(!expanded)return'';
 const a=advisor.routeFacts(direct),b=advisor.routeFacts(chosen);
 const label=selected===1?'直仔':selected+'代';
 const transition=selected===4?rec.transitions?.to4:selected===3?rec.transitions?.to3:selected===2?rec.transitions?.to2:null;
 let reasons=[];
 if(selected===rec.generation){
  reasons=(transition?.reasons?.length?transition.reasons:rec.reasons||[]).slice(0,3);
 }else if(selected===1){
  reasons=['代重ねをせず、最短で配合を完了する'];
 }else{
  reasons=(transition?.reasons||[]).slice(0,3);
  if(!reasons.length)reasons=['自動推奨とは別に、この世代の条件を比較'];
 }
 reasons=[...new Set(reasons.map(compactGenerationReason))].slice(0,3);
 const reasonHtml=reasons.map((x,i)=>'<li><span>'+(i+1)+'</span>'+esc(x)+'</li>').join('');
 const state=selected===rec.generation?'なぜこの世代？':'選択中：'+label;
 return '<div class="generation-key-reason"><b>'+esc(state)+'</b><ul>'+reasonHtml+'</ul></div>'+
  '<details class="generation-tech"><summary>比較データ・探索条件を見る</summary>'+
  '<div class="advisor-note">直仔 SP/ST '+a.sp+'/'+a.st+' → '+label+' '+b.sp+'/'+b.st+'。3代・4代は条件付き探索です。'+(diagnosticText?' '+esc(diagnosticText):'')+'</div>'+
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
  const resultBox=$('#generationAdvisorResult');
  const diagnosticText='直仔 '+s1.count.toLocaleString()+'件 / 2代 '+s2.count.toLocaleString()+'件 / 3代 '+s3.count.toLocaleString()+'件 / 4代 '+s4.count.toLocaleString()+'件';
  const recommendedLabel=rec.generation===1?'直仔':rec.generation+'代';
  const recommendationStatus=/基準未達/.test(rec.label)?'血統基準未達・能力確認前提':(!assessment?.abilityKnown?'能力確認前提':'');
  let selectedGeneration=rec.generation;
  const paintGenerationResult=()=>{
   resultBox.innerHTML=`
    <div class="generation-result">
     <div class="generation-pick"><span>おすすめ世代</span><b>おすすめ：${esc(recommendedLabel)}</b>${recommendationStatus?'<em>'+esc(recommendationStatus)+'</em>':''}</div>
     <div class="generation-compare">${generationCard(1,generations[1],goal,rec.generation,selectedGeneration)}${generationCard(2,generations[2],goal,rec.generation,selectedGeneration)}${generationCard(3,generations[3],goal,rec.generation,selectedGeneration)}${generationCard(4,generations[4],goal,rec.generation,selectedGeneration)}</div>
     ${recommendationDetail(name,goal,rec,selectedGeneration,diagnosticText)}
     <button class="primary generation-action" type="button" id="applyRecommendedGeneration">この世代で本命配合を見る</button>
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
  $('#generationAdvisorProgress').textContent='診断完了';
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
 gen.innerHTML=`<h4>おすすめ世代を決める</h4><p>直仔〜4代を同じ条件で比較します。</p><button type="button" class="secondary ui-wide-cta generation-run-cta" id="runGenerationAdvisor">診断する</button><div id="generationAdvisorProgress" class="generation-progress"></div><div id="generationAdvisorResult"></div>`;
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