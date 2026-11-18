import { getCompanionAbility } from './companion-abilities.mjs?v=audit-1';
import { pickupKind, pickupContactRadius, getPickupSpec } from './pickups.mjs?v=audit-1';
import {sparkArtScale,sparkBodyRadius,sparkMass} from './spark-size.mjs?v=audit-1';
import {collectorCanFetch,collectorCompactSeconds,compressCollectorCargo} from './collector-load.mjs?v=audit-1';
import {pickupHookAnchor} from './pickup-handling-cue.mjs?v=audit-1';
import {WISP_ART} from './companion-art.mjs?v=audit-1';
import {collectorTowPose,collectorTowOrbit} from './collector-tow-geometry.mjs?v=audit-1';
import {COLLECTOR_VORTEX,vortexProgress,vortexScale,vortexCargoPoint,createVortexTrail,recordVortexTrail} from './collector-vortex.mjs?v=audit-1';

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const smooth = value => {const u=clamp(value,0,1);return u*u*(3-2*u);};
const TAU=Math.PI*2;
export const WISP_TUNING = Object.freeze({ range: 52.5, cooldown: 10, lightRadius: 175,
  outboundSpeed: 520, returnSpeed: 620, tripTimeScale:2.2, towLength:7, orbitPeriod: 1.25,
  passGrace:6, reelTurnsPerSecond:1.35 });

export function wispHome(player) {
  return { x: player.x, y: player.y };
}

export function wispOrbit(player, time = 0, index = 0, total = 1, radius = 40, out = {}) {
  const t = Number.isFinite(time) ? time : 0;
  const phase=index*Math.PI*2/Math.max(1,total);
  const angle=t*6.2+phase+Math.sin(t*1.7)*.55;
  const tilt=.5+Math.sin(t*.9)*.65;
  const ox=Math.cos(angle)*radius,oy=Math.sin(angle)*radius*.58;
  out.x=player.x+ox*Math.cos(tilt)-oy*Math.sin(tilt);
  out.y=player.y+ox*Math.sin(tilt)+oy*Math.cos(tilt);out.depth=Math.sin(angle);
  return out;
}

// A fetch owns one packet. Its recovery IS the visible reel, never a second
// delay after delivery. Explicit Field Impulse and guard spends remain distinct.
export class WispCompanion {
  constructor(home, index = 0) {
    this.collectorIndex=index;
    const orbit = wispOrbit(home, 0, index, index ? 2 : 1);
    this.x = this.previousX = orbit.x; this.y = this.previousY = orbit.y;
    this.phase = 'ready'; this.target = null; this.cargo = null;
    this.targetExtension=null;
    this.cooldown = 0; this.cooldownMax = WISP_TUNING.cooldown;
    this.vx = 0; this.vy = 0;
    this.orbitHome = {x:home.x,y:home.y};
    this.leg = null; this.lastDistance = null; this.scrollSpeed = 0;
    this.history = []; this.clock = 0;
    this.contacts = []; this.contactTimes = new Map();
    this.cargoX=this.previousCargoX=this.x;this.cargoY=this.previousCargoY=this.y;
    this.towDirection={x:1,y:0};
    this.orbitPose={x:orbit.x,y:orbit.y,depth:0};
    this.reelProgress=0;this.reelVX=0;this.reelVY=0;this.reelAnchorX=home.x;this.reelAnchorY=home.y;
    this.reelWorldVX=0;this.reelAnchorVY=0;
    this.reelStartReach=0;this.settle=0;this.settleX=this.x;this.settleY=this.y;
  }

  recoveryDuration(engine, packet) {
    // Read the natural packet before Cache handling compresses its payload.
    // Flare, Field Impulse and guard spends retain the full base recovery.
    const fuel = packet ? getPickupSpec(packet).fuel : 0;
    const base = fuel > 0 ? WISP_TUNING.cooldown * fuel / getPickupSpec('cache').fuel : WISP_TUNING.cooldown;
    return base * clamp(Number(engine.mod.wispCooldown) || 1, .4, 1.5) * (engine.mod.treasureRecoveryScale || 1);
  }

  canGuard(engine) {
    return Boolean(!this.collectorIndex && engine.mod.collectorGuard && this.enabled(engine) && this.phase==='ready' &&
      this.cooldown<=0 && !this.cargo && !this.target && !this.leg);
  }

  spendGuard(engine) {
    this.phase='guard-recovery';
    this.cooldownMax=this.cooldown=this.recoveryDuration(engine)*4;
    this.contacts.length=0;
    this.contactTimes.clear();
    this.orbitHome.x=engine.player.x;
    this.orbitHome.y=engine.player.y;
    this.x=this.previousX=engine.player.x;
    this.y=this.previousY=engine.player.y;
    this.vx=this.vy=0;
  }

  repairGuard(engine){
    if(this.phase!=='guard-recovery'||!engine.mod.collectorGuardRepair)return 0;
    const saved=Math.min(this.cooldown,engine.mod.collectorGuardRepair);
    this.cooldown-=saved;this.guardRepairAt=engine.time;
    return saved;
  }

  range(engine) {
    if (!this.enabled(engine)) return 0;
    return WISP_TUNING.range * clamp(Number(engine.mod.attract) || 1, .5, 4) * (1 + engine.wispBoost * .6);
  }

  recoveryFraction() {
    return this.cooldownMax > 0 ? clamp(1 - this.cooldown / this.cooldownMax, 0, 1) : 1;
  }

  activeReelSeconds(){return this.phase==='returning'&&this.cargo?Math.max(0,this.cooldown):0;}
  shortenReel(seconds){const saved=Math.min(this.activeReelSeconds(),Math.max(0,Number(seconds)||0));this.cooldown-=saved;return saved;}

  passedBodyWindow(engine,packet,reach=this.currentRange(engine)) {
    const contact=pickupContactRadius(packet,engine.height),shell=sparkBodyRadius(packet,engine.height);
    // Contact already includes the main body's radius. Keep extra human grace
    // inside the real rescue band, including the smallest Field Impulse orbit.
    const grace=Math.min(WISP_TUNING.passGrace,Math.max(0,(reach+shell-contact)*.25));
    return packet.x-engine.distance<engine.player.x-contact-grace;
  }

  currentRange(engine) {
    if (this.phase==='guard-recovery') return 0;
    const maximum = this.range(engine), minimum = Math.min(18+(Number(engine.mod.collectorMinimum)||0), maximum);
    return minimum + (maximum - minimum) * this.recoveryFraction();
  }

  enabled(engine) { return engine.hasCompanion ? engine.hasCompanion('collector')
    : getCompanionAbility(engine.companionRole || engine.options?.companionRole).collects === true; }

  cargoPose(packet, time, height) {
    const fieldScale = sparkArtScale(packet,height);
    const compact=collectorCompactSeconds(packet),age=time-packet.carriedAt;
    const stowedScale = compact?sparkArtScale({kind:'cluster',sparkMass:2},height):fieldScale;
    const elapsed = clamp(age / (compact||Math.min(.42,.18*Math.max(1,Math.sqrt(fieldScale)))), 0, 1);
    const tucked = elapsed * elapsed * (3 - 2 * elapsed);
    return { offsetX:this.cargoX-this.x,offsetY:this.cargoY-this.y,age:time-packet.carriedAt,
      scale: (fieldScale + (stowedScale-fieldScale)*tucked)*(this.sling?vortexScale(this.sling.elapsed):1), massTier:compact&&elapsed===1?2:sparkMass(packet),compacting:compact>0&&elapsed<1 };
  }

  state(engine, y = engine.player.y, time = engine.time, renderBlend) {
    const enabled = this.enabled(engine);
    const home = wispHome({ ...engine.player, y });
    const blend = renderBlend ?? (time === engine.time ? 1 : clamp(engine.accumulator * 60, 0, 1));
    const recovery = this.recoveryFraction();
    let x = this.previousX + (this.x - this.previousX) * blend;
    let cy = this.previousY + (this.y - this.previousY) * blend;
    const cargoTime = renderBlend === undefined ? time : engine.captureTime;
    const pose = enabled && this.cargo ? this.cargoPose(this.cargo, cargoTime,engine.height) : null;
    if(pose){
      pose.offsetX=this.previousCargoX+(this.cargoX-this.previousCargoX)*blend-x;
      pose.offsetY=this.previousCargoY+(this.cargoY-this.previousCargoY)*blend-cy;
    }
    if (pose && cargoTime < this.cargo.carriedAt) {
      pose.offsetX = this.cargo.x - engine.renderDistance - x;
      pose.offsetY = this.cargo.y - cy;
    }
    let tetherPose=null;
    if(pose&&pose.age>=0){
      const cargoX=x+pose.offsetX,cargoY=cy+pose.offsetY;
      const packet={kind:pickupKind(this.cargo),sparkMass:pose.massTier};
      tetherPose=collectorTowPose(packet,cargoX,cargoY,home.x,home.y,pose.scale,pose.age,engine.reducedMotion,this.collectorIndex);
      pose.hookAngle=tetherPose.hookAngle;pose.hookX=tetherPose.hookX-cargoX;pose.hookY=tetherPose.hookY-cargoY;
      tetherPose.progress=this.reelProgress;
      tetherPose.alpha=this.cordAlpha??1;
    }
    // The Spark owns its eyelet. Only a loaded tow has a short filament;
    // outbound and rejoining Collector orbs never grow an appendage.
    const gripPose=pose&&pose.age>=0
      ?{x:x+pose.offsetX+pose.hookX,y:cy+pose.offsetY+pose.hookY,growth:1,attached:true}:null;
    return { x, y:cy,
      homeX: home.x, homeY: home.y, depth:this.depth||0, enabled, collects: enabled,
      radius: enabled ? this.range(engine) : 0, recovery: enabled ? recovery : 0,
      currentRange: enabled ? this.currentRange(engine) : 0,
      fetchingRange: enabled ? (engine.collectorFetchRange?.(this) ?? this.currentRange(engine)) : 0,
      collectorIndex:this.collectorIndex,
      recovering: enabled && this.cooldown > 0,
      canFetch: enabled && (this.phase === 'ready' || this.phase === 'cooldown'),
      busy:enabled&&Boolean(this.target||this.cargo||this.phase==='guard-recovery'),
      motion:this.phase==='returning'?'reeling':this.phase,
      guardReady:this.canGuard(engine),
      phase: enabled ? this.phase : 'orbiting', cooldown: enabled ? this.cooldown : 0,
      cooldownMax: enabled ? this.cooldownMax : 0,
      carrying: enabled && Boolean(this.cargo), cargoValue: enabled ? this.cargo?.value || 1 : 0,
      cargoKind: enabled && this.cargo ? pickupKind(this.cargo) : null,
      cargoPhase: this.cargo?.phase || 0,
      cargoPose: pose,gripPose,
      vortex:enabled&&this.cargo&&this.sling?{elapsed:this.sling.elapsed,trail:this.sling.trail}:null,
      tetherPose,towStage:this.towStage||'tow' };
  }

  beginLeg(engine, x, y, returning = false) {
    const distance = Math.hypot(x - this.x, y - this.y);
    const speed = returning ? WISP_TUNING.returnSpeed : WISP_TUNING.outboundSpeed;
    const duration = clamp((returning ? .14 : .12) + distance / speed, .16, 1.2)*WISP_TUNING.tripTimeScale;
    // World coordinates keep a fixed pickup fixed while the landscape scrolls.
    // The tangent at interception bends around the pickup, into the return arc.
    const rx = x - engine.player.x, ry = y - engine.player.y, length = Math.max(1, Math.hypot(rx, ry));
    const turn = returning ? 0 : clamp(distance / duration * .65, 55, 190);
    this.leg = {x:this.x + engine.distance,y:this.y,age:0,duration,
      vx:this.vx + this.scrollSpeed,vy:this.vy,
      endVX:-ry / length * turn,endVY:rx / length * turn};
  }

  advanceLeg(engine, x, y, dt) {
    const leg = this.leg;
    leg.age = Math.min(leg.duration, leg.age + dt);
    const u = leg.age / leg.duration, u2 = u * u, u3 = u2 * u;
    const a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u;
    const c = -2 * u3 + 3 * u2, d = u3 - u2;
    // Cubic Hermite legs retain the incoming velocity. A zero relative end
    // tangent rejoins the moving orbit smoothly, even while the player flaps.
    this.x = a * leg.x + b * leg.duration * leg.vx + c * (x + engine.distance)
      + d * leg.duration * leg.endVX - engine.distance;
    this.y = a * leg.y + b * leg.duration * leg.vy + c * y + d * leg.duration * leg.endVY;
    this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
    return leg.age >= leg.duration;
  }

  returnToOrbit(engine, orbit) {
    this.phase = 'rejoining'; this.beginLeg(engine, orbit.x, orbit.y, true);
  }

  towPose(engine){
    const hook=pickupHookAnchor(this.cargo,0,0),age=Math.max(0,engine.time-this.cargo.carriedAt);
    const length=WISP_TUNING.towLength*clamp(age/.18,0,1);
    return {x:this.towDirection.x*length+hook.x,y:this.towDirection.y*length+hook.y};
  }

  resizeY(factor) {
    this.y *= factor; this.previousY = this.y; this.vy *= factor;
    this.orbitHome.y *= factor;
    this.cargoY*=factor;this.previousCargoY=this.cargoY;
    this.reelAnchorY*=factor;this.reelVY*=factor;this.reelAnchorVY*=factor;this.settleY*=factor;
    if(Number.isFinite(this.reelStartY))this.reelStartY*=factor;
    this.orbitPose.y*=factor;
    if(this.cargo&&Number.isFinite(this.reelHomeX)){
      this.reelGap=this.reelStartReach=Math.hypot(this.cargoX-this.reelHomeX,this.cargoY-this.reelAnchorY);
      this.reelAngleOffset=Math.atan2(Math.sin(Math.atan2(this.cargoY-this.reelAnchorY,this.cargoX-this.reelHomeX)-Math.PI),
        Math.cos(Math.atan2(this.cargoY-this.reelAnchorY,this.cargoX-this.reelHomeX)-Math.PI));
      if(this.sling){
        this.sling.startY*=factor;this.sling.verticalScale=(this.sling.verticalScale??1)*factor;
        if(this.sling.launch){this.sling.launch.y*=factor;this.sling.launch.vy*=factor;}
        for(const point of this.sling.trail.points)point.y*=factor;
      }
    }
    if (this.leg) { this.leg.y *= factor; this.leg.vy *= factor; this.leg.endVY *= factor; }
    this.history.length = 0;
  }

  shiftX(shift){
    this.x+=shift;this.previousX+=shift;this.orbitHome.x+=shift;this.orbitPose.x+=shift;
    this.cargoX+=shift;this.previousCargoX+=shift;this.settleX+=shift;
    if(Number.isFinite(this.reelHomeX))this.reelHomeX+=shift;
    if(Number.isFinite(this.reelStartX))this.reelStartX+=shift;
    if(this.lastDistance!==null)this.lastDistance-=shift;
  }

  releaseTarget() {
    if (this.target && !this.target.collected) this.target.attracted = false;
    this.target = null;
    this.targetExtension=null;
  }

  clear(engine) {
    this.releaseTarget();
    if(this.cargo){this.cargo.x=engine.distance+this.cargoX;this.cargo.y=this.cargoY;
      this.cargo.carried=false;this.cargo.attracted=false;this.cargo=null;}
    this.leg=null;this.contacts.length=0;this.contactTimes.clear();
    this.cooldown=0;this.reelProgress=0;this.reelVX=this.reelVY=0;this.sling=null;this.cordAlpha=1;this.towStage='tow';
    this.phase=this.enabled(engine)?'ready':'orbiting';
  }

  beginReel(engine,target,home) {
    // An outbound reservation never spends a use until the pickup is attached.
    if(this.targetExtension&&!engine.spendCollectorExtension?.(this.targetExtension))return false;
    this.targetExtension=null;
    target.fetchedInDream=Boolean(engine.dream?.active||engine.dream?.mode==='record');
    target.carried=true;target.carriedAt=engine.time;
    target.boostedPickup=engine.isCompanionWorking?.()??((engine.abilityTime??engine.boostTime)>0);
    this.cargo=target;this.target=null;this.leg=null;this.phase='returning';
    this.cargoX=this.previousCargoX=target.x-engine.distance;this.cargoY=this.previousCargoY=target.y;
    // A field Spark starts with its own momentum, never the Collector's or a
    // Lift impulse. Horizontal momentum is stored in world coordinates.
    this.reelWorldVX=Number(target.vx)||0;
    this.reelVX=this.reelWorldVX-this.scrollSpeed;
    this.reelVY=Number(target.gravityVy??target.vy)||0;this.reelAnchorVY=0;
    this.reelAnchorX=engine.distance+home.x;this.reelAnchorY=home.y;
    this.reelStartReach=this.reelGap=Math.hypot(this.cargoX-home.x,this.cargoY-home.y);
    this.reelAngleOffset=Math.atan2(Math.sin(Math.atan2(this.cargoY-home.y,this.cargoX-home.x)-Math.PI),
      Math.cos(Math.atan2(this.cargoY-home.y,this.cargoX-home.x)-Math.PI));
    this.reelHomeX=home.x;
    this.reelProgress=0;this.cooldownMax=this.cooldown=this.recoveryDuration(engine,target);
    this.sling=null;this.cordAlpha=1;this.towStage='tow';this.reelCloseSpeed=0;
    this.reelLastCooldown=this.cooldown;
    // Start on the actual loop, then blend into the winding path without a snap.
    this.reelStartX=this.x;this.reelStartY=this.y;this.reelStartedAt=engine.time;
    engine.onCollectorAttach?.(target,this);
    return true;
  }

  advanceTowCargo(engine,home,dt) {
    const anchorX=engine.distance+home.x,anchorY=home.y;
    const homeVX=(anchorX-this.reelAnchorX)/dt;
    const distanceBefore=engine.distance-this.scrollSpeed*dt;
    let worldX=distanceBefore+this.cargoX,y=this.cargoY;
    const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
    const gravity=300*(Number(engine.scaleY)||1)*clamp(Number(engine.mod.gravity)||1,.8,1.2);
    for(let i=1;i<=steps;i++){
      const f=i/steps;
      const age=Math.max(0,engine.time-this.cargo.carriedAt-dt*(1-f));
      const sway=engine.reducedMotion?0:5*Math.sin(age*3.1+this.collectorIndex*1.73)+2*Math.sin(age*5.2+.6);
      // The cord keeps its rest length throughout the tow. Gravity and a soft
      // spring retain the Spark's own height and momentum through every Lift.
      const rest=this.reelStartReach;
      const wantedX=this.reelAnchorX+(anchorX-this.reelAnchorX)*f-rest;
      const wantedY=this.reelAnchorY+(anchorY-this.reelAnchorY)*f+sway;
      this.reelWorldVX+=((wantedX-worldX)*20+(homeVX-this.reelWorldVX)*6.8)*h;
      this.reelVY+=((wantedY-y)*20+gravity-this.reelVY*6.8)*h;
      worldX+=this.reelWorldVX*h;y+=this.reelVY*h;
    }
    this.reelVX=this.reelWorldVX-this.scrollSpeed;
    this.cargoX=worldX-engine.distance;this.cargoY=y;
    this.reelAnchorX=anchorX;this.reelAnchorY=anchorY;this.reelHomeX=home.x;
  }

  advanceSling(engine,home,dt,contact) {
    const s=this.sling,old=s.elapsed;
    s.elapsed=Math.min(s.duration,s.elapsed+dt*(s.speed||1));
    const setup=COLLECTOR_VORTEX.setup;
    if(old<setup){
      this.advanceTowCargo(engine,home,dt);
      if(s.elapsed<setup*.55)s.side=this.cargoY<home.y?-1:1;
      this.towStage=s.elapsed<setup?'setup':'snap';
    }
    if(s.elapsed>=setup){
      if(!s.launch)s.launch={x:this.cargoX-home.x,y:this.cargoY-home.y,
        vx:this.reelVX,vy:this.reelVY-(Number(engine.player.vy)||0)};
      const point=vortexCargoPoint(s,contact,engine.reducedMotion,s.point);
      const beforeX=this.cargoX,beforeY=this.cargoY;
      this.towStage=point.stage;
      this.cargoX=home.x+point.x;this.cargoY=home.y+point.y;
      this.reelVX=(this.cargoX-beforeX)/dt;this.reelVY=(this.cargoY-beforeY)/dt;
      this.reelWorldVX=this.reelVX+this.scrollSpeed;
      this.cordAlpha=1-smooth((s.elapsed-setup)/.16);
      this.reelAnchorX=engine.distance+home.x;this.reelAnchorY=home.y;
    }
    recordVortexTrail(s,this.cargoX-home.x,this.cargoY-home.y);
  }

  updateReel(engine,home,dt) {
    const cargo=this.cargo;
    if(!cargo||!collectorCanFetch(cargo,engine.mod)||cargo.collected||!engine.layout.embers.includes(cargo)){
      if(cargo){cargo.x=engine.distance+this.cargoX;cargo.y=this.cargoY;cargo.carried=false;cargo.attracted=false;}
      this.cargo=null;this.cooldown=0;this.returnToOrbit(engine,this.orbitPose);return;
    }
    const age=Math.max(0,engine.time-cargo.carriedAt);
    // Recovery still owns the trip. A full card spend keeps a short physical
    // finish instead of jumping an attached Spark straight into the body.
    if(this.cooldown<1e-8)this.cooldown=0;
    this.reelProgress=Math.max(this.reelProgress,this.recoveryFraction());
    const rate=engine.flightBoon?.recoveryRate??1;
    const contact=sparkBodyRadius(cargo,engine.height)+WISP_ART.worldRadius;
    const finishWindow=COLLECTOR_VORTEX.duration;
    const minimumFinish=Math.min(.65,this.cooldownMax/rate);
    if(!this.sling&&this.cooldown/rate<=finishWindow){
      this.sling={elapsed:0,duration:finishWindow,
        speed:finishWindow/Math.max(minimumFinish,Math.min(finishWindow,this.cooldown/rate+dt)),trail:createVortexTrail(),point:{x:0,y:0},
        radius:Math.max(contact+18,Math.min(62,this.reelStartReach*.62)),
        startX:this.x-home.x,startY:this.y-home.y,side:this.cargoY<home.y?-1:1};
    }
    if(this.sling&&(Math.abs(this.cooldown-Math.max(0,this.reelLastCooldown-dt*rate))>1e-7||this.reelLastRate!==undefined&&rate!==this.reelLastRate)){
      const s=this.sling;
      s.speed=Math.max(1e-6,(s.duration-s.elapsed)/Math.max(minimumFinish,this.cooldown/rate+dt));
    }
    if(this.sling)this.advanceSling(engine,home,dt,contact);else this.advanceTowCargo(engine,home,dt);
    const oldGap=this.reelGap;this.reelGap=Math.hypot(this.cargoX-home.x,this.cargoY-home.y);
    this.reelCloseSpeed=(oldGap-this.reelGap)/dt;this.reelLastCooldown=this.cooldown;this.reelLastRate=rate;
    const pose=this.cargoPose(cargo,engine.time,engine.height);
    const tether=collectorTowPose({kind:pickupKind(cargo),sparkMass:pose.massTier},this.cargoX,this.cargoY,home.x,home.y,pose.scale,age,engine.reducedMotion,this.collectorIndex);
    const orbit=collectorTowOrbit(tether,age,engine.reducedMotion,WISP_TUNING.reelTurnsPerSecond);
    let cx=orbit.x,cy=orbit.y,depth=orbit.depth;
    if(this.sling){
      const s=this.sling,p=vortexProgress(s.elapsed);
      if(p<.24){
        const u=p/.24;
        if(engine.reducedMotion){const v=smooth(u);cx=home.x+s.startX*(1-v);cy=home.y+s.startY*(1-v);depth=1;}
        else{const a=-s.side*TAU*1.7*u,r=18+7*Math.sin(Math.PI*u);cx=this.cargoX+Math.cos(a)*r;cy=this.cargoY+Math.sin(a)*r;depth=Math.sin(a);}
      }else if(p<.42){
        const u=smooth((p-.24)/.18);cx=home.x-18+75*u;cy=home.y+s.side*(13-(engine.reducedMotion?20:55)*u);depth=1;
      }else if(s.elapsed>s.duration*.34){
        const v=smooth((s.elapsed-s.duration*.34)/(s.duration*.45));cx+=(this.orbitPose.x-cx)*v;cy+=(this.orbitPose.y-cy)*v;depth+=(this.orbitPose.depth-depth)*v;
      }
    }
    const blend=clamp(age/.18,0,1);
    this.x=this.reelStartX+(cx-this.reelStartX)*blend;this.y=this.reelStartY+(cy-this.reelStartY)*blend;this.depth=depth;
    this.vx=(this.x-this.previousX)/dt;this.vy=(this.y-this.previousY)/dt;
    if(this.cooldown>0||age<collectorCompactSeconds(cargo)||this.towStage!=='absorb'||
      this.cargoX<=home.x||Math.abs(this.cargoY-home.y)>contact*.25||this.reelGap>contact)return;
    // The intact shell and its payload share this one front contact. The
    // existing collection path owns the award and absorption exactly once.
    const delivered=cargo;this.cargo=null;delivered.carried=false;delivered.attracted=false;
    delivered.collectorOriginalKind=pickupKind(delivered);compressCollectorCargo(delivered);delivered.deliveredByWisp=true;
    const delivery={worldX:engine.distance+this.cargoX,y:this.cargoY,scale:pose.scale,
      previousWorldX:(engine.previousDistance??engine.distance)+this.previousCargoX,previousY:this.previousCargoY,interval:dt};
    this.cooldown=0;this.phase='ready';this.leg=null;this.settle=.28;this.settleX=this.x;this.settleY=this.y;
    engine._auraUntil=-1;engine.collect(delivered,delivery);
    if(delivered.collected)engine.shatterPickupRing?.(delivered,delivery);
  }

  update(engine, dt) {
    if (!(dt > 0)||engine.paused||engine.destroyed||engine.dying||engine.completing) return;
    const firstUpdate = this.lastDistance === null;
    this.previousX = this.x; this.previousY = this.y; this.clock += dt;
    this.previousCargoX=this.cargoX;this.previousCargoY=this.cargoY;
    this.scrollSpeed = this.lastDistance === null ? Number(engine.baseSpeed) || 0 : (engine.distance - this.lastDistance) / dt;
    this.lastDistance = engine.distance;
    const home = wispHome(engine.player);
    const follow = 1 - Math.exp(-dt * 18);
    this.orbitHome.x += (home.x - this.orbitHome.x) * follow;
    this.orbitHome.y += (home.y - this.orbitHome.y) * follow;
    const fleet = engine.companions || [engine.companionRole];
    const orbitIndex=this.collectorIndex||Math.max(0,fleet.indexOf('collector'));
    const orbitTotal=engine.collectors?.length>1?engine.collectors.length:fleet.length;
    const orbit = wispOrbit(home, engine.reducedMotion ? engine.time*.25 : engine.time,
      orbitIndex,orbitTotal,this.enabled(engine)?this.currentRange(engine):40,this.orbitPose);
    this.depth=['ready','cooldown','orbiting'].includes(this.phase)?orbit.depth:1;
    if (firstUpdate && ['ready','cooldown','orbiting'].includes(this.phase)) {
      const before = wispOrbit(this.orbitHome, engine.reducedMotion ? (engine.time-dt)*.25 : engine.time - dt,
        orbitIndex,orbitTotal,this.currentRange(engine));
      this.previousX = before.x; this.previousY = before.y;
    }
    if (!this.enabled(engine)) {
      this.contacts.length = 0; this.contactTimes.clear();
      this.releaseTarget();
      if (this.cargo) { this.cargo.carried = false; this.cargo.attracted = false; this.cargo = null; }
      this.phase = 'orbiting'; this.cooldown = 0; this.cooldownMax = 0; this.leg = null;
      this.x = orbit.x; this.y = orbit.y;
      this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
      this.history.length = 0;
      return;
    }
    if (this.phase === 'orbiting') { this.phase = 'ready'; this.cooldownMax = WISP_TUNING.cooldown; }
    // Ordinary recovery runs only while spooling cargo. An empty cooldown is
    // an explicit Field Impulse spend and can search at its smaller orbit.
    this.cooldown = Math.max(0, this.cooldown - dt * (engine.flightBoon?.recoveryRate ?? 1));
    if (this.cooldown === 0 && (this.phase === 'cooldown' || this.phase==='guard-recovery')) this.phase = 'ready';
    if (this.phase==='guard-recovery') {
      const radius=.22+.22*this.recoveryFraction();
      this.x=home.x+(orbit.x-home.x)*radius;this.y=home.y+(orbit.y-home.y)*radius;
      this.vx=(this.x-this.previousX)/dt;this.vy=(this.y-this.previousY)/dt;
      this.depth=orbit.depth;
      return;
    }
    const normalReach=this.currentRange(engine),reach=engine.collectorFetchRange?.(this)??normalReach;
    const packets = engine.getNearbyPickups?.() || engine.layout.embers;
    this.contacts.length = 0;
    this.contactTimes.clear();
    if (this.phase === 'ready' || this.phase === 'cooldown') {
      this.x = orbit.x; this.y = orbit.y;
      if(this.settle>0){this.settle=Math.max(0,this.settle-dt);const blend=1-(this.settle/.28)**2;
        this.x=this.settleX+(this.x-this.settleX)*blend;this.y=this.settleY+(this.y-this.settleY)*blend;}
      this.vx = (this.x - this.previousX) / dt; this.vy = (this.y - this.previousY) / dt;
      {
        // Homing Thread (engine card): one search, right after a Delivery, may take the nearest Spark in reach even
        // before it passes the wisp. The fetch, reel and recovery are the normal ones; the request lapses in 0.25 s.
        const homing=this.homingFetch!=null&&engine.time-this.homingFetch<=.25;
        if(this.homingFetch!=null&&!homing)this.homingFetch=null;
        // Homing Thread searches twice as far as the Collector normally reaches.
        const searchReach=homing?reach*2:reach;
        let nearest = null, nearestScore = Infinity, nearestExtension=null;
        for (const ember of packets) {
          if (!collectorCanFetch(ember,engine.mod) || ember.collected || ember.carried || ember.attracted) continue;
          const x = ember.x - engine.distance;
          const shell = sparkBodyRadius(ember,engine.height);
          if (x < home.x - searchReach - shell) continue;
          // Leave the entire approach and body-contact window to the player.
          // Once a packet passes behind this edge, forward flight cannot touch
          // it directly; only then may the carrier rescue it within its range.
          if (!homing && !this.passedBodyWindow(engine,ember,normalReach)) continue;
          if (engine.collectorContains && !engine.collectorContains(ember,this,searchReach)) continue;
          const distance = Math.hypot(x - home.x, ember.y - home.y) - shell;
          if(distance>searchReach)continue;
          const extension=distance>normalReach&&!homing?engine.collectorExtensionFor?.(this,distance):null;
          if(distance>normalReach&&!extension&&!homing)continue;
          const preference=engine.mod.collectorPreference;
          const priority=preference==='dense'?sparkMass(ember):preference==='flash'&&pickupKind(ember)==='sight'?10:0;
          const score=distance-priority*10000;
          if (score <= nearestScore) { nearest = ember; nearestScore = score; nearestExtension=extension; }
        }
        if (nearest) {
          if(homing)this.homingFetch=null;
          this.target = nearest;this.targetExtension=nearestExtension; nearest.attracted = true; this.phase = 'outbound';
          const hook=pickupHookAnchor(nearest,nearest.x-engine.distance,nearest.y);
          this.beginLeg(engine, hook.x,hook.y);
        }
      }
    } else if (this.phase === 'outbound') {
      const target = this.target;
      if (!target || !collectorCanFetch(target,engine.mod) || target.collected||!engine.layout.embers.includes(target)) {
        this.releaseTarget(); this.returnToOrbit(engine, orbit);
      } else {
        const hook=pickupHookAnchor(target,target.x-engine.distance,target.y);
        if (!this.leg) this.beginLeg(engine,hook.x,hook.y);
        if (this.advanceLeg(engine,hook.x,hook.y,dt)) {
          if(!this.beginReel(engine,target,home)){this.releaseTarget();this.returnToOrbit(engine,orbit);}
        }
      }
    } else if (this.phase === 'returning') {
      this.updateReel(engine,home,dt);
    } else if(this.phase==='rejoining'){
      if(!this.leg)this.beginLeg(engine,orbit.x,orbit.y,true);
      if(this.advanceLeg(engine,orbit.x,orbit.y,dt)){
        this.phase=this.cooldown>0?'cooldown':'ready';this.leg=null;
      }
    }
    this.history.length = 0;
  }
}
