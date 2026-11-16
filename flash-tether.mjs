import {drawPickup} from './pickup-art.mjs?v=storm-guide-1';

const TAU = 2 * Math.PI;
const clamp = (x, lo=0, hi=1) => Math.max(lo,Math.min(hi,x));
export const FLASH_PUFF_DURATION = .8;
export const FLASH_PULSE_INTERVAL = 2;

export function createFlashTether({x,y,playerX,playerY,time,duration,initialScale=1,phase=0,reducedMotion=false}) {
  return {x,y,px:x,py:y,vx:0,vy:0,anchorX:playerX,anchorY:playerY,
    bornAt:time,expires:time+duration,stamp:time,interval:0,initialScale,phase,reducedMotion};
}

// A damped spring trails the moving anchor. The cord also limits
// its reach if the wisp suddenly dives, changes speed or bounces off terrain.
export function stepFlashTether(t,playerX,playerY,time,dt) {
  if (time >= t.expires + FLASH_PUFF_DURATION) return false;
  if (time <= t.stamp || dt <= 0) return true;
  t.px=t.x; t.py=t.y; t.interval=dt; t.stamp=time;
  if (time >= t.expires) return true;
  const age = time - t.bornAt;
  const speedX = (playerX-t.anchorX)/dt, speedY = (playerY-t.anchorY)/dt;
  t.anchorX=playerX; t.anchorY=playerY;
  const sway = t.reducedMotion ? 0 : 5*Math.sin(3.1*age)+2*Math.sin(5.2*age+.6);
  const wantedX = playerX - 30 - clamp(speedX*.05,0,10);
  const wantedY = playerY - 11 - clamp(speedY*.10,-20,20) + sway;
  const damping = Math.exp(-11*dt);
  t.vx = (t.vx + ((wantedX-t.x)*64 + speedX*8)*dt) * damping;
  t.vy = (t.vy + ((wantedY-t.y)*64 + speedY*4)*dt) * damping;
  t.x += t.vx*dt; t.y += t.vy*dt;
  const dx=t.x-playerX, dy=t.y-playerY, reach=Math.hypot(dx,dy);
  if (reach>50) {t.x=playerX+dx*50/reach;t.y=playerY+dy*50/reach;}
  return true;
}

export function flashLightGlow(t,time) {
  if (!t || time<t.bornAt || time>=t.expires) return 0;
  return clamp((t.expires-time)/1.65);
}
export function flashLightPulse(t,time) {
  const fade=flashLightGlow(t,time);if(!fade)return 0;
  if(t.reducedMotion) return .32*fade;
  const age=time-t.bornAt;
  return (.5+.5*Math.cos(age*TAU/FLASH_PULSE_INTERVAL))**1.65 * fade;
}

function whiteMist(ctx,x,y,age,quiet) {
  const u=clamp(age/FLASH_PUFF_DURATION), alpha=ctx.globalAlpha;
  const travel=1-(1-u)**2;
  const radius=4+8*travel;
  const midY=y-(quiet?2:9)*travel;
  for(let layer=0;layer<3;layer++){
    ctx.globalAlpha=alpha*(1-u)**1.5*(.14+layer*.06);
    ctx.fillStyle='#fff';
    ctx.beginPath();
    for(let i=0;i<36;i++){
      const a=i*TAU/36;
      const fold=1+.17*Math.sin(a*3+travel*2)+.12*Math.cos(a*5-travel*1.8);
      const r=radius*(1-layer*.24)*fold;
      const px=x+Math.cos(a)*r*1.14, py=midY+Math.sin(a)*r*.81;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();
  }
  ctx.globalAlpha=alpha;
}

export function drawFlashTether(ctx,t,{time,distance,scale=1,playerX,playerY}) {
  if (!t || time>=t.expires+FLASH_PUFF_DURATION) return;
  if (time<t.bornAt) {
    // Physics has already claimed the pickup while the interpolated camera is
    // still rendering the previous instant. Keep its last field or cargo pose.
    drawPickup(ctx,(t.px-distance)*scale,t.py*scale,{kind:'sight',time,phase:t.phase,
      scale:t.initialScale*scale,reducedMotion:t.reducedMotion});
    return;
  }
  const mix=t.interval>0?clamp(1+(time-t.stamp)/t.interval):1;
  const x=t.px+(t.x-t.px)*mix-distance, y=t.py+(t.y-t.py)*mix;
  const ax=playerX-distance, ay=playerY, age=time-t.bornAt;
  const pulse=flashLightPulse(t,time);
  ctx.save();ctx.scale(scale,scale);
  const dissolving=time-t.expires;
  if(dissolving>-.18){
    const alpha=ctx.globalAlpha;
    ctx.globalAlpha=alpha*clamp(1+dissolving/.18);
    whiteMist(ctx,x,y,Math.max(0,dissolving),t.reducedMotion);
    ctx.globalAlpha=alpha;
  }
  if(dissolving>=0){
    ctx.restore();return;
  }
  const ending=clamp((t.expires-time)/.35);
  const settling=clamp(age/.45);
  const size=.49+(t.initialScale-.49)*(1-settling)**2;
  const dx=x-ax, dy=y-ay, length=Math.hypot(dx,dy);
  const alpha=ctx.globalAlpha;
  if (length>1) {
    const tension=clamp(length/50), ripple=t.reducedMotion?0:2+3*(1-tension);
    const cordAlpha=clamp(age/.18)*ending;
    ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(ax,ay);
    for(let i=1;i<=12;i++){
      const f=i/12;
      const sag=Math.sin(Math.PI*f)*((1-tension)*10+1.5);
      const wave=Math.sin(Math.PI*f)*Math.sin(TAU*f-age*5)*ripple;
      ctx.lineTo(ax+f*dx-wave*dy/length,ay+f*dy+sag+wave*dx/length);
    }
    ctx.strokeStyle='#fff';
    ctx.lineWidth=3.1;ctx.globalAlpha=alpha*.13*cordAlpha;ctx.stroke();
    ctx.lineWidth=1.25;ctx.globalAlpha=alpha*(.55+.29*pulse)*cordAlpha;ctx.stroke();
  }
  ctx.translate(x,y);
  const bank=t.reducedMotion?0:clamp(-dy/105,-.35,.35)+.10*Math.sin(age*3);
  ctx.rotate(bank);
  ctx.globalAlpha=alpha*ending;
  // The small halo and cord follow the same two-second beat as emitted fronts.
  if(pulse>0){
    const light=ctx.createRadialGradient(0,0,1,0,0,14+13*pulse);
    light.addColorStop(0,'rgba(255,255,255,.40)');light.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=light;ctx.globalAlpha=alpha*ending*(.32+.68*pulse);
    ctx.fillRect(-27,-27,54,54);ctx.globalAlpha=alpha*ending;
  }
  drawPickup(ctx,0,0,{kind:'sight',time,phase:t.phase,scale:size*(1+(.12*pulse-.08)*settling)*(.45+.55*ending),
    reducedMotion:t.reducedMotion});
  ctx.restore();
}
