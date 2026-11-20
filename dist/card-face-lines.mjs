// The two lines a card face prints (owner request 2026-11-18, "a card face never scrolls").
//   Line 1: the Trigger (or role) as ONE word with its small pixel icon, e.g. "Collect", "Lift", "Passive", "Start", "Rest".
//   Line 2: the effect in a few words; a condition that changes when it fires stays, short ("on the cue", "while falling").
// Caps, limits and fine print ("up to +90", "3 Grows per journey") are not printed on the face. They stay in the card's
// full rules, which the "?" help window shows (card-ui.mjs › cardHelpDescription). Numbers the player tracks during a
// run (uses left, a growth or tally counter) stay on the face as badges, not here.
// The internal trigger keys (card-rule-bands.mjs › CARD_TRIGGERS) are untouched; this is a wording layer on top of them.
import {getCardRuleBands, getCardTrigger} from './card-rule-bands.mjs?v=guide-clarity-1';

/** Words for Triggers that the display layer (card-trigger-labels.mjs) leaves without a chip, as [word, glossary key]. */
const EXTRA_WORDS = Object.freeze({
  rest: ['Rest', 'rest'], 'take-off': ['Start', 'take-off'], 'flash-ends': ['Flare', 'flash'],
  'engine-turn': ['Timer', 'timer'], 'engine-any': ['Timer', 'timer'], timers: ['Timer', 'timer'],
});
const GROUP_KEYS = Object.freeze({collect: 'collect', lift: 'falling-lift', pulse: 'wave', delivery: 'delivery', overfill: 'overfill',
  finish: 'clear', skim: 'engine-skim', passive: 'always-on', boost: 'boost', repeat: 'next'});

/** Cards whose effect happens as a flight starts read "Start" with the take-off icon, though their Trigger key is Passive. */
const START_CARDS = new Set(['twin-wick', 'use-doubler', 'dream', 'black-hole']);

// Wave Loom and Third Beat follow a Timer, so their first line says Timer (2026-11-20).
const TIMER_FACE = new Set(['wave-loom', 'third-beat', 'slow-wick', 'long-fuse', 'radar']);
/** {word, term, iconId}: the one word on line 1, its glossary entry and the id its icon is drawn for. */
export function faceTrigger(card = {}, definition = {}) {
  const chip = getCardTrigger(card, definition);
  if (START_CARDS.has(card.cardId || card.id || definition.id)) return {word: 'Start', term: 'take-off', iconId: 'take-off'};
  if (TIMER_FACE.has(card.cardId || card.id || definition.id)) return {word: 'Timer', term: 'timer', iconId: 'engine-any'};
  const extra = EXTRA_WORDS[chip.id];
  if (extra) return {word: extra[0], term: extra[1], iconId: chip.id};
  return {word: chip.label || 'Passive', term: GROUP_KEYS[chip.group] || chip.id, iconId: chip.id};
}

// Line 2 by card id. `{fx}` is the card's own effect text (its number comes from the card, so ranks and tiers stay right).
const LINES = Object.freeze({
  'field-impulse': 'Swipe to float or dive',
  'lift-guide': '{fx}',
  'skim-line': '+12 Sparks', 'pulse-reader': '+1 Spark', 'courier-cord': '+10 Sparks over 10 s', 'meter-mark': '50%: +1 Stored', 'finish-flag': '+2 Stored',
  rhythm: '3 even Lifts: a Pulse',
  'harvest-legendary': '+2 Sparks, +1 Stored',
  'camp-kit': '2 Rest actions',
  'growth-seed': '{fx}', 'growth-seed-common': '{fx}', 'growth-seed-legendary': '{fx}',
  'cache-handling': 'Fetches Caches: +12',
  'flash-handling': '+6 Sparks from a Flare',
  'prism-lens': 'Cards before ×1.25', 'prism-lens-ii': 'Cards before ×3', crescendo: 'Cards before ×2',
  refrain: 'Encore: fires again',
  downbeat: '{fx} while falling', 'downbeat-iii': '{fx} while falling',
  'ring-spring': 'Next ready 1 s sooner', 'ring-spring-ii': 'Next ready 2 s sooner',
  watchlight: 'Collector blocks a crash',
  'second-look': 'Re-roll 1 reward card',
  'echo-ii': 'Repeats next twice', 'echo-iii': 'Repeats next 3 times',
  'dusk-wick': '{fx} from Dusk', 'dusk-wick-ii': '{fx} from Dusk', 'dusk-wick-iii': '{fx} from Dusk',
  'cluster-heart': '{fx} from a Cluster', 'low-wick': '{fx} when low',
  'first-ripple': '1st only: {fx}', 'far-shore': 'From 2nd: {fx}', 'ripple-glass': 'From 2nd: ×2 before',
  'toll-bell': '{fx} on the beat',
  'slip-feather': 'A Pulse near terrain',
  'diving-bell': 'Final Pulse, +3 Sparks',
  tailwind: '3rd Collect: +1 heart',
  springboard: 'Falling Collect: a bounce',
  pacesetter: 'On the beat: Collector 3 s sooner',
  counterweight: 'Falling: Collector 0.75 s sooner',
  'glide-prism': '×2 before it', 'courier-glass': '×2 before it', 'clear-prism': '+6 Sparks; ×2 before it', 'wick-doubler': '×2 before it',
  'mending-moss': 'While recovering: 3 s sooner',
  'home-beacon': 'Once: +3 a heart, +1 per 10 Sparks', 'clean-run': 'Once: +5 Stored, no heart lost', 'victory-lap': 'Once: +1 a card, +1 per 15 firings', 'curtain-call': 'Once: first card fires ×3', brimful: 'Full Meter: Collect +1', 'pressure-valve': 'next Lift free', floodgate: 'whole Chain fires', 'last-light': 'Last heart: rewards ×2', 'flash-bank': '{fx} when low',
  'return-spring': 'Reels in 0.5 s sooner',
  'haul-winch': 'Cluster: reel 3 s sooner',
  'crate-lining': '{fx} Cache, half Cluster',
  'glass-spool': 'Collector 0.5 s sooner', 'flash-thread': 'Collector 3 s sooner',
  spillway: '2nd Overfill: a Pulse', 'spillway-ii': 'Each Overfill: a Pulse',
  'kindling-bead': '{fx} after a + card', 'kindling-bead-ii': '{fx} after a + card', 'kindling-bead-iii': '{fx} after a + card',
  'mirror-grain': 'Adds last + again', 'closing-chord': 'Last: cards before ×2.5',
  'second-sun': '×2 before, ×3 Encore',
  'edge-reach': 'A Pulse near terrain',
  'growth-ring': 'Once: +1 max Spark', 'wind-feather': 'Once: +1% speed', 'wayfarers-purse': 'Once: +5 Stored Sparks',
  'nest-egg': 'Once: +1 Stored per 10 packed',
  devourer: 'Eats a Rare: +1 heart', 'use-doubler': 'Next card: 2× uses', 'ember-feeder': 'Eats 1: +1, or 2: +3',
  'fast-spool': 'While reeling: 3 s sooner',
  'twin-orbit': 'A 2nd Collector fetches', 'twin-wick': '2 Collectors a flight',
  'long-spool': 'Collector reach +35%', 'cast-line': 'Collector reach +100%',
  dream: 'Practise the first 8 s',
  'double-lift': 'Lift twice in 1 s: 2nd free', climb: '3 Lifts in 1 s: 2nd, 3rd free',
  'flash-tinder': 'Starts a 1 s Flare', 'homing-thread': 'Fetches a Spark, 2× reach',
  'overflow-bell': 'A Pulse; keeps 2 Stored',
  radar: 'Every 10 s: a Pulse', 'ember-snack': 'Eats next: +50 Stored', kindling: 'Low Meter: +1 per 2 s',
  'slow-wick': 'Every 3 s: a Pulse', metronome: 'Every 3 s: fires next', 'long-fuse': 'Every 5 s: fires again',
  heartbeat: 'Timers wait half',
  'first-catch': '1st: +4 Sparks, a Pulse', 'close-call': 'A Pulse, +12 Sparks', 'low-ember': 'Under half: +6, a Pulse',
  'third-beat': '33%: counts twice', momentum: '+1 a firing; 5th: +40% light',
  'full-satchel': '+3 Sparks before packing', 'last-round': 'Last Trigger fires again', 'harvest-home': 'Collect cards fire again, +2 each',
  'black-hole': 'Eats next: +max Sparks',
  keystone: 'Neighbours fire twice', vanguard: 'Slot 1: +3, else +1', bookends: 'Ends match: all ×2',
  'empty-chair': '+2 per empty Slot', ladder: '+1 per card to the left', 'twin-flame': 'Exactly 2 before: ×3',
  'spill-jar': 'Spill: half goes Stored',
  'scar-tissue': '+1 per Save', 'collectors-ledger': '+1 Spark, grows', 'old-friend': '+1 per flight kept',
  'gilded-rim': '+1 max Spark per Overfill',
  'second-wind': 'All fire for 5 s', undertow: 'Counts as a Collect',
  tributary: 'Every 3rd Collect: Delivery', tithe: 'Pay 5 Stored: +1 max Spark',
  'chameleon-two': 'Fires next on any Trigger', whetstone: 'Next card regains 1 use',
  'wave-loom': 'Pulse when a Timer fires', 'spark-chime': '{fx}', 'ember-bell': 'Sends a Pulse', afterglow: '{fx}',
});

// A short pass for any card without an entry (a new card shows readable text until it gets a line above).
const generic = text => String(text || '')
  .replace(/^Every card before it ×(.+)$/, 'Cards before ×$1')
  .replace(/^Double every (?:card|reward) before it$/, '×2 before it')
  .replace(/\.$/, '');

/** Line 2 for a card: the short effect, with its condition when the condition changes when it fires. */
export function faceEffect(card = {}, definition = {}) {
  const id = card.cardId || card.id || definition.id;
  const bands = getCardRuleBands(card, definition);
  const fx = (bands.find(band => band.type === 'effect')?.text || '').replace(/ and a full meter$/, '');
  const template = LINES[id];
  if (!template) return generic(fx);
  return template.replace('{fx}', fx.replace(/\.$/, ''));
}

/** Text for the "?" help window: the printed rules plus every cap, limit and note the face leaves out. */
export function faceFinePrint(card = {}, definition = {}) {
  return getCardRuleBands(card, definition).filter(band => band.type === 'note' && !/^\d+ (?:shared )?uses?$|^Uses?$/i.test(band.text)).map(band => band.text.replace(/\.$/, ''));
}
