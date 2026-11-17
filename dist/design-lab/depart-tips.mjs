// v1.0-depart: departure tips as data, plus the picker. Design-lab only; nothing here is in the game yet.
// Every claim was checked against dist/card-catalog.mjs, dist/card-terms.mjs, dist/biomes.mjs and dist/black-holes.mjs.
// Retired cards (field-impulse, wave-loom) are never named. Limits: headline at most 5 words, text at most 16 words.
//
// context grammar (a tip is shown only when ALL "&" parts hold):
//   always                      any run
//   card:<id>[|<id>...]         one of these cards is equipped (ids from card-catalog.mjs)
//   trigger:<name>              an equipped card waits for that Trigger (collect, delivery, pulse, flash, overfill,
//                               rhythm, falling-lift); "pulse" is the catalog's "wave"
//   biome:<id>                  the destination is in that biome (ids from biomes.mjs)
//   hazard:black-hole           the passage has a Black Hole
//   low-hearts                  one heart left          first-flights   flights 1 to 3 of the run
//   collector                   the Collector companion is along   empty-slot   the Chain has a free Slot
//   has-stored-sparks           Stored Sparks in the wallet        after-death  the last flight was lost
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';

export const TIPS = Object.freeze([
 // ── General: fine in any run ──────────────────────────────────────────────────────────────
 {id:'lift-cost',context:'always',icon:'wisp',headline:'Lifts cost Sparks',text:'Every Lift spends Sparks from your meter. Touching Sparks refills it, up to 100.'},
 {id:'lift-sooner',context:'always',icon:'wisp',headline:'Lift sooner near rock',text:'Lift sooner to clear rock, and leave room to rise first.'},
 {id:'chain-order',context:'always',icon:'chain',headline:'Your Chain fires in order',text:'When a Trigger happens, your cards fire left to right.'},
 {id:'read-trigger',context:'always',icon:'chain',headline:'Read the Trigger first',text:'Each card shows its Trigger first: what makes it fire, like Collect or Pulse.'},
 {id:'luminance',context:'always',icon:'lantern',headline:'Luminance is your light',text:'Luminance is the radius of light around your wisp. It reveals nearby passage.'},
 {id:'flash-light',context:'always',icon:'flash',headline:'White triangles light the way',text:'A Flash is a white triangle pickup that briefly lights the passage.'},
 {id:'dusk-drain',context:'always',icon:'dusk',headline:'Rose crescents drain',text:'A Dusk Spark drains up to 3 Sparks and dims your light for 4 seconds.'},
 {id:'spare-fuel',context:'always',icon:'jar',headline:'Spare fuel is saved',text:'Extra meter fuel is packed into Stored Sparks, during a Round and after a clear.'},
 {id:'rest-checkpoint',context:'always',icon:'camp',headline:'Rest is a checkpoint',text:'At Rest you choose an action and can improve your Deck.'},
 // ── Card-specific: only when that card is equipped ────────────────────────────────────────
 {id:'rhythm-glide',context:'card:rhythm',icon:'beat',headline:'Lift, rise, then glide',text:'In still air, glide back to takeoff height between Lifts. Rhythm needs even gaps.'},
 {id:'rhythm-three',context:'card:rhythm',icon:'beat',headline:'Three even Lifts, one Pulse',text:'Three successful, evenly spaced Lifts send one Pulse. Choose a pace the passage allows.'},
 {id:'lift-guide-chevron',context:'card:lift-guide',icon:'note',headline:'Follow the amber chevron',text:'The chevron marks a Lift that regains height. With sound on, Lift on the higher note.'},
 {id:'harvest-pulse',context:'card:harvest-common|harvest-rare|harvest-legendary',icon:'pulse',headline:'Harvest the Pulse',text:'Resonant Harvest pays when a Pulse crosses an uncollected Spark. The Spark stays.'},
 {id:'echo-copy',context:'card:echo|echo-ii|echo-iii',icon:'chain',headline:'Echo copies the next card',text:'Echo repeats the card directly to its right, and spends that card’s uses.'},
 {id:'chameleon-borrow',context:'card:chameleon',icon:'chain',headline:'Chameleon borrows the next card',text:'It acts as the card to its right and shares that card’s uses.'},
 {id:'boost-left',context:'card:prism-lens|prism-lens-ii|crescendo|closing-chord|second-sun',icon:'spark',headline:'Boosts look left',text:'A × card multiplies the cards to its left, so place it after them.'},
 {id:'pocket-uses',context:'card:spark-cache',icon:'jar',headline:'Pocket Sparks runs out',text:'It spends one use per direct pickup bonus, then leaves your Deck at zero.'},
 {id:'deep-vessel',context:'card:deep-vessel',icon:'jar',headline:'Bigger meter, not fuller',text:'Deep Vessel raises maximum Sparks but does not refill your meter. The cap is 100.'},
 {id:'grow-at-rest',context:'card:growth-seed|growth-seed-common|growth-seed-legendary',icon:'sprout',headline:'Grow at Rest',text:'Growth Seeds add maximum Sparks and refill your meter when you Grow at Rest.'},
 {id:'cache-handling',context:'card:cache-handling',icon:'collector',headline:'Touch beats delivery',text:'Collector delivers a Cache for 12 Sparks, but touching it yourself pays 18.'},
 {id:'watchlight',context:'card:watchlight',icon:'collector',headline:'Keep Collector close',text:'Watchlight blocks one fatal impact per flight while Collector sits beside you at full charge.'},
 {id:'dream',context:'card:dream',icon:'moon',headline:'Dream is free practice',text:'Dream rehearses the first 8 seconds with free Lifts. Rehearsing spends no heart.'},
 {id:'double-lift',context:'card:double-lift',icon:'beat',headline:'Tap twice, pay once',text:'Two successful manual Lifts within one second make the second one free.'},
 {id:'springboard',context:'card:springboard',icon:'spark',headline:'Bounce on the way down',text:'Touch a natural Spark while falling for a free half-Lift bounce. No Rhythm progress.'},
 {id:'refrain',context:'card:refrain',icon:'chain',headline:'Refrain: one Encore',text:'Refrain fires your Chain once more for the same Trigger, from Slot 1.'},
 {id:'tight-packing',context:'card:tight-packing|tight-packing-ii|tight-packing-iii',icon:'jar',headline:'Pack tighter',text:'Tight Packing adds extra Stored Sparks to ordinary Packing.'},
 {id:'proximity',context:'card:slip-feather|edge-reach',icon:'pulse',headline:'Skim, do not touch',text:'Stay near terrain for 2 seconds to send a revealing Pulse. Touching it does not count.'},
 // ── Trigger-specific: only when a card in the Chain waits for that Trigger ────────────────
 {id:'collect-trigger',context:'trigger:collect',icon:'spark',headline:'Collect fires on touch',text:'Your wisp touching a Spark, Cluster, Cache or Dusk Spark fires your Collect cards.'},
 {id:'delivery-not-collect',context:'trigger:delivery',icon:'collector',headline:'Delivery is not Collect',text:'A pickup Collector brings you fires Delivery cards, not Collect cards.'},
 {id:'pulse-uncollected',context:'trigger:pulse',icon:'pulse',headline:'Cross, then collect',text:'A Pulse crossing an uncollected Spark fires Pulse cards. The Spark stays; pick it up.'},
 {id:'overfill-two',context:'trigger:overfill',icon:'spark',headline:'One touch, two Triggers',text:'A Spark that overfills your meter fires Overfill first, then Collect.'},
 {id:'falling-lift',context:'trigger:falling-lift',icon:'wisp',headline:'Wait, fall, then Lift',text:'A Falling Lift is a paid Lift while falling, at least 0.75 s after your last.'},
 {id:'flash-trigger',context:'trigger:flash',icon:'flash',headline:'Flash is a Trigger too',text:'Touching a Flash triangle fires your Flash cards as well as lighting the passage.'},
 {id:'rhythm-trigger',context:'trigger:rhythm&card:rhythm',icon:'beat',headline:'Rhythm fires a Trigger',text:'Cards on the Rhythm Trigger fire each time your three even Lifts complete.'},
 // ── Place-specific: biome hints from biomes.mjs, kept to its own wording ──────────────────
 {id:'biome-moonruins',context:'biome:moonruins',icon:'arch',headline:'Loose stones tremble',text:'Cracked masonry shakes, then falls. Do not linger under it.'},
 {id:'biome-frost',context:'biome:frost',icon:'peaks',headline:'Ice melts in your light',text:'Your light melts hanging ice into falling shards. Keep clear below it.'},
 {id:'biome-pinewood',context:'biome:pinewood',icon:'pines',headline:'Cones drop as you near',text:'Ripe cones drop from the canopy as you approach them.'},
 {id:'biome-marsh',context:'biome:marsh',icon:'wisp',headline:'Touch the reed bubbles',text:'Touching a reed bubble gives you a gentle lift.'},
 {id:'biome-fungal',context:'biome:fungal',icon:'sprout',headline:'Burst the puffcaps',text:'Burst a puffcap to ride a rising spore cloud.'},
 {id:'biome-basalt',context:'biome:basalt',icon:'peaks',headline:'Fumaroles launch jets',text:'Passing a fumarole triggers a short rising jet.'},
 {id:'biome-desert',context:'biome:desert',icon:'dune',headline:'Sand warns, then falls',text:'Loose sandstone warns with falling sand, then crumbles.'},
 {id:'biome-coral',context:'biome:coral',icon:'dune',headline:'Anemones open for you',text:'Anemones open into rising currents as you approach.'},
 {id:'biome-crystal',context:'biome:crystal',icon:'peaks',headline:'Touch crystals to flash',text:'Touching a resonant crystal flashes the way ahead.'},
 {id:'biome-cloud',context:'biome:cloud',icon:'dune',headline:'Listen for wind bells',text:'Wind bells warn before a strong local lift.'},
 {id:'biome-thorn',context:'biome:thorn',icon:'pines',headline:'Open the ripe pods',text:'Touch a ripe pod to open it and release a few Sparks.'},
 {id:'biome-cemetery',context:'biome:cemetery',icon:'arch',headline:'Ring the old bells',text:'Ring weathered bells to briefly reveal the path.'},
 // ── Situation-specific ───────────────────────────────────────────────────────────────────
 {id:'black-hole',context:'hazard:black-hole',icon:'blackhole',headline:'Give Black Holes room',text:'A Black Hole drains Sparks and slows time as you near it.'},
 {id:'low-hearts-rest',context:'low-hearts',icon:'heart',headline:'Rest can mend you',text:'At Rest, Recover heals and refills your meter.'},
 {id:'low-hearts-attempts',context:'low-hearts',icon:'heart',headline:'Hearts are attempts',text:'Each heart is one remaining attempt. A failed flight costs one heart.'},
 {id:'first-tap',context:'first-flights',icon:'wisp',headline:'Tap to Lift',text:'Tap or press Lift to rise. Each Lift spends fuel from your Spark Meter.'},
 {id:'first-collector',context:'first-flights&collector',icon:'collector',headline:'Collector catches misses',text:'The small green light catches a missed pickup and reels it to your wisp.'},
 {id:'collector-orbit',context:'collector',icon:'collector',headline:'Read the orbit',text:'The orbit around your wisp shows Collector charge. A full orbit means maximum reach.'},
 {id:'empty-slot',context:'empty-slot',icon:'chain',headline:'Fill your empty Slot',text:'A Slot with no card fires nothing. Equip one from your Reserve in the Deck.'},
 {id:'stored-rest',context:'has-stored-sparks',icon:'jar',headline:'Spend Stored Sparks at Rest',text:'At Rest, Stored Sparks pay to Forge, improve or Evolve cards.'},
 {id:'after-death',context:'after-death',icon:'spark',headline:'Try again',text:'Clear a Round to earn its rewards and choose your next stop.'},
]);

export const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;
export const isContextual = tip => tip.context !== 'always';

// ── Run state the picker reads ──────────────────────────────────────────────────────────────
// {cards:[cardId|{cardId}|null], slots, hearts, biome, hazards:[], flight (1-based in this run),
//  companion:'collector', stored, lastFlightLost}
const TRIGGER_ALIAS = {wave: 'pulse'};
const cardId = c => (c && typeof c === 'object') ? (c.cardId || c.id) : c;
export function runFacts(run) {
  const ids = (run.cards || []).map(cardId).filter(Boolean).filter(id => !CARD_CATALOG[id]?.retired);
  const triggers = new Set(ids.map(id => CARD_CATALOG[id]?.trigger).filter(Boolean).map(t => TRIGGER_ALIAS[t] || t));
  return {
    ids: new Set(ids), triggers,
    biome: run.biome, hazards: new Set(run.hazards || []),
    lowHearts: (run.hearts ?? 3) <= 1, firstFlights: (run.flight ?? 99) <= 3,
    collector: run.companion === 'collector', emptySlot: (run.slots ?? 0) > ids.length,
    stored: (run.stored ?? 0) > 0, afterDeath: !!run.lastFlightLost,
  };
}
function partHolds(part, f) {
  const [key, value = ''] = part.split(':');
  switch (key) {
    case 'always': return true;
    case 'card': return value.split('|').some(id => f.ids.has(id));
    case 'trigger': return f.triggers.has(value);
    case 'biome': return f.biome === value;
    case 'hazard': return f.hazards.has(value);
    case 'low-hearts': return f.lowHearts;
    case 'first-flights': return f.firstFlights;
    case 'collector': return f.collector;
    case 'empty-slot': return f.emptySlot;
    case 'has-stored-sparks': return f.stored;
    case 'after-death': return f.afterDeath;
    default: return false;
  }
}
export const isEligible = (tip, facts) => tip.context.split('&').every(part => partHolds(part, facts));
export const eligibleTips = run => { const f = runFacts(run); return TIPS.filter(tip => isEligible(tip, f)); };

/** Pick one tip for the next flight, or null when nothing is eligible.
 *  history: tip ids shown on earlier flights, oldest first.
 *  Rules: never a tip from the last 8 flights; context tips about two times in three;
 *  within a pool, tips never shown first, then the one seen longest ago. */
export function pickTip(run, history = [], rand = Math.random, {recent = 8, contextShare = 2 / 3} = {}) {
  const banned = new Set(history.slice(-recent));
  const pool = eligibleTips(run).filter(tip => !banned.has(tip.id));
  if (!pool.length) return null;
  const ctx = pool.filter(isContextual), gen = pool.filter(tip => !isContextual(tip));
  const wantContext = rand() < contextShare;
  const first = wantContext ? ctx : gen, second = wantContext ? gen : ctx;
  const group = first.length ? first : second;
  const age = tip => { const i = history.lastIndexOf(tip.id); return i < 0 ? Infinity : history.length - i; };
  const oldest = Math.max(...group.map(age));
  const best = group.filter(tip => age(tip) === oldest);
  return best[Math.floor(rand() * best.length) % best.length];
}

// Seeded generator for the lab's reproducible 20-flight tables.
export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Plain words for the lab's context column.
export function describeContext(context) {
  return context.split('&').map(part => {
    const [key, value = ''] = part.split(':');
    if (key === 'card') return 'card: ' + value.split('|').map(id => CARD_CATALOG[id]?.name || id).filter((n, i, a) => a.indexOf(n) === i).join(' / ');
    if (key === 'trigger') return 'Trigger: ' + value;
    if (key === 'biome') return 'biome: ' + value;
    if (key === 'hazard') return 'hazard: ' + value;
    return key;
  }).join(' + ');
}
