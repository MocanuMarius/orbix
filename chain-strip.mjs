// In-flight Chain strip (owner, 2026-11-18): the player's MOUNTED cards as tiny hollow frames in the top row of the HUD, centred.
// Colour, shape and motion only: no picture, no text, no number. Nothing here is read during play.
//   active card   10x14 hollow frame in a muted rarity colour; turns solid white for 0.7 s when it fires, with an echo frame
//   passive card  steady teal frame, never flashes;  spent card  dim frame;  empty slot  not drawn at all
//   Inscription   2 px bar under the frame; blinks white when it acts on a card that cannot flash
// Flashes are SEQUENTIAL (one at a time, always 0.7 s) with at most ONE pending flash per card (debounce); see createChainStrip.
// This file is the pure part (no DOM): colours, the firing marks the flight raises, and the state machine the view reads.
import {SKILL_CARDS} from './skill-cards.mjs?v=lift-1';
import {getInscription} from './inscriptions.mjs?v=lift-1';

export const STRIP = Object.freeze({flashMs: 700, idleMs: 3000, fadeMs: 600, idleOpacity: 0.12, maxMarks: 32, frameW: 10, frameH: 14, gap: 2, padX: 12, minTouchH: 40, doubleEcho: false});
export const STRIP_COLORS = Object.freeze({
  common: '#b9cfb0', rare: '#abcedb', legendary: '#e6c88f',   // the kit's rarity tones (card-ui.css)
  passive: '#35b3a4', white: '#ffffff', spent: '#7a8478', edge: '#0b1210', bar: '#f0c86a'});
export const baseColor = slot => slot?.state === 'spent' ? STRIP_COLORS.spent : slot?.state === 'passive' ? STRIP_COLORS.passive : STRIP_COLORS[slot?.rarity] || STRIP_COLORS.common;
/** Centred layout of n mounted cards: total width of the frames and gaps, and the left edge of each frame measured from the strip's centre. */
export function stripLayout(n, {frameW, gap} = STRIP) {
  if (!(n > 0)) return {width: 0, lefts: []};
  const width = n * frameW + (n - 1) * gap;
  return {width, lefts: Array.from({length: n}, (_, i) => i * (frameW + gap) - width / 2)};
}

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
      bar: entry ? 'perm' : 'none'}));
  }
  return Object.freeze({slots: Object.freeze(slots)});
}

const credit0 = step => Number.isInteger(step.creditSlot) ? step.creditSlot : step.slot;
/** The marks one resolved row event raises, from its receipt: {slot, kind: fire | boost | bar, double}. */
export function collectReceiptFires(receipt, inscriptions) {
  const marks = [], kind = receipt?.event?.kind;
  for (const step of receipt?.steps || []) {
    if (!step.success) continue;
    if (step.operation === 'inscription') { marks.push({slot: step.slot, kind: 'bar'}); continue; }
    if (step.mirrored) marks.push({slot: credit0(step), kind: 'bar'});
    for (const s of step.lodestoneSlots || []) marks.push({slot: s, kind: 'bar'});
    marks.push({slot: step.slot, kind: step.operation === 'multiply' ? 'boost' : 'fire', double: step.repeatIndex > 0 || step.pass > 1});
    const credit = Number.isInteger(step.creditSlot) ? step.creditSlot : step.slot, id = inscriptions?.[credit]?.id;
    if (id && (id === 'twin-mark' && step.repeatIndex > 0 || id === 'gilded' || getInscription(id)?.also === kind)) marks.push({slot: credit, kind: 'bar'});
  }
  return marks;
}

/** The marks the card engine's own log entries raise (Timers, Pulses, Flares, Boost-style hits, Long Fuse). */
const ENGINE_FIRES = new Set(['fired', 'hit', 'pulse', 'real-pulse', 'turn', 'flash', 'homing', 'whet', 'keep', 'tithe', 'fuse', 'world-pulse', 'gain']);
/** Bar flashes the card engine's log raises: a Lodestone beside a card that gained Sparks. */
export function engineBars(entry) {
  return entry?.k === 'gain' && entry.lodestoneSlots?.length ? entry.lodestoneSlots.map(slot => ({slot, kind: 'bar'})) : null;
}
export function engineFire(entry) {
  if (!entry || !ENGINE_FIRES.has(entry.k) || !Number.isInteger(entry.slot) || entry.slot < 0) return null;
  return {slot: entry.slot, kind: 'fire', double: entry.k === 'hit' && entry.times > 1};
}

const EMPTY_MARKS = Object.freeze([]);
export const emptyMarks = () => EMPTY_MARKS;

/** Add marks to the flight's bounded log (a new frozen array) and tell the listener at once, so a flash is not held up by the HUD's 10 Hz update. */
export function appendFires(e, marks) {
  if (!marks?.length) return;
  e.cardFireSeq = e.cardFireSeq || 0;
  const added = marks.map(mark => Object.freeze({...mark, seq: ++e.cardFireSeq}));
  e.cardFires = Object.freeze([...(e.cardFires || []), ...added].slice(-STRIP.maxMarks));
  e.cardFireListener?.(added);
}

/** The state machine. `sync(snapshot, now)` / `fire(marks, now)` / `advance(now)` mutate stable cell records; the view compares serials.
 * Only MOUNTED cards are cells (an empty slot has no cell). Activation queue rule:
 *  - every flash lasts exactly STRIP.flashMs (0.7 s), never shortened;
 *  - flashes play strictly one after another, the next starting the moment the previous one ends;
 *  - at most ONE pending flash per card: a firing of a card that is already waiting or flashing is dropped;
 *  - pending flashes play in the order their cards first became pending, so the queue never holds more than the mounted cards;
 *  - Passive and spent cards never enter the queue; the idle fade counts from the moment the queue is empty. */
export function createChainStrip({reducedMotion = false} = {}) {
  const cells = [], bySlot = [], pending = [];
  let layout = null, lastSeq = 0, awakeAt = null, faded = false, version = 0, wasPaused = false, playing = null, playEnd = 0, flashSerial = 0;
  const wake = now => { awakeAt = now; faded = false; };
  const queueEmpty = () => !playing && !pending.length;
  function enqueue(cell) {
    if (cell.state !== 'active' || cell.queued) return false;
    cell.queued = true; pending.push(cell); return true;
  }
  /** Run the queue up to `now`: finish an elapsed flash and start the next one at the moment the last ended. */
  function advance(now) {
    for (let guard = 0; guard < 64; guard++) {
      let startAt = now;
      if (playing) {
        if (now < playEnd) return;
        playing.queued = false; playing.lit = false; startAt = playEnd; playing = null;
        if (!pending.length) { awakeAt = playEnd; return; }
      }
      if (!pending.length) return;
      const cell = pending.shift();
      playing = cell; playEnd = startAt + STRIP.flashMs; cell.lit = true; cell.fireSerial = ++flashSerial; cell.startedAt = startAt;
    }
  }
  function applyMarks(marks, now) {
    let any = false;
    for (const mark of marks) {
      if (!(mark.seq > lastSeq)) continue;
      lastSeq = mark.seq;
      const cell = bySlot[mark.slot];
      if (!cell) continue; // an empty (inscribed) slot has nothing to show
      if (cell.state === 'active') { if (enqueue(cell)) any = true; }
      else if (mark.kind === 'bar' && cell.bar !== 'none') { cell.barSerial++; any = true; } // a passive card's Inscription still blinks its bar
    }
    if (any) wake(now);
    return any;
  }
  return {
    cells, reducedMotion,
    get faded() { return faded; },
    get version() { return version; },
    get visible() { return cells.length > 0; },
    get playing() { return playing; },
    get pendingCount() { return pending.length; },
    get pending() { return pending; },
    get nextDueAt() { return playing ? playEnd : null; },
    advance,
    /** Marks pushed by the flight the moment they happen. */
    fire(marks, now) { const any = applyMarks(marks, now); advance(now); return any; },
    /** Per HUD update. Returns true when the frames' colours or structure changed (a flash is a serial, not a change). */
    sync(snapshot, now) {
      let changed = false;
      if (awakeAt === null) wake(now);
      const next = snapshot?.cardChain || null;
      if (next !== layout) {
        layout = next; changed = true;
        const keep = new Map(cells.map(c => [c.instanceId, c]));
        cells.length = 0; bySlot.length = 0;
        if (next) for (let i = 0; i < next.slots.length; i++) {
          const info = next.slots[i];
          if (!info.filled) continue;
          const cell = keep.get(info.instanceId) || {slot: i, instanceId: info.instanceId, state: 'active', rarity: 'common', bar: 'none', fireSerial: 0, barSerial: 0, queued: false, lit: false, startedAt: 0};
          keep.delete(info.instanceId); cell.slot = i; cell.instanceId = info.instanceId;
          cells.push(cell); bySlot[i] = cell;
        }
        for (const gone of keep.values()) { // a card that left the Chain takes its flash with it
          const at = pending.indexOf(gone); if (at >= 0) pending.splice(at, 1);
          if (playing === gone) { playing = null; if (!pending.length) awakeAt = now; }
          gone.queued = false; gone.lit = false;
        }
      }
      for (const cell of cells) {
        const info = layout.slots[cell.slot], charges = info.instanceId == null ? undefined : snapshot.cardCharges?.[info.instanceId];
        const state = info.passive ? 'passive' : charges !== undefined && charges <= 0 ? 'spent' : 'active';
        if (cell.state !== state || cell.rarity !== info.rarity || cell.bar !== info.bar) { cell.state = state; cell.rarity = info.rarity; cell.bar = info.bar; changed = true; }
        if (state !== 'active' && cell.queued && playing !== cell) { const at = pending.indexOf(cell); if (at >= 0) pending.splice(at, 1); cell.queued = false; }
      }
      const log = snapshot?.cardFires;
      if (log && log.length) {
        if (log[log.length - 1].seq < lastSeq) lastSeq = 0; // a new flight restarted the log
        applyMarks(log, now);
      }
      advance(now);
      if (snapshot?.paused || snapshot?.finished) { wake(now); wasPaused = true; }
      else if (wasPaused) { wasPaused = false; wake(now); } // play resumes: full for 3 s again
      else if (!faded && queueEmpty() && now - awakeAt >= STRIP.idleMs) faded = true;
      if (changed) version++;
      return changed;
    }
  };
}
