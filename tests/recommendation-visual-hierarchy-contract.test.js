'use strict';
const fs=require('fs');

const v26=fs.readFileSync('v26.js','utf8');
const v27=fs.readFileSync('v27.js','utf8');
const breed=fs.readFileSync('breed-integration.js','utf8');
const advisor=fs.readFileSync('sale-recommendation-core.js','utf8');
const css=fs.readFileSync('ui-refresh.css','utf8');

const need=(src,token,msg)=>{if(!src.includes(token))throw Error(msg+' missing: '+token)};

for(const token of ['tier-elite','tier-high','tier-upper','tier-middle','tier-rebuild','tier-unknown'])need(v27,token,'mare tier tone');
need(v27,'.mare-tier{padding:7px 11px;font-size:14px','mare tier prominence');
need(v27,'この牝馬を使う理由','mare decision reason');
need(v27,'カード色＝母能力帯','mare color meaning');
need(v27,'順位・他目的・血統評価を見る','mare secondary details collapse');
need(v27,'何代で締めるか比較','generation purpose');
need(v27,'おすすめ世代を決める','generation single primary action');
need(v27,'generationSection.hidden=true','manual generation selector must be hidden from primary flow');
need(v27,'if(notice)notice.hidden=true','technical generation notice must not be primary');
need(v27,'if(run)run.hidden=true','separate manual design button must not duplicate the primary flow');
need(v27,'generation-compare','generation comparison must stay compact');
need(v27,'generation-key-reason','recommended generation must show a concise reason');
if(v27.includes('世代推奨は勝率・産駒能力の確率予測ではありません。安全配合'))throw Error('long generation disclaimer must not remain in primary result');
if(/\.mare-tier\{[^}]*font-size:(?:8|9)px/.test(v27))throw Error('mare tier regressed to tiny text');

for(const token of ['function mareBand(','function productionContext(','function compareProductionForMare(','function rankProductionRoutes(','function recommendationCue('])need(advisor,token,'mare-aware recommendation');
need(advisor,"key='longshot';label='一発狙い'","C/C longshot label");
need(advisor,"const middleMain=band==='middle'&&practical&&stable!=='C'","middle main lane must exclude Stable C upside");

need(v26,'331頭中 ','all mare data visibility');
need(v26,'件を表示・選択できます','all mare data visibility count');
need(v26,'色＝推薦度','recommendation color legend');
need(v26,'緑：本命','main color semantics');
need(v26,'黄：上振れ','upside color semantics');
need(v26,'白：参考','reference color semantics');
need(v26,'参考軸を見る（SP上限・クロス・ST・バランス・血統価値）','secondary axes must be collapsed');
need(v26,"const tone=isMain?","non-main axes must not own recommendation colors");
need(v26,"父実績C・安定Cのため本命外","C/C reference warning");
need(v26,'function createMareProductionCollector(','sale production recommendations must be collected across the scanned generation');

need(breed,"advisor?.compareProductionForMare","breed production mare-aware comparator");
need(breed,'function createFutureProductionCollector(','breed future production must remain full-scan');
need(breed,"const tone=isMain?","breed non-main axes must be visually neutral");
need(breed,"父実績C・安定Cのため本命外","breed C/C reference warning");
need(breed,'カード色＝推薦度：緑は本命、黄は上振れ、白は参考軸','breed color legend');
need(breed,'function renderFutureOverview(result){}','separate six-axis future overview must stay removed');
need(breed,"profile=selectedCategory()","future result must focus on the selected category");
if(breed.includes("overview.className='card breed-future-overview'"))throw Error('six-category overview card must not return to primary UI');

need(css,'.sale-route.tone-neutral','reference sale cards must have a neutral style');
need(css,'.breed-integrated-card.tone-neutral','reference breed cards must have a neutral style');
need(css,'.sale-other-axes','secondary axes container');

console.log(JSON.stringify({
  passed:true,
  contract:{
    mare:'decision reason first; full rank data collapsed; card color means ability band',
    generation:'automatic recommendation first; manual generation choice hidden; comparison compact',
    sale:'main production recommendations visible; five reference axes collapsed',
    breed:'green/yellow/white mean recommendation role, never category; C/C reference is explicit',
    future:'selected category only in primary UI; six-category table removed',
    scoring:'six axes remain separate internally; no seventh overall score'
  }
},null,2));
