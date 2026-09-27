(()=>{
const V=window.APP_VERSION||'1.19.1',BUILD=window.APP_BUILD||'2026.09.27-71',db=window.db;
if(!db)return;window.APP_VERSION=V;window.APP_BUILD=BUILD;
async function boot(){
 try{
  const engine=await window.DABISTA_BREEDING_ENGINE.ready;
  const master=name=>engine?.master(name)||null;
  const horse=id=>window.getBreedHorseById?.(id)||db.horses.find(x=>x.id===id)||null;
  const horseAnc=h=>engine?.resolveHorse(h)?.ancestor||null;
  window.DABISTA_NITRO_ENGINE={
   version:3,source:'common-breeding-engine',
   calcAncestors:(a,b)=>engine.calcNitro(a,b),
   deriveChildAncestor:(sireName,sa,ma)=>engine.deriveChildAncestor(sireName,sa,ma),
   calcPairByName:(sireName,mareName)=>{
    const s=master(sireName),m=master(mareName);return s&&m?engine.calcNitro(s.ancestor,m.ancestor):null
   },
   calcPairForHorse:(sireName,horseId)=>{
    const s=master(sireName),a=horseAnc(horse(horseId));return s&&a?engine.calcNitro(s.ancestor,a):null
   }
  };
 }catch(e){window.APP_ERRORS?.push({at:new Date().toISOString(),message:'nitro-api: '+String(e)})}
}
boot();
})();
