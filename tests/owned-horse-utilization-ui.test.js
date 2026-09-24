'use strict';
const fs=require('fs');
const ui=fs.readFileSync('v28.js','utf8');
const breed=fs.readFileSync('breed-integration.js','utf8');
const idx=fs.readFileSync('index.html','utf8');

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
need(breed,'async ensureReady(){await boot();ensurePlannerFresh();return{planner,advisor,engine}}','breed planner readiness API');
need(idx,'v28.js?v=1.19.1-b58','v28 cache wiring');
if(!(idx.indexOf('breed-integration.js?v=1.19.1-b58')<idx.indexOf('v28.js?v=1.19.1-b58')))throw Error('v28 must load after breed integration');
if(!(idx.indexOf('v27.js?v=1.19.1-b58')<idx.indexOf('v28.js?v=1.19.1-b58')))throw Error('v28 must load after v27');
if(/evidenceScore\s*=|overallScore\s*=|weightedScore\s*=/.test(ui))throw Error('reverse lookup must not add a weighted umbrella score');

console.log(JSON.stringify({
  passed:true,
  flow:{mare:'open existing breed planner',sire:'reverse lookup sale+owned mares'},
  goals:['arc','bc','rebuild'],
  unknownAbility:'separate provisional bloodline section',
  scoring:'explicit gates; no seventh overall score'
},null,2));
