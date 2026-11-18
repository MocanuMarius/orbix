import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS, resolveCardRow, createCardExecution, CARD_ROW_EVENTS} from '../dist/skill-cards.mjs';
import {STRIP, STRIP_COLORS, baseColor, stripLayout, chainView, collectReceiptFires, engineFire, engineBars, appendFires, createChainStrip} from '../dist/chain-strip.mjs';
import {createFpsMeter, createFpsCounter, loadShowFps, saveShowFps, FPS_KEY} from '../dist/fps-counter.mjs';
import {createCardRowFeedback} from '../dist/card-row-feedback.mjs';

const defs = Object.values(SKILL_CARDS);
const byRarity = r => defs.find(d => d.rarity === r && !d.passive && d.kind !== 'capacity');
const passiveDef = defs.find(d => d.passive === true);
const chargedDef = defs.find(d => d.charges > 0 && !d.passive);
const common = byRarity('common');
const mk = (def, i) => def ? {cardId: def.id, instanceId: `c${i}`} : null;
const runtime = (list, inscriptions = []) => ({cards: list.map(mk), inscriptions});
const snap = (rt, extra = {}) => ({cardChain: chainView(rt), cardCharges: {}, cardFires: [], ...extra});
let seq = 0;
const mark = (slot, kind = 'fire') => ({seq: ++seq, slot, kind});
const six = () => runtime([common, common, common, common, common, common]);
const ready = (rt, extra) => { const s = createChainStrip(); s.sync(snap(rt, extra), 0); return s; };

test('only MOUNTED cards are cells; empty slots are not drawn; cells keep Chain order and slot numbers', () => {
  const rt = runtime([byRarity('common'), null, byRarity('rare'), passiveDef, null, chargedDef], [null, {id: 'gilded'}, null]);
  const s = ready(rt, {cardCharges: {c5: 0}});
  assert.equal(s.cells.length, 4);
  assert.deepEqual(s.cells.map(c => c.slot), [0, 2, 3, 5]);
  assert.deepEqual(s.cells.map(c => c.state), ['active', 'active', 'passive', 'spent']);
  assert.equal(baseColor(s.cells[0]), STRIP_COLORS.common); assert.equal(baseColor(s.cells[1]), STRIP_COLORS.rare);
  assert.equal(baseColor(s.cells[2]), STRIP_COLORS.passive); assert.equal(baseColor(s.cells[3]), STRIP_COLORS.spent);
  assert.equal(s.visible, true);
  assert.equal(createChainStrip().visible, false);
  const empty = ready(runtime([null, null], [{id: 'gilded'}, null])); assert.equal(empty.cells.length, 0); assert.equal(empty.visible, false, 'no mounted card, nothing shown');
  assert.equal(chainView(null), null);
});

test('the strip is exactly as wide as its mounted cards (10x14 frames, 2 px gaps) and centred, for 1 to 6 cards', () => {
  assert.equal(STRIP.frameW, 10); assert.equal(STRIP.frameH, 14); assert.equal(STRIP.gap, 2);
  assert.deepEqual(stripLayout(0), {width: 0, lefts: []});
  for (let n = 1; n <= 6; n++) {
    const {width, lefts} = stripLayout(n);
    assert.equal(width, 12 * n - 2);
    assert.equal(lefts[0], -width / 2, 'the first frame starts half a width left of centre');
    assert.equal(lefts[n - 1] + STRIP.frameW, width / 2, 'the last frame ends half a width right of centre');
    assert.equal(lefts.reduce((a, l) => a + l + STRIP.frameW / 2, 0), 0, 'the frames balance exactly around the centre');
    lefts.slice(1).forEach((l, i) => assert.equal(l - lefts[i], STRIP.frameW + STRIP.gap));
  }
  assert.ok(stripLayout(6).width + 2 * STRIP.padX <= 100, 'six cards plus touch padding stay narrow enough to clear both corner clusters at 870 px');
});

test('a flash lasts exactly 0.7 s and never changes length', () => {
  assert.equal(STRIP.flashMs, 700);
  const s = ready(six());
  s.fire([mark(0)], 1000);
  assert.equal(s.playing, s.cells[0]); assert.equal(s.cells[0].startedAt, 1000); assert.equal(s.nextDueAt, 1700);
  s.advance(1699); assert.equal(s.playing, s.cells[0], 'still lit at 699 ms');
  s.advance(1700); assert.equal(s.playing, null); assert.equal(s.cells[0].lit, false);
});

test('flashes run strictly one after another in the order they happened: a Chain run travels along the strip', () => {
  const s = ready(six());
  s.fire([mark(0), mark(1), mark(2)], 0);
  assert.equal(s.playing, s.cells[0]); assert.equal(s.pendingCount, 2);
  s.advance(699); assert.equal(s.playing, s.cells[0]);
  s.advance(700); assert.equal(s.playing, s.cells[1]); assert.equal(s.cells[1].startedAt, 700, 'the next starts the moment the previous ends');
  s.advance(1399); assert.equal(s.playing, s.cells[1]);
  s.advance(1400); assert.equal(s.playing, s.cells[2]); assert.equal(s.cells[2].startedAt, 1400);
  s.advance(2100); assert.equal(s.playing, null); assert.equal(s.pendingCount, 0);
  // a late wake-up (hidden tab) still starts each flash at the previous end, never overlapping
  s.fire([mark(3), mark(4)], 5000); s.advance(5700); assert.equal(s.cells[4].startedAt, 5700);
});

test('debounce: one pending flash per card; extra firings are dropped, never queued; the queue never exceeds the mounted cards', () => {
  const s = ready(six());
  s.fire([mark(2)], 0); // card 2 is flashing
  for (let i = 0; i < 20; i++) s.fire([mark(2)], 10 + i);
  assert.equal(s.pendingCount, 0, 'firing again while its own flash plays adds nothing');
  s.fire([mark(4), mark(3), mark(4), mark(4), mark(3)], 100);
  assert.deepEqual(s.pending.map(c => c.slot), [4, 3], 'order = the order the cards first became pending; repeats dropped');
  for (let i = 0; i < 500; i++) s.fire([mark(i % 6)], 200 + i);
  assert.ok(s.pendingCount + 1 <= s.cells.length, 'at most one flash per mounted card, whatever fires');
  const order = []; let t = 700; while (s.playing || s.pendingCount) { s.advance(t); if (s.playing && order.at(-1) !== s.playing.slot) order.push(s.playing.slot); t += 700; if (t > 20000) break; }
  assert.deepEqual(order.slice(0, 2), [4, 3]); assert.equal(order.length, new Set(order).size, 'each card flashed once in the catch-up');
  assert.ok(t <= 700 * (s.cells.length + 2), 'the display catches up within about six flashes (4 s)');
  // once its flash has finished, a later firing queues the card again
  const r = ready(six()); r.fire([mark(1)], 0); r.advance(700); r.fire([mark(1)], 800); assert.equal(r.playing, r.cells[1]); assert.equal(r.cells[1].startedAt, 800);
});

test('passive and spent cards never enter the queue; an Inscription on an empty slot is not shown', () => {
  const rt = runtime([passiveDef, chargedDef, null, common], [null, null, {id: 'gilded'}, {id: 'gilded'}]);
  const s = ready(rt, {cardCharges: {c1: 0}});
  s.fire([mark(0), mark(1), mark(2, 'bar')], 5);
  assert.equal(s.pendingCount, 0); assert.equal(s.playing, null); assert.deepEqual(s.cells.map(c => c.fireSerial), [0, 0, 0]);
  s.fire([mark(3, 'bar')], 10); assert.equal(s.playing, s.cells[2], 'an Inscription acting flashes the card in that slot');
});

test('the same mark is never counted twice; a snapshot delivers marks the listener missed', () => {
  const s = ready(six());
  const m = mark(0); s.fire([m], 0); s.advance(700); s.fire([m], 800); assert.equal(s.playing, null);
  s.sync(snap(six(), {cardFires: [m, mark(1)]}), 900); assert.equal(s.playing, s.cells[1]);
});

test('Passive cards stay a steady teal: no serials, colour never changes while other cards flash', () => {
  const rt = runtime([passiveDef, common]);
  const s = ready(rt);
  s.fire([mark(0), mark(1)], 0); s.advance(700);
  assert.equal(s.cells[0].fireSerial, 0); assert.equal(baseColor(s.cells[0]), STRIP_COLORS.passive); assert.equal(s.cells[0].lit, false);
});

test('a card that leaves the Chain takes its pending flash with it', () => {
  const s = ready(six());
  s.fire([mark(0), mark(1), mark(2)], 0);
  s.sync(snap(runtime([common, common])), 100); // cards 2..5 removed in a paused edit
  assert.equal(s.cells.length, 2); assert.deepEqual(s.pending.map(c => c.slot), [1]);
});

test('idle fade: counted from the moment the queue is empty; a firing brings it back at once; pause and resume show it full', () => {
  const rt = runtime([common]);
  const s = ready(rt);
  assert.equal(STRIP.idleOpacity, 0.12); assert.equal(STRIP.fadeMs, 600); assert.equal(STRIP.idleMs, 3000);
  s.sync(snap(rt), STRIP.idleMs - 1); assert.equal(s.faded, false); s.sync(snap(rt), STRIP.idleMs); assert.equal(s.faded, true);
  s.fire([mark(0)], 4000); assert.equal(s.faded, false);
  s.sync(snap(rt), 6000); assert.equal(s.faded, false, 'never fades while a flash plays');
  s.sync(snap(rt), 4700 + 2999); assert.equal(s.faded, false, 'the 3 s start when the queue went empty (4700)');
  s.sync(snap(rt), 4700 + 3000); assert.equal(s.faded, true);
  s.sync(snap(rt, {paused: true}), 9000); assert.equal(s.faded, false);
  s.sync(snap(rt), 20000); assert.equal(s.faded, false, 'resuming starts a fresh 3 s');
  s.sync(snap(rt), 23000); assert.equal(s.faded, true);
});

test('real receipts: trigger cards, Repeat, Boost and Inscriptions all raise marks on the right slots', () => {
  const rt = createCardExecution({cards: ['body-spark', 'crescendo', 'echo-iii'].map((id, i) => ({cardId: id, instanceId: `r${i}`})), inscriptions: [{id: 'twin-mark'}, null, {id: 'gilded'}]});
  const receipt = resolveCardRow(rt, {kind: CARD_ROW_EVENTS.body});
  const marks = collectReceiptFires(receipt, rt.inscriptions);
  assert.ok(marks.some(m => m.slot === 0 && m.kind === 'fire'), 'the Collect card fires');
  assert.ok(marks.some(m => m.slot === 0 && m.double), 'Twin Mark gives a second firing, shown as a double flash');
  assert.ok(marks.some(m => m.slot === 0 && m.kind === 'bar'), 'Twin Mark flashes its bar');
  assert.ok(marks.some(m => m.slot === 1 && m.kind === 'boost'), 'a Boost flashes when it boosts');
});

test('engine log entries and appended marks reach the strip in order', () => {
  assert.deepEqual(engineFire({k: 'fired', slot: 2}), {slot: 2, kind: 'fire', double: false});
  assert.equal(engineFire({k: 'hit', slot: 1, times: 2}).double, true);
  assert.equal(engineFire({k: 'stop', slot: 1}), null); assert.equal(engineFire({k: 'fired', slot: -1}), null);
  const e = {cardFires: [], cardFireSeq: 0, cardFireListener: null}, heard = [];
  e.cardFireListener = list => heard.push(...list);
  appendFires(e, [{slot: 0, kind: 'fire'}, {slot: 1, kind: 'bar'}]);
  assert.deepEqual(e.cardFires.map(m => m.seq), [1, 2]); assert.deepEqual(heard.map(m => m.seq), [1, 2]);
  for (let i = 0; i < 80; i++) appendFires(e, [{slot: 0, kind: 'fire'}]);
  assert.equal(e.cardFires.length, STRIP.maxMarks, 'the log is bounded');
  appendFires({}, [{slot: 0, kind: 'fire'}]); // a bare host never throws
});
function fakeDom() {
  const log = [], timers = [];
  const node = name => ({name, dataset: {}, children: [], hidden: false, style: {setProperty() {}, removeProperty() {}}, classList: {add: c => log.push(['add', name, c]), remove: c => log.push(['remove', name, c])},
    append(...n) { this.children.push(...n); }, addEventListener() {}, remove() {}, setAttribute() {}, animate(frames, opts) { log.push(['animate', name, frames, opts]); }});
  const doc = {createElement: tag => node(tag)};
  const setTimer = (fn, ms) => { timers.push({fn, ms}); return timers.length; };
  return {log, timers, setTimer, clearTimer() {}, root: {ownerDocument: doc, style: {setProperty() {}, removeProperty() {}}, querySelector: () => null, append() {}}};
}

test('view: a flash is white fill + beat + echo frame, 0.7 s each, transform and opacity only', () => {
  const rt = runtime([common, common]);
  let t = 0; const {log, root, setTimer, clearTimer} = fakeDom();
  const view = createCardRowFeedback(root, {now: () => t, setTimer, clearTimer});
  view.update(snap(rt)); log.length = 0;
  view.update(snap(rt, {cardFires: [mark(0)]}));
  const anims = log.filter(x => x[0] === 'animate');
  assert.equal(anims.length, 3, 'single echo: fill, beat, one echo');
  for (const a of anims) {
    assert.equal(a[3].duration, 700);
    for (const f of a[2]) assert.deepEqual(Object.keys(f).filter(k => k !== 'offset' && k !== 'easing'), Object.keys(f).includes('transform') ? Object.keys(f).filter(k => k !== 'offset' && k !== 'easing' && ['transform', 'opacity'].includes(k)) : ['opacity']);
  }
  const fill = anims.find(a => a[1] === 'i' && a[2].every(f => 'opacity' in f && !('transform' in f)));
  assert.equal(fill[2][0].opacity, 1); assert.equal(fill[2].at(-1).opacity, 0); assert.ok(fill[2].some(f => f.offset > 0.3 && f.offset < 0.4 && f.opacity === 1), 'white held for about the first third');
  const echo = anims.find(a => a[2][0].transform === 'scale(1)' && a[2][0].opacity === .7);
  assert.equal(echo[2].at(-1).opacity, 0); const end = Number(/scale\(([\d.]+)\)/.exec(echo[2].at(-1).transform)[1]); assert.ok(end >= 2 && end <= 2.5);
  const beatA = anims.find(a => a[2].some(f => f.transform === 'scale(1.15)')); assert.ok(beatA, 'a small beat, no shake'); assert.ok(!anims.some(a => a[2].some(f => /translate|rotate/.test(f.transform || ''))));
});

test('view: two flashes in a row play one after another off a single timer, the next starting when the first ends', () => {
  const rt = runtime([common, common, common]);
  let t = 0; const {log, root, setTimer, clearTimer, timers} = fakeDom();
  const view = createCardRowFeedback(root, {now: () => t, setTimer, clearTimer});
  view.update(snap(rt)); log.length = 0;
  view.update(snap(rt, {cardFires: [mark(0), mark(1), mark(2)]}));
  assert.equal(log.filter(x => x[0] === 'animate').length, 3, 'only the first card animates now');
  assert.equal(timers.length, 1); assert.ok(timers[0].ms >= 700 && timers[0].ms <= 702);
  log.length = 0; t = 701; timers.pop().fn();
  assert.equal(log.filter(x => x[0] === 'animate').length, 3, 'the second card starts when the first ends');
  assert.equal(view.strip.playing, view.strip.cells[1]); assert.equal(timers.length, 1);
});

test('view with reduced motion: solid white for the whole 0.7 s, no echo, no scale', () => {
  const rt = runtime([common, common]);
  let t = 0; const {log, root, setTimer, clearTimer, timers} = fakeDom();
  const view = createCardRowFeedback(root, {now: () => t, reducedMotion: true, setTimer, clearTimer});
  view.update(snap(rt)); log.length = 0;
  view.update(snap(rt, {cardFires: [mark(0), mark(1)]}));
  assert.equal(log.some(x => x[0] === 'animate'), false);
  assert.deepEqual(log.filter(x => x[0] !== 'animate').map(x => [x[0], x[2]]), [['add', 'chain-lit']]);
  log.length = 0; t = 701; timers.pop().fn();
  assert.deepEqual(log.map(x => [x[0], x[2]]), [['remove', 'chain-lit'], ['add', 'chain-lit']], 'white ends, the next card turns white at the same moment');
});

test('FPS meter averages a window (about twice a second), ignores pauses, and the counter writes text only when the value changes', () => {
  const m = createFpsMeter();
  let out = null; for (let t = 1000; t <= 1520; t += 16.67) out = m.frame(t) ?? out;
  assert.ok(out >= 58 && out <= 62, `60 fps window, got ${out}`);
  assert.equal(m.frame(9000), null, 'after a long gap the window restarts instead of reporting a false number');
  let writes = 0; const node = {set textContent(v) { writes++; }, setAttribute() {}, remove() {}};
  const doc = {createElement: () => node}; const root = {ownerDocument: doc, querySelector: () => null, append() {}};
  const c = createFpsCounter(root, {enabled: true});
  for (let t = 0; t <= 3000; t += 16.67) c.frame(t);
  assert.ok(writes <= 2, `steady 60 fps writes the text once or twice, wrote ${writes}`);
  c.setEnabled(false); const before = writes; for (let t = 4000; t <= 5000; t += 16.67) c.frame(t);
  assert.equal(writes, before); assert.equal(node.hidden, true);
});

test('Show FPS defaults on, persists, and off sticks', () => {
  const store = new Map(); const storage = {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v)};
  assert.equal(loadShowFps(storage), true);
  saveShowFps(false, storage); assert.equal(store.get(FPS_KEY), 'off'); assert.equal(loadShowFps(storage), false);
  saveShowFps(true, storage); assert.equal(loadShowFps(storage), true);
  assert.equal(loadShowFps({getItem() { throw new Error('blocked'); }}), true, 'blocked storage keeps the default');
});

test('Mirror and Lodestone flash their own bar (receipt marks)', () => {
  const lift = defs.find(d => d.id === 'downbeat');
  const mirror = createCardExecution({cards: ['body-spark', 'downbeat'].map((id, i) => ({cardId: id, instanceId: `m${i}`})), inscriptions: [null, {id: 'mirror'}]});
  const marks = collectReceiptFires(resolveCardRow(mirror, {kind: CARD_ROW_EVENTS.body}), mirror.inscriptions);
  assert.ok(lift, 'a Lift card exists to be mirrored');
  assert.ok(marks.some(m => m.slot === 1 && m.kind === 'fire'), 'the mirrored card fires');
  assert.ok(marks.some(m => m.slot === 1 && m.kind === 'bar'), 'Mirror flashes the bar of the slot that carries it');
  const lode = createCardExecution({cards: ['body-spark', 'crescendo'].map((id, i) => ({cardId: id, instanceId: `l${i}`})), inscriptions: [null, {id: 'lodestone'}]});
  const lm = collectReceiptFires(resolveCardRow(lode, {kind: CARD_ROW_EVENTS.body}), lode.inscriptions);
  assert.ok(lm.some(m => m.slot === 1 && m.kind === 'bar'), 'Lodestone flashes when its neighbour gains the +1');
  assert.ok(!lm.some(m => m.slot === 0 && m.kind === 'bar'), 'only the Lodestone slot flashes');
  assert.deepEqual(engineBars({k: 'gain', slot: 0, lodestoneSlots: [1]}), [{slot: 1, kind: 'bar'}], 'engine cards report it too');
  assert.equal(engineBars({k: 'gain', slot: 0}), null);
});

test('temporary Inscriptions flash their bar when the effect triggers', async () => {
  const {FlightBoon} = await import('../dist/flight-boons.mjs');
  const {WispFlight} = await import('../dist/flight.mjs');
  const acted = [], host = {cardExecution: {inscriptions: [null, {id: 'mending', temporary: true}, {id: 'hollow-feather', temporary: true}]}};
  const engine = Object.assign(host, {flame: 0, maxFlame: 100, flameRestored: 0, setEvent() {}, mod: {flightBoons: ['spark-trail'], eventFavors: ['feather']},
    inscriptionActed: id => acted.push(id)});
  const boon = new FlightBoon(engine, null);
  assert.ok(boon.tryReserve() > 0); assert.deepEqual(acted, ['mending']);
  assert.equal(boon.spendLift(10), 0); assert.deepEqual(acted, ['mending', 'hollow-feather']);
  // The flight turns the report into a bar mark on the slot carrying that Inscription.
  const e = {cardExecution: host.cardExecution, cardFires: []};
  WispFlight.prototype.inscriptionActed.call(e, 'hollow-feather');
  WispFlight.prototype.inscriptionActed.call(e, 'not-carried');
  assert.deepEqual(e.cardFires.map(m => [m.slot, m.kind]), [[2, 'bar']]);
});
