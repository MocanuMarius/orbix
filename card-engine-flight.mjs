// The flight side of the engine rules (dist/card-engine.mjs). flight.mjs only calls these helpers, so a flight whose
// Chain holds no engine card never builds an engine and behaves exactly as before.
// Clock: the flight's simulation time (`e.time`), which stands still while the game is paused, the tutorial waits
// for a Lift, or the tab is hidden (the flight pauses itself then), and which advances by the fixed simulation step,
// so a given seed and input give the same engine log. Eligibility mirrors resolveCardRowEvent: no engine during a
// Dream rehearsal, the clear/death animations, or a tutorial without practice cards.
import {CARD_UNIT} from './skill-cards.mjs?v=icons-1';
import {CardEngine, hasEngineCards} from './card-engine.mjs?v=icons-1';
import {createFlashTether, FLASH_PULSE_INTERVAL} from './flash-tether.mjs?v=icons-1';

const live = e => !!(e.cardEngine && e.cardExecution && e.running && !e.paused && e.alive && !e.finished && !e.destroyed
  && !e.dying && !e.completing && !(e.tutorial && !e.mod?.practiceCards) && !(e.dream && e.dream.phase !== 'done'));

function flightHost(e) {
  return {
    room: () => Math.max(0, e.maxFlame - e.flame) / CARD_UNIT,
    meterFraction: () => e.flame / e.maxFlame,
    gain: printed => {
      const g = Math.min(printed * CARD_UNIT, Math.max(0, e.maxFlame - e.flame));
      e.flame += g; e.flameRestored += g;
      return g / CARD_UNIT;
    },
    store: n => { e.cardEngineStored = (e.cardEngineStored || 0) + n; },
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
      e.radiateLight?.({once: true, reveal: true, source: 'card-wave-loom', sourceKind: 'card', color: '#d9f0dc'});
      return true;
    },
    // Cues (no reading in flight): the strip in card-row-feedback.mjs pulses on a new Turn and dims on a stop; these
    // counters are cheap and change only on engine events.
    onEvent: entry => {
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

/** Each simulation step: due Timers, the end of a Flash, a filled Proximity meter (a skim). */
export function stepFlightEngine(e, skimsBefore = null) {
  if (!live(e)) return;
  e.cardEngine.advance(e.time);
  if (e.cardEngineFlash && !(e.time < e.sightUntil)) {
    const slot = e.cardEngineFlash.slot; e.cardEngineFlash = null;
    e.cardEngine.flashEnded(slot, e.time);
  }
  if (skimsBefore !== null && (e.edgingPulse?.triggerCount || 0) > skimsBefore) e.cardEngine.raise('skim', {}, e.time);
}

/** A Flash picked up in flight (a natural Flash: its end is heard by the whole Chain). */
export function noteFlightFlash(e) { if (e.cardEngine) e.cardEngineFlash = {slot: -1}; }

/** The Pack Trigger, once, at the start of a successful clear and before the meter is packed. */
export function packFlightEngine(e) {
  if (!live(e)) return null;
  const result = e.cardEngine.raise('pack', {}, e.time);
  e.cardPack = {sparks: result.sparks, asked: result.asked, stored: result.stored, turns: result.turns};
  return e.cardPack;
}
