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
      if(sum<=25&&sp<=25&&st<=25)return'高能力バランス母';
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


    function mareStrategy(name){
      const a=mareAssessment(name);
      if(!a)return null;
      if(!a.abilityKnown)return{
        id:'unknown',label:'能力未判明型',priority:'血統・ニトロを先に整える',
        preserve:[],improve:[],note:'母能力を0として扱わず、実馬で能力を確認してから選抜基準を絞ります。'
      };
      const r=a.ranks,s=a.stats,improve=[],preserve=[];
      if(r.sp.topPercent<=30)preserve.push('SP'); else improve.push('SP');
      if(r.st.topPercent<=30)preserve.push('ST'); else improve.push('ST');
      if(r.pw.topPercent<=30)preserve.push('PW'); else improve.push('PW');
      let id='balanced-build',label='バランス改善型',priority='弱点を補いながらSP/STを底上げ';
      if(r.spst.topPercent<=5){
        id='elite-preserve';label='超高能力維持型';priority='母能力を落とさず最終配合の上限を伸ばす';
      }else if(r.spst.topPercent<=25&&r.sp.topPercent<=30&&r.st.topPercent<=30){
        id='high-balanced';label='高能力バランス型';priority='高い基礎能力を維持し、配合理論と最終ニトロを整える';
      }else if(r.sp.topPercent<=30&&r.st.topPercent>45){
        id='sp-st-repair';label='SP先行・ST補強型';priority='SPを維持しながらSTを段階的に補強';
      }else if(r.st.topPercent<=30&&r.sp.topPercent>45){
        id='st-sp-repair';label='ST先行・SP補強型';priority='STを維持しながらSPを段階的に補強';
      }else if(r.spst.topPercent>60){
        id='rebuild';label='能力再建型';priority='一度に完成を狙わず、まず母より明確な改善を作る';
      }
      return{
        id,label,priority,preserve,improve,
        stats:{sp:val(s.sp),st:val(s.st),pw:val(s.pw),spst:val(s.sp)+val(s.st)},
        ranks:r,
        note:id==='elite-preserve'
          ?'高能力母は、序盤から2400m適性を要求するより、能力維持と血統素材づくりを優先します。'
          :'弱点側を補いながら、強みを失わない牝馬だけを次世代へ残します。'
      };
    }

    function selectionAdvice(name,goal,stage,totalStages){
      const strategy=mareStrategy(name);
      if(!strategy||!stage)return null;
      const generation=val(stage.generation,1),remaining=Math.max(0,val(totalStages,1)-generation);
      const n=stage.nitro||{},sp=val(n.sp),st=val(n.st),pw=val(n.pw);
      const theory=stage.theory||{},elaborate=!!stage.elaborate?.effective;
      const theoryNames=[];
      if(theory.perfect)theoryNames.push('完璧');
      else{
        if(theory.magnificent)theoryNames.push('見事');
        if(theory.interesting)theoryNames.push('面白');
      }
      if(elaborate)theoryNames.push('凝った');
      const routeNote=`血統側：SP${sp}/ST${st}/PW${pw}ニトロ${theoryNames.length?'・'+theoryNames.join('＋'):''}`;

      let phase='素材づくり',headline='',body='';
      if(strategy.id==='unknown'){
        if(remaining>=2){
          phase='能力確認を兼ねた素材づくり';
          headline='まず母系の実力を把握する';
          body='母の繁殖SP/ST/PWが未判明なので、特定距離の印を最初から必須にしません。複数距離で印と走りを確認し、明確に能力上位と判断できる牝馬だけを次世代へ残します。';
        }else if(remaining===1){
          phase='締め前の能力確認';
          headline='能力を確認できた牝馬だけ締めへ進める';
          body='実馬でSP/STの方向性を確認できた牝馬だけを残し、その結果に合わせて最終父を選びます。未判明のまま2400m型・SP型と決め打ちしません。';
        }else{
          phase='締め';
          headline='実馬評価に合わせて最終目的を決める';
          body='ここまでに確認できた実馬能力と、最終ニトロ・配合理論・父能力を合わせて締め配合を判断します。';
        }
      }else if(remaining>=2){
        phase='素材づくり';
        if(strategy.id==='elite-preserve'){
          headline='母の高能力を崩さないことを最優先';
          body='この段階では2400m適性を必須にしません。SP/ST/PWのいずれかを大きく落とす産駒を避け、1600〜2000m付近で総合的に印が安定する牝馬を広めに残します。';
        }else if(strategy.id==='high-balanced'){
          headline='高い基礎能力を保ったまま、次の理論につなぐ';
          body='序盤から完成距離を求めず、SP/ST/PWのバランスを大きく崩さない牝馬を優先します。能力差が小さい場合は、次代で見事・完璧・有効クロスを作りやすい血統側を優先します。';
        }else if(strategy.id==='sp-st-repair'){
          headline='SPを残しながらST改善の兆候を拾う';
          body='短距離だけのSP型に寄せず、1600〜2000mでSP印を維持しつつ、中距離でST側の印が改善する牝馬を残します。2400m印はまだ必須にしません。';
        }else if(strategy.id==='st-sp-repair'){
          headline='STを残しながらSP改善を優先';
          body='長距離適性だけで選ばず、1600〜2000mでSP側の印が母系より改善した牝馬を優先します。STの強みを失わないことも同時に確認します。';
        }else if(strategy.id==='rebuild'){
          headline='完成形ではなく「母より一段改善」を狙う';
          body='まずSP/ST/PWのうち弱点側が1段改善し、強み側を大きく落とさない牝馬を残します。距離適性は1600〜2000mでも構いません。';
        }else{
          headline='強みを維持しつつ弱点を1つ補強';
          body='この世代では最終完成を求めず、母の強い能力を維持しながら弱点側が改善した牝馬を残します。1600〜2000mの印を基準に広めに選抜します。';
        }
      }else if(remaining===1){
        phase='締め前の方向付け';
        if(goal==='arc'){
          if(strategy.id==='elite-preserve'||strategy.id==='high-balanced'){
            headline='能力維持に加えて、締めで2400mへ伸ばせる血統を残す';
            body='1800〜2200m付近でSP/STの両方が安定する牝馬を優先します。ここでも2400m印を絶対条件にはせず、最終父で距離適性・実績A・最終ニトロを完成させます。';
          }else if(strategy.id==='sp-st-repair'){
            headline='締め前にST不足を解消する';
            body='SPの強みを維持したまま、1800〜2200mでST側の印が付く牝馬を優先します。2400m対応は最終父で仕上げます。';
          }else if(strategy.id==='st-sp-repair'){
            headline='締め前にSP不足を解消する';
            body='1800〜2200mでSTを保ちながらSP印が改善した牝馬を優先します。最終父は2400m対応とSP上限を両立する候補を選びます。';
          }else{
            headline='最終父に渡せる中距離バランスを作る';
            body='1800〜2200mでSP/STが偏りすぎない牝馬を優先します。2400m印そのものは最終締めで確認します。';
          }
        }else if(goal==='bc'){
          headline=strategy.improve.includes('SP')?'締め前にSPを明確に引き上げる':'SPの強みを落とさず上限を残す';
          body='実馬のSP印を最優先しつつ、STを極端に落とさない牝馬を残します。血統側では最終SPニトロと配合理論が伸びるルートを優先します。';
        }else if(goal==='rebuild'){
          headline='母系として残す価値を確認';
          body='起点母よりSP+STのバランスが改善し、次世代でも使いやすい牝馬を残します。1頭の完成馬より、再現しやすい母系づくりを優先します。';
        }else{
          headline='将来自家製種牡馬へつながる血統を残す';
          body='実馬能力上位の牝馬だけを残し、最終産駒の血統汎用性が広がる系統構成を優先します。出生前に実績・安定・底力は仮定しません。';
        }
      }else{
        phase='締め';
        headline=goal==='arc'?'2400m対応・SP/ST・父能力をここで完成':'最終目的の条件をここで完成';
        body='最終世代ではじめて目的距離・最終ニトロ・配合理論・父の実績/底力/安定を厳しく評価します。';
      }

      return{
        strategy,phase,headline,body,routeNote,
        preserve:[...strategy.preserve],improve:[...strategy.improve],
        generation,totalStages
      };
    }

    function goalVector(route,goal){
      const f=route?.final||{},ss=f.sireStats||{},t=f.theory||{},sp=val(f.sp),st=val(f.st),pw=val(f.pw);
      const long=val(ss.maxD)>=2400,recA=grade(ss.record)>=3,arcReady=sp>=14&&st>=6&&long&&recA;
      if(goal==='arc')return[bool(arcReady),bool(sp>=15&&st>=5&&long&&recA),sp+st,st,sp,bool(t.perfect),bool(t.magnificent),bool(f.elaborate),grade(ss.guts)];
      if(goal==='bc')return[bool(sp>=17&&st>=5),sp,st,pw,bool(t.perfect),bool(t.magnificent),bool(f.elaborate),grade(ss.record)];
      if(goal==='rebuild')return[bool(sp>=15&&st>=5),sp+st,st,sp,bool(t.perfect),bool(t.magnificent),bool(f.elaborate),grade(ss.record)];
      return[sp,sp+st,st,bool(t.perfect),bool(t.magnificent),bool(f.elaborate)];
    }
    function betterGoalRoute(a,b,goal){
      if(!a)return b;if(!b)return a;
      const A=goalVector(a,goal),B=goalVector(b,goal);
      for(let i=0;i<Math.max(A.length,B.length);i++){const x=A[i]||0,y=B[i]||0;if(x!==y)return y>x?b:a}
      return a;
    }
    function emptySummary(method=''){
      return{
        method,count:0,sp15st5:0,sp17st5:0,sp18st5:0,
        interesting:0,magnificent:0,perfect:0,elaborate:0,
        maxSp:0,maxSt:0,maxPw:0,maxSpSt:0,
        long2400:0,recordA:0,balanceLongA:0,arcReady:0,bestRoute:null,bestGoal:''
      };
    }
    function addRoute(summary,route,goal){
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
      if(sp>=15&&st>=5&&val(ss.maxD)>=2400&&grade(ss.record)>=3)summary.balanceLongA++;
      if(sp>=14&&st>=6&&val(ss.maxD)>=2400&&grade(ss.record)>=3)summary.arcReady++;
      summary.maxSp=Math.max(summary.maxSp,sp);
      summary.maxSt=Math.max(summary.maxSt,st);
      summary.maxPw=Math.max(summary.maxPw,pw);
      summary.maxSpSt=Math.max(summary.maxSpSt,sp+st);
      if(goal){summary.bestGoal=goal;summary.bestRoute=betterGoalRoute(summary.bestRoute,route,goal)}
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
    function materialUpgrade(prev,next,goal,assessment){
      if(!prev||!next)return!!next;
      const a=routeFacts(prev),b=routeFacts(next);
      if(goal==='bc'){
        if(a.sp<17&&b.sp>=17&&b.st>=5)return true;
        if(b.sp>=a.sp+2&&b.st>=Math.max(3,a.st-1))return true;
        if(!a.perfect&&b.perfect&&b.sp>=a.sp-1)return true;
        return false;
      }
      if(goal==='arc'){
        const ta=a.sp>=14&&a.st>=6&&a.long2400&&a.recordA, tb=b.sp>=14&&b.st>=6&&b.long2400&&b.recordA;
        if(!ta&&tb)return true;
        const highMother=assessment?.abilityKnown&&assessment?.ranks?.spst?.topPercent<=25;
        if(ta&&highMother){
          if(b.sp>=a.sp+2&&b.st>=a.st&&tb)return true;
          if(b.spst>=a.spst+4&&b.st>=a.st-1&&tb)return true;
        }else if(b.spst>=a.spst+3&&b.st>=a.st-1)return true;
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
      const r1=g1?.summary?.bestRoute||routeForGoal(g1?.result,goal),r2=g2?.summary?.bestRoute||routeForGoal(g2?.result,goal),r3=g3?.summary?.bestRoute||routeForGoal(g3?.result,goal);
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
        if(materialUpgrade(r1,r2,goal,assessment)){recommended=2;reasons.push('2代目で、直仔より意味のあるニトロ・距離適性・配合理論の上積みが確認できます。')}
        else reasons.push('2代へ進めても直仔に対する上積みが小さく、短い世代で締める価値があります。');
        const base=recommended===2?r2:r1;
        if(materialUpgrade(base,r3,goal,assessment)){
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
      mareAssessment,mareStrategy,selectionAdvice,rankMetric,abilityTier,goalVector,betterGoalRoute,emptySummary,addRoute,summarize,
      directUseLabels,routeForGoal,routeFacts,recommendGeneration,portfolioFacts,portfolioUpgrade
    };
  }
  return{version:1,create,known};
});