(()=>{
const V='1.15.0',BUILD='2026.09.18-33',db=window.db,$=s=>document.querySelector(s);
if(!db)return;
window.APP_VERSION=V;window.APP_BUILD=BUILD;
const ver=$('#ver');if(ver)ver.textContent=`v${V} / Build ${BUILD}`;
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase();
const esc=window.esc||((s)=>String(s??''));
let effects=null,theory=null,stallions=[],research=null;
const effectMap=new Map();
function master(name){
 const n=norm(name);
 return theory?.stallions?.find(x=>norm(x.name)===n)||theory?.broodmares?.find(x=>norm(x.name)===n)||null
}
function horseAnc(h){
 if(!h)return null;
 if(Array.isArray(h.ancestor15)&&h.ancestor15.length===15)return h.ancestor15;
 const m=master(h.masterRef?.name||h.name);
 return m?.ancestor?.length===15?m.ancestor:null
}
function calcAncestors(a,b){
 if(!Array.isArray(a)||a.length!==15||!Array.isArray(b)||b.length!==15)return null;
 const seen=new Set(),factors=[];let sp=0,st=0,pw=0;
 for(const name of [...a,...b]){
   const k=norm(name);if(!k||seen.has(k))continue;seen.add(k);
   const e=effectMap.get(k);if(!e)continue;
   const dsp=(e.short||0)*2+(e.speed||0),dst=(e.guts||0)+(e.long||0)-(e.short||0),dp=e.power||0;
   sp+=dsp;st+=dst;pw+=dp;
   factors.push({name,dsp,dst,dp,short:e.short||0,speed:e.speed||0,power:e.power||0,guts:e.guts||0,long:e.long||0})
 }
 return{sp,st,pw,factorCount:factors.length,factors}
}
function deriveChild(sireName,sa,ma){
 if(!sireName||!Array.isArray(sa)||sa.length!==15||!Array.isArray(ma)||ma.length!==15)return null;
 return [sireName,sa[0],ma[0],sa[1],sa[2],ma[1],ma[2],sa[3],sa[4],sa[5],sa[6],ma[3],ma[4],ma[5],ma[6]]
}
function resolveSire(value){
 if(!value)return null;
 if(value.startsWith('db:')){
   const h=db.horses.find(x=>x.id===value.slice(3)),a=horseAnc(h);if(!h||!a)return null;
   return{name:h.name,ancestor:a,stats:{record:h.record||'-',guts:h.guts||'-',stable:h.stable||'-',minD:h.minD||'',maxD:h.maxD||'',source:'牧場DB'}}
 }
 const name=value.startsWith('m:')?value.slice(2):value,m=master(name),s=stallions.find(x=>norm(x.name)===norm(name));
 if(!m?.ancestor?.length)return null;
 return{name:m.name,ancestor:m.ancestor,stats:s?{record:s.record,guts:s.guts,stable:s.stable,minD:s.minD,maxD:s.maxD,source:'Switch版マスタ'}:{record:'-',guts:'-',stable:'-',minD:'',maxD:'',source:'血統マスタ'}}
}
function allSires(){
 const a=stallions.filter(s=>master(s.name)?.ancestor?.length===15).map(s=>({value:'m:'+s.name,name:s.name}));
 for(const h of db.horses.filter(h=>(h.role==='stallion'||h.role==='sire-candidate')&&horseAnc(h)))a.push({value:'db:'+h.id,name:h.name+'（自家製）'});
 return a
}
function sireOptions(selected='',blank=true){
 return (blank?'<option value="">種牡馬を選択</option>':'')+allSires().map(x=>`<option value="${esc(x.value)}" ${x.value===selected?'selected':''}>${esc(x.name)}</option>`).join('')
}
function sourceMares(){
 const names=new Set(research?.starters||[]),out=[];
 for(const n of names){const m=master(n);if(m?.ancestor?.length===15)out.push({value:'m:'+n,name:n,ancestor:m.ancestor})}
 for(const h of db.horses.filter(h=>h.role==='broodmare')){const a=horseAnc(h);if(a)out.push({value:'db:'+h.id,name:h.name+'（牧場）',ancestor:a})}
 return out
}
function resolveMare(value){
 if(value?.startsWith('db:')){const h=db.horses.find(x=>x.id===value.slice(3));const a=horseAnc(h);return h&&a?{name:h.name,ancestor:a}:null}
 const name=value?.startsWith('m:')?value.slice(2):value,m=master(name);return m?.ancestor?.length===15?{name:m.name,ancestor:m.ancestor}:null
}
function routeDefault(start,goal){
 return research?.routes?.find(r=>norm(r.startMare)===norm(start)&&r.goal===goal)?.firstSire||research?.routes?.find(r=>norm(r.startMare)===norm(start))?.firstSire||''
}
function addStyles(){
 if($('#v25style'))return;const s=document.createElement('style');s.id='v25style';s.textContent=`
 .nitro-exact{margin-top:7px;padding:7px 9px;border-radius:9px;background:#edf3ee;font-size:11px;line-height:1.5;color:#405048}
 .nitro-exact b{color:#173f2e}.nitro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}
 .nitro-grid>div{background:#fff;border-radius:8px;padding:7px;text-align:center}.nitro-grid b{display:block;font-size:17px}.nitro-grid small{font-size:10px;color:#66736c}
 .nitro-stage{padding:10px;border:1px solid #dce2dd;border-radius:11px;margin-top:8px;background:#fafbf9}.nitro-stage label{display:block;font-size:12px;color:#66736c;margin-bottom:4px}.nitro-stage select{width:100%}
 .nitro-stage .unknown{font-size:10px;color:#6b5200;background:#fff3cd;padding:5px 7px;border-radius:7px;margin-top:6px}
 .v25-hidden{display:none!important}
 `;document.head.appendChild(s)
}
function installFilter(){
 const tools=$('.theory-tools');if(!tools||$('#v25NitroFilter'))return;
 const d=document.createElement('div');d.style.marginTop='8px';d.innerHTML='<label>最終締めニトロ・フィルター</label><select id="v25NitroFilter"><option value="all">指定なし</option><option value="sp15">SP 15以上</option><option value="sp18">SP 18以上</option><option value="st5">ST 5以上</option><option value="bal">SP 15以上 ＋ ST 5以上</option></select><div style="font-size:10px;color:#66736c;margin-top:4px">両親の15祖先を統合し、同じ祖先は1頭として計算します。</div>';
 tools.appendChild(d);$('#v25NitroFilter').onchange=()=>decorateBreed()
}
function candidateName(c){return c.querySelector('b')?.textContent.replace(/^\s*\d+\.\s*/,'').trim()||''}
function decorateBreed(){
 if(!effectMap.size||!theory)return;installFilter();
 const h=db.horses.find(x=>x.id===$('#breedMare')?.value),ma=horseAnc(h),filter=$('#v25NitroFilter')?.value||'all';
 document.querySelectorAll('#breedCandidates>.card').forEach(c=>{
   c.querySelector('.nitro-exact')?.remove();c.classList.remove('v25-hidden');
   if(!ma)return;
   const sm=master(candidateName(c));if(!sm?.ancestor?.length)return;
   const n=calcAncestors(sm.ancestor,ma);if(!n)return;
   const box=document.createElement('div');box.className='nitro-exact';
   box.innerHTML=`<b>七光り（重複除外）</b>　SP <b>${n.sp}</b> / ST <b>${n.st}</b> / PW <b>${n.pw}</b><br><span>有効因子祖先 ${n.factorCount}種類。途中世代の親ニトロ単純加算ではなく、この配合の15祖先から再計算。</span>`;
   c.appendChild(box);
   const ok=filter==='all'||(filter==='sp15'&&n.sp>=15)||(filter==='sp18'&&n.sp>=18)||(filter==='st5'&&n.st>=5)||(filter==='bal'&&n.sp>=15&&n.st>=5);
   if(!ok)c.classList.add('v25-hidden')
 })
}
function stageHtml(num,sire,calc){
 if(!sire)return`<div id="nitroResult${num}" class="notice">種牡馬を選択すると、${num}代目配合のニトロを計算します。</div>`;
 const d=sire.stats||{},range=d.minD&&d.maxD?`${d.minD}–${d.maxD}m`:'距離未登録';
 return`<div id="nitroResult${num}" class="nitro-exact"><b>${num}代目：${esc(sire.name)}</b><div class="nitro-grid"><div><b>${calc.sp}</b><small>SPニトロ</small></div><div><b>${calc.st}</b><small>STニトロ</small></div><div><b>${calc.pw}</b><small>PWニトロ</small></div></div><div style="margin-top:6px">${range} / 実績${esc(d.record)}・底力${esc(d.guts)}・安定${esc(d.stable)} / 有効因子${calc.factorCount}種類</div><div class="unknown">この数値は血統上の上限側指標です。自家製牝馬自身の繁殖SP/ST/PWは、実際に生産・選抜した個体で別評価してください。</div></div>`
}
function installSimulator(){
 const sec=$('#rebuild');if(!sec||$('#nitroSimulator'))return;
 const card=document.createElement('div');card.className='card';card.id='nitroSimulator';
 card.innerHTML=`<h3 class="section-title">2～3世代 最終ニトロ計算</h3><p class="muted">Switch版配合ツールと同じ方式で、各世代の15祖先からSP/ST/PWニトロを再計算します。途中世代のニトロを足し算しません。</p><div class="field"><label>起点繁殖牝馬</label><select id="nitroStart"></select></div><div class="nitro-stage"><label>1代目 種牡馬</label><select id="nitroSire1"></select><div id="nitroResult1"></div></div><div class="nitro-stage"><label>2代目 種牡馬</label><select id="nitroSire2"></select><div id="nitroResult2"></div></div><div class="nitro-stage"><label>3代目／締め 種牡馬</label><select id="nitroSire3"></select><div id="nitroResult3"></div></div><div class="notice"><b>判定基準：</b>最終世代のニトロ＋母自身の繁殖能力＋父の実績/底力/安定/距離＋配合理論を合わせて判断します。</div>`;
 const intro=sec.querySelector('.card');intro?.insertAdjacentElement('afterend',card);
 const starts=sourceMares(),start=$('#nitroStart');
 start.innerHTML=starts.map(x=>`<option value="${esc(x.value)}">${esc(x.name)}</option>`).join('');
 const current=$('#rebuildStarter')?.value||db.rebuildStudy?.starter||'';const mv='m:'+current;if(starts.some(x=>x.value===mv))start.value=mv;
 const goal=$('#rebuildGoal')?.value||'arc',def=routeDefault(resolveMare(start.value)?.name||current,goal);
 $('#nitroSire1').innerHTML=sireOptions(def?'m:'+def:'',true);if(def)$('#nitroSire1').value='m:'+def;
 $('#nitroSire2').innerHTML=sireOptions('',true);$('#nitroSire3').innerHTML=sireOptions('',true);
 [start,$('#nitroSire1'),$('#nitroSire2'),$('#nitroSire3')].forEach(x=>x.onchange=renderSimulator);
 $('#rebuildGoal')?.addEventListener('change',()=>setTimeout(syncSimulator,20));
 $('#rebuildStarter')?.addEventListener('change',()=>setTimeout(syncSimulator,20));
 renderSimulator()
}
function syncSimulator(){
 const start=$('#nitroStart');if(!start)return;const n=$('#rebuildStarter')?.value,mv='m:'+n;
 if([...start.options].some(o=>o.value===mv))start.value=mv;
 const def=routeDefault(n,$('#rebuildGoal')?.value||'arc');if(def){$('#nitroSire1').value='m:'+def}
 $('#nitroSire2').value='';$('#nitroSire3').value='';renderSimulator()
}
function renderSimulator(){
 const m=resolveMare($('#nitroStart')?.value);if(!m)return;
 let ma=m.ancestor;
 for(let i=1;i<=3;i++){
   const sel=$('#nitroSire'+i),s=resolveSire(sel?.value),holder=$('#nitroResult'+i);
   if(!holder)continue;
   if(!s){holder.outerHTML=stageHtml(i,null,null);break}
   const n=calcAncestors(s.ancestor,ma);holder.outerHTML=stageHtml(i,s,n);
   ma=deriveChild(s.name,s.ancestor,ma);if(!ma)break
 }
}
function expose(){
 window.DABISTA_NITRO_ENGINE={
   version:1,
   calcAncestors,
   deriveChildAncestor:deriveChild,
   calcPairByName:(sireName,mareName)=>{const s=master(sireName),m=master(mareName);return s&&m?calcAncestors(s.ancestor,m.ancestor):null},
   calcPairForHorse:(sireName,horseId)=>{const s=master(sireName),h=db.horses.find(x=>x.id===horseId),a=horseAnc(h);return s&&a?calcAncestors(s.ancestor,a):null}
 }
}
async function json(path){const u=new URL(path,location.href);u.searchParams.set('_',BUILD);const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()}
async function load(){
 addStyles();
 try{
   const [e,t,s,r]=await Promise.all([json('data/nitro-effects.json'),json('data/theory-master.json'),json('data/stallions.json'),json('data/rebuild-research.json')]);
   effects=e;theory=t;stallions=s.stallions||[];research=r;(effects.effects||[]).forEach(x=>effectMap.set(norm(x.name),x));expose();
   installFilter();decorateBreed();installSimulator();
   $('#breedMare')?.addEventListener('change',()=>setTimeout(decorateBreed,160));$('#stallionSearch')?.addEventListener('input',()=>setTimeout(decorateBreed,160));$('#breedGoal')?.addEventListener('change',()=>setTimeout(decorateBreed,160));
   const target=$('#breedCandidates');if(target)new MutationObserver(()=>setTimeout(decorateBreed,0)).observe(target,{childList:true});
 }catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'nitro-engine: '+String(e)});const st=$('#rebuildStatus');if(st)st.textContent='ニトロ計算マスタの読み込みに失敗しました。更新確認を試してください。'}
}
function newer(a,b){const A=String(a).split('.').map(Number),B=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((A[i]||0)!==(B[i]||0))return(A[i]||0)>(B[i]||0)}return false}
async function checkUpdate(show=false){try{const u=new URL('version.json',location.href);u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store'}),v=await r.json();if(newer(v.version,V)||v.build!==BUILD){$('#updateText').textContent=`最新版 v${v.version} / ${v.build} があります`;$('#updatebar').classList.add('show')}else{$('#updatebar').classList.remove('show');if(show)alert(`最新版です\nv${V} / ${BUILD}`)}}catch{if(show)alert('更新確認に失敗しました。')}}
setTimeout(load,1500);
setTimeout(()=>{if($('#refreshBtn'))$('#refreshBtn').onclick=()=>checkUpdate(true);checkUpdate(false)},4700);
})();