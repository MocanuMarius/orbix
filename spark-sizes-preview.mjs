import {drawPickup} from './pickup-art.mjs?v=polish-2';
import {drawCapture} from './capture-art.mjs?v=polish-2';
import {captureMassDuration} from './tidal-light.mjs?v=polish-2';
import {SPARK_TIERS,sparkArtScale,sparkBodyRadius} from './spark-size.mjs?v=polish-2';
import {getPickupSpec,pickupContactRadius} from './pickups.mjs?v=polish-2';
import {makeWispSprite} from './companion-art.mjs?v=polish-2';
import {biomePalette} from './biome-art.mjs?v=polish-2';
import {createDepthScenery,drawDepthScenery} from './depth-scenery.mjs?v=polish-2';
import {LIGHT_PACKET_TUNING,getGlowCapacity,glowPoints,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=polish-2';
import {condenseGlow,getCondensationRules} from './condensed-glow.mjs?v=polish-2';

// The phone renderer uses 240 raster pixels per 390 world units. Keep the
// wisp sprite in the same raster scale while the pickups use world dimensions.
const raster=240/390,worldHeight=430,width=590,height=Math.round(worldHeight*raster),contact=1.65;
const wispX=width*.30/raster,wispY=height*.51/raster;
const wispSize=36*.85;

export function createSparkSizesPreview({isPaused,setPaused,reducedMotion}){
  const element=document.createElement('section');element.className='spark-size-scene';
  element.innerHTML='<div class="spark-size-picker" role="group" aria-label="Spark strength"></div><canvas role="img"></canvas><div class="spark-size-summary"><p aria-live="polite"></p><button type="button" class="spark-polarity" aria-pressed="false">Dark Spark</button><button type="button" class="spark-replay">↻ Replay</button></div>';
  const options=element.querySelector('.spark-size-picker'),field=element.querySelector('canvas');
  const caption=element.querySelector('p'),replay=element.querySelector('.spark-replay'),polarity=element.querySelector('.spark-polarity');
  field.width=width;field.height=height;
  const ctx=field.getContext('2d'),wisp=makeWispSprite(document,32);
  const palette=biomePalette({biomeId:'moonruins'}),layers=createDepthScenery(document,height,'ruins',palette);
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#070e17');sky.addColorStop(1,'#172831');
  let sample,effect,range,t=0,raf=0,lastWall,dirty=true;
  function choose(tier){
    sample=tier;t=0;lastWall=undefined;dirty=true;
    const dark=polarity.getAttribute('aria-pressed')==='true',mass=tier.mass;
    const kind=dark?'dark':mass===1?'light':mass===2?'cluster':'cache';
    const item={kind,sparkMass:mass,harmful:dark};
    const spec=getPickupSpec(item),shell=sparkBodyRadius(item,worldHeight);
    const initialScale=sparkArtScale(item,worldHeight),angle=-.16;
    range=pickupContactRadius(item,worldHeight);
    const duration=captureMassDuration(LIGHT_PACKET_TUNING.absorptionDuration,mass);
    effect={kind:item.harmful?'dark':'light',pickupKind:spec.id,phase:1.7,massTier:mass,
      style:'ribbon',duration,bornAt:contact,initialScale,shellRadius:shell,initialAngle:angle,
      captureDistance:0,capturePlayerY:wispY,startRadius:range,startX:wispX+Math.cos(angle)*range,
      startY:wispY+Math.sin(angle)*range,approachX:-102,approachY:0};
    const raw=spec.fuel,fuel=glowPoints(raw),capacity=glowPoints(getGlowCapacity());
    const stored=condenseGlow(Math.max(0,raw-capacity/GLOW_DISPLAY_SCALE),{rules:getCondensationRules()}).amount;
    const outcome=dark?`Dims Luminance for ${spec.dimDuration}s.`
      : fuel>capacity?`+${fuel} Sparks fills an empty meter and packs ${stored} at base efficiency.`
      : `+${fuel} Sparks fills ${fuel}/${capacity} of an empty meter.`;
    caption.textContent=`${outcome} Same shell; arc density shows strength.`;
    field.setAttribute('aria-label',`${tier.name} ${dark?'Dark':'fuel'} Spark approaches the wisp and its shell breaks on contact.`);
    Array.from(options.children).forEach((button,i)=>button.setAttribute('aria-pressed',String(SPARK_TIERS[i]===tier)));
  }
  for(const tier of SPARK_TIERS){
    const button=document.createElement('button');button.type='button';button.textContent=tier.name;
    button.addEventListener('click',()=>choose(tier));options.append(button);
  }
  polarity.addEventListener('click',()=>{
    polarity.setAttribute('aria-pressed',String(polarity.getAttribute('aria-pressed')!=='true'));
    choose(sample);
  });
  replay.addEventListener('click',()=>{choose(sample);setPaused(false);});
  const sizeName=new URLSearchParams(location.search).get('size')?.toLowerCase();
  choose(SPARK_TIERS.find(tier=>tier.name.toLowerCase()===sizeName) ?? SPARK_TIERS.at(-1));
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
        massTier:effect.massTier,reducedMotion:reducedMotion()});
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
