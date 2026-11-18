// Engine rules (v1.0-engine, docs/engine-cards.md, "Rulings after the demo"). One rule engine shared by the flight
// (dist/card-engine-flight.mjs), the Deck preview (dist/ui/chain-model.mjs) and the balance simulation
// (scripts/balance/engine-sweep.mjs), so the three can never disagree. No DOM, no wall clock, no randomness: the
// caller owns the clock (flight seconds) and every event is ordered by (time, sequence), so a given seed and input
// always give the same event log.
//
// The rules, as built:
// - Player-made Triggers (a Collect, a skim, a Lift, a Flare ending, Sparks the Chain gives on a Trigger from your
//   flying, an Overfill, Pack) are heard by the whole Chain, left to right, as today.
// - Events made by a card flow to the RIGHT only (ruling 1). A card-made Pulse goes to the next card to its right
//   that waits for a Pulse (ruling 2); card-made Spark gains and Overfills go to every card to its right that waits.
// - Only a Timer sends its event back to the first Slot (ruling 1); that, and each Metronome tick, starts a Turn
//   (ruling 8). A card never answers an event it made itself in the same Turn.
// - Boosts (Any Trigger multipliers without uses) multiply each Spark gain made by cards to their left, every Turn,
//   and each gain rounds UP to whole Sparks (2026-11-17), as a firing does today (ruling 7). Stored Sparks are never boosted.
// - An engine stops when a card cannot do its job (ruling 6 of the proposal's rule 3): a gain into a full meter with
//   no Overfill hearer, a Metronome whose next card cannot act, a Long Fuse with nothing to repeat.
// - Events only move right and each Timer holds at most one pending wait, so one instant always terminates; a hard
//   safety counter still stops the engine (and warns once) if that is ever exceeded.
import {SKILL_CARDS, CARD_ECONOMY, cardAmount, getCardRowRule, hasCardRowEvent, matchesRowCondition, matchesRowShape, isInventoryOnlyCard,
  createCardExecution, resolveCardRow, getCardChargeCapacity} from './skill-cards.mjs?v=big-1';

export const ENGINE_LIMITS = Object.freeze({ deliveriesPerInstant: 400, timersPerAdvance: 5000, logEntries: 5000, turnLog: 5000 });
/** Player-made Triggers the engine cards listen to (not CARD_ROW_EVENTS: the ordinary walker never sees them). */
export const ENGINE_TRIGGERS = Object.freeze({ collect: 'collect', delivery: 'delivery', skim: 'skim', lift: 'lift', flashEnd: 'flash-end',
  gain: 'gain', overfill: 'overfill', pack: 'pack' });
/** Momentum: Turns in a row (no stop between them) before its Luminance starts. */
export const MOMENTUM_TURNS = 5;
const EPS = 1e-9;
const defOf = card => SKILL_CARDS[card?.cardId];
export const engineSpec = card => defOf(card)?.engine || null;
export const isEngineCard = card => !!engineSpec(card);
const slotCards = cards => (Array.isArray(cards) ? cards : cards?.cards || cards?.mountedCards || []).slice(0, CARD_ECONOMY.maxSlots);
/** True when a Chain holds a card with engine rules (or Black Hole, whose take-off rule lives in card-black-hole.mjs). */
export const hasEngineCards = cards => slotCards(cards).some(isEngineCard);
const hears = (spec, type) => !!spec?.hears?.includes(type);

/** The loop as the Chain screen will draw it: Timers, the Timers that return to the first Slot, the card that hears a
 * returned Pulse, and whether the Chain runs once (no Timer, ruling 1). */
export function findEngineLoop(cards) {
  const row = slotCards(cards), specs = row.map(engineSpec);
  const timers = specs.map((s, i) => s?.timer ? i : -1).filter(i => i >= 0);
  const returns = timers.filter(i => ['wick', 'fuse'].includes(specs[i].timer));
  const entry = specs.findIndex(s => hears(s, 'pulse'));
  return { timers, returns, entry, runsOnce: !timers.length, heartbeat: specs.some(s => s?.timerScale) };
}

/** Product of the Boosts to the right of `slot` (Any Trigger multipliers without limited uses), as on a firing. */
export function engineBoostAt(cards, slot, pass = 1) {
  const row = slotCards(cards), last = row.findLastIndex(Boolean);
  let multiplier = 1; const by = [];
  for (let j = slot + 1; j < row.length; j++) {
    const card = row[j], def = defOf(card), rule = def && getCardRowRule(def, card);
    if (!rule || rule.event !== '*' || rule.operation !== 'multiply' || def.charges) continue;
    if (rule.when?.lastOccupied && j !== last) continue;
    if (!matchesRowShape(rule.when, row, j)) continue;
    const amount = Number(pass === 2 && rule.replayAmount !== undefined ? rule.replayAmount : rule.amount) || 1;
    if (amount > 1) { multiplier *= amount; by.push(j); }
  }
  return { multiplier, by };
}

const round6 = v => Math.round(v * 1e6) / 1e6;

/** The engine runtime. `runtime` is the flight's card execution ({cards}); uses spent here are spent on those
 * real cards. `host` applies effects to the world (all amounts in printed Sparks):
 *   room() → meter room left; meterFraction() → 0..1; gain(n, slot) → Sparks actually added;
 *   store(n, slot) → Stored Sparks; startFlash(seconds, slot) → true if a Flare started; canFlash();
 *   shortenRecovery(seconds) → seconds granted; recoveryLeft(); repeatLastFiring(slot) → {asked, real, spill} | null;
 *   homingFetch(slot) → true if a Collector with charge was sent for the nearest Spark in reach (Homing Thread);
 *   setLuminance(percent) for Momentum (0 ends it); worldPulse(slot) → a real light Pulse in the world (Wave Loom);
 *   onEvent(entry) for cues. Missing host methods behave as an endless meter with no world. */
export class CardEngine {
  constructor(runtime, host = {}, { log = true } = {}) {
    this.runtime = runtime || { cards: [] }; this.host = host; this.logging = log;
    this.t = 0; this.turn = 0; this.pass = 1; this.inPack = false;
    this.timers = []; this.seq = 0; this.queue = [];
    this.burning = new Set(); this.armed = new Set(); this.firstUsed = new Set();
    this.lowEmberAt = new Map(); this.bellTurn = new Map();
    this.log = []; this.logged = 0; this.turnLog = []; this.gainsByTurn = new Map();
    this.sparks = 0; this.asked = 0; this.stored = 0; this.stops = 0; this.lastStop = null; this.halted = false; this.warned = false;
    this.pack = { sparks: 0, asked: 0, stored: 0, acts: 0, turns: 0 };
    this.streak = 0; this.momentum = 0; this.worldPulses = 0;
  }
  get cards() { return slotCards(this.runtime?.cards || []); }
  get timerScale() { return this.cards.some(card => engineSpec(card)?.timerScale) ? 0.5 : 1; }
  get turns() { return this.turn; }
  /** Per-card limits (first of the flight, once per 6 s, once per Turn) follow the card instance, not its Slot. */
  keyOf(slot) { return this.cards[slot]?.instanceId ?? `slot:${slot}`; }
  /** Small, serializable state for the flight HUD (Phase 2) and tests. */
  get state() {
    return { turns: this.turn, sparks: round6(this.sparks), stored: this.stored, stops: this.stops, lastStop: this.lastStop,
      timers: this.timers.map(t => ({ slot: t.slot, kind: t.kind, at: round6(t.at), wait: round6(t.wait),
        progress: t.wait > 0 ? Math.max(0, Math.min(1, 1 - (t.at - this.t) / t.wait)) : 1 })),
      running: this.timers.length > 0, streak: this.streak, momentum: this.momentum };
  }
  record(entry) {
    const full = { t: round6(this.t), turn: this.turn, ...entry };
    this.logged++;
    if (this.logging && this.log.length < ENGINE_LIMITS.logEntries) this.log.push(full);
    this.host.onEvent?.(full);
  }
  room() { const r = this.host.room?.(); return Number.isFinite(r) ? Math.max(0, r) : Infinity; }
  meterFraction() { const f = this.host.meterFraction?.(); return Number.isFinite(f) ? f : 0; }
  halt(reason) {
    if (!this.warned) { this.warned = true; console.warn(`[card-engine] safety limit reached (${reason}); the engine stops.`); }
    this.halted = true; this.queue.length = 0; this.timers.length = 0; this.burning.clear(); this.armed.clear();
    this.record({ k: 'halt', reason });
  }
  stop(reason, slot) { this.stops++; this.lastStop = { reason, slot, t: round6(this.t), turn: this.turn }; this.record({ k: 'stop', reason, slot }); this.endStreak(); }
  /** "In a row" ends with a stop, or when nothing is left waiting (the engine fell idle). Momentum ends with it. */
  endStreak() {
    this.streak = 0;
    if (this.momentum) { this.momentum = 0; this.host.setLuminance?.(0); this.record({ k: 'momentum-ends' }); }
  }
  nextAt() { return this.timers.length ? Math.min(...this.timers.map(t => t.at)) : Infinity; }

  /** Run every Timer due by `now`, each at its own time, in (time, sequence) order. */
  advance(now) {
    if (!Number.isFinite(now)) return;
    let n = 0;
    while (this.timers.length && !this.halted) {
      this.timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
      const next = this.timers[0];
      if (next.at > now + EPS) break;
      this.timers.shift();
      if (++n > ENGINE_LIMITS.timersPerAdvance) { this.halt('timers'); break; }
      this.t = Math.max(this.t, next.at);
      this.fireTimer(next);
    }
    this.halted = false;
    if (now > this.t) this.t = now;
  }

  /** A player-made Trigger at flight time `now` (heard by the whole Chain, left to right). */
  raise(type, detail = {}, now = this.t) {
    this.advance(now);
    if (type === ENGINE_TRIGGERS.pack) return this.runPack(detail);
    this.record({ k: 'trigger', type });
    // A Trigger caused by a card-sent Pulse (detail.fromSlot) flows right from that sender, so a Pulse can never come back to its sender.
    const origin = Number.isInteger(detail.fromSlot) && detail.fromSlot >= 0 ? detail.fromSlot : -1;
    this.queue.push({ type, from: origin, mask: origin >= 0 ? 1 << origin : 0, turn: this.turn, detail, player: true,
      ...(detail.spill !== undefined ? { spill: Number(detail.spill) || 0, spillBase: this.baseSpill(Number(detail.spill) || 0, detail.spillBase) } : {}), natural: !!detail.natural });
    this.flush();
    return this;
  }
  /** A Flare started by a card (Flare Tinder at `slot`) has ended: heard by cards to its right. */
  flashEnded(slot, now = this.t) {
    if (!(slot >= 0)) return this.raise(ENGINE_TRIGGERS.flashEnd, {}, now);
    this.advance(now);
    this.record({ k: 'flash-end', slot });
    this.queue.push({ type: 'flash-end', from: slot, mask: 1 << slot, turn: this.turn });
    this.flush();
    return this;
  }
  /** The part of a spill that no Boost made (Spill Jar and Ember Bell keep from this: Stored Sparks are never Boosted). `given` is
   * a known unboosted spill; otherwise it is read from the walker's last receipt (the firing this spill came from). */
  baseSpill(spill, given) {
    if (Number.isFinite(given)) return Math.max(0, Math.min(spill, given));
    const last = this.runtime?.lastTrace, unboosted = Number(last?.sparksUnboosted), sparks = Number(last?.sparks);
    if (!(unboosted >= 0) || !(sparks >= spill - EPS) || unboosted >= sparks - EPS) return spill;
    return Math.max(0, Math.min(spill, unboosted - (sparks - spill)));
  }
  flush() {
    let n = 0;
    while (this.queue.length && !this.halted) {
      if (++n > ENGINE_LIMITS.deliveriesPerInstant) { this.halt('events'); break; }
      this.deliver(this.queue.shift());
    }
    this.halted = false;
    if (!this.timers.length && (this.streak || this.momentum)) this.endStreak();
  }
  deliver(ev) {
    if (ev.type === 'pulse') return this.answer(ev.to, ev);
    const cards = this.cards;
    for (let j = ev.from + 1; j < cards.length && !this.halted; j++) if (hears(engineSpec(cards[j]), ev.type)) this.answer(j, ev);
  }
  /** Ruling 2: the next card to the right of `from` that waits for a Pulse (never one that made it this Turn). */
  pulseTarget(from, mask) {
    const cards = this.cards;
    for (let j = from + 1; j < cards.length; j++) if (hears(engineSpec(cards[j]), 'pulse') && !(mask & (1 << j))) return j;
    return -1;
  }
  sendPulse(from, mask, extra = {}) {
    const to = this.pulseTarget(from, mask);
    this.realPulse(from);
    if (to < 0) { this.record({ k: 'pulse-unheard', slot: from }); return false; }
    this.record({ k: 'pulse', slot: from, to, ...extra });
    this.queue.push({ type: 'pulse', to, from, mask, turn: this.turn });
    return true;
  }
  /** A Pulse sent by a card is a REAL Pulse (2026-11-17): the world gets a light ring that cards to the RIGHT of the sender hear when it
   * crosses a Spark you have not taken, exactly like a Flare's Pulse. It never re-fires the sender or the cards to its left (the host
   * tags the ring with the sender's Slot). Made only when such a card exists, and never while packing (the flight is over). */
  realPulse(from) {
    if (this.inPack || typeof this.host.cardPulse !== 'function' || !this.pulseHeardByCardsRightOf(from)) return;
    this.record({ k: 'real-pulse', slot: from });
    this.host.cardPulse(from);
  }
  pulseHeardByCardsRightOf(from) {
    const rt = this.runtime || {}, keep = list => Array.isArray(list) ? list.map((item, j) => j > from ? item : null) : list;
    return hasCardRowEvent({ ...rt, cards: keep(rt.cards || []), ...(rt.inscriptions ? { inscriptions: keep(rt.inscriptions) } : {}) }, 'wave-crossing');
  }
  overfillHeardRightOf(slot) { return this.cards.some((card, j) => j > slot && hears(engineSpec(card), 'overfill')); }
  echoRepeats(slot) {
    const left = this.cards[slot - 1], def = defOf(left), target = defOf(this.cards[slot]);
    return def?.kind === 'echo' && target?.copyable ? Math.max(1, Math.min(3, Math.floor(def.repeatCount || 1))) : 0;
  }
  thirdBeat() { return this.turn > 0 && this.turn % 3 === 0 && this.cards.some(card => engineSpec(card)?.governor === 'third-beat') ? 2 : 1; }
  beginTurn(slot) {
    this.turn++;
    if (this.turnLog.length < ENGINE_LIMITS.turnLog) this.turnLog.push(round6(this.t));
    this.record({ k: 'turn', slot });
    if (this.inPack) return;
    // Wave Loom: one real light Pulse per Turn, however many copies.
    const loom = this.cards.findIndex(card => engineSpec(card)?.governor === 'wave-loom');
    if (loom >= 0) { const sent = this.host.worldPulse?.(loom) !== false; if (sent) this.worldPulses++; this.record({ k: sent ? 'world-pulse' : 'world-pulse-refused', slot: loom }); }
    // Momentum: after MOMENTUM_TURNS Turns in a row, its Luminance (copies add) until the engine stops.
    this.streak++;
    if (!this.momentum && this.streak >= MOMENTUM_TURNS) {
      const percent = this.cards.reduce((sum, card) => engineSpec(card)?.governor === 'momentum' ? sum + cardAmount(card) : sum, 0);
      if (percent > 0) { this.momentum = percent; this.host.setLuminance?.(percent); this.record({ k: 'momentum', amount: percent }); }
    }
  }

  answer(j, ev) {
    if (j < 0 || this.halted) return;
    if (ev.turn === this.turn && (ev.mask & (1 << j))) return; // never answers its own event in the same Turn
    const card = this.cards[j], spec = engineSpec(card);
    if (!spec) return;
    if (spec.timer) return this.light(j, ev);
    const id = this.keyOf(j);
    if (spec.first && this.firstUsed.has(id)) return;
    if (spec.meterBelow !== undefined && !(Number(ev.detail?.meterFraction ?? this.meterFraction()) < spec.meterBelow - EPS)) return;
    if (spec.cooldown && this.lowEmberAt.has(id) && this.t < this.lowEmberAt.get(id) + spec.cooldown - EPS) return;
    if (spec.oncePerTurn && this.bellTurn.get(id) === this.turn) return;
    if (spec.first) this.firstUsed.add(id);
    if (spec.cooldown) this.lowEmberAt.set(id, this.t);
    if (spec.oncePerTurn) this.bellTurn.set(id, this.turn);
    // The mask names the card that made an event (its direct maker), so that card never answers it this Turn.
    const times = (1 + this.echoRepeats(j)) * (this.cards[j] && this.runtime?.inscriptions?.[j]?.id === 'twin-mark' ? 2 : 1), mask = 1 << j;
    this.record({ k: 'hit', slot: j, type: ev.type, from: ev.from, times });
    if (spec.family === 'pack') this.pack.acts++;
    for (let r = 0; r < times; r++) this.act(j, ev, mask);
  }
  /** What an engine card does (its `does`), whatever made it act. */
  act(j, ev, mask) {
    const card = this.cards[j], spec = engineSpec(card);
    for (const what of spec.does || []) {
      if (what === 'gain') this.gain(j, cardAmount(card) + (this.runtime?.inscriptions?.[j]?.id === 'gilded' ? 2 : 0) + [j - 1, j + 1].filter(k => this.runtime?.inscriptions?.[k]?.id === 'lodestone').length, mask);
      else if (what === 'pulse') {
        if (spec.keep && ev?.type === 'overfill' && !ev.natural) {
          const keep = Math.floor(Math.min(spec.keep, Number(ev.spillBase ?? ev.spill) || 0) + EPS);
          if (keep > 0) { this.host.store?.(keep, j); this.stored += keep; if (this.inPack) this.pack.stored += keep; this.record({ k: 'keep', slot: j, amount: keep }); }
        }
        if (spec.lastTurn) { if (this.pulseTarget(j, mask) >= 0) { this.beginTurn(j); this.pack.turns++; } }
        this.sendPulse(j, mask);
      } else if (what === 'keep') {
        // Spill Jar: half of the spill (rounded up) becomes Stored Sparks. A collected pickup's own spill already packs.
        if (ev?.type === 'overfill' && !ev.natural) {
          const keep = Math.max(0, Math.ceil((Number(ev.spillBase ?? ev.spill) || 0) * (Number(spec.keepShare) || 0.5) - EPS));
          if (keep > 0) { this.host.store?.(keep, j); this.stored += keep; if (this.inPack) this.pack.stored += keep; this.record({ k: 'keep', slot: j, amount: keep }); }
        }
      } else if (what === 'tithe') {
        // Tithe (batch 3): at Pack, pay Stored Sparks for +1 max Sparks. The host decides if the Stored Sparks are there; the count is on the card.
        if (this.inPack && this.host.tithe?.(Number(spec.cost) || 5, j)) { card.tally = (Math.floor(Number(card.tally)) || 0) + 1; this.record({ k: 'tithe', slot: j }); }
      } else if (what === 'flash') {
        const started = this.inPack ? false : !!this.host.startFlash?.(Number(spec.seconds) || 1, j);
        this.record({ k: started ? 'flash' : 'flash-refused', slot: j });
        if (started) this.queue.push({ type: 'flash-start', from: j, mask, turn: this.turn });
      } else if (what === 'homing') {
        const sent = this.inPack ? false : !!this.host.homingFetch?.(j);
        this.record({ k: sent ? 'homing' : 'homing-refused', slot: j });
      } else if (what === 'whet') {
        // Whetstone: the card to its right regains one use, never above its ceiling; nothing for a card without uses. Makes no event, so it cannot loop.
        const target = this.cards[j + 1], ceiling = getCardChargeCapacity(target);
        if (target && defOf(target)?.charges > 0 && Number.isFinite(target.charges) && target.charges < ceiling) {
          target.charges++; this.host.regained?.(target, j + 1); this.record({ k: 'whet', slot: j, target: j + 1 });
        } else this.record({ k: 'whet-none', slot: j });
      } else if (what === 'fire-collect') {
        this.cards.forEach((other, k) => {
          const def = defOf(other), rule = def && getCardRowRule(def, other);
          if (rule?.event === 'body-spark') this.fireAction(k, mask, { pickupKind: 'light' });
        });
      }
    }
  }
  /** One card-made Spark gain at `slot`: Boosts to its right, Third Beat, rounded up; Overfill to the right. */
  gain(slot, base, mask) {
    const { multiplier } = engineBoostAt(this.cards, slot, this.pass);
    const amount = Math.max(0, Math.ceil(Math.max(0, Number(base) || 0) * multiplier * this.thirdBeat() - EPS));
    if (!(amount > 0)) return { real: 0, spill: 0 };
    const room = this.room();
    const added = this.host.gain ? Number(this.host.gain(amount, slot)) || 0 : Math.min(amount, room);
    const real = Math.max(0, Math.min(amount, added)), spill = round6(amount - real);
    this.asked += amount; this.sparks += real;
    this.gainsByTurn.set(this.turn, (this.gainsByTurn.get(this.turn) || 0) + amount);
    if (this.inPack) { this.pack.sparks += real; this.pack.asked += amount; }
    const lodes = [slot - 1, slot + 1].filter(k => this.runtime?.inscriptions?.[k]?.id === 'lodestone');
    this.record({ k: 'gain', slot, amount, real: round6(real), spill, boost: multiplier, ...(lodes.length ? { lodestoneSlots: lodes } : {}) });
    if (real > EPS) this.queue.push({ type: 'gain', from: slot, mask, turn: this.turn, amount: real });
    const heard = spill > EPS && this.overfillHeardRightOf(slot);
    if (heard) this.queue.push({ type: 'overfill', from: slot, mask, turn: this.turn, spill, spillBase: Math.max(0, Math.min(spill, Math.ceil(Math.max(0, Number(base) || 0) - EPS) - real)) });
    if (real <= EPS && !heard) this.stop('meter-full', slot);
    return { real, spill };
  }
  /** Timers: Slow Wick and Long Fuse burn once at a time; Metronome is armed once and ticks until it cannot. */
  light(j, ev) {
    const spec = engineSpec(this.cards[j]);
    if (spec.timer === 'metronome') {
      if (!hears(spec, ev.type)) return;
      if (this.armed.has(j)) { this.record({ k: 'keeps-ticking', slot: j }); return; }
      if (this.inPack) { this.record({ k: 'no-time', slot: j }); return; }
      this.armed.add(j); this.schedule(j, 'tick'); this.record({ k: 'armed', slot: j });
      return;
    }
    if (this.burning.has(j)) { this.record({ k: 'already-waiting', slot: j }); return; }
    if (this.inPack) { this.record({ k: 'no-time', slot: j }); return; }
    this.burning.add(j); this.schedule(j, spec.timer); this.record({ k: 'lit', slot: j });
  }
  schedule(slot, kind) {
    const spec = engineSpec(this.cards[slot]), wait = (Number(spec.wait) || 1) * this.timerScale;
    this.timers.push({ at: this.t + wait, wait, slot, kind, seq: ++this.seq, instanceId: this.cards[slot]?.instanceId ?? null });
  }
  fireTimer(tm) {
    const card = this.cards[tm.slot], spec = engineSpec(card);
    // A Deck edit while paused can move the card; a stale wait simply ends.
    if (!spec || card.instanceId !== tm.instanceId || (spec.timer === 'metronome' ? tm.kind !== 'tick' : spec.timer !== tm.kind)) {
      this.burning.delete(tm.slot); this.armed.delete(tm.slot); return;
    }
    const self = 1 << tm.slot;
    if (tm.kind === 'wick') {
      this.burning.delete(tm.slot); this.beginTurn(tm.slot);
      this.sendPulse(-1, self, { back: true });
    } else if (tm.kind === 'fuse') {
      this.burning.delete(tm.slot); this.beginTurn(tm.slot);
      const r = this.host.repeatLastFiring?.(tm.slot);
      if (!r || !(r.asked > 0)) { this.record({ k: 'fuse-empty', slot: tm.slot }); this.stop('nothing-to-repeat', tm.slot); }
      else {
        const real = Math.max(0, Number(r.real) || 0), spill = Math.max(0, Number(r.spill) || 0);
        this.asked += r.asked; this.sparks += real;
        this.gainsByTurn.set(this.turn, (this.gainsByTurn.get(this.turn) || 0) + r.asked);
        this.record({ k: 'fuse', slot: tm.slot, amount: r.asked, real: round6(real), spill: round6(spill) });
        // The repeat is a whole-Chain firing from the first Slot, so its Sparks are heard across the Chain.
        if (real > EPS) this.queue.push({ type: 'gain', from: -1, mask: self, turn: this.turn, amount: real });
        if (spill > EPS && this.overfillHeardRightOf(-1)) this.queue.push({ type: 'overfill', from: -1, mask: self, turn: this.turn, spill, spillBase: this.baseSpill(spill) });
      }
    } else if (tm.kind === 'tick') {
      const next = tm.slot + 1;
      if (!this.canAct(next)) {
        this.armed.delete(tm.slot); this.record({ k: 'metronome-stops', slot: tm.slot }); this.stop('cannot-act', next);
        return;
      }
      this.beginTurn(tm.slot);
      this.fireAction(next, self);
      if (this.armed.has(tm.slot)) this.schedule(tm.slot, 'tick');
    }
    this.flush();
  }
  /** Can the card at `slot` do its job if a Metronome fires it now? */
  canAct(slot) {
    const card = this.cards[slot], def = defOf(card);
    if (!def || isInventoryOnlyCard(card) || (def.charges && !(card.charges > 0))) return false;
    const spec = def.engine;
    if (spec) {
      if (spec.family === 'pack' || !spec.does && !spec.timer) return false;
      if (spec.timer === 'metronome') return !this.armed.has(slot);
      if (spec.timer) return !this.burning.has(slot);
      const id = this.keyOf(slot);
      if (spec.first && this.firstUsed.has(id)) return false;
      if (spec.cooldown && this.lowEmberAt.has(id) && this.t < this.lowEmberAt.get(id) + spec.cooldown - EPS) return false;
      if (spec.does.includes('flash')) return this.host.canFlash ? !!this.host.canFlash() : true;
      if (spec.does.length === 1 && spec.does[0] === 'gain') return this.room() > EPS;
      return true;
    }
    const rule = getCardRowRule(def, card);
    if (!rule || rule.event === '*' && rule.operation !== 'add-sparks') return false;
    if (!matchesRowCondition(rule.when, { meterFraction: this.meterFraction() }, 1, slot, this.cards.findLastIndex(Boolean))) return false;
    if (rule.operation === 'add-sparks') return this.room() > EPS && (Number(rule.amount) || 0) > 0;
    if (rule.operation === 'shorten-recovery' || rule.operation === 'shorten-reel') return (Number(this.host.recoveryLeft?.()) || 0) > EPS;
    return false;
  }
  /** "Fire the card once": a Metronome tick or Harvest Home. Ignores the card's own Trigger, keeps its condition
   * (checked against `context`, e.g. a plain Spark for Harvest Home) and spends a real use. */
  fireAction(slot, mask, context = {}) {
    const card = this.cards[slot], def = defOf(card);
    if (!def || isInventoryOnlyCard(card) || (def.charges && !(card.charges > 0))) return false;
    const own = 1 << slot;
    if (def.engine) {
      const spec = def.engine;
      if (spec.timer) { this.light(slot, { type: 'pulse', from: slot - 1, mask: own, turn: this.turn }); return true; }
      if (spec.family === 'pack' || !spec.does) return false;
      const id = this.keyOf(slot);
      if (spec.first) { if (this.firstUsed.has(id)) return false; this.firstUsed.add(id); }
      if (spec.cooldown) this.lowEmberAt.set(id, this.t);
      if (spec.oncePerTurn) { if (this.bellTurn.get(id) === this.turn) return false; this.bellTurn.set(id, this.turn); }
      this.record({ k: 'fired', slot });
      this.act(slot, { type: 'fire', from: slot - 1 }, own);
      return true;
    }
    const rule = getCardRowRule(def, card);
    const event = { meterFraction: this.meterFraction(), ...context };
    if (!rule || !matchesRowCondition(rule.when, event, 1, slot, this.cards.findLastIndex(Boolean))) return false;
    if (rule.operation === 'add-sparks' && (Number(rule.amount) || 0) > 0) {
      if (def.charges) card.charges--;
      this.record({ k: 'fired', slot });
      this.gain(slot, Number(rule.amount), own);
      return true;
    }
    if (rule.operation === 'shorten-recovery' || rule.operation === 'shorten-reel') {
      const seconds = (Number(rule.amount) || 0) * engineBoostAt(this.cards, slot, this.pass).multiplier;
      const granted = Number(this.host.shortenRecovery?.(seconds)) || 0;
      if (granted > EPS) { if (def.charges) card.charges--; this.record({ k: 'fired', slot, seconds: round6(granted) }); return true; }
    }
    return false;
  }
  /** The Pack Trigger: once, at the end of a cleared flight, before the meter is packed. Whole Chain, left to right;
   * Echo repeats a Pack card; a Refrain plays the Pack line once more (Second Sun's Encore amount applies there).
   * Timers cannot wait: the flight is over. */
  runPack(detail = {}) {
    this.inPack = true;
    const firing = pass => {
      this.pass = pass;
      this.record({ k: 'trigger', type: 'pack', pass });
      this.queue.push({ type: 'pack', from: -1, mask: 0, turn: this.turn, detail, player: true });
      this.flush();
    };
    firing(1);
    if (this.pack.acts > 0 && this.cards.some(card => defOf(card)?.kind === 'refrain')) firing(2);
    this.pass = 1; this.inPack = false;
    return { sparks: round6(this.pack.sparks), asked: this.pack.asked, stored: this.pack.stored, turns: this.pack.turns, acts: this.pack.acts };
  }
}

// ── Pure runs: the Deck preview and the balance simulation ──────────────────────────────────────────────────────
/** A meter-only world for previews and the simulation. `max: Infinity` is the uncapped meter used for the medallion
 * numbers. Uses are spent on a private copy of the cards. */
export function createMeterHost({ start = 0, max = Infinity, collectorRecovery = 0 } = {}) {
  const host = {
    meter: start, max, storedTotal: 0, flashes: [], recovery: collectorRecovery, lastRow: null, runtime: null,
    room: () => Math.max(0, host.max - host.meter),
    meterFraction: () => Number.isFinite(host.max) && host.max > 0 ? host.meter / host.max : 0,
    gain: n => { const real = Math.max(0, Math.min(n, host.max - host.meter)); host.meter += real; return real; },
    store: n => { host.storedTotal += n; },
    canFlash: () => !host.flashes.some(f => f.until > host.now),
    startFlash: (seconds, slot) => { if (!host.canFlash()) return false; host.flashes.push({ until: host.now + seconds, slot }); return true; },
    recoveryLeft: () => host.recovery,
    shortenRecovery: s => { const g = Math.min(s, host.recovery); host.recovery -= g; return g; },
    now: 0,
    /** Long Fuse: the last player Trigger the Chain answered, resolved again by the ordinary walker. */
    repeatLastFiring: () => {
      if (!host.lastRow || !host.runtime) return null;
      const receipt = resolveCardRow(host.runtime, { ...host.lastRow, meterFraction: host.meterFraction() });
      if (!(receipt.sparks > 0)) return null;
      const real = host.gain(receipt.sparks);
      return { asked: receipt.sparks, real, spill: receipt.sparks - real };
    },
  };
  return host;
}

/** One player event in a pure run: a Collect fires the ordinary chain (its Sparks are a player-made gain the engine
 * hears) and the engine's Collect; other kinds go to the engine only. */
export function playerEvent(engine, host, kind, detail = {}, now = engine.t) {
  engine.advance(now); host.now = now;
  if (kind === 'pickup') {
    // A natural Spark (simulation only): its own fuel first; what does not fit is a natural Overfill.
    const fuel = Math.max(0, Number(detail.fuel) || 0), real = host.gain(fuel);
    if (fuel - real > EPS) engine.raise('overfill', { natural: true }, now);
    kind = 'collect';
  }
  if (kind === 'collect' || kind === 'body-spark') {
    const row = { kind: 'body-spark', pickupKind: 'light', meterFraction: host.meterFraction(), ...detail };
    const receipt = resolveCardRow(host.runtime, row);
    if (receipt.steps.some(step => step.success)) host.lastRow = row;
    if (receipt.sparks > 0) {
      const real = host.gain(receipt.sparks), spill = receipt.sparks - real;
      if (real > EPS) engine.raise('gain', { amount: real }, now);
      if (spill > EPS) engine.raise('overfill', { spill }, now);
    }
    return engine.raise('collect', detail, now);
  }
  return engine.raise(kind, detail, now);
}

/** Run a Chain on the engine's clock. `events`: [{t, kind, detail}] player events; `burn`: Sparks per second the meter
 * loses (stands in for Lift, ruling 6), applied once a second like the demo. Deterministic. */
export function simulateEngineChain(cards, { horizon = 60, events = [], meter = { start: 0, max: Infinity }, burn = 0, log = true, collectorRecovery = 0 } = {}) {
  const runtime = createCardExecution(slotCards(cards));
  const host = createMeterHost({ ...meter, collectorRecovery }); host.runtime = runtime;
  const engine = new CardEngine(runtime, host, { log });
  const queue = [...events].map((e, i) => ({ ...e, i })).sort((a, b) => a.t - b.t || a.i - b.i);
  let nextBurn = burn > 0 ? 1 : Infinity, minMeter = host.meter, emptyAt = null;
  const flashEnd = () => host.flashes.filter(f => !f.done).reduce((m, f) => Math.min(m, f.until), Infinity);
  for (let guard = 0; guard < 200000; guard++) {
    const tEvent = queue.length ? queue[0].t : Infinity, tTimer = engine.nextAt(), tFlash = flashEnd();
    const t = Math.min(tEvent, tTimer, nextBurn, tFlash);
    if (!(t <= horizon + EPS)) break;
    host.now = t;
    if (t === tTimer) { engine.advance(t); continue; }
    if (t === tFlash) {
      engine.advance(t); const f = host.flashes.find(x => !x.done && x.until === t); f.done = true;
      engine.flashEnded(f.slot ?? -1, t); continue;
    }
    if (t === nextBurn) { engine.advance(t); host.meter = Math.max(0, host.meter - burn); minMeter = Math.min(minMeter, host.meter); if (host.meter <= EPS && emptyAt === null) emptyAt = t; nextBurn += 1; continue; }
    const e = queue.shift(); playerEvent(engine, host, e.kind, e.detail || {}, t);
  }
  engine.advance(horizon);
  return { engine, host, runtime, log: engine.log, turns: engine.turn, turnLog: engine.turnLog, gainsByTurn: engine.gainsByTurn,
    sparks: engine.sparks, asked: engine.asked, stored: host.storedTotal, meter: host.meter, stops: engine.stops, running: engine.timers.length > 0,
    minMeter, emptyAt };
}

/** The player events that start a Chain in the preview: one of each Trigger from flying that a card in it hears,
 * at t = 0 (a Collect, a skim, a Lift on a low meter, a Flare ending). */
export function engineStarts(cards) {
  const row = slotCards(cards), specs = row.map(engineSpec), out = [];
  const listens = type => specs.some(s => hears(s, type));
  const collects = row.some(card => { const def = defOf(card), rule = def && getCardRowRule(def, card); return rule?.event === 'body-spark' || rule?.event === '*' && rule.operation === 'add-sparks'; });
  if (listens('collect') || collects) out.push({ t: 0, kind: 'collect' });
  if (listens('skim')) out.push({ t: 0, kind: 'skim' });
  if (listens('lift')) out.push({ t: 0, kind: 'lift', detail: { meterFraction: 0.1 } });
  if (listens('flash-end')) out.push({ t: 0, kind: 'flash-end' });
  return out;
}

/** Medallion numbers (proposal: "Sparks per Turn, and Turns per 10 s"), measured like the demo: an uncapped meter,
 * started once at t = 0, Turns counted from 15 s to 60 s. Null when the Chain never turns three times there (a Chain
 * with no Timer runs once). */
export function engineMetrics(cards, { horizon = 60, from = 15 } = {}) {
  const loop = findEngineLoop(cards);
  const run = simulateEngineChain(cards, { horizon, events: engineStarts(cards), log: false });
  const tl = run.turnLog.map((t, i) => ({ t, turn: i + 1 })).filter(x => x.t >= from - EPS);
  const base = { runsOnce: loop.runsOnce, timers: loop.timers, returns: loop.returns, turns: run.turns };
  if (tl.length < 3) return { ...base, sparksPerTurn: null, turnsPer10s: null };
  const span = tl[tl.length - 1].t - tl[0].t;
  const turnsPer10s = span > EPS ? (tl.length - 1) / span * 10 : null;
  const sparksPerTurn = tl.reduce((s, x) => s + (run.gainsByTurn.get(x.turn) || 0), 0) / tl.length;
  return { ...base, sparksPerTurn: round6(sparksPerTurn), turnsPer10s: turnsPer10s === null ? null : round6(turnsPer10s) };
}

/** The Pack line on its own (ceremony preview and tests): Pack cards fire into a meter of `start` of `max`. */
export function previewPack(cards, { start = 0, max = Infinity } = {}) {
  const runtime = createCardExecution(slotCards(cards));
  const host = createMeterHost({ start, max }); host.runtime = runtime;
  const engine = new CardEngine(runtime, host);
  const result = engine.raise('pack', {}, 0);
  return { ...result, meter: host.meter, storedKept: host.storedTotal, log: engine.log };
}
