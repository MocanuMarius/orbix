import {collectorCanFetch} from './collector-load.mjs?v=finish-1';
import {getPickupSpec,pickupKind} from './pickups.mjs?v=finish-1';
import {sparkBodyRadius} from './spark-size.mjs?v=finish-1';

// Capability only: range, recovery and an occupied Collector do not change the
// circle. Body-only and harmful pickups have no attachment.
export function pickupHandlingCue(packet,modifiers={}, {collector=false}={}){
  if(!packet||packet.collected||packet.carried)return null;
  const kind=pickupKind(packet),spec=getPickupSpec(packet);
  if(spec.dim>0||kind==='dark')return 'danger';
  if(!(spec.fuel>0)&&kind!=='sight')return null;
  return collector&&collectorCanFetch(packet,modifiers)?'collector':'body';
}

// One calm open circle. At the native .615 game raster its outlined diameter
// is 8.7 pixels and its mint rim is 1.2 pixels. It emits no light of its own.
export const COLLECTOR_RING=Object.freeze({radius:5.3,rim:2,outline:3.6,gap:8.5,color:'#8bf5ad',edge:'#173e2e'});
// Shared by field art, fog visibility, direct interception and loaded towing.
export function pickupHookAnchor(packet,x=packet?.x||0,y=packet?.y||0,scale=1,angle=null){
  const reach=(sparkBodyRadius(packet)+COLLECTOR_RING.gap)*scale;
  return angle===null?{x,y:y+reach}:{x:x+Math.cos(angle)*reach,y:y+Math.sin(angle)*reach};
}
function neckParts(packet,x,y,scale,angle=null){
  const bottom=y+sparkBodyRadius(packet)*scale,top=bottom-2.5*scale,join=bottom+.9*scale;
  const end=pickupHookAnchor(packet,x,y,scale).y-COLLECTOR_RING.radius*scale;
  const parts=[[{x:x-1.6*scale,y:top},{x:x+1.6*scale,y:top},{x:x+scale,y:join},{x:x-scale,y:join}],
    [{x:x-scale,y:join},{x:x+scale,y:join},{x:x+.6*scale,y:end},{x:x-.6*scale,y:end}]];
  if(angle!==null){const a=angle-Math.PI/2,c=Math.cos(a),s=Math.sin(a);
    for(const points of parts)for(const p of points){const dx=p.x-x,dy=p.y-y;p.x=x+dx*c-dy*s;p.y=y+dx*s+dy*c;}}
  return parts;
}
export function pickupRingSvg(packet,x,y,shellColor=getPickupSpec(packet).color){
  const anchor=pickupHookAnchor(packet,x,y),ring=COLLECTOR_RING;
  const neck=neckParts(packet,x,y,1).map((points,i)=>`<path d="M${points.map(p=>`${p.x} ${p.y}`).join('L')}Z" fill="${i?'#b8ebbf':shellColor}"/>`).join('');
  return `<g data-living-attachment="collector">${neck}<circle cx="${anchor.x}" cy="${anchor.y}" r="${ring.radius}" fill="none" stroke="${ring.edge}" stroke-width="${ring.outline}"/><circle cx="${anchor.x}" cy="${anchor.y}" r="${ring.radius}" fill="none" stroke="${ring.color}" stroke-width="${ring.rim}"/></g>`;
}
export function drawPickupHandlingCue(c,x,y,packet,modifiers={}, {collector=false,scale=1,alpha=1,shellColor=getPickupSpec(packet).color,hookAngle=null}={}){
  const id=pickupHandlingCue(packet,modifiers,{collector});
  if(id!=='collector'||!(alpha>0))return id;
  const anchor=pickupHookAnchor(packet,x,y,scale,hookAngle),ring=COLLECTOR_RING;
  c.save();c.globalAlpha*=Math.min(1,alpha);c.lineCap='round';
  // The shell itself narrows into the eyelet. Its pale light transitions mint
  // at the tip; no limb grows from the approaching Collector.
  for(const [index,points] of neckParts(packet,x,y,scale,hookAngle).entries()){
    c.fillStyle=index?'#b8ebbf':shellColor;c.beginPath();
    points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();
  }
  const circle=()=>{c.beginPath();c.arc(anchor.x,anchor.y,ring.radius*scale,0,Math.PI*2);c.stroke();};
  c.strokeStyle=ring.edge;c.lineWidth=ring.outline*scale;circle();
  c.strokeStyle=ring.color;c.lineWidth=ring.rim*scale;circle();
  c.restore();return id;
}
