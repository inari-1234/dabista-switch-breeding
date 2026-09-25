(()=>{
'use strict';
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.25-59';
let db=window.db;
if(!db)return;
const $=s=>document.querySelector(s),esc=window.esc||((s)=>String(s??''));
let activeHorse=null,activeRows=[],activeUnsafe=0,activePlanner=null,activeAdvisor=null;
const nextStepCache=new Map();

function norm(v){return String(v??'').normalize('NFKC').trim()}
function keyOf(engine,v){return engine?.core?.key?.(v)||norm(v).replace(/[\s・･]/g,'').toLowerCase()}
function roleLabel(h){return h?.role==='stallion'?'種牡馬':h?.role==='sire-candidate'?'種牡馬候補':h?.sex==='牝'?'繁殖牝馬':'登録馬'}
function isMare(h){return h?.sex==='牝'||h?.role==='broodmare'}
function isSire(h){return h?.role==='stallion'||h?.role==='sire-candidate'}

function ensureStyle(){
 if($('#v28style'))return;
 const s=document.createElement('style');s.id='v28style';s.textContent=`
 .horse-use-actions{display:flex;gap:6px;margin-top:8px}.horse-use-actions button{width:100%}
 #horseUseDlg{width:min(680px,calc(100vw - 24px));max-height:88vh;overflow:auto;overscroll-behavior:contain}
 .horse-use-head{display:grid;gap:4px}.horse-use-summary{padding:9px;border-radius:10px;background:#f4f7f4;font-size:11px;line-height:1.55;margin:8px 0}
 .horse-use-goal{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:end}
 .horse-use-count{font-size:10px;color:#66736c;margin:8px 0}
 .horse-match{border:1px solid #dde5e0;border-radius:10px;padding:9px;margin-top:7px;background:#fbfcfa}
 .horse-match.owned{border-color:#b9d7c7;background:#f2f8f4}
 .horse-match-head{display:flex;justify-content:space-between;gap:8px;align-items:start}
 .horse-match-head b{font-size:13px}.horse-match-tag{font-size:8px;font-weight:800;border-radius:999px;padding:3px 6px;background:#e8eee9}
 .horse-match-reasons{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.horse-match-reasons span{font-size:8px;font-weight:800;padding:3px 6px;border-radius:999px;background:#edf2ef;color:#52655c}
 .horse-match-note{font-size:9px;color:#66736c;line-height:1.45;margin-top:5px}
 .horse-match-next{font-size:9px;line-height:1.45;margin-top:6px;padding:6px 7px;border-radius:8px;background:#f1f5f2;color:#52655c}.horse-match-next b{color:#34483e}
 .horse-match-section{margin-top:10px}.horse-match-section>h3{font-size:12px;margin:0 0 4px}
 @media(max-width:520px){
  #horseUseDlg{width:calc(100vw - 12px);max-height:92dvh;padding:10px}
  .horse-use-goal{grid-template-columns:1fr;gap:5px}.horse-use-goal .notice{padding:7px;font-size:9px;line-height:1.4}
  .horse-use-summary{padding:7px 8px;font-size:10px;margin:6px 0}.horse-use-count{margin:6px 0;font-size:9px}
  .horse-match{padding:7px 8px;margin-top:5px}.horse-match-head{align-items:center}.horse-match-head b{font-size:12px}
  .horse-match-reasons{gap:3px;margin-top:5px}.horse-match-reasons span{padding:3px 5px}
  .horse-match-note{font-size:8px;margin-top:4px}.horse-match-section{margin-top:8px}.horse-match-section>h3{font-size:11px}
 }
 `;document.head.appendChild(s)
}
function ensureDialog(){
 ensureStyle();
 if($('#horseUseDlg'))return;
 const d=document.createElement('dialog');d.id='horseUseDlg';
 d.innerHTML=`<form method="dialog" class="form">
  <div class="horse-use-head"><h2 id="horseUseTitle">この馬を配合に活かす</h2><div id="horseUseSub" class="muted"></div></div>
  <div id="horseUseSummary" class="horse-use-summary"></div>
  <div class="horse-use-goal"><div class="field"><label>探す目的</label><select id="horseUseGoal"><option value="arc">凱旋門</option><option value="bc">BC</option><option value="rebuild">繁殖再建</option></select></div><div class="notice">総合点は作らず、目的ごとの成立条件で抽出します。</div></div>
  <div id="horseUseStatus" class="horse-use-count"></div>
  <div id="horseUseResults"></div>
  <div class="actions"><button class="secondary" value="cancel">閉じる</button></div>
 </form>`;
 document.body.appendChild(d);
 $('#horseUseGoal').onchange=renderReverse;
}
async function readiness(){
 const api=window.DABISTA_BREED_FUTURE;
 if(!api?.ensureReady)throw Error('配合エンジンの準備APIがありません');
 return api.ensureReady();
}
function gate(f,goal){
 const speed=!!(f.speedCross||f.materialSpeedCross);
 if(goal==='arc'){
   const qualified=f.sp>=14&&f.st>=6,strong=f.sp>=15&&f.st>=6,bloodline=qualified&&f.distanceEvidence>0;
   return{qualified,strong,bloodline,supported:bloodline&&f.recordBPlus,
     reason:strong?'SP15/ST6以上':qualified?'SP14/ST6以上':'SP/ST未達'};
 }
 if(goal==='bc'){
   const qualified=f.sp>=17&&f.st>=5&&speed,strong=f.sp>=18&&f.st>=5&&speed,bloodline=qualified;
   return{qualified,strong,bloodline,supported:qualified&&f.recordBPlus,
     reason:strong?'SP18/ST5＋SP補強':qualified?'SP17/ST5＋SP補強':'BC条件未達'};
 }
 const qualified=f.sp>=15&&f.st>=5,strong=f.sp>=17&&f.st>=5;
 return{qualified,strong,bloodline:qualified,supported:qualified,reason:strong?'SP17/ST5以上':'SP15/ST5以上'};
}
function maternalPercent(row,goal){
 const r=row.assessment?.ranks;
 if(!r)return 999;
 if(goal==='bc')return Number(r.sp?.topPercent)||999;
 return Number(r.spst?.topPercent)||999;
}
function sortRows(rows,goal){
 return [...rows].sort((a,b)=>{
   const A=gate(a.facts,goal),B=gate(b.facts,goal);
   if(A.strong!==B.strong)return B.strong-A.strong;
   if(a.assessment?.abilityKnown!==b.assessment?.abilityKnown)return Number(b.assessment?.abilityKnown)-Number(a.assessment?.abilityKnown);
   const ap=maternalPercent(a,goal),bp=maternalPercent(b,goal);if(ap!==bp)return ap-bp;
   if(a.facts.recordGrade!==b.facts.recordGrade)return b.facts.recordGrade-a.facts.recordGrade;
   if(goal==='arc'&&a.facts.distanceEvidence!==b.facts.distanceEvidence)return b.facts.distanceEvidence-a.facts.distanceEvidence;
   if(a.facts.sp!==b.facts.sp)return b.facts.sp-a.facts.sp;
   if(a.facts.st!==b.facts.st)return b.facts.st-a.facts.st;
   return a.name.localeCompare(b.name,'ja');
 })
}
function matchReasons(row,goal){
 const f=row.facts,g=gate(f,goal),a=row.assessment,out=[g.reason,'実績'+f.record];
 if(goal==='arc')out.push(f.distance2400?'父2400m対応':f.longDistanceCross?'長距離クロス':'距離根拠なし');
 if(goal==='bc')out.push((f.speedCross||f.materialSpeedCross)?'SP補強経路あり':'SP補強経路なし');
 if(goal==='rebuild')out.push('SP+ST '+f.spst);
 if(a?.abilityKnown)out.push('母 '+a.tier);
 else out.push('母能力未判明');
 if(row.owned)out.push('牧場登録');
 return out;
}
function nextStepKey(row,goal){
 return norm(activeHorse?.id||activeHorse?.name)+'|'+goal+'|'+norm(row?.owned?'owned:'+row.name:row?.name);
}
function nextStepFor(row,goal){
 if(!activePlanner||!activeAdvisor||!row?.route?.finalChild)return null;
 const cacheKey=nextStepKey(row,goal);
 if(nextStepCache.has(cacheKey))return nextStepCache.get(cacheKey);
 let best=null,bestReasons=[];
 for(const r of activePlanner.iterateTwoFromDirect(row.route)){
   const reasons=activeAdvisor.materialUpgradeReasons(row.route,r,goal,row.assessment);
   if(!reasons.length)continue;
   const selected=activeAdvisor.betterGoalRoute(best,r,goal);
   if(selected===r){best=r;bestReasons=reasons}
 }
 const result=best?{
   advance:true,
   sire:best.sires?.[1]||best.sires?.[best.sires.length-1]||'次代候補',
   facts:activeAdvisor.routeFacts(best),
   reason:bestReasons[0]||'目的条件で有意な上積み'
 }:{advance:false};
 nextStepCache.set(cacheKey,result);
 return result;
}
function rowHtml(row,goal,includeNext=false){
 const reasons=matchReasons(row,goal).map(x=>'<span>'+esc(x)+'</span>').join('');
 const a=row.assessment,known=!!a?.abilityKnown;
 const detail=known
   ?'母能力 '+esc(a.tier||'既知')+' / SP順位上位'+Number(a.ranks?.sp?.topPercent||0)+'% / SP+ST順位上位'+Number(a.ranks?.spst?.topPercent||0)+'%'
   :(row.realNote||'繁殖能力は未判明。血統Pairのみで候補判定しています。');
 const next=includeNext?nextStepFor(row,goal):null;
 const nextHtml=!includeNext?'':next?.advance
   ?'<div class="horse-match-next"><b>次代候補：</b>'+esc(next.sire)+' ｜ SP '+Number(next.facts?.sp||0)+' / ST '+Number(next.facts?.st||0)+'<br>'+esc(next.reason)+'</div>'
   :'<div class="horse-match-next"><b>次代延長根拠：</b>現時点では明確な上積みなし</div>';
 return '<div class="horse-match '+(row.owned?'owned':'')+'"><div class="horse-match-head"><b>'+esc(row.name)+'</b><span class="horse-match-tag">'+esc(row.owned?'牧場':'セリ')+'</span></div><div class="horse-match-reasons">'+reasons+'</div><div class="horse-match-note">'+detail+'</div>'+nextHtml+'</div>'
}
function renderReverse(){
 const goal=$('#horseUseGoal')?.value||'arc',box=$('#horseUseResults'),st=$('#horseUseStatus');
 if(!box||!st)return;
 const bloodline=sortRows(activeRows.filter(r=>gate(r.facts,goal).bloodline),goal);
 const confirmed=bloodline.filter(r=>gate(r.facts,goal).supported&&r.assessment?.abilityKnown);
 const provisional=bloodline.filter(r=>!gate(r.facts,goal).supported||!r.assessment?.abilityKnown);
 const strict=bloodline.filter(r=>gate(r.facts,goal).supported);
 st.textContent='安全Pair '+activeRows.length+'件 / 危険除外 '+activeUnsafe+'件 / 血統条件一致 '+bloodline.length+'件 / 厳格条件一致 '+strict.length+'件';
 const knownHtml=confirmed.slice(0,12).map((r,i)=>rowHtml(r,goal,i<4)).join('');
 const provisionalHtml=provisional.slice(0,10).map((r,i)=>rowHtml(r,goal,i<3)).join('');
 box.innerHTML=
   '<div class="horse-match-section"><h3>厳格条件一致（母能力既知）</h3>'+(knownHtml||'<div class="empty">該当なし</div>')+'</div>'+
   '<div class="horse-match-section"><h3>血統候補（能力確認待ち・父実績条件外を含む）</h3>'+(provisionalHtml||'<div class="empty">該当なし</div>')+'</div>'+
   '<p class="muted" style="margin-top:9px">能力未判明馬や父実績未登録を厳格一致と同じ扱いにせず、血統候補として分離します。繁殖SP/ST/PWは推定しません。</p>';
}
function defaultAssessment(advisor,name){return advisor?.mareAssessment?.(name)||null}
function ownedAssessment(advisor,h){
 const ref=h?.masterRef;
 if(ref?.type==='default-broodmare'&&ref.name)return defaultAssessment(advisor,ref.name);
 const real=window.horseScore?.(h.id)||null;
 return{
   name:h.name,abilityKnown:false,tier:'自家製・能力未確定',ranks:null,
   realEvidence:real?{n:real.n,a:real.a,b:real.b,wins:real.wins}:null
 };
}
async function buildReverse(h){
 ensureDialog();
 $('#horseUseTitle').textContent=h.name+'に合う牝馬を探す';
 $('#horseUseSub').textContent=roleLabel(h)+'を固定して、セリ牝馬と牧場牝馬を逆引きします。';
 $('#horseUseSummary').innerHTML='<b>計算中…</b> 血統15祖先と現在の父能力情報から安全Pairを確認しています。';
 $('#horseUseResults').innerHTML='';$('#horseUseStatus').textContent='';
 $('#horseUseDlg').showModal();
 try{
   const {planner,advisor,engine}=await readiness();
   const sire=engine.resolveHorse(h);
   if(!sire||!Array.isArray(sire.ancestor)||sire.ancestor.length!==15)throw Error('15祖先を解決できません。父母または15祖先情報を補完してください。');
   if(!planner.sire(h.name))throw Error('この牡馬を種牡馬候補として配合エンジンへ登録できません。登録区分を確認してください。');
   const owned=(db.horses||[]).filter(x=>x.sex==='牝'),ownedMaster=new Set(owned.map(x=>x.masterRef?.type==='default-broodmare'?keyOf(engine,x.masterRef.name):'').filter(Boolean));
   const candidates=[];
   for(const m of engine.broodmares()){
     if(ownedMaster.has(keyOf(engine,m.name)))continue;
     candidates.push({name:m.name,record:m,owned:false,assessment:defaultAssessment(advisor,m.name),realNote:''});
   }
   for(const m of owned){
     const r=engine.resolveHorse(m);if(!r||!Array.isArray(r.ancestor)||r.ancestor.length!==15)continue;
     const a=ownedAssessment(advisor,m),real=a.realEvidence;
     candidates.push({name:m.name,record:r,owned:true,assessment:a,realNote:real?'実馬 '+Number(real.n||0)+'走 / ④ '+Number(real.a||0).toFixed(1)+' / ⑤ '+Number(real.b||0).toFixed(1)+'。繁殖能力値には換算しません。':'自家製牝馬。繁殖能力値は未推定です。'});
   }
   const rows=[];let unsafe=0;
   for(const m of candidates){
     const x=planner.evaluateDirectPair(m.record,h.name);
     if(!x.safe||!x.route){unsafe++;continue}
     rows.push({...m,route:x.route,facts:advisor.routeFacts(x.route)});
   }
   activeHorse=h;activeRows=rows;activeUnsafe=unsafe;activePlanner=planner;activeAdvisor=advisor;nextStepCache.clear();
   const stats=h.record||h.guts||h.stable?('実績'+(h.record||'-')+'・底力'+(h.guts||'-')+'・安定'+(h.stable||'-')):'父能力未登録';
   $('#horseUseSummary').innerHTML='<b>'+esc(h.name)+'</b> ｜ '+esc(stats)+(h.minD&&h.maxD?' / '+Number(h.minD)+'–'+Number(h.maxD)+'m':'')+'<br><span class="muted">凱旋門・BC・繁殖再建で成立条件を切り替えます。表示上位7件は次代候補まで確認します。第7の総合点は作りません。</span>';
   renderReverse();
 }catch(e){
   $('#horseUseSummary').innerHTML='<b>配合利用できません。</b><br>'+esc(String(e.message||e));
   $('#horseUseResults').innerHTML='';
 }
}
async function openMareInBreed(h){
 try{
   const engine=await window.DABISTA_BREEDING_ENGINE?.ready,r=engine?.resolveHorse?.(h);
   if(!r||!Array.isArray(r.ancestor)||r.ancestor.length!==15){ensureDialog();$('#horseUseTitle').textContent=h.name;$('#horseUseSub').textContent='配合利用の準備';$('#horseUseSummary').innerHTML='<b>血統情報不足</b><br>15祖先を解決できません。父母または15祖先情報を補完してください。';$('#horseUseResults').innerHTML='';$('#horseUseDlg').showModal();return}
   document.querySelector('.tab[data-tab="breed"]')?.click();
   setTimeout(()=>{window.renderBreed?.();const s=$('#breedMare');if(s&&[...s.options].some(o=>o.value===h.id)){s.value=h.id;s.dispatchEvent(new Event('change',{bubbles:true}))}},80);
 }catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'horse-use-mare: '+String(e)})}
}
function decorate(){
 db=window.db||db;
 document.querySelectorAll('#horseList .horse[data-id]').forEach(card=>{
   if(card.querySelector('.horse-use-actions'))return;
   const h=(db.horses||[]).find(x=>x.id===card.dataset.id);if(!h||(!isMare(h)&&!isSire(h)))return;
   const d=document.createElement('div');d.className='horse-use-actions';
   d.innerHTML='<button type="button" class="secondary" data-use-horse="'+esc(h.id)+'">'+(isMare(h)?'この牝馬を配合に活かす':'相性牝馬を探す')+'</button>';
   card.appendChild(d);
 })
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-use-horse]');if(!b)return;
 e.preventDefault();e.stopPropagation();
 const h=(window.db?.horses||[]).find(x=>x.id===b.dataset.useHorse);if(!h)return;
 if(isMare(h))openMareInBreed(h);else if(isSire(h))buildReverse(h);
},true);
const list=$('#horseList');if(list)new MutationObserver(()=>decorate()).observe(list,{childList:true,subtree:true});
setTimeout(decorate,700);
})();