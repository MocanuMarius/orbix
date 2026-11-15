import {drawAbsorbingSpark} from './tidal-light.mjs?v=skills-cards-1';
import {getPickupSpec, pickupShellRadius} from './pickups.mjs?v=skills-cards-1';
import {drawPickup} from './pickup-art.mjs?v=skills-cards-1';
import {drawShellArcs} from './shell-arcs.mjs?v=skills-cards-1';
import {drawFluidCapture} from './fluid-capture.mjs?v=skills-cards-1';
import {DEFAULT_CAPTURE_STYLE} from './capture-styles.mjs?v=skills-cards-1';

const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));

// Broken arcs merge into an irregular, translucent cloud at the capture site.
// Sample its two outlines together so the puff reads as one volume.
const maxPuffSegments = 96;
const hazeX = new Float32Array(maxPuffSegments);
const hazeY = new Float32Array(maxPuffSegments);
const outer = new Float32Array(maxPuffSegments);
const inner = new Float32Array(maxPuffSegments);

export function drawCarriedSpark(ctx,state,time,scale,quiet,style=DEFAULT_CAPTURE_STYLE) {
  const pose=state.cargoPose;
  if(!pose)return;
  const age=pose.age ?? 0;
  const x=(state.x+pose.offsetX)*scale, y=(state.y+pose.offsetY)*scale;
  if(style!=='hybrid'||age<0||pose.compacting){
    drawPickup(ctx,x,y,{kind:state.cargoKind,time,phase:state.cargoPhase,
      scale:pose.scale*scale,massTier:pose.massTier,bodyOnly:age>=0,reducedMotion:quiet});
    return;
  }
  const radius=pickupShellRadius(state.cargoKind)*pose.scale*scale;
  drawFluidCapture(ctx,{x,y,radius,sourceRadius:radius*.5,bodyRadius:6*scale,
    age:.12+.16*clamp(age/.4),angle:Math.atan2(state.y-state.homeY,state.x-state.homeX),
    spin:(state.depth||0)<0?-1:1,phase:state.cargoPhase||0,style:'hybrid',quiet});
}

export function drawShellPuff(ctx,x,y,radius,age,kind,phase=0,quiet=false) {
  if (age < 0 || age >= 1) return;
  const fade = (1-age)**1.18, swell = 1-(1-age)**2;
  const shape = phase + age*(quiet ? .12 : .46);
  const segments=Math.min(maxPuffSegments,Math.max(36,Math.ceil(radius*.8)));
  y -= radius*.28*swell;
  for(let i=0;i<segments;i++) {
    const angle=i*TAU/segments;
    const folds=.55*Math.sin(3*angle+shape)+.28*Math.cos(5*angle-shape)+.17*Math.sin(8*angle+shape);
    const curling=.5+.5*Math.cos(2*angle-shape);
    const mid=.86+swell*(.37+.16*folds)+folds*.09;
    const thickness=.10+.16*curling+.09*folds+.16*swell;
    hazeX[i]=Math.cos(angle)*radius;
    hazeY[i]=Math.sin(angle)*radius;
    outer[i]=mid+thickness;
    inner[i]=mid-thickness;
  }
  ctx.save();
  const alpha=ctx.globalAlpha;
  ctx.fillStyle=getPickupSpec(kind).color;
  for(let layer=0;layer<3;layer++) {
    const inset=layer*.12;
    ctx.globalAlpha=alpha*fade*(.11+.025*layer);
    ctx.beginPath();
    for(let i=0;i<segments;i++){
      const rr=outer[i]-inset;
      const px=x+hazeX[i]*rr,py=y+hazeY[i]*rr;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();
    for(let i=segments-1;i>=0;i--){
      const rr=Math.min(outer[i]-inset,inner[i]+inset);
      const px=x+hazeX[i]*rr,py=y+hazeY[i]*rr;
      if(i===segments-1)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.fill();
  }
  if(age<.18) {
    ctx.globalAlpha=alpha*(1-age/.18)*.68;
    ctx.lineWidth=Math.max(.75,Math.min(2,radius*.10)*(1-age/.18));
    ctx.strokeStyle=ctx.fillStyle;
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const angle=phase+TAU*i/6,rr=radius*(1+.25*age/.18);
      ctx.moveTo(x+rr*Math.cos(angle),y+rr*Math.sin(angle));
      ctx.arc(x,y,rr,angle,angle+.53*(1-age/.18));
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCapture(context,effect,time,playerX,playerY,distance,scale,quiet,wispRadius) {
  const age=(time-effect.bornAt)/effect.duration;
  if(age>=1)return;
  const angle=effect.initialAngle||0, radius=effect.startRadius||0;
  const size=effect.initialScale??(effect.tiny?.62:1);
  const sourceX=(effect.startX??(playerX+Math.cos(angle)*radius))+(effect.captureDistance??distance)-distance;
  const sourceY=effect.startY??((effect.capturePlayerY??playerY)+Math.sin(angle)*radius);
  const delivery=effect.delivery;
  if(age<0) {
    const from=delivery ? clamp((effect.bornAt-time)/delivery.interval) : 0;
    const x=sourceX+(delivery ? (delivery.previousWorldX-delivery.worldX)*from : 0);
    const y=sourceY+(delivery ? (delivery.previousY-delivery.y)*from : 0);
    drawPickup(context,x*scale,y*scale,{kind:effect.pickupKind,time,phase:effect.phase,
      scale:size*scale,massTier:effect.massTier,reducedMotion:quiet,bodyOnly:Boolean(delivery)});
    return;
  }
  if(!delivery){
    drawShellPuff(context,sourceX*scale,sourceY*scale,
      (effect.shellRadius??(pickupShellRadius(effect.pickupKind)*size))*scale,time-effect.bornAt,effect.pickupKind,effect.phase,quiet);
    drawShellArcs(context,playerX*scale,playerY*scale,scale,time-effect.bornAt,effect.pickupKind,effect.phase,quiet,wispRadius);
  }
  // Let the rear follow the field briefly. Keep it on the contact side: a
  // fast pass can move the empty shell well behind the wisp in half a second.
  const carriedX=playerX+Math.cos(angle)*radius;
  const carriedY=playerY+Math.sin(angle)*radius;
  const elapsed=time-effect.bornAt;
  const cargoTime=delivery ? elapsed/delivery.interval : 0;
  const driftX=sourceX-carriedX+(delivery ? (delivery.worldX-delivery.previousWorldX)*cargoTime : 0);
  const driftY=sourceY-carriedY+(delivery ? (delivery.y-delivery.previousY)*cargoTime : 0);
  const limit=radius*.24;
  const release=clamp(age/.4);
  const driftLimit=limit>0 ? limit/(limit+Math.hypot(driftX,driftY)) : 0;
  const weight=driftLimit*(1-release*release*(3-2*release));
  const x=carriedX+driftX*weight, y=carriedY+driftY*weight;
  drawAbsorbingSpark(context,effect,age,playerX*scale,playerY*scale,scale,quiet,x*scale,y*scale,wispRadius);
}
