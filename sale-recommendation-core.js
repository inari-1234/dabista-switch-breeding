(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DABISTA_SALE_RECOMMENDATION_CORE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const val=(x,d=0)=>Number.isFinite(+x)?+x:d;
  const grade=v=>v==='A'?3:v==='B'?2:v==='C'?1:0;
  const bool=v=>v?1:0;
  const known=s=>!!s&&!((val(s.sp)===0)&&(val(s.st)===0)&&(val(s.pw)===0));
  const pct=(rank,total)=>total?Math.max(1,Math.min(100,Math.ceil(rank/total*100))):null;

  function create(config={}){
    const planner=config.planner;
    const broodmareStats=config.broodmareStats||[];
    if(!planner)throw Error('recommendation core requires planner');

    const knownMares=broodmareStats.filter(known);
    const byName=new Map(broodmareStats.map(x=>[String(x.name||''),x]));
    const values={
      sp:[...knownMares].map(x=>val(x.sp)).sort((a,b)=>b-a),
      st:[...knownMares].map(x=>val(x.st)).sort((a,b)=>b-a),
      pw:[...knownMares].map(x=>val(x.pw)).sort((a,b)=>b-a),
      spst:[...knownMares].map(x=>val(x.sp)+val(x.st)).sort((a,b)=>b-a)
    };

    function rankMetric(stats,key){
      if(!known(stats))return null;
      const v=key==='spst'?val(stats.sp)+val(stats.st):val(stats[key]);
      const rank=1+values[key].filter(x=>x>v).length;
      return{value:v,rank,total:knownMares.length,topPercent:pct(rank,knownMares.length)};
    }
    function abilityTier(topPercent){
      if(topPercent==null)return'未判明';
      if(topPercent<=5)return'最上位級';
      if(topPercent<=15)return'上位級';
      if(topPercent<=35)return'中上位';
      if(topPercent<=60)return'中位';
      return'低め';
    }
    function archetype(ranks){
      if(!ranks)return'繁殖能力未判明';
      const sp=ranks.sp.topPercent,st=ranks.st.topPercent,pw=ranks.pw.topPercent,sum=ranks.spst.topPercent;
      if(sum<=10&&st<=20)return'高能力・中長距離母';
      if(sp<=20&&st>45)return'SP寄り母';
      if(st<=20&&sp>35)return'ST寄り母';
      if(pw<=20&&sum<=35)return'パワー兼備型';
      if(sum<=25)return'高能力バランス母';
      if(sum<=50)return'中堅バランス母';
      return'血統・配合で補いたい母';
    }
    function mareAssessment(name){
      const info=planner.mareInfo(name),s=info?.stats||byName.get(name)||null;
      if(!info||!s)return null;
      if(!info.abilityKnown)return{
        name,abilityKnown:false,stats:s,tier:'未判明',archetype:'繁殖能力未判明',
        ranks:null,
        note:'SP/ST/PW=0は未判明値として扱い、能力順位には入れません。血統・ニトロ・配合理論の評価は可能です。'
      };
      const ranks={sp:rankMetric(s,'sp'),st:rankMetric(s,'st'),pw:rankMetric(s,'pw'),spst:rankMetric(s,'spst')};
      return{
        name,abilityKnown:true,stats:s,ranks,
        tier:abilityTier(ranks.spst.topPercent),archetype:archetype(ranks),
        note:'母能力は平均能力・当たり率側の材料として扱い、ニトロとは別軸で表示します。'
      };
    }

    function emptySummary(method=''){
      return{
        method,count:0,sp15st5:0,sp17st5:0,sp18st5:0,
        interesting:0,magnificent:0,perfect:0,elaborate:0,
        maxSp:0,maxSt:0,maxPw:0,maxSpSt:0,
        long2400:0,recordA:0,balanceLongA:0
      };
    }
    function addRoute(summary,route){
      const f=route?.final||{},t=f.theory||{},ss=f.sireStats||{};
      summary.count++;
      const sp=val(f.sp),st=val(f.st),pw=val(f.pw);
      if(sp>=15&&st>=5)summary.sp15st5++;
      if(sp>=17&&st>=5)summary.sp17st5++;
      if(sp>=18&&st>=5)summary.sp18st5++;
      if(t.interesting)summary.interesting++;
      if(t.magnificent)summary.magnificent++;
      if(t.perfect)summary.perfect++;
      if(f.elaborate)summary.elaborate++;
      if(val(ss.maxD)>=2400)summary.long2400++;
      if(grade(ss.record)>=3)summary.recordA++;
      if(sp>=15&&st>=5&&val(ss.maxD)>=2400&&grade(ss.record)>=3)summary.balanceLongA++;\n      if(sp>=14&&st>=6&&val(ss.maxD)>=2400&&grade(ss.record)>=3)summary.arcReady++;
      summary.maxSp=Math.max(summary.maxSp,sp);
      summary.maxSt=Math.max(summary.maxSt,st);
      summary.maxPw=Math.max(summary.maxPw,pw);
      summary.maxSpSt=Math.max(summary.maxSpSt,sp+st);
      return summary;
    }
    function summarize(routes,method=''){
      const s=emptySummary(method);
      for(const r of routes||[])addRoute(s,r);
      return s;
    }

    function routeForGoal(result,goal){
      if(!result)return null;
      if(goal==='bc')return result.profiles?.sp?.[0]||result.profiles?.balance?.[0]||null;
      if(goal==='arc')return result.profiles?.balance?.[0]||result.profiles?.st?.[0]||result.profiles?.sp?.[0]||null;
      if(goal==='rebuild')return result.profiles?.balance?.[0]||result.profiles?.st?.[0]||null;
      return result.profiles?.sp?.[0]||result.profiles?.balance?.[0]||null;
    }
    function routeFacts(route){
      const f=route?.final||{},ss=f.sireStats||{},t=f.theory||{};
      return{
        sp:val(f.sp),st:val(f.st),pw:val(f.pw),spst:val(f.sp)+val(f.st),
        long2400:val(ss.maxD)>=2400,recordA:grade(ss.record)>=3,gutsA:grade(ss.guts)>=3,
        interesting:bool(t.interesting),magnificent:bool(t.magnificent),perfect:bool(t.perfect),elaborate:bool(f.elaborate)
      };
    }
    function materialUpgrade(prev,next,goal){
      if(!prev||!next)return!!next;
      const a=routeFacts(prev),b=routeFacts(next);
      if(goal==='bc'){
        if(a.sp<17&&b.sp>=17&&b.st>=5)return true;
        if(b.sp>=a.sp+2&&b.st>=Math.max(3,a.st-1))return true;
        if(!a.perfect&&b.perfect&&b.sp>=a.sp-1)return true;
        return false;
      }
      if(goal==='arc'){
        const ta=a.sp>=15&&a.st>=5&&a.long2400, tb=b.sp>=15&&b.st>=5&&b.long2400;
        if(!ta&&tb)return true;
        if(b.spst>=a.spst+3&&b.st>=a.st-1)return true;
        if(!a.perfect&&b.perfect&&b.spst>=a.spst-1)return true;
        return false;
      }
      if(goal==='rebuild'){
        const ta=a.sp>=15&&a.st>=5, tb=b.sp>=15&&b.st>=5;
        if(!ta&&tb)return true;
        if(b.spst>=a.spst+3)return true;
        if((!a.magnificent&&!a.perfect)&&(b.magnificent||b.perfect)&&b.spst>=a.spst-1)return true;
        return false;
      }
      return b.sp>=a.sp+2||b.spst>=a.spst+3||(!a.perfect&&b.perfect);
    }

    function portfolioFacts(p){
      const a=p?.spst120||{},b=p?.spst130||{};
      return{
        sp15:val(a.sp15st5),sp17:val(a.sp17st5),safe:val(a.safe),
        sp15hi:val(b.sp15st5),sp17hi:val(b.sp17st5),
        maxSp:val(a.maxSp),maxSpSt:val(a.maxSpSt),
        perfect:val(a.perfect),magnificent:val(a.magnificent),elaborate:val(a.elaborate)
      };
    }
    function portfolioUpgrade(prev,next){
      if(!prev||!next)return!!next;
      const a=portfolioFacts(prev),b=portfolioFacts(next);
      if(b.sp17>=a.sp17+2)return true;
      if(b.sp15>=a.sp15+4&&b.safe>=a.safe-2)return true;
      if(b.sp17hi>a.sp17hi)return true;
      if(b.maxSp>=a.maxSp+2)return true;
      if(b.maxSpSt>=a.maxSpSt+3)return true;
      return false;
    }

    function directUseLabels(assessment,summary){
      if(!assessment)return{};
      if(!assessment.abilityKnown)return{
        arc:'能力評価保留',bc:'能力評価保留',rebuild:'能力評価保留',stallion:'血統評価可能'
      };
      const p=assessment.ranks,high=p.spst.topPercent<=25,mid=p.spst.topPercent<=50,spHigh=p.sp.topPercent<=25;
      return{
        arc:summary.arcReady>0?(high?'直仔から有力':'配合次第で直仔候補'):(mid?'2代比較推奨':'代重ね・厳選前提'),
        bc:summary.sp17st5>0?(spHigh?'直仔から有力':'配合次第'):'2代以上を比較',
        rebuild:high?'母能力を守る側':mid?'再建の起点候補':'再建素材・厳選前提',
        stallion:'世代診断で血統汎用性を比較'
      };
    }

    function recommendGeneration({goal='arc',assessment,generations,portfolios}={}){
      const g1=generations?.[1],g2=generations?.[2],g3=generations?.[3];
      const r1=routeForGoal(g1?.result,goal),r2=routeForGoal(g2?.result,goal),r3=routeForGoal(g3?.result,goal);
      let recommended=1,reasons=[],conditional=false;
      if(goal==='stallion'){
        const p1=portfolios?.[1]?.routes?.[0]?.portfolio||null;
        const p2=portfolios?.[2]?.routes?.[0]?.portfolio||null;
        const p3=portfolios?.[3]?.routes?.[0]?.portfolio||null;
        if(portfolioUpgrade(p1,p2)){recommended=2;reasons.push('2代で高能力牝馬群への血統汎用性が明確に上積みします。')}
        else reasons.push('直仔段階ですでに将来種牡馬としての血統汎用性が競争力を持ちます。');
        if(portfolioUpgrade(recommended===2?p2:p1,p3)){
          recommended=3;conditional=true;reasons.push('3代目プレビューではさらに上積みが見えますが、全176³探索ではないため条件付き推奨です。');
        }
      }else{
        if(materialUpgrade(r1,r2,goal)){recommended=2;reasons.push('2代目で、直仔より意味のあるニトロ・距離適性・配合理論の上積みが確認できます。')}
        else reasons.push('2代へ進めても直仔に対する上積みが小さく、短い世代で締める価値があります。');
        const base=recommended===2?r2:r1;
        if(materialUpgrade(base,r3,goal)){
          recommended=3;conditional=true;reasons.push('3代目プレビューで追加の上積みがあります。ただし3代目は条件付き探索なので、確定最適とは扱いません。');
        }
      }
      if(recommended>1)reasons.push('中間牝馬のSP/ST/PWは出生前に仮定せず、能力上位牝馬を実際に選抜できた場合だけ次世代へ進みます。');
      if(assessment&&!assessment.abilityKnown)reasons.push('起点牝馬の繁殖能力が未判明なので、母能力を含む総合判断は保留です。');
      return{
        generation:recommended,
        label:recommended===1?'直仔推奨':recommended===2?'2代推奨':'3代推奨候補',
        conditional,
        reasons,
        routes:{1:r1,2:r2,3:r3}
      };
    }

    return{
      version:1,knownAbilityCount:knownMares.length,totalMareCount:broodmareStats.length,
      mareAssessment,rankMetric,abilityTier,emptySummary,addRoute,summarize,
      directUseLabels,routeForGoal,routeFacts,recommendGeneration,portfolioFacts,portfolioUpgrade
    };
  }
  return{version:1,create,known};
});