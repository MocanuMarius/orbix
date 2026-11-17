// Inscriptions (docs/inscriptions.md): an effect written on a Chain SLOT, not on a card. One per slot. It stays on the slot
// when cards are moved, swapped, melted, sold or devoured. Pure data and helpers, no DOM, no imports, so every layer
// (rules, flight, model, screens, tests) can share it.
//   kind 'card'       changes the card sitting in that slot; does nothing while the slot is empty.
//   kind 'standalone' works while it is on any slot, even an empty one.
// Texts use the 8-trigger vocabulary and stay within 12 words. They are shown only on menu screens, never in flight.
const def = (id, name, kind, text, extra = {}) => Object.freeze({id, name, kind, text, ...extra});

export const INSCRIPTIONS = Object.freeze(Object.fromEntries([
  // Card-modifying
  def('twin-mark', 'Twin Mark', 'card', 'The card here fires twice.', {glyph: 'twin'}),
  def('gilded', 'Gilded', 'card', 'Each time the card here fires: +2 Sparks.', {glyph: 'gild', bonus: 2}),
  def('resonant', 'Resonant', 'card', 'The card here also fires on a Pulse.', {glyph: 'wave', also: 'wave-crossing'}),
  def('kindled', 'Kindled', 'card', 'The card here also fires on a Lift.', {glyph: 'lift', also: 'downbeat-lift'}),
  def('courier', 'Courier', 'card', 'The card here also fires on a Delivery.', {glyph: 'give', also: 'collector-delivery'}),
  def('wellspring', 'Wellspring', 'card', 'The card here also fires on an Overfill.', {glyph: 'well', also: 'natural-overfill'}),
  def('flare', 'Flare', 'card', 'The card here also fires on a Flash.', {glyph: 'flash', also: 'flash-pickup'}),
  def('mirror', 'Mirror', 'card', 'The card here fires whenever the card to its left fires.', {glyph: 'mirror'}),
  def('brimful', 'Brimful', 'card', 'Sparks the card here gains above the Meter become Stored Sparks.', {glyph: 'brim'}),
  def('whetted', 'Whetted', 'card', 'The card here gets 1 extra use each flight.', {glyph: 'whet'}),
  // Standalone
  def('hollow', 'Hollow', 'standalone', 'While this slot is empty: +2 Sparks on every Collect.', {glyph: 'hollow', bonus: 2}),
  def('hearth', 'Hearth', 'standalone', '+10 maximum Sparks.', {glyph: 'hearth', capacity: 10}),
  def('lantern', 'Lantern', 'standalone', '+25% Luminance.', {glyph: 'lantern', percent: 25}),
  def('long-cord', 'Long Cord', 'standalone', 'Collector reach +30%.', {glyph: 'cord', reach: 1.3}),
  def('bell', 'Bell', 'standalone', 'Send a Pulse every 6 seconds.', {glyph: 'bell', every: 6}),
  def('lodestone', 'Lodestone', 'standalone', 'Cards on both sides of this slot give +1 Spark each firing.', {glyph: 'lode', bonus: 1}),
  def('ember-bed', 'Ember Bed', 'standalone', 'Finish: +3 Stored Sparks, +1 more per empty slot.', {glyph: 'bed', stored: 3}),
  def('cinder', 'Cinder', 'standalone', 'Lift costs 1 less Spark.', {glyph: 'cinder'}),
].map(item => [item.id, item])));

export const INSCRIPTION_IDS = Object.freeze(Object.keys(INSCRIPTIONS));
/** Glyph family: a chisel mark for card-modifying, a rune ring for standalone. */
export const INSCRIPTION_FAMILIES = Object.freeze({card: 'Chisel', standalone: 'Rune'});
export const getInscription = id => (typeof id === 'string' && Object.hasOwn(INSCRIPTIONS, id)) ? INSCRIPTIONS[id] : null;

/** Source of slot Inscriptions: a run (`slotInscriptions`) or a card execution (`inscriptions`). */
const listOf = source => source?.inscriptions || source?.slotInscriptions || null;
export const slotInscriptionId = (source, slot) => { const entry = listOf(source)?.[slot]; return entry && getInscription(entry.id) ? entry.id : null; };
export const slotInscription = (source, slot) => getInscription(slotInscriptionId(source, slot));
/** Slots (indexes) that carry this Inscription. */
export const slotsWith = (source, id) => (listOf(source) || []).map((entry, slot) => entry?.id === id ? slot : -1).filter(slot => slot >= 0);
export const countInscription = (source, id) => slotsWith(source, id).length;

/** Keep `run.slotInscriptions` aligned with `run.mountedCards`: same length, every entry null or `{id}`. */
export function cleanSlotInscriptions(run) {
  if (!run || typeof run !== 'object') return [];
  const slots = Array.isArray(run.mountedCards) ? run.mountedCards.length : Math.max(0, Number(run.cardSlots) || 0);
  const old = Array.isArray(run.slotInscriptions) ? run.slotInscriptions : [];
  run.slotInscriptions = Array.from({length: slots}, (_, i) => getInscription(old[i]?.id) ? {id: old[i].id} : null);
  return run.slotInscriptions;
}

/** Write (or replace) the Inscription on a slot. Returns the replaced id (or null), or false when refused. */
export function writeInscription(run, slot, id) {
  if (!run || !getInscription(id) || !Number.isInteger(slot) || slot < 0) return false;
  const list = cleanSlotInscriptions(run);
  if (slot >= list.length) return false;
  const replaced = list[slot]?.id || null;
  list[slot] = {id};
  return replaced;
}
export function clearInscription(run, slot) {
  const list = cleanSlotInscriptions(run);
  if (!Number.isInteger(slot) || slot < 0 || slot >= list.length) return false;
  list[slot] = null;
  return true;
}

/** Deterministic pick: `random` is any () => [0,1) function. Three offers, never one already written on a slot unless fewer
 * than three others remain (then the written ones fill up the three). */
export function offerInscriptions(run, random = Math.random, count = 3) {
  const held = new Set((run?.slotInscriptions || []).map(entry => entry?.id).filter(Boolean));
  const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fresh = shuffle(INSCRIPTION_IDS.filter(id => !held.has(id)));
  const offers = fresh.slice(0, count);
  if (offers.length < count) offers.push(...shuffle(INSCRIPTION_IDS.filter(id => held.has(id))).slice(0, count - offers.length));
  return offers;
}

// Rule helpers shared by the row walker, the engine and the flight. `source` is a run or a card execution.
export const hollowBonus = (source, slot, occupied) => occupied ? 0 : (slotInscription(source, slot)?.id === 'hollow' ? INSCRIPTIONS.hollow.bonus : 0);
/** +1 Spark per Lodestone on a neighbouring slot (left or right). */
export const lodestoneBonus = (source, slot) => [slot - 1, slot + 1].reduce((sum, s) => sum + (slotInscriptionId(source, s) === 'lodestone' ? INSCRIPTIONS.lodestone.bonus : 0), 0);
export const capacityBonusSparks = source => countInscription(source, 'hearth') * INSCRIPTIONS.hearth.capacity;
export const emberBedStored = (source, cards) => { const beds = countInscription(source, 'ember-bed'); if (!beds) return 0; const empty = (cards || []).filter(card => !card).length; return beds * (INSCRIPTIONS['ember-bed'].stored + empty); };
