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
      if(sum<=5&&sp<=10&&st<=10&&pw<=10)return'超高能力総合母';
      if(sum<=10&&st<=10&&sp>15)return'高能力ST優位母';
      if(sum<=10&&sp<=10&&st>15)return'高能力SP優位母';
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
      if(r.spst.topPercent<=5&&r.sp.topPercent<=10&&r.st.topPercent<=10&&r.pw.topPercent<=15){
        id='elite-complete';label='超高能力総合型';priority='SP/ST/PWを維持し、最終配合で上限と配合理論を伸ばす';
      }else if(r.spst.topPercent<=5&&r.st.topPercent<=10&&r.sp.topPercent>15){
        id='elite-st-sp';label='高能力ST優位・SP補強型';priority='高いST/PWを守りながらSPを引き上げる';
      }else if(r.spst.topPercent<=5&&r.sp.topPercent<=10&&r.st.topPercent>15){
        id='elite-sp-st';label='高能力SP優位・ST補強型';priority='高いSPを守りながらSTを引き上げる';
      }else if(r.spst.topPercent<=5){
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
      if(id==='elite-complete'){preserve.splice(0,preserve.length,'SP','ST','PW');improve.splice(0,improve.length)}
      if(id==='elite-st-sp'){preserve.splice(0,preserve.length,'ST','PW');improve.splice(0,improve.length,'SP')}
      if(id==='elite-sp-st'){preserve.splice(0,preserve.length,'SP','PW');improve.splice(0,improve.length,'ST')}
      return{
        id,label,priority,preserve,improve,
        stats:{sp:val(s.sp),st:val(s.st),pw:val(s.pw),spst:val(s.sp)+val(s.st)},
        ranks:r,
        note:(id==='elite-complete'||id==='elite-preserve')
          ?'高能力母は、序盤から2400m適性を要求するより、能力維持と血統素材づくりを優先します。'
          :(id==='elite-st-sp'?'ST/PWの強みを維持しつつ、SPを補強する段階設計を優先します。'
          :(id==='elite-sp-st'?'SPの強みを維持しつつ、STを補強する段階設計を優先します。'
          :'弱点側を補いながら、強みを失わない牝馬だけを次世代へ残します。'))
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
      let routeNote=`血統側：SP${sp}/ST${st}/PW${pw}ニトロ${theoryNames.length?'・'+theoryNames.join('＋'):''}`;
      const sx=stage.speedCross||{},cx=stage.crossEffects||{},materialStage=remaining>0&&!!sx.has,materialLongStage=remaining>0&&!!cx.longDistance;
      const needsSpSupport=strategy.id==='rebuild'||strategy.id==='st-sp-repair'||strategy.id==='unknown'||strategy.improve.includes('SP');
      const needsStSupport=strategy.id==='rebuild'||strategy.id==='elite-sp-st'||strategy.id==='sp-st-repair'||strategy.improve.includes('ST');

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
        if(strategy.id==='elite-complete'||strategy.id==='elite-preserve'){
          headline='母の高能力を崩さないことを最優先';
          body='この段階では2400m適性を必須にしません。SP/ST/PWのいずれかを大きく落とす産駒を避け、1600〜2000m付近で総合的に印が安定する牝馬を広めに残します。';
        }else if(strategy.id==='elite-st-sp'){
          headline='ST/PWを守りながらSP改善の余地を作る';
          body='高いSTとPWを崩さず、SP印が母系より改善する牝馬を優先します。序盤では2400m印を必須にせず、1600〜2000mで速度側の改善を確認します。';
        }else if(strategy.id==='elite-sp-st'){
          headline='SPを守りながらST改善の余地を作る';
          body='高いSPを崩さず、中距離側でST印が改善する牝馬を優先します。序盤では2400m適性を完成条件にしません。';
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
          if(strategy.id==='elite-complete'||strategy.id==='elite-preserve'||strategy.id==='high-balanced'){
            headline='能力維持に加えて、締めで2400mへ対応しやすい根拠を残す';
            body='1800〜2200m付近でSP/STの両方が安定する牝馬を優先します。2400m印は絶対条件にせず、最終父の距離適性・実績と、最終STニトロ・長距離クロスを合わせて判断します。';
          }else if(strategy.id==='elite-st-sp'){
            headline='締め前にSPを引き上げ、STの強みを残す';
            body='1800〜2200mでSTの強みを保ちながらSP印が改善する牝馬を優先します。最終父の距離適性は強い根拠として使い、STニトロや長距離クロスでも補完可能か確認します。';
          }else if(strategy.id==='elite-sp-st'){
            headline='締め前にSTを引き上げ、SPの強みを残す';
            body='1800〜2200mでSPを保ちながらST印が改善する牝馬を優先します。最終父2400m対応を絶対条件にせず、STニトロ・長距離クロスを含めて締めを判断します。';
          }else if(strategy.id==='sp-st-repair'){
            headline='締め前にST不足を解消する';
            body='SPの強みを維持したまま、1800〜2200mでST側の印が付く牝馬を優先します。締めでは父の距離適性と長距離クロス・STニトロを合わせて確認します。';
          }else if(strategy.id==='st-sp-repair'){
            headline='締め前にSP不足を解消する';
            body='1800〜2200mでSTを保ちながらSP印が改善した牝馬を優先します。最終父はSP上限を確保しつつ、2400m対応または長距離クロス・高STで距離根拠を補える候補を比較します。';
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
        headline=goal==='arc'?'SP/ST・父能力・距離根拠をここで完成':'最終目的の条件をここで完成';
        body='最終世代ではじめて目的距離・最終ニトロ・配合理論・父の実績/底力/安定を厳しく評価します。';
      }

      if(materialStage){
        routeNote+=`・SP系クロス ${val(sx.count)}祖先`;
        if(strategy.id==='unknown'){
          body+=(val(sx.short)>0
            ?' この段階の短距離クロスはSP側を確認する選抜材料になりますが、起点母の能力は未判明です。ST低下側の作用もあるため、実馬でSP/STを確認して残します。'
            :' この段階の速力クロスはSP側を確認する選抜材料として利用します。起点母の能力は未判明なのでSP不足とは決めつけず、出生前の繁殖SPにも加算しません。');
        }else if(needsSpSupport){
          body+=(val(sx.short)>0
            ?' この段階の短距離クロスはSP改善を狙う選抜機会になりますが、ST低下側の作用もあるため、実馬でSTを確認して残します。'
            :' この段階の速力クロスはSP不足を補う中間牝馬の選抜機会として利用します。ただし出生前の繁殖SPには加算しません。');
        }else{
          body+=' この段階のSP系クロスは補助材料として使い、母系の強みやSTを崩さない実馬を優先して残します。';
        }
      }
      if(materialLongStage){
        routeNote+='・長距離クロス';
        if(strategy.id==='unknown'){
          body+=' この段階の長距離クロスはスタミナ側を確認する選抜材料ですが、起点母の能力は未判明です。出生前の繁殖STへ加算せず、実馬の中距離〜長距離の印と走りで確認します。';
        }else if(needsStSupport){
          body+=' この段階の長距離クロスは直接のスタミナ補強を使えるST選抜機会です。ただし出生前の繁殖STへ加算せず、実馬でST改善を確認できた牝馬だけ次世代へ残します。';
        }else{
          body+=' この段階の長距離クロスは距離側の補助材料として扱い、それだけを理由に代重ねせず母系のSP/ST/PW維持を優先します。';
        }
      }
      return{
        strategy,phase,headline,body,routeNote,
        preserve:[...strategy.preserve],improve:[...strategy.improve],
        generation,totalStages
      };
    }

    function crossInsights(stage){
      const danger=stage?.danger||{},nitro=stage?.nitro||{};
      const effective=danger.effectiveCrosses||[],raw=danger.rawCrosses||[];
      const norm=s=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase();
      const factors=new Map((nitro.factors||[]).map(x=>[norm(x.name),x]));
      const effectLabels=f=>{
        if(!f)return[];
        const out=[];
        if(val(f.short))out.push({key:'short',label:'短距離',detail:'スピードUP / SPニトロ+2・STニトロ-1',tradeoff:true});
        if(val(f.speed))out.push({key:'speed',label:'速力',detail:'スピードUP / SPニトロ+1',tradeoff:false});
        if(val(f.power))out.push({key:'power',label:'パワー',detail:'パワーUP / PWニトロ+1',tradeoff:false});
        if(val(f.guts))out.push({key:'guts',label:'底力',detail:'勝負根性UP / STニトロ+1',tradeoff:false});
        if(val(f.long))out.push({key:'long',label:'長距離',detail:'スタミナUP / STニトロ+1',tradeoff:false});
        return out;
      };
      const items=effective.map(x=>{
        const f=factors.get(norm(x.name))||null;
        const dsp=val(f?.dsp),dst=val(f?.dst),dp=val(f?.dp);
        const impact=Math.abs(dsp)+Math.abs(dst)+Math.abs(dp);
        const effects=effectLabels(f);
        return{
          name:x.name,sireGen:x.sireGen,mareGen:x.mareGen,
          factor:f?{sp:dsp,st:dst,pw:dp}:null,
          effects,
          impact,
          hasTradeoff:effects.some(e=>e.tradeoff)||dsp<0||dst<0||dp<0,
          priority:impact>=3?'high':impact>=1?'medium':'standard',
          priorityLabel:impact>=3?'因子影響 大':impact>=1?'因子影響 あり':'クロス成立'
        };
      }).sort((a,b)=>b.impact-a.impact||(a.sireGen+a.mareGen)-(b.sireGen+b.mareGen));
      return{
        rawCount:raw.length,
        effectiveCount:effective.length,
        suppressedCount:Math.max(0,raw.length-effective.length),
        items
      };
    }

    function goalVector(route,goal){
      const f=route?.final||{},ss=f.sireStats||{},t=f.theory||{},x=f.speedCross||{},ce=f.crossEffects||{},sp=val(f.sp),st=val(f.st),pw=val(f.pw);
      const maxD=val(ss.maxD),rec=grade(ss.record);
      const hasSpeed=bool(x.has),hasLong=bool(ce.longDistance),hasUseful=bool(ce.anyAbility),crossCount=val(x.count),materialStages=val(route?.materialSpeedCross?.stages),materialLongStages=val(route?.materialLongCross?.stages);
      const distanceEvidence=maxD>=2400?(hasLong?3:2):(hasLong?1:0);
      const multi=(route?.sires||[]).length>1,stableUpside=multi?(ss.stable==='C'?3:ss.stable==='B'?2:ss.stable==='A'?1:0):0;
      const speedPath=hasSpeed||materialStages>0,longPath=hasLong||materialLongStages>0;
      const magnificentSpeed=bool(t.magnificent&&hasSpeed);
      const magnificentLong=bool(t.magnificent&&hasLong);
      const magnificentUseful=bool(t.magnificent&&hasUseful);
      const arcQuantitative=sp>=14&&st>=6;
      const arcStrong=sp>=15&&st>=6;
      if(goal==='arc')return[bool(arcQuantitative),bool(arcStrong),sp+st,st,sp,rec,distanceEvidence,bool(speedPath),bool(longPath),crossCount,materialStages,materialLongStages,stableUpside,magnificentLong,magnificentSpeed,bool(f.elaborate),bool(t.interesting),grade(ss.guts)];
      if(goal==='bc'){
        const bcQualified=sp>=17&&st>=5;
        const bcTier=sp>=19&&st>=6?3:sp>=18&&st>=5?2:bcQualified?1:0;
        return[bool(bcQualified),bool(speedPath),bcTier,rec,sp,st,pw,stableUpside,hasSpeed,crossCount,materialStages,magnificentSpeed,bool(f.elaborate),bool(t.interesting)];
      }
      if(goal==='rebuild')return[bool(sp>=15&&st>=5),sp+st,st,sp,hasSpeed,hasLong,crossCount,materialStages,magnificentUseful,bool(f.elaborate),bool(t.interesting),rec];
      return[sp,sp+st,st,hasSpeed,hasLong,crossCount,materialStages,magnificentUseful,bool(f.elaborate),bool(t.interesting)];
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
        speedCross:0,shortCross:0,speedOnlyCross:0,maxSpeedCrossEffect:0,
        longDistanceCross:0,gutsCross:0,powerCross:0,
        long2400:0,recordA:0,balanceLongA:0,arcReady:0,arcQuantitative:0,
        arcRecordA:0,arcRecordB:0,arcRecordC:0,
        arcDistanceStrong:0,arcCompensated:0,arcDistanceUncertain:0,
        arcSupportedA:0,arcSupportedB:0,arcSupportedC:0,arcUncertainA:0,arcUncertainB:0,arcUncertainC:0,
        bestRoute:null,bestGoal:''
      };
    }
    function addRoute(summary,route,goal){
      const f=route?.final||{},t=f.theory||{},ss=f.sireStats||{},ce=f.crossEffects||{};
      summary.count++;
      const sp=val(f.sp),st=val(f.st),pw=val(f.pw),x=f.speedCross||{};
      if(x.has)summary.speedCross++;
      if(val(x.short)>0)summary.shortCross++;
      if(val(x.speed)>0)summary.speedOnlyCross++;
      if(ce.longDistance)summary.longDistanceCross++;
      if(ce.gutsSupport)summary.gutsCross++;
      if(ce.powerSupport)summary.powerCross++;
      summary.maxSpeedCrossEffect=Math.max(summary.maxSpeedCrossEffect,val(x.effect));
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
      if(sp>=14&&st>=6){
        summary.arcQuantitative++;
        summary.arcReady++;
        const recKey=grade(ss.record)>=3?'A':grade(ss.record)>=2?'B':'C';
        if(recKey==='A')summary.arcRecordA++;else if(recKey==='B')summary.arcRecordB++;else summary.arcRecordC++;
        const distanceSupported=val(ss.maxD)>=2400||!!ce.longDistance;
        if(val(ss.maxD)>=2400)summary.arcDistanceStrong++;
        else if(ce.longDistance)summary.arcCompensated++;
        else summary.arcDistanceUncertain++;
        if(distanceSupported)summary['arcSupported'+recKey]++;
        else summary['arcUncertain'+recKey]++;
      }
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
      if(goal==='bc')return result.profiles?.speedCross?.[0]||result.profiles?.sp?.[0]||result.profiles?.balance?.[0]||null;
      if(goal==='arc')return result.profiles?.balance?.[0]||result.profiles?.speedCross?.[0]||result.profiles?.st?.[0]||result.profiles?.sp?.[0]||null;
      if(goal==='rebuild')return result.profiles?.balance?.[0]||result.profiles?.speedCross?.[0]||result.profiles?.st?.[0]||null;
      return result.profiles?.speedCross?.[0]||result.profiles?.sp?.[0]||result.profiles?.balance?.[0]||null;
    }
    function routeFacts(route){
      const f=route?.final||{},ss=f.sireStats||{},t=f.theory||{},x=f.speedCross||{},mx=route?.materialSpeedCross||{},ml=route?.materialLongCross||{};
      return{
        sp:val(f.sp),st:val(f.st),pw:val(f.pw),spst:val(f.sp)+val(f.st),
        speedCross:bool(x.has),speedCrossCount:val(x.count),speedCrossEffect:val(x.effect),shortCross:val(x.short),speedOnlyCross:val(x.speed),
        materialSpeedCross:bool(mx.has),materialSpeedCrossStages:val(mx.stages),materialSpeedCrossCount:val(mx.count),
        materialLongCross:bool(ml.has),materialLongCrossStages:val(ml.stages),materialLongCrossNames:[...(ml.names||[])],
        maxD:val(ss.maxD),distance2400:val(ss.maxD)>=2400,long2400:val(ss.maxD)>=2400,
        longDistanceCross:bool(f.crossEffects?.longDistance),gutsCross:bool(f.crossEffects?.gutsSupport),powerCross:bool(f.crossEffects?.powerSupport),abilityCross:bool(f.crossEffects?.anyAbility),
        distanceEvidence:val(ss.maxD)>=2400?(f.crossEffects?.longDistance?3:2):(f.crossEffects?.longDistance?1:0),
        record:String(ss.record||'?'),stable:String(ss.stable||'?'),guts:String(ss.guts||'?'),
        recordGrade:grade(ss.record),recordA:grade(ss.record)>=3,recordBPlus:grade(ss.record)>=2,gutsA:grade(ss.guts)>=3,
        interesting:bool(t.interesting),magnificent:bool(t.magnificent),perfect:bool(t.perfect),elaborate:bool(f.elaborate)
      };
    }
    function productionQuality(route,assessment){
      const f=route?.final||{},ss=f.sireStats||{},x=f.speedCross||{},sp=val(f.sp),st=val(f.st);
      const generations=(route?.sires||[]).length||1,multi=generations>1,record=String(ss.record||'?'),stable=String(ss.stable||'?');
      const viable=sp>=15&&st>=5,eliteLine=sp>=17&&st>=5,recordGrade=grade(record),materialSupport=!!route?.materialSpeedCross?.has;
      const highKnownMother=!!assessment?.abilityKnown&&assessment?.ranks?.spst?.topPercent<=25;
      const notes=[],warnings=[];
      if(record==='A')notes.push('最終父は実績Aで、産駒上限側を狙う強い根拠を確保');
      else if(record==='B')warnings.push('最終父は実績B。実績A締めより能力上限側の確度は下がるため、SPクロスだけで強馬を保証しない');
      else warnings.push('最終父は実績C。血統値が高くても強馬生産の締めとしては上限側の不確実性が大きい');
      if(stable==='A'){
        if(!multi&&highKnownMother)notes.push('安定Aは高能力の起点牝馬を再現しやすい方向として使える');
        else if(multi){
          warnings.push(materialSupport
            ?'安定A締めは、途中世代で高能力牝馬を実際に選抜できた場合に向く'
            :'安定A締めだが途中SP系クロス補強がなく、中間牝馬の質への依存が大きい。高能力牝馬を実際に選抜できた場合だけ強馬狙いとして評価');
        }else warnings.push('安定Aは母能力を強く反映する方向。起点母が上位級でない場合は上振れ狙いとは別に考える');
      }else if(stable==='C'){
        notes.push('安定Cは産駒の振れ幅を取りやすい上振れ側。再現性より試行回数を前提にする');
      }else if(stable==='B'){
        notes.push('安定Bは安定AとCの中間として扱う');
      }
      if(multi&&!materialSupport)warnings.push('締め前までに速力/短距離の有効クロス補強がなく、中間牝馬のSPは実馬選抜に依存');
      if(x.has)notes.push('最終配合では速力/短距離の有効クロスあり');
      else warnings.push('最終配合に速力/短距離の有効クロスなし');
      const speedSupport=materialSupport||!!x.has;
      let key='pedigree-only',label='血統候補';
      if(multi&&!speedSupport){key='no-speed-support';label='SP補強経路なし';}
      else if(viable&&record==='A'){key='ceiling';label='上限重視';}
      else if(viable&&record==='B'&&stable==='C'){key='upside';label='上振れ狙い';}
      else if(viable&&record==='B'&&stable==='B'){key='conditional';label='条件付き';}
      else if(viable&&record==='B'&&stable==='A'){key='selection-dependent';label=multi?'中間牝馬選抜が前提':'母能力依存';}
      else if(viable&&record==='C'){key='low-ceiling';label='血統値先行';}
      else if(!viable){key='tradeoff';label='SP/ST不足に注意';}
      return{
        key,label,viable,eliteLine,generations,multi,
        record,stable,guts:String(ss.guts||'?'),recordGrade,
        materialSupport,finalSpeedCross:!!x.has,speedSupport,
        highKnownMother,requiresSelectedMare:multi&&stable==='A',
        notes,warnings
      };
    }

    function materialUpgradeReasons(prev,next,goal,assessment){
      if(!prev||!next)return next?['比較対象となる次世代候補が成立']: [];
      const a=routeFacts(prev),b=routeFacts(next),reasons=[];
      const spNeedsSupport=!!assessment?.abilityKnown&&(assessment?.ranks?.sp?.topPercent>45||assessment?.ranks?.spst?.topPercent>60);
      const stNeedsSupport=!!assessment?.abilityKnown&&(assessment?.ranks?.st?.topPercent>45||assessment?.ranks?.spst?.topPercent>60);
      const materialCrossGain=b.materialSpeedCrossStages>a.materialSpeedCrossStages;
      const materialLongGain=b.materialLongCrossStages>a.materialLongCrossStages;
      const addMaterialSupport=()=>{
        if(spNeedsSupport&&materialCrossGain&&b.sp>=a.sp-1&&b.st>=a.st-1){
          reasons.push('SP不足側の母に対し、中間世代で速力/短距離クロスを使える工程が増え、最終SP/STも大きく落とさない');
        }
      };
      const addMaterialLongSupport=()=>{
        if(stNeedsSupport&&materialLongGain&&b.sp>=a.sp-1&&b.st>=a.st-1){
          reasons.push('ST不足側の母に対し、中間世代で長距離クロスを使えるST選抜機会が増え、最終SP/STも大きく落とさない');
        }
      };
      if(goal==='bc'){
        if(!a.speedCross&&b.speedCross&&b.sp>=a.sp-1)reasons.push('最終配合で速力/短距離クロスが新たに成立し、SPニトロもほぼ維持');
        if(a.sp<17&&b.sp>=17&&b.st>=5)reasons.push('SP17/ST5ラインへ新たに到達');
        if(b.sp>=a.sp+2&&b.st>=Math.max(3,a.st-1))reasons.push(`SPを${a.sp}→${b.sp}へ伸ばし、ST低下を抑制`);
        if(!a.magnificent&&b.magnificent&&(b.speedCross||b.materialSpeedCross)&&b.sp>=a.sp-1&&b.st>=a.st-1)reasons.push('見事配合とSP系クロスを新たに両立し、SP/STもほぼ維持');
        addMaterialSupport();
        return reasons;
      }
      if(goal==='arc'){
        const ta=a.sp>=14&&a.st>=6, tb=b.sp>=14&&b.st>=6;
        const highMother=!!assessment?.abilityKnown&&assessment?.ranks?.spst?.topPercent<=25;
        const speedCrossRelevant=!!assessment?.abilityKnown&&(!highMother||spNeedsSupport);
        const longCrossRelevant=!!assessment?.abilityKnown&&(!highMother||stNeedsSupport);
        if(speedCrossRelevant&&!a.speedCross&&b.speedCross&&b.sp>=a.sp-1&&b.st>=a.st-1)reasons.push('最終配合で速力/短距離クロスが新たに成立し、SP/STをほぼ維持');
        if(longCrossRelevant&&!a.longDistanceCross&&b.longDistanceCross&&b.sp>=a.sp-1&&b.st>=a.st-1)reasons.push('最終配合で長距離クロスが新たに成立し、SP/STをほぼ維持しながら直接のスタミナ補強経路を確保');
        if(!ta&&tb)reasons.push('凱旋門向けSP/ST基準（SP14/ST6）へ新たに到達');
        const recordGain=b.recordGrade-a.recordGrade;
        const recordUpgradeUseful=(a.recordGrade===1&&recordGain>=1&&b.sp>=a.sp-1&&b.st>=a.st-1)
          ||(a.recordGrade>=2&&recordGain>=1&&b.sp>=a.sp&&b.st>=a.st);
        if(recordUpgradeUseful)reasons.push(`最終父の実績が${a.record}→${b.record}へ改善し、SP/ST水準も維持`);
        if(!a.distance2400&&b.distance2400&&tb&&b.sp>=a.sp-1&&b.st>=a.st-1)reasons.push('SP/STをほぼ維持したまま最終父の2400m対応が加わり、距離適性の根拠が強化');
        if(ta&&highMother){
          if(b.sp>=a.sp+2&&b.st>=a.st&&tb)reasons.push(`高能力母を維持したままSPを${a.sp}→${b.sp}へ上積み`);
          if(b.spst>=a.spst+4&&b.st>=a.st-1&&tb)reasons.push(`SP+STを${a.spst}→${b.spst}へ大きく上積み`);
        }else if(b.spst>=a.spst+3&&b.st>=a.st-1){
          reasons.push(`SP+STを${a.spst}→${b.spst}へ改善し、ST低下を抑制`);
        }
        const magnificentRelevant=(speedCrossRelevant&&b.speedCross)||(longCrossRelevant&&b.longDistanceCross);
        if(!a.magnificent&&b.magnificent&&magnificentRelevant&&b.spst>=a.spst-1&&b.st>=a.st-1)reasons.push('見事配合と母の不足軸に合うSP系/長距離クロスを新たに両立し、SP+STもほぼ維持');
        addMaterialSupport();
        addMaterialLongSupport();
        return reasons;
      }
      if(goal==='rebuild'){
        const ta=a.sp>=15&&a.st>=5, tb=b.sp>=15&&b.st>=5;
        if(!a.speedCross&&b.speedCross&&b.spst>=a.spst-2)reasons.push('速力/短距離クロスを新たに成立させ、母系のSP補強手段を確保');
        if(!ta&&tb)reasons.push('再建目安のSP15/ST5ラインへ新たに到達');
        if(b.spst>=a.spst+3)reasons.push(`SP+STを${a.spst}→${b.spst}へ改善`);
        const needsSp=!!assessment?.abilityKnown&&(assessment?.ranks?.sp?.topPercent>45||assessment?.ranks?.spst?.topPercent>60);
        const needsSt=!!assessment?.abilityKnown&&(assessment?.ranks?.st?.topPercent>45||assessment?.ranks?.spst?.topPercent>60);
        const matchedCross=(needsSp&&b.speedCross)||(needsSt&&b.longDistanceCross)||(!needsSp&&!needsSt&&b.abilityCross);
        if(!a.magnificent&&b.magnificent&&matchedCross&&b.spst>=a.spst-1)reasons.push('見事配合と母の不足能力に合う有効クロスを新たに両立し、母系能力もほぼ維持');
        addMaterialSupport();
        addMaterialLongSupport();
        return reasons;
      }
      if(!a.speedCross&&b.speedCross&&b.sp>=a.sp-1)reasons.push('速力/短距離クロスを新たに成立');
      if(b.sp>=a.sp+2)reasons.push(`SPを${a.sp}→${b.sp}へ上積み`);
      if(b.spst>=a.spst+3)reasons.push(`SP+STを${a.spst}→${b.spst}へ改善`);
      if(!a.magnificent&&b.magnificent&&b.abilityCross&&b.sp>=a.sp-1&&b.st>=a.st-1)reasons.push('見事配合と有効な能力系クロスを新たに両立し、能力水準も維持');
      addMaterialSupport();
      return reasons;
    }
    function materialUpgrade(prev,next,goal,assessment){
      return materialUpgradeReasons(prev,next,goal,assessment).length>0;
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
    function portfolioUpgradeReasons(prev,next){
      if(!prev||!next)return next?['比較対象となる次世代候補が成立']: [];
      const a=portfolioFacts(prev),b=portfolioFacts(next),reasons=[];
      if(b.sp17>=a.sp17+2)reasons.push(`SP17/ST5以上の成立数が${a.sp17}→${b.sp17}`);
      if(b.sp15>=a.sp15+4&&b.safe>=a.safe-2)reasons.push(`SP15/ST5以上の成立数が${a.sp15}→${b.sp15}へ増加し、安全配合数も維持`);
      if(b.sp17hi>a.sp17hi)reasons.push(`SP+ST≥130母群でSP17/ST5以上が${a.sp17hi}→${b.sp17hi}`);
      if(b.maxSp>=a.maxSp+2)reasons.push(`将来配合の最大SPニトロが${a.maxSp}→${b.maxSp}`);
      if(b.maxSpSt>=a.maxSpSt+3)reasons.push(`将来配合の最大SP+STが${a.maxSpSt}→${b.maxSpSt}`);
      return reasons;
    }
    function portfolioUpgrade(prev,next){
      return portfolioUpgradeReasons(prev,next).length>0;
    }

    function directUseLabels(assessment,summary){
      if(!assessment)return{};
      if(!assessment.abilityKnown)return{
        arc:'能力評価保留',bc:'能力評価保留',rebuild:'能力評価保留',stallion:'血統評価可能'
      };
      const p=assessment.ranks,high=p.spst.topPercent<=25,mid=p.spst.topPercent<=50,spHigh=p.sp.topPercent<=25;
      const supportedA=val(summary.arcSupportedA)>0,supportedB=val(summary.arcSupportedB)>0,supportedC=val(summary.arcSupportedC)>0;
      const uncertainA=val(summary.arcUncertainA)>0,uncertainB=val(summary.arcUncertainB)>0,uncertainC=val(summary.arcUncertainC)>0;
      const arcLabel=summary.arcQuantitative>0
        ?(supportedA?(high?'直仔から有力':'配合次第で直仔候補')
          :supportedB?'配合次第で直仔候補'
          :supportedC?'直仔候補（父実績C・試行前提）'
          :(uncertainA||uncertainB)?'直仔候補（距離根拠要確認）'
          :uncertainC?'直仔候補（父実績C・距離根拠要確認）'
          :'直仔候補（根拠要確認）')
        :(mid?'2代以上を比較':'代重ね・厳選前提');
      return{
        arc:arcLabel,
        bc:summary.sp17st5>0?(spHigh?'直仔から有力':'配合次第'):'2代以上を比較',
        rebuild:high?'母能力を守る側':mid?'再建の起点候補':'再建素材・厳選前提',
        stallion:'世代診断で血統汎用性を比較'
      };
    }

    function recommendGeneration({goal='arc',assessment,generations,portfolios}={}){
      const g1=generations?.[1],g2=generations?.[2],g3=generations?.[3],g4=generations?.[4];
      const r1=g1?.summary?.bestRoute||routeForGoal(g1?.result,goal);
      const r2=g2?.summary?.bestRoute||routeForGoal(g2?.result,goal);
      const r3=g3?.summary?.bestRoute||routeForGoal(g3?.result,goal);
      const r4=g4?.summary?.bestRoute||routeForGoal(g4?.result,goal);
      let recommended=1,reasons=[],conditional=false;
      const transitions={to2:{from:1,to:2,reasons:[]},to3:{from:1,to:3,reasons:[]},to4:{from:1,to:4,reasons:[]}};
      if(goal==='stallion'){
        const p1=portfolios?.[1]?.routes?.[0]?.portfolio||null;
        const p2=portfolios?.[2]?.routes?.[0]?.portfolio||null;
        const p3=portfolios?.[3]?.routes?.[0]?.portfolio||null;
        const p4=portfolios?.[4]?.routes?.[0]?.portfolio||null;
        const u2=portfolioUpgradeReasons(p1,p2);
        transitions.to2.reasons=u2;
        if(u2.length){recommended=2;reasons.push('直仔→2代：'+u2.join('／'))}
        else reasons.push('直仔段階ですでに将来種牡馬としての血統汎用性が競争力を持ちます。');
        const baseP3=recommended===2?p2:p1,u3=portfolioUpgradeReasons(baseP3,p3);
        transitions.to3={from:recommended,to:3,reasons:u3};
        if(u3.length){
          recommended=3;conditional=true;
          reasons.push((transitions.to3.from===2?'2代→3代':'直仔→3代')+'：'+u3.join('／'));
        }
        const baseP4=recommended===3?p3:recommended===2?p2:p1,u4=portfolioUpgradeReasons(baseP4,p4);
        transitions.to4={from:recommended,to:4,reasons:u4};
        if(u4.length){
          const from=recommended;recommended=4;conditional=true;
          reasons.push((from===3?'3代→4代':from===2?'2代→4代':'直仔→4代')+'：'+u4.join('／'));
        }
      }else{
        const u2=materialUpgradeReasons(r1,r2,goal,assessment);
        transitions.to2.reasons=u2;
        if(u2.length){recommended=2;reasons.push('直仔→2代：'+u2.join('／'))}
        else reasons.push('2代へ進めても直仔に対する上積みが小さく、短い世代で締める価値があります。');
        const baseRoute3=recommended===2?r2:r1,u3=materialUpgradeReasons(baseRoute3,r3,goal,assessment);
        transitions.to3={from:recommended,to:3,reasons:u3};
        if(u3.length){
          const from=recommended;recommended=3;conditional=true;
          reasons.push((from===2?'2代→3代':'直仔→3代')+'：'+u3.join('／'));
        }
        const baseRoute4=recommended===3?r3:recommended===2?r2:r1,u4=materialUpgradeReasons(baseRoute4,r4,goal,assessment);
        transitions.to4={from:recommended,to:4,reasons:u4};
        if(u4.length){
          const from=recommended;recommended=4;conditional=true;
          reasons.push((from===3?'3代→4代':from===2?'2代→4代':'直仔→4代')+'：'+u4.join('／'));
        }
      }
      if(recommended>1)reasons.push('中間牝馬のSP/ST/PWは出生前に仮定せず、能力上位牝馬を実際に選抜できた場合だけ次世代へ進みます。');
      if(assessment&&!assessment.abilityKnown)reasons.push('起点牝馬の繁殖能力が未判明なので、母能力を含む総合判断は保留です。');
      return{
        generation:recommended,
        label:recommended===1?'直仔推奨':recommended===2?'2代推奨':recommended===3?'3代候補（条件付き）':'4代候補（条件付き）',
        conditional,
        reasons,
        transitions,
        routes:{1:r1,2:r2,3:r3,4:r4}
      };
    }

    return{
      version:1,knownAbilityCount:knownMares.length,totalMareCount:broodmareStats.length,
      mareAssessment,mareStrategy,selectionAdvice,crossInsights,rankMetric,abilityTier,goalVector,betterGoalRoute,emptySummary,addRoute,summarize,
      directUseLabels,routeForGoal,routeFacts,productionQuality,materialUpgradeReasons,recommendGeneration,portfolioFacts,portfolioUpgradeReasons,portfolioUpgrade
    };
  }
  return{version:1,create,known};
});