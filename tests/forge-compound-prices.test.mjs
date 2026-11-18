// Forge (approved 2026-11-17, doubling rule 2026-11-18): first prices 15 / 40 / 150; each forge of a rarity
// doubles that rarity's price for the REST OF THE RUN (it does not reset at the next Rest); rarities are
// independent. The surprise card is hidden until paid and seeded per run.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard, SKILL_CARDS, CARD_ECONOMY, getCardMeltValue, drawForgeCard} from '../dist/skill-cards.mjs';
import {cardWorkshopMarkup} from '../dist/card-workshop.mjs';
import {cardForgeMarkup} from '../dist/card-ui.mjs';

function enterRest(run, node = run.map[4][0]) {
  Object.assign(run, {current: node, step: node.row, path: [node.id], phase: 'support', restReady: false});
  assert.ok(M.canUseCardCampServices(run));
}
function fresh(seed = 'forge-v3-prices') {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  const run = state.run = M.createRun(state.profile, seed, 1, {cards: true});
  run.mountedCards = [null, null, null];
  run.reserveCards = [];
  run.condensedGlow = 5000;
  enterRest(run);
  return state;
}
function reload(state) {
  let text;
  const storage = {getItem: () => text, setItem: (_, value) => {text = value;}};
  assert.ok(M.saveState(state, storage));
  return M.loadState(storage);
}
function forge(state, rarity, expectedPrice) {
  const run = state.run, quote = M.getCardForgePreview(run, rarity);
  assert.equal(quote.price, expectedPrice);
  assert.equal(quote.eligible, true, quote.reason);
  const wallet = run.condensedGlow, owned = M.getOwnedCards(run).length;
  const card = M.forgeOwnedCard(state, rarity, quote.token);
  assert.ok(card);
  assert.equal(card.rarity, rarity);
  assert.equal(card.instanceId, quote.card.instanceId);
  assert.equal(run.condensedGlow, wallet - expectedPrice);
  assert.equal(M.getOwnedCards(run).length, owned + 1);
  assert.equal(run.cardHistory.at(-1).price, expectedPrice);
  return card;
}

test('first prices are 15, 40 and 150, and each forge of a rarity doubles that rarity only', () => {
  assert.deepEqual(CARD_ECONOMY.forge, {common: 15, rare: 40, legendary: 150});
  assert.equal(CARD_ECONOMY.forgeGrowth, 2);
  const state = fresh(), run = state.run;
  forge(state, 'common', 15); forge(state, 'common', 30); forge(state, 'common', 60);
  assert.equal(M.getCardForgePreview(run, 'rare').price, 40, 'rarities escalate independently');
  assert.equal(M.getCardForgePreview(run, 'legendary').price, 150);
  forge(state, 'rare', 40); forge(state, 'rare', 80); forge(state, 'rare', 160);
  forge(state, 'legendary', 150); forge(state, 'legendary', 300);
  assert.equal(M.getCardForgePreview(run, 'common').price, 120);
  assert.equal(M.getCardForgePreview(run, 'common').nextPrice, 240, 'the offer shows the next price after this one');
  assert.equal(M.getCardForgePreview(run, 'legendary').price, 600);
  assert.deepEqual(run.cardForgeTally, {common: 3, rare: 3, legendary: 2});
  assert.equal(run.condensedGlow, 5000 - (15 + 30 + 60) - (40 + 80 + 160) - (150 + 300));
});

test('the doubled price lasts the whole run: reload, the next Rest and later Rests keep it; only a new run starts over', () => {
  let state = fresh('forge-rest-lifetime'), run = state.run;
  forge(state, 'rare', 40); forge(state, 'legendary', 150);
  const nextRare = M.getCardForgePreview(run, 'rare');
  assert.equal(nextRare.price, 80);
  state = reload(state); run = state.run;
  assert.deepEqual(M.getCardForgePreview(run, 'rare'), nextRare, 'reload neither resets the price nor rerolls the card');
  assert.equal(M.getCardForgePreview(run, 'legendary').price, 300);
  assert.ok(M.resolveSupport(run, M.getSupportChoices(run).findIndex(choice => choice.effect?.restContinue)));
  assert.equal(M.getCardForgePreview(run, 'rare').price, 80, 'finishing the Rest keeps its price');
  enterRest(run, run.map.flat().find(node => node.kind === 'camp' && node.row > 4));
  const atNextRest = M.getCardForgePreview(run, 'rare');
  assert.equal(atNextRest.price, 80, 'the next Rest does NOT start over');
  assert.equal(atNextRest.card.instanceId, nextRare.card.instanceId, 'moving to another Rest does not reroll the unpaid surprise');
  assert.notEqual(atNextRest.token, nextRare.token, 'a quote from another Rest is stale');
  assert.equal(M.forgeOwnedCard(state, 'rare', nextRare.token), false);
  forge(state, 'rare', 80); forge(state, 'rare', 160);
  state.run = M.createRun(state.profile, 'forge-next-expedition', 1, {cards: true});
  enterRest(state.run);
  assert.equal(M.getCardForgePreview(state.run, 'rare').price, 40);
  assert.equal(M.getCardForgePreview(state.run, 'common').price, 15);
});

test('a Legendary forge no longer needs a Rare card mounted', () => {
  const state = fresh('forge-no-rare-needed'), run = state.run;
  assert.ok(run.mountedCards.every(card => !card));
  const quote = M.getCardForgePreview(run, 'legendary');
  assert.equal(quote.eligible, true);assert.equal(quote.reason, null);
  forge(state, 'legendary', 150);
});

test('preview, failed and stale confirmations never spend, reveal or raise the price', () => {
  const state = fresh('forge-no-spend'), run = state.run;
  const before = structuredClone(run), quote = M.getCardForgePreview(run, 'rare');
  for (let i = 0; i < 3; i++) for (const rarity of ['common', 'rare', 'legendary']) M.getCardForgePreview(run, rarity);
  assert.deepEqual(M.getCardForgePreview(run, 'rare'), quote);
  assert.deepEqual(run, before);
  assert.equal(M.forgeOwnedCard(state, 'rare', 'stale'), false);
  assert.equal(M.forgeOwnedCard(state, 'mythic'), false);
  assert.deepEqual(run, before);
  run.condensedGlow = 39;
  const poor = structuredClone(run), poorQuote = M.getCardForgePreview(run, 'rare');
  assert.equal(poorQuote.eligible, false);assert.equal(poorQuote.reason, 'Not enough Stored Sparks');
  assert.equal(M.forgeOwnedCard(state, 'rare', poorQuote.token), false);
  assert.deepEqual(run, poor);
  run.condensedGlow = 5000;
  run.phase = 'briefing';
  const outside = structuredClone(run), away = M.getCardForgePreview(run, 'rare');
  assert.match(away.reason, /at Rest/);
  assert.equal(M.forgeOwnedCard(state, 'rare', quote.token), false);
  assert.deepEqual(run, outside);
  run.phase = 'support';
  forge(state, 'rare', 40);
  assert.equal(M.forgeOwnedCard(state, 'rare', quote.token), false, 'the paid quote cannot be paid twice');
  assert.equal(M.getCardForgePreview(run, 'rare').price, 80);
});

test('the forged card is hidden until paid, seeded so reload or Back cannot reroll it, and revealed after paying', () => {
  let state = fresh('forge-hidden'), run = state.run;
  for (const rarity of ['common', 'rare', 'legendary']) {
    const quote = M.getCardForgePreview(run, rarity);
    assert.equal(quote.hidden, true);
    assert.equal(quote.card.cardId, null);assert.equal(quote.card.hidden, true);
    assert.equal(quote.card.name, `Surprise ${rarity[0].toUpperCase()}${rarity.slice(1)} card`);
    const text = JSON.stringify(quote), next = drawForgeCard(run, rarity, quote.forged);
    assert.ok(!text.includes(`"${next.cardId}"`), 'no part of the quote names the card');
    for (const markup of [cardForgeMarkup(run, quote), cardWorkshopMarkup(run, {view: 'forge'})]) {
      assert.doesNotMatch(markup, new RegExp(SKILL_CARDS[next.cardId].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?! card)'));
      assert.match(markup, /Surprise/);
    }
  }
  const quote = M.getCardForgePreview(run, 'rare'), hiddenId = drawForgeCard(run, 'rare', 0).cardId;
  state = reload(state); run = state.run;
  assert.deepEqual(M.getCardForgePreview(run, 'rare'), quote, 'reload keeps the same hidden result');
  const card = forge(state, 'rare', 40);
  assert.equal(card.cardId, hiddenId, 'payment reveals exactly the seeded card');
  assert.equal(run.lastCardForged.cardId, hiddenId);
  assert.match(cardForgeMarkup(run, M.getCardForgePreview(run, 'rare'), {lastForged: {instanceId: card.instanceId, name: card.name}}), /Revealed: /);
});

test('Forge never gives a card already owned until every card of that rarity is owned', () => {
  for (const rarity of ['common', 'rare', 'legendary']) {
    const state = fresh(`forge-unique-${rarity}`), run = state.run;
    run.condensedGlow = 1e6;
    const pool = Object.values(SKILL_CARDS).filter(def => def.rarity === rarity && !def.starterOnly && !def.retired && !def.unreleased);
    const got = [];
    // Prices double per forge, so the wallet is unbounded here to forge the whole pool.
    run.condensedGlow = Infinity;
    for (let i = 0; i < pool.length; i++) { got.push(M.forgeOwnedCard(state, rarity, M.getCardForgePreview(run, rarity).token).cardId); }
    assert.equal(new Set(got).size, pool.length, `${rarity}: every forge was new until the pool ran out`);
    assert.deepEqual(new Set(got), new Set(pool.map(def => def.id)));
    const extra = M.forgeOwnedCard(state, rarity, M.getCardForgePreview(run, rarity).token);
    assert.ok(pool.some(def => def.id === extra.cardId), 'an exhausted pool repeats a card of the same rarity');
    assert.equal(new Set(M.getOwnedCards(run).map(card => card.instanceId)).size, M.getOwnedCards(run).length, 'no instance duplicates');
  }
});

test('forging then melting always loses Stored Sparks, for every rarity and the first five crafts of a run', () => {
  for (const rarity of ['common', 'rare', 'legendary']) {
    const state = fresh(`forge-melt-${rarity}`), run = state.run;
    for (let step = 0; step < 5; step++) {
      const price = M.getCardForgePreview(run, rarity).price;
      assert.equal(price, CARD_ECONOMY.forge[rarity] * 2 ** step);
      const card = forge(state, rarity, price), melt = getCardMeltValue(card);
      assert.equal(melt, CARD_ECONOMY.melt[rarity]);
      assert.ok(price > melt, `${rarity} forge ${step + 1}: ${price} > ${melt}`);
      const wallet = run.condensedGlow;
      run.phase = 'support';
      assert.ok(M.meltOwnedCards(state, [card.instanceId], M.getCardMeltPreview(run, [card.instanceId]).token));
      assert.equal(run.condensedGlow, wallet + melt);
      assert.ok(run.condensedGlow < wallet + price, 'net loss');
    }
  }
});

test('Forge uses no Rest action and the Workshop shows the next price of each rarity', () => {
  const state = fresh('forge-workshop'), run = state.run;
  run.reserveCards.push(makeSkillCard('spark-cache', 'workshop:cache'));
  const actions = structuredClone(run.cardRest?.actions || []);
  forge(state, 'common', 15);
  assert.deepEqual(run.cardRest?.actions || [], actions);
  const html = cardWorkshopMarkup(run, {view: 'forge'});
  for (const text of ['Surprise Common card', 'Forge','next 30', 'Surprise Rare card', '40', 'Surprise Legendary card', '150', 'Revealed after you pay'])
    assert.ok(html.includes(text), text);
});

test('Evolve costs the current Forge price of the new rarity and shares its price track', () => {
  const state = fresh('evolve-shared-track'), run = state.run;
  const give = (id, instanceId) => { run.reserveCards.push(makeSkillCard(id, instanceId)); };
  const evolve = (instanceId, expectedPrice) => {
    const q = M.getCardImprovePreview(run, instanceId);
    assert.equal(q.kind, 'evolution');
    assert.equal(q.price, expectedPrice);
    const wallet = run.condensedGlow;
    assert.ok(M.improveOwnedCard(state, instanceId, undefined, q.token));
    assert.equal(run.condensedGlow, wallet - expectedPrice);
  };
  give('echo', 'a'); give('tight-packing', 'b'); give('kindling-bead', 'c');
  assert.equal(M.getCardImprovePreview(run, 'a').price, M.getCardForgePrice(run, 'rare'));
  evolve('a', 40);
  assert.equal(M.getCardForgePrice(run, 'rare'), 80, 'an Evolve raises the next Rare Forge');
  assert.equal(M.getCardForgePreview(run, 'rare').price, 80);
  evolve('b', 80);
  forge(state, 'rare', 160);
  evolve('c', 320);
  assert.deepEqual(run.cardForgeTally, {common: 0, rare: 4, legendary: 0});
  assert.equal(M.getCardForgePrice(run, 'legendary'), 150, 'other tiers are untouched');
  // Evolve into Legendary raises the Legendary Forge, and vice versa.
  forge(state, 'legendary', 150);
  const evolved = [...M.getOwnedCards(run)].find(c => SKILL_CARDS[c.cardId]?.evolvesTo && SKILL_CARDS[SKILL_CARDS[c.cardId].evolvesTo].rarity === 'legendary');
  if (evolved) {
    const q = M.getCardImprovePreview(run, evolved.instanceId);
    assert.equal(q.price, 300);
  }
  // Plain Improve (rank up) leaves the track alone.
  const tally = JSON.stringify(run.cardForgeTally);
  run.reserveCards.push(makeSkillCard('spark-cache', 'd'));
  const rank = M.getCardImprovePreview(run, 'd');
  if (rank.kind === 'rank') { assert.ok(M.improveOwnedCard(state, 'd', undefined, rank.token)); assert.equal(JSON.stringify(run.cardForgeTally), tally); }
});

test('a free event Evolve does not raise the Forge price', () => {
  const state = fresh('evolve-free-event'), run = state.run;
  run.mountedCards = [makeSkillCard('prism-lens', 'free')];
  const before = JSON.stringify(run.cardForgeTally);
  const opts = M.eventCardOptions(run, 'improve');
  assert.ok(opts.some(o => o.instanceId === 'free'));
  assert.equal(JSON.stringify(run.cardForgeTally), before);
});
