// v2.3-deck: the Chain and Deck screens built into the game (dist/ui/deck-screen.mjs, chain-model.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSkillCard, SKILL_CARDS, isInventoryOnlyCard, getCardRowRule} from '../dist/skill-cards.mjs';
import {resolveChain, hereLine, TRIGGERS} from '../dist/ui/chain-model.mjs';
import {deckScreenMarkup, createDeckView} from '../dist/ui/deck-screen.mjs';
import {CARD_TILE_LINES, cardTileLine} from '../dist/card-tile-lines.mjs';
import {CARD_TERMS} from '../dist/card-terms.mjs';
import {createCardInspectorState} from '../dist/card-inspector.mjs';

const chain = ids => resolveChain(ids.map((id, i) => id ? makeSkillCard(id, `t:${i}`) : null));
const plates = c => c.infos.map(info => info.kind === 'empty' ? '-' : info.role === 'add' && info.changed ? `${info.plate}->+${info.eff}` : info.plate);
// Honesty rule: the plates read left to right reproduce the resolver's own total.
const honest = (c, label) => {
  assert.equal(c.plain, false, `${label}: plates fell back to plain figures`);
  assert.equal(c.linesum, Math.round(c.sol.sparks * 100) / 100, `${label}: plates ${c.linesum} vs resolver ${c.sol.sparks}`);
};

test('Echo: the repeated card shows its base crossed and the repeated worth; later Boost keeps its own plate', () => {
  const c = chain(['echo', 'spark-cache', 'prism-lens']);
  honest(c, 'echo');
  assert.deepEqual(plates(c), ['Repeats next', '+4->+8', '×1.25']);
  assert.equal(c.sol.sparks, 10);
  assert.match(hereLine(c, c.row[1]), /adds 4, repeated by Echo: 8/);
});

test('Encore: the passes appear above the medallion and the plates still add up', () => {
  const c = chain(['body-spark', 'spark-cache', 'refrain']);
  honest(c, 'encore');
  assert.equal(c.encore, true);
  assert.equal(c.passes.length, 2);
  assert.equal(c.infos[2].role, 'encore');
});

test('Second Sun with an Encore shows both multipliers', () => {
  const c = chain(['body-spark', 'second-sun', 'refrain']);
  honest(c, 'second sun');
  const sun = c.infos[1];
  assert.equal(sun.role, 'mul');
  assert.ok(sun.m2 && sun.m2 !== sun.step.multiplier, 'second-firing multiplier shown');
  assert.deepEqual(c.passes, ['4', '6']);
  assert.match(hereLine(c, c.row[1]), /on the first firing, ×3 on the Encore/);
});

test('a card listening to another Trigger waits instead of reading as misplaced', () => {
  const c = chain(['spark-cache', 'courier-tip', 'prism-lens', null]);
  honest(c, 'waits');
  assert.equal(c.trigger, 'body-spark');
  assert.equal(c.infos[1].kind, 'waits');
  assert.equal(c.infos[1].plate, 'Waits for Delivery');
  assert.ok(c.trigs.map(t => t.name).includes('Delivery'));
  const delivery = resolveChain(c.row, 'collector-delivery');
  assert.equal(delivery.trigger, 'collector-delivery');
  assert.equal(delivery.infos[0].plate, 'Waits for Collect');
});

test('a misplaced Boost says No effect here with the reason and a fix', () => {
  const c = chain(['prism-lens', 'body-spark']);
  honest(c, 'misplaced');
  assert.equal(c.infos[0].kind, 'idle');
  assert.match(hereLine(c, c.row[0]), /no effect on Collect, because there is no Bonus to multiply yet\. Move it after a \+ card\./);
});

test('3, 4 and 5 slots, and a seeded sweep of random chains, all keep the plates honest', () => {
  honest(chain(['echo', 'spark-cache', 'prism-lens']), '3 slots');
  honest(chain(['echo', 'spark-cache', 'prism-lens', null]), '4 slots');
  honest(chain(['echo', 'spark-cache', 'kindling-bead', 'prism-lens', 'crescendo']), '5 slots');
  let a = 7;
  const rnd = () => {a = (a + 0x6D2B79F5) >>> 0;let t = a;t = Math.imul(t ^ (t >>> 15), t | 1);t ^= t + Math.imul(t ^ (t >>> 7), t | 61);return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
  const pool = Object.keys(SKILL_CARDS).filter(id => !isInventoryOnlyCard(makeSkillCard(id, 'probe')));
  let checked = 0;
  for (let n = 0; n < 240; n++) {
    const slots = 3 + (n % 3), ids = [];
    while (ids.length < slots) {const id = pool[Math.floor(rnd() * pool.length)];if (!ids.includes(id)) ids.push(id);}
    const c = chain(ids);
    for (const t of c.trigs) {honest(resolveChain(c.row, t.kind), `${ids.join(',')} on ${t.name}`);checked++;}
  }
  assert.ok(checked > 100, `checked ${checked} chain and Trigger pairs`);
});

const sample = () => createCardInspectorState(new URLSearchParams('')).run;
test('the Chain tab renders stations, plates, Swap, Play and Trigger keywords that open the real glossary', () => {
  const run = sample(), html = deckScreenMarkup(run, createDeckView(), {});
  const slots = run.cardSlots || run.mountedCards.length;
  assert.equal((html.match(/class="dk2-station /g) || []).length, slots);
  assert.equal((html.match(/class="wb-sign wb-sign-quiet dk2-swap/g) || []).length, slots);
  assert.match(html, /id="dk2-play"/);
  assert.match(html, /class="dk2-btn dk22-term " data-term="body-spark" data-card-term="collect"/);
  assert.match(html, /id="dk22-medal"><b id="dk22-num">\+\d+<\/b><small>Sparks<\/small>/);
  assert.match(html, /<span class="dk22-old"><span class="dk-sr">was <\/span>\+4<\/span><b class="dk22-new">\+8<\/b>/);
  assert.doesNotMatch(html, /design-lab\//, 'no art from the unpublished lab');
});

test('the Deck tab groups every owned card, filters, and keeps Rest cards out of the chain', () => {
  const run = sample();
  run.reserveCards = [...run.reserveCards, makeSkillCard('growth-seed', 'seed:0')];
  const view = {...createDeckView(), tab: 'deck'};
  const html = deckScreenMarkup(run, view, {workshop: true});
  assert.match(html, /In your chain/);assert.match(html, /Not in chain/);assert.match(html, /Rest cards/);
  assert.match(html, /data-filter="legendary"/);assert.match(html, /id="dk2-sort"/);assert.match(html, /id="dk2-workshop"/);
  assert.doesNotMatch(deckScreenMarkup(run, view, {workshop: false}), /id="dk2-workshop"/);
  const pick = deckScreenMarkup(run, {...view, pick: 0}, {});
  assert.match(pick, /Choose a card for slot 1/);
  assert.match(pick, /data-uid="seed:0" aria-label="Growth Seed[^"]*cannot go in a slot\." aria-disabled="true"/);
});

test('the opened card holds Put in chain and Melt on the Deck tab; loaned cards cannot be melted', () => {
  const run = sample(), reserve = run.reserveCards.find(c => !isInventoryOnlyCard(c));
  const open = deckScreenMarkup(run, {...createDeckView(), tab: 'deck', reading: reserve.instanceId}, {});
  assert.match(open, /id="dk2-put"/);assert.match(open, /id="dk2-melt"/);assert.match(open, /In your Deck, not in the chain/);
  const melting = deckScreenMarkup(run, {...createDeckView(), tab: 'deck', reading: reserve.instanceId, melting: {amount: 10, wallet: 8, token: 'x'}}, {});
  assert.match(melting, /You get <b>\+10 Stored Sparks<\/b> · you have 8\./);
  const loaned = deckScreenMarkup(run, {...createDeckView(), reading: run.mountedCards.find(Boolean).instanceId}, {locked: true, loaned: true});
  assert.doesNotMatch(loaned, /id="dk2-melt"|class="wb-sign wb-sign-quiet dk2-swap/);
  assert.match(loaned, /cannot be melted/);
});

test('tile lines: the 56 approved short forms live next to the card text and fit a tile', () => {
  const ids = Object.keys(CARD_TILE_LINES);
  assert.equal(ids.length, 56);
  for (const id of ids) {
    assert.ok(SKILL_CARDS[id], `${id} exists`);
    assert.ok(CARD_TILE_LINES[id].length <= 22, `${id}: "${CARD_TILE_LINES[id]}"`);
    assert.doesNotMatch(CARD_TILE_LINES[id], /\bwaves?\b/i, 'Pulse wording');
  }
  assert.equal(cardTileLine(makeSkillCard('second-sun', 'x')), '×2 before, ×3 Encore');
  assert.equal(cardTileLine(makeSkillCard('body-spark', 'x')), '+2 Sparks');
});

test('every named Trigger has a glossary entry; the screens are wired into the game', () => {
  for (const t of TRIGGERS.filter(t => t.term)) assert.ok(CARD_TERMS[t.term], `${t.name} → ${t.term}`);
  assert.equal(CARD_TERMS.swipe[0], 'Swipe');
  const app = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  assert.match(app, /deckScreenMarkup\(state\.run,deckView,opts\)/);
  assert.match(app, /deckScreenMarkup\(run,deckView,opts\)/, 'practice uses the same screens');
  assert.doesNotMatch(app, /showTryCardRow|card-row-try\.mjs\?v=/, 'Play replaces the Try row');
  for (const page of ['game.html', 'components-preview.html']) assert.match(readFileSync(new URL(`../dist/${page}`, import.meta.url), 'utf8'), /ui\/card-screens\.css/);
  const css = readFileSync(new URL('../dist/ui/card-screens.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /url\(['"]?[^)'"]*design-lab|var\(--wb-[\w-]*\)/, 'no lab art and no kit art variables outside dist/ui/waystone.css');
  for (const [, file] of css.matchAll(/url\('(\.\.\/assets\/[^']+)'\)/g)) assert.doesNotThrow(() => readFileSync(new URL(`../dist/ui/${file}`, import.meta.url)), file);
  assert.match(css, /font-variant-ligatures:none/);
});
