import { DRAFT_TUNING } from './drafts.mjs?v=living-choices-2';
import { scenePropBounds } from './scene-props.mjs?v=living-choices-2';
import { formatGlow } from './vitality.mjs?v=living-choices-2';
import { lightVisibility } from './light-field.mjs?v=living-choices-2';

// Small, deterministic actors attached to existing terrain. Static mountain
// meshes never change, and each actor is used once: no repeatable currency farm.
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const BIOME_INTERACTIONS = Object.freeze({
  moonruins: { kind: 'crumble', family: 'fall', color: '#c9b293', instruction: 'Cracked masonry · watch for falling stones' },
  frost: { kind: 'thaw', family: 'fall', color: '#b9e5ec', instruction: 'Warm light melts the ice · watch the cracks' },
  pinewood: { kind: 'pinecone', family: 'fall', color: '#c99563', instruction: 'Ripe cones tremble before they fall' },
  marsh: { kind: 'bubble', family: 'lift', color: '#b8d89b', instruction: 'Touch a reed bubble for a lift' },
  fungal: { kind: 'spore', family: 'lift', color: '#d5b7df', instruction: 'Touch a puffcap to ride its spores' },
  basalt: { kind: 'geyser', family: 'vent', color: '#eead79', instruction: 'Fumaroles hiss before the rising jet' },
  desert: { kind: 'sandfall', family: 'fall', color: '#e1c392', instruction: 'Trickling sand warns of loose stone' },
  coral: { kind: 'tide', family: 'vent', color: '#97d6cb', instruction: 'Anemones open into rising currents' },
  crystal: { kind: 'resonate', family: 'reveal', color: '#c8b9ee', instruction: 'Touch a crystal to reveal the way' },
  cloud: { kind: 'draft', family: 'vent', color: '#d7dfdd', instruction: 'Wind bells gather a rising current' },
  thorn: { kind: 'seedpod', family: 'bloom', color: '#bed18d', instruction: 'Touch a seedpod · its bristles fold into Sparks' },
  cemetery: { kind: 'bell', family: 'reveal', color: '#d2ccb2', instruction: 'Touch a grave bell to reveal the way' },
});
export const BIOME_DYNAMIC_TUNING = Object.freeze({ maximumActors: 10, spacing: 1120,
  warning: 1.2, glowGift: 10, minimumStart: 1020, exitClearance: 580 });

function hash(value) { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
function surfaceAt(shape, x, ceiling) {
  if (!shape) return null;
  let value = ceiling ? -Infinity : Infinity;
  for (let i = 2; i < shape.length - 1; i++) {
    const a = shape[i], b = shape[i + 1];
    if (x < Math.min(a[0], b[0]) || x > Math.max(a[0], b[0])) continue;
    const t = (x - a[0]) / (b[0] - a[0] || 1), y = a[1] + (b[1] - a[1]) * t;
    value = ceiling ? Math.max(value, y) : Math.min(value, y);
  }
  return Number.isFinite(value) ? value : null;
}

function chamberAt(obstacles, x, height) {
  let top = 27, bottom = height - 28, ceiling = null, floor = null;
  for (const o of obstacles) {
    if (o.destroyed || x < o.x - o.width || x > o.x + o.width * 2.5) continue;
    const roof = surfaceAt(o.topShape, x - o.x, true), ground = surfaceAt(o.bottomShape, x - o.x, false);
    if (roof !== null) { const y = o.center - o.gap / 2 + roof; if (y > top) { top = y; ceiling = o; } }
    if (ground !== null) { const y = o.center + o.gap / 2 + ground; if (y < bottom) { bottom = y; floor = o; } }
  }
  return { top, bottom, ceiling, floor };
}

/** Exported for a small geometry/determinism probe, also used by the engine. */
export function createBiomeActors(engine) {
  const identity = engine.levelIdentity || engine.layout?.levelIdentity || {}, spec = BIOME_INTERACTIONS[identity.biomeId];
  if (!spec || engine.tutorial || engine.bossEncounter) return [];
  const obstacles = engine.layout?.obstacles || [], sections = engine.layout?.sections || [];
  const props = obstacles.flatMap(scenePropBounds), height = engine.height, sy = height / 620;
  const last = engine.totalDistance + engine.player.x - BIOME_DYNAMIC_TUNING.exitClearance;
  const dangerous = spec.family === 'fall', candidates = [], offset = hash(`${engine.seed}:${identity.id}:actors`) % 4;
  // Broad shoulders are real parts of the terrain polygon too. They leave
  // room for a hanging actor beside a roof arch instead of inside that prop.
  const fractions = [.35, .68, 1.03, 1.38, 1.75, 2.05, -.2];
  for (const o of obstacles) {
    if (o.hard || o.reservedDraft || o.reservedFork || o.destroyed || o.soft) continue;
    for (let attempt = 0; attempt < fractions.length; attempt++) {
      const x = o.x + o.width * fractions[(attempt + offset) % fractions.length];
      if (x < BIOME_DYNAMIC_TUNING.minimumStart || x > last) continue;
      // No surprise layered into a choke, a negative-pickup chain or a draft.
      if (sections.some(s => s.hard && x + 110 > s.start && x - 110 < s.end)) continue;
      if ((engine.layout.riskChains || []).some(s => x + 160 > s.start && x - 160 < s.end)) continue;
      if ((engine.layout.flightForks || []).some(f => x + 160 > f.approachStart && x - 160 < f.exitEnd)) continue;
      if ((engine.drafts?.zones || []).some(z => Math.abs(x - z.x) < z.rx + 160)) continue;
      const band = chamberAt(obstacles, x, height), host = dangerous ? band.ceiling : band.floor;
      if (!host || host.hard || band.bottom - band.top < Math.max(125, 240 * sy)) continue;
      const anchorY = dangerous ? band.top : band.bottom;
      if (anchorY < 28 || anchorY > height - 29) continue;
      const radius = dangerous ? 11 : 13, y = dangerous ? anchorY + 9 : anchorY - Math.max(32, 53 * sy);
      if (props.some(p => x + 37 > p.minX && x - 37 < p.maxX && y + 35 > p.minY && y - 35 < p.maxY)) continue;
      if (spec.family === 'vent') {
        // The entire current sits in open air, with a body-wide escape above.
        let clear = true;
        for (const sx of [x - 74, x + 74]) {
          const side = chamberAt(obstacles, sx, height);
          if (side.top > band.top + 20 * sy || side.bottom < band.bottom - 20 * sy) clear = false;
        }
        if (!clear) continue;
      }
      candidates.push({ x, y, baseY: y, anchorY, floorY: band.bottom - 14, topY: band.top,
        radius, host, hostCenter: host.center, kind: spec.kind, family: spec.family,
        color: spec.color, instruction: spec.instruction, phase: 'idle', age: 0, vy: 0,
        spent: false, hinted: false, seed: hash(`${engine.seed}:${o.id}:${attempt}`) });
      break;
    }
  }
  candidates.sort((a, b) => a.x - b.x);
  const actors = [];
  for (const candidate of candidates) {
    if (actors.length && candidate.x - actors.at(-1).x < BIOME_DYNAMIC_TUNING.spacing) continue;
    candidate.id = `biome:${identity.biomeId}:${actors.length}`; actors.push(candidate);
    if (actors.length >= BIOME_DYNAMIC_TUNING.maximumActors) break;
  }
  return actors;
}

export class BiomeDynamics {
  constructor(engine) {
    this.engine = engine; this.items = createBiomeActors(engine); this.cursor = 0;
    this.spec = BIOME_INTERACTIONS[engine.levelIdentity?.biomeId] || null;
    for (const item of this.items) if (item.family === 'vent' && engine.drafts) {
      const space = item.floorY - item.topY, ry = Math.min(88 * engine.scaleY, space * .27);
      item.zone = { id: item.id, biome: item.kind, x: item.x, y: item.floorY - ry - 16,
        rx: 65, ry, direction: -1, force: item.kind === 'geyser' ? 530 : item.kind === 'draft' ? 570 : 490,
        triggeredAt: null };
      engine.drafts.zones.push(item.zone);
    }
    if (engine.drafts) engine.drafts.zones.sort((a, b) => a.x - b.x);
  }

  update(dt) {
    const e = this.engine;
    if (!this.items.length || e.dying || e.completing || e.finished) return;
    const worldX = e.distance + e.player.x, sy = e.scaleY || e.height / 620;
    const fallingLead = (e.baseSpeed || 154) * (BIOME_DYNAMIC_TUNING.warning + .70);
    let light = null;
    while (this.cursor < this.items.length && this.items[this.cursor].x < worldX - 250) this.cursor++;
    for (let i = this.cursor; i < this.items.length; i++) {
      const item = this.items[i], dx = item.x - worldX;
      if (dx > e.width + 100) break;
      if (item.family !== 'fall' || item.phase !== 'falling' && item.phase !== 'spent') {
        item.y = item.baseY + Math.sin(e.time * .9 + (item.host.phase || 0)) * (item.host.motion || 0);
      }
      if (!item.hinted && dx < (item.family === 'fall' ? fallingLead : 225) && dx > -30) { item.hinted = true; e.setEvent?.(item.instruction); }
      if (item.family === 'vent') {
        if (item.zone?.triggeredAt !== null) {
          item.age = e.time - item.zone.triggeredAt;
          item.phase = item.age < DRAFT_TUNING.warning ? 'warning'
            : item.age < DRAFT_TUNING.warning + DRAFT_TUNING.duration + DRAFT_TUNING.fade ? 'active' : 'spent';
        }
        continue;
      }
      if (item.family === 'fall') {
        // Ice responds to illumination, including forward sight / revelation.
        // A warm warning still lasts at least 1.2 s; light never causes an
        // unannounced immediate drop. Other debris reacts to the approach.
        let warmth = 1;
        if (item.kind === 'thaw' && (item.phase === 'idle' || item.phase === 'warning')) {
          light ||= e.getLightState?.() || { radius: 175, intensity: 1 };
          warmth = lightVisibility(e, light, item.x - e.distance, item.y);
        }
        if (item.phase === 'idle' && dx > -20 && (item.kind === 'thaw' ? warmth > .08 : dx < fallingLead)) {
          item.phase = 'warning'; item.age = 0;
        }
        if (item.phase === 'warning') {
          item.age = Math.max(0, item.age + dt * (item.kind === 'thaw' ? warmth > .05 ? .65 + warmth * .35 : -.15 : 1));
          if (item.age >= BIOME_DYNAMIC_TUNING.warning) { item.phase = 'falling'; item.age = 0; item.vy = 14 * sy; }
        } else if (item.phase === 'falling') {
          item.age += dt; item.vy = Math.min(330 * sy, item.vy + 430 * sy * dt); item.y += item.vy * dt;
          const contactRadius = item.radius + e.player.radius;
          if (dx * dx + (item.y - e.player.y) ** 2 < contactRadius ** 2) {
            item.phase = 'spent'; item.age = 0; item.spent = true;
            e.burst?.(item.x - e.distance, item.y, 8, item.color);
            // Existing Protector / fatal-contact rules own collision outcomes.
            e.hit?.(item); if (e.dying) return;
          } else if (item.y >= item.floorY || item.age > 2.5) {
            item.y = Math.min(item.y, item.floorY); item.phase = 'spent'; item.age = 0;
            e.burst?.(item.x - e.distance, item.y, 6, item.color);
          }
        } else if (item.phase === 'spent') item.age += dt;
        continue;
      }
      if (item.phase === 'spent') { item.age += dt; continue; }
      if (Math.abs(dx) > item.radius + e.player.radius + 6) continue;
      if (dx * dx + (item.y - e.player.y) ** 2 > (item.radius + e.player.radius + 6) ** 2) continue;
      item.phase = 'spent'; item.age = 0; item.spent = true;
      if (item.family === 'lift') {
        // A real, modest impulse. It cannot repeat and is smaller than a flap.
        e.player.vy = Math.min(e.player.vy, -136 * sy);
        if (e.projection) e.projection.nextAt = -Infinity;
        e.setEvent?.(item.kind === 'spore' ? 'Puffcap · free lift' : 'Reed bubble · free lift');
      } else if (item.family === 'reveal') {
        e.revealFromPickup?.(true); e.setEvent?.(item.kind === 'bell' ? 'Grave bell · path revealed' : 'Crystal resonance · path revealed');
      } else if (item.family === 'bloom') {
        const gain = Math.min(BIOME_DYNAMIC_TUNING.glowGift, Math.max(0, e.maxFlame - e.flame));
        e.flame += gain; e.flameRestored += gain;
        e.storeNaturalOverflow?.({id:item.id,kind:'light'},{fuel:BIOME_DYNAMIC_TUNING.glowGift},BIOME_DYNAMIC_TUNING.glowGift-gain);
        e.setEvent?.(gain > 0 ? `Seedpod · +${formatGlow(gain)} Sparks` : 'Seedpod · Sparks full');
      }
      e.burst?.(item.x - e.distance, item.y, 9, item.color);
    }
  }

  // A trajectory cannot promise a route through an unresolved touch impulse
  // or falling object. Vents are already predicted by the shared DraftField.
  forecastBoundary(startX, endX = Infinity) {
    for (const item of this.items) if (item.family !== 'vent' && item.phase !== 'spent'
      && item.x + item.radius >= startX && item.x - item.radius <= endX) return Math.max(startX, item.x - item.radius - 10);
    return Infinity;
  }

  rescale(factor) {
    for (const item of this.items) {
      item.y *= factor; item.baseY *= factor; item.anchorY *= factor;
      item.floorY *= factor; item.topY *= factor; item.hostCenter *= factor; item.vy *= factor;
      // Shared draft zones are scaled by DraftField.resize, never twice here.
    }
  }

  draw(c, { distance = this.engine.distance, scale = 1, height = this.engine.height } = {}) {
    const e = this.engine, time = e.time || 0, worldWidth = e.width;
    for (const item of this.items) {
      const x = item.x - distance;
      if (x < -90 || x > worldWidth + 90) continue;
      if (item.phase === 'spent' && item.age > 1.1 && item.family === 'fall') continue;
      c.save(); c.translate(Math.round(x * scale), Math.round(item.y * scale)); c.scale(scale, scale);
      drawActor(c, item, time, e.reducedMotion);
      drawInteractionRim(c, item, time, e.reducedMotion);
      c.restore();
    }
  }
}

function box(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function line(c, x1, y1, x2, y2, color, width = 2) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(Math.round(x1), Math.round(y1)); c.lineTo(Math.round(x2), Math.round(y2)); c.stroke(); }
function polygon(c, points, color) { c.fillStyle = color; c.beginPath(); c.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]); c.closePath(); c.fill(); }

// Hand-placed, two-pixel edge accents follow each object's actual silhouette.
// They are painted in the scenery pass, before lightFog: an interaction never
// becomes a beacon through unlit terrain. No halos or pickup rings on hazards.
const INTERACTION_RIMS = Object.freeze({
  spore: [[-8,-14,16,2],[-16,-10,8,2],[-20,-6,4,2],[8,-12,6,2],[14,-8,4,2],[18,-4,4,2],[-22,0,2,6],[22,4,2,4],[-16,10,28,2]],
  bubble: [[-6,-14,12,2],[-10,-12,4,2],[-14,-8,2,14],[6,-12,4,2],[12,-8,2,14],[-10,8,4,2],[6,8,4,2],[-6,12,12,2]],
  seedpod: [[-8,-12,16,2],[-12,-8,2,16],[10,-8,2,16],[-8,10,16,2]],
  resonate: [[-8,-24,4,2],[-12,-20,2,6],[-16,-12,2,8],[-14,4,2,8],[-12,14,24,2],[-4,-18,2,8],[6,-16,4,2],[10,-10,2,8],[14,0,2,8]],
  bell: [[-8,-12,16,2],[-10,-8,2,12],[8,-8,2,12],[-14,4,4,2],[10,4,4,2],[-16,10,32,2]],
  draft: [[-8,-10,16,2],[-10,-6,2,10],[8,-6,2,10],[-10,6,20,2]],
  geyser: [[-8,2,12,2],[-14,6,6,2],[6,4,8,2],[-16,10,2,6],[14,8,2,6]],
  tide: [[-16,2,4,2],[-8,-4,4,2],[-2,-10,4,2],[6,-4,4,2],[12,2,4,2]],
  thaw: [[-12,-14,24,2],[-14,-10,2,8],[10,-10,2,8],[-8,6,2,6],[4,8,2,6],[-2,18,4,2]],
  pinecone: [[-4,-12,8,2],[-8,-6,4,2],[6,-6,4,2],[-10,0,2,4],[10,0,2,4],[-6,10,12,2]],
  crumble: [[-6,-16,10,2],[-14,-12,8,2],[6,-14,8,2],[-16,-8,2,14],[14,-6,2,14],[-10,10,6,2],[0,14,8,2]],
  sandfall: [[-6,-16,10,2],[-14,-12,8,2],[6,-14,8,2],[-16,-8,2,14],[14,-6,2,14],[-10,10,6,2],[0,14,8,2]],
});
function drawInteractionRim(c, item, time, reducedMotion) {
  const edges = INTERACTION_RIMS[item.kind];
  if (!edges || (item.phase === 'spent' && (item.family === 'fall' || item.kind === 'bubble'))) return;
  const spent = item.phase === 'spent', hazard = item.family === 'fall';
  const active = item.phase === 'active' || item.phase === 'warning' || item.phase === 'falling';
  c.globalAlpha = spent ? .52 : hazard ? .8 : .92;
  c.fillStyle = spent ? '#7c8b79' : hazard ? (active ? '#e6a17b' : '#baa18a')
    : item.family === 'vent' ? (active ? '#f1ce9f' : '#c9c3a1') : '#dae7c4';
  for (const edge of edges) c.fillRect(edge[0], edge[1], edge[2], edge[3]);
  // One restrained glint identifies a ready touch interaction. Used scenery
  // loses that glint; warning hazards instead retain their warm fracture art.
  if (!spent && !hazard && item.family !== 'vent') {
    const edge = edges[reducedMotion ? 0 : Math.floor(time * 5 + item.seed) % edges.length];
    c.globalAlpha = .8; c.fillStyle = '#f1f0d1'; c.fillRect(edge[0], edge[1], 2, 2);
  }
  c.globalAlpha = 1;
}

function drawActor(c, item, time, reducedMotion) {
  const bright = item.color, dark = item.kind === 'thaw' ? '#588e9c' : item.kind === 'sandfall' ? '#9e7651' : '#4b5346';
  const spent = item.phase === 'spent', warning = item.phase === 'warning';
  const pulse = reducedMotion ? .65 : .6 + .3 * Math.sin(time * 4 + item.seed);
  if (item.family === 'fall') {
    if (spent) {
      c.globalAlpha = Math.max(0, 1 - item.age);
      for (let n = 0; n < 6; n++) box(c, Math.cos(n * 2.4) * item.age * 29, -Math.sin(item.age * Math.PI) * 12 + n % 2 * 5, 4, 3, bright);
      return;
    }
    const shake = warning && !reducedMotion ? Math.sin(time * 27) * 1.2 : 0;
    c.translate(Math.round(shake), 0);
    if (item.kind === 'thaw') {
      polygon(c, [[-12, -12], [11, -12], [8, 2], [0, 21], [-6, 7]], dark);
      polygon(c, [[-9, -12], [5, -12], [1, 14], [-5, 4]], bright);
      line(c, -3, -8, 0, 9, '#e5f4ef', 2);
    } else if (item.kind === 'pinecone') {
      line(c, 0, -19, 0, -9, '#797d58');
      for (let n = 0; n < 5; n++) { const w = n < 2 ? 9 + n * 5 : 19 - (n - 2) * 4; box(c, -w / 2 + n % 2, -10 + n * 5, w, 4, n % 2 ? bright : '#866446'); }
    } else {
      polygon(c, [[-15, -9], [-6, -14], [13, -10], [15, 7], [5, 14], [-12, 10]], dark);
      box(c, -13, -9, 24, 5, bright); box(c, -12, -3, 9, 10, item.kind === 'sandfall' ? '#cda574' : '#9b8e77');
    }
    if (warning) {
      line(c, -3, -9, 2, -1, '#efb68d'); line(c, 2, -1, -1, 9, '#efb68d');
      c.globalAlpha = .4 + pulse * .3;
      for (let n = 0; n < 5; n++) { const drop = (time * 42 + n * 15) % 65; box(c, (n % 3 - 1) * 7, 19 + drop, 2, item.kind === 'thaw' ? 4 : 2, bright); }
      c.globalAlpha = 1;
    }
    if (item.phase === 'falling') { c.globalAlpha = .4; box(c, -3, -26, 4, 9, bright); box(c, 7, -19, 3, 6, bright); c.globalAlpha = 1; }
    return;
  }
  const root = item.anchorY - item.baseY;
  line(c, 0, root, 0, 12, dark, 3);
  if (item.family === 'lift') {
    if (item.kind === 'spore') {
      box(c, -4, 6, 8, 18, '#a19a80');
      polygon(c, [[-22, 4], [-17, -6], [-7, -13], [9, -11], [20, -3], [23, 6], [12, 10], [-15, 9]], spent ? '#756879' : '#9b7d9f');
      box(c, -17, 5, 35, 4, spent ? '#9b8d9f' : bright);
      if (!spent) { box(c, -9, -5, 4, 3, '#ead6d9'); box(c, 7, -2, 3, 3, '#ead6d9'); }
    } else {
      line(c, -11, root, -7, 11, '#7b9166'); line(c, 9, root, 13, 17, '#7b9166');
      if (!spent) {
        c.globalAlpha = .2 + pulse * .13; box(c, -10, -9, 20, 18, bright); c.globalAlpha = 1;
        box(c, -6, -13, 12, 2, bright); box(c, -12, -8, 2, 15, bright); box(c, 10, -8, 2, 15, bright); box(c, -7, 10, 14, 2, bright);
        box(c, -5, -7, 3, 3, '#e7ead2');
      }
    }
    if (spent && item.age < 1.1) {
      c.globalAlpha = Math.max(0, 1 - item.age / 1.1);
      for (let n = 0; n < 10; n++) box(c, Math.sin(n * 2.4 + item.age * 2) * (8 + item.age * 17), -item.age * 58 - n % 3 * 6, 2, 3, bright);
      c.globalAlpha = 1;
    }
  } else if (item.family === 'vent') {
    if (item.kind === 'geyser') {
      polygon(c, [[-24, root], [-14, 7], [-4, 2], [13, 6], [24, root]], '#555457');
      box(c, -11, 6, 20, 5, '#b87555'); box(c, -8, 4, 13, 3, bright);
    } else if (item.kind === 'tide') {
      for (let n = 0; n < 5; n++) { const dx = (n - 2) * 7, wave = reducedMotion ? 0 : Math.sin(time * 2 + n) * 3; line(c, 0, 18, dx + wave, -8 + Math.abs(n - 2) * 5, n % 2 ? bright : '#82a995', 3); }
    } else {
      line(c, -17, root, -17, -18, '#929d91', 3); line(c, -17, -18, 7, -18, '#929d91'); line(c, 1, -18, 1, -10, bright);
      polygon(c, [[-7, -9], [8, -9], [10, 4], [-10, 4]], '#a3b4ad'); box(c, -10, 4, 20, 3, bright);
    }
    if (warning || item.phase === 'active') {
      c.globalAlpha = warning ? .3 + pulse * .3 : .8;
      const rise = item.phase === 'active' ? 95 : 32;
      for (let n = 0; n < 9; n++) { const p = (time * (warning ? 24 : 77) + n * 17) % rise; box(c, Math.sin(n * 2.6 + p * .06) * (10 + p * .12), -p, 2, 4, bright); }
      c.globalAlpha = 1;
    }
  } else if (item.family === 'reveal') {
    if (item.kind === 'resonate') {
      polygon(c, [[-12, 14], [-16, -5], [-6, -22], [3, -1], [8, -15], [17, 7], [10, 16]], spent ? '#716481' : '#9584b7');
      line(c, -6, -18, -3, 10, bright, 3); line(c, 8, -11, 10, 9, '#e0d5ee', 2);
    } else {
      line(c, -20, root, -20, -21, '#77786a', 4); line(c, -20, -21, 13, -21, '#979b87', 3); line(c, 0, -21, 0, -11, '#c1c5ae');
      polygon(c, [[-8, -10], [8, -10], [10, 5], [15, 10], [-15, 10], [-10, 5]], spent ? '#787b73' : '#a5a68d');
      box(c, -15, 9, 30, 3, bright); box(c, -2, 12, 4, 4, bright);
    }
    if (spent && item.age < 1.1) {
      c.strokeStyle = bright; c.lineWidth = 2; c.globalAlpha = (1 - item.age / 1.1) * .7;
      for (let n = 0; n < 2; n++) { c.beginPath(); c.arc(0, 0, 15 + item.age * 58 + n * 13, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }
  } else if (item.family === 'bloom') {
    const fold = spent ? clamp(item.age * 4, 0, 1) : 0;
    for (let n = 0; n < 6; n++) { const a = n * TAU / 6, r = 23 - fold * 12; line(c, Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * r, Math.sin(a) * r, '#819666', 3); }
    box(c, -9, -10, 18, 20, spent ? '#667350' : '#9aac78');
    box(c, -5, -7, 10, 14, spent ? '#485640' : bright);
    if (!spent) { c.globalAlpha = .3 + pulse * .2; box(c, -3, -4, 6, 8, '#edf0c3'); c.globalAlpha = 1; }
  }
}
