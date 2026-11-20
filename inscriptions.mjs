// Inscriptions (docs/inscriptions.md): an effect written on a Chain SLOT, not on a card. One per slot. It stays on the slot
// when cards are moved, swapped, melted, sold or devoured. Pure data and helpers, no DOM, no imports, so every layer
// (rules, flight, model, screens, tests) can share it.
//   kind 'card'       changes the card sitting in that slot; does nothing while the slot is empty.
//   kind 'standalone' works while it is on any slot, even an empty one.
// Texts use the 8-trigger vocabulary and stay within 12 words. They are shown only on menu screens, never in flight.
const def = (id, name, kind, text, extra = {}) => Object.freeze({id, name, kind, text, ...extra});

export const INSCRIPTIONS = Object.freeze(Object.fromEntries([
  // Card-modifying
  def('twin-mark', 'Twin Mark', 'card', 'Fires twice. On a Boost, the Boost applies twice.', {glyph: 'twin'}),
  def('gilded', 'Gilded', 'card', 'Each firing, 50%: +2 Sparks.', {glyph: 'gild', bonus: 2, chance: 50}),
  def('resonant', 'Resonant', 'card', 'Also fires on a Pulse.', {glyph: 'wave', also: 'wave-crossing'}),
  def('kindled', 'Kindled', 'card', 'Also fires on a Lift.', {glyph: 'lift', also: 'downbeat-lift'}),
  def('courier', 'Courier', 'card', 'Also fires on a Delivery. On a Collect, 33%: also fires.', {glyph: 'give', also: 'collector-delivery', collectChance: 33}),
  def('wellspring', 'Wellspring', 'card', 'Fires 3 times on each Overfill.', {glyph: 'well', also: 'natural-overfill', times: 3}),
  def('flare', 'Sunlit', 'card', 'Also fires on a Flare Collect and each Flare Pulse.', {glyph: 'flash', also: 'flash-pickup', flarePulse: true}),
  def('mirror', 'Mirror', 'card', 'Fires when the card on its left fires.', {glyph: 'mirror'}),
  def('brimful', 'Brimful', 'card', 'Each Spark above the Meter becomes 2 Stored Sparks.', {glyph: 'brim', storedPerSpill: 2}),
  def('whetted', 'Whetted', 'card', '+2 uses each flight.', {glyph: 'whet', uses: 2}),
  // Standalone
  def('hollow', 'Hollow', 'standalone', 'Empty slot: +2 Sparks on each Collect.', {glyph: 'hollow', bonus: 2}),
  def('hearth', 'Hearth', 'standalone', '+10 max Sparks.', {glyph: 'hearth', capacity: 10}),
  def('lantern', 'Lantern', 'standalone', '+25% Luminance.', {glyph: 'lantern', percent: 25}),
  def('long-cord', 'Long Cord', 'standalone', 'Collector reach +30%.', {glyph: 'cord', reach: 1.3}),
  def('bell', 'Bell', 'standalone', 'A Pulse every 6 seconds.', {glyph: 'bell', every: 6}),
  def('lodestone', 'Lodestone', 'standalone', 'Cards on both sides: +1 Spark each firing.', {glyph: 'lode', bonus: 1}),
  def('ember-bed', 'Ember Bed', 'standalone', 'Finish: +5 Stored Sparks, +2 per empty slot.', {glyph: 'bed', stored: 5, perEmpty: 2}),
  def('cinder', 'Cinder', 'standalone', 'Lift costs 1 less Spark.', {glyph: 'cinder'}),
  // Chest gifts: permanent like the 18 above, but only a chest writes them (never the Scribe's offer). They were run-long finds
  // stored loose in the run (run.treasureGifts); the numbers are unchanged. All standalone: they work on any slot.
  def('far-lens', 'Far Lens', 'standalone', 'Luminance reaches 15% farther.', {glyph: 'far-lens', chest: true, gift: 'farLens', sight: 1.15}),
  def('quick-lens', 'Quick Lens', 'standalone', 'Companion recharge 15% shorter.', {glyph: 'quick-lens', chest: true, gift: 'quickLens', recovery: 0.85}),
  def('mending-wick', 'Mending Wick', 'standalone', 'Recover 3 extra Sparks after each clear.', {glyph: 'mending-wick', chest: true, gift: 'wick', recoverPoints: 10}),
  def('toll-stamp', 'Toll Stamp', 'standalone', 'Clear with 3 body pickups: +3 Stored Sparks.', {glyph: 'toll-stamp', chest: true, gift: 'toll', bodyPickups: 3, stored: 3}),
  def('lamplighter-seal', 'Lamplighter’s Seal', 'standalone', 'Clear holding 12 Sparks: +3 Stored Sparks.', {glyph: 'lamplighter-seal', chest: true, gift: 'seal', holding: 12, stored: 3}),
].map(item => [item.id, item])));

/** The Scribe's list: the 18 permanent Inscriptions (chest gifts are not in it). */
export const INSCRIPTION_IDS = Object.freeze(Object.keys(INSCRIPTIONS).filter(id => !INSCRIPTIONS[id].chest));
/** Chest-only permanent Inscriptions, by id, and by the old run.treasureGifts key (for old saves). */
export const CHEST_INSCRIPTION_IDS = Object.freeze(Object.keys(INSCRIPTIONS).filter(id => INSCRIPTIONS[id].chest));
export const CHEST_INSCRIPTION_BY_GIFT = Object.freeze(Object.fromEntries(CHEST_INSCRIPTION_IDS.map(id => [INSCRIPTIONS[id].gift, id])));

/** Glyph family: a chisel mark for card-modifying, a rune ring for standalone. */
export const INSCRIPTION_FAMILIES = Object.freeze({card: 'Chisel', standalone: 'Rune'});
/** Any Inscription: the Scribe's 18 or a chest gift. */
export const getInscription = id => (typeof id === 'string' && Object.hasOwn(INSCRIPTIONS, id)) ? INSCRIPTIONS[id] : null;
export const getPermanentInscription = getInscription;

/** Source of slot Inscriptions: a run (`slotInscriptions`) or a card execution (`inscriptions`). */
const listOf = source => source?.inscriptions || source?.slotInscriptions || null;
export const slotInscriptionId = (source, slot) => { const entry = listOf(source)?.[slot]; return entry && getInscription(entry.id) ? entry.id : null; };
export const slotInscription = (source, slot) => getInscription(slotInscriptionId(source, slot));
/** Slots (indexes) that carry this Inscription. */
export const slotsWith = (source, id) => (listOf(source) || []).map((entry, slot) => entry?.id === id ? slot : -1).filter(slot => slot >= 0);
export const countInscription = (source, id) => slotsWith(source, id).length;

const cleanPermanent = entry => getPermanentInscription(entry?.id) ? {id: entry.id} : null;
/** One slot entry, sanitised: `{id}` of a known Inscription, else null. Old saves held temporary entries (`{id, temporary: true, covers}`):
 * the temporary one is dropped and the permanent Inscription it covered is restored to the slot. */
export function cleanSlotEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.temporary) return cleanPermanent(entry.covers);
  return cleanPermanent(entry);
}
/** Keep `run.slotInscriptions` aligned with `run.mountedCards`: same length, every entry null, `{id}` or a temporary entry. */
export function cleanSlotInscriptions(run) {
  if (!run || typeof run !== 'object') return [];
  const slots = Array.isArray(run.mountedCards) ? run.mountedCards.length : Math.max(0, Number(run.cardSlots) || 0);
  const old = Array.isArray(run.slotInscriptions) ? run.slotInscriptions : [];
  run.slotInscriptions = Array.from({length: slots}, (_, i) => cleanSlotEntry(old[i]));
  return run.slotInscriptions;
}
/** The Inscription written on a slot (id), or null. */
export const permanentOnSlot = (source, slot) => { const entry = listOf(source)?.[slot]; return cleanPermanent(entry)?.id || null; };

/** Write (or replace) the Inscription on a slot. Returns the replaced id (or null), or false when refused. */
export function writeInscription(run, slot, id) {
  if (!run || !getPermanentInscription(id) || !Number.isInteger(slot) || slot < 0) return false;
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

/** An Inscription is written on some slot: a chest does not offer it twice. */
export const ownsInscription = (run, id) => (run?.slotInscriptions || []).some((entry, slot) => permanentOnSlot(run, slot) === id);
export const hasActiveInscription = ownsInscription;

/** Old saves: the five chest gifts (run.treasureGifts farLens, quickLens, wick, toll, seal) move onto the first slot with no permanent
 * Inscription (none bare: the first slot, replacing; no slots: dropped). Nothing stays in the old fields. Returns [{id, slot}] moved. */
export function migrateChestGifts(run) {
  const gifts = run?.treasureGifts;
  if (!gifts || typeof gifts !== 'object') return [];
  const found = Object.entries(CHEST_INSCRIPTION_BY_GIFT).filter(([key]) => Number(gifts[key]) > 0).map(([, id]) => id);
  for (const key of Object.keys(CHEST_INSCRIPTION_BY_GIFT)) delete gifts[key];
  if (!found.length) return [];
  const moved = [];
  for (const id of found) {
    const list = cleanSlotInscriptions(run);
    if (!list.length || ownsInscription(run, id)) continue;
    let slot = list.findIndex((entry, i) => !permanentOnSlot(run, i));
    if (slot < 0) slot = 0;
    writeInscription(run, slot, id);
    moved.push({id, slot});
  }
  return moved;
}

/** Deterministic pick: `random` is any () => [0,1) function. Two offers (the Scribe's count), never one already written on a slot
 * unless fewer than two others remain (then the written ones fill up the two). */
export function offerInscriptions(run, random = Math.random, count = 2) {
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
/** The neighbouring slots that carry a Lodestone (for the in-flight strip's bar flash). */
export const lodestoneSlots = (source, slot) => [slot - 1, slot + 1].filter(s => slotInscriptionId(source, s) === 'lodestone');
export const lodestoneBonus = (source, slot) => [slot - 1, slot + 1].reduce((sum, s) => sum + (slotInscriptionId(source, s) === 'lodestone' ? INSCRIPTIONS.lodestone.bonus : 0), 0);
export const capacityBonusSparks = source => countInscription(source, 'hearth') * INSCRIPTIONS.hearth.capacity;
export const emberBedStored = (source, cards) => { const beds = countInscription(source, 'ember-bed'); if (!beds) return 0; const empty = (cards || []).filter(card => !card).length; return beds * (INSCRIPTIONS['ember-bed'].stored + INSCRIPTIONS['ember-bed'].perEmpty * empty); };

/** The slot Inscriptions of a run, aligned to `cards` ([{id}|null]), or null when no slot carries one. */
export function slotInscriptionList(run, cards = run?.mountedCards || []) {
  const src = run?.slotInscriptions;
  const rule = entry => entry?.id && getPermanentInscription(entry.id) ? {id: entry.id} : null;
  if (!Array.isArray(src) || !src.some(rule)) return null;
  return Array.from({length: cards.length}, (_, i) => rule(src[i]));
}
/** The raw entry on a slot ({id} or null). */
export const slotEntry = (source, slot) => { const entry = listOf(source)?.[slot]; return entry && getInscription(entry.id) ? entry : null; };
/** What the read-only previews hand to previewCardRow / hasCardRowEvent: the cards alone (as before), or cards + the run's Inscriptions, exactly as a flight builds its execution. */
export function rowSnapshot(run, cards = run?.mountedCards || []) {
  const inscriptions = slotInscriptionList(run, cards);
  return inscriptions ? {cards, inscriptions} : cards;
}
