// Inscriptions on Chain slots (docs/inscriptions.md): catalogue, each rule in its condition and not otherwise, slot-bound
// behaviour, the Scribe flow and old-save loading.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {makeSkillCard, createCardExecution, resolveCardRow, getCardModifiers, CARD_UNIT} from '../dist/skill-cards.mjs';
import {CardEngine} from '../dist/card-engine.mjs';
import {stepFlightInscriptions} from '../dist/card-engine-flight.mjs';
import {INSCRIPTIONS, INSCRIPTION_IDS, CHEST_INSCRIPTION_IDS, cleanSlotInscriptions, writeInscription, offerInscriptions, getInscription} from '../dist/inscriptions.mjs';
import {applyInscriptionSlots} from '../dist/card-inspector.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';

const row = ids => ids.map((id, i) => id ? makeSkillCard(id, `i${i}`) : null);
const ins = (...ids) => ids.map(id => id ? {id} : null);
const BODY = {kind: 'body-spark', pickupKind: 'light', meterFraction: 0.1, firstCrossing: true};
const WAVE = {kind: 'wave-crossing', pickupKind: 'light', meterFraction: 0.1, firstCrossing: true};
const fire = (cards, inscriptions, event = BODY) => resolveCardRow(createCardExecution({cards: row(cards), inscriptions: ins(...inscriptions)}), event);
const sparks = (...args) => fire(...args).sparks;
const BS = sparks(['body-spark'], []);
const canvas = {getContext: () => ({setTransform() {}}), getBoundingClientRect: () => ({width: 900, height: 430})};

function cardState(seed = 'ins', mounted = ['body-spark', null, null]) {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, seed, 1, {cards: true});
  M.chooseStartingGift(state, M.getStartingGiftOffers(run)[0].id);
  run.cardSlots = 3; run.mountedCards = row(mounted); cleanSlotInscriptions(run);
  return state;
}

test('catalogue: 18 Inscriptions, two kinds, texts within 12 words', () => {
  assert.equal(INSCRIPTION_IDS.length, 18);
  for (const id of INSCRIPTION_IDS) {
    const item = INSCRIPTIONS[id];
    assert.ok(['card', 'standalone'].includes(item.kind), id);
    assert.ok(item.text.split(/\s+/).length <= 12, `${id}: ${item.text}`);
    assert.ok(item.name && item.glyph, id);
  }
  assert.ok(INSCRIPTION_IDS.filter(id => INSCRIPTIONS[id].kind === 'card').length >= 9);
  assert.ok(INSCRIPTION_IDS.filter(id => INSCRIPTIONS[id].kind === 'standalone').length >= 7);
});

test('Twin Mark: the card here fires twice; an empty slot does nothing; Repeat to the left repeats the twice', () => {
  assert.equal(BS, 2);
  assert.equal(sparks(['body-spark'], ['twin-mark']), 2 * BS);
  assert.equal(sparks(['body-spark', null], [null, 'twin-mark']), BS, 'inscribed empty slot');
  assert.equal(sparks(['echo', 'body-spark'], [null, 'twin-mark']), 4 * BS, 'Echo repeats the modified firing');
});

test('Gilded: +2 Sparks each firing, a Boost to the right sees it, nothing on an empty slot', () => {
  assert.equal(sparks(['body-spark'], ['gilded']), BS + 2);
  assert.equal(sparks(['body-spark'], ['gilded'], WAVE), 0, 'the card does not fire on a Pulse');
  assert.equal(sparks(['body-spark', null], [null, 'gilded']), BS);
  assert.equal(sparks(['body-spark', 'prism-lens'], ['gilded', null]), Math.ceil((BS + 2) * 1.25 - 1e-9), 'Boost multiplies it, rounded up');
});

test('also-fires Inscriptions: the card here answers one more Trigger, and not an unrelated one', () => {
  const cases = [['resonant', 'wave-crossing'], ['kindled', 'downbeat-lift'], ['courier', 'collector-delivery'], ['wellspring', 'natural-overfill'], ['flare', 'flash-pickup']];
  for (const [id, kind] of cases) {
    const event = {kind, pickupKind: 'light', meterFraction: 0.1};
    assert.equal(sparks(['body-spark'], [id], event), id === 'wellspring' ? 3 * BS : BS, `${id} on ${kind} (Wellspring fires 3 times per Overfill)`);
    assert.equal(sparks(['body-spark'], [], event), 0, `${id}: not without it`);
    assert.equal(sparks(['body-spark', null], [null, id], event), 0, `${id}: empty slot`);
    const other = cases.find(([, k]) => k !== kind)[1];
    assert.equal(sparks(['body-spark'], [id], {kind: other, pickupKind: 'light', meterFraction: 0.1}), 0, `${id}: not on ${other}`);
    assert.equal(sparks(['body-spark'], [id]), BS, `${id}: still answers its own Collect`);
  }
});

test('Mirror: fires whenever the card to its left fires, not when the left card does not', () => {
  assert.equal(sparks(['harvest-common', 'body-spark'], [null, 'mirror'], WAVE), sparks(['harvest-common'], [], WAVE) + BS);
  assert.equal(sparks(['harvest-common', 'body-spark'], [], WAVE), sparks(['harvest-common'], [], WAVE));
  assert.equal(sparks(['body-spark', 'body-spark'], [null, 'mirror'], WAVE), 0, 'the left card did not fire');
});

test('Brimful: reports the Sparks of the card here so the flight can store what the Meter cannot hold', () => {
  assert.equal(fire(['body-spark'], ['brimful']).brimful, BS);
  assert.equal(fire(['body-spark'], []).brimful, 0);
  const e = new WispFlight({canvas, preflight: true, seed: 'brim',
    modifiers: {cardPilot: true, cardExecution: {cards: row(['body-spark']), inscriptions: ins('brimful')}}});
  e.running = true; e.flame = e.maxFlame - CARD_UNIT; // room for one Spark of the two
  const stored = e.resonanceStored;
  e.resolveCardRowEvent('body-spark', {pickupKind: 'light'});
  assert.equal(e.resonanceStored - stored, 2, 'one spilled Spark becomes 2 Stored Sparks');
});

test('Whetted: the card here starts each flight with one extra use, kept by the slot not the card', () => {
  const run = cardState('whet', ['spark-cache', null, null]).run;
  const base = getCardModifiers(run).cardExecution.cards[0].charges;
  writeInscription(run, 0, 'whetted');
  assert.equal(getCardModifiers(run).cardExecution.cards[0].charges, base + 2);
  assert.equal(run.mountedCards[0].charges, base, 'the run card is untouched');
  run.mountedCards[0] = makeSkillCard('body-spark', 'swap'); // a card without uses
  assert.equal(getCardModifiers(run).cardExecution.cards[0].charges, undefined);
});

test('Hollow: standalone, only while the slot is empty, only on Collect', () => {
  assert.equal(sparks(['body-spark', null], [null, 'hollow']), BS + 2);
  assert.equal(sparks(['body-spark', 'body-spark'], [null, 'hollow']), 2 * BS, 'slot filled: nothing');
  assert.equal(sparks(['body-spark', null], [null, 'hollow'], WAVE), 0);
  assert.equal(sparks([null, null], ['hollow', 'hollow']), 4, 'works with no card at all');
  const e = new WispFlight({canvas, preflight: true, seed: 'hollow',
    modifiers: {cardPilot: true, cardExecution: {cards: row([null, null, null]), inscriptions: ins('hollow')}}});
  e.running = true; e.flame = 0;
  assert.ok(e.cardExecution, 'a flight keeps the execution for a Chain with only Inscriptions');
});

test('Lodestone: the cards on both sides gain +1 each firing; works on an empty slot; not the stone slot itself', () => {
  assert.equal(sparks(['body-spark', null, 'body-spark'], [null, 'lodestone', null]), 2 * BS + 2);
  assert.equal(sparks(['body-spark', null, 'body-spark'], []), 2 * BS);
  assert.equal(sparks(['body-spark', 'body-spark', 'body-spark'], [null, 'lodestone', null]), 3 * BS + 2, 'the stone slot card gains nothing');
  assert.equal(sparks(['body-spark', null, 'body-spark'], [null, 'lodestone', null], WAVE), 0);
});

test('Ember Bed: at Finish, 5 Stored Sparks plus 2 per empty slot; nothing on other events', () => {
  const clear = {kind: 'flight-clear', carriedStored: 0, cruisingSpeedRoom: 6};
  assert.equal(fire(['body-spark', null, null], [null, 'ember-bed'], clear).stored, 9);
  assert.equal(fire(['body-spark', 'body-spark', 'body-spark'], [null, 'ember-bed'], clear).stored, 5);
  assert.equal(fire(['body-spark', null, null], [null, 'ember-bed']).stored, 0);
  assert.equal(fire(['body-spark', null, null], [], clear).stored, 0);
});

test('Hearth, Lantern, Long Cord, Cinder: standalone modifiers on any slot, empty or not', () => {
  const run = cardState('mods', [null, null, null]).run, plain = getCardModifiers(run), baseCap = getGlowCapacity(run), baseRun = M.getRunModifiers(run);
  writeInscription(run, 1, 'hearth'); writeInscription(run, 0, 'lantern'); writeInscription(run, 2, 'long-cord');
  assert.ok(Math.abs(getGlowCapacity(run) - Math.min(1000 / 3, baseCap + 10 / 0.3)) < 1e-6);
  assert.equal(getCardModifiers(run).cardLuminancePercent, plain.cardLuminancePercent + 25);
  assert.ok(Math.abs(M.getRunModifiers(run).attract - baseRun.attract * 1.3) < 1e-9);
  writeInscription(run, 2, 'cinder');
  assert.equal(M.getRunModifiers(run).liftCostPoints, Math.max(1, baseRun.liftCostPoints - 1));
});

test('Bell: a Pulse every 6 seconds of flight time, only with a Bell on a slot', () => {
  const pulses = [];
  const e = {running: true, paused: false, alive: true, time: 0, radiateLight: () => pulses.push(e.time),
    cardExecution: {inscriptions: ins(null, 'bell')}};
  for (let t = 0; t <= 20; t += 0.5) { e.time = t; stepFlightInscriptions(e); }
  assert.deepEqual(pulses, [6, 12, 18]);
  const quiet = {running: true, paused: false, alive: true, time: 0, radiateLight: () => assert.fail('no Bell'), cardExecution: {inscriptions: ins('gilded')}};
  for (let t = 0; t <= 20; t += 0.5) { quiet.time = t; stepFlightInscriptions(quiet); }
});

test('engine cards: Twin Mark doubles a gain card, Gilded adds 2 to it', () => {
  const gain = inscriptions => { const engine = new CardEngine({cards: row(['spark-chime']), inscriptions: ins(...inscriptions)}, {}); engine.queue.push({type: 'pulse', to: 0, from: -1, mask: 0, turn: 0}); engine.flush(); return engine.sparks; };
  const base = gain([]);
  assert.ok(base > 0);
  assert.equal(gain(['twin-mark']), 2 * base);
  assert.equal(gain(['gilded']), base + 2);
});

test('an Inscription stays on its slot: moving, swapping, melting and unequipping cards never move it', () => {
  const state = cardState('stay', ['body-spark', 'spark-cache', null]), run = state.run;
  writeInscription(run, 0, 'gilded');
  assert.ok(M.moveMountedCard(run, 0, 1));
  assert.deepEqual(run.slotInscriptions.map(x => x?.id || null), ['gilded', null, null], 'the card moved, the mark did not');
  assert.equal(sparks(['spark-cache', 'body-spark', null], ['gilded']), sparks(['spark-cache', 'body-spark', null], []) + 2, 'the card now in slot 0 is the gilded one');
  assert.ok(M.unequipMountedCard(run, 0));
  assert.equal(run.slotInscriptions[0].id, 'gilded');
  assert.equal(sparks([null, 'body-spark'], ['gilded']), BS, 'empty: card-modifying does nothing');
  assert.equal(sparks(['spark-cache', 'body-spark'], ['gilded']), sparks(['spark-cache', 'body-spark'], []) + 2, 'the next card placed there gets it');
  M.meltMountedCard(state, 1);
  assert.equal(run.slotInscriptions[0].id, 'gilded');
});

test('slots grow with the Chain and the array stays aligned; writing replaces', () => {
  const run = cardState('grow', ['body-spark', null, null]).run;
  assert.equal(run.slotInscriptions.length, 3);
  assert.equal(writeInscription(run, 1, 'mirror'), null);
  assert.equal(writeInscription(run, 1, 'hollow'), 'mirror', 'returns what it replaced');
  assert.equal(run.slotInscriptions[1].id, 'hollow');
  assert.equal(writeInscription(run, 9, 'hollow'), false);
  assert.equal(writeInscription(run, 0, 'nonsense'), false);
  run.cardSlots = 4; run.mountedCards.push(null); cleanSlotInscriptions(run);
  assert.equal(run.slotInscriptions.length, 4);
});

test('dev parameter: slots=0:gilded,2:hollow writes slots and ignores junk', () => {
  const run = cardState('dev').run;
  applyInscriptionSlots(run, '0:gilded,2:hollow,7:bell,1:nope');
  assert.deepEqual(run.slotInscriptions.map(x => x?.id || null), ['gilded', null, 'hollow']);
});

test('save round trip keeps slot Inscriptions; an old save loses its artifacts and still loads', () => {
  const state = cardState('save');
  writeInscription(state.run, 0, 'twin-mark'); writeInscription(state.run, 2, 'lodestone');
  const store = {getItem: () => JSON.stringify(state), setItem() {}};
  const loaded = M.loadState(store);
  assert.deepEqual(loaded.run.slotInscriptions.map(x => x?.id || null), ['twin-mark', null, 'lodestone']);
  const old = JSON.parse(JSON.stringify(state));
  delete old.run.slotInscriptions; old.run.artifacts = ['glow-wick', 'ember-lens']; old.run.artifactCharges = {'glow-wick': 2};
  const migrated = M.loadState({getItem: () => JSON.stringify(old), setItem() {}});
  assert.deepEqual(migrated.run.artifacts, []);
  assert.deepEqual(migrated.run.artifactCharges, {});
  assert.deepEqual(migrated.run.slotInscriptions, [null, null, null]);
  assert.equal(M.getRunModifiers(migrated.run).artifactIds.length, 0, 'artifacts never apply');
});

test('Scribe: two offers without duplicates of written ones, then slot, replace confirm, cancel leaves nothing written', () => {
  const state = cardState('scribe'), run = state.run;
  const seq = (() => { let n = 7; return () => (n = (n * 48271) % 2147483647) / 2147483647; })();
  writeInscription(run, 2, 'gilded');
  const offers = offerInscriptions(run, seq);
  assert.equal(offers.length, 2); assert.equal(new Set(offers).size, 2);
  assert.ok(!offers.includes('gilded'));
  const crowded = {slotInscriptions: INSCRIPTION_IDS.slice(0, 17).map(id => ({id}))};
  const few = offerInscriptions(crowded, seq);
  assert.equal(few.length, 2); assert.ok(few.includes(INSCRIPTION_IDS[17]), 'the one fresh offer is kept, written ones fill up');
  run.flightReward = {kind: 'inscription', nodeId: 'x', offers, claimed: false};
  assert.equal(M.chooseFlightReward(state, 'hearth-not-offered', 0), false, 'only offered ones');
  assert.equal(M.chooseFlightReward(state, offers[0], 9), false, 'only real slots');
  const bare = M.previewScribeWrite(run, offers[0], 0);
  assert.deepEqual([bare.replaces, bare.needsConfirm], [null, false]);
  const over = M.previewScribeWrite(run, offers[0], 2);
  assert.deepEqual([over.replaces, over.needsConfirm], ['gilded', true]);
  assert.equal(M.chooseFlightReward(state, offers[0], 2), false, 'replacing needs confirm: cancel writes nothing');
  assert.equal(run.slotInscriptions[2].id, 'gilded'); assert.equal(run.flightReward.claimed, false);
  assert.equal(M.chooseFlightReward(state, offers[0], 2, {confirm: true}), true);
  assert.equal(run.slotInscriptions[2].id, offers[0]); assert.equal(run.flightReward.replaced, 'gilded');
  assert.equal(run.flightReward.claimed, true);
  assert.equal(M.chooseFlightReward(state, offers[1], 0), false, 'claimed once');
});

test('getInscription ignores junk', () => { assert.equal(getInscription('nope'), null); assert.equal(getInscription(null), null); });

test('Chain tab: an inscribed slot, empty or not, carries its brand and etched frame; no text plaque; the inspector shows the block', async () => {
  const {deckScreenMarkup, createDeckView} = await import('../dist/ui/deck-screen.mjs');
  const run = cardState('chain-ui', ['body-spark', null, null]).run;
  writeInscription(run, 0, 'gilded'); writeInscription(run, 1, 'hollow');
  const html = deckScreenMarkup(run, createDeckView(), {});
  assert.equal((html.match(/class="dk2-ins-brand /g) || []).length, 2);
  assert.match(html, /data-ins-glyph="gilded"/); assert.match(html, /data-ins-glyph="hollow"/);
  assert.equal((html.match(/dk2-ins-frame /g) || []).length, 2);
  assert.match(html, /dk2-empty dk2-inscribed/, 'the empty slot is still clearly inscribed');
  assert.doesNotMatch(html, /class="dk2-ins dk2-ins-/, 'the old text plaque is gone');
  assert.doesNotMatch(deckScreenMarkup(cardState('chain-ui-none', ['body-spark', null, null]).run, createDeckView(), {}), /data-ins-slot=/);
  const view = createDeckView(); view.reading = run.mountedCards[0].instanceId;
  assert.match(deckScreenMarkup(run, view, {}), /Slot Inscription[\s\S]*Gilded: /);
});
test('glyphs: every Inscription has its own 24x24 two-tone brand mark, as a file and inline, and no two are alike', async () => {
  const fs = await import('node:fs');
  const {inscriptionGlyph, INSCRIPTION_GLYPH_IDS, inscriptionGlyphPath, INSCRIPTION_GLYPH_GRID, INSCRIPTION_BRAND_GRID, INSCRIPTION_GLYPH_SIZES, isWholeGlyphSize} = await import('../dist/inscription-glyphs.mjs');
  const {GLYPHS, validate, GRID} = await import('../scripts/build-inscription-glyphs.mjs');
  const ALL_IDS = [...INSCRIPTION_IDS, ...CHEST_INSCRIPTION_IDS];
  assert.equal(GRID, 24); assert.equal(INSCRIPTION_GLYPH_GRID, 24); assert.equal(INSCRIPTION_BRAND_GRID, 26);
  assert.deepEqual([...INSCRIPTION_GLYPH_IDS].sort(), [...ALL_IDS].sort());
  assert.deepEqual(validate(), []);
  const files = ALL_IDS.map(id => {
    const file = new URL(`../dist/${inscriptionGlyphPath(id)}`, import.meta.url);
    assert.ok(fs.existsSync(file), `${id} has a glyph file`);
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /viewBox="0 0 24 24"/); assert.match(text, /fill="currentColor"/); assert.match(text, /fill-opacity="0.5"/, `${id}: second tone`);
    return text.replace(/^[\s\S]*? d="/, '');
  });
  assert.equal(new Set(files).size, files.length, 'glyph files are pairwise different');
  const ids = Object.keys(GLYPHS), px = id => GLYPHS[id].join('').replace(/\+/g, '#');
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    const diff = [...px(ids[a])].filter((c, i) => c !== px(ids[b])[i]).length;
    assert.ok(diff >= 40, `${ids[a]} and ${ids[b]} differ by only ${diff} pixels`);
  }
  // One size per role, each a whole multiple of the grid.
  assert.deepEqual({...INSCRIPTION_GLYPH_SIZES}, {list: 24, large: 48, huge: 72, brand: 26, brandLarge: 52});
  for (const [role, size] of Object.entries(INSCRIPTION_GLYPH_SIZES)) assert.ok(isWholeGlyphSize(size, role.startsWith('brand')), role);
  assert.match(inscriptionGlyph('bell', {role: 'large'}), /width="48"[^>]*viewBox="0 0 24 24"[\s\S]*ins-glyph-cut/);
  assert.match(inscriptionGlyph('bell', {size: 40}), /width="48"/, 'whole multiples only');
  assert.match(inscriptionGlyph('bell', {role: 'brand'}), /width="26"[^>]*viewBox="-1 -1 26 26"[\s\S]*ins-brand-edge/);
  assert.equal(isWholeGlyphSize(36), false); assert.equal(isWholeGlyphSize(16), false); assert.equal(isWholeGlyphSize(32), false);
  assert.equal(inscriptionGlyph('nope'), '');
});
test('every place that draws a glyph asks for a role or a whole multiple, and every CSS size given to a glyph is a whole multiple', async () => {
  const fs = await import('node:fs');
  const {INSCRIPTION_GLYPH_IDS, INSCRIPTION_GLYPH_SIZES, isWholeGlyphSize} = await import('../dist/inscription-glyphs.mjs');
  const files = ['inscription-ui.mjs', 'reward-screen.mjs', 'card-terms.mjs', 'inscription-write.mjs', 'map-guide.mjs', 'ui/deck-screen.mjs'];
  for (const name of files) {
    const src = fs.readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/inscriptionGlyph\(([^)]*)\)/g)) {
      const role = m[1].match(/role:\s*'(\w+)'/)?.[1], size = m[1].match(/size:\s*(\d+)/)?.[1];
      if (role) assert.ok(INSCRIPTION_GLYPH_SIZES[role], `${name}: unknown role ${role}`);
      if (size) assert.ok(isWholeGlyphSize(Number(size), /brand:\s*true/.test(m[1])), `${name}: size ${size} is not a whole multiple`);
      const id = m[1].match(/^'([\w-]+)'/)?.[1];
      if (id) assert.ok(INSCRIPTION_GLYPH_IDS.includes(id), `${name}: no glyph for ${id}`);
    }
  }
  for (const name of ['artifact-reward.css', 'ui/card-screens.css', 'card-ui.css']) {
    const css = fs.readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');
    for (const rule of css.matchAll(/([^{}]*(?:ins-glyph|ins-brand|map-symbol-scribe)[^{}]*)\{([^}]*)\}/g)) {
      if (/ins-brand-edge|dk2-ins-brand(?![^,{]*svg|[^,{]*\.ins-)/.test(rule[1]) && !/svg|\.ins-glyph|\.ins-brand\b/.test(rule[1].replace(/dk2-ins-brand/g, ''))) continue;
      const w = rule[2].match(/(?:^|;)\s*width:\s*(\d+)px/)?.[1];
      if (!w) continue;
      const brand = /ins-brand|brand/.test(rule[1]);
      assert.ok(isWholeGlyphSize(Number(w)) || (brand && isWholeGlyphSize(Number(w), true)), `${name}: ${rule[1].trim().slice(0, 80)} sets a glyph to ${w}px`);
    }
  }
});
test('screens: brand, etched frame, inspector block with glossary words, and the three Scribe steps', async () => {
  const {inscriptionBrand, inscriptionFrame, inscriptionBlock, inscriptionGlyph} = await import('../dist/inscription-ui.mjs');
  const {flightRewardMarkup} = await import('../dist/reward-screen.mjs');
  const {CARD_TERMS} = await import('../dist/card-terms.mjs');
  assert.ok(CARD_TERMS.inscription, 'glossary term');
  assert.match(inscriptionBrand(2, 'kindled'), /data-ins-slot="2"[\s\S]*Kindled[\s\S]*data-ins-glyph="kindled"/);
  assert.match(inscriptionBrand(0, 'hollow'), /dk2-ins-standalone/);
  assert.equal(inscriptionBrand(0, 'nope'), '');
  assert.match(inscriptionFrame('gilded'), /dk2-ins-frame-card/);
  assert.notEqual(inscriptionGlyph('gilded'), inscriptionGlyph('hollow'), 'one glyph per Inscription');
  const block = inscriptionBlock(1, 'kindled');
  assert.match(block, /Inscription: <b>Kindled<\/b>/); assert.match(block, /data-card-term="lift"/, 'trigger words link to the glossary');
  assert.match(block, /data-ins-glyph="kindled"/);
  const state = cardState('screens', ['harvest-rare', null, null]), run = state.run;
  writeInscription(run, 1, 'mirror');
  run.lastFlight = {elite: true};
  run.flightReward = {kind: 'inscription', nodeId: 'n', offers: ['gilded', 'hollow'], claimed: false};
  // One screen: the offers above (nothing preselected), the Chain below, Write disabled until both are chosen.
  const none = flightRewardMarkup(state, {scribe: {}});
  assert.equal((none.match(/data-action="scribe-pick"/g) || []).length, 2); assert.match(none, /Write an Inscription/);
  assert.equal((none.match(/data-action="scribe-slot"/g) || []).length, 3, 'every slot of the Chain');
  assert.match(none, /data-action="scribe-write" disabled/); assert.doesNotMatch(none, /aria-pressed="true"/, 'nothing preselected');
  for (const id of ['gilded', 'hollow']) assert.match(none, new RegExp(`data-ins-glyph="${id}" width="48"`));
  assert.match(none, /data-card-term="ins-card"[^>]*>[^<]*<\/button>|data-card-term="ins-card"/); assert.match(none, /data-card-term="ins-slot"/);
  assert.match(none, /Replaces|Mirror/); assert.match(none, /Empty slot/); assert.match(none, /data-card-art="harvest-rare"/);
  assert.doesNotMatch(none, /bare/i, 'no "Bare"');
  // Offer only, or slot only: still disabled.
  assert.match(flightRewardMarkup(state, {scribe: {id: 'gilded', slot: null}}), /data-action="scribe-write" disabled/);
  assert.match(flightRewardMarkup(state, {scribe: {id: null, slot: 0}}), /data-action="scribe-write" disabled/);
  // Offer + card slot: enabled, the result shows on the slot with the engine's before → after.
  const pick = flightRewardMarkup(state, {scribe: {id: 'gilded', slot: 0}});
  assert.doesNotMatch(pick, /data-action="scribe-write" disabled/);
  const {writePreview} = await import('../dist/inscription-write.mjs');
  const pv = writePreview(run, 0, 'gilded');
  assert.ok(pv.change && pv.change.before && pv.change.after && pv.change.before !== pv.change.after, 'a real change from the row preview');
  assert.ok(pick.includes(`${pv.change.before} → ${pv.change.after} on ${pv.change.trigger}`));
  // Card-type on an empty slot: says so.
  assert.match(flightRewardMarkup(state, {scribe: {id: 'gilded', slot: 2}}), /Needs a card here/);
  // Replacing: the old one struck through beside the new, no extra confirm screen.
  const over = flightRewardMarkup(state, {scribe: {id: 'hollow', slot: 1}});
  assert.match(over, /<s class="iw-old"[^>]*><span>Replaces Mirror<\/span><\/s>/); assert.doesNotMatch(over, /Replace this Inscription\?/);
  assert.match(over, /data-action="scribe-write"[^>]*><span>Replace<\/span>/);
  // Write stores {id} on that slot, replacing without another confirm.
  assert.ok(M.chooseFlightReward(state, 'hollow', 1, {confirm: true}));
  assert.deepEqual(run.slotInscriptions[1], {id: 'hollow'});
  assert.match(flightRewardMarkup(state, {scribe: {}}), /Written on slot 2/);
});
test('the writer is styled not to scroll: fixed height, shrinking Chain row, no scrolling overflow on its parts', async () => {
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../dist/artifact-reward.css', import.meta.url), 'utf8');
  assert.match(css, /\.scribe-screen\.ins-write\{[^}]*grid-template-rows:auto auto minmax\(0,1fr\)[^}]*height:calc\(100dvh[^}]*overflow:hidden/);
  assert.match(css, /\.ins-write \.iw-chain\{[^}]*grid-template-columns:repeat\(var\(--slots,3\),minmax\(0,1fr\)\)/);
  const writer = css.slice(css.indexOf('One-screen Inscription writer'));
  assert.doesNotMatch(writer, /overflow(?:-[xy])?:\s*(?:auto|scroll)/, 'nothing in the writer scrolls');
});
test('dev scene: ?mock=cards&scenario=scribe opens the Scribe', async () => {
  const {openMockScribe} = await import('../dist/card-inspector.mjs');
  const run = cardState('mock-scribe', ['body-spark', null, null]).run;
  const reward = openMockScribe(run, 'bell,nope,gilded');
  assert.deepEqual(reward.offers, ['bell', 'gilded']); assert.equal(run.victoryPending, true); assert.equal(reward.kind, 'inscription');
});

test('only a map guardian or a Scribe stop offers the Scribe, never an Elite, and a run offers at most 6 (2 per map)', () => {
  const run = cardState('scribe-source', ['body-spark', null, null]).run;
  assert.equal(M.flightRewardKind(run, {elite: true, mapIndex: 0}), null);
  assert.equal(M.flightRewardKind(run, {boss: true, mapIndex: 0}), 'inscription');
  assert.equal(M.flightRewardKind(run, {boss: true, mapIndex: 2}), null, 'the last guardian ends the expedition');
  assert.equal(M.SCRIBE_MAX_PER_RUN, 6);
  assert.equal(M.flightRewardKind(run, {kind: 'scribe', mapIndex: 1}), 'inscription');
  run.scribesOffered = M.SCRIBE_MAX_PER_RUN;
  assert.equal(M.flightRewardKind(run, {boss: true, mapIndex: 0}), null);
});

test('a Scribe is offered only on card runs; elite and guardian flights otherwise award nothing', () => {
  const {getInscription: g} = M;
  assert.ok(g('gilded'));
  const state = M.newState(); state.run = M.createRun(state.profile, 'legacy');
  assert.equal(state.run.flightReward ?? null, null);
});

test('Chain tab: an inscribed slot, empty or not, carries the plaque and etched frame; the inspector shows the block', async () => {
  const {deckScreenMarkup, createDeckView} = await import('../dist/ui/deck-screen.mjs');
  const run = cardState('chain-ui', ['body-spark', null, null]).run;
  writeInscription(run, 0, 'gilded'); writeInscription(run, 1, 'hollow');
  const html = deckScreenMarkup(run, createDeckView(), {});
  assert.equal((html.match(/data-ins-slot=/g) || []).length, 2);
  assert.equal((html.match(/dk2-ins-frame /g) || []).length, 2);
  assert.match(html, /dk2-empty dk2-inscribed/, 'the empty slot is still clearly inscribed');
  assert.doesNotMatch(deckScreenMarkup(cardState('chain-ui-none', ['body-spark', null, null]).run, createDeckView(), {}), /data-ins-slot=/);
  const view = createDeckView(); view.reading = run.mountedCards[0].instanceId;
  assert.match(deckScreenMarkup(run, view, {}), /Slot Inscription[\s\S]*Gilded: /);
});

// Chance rolls always succeed in this file: these tests pin what a firing pays (the chance itself: tests/card-chance.test.mjs).
globalThis[Symbol.for('orbix.chanceForce')] = true;
