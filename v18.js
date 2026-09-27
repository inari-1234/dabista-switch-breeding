(()=>{
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.28-73';
const $=s=>document.querySelector(s),db=window.db,lifecycle=window.DABISTA_HORSE_LIFECYCLE;
if(!db||!lifecycle)return;
window.APP_VERSION=V;window.APP_BUILD=BUILD;
const ver=$('#ver');if(ver)ver.textContent=`v${V} / Build ${BUILD}`;

if(!$('#v18PedigreeStyle')){
 const st=document.createElement('style');st.id='v18PedigreeStyle';
 st.textContent='.master-pedigree-note{font-size:11px;color:#52645a;background:#eef4ef;border-radius:8px;padding:7px 9px;margin-top:6px}';
 document.head.appendChild(st);
}

let theory=null,theoryStatus={status:'loading',stallions:0,broodmares:0};
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase();
function mareTheoryByName(name){return theory?.broodmares?.find(x=>norm(x.name)===norm(name))||null}

function installPedigreeGuidance(){
 const box=document.querySelector('.v15box');if(!box||$('#v18PedigreeGuide'))return;
 const n=document.createElement('div');n.id='v18PedigreeGuide';n.className='master-pedigree-note';
 n.textContent='ゲーム内デフォルト繁殖牝馬は、配合理論に必要な15祖先を内蔵マスタから使います。父母・母母など女性祖先名は空欄でも配合理論判定に支障ありません。';
 box.appendChild(n);
}
function fillMasterPedigree(showNote=true){
 if(($('#currentState')?.value||$('#role')?.value)!=='broodmare')return 0;
 const name=$('#name')?.value;
 const h=mareTheoryByName(name)||window.findPedigreeHorse?.(name);if(!h)return 0;
 const pairs=[['sire',h.sire],['sireSire',h.sireSire],['damSire',h.damSire],['sireDamSire',h.sireDamSire],['damDamSire',h.damDamSire]];
 let n=0;
 pairs.forEach(([id,val])=>{const el=$('#'+id);if(el&&val&&!el.value.trim()){el.value=val;el.classList.add('auto-filled');setTimeout(()=>el.classList.remove('auto-filled'),1400);n++}});
 if(showNote&&n){
  let note=$('#masterPedigreeNote');
  if(!note){note=document.createElement('div');note.id='masterPedigreeNote';note.className='master-pedigree-note';document.querySelector('.v15box')?.prepend(note)}
  note.textContent=`ゲーム内マスタから血統 ${n}項目を補完しました（父・父父・母父・父母父・母母父）。`;
 }
 return n;
}
document.addEventListener('click',e=>{if(e.target.closest('[data-master-mare]'))setTimeout(()=>fillMasterPedigree(true),30)});
$('#name')?.addEventListener('blur',()=>setTimeout(()=>fillMasterPedigree(false),0));
const oldAuto=$('#autoFillPedigree');if(oldAuto)oldAuto.addEventListener('click',()=>setTimeout(()=>fillMasterPedigree(true),20));

async function loadTheory(){
 try{
  const e=await window.DABISTA_BREEDING_ENGINE.ready;
  theory=e.theory;
  theoryStatus={status:'ok',stallions:theory.stallions?.length||0,broodmares:theory.broodmares?.length||0,syncedAt:theory.syncedAt||null};
  window.DABISTA_THEORY_MASTER=theory;window.DABISTA_THEORY_STATUS=theoryStatus;
  if(($('#currentState')?.value||$('#role')?.value)==='broodmare'&&$('#name')?.value)fillMasterPedigree(false);
 }catch(e){
  theoryStatus={status:'failed',error:String(e),stallions:0,broodmares:0};
  window.DABISTA_THEORY_STATUS=theoryStatus;
  window.APP_ERRORS?.push({at:new Date().toISOString(),message:'theory-master: '+String(e)});
 }
}
installPedigreeGuidance();loadTheory();
})();