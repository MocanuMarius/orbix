import {collectorCanFetch} from './collector-load.mjs?v=skills-cards-2';
import {getPickupSpec,pickupKind} from './pickups.mjs?v=skills-cards-2';
import {sparkBodyRadius} from './spark-size.mjs?v=skills-cards-2';
import {drawLivingStrand,livingStrandPath} from './living-light-art.mjs?v=skills-cards-2';

// Capability only: range, recovery and an occupied Collector do not change the
// curl. Body-only and harmful pickups grow no attachment.
export function pickupHandlingCue(packet,modifiers={}, {collector=false}={}){
  if(!packet||packet.collected||packet.carried)return null;
  const kind=pickupKind(packet),spec=getPickupSpec(packet);
  if(spec.dim>0||kind==='dark')return 'danger';
  if(!(spec.fuel>0)&&kind!=='sight')return null;
  return collector&&collectorCanFetch(packet,modifiers)?'collector':'body';
}

// This one attachment point is shared by art, visibility and physical towing.
export function pickupHookAnchor(packet,x=packet?.x||0,y=packet?.y||0,scale=1){
  return {x,y:y+(sparkBodyRadius(packet)+3)*scale};
}
function curlPoints(packet,x,y,scale,sway=0){
  const radius=sparkBodyRadius(packet)*scale;
  return [{x:x+1.35*scale,y:y+radius-2.2*scale},
    {x:x+4.6*scale+sway,y:y+radius+4.9*scale},
    {x:x-3.4*scale+sway,y:y+radius+6.0*scale},
    {x:x-2.1*scale,y:y+radius+1.9*scale}];
}
export function pickupCurlSvg(packet,x,y,color=getPickupSpec(packet).color){
  return `<path data-living-attachment="collector" d="${livingStrandPath(curlPoints(packet,x,y,1),2.6)}" fill="${color}" opacity=".86"/>`;
}
export function drawPickupHandlingCue(c,x,y,packet,modifiers={}, {collector=false,scale=1,alpha=1,time=0,phase=0,reducedMotion=false,color=getPickupSpec(packet).color}={}){
  const id=pickupHandlingCue(packet,modifiers,{collector});
  if(id!=='collector'||!(alpha>0))return id;
  const sway=reducedMotion?0:Math.sin(time*1.7+phase)*.25*scale;
  // Root inside the membrane; its lower turn encloses the unchanged physical
  // attachment. The same pickup phase, scale and alpha paint body and foot.
  drawLivingStrand(c,curlPoints(packet,x,y,scale,sway),
    {width:2.6*scale,color,alpha:Math.min(1,alpha)*.86});
  return id;
}
