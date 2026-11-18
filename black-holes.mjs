import {moonDrainScale} from './atlas-flight.mjs?v=start-1';
import {inLanternRoom} from './lantern-layout.mjs?v=start-1';
import { obstacleEdgeClearance } from './edging-pulse.mjs?v=start-1';
import { sparkBodyRadius } from './spark-size.mjs?v=start-1';

// Rates are internal flight Sparks. The HUD displays 0.3 of these units.
// At 2.5× the old drain the core can empty a fresh meter in a quarter second.
// At the slowest normal speed the bypass costs less than one ordinary Lift,
// even when the player strays 20 units toward the centre.
// Softening and the cap make direct core contact finite, never a collision.
export const BLACK_HOLE_TUNING = Object.freeze({ coreRadius: 16, influence: 220,
  softening: 22, coefficient: 360000, maximumRate: 400, minimumBypass: 182,
  corridorHalfWidth: 270, laneRadius: 18, sampleSpacing: 24,
  minimumStart: 1150, exitClearance: 650, referenceHeight: 430 });
export const GIANT_BLACK_HOLE_TUNING = Object.freeze({ coreRadius:104, influence:368,
  softening:36, coefficient:1260000, maximumRate:600, edgeInset:.30,
  minimumBypass:325, laneRadius:26, corridorHalfWidth:398 });
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hash = value => { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };

export function blackHoleDrainRate(distance, influence = BLACK_HOLE_TUNING.influence, coreRadius = BLACK_HOLE_TUNING.coreRadius) {
  if (!Number.isFinite(distance) || distance >= influence || influence <= 0) return 0;
  const t = coreRadius > BLACK_HOLE_TUNING.coreRadius ? GIANT_BLACK_HOLE_TUNING : BLACK_HOLE_TUNING;
  const d = Math.max(0, distance), soft = t.softening ** 2;
  return clamp(t.coefficient * (1 / (d * d + soft) - 1 / (influence * influence + soft)), 0, t.maximumRate);
}

// Geometry alone slows the world: an empty Spark meter cannot release it.
// Each hole's own core and influence give normal and Giant holes the same curve.
export function blackHoleTimeScale(distance, influence = BLACK_HOLE_TUNING.influence, coreRadius = BLACK_HOLE_TUNING.coreRadius) {
  if (!Number.isFinite(distance) || !(influence > coreRadius)) return 1;
  const p = clamp((influence - distance) / (influence - coreRadius), 0, 1);
  return 1 - .65 * p * p * (3 - 2 * p);
}

// Placement is validated at the shortest supported viewport. Resizing only
// stretches Y from this reference, so it cannot squeeze the checked lane.
// Inflation by the whole motion amplitude includes EVERY sway phase (and
// solid prop), rather than checking only the two sway endpoints.
function referenceGeometry(engine, referenceHeight = BLACK_HOLE_TUNING.referenceHeight) {
  const factor = referenceHeight / engine.height;
  const shape = points => points?.map(([x, y]) => [x, y * factor]);
  return (engine.layout?.obstacles || []).filter(o => !o.destroyed).map(o => ({ ...o,
    center: o.center * factor, gap: o.gap * factor, motion: (o.motion || 0) * factor,
    topShape: shape(o.topShape), bottomShape: shape(o.bottomShape),
    sceneProps: (o.sceneProps || []).map(prop => ({ ...prop,
      parts: prop.parts.map(part => ({ ...part, polygon: shape(part.polygon) })) })) }));
}

function clearAt(obstacles, x, y, radius, height) {
  if (y - radius <= 27 || y + radius >= height - 28) return false;
  return obstacles.every(o => x + radius + Math.abs(o.motion) < o.x - o.width
    || x - radius - Math.abs(o.motion) > o.x + o.width * 2.5
    || obstacleEdgeClearance(x, y, radius + Math.abs(o.motion), o, 0, 0, o.center) > 0);
}

function quietAt(engine, x, reach = BLACK_HOLE_TUNING.influence + 50) {
  return !(engine.layout?.flightForks || []).some(f=>x+reach>f.approachStart&&x-reach<f.exitEnd)
    && !inLanternRoom(engine.layout,x,reach)
    && !(engine.layout?.boss?.shutters || []).some(s=>x+reach>s.x-100&&x-reach<s.x+s.shift+s.spread)
    && !(engine.layout?.sections || []).some(s => (s.hard || s.authoredChallenge)
      && x + reach > s.start && x - reach < s.end)
    && !(engine.layout?.obstacles || []).some(o => (o.hard || o.reservedDraft)
      && x + reach > o.x - o.width && x - reach < o.x + o.width * 2.5)
    && !(engine.layout?.riskChains || []).some(s => x + reach > s.start && x - reach < s.end)
    && !(engine.drafts?.zones || []).some(z => Math.abs(x - z.x) < reach + z.rx)
    && !(engine.biomeDynamics?.items || []).some(item => Math.abs(x - item.x) < reach + (item.radius || 14));
}

/** A continuous straight bypass, including solid scenery and all sway phases.
 * The extra half-sample radius covers every point BETWEEN the sample centres. */
export function blackHoleLaneClear(engine, item) {
  const lane = item.bypass;
  if (!lane) return false;
  const t = item.giant ? GIANT_BLACK_HOLE_TUNING : BLACK_HOLE_TUNING, step = BLACK_HOLE_TUNING.sampleSpacing;
  const radius = t.laneRadius + step / 2, obstacles = engine.layout?.obstacles || [];
  const count = Math.ceil((lane.endX - lane.startX) / step);
  for (let i = 0; i <= count; i++) {
    const x = lane.startX + (lane.endX - lane.startX) * i / count;
    if (!clearAt(obstacles, x, lane.y, radius, engine.height)) return false;
  }
  return Math.abs(lane.y - item.y) >= t.minimumBypass;
}

function giantEligible(engine, route, seed) {
  if (engine.tutorial || engine.bossEncounter) return false;
  if (route.blackHoleEncounter === 'giant') return true;
  const map = Number(route.mapIndex || 0), row = Number(route.row || 0);
  if (!engine.elite && map < 1 && (row < 3 || Number(route.difficulty || 1) < 3)) return false;
  const affinity = /moon|abyss|basalt|crystal|obsidian/.test(engine.levelIdentity?.id || '');
  const odds = 75 + (engine.elite ? 65 : 0) + (map >= 2 ? 30 : 0) + (affinity ? 55 : 0);
  return hash(seed + ':giant') % 1000 < odds;
}

function giantAt(engine, geometry, candidates, route, seed) {
  const g=GIANT_BLACK_HOLE_TUNING, height=BLACK_HOLE_TUNING.referenceHeight, scale=engine.height/height;
  const placed=engine.layout.giantBlackHoleSite;
  const firstEdge = route.blackHoleEdge===1 || route.blackHoleEdge===-1 ? route.blackHoleEdge : (seed & 1 ? 1 : -1);
  const edges = route.blackHoleEdge===firstEdge ? [firstEdge] : [firstEdge,-firstEdge];
  for (const x of placed ? [placed.x,...candidates] : candidates) {
    if (!quietAt(engine,x,g.influence+50)) continue;
    const nearby=geometry.filter(o=>o.x-o.width <= x+g.corridorHalfWidth+70 && o.x+o.width*2.5 >= x-g.corridorHalfWidth-70);
    for (const edge of placed?.x===x ? [placed.edge] : edges) {
      const y=edge < 0 ? -g.coreRadius*g.edgeInset : height+g.coreRadius*g.edgeInset;
      // The disk must be in open sky, including all solid props and swaying rock.
      if (nearby.some(o=>obstacleEdgeClearance(x,y,g.coreRadius+Math.abs(o.motion),o,0,0,o.center)<=0)) continue;
      for (const separation of [g.minimumBypass,340,355,369]) {
        const laneY=y-edge*separation, bypass={startX:x-g.corridorHalfWidth,endX:x+g.corridorHalfWidth,y:laneY};
        if (!blackHoleLaneClear({height,layout:{obstacles:nearby}}, {giant:true, y, bypass})) continue;
        const center=(edge<0 ? 0 : engine.height)+edge*g.coreRadius*g.edgeInset;
        const item={ id:'black-hole:0', giant:true, edge, x, y:center, coreRadius:g.coreRadius,
          influence:g.influence, seed, placement:'room', bypass:{...bypass,y:laneY*scale},
          rate:0, potentialRate:0, frameDrained:0, drained:0, lastDrainAt:-Infinity,
          drainSequence:0, sourceX:null, sourceY:null };
        if (placed?.x===x || giantFuelPlan(engine,item).length===2) return item;
      }
    }
  }
  return null;
}

function giantFuelPlan(engine,hole) {
  const packets=engine.layout.embers || [], moves=[];
  const eligible=p=>!p.generated && !p.harmful && !p.riskChain && !p.intro
    && !p.challengeLandmark && !p.forkCache && !p.objective && !p.blackHoleBypass
    && (!p.feature || p.feature==='sheltered-glow' || p.feature==='light-niche')
    && ['light','cluster','cache'].includes(p.kind);
  for (const side of [-1,1]) {
    const target=hole.x+side*244, y=hole.bypass.y;
    const donors=packets.filter(p=>eligible(p) && Math.sign(p.x-hole.x)===side && Math.abs(p.x-target)<=450)
      .sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target));
    for (const p of donors) {
      const r=sparkBodyRadius(p,engine.height),x=clamp(target,p.x-300,p.x+300);
      if (!clearAt(engine.layout.obstacles,x,y,r+4,engine.height)
        || packets.some(q=>q!==p && Math.abs(q.x-x)<r+28 && Math.hypot(q.x-x,q.y-y)<r+sparkBodyRadius(q,engine.height)+12)) continue;
      moves.push({packet:p,x,y,feature:side<0?'giant-bypass-entry':'giant-bypass-exit'});break;
    }
  }
  return moves;
}

function markGiantPassage(engine,hole) {
  for (const {packet,x,y,feature} of giantFuelPlan(engine,hole)) {
    Object.assign(packet,{x,y,feature,anchor:null,accessible:true,pocket:false,blackHoleBypass:true});
  }
  engine.layout.embers.sort((a,b)=>a.x-b.x);
  engine.layout.giantBlackHoleSite={x:hole.x,edge:hole.edge};
}

/** One persistent hazard per ordinary map, with a quiet approach fallback.
 * Only the final practice flight introduces this hazard.
 * A synthetic fully blocked map fails safely rather than punching a new trap. */
export function createBlackHoles(engine) {
  const route = engine.options?.node || {};
  if (engine.onboardingPlan?.blackHoles === false && route.blackHoleEncounter!=='giant') return [];
  if (engine.tutorial && engine.tutorial.lesson !== 'hazards') return [];
  const t = BLACK_HOLE_TUNING, height = t.referenceHeight, geometry = referenceGeometry(engine);
  const seed = hash(`${engine.seed}:${engine.levelIdentity?.id || ''}:black-hole`);
  const last = engine.totalDistance + engine.player.x - t.exitClearance;
  const target = t.minimumStart + Math.max(0, last - t.minimumStart) * (.28 + (seed % 1000) / 2500);
  const candidates = [];
  for (let x = t.minimumStart + seed % 43; x <= last; x += 68) if (quietAt(engine, x)) candidates.push(x);
  candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
  if (engine.layout?.giantBlackHoleSite!==null && giantEligible(engine,route,seed)) {
    const approaches=[950,850,750,650].filter(x=>x<last);
    const giant=giantAt(engine,geometry,[...candidates,...approaches],route,seed);
    if (giant) return [giant];
  }
  // The entrance already has open flight space, before normal drafts, chains
  // and hard windows. It remains subject to the same full geometry checks.
  const fallback = [410, 378, 442].filter(x => x < last && quietAt(engine, x));
  const yValues = [];
  for (let y = 58; y <= height - 58; y += 14) yValues.push(y);
  if (seed & 1) yValues.reverse();
  const find = (xs, minimumSeparation, placement) => {
    for (const x of xs) {
      const nearby = geometry.filter(o => x + t.corridorHalfWidth + 50 > o.x - o.width
        && x - t.corridorHalfWidth - 50 < o.x + o.width * 2.5);
      const laneYs = yValues.filter(y => blackHoleLaneClear({ height, layout: { obstacles: nearby } }, {
        y: y < height / 2 ? height : 0,
        bypass: { startX: x - t.corridorHalfWidth, endX: x + t.corridorHalfWidth, y } }));
      for (const y of yValues) {
        if (!clearAt(nearby, x, y, t.coreRadius + 12, height)) continue;
        const laneY = laneYs.find(ly => Math.abs(ly - y) >= minimumSeparation);
        if (laneY === undefined) continue;
        const factor = engine.height / height;
        return [{ id: 'black-hole:0', x, y: y * factor, coreRadius: t.coreRadius,
          influence: t.influence, seed, placement,
          bypass: { startX: x - t.corridorHalfWidth, endX: x + t.corridorHalfWidth, y: laneY * factor },
          rate: 0, potentialRate: 0, frameDrained: 0, drained: 0, lastDrainAt: -Infinity,
          drainSequence: 0, sourceX: null, sourceY: null }];
      }
    }
    return null;
  };
  return find(candidates, t.influence + t.laneRadius, 'room')
    || find(candidates, t.minimumBypass, 'room')
    || find(fallback, t.influence + t.laneRadius, 'approach')
    || find(fallback, t.minimumBypass, 'approach') || [];
}

export class BlackHoles {
  constructor(engine) {
    this.engine = engine; this.items = createBlackHoles(engine); this.cursor = 0;
    // Seal the placement before the later expedition fuel pass can resize or
    // move a donor. An unplaceable Giant stays an ordinary hole on this layout.
    if (!this.items.some(hole=>hole.giant)) engine.layout.giantBlackHoleSite=null;
    // Fuel near the lethal core is optional no longer: place existing ordinary
    // Sparks on the checked bypass instead, without minting extra rewards.
    for(const hole of this.items){
      if(hole.giant){markGiantPassage(engine,hole);continue;}
      for(const p of engine.layout.embers||[]){
      if(p.generated||p.harmful||p.riskChain||!['light','cluster','cache'].includes(p.kind))continue;
      if(Math.hypot(p.x-hole.x,p.y-hole.y)<150&&p.x>=hole.bypass.startX&&p.x<=hole.bypass.endX){p.y=hole.bypass.y;p.accessible=true;p.blackHoleBypass=true;}
      }
    }
    this.active = false; this.rate = 0; this.potentialRate = 0; this.drained = 0; this.nearest = null; this.timeScale = 1;
    this._activeItems = [];
  }
  get live() {
    const e = this.engine;
    return e.running && !e.paused && e.alive && !e.finished && !e.destroyed && !e.dying && !e.completing && !e.tutorialAwaitingLift;
  }
  get state() {
    return { active: this.live && this.active, rate: this.live ? this.rate : 0,
      potentialRate: this.live ? this.potentialRate : 0, drained: this.drained, timeScale: this.live ? this.timeScale : 1,
      nearest: this.nearest ? { ...this.nearest } : null };
  }
  stop() {
    for (const item of this._activeItems) item.rate = item.potentialRate = item.frameDrained = 0;
    this._activeItems.length = 0; this.active = false; this.rate = this.potentialRate = 0; this.nearest = null; this.timeScale = 1;
  }
  resize(factor) {
    for (const item of this.items) {
      item.y = item.giant ? (item.edge<0 ? 0 : this.engine.height)+item.edge*item.coreRadius*GIANT_BLACK_HOLE_TUNING.edgeInset : item.y*factor;
      item.bypass.y *= factor;
      if (item.sourceY !== null) item.sourceY *= factor;
    }
    this.stop();
  }
  update(dt) {
    const e = this.engine;
    this.stop();
    if (!this.live || !(dt >= 0) || !Number.isFinite(dt)) return;
    const worldX = e.distance + e.player.x;
    // Sorted X and a monotonic cursor avoid scanning the rest of a long map.
    while (this.cursor < this.items.length && this.items[this.cursor].x + this.items[this.cursor].influence < worldX) this.cursor++;
    for (let i = this.cursor; i < this.items.length; i++) {
      const item = this.items[i], dx = item.x - worldX;
      if (dx > item.influence) break;
      const distance = Math.hypot(dx, item.y - e.player.y);
      if (!this.nearest || distance < this.nearest.distance) this.nearest = { id: item.id, distance };
      this.timeScale = Math.min(this.timeScale, blackHoleTimeScale(distance, item.influence, item.coreRadius));
      // Start/resume may sample geometry without debiting or simulating a step.
      if (dt === 0) continue;
      item.potentialRate = blackHoleDrainRate(distance, item.influence, item.coreRadius) * (e.flightBoon?.drainScale ?? 1) * moonDrainScale(e,item);
      if (!(item.potentialRate > 0)) continue;
      this._activeItems.push(item); this.active = true; this.potentialRate += item.potentialRate;
      // Dream makes Lift free, not environmental drain. Both recording and
      // replay run this identical fixed-step debit. Shields confer no immunity.
      // Direct flight-fuel debit cannot touch currency or artifact income hooks.
      const amount = Math.min(Math.max(0, e.flame), item.potentialRate * dt);
      e.flame = Math.max(0, e.flame - amount);
      item.frameDrained = amount; item.rate = amount / dt; this.rate += item.rate;
      if (!(amount > 0)) continue;
      item.drained += amount; this.drained += amount; item.lastDrainAt = e.time;
      item.sourceX = worldX; item.sourceY = e.player.y; item.drainSequence++;
    }
  }
}
