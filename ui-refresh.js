(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
if(document.body.classList.contains('ui-refresh'))return;
document.body.classList.add('ui-refresh');


const title=$('header h1');
if(title)title.textContent='ダビスタSwitch 配合支援';
const sub=$('header .sub');
if(sub)sub.textContent='配合理論・血統・ニトロ・繁殖能力を分けて考える';

const labels={horses:'ホーム',races:'実績',breed:'配合',rebuild:'再建',backup:'保存'};
$$('.tab').forEach(b=>{if(labels[b.dataset.tab])b.textContent=labels[b.dataset.tab]});

function clickTab(name){
 const b=$('.tab[data-tab="'+name+'"]');
 if(b)b.click();
}
function ensureInlineAdd(){
 const toolbar=document.querySelector('#horses .toolbar');
 if(!toolbar||document.querySelector('#addInlineBtn'))return;
 const b=document.createElement('button');
 b.type='button';b.id='addInlineBtn';b.className='primary ui-inline-add';b.textContent='＋ 馬を登録';
 b.addEventListener('click',()=>document.querySelector('#addBtn')?.click());
 const photo=document.querySelector('#photoBtn');
 if(photo)toolbar.insertBefore(b,photo);else toolbar.appendChild(b);
}
function ensureHome(){
 const sec=$('#horses');
 if(!sec||$('#uiHomeIntro'))return;
 const hero=document.createElement('div');
 hero.id='uiHomeIntro';
 hero.className='ui-home';
 hero.innerHTML=`
  <div class="ui-home-hero">
    <div>
      <span class="ui-eyebrow">DABISTA SWITCH BREEDING LAB</span>
      <h2>次の1手と、<br>3代先まで考える。</h2>
      <p>自家製馬の記録、配合候補、牧場再建、セリ牝馬からの自動設計を一つの流れで確認します。</p>
    </div>
    <div class="ui-horse-mark" aria-hidden="true">♞</div>
  </div>
  <div class="ui-home-actions">
    <button class="ui-jump" data-go="breed" type="button"><span class="ui-action-icon">⌕</span><strong>配合を考える</strong><small>登録済み繁殖牝馬から候補を探す</small></button>
    <button class="ui-jump" data-go="sale" type="button"><span class="ui-action-icon">↗</span><strong>繁殖牝馬から設計</strong><small>331頭から目的別にルートを作る</small></button>
  </div>`;
 const toolbar=sec.querySelector('.toolbar');
 sec.insertBefore(hero,toolbar||sec.firstChild);
 const intro=document.createElement('div');
 intro.className='ui-section-intro';
 intro.innerHTML='<div><span class="ui-eyebrow">MY FARM DATABASE</span><h2>登録馬・自家製馬</h2></div><small>タップして編集</small>';
 if(toolbar)sec.insertBefore(intro,toolbar);
 hero.addEventListener('click',e=>{
   const b=e.target.closest('[data-go]');
   if(!b)return;
   const go=b.dataset.go;
   if(go==='sale'){
     clickTab('rebuild');
     setTimeout(()=>$('#salePlanner')?.scrollIntoView({behavior:'smooth',block:'start'}),60);
   }else if(go==='rebuild'){
     clickTab('rebuild');
     setTimeout(()=>$('#rebuild')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
   }else if(go==='breed'){
     clickTab('breed');
     setTimeout(()=>$('#breed')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
   }else{
     clickTab('horses');
     setTimeout(()=>$('#horseList')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
   }
 });
}
function ensureHorseListControls(){
 const toolbar=$('#horses .toolbar');if(!toolbar||$('#horseListControls'))return;
 const row=document.createElement('div');row.id='horseListControls';row.className='horse-list-controls';
 row.innerHTML='<span id="horseListSummary" class="horse-list-summary"></span><select id="horseRoleFilter" aria-label="現在の状態で絞り込み"><option value="all">すべて</option><option value="race">現役</option><option value="broodmare">繁殖牝馬</option><option value="stallion">種牡馬</option></select><select id="horseSort" aria-label="並び順"><option value="newest">新しい順</option><option value="name">名前順</option><option value="oldest">登録順</option></select>';
 toolbar.insertAdjacentElement('afterend',row);
 $('#horseRoleFilter').onchange=()=>window.renderHorses?.();
 $('#horseSort').onchange=()=>window.renderHorses?.();
 window.renderHorses?.();
}
ensureHome();
ensureInlineAdd();
ensureHorseListControls();


window.addEventListener('load',()=>{
 ensureHome();
 const ver=$('#ver');
 if(ver&&!/UI刷新/.test(ver.textContent))ver.textContent+=' / UI刷新';
});
})();