import {pickupHookAnchor} from './pickup-handling-cue.mjs?v=gpu-2';

const TAU=Math.PI*2;
const unit=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const u=unit(value);return u*u*(3-2*u);};

// Drawing only: the load, recovery clock and interception still use the live
// flight simulation. Every visual consumer samples this same pinned cord.
export function collectorTowPose(packet,cargoX,cargoY,homeX,homeY,scale,age,quiet=false,index=0){
  const target=Math.atan2(homeY-cargoY,homeX-cargoX);
  const turn=Math.atan2(Math.sin(target-Math.PI/2),Math.cos(target-Math.PI/2));
  const hookAngle=Math.PI/2+turn*smooth(age/.32);
  const hook=pickupHookAnchor(packet,cargoX,cargoY,scale,hookAngle);
  const length=Math.hypot(hook.x-homeX,hook.y-homeY);
  return {x:homeX,y:homeY,hookX:hook.x,hookY:hook.y,hookAngle,
    wind:quiet?0:Math.min(16,length*.27)*smooth(age/.38),
    phase:age*2.15+index*1.73,sag:Math.min(3,length*.035)};
}

export function collectorTowPoint(tether,f,out={}){
  const dx=tether.hookX-tether.x,dy=tether.hookY-tether.y,length=Math.max(.001,Math.hypot(dx,dy));
  const s=Math.sin(Math.PI*f),c=Math.cos(Math.PI*f),phase=tether.phase||0;
  const wave=.74*Math.sin(phase-f*3.1)+.26*Math.sin(phase*.61-f*5.3);
  const waveSlope=-.74*3.1*Math.cos(phase-f*3.1)-.26*5.3*Math.cos(phase*.61-f*5.3);
  // Squared envelope quiets both ends; the broad middle can sail in the wind
  // without pulling the main wisp or the eyelet off its exact anchor.
  const bend=s*s*wave*(tether.wind||0),sag=s*(tether.sag||0);
  out.x=tether.x+dx*f-dy/length*bend;
  out.y=tether.y+dy*f+dx/length*bend+sag;
  if(f===0){out.x=tether.x;out.y=tether.y;}
  if(f===1){out.x=tether.hookX;out.y=tether.hookY;}
  const slope=(2*Math.PI*s*c*wave+s*s*waveSlope)*(tether.wind||0);
  const tx=dx-dy/length*slope,ty=dy+dx/length*slope+Math.PI*c*(tether.sag||0),tangent=Math.max(.001,Math.hypot(tx,ty));
  out.nx=-ty/tangent;out.ny=tx/tangent;
  return out;
}

export function collectorTowOrbit(tether,age,quiet=false,turnsPerSecond=1.35,out={}){
  const angle=age*TAU*(quiet?.30:turnsPerSecond),along=.55+.22*Math.sin(angle*.37);
  const length=Math.hypot(tether.hookX-tether.x,tether.hookY-tether.y);
  const coil=(4+Math.min(7,length*.11))*Math.min(1,age/.2),offset=Math.cos(angle)*coil;
  collectorTowPoint(tether,along,out);
  out.x+=out.nx*offset;out.y+=out.ny*offset;
  out.depth=Math.sin(angle);
  return out;
}
