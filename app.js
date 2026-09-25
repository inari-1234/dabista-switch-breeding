const APP_VERSION='1.19.1';
const APP_BUILD='2026.09.25-66';
const KEY='dabistaFarmV1';
const errors=[];
let updateState={lastCheck:null,status:'not-checked',remote:null};
window.APP_VERSION=APP_VERSION;window.APP_BUILD=APP_BUILD;window.APP_ERRORS=errors;
window.addEventListener('error',e=>errors.push({at:new Date().toISOString(),message:e.message,source:e.filename,line:e.lineno,col:e.colno}));
window.addEventListener('unhandledrejection',e=>errors.push({at:new Date().toISOString(),message:String(e.reason)}));
const seed={schemaVersion:2,growthCheckSets:[],growthChecks:[],horses:[{id:'inari-shuttle',name:'イナリシャトル',sex:'牡',generation:'基準種牡馬',sire:'バゴ',dam:'イナリワルツ',minD:1000,maxD:1200,record:'A',guts:'A',stable:'C',starts:'30戦12勝',g1:'',note:'G1馬を量産した高SP基準馬。代表産駒：イナリガーデン（ジャパンC）、イナリララバイ（宝塚記念）、イナリミッキー（宝塚記念）。'}],races:[],memo:''};
let db=JSON.parse(localStorage.getItem(KEY)||'null')||seed;db.races=db.races||[];db.horses=db.horses||[];db.memo=db.memo||'';window.DABISTA_GROWTH_DB?.normalizeInPlace(db);window.db=db;
window.DABISTA_TRANSIENT_BREED_MARE=null;
window.getBreedHorseById=id=>{
  const saved=db.horses.find(x=>x.id===id);
  if(saved)return saved;
  const t=window.DABISTA_TRANSIENT_BREED_MARE;
  return t&&t.id===id?t:null;
};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));window.db=db};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.esc=esc;window.saveFarm=save;
save();$('#ver').textContent=`v${APP_VERSION} / Build ${APP_BUILD}`;
function score(id){const r=db.races.filter(x=>x.horseId===id&&x.distance>=2000&&x.distance<=2400),v={'◎':5,'○':4,'▲':3,'△':2,'－':1,'不明':0};if(!r.length)return null;const a=r.reduce((s,x)=>s+(v[x.mark4]||0),0)/r.length,b=r.reduce((s,x)=>s+(v[x.mark5]||0),0)/r.length;let l=a>=4.5&&b>=4?'ブレイカー有力':a>=4.5&&b>=3?'高SP・ST残存候補':a>=4.5?'SP押し切り型':b>=4?'ST寄り':'要データ';const long=r.filter(x=>x.distance>=2200);if(long.length&&long.every(x=>(v[x.mark4]||0)>=4)&&long.some(x=>(v[x.mark5]||0)>=4))l='ブレイカー有力';return{a,b,l,n:r.length,wins:r.filter(x=>+x.finish===1).length}}
window.horseScore=score;
function horseRoleKey(h){
 if(h?.role==='broodmare')return'broodmare';
 if(h?.role==='sire-candidate')return'sire-candidate';
 if(h?.role==='stallion')return'stallion';
 if(h?.role==='race')return'race';
 return h?.sex==='牝'?'broodmare':'race';
}
function horseRoleLabel(h){
 const k=horseRoleKey(h);
 if(k==='broodmare')return'繁殖牝馬';
 if(k==='sire-candidate')return'種牡馬候補';
 if(k==='stallion')return'種牡馬';
 return '競走馬'+(h?.sex?'・'+h.sex:'');
}
function renderH(){
 const q=String($('#search')?.value||'').normalize('NFKC').toLowerCase();
 const role=$('#horseRoleFilter')?.value||'all',sort=$('#horseSort')?.value||'newest';
 let a=db.horses.map((h,i)=>({h,i})).filter(({h})=>{
   const hay=[h.name,h.sire,h.dam,h.generation,h.note,h.roleMemo,h.routeSource?.startMare,...(h.routeSource?.sires||[])].join(' ').normalize('NFKC').toLowerCase();
   return (!q||hay.includes(q))&&(role==='all'||horseRoleKey(h)===role);
 });
 if(sort==='name')a.sort((x,y)=>String(x.h.name||'').localeCompare(String(y.h.name||''),'ja'));
 else if(sort==='oldest')a.sort((x,y)=>x.i-y.i);
 else a.sort((x,y)=>y.i-x.i);
 const summary=$('#horseListSummary');if(summary)summary.textContent=a.length===db.horses.length?`${a.length}頭`:`${a.length} / ${db.horses.length}頭`;
 $('#horseList').innerHTML=a.map(({h})=>{
   const sc=score(h.id),distance=h.minD&&h.maxD?`${h.minD}–${h.maxD}`:'';
   const stats=[['実績',h.record],['底力',h.guts],['安定',h.stable]].filter(([,v])=>v&&v!=='-');
   const statHtml=stats.length?'<div class="grid horse-stat-grid">'+stats.map(([label,v])=>`<div class="stat"><b>${esc(v)}</b><small>${label}</small></div>`).join('')+'</div>':'';
   return `<article class="card horse" data-id="${h.id}"><div class="row"><div><h2>${esc(h.name)}</h2><span class="badge horse-role-badge">${esc(horseRoleLabel(h))}</span>${h.generation?`<span class="badge gold">${esc(h.generation)}</span>`:''}${sc?`<span class="badge">${sc.l}</span>`:''}</div>${distance?`<div class="score">${distance}</div>`:''}</div><p class="muted horse-parent-line">${esc(h.sire||'?')} × ${esc(h.dam||'?')}</p>${statHtml}${sc?`<p class="muted">2000–2400m ${sc.n}走｜④ ${sc.a.toFixed(1)}｜⑤ ${sc.b.toFixed(1)}｜1着 ${sc.wins}</p>`:''}${h.starts?`<p><b>${esc(h.starts)}</b> ${esc(h.g1||'')}</p>`:''}${h.note?`<p class="muted horse-note">${esc(h.note)}</p>`:''}</article>`;
 }).join('')||'<div class="empty">条件に合う登録馬はありません</div>';
}
function renderR(){const g=db.horses.map(h=>({h,r:db.races.filter(x=>x.horseId===h.id).sort((a,b)=>a.distance-b.distance)})).filter(x=>x.r.length);$('#raceCards').innerHTML=g.map(x=>{const s=score(x.h.id);return`<div class="card ${s?.l==='ブレイカー有力'?'breaker':''}" data-race-horse-id="${x.h.id}"><div class="row"><b>${esc(x.h.name)}</b><span class="score">${s?s.a.toFixed(1)+' / '+s.b.toFixed(1):''}</span></div><div class="muted">${s?.l||''}</div><table><tr><th>レース</th><th>距離</th><th>④</th><th>⑤</th><th>着</th><th></th></tr>${x.r.map(r=>`<tr><td>${esc(r.name)}${r.age&&r.month?`<small class="growth-race-date">${r.age}歳${r.month}月</small>`:''}</td><td>${r.distance}</td><td class="mark">${r.mark4}</td><td class="mark">${r.mark5}</td><td>${r.finish||'-'}</td><td><button class="secondary mini" data-del="${r.id}">削除</button></td></tr>`).join('')}</table></div>`}).join('')||'<div class="empty">レース記録なし</div>'}
window.renderHorses=renderH;window.renderRaces=renderR;renderH();renderR();
$('#search').oninput=renderH;
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('on'));b.classList.add('on');['horses','races','breed','backup'].forEach(x=>$('#'+x).classList.toggle('hidden',x!==b.dataset.tab));$('#addBtn').style.display=b.dataset.tab==='horses'?'block':'none';if(b.dataset.tab==='breed'&&window.renderBreed)window.renderBreed()});
$('#addBtn').onclick=()=>{$('#horseForm').reset();$('#editId').value='';horseDlg.showModal()};
$('#horseForm').onsubmit=e=>{e.preventDefault();const id=$('#editId').value||crypto.randomUUID(),h={id,name:$('#name').value,sex:$('#sex').value,generation:$('#generation').value,sire:$('#sire').value,dam:$('#dam').value,minD:+$('#minD').value||'',maxD:+$('#maxD').value||'',record:$('#record').value,guts:$('#guts').value,stable:$('#stable').value,starts:$('#starts').value,g1:$('#g1').value,note:$('#note').value},i=db.horses.findIndex(x=>x.id===id);i<0?db.horses.push(h):db.horses[i]=h;save();renderH();if(window.renderBreed)window.renderBreed();horseDlg.close()};
$('#horseList').onclick=e=>{if(e.target.closest('[data-horse-action]'))return;const c=e.target.closest('[data-id]');if(!c)return;const h=db.horses.find(x=>x.id===c.dataset.id);Object.entries({editId:h.id,name:h.name,sex:h.sex,generation:h.generation,sire:h.sire,dam:h.dam,minD:h.minD,maxD:h.maxD,record:h.record,guts:h.guts,stable:h.stable,starts:h.starts,g1:h.g1,note:h.note}).forEach(([k,v])=>$('#'+k).value=v??'');horseDlg.showModal()};
$('#addRace').onclick=()=>{$('#raceForm').reset();$('#raceHorse').innerHTML=db.horses.map(h=>`<option value="${h.id}">${esc(h.name)}</option>`).join('');const h=db.horses.find(x=>x.id===$('#raceHorse').value);if($('#raceAge')&&h?.currentAge)$('#raceAge').value=h.currentAge;if($('#raceMonth')&&h?.currentMonth)$('#raceMonth').value=h.currentMonth;raceDlg.showModal()};
$('#raceForm').onsubmit=e=>{e.preventDefault();db.races.push({id:crypto.randomUUID(),horseId:$('#raceHorse').value,name:$('#raceName').value,distance:+$('#raceDistance').value,mark4:$('#mark4').value,mark5:$('#mark5').value,finish:+$('#finish').value||'',popularity:+$('#popularity').value||'',note:$('#raceNote').value,age:+($('#raceAge')?.value)||'',month:+($('#raceMonth')?.value)||''});save();renderR();renderH();raceDlg.close()};
$('#raceCards').onclick=e=>{const id=e.target.dataset.del;if(id&&confirm('削除しますか？')){db.races=db.races.filter(r=>r.id!==id);window.db=db;save();renderR();renderH()}};
$('#breedMemo').value=db.memo||'';$('#saveMemo').onclick=()=>{db.memo=$('#breedMemo').value;save();alert('保存しました')};
$('#photoBtn').onclick=()=>$('#photo').click();$('#photo').onchange=e=>alert(`${e.target.files.length}枚選択しました。画像解析は今後追加します。`);
function downloadJSON(obj,name){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}window.downloadJSON=downloadJSON;
$('#exportBtn').onclick=()=>downloadJSON(db,'dabista-farm-backup.json');$('#importBtn').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(!Array.isArray(x.horses))throw Error('horses missing');const restored={...x,races:x.races||[],memo:x.memo||''};window.DABISTA_GROWTH_DB?.normalizeInPlace(restored);Object.keys(db).forEach(k=>delete db[k]);Object.assign(db,restored);window.db=db;save();renderH();renderR();$('#breedMemo').value=db.memo;if(window.renderBreed)window.renderBreed();window.DABISTA_GROWTH_UI?.refresh?.();alert('復元しました')}catch(err){errors.push({at:new Date().toISOString(),message:String(err)});alert('読み込みに失敗しました')}};
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}
async function checkUpdate(showResult=false){updateState.lastCheck=new Date().toISOString();updateState.status='checking';try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});if(!r.ok)throw Error('HTTP '+r.status);const m=await r.json();updateState.remote=m;updateState.status='ok';if(newer(m.version,APP_VERSION)||m.build!==APP_BUILD){$('#updateText').textContent=`最新版 v${m.version} / ${m.build} があります`;$('#updatebar').classList.add('show')}else{if(showResult)alert(`最新版です\nv${APP_VERSION} / ${APP_BUILD}`)}}catch(err){updateState.status='failed';updateState.error=String(err);errors.push({at:new Date().toISOString(),message:'update-check: '+String(err)});if(showResult)alert('更新確認に失敗しました。通信状態を確認し、もう一度お試しください。')}}
async function forceUpdate(){try{if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();for(const r of regs)await r.unregister()}if('caches'in window){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}const u=new URL(location.href);u.searchParams.set('update',Date.now());location.replace(u.href)}catch(e){const u=new URL(location.href);u.searchParams.set('update',Date.now());location.replace(u.href)}}
$('#refreshBtn').onclick=()=>checkUpdate(true);$('#applyUpdate').onclick=forceUpdate;setTimeout(()=>checkUpdate(false),1200);
$('#diagBtn').onclick=()=>downloadJSON({diagnostic:true,generatedAt:new Date().toISOString(),app:{version:APP_VERSION,build:APP_BUILD,url:location.href,standalone:matchMedia('(display-mode: standalone)').matches||navigator.standalone===true},update:updateState,stallionMaster:window.stallionMasterStatus||null,device:{userAgent:navigator.userAgent,language:navigator.language,online:navigator.onLine},storage:{key:KEY,horseCount:db.horses?.length||0,raceCount:db.races?.length||0,bytes:new Blob([JSON.stringify(db)]).size},errors,data:db},`dabista-diagnostic-v${APP_VERSION}.json`);
checkUpdate(false);