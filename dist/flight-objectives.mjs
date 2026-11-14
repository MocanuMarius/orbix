import {ROUTE_BONUSES} from './route-bonuses.mjs?v=guardian-beat-1';
import {blackHoleDrainRate} from './black-holes.mjs?v=guardian-beat-1';
import {getPickupSpec, pickupKind} from './pickups.mjs?v=guardian-beat-1';
import {GLOW_DISPLAY_SCALE} from './vitality.mjs?v=guardian-beat-1';

const fuelKinds = new Set(['light', 'cluster', 'cache']);
const helpfulFamilies = new Set(['lift', 'reveal', 'bloom']);
const maxSpeed = e => e.baseSpeed * (e.hasCompanion('swift') ? 1.48 : 1);
const firstX = e => 98 + maxSpeed(e) * (Math.max(0, Number(e.mod.dreamDuration) || 0) + 2);
const lastX = e => e.totalDistance + e.player.x - e.baseSpeed * 1.5;
const excludesFork = (e, x) => !(e.layout.flightForks || []).some(f => x >= f.approachStart && x <= f.exitEnd);
const outsideBell = (engine, x) => !engine.atlas?.bells?.some(b=>x>b.start-45 && x<b.x+55);
const sleep = e => Boolean(e.dream?.active || e.dream?.mode === 'record');
const fuel = p => !p.generated && !p.harmful && !p.riskChain && !p.forkCache && fuelKinds.has(pickupKind(p));
const mark = (object, type = 'spark') => ({object, x:object.x, y:object.y, type});

function inRoom(e, x, y, radius = 16) {
  return x >= firstX(e) && x <= lastX(e) && excludesFork(e, x) && outsideBell(e, x) && e.objectiveBodyClear(x, y, radius);
}

const eligibleFuel = new WeakMap();
function safeSparks(e) {
  const cached = eligibleFuel.get(e);
  if (cached) return cached;
  const packets = e.layout.embers.filter(p => fuel(p) && inRoom(e, p.x, p.y)
    && !e.blackHoles.items.some(h => Math.hypot(h.x-p.x, h.y-p.y) < 130))
    .sort((a,b) => a.x-b.x);
  eligibleFuel.set(e,packets);
  return packets;
}

// Leave enough travel time between commitments for one-handed steering. All
// candidates are on the connected main passage, outside either side of a fork.
function spread(items, count, spacing) {
  const result = [];
  let index = 0;
  for (let slot = 0; slot < count; slot++) {
    const ideal = Math.floor(slot * (items.length - 1) / Math.max(1,count - 1));
    index = Math.max(index, ideal);
    while (index < items.length && result.length && items[index].x - result.at(-1).x < spacing) index++;
    if (index >= items.length) return null;
    result.push(items[index++]);
  }
  return result;
}

function placeFuel(e, points, donors) {
  const reserved = new Set();
  const targets = [];
  for (const point of points) {
    if (!inRoom(e, point.x, point.y, 18)) return null;
    let closest = null, distance = Infinity;
    for (const candidate of donors) {
      if (reserved.has(candidate) || candidate.forkCache || candidate.atlasBypass) continue;
      const gap = Math.abs(candidate.x - point.x);
      if (gap < distance) { distance = gap; closest = candidate; }
    }
    // Keep existing fuel in its own neighbourhood.
    if (!closest || distance > e.baseSpeed * 2.5) return null;
    reserved.add(closest);
    targets.push({...mark(closest), ...point, relocate:true});
  }
  const overlaps = targets.some(t => e.layout.embers.some(p =>
    !reserved.has(p) && Math.hypot(t.x-p.x,t.y-p.y)<50));
  return overlaps ? null : targets;
}

function relay(e, donors) {
  if (e.onboardingPlan?.specialSparks === false) return null;
  const flash = e.layout.embers.find(packet => packet.kind === 'sight');
  for (const p of donors) {
    const start = p.x - e.baseSpeed * .9, y = p.y;
    if (!inRoom(e, start, y, 23) || e.layout.embers.some(other => other !== flash && Math.hypot(other.x-start,other.y-y) < 45)) continue;
    const targets = donors.filter(q => q.x >= p.x && q.x-start < e.baseSpeed*5.1);
    const chosen = spread(targets,3,e.baseSpeed*.65);
    if (!chosen || chosen.some(q => Math.abs(q.y - y) > e.height*.23)) continue;
    return [{x:start,y,type:'flash',flash:true,object:flash}, ...chosen.map(q => mark(q))];
  }
  return null;
}

function glide(e, donors) {
  const gravity = 300 * e.scaleY * Math.max(.8,Math.min(1.2,e.mod.gravity || 1));
  const rise = -205 * e.scaleY * Math.max(.8,Math.min(1.2,e.mod.flap || 1));
  const terminal = 245 * e.scaleY * Math.max(1,Math.min(1.15,e.mod.terminalFall || 1));
  for (const p of donors) {
    const start = p.x - e.baseSpeed*.2, end = start + e.baseSpeed*2.08;
    if (e.drafts.zones.some(z => start < z.x + z.rx && end > z.x - z.rx)
      || e.biomeDynamics.items.some(item => item.x+65 > start && item.x-65 < end)
      || e.blackHoles.items.some(h => h.x+h.influence > start && h.x-h.influence < end)) continue;
    for (const height of [.46,.39,.34,.29,.52]) {
      let y = e.height * height, velocity = rise, valid = true;
      const points = [], guide=[];
      for (let frame = 0; frame <= 125; frame++) {
        const x = start + e.baseSpeed * frame/60;
        if (frame % 4 === 0 && !inRoom(e,x,y,24)) { valid=false; break; }
        if (frame%8===0) guide.push({x,y});
        if (frame===12 || frame===123) points.push({x,y});
        velocity = Math.min(terminal,velocity + gravity/60);
        y += velocity/60;
      }
      if (valid) {
        const targets = placeFuel(e,points,donors);
        if (targets) return {targets,guide};
      }
    }
  }
  return null;
}

function bypass(e, donors) {
  for (const h of e.blackHoles.items) {
    // Integrate the existing bypass, leaving room for imperfect positioning.
    let loss=0;
    const laneDistance=Math.abs(h.bypass.y-h.y)-14;
    for(let dx=-h.influence;dx<h.influence;dx+=8){
      loss+=blackHoleDrainRate(Math.hypot(dx,laneDistance),h.influence) * 8/e.baseSpeed * GLOW_DISPLAY_SCALE;
    }
    if(loss>3)continue;
    const points = [-.54,.54].map(side => ({x:h.x + side*(h.bypass.endX-h.bypass.startX)/2, y:h.bypass.y}));
    const targets = placeFuel(e,points,donors);
    if (targets) return {targets,hole:h};
  }
  return null;
}

function edgeY(e, x, side) {
  let best = side === 1 ? Infinity : -Infinity;
  for (const o of e.layout.obstacles) {
    const shape = side === 1 ? o.bottomShape : o.topShape;
    if (!shape || o.destroyed || x < o.x-o.width*.8 || x > o.x+o.width*2.45) continue;
    const local=x-o.x;
    for (let i = 3; i < shape.length; i++) {
      const [ax,ay]=shape[i-1], [bx,by]=shape[i];
      if (local<Math.min(ax,bx) || local>Math.max(ax,bx) || ax===bx) continue;
      const y=o.center+side*o.gap/2 + ay+(by-ay)*(local-ax)/(bx-ax);
      best=side===1?Math.min(best,y):Math.max(best,y);
      break;
    }
  }
  return best;
}

function edgeSections(e) {
  if (!e.mod.proximityUnlocked) return null;
  const zones=[];
  const speed=maxSpeed(e);
  for (const section of e.layout.sections || []) {
    if (section.start < firstX(e) || section.end > lastX(e) || section.end-section.start < speed*2.4) continue;
    if (zones.length && section.start-zones[0].end < speed*((e.mod.edgingDuration||5)+2)) continue;
    let zone;
    for (const side of [1,-1]) {
      let ribbon=[];
      for (let x=section.start+12;x<=section.end-12;x+=32) {
        const surface=edgeY(e,x,side), y=surface-side*32;
        if (!Number.isFinite(y) || !inRoom(e,x,y,13) || (ribbon.length && Math.abs(ribbon.at(-1).y-y)>40)) ribbon=[];
        else {
          ribbon.push({x,y,surface});
          if (ribbon.at(-1).x-ribbon[0].x >= speed*2.4) {
            zone={type:'edge',x:ribbon[0].x,y:ribbon[0].y,start:section.start,end:section.end,ribbon,side};
            break;
          }
        }
      }
      if (zone) break;
    }
    if (zone) zones.push(zone);
    if (zones.length===2) return zones;
  }
  return null;
}

// A stage has one mandatory mark and, where the course permits, a spare.
// Keep both chances BEFORE the following stage, so a miss never asks a player
// to double back. Prefer open, central approaches over pickups tucked in rock.
function constellation(e,sparks) {
  const speed=maxSpeed(e), start=firstX(e)+speed*1.4, end=lastX(e);
  const kinds=['light','cluster','cache'];
  const paths=Array.from({length:6},()=>[]);
  for(const p of sparks) {
    if(p.x<start)continue;
    const stage=kinds.indexOf(pickupKind(p));
    const roof=Math.max(28,edgeY(e,p.x,-1)), floor=Math.min(e.height-28,edgeY(e,p.x,1));
    const center=(roof+floor)/2;
    const clearance=Math.min(p.y-roof,floor-p.y);
    const accessibility=(p.accessible?14:0) + Math.min(85,clearance)*.3
      -Math.abs(p.y-center)*.23;
    // A safe first chance should be early enough to teach the sequence.
    const ideal=start+(end-start)*[.12,.47,.77][stage];
    const score=120+accessibility-Math.abs(p.x-ideal)/speed*.8;
    for(const spare of [1,0]){
      const slot=stage*2+spare;
      const previous=spare?[slot-1]:[slot-1,slot-2];
      let best=null;
      for(const priorSlot of previous) {
        if(priorSlot<0)continue;
        for(const path of paths[priorSlot]) {
          const last=path.targets.at(-1);
          if(p.x-last.x<speed*(spare?1.35:1.85))continue;
          if(!best || path.score>best.score)best=path;
        }
      }
      if(!best && slot!==0)continue;
      const target={...mark(p),stage};
      paths[slot].push({score:score+(best?.score||0),targets:[...(best?.targets||[]),target]});
    }
  }
  const finishes=[...paths[4],...paths[5]];
  return finishes.reduce((best,p)=>!best || p.score>best.score?p:best,null)?.targets || null;
}

export function buildObjectivePlan(e,id) {
  if (!ROUTE_BONUSES[id] || e.tutorial) return null;
  const speed=maxSpeed(e);
  let targets=null, hole=null, guide=[];
  if (id==='wild-circuit') {
    const actors=e.biomeDynamics.items.filter(a=>helpfulFamilies.has(a.family) && inRoom(e,a.x,a.y,10));
    targets=spread(actors,2,speed*2)?.map(a=>mark(a,'prop'));
  } else if (id==='edgeweaver') {
    targets=edgeSections(e);
  } else {
    const sparks=safeSparks(e);
    if (id==='night-sail') {
      const plan=bypass(e,sparks);
      if (plan) ({targets,hole}=plan);
    } else if (id==='flash-relay') targets=relay(e,sparks);
    else if (id==='long-glide') {
      const plan=glide(e,sparks);
      if(plan) ({targets,guide}=plan);
    }
    else if(id==='wayfinder') {
      // These are fly-through openings, independent of the underlying fuel.
      const gates=spread(sparks.filter(p=>inRoom(e,p.x,p.y,38)),3,speed*2);
      targets=gates?.map(p=>({x:p.x,y:p.y,type:'gate',radius:37}));
    } else if (id==='constellation') {
      targets=constellation(e,sparks);
    } else {
      const suns=id==='three-suns';
      const candidates=suns?sparks.filter(p=>pickupKind(p)==='cache'):sparks;
      targets=spread(candidates,suns?3:6,speed*1.65)?.map(p=>mark(p));
    }
  }
  return targets?{id,targets,hole,guide}:null;
}

export function createFlightObjective(engine,id) {
  if (!ROUTE_BONUSES[id] || engine.tutorial) return null;
  return new FlightObjective(engine,id,engine.planRouteObjective(id));
}

export class FlightObjective {
  constructor(engine, id, plan) {
    this.engine=engine;
    this.id=id;
    this.condition=ROUTE_BONUSES[id].condition;
    this.target=ROUTE_BONUSES[id].target;
    this.progress=0;
    this.packed=0;
    this.packingRemainder=0;
    this.failed=false;
    this.eligible=Boolean(plan);
    this.targets=plan?.targets || [];
    this.hole=plan?.hole;
    this.guide=plan?.guide || [];
    this.seen=new Set();
    this.lastPulse=engine.edgingPulse.triggerCount;
    this.flashUntil=-Infinity;
    let changed=false;
    for (const t of this.targets) {
      if (t.relocate) {
        Object.assign(t.object,{x:t.x,y:t.y,anchor:null,pocket:false,accessible:true});
        changed=true;
      }
      if (t.flash) {
        if (!t.object) {
          t.object={id:'route-flash',kind:'sight',phase:0,manualOnly:false,collected:false};
          engine.layout.embers.push(t.object);
        }
        Object.assign(t.object,{x:t.x,y:t.y,anchor:null,pocket:false,sideLane:false,accessible:true,feature:'flash-relay'});
        changed=true;
      }
    }
    if (changed) engine.layout.embers.sort((a,b)=>a.x-b.x);
  }

  get complete() {
    const pastHole=!this.hole || this.engine.distance+this.engine.player.x>=this.hole.x+this.hole.influence;
    return this.eligible && !this.failed && this.progress>=this.target && pastHole;
  }
  get state() {
    return {id:this.id,progress:this.progress,target:this.target,complete:this.complete,failed:this.failed,eligible:this.eligible,packed:this.packed};
  }
  recordPacking(packet,gain) {
    // An incoming wallet remainder or a Dream pickup does not count toward
    // this flight's Gilded payout. Carry fractions only between waking pickups.
    if(this.id!=='gilded' || sleep(this.engine) || !packet.collected || packet.fetchedInDream)return;
    const credit=gain.rawGlow*gain.multiplier+this.packingRemainder;
    const units=Math.floor(credit+1e-9);
    this.packed+=units;
    this.packingRemainder=Math.max(0,credit-units);
  }
  count(t) {
    if (this.seen.has(t)) return;
    this.seen.add(t);
    this.progress=Math.min(this.target,this.progress+1);
  }
  collect(packet) {
    const e=this.engine;
    if (sleep(e) || this.complete || this.failed || packet.generated || packet.fetchedInDream) return;
    const t=this.targets.find(t=>t.object===packet && (t.type==='spark' || t.flash));
    if (!t || this.seen.has(t) || (this.id==='precision' && packet.deliveredByWisp)) return;
    if (t.flash) {
      this.seen.add(t);
      this.flashUntil=e.time+getPickupSpec(packet).sightDuration;
      return;
    }
    if (this.id==='flash-relay' && e.time>this.flashUntil) return;
    if (this.id==='constellation') {
      if(t.stage!==this.progress)return;
      this.count(t);
      for(const other of this.targets)if(other.stage===t.stage)this.seen.add(other);
      return;
    }
    if (this.id==='long-glide') {
      if (this.progress===0) this.glideFlaps=e.flaps;
      if (e.flaps!==this.glideFlaps) {this.failed=true;return;}
      this.seen.add(t);
      this.progress=this.seen.size===2 && e.time-Math.max(0,e.lastFlapTime)>=2 ? 2:1;
      return;
    }
    this.count(t);
  }
  update() {
    if (!this.eligible || this.failed) return;
    const e=this.engine, worldX=e.distance+e.player.x;
    if (sleep(e)) {
      for (const t of this.targets) if (t.type==='prop' && t.object.spent) this.seen.add(t);
      this.lastPulse=e.edgingPulse.triggerCount;
      return;
    }
    if (this.hole && this.hole.drained*GLOW_DISPLAY_SCALE>3+1e-8) {this.failed=true;return;}
    if (this.complete) return;
    if(this.id==='constellation'){
      const range=Math.max(400,maxSpeed(e)*3.5);
      const possible=this.targets.some(t=>t.stage===this.progress && !t.object.collected &&
        (t.object.carried || t.x+range>=worldX));
      if(!possible){this.failed=true;return;}
    }
    if (this.id==='flash-relay' && this.flashUntil!==-Infinity && e.time>this.flashUntil) {
      this.failed=true;
      return;
    }
    if (this.id==='long-glide' && this.seen.size) {
      if (e.flaps!==this.glideFlaps) this.failed=true;
      else if (this.seen.size===2 && e.time-Math.max(0,e.lastFlapTime)>=2) this.progress=2;
    } else if (this.id==='edgeweaver') {
      if (e.edgingPulse.triggerCount>this.lastPulse) {
        const zone=this.targets.find(t=>worldX>=t.start && worldX<=t.end);
        if (zone) this.count(zone);
      }
      this.lastPulse=e.edgingPulse.triggerCount;
    } else if (this.id==='wild-circuit') {
      for (const t of this.targets) if (t.object.spent) this.count(t);
    } else if (this.id==='wayfinder') {
      for (const t of this.targets) {
        if (Math.abs(worldX-t.x)<10 && Math.abs(e.player.y-t.y)<=t.radius) this.count(t);
      }
    }
    // A missed marker can no longer be earned after both the wisp and its
    // possible Collector delivery have left. Keep the HUD truthful on misses.
    if (worldX>this.targets.at(-1).x+Math.max(400,maxSpeed(e)*3.5) && !this.complete &&
      !(this.id==='edgeweaver' && worldX<=this.targets.at(-1).end)) this.failed=true;
  }

  resize(factor) {
    for (const p of this.guide) p.y*=factor;
    for (const t of this.targets) {
      t.y*=factor;
      for (const p of t.ribbon||[]) {p.y*=factor;p.surface*=factor;}
    }
  }
}

// Paint above fog so a marked target gives advance notice even with base
// Luminance. Only the small gold corner glints can be seen at that distance.
export function drawObjectiveMarks(c,e,{scale=1,distance=e.renderDistance}={}) {
  const objective=e.routeObjective;
  if (!objective || !objective.eligible || objective.failed || objective.complete || sleep(e)) return;
  const lead=maxSpeed(e)*(objective.id==='constellation'?2.8:1.9), playerX=distance+e.player.x;
  const pixel=(x,y,w,h,color)=>{
    c.fillStyle=color;
    c.fillRect(Math.round(x*scale),Math.round(y*scale),Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
  };
  c.save();
  for (let i=0;i<objective.guide.length;i++){
    const g=objective.guide[i], x=g.x-distance, dx=g.x-playerX;
    if(dx>lead || dx<-35) continue;
    if(i===0){
      for(let j=0;j<4;j++){
        pixel(x-2-j*3,g.y-7+j*3,4,3,'#a4e6f3');
        pixel(x-1+j*3,g.y-7+j*3,4,3,'#a4e6f3');
      }
    } else pixel(x-1,g.y,3,2,'#688894');
  }
  if(objective.hole && Math.abs(objective.hole.x-playerX)<lead){
    const x=objective.hole.x-distance,y=objective.hole.y-objective.hole.coreRadius-12;
    for(const side of [-1,1]){
      pixel(x+side*7-1,y,3,3,'#efbd7e');
      pixel(x+side*4-1,y+4,3,3,'#d78364');
    }
  }
  for (const t of objective.targets) {
    if (objective.seen.has(t) || t.object?.collected || t.object?.carried) continue;
    if (objective.id==='constellation' && t.stage!==objective.progress) continue;
    const x=t.x-distance, y=t.object?.y ?? t.y, dx=t.x-playerX;
    if (t.type==='edge') {
      if (playerX<t.start-lead || playerX>t.end) continue;
      for (const p of t.ribbon) {
        if (p.x-playerX < -95 || p.x-playerX > lead) continue;
        pixel(p.x-distance-4,p.surface-t.side*6,9,2,'#f4c87d');
      }
    }
    if(dx>lead || x < -40 || x>e.width+35) continue;
    const gate=t.type==='gate', a=gate?14:22, b=gate?t.radius:19;
    c.globalAlpha=dx>lead*.68?.68:.96;
    for (const side of [-1,1]) {
      const left=x+side*a, edge=y+side*b;
      pixel(left-2,edge-2,11,5,'#2a231e');
      pixel(left+(side<0?0:4)-1,edge+(side<0?0:-5),4,9,'#2a231e');
      pixel(left,edge,7,3,'#ffe7a3');
      pixel(left+(side<0?0:4),edge+(side<0?0:-4),3,7,'#e5b768');
      if(gate) pixel(x-7,edge,14,2,'#d4ac69');
    }
    if(gate) pixel(x-2,y,4,2,'#fff1be');
  }
  c.restore();
}
