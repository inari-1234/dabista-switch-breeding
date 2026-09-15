const BREED_HELPER_VERSION='1.4.0';
let stallionMaster=[];
let breedGoal='breaker';
function rankValue(x,goal){
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
  const special={
    'ロードカナロア':'SP基盤を崩しにくいA/A/A。まず速度を残す繁殖牝馬作り向き。',
    'ダイワメジャー':'短距離寄りでSP保持を優先しやすい。安定Aなので高能力牝馬の維持役。',
    'ステイゴールド':'実績A・底力A・安定C。分散を利用した外れ値探索向きだが、距離はST寄り。',
    'モーリス':'1400–2000・安定C。速度を残しつつ中距離側へ振る高変動候補。',
    'ドゥラメンテ':'NSP7・実績A。牝馬側のSPが十分高い場合の候補。下限1800なので過信しない。',
    'オルフェーヴル':'2000–3000でST側へ寄りやすい。バランサー前提では優先度を下げる。',
    'グランプリボス':'NSP10・安定C。Switch BCで強い系統として見かける高速・高変動候補。',
    'アグネスデジタル':'NSP9/NST5。短中距離寄りでニトロも高め。',
    'バゴ':'NSP10・安定C。イナリシャトル父系でも実績があるため、牧場内の実証価値が高い。',
    'ワイルドラッシュ':'NSP9/NST5・安定A。イナリシャトル母父と同血のため、近交には必ず注意。',
    'ビッグアーサー':'1200–1600・NSP8。速度側を崩しにくい候補。',
    'ストラヴィンスキー':'1200–1600・NSP10。低価格帯の高SPニトロ候補。',
    'ケイムホーム':'1200–1600・NSP10。SP側の素材候補だが底力C。',
    'ゴールドアリュール':'1400–2200・NST7。距離余力を戻す候補だがSP保持を実戦で確認。'
  };
  if(special[x.name]) return special[x.name];
  if(goal==='rebuild') return `NSP ${x.nsp} / NST ${x.nst} / NPW ${x.npw}。血統構成を登録後、凝った・見事・クロス判定で再評価。`;
  return `${x.minD}–${x.maxD}m、実績${x.record}/底力${x.guts}/安定${x.stable}。仮スコアは血統固有の配合理論をまだ含みません。`;
}
async function loadStallions(){
  try{
    const u=new URL('data/stallions.json',location.href);u.searchParams.set('_',APP_BUILD);
    const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('stallions HTTP '+r.status);
    const d=await r.json();stallionMaster=d.stallions||[];renderBreed();
  }catch(e){errors.push({at:new Date().toISOString(),message:'stallion-master: '+String(e)});const el=document.querySelector('#breedCandidates');if(el)el.innerHTML='<div class="empty">種牡馬マスタの取得に失敗しました。更新確認を試してください。</div>'}
}
function mareOptions(){return db.horses.filter(h=>h.sex==='牝').map(h=>`<option value="${h.id}">${esc(h.name)}</option>`).join('')}
function renderBreed(){
  const mareSel=document.querySelector('#breedMare');if(!mareSel)return;
  const keep=mareSel.value;mareSel.innerHTML='<option value="">牝馬を選択</option>'+mareOptions();if([...mareSel.options].some(o=>o.value===keep))mareSel.value=keep;
  let q=(document.querySelector('#stallionSearch')?.value||'').toLowerCase();
  let a=stallionMaster.filter(x=>x.name.toLowerCase().includes(q)).map(x=>({...x,score:rankValue(x,breedGoal)})).sort((a,b)=>b.score-a.score);
  const box=document.querySelector('#breedCandidates');
  box.innerHTML=a.map((x,i)=>`<div class="card"><div class="row"><div><b>${i+1}. ${esc(x.name)}</b><div class="muted">${x.minD}–${x.maxD}m / ${x.growth} / ${x.price}万円</div></div><div class="score">${x.score}</div></div><div class="grid"><div class="stat"><b>${x.record}/${x.guts}/${x.stable}</b><small>実績/底力/安定</small></div><div class="stat"><b>${x.nsp}</b><small>NSP</small></div><div class="stat"><b>${x.nst}</b><small>NST</small></div></div><p class="muted">${esc(roleText(x,breedGoal))}</p></div>`).join('')||'<div class="empty">該当種牡馬なし</div>';
  const info=document.querySelector('#breedNotice');
  const mare=db.horses.find(h=>h.id===mareSel.value);
  if(mare){
    let warn=[];if(mare.sire==='イナリシャトル')warn.push('イナリシャトル直仔牝馬');if(mare.sire==='イナリシャトル'&&mare.dam)warn.push('近交・クロスは4代血統登録後に必ず確認');
    info.textContent=`選択牝馬：${mare.name}（父 ${mare.sire||'不明'}）${warn.length?'｜'+warn.join('・'):''}`;
  }else info.textContent='牝馬を選ぶと、牧場内血統に応じた注意表示を行います。';
}
function initBreedHelper(){
  const mare=document.querySelector('#breedMare'),goal=document.querySelector('#breedGoal'),search=document.querySelector('#stallionSearch');
  if(!mare||!goal||!search)return;
  goal.onchange=()=>{breedGoal=goal.value;renderBreed()};mare.onchange=renderBreed;search.oninput=renderBreed;
  loadStallions();
}
initBreedHelper();