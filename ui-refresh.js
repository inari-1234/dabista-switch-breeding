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
    <button class="ui-jump" data-go="breed" type="button"><span class="ui-action-icon">⌕</span><strong>配合を考える</strong><small>種牡馬候補・理論・ニトロ</small></button>
    <button class="ui-jump" data-go="sale" type="button"><span class="ui-action-icon">↗</span><strong>セリ牝馬から設計</strong><small>直仔・2代・3代を探索</small></button>
    <button class="ui-jump" data-go="rebuild" type="button"><span class="ui-action-icon">◇</span><strong>牧場を再建する</strong><small>凱旋門・BC・能力底上げ</small></button>
    <button class="ui-jump" data-go="horses" type="button"><span class="ui-action-icon">♘</span><strong>登録馬を見る</strong><small>自家製馬・能力・レース印</small></button>
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
ensureHome();
ensureInlineAdd();


window.addEventListener('load',()=>{
 ensureHome();
 const ver=$('#ver');
 if(ver&&!/UI刷新/.test(ver.textContent))ver.textContent+=' / UI刷新';
});
})();