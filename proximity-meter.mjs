import {obstacleEdgeClearance} from './edging-pulse.mjs?v=clear-paths-1';
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));

export function proximityFill(pulse){
 if(!pulse||pulse.exhausted)return 0;
 if(pulse.active)return clamp(pulse.remaining/Math.max(.001,pulse.duration));
 if(pulse.regenFeedback&&pulse.regenGain>0)return 1;
 return clamp(pulse.charge);
}

// Sample three small points, at most ten times per second. The bar never
// participates in collision physics and follows interpolated render positions.
function freeSpace(e,x,y){
 if(y<20||y>e.height-20)return false;
 for(const o of e.layout?.obstacles||[]){
  const wx=e.distance+x;
  if(o.destroyed||wx+25<o.x-o.width||wx-25>o.x+o.width*2.5)continue;
  for(const dx of [-19,0,19])if(obstacleEdgeClearance(wx+dx,y,5,o,e.time,8,e.obstacleCenter(o))<7)return false;
 }
 return true;
}
export function drawProximityMeter(c,e,{scale=1}={}){
 const pulse=e.edgingPulse?.state,fill=proximityFill(pulse);
 if(fill<=0||e.dying||e.completing)return;
 const t=e.visualTime??e.time??0,y=e.renderPlayerY??e.player.y;
 if(!e._proximityPlace||t-e._proximityPlace.at>.1){
  const candidates=[[0,30],[0,-31],[-39,0]];
  const offset=candidates.find(([dx,dy])=>freeSpace(e,e.player.x+dx,y+dy))||[-39,0];
  e._proximityPlace={at:t,offset};
 }
 const [dx,dy]=e._proximityPlace.offset,charging=pulse.nearEdge&&!pulse.active;
 const shake=charging&&!e.reducedMotion?(1+fill*3):0;
 const unit=Math.max(1,Math.round(3*scale)),gap=Math.max(1,Math.round(scale)),height=Math.max(1,Math.round(3*scale));
 const x=Math.round((e.player.x+dx+Math.sin(t*97)*shake)*scale-(unit*12+gap*11)/2);
 const top=Math.round((y+dy+Math.cos(t*83)*shake*.55)*scale);
 c.save();c.globalAlpha=1;
 const lit=Math.ceil(fill*12),ink=pulse.mode==='regen'?'#a9e7ba':pulse.active?'#fff3bd':charging?'#e5c489':'#a7b497';
 for(let i=0;i<12;i++){
  const left=x+i*(unit+gap);
  c.fillStyle='#071511';c.fillRect(left-1,top-1,unit+2,height+2);
  c.fillStyle=i<lit?ink:'#34483d';c.fillRect(left,top,unit,height);
 }
 c.restore();
}
