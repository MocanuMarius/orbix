import {collectorCanFetch} from './collector-load.mjs?v=skills-cards-1';
import {getPickupSpec,pickupKind} from './pickups.mjs?v=skills-cards-1';
import {sparkBodyRadius} from './spark-size.mjs?v=skills-cards-1';

// Capability only: range, recovery and an occupied Collector do not change the
// symbol. A body-only marker never blocks ordinary manual collection.
export function pickupHandlingCue(packet,modifiers={}, {collector=false}={}){
  if(!packet||packet.collected||packet.carried)return null;
  const kind=pickupKind(packet),spec=getPickupSpec(packet);
  if(spec.dim>0||kind==='dark')return 'danger';
  if(!(spec.fuel>0)&&kind!=='sight')return null;
  return collector&&collectorCanFetch(packet,modifiers)?'collector':'body';
}

const HOOKS=Object.freeze([[-5,-3,3,1],[-5,-2,1,4],[-5,2,3,1],[3,-3,3,1],[5,-2,1,4],[3,2,3,1]]);
const BODY=Object.freeze([[-1,-3,3,1],[-2,-2,5,3],[-1,1,3,1],[-2,2,2,1],[-3,3,2,1]]);
export function drawPickupHandlingCue(c,x,y,packet,modifiers={}, {collector=false,scale=1,alpha=1}={}){
  const id=pickupHandlingCue(packet,modifiers,{collector});
  if(id!=='collector'&&id!=='body'||!(alpha>0))return id;
  const unit=Math.max(1,Math.round(scale)),cx=Math.round(x),cy=Math.round(y-sparkBodyRadius(packet)*scale-5*unit);
  const shape=id==='collector'?HOOKS:BODY,opacity=(Number.isFinite(c.globalAlpha)?c.globalAlpha:1)*Math.min(1,alpha);
  c.save();c.globalAlpha=opacity*.8;c.fillStyle='#101a23';
  for(const [px,py,w,h]of shape)c.fillRect(cx+(px-1)*unit,cy+(py-1)*unit,(w+2)*unit,(h+2)*unit);
  c.globalAlpha=opacity;c.fillStyle=id==='collector'?'#bcead5':'#f4ead5';
  for(const [px,py,w,h]of shape)c.fillRect(cx+px*unit,cy+py*unit,w*unit,h*unit);
  c.restore();return id;
}
