// Collector cord (design v1.1-cord, "elastic", approved by the owner on 18 November 2026).
// The tow cord that joins the Wisp to the carried Spark is a stretchy band: always a straight line between its two ends, its tension shown by
// thickness (3 px slack, 2 px, 1 px at full stretch) and colour (mint to pale). Tension is an under-damped spring, so the band bounces when it is
// caught tight and when it is released at the drop-off. Purely visual: nothing here reads or writes flight state.
export const CORD_POINTS = 13, CORD_SEGMENTS = CORD_POINTS - 1;
const STEP = 1 / 120, JUMP = 220, GAP = .25;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createCord() {
  return {out: new Float64Array(CORD_POINTS * 2), ready: false, t: 0, born: 0, ax: 0, ay: 0, bx: 0, by: 0, d0: 1, tension: 0, tv: 0, length: 0};
}

// Advance to time t (seconds) with the Wisp end (ax,ay) and the Spark end (bx,by). Several calls for the same t step only once.
export function stepCord(c, ax, ay, bx, by, reach, t) {
  if (!Number.isFinite(ax + ay + bx + by + t)) return c;
  const d = Math.hypot(bx - ax, by - ay), dt = t - c.t;
  const jumped = c.ready && Math.hypot(ax - c.ax, ay - c.ay) + Math.hypot(bx - c.bx, by - c.by) > JUMP;
  if (!c.ready || dt < 0 || dt > GAP || jumped) {
    // A new tow (or a teleport) starts slack, with a small kick so it snaps tight.
    c.d0 = Math.max(4, d); c.born = t; c.ready = true; c.tension = 0; c.tv = 3;
  } else if (dt > 0) {
    // Tension follows the length against the Collector's reach: slack up to about reach, fully stretched at twice the reach (a Cast Line catch).
    const target = clamp((d / Math.max(30, reach) - .6) / 1.4, 0, 1);
    const n = clamp(Math.ceil(Math.min(dt, .05) / STEP), 1, 6), h = Math.min(dt, .05) / n;
    for (let i = 0; i < n; i++) { c.tv += ((target - c.tension) * 300 - c.tv * 7.5) * h; c.tension += c.tv * h; }
    c.tension = clamp(c.tension, -.4, 1.4);
  }
  c.ax = ax; c.ay = ay; c.bx = bx; c.by = by; c.t = t; c.length = d;
  return c;
}

// Whole-pixel look from the tension: 3 px slack, 2 px, 1 px at full stretch; colour mix 0 (mint) to 1 (pale).
export function cordLook(c) {
  const T = clamp(c.tension, 0, 1);
  return {width: T < .3 ? 3 : T < .65 ? 2 : 1, mix: T};
}

// Points to draw (x0,y0,x1,y1,...): the straight line plus a gentle ripple while slack, and a stronger sideways bounce at the drop-off (dropAge 0..1).
export function cordPoints(c, t, dropAge) {
  const last = CORD_SEGMENTS, out = c.out, chx = c.bx - c.ax, chy = c.by - c.ay, len = Math.hypot(chx, chy) || 1;
  const nx = -chy / len, ny = chx / len, buzz = clamp(1 - c.tension, 0, 1) * 1.0 + Math.abs(c.tv) * .15;
  for (let i = 0; i <= last; i++) {
    const u = i / last, env = Math.sin(Math.PI * u);
    let off = buzz * env * Math.sin(u * 17 + t * 38);
    if (dropAge > 0) off += 9 * env * Math.sin(Math.PI * 5 * clamp(dropAge, 0, 1)) * (1 - .5 * clamp(dropAge, 0, 1));
    out[i * 2] = c.ax + chx * u + nx * off; out[i * 2 + 1] = c.ay + chy * u + ny * off;
  }
  out[0] = c.ax; out[1] = c.ay; out[last * 2] = c.bx; out[last * 2 + 1] = c.by;
  return out;
}

// Reduced motion: a plain straight cord, no bounce.
export function straightPoints(c) {
  const last = CORD_SEGMENTS, out = c.out;
  for (let i = 0; i <= last; i++) { const u = i / last; out[i * 2] = c.ax + (c.bx - c.ax) * u; out[i * 2 + 1] = c.ay + (c.by - c.ay) * u; }
  return out;
}

// Per-engine cords, keyed by collector index (Twin Wick draws two).
export function cordFor(engine, index) {
  const store = engine.__cords || (engine.__cords = []);
  return store[index || 0] || (store[index || 0] = createCord());
}
