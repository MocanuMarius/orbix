import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS, resolveCardRow, createCardExecution, CARD_ROW_EVENTS} from '../dist/skill-cards.mjs';
import {STRIP, STRIP_COLORS, baseColor, chainView, collectReceiptFires, engineFire, appendFires, createChainStrip} from '../dist/chain-strip.mjs';
import {createFpsMeter, createFpsCounter, loadShowFps, saveShowFps, FPS_KEY} from '../dist/fps-counter.mjs';
import {createCardRowFeedback} from '../dist/card-row-feedback.mjs';

const defs = Object.values(SKILL_CARDS);
const byRarity = r => defs.find(d => d.rarity === r && !d.passive && d.kind !== 'capacity');
const passiveDef = defs.find(d => d.passive === true);
const chargedDef = defs.find(d => d.charges > 0 && !d.passive);
const mk = (def, i) => def ? {cardId: def.id, instanceId: `c${i}`} : null;
const runtime = (list, inscriptions = []) => ({cards: list.map(mk), inscriptions});
const snap = (rt, extra = {}) => ({cardChain: chainView(rt), cardCharges: {}, cardFires: [], ...extra});
const mark = (seq, slot, kind = 'fire', double = false) => ({seq, slot, kind, double});

test('a Chain slot is a solid shape coloured by state', () => {
  const rt = runtime([byRarity('common'), byRarity('rare'), byRarity('legendary'), passiveDef, chargedDef, null]);
  const s = createChainStrip();
  s.sync(snap(rt, {cardCharges: {c4: 0}}), 0);
  assert.deepEqual(s.slots.map(x => x.state), ['active', 'active', 'active', 'passive', 'spent', 'empty']);
  assert.equal(baseColor(s.slots[0]), STRIP_COLORS.common);
  assert.equal(baseColor(s.slots[1]), STRIP_COLORS.rare);
  assert.equal(baseColor(s.slots[2]), STRIP_COLORS.legendary);
  assert.equal(baseColor(s.slots[3]), STRIP_COLORS.passive);
  assert.equal(baseColor(s.slots[4]), STRIP_COLORS.spent);
  assert.equal(baseColor(s.slots[5]), STRIP_COLORS.empty);
  assert.equal(chainView(null), null);
});

test('firing snaps a slot to white (a serial the view animates back); repeats re-trigger; double flashes carry a flag', () => {
  const rt = runtime([byRarity('common'), byRarity('rare')]);
  const s = createChainStrip();
  s.sync(snap(rt), 0);
  assert.equal(s.fire([mark(1, 0)], 10), true);
  assert.equal(s.slots[0].fireSerial, 1); assert.equal(s.slots[0].double, false); assert.equal(s.slots[1].fireSerial, 0);
  s.fire([mark(2, 0)], 20); assert.equal(s.slots[0].fireSerial, 2);
  s.fire([mark(3, 1, 'fire', true)], 30); assert.equal(s.slots[1].fireSerial, 1); assert.equal(s.slots[1].double, true);
  s.fire([mark(3, 1)], 31); assert.equal(s.slots[1].fireSerial, 1, 'the same mark is never counted twice');
  s.sync(snap(rt, {cardFires: [mark(3, 1), mark(4, 0)]}), 40); assert.equal(s.slots[0].fireSerial, 3, 'a snapshot delivers marks the listener missed');
});

test('passive, spent and empty slots never flash', () => {
  const rt = runtime([passiveDef, chargedDef, null]);
  const s = createChainStrip(); s.sync(snap(rt, {cardCharges: {c1: 0}}), 0);
  assert.equal(s.fire([mark(1, 0), mark(2, 1), mark(3, 2)], 5), false);
  assert.deepEqual(s.slots.map(x => x.fireSerial), [0, 0, 0]);
});

test('an Inscription is a bar (dashed when temporary) that flashes only when the Inscription acts', () => {
  const rt = runtime([byRarity('common'), byRarity('common'), byRarity('common')], [{id: 'gilded'}, {id: 'x-temp', temporary: true, flightsLeft: 2}, null]);
  const s = createChainStrip(); s.sync(snap(rt), 0);
  assert.deepEqual(s.slots.map(x => x.bar), ['perm', 'temp', 'none']);
  s.fire([mark(1, 0, 'bar'), mark(2, 2, 'bar')], 5);
  assert.equal(s.slots[0].barSerial, 1); assert.equal(s.slots[0].fireSerial, 0, 'a bar flash is not a card flash');
  assert.equal(s.slots[2].barSerial, 0, 'a slot with no Inscription has no bar to flash');
});

test('idle fade: full for 3 s, then faded; a firing brings it back at once; pause and resume show it full again', () => {
  const rt = runtime([byRarity('common')]);
  const s = createChainStrip(); s.sync(snap(rt), 0);
  assert.equal(s.faded, false); s.sync(snap(rt), STRIP.idleMs - 1); assert.equal(s.faded, false);
  s.sync(snap(rt), STRIP.idleMs); assert.equal(s.faded, true);
  assert.equal(STRIP.idleOpacity, 0.12); assert.equal(STRIP.fadeMs, 600);
  s.fire([mark(1, 0)], 4000); assert.equal(s.faded, false);
  s.sync(snap(rt), 6999); assert.equal(s.faded, false); s.sync(snap(rt), 7000); assert.equal(s.faded, true);
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
  const log = [];
  const node = name => ({name, dataset: {}, children: [], hidden: false, style: {setProperty() {}}, classList: {add: c => log.push(['add', name, c]), remove() {}},
    append(...n) { this.children.push(...n); }, addEventListener() {}, remove() {}, setAttribute() {}, animate(frames, opts) { log.push(['animate', name, frames, opts]); }});
  const doc = {createElement: tag => node(tag)};
  return {log, root: {ownerDocument: doc, querySelector: () => null, append() {}}};
}

test('view: white to base over 450 ms, a double white for repeats, then the idle fade', () => {
  const rt = runtime([byRarity('common'), byRarity('common')]);
  let t = 0; const {log, root} = fakeDom();
  const view = createCardRowFeedback(root, {now: () => t});
  view.update(snap(rt)); log.length = 0;
  view.update(snap(rt, {cardFires: [mark(1, 0)]}));
  const flash = log.find(x => x[0] === 'animate');
  assert.equal(flash[2][0].backgroundColor, STRIP_COLORS.white); assert.equal(flash[2].at(-1).backgroundColor, STRIP_COLORS.common); assert.equal(flash[3].duration, STRIP.flashMs);
  log.length = 0; view.update(snap(rt, {cardFires: [mark(1, 0), mark(2, 1, 'fire', true)]}));
  const double = log.find(x => x[0] === 'animate'); assert.equal(double[2].filter(f => f.backgroundColor === STRIP_COLORS.white).length, 2);
  t = STRIP.idleMs + 10; view.update(snap(rt));
  assert.equal(view.strip.faded, true);
});

test('view with reduced motion: no animation, a white class for 200 ms', () => {
  const rt = runtime([byRarity('common')]);
  const {log, root} = fakeDom();
  const view = createCardRowFeedback(root, {now: () => 0, reducedMotion: true});
  view.update(snap(rt)); log.length = 0;
  view.update(snap(rt, {cardFires: [mark(1, 0)]}));
  assert.equal(log.some(x => x[0] === 'animate'), false);
  assert.ok(log.some(x => x[0] === 'add' && x[2] === 'chain-lit'));
  assert.equal(STRIP.reducedFlashMs, 200);
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
