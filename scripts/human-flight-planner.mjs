/**
 * Scenario assumptions for sensitivity testing. Reaction includes decision and
 * touch latency after an observation. Cadence bounds how often cues are sampled.
 * These profiles are not fits to observed players or device timing.
 */
const profiles = {
  human150: { reaction: .15, jitter: .04, cadence: .10, horizon: 1.15, drop: .20 },
  human250: { reaction: .25, jitter: .07, cadence: .14, horizon: 1.00, drop: .30 },
  human350: { reaction: .35, jitter: .10, cadence: .18, horizon: .85, drop: .40 }
};

export function humanProfile(style) {
  return profiles[style] ? { ...profiles[style] } : null;
}

export function queueHumanLift(memory, now, plan) {
  if (!Number.isFinite(plan.delay) || memory.pending !== null || now - memory.lastLift < .30) return;
  const {reaction, jitter, cadence} = memory.human;
  if (plan.delay > reaction + cadence) return;
  const latency = reaction + (memory.random() - .5) * 2 * jitter;
  memory.pending = now + Math.max(reaction - jitter, plan.delay + latency - reaction);
  memory.inputSamples++;
}

// Only these two alternatives are considered: glide, or one Lift after reacting.
// All scene inputs are samples taken from the currently illuminated image.
// No candidate can query future movement of a wall, draft or guardian.
export function planHumanLift(view, target, memory) {
  const {player, speed, terrainStep, hazards} = view;
  const {reaction, horizon} = memory.human;
  const sampleTime = .125;
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
  function score(lift) {
    let y = player.y;
    let vy = player.vy;
    let spent = false;
    let total = 0;
    // A tap has a real opportunity cost, so two equally safe choices favor glide.
    if (lift) total += 2;
    for (let i = 1; i <= steps; i++) {
      const t = i * dt;
      if (lift && !spent && t >= reaction) {
        vy = -Math.abs(view.liftImpulse);
        spent = true;
      }
      const ay = view.gravity + (view.gustAcceleration || 0);
      y += vy * dt + .5 * ay * dt * dt;
      vy = Math.min(view.terminalFall, vy + ay * dt);
      let margin = Math.min(y + player.radius, view.height + player.radius - y);
      for (const pixel of slices[i-1].terrain) margin = Math.min(margin, Math.abs(y - pixel.y) - radius);
      for (const hazard of slices[i-1].hazards) margin = Math.min(margin, Math.abs(y - hazard.y) - hazard.radius - player.radius);
      const timeWeight = 1 / (1 + .35*t);
      if (margin <= 0) total += (800 + Math.min(50, -margin)*3) * timeWeight;
      else if (margin < 22) total += (22 - margin) * 1.2 * timeWeight;
      const targetWeight = Math.max(0, 1 - Math.abs(t - stepsToTarget) / .42);
      const mid = view.height * .50;
      const aim = target ? mid + (target.y - mid) * targetWeight : mid;
      total += ((y - aim) / view.height)**2 * (targetWeight > 0 ? 600 : 65);
    }
    return total;
  }
  const lift = score(true) < score(false);
  return {flap:lift, delay:lift ? reaction : Infinity, target:target ? {id:target.id,x:target.x,y:target.y} : null};
}
