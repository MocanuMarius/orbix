import {getPickupSpec,pickupDisposition} from './pickups.mjs?v=dream-paths-1';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
// Match the cached finite-emitter masks, without reading canvas pixels.
function emitter(dx,dy,rx,ry){
  const r2=(dx/rx)**2+(dy/ry)**2;
  return r2>=1?0:1-Math.exp(-.75*(1/(r2+.0324)-1/1.0324));
}
function visibility(x,y,e,light,playerY){
  const radius=light.radius||175,intensity=light.intensity??1,dx=x-e.player.x;
  let dark=1-emitter(dx,y-playerY,radius*(dx>0?2:1),radius)*intensity;
  const h=light.horizon;
  if(h)dark*=1-emitter(x-h.x,y-h.y,h.radiusX,h.radiusY)*h.strength*intensity;
  const f=light.forwardLight;
  if(f?.active)dark*=1-emitter(x-(f.screenX??f.x),y-f.y,f.radius,f.radius)*(f.intensity??1)*intensity;
  return 1-dark*(1-(light.pickupReveal||0));
}

export function glowSenseCues(e,{distance=e.renderDistance??e.distance,playerY=e.renderPlayerY??e.player.y,light=e.getLightState?.()||{}}={}){
  if(!e.mod?.glowSense||e.dying||e.completionProgress>0)return [];
  const cues=[],right=e.width-12,far=e.width+240,radius=light.radius||175;
  // getNearbyPickups already maintains a short, sorted window of the map.
  for(const packet of e.getNearbyPickups()){
    const x=packet.x-distance;
    if(x>far)break;
    if(x<=e.player.x+60||packet.collected||packet.carried||packet.generated||pickupDisposition(packet)!=='boon')continue;
    const lit=smooth((visibility(x,packet.y,e,light,playerY)-.12)/.43);
    // Fade across the screen edge too: an already-lit offscreen packet should
    // not make its cue disappear in one frame as its centre enters the view.
    const hidden=1-lit*(1-smooth((x-(e.width-20))/50));
    const strength=hidden*smooth((far-x)/90);
    if(strength<.04)continue;
    // Preserve exact height through most of the light field; clamp only very
    // high/low packets to its rim so the signal stays attached to the darkness.
    const y=clamp(packet.y,Math.max(24,playerY-radius*.72),Math.min(e.height-24,playerY+radius*.72));
    if(cues.some(c=>Math.abs(c.y-y)<28))continue;
    let edge=right;
    while(edge>e.player.x+24&&visibility(edge,y,e,light,playerY)<.28)edge-=8;
    if(edge<right){
      let lo=edge,hi=Math.min(right,edge+8);
      for(let i=0;i<4;i++){const mid=(lo+hi)/2;if(visibility(mid,y,e,light,playerY)>=.28)lo=mid;else hi=mid;}
      edge=(lo+hi)/2;
    }
    // Never place an advance cue beyond the pickup it describes.
    edge=Math.min(edge,x-16);
    cues.push({x:edge,y,strength,color:getPickupSpec(packet).color});
    if(cues.length===3)break;
  }
  return cues;
}

export function drawGlowSense(c,e,{scale=1,...options}={}){
  const cues=glowSenseCues(e,options);if(!cues.length)return;
  c.save();c.globalCompositeOperation='screen';
  const time=e.visualTime??e.time;
  for(let i=0;i<cues.length;i++){
    const cue=cues[i],x=Math.round(cue.x*scale),y=Math.round(cue.y*scale);
    const breath=e.reducedMotion?1:.87+.13*Math.sin(time*2.4+i*1.7);
    const a=cue.strength*breath;
    c.fillStyle=cue.color;
    // Small stepped radiance: no collectible ring, text, arrow or new light pass.
    for(const [w,h,opacity] of [[22,34,.025],[16,26,.045],[10,18,.075],[6,10,.11]]){
      const rw=Math.max(1,Math.round(w*scale)),rh=Math.max(1,Math.round(h*scale));
      const side=Math.max(1,Math.floor(rw/4)),inset=Math.max(1,Math.floor(rh/5));
      const left=x-Math.floor(rw/2),top=y-Math.floor(rh/2);
      c.globalAlpha=a*opacity;c.fillRect(left+side,top,Math.max(1,rw-side*2),rh);
      c.fillRect(left,top+inset,side,rh-inset*2);c.fillRect(left+rw-side,top+inset,side,rh-inset*2);
    }
    c.globalAlpha=a*.28;c.fillRect(x,y-1,1,3);
  }
  c.restore();
}
