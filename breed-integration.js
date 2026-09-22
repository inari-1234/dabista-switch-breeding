(()=>{
'use strict';

let db=window.db;
if(!db)return;

const $=s=>document.querySelector(s);
const esc=window.esc||((s)=>String(s??''));
const PROFILES=['sp','speedCross','production','st','balance','sire'];
const PROFILE_FALLBACK={
  sp:'SP上限型',
  speedCross:'SPクロス補強型',
  production:'強馬生産型',
  st:'ST・距離適性型',
  balance:'バランス型',
  sire:'自家製種牡馬・血統価値型'
};
const GOAL_ALIAS={breaker:'arc',successor:'stallion',arc:'arc',bc:'bc',rebuild:'rebuild',stallion:'stallion'};
const GOAL_LABELS={arc:'凱旋門',bc:'BC',rebuild:'繁殖再建',stallion:'自家製種牡馬'};
const FUTURE_STATE_LABELS={
  unavailable:'未診断',
  'early-complete':'追加有意改善なし / 早期完成',
  'improves-to-2':'2代まで有意改善',
  'improves-to-3-conditional':'3代まで有意改善※',
  'improves-to-4-conditional':'4代まで有意改善※'
};

let engine=null;
let planner=null;
let advisor=null;
let bootPromise=null;
let currentFingerprint='none';
let currentResolvedMare=null;
let currentPairIndex=null;
let epoch=0;
let activeSire='';
const pairCache=new Map();
const continuationCache=new Map();
const pending=new Map();
const PAIR_CACHE_LIMIT=4;
const CONTINUATION_CACHE_LIMIT=12;

function lruGet(map,key){
  if(!map.has(key))return null;
  const v=map.get(key);map.delete(key);map.set(key,v);return v;
}
function lruSet(map,key,value,limit){
  if(map.has(key))map.delete(key);
  map.set(key,value);
  while(map.size>limit)map.delete(map.keys().next().value);
  return value;
}

function syncDb(){
  db=window.db||db;
  db.breedPlanner=db.breedPlanner||{};
  db.breedPlanner.category=PROFILES.includes(db.breedPlanner.category)?db.breedPlanner.category:'production';
  return db;
}
syncDb();

function canonicalGoal(v){
  return GOAL_ALIAS[String(v||'')]||'arc';
}
function norm(v){
  return String(v??'').normalize('NFKC').trim();
}
function mareBloodlineFingerprint(m){
  if(!m)return 'none';
  return JSON.stringify({
    name:norm(m.name),
    ancestor:(m.ancestor||m.ancestor15||[]).map(norm),
    omoshiro:norm(m.omoshiro||m.omoshiroCode),
    migoto:norm(m.migoto||m.migotoCode)
  });
}
function pairKey(fp){
  return 'pair|'+fp;
}
function continuationKey(fp,sire){
  return 'cont|'+fp+'|'+norm(sire);
}
function selectedMareHorse(){
  const id=$('#breedMare')?.value||'';
  return window.getBreedHorseById?.(id)||db.horses?.find(h=>h.id===id)||null;
}
function transientMare(){
  const h=window.DABISTA_TRANSIENT_BREED_MARE;
  return h?.sex==='牝'?h:null;
}
function mareOptions(){
  syncDb();
  const saved=(db.horses||[]).filter(h=>h.sex==='牝').map(h=>'<option value="'+esc(h.id)+'">'+esc(h.name)+'</option>').join('');
  const t=transientMare();
  return (t?'<option value="'+esc(t.id)+'">'+esc(t.name)+'（セリ設計・一時）</option>':'')+saved;
}
function populateMares(){
  const sel=$('#breedMare');
  if(!sel)return;
  const keep=sel.value;
  sel.innerHTML='<option value="">牝馬を選択</option>'+mareOptions();
  if([...sel.options].some(o=>o.value===keep))sel.value=keep;
}
function selectedGoal(){
  const g=$('#breedGoal');
  const v=canonicalGoal(g?.value);
  if(g&&g.value!==v&&[...g.options].some(o=>o.value===v))g.value=v;
  return v;
}
function selectedCategory(){
  const v=$('#breedCategory')?.value||db.breedPlanner.category||'production';
  return PROFILES.includes(v)?v:'production';
}
function searchText(){
  return norm($('#stallionSearch')?.value).toLowerCase();
}
function theoryFilter(){
  return $('#breedTheoryFilter')?.value||'all';
}
function nitroFilter(){
  return $('#breedNitroFilter')?.value||'all';
}
function releaseLegacyBreedUi(){
  const cleanups=window.DABISTA_BREED_LEGACY_CLEANUPS;
  if(!Array.isArray(cleanups)||!cleanups.length)return;
  while(cleanups.length){
    const cleanup=cleanups.shift();
    try{cleanup?.()}catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'breed-legacy-cleanup: '+String(e)})}
  }
}
function futureOverviewPlaceholder(){return ''}
function clearFutureOverview(){}
function ensureStyle(){
  if($('#breedIntegrationStyle'))return;
  const s=document.createElement('style');
  s.id='breedIntegrationStyle';
  s.textContent='.breed-integration-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.breed-card-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.breed-card-head>div{display:grid;gap:2px}.breed-rank-label{font-size:9px;font-weight:900;color:#60736a}.breed-card-head b{font-size:15px}.breed-cue-badge{padding:4px 7px;border-radius:999px;background:#e8eee9;font-size:9px;font-weight:900;white-space:nowrap}.breed-cue-headline{margin:6px 0;font-size:12px;font-weight:900;line-height:1.4}.breed-reason-row{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0 7px}.breed-reason-chip{padding:3px 6px;border-radius:999px;background:#edf2ef;font-size:8px;font-weight:800;color:#52655c}.breed-card-details{margin:7px 0}.breed-card-details>summary{cursor:pointer;font-size:10px;font-weight:800;color:#53675e}.breed-quick-fit{margin:7px 0}.breed-future-overview{margin-top:10px}.breed-future-head,.breed-future-row{display:grid;grid-template-columns:1.15fr 1.25fr 1fr;gap:6px;align-items:start}.breed-future-head{font-size:9px;color:#66736c;padding:4px 0;border-bottom:1px solid #dce2dd}.breed-future-row{font-size:10px;padding:6px 0;border-bottom:1px solid #e5ebe7}.breed-pair-details,.breed-future-detail{margin:7px 0;font-size:10px}.breed-pair-details summary,.breed-future-detail summary{cursor:pointer}.breed-danger-list>summary{cursor:pointer}@media(max-width:520px){.breed-integration-tools{grid-template-columns:1fr}.breed-future-head,.breed-future-row{grid-template-columns:1fr 1.15fr}.breed-future-head span:last-child,.breed-future-row span:last-child{grid-column:2}.breed-future-row b{grid-row:1 / span 2}}';
  document.head.appendChild(s);
}
function ensureControls(){
  releaseLegacyBreedUi();
  ensureStyle();
  document.querySelector('.theory-tools')?.remove();
  const controls=$('#breed .breed-controls');
  if(!controls)return;
  let cat=$('#breedCategory');
  if(!cat){
    const field=document.createElement('div');
    field.className='field';
    field.innerHTML='<label>配合カテゴリ</label><select id="breedCategory">'+PROFILES.map(p=>'<option value="'+p+'">'+esc(PROFILE_FALLBACK[p])+'</option>').join('')+'</select>';
    controls.appendChild(field);
    cat=field.querySelector('select');
  }
  cat.value=PROFILES.includes(db.breedPlanner.category)?db.breedPlanner.category:'production';
  const mare=$('#breedMare'),goal=$('#breedGoal'),search=$('#stallionSearch');
  if(search&&!$('#breedIntegrationTools')){
    const tools=document.createElement('div');
    tools.id='breedIntegrationTools';
    tools.className='breed-integration-tools';
    tools.innerHTML='<div class="field"><label>配合理論</label><select id="breedTheoryFilter"><option value="all">指定なし</option><option value="any">面白・見事</option><option value="interesting">面白</option><option value="magnificent">見事</option><option value="perfect">完璧</option><option value="elaborate">凝った</option><option value="cross">有効クロスあり</option></select></div><div class="field"><label>現在Pairニトロ</label><select id="breedNitroFilter"><option value="all">指定なし</option><option value="sp15">SP 15以上</option><option value="sp18">SP 18以上</option><option value="st5">ST 5以上</option><option value="bal">SP 15以上＋ST 5以上</option></select></div>';
    search.insertAdjacentElement('afterend',tools);
    $('#breedTheoryFilter').onchange=()=>window.renderBreed();
    $('#breedNitroFilter').onchange=()=>window.renderBreed();
  }
  const notice=$('#breedNotice');
  if(goal){
    const want=canonicalGoal(db.breedPlanner.goal||goal.value);
    if([...goal.options].some(o=>o.value===want))goal.value=want;
  }
  if(mare)mare.onchange=()=>{
    const t=window.DABISTA_TRANSIENT_BREED_MARE;
    if(t&&mare.value!==t.id)window.DABISTA_TRANSIENT_BREED_MARE=null;
    activeSire='';
    window.renderBreed();
  };
  if(goal)goal.onchange=()=>{
    db.breedPlanner.goal=canonicalGoal(goal.value);
    window.saveFarm?.();
    window.renderBreed();
  };
  if(search)search.oninput=()=>window.renderBreed();
  if(cat)cat.onchange=()=>{
    db.breedPlanner.category=cat.value;
    window.saveFarm?.();
    window.renderBreed();
  };
  const box=$('#breedCandidates');
  if(box&&!box.dataset.integrationClick){
    box.dataset.integrationClick='1';
    box.addEventListener('click',e=>{
      const b=e.target.closest('[data-breed-future]');
      if(!b)return;
      const nextSire=b.dataset.breedFuture||'';
      if(nextSire!==activeSire){
        cancelOtherContinuations(nextSire);
        clearFutureOverview();
      }
      activeSire=nextSire;
      renderCachedFutureIntoActive();
      loadFuture(activeSire).then(result=>{
        if(!result)return;
        if(activeSire!==result.firstSire)return;
        if(result.fingerprint!==currentFingerprint)return;
        renderCachedFutureIntoActive();
      }).catch(err=>{
        if(String(err).includes('cancelled'))return;
        window.APP_ERRORS?.push({at:new Date().toISOString(),message:'breed-future: '+String(err)});
        const slot=findFutureSlot(activeSire);
        if(slot)slot.innerHTML='<div class="notice">将来探索中にエラーが発生しました。診断JSONを確認してください。</div>';
      });
    });
  }
}
function setLineage(fp,resolved){
  if(fp===currentFingerprint){
    currentResolvedMare=resolved;
    return false;
  }
  currentFingerprint=fp;
  currentResolvedMare=resolved;
  currentPairIndex=null;
  activeSire='';
  clearFutureOverview();
  epoch++;
  for(const token of pending.values())token.cancelled=true;
  pending.clear();
  return true;
}
function getPairIndex(resolved,fp){
  const k=pairKey(fp),cached=lruGet(pairCache,k);
  if(cached)return cached;
  return lruSet(pairCache,k,planner.createDirectPairIndex(resolved),PAIR_CACHE_LIMIT);
}
function compareRoutes(profile,a,b){
  if(profile==='sire')return 0;
  if(profile==='production'){
    const assessment=currentMareAssessment();
    if(assessment&&advisor?.compareProductionForMare)return advisor.compareProductionForMare(assessment)(a.currentRoute,b.currentRoute);
  }
  return planner.compareProfile(profile)(a.currentRoute,b.currentRoute);
}
function filteredEntries(index,profile,q){
  const safe=index.entries.filter(e=>e.safe&&e.currentRoute);
  const unsafe=index.entries.filter(e=>!e.safe&&e.pair);
  const tf=theoryFilter(),nf=nitroFilter();
  const filterPair=e=>{
    const p=e.pair||{},t=p.theory||{},d=p.danger||{},n=p.nitro||{};
    const theoryOk=tf==='all'
      ||(tf==='any'&&(t.interesting||t.magnificent))
      ||(tf==='interesting'&&t.interesting)
      ||(tf==='magnificent'&&t.magnificent)
      ||(tf==='perfect'&&t.perfect)
      ||(tf==='elaborate'&&p.elaborate?.effective)
      ||(tf==='cross'&&(d.effectiveCrosses||[]).length>0);
    const nitroOk=nf==='all'
      ||(nf==='sp15'&&Number(n.sp||0)>=15)
      ||(nf==='sp18'&&Number(n.sp||0)>=18)
      ||(nf==='st5'&&Number(n.st||0)>=5)
      ||(nf==='bal'&&Number(n.sp||0)>=15&&Number(n.st||0)>=5);
    return theoryOk&&nitroOk;
  };
  let ranked=safe.filter(filterPair);
  if(profile==='speedCross')ranked=ranked.filter(e=>!!e.currentRoute?.final?.speedCross?.has);
  if(profile==='sire')ranked=[...ranked].sort((a,b)=>a.sire.localeCompare(b.sire,'ja'));
  else ranked=[...ranked].sort((a,b)=>compareRoutes(profile,a,b));
  if(q)ranked=ranked.filter(e=>e.sire.toLowerCase().includes(q));
  const unsafeFiltered=q?unsafe.filter(e=>e.sire.toLowerCase().includes(q)):unsafe;
  return{ranked,unsafe:unsafeFiltered};
}
function theoryText(pair){
  const t=pair?.theory||{},e=pair?.elaborate||{};
  const a=[];
  if(t.perfect)a.push('完璧');
  else{
    if(t.interesting)a.push('面白');
    if(t.magnificent)a.push('見事');
  }
  if(e.effective)a.push('凝った');
  return a.length?a.join('・'):'追加理論なし';
}
function currentMareAssessment(){
  const horse=selectedMareHorse(),ref=horse?.masterRef;
  if(ref?.type!=='default-broodmare'||!ref.name)return null;
  return advisor?.mareAssessment?.(ref.name)||null;
}
function currentAbilityKnown(){
  return !!currentMareAssessment()?.abilityKnown;
}
function futureDisplay(status){
  if(!status)return '未診断';
  const known=currentAbilityKnown();
  const trans=status.transitions||[];
  if(status.state==='early-complete'){
    if(trans.some(x=>x.kind==='tradeoff'))return known?'別方向の補強あり / トレードオフ':'血統上の別方向補強あり / トレードオフ';
    if(trans.some(x=>x.kind==='minor'))return known?'微差':'血統上の微差';
    return known?'追加有意改善なし / 早期完成':'血統上の追加有意改善なし';
  }
  const base=FUTURE_STATE_LABELS[status.state]||'未診断';
  return known?base:(base==='未診断'?base:'血統上：'+base);
}
function currentFutureStatus(sire,profile){
  const result=continuationCache.get(continuationKey(currentFingerprint,sire));
  return result?.statuses?.[profile]||null;
}
function fitLabelForRoute(route,goal,profile){
  if(profile==='sire')return advisor.goalFit(null,'stallion').label;
  const fit=advisor.goalFit(route||null,goal);
  if(currentAbilityKnown())return fit.label;
  if(fit.key==='unavailable')return '能力未評価';
  const bloodline=fit.key==='strong'?'強基準':fit.key==='qualified'?'基準到達':fit.key==='below'?'未達':'未評価';
  return '能力未評価（血統：'+bloodline+'）';
}
function fitLabelForStatus(status,goal,profile){
  return fitLabelForRoute(status?.selectedRoute||null,goal,profile);
}
function pairDetailsHtml(entry){
  const p=entry.pair||{},d=p.danger||{},t=p.theory||{},e=p.elaborate||{},n=p.nitro||{};
  const raw=d.rawCrosses||[],eff=d.effectiveCrosses||[];
  const cross=eff.length?eff.slice(0,8).map(x=>esc(x.name)+' '+Number(x.sireGen||0)+'×'+Number(x.mareGen||0)).join(' / '):'有効クロスなし';
  const theory=t.perfect?'完璧（面白＋見事）':[t.interesting?'面白':'',t.magnificent?'見事':'',e.effective?'凝った':''].filter(Boolean).join('・')||'追加理論なし';
  return '<details class="breed-pair-details"><summary>現在Pairの根拠</summary>'+
    '<div class="muted" style="margin-top:6px;line-height:1.55">'+
    '<b>理論：</b>'+esc(theory)+'<br>'+
    '<b>ニトロ：</b>SP '+Number(n.sp||0)+' / ST '+Number(n.st||0)+' / PW '+Number(n.pw||0)+'<br>'+
    '<b>クロス：</b>'+cross+(raw.length!==eff.length?'（生 '+raw.length+' / 有効 '+eff.length+'）':'')+
    '</div></details>';
}
function renderCard(entry,rank,profile,goal){
  const r=entry.currentRoute,f=r?.final||{},n=entry.pair?.nitro||{};
  const assessment=currentMareAssessment();
  const cue=profile==='sire'
    ?{key:'neutral',label:'血統価値候補',headline:'将来の相手牝馬群への汎用性を別軸で確認',reasons:[]}
    :(advisor?.recommendationCue?.(r,profile,assessment)||{key:'neutral',label:'比較候補',headline:'この軸の評価候補',reasons:[]});
  const status=currentFutureStatus(entry.sire,profile);
  const fitLabel=fitLabelForRoute(r,goal,profile);
  const future=futureDisplay(status);
  const risky=['upside','rebuild-upside','longshot','low-record'].includes(cue.key);
  const isMain=profile==='production';
  const stats=f.sireStats||{},cc=stats.record==='C'&&stats.stable==='C';
  const rankText=isMain?(risky?'上振れ枠 '+rank+'位':'本命軸 '+rank+'位'):'参考軸 '+rank+'位';
  const tone=isMain?(['solid','preserve','upside','rebuild-upside','longshot','low-record'].includes(cue.key)?cue.key:'neutral'):'neutral';
  const displayLabel=!isMain&&cc?'参考候補':cue.label;
  const displayHeadline=!isMain&&cc?cue.headline+'。父実績C・安定Cのため本命外':cue.headline;
  const extra=cc?['実績C','安定C']:[];
  const reasons=[...(cue.reasons||[]).slice(0,3),...extra].map(x=>'<span class="breed-reason-chip">'+esc(x)+'</span>').join('');
  const portfolioNote=profile==='sire'?'<div class="muted">血統価値は参考軸です。</div>':'';
  return '<div class="card breed-integrated-card tone-'+esc(tone)+'" data-sire-name="'+esc(entry.sire)+'">'+
    '<div class="breed-card-head"><div><span class="breed-rank-label">'+esc(rankText)+'</span><b>'+esc(entry.sire)+'</b></div><span class="breed-cue-badge">'+esc(displayLabel)+'</span></div>'+
    '<div class="breed-cue-headline">'+esc(displayHeadline)+'</div>'+
    (reasons?'<div class="breed-reason-row">'+reasons+'</div>':'')+
    '<div class="grid"><div class="stat"><b>'+Number(n.sp||0)+'</b><small>SPニトロ</small></div><div class="stat"><b>'+Number(n.st||0)+'</b><small>STニトロ</small></div><div class="stat"><b>'+Number(n.pw||0)+'</b><small>PWニトロ</small></div></div>'+
    portfolioNote+
    '<div class="notice breed-quick-fit"><b>将来性：</b><span data-card-future="'+esc(entry.sire)+'">'+esc(future)+'</span><br><b>'+esc(GOAL_LABELS[goal])+'：</b>'+esc(fitLabel)+'</div>'+
    '<details class="breed-card-details"><summary>現在Pairの詳しい根拠を見る</summary><div class="muted" style="margin-top:6px">実績'+esc(f.sireStats?.record||'-')+'・底力'+esc(f.sireStats?.guts||'-')+'・安定'+esc(f.sireStats?.stable||'-')+' / '+esc(theoryText(entry.pair))+'</div>'+pairDetailsHtml(entry)+'</details>'+
    '<button type="button" class="secondary" data-breed-future="'+esc(entry.sire)+'">2～4代の将来性を診断</button>'+
    '<div class="breed-future-slot" data-future-sire="'+esc(entry.sire)+'"></div>'+
  '</div>';
}
function renderUnsafe(entry){
  const d=entry.pair?.danger||{};
  return '<div class="notice" data-sire-name="'+esc(entry.sire)+'" style="margin-top:7px">'+
    '<b>'+esc(entry.sire)+'：</b>'+esc(d.tyokiken?'超危険条件':'危険条件')+' / '+esc(d.reason||'該当')+
    '</div>';
}
function renderNotice(resolved,index){
  const info=$('#breedNotice');
  if(!info)return;
  if(!resolved){info.textContent='牝馬を選ぶと本命候補を表示します。';return}
  info.innerHTML='<b>'+esc(resolved.name)+'</b> ｜ 安全 '+Number(index?.safeCount||0)+'件'+
    '<br><span class="muted">カード色＝推薦度：緑は本命、黄は上振れ、白は参考軸。SPクロス/STなどのカテゴリ自体には色を付けません。</span>';
}
function renderBreed(){
  syncDb();
  populateMares();
  ensureControls();
  const box=$('#breedCandidates');
  if(!box)return;
  if(!engine||!planner||!advisor){
    box.innerHTML='<div class="empty">共通配合エンジンを読み込み中…</div>';
    boot().then(()=>window.renderBreed()).catch(err=>{
      box.innerHTML='<div class="empty">共通配合エンジンの読み込みに失敗しました。診断JSONを確認してください。</div>';
      window.APP_ERRORS?.push({at:new Date().toISOString(),message:'breed-integration-load: '+String(err)});
    });
    return;
  }
  const horse=selectedMareHorse();
  if(!horse){
    setLineage('none',null);
    renderNotice(null,null);
    box.innerHTML='<div class="empty">繁殖牝馬を選択してください。</div>';
    return;
  }
  const resolved=engine.resolveHorse(horse);
  if(!resolved||!Array.isArray(resolved.ancestor)||resolved.ancestor.length!==15){
    setLineage('unresolved|'+norm(horse.name),null);
    box.innerHTML='<div class="empty">この牝馬は15祖先を解決できないため、配合候補を計算できません。</div>';
    return;
  }
  const fp=mareBloodlineFingerprint(resolved);
  setLineage(fp,resolved);
  currentPairIndex=getPairIndex(resolved,fp);
  window.DABISTA_BREED_PAIR_INDEX.current=currentPairIndex;
  window.DABISTA_BREED_PAIR_INDEX.fingerprint=fp;
  const profile=selectedCategory(),goal=selectedGoal(),q=searchText();
  db.breedPlanner.category=profile;
  db.breedPlanner.goal=goal;
  const lists=filteredEntries(currentPairIndex,profile,q);
  if(activeSire&&!lists.ranked.some(e=>e.sire===activeSire)){
    activeSire='';
    clearFutureOverview();
  }
  renderNotice(resolved,currentPairIndex);
  const safeHtml=lists.ranked.map((e,i)=>renderCard(e,i+1,profile,goal)).join('');
  const unsafeHtml=lists.unsafe.length?'<details class="card breed-danger-list"><summary><b>危険配合 '+lists.unsafe.length+'件（ランキング対象外）</b></summary><p class="muted">警告確認用です。将来探索には入れません。</p>'+lists.unsafe.map(renderUnsafe).join('')+'</details>':'';
  box.innerHTML=safeHtml+unsafeHtml||'<div class="empty">該当種牡馬なし</div>';
  renderCachedFutureIntoActive();
}
function checkToken(token){
  if(token.cancelled||token.epoch!==epoch||token.fingerprint!==currentFingerprint)throw Error('cancelled');
}
const yieldUi=()=>new Promise(r=>setTimeout(r,0));
async function scan(iter,collector,token,label,sideCollector,onRoute){
  let n=0;
  for(const route of iter){
    checkToken(token);
    collector.push(route);
    if(sideCollector)sideCollector.push(route);
    if(onRoute)onRoute(route);
    n++;
    if(n%512===0){
      token.progress=label+' '+n.toLocaleString()+'件';
      if(activeSire===token.firstSire)renderFutureProgress(token);
      await yieldUi();
    }
  }
  return n;
}
function routeAt(result,profile){
  return result?.profiles?.[profile]?.[0]||null;
}
function portfolioOne(routes){
  if(!routes?.length)return null;
  return planner.portfolioPareto(routes,1);
}
function createFutureProductionCollector(assessment,limit=24){
  const cmp=advisor?.compareProductionForMare?.(assessment)||planner.compareProfile('production');
  const list=[],keys=new Set();
  return{
    push(route){
      if(!route)return;
      const key=planner.routeKey(route);
      if(keys.has(key))return;
      let i=0;while(i<list.length&&cmp(list[i],route)<=0)i++;
      if(list.length>=limit&&i>=limit)return;
      list.splice(i,0,route);keys.add(key);
      if(list.length>limit){const drop=list.pop();keys.delete(planner.routeKey(drop))}
    },
    routes(){return list.slice()}
  };
}
function fanoutFutureCollectors(...collectors){
  const active=collectors.filter(Boolean);
  return active.length?{push(route){for(const c of active)c.push(route)}}:null;
}
async function buildContinuation(firstSire,token){
  checkToken(token);
  const direct=planner.evaluateDirectPair(token.mare,firstSire);
  if(!direct.safe||!direct.route)return{fingerprint:token.fingerprint,firstSire,safe:false,statuses:{},meta:{}};
  const g1=direct.route;
  const assessment=currentMareAssessment();

  const c2=planner.createCollector({topN:5,poolN:24});
  const p2=createFutureProductionCollector(assessment,24);
  const routes2=[];
  const count2=await scan(planner.iterateTwoFromDirect(g1),c2,token,'2代探索',p2,r=>routes2.push(r));
  const g2=c2.finish(),production2=p2.routes()[0]||routeAt(g2,'production');

  const c3=planner.createCollector({topN:5,poolN:24});
  const p3=createFutureProductionCollector(assessment,24);
  const bridge4=planner.createFourthBridgeCollector();
  const count3=await scan(planner.iterateThirdPreview(token.mare,routes2),c3,token,'3代固定父全探索',fanoutFutureCollectors(bridge4,p3),null);
  const g3=c3.finish(),production3=p3.routes()[0]||routeAt(g3,'production');

  const b4=bridge4.finish();
  const c4=planner.createCollector({topN:5,poolN:20});
  const p4=createFutureProductionCollector(assessment,24);
  const count4=await scan(planner.iterateFourthPreview(token.mare,b4.bases),c4,token,'4代compact bridge',p4,null);
  const g4=c4.finish(),production4=p4.routes()[0]||routeAt(g4,'production');

  checkToken(token);
  const statuses={};
  for(const profile of PROFILES){
    if(profile==='sire')continue;
    statuses[profile]=advisor.profileFutureStatus({
      profile,
      routes:{
        1:g1,
        2:profile==='production'?production2:routeAt(g2,profile),
        3:profile==='production'?production3:routeAt(g3,profile),
        4:profile==='production'?production4:routeAt(g4,profile)
      }
    });
  }
  const portfolios={
    1:portfolioOne([g1]),
    2:portfolioOne(g2.pool),
    3:portfolioOne(g3.pool),
    4:portfolioOne(g4.pool)
  };
  statuses.sire=advisor.profileFutureStatus({profile:'sire',portfolios});
  return{
    fingerprint:token.fingerprint,
    firstSire,
    safe:true,
    statuses,
    routes:{1:g1,2:g2,3:g3,4:g4},
    portfolios,
    meta:{
      generation2:{method:'exact-fixed-first',safeCount:count2},
      generation3:{method:'exact-fixed-first',safeCount:count3,baseCount:routes2.length},
      generation4:{method:'conditional-compact-bridge',safeCount:count4,bridgeBaseCount:b4.bases.length,bridgeCounts:b4.bridgeCounts}
    }
  };
}
function cancelOtherContinuations(keepSire=''){
  for(const [key,token] of pending){
    if(token.fingerprint===currentFingerprint&&token.firstSire!==keepSire){
      token.cancelled=true;
      pending.delete(key);
    }
  }
}
function loadFuture(firstSire){
  if(!planner||!currentResolvedMare||!firstSire)return Promise.resolve(null);
  const key=continuationKey(currentFingerprint,firstSire);
  const cached=lruGet(continuationCache,key);
  if(cached)return Promise.resolve(cached);
  if(pending.has(key))return pending.get(key).promise;
  const token={
    key,
    fingerprint:currentFingerprint,
    epoch,
    mare:currentResolvedMare,
    firstSire,
    cancelled:false,
    progress:'開始'
  };
  const promise=(async()=>{
    try{
      const result=await buildContinuation(firstSire,token);
      checkToken(token);
      lruSet(continuationCache,key,result,CONTINUATION_CACHE_LIMIT);
      return result;
    }finally{
      if(pending.get(key)===token)pending.delete(key);
    }
  })();
  token.promise=promise;
  pending.set(key,token);
  renderFutureProgress(token);
  return promise;
}
function findFutureSlot(sire){
  return [...document.querySelectorAll('.breed-future-slot')].find(x=>x.dataset.futureSire===sire)||null;
}
function renderFutureProgress(token){
  const slot=findFutureSlot(token.firstSire);
  if(slot&&activeSire===token.firstSire)slot.innerHTML='<div class="notice"><b>将来探索中：</b>'+esc(token.progress||'処理中')+'<br><span class="muted">3代は固定初手父で全探索、4代は条件付きcompact bridgeです。</span></div>';
}
function futureRowsHtml(result){
  const goal=selectedGoal();
  return PROFILES.map(profile=>{
    const st=result.statuses?.[profile];
    const label=planner.profileLabels?.[profile]||PROFILE_FALLBACK[profile];
    const fit=fitLabelForStatus(st,goal,profile);
    return '<div class="breed-future-row"><b>'+esc(label)+'</b><span>'+esc(futureDisplay(st))+'</span><span>'+esc(fit)+'</span></div>';
  }).join('');
}
function selectedRouteDetail(profile,status){
  if(profile==='sire')return '<span class="muted">血統価値はportfolioで別軸評価。</span>';
  const r=status?.selectedRoute;
  if(!r)return '<span class="muted">評価ルートなし</span>';
  const f=r.final||{};
  const path=(r.sires||[]).join(' → ');
  return '<b>'+esc(path||'直配合')+'</b> ｜ SP '+Number(f.sp||0)+' / ST '+Number(f.st||0)+' / PW '+Number(f.pw||0);
}
function transitionDetail(status){
  const ts=status?.transitions||[];
  const meaningful=ts.filter(x=>x.kind!=='none');
  if(!meaningful.length)return '<span class="muted">直配合から有意な追加改善なし。</span>';
  return meaningful.map(x=>'<div><b>'+Number(x.to)+'代：</b>'+esc(x.kind==='material'?'有意改善':x.kind==='tradeoff'?'別方向の補強 / tradeoff':'微差')+(x.reasons?.length?' — '+esc(x.reasons.join('／')):'')+'</div>').join('');
}
function renderFutureOverview(result){}
function futureHtml(result){
  const goal=selectedGoal(),profile=selectedCategory(),m=result.meta||{};
  const st=result.statuses?.[profile],label=planner.profileLabels?.[profile]||PROFILE_FALLBACK[profile];
  const fit=fitLabelForStatus(st,goal,profile);
  return '<div class="notice breed-future-simple" style="margin-top:8px">'+
    '<b>'+esc(label)+'：'+esc(futureDisplay(st))+'</b>'+
    '<div style="margin-top:4px">'+esc(GOAL_LABELS[goal])+'：'+esc(fit)+'</div>'+
    '<details class="breed-future-detail"><summary>将来ルート・探索条件を見る</summary>'+
    '<div class="muted" style="margin-top:6px;line-height:1.55">'+selectedRouteDetail(profile,st)+'<br>'+transitionDetail(st)+
    '<br>2代 '+Number(m.generation2?.safeCount||0).toLocaleString()+'件 / 3代 '+Number(m.generation3?.safeCount||0).toLocaleString()+'件 / 4代 '+Number(m.generation4?.safeCount||0).toLocaleString()+'件</div></details>'+
    '</div>';
}
function renderCachedFutureIntoActive(){
  if(!activeSire)return;
  const key=continuationKey(currentFingerprint,activeSire);
  const cached=lruGet(continuationCache,key);
  if(cached){
    renderFutureOverview(cached);
    const status=cached.statuses?.[selectedCategory()];
    const marker=[...document.querySelectorAll('[data-card-future]')].find(x=>x.dataset.cardFuture===activeSire);
    if(marker)marker.textContent=futureDisplay(status);
    const slot=findFutureSlot(activeSire);
    if(slot)slot.innerHTML=futureHtml(cached);
    return;
  }
  const token=pending.get(key);
  if(token){renderFutureProgress(token);return}
  const slot=findFutureSlot(activeSire);
  if(slot)slot.innerHTML='';
}
async function boot(){
  if(bootPromise)return bootPromise;
  bootPromise=(async()=>{
    engine=await window.DABISTA_BREEDING_ENGINE?.ready;
    if(!engine)throw Error('breeding engine missing');
    if(!window.DABISTA_SALE_PLANNER_CORE)throw Error('sale planner core missing');
    if(!window.DABISTA_SALE_RECOMMENDATION_CORE)throw Error('sale recommendation core missing');
    planner=window.DABISTA_SALE_PLANNER_CORE.create({
      engine:engine.core,
      stallions:engine.domesticStallions(),
      stallionStats:engine.stallionData.stallions||[],
      broodmares:engine.broodmares(),
      broodmareStats:engine.mareData.broodmares||[]
    });
    advisor=window.DABISTA_SALE_RECOMMENDATION_CORE.create({
      planner,
      broodmareStats:engine.mareData.broodmares||[]
    });
    window.DABISTA_BREED_FUTURE.planner=planner;
    window.DABISTA_BREED_FUTURE.advisor=advisor;
    return true;
  })();
  return bootPromise;
}

window.DABISTA_BREED_PAIR_INDEX={
  version:1,
  current:null,
  fingerprint:'none',
  mareBloodlineFingerprint,
  get(sire){return currentPairIndex?.get?.(sire)||null},
  state(){return{fingerprint:currentFingerprint,epoch,safeCount:currentPairIndex?.safeCount||0,unsafeCount:currentPairIndex?.unsafeCount||0}}
};
window.DABISTA_BREED_FUTURE={
  version:1,
  load:loadFuture,
  getCached(sire){return continuationCache.get(continuationKey(currentFingerprint,sire))||null},
  state(){return{fingerprint:currentFingerprint,epoch,pending:[...pending.keys()],cached:[...continuationCache.keys()]}},
  planner:null,
  advisor:null
};
window.renderBreed=renderBreed;
setTimeout(()=>window.renderBreed(),0);
})();