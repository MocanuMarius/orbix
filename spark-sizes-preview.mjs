import {drawPickup} from './pickup-art.mjs?v=guardian-beat-1';
import {drawCapture} from './capture-art.mjs?v=guardian-beat-1';
import {captureMassDuration} from './tidal-light.mjs?v=guardian-beat-1';
import {sparkArtScale,sparkBodyRadius,sparkMass} from './spark-size.mjs?v=guardian-beat-1';
import {getPickupSpec,pickupContactRadius} from './pickups.mjs?v=guardian-beat-1';
import {makeWispSprite} from './companion-art.mjs?v=guardian-beat-1';
import {biomePalette} from './biome-art.mjs?v=guardian-beat-1';
import {createDepthScenery,drawDepthScenery} from './depth-scenery.mjs?v=guardian-beat-1';
import {LIGHT_PACKET_TUNING,getGlowCapacity,glowPoints,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=guardian-beat-1';
import {condenseGlow,getCondensationRules} from './condensed-glow.mjs?v=guardian-beat-1';

const examples=[
  {label:'Tiny',kind:'light',sparkMass:1},
  {label:'Cluster',kind:'cluster',sparkMass:2},
  {label:'Cache',kind:'cache',sparkMass:3},
  {label:'Giant',kind:'cache',sparkMass:10},
  {label:'Giant Dark',kind:'dark',harmful:true,sparkMass:10},
];
// The phone renderer uses 240 raster pixels per 390 world units. Keep the
// wisp sprite in the same raster scale while the pickups use world dimensions.
const raster=240/390,worldHeight=430,width=590,height=Math.round(worldHeight*raster),contact=1.65;
const wispX=width*.30/raster,wispY=height*.51/raster;
const wispSize=36*.85;

export function createSparkSizesPreview({isPaused,setPaused,reducedMotion}){
  const element=document.createElement('section');element.className='spark-size-scene';
  element.innerHTML='<div class="spark-size-picker" role="group" aria-label="Spark size"></div><canvas role="img"></canvas><div class="spark-size-summary"><p aria-live="polite"></p><button type="button">↻ Replay</button></div>';
  const options=element.querySelector('.spark-size-picker'),field=element.querySelector('canvas');
  const caption=element.querySelector('p'),replay=element.querySelector('.spark-size-summary button');
  field.width=width;field.height=height;
  const ctx=field.getContext('2d'),wisp=makeWispSprite(document,32);
  const palette=biomePalette({biomeId:'moonruins'}),layers=createDepthScenery(document,height,'ruins',palette);
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#070e17');sky.addColorStop(1,'#172831');
  let sample,effect,range,t=0,raf=0,lastWall,dirty=true;
  function choose(item){
    sample=item;t=0;lastWall=undefined;dirty=true;
    const spec=getPickupSpec(item),mass=sparkMass(item),shell=sparkBodyRadius(item,worldHeight);
    const initialScale=sparkArtScale(item,worldHeight),angle=-.16;
    range=pickupContactRadius(item,worldHeight);
    const duration=captureMassDuration(LIGHT_PACKET_TUNING.absorptionDuration,mass);
    effect={kind:item.harmful?'dark':'light',pickupKind:spec.id,phase:1.7,massTier:mass,
      style:'ribbon',duration,bornAt:contact,initialScale,shellRadius:shell,initialAngle:angle,
      captureDistance:0,capturePlayerY:wispY,startRadius:range,startX:wispX+Math.cos(angle)*range,
      startY:wispY+Math.sin(angle)*range,approachX:-102,approachY:0};
    const raw=spec.fuel,fuel=glowPoints(raw),capacity=glowPoints(getGlowCapacity());
    const stored=condenseGlow(Math.max(0,raw-capacity/GLOW_DISPLAY_SCALE),{rules:getCondensationRules()}).amount;
    caption.textContent=item.harmful
      ? `A Dark Spark dims Luminance for ${spec.dimDuration}s. The next natural fuel Spark clears one dimming effect.`
      : fuel>capacity?`Empty ${capacity}-Spark meter + ${fuel} Sparks → full meter and ${stored} Stored Sparks at base packing.`
      : `Empty ${capacity}-Spark meter + ${fuel} Sparks → ${fuel}/${capacity}.`;
    field.setAttribute('aria-label',`${item.label} ${item.harmful?'Spark':'fuel Spark'} approaches the wisp and its shell breaks on contact.`);
    Array.from(options.children).forEach((button,i)=>button.setAttribute('aria-pressed',String(examples[i]===item)));
  }
  for(const item of examples){
    const button=document.createElement('button');button.type='button';button.textContent=item.label;
    button.dataset.tone=item.harmful?'dark':'fuel';
    if(!item.harmful){const value=document.createElement('small');value.textContent='+'+glowPoints(getPickupSpec(item).fuel);button.append(value);}
    button.addEventListener('click',()=>choose(item));options.append(button);
  }
  replay.addEventListener('click',()=>{choose(sample);setPaused(false);});
  choose(examples[3]);
  function draw(){
    const age=t-contact,dist=Math.max(0,age)*102;
    ctx.imageSmoothingEnabled=false;ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    drawDepthScenery(ctx,layers,t*35,width);
    ctx.fillStyle='#08151b99';ctx.fillRect(0,0,width,height);
    const wx=wispX*raster,wy=wispY*raster;
    const glow=ctx.createRadialGradient(wx,wy,1,wx,wy,39);
    glow.addColorStop(0,'rgba(237,240,192,.43)');glow.addColorStop(.45,'rgba(234,239,192,.09)');glow.addColorStop(1,'rgba(234,239,192,0)');
    ctx.fillStyle=glow;ctx.fillRect(wx-39,wy-39,78,78);
    if(age<0){
      drawPickup(ctx,(effect.startX-age*102)*raster,effect.startY*raster,{
        kind:effect.pickupKind,time:t,phase:effect.phase,scale:raster*effect.initialScale,
        detailed:effect.massTier>=5,reducedMotion:reducedMotion()});
    }else if(age<effect.duration){
      drawCapture(ctx,effect,t,wispX,wispY,dist,raster,reducedMotion());
    }
    ctx.drawImage(wisp,Math.round(wx-wispSize/2),Math.round(wy-wispSize/2),Math.round(wispSize),Math.round(wispSize));
  }
  function frame(now){
    const playing=!isPaused();
    if(playing&&lastWall!==undefined)t=(t+Math.min(.1,(now-lastWall)/1000))%(contact+effect.duration+1);
    lastWall=now;
    if(dirty||playing){draw();dirty=false;}
    raf=requestAnimationFrame(frame);
  }
  draw();raf=requestAnimationFrame(frame);
  return {element,stop:()=>cancelAnimationFrame(raf)};
}
