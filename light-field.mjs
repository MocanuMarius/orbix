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
// Edging remains a sight effect: it does not pretend to be a pickup trigger.
const revealUnit=value=>Math.max(0,Math.min(1,Number(value)||0));
export function sceneRevealStrength(light={}){
  return Math.max(revealUnit(light.pickupReveal),revealUnit(light.edgingReveal));
}
export function lightVisibility(engine,light,x,y,playerY=engine.player.y){
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
  return 1-dark*(1-sceneRevealStrength(light));
}
