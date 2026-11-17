// v1.0-engine · design-lab only. A self-contained mock of docs/engine-cards.md: nothing in the game changes.
// Part 1 is the small local model (a clock, events, cards) that follows the proposal's three rules.
// Part 2 draws the Chain the way the real Chain tab looks and plays the model's trace back step by step.
import {pixelArt, gem, TRIGGER_ART, CAMPFIRE, WARN} from '../ui/trigger-icons.mjs';

// ── Part 1 · the model ───────────────────────────────────────────────────────
const card = (id, name, rarity, family, o = {}) => ({id, name, rarity, family, hears: [], plate: '', ...o});
export const CARDS = {
  'first-catch': card('first-catch', 'First Catch', 'common', 'starter', {hears: ['collect-first'], plate: 'First Collect: send a Pulse'}),
  'close-call': card('close-call', 'Close Call', 'rare', 'starter', {hears: ['skim'], plate: 'Skim: Pulse and +1 Spark'}),
  'low-ember': card('low-ember', 'Low Ember', 'rare', 'starter'),
  'spark-chime': card('spark-chime', 'Spark Chime', 'common', 'maker', {hears: ['pulse'], plate: 'Pulse: +1 Spark'}),
  'ember-bell': card('ember-bell', 'Ember Bell', 'common', 'maker', {hears: ['gain'], oncePerTurn: true, plate: 'Gain: send a Pulse, once a Turn'}),
  'overflow-bell': card('overflow-bell', 'Overflow Bell', 'rare', 'maker', {hears: ['overfill'], plate: 'Overfill: Pulse, keep 2'}),
  'slow-wick': card('slow-wick', 'Slow Wick', 'common', 'timer', {hears: ['pulse'], timer: true, returns: true, wait: 3, plate: 'Waits 3 s, then a Pulse'}),
  'metronome': card('metronome', 'Metronome', 'rare', 'timer', {hears: ['pulse'], timer: true, wait: 1.5, plate: 'Every 1.5 s: fire next card'}),
  'heartbeat': card('heartbeat', 'Heartbeat', 'legendary', 'timer', {plate: 'Timers wait half as long', passive: true}),
  'body-spark': card('body-spark', 'Body Spark +2', 'common', 'maker', {plate: 'Collect: +2 Sparks'}),
  'crescendo': card('crescendo', 'Crescendo', 'rare', 'boost', {boost: 2, passive: true, plate: 'Each Turn gives x2'}),
  'full-satchel': card('full-satchel', 'Full Satchel', 'common', 'pack', {hears: ['pack'], plate: 'Pack: +3 Sparks'}),
  'echo': card('echo', 'Echo', 'rare', 'repeater', {repeater: true, passive: true, plate: 'Repeats next'}),
  'last-round': card('last-round', 'Last Round', 'rare', 'pack', {hears: ['pack'], plate: 'Pack: send a Pulse'}),
  'black-hole': card('black-hole', 'Black Hole', 'rare', 'blackhole', {passive: true, plate: 'Eats the card to its right'}),
};
const EMITS = {
  'first-catch': ['pulse'], 'close-call': ['pulse', 'gain', 'overfill'], 'spark-chime': ['gain', 'overfill'], 'ember-bell': ['pulse'],
  'overflow-bell': ['pulse'], 'slow-wick': ['pulse'], 'metronome': ['next'], 'body-spark': ['gain', 'overfill'], 'last-round': ['pulse'],
};

/** Rulings 1 and 2. Events flow to the right only. Only a Timer that sends its event back (Slow Wick) closes a circle, by returning to the first Slot.
 *  A Chain with no Timer runs once. `entry` is the card that hears a Pulse sent to the first Slot. */
export function findCircle(ids) {
  const cs = ids.map(id => id && CARDS[id]);
  const timers = cs.map((c, i) => c?.timer ? i : -1).filter(i => i >= 0);
  const back = timers.find(i => cs[i].returns);
  return {timers, back: back ?? -1, entry: cs.findIndex(c => c?.hears.includes('pulse')), runsOnce: !timers.length};
}

/** The clock model. Events are instant; only Timers take time. Returns a trace the screen plays back. */
export function simulate(scene, {uncapped = false, horizon = 30} = {}) {
  const ids = scene.ids(), n = ids.length, cs = ids.map(id => id && CARDS[id]);
  const circle = findCircle(ids);
  const hb = cs.some(c => c?.id === 'heartbeat') ? 0.5 : 1;
  let t = 0, meter = uncapped ? 0 : scene.meter.start;
  const max = uncapped ? 1e9 : scene.meter.max;
  let turn = 0, stored = 0, stopped = null, armed = false, caught = false, idle = -1, back = false;
  const steps = [], q = [], timers = [], made = new Set(), turnLog = [], gainBy = {};
  const nm = i => cs[i].name;
  const push = s => steps.push({t, turn, meter, ...s});
  const boostAt = i => cs.reduce((m, c, j) => c?.boost && j > i ? m * c.boost : m, 1);
  const beginTurn = () => {turn++; made.clear(); turnLog.push(t); push({k:'turn'});};
  // Ruling 2: a Pulse is heard by the next card to its right that waits for a Pulse.
  const nearest = from => {for (let j = from + 1; j < n; j++) if (cs[j]?.hears.includes('pulse')) return j; return -1;};
  const pulse = from => {
    const j = nearest(from);
    if (j < 0) push({k: 'note', slot: from, log: `${nm(from)} sends a Pulse, but no card hears it.`});
    else q.push({type: 'pulse', slot: j, from});
  };
  const overfillHeard = cs.some(c => c?.hears.includes('overfill'));
  const gain = (i, amt) => {
    const a = amt * boostAt(i), room = max - meter, real = Math.max(0, Math.min(a, room)), spill = a - real;
    meter += real; gainBy[turn] = (gainBy[turn] || 0) + a;
    if (real > 0) q.push({type: 'gain', from: i, amt: real});
    if (spill > 1e-9 && overfillHeard) q.push({type: 'overfill', from: i, spill});
    return {a, real, spill};
  };
  const stop = why => {if (!stopped) stopped = why;};
  const hit = (slot, from, plate, log, extra = {}) => push({k: 'hit', slot, from, plate, log, back, ...extra});

  function answer(j, ev) {
    const c = cs[j];
    if (c.oncePerTurn && made.has(j)) return;
    const from = ev.from; back = !!ev.back;
    switch (c.id) {
      case 'first-catch':
        if (caught) return; caught = true;
        hit(j, from, 'Pulse sent', `${nm(j)} hears the first Collect and sends a Pulse.`); pulse(j); break;
      case 'close-call': {
        const g = gain(j, 1);
        hit(j, from, '+1 Spark, Pulse', `${nm(j)} hears the skim: +1 Spark and a Pulse.`, {gain: g.real}); pulse(j); break;
      }
      case 'spark-chime': {
        if (turn === 0) beginTurn();
        const g = gain(j, 1);
        if (g.real <= 1e-9 && !overfillHeard) {hit(j, from, 'Meter full', `Meter full. ${nm(j)} has nothing to do, so the engine stops.`); stop('Meter full: the engine stops and the track dims.'); break;}
        hit(j, from, `+${fmt(g.a)} Spark${g.a === 1 ? '' : 's'}`, `${nm(j)} hears the Pulse: +${fmt(g.a)} Spark${g.a === 1 ? '' : 's'}.`, {gain: g.real}); break;
      }
      case 'ember-bell':
        made.add(j); hit(j, from, 'Pulse sent', `${nm(j)} hears the Spark and sends a Pulse.`); pulse(j); break;
      case 'slow-wick': {
        const w = c.wait * hb;
        hit(j, from, `Waiting ${fw(w)} s`, `${nm(j)} starts to wait ${fw(w)} s.`, {wait: {slot: j, from: t, to: t + w, secs: w}});
        timers.push({at: t + w, type: 'wick', slot: j, pri: 1}); break;
      }
      case 'metronome': {
        const w = c.wait * hb;
        if (armed) {hit(j, from, 'Keeps ticking', `${nm(j)} hears the Pulse and keeps ticking.`); return;}
        armed = true;
        hit(j, from, `Armed: every ${fw(w)} s`, `${nm(j)} hears the Pulse and starts ticking every ${fw(w)} s.`, {wait: {slot: j, from: t, to: t + w, secs: w}});
        timers.push({at: t + w, type: 'tick', slot: j, pri: 1}); break;
      }
      case 'overflow-bell': {
        const keep = Math.min(2, ev.spill); stored += keep;
        hit(j, from, `Keeps ${fmt(keep)}, Pulse`, `${nm(j)} hears the overfill: keeps ${fmt(keep)} spilled Spark${keep === 1 ? '' : 's'} and sends a Pulse, so the loop turns again.`, {kept: keep, stored}); pulse(j); break;
      }
      default: break;
    }
  }
  function deliver(ev) {
    if (ev.type === 'pulse') return answer(ev.slot, ev);
    const event = ev.type;
    // Ruling 1: events flow to the right only.
    for (let j = ev.from + 1; j < n && !stopped; j++) {
      if (!cs[j] || !cs[j].hears.includes(event)) continue;
      answer(j, ev);
    }
  }
  const flush = () => {while (q.length && !stopped) deliver(q.shift());};

  // Start of the flight.
  if (scene.drain && !uncapped) timers.push({at: 1, type: 'drain', slot: -1, pri: 0});
  q.push({type: scene.start, from: -1});
  push({k: 'start', log: scene.startLog});
  flush();
  while (!stopped) {
    const live = timers.some(x => x.type !== 'drain') || (idle >= 0 && scene.drain && !uncapped);
    if (!live) {stop(scene.endLog || 'Nothing is left to answer, so the Chain stops.'); break;}
    timers.sort((a, b) => a.at - b.at || a.pri - b.pri);
    const nx = timers.shift();
    if (nx.at > horizon) {t = horizon; stop('Demo ends here. The engine would keep turning.'); break;}
    t = nx.at;
    if (nx.type === 'drain') {
      meter = Math.max(0, meter - 1); push({k: 'drain'}); timers.push({at: t + 1, type: 'drain', slot: -1, pri: 0});
      // The burn stands in for Lift (ruling 6): a Metronome that stopped on a full meter restarts when the meter falls.
      if (idle >= 0 && meter < max - 1e-9) {
        const m = idle, w = cs[m].wait * hb; idle = -1; armed = true; back = false;
        hit(m, -1, `Ticking again: ${fw(w)} s`, `The meter fell, so ${nm(m)} starts ticking again every ${fw(w)} s.`, {wait: {slot: m, from: t, to: t + w, secs: w}});
        timers.push({at: t + w, type: 'tick', slot: m, pri: 1});
      }
      continue;
    }
    if (nx.type === 'wick') {
      // Rulings 1 and 8: only a Timer sends its event back to the first Slot, and that starts a new Turn.
      beginTurn(); back = false;
      hit(nx.slot, nx.slot, 'Pulse sent', `${fw(cs[nx.slot].wait * hb)} s are up. ${nm(nx.slot)} sends a Pulse back to the first Slot.`, {fromTimer: true});
      const first = nearest(-1);
      if (first < 0) push({k: 'note', slot: nx.slot, log: `${nm(nx.slot)} sends a Pulse to the first Slot, but no card hears it.`});
      else q.push({type: 'pulse', slot: first, from: nx.slot, back: true});
    } else if (nx.type === 'tick') {
      if (meter >= max - 1e-9) {
        armed = false; back = false;
        hit(nx.slot, nx.slot, 'Meter full', `${nm(nx.slot)} finds the meter full and stops ticking.`);
        if (scene.drain && !uncapped) idle = nx.slot; else if (!q.length) stop('Meter full: the engine stops and the track dims.');
        continue;
      }
      beginTurn(); back = false;
      hit(nx.slot, nx.slot, 'Tick: fire next', `${nm(nx.slot)} ticks and fires ${nm(nx.slot + 1)} once.`);
      const nj = nx.slot + 1, g = gain(nj, 2);
      const spillTxt = g.spill > 1e-9 ? ` ${fmt(g.spill)} spills over.` : '';
      hit(nj, nx.slot, `+${fmt(g.a)} Sparks`, `${nm(nj)} gives +${fmt(g.a)} Sparks.${spillTxt}`, {gain: g.real});
      timers.push({at: t + cs[nx.slot].wait * hb, type: 'tick', slot: nx.slot, pri: 1});
    }
    flush();
  }
  push({k: 'stop', log: stopped, reason: stopped});
  return {steps, circle, stored, turnLog, gainBy, hb};
}
const fmt = v => Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
const fw = v => String(Math.round(v * 100) / 100);

/** Sparks per Turn and Turns per 10 s, measured on an uncapped 60 s run (no meter limit, no drain). */
export function metrics(scene) {
  const r = simulate(scene, {uncapped: true, horizon: 60});
  const tl = r.turnLog.map((tt, i) => ({t: tt, i: i + 1})).filter(x => x.t >= 15);
  if (tl.length < 3) return null;
  const span = tl[tl.length - 1].t - tl[0].t;
  const per10 = (tl.length - 1) / span * 10;
  const sparks = tl.reduce((s, x) => s + (r.gainBy[x.i] || 0), 0) / tl.length;
  return {sparks, per10};
}

/** The end-of-flight pack line (rule: Pack Trigger). Boosted amounts go into the meter before packing. */
export function simulatePack(scene) {
  const ids = scene.ids(), cs = ids.map(id => id && CARDS[id]);
  let meter = scene.meter.start, stored = scene.stored;
  const steps = [], max = scene.meter.max;
  const push = s => steps.push({t: 0, meter, stored, ...s});
  push({k: 'start', log: 'The flight is over. Pack starts: your Pack cards fire before the meter is packed.'});
  cs.forEach((c, j) => {
    if (!c) return;
    if (c.repeater) {push({k: 'hit', slot: j, from: j - 1, plate: 'Repeats next', log: `${c.name} will repeat the next card once.`}); return;}
    if (!c.hears.includes('pack')) return;
    const times = cs[j - 1]?.repeater ? 2 : 1;
    for (let r = 1; r <= times; r++) {
      const tag = times > 1 ? ` (${r} of ${times})` : '';
      if (c.id === 'full-satchel') {
        const g = Math.min(3, max - meter); meter += g;
        push({k: 'hit', slot: j, from: j - 1, plate: `+3 Sparks${times > 1 ? ' x' + r : ''}`, log: `${c.name}${tag}: +3 Sparks go into the meter before packing.`, gain: g});
      } else if (c.id === 'last-round') {
        push({k: 'hit', slot: j, from: j - 1, plate: 'Pulse sent', log: `${c.name}${tag} sends a Pulse. This Chain has no engine to hear it, so there is no extra Turn.`});
      }
    }
  });
  const packed = meter, before = stored; stored += packed; meter = 0;
  push({k: 'pack', packed, before, log: `Packed: ${packed} Sparks go into Stored Sparks (${before} before, ${stored} now).`});
  push({k: 'stop', log: `Stored Sparks: ${stored}.`});
  return steps;
}

// ── Part 2 · scenes ──────────────────────────────────────────────────────────
const S = {heartbeat: true, speed: 3, victim: 'common', packOrder: 'echo', eaten: 0, bonus: 0};
export const SCENES = [
  {id: 'chime', tab: '1 Chime loop', title: 'Chime loop', engine: true, start: 'collect-first', icon: 'body-spark', origin: 'First Collect',
   meter: {start: 6, max: 12}, ids: () => ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick'],
   startLog: 'A first Collect enters at the left. First Catch hears it.', hint: 'Press Play. A first Collect starts a circle that turns itself.'},
  {id: 'nowait', tab: '2 No wait', title: 'Chime loop without Slow Wick', engine: true, start: 'collect-first', icon: 'body-spark', origin: 'First Collect',
   meter: {start: 6, max: 12}, ids: () => ['first-catch', 'spark-chime', 'ember-bell'], endLog: 'No Timer, so the Chain ran once. Add a Timer to keep it turning.',
   startLog: 'A first Collect enters at the left. First Catch hears it.', hint: 'Same loop with no Timer: the plate reads "Runs once" and Play runs it once.'},
  {id: 'mill', tab: '3 Overflow', title: 'Overflow mill', engine: true, start: 'skim', icon: 'field-swipe', origin: 'Skim', drain: true, horizon: 18,
   meter: {start: 11, max: 12}, ids: () => ['close-call', 'metronome', 'body-spark', 'overflow-bell', S.heartbeat ? 'heartbeat' : null],
   startLog: 'You skim an obstacle. Close Call hears it. The meter also burns down 1 Spark a second.', hint: 'A near-full meter that keeps overfilling. Toggle Heartbeat to halve or restore the tempo.'},
  {id: 'crescendo', tab: '4 Crescendo', title: 'Chime loop + Crescendo', engine: true, start: 'collect-first', icon: 'body-spark', origin: 'First Collect',
   meter: {start: 6, max: 12}, ids: () => ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick', 'crescendo'],
   startLog: 'A first Collect enters at the left. First Catch hears it.', hint: 'The same engine with a Boost at the end: each Turn now gives 2.'},
  {id: 'pack', tab: '5 Pack', title: 'Pack', pack: true, start: 'pack', icon: 'flight-clear', origin: 'Pack',
   meter: {start: 14, max: 20}, stored: 8,
   ids: () => S.packOrder === 'satchel' ? ['full-satchel', 'echo', 'last-round'] : ['echo', 'full-satchel', 'last-round'],
   hint: 'End of flight. Press Play: Pack cards fire, then the meter is packed into Stored Sparks.'},
  {id: 'hole', tab: '6 Black Hole', title: 'Black Hole', hole: true, start: 'take-off', icon: 'downbeat-lift', origin: 'Take-off',
   meter: {start: 6, max: 12}, ids: () => ['black-hole', VICTIMS[S.victim]],
   hint: 'Pick a card to feed it, then Play. Eaten cards add up until you press Reset.'},
];
const VICTIMS = {common: 'spark-chime', rare: 'close-call', legendary: 'heartbeat'};
const GROWTH = {common: 1, rare: 2, legendary: 3};

// ── Part 3 · glyphs ──────────────────────────────────────────────────────────
function grid(fn) {return Array.from({length: 16}, (_, y) => Array.from({length: 16}, (_, x) => fn(x, y, Math.hypot(x - 7.5, y - 7.5)) || '.').join(''));}
const GLYPH = {
  maker: TRIGGER_ART['body-spark'], starter: CAMPFIRE, governor: TRIGGER_ART['rhythm-phrase'], boost: TRIGGER_ART['rhythm-phrase'],
  timer: grid((x, y, r) => r > 7.5 ? '' : r > 6.3 ? 'O' : (x === 7 || x === 8) && y >= 3 && y <= 8 ? 'O' : (y === 7 || y === 8) && x >= 8 && x <= 11 ? 'O' : r < 1.5 ? 'O' : 'Y'),
  repeater: grid((x, y, r) => r > 7.5 ? '' : r > 6.3 ? 'O' : r > 4.2 ? 'S' : r > 3 ? 'O' : 'n'),
  blackhole: grid((x, y, r) => r > 7.5 ? '' : r < 3.2 ? 'O' : r > 5 && r < 6.6 && (x + y) % 3 ? 'D' : r > 7 ? 'O' : r > 3.2 && r < 4.6 ? 'L' : 'S'),
  pack: grid((x, y) => {
    if (y >= 3 && y <= 5 && x >= 4 && x <= 11) return y === 3 || x === 4 || x === 11 ? 'O' : 'P';
    if (y >= 6 && y <= 14 && x >= 2 && x <= 13) return y === 6 || y === 14 || x === 2 || x === 13 ? 'O' : (y === 8 && x >= 7 && x <= 8) ? 'G' : 'B';
    return '';
  }),
};
const FAMILY = {maker: 'Maker', timer: 'Timer', starter: 'Starter', governor: 'Governor', pack: 'Pack', boost: 'Boost', repeater: 'Repeater', blackhole: 'Black Hole'};
const SPARK = '../assets/ui/spark.svg';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// ── Part 4 · screen ──────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const stageEl = $('stage'), logEl = $('log'), clockEl = $('clock');
let sceneIdx = 0, run = 0, paused = false, running = false, model = null;
const scene = () => SCENES[sceneIdx];

function tileHTML(c, extra = '') {
  return `<div class="en-tile r-${c.rarity} f-${c.family}"><div class="en-tile-top">${gem(c.rarity)}<span>${FAMILY[c.family]}</span></div><div class="en-glyph">${pixelArt(GLYPH[c.family], {size: 40})}</div><b class="en-name">${esc(c.name)}</b>${extra}</div>`;
}
function medalRows(sc) {
  if (sc.engine) {
    const m = model.circle && !model.circle.runsOnce ? metrics(sc) : null;
    return m ? [[fmt(m.sparks), 'Sparks per Turn'], [fmt(m.per10), 'Turns per 10 s']] : [['--', 'Sparks per Turn'], ['--', 'Turns per 10 s']];
  }
  if (sc.pack) return [['+0', 'Gained before pack'], [String(sc.stored), 'Stored Sparks']];
  return [[String(sc.meter.max + S.bonus), 'Max Sparks'], [String(S.eaten), 'Cards eaten']];
}
function buildStage() {
  const sc = scene(), ids = sc.ids(), n = ids.length;
  model = sc.engine ? {circle: findCircle(ids)} : null;
  const circle = sc.engine ? model.circle : null;
  const rows = medalRows(sc);
  const bh = sc.hole;
  const slots = ids.map((id, i) => {
    const c = id && CARDS[id];
    if (!c) return `<div class="en-slot" data-slot="${i}" style="grid-column:${i + 2}"><div class="en-empty"><b>${sc.id === 'mill' ? 'Removed' : 'Empty'}</b></div><span class="en-plate en-plate-empty"></span></div>`;
    const sub = bh && c.id === 'black-hole' ? `<small class="en-sub" id="bh-sub">${bhText()}</small>` : '';
    const victim = bh && i === 1;
    return `<div class="en-slot${c.passive && !victim ? ' passive' : ''}" data-slot="${i}" style="grid-column:${i + 2}">${tileHTML(c, sub)}<span class="en-plate${victim ? ' wine' : ''}" id="plate-${i}"><b>${victim ? 'Eaten at take-off' : esc(c.plate)}</b></span></div>`;
  }).join('');
  const notches = ids.map((_, i) => `<i class="en-notch" data-slot="${i}" style="grid-column:${i + 2}"></i>`).join('');
  stageEl.style.setProperty('--n', n);
  stageEl.className = 'en-stage' + (circle ? ' has-circle' : '');
  stageEl.innerHTML = `
   <div class="en-origin-col"><button type="button" class="en-sign go" id="play" aria-label="Play"><b>Play</b></button>
     <div class="en-origin"><span class="en-orb" id="orb">${pixelArt(TRIGGER_ART[sc.icon], {size: 32})}</span><span class="en-origin-name">${esc(sc.origin)}</span></div></div>
   <div class="en-slots" id="slots">${slots}</div>
   <i class="en-rail" id="rail"></i>${notches}
   <div class="en-end">
     <i class="en-eq" aria-hidden="true"></i>
     <div class="en-medal" id="medal">${rows.map((r, i) => `<div class="en-m-row"><b id="mv${i}">${r[0]}</b><span id="ml${i}">${r[1]}</span></div>`).join('')}</div>
     <div class="en-meter" aria-hidden="false"><span class="en-meter-h">Meter</span><div class="en-gauge" id="bar"><i id="fill"></i></div><b class="en-meter-v" id="meter-v"></b></div>
   </div>
   <svg class="en-wires" id="wires" aria-hidden="true"></svg>
   <div class="en-dial" id="dial" hidden><i class="en-dial-ring" id="dial-ring"></i><b id="dial-n"></b></div>
   <div class="en-dialtag" id="dialtag" hidden></div>
   <div class="en-needs" id="needs" hidden><span class="en-warn">${WARN}</span><b>Runs once. Add a Timer to keep it turning.</b></div>
   <img class="en-token" id="token" src="${SPARK}" width="20" height="20" alt="" hidden>
   ${sc.hole ? '<div class="en-confirm" id="confirm" hidden role="alertdialog" aria-labelledby="confirm-t"><p id="confirm-t"></p><div class="en-confirm-b"><button type="button" class="en-sign slip" id="confirm-no"><b>Cancel</b></button><button type="button" class="en-sign wine" id="confirm-yes"><b>Fly</b></button></div></div>' : ''}`;
  setMeter(sc.meter.start, sc.meter.max, sc.pack ? sc.stored : null);
  $('play').addEventListener('click', play);
  if (sc.hole) {$('confirm-no').addEventListener('click', cancelEat); $('confirm-yes').addEventListener('click', doEat);}
  buildScope(sc, circle);
  requestAnimationFrame(layoutWires);
}
const bhText = () => `Eaten ${S.eaten} · +${S.bonus} max Sparks`;

function buildScope(sc, circle) {
  const el = $('toggles');
  let h = '';
  if (sc.id === 'mill') h = `<button type="button" class="en-btn" id="t-hb" aria-pressed="${S.heartbeat}">Heartbeat: <b>${S.heartbeat ? 'On' : 'Off'}</b></button>`;
  if (sc.pack) h = `<button type="button" class="en-btn" id="t-order" aria-pressed="${S.packOrder === 'echo'}">${S.packOrder === 'satchel' ? 'Order: Satchel, Echo' : 'Order: Echo, Satchel'}</button>`;
  if (sc.hole) h = ['common', 'rare', 'legendary'].map(r => `<button type="button" class="en-btn r-${r}" data-victim="${r}" aria-pressed="${S.victim === r}">${gemSvg(r)}${r[0].toUpperCase() + r.slice(1)}</button>`).join('');
  el.innerHTML = h;
  $('t-hb')?.addEventListener('click', () => {S.heartbeat = !S.heartbeat; resetAll();});
  $('t-order')?.addEventListener('click', () => {S.packOrder = S.packOrder === 'satchel' ? 'echo' : 'satchel'; resetAll();});
  el.querySelectorAll('[data-victim]').forEach(b => b.addEventListener('click', () => {if (running) return; S.victim = b.dataset.victim; abort(); buildStage(); say(`${CARDS[VICTIMS[S.victim]].name} (${S.victim}) is now beside the Black Hole. Press Play.`);}));
}
const gemSvg = r => gem(r);

// meter
function setMeter(v, max, stored) {
  const f = Math.max(0, Math.min(1, v / max));
  $('fill').style.height = f * 100 + '%';
  $('bar').style.setProperty('--seg', `calc(100% / ${max})`);
  $('bar').style.setProperty('--max', max);
  $('meter-v').textContent = `${fmt(v)}/${max}`;
  if (stored !== null && $('mv1')) $('mv1').textContent = fmt(stored);
}

// wires: the track, the return path of the circle, the Timer dial
function pos(el, base) {const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top};}
let geo = null;
function layoutWires() {
  const sc = scene(); if (!$('wires')) return;
  const base = stageEl.getBoundingClientRect(), ids = sc.ids();
  const notch = i => pos(stageEl.querySelector(`.en-notch[data-slot="${i}"]`), base);
  const railY = notch(0).y, orb = pos($('orb'), base);
  geo = {railY, xs: ids.map((_, i) => notch(i).x), orb: {x: orb.x, y: orb.y}, circle: sc.engine ? findCircle(ids) : null, base};
  const svg = $('wires'); svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`); svg.style.width = base.width + 'px'; svg.style.height = base.height + 'px';
  let h = '';
  const c = geo.circle;
  $('dial').hidden = true; $('dialtag').hidden = true; $('needs').hidden = true;
  if (c) {
    const yB = railY + 32;
    if (c.runsOnce) {
      // No Timer: nothing returns, so there is no track. The plate says so under the row.
      const m = $('needs'); m.hidden = false; m.style.left = (geo.xs[0] + geo.xs[geo.xs.length - 1]) / 2 + 'px'; m.style.top = yB + 'px';
    } else {
      const ts = c.back >= 0 ? c.back : c.timers[0], dx = geo.xs[ts], dl = $('dial'), tg = $('dialtag');
      if (c.back >= 0) {
        // Only the Timer sends its event back: the return track runs from the Timer to the first Slot.
        const xa = geo.xs[0], xb = dx, d = `M${xb} ${railY} V${yB} H${xa} V${railY}`;
        geo.ret = {yB, xa, xb};
        h += `<path class="w-base" d="${d}"/><path class="w-top" d="${d}"/>`;
        [xa, xb].forEach(x => {h += `<rect class="w-corner" x="${x - 5}" y="${yB - 5}" width="10" height="10"/>`;});
        tg.style.left = (xa + xb) / 2 + 'px';
      } else tg.style.left = dx + 112 + 'px';
      dl.hidden = false; dl.style.left = dx + 'px'; dl.style.top = yB + 'px';
      tg.hidden = false; tg.style.top = yB + 'px';
      geo.dial = {slot: ts}; updateDialTag();
    }
  }
  svg.innerHTML = h;
}
function updateDialTag() {
  const sc = scene(), c = geo?.circle; if (!c || c.runsOnce) return;
  const cd = CARDS[sc.ids()[c.back >= 0 ? c.back : c.timers[0]]], hb = sc.ids().includes('heartbeat') ? 0.5 : 1, w = cd.wait * hb;
  $('dialtag').innerHTML = `<b>${cd.name}</b> waits ${fw(w)} s<small>shown as ${fw(w / S.speed)} s (${S.speed}x)</small>`;
}

// playback
const sleepRaf = ms => new Promise(res => {let acc = 0, last = performance.now(); const my = run; const f = now => {if (my !== run) return res(); const dt = now - last; last = now; if (!paused) acc += dt; if (acc >= ms) res(); else requestAnimationFrame(f);}; requestAnimationFrame(f);});
const stepMs = () => S.speed >= 3 ? 280 : 360;
function say(t) {logEl.textContent = t;}
function abort() {run++; paused = false; running = false; $('pause') && ($('pause').textContent = 'Pause');}
function resetAll() {abort(); buildStage(); say(scene().hint); clockEl.textContent = 't = 0.0 s'; stageEl.classList.remove('dim');}

function light(slot, on) {stageEl.querySelector(`.en-slot[data-slot="${slot}"]`)?.classList.toggle('lit', on);}
function moveToken(from, to, ms, via) {
  const tk = $('token'); if (!geo || !tk) return Promise.resolve();
  const P = i => i === -1 || i === undefined ? {x: geo.orb.x, y: geo.railY} : {x: geo.xs[i], y: geo.railY};
  const pts = [P(from)];
  if (via && geo.ret) {const yB = geo.ret.yB, x0 = geo.xs[0]; pts.push({x: P(from).x, y: yB}, {x: x0, y: yB}, {x: x0, y: geo.railY});}
  pts.push(P(to));
  const len = pts.slice(1).reduce((s, p, i) => s + Math.abs(p.x - pts[i].x) + Math.abs(p.y - pts[i].y), 0) || 1;
  let acc = 0; const frames = pts.map((p, i) => {if (i) acc += Math.abs(p.x - pts[i - 1].x) + Math.abs(p.y - pts[i - 1].y); return {offset: acc / len, transform: `translate(${p.x - 10}px,${p.y - 10}px)`};});
  tk.hidden = false;
  const a = tk.animate(frames, {duration: ms, easing: 'steps(14,end)', fill: 'forwards'});
  return a.finished.catch(() => {});
}
function popGain(g) {
  if (!g) return;
  const b = $('bar'); if (!b) return;
  const el = document.createElement('b'); el.className = 'en-pop'; el.textContent = '+' + fmt(g); stageEl.append(el);
  const r = b.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
  el.style.left = r.left - s.left + r.width + 4 + 'px'; el.style.top = r.top - s.top + r.height * (1 - $('fill').offsetHeight / b.offsetHeight) - 6 + 'px';
  el.animate([{transform: 'translateY(0)', opacity: 1}, {transform: 'translateY(-14px)', opacity: 0}], {duration: 700, easing: 'steps(6,end)'}).finished.then(() => el.remove(), () => el.remove());
}

let dialRAF = 0, dialInfo = null, clock = 0, waiting = false;
function dialLoop() {
  cancelAnimationFrame(dialRAF);
  let last = performance.now();
  const f = now => {
    const dt = now - last; last = now;
    if (!paused && running && waiting) clock += dt / 1000 * S.speed;
    clockEl.textContent = `t = ${Math.min(clock, 999).toFixed(1)} s`;
    if (dialInfo) {
      const {from, to} = dialInfo, k = Math.max(0, Math.min(1, (clock - from) / (to - from)));
      $('dial-ring').style.setProperty('--k', k * 360 + 'deg');
      $('dial-n').textContent = Math.max(0, to - clock).toFixed(1);
      if (clock >= to) {dialInfo = null; setTimeout(() => {if (!dialInfo && $('dial')) {$('dial').classList.remove('on'); $('dial-n').textContent = ''; $('dial-ring').style.setProperty('--k', '0deg');}}, 120);}
    }
    if (running) dialRAF = requestAnimationFrame(f);
  };
  dialRAF = requestAnimationFrame(f);
}

async function play() {
  const sc = scene();
  if (running) {if (paused) {paused = false; $('pause').textContent = 'Pause';} return;}
  if (sc.hole) return askEat();
  running = true; const my = ++run; paused = false; clock = 0; dialInfo = null;
  resetPlates();
  stageEl.classList.remove('dim');
  const steps = sc.pack ? simulatePack(sc) : simulate(sc, {horizon: sc.horizon || 60}).steps;
  dialLoop();
  let max = sc.meter.max, v = sc.meter.start, stored = sc.stored ?? null, lastT = 0, gained = 0;
  for (const s of steps) {
    if (my !== run) return;
    // Model time between steps: Timers take real (scaled) time; events are instant.
    if (s.t > lastT) {
      const wantMs = (s.t - lastT) / S.speed * 1000;
      await sleepWait(wantMs, my, s.t);
      lastT = s.t;
    }
    if (my !== run) return;
    clock = Math.max(clock, s.t);
    if (s.k === 'turn' || s.k === 'start') {if (s.k === 'start') say(s.log); continue;}
    if (s.k === 'drain') {v = s.meter; setMeter(v, max, stored); continue;}
    if (s.k === 'note') {say(s.log); await sleepRaf(stepMs()); continue;}
    if (s.k === 'block') {
      say(turnTag(s) + s.log);
      await moveToken(s.from, s.slot, stepMs() * 0.7, true);
      $('token').hidden = true; flashBlock(s.slot);
      await sleepRaf(stepMs() * 1.4); continue;
    }
    if (s.k === 'pack') {
      say(s.log); $('token').hidden = true;
      const total = s.packed; const t0 = performance.now();
      for (let i = total; i >= 0; i--) {if (my !== run) return; setMeter(i, max, s.before + (total - i)); await sleepRaf(70);}
      $('mv0').textContent = '+' + fmt(gained); $('mv1').textContent = fmt(s.before + total); continue;
    }
    if (s.k === 'stop') {
      say((s.log || 'Done.') + ' ' + (sc.engine ? '' : ''));
      $('token').hidden = true; light(-1);
      if (sc.engine && /stops/.test(s.log || '')) stageEl.classList.add('dim');
      break;
    }
    if (s.k === 'hit') {
      await moveToken(s.from, s.slot, stepMs() * 0.55, !!s.back && s.from !== s.slot);
      stageEl.querySelectorAll('.en-slot.lit').forEach(e => e.classList.remove('lit'));
      light(s.slot, true);
      const pl = $('plate-' + s.slot); if (pl) {pl.firstElementChild.textContent = s.plate; pl.classList.add('done');}
      say(turnTag(s) + s.log);
      if (s.wait) {dialInfo = {from: s.wait.from, to: s.wait.to}; $('dial').classList.add('on');}
      if (s.gain) {v = s.meter; popGain(s.gain); setMeter(v, max, stored); gained += s.gain; if (sc.pack) {$('mv0').textContent = '+' + fmt(gained);}}
      else if (s.meter !== v) {v = s.meter; setMeter(v, max, stored);}
      if (s.kept) popGain(s.kept);
      await sleepRaf(stepMs());
    }
  }
  stageEl.querySelectorAll('.en-slot.lit').forEach(e => e.classList.remove('lit'));
  running = false; dialInfo = null;
}
const turnTag = s => s.turn ? `Turn ${s.turn}. ` : '';
async function sleepWait(ms, my, toT) {
  // Wait out model time (the dial runs meanwhile); stops early if the run is aborted.
  let acc = 0, last = performance.now(); waiting = true;
  await new Promise(res => {const tick = now => {if (my !== run) return res(); const dt = now - last; last = now; if (!paused) acc += dt; if (acc >= ms) res(); else requestAnimationFrame(tick);}; requestAnimationFrame(tick);}); waiting = false;
}
function flashBlock(slot) {
  const el = stageEl.querySelector(`.en-slot[data-slot="${slot}"]`); if (!el) return;
  el.classList.add('blocked'); setTimeout(() => el.classList.remove('blocked'), 1200);
}
function resetPlates() {
  const sc = scene(), ids = sc.ids();
  ids.forEach((id, i) => {const pl = $('plate-' + i); if (pl && id) {pl.classList.remove('done'); pl.firstElementChild.textContent = sc.hole && i === 1 ? 'Eaten at take-off' : CARDS[id].plate;}});
}

// Black Hole
function askEat() {
  const sc = scene(), vid = CARDS[VICTIMS[S.victim]];
  if (!stageEl.querySelector('.en-slot[data-slot="1"] .en-tile')) {say('There is nothing to its right. Pick a card first.'); return;}
  $('confirm-t').textContent = `Black Hole will destroy ${vid.name}. Fly?`;
  $('confirm').hidden = false; $('confirm-no').focus();
  say('The game asks once before a card is lost for good.');
}
function cancelEat() {$('confirm').hidden = true; say('Cancelled. Nothing was eaten.');}
async function doEat() {
  $('confirm').hidden = true; running = true;
  const my = ++run, sc = scene(), vid = CARDS[VICTIMS[S.victim]], g = GROWTH[S.victim];
  const slot = stageEl.querySelector('.en-slot[data-slot="1"]'), bh = stageEl.querySelector('.en-slot[data-slot="0"] .en-tile');
  const tile = slot.querySelector('.en-tile'), a = tile.getBoundingClientRect(), b = bh.getBoundingClientRect();
  say(`Take-off. Black Hole pulls in ${vid.name}.`);
  bh.classList.add('hole-on');
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  slot.querySelector('.en-plate').classList.add('done');
  await tile.animate([{transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1}, {transform: `translate(${dx * 0.5}px,${dy * 0.5 - 10}px) rotate(-120deg) scale(.7)`, opacity: 1, offset: 0.5}, {transform: `translate(${dx}px,${dy}px) rotate(-300deg) scale(.05)`, opacity: 0}], {duration: 900, easing: 'steps(12,end)', fill: 'forwards'}).finished.catch(() => {});
  if (my !== run) return;
  S.eaten++; S.bonus += g;
  slot.innerHTML = '<div class="en-empty"><b>Eaten</b></div><span class="en-plate en-plate-empty"></span>';
  $('bh-sub').textContent = bhText();
  $('bh-sub').classList.add('pop'); bh.classList.remove('hole-on');
  const max = sc.meter.max + S.bonus;
  setMeter(sc.meter.start, max, null);
  $('mv0').textContent = String(max); $('mv1').textContent = String(S.eaten);
  popGain(g);
  say(`${vid.name} is gone. Black Hole grows for good: +${g} max Sparks. The meter now holds ${max}.`);
  running = false;
}

// controls
$('pause').addEventListener('click', () => {if (!running) return; paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause'; say(paused ? 'Paused.' : 'Playing.');});
$('reset').addEventListener('click', () => {if (scene().hole) {S.eaten = 0; S.bonus = 0;} resetAll();});
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
  S.speed = Number(b.dataset.speed); document.querySelectorAll('[data-speed]').forEach(x => x.setAttribute('aria-pressed', x === b));
  updateDialTag();
}));
document.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => {sceneIdx = Number(b.dataset.scene); selectTab(); resetAll();}));
function selectTab() {document.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-selected', Number(b.dataset.scene) === sceneIdx));}
window.addEventListener('resize', () => {if (!running) layoutWires(); else {layoutWires();}});


// card table and rules
const TABLE = [
  ['Spark Chime', 'Common', 'Maker', 'Pulse', 'Gain 1 Spark'],
  ['Ember Bell', 'Common', 'Maker', 'Gain Sparks (any source)', 'Send a Pulse. Once per turn'],
  ['Flash Tinder', 'Rare', 'Maker', 'Collect', 'Start a short Flash (1 s)'],
  ['Homing Thread', 'Rare', 'Maker', 'Delivery', 'Collector fetches again at once (uses charge)'],
  ['Overflow Bell', 'Rare', 'Maker', 'Overfill', 'Send a Pulse and keep 2 of the spilled Sparks'],
  ['Afterglow', 'Common', 'Maker', 'Flash ends', 'Gain 2 Sparks'],
  ['Slow Wick', 'Common', 'Timer', 'Lit by any card to its left', '3 s later: send a Pulse'],
  ['Metronome', 'Rare', 'Timer', 'While the meter is not full', 'Every 1.5 s: fire the card to its right once'],
  ['Long Fuse', 'Rare', 'Timer', 'A Pulse', '5 s later: repeat the whole Chain\'s last firing'],
  ['Heartbeat', 'Legendary', 'Timer', 'Always on', 'Timers in this Chain wait half as long'],
  ['First Catch', 'Common', 'Starter', 'First Collect of a flight', 'Send a Pulse'],
  ['Close Call', 'Rare', 'Starter', 'A skim (Proximity fills)', 'Send a Pulse and gain 1 Spark'],
  ['Low Ember', 'Rare', 'Starter', 'Lift while the meter is under a quarter', 'Send a Pulse. Once per 6 s'],
  ['Third Beat', 'Rare', 'Governor', 'Always on', 'Every third Turn counts twice'],
  ['Momentum', 'Legendary', 'Governor', 'After 5 Turns without a stop', 'Luminance +1 until the engine stops'],
  ['Full Satchel', 'Common', 'Pack', 'Pack', 'Gain 3 Sparks before packing'],
  ['Last Round', 'Rare', 'Pack', 'Pack', 'Send a Pulse (the engine gets one last Turn)'],
  ['Harvest Home', 'Legendary', 'Pack', 'Pack', 'Fire every Collect card in the Chain once'],
  ['Black Hole', 'Rare', 'Black Hole', 'Start of each flight', 'Destroy the card to its right; +1 / +2 / +3 max Sparks for a Common / Rare / Legendary'],
];
$('rows').innerHTML = TABLE.map((r, i) => `<tr class="${i === TABLE.length - 1 ? 'extra' : ''}"><th scope="row">${esc(r[0])}</th><td><span class="rar r-${r[1].toLowerCase()}">${gem(r[1].toLowerCase())}${r[1]}</span></td><td>${r[2]}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('');

selectTab();
buildStage();
say(scene().hint);
if (document.fonts?.ready) document.fonts.ready.then(() => layoutWires());
window.__engine = {simulate, simulatePack, metrics, findCircle, SCENES, S};
