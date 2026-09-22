(()=>{
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.23-50';
const db=window.db,$=s=>document.querySelector(s),norm=s=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase();
if(!db)return;window.APP_VERSION=V;window.APP_BUILD=BUILD;const ver=$('#ver');if(ver)ver.textContent=`v${V} / Build ${BUILD}`;
const depth=i=>i<1?1:i<3?2:i<7?3:4;
const master=n=>window.DABISTA_THEORY_MASTER?.stallions?.find(x=>norm(x.name)===norm(n))||window.DABISTA_THEORY_MASTER?.broodmares?.find(x=>norm(x.name)===norm(n))||null;
function horse(n){return db.horses.find(x=>norm(x.name)===norm(n))||null}
const breedHorseById=id=>window.getBreedHorseById?.(id)||db.horses.find(x=>x.id===id)||null
function ancOf(x,seen=new Set()){
 if(!x)return null;if(Array.isArray(x.ancestor15)&&x.ancestor15.length===15)return x.ancestor15;
 const m=master(x.masterRef?.name||x.name);if(m?.ancestor?.length===15)return m.ancestor;
 const key=norm(x.name);if(seen.has(key))return null;seen.add(key);
 const sireName=x.sire||'',damName=x.dam||'';if(!sireName||!damName)return null;
 const sm=master(sireName),dm=master(damName),sh=horse(sireName),dh=horse(damName),sa=sm?.ancestor||ancOf(sh,new Set(seen)),da=dm?.ancestor||ancOf(dh,new Set(seen));
 if(!sa?.length||!da?.length)return null;
 return [sireName,sa[0],da[0],sa[1],sa[2],da[1],da[2],sa[3],sa[4],sa[5],sa[6],da[3],da[4],da[5],da[6]];
}
function deriveAll(){let changed=false;for(let pass=0;pass<8;pass++){let hit=false;db.horses.forEach(h=>{const a=ancOf(h);if(a?.length===15&&JSON.stringify(h.ancestor15)!==JSON.stringify(a)){h.ancestor15=a;h.theorySource=h.masterRef?.type==='default-broodmare'?'master':'derived';hit=changed=true}});if(!hit)break}if(changed){try{localStorage.setItem('dabistaFarmV1',JSON.stringify(db))}catch{}}return changed}
function crossInfo(mare,sire){const ma=ancOf(mare),sa=sire?.ancestor;if(!ma?.length||!sa?.length)return[];const out=[];for(let i=0;i<sa.length;i++)for(let j=0;j<ma.length;j++)if(sa[i]&&ma[j]&&norm(sa[i])===norm(ma[j]))out.push({name:sa[i],sireGen:depth(i)+1,mareGen:depth(j)+1});const seen=new Set();return out.filter(x=>{const k=norm(x.name)+'|'+x.sireGen+'|'+x.mareGen;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(a.sireGen+a.mareGen)-(b.sireGen+b.mareGen));}
function addCrosses(){deriveAll();if(window.DABISTA_BREED_PAIR_INDEX)return;const mare=breedHorseById($('#breedMare')?.value);document.querySelectorAll('#breedCandidates>.card').forEach(card=>{card.querySelectorAll('.v19-cross').forEach(x=>x.remove());if(!mare)return;const b=card.querySelector('b');if(!b&&!card.dataset.sireName)return;const name=card.dataset.sireName||b.textContent.replace(/^\s*\d+\.\s*/,'').trim(),s=master(name);const xs=crossInfo(mare,s);if(!xs.length)return;const d=document.createElement('div');d.className='v19-cross';d.style.cssText='font-size:11px;line-height:1.5;margin-top:6px;padding:6px 8px;border-radius:8px;background:#f5f1e8;color:#665b43';d.innerHTML=`<b>クロス候補</b>：${xs.slice(0,6).map(x=>`${x.name} ${x.sireGen}×${x.mareGen}`).join(' / ')}${xs.length>6?` ほか${xs.length-6}件`:''}<br><span>共通祖先の機械検出。効果・危険判定は次段階で精査します。</span>`;card.appendChild(d)});}
function status(){const h=breedHorseById($('#breedMare')?.value);if(!h||h.masterRef?.type==='default-broodmare')return;const a=ancOf(h),el=$('#theoryStatus');if(el&&a?.length===15)el.innerHTML=`<b>${h.name}</b>：親血統から15祖先を再帰生成済み。現在はクロス候補を表示します。面白・見事の自家製馬判定は系統コードを確定できた祖先から順次有効化します。`;}
let busy=false;function refresh(){if(busy)return;busy=true;try{addCrosses();status()}finally{busy=false}}
const mareEl=$('#breedMare'),searchEl=$('#stallionSearch');
const onMare=()=>setTimeout(refresh,40),onSearch=()=>setTimeout(refresh,40);
mareEl?.addEventListener('change',onMare);searchEl?.addEventListener('input',onSearch);
const t=$('#breedCandidates'),observer=t?new MutationObserver(()=>queueMicrotask(refresh)):null;observer?.observe(t,{childList:true});
const cleanups=window.DABISTA_BREED_LEGACY_CLEANUPS||(window.DABISTA_BREED_LEGACY_CLEANUPS=[]);
cleanups.push(()=>{mareEl?.removeEventListener('change',onMare);searchEl?.removeEventListener('input',onSearch);observer?.disconnect()});
setTimeout(refresh,1200);setTimeout(refresh,2400);
})();