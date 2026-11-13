import {getPickupSpec,pickupKind,pickupContactRadius} from './pickups.mjs?v=plain-begin-1';

// Roof-heavy courses used to lose half their fuel to floor-cache placement.
// A duration floor repairs that disparity with richer lights before adding
// more objects. This is a supply budget, never a guaranteed collection reward.
export const GLOW_BUDGET_TUNING=Object.freeze({minimumFuelPerSecond:8.2,firstMapFuelPerSecond:10,easyFuelPerSecond:9,minimumSpacing:270});
export function ensureGlowBudget(layout,{duration,height,endX,clear,drafts=[],tutorial=false,difficulty=2,mapIndex=0}={}){
 if(tutorial||!Number.isFinite(duration)||!Number.isFinite(endX)||!clear)return;
 const packets=layout.embers,eligible=p=>!p.generated&&!p.harmful&&!getPickupSpec(p).dim&&getPickupSpec(p).fuel>0;
 let available=packets.filter(eligible).reduce((sum,p)=>sum+getPickupSpec(p).fuel,0);
 const rate=difficulty<=1?(mapIndex===0?GLOW_BUDGET_TUNING.firstMapFuelPerSecond:GLOW_BUDGET_TUNING.easyFuelPerSecond):GLOW_BUDGET_TUNING.minimumFuelPerSecond;
 const target=Math.ceil(duration*rate);
 const before=available;let enriched=0,added=0;
 const upgrade=packets.filter(p=>eligible(p)&&pickupKind(p)==='light'&&!p.riskChain&&!p.intro)
  .sort((a,b)=>Number(!!b.accessible)-Number(!!a.accessible)||a.x-b.x);
 for(const packet of upgrade){
  if(available>=target)break;
  if(!clear(packet.x,packet.y,pickupContactRadius('cache')+3))continue;
  available+=getPickupSpec('cache').fuel-getPickupSpec(packet).fuel;
  Object.assign(packet,{kind:'cache',value:3,fuel:true,budgetEnriched:true});enriched++;
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
 packets.sort((a,b)=>a.x-b.x);
 layout.glowBudget={target,before,available,enriched,added,shortfall:Math.max(0,target-available)};
}
