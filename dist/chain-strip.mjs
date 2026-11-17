// In-flight Chain strip (owner, 2026-11-18): one small SOLID shape per Chain slot at the top centre. Colour is the only
// channel: no picture, no text, no number. Nothing here is read during play.
//   active card   muted rarity colour; snaps to white when it fires and eases back
//   passive card  steady teal, never flashes
//   spent card    dim hollow outline;  empty slot  faint hollow outline
//   Inscription   2 px bar under the shape (dashed = temporary); flashes white when the Inscription itself acts
// This file is the pure part (no DOM): slot colours, the firing marks the flight raises, and the state machine the view reads.
import {SKILL_CARDS} from './skill-cards.mjs?v=guide-clarity-1';
import {getInscription} from './inscriptions.mjs?v=guide-clarity-1';

export const STRIP = Object.freeze({flashMs: 450, reducedFlashMs: 200, doubleMs: 560, idleMs: 3000, fadeMs: 600, idleOpacity: 0.12, maxMarks: 32});
export const STRIP_COLORS = Object.freeze({
  common: '#5d7a58', rare: '#4f7f96', legendary: '#a07c3c',   // the kit's rarity tones (card-ui.css), darkened to stay quiet
  passive: '#2f9e92', white: '#ffffff', spent: '#6f7a70', empty: '#3a4440', bar: '#f0c86a'});
export const baseColor = slot => !slot || slot.state === 'empty' ? STRIP_COLORS.empty : slot.state === 'spent' ? STRIP_COLORS.spent
  : slot.state === 'passive' ? STRIP_COLORS.passive : STRIP_COLORS[slot.rarity] || STRIP_COLORS.common;

const EMPTY_MARKS = Object.freeze([]);
export const emptyMarks = () => EMPTY_MARKS;

/** What the Chain is made of, built once per flight and again after a paused Deck edit (never per frame). */
export function chainView(runtime) {
  const cards = runtime?.cards || [], ins = runtime?.inscriptions || [];
  const length = Math.max(cards.length, ins.length);
  if (!runtime || !length) return null;
  const slots = [];
  for (let i = 0; i < length; i++) {
    const card = cards[i], def = card && SKILL_CARDS[card.cardId], entry = ins[i];
    slots.push(Object.freeze({
      instanceId: card?.instanceId ?? null, filled: !!def, rarity: def?.rarity || 'common',
      passive: !!def && (def.passive === true || def.kind === 'capacity'),
      bar: !entry ? 'none' : entry.temporary ? 'temp' : 'perm'}));
  }
  return Object.freeze({slots: Object.freeze(slots)});
}

/** The marks one resolved row event raises, from its receipt: {slot, kind: fire | boost | bar, double}. */
export function collectReceiptFires(receipt, inscriptions) {
  const marks = [], kind = receipt?.event?.kind;
  for (const step of receipt?.steps || []) {
    if (!step.success) continue;
    if (step.operation === 'inscription') { marks.push({slot: step.slot, kind: 'bar'}); continue; }
    marks.push({slot: step.slot, kind: step.operation === 'multiply' ? 'boost' : 'fire', double: step.repeatIndex > 0 || step.pass > 1});
    const credit = Number.isInteger(step.creditSlot) ? step.creditSlot : step.slot, id = inscriptions?.[credit]?.id;
    if (id && (id === 'twin-mark' && step.repeatIndex > 0 || id === 'gilded' || getInscription(id)?.also === kind)) marks.push({slot: credit, kind: 'bar'});
  }
  return marks;
}

/** The marks the card engine's own log entries raise (Timers, Pulses, Flares, Boost-style hits, Long Fuse). */
const ENGINE_FIRES = new Set(['fired', 'hit', 'pulse', 'real-pulse', 'turn', 'flash', 'homing', 'whet', 'keep', 'tithe', 'fuse', 'world-pulse', 'gain']);
export function engineFire(entry) {
  if (!entry || !ENGINE_FIRES.has(entry.k) || !Number.isInteger(entry.slot) || entry.slot < 0) return null;
  return {slot: entry.slot, kind: 'fire', double: entry.k === 'hit' && entry.times > 1};
}

/** Add marks to the flight's bounded log (a new frozen array) and tell the listener at once, so a flash is not held up by the HUD's 10 Hz update. */
export function appendFires(e, marks) {
  if (!marks?.length) return;
  e.cardFireSeq = e.cardFireSeq || 0;
  const added = marks.map(mark => Object.freeze({...mark, seq: ++e.cardFireSeq}));
  e.cardFires = Object.freeze([...(e.cardFires || []), ...added].slice(-STRIP.maxMarks));
  e.cardFireListener?.(added);
}

/** The state machine. `sync(snapshot, now)` / `fire(marks, now)` mutate stable slot records; the view compares serials. */
export function createChainStrip({reducedMotion = false} = {}) {
  const slots = [];
  let layout = null, lastSeq = 0, awakeAt = null, faded = false, version = 0, wasPaused = false;
  const wake = now => { awakeAt = now; };
  function applyMarks(marks, now) {
    let any = false;
    for (const mark of marks) {
      if (!(mark.seq > lastSeq)) continue;
      lastSeq = mark.seq;
      const slot = slots[mark.slot];
      if (!slot) continue;
      if (mark.kind === 'bar') { if (slot.bar !== 'none') { slot.barSerial++; any = true; } continue; }
      if (slot.state !== 'active') continue;
      slot.fireSerial++; slot.double = !!mark.double; any = true;
    }
    if (any) { wake(now); faded = false; }
    return any;
  }
  return {
    slots, reducedMotion,
    get faded() { return faded; },
    get version() { return version; },
    get visible() { return !!layout; },
    /** Marks pushed by the flight the moment they happen. */
    fire(marks, now) { return applyMarks(marks, now); },
    /** Per HUD update. Returns true when the shapes' colours or structure changed (a flash is a serial, not a change). */
    sync(snapshot, now) {
      let changed = false;
      if (awakeAt === null) wake(now);
      const next = snapshot?.cardChain || null;
      if (next !== layout) {
        layout = next; changed = true;
        const wanted = next ? next.slots.length : 0;
        while (slots.length < wanted) slots.push({state: 'empty', rarity: 'common', bar: 'none', fireSerial: 0, barSerial: 0, double: false});
        slots.length = wanted;
      }
      if (layout) for (let i = 0; i < slots.length; i++) {
        const info = layout.slots[i], slot = slots[i], charges = info.instanceId == null ? undefined : snapshot.cardCharges?.[info.instanceId];
        const state = !info.filled ? 'empty' : info.passive ? 'passive' : charges !== undefined && charges <= 0 ? 'spent' : 'active';
        if (slot.state !== state || slot.rarity !== info.rarity || slot.bar !== info.bar) { slot.state = state; slot.rarity = info.rarity; slot.bar = info.bar; changed = true; }
      }
      const log = snapshot?.cardFires;
      if (log && log.length) {
        if (log[log.length - 1].seq < lastSeq) lastSeq = 0; // a new flight restarted the log
        applyMarks(log, now);
      }
      if (snapshot?.paused || snapshot?.finished) { wake(now); faded = false; wasPaused = true; }
      else if (wasPaused) { wasPaused = false; wake(now); faded = false; } // play resumes: full for 3 s again
      else if (!faded && now - awakeAt >= STRIP.idleMs) faded = true;
      if (changed) version++;
      return changed;
    }
  };
}
