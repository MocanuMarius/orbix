import {shutterLightFactor} from './shutter-cone.mjs?v=guardian-beat-2';
// Radius describes the bright core. A finite inverse-square field keeps a
// faint tail at 2x radius, then reaches exact black at 3x without a hard seam.
export const LIGHT_EXTENT=3;
export function lightAttenuation(distanceSquared){
  const d2=Math.max(0,Number(distanceSquared)||0);
  if(d2>=LIGHT_EXTENT*LIGHT_EXTENT)return 0;
  const edge=1/(1+2.2*LIGHT_EXTENT*LIGHT_EXTENT);
  return Math.max(0,(1/(1+2.2*d2)-edge)/(1-edge));
}
export function createLightMaskCanvas(document){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d'),image=c.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const dx=(x+.5-64)/64,dy=(y+.5-64)/64,offset=(y*128+x)*4;
    image.data[offset]=image.data[offset+1]=image.data[offset+2]=255;
    image.data[offset+3]=Math.round(lightAttenuation((dx*dx+dy*dy)*LIGHT_EXTENT*LIGHT_EXTENT)*255);
  }
  c.putImageData(image,0,0);return canvas;
}
// Independent reveals compete by brightness, never add into a white flash.
// Edging remains a Luminance effect: it does not pretend to be a pickup trigger.
const revealUnit=value=>Math.max(0,Math.min(1,Number(value)||0));
function smoothUnit(value){
  const t=revealUnit(value);
  return t*t*(3-2*t);
}
export function flashRangeStrength(remaining){
  return smoothUnit(remaining/2);
}
export function pickupRevealHold(start,from,reducedMotion){
  return start+1.5+(from<1?(reducedMotion?.35:.12):0);
}
export function pickupRevealAt(time,start,hold,from,reducedMotion){
  if(!Number.isFinite(start)||time<start)return 0;
  if(time<=hold)return from+(1-from)*smoothUnit((time-start)/(reducedMotion?.35:.12));
  return 1-smoothUnit((time-hold)/1.2);
}
export function sceneRevealStrength(light={}){
  return Math.max(revealUnit(light.pickupReveal),revealUnit(light.edgingReveal),revealUnit(light.tetherReveal));
}
export function lightVisibility(engine,light,x,y,playerY=engine.player.y,includeShutters=true){
  const radius=Math.max(1,light.radius||145),intensity=light.intensity??1;
  const dx=x-engine.player.x,dy=y-playerY;
  let dark=1-lightAttenuation((dx*dx+dy*dy)/(radius*radius))*intensity;
  const forward=light.forwardLight;
  if(forward?.active&&forward.radius>0){
    const fx=x-(forward.screenX??forward.x),fy=y-forward.y-(playerY-engine.player.y);
    dark*=1-lightAttenuation((fx*fx+fy*fy)/(forward.radius*forward.radius))*(forward.intensity??1)*intensity;
  }
  const landmark=light.landmarkLight;
  if(landmark?.radius>0){
    const lx=x-landmark.x,ly=y-landmark.y;
    dark*=1-lightAttenuation((lx*lx+ly*ly)/(landmark.radius*landmark.radius))*(landmark.intensity??1);
  }
  const visible=1-dark*(1-sceneRevealStrength(light));
  const boss=engine.layout?.boss;
  return includeShutters&&boss?.shutters?.length ? visible*shutterLightFactor(boss,engine.distance+x,y,engine.distance+engine.player.x,playerY) : visible;
}
