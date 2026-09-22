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
need(v27,'今の育成方針','mare primary action cue');
need(v27,'他の目的・補強方針・直仔データを見る','mare secondary-details collapse');
need(v27,'<span class="mare-tier">\${esc(a.tier)}</span>','mare textual tier label');
if(/\.mare-tier\{[^}]*font-size:(?:8|9)px/.test(v27))throw Error('mare tier regressed to tiny text');

for(const token of ['function mareBand(','function productionContext(','function compareProductionForMare(','function rankProductionRoutes(','function recommendationCue('])need(advisor,token,'mare-aware recommendation');
need(advisor,"key='longshot';label='一発狙い'","C/C longshot label");
need(advisor,"if(band==='middle')return stable==='B'?3:stable==='A'?2:stable==='C'?1:0","middle stability context");
need(advisor,"const middleMain=band==='middle'&&practical&&stable!=='C'","middle main lane must exclude Stable C upside");
need(advisor,"if(band==='rebuild')return stable==='C'?3:stable==='B'?2:stable==='A'?1:0","rebuild stable-C context");

for(const token of ['rankProductionRoutes','recommendationCue','本命候補','この軸 ','sale-cue-headline','sale-reason-chip','詳しい根拠・世代別データを見る'])need(v26,token,'sale recommendation hierarchy');
need(v26,'「強馬生産型」が本命軸です','main-axis explanation');
need(v26,'上振れ枠 ','risk candidate must not be mislabeled as main recommendation');
need(v26,'総合点には合算しません','six-axis separation');
need(v26,'function createMareProductionCollector(','sale production recommendations must be collected across the scanned generation');
need(v26,'renderResults({base:finalBase,portfolio,productionRoutes,','sale render must receive full-scan mare-aware production routes');
if(/productionSource=result\.base\.shortlists\?\.production\|\|result\.base\.profiles/.test(v26))throw Error('sale production recommendation regressed to old shortlist-only source');

need(breed,"advisor?.compareProductionForMare","breed production mare-aware comparator");
need(breed,'function createFutureProductionCollector(','breed future production must collect mare-aware routes across each scanned generation');
need(breed,"profile==='production'?production2","breed future status must use full-scan mare-aware production route");
need(breed,"advisor?.recommendationCue","breed concise reason cue");
need(breed,'本命軸 ','breed main-axis label');
need(breed,'上振れ枠 ','breed risk candidates must be visibly separated from main lane');
need(breed,'この軸 ','breed non-main axis label');
need(breed,'現在Pairの詳しい根拠を見る','breed details collapse');

for(const token of ['tone-solid','tone-balance','tone-ceiling','tone-upside','tone-longshot'])need(css,token,'route color tone');
need(css,'.breed-cue-headline{font-size:13px!important}','breed reason prominence');
need(css,'.sale-cue-headline{font-size:13px!important}','sale reason prominence');

console.log(JSON.stringify({
  passed:true,
  contract:{
    mare:'whole-card tier tone + large textual tier + primary strategy; details collapsed',
    sale:'main production axis collects mare-aware routes across the full scanned generation; each card shows role/reason before details',
    breed:'same mare-aware full-scan production comparison and reason cues',
    accessibility:'color is redundant; tier/risk/axis labels remain textual',
    scoring:'six axes stay separate; no seventh overall score'
  }
},null,2));
