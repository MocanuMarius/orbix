import {getPickupSpec,pickupKind,pickupContactRadius} from './pickups.mjs?v=resonance-2';
import {sparkBodyRadius} from './spark-size.mjs?v=resonance-2';

// Roof-heavy courses used to lose half their fuel to floor-cache placement.
// A duration floor repairs that disparity with richer lights before adding
// more objects. This is a supply budget, never a guaranteed collection reward.
export const GLOW_BUDGET_TUNING=Object.freeze({minimumFuelPerSecond:7.5,firstMapFuelPerSecond:11,easyFuelPerSecond:8.8,minimumSpacing:330});
export function fuelBudgetProfile(difficulty=1,mapIndex=0){
 const tier=Math.max(1,Math.min(6,Number(difficulty)||1)),progress=(tier-1)/5;
 const opening=mapIndex===0?GLOW_BUDGET_TUNING.firstMapFuelPerSecond:GLOW_BUDGET_TUNING.easyFuelPerSecond;
 return {rate:opening+(GLOW_BUDGET_TUNING.minimumFuelPerSecond-opening)*progress,spacing:(mapIndex===0?560:700)+(tier-1)*140};
}
// Trim redundant fuel after sizes and marked rewards are settled. Keep the
// local recovery lane and every authored challenge, fork and hazard supply.
export function trimSurplusFuel(layout,{speed,height,endX,opening=false,targets=[],hazards=[]}){
 const marked=new Set(targets.map(t=>t.object));
 const fuel=layout.embers.filter(p=>!p.generated&&getPickupSpec(p).fuel>0&&!getPickupSpec(p).dim);
 const protectedPacket=p=>p.intro||p.riskChain||p.forkCache||p.feature==='fork-safe-fuel'||p.blackHoleBypass||p.atlasBypass||p.challengeLandmark||marked.has(p)||p.x<speed*5||p.x>endX-speed*2||hazards.some(h=>Math.abs(p.x-h.x)<(h.influence||h.radius||60)+140);
 const removed=new Set(),wanted=Math.floor(fuel.length*.25);
 let available=fuel.reduce((n,p)=>n+getPickupSpec(p).fuel,0);
 const floor=(layout.glowBudget?.target||0)*1.2;
 const candidates=fuel.filter(p=>!protectedPacket(p)).sort((a,b)=>Number(!!b.budgetAdded)-Number(!!a.budgetAdded)||Number(!!a.accessible)-Number(!!b.accessible)||a.x-b.x);
 for(const p of candidates){
  if(removed.size>=wanted)break;
  const amount=getPickupSpec(p).fuel;if(available-amount<floor)continue;
  const nearby=fuel.filter(q=>q!==p&&!removed.has(q));
  const left=nearby.filter(q=>q.x<p.x).at(-1),right=nearby.find(q=>q.x>p.x);
  if(!left||!right||right.x-left.x>speed*(opening?4.2:4.8))continue;
  const local=nearby.filter(q=>Math.abs(q.x-p.x)<speed*3);
  if(local.reduce((n,q)=>n+Math.min(getPickupSpec(q).fuel,60),0)<80)continue;
  if(p.accessible&&!local.some(q=>q.accessible&&Math.abs(q.x-p.x)<speed*1.75&&Math.abs(q.y-p.y)<30))continue;
  removed.add(p);available-=amount;
 }
 layout.embers=layout.embers.filter(p=>!removed.has(p));
 layout.supplyTrim={removed:removed.size,available};
 if(layout.glowBudget){layout.glowBudget.available=available;layout.glowBudget.shortfall=Math.max(0,layout.glowBudget.target-available);}
}
export function ensureGlowBudget(layout,{duration,height,endX,clear,drafts=[],tutorial=false,difficulty=2,mapIndex=0,row=0}={}){
 if(tutorial||!Number.isFinite(duration)||!Number.isFinite(endX)||!clear)return;
 const packets=layout.embers,eligible=p=>!p.generated&&!p.harmful&&!getPickupSpec(p).dim&&getPickupSpec(p).fuel>0;
 // A total fuel budget alone cannot fix long gaps or wall-only pickups.
 // Accessible fuel thins gradually with ascension, never disappears at A2.
 const openingSupport=difficulty<=2&&mapIndex===0&&row<=2;
 let supplyAdded=0;
 {
  const spacing=openingSupport?480:fuelBudgetProfile(difficulty,mapIndex).spacing;
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
 const target=Math.ceil(duration*(openingSupport?Math.max(rate,12):rate));
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
 // The budget already enriches lean windows. Additional blanket enrichment
 // made well-fed routes richer again after their reserve had been met.
 const extraLayers={pickups:0,added:0,extraFuel:0};
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

// Keep the measured supply, but put more of the surplus on readable altitude
// changes as the expedition progresses. Do this after shell sizes and authored
// objectives are known: a Giant's rim or a fixed objective changes the choice.
export function shapeExpeditionSupply(layout,{mapIndex,height,speed,endX,clear,targets=[],hazards=[],drafts=[]}){
 if(!(mapIndex>0)||layout.boss)return;
 const final=mapIndex>=2;
 const mid=height*.5, mass=p=>getPickupSpec(p).fuel/getPickupSpec('light').fuel;
 const all=layout.embers,good=all.filter(p=>!p.generated&&getPickupSpec(p).fuel>0&&!getPickupSpec(p).dim);
 const inLane=p=>Math.abs(p.y-mid)-pickupContactRadius(p,height)<=height*.085;
 const lane=new Set(good.filter(inLane)),marked=new Set(targets.map(t=>t.object));
 const blocked=[...(layout.riskChains||[]).map(c=>[c.start-120,c.end+120]),
  ...(layout.flightForks||[]).map(f=>[f.approachStart-80,f.exitEnd+80]),
  ...drafts.map(d=>[d.x-d.rx-65,d.x+d.rx+65])];
 const maxInterval=speed*(final?6:5.5);
 const destinationShare=final?.36:.085, candidates=good.filter(p=>lane.has(p)&&p.accessible&&!p.pocket&&
  !p.intro&&!p.riskChain&&!p.forkCache&&!p.blackHoleBypass&&!p.atlasBypass&&!p.challengeLandmark&&!marked.has(p)&&
  p.x>speed*5 && p.x<endX-speed*2 && mass(p)<=3 && !blocked.some(([a,b])=>p.x+96>a&&p.x-96<b));
 const wanted=Math.ceil(good.filter(p=>p.accessible).length*destinationShare);
 // A low-discrepancy order distributes opportunities through the course.
 // Trying every successive site from the start would spend the whole budget in leg one.
 const order=p=>((p.x/speed)*.61803398875)%1;
 candidates.sort((a,b)=>(final?mass(b)-mass(a):0)||order(a)-order(b));
 let moved=0;
 for(const p of candidates){
  if(moved>=wanted)break;
  let left=98,right=endX,nearMass=0;
  for(const q of lane){
   if(q===p)continue;
   if(q.x<p.x)left=Math.max(left,q.x);else right=Math.min(right,q.x);
   if(Math.abs(q.x-p.x)<speed*3)nearMass+=Math.min(3,mass(q));
  }
  if(right-left>maxInterval||nearMass<3)continue;
  const r=sparkBodyRadius(p,height),sign=Math.floor(p.x/(speed*6))%2?1:-1;
  for(const side of [sign,-sign]){
   const offset=(final?.19:.16)+.016*Math.sin(p.phase||0);
   const y=mid+side*(height*offset+Math.min(r,height*.07));
   // Check both the body and the entry/exit sweep. Radius inflation spans
   // continuous space between samples, including scenery colliders.
   if(!clear(p.x,y,r+3)||hazards.some(h=>Math.abs(h.x-p.x)<(h.influence||h.radius||15)+110)||
     all.some(q=>q!==p&&Math.abs(q.x-p.x)<r+height*.25+40&&Math.hypot(q.x-p.x,q.y-y)<r+sparkBodyRadius(q,height)+(getPickupSpec(q).dim?95:8)))continue;
   let open=true;
   for(let i=-4;i<=4;i++){
    const t=Math.abs(i)/4,x=p.x+i*24,cy=y+(mid-y)*t;
    if(!clear(x,cy,29)){open=false;break;}
   }
   if(!open)continue;
   p.y=y;p.accessible=false;p.bankedSupply=true;
   lane.delete(p);moved++;break;
  }
 }
 // Some native layouts already have a long central drought before any
 // redistribution. Offer one Small Spark halfway through those rare gaps
 // when a hazard-free, body-wide landing and approach actually fit.
 const anchors=[98,...Array.from(lane,p=>p.x).sort((a,b)=>a-b),endX];
 const drought=speed*(final?7:6.5);
 let repairs=0;
 for(let i=1;i<anchors.length;i++){
  if(anchors[i]-anchors[i-1]<=drought)continue;
  const middle=(anchors[i]+anchors[i-1])*.5;
  let restored=false;
  for(const dx of [0,-60,60,-120,120]){
   const x=middle+dx;
   if(blocked.some(([a,b])=>x>=a&&x<=b)||hazards.some(h=>Math.abs(x-h.x)<(h.influence||h.radius||15)+40))continue;
   for(const y of [mid,mid-height*.05,mid+height*.05]){
    if(![-70,-35,0,35,70].every(d=>clear(x+d,y,32))||
     all.some(q=>Math.hypot(q.x-x,q.y-y)<sparkBodyRadius(q,height)+(getPickupSpec(q).dim?100:22)))continue;
    all.push({id:'course-respite:'+i,kind:'light',value:1,sparkMass:1,sparkWorldHeight:height,x,y,fuel:true,accessible:true,
      recoverySupply:true,feature:'sheltered-glow',clearance:32,collected:false,attracted:false,phase:i});
    restored=true;repairs++;break;
   }
   if(restored)break;
  }
 }
 if(repairs){
  all.sort((a,b)=>a.x-b.x);
  if(layout.glowBudget){
   layout.glowBudget.available+=getPickupSpec('light').fuel*repairs;
   layout.glowBudget.shortfall=Math.max(0,layout.glowBudget.target-layout.glowBudget.available);
  }
 }
 return moved;
}
