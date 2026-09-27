(()=>{
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.27-71',db=window.db,$=s=>document.querySelector(s);
if(!db)return;window.APP_VERSION=V;window.APP_BUILD=BUILD;
db.rebuildStudy=db.rebuildStudy||{goal:'arc',starter:'エイスト'};
function activate(){
 document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.dataset.tab==='rebuild'));
 ['horses','races','breed','backup'].forEach(id=>$('#'+id)?.classList.add('hidden'));
 $('#rebuild')?.classList.remove('hidden');if($('#addBtn'))$('#addBtn').style.display='none';
}
function inject(){
 if($('#rebuild'))return;
 const tabs=$('.tabs'),backup=$('.tab[data-tab="backup"]'),b=document.createElement('button');
 b.className='tab';b.dataset.tab='rebuild';b.textContent='再建';tabs.insertBefore(b,backup);
 const sec=document.createElement('section');sec.id='rebuild';sec.className='hidden';
 sec.innerHTML=`<div class="card"><h3 class="section-title">配合設計</h3><p class="muted">繁殖牝馬を選び、凱旋門賞・BC長期・繁殖再建・自家製種牡馬の目的別に直仔〜4代を診断します。</p><div hidden aria-hidden="true"><select id="rebuildGoal"></select><select id="rebuildStarter"></select><div id="rebuildStatus"></div></div></div><div id="rebuildBody" hidden aria-hidden="true"></div>`;
 $('#backup').insertAdjacentElement('beforebegin',sec);
 b.onclick=activate;
 document.querySelectorAll('.tab:not([data-tab="rebuild"])').forEach(x=>x.addEventListener('click',()=>sec.classList.add('hidden')));
}
inject();
})();
