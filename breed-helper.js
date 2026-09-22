const BREED_HELPER_VERSION='1.5.0';
let stallionMaster=[];
let breedGoal='arc';
const legacyGoal=g=>g==='arc'?'breaker':g==='stallion'?'successor':g;
function rankValue(x,goal){
  goal=legacyGoal(goal);
  const grade=v=>v==='A'?3:v==='B'?2:v==='C'?1:0;
  let s=0;
  if(goal==='breaker'){
    s+=(x.minD<=1200?28:x.minD<=1400?23:x.minD<=1600?14:x.minD<=1800?6:0);
    s+=grade(x.record)*5+grade(x.guts)*2;
    s+=x.nsp*1.4+x.nst*.55+x.npw*.4;
    s+=(x.stable==='C'?7:x.stable==='B'?4:2);
    s+=(x.maxD>=1800&&x.maxD<=2200?7:x.maxD<=1600?4:x.maxD>=2600?-5:2);
  }else if(goal==='successor'){
    s+=(x.minD<=1200?30:x.minD<=1400?24:x.minD<=1600?13:2);
    s+=grade(x.record)*6+grade(x.guts)*2+x.nsp*1.6;
    s+=(x.stable==='C'?8:x.stable==='B'?5:2);
    s+=(x.maxD<=2000?6:0);
  }else{
    s+=(x.nsp+x.nst+x.npw)*1.4+grade(x.record)*3+grade(x.guts)*2;
    s+=(x.minD<=1600?5:0)+(x.maxD>=2000?4:0);
  }
  return Math.round(s*10)/10;
}
function roleText(x,goal){
  goal=legacyGoal(goal);
  if(goal==='rebuild')return 'NSP '+x.nsp+' / NST '+x.nst+' / NPW '+x.npw+'。共通配合エンジン未起動時のfallback表示です。';
  return x.minD+'–'+x.maxD+'m、実績'+x.record+'/底力'+x.guts+'/安定'+x.stable+'。共通配合エンジン未起動時のfallback表示です。';
}
async function loadStallions(){
  try{
    const u=new URL('data/stallions.json',location.href);u.searchParams.set('_',APP_BUILD);
    const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('stallions HTTP '+r.status);
    const d=await r.json();stallionMaster=d.stallions||[];window.renderBreed?.();
  }catch(e){
    errors.push({at:new Date().toISOString(),message:'stallion-master: '+String(e)});
    const el=document.querySelector('#breedCandidates');if(el)el.innerHTML='<div class="empty">種牡馬マスタの取得に失敗しました。更新確認を試してください。</div>';
  }
}
function breedMareById(id){return window.getBreedHorseById?.(id)||db.horses.find(h=>h.id===id)||null}
function transientMare(){const h=window.DABISTA_TRANSIENT_BREED_MARE;return h?.sex==='牝'?h:null}
function mareOptions(){
  const saved=db.horses.filter(h=>h.sex==='牝').map(h=>'<option value="'+esc(h.id)+'">'+esc(h.name)+'</option>').join('');
  const t=transientMare();
  return (t?'<option value="'+esc(t.id)+'">'+esc(t.name)+'（セリ設計・一時）</option>':'')+saved;
}
function renderBreedLegacy(){
  if(window.DABISTA_BREED_PAIR_INDEX)return;
  const mareSel=document.querySelector('#breedMare');if(!mareSel)return;
  const keep=mareSel.value;mareSel.innerHTML='<option value="">牝馬を選択</option>'+mareOptions();if([...mareSel.options].some(o=>o.value===keep))mareSel.value=keep;
  breedGoal=document.querySelector('#breedGoal')?.value||breedGoal;
  const q=(document.querySelector('#stallionSearch')?.value||'').toLowerCase();
  const a=stallionMaster.filter(x=>x.name.toLowerCase().includes(q)).map(x=>({...x,score:rankValue(x,breedGoal)})).sort((a,b)=>b.score-a.score);
  const box=document.querySelector('#breedCandidates');if(!box)return;
  box.innerHTML=a.map((x,i)=>'<div class="card" data-sire-name="'+esc(x.name)+'"><div class="row"><div><b>'+(i+1)+'. '+esc(x.name)+'</b><div class="muted">'+x.minD+'–'+x.maxD+'m / '+x.growth+' / '+x.price+'万円</div></div><div class="score">'+x.score+'</div></div><div class="grid"><div class="stat"><b>'+x.record+'/'+x.guts+'/'+x.stable+'</b><small>実績/底力/安定</small></div><div class="stat"><b>'+x.nsp+'</b><small>NSP</small></div><div class="stat"><b>'+x.nst+'</b><small>NST</small></div></div><p class="muted">'+esc(roleText(x,breedGoal))+'</p></div>').join('')||'<div class="empty">該当種牡馬なし</div>';
  const info=document.querySelector('#breedNotice'),mare=breedMareById(mareSel.value);
  if(info)info.textContent=mare?'選択牝馬：'+mare.name+'（共通配合エンジン準備中）':'牝馬を選ぶと、牧場内血統に応じた注意表示を行います。';
}
function initBreedHelper(){
  const mare=document.querySelector('#breedMare'),goal=document.querySelector('#breedGoal'),search=document.querySelector('#stallionSearch');
  if(!mare||!goal||!search)return;
  goal.onchange=()=>{breedGoal=goal.value;window.renderBreed?.()};
  mare.onchange=()=>{const t=window.DABISTA_TRANSIENT_BREED_MARE;if(t&&mare.value!==t.id)window.DABISTA_TRANSIENT_BREED_MARE=null;window.renderBreed?.()};
  search.oninput=()=>window.renderBreed?.();
  loadStallions();
}
window.renderBreed=window.renderBreed||renderBreedLegacy;
initBreedHelper();