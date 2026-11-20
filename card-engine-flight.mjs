// The flight side of the engine rules (dist/card-engine.mjs). flight.mjs only calls these helpers, so a flight whose
// Chain holds no engine card never builds an engine and behaves exactly as before.
// Clock: the flight's simulation time (`e.time`), which stands still while the game is paused, the tutorial waits
// for a Lift, or the tab is hidden (the flight pauses itself then), and which advances by the fixed simulation step,
// so a given seed and input give the same engine log. Eligibility mirrors resolveCardRowEvent: no engine during a
// Dream rehearsal, the clear/death animations, or a tutorial without practice cards.
import {CARD_UNIT} from './skill-cards.mjs?v=tidy-1';
import {CardEngine, hasEngineCards} from './card-engine.mjs?v=tidy-1';
import {appendFires, engineFire, engineBars} from './chain-strip.mjs?v=tidy-1';
import {createFlashTether, FLASH_PULSE_INTERVAL} from './flash-tether.mjs?v=tidy-1';

const live = e => !!(e.cardEngine && e.cardExecution && e.running && !e.paused && e.alive && !e.finished && !e.destroyed
  && !e.dying && !e.completing && !(e.tutorial && !e.mod?.practiceCards) && !(e.dream && e.dream.phase !== 'done'));

function flightHost(e) {
  return {
    room: () => Math.max(0, e.maxFlame - e.flame) / CARD_UNIT,
    meterFraction: () => e.flame / e.maxFlame,
    gain: printed => {
      const g = Math.min(printed * CARD_UNIT, Math.max(0, e.maxFlame - e.flame));
      e.flame += g; e.flameRestored += g;
      if (e.rec) e.rec.cardSparks += g / CARD_UNIT; // play recorder: engine-card Sparks count like row-rule ones (flight.mjs)
      return g / CARD_UNIT;
    },
    // One Overfill rule: Sparks an engine card made that find the Meter full are an Overfill for the row cards to its right as well.
    cardSpill: (slot, spill) => e.cardSpillHeard?.(spill, slot),
    store: n => { e.cardEngineStored = (e.cardEngineStored || 0) + n; },
    // Whetstone: a regained use is written to the flight's use ledger, which otherwise only ever falls.
    regained: card => { if (e.cardChargeLedger) e.cardChargeLedger[card.instanceId] = card.charges; },
    // Tithe: Stored Sparks the run held when the flight began pay for it, only in a real flight (never a tutorial or a Dream).
    tithe: cost => {
      if (e.tutorial || e.dream || (e.condensedStart || 0) - (e.cardTithePaid || 0) < cost) return false;
      e.cardTithePaid = (e.cardTithePaid || 0) + cost; return true;
    },
    // Pressure Valve: one free Lift is armed (never more than one); the badge on the card shows it.
    armFreeLift: () => { e.cardFreeLift = true; e.syncPressureValve?.(); return true; },
    canFlash: () => !(e.time < e.sightUntil),
    startFlash: (seconds, slot) => {
      if (e.time < e.sightUntil) return false;
      e.flashTether = createFlashTether({x: e.distance + e.player.x, y: e.player.y, playerX: e.distance + e.player.x, playerY: e.player.y,
        time: e.time, duration: seconds, reducedMotion: e.reducedMotion});
      e.sightUntil = e.flashTether.expires;
      e.luminanceWaves?.removeSource?.('flash');
      e.radiateLight?.({id: 'flash', x: e.flashTether.x, y: e.flashTether.y, follow: 'flash', sourceKind: 'card', duration: seconds,
        radius: e.getLightState?.().radius, color: '#f0f7ff', interval: FLASH_PULSE_INTERVAL, reveal: true});
      e.cardEngineFlash = {slot};
      return true;
    },
    recoveryLeft: () => e.wisp?.enabled?.(e) ? Math.max(0, e.wisp.cooldown || 0) : 0,
    shortenRecovery: seconds => {
      const w = e.wisp;
      if (!w?.enabled?.(e) || !(w.cooldown > 0)) return 0;
      const before = w.cooldown; w.cooldown = Math.max(0, w.cooldown - seconds);
      return before - w.cooldown;
    },
    // Homing Thread: a Collector with charge searches once for the nearest Spark in reach, even one still ahead of
    // the wisp (dist/wisp.mjs › homingFetch). The fetch itself, its reel and its recovery are the normal ones.
    homingFetch: () => {
      const all = e.collectors?.length ? e.collectors : e.wisp ? [e.wisp] : [];
      const w = all.find(c => c?.enabled?.(e) && c.phase === 'ready' && !(c.cooldown > 0) && !c.cargo && !c.target);
      if (!w) return false;
      w.homingFetch = e.time;
      return true;
    },
    // Momentum: card Luminance on top of the Chain's own (getLightState adds it; 0 ends it).
    setLuminance: percent => { e.cardEngineLuminance = Math.max(0, Number(percent) || 0); },
    // Wave Loom: the same real light Pulse a Pulse card makes, heard by Pulse cards when it crosses a Spark.
    worldPulse: () => {
      if (e.dream && e.dream.phase !== 'done') return false;
      const wave = e.radiateLight?.({once: true, reveal: true, source: 'card-wave-loom', sourceKind: 'card', color: '#d9f0dc'});
      if (wave && typeof wave === 'object') wave.beat = true; // a Timer Pulse: lights the passage, its crossings fire nothing (see stepFlightEngine)
      return true;
    },
    // A Pulse sent by a card: a real light ring from the wisp, tagged with the sender's Slot so only Pulse cards to its right hear it
    // cross a Spark (dist/luminance-waves.mjs passes the Slot on as the event's fromSlot). Slot -1 is a Timer's return: the whole Chain.
    cardPulse: (slot, beat = false) => {
      if (e.dream && e.dream.phase !== 'done') return false;
      const wave = e.radiateLight?.({once: true, reveal: true, source: 'card-pulse', sourceKind: 'card', color: '#d9f0dc'});
      if (wave && typeof wave === 'object') { wave.fromSlot = slot; if (beat) wave.beat = true; }
      return true;
    },
    // Cues (no reading in flight): the strip in card-row-feedback.mjs pulses on a new Turn and dims on a stop; these
    // counters are cheap and change only on engine events.
    onEvent: entry => {
      const mark = engineFire(entry); if (mark) appendFires(e, [mark]);
      const bars = engineBars(entry); if (bars) appendFires(e, bars);
      if (entry.k === 'turn') e.cardEngineCue = {...(e.cardEngineCue || {}), turn: (e.cardEngineCue?.turn || 0) + 1};
      else if (entry.k === 'stop') e.cardEngineCue = {...(e.cardEngineCue || {}), stops: (e.cardEngineCue?.stops || 0) + 1};
    },
    // Long Fuse: the last Trigger from flying that the Chain answered, resolved again with real uses.
    repeatLastFiring: () => {
      const last = e.cardEngineLastFiring;
      if (!last) return null;
      const result = e.resolveCardRowEvent(last.kind, {...last.detail}, null, {engine: true});
      if (!result || !(result.receipt.sparks > 0)) return null;
      const real = result.gain / CARD_UNIT;
      return {asked: result.receipt.sparks, real, spill: Math.max(0, result.receipt.sparks - real)};
    },
  };
}

/** Build (or re-point after a Deck edit) the flight's engine. Timers of cards that moved simply end. */
export function syncFlightEngine(e) {
  if (!e.cardExecution || !hasEngineCards(e.cardExecution.cards)) { e.cardEngine = null; return null; }
  if (e.cardEngine) { e.cardEngine.runtime = e.cardExecution; return e.cardEngine; }
  e.cardEngine = new CardEngine(e.cardExecution, flightHost(e));
  e.cardEngine.t = e.time || 0;
  return e.cardEngine;
}

/** A player-made Trigger from flying. */
export function raiseFlightEngine(e, kind, detail = {}) {
  if (!live(e)) return null;
  return e.cardEngine.raise(kind, detail, e.time);
}

/** Each simulation step: due Timers, the end of a Flare, a filled Proximity meter (a skim). */
export function stepFlightEngine(e, skimsBefore = null) {
  if (!live(e)) return;
  if (!e.cardEngine.tookOff) e.cardEngine.takeOff(e.time);
  e.cardEngine.advance(e.time);
  // Timer beat: the Pulse a Timer firing made fires every Pulse card that may hear it once (never per Spark crossed).
  if (e.cardEngine.takeBeat()) e.resolveCardRowEvent('wave-crossing', {firstCrossing: true, pickupKind: 'light', pulseSource: 'card-pulse', pulseSourceKind: 'card', beat: true, engineHeard: true});
  if (e.cardEngineFlash && !(e.time < e.sightUntil)) {
    const slot = e.cardEngineFlash.slot; e.cardEngineFlash = null;
    e.cardEngine.flashEnded(slot, e.time);
  }
  if (skimsBefore !== null && (e.edgingPulse?.triggerCount || 0) > skimsBefore) e.cardEngine.raise('skim', {}, e.time);
}

/** Pulse Reader (starter card): while mounted it sends its own real Pulse every 8 s of flight time, however many Readers. The Pulse is tagged just left of
 * the Reader, so the Reader and the cards to its right hear it cross a Spark (+1 Spark each) and nothing to its left does. Only this timer makes it:
 * a crossing never makes a Pulse, so the Reader cannot fire itself into a loop. */
export const PULSE_READER_INTERVAL = 8;
export function stepPulseReader(e) {
  const slot = e.cardExecution?.cards?.findIndex(card => card?.cardId === 'pulse-reader') ?? -1;
  if (slot < 0) { e.pulseReaderAt = undefined; return; }
  const live2 = e.running && !e.paused && e.alive && !e.finished && !e.destroyed && !e.dying && !e.completing && !e.tutorial && !(e.dream && e.dream.phase !== 'done');
  if (!live2) return;
  if (!(e.pulseReaderAt >= 0)) e.pulseReaderAt = e.time + PULSE_READER_INTERVAL;
  if (e.time + 1e-9 < e.pulseReaderAt) return;
  e.pulseReaderAt = e.time + PULSE_READER_INTERVAL;
  const wave = e.radiateLight?.({once: true, reveal: true, source: 'card-pulse-reader', sourceKind: 'card', color: '#d9f0dc'});
  if (wave && typeof wave === 'object') wave.fromSlot = slot - 1;
  appendFires(e, [{slot, kind: 'bar'}]);
}

/** Bell (Inscription): a real light Pulse every 6 s of flight time, however many Bells. Runs only while the world is live. */
export function stepFlightInscriptions(e) {
  stepPulseReader(e);
  const ins = e.cardExecution?.inscriptions;
  if (!ins || !ins.some(entry => entry?.id === 'bell')) return;
  const live2 = e.running && !e.paused && e.alive && !e.finished && !e.destroyed && !e.dying && !e.completing && !e.tutorial && !(e.dream && e.dream.phase !== 'done');
  if (!live2) return;
  if (!(e.inscriptionBellAt >= 0)) e.inscriptionBellAt = e.time + 6;
  if (e.time + 1e-9 < e.inscriptionBellAt) return;
  e.inscriptionBellAt = e.time + 6;
  const wave = e.radiateLight?.({once: true, reveal: true, source: 'inscription-bell', sourceKind: 'card', color: '#d9f0dc'});
  // The Bell's Pulse flows right like any card's: only Pulse cards to the right of the leftmost Bell hear it.
  if (wave && typeof wave === 'object') wave.fromSlot = ins.findIndex(entry => entry?.id === 'bell');
  appendFires(e, ins.flatMap((entry, slot) => entry?.id === 'bell' ? [{slot, kind: 'bar'}] : []));
}

/** A Flare picked up in flight (a natural Flare: its end is heard by the whole Chain). */
export function noteFlightFlash(e) { if (e.cardEngine) e.cardEngineFlash = {slot: -1}; }

/** The Pack Trigger, once, at the start of a successful clear and before the meter is packed. */
export function packFlightEngine(e) {
  if (!live(e)) return null;
  const result = e.cardEngine.raise('pack', {}, e.time);
  e.cardPack = {sparks: result.sparks, asked: result.asked, stored: result.stored, turns: result.turns};
  return e.cardPack;
}
