const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const ease = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function stroke(age, time) {
  if (age >= 0 && age < .08) return mix(.42, .06, ease(age / .08));
  if (age >= .08 && age < .28) return mix(.06, .96, ease((age - .08) / .20));
  if (age >= .28 && age < 1.0) return mix(.96, .42, ease((age - .28) / .72));
  return .42 + Math.sin(time * 3.4) * .025;
}

// Analytic critically damped joints. The same response is sampled at any
// display refresh rate, including interrupted strokes and Boost transitions.
function spring(joint, target, dt, frequency) {
  const offset = joint.value - target, velocity = joint.velocity + frequency * offset;
  const decay = Math.exp(-frequency * dt);
  joint.value = target + (offset + velocity * dt) * decay;
  joint.velocity = (joint.velocity - frequency * velocity * dt) * decay;
}

export class PhoenixMotion {
  constructor() {
    this.lastTime = null;
    this.shoulder = { value: -.69, velocity: 0 };
    this.elbow = { value: .1, velocity: 0 };
    this.wrist = { value: .05, velocity: 0 };
    this.farShoulder = { value: -.60, velocity: 0 };
    this.fold = { value: 1, velocity: 0 };
    this.tail = { value: 0, velocity: 0 };
  }

  update(engine, time) {
    const dt = this.lastTime === null ? 1 / 60 : clamp(time - this.lastTime, 0, .05);
    this.lastTime = time;
    const age = time - (engine.lastFlapTime ?? -1000), boost = engine.boostTime > 0;
    const beat = stroke(age, time), farBeat = stroke(age - .045, time - .045);
    const target = boost ? -.83 : .02 - beat * 1.70;
    spring(this.shoulder, target, dt, 30);
    spring(this.farShoulder, boost ? -.73 : .12 - farBeat * 1.65, dt, 24);
    spring(this.elbow, boost ? .05 : .10 + Math.sin(beat * Math.PI) * .28, dt, 18);
    spring(this.wrist, this.elbow.value * .55, dt, 12);
    spring(this.fold, boost ? .66 : age > .30 && age < .85 ? .73 : 1, dt, 20);
    spring(this.tail, clamp((engine.player?.vy || 0) / 450, -.55, .55), dt, 10);
    return {
      shoulder: this.shoulder.value, farShoulder: this.farShoulder.value,
      elbow: this.elbow.value, wrist: this.wrist.value, fold: this.fold.value,
      heave: engine.reducedMotion ? 0 : Math.sin(time * 3.4) * .65 + Math.sin(beat * Math.PI) * .45,
      tail: this.tail.value,
      boost, time,
    };
  }
}

export function deformWing(base, output, pose, far = false) {
  const angle = far ? pose.farShoulder : pose.shoulder;
  const ca = Math.cos(angle), sa = Math.sin(angle), root2 = Math.SQRT1_2;
  for (let i = 0; i < base.length; i += 2) {
    let x = base[i], y = base[i + 1];
    const span = clamp((-x - y) * root2 / 80, 0, 1);
    const across = (x - y) * root2 * mix(1, pose.fold, span);
    const along = (-x - y) * root2;
    x = (-along + across) * root2; y = (-along - across) * root2;
    const weight = ease((span - .30) / .70);
    const bend = pose.elbow * weight + pose.wrist * weight * weight
      + Math.sin(pose.time * 6 - span * 3) * .035 * span * span;
    const cb = Math.cos(bend), sb = Math.sin(bend);
    const rx = x + 24, ry = y + 24;
    x = x * (1 - weight) + (rx * cb - ry * sb - 24) * weight;
    y = y * (1 - weight) + (rx * sb + ry * cb - 24) * weight;
    output[i] = x * ca - y * sa;
    output[i + 1] = x * sa + y * ca;
  }
}

export function deformTail(base, output, pose) {
  for (let i = 0; i < base.length; i += 2) {
    const x = base[i], y = base[i + 1], distance = clamp(-x / 80, 0, 1);
    const flow = distance * distance;
    output[i] = x - Math.sin(pose.time * 5 - distance * 4) * flow * 1.5;
    output[i + 1] = y + (Math.sin(pose.time * (pose.boost ? 11 : 6) - distance * 6) * 4
      - pose.tail * 13) * flow;
  }
}
