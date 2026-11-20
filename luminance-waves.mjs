import {GLOW_DISPLAY_SCALE} from './vitality.mjs?v=ring-1';
import {pickupKind,pickupShellRadius,isFuelPickup} from './pickups.mjs?v=ring-1';

export const LUMINANCE_WAVE_TUNING=Object.freeze({speed:640,interval:1,maximumWaves:48,maximumSources:16});
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
// Pulses that card effects hear (a Flare, a card or Inscription sending one) outrun the wisp and reach about the visible
// width ahead of it, so a ring meets Sparks before the player or the Collector takes them. Other light stays as asked.
const PULSE_SOURCE_KINDS=new Set(['pickup','card']);
// Reach = the far corner of the screen ahead of the wisp (visible width ahead, full height), never a Spark beyond the screen.
export function pulseReach(engine){return Math.max(240,Math.hypot(finite(engine?.width,390)-finite(engine?.player?.x,0),finite(engine?.height,620)));}
const clamp=(value,lo=0,hi=1)=>Math.max(lo,Math.min(hi,value));
export const REVEAL_BANDS=Object.freeze([[64,.18],[44,.26],[22,.42]]);

// Contact is the expanding boundary reaching the visible pickup shell, never
// membership in the illuminated disc. Return its entry radius for event order.
export function luminanceWaveCrossing(wave,packet){
  const rim=pickupShellRadius(packet),distance=Math.hypot(packet.x-wave.x,packet.y-wave.y);
  const entry=Math.max(0,distance-rim);
  return entry<=wave.maximum&&entry<=wave.radius&&distance+rim>=wave.previous
    ?Math.max(wave.previous,entry):null;
}

/** Temporary reveal fronts; harvesting never collects ordinary Sparks or invokes pickup hooks. */
export class LuminanceWaves {
  constructor(engine){this.engine=engine;this.sources=new Map();this.waves=[];this.revealCount=0;this.clock=0;this.lastCue=-Infinity;this.serial=0;}
  addSource(settings={}) {
    const id=settings.id??`wave-source-${++this.serial}`;
    let source=this.sources.get(id);
    if(!source){
      if(this.sources.size>=LUMINANCE_WAVE_TUNING.maximumSources)this.sources.delete(this.sources.keys().next().value);
      source={id,x:0,y:0,radius:145,remaining:Infinity,next:0,interval:LUMINANCE_WAVE_TUNING.interval,color:'#d9f0dc',follow:null,reveal:true,source:id,sourceKind:'ability'};
      this.sources.set(id,source);
    }
    source.x=finite(settings.x,source.x);source.y=finite(settings.y,source.y);
    source.radius=Math.max(0,finite(settings.radius,source.radius));
    if(Object.hasOwn(settings,'duration'))source.remaining=Math.max(0,finite(settings.duration,0));
    if(settings.color)source.color=settings.color;
    if(Object.hasOwn(settings,'follow'))source.follow=settings.follow;
    if(Object.hasOwn(settings,'interval'))source.interval=Math.max(1/60,finite(settings.interval,LUMINANCE_WAVE_TUNING.interval));
    if(Object.hasOwn(settings,'reveal'))source.reveal=!!settings.reveal;
    if(settings.source)source.source=settings.source;
    if(settings.sourceKind)source.sourceKind=settings.sourceKind;
    return source;
  }
  activate(settings){return this.addSource(settings);}
  // One event, one front. Rhythm must not create a periodic reveal source.
  emit({x=0,y=0,radius=145,color='#d9f0dc',reveal=true,source='pulse',sourceKind='ability'}={}){
    reveal=!!reveal&&this.engine.pulseRevealsAllowed?.({source,sourceKind})!==false;
    if(this.waves.length>=LUMINANCE_WAVE_TUNING.maximumWaves&&this.waves.shift().reveal)this.revealCount--;
    const wave={id:++this.serial,x,y,maximum:PULSE_SOURCE_KINDS.has(sourceKind)?pulseReach(this.engine):Math.max(0,finite(radius,145)),radius:0,previous:0,age:0,emittedAt:finite(this.engine.time,this.clock),color,reveal,source,sourceKind,seen:new Set(),storedPaid:false,naturalCrossings:0};
    this.waves.push(wave);if(reveal)this.revealCount++;return wave;
  }
  removeSource(id){this.sources.delete(id);}
  clear(){this.sources.clear();this.waves.length=0;this.revealCount=0;this.cue=null;}
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
      let origin=source,previousOrigin=source,activeFor=Math.min(dt,source.remaining);
      if(source.follow==='wisp'){
        origin={x:(e.distance||0)+(e.player?.x||0),y:e.player?.y||0};
        previousOrigin={x:finite(e.previousDistance,e.distance||0)+(e.player?.x||0),y:finite(e.previousPlayerY,origin.y)};
      }
      else if(source.follow==='flash'){
        if(!e.flashTether){this.sources.delete(id);continue;}
        activeFor=Math.min(activeFor,Math.max(0,e.flashTether.expires-(e.time-dt)));
        if(!(activeFor>0)){this.sources.delete(id);continue;}
        origin=e.flashTether;
        previousOrigin={x:finite(origin.px,origin.x),y:finite(origin.py,origin.y)};
      }
      // A completed front still owns real swept contacts in this tick. Retain
      // bounded catch-up emissions, resolve them, then retire their visuals.
      const earliest=Math.max(0,activeFor-source.interval*LUMINANCE_WAVE_TUNING.maximumWaves);
      if(source.next<earliest-1e-9)source.next+=Math.ceil((earliest-source.next)/source.interval)*source.interval;
      while(source.next<activeFor-1e-9 || (source.next===0&&activeFor>0)){
        if(source.radius>0){
          const age=dt-source.next;
          const mix=clamp(source.next/dt);
          const wave=this.emit({x:previousOrigin.x+(origin.x-previousOrigin.x)*mix,
            y:previousOrigin.y+(origin.y-previousOrigin.y)*mix,radius:source.radius,color:source.color,
            reveal:source.reveal,source:source.source,sourceKind:source.sourceKind});
          wave.radius=Math.min(wave.maximum,age*LUMINANCE_WAVE_TUNING.speed);wave.age=age;wave.emittedAt=finite(e.time,this.clock)-age;
          if(id==='flash'&&source.follow==='flash')e.flarePulseHeard?.();
        }
        source.next+=source.interval;
      }
      source.next-=dt;source.remaining-=dt;
      if(source.remaining<=0)this.sources.delete(id);
    }
    const rank=clamp(Math.floor(Number(e.mod?.resonantHarvest)||0),0,3);
    const cardMeter=Math.max(0,Number(e.mod?.cardHarvestMeter)||0),cardStored=Math.max(0,Math.floor(Number(e.mod?.cardHarvestStoredPerWave)||0));
    const orderedCards=!!(e.cardExecution&&typeof e.resolveCardRowEvent==='function');
    if(!this.dreaming){
      let hit=false,lead=Infinity;
      const crossings=[],reader=!!e.mod?.cardPulseReader;
      for(const wave of this.waves){
        for(const packet of e.getNearbyPickups?.()||e.layout?.embers||[]){
          if(packet.collected||packet.carried||packet.generated||packet.fetchedInDream||wave.seen.has(packet))continue;
          const kind=pickupKind(packet);
          const bookFuel=rank>0&&(kind==='light'||kind==='cluster'||kind==='cache');
          const naturalFuel=isFuelPickup(packet);
          const cardFuel=(cardMeter>0||cardStored>0||orderedCards)&&naturalFuel;
          if(!bookFuel&&!naturalFuel&&!(kind==='dark'&&rank>=2))continue;
          // A wave touches the visible shell, without the extra player-contact
          // padding used for body pickups.
          const rim=pickupShellRadius(packet);
          const screenX=packet.x-(e.distance||0);
          if(screenX < -rim || (Number.isFinite(e.width)&&screenX>e.width+rim)
            || packet.y < -rim || (Number.isFinite(e.height)&&packet.y>e.height+rim))continue;
          // Pulse Reader cue: how far (px) the nearest front still is from touching an uncollected Spark.
          if(reader&&naturalFuel){const ahead=Math.hypot(packet.x-wave.x,packet.y-wave.y)-rim-wave.radius;if(ahead>=0&&ahead<lead)lead=ahead;}
          if(Math.abs(packet.x-wave.x)>wave.radius+rim||Math.abs(packet.y-wave.y)>wave.radius+rim)continue;
          const crossing=luminanceWaveCrossing(wave,packet);
          if(crossing===null)continue;
          crossings.push({wave,packet,kind,bookFuel,naturalFuel,cardFuel,screenX,
            at:wave.emittedAt+crossing/LUMINANCE_WAVE_TUNING.speed});
        }
      }
      // A large physics step must produce the same First Ripple / Far Shore
      // sequence as several small steps, independent of layout array order.
      crossings.sort((a,b)=>a.at-b.at||a.wave.id-b.wave.id);
      for(const {wave,packet,kind,bookFuel,naturalFuel,cardFuel,screenX} of crossings){
          if(packet.collected||wave.seen.has(packet))continue;
          wave.seen.add(packet);
          const firstCrossing=naturalFuel&&wave.naturalCrossings===0;
          if(naturalFuel)wave.naturalCrossings++;
          if(kind==='dark'){
            hit=true;packet.collected=true;packet.purified=true;
            e.burst?.(packet.x-(e.distance||0),packet.y,5,'#c7ead4');
          } else {
            if(e.rec)e.rec.pulses++;
            const meterFraction=(e.flame||0)/(e.maxFlame||100);
            const gain=Math.min((bookFuel?1/GLOW_DISPLAY_SCALE:0)+(cardFuel&&!orderedCards?cardMeter:0),Math.max(0,(e.maxFlame||100)-(e.flame||0)));
            e.flame=(e.flame||0)+gain;e.flameRestored=(e.flameRestored||0)+gain;
            if(bookFuel&&rank>=3)e.resonanceStored=(e.resonanceStored||0)+1;
            let cardAction=false;
            if(cardFuel&&!wave.beat){ // a Timer's Pulse is a beat: it lights the passage but its crossings fire no card
              if(orderedCards){
                const action=e.resolveCardRowEvent('wave-crossing',{firstCrossing,pickupKind:kind,
                  meterFraction,guardRecovering:e.wisp?.phase==='guard-recovery',
                  waveId:wave.id,pulseSource:wave.source,pulseSourceKind:wave.sourceKind,
                  ...(Number.isInteger(wave.fromSlot)?{fromSlot:wave.fromSlot}:{})});
                cardAction=!!action?.receipt.steps.some(step=>step.success&&['add-sparks','add-last-payout'].includes(step.operation));
              }else{
                cardAction=cardMeter>0||(!wave.storedPaid&&cardStored>0);
                if(!wave.storedPaid)e.resonanceStored=(e.resonanceStored||0)+cardStored;
              }
              wave.storedPaid=true;
            }
            if(cardAction&&packet.feature==='first-light-combo-wave')packet.harvestFlashUntil=e.time+.55;
            if(bookFuel||cardAction){hit=true;e.burst?.(screenX,packet.y,3,'#c6ecf2');}
          }
      }
      this.cue=reader&&lead<Infinity?{lead}:null;
      if(hit&&this.clock-this.lastCue>=.3){this.lastCue=this.clock;e.sound?.('resonate',{strength:.45});}
    }
    for(let i=this.waves.length-1;i>=0;i--)if(this.waves[i].age>=this.waves[i].maximum/LUMINANCE_WAVE_TUNING.speed){if(this.waves[i].reveal)this.revealCount--;this.waves.splice(i,1);}
  }
  draw(c,view={}){drawLuminanceWaves(c,view,this);}
}

// The ring and its temporary light use the same simulation radius and fade.
// Steady source light remains independent of this moving band.
export function luminanceWaveFade(wave){
  if(!(wave?.maximum>0)||!(wave.radius>0))return 0;
  return clamp(wave.age/.12)*clamp((wave.maximum-wave.radius)/(wave.maximum*.22));
}
export function luminanceWaveVisibility(manager,x,y){
  let dark=1;
  for(const wave of manager?.waves||[]){
    if(!wave.reveal||wave.radius<=0)continue;
    const offset=Math.abs(Math.hypot(x-wave.x,y-wave.y)-wave.radius);
    if(offset>=REVEAL_BANDS[0][0])continue;
    const fade=luminanceWaveFade(wave);
    for(const [width,alpha]of REVEAL_BANDS)if(offset<width)dark*=1-fade*alpha;
  }
  return 1-dark;
}
export function revealLuminanceWaves(c,engine,{distance=engine.renderDistance??engine.distance??0,scale=1}={}){
  if(!engine.luminanceWaves?.revealCount)return;
  c.save();c.globalCompositeOperation='destination-out';
  for(const wave of engine.luminanceWaves.waves){
    if(!wave.reveal||wave.radius<=0)continue;
    const fade=luminanceWaveFade(wave);
    if(fade<=0)continue;
    for(const [width,alpha]of REVEAL_BANDS){
      c.globalAlpha=fade*alpha;c.lineWidth=width*2*scale;
      c.beginPath();c.arc((wave.x-distance)*scale,wave.y*scale,wave.radius*scale,0,Math.PI*2);c.stroke();
    }
  }
  c.restore();
}

export function drawLuminanceWaves(c,{distance=0,scale=1}={},manager) {
  if(!manager?.waves?.length)return;
  c.save();
  const baseAlpha=c.globalAlpha;
  for(const wave of manager.waves){
    const fade=luminanceWaveFade(wave);
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
