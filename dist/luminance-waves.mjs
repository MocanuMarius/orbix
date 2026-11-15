import {GLOW_DISPLAY_SCALE} from './vitality.mjs?v=nature-sounds-1';
import {pickupKind,pickupShellRadius} from './pickups.mjs?v=nature-sounds-1';

export const LUMINANCE_WAVE_TUNING=Object.freeze({speed:360,interval:1,maximumWaves:48,maximumSources:16});
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,lo=0,hi=1)=>Math.max(lo,Math.min(hi,value));

/** Temporary reveal fronts; harvesting never collects ordinary Sparks or invokes pickup hooks. */
export class LuminanceWaves {
  constructor(engine){this.engine=engine;this.sources=new Map();this.waves=[];this.clock=0;this.lastCue=-Infinity;this.serial=0;}
  addSource(settings={}) {
    const id=settings.id??`wave-source-${++this.serial}`;
    let source=this.sources.get(id);
    if(!source){
      if(this.sources.size>=LUMINANCE_WAVE_TUNING.maximumSources)this.sources.delete(this.sources.keys().next().value);
      source={id,x:0,y:0,radius:145,remaining:Infinity,next:0,color:'#d9f0dc',follow:null};
      this.sources.set(id,source);
    }
    source.x=finite(settings.x,source.x);source.y=finite(settings.y,source.y);
    source.radius=Math.max(0,finite(settings.radius,source.radius));
    if(Object.hasOwn(settings,'duration'))source.remaining=Math.max(0,finite(settings.duration,0));
    if(settings.color)source.color=settings.color;
    if(Object.hasOwn(settings,'follow'))source.follow=settings.follow;
    return source;
  }
  activate(settings){return this.addSource(settings);}
  removeSource(id){this.sources.delete(id);}
  clear(){this.sources.clear();this.waves.length=0;}
  get live(){const e=this.engine;return e.running!==false&&e.alive!==false&&!e.finished&&!e.destroyed&&!e.dying&&!e.completing;}
  get dreaming(){const d=this.engine.dream;return !!d&&d.phase!=='done';}
  get state(){return {sources:this.sources.size,waves:this.waves.length,harvesting:this.live&&!this.dreaming&&!this.engine.paused,clock:this.clock};}
  getState(){return this.state;}
  update(dt) {
    const e=this.engine;
    if(!this.live){this.clear();return;}
    if(e.paused||e.tutorialAwaitingLift||!(dt>0)||!Number.isFinite(dt))return;
    this.clock+=dt;
    // Existing fronts stay anchored at emission, even when their light source moves.
    for(const wave of this.waves){wave.previous=wave.radius;wave.radius=Math.min(wave.maximum,wave.radius+dt*LUMINANCE_WAVE_TUNING.speed);wave.age+=dt;}
    for(const [id,source] of this.sources){
      let origin=source;
      if(source.follow==='wisp')origin={x:(e.distance||0)+(e.player?.x||0),y:e.player?.y||0};
      else if(source.follow==='flash'){
        if(!e.flashTether||e.time>=e.flashTether.expires){this.sources.delete(id);continue;}
        origin=e.flashTether;
      }
      const activeFor=Math.min(dt,source.remaining);
      // At most the bounded visible history is needed after an unusually long tick.
      const earliest=Math.max(0,dt-source.radius/LUMINANCE_WAVE_TUNING.speed);
      if(source.next<earliest)source.next+=Math.ceil((earliest-source.next)/LUMINANCE_WAVE_TUNING.interval)*LUMINANCE_WAVE_TUNING.interval;
      while(source.next<activeFor-1e-9 || (source.next===0&&activeFor>0)){
        if(source.radius>0){
          const age=dt-source.next;
          if(this.waves.length>=LUMINANCE_WAVE_TUNING.maximumWaves)this.waves.shift();
          this.waves.push({x:origin.x,y:origin.y,maximum:source.radius,radius:Math.min(source.radius,age*LUMINANCE_WAVE_TUNING.speed),previous:0,age,color:source.color,seen:new Set()});
        }
        source.next+=LUMINANCE_WAVE_TUNING.interval;
      }
      source.next-=dt;source.remaining-=dt;
      if(source.remaining<=0)this.sources.delete(id);
    }
    const rank=clamp(Math.floor(Number(e.mod?.resonantHarvest)||0),0,3);
    if(rank&&!this.dreaming){
      let hit=false;
      for(const wave of this.waves){
        for(const packet of e.getNearbyPickups?.()||e.layout?.embers||[]){
          if(packet.collected||packet.carried||packet.generated||packet.fetchedInDream||wave.seen.has(packet))continue;
          const kind=pickupKind(packet);
          if(kind!=='light'&&kind!=='cluster'&&kind!=='cache'&&!(kind==='dark'&&rank>=2))continue;
          // A wave touches the visible shell, without the extra player-contact
          // padding used for body pickups.
          const rim=pickupShellRadius(packet);
          const screenX=packet.x-(e.distance||0);
          if(screenX < -rim || (Number.isFinite(e.width)&&screenX>e.width+rim)
            || packet.y < -rim || (Number.isFinite(e.height)&&packet.y>e.height+rim))continue;
          if(Math.abs(packet.x-wave.x)>wave.radius+rim||Math.abs(packet.y-wave.y)>wave.radius+rim)continue;
          const distance=Math.hypot(packet.x-wave.x,packet.y-wave.y);
          if(distance-rim>wave.radius||distance+rim<wave.previous||distance-rim>wave.maximum)continue;
          wave.seen.add(packet);hit=true;
          if(kind==='dark'){
            packet.collected=true;packet.purified=true;
            e.burst?.(packet.x-(e.distance||0),packet.y,5,'#c7ead4');
          } else {
            const gain=Math.min(1/GLOW_DISPLAY_SCALE,Math.max(0,(e.maxFlame||100)-(e.flame||0)));
            e.flame=(e.flame||0)+gain;e.flameRestored=(e.flameRestored||0)+gain;
            if(rank>=3)e.resonanceStored=(e.resonanceStored||0)+1;
            e.burst?.(screenX,packet.y,3,'#c6ecf2');
          }
        }
      }
      if(hit&&this.clock-this.lastCue>=.3){this.lastCue=this.clock;e.sound?.('resonate',{strength:.45});}
    }
    for(let i=this.waves.length-1;i>=0;i--)if(this.waves[i].age>=this.waves[i].maximum/LUMINANCE_WAVE_TUNING.speed)this.waves.splice(i,1);
  }
  draw(c,view={}){drawLuminanceWaves(c,view,this);}
}

export function drawLuminanceWaves(c,{distance=0,scale=1}={},manager) {
  if(!manager?.waves?.length)return;
  c.save();
  const baseAlpha=c.globalAlpha;
  for(const wave of manager.waves){
    const progress=wave.radius/wave.maximum;
    const fade=clamp(wave.age/.12)*clamp((1-progress)/.22);
    if(fade<=0||wave.radius<=0)continue;
    const x=(wave.x-distance)*scale,y=wave.y*scale,r=wave.radius*scale;
    c.strokeStyle=wave.color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);
    // Layered strokes give a soft boundary without images, gradients or buffers.
    c.globalAlpha=baseAlpha*fade*.035;c.lineWidth=8*scale;c.stroke();
    c.globalAlpha=baseAlpha*fade*.065;c.lineWidth=4*scale;c.stroke();
    c.globalAlpha=baseAlpha*fade*.19;c.lineWidth=1.6*scale;c.stroke();
  }
  c.restore();
}
