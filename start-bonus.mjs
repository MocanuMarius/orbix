// Start bonus (owner request 2026-11-18): at the start of a card run the player picks ONE of three bonuses. Each tile is drawn
// independently from one combined pool: a starter card, an ordinary Scribe Inscription (written on Chain slot 1), or a Wisp stat that
// lasts the whole run. The three kinds are weighted equally per tile (1/3 each), whatever the pool sizes; no duplicates in one offer.
// Pure data and helpers, no DOM. Lift Guide is always mounted as well (model.mjs › chooseStartingGift).
import {INSCRIPTION_IDS} from './inscriptions.mjs?v=skim-1';

export const START_BONUS_VERSION = 4;
/** Ordinary Inscriptions that would do nothing on slot 1 at run start (Lift Guide beside two empty slots): Whetted (Lift Guide has no uses), Mirror (nothing to its left), Lodestone (it buffs the cards beside its slot, none yet). Hollow stays: Lift Guide then goes in slot 2. tests/start-bonus.test.mjs checks this list against inscriptionOnCard. */
export const NO_EFFECT_AT_START = Object.freeze(['whetted', 'mirror', 'lodestone']);
export const START_CARD_IDS = Object.freeze(['lift-guide', 'skim-line', 'pulse-reader', 'courier-cord', 'meter-mark', 'finish-flag']);
/** Wisp stats: stored on the run as run.wispBonus = id. Applied in getRunModifiers (reach, light, recovery), vitality (Meter, hearts) and once at the pick (hearts filled, Stored Sparks). */
export const WISP_STATS = Object.freeze({
  radius: Object.freeze({id: 'radius', name: 'Wide Reach', chip: '+20% radius', text: 'Collect radius +20%', reach: 1.2}),
  meter: Object.freeze({id: 'meter', name: 'Deep Meter', chip: '+5 max Sparks', text: 'Max Spark Meter +5', capacity: 5}),
  heart: Object.freeze({id: 'heart', name: 'Spare Heart', chip: '+1 heart', text: '+1 max heart, filled', hearts: 1}),
  light: Object.freeze({id: 'light', name: 'Bright Wisp', chip: '+10% Luminance', text: 'Luminance +10%', percent: 10}),
  stored: Object.freeze({id: 'stored', name: 'Packed Start', chip: '+10 Stored', text: '+10 Stored Sparks now', stored: 10}),
  recovery: Object.freeze({id: 'recovery', name: 'Quick Collector', chip: 'Collector 20% faster', text: 'Collector recovers 20% faster', recovery: 0.8}),
});
export const WISP_STAT_IDS = Object.freeze(Object.keys(WISP_STATS));
export const getWispStat = run => (typeof run?.wispBonus === 'string' && Object.hasOwn(WISP_STATS, run.wispBonus)) ? WISP_STATS[run.wispBonus] : null;
export const wispChipText = run => { const s = getWispStat(run); return s ? `Wisp: ${s.chip}` : ''; };
/** Extra max hearts and the Meter bonus in printed Sparks (the 5-heart and 100-Spark ceilings are applied by the callers). */
export const wispHearts = run => getWispStat(run)?.hearts || 0;
export const wispMeterSparks = run => getWispStat(run)?.capacity || 0;
/** Reach, light and Collector recovery go through the same modifier object cards use. Never multiplied by Boosts. */
export function applyWispBonus(m, run) {
  const s = getWispStat(run);
  if (!s || !m) return m;
  if (s.reach) m.attract *= s.reach;
  if (s.percent) m.cardLuminancePercent = (Number(m.cardLuminancePercent) || 0) + s.percent;
  if (s.recovery) m.wispCooldown *= s.recovery;
  return m;
}

function random(seed) {
  let s = 2166136261;
  for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
  return () => { s += 0x6d2b79f5; let n = s; n = Math.imul(n ^ (n >>> 15), n | 1); n ^= n + Math.imul(n ^ (n >>> 7), n | 61); return ((n ^ (n >>> 14)) >>> 0) / 4294967296; };
}
const POOLS = Object.freeze({card: START_CARD_IDS.map(id => `card:${id}`), inscription: INSCRIPTION_IDS.filter(id => !NO_EFFECT_AT_START.includes(id)).map(id => `inscription:${id}`), wisp: WISP_STAT_IDS.map(id => `wisp:${id}`)});
const KINDS = Object.freeze(['card', 'inscription', 'wisp']);
export const startBonusKind = id => String(id).split(':')[0];
export const isStartBonusId = id => typeof id === 'string' && KINDS.some(kind => POOLS[kind].includes(id));
/** Three offer ids ('card:x', 'inscription:x', 'wisp:x'), seeded by `seed`: per tile a kind with equal chance, then an unused member of that kind. */
export function drawStartBonusIds(seed) {
  const draw = random(`${seed}:start-bonus:v4`), picked = [];
  while (picked.length < 3) {
    const pool = POOLS[KINDS[Math.floor(draw() * 3)]].filter(id => !picked.includes(id));
    picked.push(pool[Math.floor(draw() * pool.length)]);
  }
  return picked;
}
