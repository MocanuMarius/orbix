import {drawShutterWake,shutterLightFactor,shutterWakeAt} from './shutter-cone.mjs?v=stops-2';
import {lanternField} from './lantern-layout.mjs?v=stops-2';
import { LIGHT_EXTENT, lightAttenuation } from './light-attenuation.mjs?v=stops-2';
import {luminanceWaveVisibility} from './luminance-waves.mjs?v=stops-2';
export { LIGHT_EXTENT, lightAttenuation };
const reflectedLight = .6;

// Lift a little of the ordinary fog where the body intercepts a dark beam,
// revealing the rock texture already drawn underneath.
export function revealLanternWake(fog,engine,options) {
  if (!lanternField(engine.layout)?.shutters?.length) return;
  fog.save();
  fog.globalAlpha = reflectedLight;
  fog.globalCompositeOperation = 'destination-out';
  drawShutterWake(fog,engine,options);
  fog.restore();
}
// This light is for drawing only. Rehearsal still simulates the same draft,
// pickup and companion interactions as the live flight.
const dreamLight=Object.freeze({rehearsing:true,intensity:1,radius:145,baseRadius:145});
export function renderLightState(engine){
  return engine.dream?.mode==='record'?dreamLight:engine.getLightState?.()||engine.light||{};
}
// Companions retain a close glow. Their fast orbit must not act as a second
// broad searchlight sweeping the terrain beneath the main steady source.
export function companionTerrainLight(orb,dim=1,intensity=1){
  const collector=orb.role==='collector',recovery=Math.max(0,Math.min(1,orb.recovery??1));
  return {radius:(collector?orb.phase==='cooldown'?8+recovery*3:12:9)*dim,
    alpha:intensity*(collector?.3:.22)};
}
export function lightDreamScenery(ctx,width,height){
  ctx.save();
  ctx.globalCompositeOperation='color';ctx.globalAlpha=.84;ctx.fillStyle='#e4b85b';
  ctx.fillRect(0,0,width,height);
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=.22;ctx.fillStyle='#c49647';
  ctx.fillRect(0,0,width,height);
  ctx.restore();
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

// A loose Flare prism lights nearby rock as it comes into view. Use the
// existing fog mask so its white core and the scenery share a soft falloff.
export function castFlashPropLight(ctx,mask,x,y,scale,visibility,time=0,reducedMotion=false){
  if(visibility<=0)return;
  const reach=78*scale;
  const breath=reducedMotion?.92:.89+.09*Math.sin(time*2.6);
  const previousAlpha=ctx.globalAlpha;
  ctx.globalAlpha=(1-(1-Math.min(1,visibility))**4)*breath;
  ctx.drawImage(mask,x-reach,y-reach,2*reach,2*reach);
  ctx.globalAlpha=previousAlpha;
}

export function castFlightFlashLights(ctx,mask,engine,light,scale,distance,playerY){
  for(const prop of engine.flashProps||[]){
    if(prop.collected||prop.carried)continue;
    const x=prop.x-distance;
    if(x< -78||x>engine.width+78)continue;
    const visible=lightVisibility(engine,light,x,prop.y,playerY);
    castFlashPropLight(ctx,mask,x*scale,prop.y*scale,scale,visible,
      (engine.visualTime??engine.time??0)+(prop.phase||0),engine.reducedMotion);
  }
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
  if(light.rehearsing)return 1;
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
  const boss=lanternField(engine.layout);
  const wave=engine.luminanceWaves?.revealCount?luminanceWaveVisibility(engine.luminanceWaves,(engine.renderDistance??engine.distance??0)+x,y):0;
  // Match the fog mask's destination-out light: the passing boundary removes
  // a fraction of the darkness left by steady light, then fades away entirely.
  const ambient=1-dark*(1-sceneRevealStrength(light))*(1-wave);
  if (!boss?.shutters?.length) return ambient;
  const worldX=engine.distance+x, playerX=engine.distance+engine.player.x;
  const wake=shutterWakeAt(boss,worldX,y,playerX,playerY,engine.player.radius,light);
  const visible=ambient+(1-ambient)*reflectedLight*wake;
  return includeShutters ? visible*shutterLightFactor(boss,worldX,y,playerX,playerY,light,engine.player.radius) : visible;
}
