import {LOCATION_CHALLENGE_NAMES} from './world-expansion.mjs?v=packing-1';
import { createDraftZones, DRAFT_TUNING } from './drafts.mjs?v=packing-1';
import { getEncounterFamily, familyChallengeCells } from './encounter-families.mjs?v=packing-1';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const NAMES = Object.freeze({
  ruins: { 'fuel-pocket': ['Lanternwell Drop', 'Follow the fuel pocket, then Lift through the arch.', 'lanternwell'],
    'draft-crossing': ['Broken Bridge Draft', 'Read the local push; cross above or below the curls.', 'broken-bridge'],
    'dark-cave': ['Unlit Underpass', 'Read the vault ahead before your light narrows.', 'unlit-vault'] },
  canopy: { 'fuel-pocket': ['Dew Hollow', 'Approach the fuel pocket, then clear the rising roots.', 'dew-hollow'],
    'draft-crossing': ['Canopy Crosswind', 'Choose a side of the puff inside the open glade.', 'crosswind-glade'],
    'dark-cave': ['Root Tunnel', 'Watch the roof and floor before the root tunnel dims.', 'root-tunnel'] },
  storm: { 'fuel-pocket': ['Sheltered Ledge', 'Approach the fuel pocket, then climb past the ridge.', 'sheltered-ledge'],
    'draft-crossing': ['Ridge Draft Crossing', 'Read the vertical push and choose a clear bypass.', 'draft-saddle'],
    'dark-cave': ['Unlit Crystal Vault', 'Read the two-sided passage before the cave dims.', 'unlit-crystal'] },
});
const ORDERS = Object.freeze({ ruins: ['fuel-pocket', 'dark-cave', 'draft-crossing'],
  canopy: ['fuel-pocket', 'draft-crossing', 'dark-cave'], storm: ['draft-crossing', 'fuel-pocket', 'dark-cave'] });
const hash = value => { let n = 0; for (const letter of String(value || '')) n = (Math.imul(n, 31) + letter.charCodeAt(0)) >>> 0; return n; };
const basicRoute = options => !options.elite && (Number(options.stage) || 0) === 0
  && (Number(options.mapIndex) || 0) === 0 && (Number(options.difficulty) || 1) <= 1;

function descriptor(id, terrain, levelId) {
  const [name, instruction, landmark] = (NAMES[terrain] || NAMES.ruins)[id];
  return { id, type: id, name:LOCATION_CHALLENGE_NAMES[levelId]?.[id]||name, instruction, landmark };
}
function orderFor(options) {
  const family=getEncounterFamily(options.encounterFamily);if(family)return [family.type];
  if (basicRoute(options)) return ['fuel-pocket'];
  const base = ORDERS[options.terrain] || ORDERS.ruins;
  const offset = (hash(options.levelId) + (Number(options.mapIndex) || 0) + Math.max(0, (Number(options.difficulty) || 1) - 1)) % base.length;
  return base.map((_, i) => base[(i + offset) % base.length]);
}

/** Planned, deterministic identities; actual placement still uses fit/safety guards. */
export function getChallengePreview(options = {}) {
  const family=getEncounterFamily(options.encounterFamily);
  if(family){const primary={...family,landmark:family.id};return {primary,patterns:[primary],summary:family.name,basic:basicRoute(options),planned:true};}
  const order = orderFor(options), patterns = order.map(id => descriptor(id, options.terrain, options.levelId));
  return { primary: patterns[0], patterns, summary: patterns.map(pattern => pattern.name).join(' → '),
    basic: basicRoute(options), planned: true };
}

/** Select only cells already authored for this biome. The caller retains its
 * normal center-change limit, aperture floors, full-shape collisions and joins. */
export function getAuthoredChallenge({ course, leg = 0, window = 0, ...options }) {
  const family=getEncounterFamily(options.encounterFamily);
  if(family)return {...family,landmark:family.id,cells:familyChallengeCells(family.id,course,options),
    family:family.id,sectionKind:family.id==='stillwater-tunnel'?'challenge':'breather',darkness:0};
  const order = orderFor(options), id = order[(leg + window) % order.length];
  const info = descriptor(id, options.terrain, options.levelId), length = course.hard.length;
  let cells;
  if (id === 'fuel-pocket') {
    // A descent toward the first pocket, then an ascending exit. Same existing
    // cells, widths and openings, placed in a deliberate lower-to-upper line.
    cells = [...course.hard].sort((a, b) => b[0] - a[0]);
  } else if (id === 'draft-crossing') {
    // A broad floor-only glade/saddle permits both a top and a bottom bypass.
    // Actual air is later selected by the production puff geometry sampler.
    const wide = [...course.rest, ...course.entry].filter(cell => cell[4] === 'floor' && cell[1] >= 230);
    const source = wide.length ? wide : course.rest;
    cells = Array.from({ length }, (_, i) => source[i % source.length]);
  } else {
    // A genuine roof-and-floor tunnel, using the biome's existing aperture
    // cells in a shallow dip-and-return instead of unrelated gap rolls.
    const roofed = [...course.hard, ...course.entry, ...course.rest].filter(cell => cell[4] === 'both');
    const source = (roofed.length ? roofed : course.hard).slice(0, length).sort((a, b) => a[0] - b[0]);
    cells = Array.from({ length }, (_, i) => source[i === length - 1 ? 0 : i % source.length]);
  }
  return { ...info, cells: cells.map(cell => [...cell]), sectionKind: id === 'draft-crossing' ? 'breather' : 'challenge',
    darkness: id === 'dark-cave' ? options.elite ? .18 : .15 : 0 };
}

/** Bind setpieces to actual completed geometry and existing mandatory fuel. */
export function finalizeFlightChallenges(layout, { terrain = 'ruins', basic = false } = {}) {
  const challenges = [];
  for (const section of layout.sections || []) {
    const authored = section.authoredChallenge;
    if (!authored) continue;
    const record = { ...authored, id: `${section.id}:${authored.type}`, sectionId: section.id,
      start: section.start, end: section.end, leg: section.leg, warningStart: section.warningStart,
      basic, terrain, available: authored.type !== 'draft-crossing' };
    if (authored.type === 'fuel-pocket') {
      const fuel = layout.embers.filter(packet => packet.fuel && !packet.generated && packet.kind !== 'dark'
        && packet.x >= section.start - 580 && packet.x <= section.end);
      fuel.sort((a, b) => Math.abs(a.x - section.start) - Math.abs(b.x - section.start));
      if (fuel[0]) {
        const packet = fuel[0];
        record.pocket = { id: packet.id, x: packet.x, y: packet.y, side: packet.pocketSide || 'ground' };
        if(!authored.family)record.instruction = packet.pocketSide === 'ceiling'
          ? 'Lift toward the upper fuel pocket, then glide clear of the roof.'
          : 'Glide toward the lower fuel pocket, then Lift clear of the ledge.';
        packet.challengeLandmark = authored.landmark;
      } else if(!authored.family)record.instruction = 'Conserve Sparks through this climb; take the next fuel pocket when it is safe.';
    }
    challenges.push(record);
  }
  layout.challenges = challenges.sort((a, b) => a.start - b.start);
  return layout;
}

/** Install real one-shot puffs in the authored wide rooms. Use exactly the
 * production collision/prop/full-sway sampler; never force an unsafe fallback. */
export function installAuthoredDraftCrossings(layout, field, options = {}) {
  if (!layout.challenges?.length || !field?.zones) return;
  for (const challenge of layout.challenges) {
    if (challenge.type !== 'draft-crossing') continue;
    const room = layout.sections.find(section => section.id === challenge.sectionId);
    if (!room) continue;
    const nearby = layout.obstacles.filter(obstacle => obstacle.x + obstacle.width * 2.5 >= room.start - 300
      && obstacle.x - obstacle.width <= room.end + 300);
    const hard = layout.sections.filter(section => section.hard && section.end >= room.start - 300 && section.start <= room.end + 300);
    const candidates = createDraftZones({ ...options, lesson: null, lengthScale: 1,
      layout: { obstacles: nearby, sections: [...hard, { ...room, hard: false }] } });
    const center = (room.start + room.end) / 2;
    const replaced = field.zones.map((zone, index) => ({ zone, index }))
      .filter(item => !item.zone.authoredChallenge)
      .sort((a, b) => Math.abs(a.zone.x - center) - Math.abs(b.zone.x - center))[0];
    const others = field.zones.filter((_, index) => index !== replaced?.index);
    const chosen = candidates.filter(zone => zone.x >= room.start && zone.x <= room.end
      && others.every(other => Math.abs(other.x - zone.x) >= DRAFT_TUNING.spacing))
      .sort((a, b) => Math.abs(a.x - center) - Math.abs(b.x - center))[0];
    if (!chosen) continue;
    const zone = { ...chosen, id: `authored-draft:${challenge.id}`, authoredChallenge: challenge.id, triggeredAt: null };
    if (replaced) field.zones[replaced.index] = zone; else field.zones.push(zone);
    challenge.available = true; challenge.draftId = zone.id;
    challenge.crossing = { x: zone.x, y: zone.y, rx: zone.rx, ry: zone.ry, direction: zone.direction };
  }
  field.zones.sort((a, b) => a.x - b.x);
}

/** Cheap distance-driven state. Warning time remains real time even when a
 * speed burst reaches the cave sooner; dimming never starts before 1.5 seconds. */
export class FlightChallengeDirector {
  constructor(layout) {
    this.challenges = (layout.challenges || []).filter(challenge => challenge.available);
    this.cursor = 0; this.warnedAt = -1; this.lastEvent = ''; this.state = null; this.clearUntil = 0;
  }
  update({ time, worldX, speed, maximumSpeed = speed }) {
    let event = '';
    while (this.cursor < this.challenges.length && worldX > this.challenges[this.cursor].end) {
      const finished = this.challenges[this.cursor++];
      this.warnedAt = -1; this.lastEvent = '';
      this.state = { ...finished, phase: 'clear', warning: '', instruction: 'Clear air ahead. Keep Sparks for the next passage.', progress: 1 };
      this.clearUntil = time + 1.5;
      event = `${finished.name} · clear`;
    }
    const challenge = this.challenges[this.cursor];
    if (!challenge) return { state: this.state?.phase === 'clear' && time < this.clearUntil ? this.state : null, darkness: 0, event };
    const lead = Math.max(speed, maximumSpeed) * 1.5;
    if (worldX < challenge.start - lead) { this.state = null; return { state: null, darkness: 0, event }; }
    if (this.warnedAt < 0) this.warnedAt = time;
    const waiting = time - this.warnedAt < 1.5;
    const phase = worldX < challenge.start || waiting ? 'warning' : 'active';
    const key = `${challenge.id}:${phase}`;
    if (key !== this.lastEvent) {
      event = phase === 'warning' ? `${challenge.name} ahead · ${challenge.instruction}` : `${challenge.name} · ${challenge.instruction}`;
      this.lastEvent = key;
    }
    this.state = { ...challenge, phase, warning: phase === 'warning' ? `${challenge.name} ahead` : '',
      progress: clamp((worldX - challenge.start) / Math.max(1, challenge.end - challenge.start), 0, 1) };
    return { state: this.state, darkness: phase === 'active' ? challenge.darkness || 0 : 0, event };
  }
}
