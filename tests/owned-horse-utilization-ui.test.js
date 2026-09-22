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
need(ui,'厳格条件一致（母能力既知）','confirmed mare section');
need(ui,'血統候補（能力確認待ち・父実績条件外を含む）','provisional mare section');
need(ui,'能力未判明馬や父実績未登録を厳格一致と同じ扱いにせず','uncertain/confirmed separation');
need(ui,'繁殖能力値には換算しません','real-race evidence boundary');
need(ui,'第7の総合点は作りません','no seventh overall score');
need(breed,'async ensureReady(){await boot();ensurePlannerFresh();return{planner,advisor,engine}}','breed planner readiness API');
need(idx,'v28.js?v=1.19.1-b50','v28 cache wiring');
if(!(idx.indexOf('breed-integration.js?v=1.19.1-b50')<idx.indexOf('v28.js?v=1.19.1-b50')))throw Error('v28 must load after breed integration');
if(!(idx.indexOf('v27.js?v=1.19.1-b50')<idx.indexOf('v28.js?v=1.19.1-b50')))throw Error('v28 must load after v27');
if(/evidenceScore\s*=|overallScore\s*=|weightedScore\s*=/.test(ui))throw Error('reverse lookup must not add a weighted umbrella score');

console.log(JSON.stringify({
  passed:true,
  flow:{mare:'open existing breed planner',sire:'reverse lookup sale+owned mares'},
  goals:['arc','bc','rebuild'],
  unknownAbility:'separate provisional bloodline section',
  scoring:'explicit gates; no seventh overall score'
},null,2));
