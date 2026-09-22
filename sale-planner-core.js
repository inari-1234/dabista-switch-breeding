(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DABISTA_SALE_PLANNER_CORE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PROFILE_LABELS={
    sp:'SP上限型',
    speedCross:'SPクロス補強型',
    production:'強馬生産型',
    st:'ST・距離適性型',
    balance:'バランス型',
    sire:'自家製種牡馬・血統価値型'
  };
  const GOAL_LABELS={
    arc:'凱旋門賞狙い',
    stallion:'自家製種牡馬狙い',
    rebuild:'繁殖牝馬再建',
    bc:'BC長期狙い'
  };
  const GOAL_ORDER={
    arc:['production','balance','speedCross','st','sp','sire'],
    stallion:['sire','speedCross','sp','balance','st'],
    rebuild:['balance','speedCross','st','sp','sire'],
    bc:['production','speedCross','sp','balance','sire','st']
  };
  const PROFILE_CRITERIA={
    sp:'最終配合のSPニトロ → ST → PW → 見事×有効SPクロスの相乗 → 面白 → 凝った → 最終父の実績 → 最終同値時のみ有効SPクロス',
    speedCross:'最終配合に速力/短距離の有効クロスを最低1本確保 → SPニトロ → ST → 見事×有効SPクロスの相乗 → SP系クロス祖先数 → 凝った/面白 → PW',
    production:'多世代は途中または締めに速力/短距離クロスを最低1回確保 → SP15/ST5最低線 → 最終父の実績 → SP17/ST5 → 安定C/B/Aを上振れ幅の違いとして比較 → SP → ST → 見事×目的有効クロス → 凝った/面白',
    st:'STニトロ → 直接の長距離クロス → SP → 最終父実績 → 距離適性は補助根拠 → 配合理論',
    balance:'SP15/ST5同時達成 → SP+ST → ST → SP → 距離適性・長距離クロスを補助比較 → 実績',
    sire:'高能力繁殖牝馬群への安全配合数・SP15/ST5・SP17/ST5・面白/見事/完璧/凝った・最大ニトロを合算せず並列比較'
  };
  const grade=v=>v==='A'?3:v==='B'?2:v==='C'?1:0;
  const bool=v=>v?1:0;
  const val=(x,d=0)=>Number.isFinite(+x)?+x:d;
  const abilityKnown=s=>!!s&&!((val(s.sp)===0)&&(val(s.st)===0)&&(val(s.pw)===0));
  const routeKey=r=>(r.sires||[]).join('>');

  function cmpVec(a,b){
    const n=Math.max(a.length,b.length);
    for(let i=0;i<n;i++){const d=(b[i]||0)-(a[i]||0);if(d)return d}
    return 0;
  }
  function finalVector(route,profile){
    const f=route.final||{},s=f.sireStats||{},t=f.theory||{},x=f.speedCross||{},ce=f.crossEffects||{};
    const materialSpeedSupport=bool(route.materialSpeedCross?.has);
    const finalSpeedSupport=bool(x.has);
    const magnificentSpeed=bool(t.magnificent&&finalSpeedSupport);
    const magnificentLong=bool(t.magnificent&&ce.longDistance);
    const magnificentUseful=bool(t.magnificent&&ce.anyAbility);
    const distanceTier=val(s.maxD)>=2400?2:val(s.maxD)>=2200?1:0;
    if(profile==='sp')return[val(f.sp),val(f.st),val(f.pw),magnificentSpeed,bool(t.interesting),bool(f.elaborate),grade(s.record),finalSpeedSupport];
    if(profile==='speedCross'){
      return[finalSpeedSupport,val(f.sp),val(f.st),magnificentSpeed,val(route.materialSpeedCross?.stages),val(x.count),val(x.effect),bool(f.elaborate),bool(t.interesting),val(f.pw),grade(s.record)];
    }
    if(profile==='production'){
      const multi=(route.sires||[]).length>1;
      const stableUpside=multi?(s.stable==='C'?3:s.stable==='B'?2:s.stable==='A'?1:0):0;
      const productionCrossSynergy=bool(t.magnificent&&(finalSpeedSupport||ce.longDistance));
      return[
        bool(val(f.sp)>=15&&val(f.st)>=5),
        grade(s.record),
        bool(val(f.sp)>=17&&val(f.st)>=5),
        stableUpside,
        val(f.sp),val(f.st),
        bool(finalSpeedSupport||materialSpeedSupport),val(x.count),
        grade(s.guts),val(f.pw),
        productionCrossSynergy,bool(f.elaborate),bool(t.interesting)
      ];
    }
    if(profile==='st')return[val(f.st),bool(ce.longDistance),val(f.sp),grade(s.record),distanceTier,grade(s.guts),magnificentLong,magnificentUseful,bool(t.interesting),bool(f.elaborate)];
    if(profile==='balance')return[bool(val(f.sp)>=15&&val(f.st)>=5),val(f.sp)+val(f.st),val(f.st),val(f.sp),distanceTier,bool(ce.longDistance),grade(s.record),grade(s.guts)];
    if(profile==='theory'){
      return[magnificentUseful,bool(val(f.sp)>=15&&val(f.st)>=5),val(f.sp)+val(f.st),val(f.sp),val(f.st),bool(f.elaborate),bool(t.interesting),bool(t.magnificent)];
    }
    return[];
  }
  function compareProfile(profile){return(a,b)=>cmpVec(finalVector(a,profile),finalVector(b,profile))}

  function insertTop(list,item,cmp,limit){
    if(!item)return;
    const k=routeKey(item),old=list.findIndex(x=>routeKey(x)===k);
    if(old>=0)list.splice(old,1);
    let i=0;while(i<list.length&&cmp(list[i],item)<=0)i++;
    list.splice(i,0,item);
    if(list.length>limit)list.length=limit;
  }

  function createRankedBucket(limit,vectorFn){
    const entries=[],byKey=new Map();
    return{
      push(route,k=routeKey(route)){
        if(!route)return;
        const old=byKey.get(k);
        if(old){
          const oldIndex=entries.indexOf(old);
          if(oldIndex>=0)entries.splice(oldIndex,1);
          byKey.delete(k);
        }
        const entry={route,key:k,vector:vectorFn(route)};
        let lo=0,hi=entries.length;
        while(lo<hi){
          const mid=(lo+hi)>>1;
          if(cmpVec(entries[mid].vector,entry.vector)<=0)lo=mid+1;
          else hi=mid;
        }
        if(entries.length>=limit&&lo>=limit)return;
        entries.splice(lo,0,entry);byKey.set(k,entry);
        if(entries.length>limit){
          const removed=entries.pop();
          byKey.delete(removed.key);
        }
      },
      routes(){return entries.map(x=>x.route)}
    };
  }

  function createCollector({topN=5,poolN=24}={}){
    const buckets={
      sp:createRankedBucket(poolN,r=>finalVector(r,'sp')),
      speedCross:createRankedBucket(poolN,r=>finalVector(r,'speedCross')),
      production:createRankedBucket(poolN,r=>finalVector(r,'production')),
      st:createRankedBucket(poolN,r=>finalVector(r,'st')),
      balance:createRankedBucket(poolN,r=>finalVector(r,'balance')),
      theory:createRankedBucket(poolN,r=>finalVector(r,'theory'))
    };
    let count=0;
    const routesFor=p=>buckets[p].routes();
    return{
      push(route){
        count++;
        const k=routeKey(route);
        for(const p of Object.keys(buckets)){
          if(p==='speedCross'&&!route?.final?.speedCross?.has)continue;
          if(p==='production'){
            const multi=(route?.sires||[]).length>1;
            const speedSupport=!!route?.final?.speedCross?.has||!!route?.materialSpeedCross?.has;
            if(multi&&!speedSupport)continue;
          }
          buckets[p].push(route,k);
        }
      },
      get count(){return count},
      pool(){
        const m=new Map();
        for(const p of Object.keys(buckets))for(const r of routesFor(p))m.set(routeKey(r),r);
        return[...m.values()];
      },
      finish(){
        const lists=Object.fromEntries(Object.keys(buckets).map(p=>[p,routesFor(p)]));
        return{
          count,
          profiles:{
            sp:lists.sp.slice(0,topN),
            speedCross:lists.speedCross.slice(0,topN),
            production:lists.production.slice(0,topN),
            st:lists.st.slice(0,topN),
            balance:lists.balance.slice(0,topN)
          },
          shortlists:{
            sp:[...lists.sp],speedCross:[...lists.speedCross],production:[...lists.production],st:[...lists.st],balance:[...lists.balance],theory:[...lists.theory]
          },
          pool:this.pool()
        };
      }
    };
  }

  function fourthBridgeFacts(route){
    const f=route?.final||{},s=f.sireStats||{},t=f.theory||{},ce=f.crossEffects||{};
    const multi=(route?.sires||[]).length>1;
    return{
      sp:val(f.sp),st:val(f.st),pw:val(f.pw),sum:val(f.sp)+val(f.st),
      record:grade(s.record),
      stableUpside:multi?(s.stable==='C'?3:s.stable==='B'?2:s.stable==='A'?1:0):0,
      speedSupport:bool(f.speedCross?.has||route?.materialSpeedCross?.has),
      longSupport:bool(ce.longDistance||route?.materialLongCross?.has),
      elaborate:bool(f.elaborate),magnificent:bool(t.magnificent),
      crossCount:val(f.speedCross?.count)+val(route?.materialSpeedCross?.stages)
    };
  }
  function fourthBridgeVector(route,kind){
    const x=fourthBridgeFacts(route);
    if(kind==='A')return[x.speedSupport,x.record,x.elaborate,x.magnificent,x.sum,x.st,x.sp,x.longSupport,x.crossCount,x.stableUpside];
    return[x.speedSupport,x.record,x.sum,x.elaborate,x.st,x.sp,x.longSupport,x.crossCount,x.stableUpside];
  }
  function compareFourthBridge(kind){return(a,b)=>cmpVec(fourthBridgeVector(a,kind),fourthBridgeVector(b,kind))}
  function createFourthBridgeCollector({generalN=64,speedCrossN=320,bridgeAN=0,bridgeDN=144}={}){
    const official={
      sp:createRankedBucket(generalN,r=>finalVector(r,'sp')),
      speedCross:createRankedBucket(speedCrossN,r=>finalVector(r,'speedCross')),
      production:createRankedBucket(generalN,r=>finalVector(r,'production')),
      st:createRankedBucket(generalN,r=>finalVector(r,'st')),
      balance:createRankedBucket(generalN,r=>finalVector(r,'balance')),
      theory:createRankedBucket(generalN,r=>finalVector(r,'theory'))
    };
    const bridgeA=createRankedBucket(bridgeAN,r=>fourthBridgeVector(r,'A'));
    const bridgeD=createRankedBucket(bridgeDN,r=>fourthBridgeVector(r,'D'));
    let count=0;
    const cfg={generalN,speedCrossN,bridgeAN,bridgeDN};
    return{
      push(route){
        count++;
        const k=routeKey(route);
        for(const p of Object.keys(official)){
          if(p==='speedCross'&&!route?.final?.speedCross?.has)continue;
          if(p==='production'){
            const multi=(route?.sires||[]).length>1;
            const speedSupport=!!route?.final?.speedCross?.has||!!route?.materialSpeedCross?.has;
            if(multi&&!speedSupport)continue;
          }
          official[p].push(route,k);
        }
        if(bridgeAN>0)bridgeA.push(route,k);
        if(bridgeDN>0)bridgeD.push(route,k);
      },
      get count(){return count},
      finish(){
        const lists=Object.fromEntries(Object.keys(official).map(p=>[p,official[p].routes()]));
        const a=bridgeA.routes(),d=bridgeD.routes(),m=new Map();
        for(const list of Object.values(lists))for(const r of list)m.set(routeKey(r),r);
        for(const r of a)m.set(routeKey(r),r);
        for(const r of d)m.set(routeKey(r),r);
        return{
          count,config:{...cfg},bases:[...m.values()],
          sourceCounts:Object.fromEntries(Object.entries(lists).map(([k,v])=>[k,v.length])),
          bridgeCounts:{A:a.length,D:d.length}
        };
      }
    };
  }

  function create(config={}){
    const engine=config.engine;
    if(!engine||typeof engine.evaluate!=='function'||typeof engine.deriveChild!=='function')throw Error('sale planner requires common breeding engine');
    const stallions=config.stallions||[];
    const stallionStats=config.stallionStats||[];
    const broodmares=config.broodmares||[];
    const broodmareStats=config.broodmareStats||[];
    const key=engine.key||((s)=>String(s||'').normalize('NFKC').trim().replace(/[\s・･]/g,'').toLowerCase());
    const sireMap=new Map(stallions.map(x=>[key(x.name),x]));
    const sireStatsMap=new Map(stallionStats.map(x=>[key(x.name),x]));
    const mareMap=new Map(broodmares.map(x=>[key(x.name),x]));
    const mareStatsMap=new Map(broodmareStats.map(x=>[key(x.name),x]));
    const cohort120=broodmareStats.filter(abilityKnown).filter(x=>val(x.sp)+val(x.st)>=120).map(x=>mareMap.get(key(x.name))).filter(Boolean);
    const cohort130=broodmareStats.filter(abilityKnown).filter(x=>val(x.sp)+val(x.st)>=130).map(x=>mareMap.get(key(x.name))).filter(Boolean);

    function mare(name){return mareMap.get(key(name))||null}
    function sire(name){return sireMap.get(key(name))||null}
    function statsForSire(name){return sireStatsMap.get(key(name))||null}
    function mareInfo(name){
      const record=mare(name),stats=mareStatsMap.get(key(name))||null,known=abilityKnown(stats);
      return{
        record,stats,abilityKnown:known,
        abilityStatus:known?'known':'unknown',
        spst:known?val(stats.sp)+val(stats.st):null
      };
    }
    function crossEffectSummary(pair){
      const eff=pair?.danger?.effectiveCrosses||[],factors=pair?.nitro?.factors||[];
      const fm=new Map(factors.map(x=>[key(x.name),x])),seen=new Set(),names=[];
      let short=0,speed=0,power=0,guts=0,long=0;
      for(const x of eff){
        const k=key(x.name);if(!k||seen.has(k))continue;seen.add(k);
        const f=fm.get(k);if(!f)continue;
        const sh=val(f.short),sp=val(f.speed),pw=val(f.power),gu=val(f.guts),lo=val(f.long);
        if(!sh&&!sp&&!pw&&!gu&&!lo)continue;
        short+=sh;speed+=sp;power+=pw;guts+=gu;long+=lo;names.push(x.name);
      }
      return{
        anyAbility:names.length>0,names,
        short,speed,power,guts,long,
        speedSupport:short>0||speed>0,
        longDistance:long>0,
        gutsSupport:guts>0,
        powerSupport:power>0,
        spNitroContribution:short*2+speed,
        stNitroContribution:long+guts-short,
        pwNitroContribution:power
      };
    }
    function speedCrossSummary(pair){
      const fx=crossEffectSummary(pair);
      const names=[];
      const eff=pair?.danger?.effectiveCrosses||[],factors=pair?.nitro?.factors||[];
      const fm=new Map(factors.map(x=>[key(x.name),x])),seen=new Set();
      for(const x of eff){
        const k=key(x.name);if(!k||seen.has(k))continue;seen.add(k);
        const f=fm.get(k);if(!f)continue;
        if(val(f.short)||val(f.speed))names.push(x.name);
      }
      return{has:names.length>0,count:names.length,short:fx.short,speed:fx.speed,effect:fx.spNitroContribution,names};
    }
    function compactEffectPath(items){
      const path=(items||[]).map((item,i)=>{
        const fx=item?.danger?crossEffectSummary(item):(item||{});
        return{...fx,generation:i+1};
      });
      const material=path.slice(0,-1);
      const longStages=material.filter(x=>x.longDistance);
      return{
        path,
        materialLong:{
          has:longStages.length>0,
          stages:longStages.length,
          names:[...new Set(longStages.flatMap(x=>x.names||[]))]
        }
      };
    }
    function compactCrossPath(items){
      const path=(items||[]).map((x,i)=>{
        const s=x?.danger?speedCrossSummary(x):x||{};
        return{generation:i+1,has:!!s.has,count:val(s.count),short:val(s.short),speed:val(s.speed),effect:val(s.effect),names:[...(s.names||[])]};
      });
      const material=path.slice(0,-1),active=material.filter(x=>x.has);
      return{
        path,
        material:{
          has:active.length>0,
          stages:active.length,
          count:active.reduce((n,x)=>n+x.count,0),
          short:active.reduce((n,x)=>n+x.short,0),
          speed:active.reduce((n,x)=>n+x.speed,0),
          effect:active.reduce((n,x)=>n+x.effect,0)
        }
      };
    }
    function compactFinal(pair,sireRecord){
      const n=pair.nitro||{},t=pair.theory||{},ss=statsForSire(sireRecord.name)||{};
      return{
        sp:val(n.sp),st:val(n.st),pw:val(n.pw),
        speedCross:speedCrossSummary(pair),
        crossEffects:crossEffectSummary(pair),
        theory:{interesting:!!t.interesting,magnificent:!!t.magnificent,perfect:!!t.perfect},
        elaborate:!!pair.elaborate?.effective,
        sireStats:{record:ss.record||'-',guts:ss.guts||'-',stable:ss.stable||'-',minD:val(ss.minD),maxD:val(ss.maxD),price:val(ss.price)}
      };
    }
    function routeFrom(sires,pair,method='exact',stageCrossItems=[],stageEffectItems=[]){
      const items=stageCrossItems.length?stageCrossItems:[pair];
      const effectItems=stageEffectItems.length?stageEffectItems:items;
      const crossPath=compactCrossPath(items);
      const effectPath=compactEffectPath(effectItems);
      return{
        id:sires.map(x=>key(x)).join('__'),
        sires:[...sires],
        generation:sires.length,
        method,
        final:compactFinal(pair,sire(sires[sires.length-1])||{name:sires[sires.length-1]}),
        speedCrossPath:crossPath.path,
        materialSpeedCross:crossPath.material,
        crossEffectPath:effectPath.path,
        materialLongCross:effectPath.materialLong,
        finalChild:pair.child
      };
    }
    function safe(pair){return !!pair&&!pair.danger?.kiken&&!pair.danger?.tyokiken}
    function evaluateDirectPair(mareInput,sireInput){
      const m=typeof mareInput==='string'?mare(mareInput):mareInput;
      const s=typeof sireInput==='string'?sire(sireInput):sireInput;
      if(!m||!s)return{mare:m||null,sire:s||null,pair:null,safe:false,route:null};
      const pair=engine.evaluate(s,m),ok=safe(pair);
      return{mare:m,sire:s,pair,safe:ok,route:ok?routeFrom([s.name],pair,'exact-direct',[pair]):null};
    }
    function* iterateTwoFromDirect(baseRoute){
      if(!baseRoute?.finalChild||baseRoute.sires?.length!==1)return;
      for(const s2 of stallions){
        const p2=engine.evaluate(s2,baseRoute.finalChild);if(!safe(p2)||!p2.child)continue;
        yield routeFrom(
          [...baseRoute.sires,s2.name],p2,'exact-two-generation',
          [...(baseRoute.speedCrossPath||[]),p2],
          [...(baseRoute.crossEffectPath||[]),p2]
        );
      }
    }
    function createDirectPairIndex(mareInput){
      const m=typeof mareInput==='string'?mare(mareInput):mareInput;
      if(!m)return{mare:null,entries:[],currentRoutes:[],safeCount:0,unsafeCount:0,get:()=>null};
      const entries=[],currentRoutes=[],bySire=new Map();let safeCount=0,unsafeCount=0;
      for(const s of stallions){
        const x=evaluateDirectPair(m,s);
        const pair=x.pair?{...x.pair,child:null}:null;
        const currentRoute=x.route?{...x.route,finalChild:null}:null;
        const entry={sire:s.name,sireStats:statsForSire(s.name)||null,safe:x.safe,pair,currentRoute};
        entries.push(entry);bySire.set(key(s.name),entry);
        if(currentRoute){currentRoutes.push(currentRoute);safeCount++}else unsafeCount++;
      }
      return{
        mare:m,entries,currentRoutes,safeCount,unsafeCount,
        get(sireInput){
          const name=typeof sireInput==='string'?sireInput:sireInput?.name;
          return bySire.get(key(name))||null;
        }
      };
    }

    function* iterateDirect(mareInput){
      const m=typeof mareInput==='string'?mare(mareInput):mareInput;if(!m)return;
      for(const s of stallions){
        const x=evaluateDirectPair(m,s);if(!x.route)continue;
        yield x.route;
      }
    }
    function* iterateTwo(mareInput){
      const m=typeof mareInput==='string'?mare(mareInput):mareInput;if(!m)return;
      for(const s1 of stallions){
        const x=evaluateDirectPair(m,s1);if(!x.route)continue;
        yield* iterateTwoFromDirect(x.route);
      }
    }
    function replay(mareInput,sires){
      let m=typeof mareInput==='string'?mare(mareInput):mareInput;if(!m)return null;
      const stages=[];
      for(let i=0;i<sires.length;i++){
        const s=sire(sires[i]);if(!s)return null;
        const p=engine.evaluate(s,m);if(!p)return null;
        stages.push({generation:i+1,sire:s.name,pair:p,sireStats:statsForSire(s.name)||{}});
        m=p.child;
      }
      return{stages,child:m};
    }
    function* iterateThirdPreview(mareInput,baseRoutes){
      const m=typeof mareInput==='string'?mare(mareInput):mareInput;if(!m)return;
      for(const base of baseRoutes||[]){
        if(!base?.finalChild||base.sires?.length!==2)continue;
        for(const s3 of stallions){
          const p3=engine.evaluate(s3,base.finalChild);if(!safe(p3)||!p3.child)continue;
          yield routeFrom(
            [...base.sires,s3.name],p3,'conditional-three-generation-preview',
            [...(base.speedCrossPath||[]),p3],
            [...(base.crossEffectPath||[]),p3]
          );
        }
      }
    }
    function* iterateFourthPreview(mareInput,baseRoutes){
      const m=typeof mareInput==='string'?mare(mareInput):mareInput;if(!m)return;
      for(const base of baseRoutes||[]){
        if(!base?.finalChild||base.sires?.length!==3)continue;
        for(const s4 of stallions){
          const p4=engine.evaluate(s4,base.finalChild);if(!safe(p4)||!p4.child)continue;
          yield routeFrom(
            [...base.sires,s4.name],p4,'conditional-four-generation-preview',
            [...(base.speedCrossPath||[]),p4],
            [...(base.crossEffectPath||[]),p4]
          );
        }
      }
    }
    function selectionCondition(goal,generation){
      const prefix=`${generation}代目産駒から`;
      if(goal==='arc')return prefix+'高SP・高STの牝馬だけを選抜し、2000～2400mの印・距離対応を実馬で確認して次世代へ進む。';
      if(goal==='stallion')return prefix+'能力上位の牝馬だけを残し、最終産駒を将来自家製種牡馬にした場合の血統汎用性を再計算してから次世代へ進む。';
      if(goal==='rebuild')return prefix+'起点母の能力を下回らない上位牝馬を優先し、繁殖SP/ST/PWを実測できた個体だけ次世代へ進む。';
      return prefix+'高SPを維持した能力上位牝馬だけを選抜し、実馬の能力確認後に次世代へ進む。';
    }
    function expandRoute(mareInput,route,goal='arc'){
      const r=replay(mareInput,route.sires);if(!r)return null;
      return{
        ...route,
        stages:r.stages.map((x,i)=>({
          generation:x.generation,
          sire:x.sire,
          sireStats:x.sireStats,
          nitro:x.pair.nitro,
          theory:x.pair.theory,
          elaborate:x.pair.elaborate,
          danger:x.pair.danger,
          crosses:x.pair.danger?.rawCrosses||[],
          speedCross:speedCrossSummary(x.pair),
          crossEffects:crossEffectSummary(x.pair),
          selection:i<r.stages.length-1?selectionCondition(goal,i+1):null
        }))
      };
    }
    function portfolio(child,cohort){
      const out={population:cohort.length,safe:0,sp15st5:0,sp17st5:0,interesting:0,magnificent:0,perfect:0,elaborate:0,maxSp:0,maxSt:0,maxSpSt:0};
      if(!child)return out;
      for(const m of cohort){
        const p=engine.evaluate(child,m);if(!safe(p))continue;
        out.safe++;
        const sp=val(p.nitro?.sp),st=val(p.nitro?.st);
        if(sp>=15&&st>=5)out.sp15st5++;
        if(sp>=17&&st>=5)out.sp17st5++;
        if(p.theory?.interesting)out.interesting++;
        if(p.theory?.magnificent)out.magnificent++;
        if(p.theory?.perfect)out.perfect++;
        if(p.elaborate?.effective)out.elaborate++;
        out.maxSp=Math.max(out.maxSp,sp);out.maxSt=Math.max(out.maxSt,st);out.maxSpSt=Math.max(out.maxSpSt,sp+st);
      }
      return out;
    }
    function withPortfolio(route){
      return{...route,portfolio:{spst120:portfolio(route.finalChild,cohort120),spst130:portfolio(route.finalChild,cohort130)}};
    }
    function portfolioVector(route){
      const a=route.portfolio?.spst120||{},b=route.portfolio?.spst130||{};
      return[val(a.safe),val(a.sp15st5),val(a.sp17st5),val(a.interesting),val(a.magnificent),val(a.perfect),val(a.elaborate),val(b.sp15st5),val(b.sp17st5),val(a.maxSp),val(a.maxSpSt)];
    }
    function dominates(a,b){
      const A=portfolioVector(a),B=portfolioVector(b);
      let better=false;
      for(let i=0;i<A.length;i++){if(A[i]<B[i])return false;if(A[i]>B[i])better=true}
      return better;
    }
    function portfolioPareto(routes,limit=5){
      const enriched=(routes||[]).map(withPortfolio);
      const front=enriched.filter((r,i)=>!enriched.some((x,j)=>j!==i&&dominates(x,r)));
      front.sort((a,b)=>cmpVec([
        val(a.portfolio.spst120.sp17st5),val(a.portfolio.spst120.sp15st5),val(a.portfolio.spst120.safe),
        val(a.portfolio.spst130.sp17st5),val(a.portfolio.spst130.sp15st5),val(a.portfolio.spst120.maxSpSt),val(a.portfolio.spst120.maxSp)
      ],[
        val(b.portfolio.spst120.sp17st5),val(b.portfolio.spst120.sp15st5),val(b.portfolio.spst120.safe),
        val(b.portfolio.spst130.sp17st5),val(b.portfolio.spst130.sp15st5),val(b.portfolio.spst120.maxSpSt),val(b.portfolio.spst120.maxSp)
      ]));
      return{population:enriched.length,paretoCount:front.length,routes:front.slice(0,limit)};
    }
    function diversifiedPool(collector){return collector.pool()}
    function goalOrder(goal){return GOAL_ORDER[goal]||GOAL_ORDER.arc}

    return{
      version:1,stallionCount:stallions.length,broodmareCount:broodmares.length,
      knownAbilityCount:broodmareStats.filter(abilityKnown).length,
      unknownAbilityCount:broodmareStats.filter(x=>!abilityKnown(x)).length,
      cohorts:{spst120:cohort120.length,spst130:cohort130.length},
      mare,sire,mareInfo,statsForSire,evaluateDirectPair,createDirectPairIndex,iterateDirect,iterateTwo,iterateTwoFromDirect,iterateThirdPreview,iterateFourthPreview,
      replay,expandRoute,createCollector,createFourthBridgeCollector,diversifiedPool,withPortfolio,portfolioPareto,
      profileLabels:PROFILE_LABELS,profileCriteria:PROFILE_CRITERIA,goalLabels:GOAL_LABELS,goalOrder,
      abilityKnown,routeKey,compareProfile,compareFourthBridge
    };
  }

  return{version:1,create,createCollector,abilityKnown,PROFILE_LABELS,PROFILE_CRITERIA,GOAL_LABELS,GOAL_ORDER};
});
