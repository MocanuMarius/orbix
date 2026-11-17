/** Typed face copy. Catalog metadata takes precedence over these legacy cards.
 * Every card face reads: a Trigger chip (with an optional short condition), one short
 * "what" line, and an optional small tag (uses or a limit). Wording: docs/card-text-rewrite.md. */
const band = (type, text, extra = {}) => ({type, text, ...extra});
const condition = (text, trigger) => band('condition', text, trigger ? {trigger} : {});
const effect = text => band('effect', text);
const note = text => band('note', text);

/** One name per Trigger (docs/card-teaching-plan.md §1). `event` is the engine event, or
 * null for chips that are not a single event. */
export const CARD_TRIGGERS = Object.freeze({
  collect: Object.freeze({id: 'collect', label: 'Collect', event: 'body-spark', meaning: 'Your wisp touches a Spark, Cluster, Cache or Dusk Spark.'}),
  delivery: Object.freeze({id: 'delivery', label: 'Delivery', event: 'collector-delivery', meaning: 'Collector brings you a pickup.'}),
  latch: Object.freeze({id: 'latch', label: 'Latch', event: 'collector-attach', meaning: 'Collector grabs a missed pickup.'}),
  wave: Object.freeze({id: 'wave', label: 'Pulse', event: 'wave-crossing', meaning: 'A Pulse crosses a Spark you have not collected.'}),
  flash: Object.freeze({id: 'flash', label: 'Flash', event: 'flash-pickup', meaning: 'You or Collector pick up Flash.'}),
  'flash-ends': Object.freeze({id: 'flash-ends', label: 'Flash ends', event: 'flash-expiry', meaning: 'A Flash’s light runs out.'}),
  'falling-lift': Object.freeze({id: 'falling-lift', label: 'Falling Lift', event: 'downbeat-lift', meaning: 'A paid Lift while falling, at least 0.75 s after your last Lift.'}),
  overfill: Object.freeze({id: 'overfill', label: 'Overfill', event: 'natural-overfill', meaning: 'A Spark brings more than your meter can hold.'}),
  rhythm: Object.freeze({id: 'rhythm', label: 'Rhythm', event: 'rhythm-phrase', meaning: 'Rhythm’s 3 even Lifts complete.'}),
  swipe: Object.freeze({id: 'swipe', label: 'Swipe', event: 'field-swipe', meaning: 'A Field Impulse swipe succeeds.'}),
  save: Object.freeze({id: 'save', label: 'Save', event: 'guard-rescue', meaning: 'Watchlight or Last Orbit stops a fatal crash.'}),
  clear: Object.freeze({id: 'clear', label: 'Clear', event: 'flight-clear', meaning: 'You clear a flight.'}),
  any: Object.freeze({id: 'any', label: 'Any Trigger', event: null, meaning: 'The card works with whatever Trigger fires the chain.'}),
  next: Object.freeze({id: 'next', label: 'Next card', event: null, meaning: 'The card fires when the card to its right fires.'}),
  'always-on': Object.freeze({id: 'always-on', label: 'Always on', event: null, meaning: 'The card works outside the chain, so order does not fire it. Boosts to its right still strengthen its bonus.'}),
  rest: Object.freeze({id: 'rest', label: 'At Rest', event: null, meaning: 'A Rest card: it works from the Deck at Rest and never goes in the chain.'}),
  // Engine chips (v1.0-engine, docs/engine-cards.md). Heard through dist/card-engine.mjs, not the chain walker.
  'engine-pulse': Object.freeze({id: 'engine-pulse', label: 'Card Pulse', event: null, engine: true, meaning: 'A card to its left sends a Pulse.'}),
  'engine-gain': Object.freeze({id: 'engine-gain', label: 'On gain', event: null, engine: true, meaning: 'A card to its left, or your Collect, gives Sparks.'}),
  'engine-any': Object.freeze({id: 'engine-any', label: 'Any event', event: null, engine: true, meaning: 'Any card event to its left: a Pulse, Sparks given, an Overfill or a Flash.'}),
  'engine-skim': Object.freeze({id: 'engine-skim', label: 'Skim', event: null, engine: true, meaning: 'You fly close to terrain until Proximity fills.'}),
  'engine-lift': Object.freeze({id: 'engine-lift', label: 'Low Lift', event: null, engine: true, meaning: 'You Lift while your meter is under a quarter.'}),
  'engine-turn': Object.freeze({id: 'engine-turn', label: 'Each Turn', event: null, engine: true, meaning: 'An engine in your chain goes round once.'}),
  timers: Object.freeze({id: 'timers', label: 'Timers', event: null, engine: true, meaning: 'It changes every Timer card in your chain.'}),
  pack: Object.freeze({id: 'pack', label: 'Pack', event: null, engine: true, meaning: 'You clear a flight and your spare Sparks are packed.'}),
  'take-off': Object.freeze({id: 'take-off', label: 'Take-off', event: null, engine: true, meaning: 'You start a flight.'}),
});
/** The 16-grid icon (dist/ui/trigger-icons.mjs › TRIGGER_ART) for a chip: its flight event's art, else its own. */
export const triggerArtKey = id => CARD_TRIGGERS[id]?.event || ({swipe: 'field-swipe'})[id] || id;
const triggerForEvent = Object.freeze(Object.fromEntries(Object.values(CARD_TRIGGERS).filter(t => t.event).map(t => [t.event, t.id])));

/** The chip a card shows: {id, label, condition}. Cards without catalog data fall back to
 * their row event (or "Always on" for cards outside the chain). */
export function getCardTrigger(card = {}, definition = {}) {
  const values = {...definition, ...card};
  const bands = values.ruleBands || [];
  const first = bands.find(item => item?.type === 'condition' && item.trigger);
  const own = typeof values.trigger === 'object' ? values.trigger?.id : values.trigger;
  const id = own || first?.trigger
    || (values.row?.event === '*' ? 'any' : triggerForEvent[values.row?.event])
    || (['camp-grow', 'camp-extra'].includes(values.kind) ? 'rest' : ['echo', 'chameleon'].includes(values.kind) ? 'next' : 'always-on');
  const trigger = CARD_TRIGGERS[id] || CARD_TRIGGERS['always-on'];
  return {id: trigger.id, label: trigger.label, condition: first?.detail || ''};
}

const legacy = {
  body: card => [condition('Collect', 'collect'), effect(`+${card.amount} Sparks`), ...(card.charges != null ? [note('{uses}')] : [])],
  capacity: card => [condition('Always on', 'always-on'), effect(`+${card.amount} max Sparks`)],
  packing: card => [condition('Always on', 'always-on'), effect(`+${card.amount || 50}% Stored Sparks from packing`)],
  echo: () => [condition('Next card', 'next'), effect('Repeats the next card')],
  chameleon: () => [condition('Next card', 'next'), effect('Acts as the next card')],
  field: () => [condition('Always on · Collector home, ¼ charge', 'always-on'), effect('Swipe: float, dive or speed up, 0.8 s')],
  guide: () => [condition('Always on', 'always-on'), effect('An arrow shows when a Lift regains height')],
  rhythm: () => [condition('Always on', 'always-on'), effect('3 even Lifts send out a Pulse')],
  harvest: (card, def) => [condition('Pulse', 'wave'), effect(`+${card.amount} Sparks${def.stored || card.rarity === 'legendary' ? `, +${def.stored || 1} Stored on its 1st Spark` : ''}`)],
  'camp-extra': () => [condition('At Rest', 'rest'), effect('Take 2 different Rest actions'), note('1 use')],
  'camp-grow': (card, def) => [condition('At Rest · Grow', 'rest'), effect(`+${card.amount ?? def.amount ?? 3} max Sparks and a full meter`), note('3 Grows per journey')],
  'cache-handling': () => [condition('Always on', 'always-on'), effect('Collector fetches Caches: +12 Sparks each')],
  'flash-handling': () => [condition('Flash', 'flash'), effect('+6 Sparks; Collector can fetch Flash')],
  prism: card => [condition('Any Trigger', 'any'), effect(`Every card before it ×${card.amount || 1.25}`)],
  crescendo: () => [condition('Any Trigger', 'any'), effect('Double every card before it')],
  refrain: () => [condition('Any Trigger', 'any'), effect('Encore: the chain fires once more')],
  downbeat: card => [condition('Falling Lift', 'falling-lift'), effect(`+${card.amount || 2} Sparks`)],
  'ring-spring': card => [condition('Overfill', 'overfill'), effect(`Collector ready ${card.amount || 1} s sooner`)],
  watchlight: () => [condition('Always on · Collector home, full charge', 'always-on'), effect('Collector catches a fatal crash, sends a Pulse'), note('1 per flight · then 4× recovery')],
};

/** Shared face tokens: {amount}, {charges}, {fedCapacity}, {replayAmount}, {name}, plus
 * {amountSparks} ("1 Spark" / "4 Sparks") and {uses} ("1 use" / "6 uses", remaining). */
export function interpolateCardText(text, values = {}) {
  const amount = Number(values.amount) || 0, uses = values.charges ?? values.maxCharges ?? '';
  return String(text).replace(/\{(\w+)\}/g, (whole, key) => key === 'amountSparks' ? `${amount} ${amount === 1 ? 'Spark' : 'Sparks'}`
    : key === 'uses' ? (uses === '' ? 'Uses' : `${uses} ${Number(uses) === 1 ? 'use' : 'uses'}`)
    : values[key] ?? whole);
}

/** One plain sentence from a face: "Pulse: +1 Spark." / "Collect: +4 Sparks (6 uses)." */
export function cardRuleSentence(bands = []) {
  const when = bands.filter(item => item.type === 'condition').map(item => item.text).join(' · ');
  const what = bands.filter(item => item.type === 'effect').map(item => item.text.replace(/\.$/, '')).join('; ');
  const tags = bands.filter(item => item.type === 'note').map(item => item.text.replace(/\.$/, '')).join(' · ');
  return `${when ? `${when}: ` : ''}${what}${tags ? ` (${tags})` : ''}.`;
}

export function getCardRuleBands(card = {}, definition = {}) {
  const source = card.ruleBands || definition.ruleBands || legacy[card.kind || definition.kind]?.(card, definition)
    || [effect(card.effect || card.description || definition.description || '')];
  const values = {...definition, ...card};
  return source.filter(item => item && item.text).map(item => ({
    type: ['condition', 'effect', 'note'].includes(item.type) ? item.type : 'effect',
    text: interpolateCardText(item.text, values).replace(/:\s*$/, ''),
    ...(item.trigger ? {trigger: item.trigger} : {}),
    ...(item.detail ? {detail: interpolateCardText(item.detail, values)} : {}),
  }));
}
