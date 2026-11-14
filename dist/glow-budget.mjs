import {getPickupSpec,pickupKind,pickupContactRadius} from './pickups.mjs?v=pine-spark-2';

// Roof-heavy courses used to lose half their fuel to floor-cache placement.
// A duration floor repairs that disparity with richer lights before adding
// more objects. This is a supply budget, never a guaranteed collection reward.
export const GLOW_BUDGET_TUNING=Object.freeze({minimumFuelPerSecond:8.2,firstMapFuelPerSecond:14,easyFuelPerSecond:11,minimumSpacing:270});
export function fuelBudgetProfile(difficulty=1,mapIndex=0){
 const tier=Math.max(1,Math.min(6,Number(difficulty)||1)),progress=(tier-1)/5;
 const opening=mapIndex===0?GLOW_BUDGET_TUNING.firstMapFuelPerSecond:GLOW_BUDGET_TUNING.easyFuelPerSecond;
 return {rate:opening+(GLOW_BUDGET_TUNING.minimumFuelPerSecond-opening)*progress,spacing:(mapIndex===0?460:580)+(tier-1)*140};
}
export function ensureGlowBudget(layout,{duration,height,endX,clear,drafts=[],tutorial=false,difficulty=2,mapIndex=0,row=0}={}){
 if(tutorial||!Number.isFinite(duration)||!Number.isFinite(endX)||!clear)return;
 const packets=layout.embers,eligible=p=>!p.generated&&!p.harmful&&!getPickupSpec(p).dim&&getPickupSpec(p).fuel>0;
 // A total fuel budget alone cannot fix long gaps or wall-only pickups.
 // Accessible fuel thins gradually with ascension, never disappears at A2.
 const openingSupport=difficulty<=2&&mapIndex===0&&row<=2;
 let supplyAdded=0;
 {
  const spacing=openingSupport?360:fuelBudgetProfile(difficulty,mapIndex).spacing;
  for(let anchor=420;anchor<endX-150;anchor+=spacing){
   let placed=false;
   for(const offset of [0,70,-70,140,-140]){
    const x=anchor+offset;if(x<300||x>endX-100)continue;
    if((layout.riskChains||[]).some(chain=>x>chain.start-100&&x<chain.end+100))continue;
    if(drafts.some(zone=>Math.abs(x-zone.x)<zone.rx+35))continue;
    for(const fraction of [.50,.46,.54,.42,.58,.38,.62]){
     const y=height*fraction;
     if(!clear(x,y,38)||packets.some(p=>getPickupSpec(p).dim>0&&Math.hypot(p.x-x,p.y-y)<150))continue;
     const nearby=packets.find(p=>eligible(p)&&Math.abs(p.x-x)<160&&Math.abs(p.y-y)<55&&clear(p.x,p.y,38));
     if(nearby){if(getPickupSpec(nearby).fuel<40)Object.assign(nearby,{kind:'cluster',value:2,accessible:true});placed=true;break;}
     packets.push({id:`ascent-supply:${supplyAdded++}`,kind:'cluster',value:2,x,y,fuel:true,accessible:true,
      feature:'sheltered-glow',clearance:38,collected:false,attracted:false,phase:anchor*.01});placed=true;break;
    }
    if(placed)break;
   }
  }
 }
 let available=packets.filter(eligible).reduce((sum,p)=>sum+getPickupSpec(p).fuel,0);
 const {rate}=fuelBudgetProfile(difficulty,mapIndex);
 const target=Math.ceil(duration*(openingSupport?Math.max(rate,16):rate));
 const before=available;let enriched=0,added=0;
 const upgrade=packets.filter(p=>eligible(p)&&pickupKind(p)==='light'&&!p.riskChain&&!p.intro)
  .sort((a,b)=>Number(!!b.accessible)-Number(!!a.accessible)||a.x-b.x);
 const span=Math.max(600,(endX-300)/duration*6);
 const localFuel=x=>packets.reduce((sum,p)=>sum+(eligible(p)&&Math.abs(p.x-x)<span/2?getPickupSpec(p).fuel:0),0);
 const upgradeable=upgrade.filter(p=>clear(p.x,p.y,pickupContactRadius('cache')+3));
 while(available<target&&upgradeable.length){
  // Enrich the weakest upcoming six-second pocket, not the start of the map.
  upgradeable.sort((a,b)=>localFuel(a.x)-localFuel(b.x)||Number(!!b.accessible)-Number(!!a.accessible)||a.x-b.x);
  const packet=upgradeable[0],fuel=getPickupSpec(packet).fuel;
  Object.assign(packet,{kind:fuel<40?'cluster':'cache',value:fuel<40?2:3,fuel:true,budgetEnriched:true});
  available+=20;enriched++;if(fuel>=40)upgradeable.shift();
 }
 // Prefer broad spaces between existing lights. These candidates are spread
 // through the actual course; none can extend the grounded finishing distance.
 const candidates=[];
 for(let x=760;x<endX-130;x+=95){
  if((layout.riskChains||[]).some(chain=>x>chain.start-150&&x<chain.end+150))continue;
  if(drafts.some(zone=>Math.abs(x-zone.x)<zone.rx+55))continue;
  const hard=(layout.sections||[]).some(s=>s.hard&&x>s.start-60&&x<s.end+60);
  let gap=Infinity;for(const p of packets)if(eligible(p))gap=Math.min(gap,Math.abs(p.x-x));
  if(gap<GLOW_BUDGET_TUNING.minimumSpacing)continue;
  candidates.push({x,gap,hard});
 }
 // A boss can label most of its course hard. Prefer quiet stretches, then
 // use body-clear pockets inside those sections instead of starving the map.
 candidates.sort((a,b)=>Number(a.hard)-Number(b.hard)||b.gap-a.gap||a.x-b.x);
 const maxAdded=Math.ceil(duration/4);
 for(const candidate of candidates){
  if(available>=target||added>=maxAdded)break;
  const x=candidate.x;
  if(packets.some(p=>eligible(p)&&Math.abs(p.x-x)<GLOW_BUDGET_TUNING.minimumSpacing))continue;
  for(const fraction of [.50,.46,.54,.40,.60,.34,.66]){
   const y=height*fraction;
   if(packets.some(p=>getPickupSpec(p).dim>0&&Math.hypot(p.x-x,p.y-y)<150))continue;
   if(!clear(x,y,35))continue;
   const kind=target-available>30?'cache':'light';
   packets.push({id:`glow-budget:${added}`,kind,value:kind==='cache'?3:1,x,y,fuel:true,
    accessible:true,budgetAdded:true,feature:'sheltered-glow',clearance:35,collected:false,attracted:false,phase:added*1.7});
   available+=getPickupSpec(kind).fuel;added++;break;
  }
 }
 const sequence=balanceSparkSequence(layout,{duration,endX,clear});
 const extraLayers=enrichSparkLayers(layout,{clear,duration,endX});
 // Keep the safe route dependable even after sequence redistribution. The
 // starter Collector cannot bridge a lean run of one-ring packets on its own.
 if(openingSupport)for(const packet of packets){
  if(packet.accessible&&!packet.riskChain&&!packet.intro&&eligible(packet)&&pickupKind(packet)==='light')
   Object.assign(packet,{kind:'cluster',value:2});
 }
 available=packets.filter(eligible).reduce((sum,p)=>sum+getPickupSpec(p).fuel,0);
 packets.sort((a,b)=>a.x-b.x);
 layout.glowBudget={target,before,available,enriched,added,supplyAdded,sequence,extraLayers,shortfall:Math.max(0,target-available)};
}

// Transfer whole ring units between existing safe pickups: no extra objects,
// no bonus currency, and authored risk/reward chains keep their composition.
export function balanceSparkSequence(layout,{duration,endX,clear}={}){
 const span=Math.max(600,(endX-300)/Math.max(1,duration)*6),all=layout.embers||[];
 const usable=p=>!p.generated&&!p.harmful&&!p.riskChain&&!p.intro&&['light','cluster','cache'].includes(pickupKind(p));
 const candidates=all.filter(usable),local=x=>all.reduce((n,p)=>n+(getPickupSpec(p).fuel>0&&!getPickupSpec(p).dim&&Math.abs(p.x-x)<span/2?getPickupSpec(p).fuel:0),0);
 const total=()=>all.reduce((n,p)=>n+getPickupSpec(p).fuel,0),before=total();let transfers=0;
 const receivers=candidates.filter(p=>clear(p.x,p.y,pickupContactRadius('cache')+3));
 for(let step=0;step<Math.min(180,candidates.length*2);step++){
  const low=receivers.filter(p=>getPickupSpec(p).fuel<60).sort((a,b)=>local(a.x)-local(b.x)||Number(!!b.accessible)-Number(!!a.accessible)||a.x-b.x)[0];
  if(!low)break;
  const high=candidates.filter(p=>getPickupSpec(p).fuel>20&&Math.abs(p.x-low.x)>span).sort((a,b)=>local(b.x)-local(a.x)||a.x-b.x)[0];
  if(!high||local(high.x)-local(low.x)<60)break;
  const give=getPickupSpec(high).fuel-20,take=getPickupSpec(low).fuel+20;
  Object.assign(high,{kind:give===20?'light':'cluster',value:give/20,sequenceBalanced:true});
  Object.assign(low,{kind:take===40?'cluster':'cache',value:take/20,sequenceBalanced:true});transfers++;
 }
 return {transfers,windowSeconds:6,before,after:total()};
}

// Add one ring to a quarter of ordinary fuel pickups, favouring lean windows.
// Keep the three-ring ceiling and authored mixed-risk chains intact.
export function enrichSparkLayers(layout,{clear,duration=100,endX=15000}={}){
 const all=layout.embers||[],ordinary=all.filter(p=>!p.generated&&!p.harmful&&!p.riskChain&&!p.intro&&['light','cluster','cache'].includes(pickupKind(p)));
 const candidates=ordinary.filter(p=>getPickupSpec(p).fuel<60&&clear(p.x,p.y,pickupContactRadius('cache')+3));
 const span=Math.max(600,(endX-300)/duration*6),local=x=>ordinary.reduce((n,p)=>n+(Math.abs(p.x-x)<span/2?getPickupSpec(p).fuel:0),0);
 const target=Math.ceil(ordinary.length*.25);let added=0;
 while(candidates.length&&added<target){
  candidates.sort((a,b)=>local(a.x)-local(b.x)||getPickupSpec(a).fuel-getPickupSpec(b).fuel||a.x-b.x);
  const p=candidates.shift(),fuel=getPickupSpec(p).fuel+20;
  Object.assign(p,{kind:fuel===40?'cluster':'cache',value:fuel/20,extraEnergyLayer:true});added++;
 }
 return {pickups:ordinary.length,added,extraFuel:added*20};
}
