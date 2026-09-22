(()=>{
const V=window.APP_VERSION||'1.18.0',BUILD=window.APP_BUILD||'2026.09.21-44';
const $=s=>document.querySelector(s),db=window.db,esc=window.esc||((s)=>String(s??''));
if(!db)return;
window.APP_VERSION=V;window.APP_BUILD=BUILD;
const ver=$('#ver');if(ver)ver.textContent=`v${V} / Build ${BUILD}`;

const css=`.theory-tools{margin-top:9px;padding:10px;border-radius:10px;background:#f7f4ea;border:1px solid #e7dcc0}.theory-tools label{display:block;font-size:12px;color:#66736c;margin-bottom:4px}.theory-tools select{width:100%}.theory-status{font-size:11px;color:#66736c;line-height:1.55;margin-top:7px}.theory-chips{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.theory-chip{display:inline-block;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:700;background:#e8efe9;color:#294c39}.theory-chip.migoto{background:#e9edf7;color:#344a77}.theory-chip.perfect{background:#f3ead0;color:#674b00}.theory-chip.system{font-weight:500;background:#f2f3f1;color:#58635d}.theory-hidden{display:none!important}.master-pedigree-note{font-size:11px;color:#52645a;background:#eef4ef;border-radius:8px;padding:7px 9px;margin-top:6px}.pair-theory-note{font-size:11px;color:#66736c;line-height:1.45;margin-top:5px}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

let theory=null,theoryStatus={status:'loading',stallions:0,broodmares:0};
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase();
const sortCodes=a=>[...(a||[])].sort().join('|');
function breedHorseById(id){return window.getBreedHorseById?.(id)||db.horses.find(x=>x.id===id)||null}
function mareTheory(h){
  if(!h||!theory)return null;
  const name=h.masterRef?.type==='default-broodmare'?h.masterRef.name:h.name;
  return theory.broodmares.find(x=>norm(x.name)===norm(name))||null;
}
function mareTheoryByName(name){return theory?.broodmares?.find(x=>norm(x.name)===norm(name))||null}
function stallionTheory(name){return theory?.stallions?.find(x=>norm(x.name)===norm(name))||null}
function pairTheory(m,s){
  if(!m||!s)return null;
  const mo=m.omoshiroSystems||[],so=s.omoshiroSystems||[],sm=s.migotoSystems||[];
  const unique=new Set([...mo,...so]).size;
  const interesting=mo.length===4&&so.length===4&&unique>=7;
  const magnificent=mo.length===4&&sm.length===4&&sortCodes(mo)===sortCodes(sm);
  return{interesting,magnificent,perfect:interesting&&magnificent,unique,mare:mo,stallion:so,migoto:sm};
}
function codeText(a){return(a||[]).join('・')||'未判定'}

function installTheoryControls(){
  if(window.DABISTA_BREED_PAIR_INDEX)return;
  const first=$('#breed .card');if(!first||$('#theoryFilter'))return;
  const box=document.createElement('div');box.className='theory-tools';
  box.innerHTML=`<label>配合理論フィルター</label><select id="theoryFilter"><option value="all">すべて表示</option><option value="any">面白・見事のどちらか成立</option><option value="interesting">面白い配合</option><option value="magnificent">見事な配合</option><option value="perfect">完璧な配合</option></select><div id="theoryStatus" class="theory-status">配合理論マスタを読み込み中…</div>`;
  const search=$('#stallionSearch');search?.insertAdjacentElement('afterend',box);
  $('#theoryFilter').onchange=decorateBreedCards;
  $('#breedMare')?.addEventListener('change',()=>setTimeout(decorateBreedCards,0));
  $('#breedGoal')?.addEventListener('change',()=>setTimeout(decorateBreedCards,0));
  $('#stallionSearch')?.addEventListener('input',()=>setTimeout(decorateBreedCards,0));
  const target=$('#breedCandidates');if(target)new MutationObserver(()=>queueMicrotask(decorateBreedCards)).observe(target,{childList:true});
}
function updateTheoryStatus(){
  const el=$('#theoryStatus'),filter=$('#theoryFilter');if(!el)return;
  const h=breedHorseById($('#breedMare')?.value),m=mareTheory(h);
  if(theoryStatus.status==='loading'){if(filter)filter.disabled=true;el.textContent='配合理論マスタを読み込み中…';return}
  if(theoryStatus.status!=='ok'){if(filter)filter.disabled=true;el.textContent='配合理論マスタの読み込みに失敗しました。更新確認を試してください。';return}
  if(!h){if(filter){filter.disabled=true;filter.value='all'}el.innerHTML=`デフォルト種牡馬 ${theoryStatus.stallions}頭・繁殖牝馬 ${theoryStatus.broodmares}頭の面白／見事系統を内蔵。繁殖牝馬を選ぶと成立判定します。`;return}
  if(!m){if(filter){filter.disabled=true;filter.value='all'}el.innerHTML=`<b>${esc(h.name)}</b> は自家製繁殖牝馬のため、現時点では面白／見事を確定表示しません。祖先情報は補完に利用し、次段階で自家製馬の系統を連鎖計算します。`;return}
  if(filter)filter.disabled=false;
  el.innerHTML=`<b>${esc(h.name)}</b> の面白用系統：${codeText(m.omoshiroSystems)}。候補種牡馬ごとに「面白」「見事」「完璧」をゲーム内系統データから判定します。完璧は面白＋見事の同時成立で、追加ボーナスはありません。`;
}
function candidateName(card){
  if(card.dataset.sireName)return card.dataset.sireName;
  const b=card.querySelector('b');if(!b)return'';
  return b.textContent.replace(/^\s*\d+\.\s*/,'').trim();
}
let decorating=false;
function decorateBreedCards(){
  if(window.DABISTA_BREED_PAIR_INDEX)return;
  if(decorating)return;decorating=true;
  try{
    updateTheoryStatus();
    const h=breedHorseById($('#breedMare')?.value),m=mareTheory(h),filter=$('#theoryFilter')?.value||'all';
    document.querySelectorAll('#breedCandidates>.card').forEach(card=>{
      card.querySelectorAll('.theory-chips,.pair-theory-note').forEach(x=>x.remove());
      card.classList.remove('theory-hidden');
      const name=candidateName(card),s=stallionTheory(name),p=pairTheory(m,s);
      if(!p){if(filter!=='all'&&m)card.classList.add('theory-hidden');return}
      const chips=document.createElement('div');chips.className='theory-chips';
      if(p.perfect)chips.innerHTML+='<span class="theory-chip perfect">完璧（面白＋見事）</span>';
      else{if(p.interesting)chips.innerHTML+='<span class="theory-chip">面白</span>';if(p.magnificent)chips.innerHTML+='<span class="theory-chip migoto">見事</span>'}
      chips.innerHTML+=`<span class="theory-chip system">8系統中 ${p.unique}種類</span>`;
      const row=card.querySelector('.row');row?.insertAdjacentElement('afterend',chips);
      const note=document.createElement('div');note.className='pair-theory-note';note.textContent=`牝馬 ${codeText(p.mare)} / 種牡馬・面白 ${codeText(p.stallion)} / 種牡馬・見事 ${codeText(p.migoto)}`;chips.insertAdjacentElement('afterend',note);
      const ok=filter==='all'||(filter==='any'&&(p.interesting||p.magnificent))||(filter==='interesting'&&p.interesting)||(filter==='magnificent'&&p.magnificent)||(filter==='perfect'&&p.perfect);
      if(!ok)card.classList.add('theory-hidden');
    });
  }finally{decorating=false}
}

function installPedigreeGuidance(){
  const box=document.querySelector('.v15box');if(!box||$('#v18PedigreeGuide'))return;
  const n=document.createElement('div');n.id='v18PedigreeGuide';n.className='master-pedigree-note';n.textContent='ゲーム内デフォルト繁殖牝馬は、配合理論に必要な15祖先を内蔵マスタから使います。父母・母母など女性祖先名は空欄でも配合理論判定に支障ありません。';
  box.appendChild(n);
}
/* 全デフォルト血統マスタを登録画面へ反映 */
function fillMasterPedigree(showNote=true){
  if($('#role')?.value!=='broodmare')return 0;
  const name=$('#name')?.value;
  const h=mareTheoryByName(name)||window.findPedigreeHorse?.(name);if(!h)return 0;
  const pairs=[['sire',h.sire],['sireSire',h.sireSire],['damSire',h.damSire],['sireDamSire',h.sireDamSire],['damDamSire',h.damDamSire]];
  let n=0;pairs.forEach(([id,val])=>{const el=$('#'+id);if(el&&val&&!el.value.trim()){el.value=val;el.classList.add('auto-filled');setTimeout(()=>el.classList.remove('auto-filled'),1400);n++}});
  if(showNote&&n){let note=$('#masterPedigreeNote');if(!note){note=document.createElement('div');note.id='masterPedigreeNote';note.className='master-pedigree-note';document.querySelector('.v15box')?.prepend(note)}note.textContent=`ゲーム内マスタから血統 ${n}項目を補完しました（父・父父・母父・父母父・母母父）。`}
  return n;
}
document.addEventListener('click',e=>{if(e.target.closest('[data-master-mare]'))setTimeout(()=>fillMasterPedigree(true),30)});
$('#name')?.addEventListener('blur',()=>setTimeout(()=>fillMasterPedigree(false),0));
const oldAuto=$('#autoFillPedigree');if(oldAuto)oldAuto.addEventListener('click',()=>setTimeout(()=>fillMasterPedigree(true),20));

async function loadTheory(){
  try{
    const u=new URL('data/theory-master.json',location.href);u.searchParams.set('_',BUILD);
    const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
    theory=await r.json();theoryStatus={status:'ok',stallions:theory.stallions?.length||0,broodmares:theory.broodmares?.length||0,syncedAt:theory.syncedAt||null};window.DABISTA_THEORY_MASTER=theory;window.DABISTA_THEORY_STATUS=theoryStatus;decorateBreedCards();
    if($('#role')?.value==='broodmare'&&$('#name')?.value)fillMasterPedigree(false);
  }catch(e){theoryStatus={status:'failed',error:String(e),stallions:0,broodmares:0};window.DABISTA_THEORY_STATUS=theoryStatus;window.APP_ERRORS?.push({at:new Date().toISOString(),message:'theory-master: '+String(e)});updateTheoryStatus()}
}

function downloadJSON(obj,name){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}
let remote=null;async function checkUpdate(show=false){try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error('HTTP '+r.status);remote=await r.json();if(newer(remote.version,V)||remote.build!==BUILD){$('#updateText').textContent=`最新版 v${remote.version} / ${remote.build} があります`;$('#updatebar').classList.add('show')}else{$('#updatebar').classList.remove('show');if(show)alert(`最新版です\nv${V} / ${BUILD}`)}}catch(e){if(show)alert('更新確認に失敗しました。通信状態を確認してください。')}}
async function forceUpdate(){try{if('serviceWorker'in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}if('caches'in window){for(const k of await caches.keys())await caches.delete(k)}}catch{}const u=new URL(location.href);u.searchParams.set('update',Date.now());location.replace(u.href)}
function installSupport(){
  if($('#refreshBtn'))$('#refreshBtn').onclick=()=>checkUpdate(true);if($('#applyUpdate'))$('#applyUpdate').onclick=forceUpdate;
  if($('#diagBtn'))$('#diagBtn').onclick=()=>downloadJSON({diagnostic:true,generatedAt:new Date().toISOString(),app:{version:V,build:BUILD,url:location.href,standalone:matchMedia('(display-mode: standalone)').matches||navigator.standalone===true},remoteVersion:remote,masters:window.DABISTA_MASTER_STATUS||null,theory:theoryStatus,device:{userAgent:navigator.userAgent,language:navigator.language,online:navigator.onLine},storage:{horseCount:db.horses.length,broodmareCount:db.horses.filter(h=>h.role==='broodmare').length,defaultMareImportedCount:db.horses.filter(h=>h.masterRef?.type==='default-broodmare').length,raceCount:db.races?.length||0,bytes:new Blob([JSON.stringify(db)]).size},errors:window.APP_ERRORS||[],data:db},`dabista-diagnostic-v${V}.json`);
  ;
}

installTheoryControls();installPedigreeGuidance();installSupport();loadTheory();
})();