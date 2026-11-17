/** Display layer for Trigger chips (wording only). The engine keeps its 25 internal `trigger` keys
 * (card-catalog.mjs, card-rule-bands.mjs › CARD_TRIGGERS); players see 9 Triggers and 3 roles.
 * Every chip, tile, glossary link and the Triggers tab reads its words from here.
 * An empty label means "no chip": the card's own text says its timing ("At Rest", "At take-off", "Every 3 s"). */
export const DISPLAY_GROUPS = Object.freeze([
  // [group, label, kind, representative internal id (its icon and glossary link), plain meaning, how often]
  ['collect', 'Collect', 'trigger', 'collect', 'You touch a Spark with your wisp.', 'often'],
  ['lift', 'Lift', 'trigger', 'falling-lift', 'You Lift while falling, on the beat, or with your meter under a quarter.', 'often'],
  ['pulse', 'Pulse', 'trigger', 'wave', 'A Pulse crosses a Spark you have not taken, or a card to its left sends a Pulse.', 'often'],
  ['flash', 'Flash', 'trigger', 'flash', 'You or Collector pick up a Flash, or a Flash’s light runs out.', 'a few times'],
  ['delivery', 'Delivery', 'trigger', 'delivery', 'Collector brings you a pickup, or grabs a Spark.', 'a few times'],
  ['overfill', 'Overfill', 'trigger', 'overfill', 'A Spark brings more than your meter holds.', 'a few times'],
  ['save', 'Save', 'trigger', 'save', 'Collector stops a crash that would end the flight.', 'once'],
  ['finish', 'Finish', 'trigger', 'clear', 'You clear a flight, or your spare Sparks are packed.', 'once'],
  ['skim', 'Skim', 'trigger', 'engine-skim', 'You fly close to terrain until Proximity fills.', 'a few times'],
  ['passive', 'Passive', 'role', 'always-on', 'It works the whole time it is in your chain.', 'always'],
  ['boost', 'Boost', 'role', 'any', 'It fires with whatever Trigger fires your chain.', 'with every Trigger'],
  ['repeat', 'Repeat', 'role', 'next', 'It fires when the card to its right fires.', 'with that card'],
].map(([group, label, kind, id, does, often]) => Object.freeze({group, label, kind, id, does, often})));
/** Temporary: this card will be reworked later, so its present label stays. */
const TEMPORARY = Object.freeze({'engine-gain': 'On gain'});
const ALIAS = {collect: 'collect', 'falling-lift': 'lift', 'engine-lift': 'lift', rhythm: 'lift', wave: 'pulse', 'engine-pulse': 'pulse',
  flash: 'flash', 'flash-ends': 'flash', delivery: 'delivery', latch: 'delivery', overfill: 'overfill', save: 'save', 'engine-skim': 'skim',
  clear: 'finish', pack: 'finish', 'always-on': 'passive', any: 'boost', next: 'repeat'};
/** Internal ids that show no chip. */
export const NO_CHIP_IDS = Object.freeze(['rest', 'take-off', 'engine-any', 'timers', 'engine-turn']);
/** Glossary entry (card-terms.mjs) each display group links to. */
export const GROUP_TERM = Object.freeze({collect: 'collect', lift: 'falling-lift', pulse: 'wave', flash: 'flash', delivery: 'delivery',
  overfill: 'overfill', save: 'save', finish: 'clear', skim: 'engine-skim', passive: 'always-on', boost: 'boost', repeat: 'next', 'on-gain': 'engine-gain'});
const byGroup = Object.fromEntries(DISPLAY_GROUPS.map(g => [g.group, g]));
/** {group, label, kind} for an internal Trigger id; null when the id is not shown by this layer (caller keeps its own label). */
export function triggerDisplay(id) {
  if (TEMPORARY[id]) return {group: 'on-gain', label: TEMPORARY[id], kind: 'trigger'};
  if (NO_CHIP_IDS.includes(id)) return {group: null, label: '', kind: 'none'};
  const g = byGroup[ALIAS[id]];
  return g ? {group: g.group, label: g.label, kind: g.kind} : null;
}
export const triggerLabel = (id, fallback = '') => triggerDisplay(id)?.label ?? fallback;
export const triggerTermKey = id => GROUP_TERM[triggerDisplay(id)?.group] || id;
