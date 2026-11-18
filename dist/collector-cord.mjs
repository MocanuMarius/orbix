// Collector cord, drawing physics only (design lab v1.0-cord). The tow cord that joins the Wisp to the carried Spark is drawn by
// drawCollectorGrip (capture-art.mjs); this module supplies the points for the review variants selected by ?cord=a|b|c|d.
//   a  today's pinned bow (collector-tow-geometry.mjs), unchanged, not handled here
//   b  rope: Verlet chain, slack hangs and swings, taut at full reach (thinner, brighter)
//   c  whip: rope + travelling waves (launch S-curve, crack with a 1-frame tip flick, bend on the turn, short recoil at the drop-off)
//   d  elastic: stretchy band, tension shown by thickness and colour, under-damped bounce
// Purely visual: nothing here reads or writes the flight state, and the Collector's own path never depends on it.
export const CORD_POINTS = 13, CORD_SEGMENTS = CORD_POINTS - 1;
const STEP = 1 / 120, MAX_STEPS = 8, GRAVITY = 520, JUMP = 220, GAP = .25;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const u = clamp((v - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

export function cordVariant(search) {
  try {
    const s = search ?? (typeof location !== 'undefined' ? location.search : '');
    const v = String(new URLSearchParams(s).get('cord') || 'a').toLowerCase();
    return v === 'b' || v === 'c' || v === 'd' ? v : 'a';
  } catch { return 'a'; }
}

export function createCord() {
  return {x: new Float64Array(CORD_POINTS), y: new Float64Array(CORD_POINTS), px: new Float64Array(CORD_POINTS), py: new Float64Array(CORD_POINTS),
    out: new Float64Array(CORD_POINTS * 2), ready: false, t: 0, born: 0, ax: 0, ay: 0, bx: 0, by: 0, side: 1,
    d0: 1, waves: [], lastWave: -9, vA: 0, tension: 0, tv: 0, taut: 0, bright: 0, length: 0, towStage: 'tow'};
}

function straight(c, ax, ay, bx, by, t, sag = 0) {
  for (let i = 0; i < CORD_POINTS; i++) {
    const u = i / CORD_SEGMENTS, y = ay + (by - ay) * u + Math.sin(Math.PI * u) * sag;
    c.x[i] = c.px[i] = ax + (bx - ax) * u; c.y[i] = c.py[i] = y;
  }
  c.d0 = Math.max(4, Math.hypot(bx - ax, by - ay)); c.ax = ax; c.ay = ay; c.bx = bx; c.by = by; c.ready = true; c.t = t; c.born = t; c.tension = c.tv = 0; c.waves.length = 0; c.lastWave = -9; c.vA = 0;
}

// Advance one cord to time t (seconds) with the Wisp end (ax,ay), the Spark end (bx,by) and the Collector's full reach.
// Rendering may call this several times for the same t: only a later t steps the simulation.
export function stepCord(c, variant, ax, ay, bx, by, reach, t, opts = {}) {
  const d = Math.hypot(bx - ax, by - ay), dt = t - c.t;
  const jumped = c.ready && Math.hypot(ax - c.ax, ay - c.ay) + Math.hypot(bx - c.bx, by - c.by) > JUMP;
  if (!c.ready || dt < 0 || dt > GAP || jumped || !(Number.isFinite(ax + ay + bx + by))) {
    if (!(Number.isFinite(ax + ay + bx + by))) return c;
    c.side = by > ay ? -1 : 1;
    straight(c, ax, ay, bx, by, t, variant === 'c' ? 0 : Math.min(18, d * .25));
  } else if (dt > 0) {
    const n = clamp(Math.ceil(dt / STEP), 1, MAX_STEPS), h = dt / n, last = CORD_SEGMENTS;
    // The cord is as long as the tow it was caught at (plus some slack for a near catch): it hangs when the Wisp comes closer, goes taut when it pulls away.
    const near = 1 - smooth(.5, 1, c.d0 / Math.max(30, reach)), L0 = c.d0 * (1.015 + .2 * near), full = d / L0;
    const rest = variant === 'd' ? c.d0 * .8 : L0;
    const gs = 1 - .97 * smooth(.94, 1, full), seg = rest / CORD_SEGMENTS, damp = Math.exp(-(variant === 'd' ? 3.4 : 1.7) * h);
    for (let s = 1; s <= n; s++) {
      const f = s / n, pax = c.ax + (ax - c.ax) * f, pay = c.ay + (ay - c.ay) * f, pbx = c.bx + (bx - c.bx) * f, pby = c.by + (by - c.by) * f;
      for (let i = 1; i < last; i++) {
        const vx = (c.x[i] - c.px[i]) * damp, vy = (c.y[i] - c.py[i]) * damp;
        c.px[i] = c.x[i]; c.py[i] = c.y[i]; c.x[i] += vx; c.y[i] += vy + (variant === "d" ? 0 : GRAVITY * gs * h * h);
      }
      c.x[0] = pax; c.y[0] = pay; c.x[last] = pbx; c.y[last] = pby;
      const iterations = variant === 'd' ? 3 : 10, k = variant === 'd' ? .18 : 1;
      for (let it = 0; it < iterations; it++) {
        for (let i = 0; i < last; i++) {
          const dx = c.x[i + 1] - c.x[i], dy = c.y[i + 1] - c.y[i], len = Math.hypot(dx, dy) || 1e-6;
          // A rope only resists stretching; the band resists both ways, softly.
          const diff = variant === 'd' ? (len - seg) / len * k : Math.max(0, len - seg) / len;
          const wa = i === 0 ? 0 : .5, wb = i + 1 === last ? 0 : .5, tot = wa + wb;
          if (!tot) continue;
          const ox = dx * diff / tot, oy = dy * diff / tot;
          c.x[i] += ox * wa; c.y[i] += oy * wa; c.x[i + 1] -= ox * wb; c.y[i + 1] -= oy * wb;
        }
        c.x[0] = pax; c.y[0] = pay; c.x[last] = pbx; c.y[last] = pby;
      }
    }
    // Whip: a sudden change of the Wisp's vertical speed (a Lift or a dive) throws a wave down the cord.
    const vA = (ay - c.ay) / dt;
    if (variant === 'c' && Math.abs(vA - c.vA) > 70 && t - c.lastWave > .22) { c.waves.push({t0: t, sign: vA > c.vA ? 1 : -1}); if (c.waves.length > 3) c.waves.shift(); c.lastWave = t; }
    c.vA = vA;
    c.ax = ax; c.ay = ay; c.bx = bx; c.by = by; c.t = t;
    if (variant === 'd') {
      // Tension is its own under-damped spring: it overshoots when the Spark stops or the cord is released.
      const target = clamp((d / rest - 1) / .6, 0, 1);
      const dtn = Math.min(dt, .05), sub = Math.max(1, Math.ceil(dtn / STEP)), hh = dtn / sub;
      for (let i = 0; i < sub; i++) { c.tv += ((target - c.tension) * 300 - c.tv * 7.5) * hh; c.tension += c.tv * hh; }
      c.tension = clamp(c.tension, -.35, 1.4);
    }
  }
  c.length = d;
  c.taut = variant === 'd' ? clamp(c.tension, 0, 1) : smooth(.94, 1, d / Math.max(4, c.d0 * (1.015 + .2 * (1 - smooth(.5, 1, c.d0 / Math.max(30, reach))))));
  c.bright = c.taut;
  return c;
}

// Fill c.out with the points to draw (x0,y0,x1,y1,...), adding the whip waves for variant c / ripples for variant d.
export function cordPoints(c, variant, t, opts = {}) {
  const last = CORD_SEGMENTS, out = c.out, chx = c.bx - c.ax, chy = c.by - c.ay, len = Math.hypot(chx, chy) || 1;
  const nx = -chy / len * c.side, ny = chx / len * c.side, age = t - c.born;
  const amp = Math.min(34, len * .3);
  const turn = opts.turnAge, drop = opts.dropAge;
  for (let i = 0; i <= last; i++) {
    const u = i / last;
    let off = 0;
    if (variant === 'c') {
      // Launch: an S-curve that runs from the Wisp to the tip while it decays, then the crack.
      const env = Math.sin(Math.PI * Math.min(1, u * 1.15));
      off += amp * Math.exp(-age * 2.2) * Math.sin(2 * Math.PI * (u * .95 - age * 2.2)) * env * smooth(0, .06, age);
      // The crack: a narrow pulse reaches the tip at 0.4 s and kicks it for about one frame.
      const front = age / .4, g = Math.exp(-Math.pow((u - front) / .12, 2));
      off += amp * .5 * g * Math.sin(Math.PI * Math.min(1, u)) * (front < 1.1 ? 1 : 0);
      if (i >= last - 1 && Math.abs(age - .4) < .035) off += 5 * (i === last ? 0 : 1);
      // The turn: a bend that travels back from the Spark to the Wisp.
      if (turn !== undefined && turn >= 0 && turn < .6) {
        const f2 = 1 - turn / .35, g2 = Math.exp(-Math.pow((u - f2) / .15, 2));
        off -= amp * .85 * g2 * Math.sin(Math.PI * u);
      }
      // The drop-off: the cord recoils in a short loop.
      if (drop !== undefined && drop > 0) off += 14 * clamp(drop, 0, 1) * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * (u * 1.5 + drop));
    } else if (variant === 'd') {
      const buzz = clamp(1 - c.tension, 0, 1) * 1.6 + Math.abs(c.tv) * .35;
      off += buzz * Math.sin(Math.PI * u) * Math.sin(u * 17 + t * 38);
    }
    let lift = 0;
    if (variant === 'c') for (const w of c.waves) {
      const tau = t - w.t0;
      if (tau >= 0 && tau < .8) lift += w.sign * 22 * Math.exp(-Math.pow((u - tau / .4) / .16, 2)) * Math.sin(Math.PI * u) * (1 - tau / .8);
    }
    out[i * 2] = c.x[i] + nx * off;
    out[i * 2 + 1] = c.y[i] + ny * off + lift;
  }
  out[0] = c.ax; out[1] = c.ay; out[last * 2] = c.bx; out[last * 2 + 1] = c.by;
  return out;
}

// Per-engine cords, keyed by collector index (Twin Wick draws two).
export function cordFor(engine, index) {
  const store = engine.__cords || (engine.__cords = []);
  return store[index || 0] || (store[index || 0] = createCord());
}
