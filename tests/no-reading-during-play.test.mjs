import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { newState, startTutorial, getRunModifiers } from '../dist/model.mjs';
import { WispFlight } from '../dist/flight.mjs';
import { getTutorialHint, tutorialEntryLesson, notePracticeHint, hasPracticeHint, takePracticeHint,
  carryPracticeHints, takeCarriedPracticeHint } from '../dist/tutorial.mjs';
import { nextPracticeLesson } from '../dist/practice-route.mjs';
import { deferPracticeLesson, FIRST_FLIGHT_STOPS } from '../dist/tutorial.mjs';
import { practiceLessonStep } from '../dist/practice-course.mjs';

// Rule: never require reading during active play. Hint text appears only while
// the simulation is stopped, and play resumes only through a player action.
const canvas = { style: {}, getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 900, height: 405 }) };
const source = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const slice = (from, to) => { const a = source.indexOf(from), b = source.indexOf(to, a); assert.ok(a >= 0 && b > a, `${from} exists`); return source.slice(a, b); };

// Edition 4 by default; edition 3 recreates an unfinished Edition 3 save (its hint queue).
function practiceFlight(row = 0, edition = 4) {
  const state = newState(); startTutorial(state, { edition });
  const r = state.run, node = r.map[row][0]; r.current = node;
  const e = new WispFlight({ canvas, preflight: true, node, duration: 24, flame: 100, companions: ['collector'], modifiers: getRunModifiers(r) });
  return { state, r, e };
}

// Run the production app.mjs wiring with stubbed UI side effects.
function appContext(engine, run) {
  const calls = [];
  const ctx = createContext({
    state: { run, settings: {} }, engine, paused: false, resumeArmed: true, lesson: null, calls,
    document: { querySelector: () => ({ innerHTML: 'Tap to begin' }) },
    requestAnimationFrame: () => {}, persist: () => calls.push('persist'), stopCountdown: () => {},
    automaticTipsEnabled: () => true, guideScreen: () => {},
    pauseFlight() { calls.push('pause'); ctx.paused = true; engine.paused = true; },
    resumeFlight(options) { calls.push(['resume', options || {}]); },
    startLesson(key, steps, done) { calls.push(['lesson', key]); ctx.lesson = { key, steps, done }; },
    hasPracticeHint, takePracticeHint,
  });
  runInContext(slice('function showEntryHint(', 'function wakeFlight('), ctx);
  // let-bound flags live on the context so the snippets can read and write them.
  runInContext('var paused=globalThis.paused,resumeArmed=globalThis.resumeArmed,lesson=null;', ctx);
  return ctx;
}

test('the entry hint is a paused coach card with its own focused Got it button', () => {
  const { r, e } = practiceFlight();
  try {
    assert.equal(e.tutorialAwaitingLift, true);
    const step = tutorialEntryLesson(e, r);
    // Edition 4: the entry lesson teaches Lift and glide only; the cost waits for the Sparks lesson.
    assert.equal(step.id, 'practice:lift'); assert.equal(step.title, 'Lift and glide');
    assert.equal(getTutorialHint(e), null, 'Edition 4 has no live or queued hint text');
    assert.equal(step.actionLabel, 'Got it');
    assert.equal(step.skipLabel, false, 'no second button competes with Got it');
    assert.equal(step.focusAction, true, 'the Got it button takes focus when the hint opens');
    assert.equal(step.teachesLift, true);
    assert.ok(practiceLessonStep('practice:sparks', { engine: e }).text.endsWith(`Each Lift costs ${Math.round(e.flapCost * .3)} Sparks.`), 'the Lift cost comes from the live Lift cost');
    assert.equal(tutorialEntryLesson(e, { ...r, guideSeen: { [step.id]: true } }), null, 'shown once per lesson');
    assert.equal(tutorialEntryLesson(e, { ...r, guideSkipped: true }), null);
  } finally { e.destroy(); }
});

test('while the entry hint is open the flight stays frozen; only Got it opens the normal gate', () => {
  const { r, e } = practiceFlight();
  try {
    const ctx = appContext(e, r), step = tutorialEntryLesson(e, r);
    ctx.showEntryHint(e, step);
    assert.equal(runInContext('paused', ctx), true, 'Lift handlers are blocked while paused');
    assert.equal(runInContext('resumeArmed', ctx), false, 'no Tap to begin gate is armed under the hint');
    assert.equal(ctx.calls.some(c => c[0] === 'resume'), false, 'nothing resumes before Got it');
    // A Lift attempt against the paused engine neither starts play nor spends Sparks.
    e.running = true; e.paused = true; const before = e.flame;
    assert.equal(e.flap(), false); assert.equal(e.flame, before); assert.equal(e.tutorialAwaitingLift, true);
    ctx.lesson.done();
    assert.deepEqual(plain(ctx.calls.find(c => c[0] === 'resume')), ['resume', { waitForTap: true }], 'Got it leads to the ordinary gate');
    assert.equal(r.guideSeen['practice:lift'], true);
  } finally { e.destroy(); }
});

test('Edition 3 save: the redundant Lift coach card is skipped once the entry hint taught Lift', () => {
  const { r, e } = practiceFlight(0, 3);
  try {
    e.tutorialAwaitingLift = false; e.time = 2;
    assert.equal(nextPracticeLesson(e, r).id, 'practice:lift', 'baseline: Lift card would show at 1.2 s');
    const ctx = appContext(e, r); e.tutorialAwaitingLift = true;
    ctx.showEntryHint(e, tutorialEntryLesson(e, r)); ctx.lesson.done();
    e.tutorialAwaitingLift = false;
    assert.notEqual(nextPracticeLesson(e, r)?.id, 'practice:lift');
  } finally { e.destroy(); }
});

test('practice hints never render live; they pause safely, queue when unsafe and resume by countdown', () => {
  // The first (glide) flight defers its hints to the checkpoint, so use the proximity flight.
  assert.equal(/tutorial-hint[^;]*hidden\s*=\s*false/.test(source) || source.includes('hint.hidden=false'), false,
    'the live hint panel is never un-hidden');
  // Edition 4 queues nothing: its courses produce no hint text at all.
  { const { r, e } = practiceFlight(2); e.tutorialAwaitingLift = false; e.running = true; e.time = 5;
    assert.equal(notePracticeHint(e, r, getTutorialHint(e)), false); assert.equal(hasPracticeHint(e, r), false); e.destroy(); }
  // The queue below belongs to unfinished Edition 3 saves.
  const { r, e } = practiceFlight(2, 3);
  try {
    e.tutorialAwaitingLift = false; e.running = true; e.paused = false; e.time = 5;
    const hint = getTutorialHint(e);
    assert.ok(notePracticeHint(e, r, hint)); assert.equal(notePracticeHint(e, r, hint), false, 'queued once');
    assert.equal(notePracticeHint(e, r, { id: 'launch' }), false); assert.equal(notePracticeHint(e, r, { id: 'last-spark' }), false);
    const ctx = appContext(e, r);
    e.canShowContextHint = () => false;
    assert.equal(ctx.practiceHintLesson(), false); assert.equal(ctx.calls.length, 0, 'unsafe: nothing pauses and nothing shows');
    assert.ok(hasPracticeHint(e, r), 'the hint stays queued');
    e.canShowContextHint = () => true;
    assert.equal(ctx.practiceHintLesson(), true);
    assert.deepEqual(plain(ctx.calls.slice(0, 2)), ['pause', ['lesson', `practice-hint:${hint.id}`]], 'pause comes before the text');
    assert.equal(ctx.lesson.steps[0].actionLabel, 'Continue');
    ctx.lesson.done();
    assert.deepEqual(plain(ctx.calls.at(-1)), ['resume', {}], 'Continue resumes through the countdown, not a live start');
  } finally { e.destroy(); }
});

test('hints left without a safe pause wait for the next checkpoint and are taught once', () => {
  const { r, e } = practiceFlight(0, 3);
  try {
    e.tutorialAwaitingLift = false;
    notePracticeHint(e, r, { id: 'glide-ready', title: 'Small Lifts, long glides', text: 'Time your last Lift.' });
    notePracticeHint(e, r, { id: 'exit', title: 'Reach the refuge light', text: 'Fly to the waylight.' });
    carryPracticeHints(e, r);
    assert.equal(hasPracticeHint(e, r), false);
    const step = takeCarriedPracticeHint(r);
    assert.equal(step.id, 'practice-hint:glide-ready');
    assert.equal(takeCarriedPracticeHint(r), null, 'the exit hint is dropped once its flight is over');
    r.guideSeen = { ...r.guideSeen, 'practice-hint:glide-ready': true };
    assert.equal(notePracticeHint(e, r, { id: 'glide-ready', title: 'x', text: 'y' }), false, 'a taught hint never returns');
  } finally { e.destroy(); }
});

test('Edition 3 save: one stop per topic, the first flight keeps only the Sparks, Collector and Luminance coach cards', () => {
  const { r, e } = practiceFlight(0, 3);
  try {
    e.tutorialAwaitingLift = false; e.running = true; e.paused = false; e.time = 5;
    for (const id of ['direct', 'carrier', 'luminance'])
      assert.equal(notePracticeHint(e, r, { id, title: id, text: id }), false, `${id} repeats a coach lesson`);
    assert.ok(notePracticeHint(e, r, { id: 'glide-ready', title: 'Small Lifts', text: 'Glide.' }));
    assert.equal(hasPracticeHint(e, r), false, 'first-flight hints never stop the flight');
    assert.equal(takePracticeHint(e, r), null);
    assert.deepEqual([...FIRST_FLIGHT_STOPS], ['practice:sparks', 'practice:collector', 'practice:luminance']);
    const packing = { id: 'practice:packing', title: 'Surplus becomes Stored Sparks', text: 'Overfill.' };
    assert.ok(deferPracticeLesson(r, packing)); assert.equal(deferPracticeLesson(r, packing), false);
    carryPracticeHints(e, r);
    const first = takeCarriedPracticeHint(r), second = takeCarriedPracticeHint(r);
    assert.deepEqual([first.id, second.id], ['practice:packing', 'practice-hint:glide-ready'], 'other cards wait for the checkpoint');
    assert.ok(source.includes("lesson==='glide'&&step.id!==FIRST_LIGHT_COMBO&&!FIRST_FLIGHT_STOPS.has(step.id)){if(deferPracticeLesson"), 'the app defers other first-flight coach lessons');
  } finally { e.destroy(); }
});
