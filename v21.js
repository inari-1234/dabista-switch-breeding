(()=>{
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.23-49',db=window.db,$=s=>document.querySelector(s),esc=window.esc||String;if(!db)return;window.APP_VERSION=V;window.APP_BUILD=BUILD;const ve=$('#ver');if(ve)ve.textContent=`v${V} / Build ${BUILD}`;
let engine=null,busy=false;
const breedHorseById=id=>window.getBreedHorseById?.(id)||db.horses.find(x=>x.id===id)||null
function cardName(c){return c.dataset.sireName||c.querySelector('b')?.textContent.replace(/^\s*\d+\.\s*/,'').trim()||''}
function controls(){if(window.DABISTA_BREED_PAIR_INDEX)return;if($('#v21Filter'))return;const box=$('.theory-tools');if(!box)return;const w=document.createElement('div');w.style.marginTop='8px';w.innerHTML='<label>公式配合理論・追加フィルター</label><select id="v21Filter"><option value="all">すべて</option><option value="elaborate">凝った配合</option><option value="cross">クロスあり</option><option value="safe">危険・超危険を除外</option></select><div style="font-size:10px;line-height:1.45;margin-top:5px;color:#66736c">危険判定は祖先内包クロスを除外した有効クロスで判定。凝った配合は812成立確認ペア＋直接例外を根拠別に判定します。</div>';box.appendChild(w);$('#v21Filter').onchange=()=>setTimeout(run,0)}
function evidenceText(e){if(!e)return'';if(e.kind==='direct-exception')return`直接成立例外：${esc(e.sire)} × ${esc(e.mare)}`;return`成立確認ペア：${esc(e.a)} × ${esc(e.b)}`}
function apply(){
 if(window.DABISTA_BREED_PAIR_INDEX)return;
 if(!engine||busy)return;busy=true;
 try{
  controls();const h=breedHorseById($('#breedMare')?.value),m=engine.resolveHorse(h),f=$('#v21Filter')?.value||'all';
  document.querySelectorAll('#breedCandidates>.card').forEach(c=>{
   c.querySelectorAll('.v21-rule').forEach(x=>x.remove());c.classList.remove('v21-hidden');if(!m)return;
   const s=engine.master(cardName(c));if(!s)return;const p=engine.evaluatePair(s,m);if(!p)return;const d=p.danger,e=p.elaborate,xs=d.rawCrosses||[],eff=d.effectiveCrosses||[];
   const box=document.createElement('div');box.className='v21-rule';box.style.cssText='font-size:11px;line-height:1.55;margin-top:7px;padding:7px 9px;border-radius:8px;background:#eef3ef;color:#405048';
   let chips='';if(e.effective)chips+='<span class="theory-chip perfect">凝った</span>';if(d.tyokiken)chips+='<span class="theory-chip" style="background:#efd1d1;color:#7b2020">超危険</span>';else if(d.kiken)chips+='<span class="theory-chip" style="background:#f5dddd;color:#7b2f2f">危険な配合</span>';if(xs.length)chips+=`<span class="theory-chip system">共通祖先 ${xs.length}件 / 有効 ${d.inbreedCount}本</span>`;
   const ev=e.evidence?.length?`<div>凝った根拠：${e.evidence.slice(0,4).map(evidenceText).join(' / ')}${e.evidence.length>4?' ほか':''}</div>`:'';
   const diff=e.knownDifference?'<div><b>根拠差：</b>成立確認ペアを優先。上流JS実装とは既知の1件差があります。</div>':'';
   const dangerNote=d.dangerous?`<div><b>${d.tyokiken?'超危険条件':'危険条件'}：</b>${esc(d.reason||'該当')}。危険・超危険では凝った配合の成立表示を無効化します。</div>`:'';
   const crossNote=xs.length?`<div>クロス：${xs.slice(0,7).map(x=>`${esc(x.name)} ${x.sireGen}×${x.mareGen}`).join(' / ')}${xs.length>7?' ほか':''}</div>`:'';
   const suppression=xs.length!==eff.length?`<div>※祖先内包を除外した有効クロスは ${d.inbreedCount}本。危険判定はこの本数で行います。</div>`:'';
   box.innerHTML=`<div class="theory-chips">${chips||'<span class="theory-chip system">追加理論なし</span>'}</div>${ev}${diff}${dangerNote}${crossNote}${suppression}`;c.appendChild(box);
   const ok=f==='all'||(f==='elaborate'&&e.effective)||(f==='cross'&&xs.length)||(f==='safe'&&!d.kiken&&!d.tyokiken);if(!ok)c.classList.add('v21-hidden')
  })
 }finally{busy=false}
}
function run(){if(engine)apply();else window.DABISTA_BREEDING_ENGINE?.ready?.then(e=>{engine=e;apply()}).catch(()=>{})}
const style=document.createElement('style');style.textContent='.v21-hidden{display:none!important}';document.head.appendChild(style);
if(!window.DABISTA_BREED_PAIR_INDEX){
 $('#breedMare')?.addEventListener('change',()=>setTimeout(run,100));$('#stallionSearch')?.addEventListener('input',()=>setTimeout(run,100));const target=$('#breedCandidates');if(target)new MutationObserver(()=>queueMicrotask(run)).observe(target,{childList:true});setTimeout(run,1800);setTimeout(run,3100);
}
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}async function check(show=false){try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store'}),v=await r.json();if(newer(v.version,V)||v.build!==BUILD){$('#updateText').textContent=`最新版 v${v.version} / ${v.build} があります`;$('#updatebar').classList.add('show')}else{$('#updatebar').classList.remove('show');if(show)alert(`最新版です\nv${V} / ${BUILD}`)}}catch{if(show)alert('更新確認に失敗しました。')}}setTimeout(()=>{if($('#refreshBtn'))$('#refreshBtn').onclick=()=>check(true);check(false)},3400);
})();
