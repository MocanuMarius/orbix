// Tile lines (v2.3-deck, approved 2026-11-17): the short form of a card's "what" line, used only on a Deck
// tile where the card's own effect line (card-rule-bands.mjs › getCardRuleBands, type "effect") is too long
// to fit. Same meaning, approved vocabulary, about 22 characters at most. The full line is always on the
// opened card. Moved from the design lab's TILE_SHORT table (56 cards) with the Pulse wording applied.
import {getCardRuleBands} from './card-rule-bands.mjs?v=workshop-1';
import {SKILL_CARDS, describeSkillCard, cardTallyLine} from './skill-cards.mjs?v=workshop-1';

export const CARD_TILE_LINES = Object.freeze({
  'momentum': '5 Turns: +40% light',
  'low-ember': 'Under half: a Pulse',
  'close-call': 'A Pulse, +3 Sparks',
  'homing-thread': 'Fetches, 2× reach',
  'last-round': 'Last Trigger again',
  'harvest-home': 'Collect cards, +2 each',
  'wave-loom': 'A light Pulse per Turn',
  'climb': 'Lifts 2 and 3 free', 'watchlight': 'Collector saves you', 'springboard': 'Collect: free bounce',
  'lift-guide': 'On the beat: +1 Spark', 'cache-handling': 'Fetches Caches: +12', 'second-sun': '×2 before, ×3 Encore',
  'twin-wick': '2 Collectors a flight', 'harvest-legendary': '+2 Sparks, +1 Stored',
  'nest-egg': '+1 Stored per 10', 'flash-handling': '+6; fetches Flare',
  'dream': 'Devour: longer Dream', 'spillway': '2nd Overfill: a Pulse', 'mirror-grain': 'Adds last + again',
  'ember-feeder': 'Eats 2: +1 max Spark', 'refrain': 'Encore: fires again', 'devourer': 'Eats a Rare: +1 heart',
  'tight-packing': '+50% from packing', 'tight-packing-ii': '+75% from packing', 'tight-packing-iii': '+100% from packing',
  'return-spring': 'Reels in 0.5 s sooner', 'spillway-ii': 'Each Overfill: a Pulse',
  'growth-seed': '+5 max, full meter', 'growth-seed-common': '+3 max, full meter', 'growth-seed-legendary': '+8 max, full meter',
  'camp-kit': '2 Rest actions', 'echo-iii': 'Repeats next ×3', 'echo-ii': 'Repeats next twice',
  'ripple-glass': 'Doubles all before', 'glide-prism': 'Lift: ×2 all before', 'courier-glass': 'Doubles all before',
  'clear-prism': 'Doubles all before', 'wick-doubler': 'Doubles all before', 'crescendo': 'Doubles all before',
  'diving-bell': 'Final Pulse, +3 Sparks', 'counterweight': 'Ready 0.75 s sooner', 'haul-winch': 'Next reel 3 s sooner',
  'fast-spool': 'Reels in 3 s sooner', 'rhythm': '3 even Lifts: a Pulse', 'glass-spool': 'Ready 0.5 s sooner',
  'use-doubler': 'Next card: 2× uses', 'tailwind': '3rd Collect: +1 heart', 'wind-feather': '+1% speed (max 6%)',
  'twin-orbit': '2nd Collector fetches', 'prism-lens': 'All before ×1.25', 'prism-lens-ii': 'All before ×3',
  'keystone': 'Neighbours fire twice', 'vanguard': 'Slot 1: +3, else +1', 'bookends': 'Ends match: all ×2',
  'empty-chair': '+2 per empty Slot', 'ladder': '+1 per card to left', 'twin-flame': 'Exactly 2 before: ×3', 'spill-jar': 'Half of spill: Stored',
  'second-wind': 'Save: all fire 5 s', 'undertow': 'Falling Lift: Collect',
  'closing-chord': 'Last: all before ×2.5', 'ring-spring': 'Ready 1 s sooner', 'ring-spring-ii': 'Ready 2 s sooner',
  'pacesetter': 'Ready 3 s sooner', 'mending-moss': 'Ready 3 s sooner', 'flash-thread': 'Ready 3 s sooner',
  'chameleon-two': 'Next: any, not growth', 'slip-feather': 'A revealing Pulse', 'edge-reach': 'Pulse; reach +50%', 'double-lift': '2nd Lift is free',
  // Engine, Pack and Black Hole cards (released 2026-11-18).
  'metronome': 'Every 3 s: fires next', 'heartbeat': 'Timers wait half', 'slow-wick': 'Pulse: 3 s, then Pulse',
  'spark-chime': 'Pulse: +1 Spark', 'ember-bell': 'Overfill: sends Pulse', 'long-fuse': 'Pulse: 5 s, fire again',
  'first-catch': '1st Collect: a Pulse', 'overflow-bell': 'Pulse; keeps 2 Stored', 'flash-tinder': 'Collect: 1 s Flare',
  'afterglow': 'Flare ends: +2 Sparks', 'third-beat': '3rd Turn counts twice', 'black-hole': 'Eats next: +max Sparks',
  'full-satchel': 'Pack: +3 Sparks',
});

/** The line a Deck tile shows: the tile form when the card has one, else its real effect line. */
export function cardTileLine(card) {
  const id = card?.cardId || card?.id;
  if (cardTallyLine(card)) return cardTallyLine(card);
  if (CARD_TILE_LINES[id]) return CARD_TILE_LINES[id];
  const def = SKILL_CARDS[id];
  const effect = def ? getCardRuleBands(card, def).find(band => band.type === 'effect')?.text : '';
  return String(effect || describeSkillCard(card)?.effect || '').replace(/\.$/, '');
}

// The approved Spark icon. The path lives in this root-level module on purpose: the page resolves it
// against game.html and the offline list resolves it against the module that names it, and only a
// module in dist/ makes those two agree.
export const SPARK_ICON_SRC = 'assets/ui/spark.svg';
export const WISP_ORB_SRC = 'assets/ui/waystone/orb-wisp.svg';
