/**
 * Scenario assumptions for sensitivity testing. Reaction includes decision and
 * touch latency after an observation. Cadence bounds how often cues are sampled.
 * These profiles are not fits to observed players or device timing.
 */
import {playerProfile,effectiveSkill,liftPenalty,cueTiming,pressTime} from './player-pilot.mjs';
const profiles = {
  human150: { reaction: .15, jitter: .04, cadence: .10, horizon: 1.8, drop: .20 },
  human250: { reaction: .25, jitter: .07, cadence: .14, horizon: 1.65, drop: .30 },
  human350: { reaction: .35, jitter: .10, cadence: .18, horizon: 1.4, drop: .40 }
};

export function humanProfile(style) {
  if(String(style).startsWith('player-'))return playerProfile(style);
  const base=String(style).replace(/-env$/,'');
  return profiles[base] ? { ...profiles[base],seekTerrainHelp:String(style).endsWith('-env') } : null;
}

export function queueHumanLift(memory, now, plan) {
  if (memory.human?.player) return queuePlayerLift(memory, now, plan);
  if (!Number.isFinite(plan.delay) || memory.pending !== null || now - memory.lastLift < .30) return;
  const {reaction, jitter, cadence} = memory.human;
  if (plan.delay > reaction + cadence) return;
  const latency = reaction + (memory.random() - .5) * 2 * jitter;
  memory.pending = now + Math.max(reaction - jitter, plan.delay + latency - reaction);
  memory.inputSamples++;
}

// Consider coasting or one deliberately timed Lift within the visible horizon.
// All scene inputs are samples taken from the currently illuminated image.
// No candidate can query future movement of a wall, draft or guardian.
export function planHumanLift(view, target, memory, opts = {}) {
  const {player, speed, terrainStep, hazards} = view;
  const {reaction, horizon} = memory.human;
  const sampleTime = .05;
  const steps = Math.max(1, Math.round(horizon / sampleTime));
  const dt = horizon / steps;
  const stepsToTarget = target ? (target.x - player.x) / Math.max(1, speed) : Infinity;
  const radius = player.radius + (terrainStep || 12) * .55;
  // Use the nearby visible opening to bias coasting, avoiding a blind turn
  // toward distant Sparks in a route the player hasn't seen.
  const slices = [];
  for (let i = 1; i <= steps; i++) {
    const x = player.x + speed * i * dt;
    slices.push({
      terrain: view.terrain.filter(pixel => Math.abs(pixel.x - x) <= radius + speed * dt * .5),
      hazards: hazards.filter(hazard => Math.abs(hazard.x - x) <= radius + hazard.radius)
    });
  }
  function score(delay) {
    const lift=Number.isFinite(delay);
    let y = player.y;
    let vy = player.vy;
    let spent = false;
    let total = 0;
    const touchedHelpers=new Set();
    // A tap has a real opportunity cost, so two equally safe choices favor glide.
    if (lift) total += opts.liftCost ? opts.liftCost(delay) : 2;
    for (let i = 1; i <= steps; i++) {
      const t = i * dt;
      if (lift && !spent && t >= delay) {
        vy = -Math.abs(view.liftImpulse);
        spent = true;
      }
      const ay = view.gravity + (view.gustAcceleration || 0);
      y += vy * dt + .5 * ay * dt * dt;
      vy = Math.min(view.terminalFall, vy + ay * dt);
      if(memory.human.seekTerrainHelp)for(const helper of view.sparks.filter(p=>p.helpFamily==='lift')){
        if(!touchedHelpers.has(helper.id)&&Math.hypot(player.x+speed*t-helper.x,y-helper.y)<=helper.radius){
          touchedHelpers.add(helper.id);vy=Math.min(vy,-136*view.scaleY);
        }
      }
      let margin = Math.min(y + player.radius, view.height + player.radius - y), tm = Infinity;
      for (const pixel of slices[i-1].terrain) { const gap = Math.abs(y - pixel.y) - radius; margin = Math.min(margin, gap); tm = Math.min(tm, gap); }
      if (opts.skimBonus && tm > 8 && tm <= (opts.skimReach || 40)) total -= opts.skimBonus * (1 / (1 + .35*t));
      let warningCost=0;
      for (const hazard of slices[i-1].hazards) {
        // A visibly falling rock keeps moving during the response delay.
        // Warning cracks predict a region below it with an uncertain release
        // time. A player can risk crossing that region before the rock falls.
        let projectedY=hazard.y;
        if(hazard.falling){
          const acceleration=360*view.scaleY,terminal=300*view.scaleY;
          const speed=Math.min(terminal,hazard.fallSpeed);
          const accelerating=Math.min(t,(terminal-speed)/acceleration);
          projectedY+=speed*accelerating+.5*acceleration*accelerating**2+terminal*(t-accelerating);
        }else if(hazard.fallWarning){
          const reach=hazard.y+Math.min(260*view.scaleY*t,190*view.scaleY*t*t);
          if(y>=hazard.y&&y<=reach+hazard.radius+player.radius)warningCost+=45;
        }
        const clearance=Math.abs(y-projectedY)-hazard.radius-player.radius;
        // The inward flecks indicate possible fuel loss. A player can pass
        // through the flecks; terrain avoidance still takes precedence.
        if(hazard.blackHoleCue)warningCost=Math.max(warningCost,Math.max(0,26-clearance)*.9);
        else margin=Math.min(margin,clearance);
      }
      const timeWeight = 1 / (1 + .35*t);
      total+=warningCost*timeWeight;
      if (margin <= 0) total += (800 + Math.min(50, -margin)*3) * timeWeight * (opts.riskScale || 1);
      else if (margin < 22) total += (22 - margin) * 1.2 * timeWeight;
      const targetWeight = Math.max(0, 1 - Math.abs(t - stepsToTarget) / .48);
      const mid = opts.mid ?? view.height * .50;
      const aim = target ? mid + (target.y - mid) * targetWeight : mid;
      // Large fuel can be caught on its near side. Allow most of the visible
      // extra radius as error margin; ordinary Sparks still need a precise arc.
      const marginToAim=target?Math.max(0,(target.radius||0)-20)*.8*targetWeight:0;
      const miss=Math.max(0,Math.abs(y-aim)-marginToAim-(targetWeight>0?0:(opts.deadZone||0)));
      total += (miss/view.height)**2 * (targetWeight > 0 ? 600*(opts.greed||1) : 65*(opts.aimWeight||1));
      if(opts.ceiling&&y<opts.ceiling)total+=((opts.ceiling-y)/view.height)**2*opts.ceilingWeight*timeWeight;
    }
    return total;
  }
  const options=opts.candidates?[Infinity,...opts.candidates.filter(t=>t<horizon-.05)]:[Infinity,...[0,.15,.30,.45,.60,.75,.90].map(t=>reaction+t).filter(t=>t<horizon-.12)];
  let delay=Infinity,best=Infinity;
  let glideCost=Infinity;
  for(const candidate of options){const value=score(candidate);if(candidate===Infinity)glideCost=value;if(value<best){best=value;delay=candidate;}}
  return {flap:Number.isFinite(delay), delay, target:target ? {id:target.id,x:target.x,y:target.y} : null, glideCost, bestCost:best};
}


// Estimate whether one delayed Lift or coasting can reach a *visible* Spark.
// This prevents chasing every low-value wall pocket simply because it is first.
export function selectHumanFuel(view,noticed,reaction,opts={}){
 let best=null,utility=-Infinity;
 const gravity=view.gravity+(view.gustAcceleration||0),player=view.player;
 for(const p of view.sparks){
  if(p.flash||!noticed.get(p.id)||p.dim&&view.energy>=view.maxEnergy*.4)continue;
  const eta=(p.x-player.x)/Math.max(1,view.speed);if(eta<0||eta>3)continue;
  let miss=Infinity;
  for(const delay of [Infinity,reaction,reaction+.2,reaction+.4,reaction+.6,reaction+.8]){
   let y=player.y,vy=player.vy,pressed=false;
   for(let t=0;t<eta;t+=.05){
    const dt=Math.min(.05,eta-t);
    if(!pressed&&t>=delay){vy=-view.liftImpulse;pressed=true;}
    y+=vy*dt+.5*gravity*dt*dt;vy=Math.min(view.terminalFall,vy+gravity*dt);
   }
   const fetchMargin=(p.mass||1)<=(view.collectorMass||2)?(view.collectorRange||0)*.35*(opts.fetchScale||1):0;
   miss=Math.min(miss,Math.max(0,Math.abs(y-p.y)-(p.radius||20)-fetchMargin));
  }
  let near=0;if(opts.densityBonus)for(const q of view.sparks)if(q!==p&&!q.flash&&Math.abs(q.x-p.x)<130&&Math.abs(q.y-p.y)<110)near++;
  const value=(1+.3*((p.mass||1)-1))/(.6+eta)-Math.abs(p.y-player.y)/view.height*.55-miss/35+(opts.densityBonus||0)*near+((p.mass||1)<=(view.collectorMass||2)?(opts.fetchBonus||0):0);
  if(value>utility){utility=value;best=p;}
 }
 return best;
}


// ---------------------------------------------------------------------------------------------------------------------------------
// Player-style pilots (player-beginner / player-average / player-good), added 2026-11-18. Same observation limits as the human profiles
// above, but they play like someone who has learned the basics: Lift only when it pays, press near the efficient moment (fall speed back
// at the Lift's launch speed, which is exactly when Lift Guide's arrow is open), glide inside a tolerant altitude band, ride lower when the
// Meter is low, never climb to the ceiling, go for Sparks more greedily when empty, play safer on the last heart, remember a retried stop.
// Only what a player can see is used: the view, the Meter, whether the arrow card is mounted, whether this stop was already tried.
export function playerLiftOptions(view, memory, extra = {}) {
  const sk = { ...effectiveSkill(memory.human, { retry: !!memory.retry, lastHeart: !!memory.lastHeart, guide: !!memory.guide }), ...(extra.sk || {}) };
  const fuelFrac = view.maxEnergy ? view.energy / view.maxEnergy : 1, scarcity = Math.max(0, .55 - fuelFrac) / .55;
  const scaleY = view.scaleY || 1, cue = cueTiming({ vy: view.player.vy, scale: scaleY });
  const floor = memory.human.reaction * .5;
  const grid = []; for (let t = floor; t < sk.horizon; t += .05) grid.push(+t.toFixed(3));
  return {
    sk, fuelFrac, scarcity, cue, floor, candidates: grid,
    liftCost: delay => liftPenalty({ fuelFrac, pressAt: delay, cueAt: Math.max(floor, cue.until), sigma: sk.sigma }) * (extra.liftScale || 1),
    mid: view.height * (.50 + .12 * scarcity),
    deadZone: (extra.deadZone ?? (46 + 40 * scarcity)) * scaleY * (memory.human.name === 'player-good' ? 1.2 : memory.human.name === 'player-average' ? 1 : .8),
    aimWeight: .6 + .5 * (1 - scarcity), greed: sk.greed * (1 + 1.2 * scarcity) * (extra.greed || 1),
    skimBonus: extra.skim ? extra.skim * sk.riskTol * (memory.lastHeart ? 0 : 1) : 0, skimReach: extra.skimReach,
    riskScale: 1 / Math.max(.4, sk.riskTol), ceiling: view.height * .2, ceilingWeight: 40, ...(extra.override || {})
  };
}

export function planPlayerLift(view, target, memory, extra = {}) {
  const opts = playerLiftOptions(view, memory, extra);
  const plan = planHumanLift(view, target, { ...memory, human: { ...memory.human, horizon: opts.sk.horizon } }, opts);
  plan.sigma = opts.sk.sigma; plan.sk = opts.sk;
  return plan;
}

export function queuePlayerLift(memory, now, plan) {
  // an insurance tap that a nervous player adds shortly after a Lift
  if (memory.echoAt != null && memory.pending === null && now >= memory.echoAt - .03 && now - memory.lastLift >= .12) { memory.pending = Math.max(now, memory.echoAt); memory.echoAt = null; memory.inputSamples++; return; }
  if (!plan.flap || !Number.isFinite(plan.delay) || memory.pending !== null || now - memory.lastLift < .30) return;
  const { reaction, cadence } = memory.human, sk = plan.sk || { sigma: .05, slip: 0, waste: 0 }, floor = reaction * .5;
  if (plan.delay > floor + cadence) return; // not yet: replan on the next look
  // Attention goes to hazards: a Lift that avoids a wall or rock is pressed more carefully than a routine hover Lift.
  const forced = plan.glideCost - plan.bestCost > 40, care = forced ? .3 : 1;
  memory.pending = pressTime({ now, intended: now + plan.delay, reactionFloor: floor, sigma: sk.sigma * (forced ? .45 : 1), random: memory.random, slip: sk.slip * care });
  memory.inputSamples++;
  if (memory.random() < sk.waste * care) memory.echoAt = memory.pending + .15 + memory.random() * .25;
}

// A player who retries a stop remembers where its Sparks were: Sparks seen in earlier attempts of the same stop are treated as seen up to
// about two seconds ahead (memory only; nothing the player could not know). store is kept per stop by the caller.
export function applyRecall(view, memory, e) {
  const store = memory.store; if (!store || !memory.human?.player) return;
  for (const s of view.sparks) if (!s.flash && !s.hint) store.seen.set(s.id, { id: s.id, wx: e.distance + s.x, y: s.y, radius: s.radius, mass: s.mass, dim: s.dim });
  if (!memory.retry) return;
  const have = new Set(view.sparks.map(s => s.id)), ahead = view.speed * 2.2;
  for (const r of store.seen.values()) {
    const x = r.wx - e.distance; if (have.has(r.id) || x < view.player.x + 10 || x > view.player.x + ahead) continue;
    const packet = e.layout.embers.find(p => p.id === r.id); if (!packet || packet.collected || packet.carried || packet.attracted) continue;
    view.sparks.push({ id: r.id, x, y: r.y, radius: r.radius, dim: r.dim, flash: false, mass: r.mass || 1, hint: true, recalled: true }); memory.noticed.set(r.id, true);
  }
}
