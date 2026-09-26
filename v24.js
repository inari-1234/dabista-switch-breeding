(()=>{
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.27-70',db=window.db,$=s=>document.querySelector(s);
if(!db)return;
window.APP_VERSION=V;window.APP_BUILD=BUILD;
const ver=$('#ver');if(ver)ver.textContent=`v${V} / Build ${BUILD}`;
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let research=null,mares=[],stallions=[],theory=null;
const goalLabels={arc:'① 凱旋門賞を最短で狙う',rebuild:'② 牧場平均能力を立て直す',bc:'③ BC級の最大上限を狙う'};
const goalDefault={arc:'エイスト',rebuild:'ミゼラブルウェイ',bc:'ミニミニデート'};
db.rebuildStudy=db.rebuildStudy||{goal:'arc',starter:'エイスト'};
function save(){window.saveFarm?.()}
function style(){
 if($('#v24style'))return;
 const x=document.createElement('style');x.id='v24style';x.textContent=`
 .tabs{grid-template-columns:repeat(5,minmax(0,1fr))}
 .rebuild-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}
 .rebuild-kpi{background:#f6f7f4;border-radius:10px;padding:9px;text-align:center}
 .rebuild-kpi b{display:block;font-size:18px}.rebuild-kpi small{color:#66736c;font-size:10px}
 .research-tag{display:inline-block;border-radius:999px;padding:3px 6px;font-size:10px;margin:2px 3px 2px 0;background:#eef3ef;color:#405048}
 .research-tag.estimate{background:#fff3cd;color:#6b5200}.research-tag.master{background:#e9edf7;color:#344a77}
 .route-stage{border-left:3px solid #dce2dd;padding:7px 9px;margin:7px 0;background:#fafbf9;border-radius:0 9px 9px 0}
 .route-stage b{font-size:12px}.route-stage small{display:block;color:#66736c;line-height:1.45;margin-top:3px}
 .route-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.route-actions button{flex:1;min-width:130px}
 .research-note{font-size:11px;line-height:1.55;color:#66736c}
 @media(max-width:520px){.rebuild-grid{grid-template-columns:repeat(2,1fr)}.tabs{gap:3px}.tab{font-size:10px;padding:9px 2px}}
 `;document.head.appendChild(x)
}
function inject(){
 if($('#rebuild'))return;
 style();
 const tabs=$('.tabs'),backup=$('.tab[data-tab="backup"]'),b=document.createElement('button');
 b.className='tab';b.dataset.tab='rebuild';b.textContent='再建';tabs.insertBefore(b,backup);
 const sec=document.createElement('section');sec.id='rebuild';sec.className='hidden';
 sec.innerHTML=`<div class="card"><h3 class="section-title">牧場再建・配合研究</h3><p class="muted">目的と繁殖牝馬を選ぶと、おすすめ世代と本命配合を表示します。</p><div hidden aria-hidden="true"><select id="rebuildGoal"><option value="arc">${goalLabels.arc}</option><option value="rebuild">${goalLabels.rebuild}</option><option value="bc">${goalLabels.bc}</option></select><select id="rebuildStarter"></select><div id="rebuildStatus">研究マスタを読み込み中…</div></div></div><div id="rebuildBody" hidden aria-hidden="true"></div>`;
 $('#backup').insertAdjacentElement('beforebegin',sec);
 b.onclick=()=>activate();
 document.querySelectorAll('.tab:not([data-tab="rebuild"])').forEach(x=>x.addEventListener('click',()=>sec.classList.add('hidden')));
 $('#rebuildGoal').value=db.rebuildStudy.goal||'arc';
 $('#rebuildGoal').onchange=()=>{db.rebuildStudy.goal=$('#rebuildGoal').value;db.rebuildStudy.starter=goalDefault[db.rebuildStudy.goal];save();fillStarter();render()};
 $('#rebuildStarter').onchange=()=>{db.rebuildStudy.starter=$('#rebuildStarter').value;save();render()};
}
function activate(){
 document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.dataset.tab==='rebuild'));
 ['horses','races','breed','backup'].forEach(id=>$('#'+id)?.classList.add('hidden'));
 $('#rebuild')?.classList.remove('hidden');if($('#addBtn'))$('#addBtn').style.display='none';render()
}
function mare(name){return mares.find(x=>norm(x.name)===norm(name))}
function sire(name){return stallions.find(x=>norm(x.name)===norm(name))}
function tMare(name){return theory?.broodmares?.find(x=>norm(x.name)===norm(name))}
function fmt(v){return v===null||v===undefined?'—':v}
function fillStarter(){
 const s=$('#rebuildStarter');if(!s||!research)return;
 const old=db.rebuildStudy.starter||goalDefault[$('#rebuildGoal').value]||research.starters[0];
 s.innerHTML=research.starters.map(n=>`<option>${esc(n)}</option>`).join('');
 s.value=research.starters.includes(old)?old:research.starters[0];
 db.rebuildStudy.starter=s.value;save()
}
function starterCard(){
 const name=$('#rebuildStarter')?.value||'',m=mare(name);
 if(!m)return '<div class="card"><p class="muted">繁殖牝馬マスタを取得できませんでした。</p></div>';
 const sum=(m.sp||0)+(m.st||0);
 return `<div class="card"><div class="row"><div><h3 class="section-title">${esc(m.name)}</h3><span class="research-tag master">Switch版内蔵マスタ</span></div><b>SP+ST ${sum}</b></div><div class="rebuild-grid"><div class="rebuild-kpi"><b>${fmt(m.sp)}</b><small>母SP</small></div><div class="rebuild-kpi"><b>${fmt(m.st)}</b><small>母ST</small></div><div class="rebuild-kpi"><b>${fmt(m.pw)}</b><small>母PW</small></div><div class="rebuild-kpi"><b>${fmt(m.nsp)}</b><small>母NSP</small></div><div class="rebuild-kpi"><b>${fmt(m.nst)}</b><small>母NST</small></div><div class="rebuild-kpi"><b>${fmt(m.npw)}</b><small>母NPW</small></div></div><p class="research-note">母能力とニトロは別評価です。NSPが高くても、母SP+STが低い場合は平均能力の低下を別途警戒します。</p></div>`
}
function routeCard(r){
 const s=sire(r.firstSire),n=r.firstPairNitro||{};
 const stats=s?`${s.minD}–${s.maxD}m / 実績${s.record}・底力${s.guts}・安定${s.stable}`:'種牡馬マスタ未取得';
 const theory=(r.theories||[]).length?r.theories.map(x=>`<span class="research-tag">${esc(x)}</span>`).join(''):'<span class="research-tag">配合理論は別画面で確認</span>';
 return `<div class="card route-card" data-route="${esc(r.id)}"><div class="row"><div><h3 class="section-title">${esc(r.title)}</h3><div><span class="research-tag master">父母能力: マスタ</span><span class="research-tag estimate">配合ニトロ: 研究値</span></div></div></div><p><b>${esc(r.startMare)} × ${esc(r.firstSire)}</b></p><div class="rebuild-grid"><div class="rebuild-kpi"><b>${fmt(n.sp)}</b><small>1代目 SPニトロ</small></div><div class="rebuild-kpi"><b>${fmt(n.st)}</b><small>1代目 STニトロ</small></div><div class="rebuild-kpi"><b>${fmt(n.pw)}</b><small>1代目 PWニトロ</small></div></div><p class="muted">${esc(stats)}</p><div>${theory}</div><p class="research-note">${esc(r.pairNitroStatus||'')}</p>${(r.generations||[]).map(g=>`<div class="route-stage"><b>${g.generation}代目：${esc(g.label)}</b><small>${esc(g.action)}</small></div>`).join('')}<div class="notice"><b>判断上の注意：</b> ${esc(r.caution)}</div><div class="route-actions"><button class="primary" data-open-route="${esc(r.id)}">この配合を配合画面で確認</button></div></div>`
}
function principleCard(){
 const p=research?.principles||[],m=research?.estimateModel;
 return `<div class="card"><h3 class="section-title">研究ルール</h3>${p.map(x=>`<p class="research-note"><b>${esc(x.title)}</b>：${esc(x.text)}</p>`).join('')}${m?`<div class="notice"><span class="research-tag estimate">${esc(m.status)}</span><br><b>1000～1200m型の父に関する推定モデル</b><br>${esc(m.scope)}。基礎SP上限を${m.baseSpCapAssumption}と仮定した場合の母SP+ST目安：${m.thresholds.map(x=>`${x.condition} ≈ ${x.spStApprox}`).join(' / ')}。この目安を距離型の違う父へそのまま適用しません。</div>`:''}</div>`
}
function checklistCard(){
 return `<div class="card"><h3 class="section-title">締め配合で必ず再確認</h3><p class="muted">途中世代の数値ではなく、最終締め時点で評価します。</p>${(research?.selectionChecklist||[]).map(x=>`<span class="research-tag">${esc(x)}</span>`).join('')}<p class="research-note" style="margin-top:9px">自家製牝馬・自家製種牡馬は、15祖先が確定した個体から既存の配合理論／クロス判定へ渡します。最終ニトロは親ニトロの単純加算では計算しません。</p></div>`
}
function ensureMare(name){
 let h=db.horses.find(x=>norm(x.name)===norm(name));const m=mare(name),t=tMare(name);
 if(!m)return null;
 const a=t?.ancestor||[];
 if(!h){
   h={id:crypto.randomUUID(),name:m.name,sex:'牝',role:'broodmare',generation:'ゲーム内デフォルト繁殖牝馬',sire:a[0]||'',dam:'',sireSire:a[1]||'',damSire:a[2]||'',sireDamSire:a[4]||'',damDamSire:a[6]||'',ancestor15:a.length===15?[...a]:undefined,minD:'',maxD:'',record:'-',guts:'-',stable:'-',starts:'',g1:'',note:'牧場再建研究の起点牝馬',masterRef:{type:'default-broodmare',name:m.name,ver:m.ver},mareStats:{price:m.price,sp:m.sp,st:m.st,pw:m.pw,dirt:m.dirt,nsp:m.nsp,nst:m.nst,npw:m.npw,nstBook:m.nstBook},rebuildSource:true};
   db.horses.push(h)
 }else{
   if(!h.masterRef)h.masterRef={type:'default-broodmare',name:m.name,ver:m.ver};
   if(!h.mareStats)h.mareStats={price:m.price,sp:m.sp,st:m.st,pw:m.pw,dirt:m.dirt,nsp:m.nsp,nst:m.nst,npw:m.npw,nstBook:m.nstBook};
   if(!h.ancestor15?.length&&a.length===15)h.ancestor15=[...a];
   if(!h.sire&&a[0])h.sire=a[0];if(!h.sireSire&&a[1])h.sireSire=a[1];if(!h.damSire&&a[2])h.damSire=a[2];if(!h.sireDamSire&&a[4])h.sireDamSire=a[4];if(!h.damDamSire&&a[6])h.damDamSire=a[6];
 }
 save();window.renderHorses?.();window.renderBreed?.();return h
}
function openRoute(id){
 const r=research.routes.find(x=>x.id===id);if(!r)return;
 const h=ensureMare(r.startMare);if(!h)return alert('繁殖牝馬マスタの読み込み後にもう一度お試しください。');
 const tab=document.querySelector('.tab[data-tab="breed"]');tab?.click();
 setTimeout(()=>{window.renderBreed?.();const ms=$('#breedMare');if(ms){ms.value=h.id;ms.dispatchEvent(new Event('change',{bubbles:true}))}const q=$('#stallionSearch');if(q){q.value=r.firstSire;q.dispatchEvent(new Event('input',{bubbles:true}))}},180)
}
function render(){
 if(!research)return;
 fillStarter();
 const goal=$('#rebuildGoal')?.value||'arc',routes=research.routes.filter(x=>x.goal===goal);
 const body=$('#rebuildBody');if(!body)return;
 body.innerHTML=starterCard()+`<div class="card"><div class="row"><h3 class="section-title">${esc(goalLabels[goal])}</h3><span class="badge gold">外国種牡馬なし</span></div><p class="muted">現時点の制約で有効な起点を表示します。外国種牡馬前提の実績例は、現在のルート決定には使いません。</p></div>`+routes.map(routeCard).join('')+principleCard()+checklistCard();
 body.querySelectorAll('[data-open-route]').forEach(b=>b.onclick=()=>openRoute(b.dataset.openRoute));
 const st=$('#rebuildStatus');if(st)st.textContent=`研究データ読込済み：起点${research.starters.length}頭 / 研究ルート${research.routes.length}本。最終締め時のニトロを優先し、推定式は公式仕様と分離表示します。`
}
async function json(path){
 const u=new URL(path,location.href);u.searchParams.set('_',BUILD);const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()
}
async function load(){
 inject();
 try{
  const [r,m,s,t]=await Promise.all([json('data/rebuild-research.json'),json('data/default-broodmares.json'),json('data/stallions.json'),json('data/theory-master.json')]);
  research=r;mares=m.broodmares||[];stallions=s.stallions||[];theory=t;window.DABISTA_REBUILD_RESEARCH=research;fillStarter();render()
 }catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'rebuild-research: '+String(e)});const st=$('#rebuildStatus');if(st)st.textContent='研究マスタの読み込みに失敗しました。更新確認を試してください。'}
}
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}
async function checkUpdate(show=false){try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error('HTTP '+r.status);const v=await r.json();if(newer(v.version,V)||v.build!==BUILD){$('#updateText').textContent=`最新版 v${v.version} / ${v.build} があります`;$('#updatebar').classList.add('show')}else{$('#updatebar').classList.remove('show');if(show)alert(`最新版です\nv${V} / ${BUILD}`)}}catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'v1.14 update-check: '+String(e)});if(show)alert('更新確認に失敗しました。通信状態を確認してください。')}}
async function forceUpdate(){try{if('serviceWorker'in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}if('caches'in window){for(const k of await caches.keys())await caches.delete(k)}}catch{}const u=new URL(location.href);u.searchParams.set('update',Date.now());location.replace(u.href)}
function installVersionSupport(){setTimeout(()=>{if($('#refreshBtn'))$('#refreshBtn').onclick=()=>checkUpdate(true);if($('#applyUpdate'))$('#applyUpdate').onclick=forceUpdate;checkUpdate(false)},3800)}
setTimeout(load,900);
installVersionSupport();
})();