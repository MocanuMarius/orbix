// Engine UI (v1.0-engine Phase 2): Trigger badges and chips, the Trigger collection, engine wording on the Chain tab,
// Black Hole plates, and the rarity marks that replaced the rarity word on tiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_CARDS, makeSkillCard, LIVE_CARDS, CARD_SYSTEM} from '../dist/skill-cards.mjs';
import {CARD_TRIGGERS, getCardTrigger, triggerArtKey} from '../dist/card-rule-bands.mjs';
import {CARD_TERMS, TRIGGER_TERM_KEYS} from '../dist/card-terms.mjs';
import {TRIGGER_ART, chipBadge, chipIcon, rarityPips} from '../dist/ui/trigger-icons.mjs';
import {TRIGGER_BOOK, triggerBook, chipOf, enginePlate, resolveChain} from '../dist/ui/chain-model.mjs';
import {deckScreenMarkup, createDeckView} from '../dist/ui/deck-screen.mjs';
import {cardFace} from '../dist/card-ui.mjs';

const row = ids => ids.map((id, i) => id ? makeSkillCard(id, `u${i}`) : null);
const run = (chain, reserve = []) => ({skillSystem: CARD_SYSTEM, cardSlots: Math.max(3, chain.length), mountedCards: row(chain),
  reserveCards: reserve.map((id, i) => makeSkillCard(id, `r${i}`)), condensedGlow: 0});

test('the engine Trigger chips have plain names, icons and glossary entries', () => {
  const names = {'engine-pulse': 'Card Pulse', 'engine-gain': 'On gain', 'engine-any': 'Any event', 'engine-skim': 'Skim', 'engine-lift': 'Low Lift',
    'engine-turn': 'Each Turn', timers: 'Timers', pack: 'Pack', 'take-off': 'Take-off'};
  for (const [id, label] of Object.entries(names)) {
    assert.equal(CARD_TRIGGERS[id]?.label, label, id);
    assert.ok(TRIGGER_ART[triggerArtKey(id)]?.length === 16, `${id}: a 16-grid icon`);
    assert.ok(CARD_TERMS[id], `${id}: glossary entry`);
    assert.ok(TRIGGER_TERM_KEYS.includes(id), `${id}: links to the Trigger collection`);
  }
  for (const term of ['engine', 'turn', 'timer', 'pack']) assert.ok(CARD_TERMS[term], `glossary: ${term}`);
  for (const id of ['always-on', 'any', 'next', 'rest']) assert.ok(TRIGGER_ART[triggerArtKey(id)], `${id}: its own badge icon`);
  // Every engine card shows its own Trigger, never "Always on".
  for (const def of Object.values(SKILL_CARDS).filter(d => d.engine || d.kind === 'black-hole')) {
    const chip = getCardTrigger(def);
    assert.notEqual(chip.id, 'always-on', def.id); assert.ok(CARD_TRIGGERS[chip.id], def.id);
  }
  // Icons are whole-pixel: 16 or 32, never fractional.
  assert.match(chipIcon('pack', 16), /width="16" height="16"/); assert.match(chipIcon('pack', 32), /width="32" height="32"/);
});

test('every card face, Deck tile and Chain tile leads with the Trigger badge; rarity is gems, not a word', () => {
  for (const id of ['body-spark', 'crescendo', 'echo-iii', 'slow-wick', 'growth-seed', 'deep-vessel']) {
    const card = makeSkillCard(id, `f:${id}`), chip = chipOf(card);
    for (const compact of [true, false]) {
      const face = cardFace(card, {compact});
      assert.match(face, new RegExp(`class="tbadge card-tbadge" data-chip="${chip.id}"`), `${id} badge`);
      assert.ok(face.indexOf('tbadge') < face.indexOf('card-rule-band') || compact, `${id}: the badge comes before the rules`);
      const gems = (rarityPips(SKILL_CARDS[id].rarity).match(/<svg/g) || []).length;
      assert.equal(gems, {common: 1, rare: 2, legendary: 3}[SKILL_CARDS[id].rarity], `${id}: 1, 2 or 3 gems`);
      assert.match(face, /class="rpips rpips-/);
    }
  }
  const view = createDeckView(); view.tab = 'deck';
  const html = deckScreenMarkup(run(['echo', 'body-spark', 'deep-vessel'], ['crescendo', 'prism-lens-ii', 'camp-kit']), view);
  assert.doesNotMatch(html, /dk21-rtab/, 'no rarity word strip on tiles');
  assert.equal((html.match(/class="tbadge dk-tbadge"/g) || []).length, 6, 'every tile has its badge');
  assert.match(html, /aria-label="Crescendo\. Rare\. Trigger: Any Trigger\./, 'the rarity word stays in the accessible name');
  assert.match(html, /data-filter="rare"/, 'filtering by rarity still works');
  assert.match(chipBadge({id: 'collect', label: 'Collect'}), /<b class="tbadge-n">Collect<\/b>/);
});

test('the Trigger collection lists every Trigger with what you do, how often, and your own cards', () => {
  const ids = TRIGGER_BOOK.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of TRIGGER_BOOK) {
    assert.ok(CARD_TRIGGERS[t.id], t.id); assert.ok(t.does.endsWith('.'), t.id);
    assert.ok(['often', 'a few times', 'once', 'each Turn', 'always', 'with every Trigger', 'with that card', 'at Rest'].includes(t.often), t.id);
    assert.ok(CARD_TERMS[t.term], `${t.id}: glossary term ${t.term}`);
  }
  // Every Trigger a live or engine card carries is in the collection.
  for (const def of [...LIVE_CARDS, ...Object.values(SKILL_CARDS).filter(d => d.unreleased)]) assert.ok(ids.includes(getCardTrigger(def).id), def.id);
  const book = triggerBook(run(['body-spark', 'spark-cache', null], ['body-spark', 'deep-vessel']));
  const collect = book.find(t => t.id === 'collect');
  assert.equal(collect.owned, true);
  assert.deepEqual(collect.cards.map(k => [k.cardId, k.count, k.inChain]), [['body-spark', 2, true], ['spark-cache', 1, true]]);
  assert.equal(book.find(t => t.id === 'always-on').cards[0].cardId, 'deep-vessel');
  assert.equal(book.find(t => t.id === 'pack').owned, false, 'no card yet');
  const html = deckScreenMarkup(run(['body-spark'], ['deep-vessel']), Object.assign(createDeckView(), {tab: 'triggers'}));
  assert.match(html, /id="dk2-tab-triggers"[^>]*aria-selected="true"/);
  assert.match(html, /No card yet/); assert.match(html, /class="dk2-btn tb-card dc-r-common tb-inchain" data-uid="u0"/);
  assert.match(html, /id="tb-back"/);
});

test('engine Chains: engine wording on plates, the two-number medallion, the dial, and "Runs once" without a Timer', () => {
  const chime = ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick'];
  const words = chime.map((id, i) => enginePlate(row(chime), i).long);
  assert.deepEqual(words, ['Sends a Pulse', '+1 Spark each Turn', 'Sends a Pulse', 'Waits 3 s']);
  assert.equal(enginePlate(row(['close-call', 'metronome', 'body-spark']), 1).long, 'Fires the next card every 3 s');
  assert.equal(enginePlate(row(['close-call', 'metronome', 'body-spark', 'heartbeat']), 1).long, 'Fires the next card every 1.5 s');
  const html = deckScreenMarkup(run([...chime, null]), createDeckView());
  assert.match(html, /dk-medal2/); assert.match(html, /<b id="dk22-num">1<\/b><small>per Turn<\/small>/); assert.match(html, /<b>3\.3<\/b><small>Turns per 10&nbsp;s<\/small>/);
  assert.match(html, /class="dk-dial"[^>]*><i class="dk-dial-ring"><\/i><b>3 s<\/b>/);
  assert.match(html, /dk-ret dk-ret-b/, 'the return path is drawn');
  const once = deckScreenMarkup(run(['first-catch', 'spark-chime', 'ember-bell']), createDeckView());
  assert.match(once, /Runs once\. Add a Timer to keep it turning\./); assert.doesNotMatch(once, /dk-ret-b/);
  // An ordinary Chain is untouched: no engine row, no two-number medallion.
  const plain = deckScreenMarkup(run(['echo', 'body-spark', 'deep-vessel']), createDeckView());
  assert.doesNotMatch(plain, /dk-eng|dk-medal2|Runs once/);
});

test('Black Hole: its victim reads "Eaten at take-off" in wine, its own plate says what it eats, and its total shows', () => {
  const ctx = resolveChain(row(['black-hole', 'spark-chime', 'body-spark']));
  assert.equal(ctx.blackHole[0].slot, 1);
  const html = deckScreenMarkup(run(['black-hole', 'spark-chime', 'body-spark']), createDeckView());
  assert.match(html, /dk-plate-wine" aria-hidden="true"><b class="pl-long">Eaten at take-off<\/b>/);
  assert.match(html, /Eats the next card/);
  const fed = {...makeSkillCard('black-hole', 'bh'), eaten: 2, eatenGrowth: 5};
  assert.match(cardFace(fed), /<b>Devoured 2<\/b> · \+5 max Sparks/);
  assert.match(cardFace(fed, {compact: true}), /<b>Devoured 2<\/b> · \+5/);
  assert.doesNotMatch(cardFace(makeSkillCard('black-hole', 'bh0'), {compact: true}), /Devoured 0/, 'no empty total on a small tile');
});

test('the Chain tab medallion equals the flight engine for the same Chain (Turns and Sparks per Turn)', async () => {
  const {WispFlight} = await import('../dist/flight.mjs');
  const {syncFlightEngine, raiseFlightEngine, stepFlightEngine} = await import('../dist/card-engine-flight.mjs');
  const {engineStats} = await import('../dist/ui/chain-model.mjs');
  for (const ids of [['first-catch', 'spark-chime', 'ember-bell', 'slow-wick'], ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick', 'crescendo'], ['first-catch', 'spark-chime', 'ember-bell', 'slow-wick', 'heartbeat']]) {
    const preview = engineStats(row(ids));
    const e = new WispFlight({canvas: {getContext: () => ({setTransform() {}}), getBoundingClientRect: () => ({width: 900, height: 430})}, preflight: true, seed: 'medal-proof', cardPilot: true,
      modifiers: {cardPilot: true, cardExecution: {cards: row(ids)}}});
    try {
      e.running = true; e.flame = 0; syncFlightEngine(e);
      // An endless meter, as the medallion measures: Lift would keep making room in a real flight.
      e.cardEngine.host.room = () => Infinity; e.cardEngine.host.gain = n => n;
      raiseFlightEngine(e, 'collect', {pickupKind: 'light'});
      for (let i = 1; i <= 60 * 60; i++) { e.time = i / 60; stepFlightEngine(e); }
      const turns = e.cardEngine.turnLog.filter(t => t >= 15), span = turns.at(-1) - turns[0];
      const per10 = (turns.length - 1) / span * 10;
      const perTurn = [...e.cardEngine.gainsByTurn.entries()].filter(([turn]) => e.cardEngine.turnLog[turn - 1] >= 15).reduce((s, [, g]) => s + g, 0) / turns.length;
      assert.ok(Math.abs(per10 - preview.turnsPer10s) < .05, `${ids.join('>')}: ${per10} vs ${preview.turnsPer10s} Turns per 10 s`);
      assert.equal(perTurn, preview.sparksPerTurn, `${ids.join('>')}: Sparks per Turn`);
    } finally { e.destroy(); }
  }
});
