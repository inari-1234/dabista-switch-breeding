(()=>{
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.26-68',db=window.db,$=s=>document.querySelector(s),esc=window.esc||String;if(!db)return;window.APP_VERSION=V;window.APP_BUILD=BUILD;const ve=$('#ver');if(ve)ve.textContent=`v${V} / Build ${BUILD}`;
const breedHorseById=id=>window.getBreedHorseById?.(id)||db.horses.find(x=>x.id===id)||null
function cardName(c){return c.dataset.sireName||c.querySelector('b')?.textContent.replace(/^\s*\d+\.\s*/,'').trim()||''}
let engine=null,busy=false;
function theorySourceLabel(x){return x==='switch-master'?'Switch版マスタ':x?.startsWith('parent-code-inheritance')?'親コードから正確に継承':x==='legacy-persisted-systems'?'旧版で保存済み系統':'コード未確定'}
function apply(){
 if(window.DABISTA_BREED_PAIR_INDEX)return;
 if(!engine||busy)return;busy=true;
 try{
  const h=breedHorseById($('#breedMare')?.value),m=engine.resolveHorse(h),filter=$('#theoryFilter');
  document.querySelectorAll('.v20-theory').forEach(x=>x.remove());document.querySelectorAll('#breedCandidates>.card').forEach(c=>c.classList.remove('theory-hidden'));
  if(!h||!m)return;
  const hasMareCode=String(m.omoshiro||'').length===4;if(filter)filter.disabled=!hasMareCode;
  const st=$('#theoryStatus');
  if(st)st.innerHTML=hasMareCode?`<b>${esc(h.name)}</b>：面白コード <b>${esc(m.omoshiro)}</b>（${esc(engine.core.decodeCode(m.omoshiro).join('・'))}）。${esc(theorySourceLabel(m.theorySource))}を使用し、祖先名からの逆引き推定は行いません。`:`<b>${esc(h.name)}</b>：配合理論コード未確定。15祖先から面白系統を逆引き推定せず、面白・見事・完璧の判定を保留します。`;
  const f=filter?.value||'all';
  document.querySelectorAll('#breedCandidates>.card').forEach(c=>{
    const s=engine.master(cardName(c));if(!s)return;const p=engine.evaluatePair(s,m),t=p?.theory;
    const x=document.createElement('div');x.className='v20-theory';x.style.cssText='font-size:11px;line-height:1.5;margin-top:6px';
    if(!t?.available){x.innerHTML='<div class="theory-chips"><span class="theory-chip system">配合理論コード未確定</span></div><div class="pair-theory-note">祖先名からの推定は行わず、コード確定後に再判定します。</div>';c.appendChild(x);if(f!=='all')c.classList.add('theory-hidden');return}
    const chips=t.perfect?'<span class="theory-chip perfect">完璧（面白＋見事）</span>':`${t.interesting?'<span class="theory-chip">面白</span>':''}${t.magnificent?'<span class="theory-chip migoto">見事</span>':''}`;
    x.innerHTML=`<div class="theory-chips">${chips}<span class="theory-chip system">8系統中 ${t.uniqueSystems}種類</span></div><div class="pair-theory-note">牝馬・面白 ${esc(m.omoshiro)}（${esc(engine.core.decodeCode(m.omoshiro).join('・'))}） / 種牡馬・面白 ${esc(s.omoshiro)} / 種牡馬・見事 ${esc(s.migoto)}</div>`;c.appendChild(x);
    const ok=f==='all'||(f==='any'&&(t.interesting||t.magnificent))||(f==='interesting'&&t.interesting)||(f==='magnificent'&&t.magnificent)||(f==='perfect'&&t.perfect);if(!ok)c.classList.add('theory-hidden')
  })
 }finally{busy=false}
}
function run(){if(engine)apply();else window.DABISTA_BREEDING_ENGINE?.ready?.then(e=>{engine=e;apply()}).catch(()=>{})}
if(!window.DABISTA_BREED_PAIR_INDEX){
 $('#breedMare')?.addEventListener('change',()=>setTimeout(run,80));$('#theoryFilter')?.addEventListener('change',()=>setTimeout(run,20));$('#stallionSearch')?.addEventListener('input',()=>setTimeout(run,80));const t=$('#breedCandidates');if(t)new MutationObserver(()=>queueMicrotask(run)).observe(t,{childList:true});setTimeout(run,1700);setTimeout(run,3000);
}
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}
async function check(show=false){try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store'}),v=await r.json();if(newer(v.version,V)||v.build!==BUILD){$('#updateText').textContent=`最新版 v${v.version} / ${v.build} があります`;$('#updatebar').classList.add('show')}else{$('#updatebar').classList.remove('show');if(show)alert(`最新版です\nv${V} / ${BUILD}`)}}catch{if(show)alert('更新確認に失敗しました。')}}setTimeout(()=>{if($('#refreshBtn'))$('#refreshBtn').onclick=()=>check(true);check(false)},3200);
})();
