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
  def('flare', 'Sunlit', 'card', 'The card here also fires when you Collect a Flare.', {glyph: 'flash', also: 'flash-pickup'}),
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
  // Chest gifts: permanent like the 18 above, but only a chest writes them (never the Scribe's offer). They were run-long finds
  // stored loose in the run (run.treasureGifts); the numbers are unchanged. All standalone: they work on any slot.
  def('far-lens', 'Far Lens', 'standalone', 'Luminance reaches 15% farther.', {glyph: 'far-lens', chest: true, gift: 'farLens', sight: 1.15}),
  def('quick-lens', 'Quick Lens', 'standalone', 'Companion recharge takes 15% less time.', {glyph: 'quick-lens', chest: true, gift: 'quickLens', recovery: 0.85}),
  def('mending-wick', 'Mending Wick', 'standalone', 'Recover 3 extra Sparks after each clear.', {glyph: 'mending-wick', chest: true, gift: 'wick', recoverPoints: 10}),
  def('toll-stamp', 'Toll Stamp', 'standalone', 'Each clear with 3 body pickups: +3 Stored Sparks.', {glyph: 'toll-stamp', chest: true, gift: 'toll', bodyPickups: 3, stored: 3}),
  def('lamplighter-seal', 'Lamplighter’s Seal', 'standalone', 'Each clear holding 12 Sparks: +3 Stored Sparks.', {glyph: 'lamplighter-seal', chest: true, gift: 'seal', holding: 12, stored: 3}),
].map(item => [item.id, item])));

/** The Scribe's list: the 18 permanent Inscriptions (chest gifts are not in it). */
export const INSCRIPTION_IDS = Object.freeze(Object.keys(INSCRIPTIONS).filter(id => !INSCRIPTIONS[id].chest));
/** Chest-only permanent Inscriptions, by id, and by the old run.treasureGifts key (for old saves). */
export const CHEST_INSCRIPTION_IDS = Object.freeze(Object.keys(INSCRIPTIONS).filter(id => INSCRIPTIONS[id].chest));
export const CHEST_INSCRIPTION_BY_GIFT = Object.freeze(Object.fromEntries(CHEST_INSCRIPTION_IDS.map(id => [INSCRIPTIONS[id].gift, id])));

// TEMPORARY Inscriptions (docs/inscriptions.md, "Events and objectives"): effects earned from events and optional objectives. They are
// written on a slot like any Inscription, but they are not in the Scribe's list (INSCRIPTION_IDS stays the 18 permanent ones).
//   flights N       lasts N cleared flights (a fall never spends one); at zero it ends and the permanent Inscription it covered returns.
//   until 'fulfilled'  an OATH: stays until its condition is met by a cleared flight.
// boon / favor name the flight-engine modifier it drives (dist/flight-boons.mjs); oath names the settlement rule.
const tdef = (id, name, text, extra = {}) => Object.freeze({id, name, kind: 'temporary', temporary: true, text, glyph: id, ...extra});
export const TEMPORARY_FLIGHTS = 3;
export const TEMPORARY_INSCRIPTIONS = Object.freeze(Object.fromEntries([
  tdef('quick-recall', 'Quick Recall', 'Companion recovery 20% faster.', {boon: 'wild-circuit', flights: 3}),
  tdef('dawnlight', 'Dawnlight', '+25% opening Luminance for the first 15 seconds of each flight.', {boon: 'flash-relay', flights: 3}),
  tdef('glidepath', 'Glidepath', 'Save up to 9 Sparks on your first 3 Lifts each flight.', {boon: 'long-glide', flights: 3}),
  tdef('edgeward', 'Edgeward', 'One collision ward per flight.', {boon: 'edgeweaver', flights: 3}),
  tdef('nightveil', 'Nightveil', 'Black Holes drain 25% fewer Sparks.', {boon: 'night-sail', flights: 3}),
  tdef('wayglass', 'Wayglass', 'Preview the opening 2.5 seconds before takeoff.', {boon: 'wayfinder', flights: 3}),
  tdef('risen-star', 'Risen Star', 'The first 3 fuel pickups each flight restore +2 missing Sparks.', {boon: 'constellation', flights: 3}),
  tdef('mending', 'Mending', 'Below 6 Sparks, restore up to 6 missing Sparks once per flight.', {boon: 'spark-trail', flights: 3}),
  tdef('reserve-wick', 'Reserve Wick', 'Below 6 Sparks, restore 9 Sparks once per flight.', {favor: 'wick', flights: 3}),
  tdef('hollow-feather', 'Hollow Feather', 'Your first two paid Lifts are free in each flight.', {favor: 'feather', flights: 3}),
  tdef('star-chart', 'Star Chart', 'See 35% farther.', {favor: 'lens', flights: 3}),
  tdef('chime', 'Companion Chime', 'Companion cooldown is 20% shorter.', {favor: 'haste', flights: 3}),
  tdef('lead-seal', 'Lead Seal', 'Your first six paid Lifts cost 1 extra Spark.', {favor: 'burden', flights: 1, endsOnStart: true}),
  // Oaths: until fulfilled by a cleared flight.
  tdef('night-ledger', 'Night’s Ledger', 'Fly with 55% Luminance. Clear a flight to double the Stored Sparks packed there, up to +20.', {oath: 'pact', pact: 'night-ledger', until: 'fulfilled'}),
  tdef('closed-eye', 'The Closed Eye', 'Sight stays at 38% of starting Luminance and card light is blocked; Flares and passage lights still work. Clear a flight to triple every Stored Spark packed there.', {oath: 'pact', pact: 'blind-pilgrim', until: 'fulfilled'}),
  tdef('silent-orbit', 'The Silent Orbit', 'Collector reach −45%. Clear a flight to double the Stored Sparks packed there, up to +20.', {oath: 'pact', pact: 'silent-orbit', until: 'fulfilled'}),
  tdef('pilgrim-vow', 'Pilgrim’s Vow', 'Clear a flight with 4 body Spark pickups for 8 Stored Sparks.', {oath: 'vow', until: 'fulfilled'}),
  tdef('sealed-purse', 'Sealed Purse', 'Clear a flight holding 12 Sparks for Stored Sparks.', {oath: 'seal', until: 'fulfilled'}),
].map(item => [item.id, item])));
export const TEMPORARY_IDS = Object.freeze(Object.keys(TEMPORARY_INSCRIPTIONS));
export const TEMPORARY_BY_BOON = Object.freeze(Object.fromEntries(Object.values(TEMPORARY_INSCRIPTIONS).filter(t => t.boon).map(t => [t.boon, t.id])));
export const TEMPORARY_BY_FAVOR = Object.freeze(Object.fromEntries(Object.values(TEMPORARY_INSCRIPTIONS).filter(t => t.favor).map(t => [t.favor, t.id])));
export const getTemporary = id => (typeof id === 'string' && Object.hasOwn(TEMPORARY_INSCRIPTIONS, id)) ? TEMPORARY_INSCRIPTIONS[id] : null;
/** Glyph family: a chisel mark for card-modifying, a rune ring for standalone. */
export const INSCRIPTION_FAMILIES = Object.freeze({card: 'Chisel', standalone: 'Rune', temporary: 'Ring'});
/** Any Inscription: a permanent one (the Scribe's 18 or a chest gift) or a temporary one. */
export const getInscription = id => (typeof id === 'string' && Object.hasOwn(INSCRIPTIONS, id)) ? INSCRIPTIONS[id] : getTemporary(id);
/** The permanent Inscription only (what the rules engine acts on). */
export const getPermanentInscription = id => (typeof id === 'string' && Object.hasOwn(INSCRIPTIONS, id)) ? INSCRIPTIONS[id] : null;

/** Source of slot Inscriptions: a run (`slotInscriptions`) or a card execution (`inscriptions`). */
const listOf = source => source?.inscriptions || source?.slotInscriptions || null;
export const slotInscriptionId = (source, slot) => { const entry = listOf(source)?.[slot]; return entry && getInscription(entry.id) ? entry.id : null; };
export const slotInscription = (source, slot) => getInscription(slotInscriptionId(source, slot));
/** Slots (indexes) that carry this Inscription. */
export const slotsWith = (source, id) => (listOf(source) || []).map((entry, slot) => entry?.id === id ? slot : -1).filter(slot => slot >= 0);
export const countInscription = (source, id) => slotsWith(source, id).length;

const cleanPermanent = entry => getPermanentInscription(entry?.id) ? {id: entry.id} : null;
/** One slot entry, sanitised. Permanent: `{id}`. Temporary: `{id, temporary: true, flightsLeft | until: 'fulfilled', covers: {id} | null}`;
 * `covers` is the permanent Inscription it hides (suspended) until the temporary one ends. A spent or unknown temporary one is gone. */
export function cleanSlotEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const temp = getTemporary(entry.id);
  if (!temp) return entry.temporary ? cleanPermanent(entry.covers) : cleanPermanent(entry);
  const covers = cleanPermanent(entry.covers);
  if (temp.until) return {id: temp.id, temporary: true, until: temp.until, covers};
  const left = Math.min(9, Math.floor(Number(entry.flightsLeft ?? temp.flights)));
  return left > 0 ? {id: temp.id, temporary: true, flightsLeft: left, covers} : covers;
}
/** Keep `run.slotInscriptions` aligned with `run.mountedCards`: same length, every entry null, `{id}` or a temporary entry. */
export function cleanSlotInscriptions(run) {
  if (!run || typeof run !== 'object') return [];
  const slots = Array.isArray(run.mountedCards) ? run.mountedCards.length : Math.max(0, Number(run.cardSlots) || 0);
  const old = Array.isArray(run.slotInscriptions) ? run.slotInscriptions : [];
  run.slotInscriptions = Array.from({length: slots}, (_, i) => cleanSlotEntry(old[i]));
  return run.slotInscriptions;
}
/** The permanent Inscription of a slot even when a temporary one covers it (the one the rules engine would use without the cover). */
export const permanentOnSlot = (source, slot) => { const entry = listOf(source)?.[slot]; return entry?.temporary ? (cleanPermanent(entry.covers)?.id || null) : (cleanPermanent(entry)?.id || null); };
/** The temporary entry on a slot (or null). */
export const temporaryOnSlot = (source, slot) => { const entry = listOf(source)?.[slot]; return entry?.temporary && getTemporary(entry.id) ? entry : null; };

/** Write (or replace) the permanent Inscription on a slot. Returns the replaced id (or null), or false when refused.
 * Under a temporary Inscription it is written beneath it (the temporary one keeps showing and hands it back when it ends). */
export function writeInscription(run, slot, id) {
  if (!run || !getPermanentInscription(id) || !Number.isInteger(slot) || slot < 0) return false;
  const list = cleanSlotInscriptions(run);
  if (slot >= list.length) return false;
  const here = list[slot];
  if (here?.temporary) { const replaced = here.covers?.id || null; list[slot] = {...here, covers: {id}}; return replaced; }
  const replaced = here?.id || null;
  list[slot] = {id};
  return replaced;
}
export function clearInscription(run, slot) {
  const list = cleanSlotInscriptions(run);
  if (!Number.isInteger(slot) || slot < 0 || slot >= list.length) return false;
  list[slot] = list[slot]?.temporary ? {...list[slot], covers: null} : null;
  return true;
}

/** A permanent Inscription is written on some slot (even one a temporary Inscription covers): a chest does not offer it twice. */
export const ownsInscription = (run, id) => (run?.slotInscriptions || []).some((entry, slot) => permanentOnSlot(run, slot) === id);
/** Written and in force (not covered by a temporary Inscription): the rules engine and the run modifiers read this. */
export const hasActiveInscription = (run, id) => (run?.slotInscriptions || []).some(entry => entry && !entry.temporary && entry.id === id);

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

/** The slot Inscriptions of a run, aligned to `cards` ([{id}|null]), or null when no slot carries one. Temporary Inscriptions act
 * through the run modifiers, not the row walker, and they suspend what they cover: their slots read as bare here. */
export function slotInscriptionList(run, cards = run?.mountedCards || []) {
  const src = run?.slotInscriptions;
  const rule = entry => entry?.id && !entry.temporary && getPermanentInscription(entry.id) ? {id: entry.id} : null;
  if (!Array.isArray(src) || !src.some(rule)) return null;
  return Array.from({length: cards.length}, (_, i) => rule(src[i]));
}
/** The raw entry on a slot ({id}, a temporary entry, or null). */
export const slotEntry = (source, slot) => { const entry = listOf(source)?.[slot]; return entry && getInscription(entry.id) ? entry : null; };
/** What the read-only previews hand to previewCardRow / hasCardRowEvent: the cards alone (as before), or cards + the run's Inscriptions, exactly as a flight builds its execution. */
export function rowSnapshot(run, cards = run?.mountedCards || []) {
  const inscriptions = slotInscriptionList(run, cards);
  return inscriptions ? {cards, inscriptions} : cards;
}
