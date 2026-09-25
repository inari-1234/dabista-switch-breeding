'use strict';
const fs=require('fs');
const ui=fs.readFileSync('v28.js','utf8');
const breed=fs.readFileSync('breed-integration.js','utf8');
const route=fs.readFileSync('v26.js','utf8');
const horses=fs.readFileSync('v16.js','utf8');
const idx=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const refresh=fs.readFileSync('ui-refresh.js','utf8');

const need=(src,token,msg)=>{if(!src.includes(token))throw Error(msg+' missing: '+token)};
need(ui,'data-use-horse','horse-card utilization action');
need(ui,'この牝馬を配合に活かす','mare utilization action');
need(ui,'相性牝馬を探す','sire reverse lookup action');
need(ui,'planner.evaluateDirectPair(m.record,h.name)','fixed-sire reverse pair evaluation');
need(ui,"if(goal==='arc')",'Arc reverse gate');
need(ui,'bloodline=qualified&&f.distanceEvidence>0','Arc bloodline gate');
need(ui,'supported:bloodline&&f.recordBPlus','Arc record-supported gate');
need(ui,"if(goal==='bc')",'BC reverse gate');
need(ui,"qualified&&f.recordBPlus",'BC record support gate');
need(ui,"const qualified=f.sp>=15&&f.st>=5",'rebuild reverse gate');
need(ui,'function nextStepFor(row,goal)','reverse next-generation helper');
need(ui,'activePlanner.iterateTwoFromDirect(row.route)','fixed first-sire second-generation scan');
need(ui,'activeAdvisor.materialUpgradeReasons(row.route,r,goal,row.assessment)','goal-specific next-generation gate');
need(ui,'次代候補：','next-generation candidate label');
need(ui,'次代延長根拠：','no-upgrade next-generation label');
need(ui,'function rowHtml(row,goal,includeNext=false)','lazy/capped next-generation row rendering');
need(ui,'rowHtml(r,goal,i<4)','confirmed reverse rows cap next-generation scans');
need(ui,'rowHtml(r,goal,i<3)','provisional reverse rows cap next-generation scans');
need(ui,'厳格条件一致（母能力既知）','confirmed mare section');
need(ui,'血統候補（能力確認待ち・父実績条件外を含む）','provisional mare section');
need(ui,'能力未判明馬や父実績未登録を厳格一致と同じ扱いにせず','uncertain/confirmed separation');
need(ui,'繁殖能力値には換算しません','real-race evidence boundary');
need(ui,'第7の総合点は作りません','no seventh overall score');
need(ui,'overflow:auto;overscroll-behavior:contain','reverse dialog explicit scrolling');
need(ui,'max-height:92dvh','mobile reverse dialog viewport bound');
need(ui,'@media(max-width:520px)','mobile reverse density rules');
need(route,'function routeEvidenceGroups(st)','route registration evidence grouping');
need(route,"routeEvidenceRow('加算'","route result additions group");
need(route,"routeEvidenceRow('減算'","route result subtractions group");
need(route,"routeEvidenceRow('注意'","route result cautions group");
need(route,'配合由来の特徴 <span>（この産駒に期待できる血統要素）</span>','route register evidence section');
need(route,'この産駒の現在地','route register current-state section');
need(route,'将来の使い道','route register future-use section');
need(route,'route-register-field','route register wrapped field layout');
need(route,'function registeredRouteHtml(rows)','registered route visual summary');
need(route,'route-stage-registered','registered route highlighted block');
need(route,'refreshSelectedRoute','registered route refresh after horse mutation');
need(app,'function horseRoleKey(h)','horse role filter key');
need(app,"const role=$('#horseRoleFilter')?.value||'all'","horse role filter");
need(app,"sort=$('#horseSort')?.value||'newest'","horse list sort");
need(app,".filter(([,v])=>v&&v!=='-')","empty horse stats omitted");
need(refresh,'horseListControls','horse list management controls');
need(refresh,'horseRoleFilter','horse role filter control');
need(refresh,'horseSort','horse sort control');
need(horses,'function deleteEditingHorse()','horse delete action');
need(horses,"db.races=(db.races||[]).filter","horse delete cascades race records");
need(horses,"db.growthChecks=(db.growthChecks||[]).filter","horse delete cascades growth observations");
need(horses,'route-source-details','registered route evidence collapses in large lists');
if(horses.includes('db.growthCheckSets=(db.growthCheckSets||[]).filter'))throw Error('horse delete must not delete shared growth comparison sets');
need(route,'grid-template-rows:auto minmax(0,1fr) auto','route dialog non-overlap frame');
if(route.includes('bottom:-68px')||route.includes('margin:18px -16px -68px'))throw Error('route register must not use overlapping negative sticky footer offsets');
need(route,'sireStats:{','route registration persists factual sire context');
need(route,"kind:'pair-pedigree-evidence-not-horse-ability'",'route evidence boundary');
need(horses,'function storedRouteEvidenceHtml(ev)','registered horse reuses saved pairing evidence');
need(horses,'配合由来の特徴','registered horse pairing evidence heading');
need(horses,'※配合時の血統根拠です。この馬自身の能力値ではありません。','registered horse ability boundary');
need(breed,'async ensureReady(){await boot();ensurePlannerFresh();return{planner,advisor,engine}}','breed planner readiness API');
need(idx,'v28.js?v=1.19.1-b61','v28 cache wiring');
if(!(idx.indexOf('breed-integration.js?v=1.19.1-b61')<idx.indexOf('v28.js?v=1.19.1-b61')))throw Error('v28 must load after breed integration');
if(!(idx.indexOf('v27.js?v=1.19.1-b61')<idx.indexOf('v28.js?v=1.19.1-b61')))throw Error('v28 must load after v27');
if(/evidenceScore\s*=|overallScore\s*=|weightedScore\s*=/.test(ui))throw Error('reverse lookup must not add a weighted umbrella score');

console.log(JSON.stringify({
  passed:true,
  flow:{mare:'open existing breed planner',sire:'reverse lookup sale+owned mares'},
  goals:['arc','bc','rebuild'],
  unknownAbility:'separate provisional bloodline section',
  scoring:'explicit gates; no seventh overall score'
},null,2));
