import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import { CARD_CATALOG, CARD_CATALOG_IDS, CARD_DROP_WEIGHTS, CARD_DROP_MIX } from '../dist/card-catalog.mjs';
import { CARD_ART_IDS } from '../dist/card-art.mjs';
import { SKILL_CARDS, makeSkillCard, describeSkillCard, getCardRowRule, createCardExecution,
  resolveCardRow, getCardStarterOffers, drawSkillCard, drawSkillCardDraft, getCardModifiers, getCardPackingBonus } from '../dist/skill-cards.mjs';
import { WispFlight } from '../dist/flight.mjs';

const fresh = (seed = 'catalog-evolution') => {
  const state = M.newState();
  state.profile.tutorialComplete = true;
  state.run = M.createRun(state.profile, seed, 1, { cards: true });
  assert.ok(M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id));
  state.run.condensedGlow = 500;
  return state;
};
const add = (run, id, instanceId, extra = {}) => {
  const card = { ...makeSkillCard(id, instanceId), ...extra };
  run.reserveCards.push(card);
  return card;
};
const rng = seed => {
  let s = 2166136261;
  for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 16777619);
  return () => {
    s += 0x6d2b79f5;
    let n = s;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
};
function reachCamp(state) {
  const r=state.run,target=r.map.flat().find(n=>n.kind==='camp'),path=[target];let cursor=target;
  while(cursor.row>0){cursor=r.map[cursor.row-1].find(n=>n.nextIds.includes(cursor.id));assert.ok(cursor);path.unshift(cursor);}
  for(const n of path){
    assert.ok(M.selectNode(r,n.id));if(n===target)break;
    if(n.type==='support')assert.ok(M.resolveSupport(r,M.getSupportChoices(r,state.profile).findIndex(c=>!c.disabled),state.profile));
    else{
      assert.ok(M.beginFlightAttempt(r));assert.ok(M.markFlightAttemptStarted(r));assert.ok(M.finishFlight(r,{success:true,flame:50}));M.settleCheckpoint(state);
      const draft = M.getCardDraft(r);
      if (draft) assert.ok(M.chooseCardDraft(state, draft.id, draft.offers[0].instanceId));
      if (r.cardReward) r.cardReward.uiAcknowledged = true;
      if(r.flightReward&&!r.flightReward.claimed)assert.ok(M.chooseFlightReward(state,r.flightReward.offers[0]));
      assert.ok(M.acknowledgeVictory(state));
    }
  }
}

test('all 86 literal definitions have supported rules, unique IDs, honest art families and complete bands', () => {
  // The ordinary chain-walker catalog. Engine cards, Pack cards and Black Hole (released or held) run on the engine and are covered by
  // tests/card-engines.test.mjs and tests/engine-real-flight.test.mjs.
  const defs = Object.values(CARD_CATALOG).filter(def => !def.unreleased && !def.engine && def.kind !== 'black-hole'), supportedEvents = new Set([
    '*', 'body-spark', 'wave-crossing', 'flash-pickup', 'flash-expiry', 'downbeat-lift', 'natural-overfill',
    'collector-delivery', 'collector-attach', 'flight-clear', 'rhythm-phrase', 'guide-lift', 'field-swipe', 'guard-rescue',
  ]), physicalKinds = new Set(['dream', 'luminance', 'proximity-range', 'capacity', 'packing', 'echo', 'chameleon', 'field', 'guide',
    'rhythm', 'rapid-lift', 'camp-extra', 'camp-grow', 'cache-handling', 'refrain', 'watchlight', 'wave-loom', 'spillway',
    'last-light', 'proximity', 'springboard', 'heart-stitch', 'devourer', 'use-doubler', 'ember-feeder', 'twin-orbit', 'twin-wick', 'collector-range']);
  // 86 since Wave Loom came back; +5 starter Commons (Skim Line, Pulse Reader, Courier Cord, Meter Mark, Finish Flag) on 2026-11-18.
  assert.equal(defs.length, 90);
  assert.equal(new Set(CARD_CATALOG_IDS.filter(id => !CARD_CATALOG[id].unreleased && !CARD_CATALOG[id].engine && CARD_CATALOG[id].kind !== 'black-hole')).size, 90);
  assert.deepEqual(defs.reduce((totals, def) => (totals[def.rarity]++, totals), { common: 0, rare: 0, legendary: 0 }),
    { common: 52, rare: 24, legendary: 14 });
  for (const [index, def] of defs.entries()) {
    assert.deepEqual(SKILL_CARDS[def.id], def);
    assert.equal(CARD_CATALOG_IDS.filter(id => !CARD_CATALOG[id].unreleased && !CARD_CATALOG[id].engine && CARD_CATALOG[id].kind !== 'black-hole')[index], def.id);
    assert.ok(Object.isFrozen(def));
    assert.ok(def.name && typeof def.copyable === 'boolean' && Number.isFinite(def.amount));
    assert.ok(Number.isInteger(def.maxRank) && def.maxRank > 0);
    assert.ok(CARD_ART_IDS.includes(def.artFamily), `${def.id}: existing art scene`);
    assert.ok(def.ruleBands.length > 0);
    // Approved plain wording (v1.0-cardtext) uses colons inside a line ("Encore: the chain fires once more"); a band never ends on one.
    assert.ok(def.ruleBands.every(band => ['condition', 'effect', 'note'].includes(band.type) && band.text && !/:\s*$/.test(band.text)));
    const card = makeSkillCard(def.id, `catalog:${def.id}`), described = describeSkillCard(card), rule = getCardRowRule(def, card);
    assert.ok(described.effect, `${def.id}: readable description`);
    if (!rule) assert.ok(physicalKinds.has(def.kind), `${def.id}: supported passive or physical kind`);
    else {
      assert.ok(supportedEvents.has(rule.event), `${def.id}: event`);
      assert.ok(['add-sparks', 'shorten-recovery', 'shorten-reel', 'multiply', 'add-last-payout', 'add-future-capacity', 'multiply-future-capacity', 'add-stored', 'carried-interest', 'add-stored-per-heart', 'add-tally-capacity', 'add-cruising-speed', 'bank-reel'].includes(rule.operation));
      assert.ok(Number.isFinite(rule.amount));
      if (['multiply', 'add-last-payout', 'multiply-future-capacity'].includes(rule.operation)) assert.equal(def.copyable, false);
    }
    if (def.evolvesTo) {
      const target = CARD_CATALOG[def.evolvesTo];
      assert.ok(target, `${def.id}: evolution target exists`);
      assert.ok(['common', 'rare', 'legendary'].indexOf(target.rarity) > ['common', 'rare', 'legendary'].indexOf(def.rarity));
    }
    // 20 since the four ordinary starter cards (2026-11-18) sit after Lift Guide.
    if (index >= 20) assert.equal(def.excludeStarter, true);
  }
});

test('every numeric catalog rule produces its declared effect on a matching executable event', () => {
  const additive = {
    'body-spark': 'body-spark', 'wave-crossing': 'harvest-common', 'flash-pickup': 'flash-handling',
    'downbeat-lift': 'downbeat', 'collector-delivery': 'courier-tip', 'rhythm-phrase': 'toll-bell',
    'flash-expiry': 'diving-bell', 'flight-clear': 'growth-ring',
  };
  for (const def of Object.values(CARD_CATALOG)) {
    const card = makeSkillCard(def.id, `row:${def.id}`), rule = getCardRowRule(def, card);
    if (!rule || def.tallyEvent) continue; // counting cards pay from their own count: tests/cards-batch-2.test.mjs
    const kind = rule.event === '*' ? 'body-spark' : rule.event,
      event = { kind, firstCrossing: rule.when?.firstCrossing ?? true,
        pickupKind: rule.when?.pickupKind || 'light', meterFraction: 0.1,
        direction: rule.when?.direction || 'up', guardRecovering: true, availableRecovery: 10, collectorReeling: true, availableReel: 10, carriedStored:100, heartsLeft: 3 },
      prefix = Array.from({ length: Math.max(rule.minimumEarlierPayers || 0, rule.when?.exactlyEarlier || 0, rule.when?.endsShareTrigger ? 2 : 0, rule.perCardLeft ? 1 : 0,
        ['multiply', 'add-last-payout', 'multiply-future-capacity'].includes(rule.operation) ? 1 : 0) }, (_, i) =>
        makeSkillCard(additive[kind] || 'body-spark', `prefix:${i}`)),
      receipt = resolveCardRow(createCardExecution([...prefix, card, ...(rule.perEmptySlot ? [null] : [])]), event),
      steps = receipt.steps.filter(step => step.actingInstanceId === card.instanceId);
    assert.ok(steps.some(step => step.success), `${def.id}: its matching event works`);
    assert.ok(steps.some(step => step.operation === rule.operation), `${def.id}: declared operation executes`);
  }
});

test('old rank improvements precede family evolution, retaining instance, rank and real uses', () => {
  const state = fresh(), run = state.run;
  reachCamp(state);
  const finite = add(run, 'spark-cache', 'finite', { charges: 2 }),
    harvest = add(run, 'harvest-common', 'harvest');
  for (const rank of [1, 2]) {
    const quote = M.getCardImprovePreview(run, 'finite');
    assert.equal(quote.kind, 'rank');
    assert.equal(quote.price, 15 * rank);
    assert.ok(M.improveOwnedCard(state, 'finite', rank, quote.token));
    assert.equal(finite.charges, 2);
    assert.equal(M.improveOwnedCard(state, 'finite', rank, quote.token), false);
  }
  assert.equal(M.getCardImprovePreview(run, 'finite').reason, 'Maximum rank');
  for (const rank of [1, 2]) assert.ok(M.improveOwnedCard(state, 'harvest', rank, M.getCardImprovePreview(run, 'harvest').token));
  for (const [from, to, price, amount] of [
    ['harvest-common', 'harvest-rare', 40, 4], ['harvest-rare', 'harvest-legendary', 150, 4], // Evolve into Legendary costs 150 (2026-11-17)
  ]) {
    const quote = M.getCardImprovePreview(run, 'harvest');
    assert.equal(quote.kind, 'evolution');
    assert.equal(quote.before.cardId, from);
    assert.equal(quote.after.cardId, to);
    assert.equal(quote.after.rank, 3);
    assert.equal(quote.after.amount, amount);
    assert.equal(quote.price, price);
    assert.ok(M.improveOwnedCard(state, 'harvest', 3, quote.token));
    assert.equal(harvest.instanceId, 'harvest');
    assert.equal(harvest.cardId, to);
    assert.equal(M.improveOwnedCard(state, 'harvest', 3, quote.token), false);
  }
  const expired = add(run, 'spark-cache', 'expired', { charges: 0 }), before = structuredClone(expired);
  assert.equal(M.getCardImprovePreview(run, 'expired').reason, 'No remaining uses');
  assert.equal(M.improveOwnedCard(state, 'expired', 1), false);
  assert.deepEqual(expired, before);
});

test('all evolution families use exact tier costs and independent, stale-safe duplicate previews', () => {
  for (const definition of Object.values(CARD_CATALOG).filter(def => def.evolvesTo)) {
    const state = fresh(definition.id), run = state.run;
    reachCamp(state);
    const card = add(run, definition.id, 'chosen', { rank: definition.maxRank }),
      duplicate = add(run, definition.id, 'other', { rank: definition.maxRank }),
      otherBefore = structuredClone(duplicate);
    const quote = M.getCardImprovePreview(run, 'chosen'),
      price = quote.after.rarity === 'rare' ? 40 : 150; // Evolve = current Forge price of the new rarity (2026-11-18)
    assert.equal(quote.price, price);
    run.condensedGlow = price - 1;
    const before = structuredClone(run);
    assert.equal(M.getCardImprovePreview(run, 'chosen').reason, 'Not enough Stored Sparks');
    assert.equal(M.improveOwnedCard(state, 'chosen', card.rank, quote.token), false);
    assert.deepEqual(run, before);
    run.condensedGlow = price;
    assert.equal(M.improveOwnedCard(state, 'chosen', card.rank, quote.token), false, 'wallet changed since preview');
    const current = M.getCardImprovePreview(run, 'chosen');
    assert.ok(M.improveOwnedCard(state, 'chosen', card.rank, current.token));
    assert.equal(run.condensedGlow, 0);
    assert.equal(card.cardId, definition.evolvesTo);
    assert.equal(card.instanceId, 'chosen');
    assert.deepEqual(duplicate, otherBefore);
    assert.equal(M.improveOwnedCard(state, 'chosen', card.rank, current.token), false);
  }
  const state = fresh(), run = state.run;
  add(run, 'echo', 'moving');
  const quote = M.getCardImprovePreview(run, 'moving');
  assert.ok(M.equipOwnedCard(run, 'moving', 1));
  assert.equal(M.improveOwnedCard(state, 'moving', 1, quote.token), false, 'mount location changed');
  for (const phase of ['ended', 'flight']) {
    run.phase = phase;
    const before = structuredClone(run);
    assert.equal(M.improveOwnedCard(state, 'moving', 1), false);
    assert.deepEqual(run, before);
  }
});

test('paused evolution is refused while preserving the live flight and shared charge ledger', () => {
  const state = fresh('live-evolution'), run = state.run;
  run.mountedCards[0] = makeSkillCard('echo', 'echo');
  run.mountedCards[1] = { ...makeSkillCard('spark-cache', 'finite'), charges: 5 };
  const node = M.getChoices(run).find(choice => choice.type !== 'support');
  assert.ok(M.selectNode(run, node.id));
  assert.ok(M.beginFlightAttempt(run));
  assert.ok(M.markFlightAttemptStarted(run));
  const engine = new WispFlight({ preflight: true, seed: `${run.seed}-${node.id}`, node,
    modifiers: M.getRunModifiers(run), flame: run.flame, condensedGlow: run.condensedGlow,
    cardPilot: true, canvas: { getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 900, height: 430 }) } });
  try {
    engine.running = true;
    engine.flame = 0;
    engine.collect({ kind: 'light' });
    assert.equal(engine.getState().cardCharges.finite, 3);
    engine.pause();
    assert.ok(M.syncCardFlightForEdit(run, engine));
    const before = { time: engine.time, distance: engine.distance, y: engine.player.y, vy: engine.player.vy,
      fuel: engine.flame, pickups: engine.bodyPickups, cooldown: engine.wisp.cooldown, executions: engine.cardExecutions };
    const quote = M.getCardImprovePreview(run, 'echo');
    assert.equal(M.improveOwnedCard(state, 'echo', 1, quote.token),false);
    assert.ok(M.applyCardFlightEdits(run, engine));
    assert.equal(engine.cardExecution.cards[0].cardId, 'echo');
    assert.equal(engine.cardExecution.cards[1].charges, 3);
    assert.deepEqual({ time: engine.time, distance: engine.distance, y: engine.player.y, vy: engine.player.vy,
      fuel: engine.flame, pickups: engine.bodyPickups, cooldown: engine.wisp.cooldown, executions: engine.cardExecutions }, before);
    assert.equal(run.attemptEntry.condensedGlow, run.condensedGlow);
    assert.ok(M.closeCardFlightEdit(run, engine));
    engine.paused = false;
    engine.flame = 0;
    engine.collect({ kind: 'light' });
    assert.equal(engine.getState().cardCharges.finite, 1, 'unchanged Echo and original share two remaining uses');
  } finally { engine.destroy(); }
});

test('drop tier uses the first seeded roll, keeps Forge forced tiers and exposes evolved variants directly', () => {
  const seen = new Set();
  for (const tier of ['normal', 'elite', 'boss']) for (let seed = 0; seed < 1000; seed++) {
    const node = { id: `drop:${seed}`, ...(tier === 'normal' ? {} : { [tier]: true }) },
      run = { campaignSeed: 'tier-first', mapIndex: 0 }, source = `seed:${seed}`,
      identity = `${run.campaignSeed}:0:${node.id}:${source}`,
      roll = rng(identity + ':cards:v1')(), weights = CARD_DROP_WEIGHTS[tier],
      expected = roll < weights.common / 100 ? 'common' : roll < (weights.common + weights.rare) / 100 ? 'rare' : 'legendary',
      card = drawSkillCard(run, source, node);
    assert.equal(SKILL_CARDS[card.cardId].rarity, expected);
    assert.deepEqual(drawSkillCard(run, source, node), card);
    seen.add(card.cardId);
    for (const forced of ['rare', 'legendary']) {
      const forged = drawSkillCard(run, source, node, forced);
      assert.equal(SKILL_CARDS[forged.cardId].rarity, forced);
      seen.add(forged.cardId);
    }
  }
  for (const def of Object.values(CARD_CATALOG).filter(def => !def.starterOnly && !def.retired && !def.unreleased)) assert.ok(seen.has(def.id), `${def.id} can drop directly`);
  for (const def of Object.values(CARD_CATALOG).filter(def => def.retired)) assert.ok(!seen.has(def.id), `${def.id} is retired and never drops`);
  for (const def of Object.values(CARD_CATALOG).filter(def => def.unreleased)) assert.ok(!seen.has(def.id), `${def.id} is unreleased and never drops`);
});

test('seeded rarity distributions follow each node tier and an exact 75/20/5 node mix', () => {
  assert.deepEqual(CARD_DROP_MIX, { normal: 75, elite: 20, boss: 5 });
  const N = 12000;
  for (const tier of ['normal', 'elite', 'boss']) {
    const totals = { common: 0, rare: 0, legendary: 0 };
    for (let seed = 0; seed < N; seed++) {
      const node = { id: 'distribution', ...(tier === 'normal' ? {} : { [tier]: true }) },
        card = drawSkillCard({ campaignSeed: `distribution:${seed}`, mapIndex: 0 }, 'flight', node);
      totals[SKILL_CARDS[card.cardId].rarity]++;
    }
    for (const rarity of Object.keys(totals)) assert.ok(Math.abs(totals[rarity] / N - CARD_DROP_WEIGHTS[tier][rarity] / 100) < .015,
      `${tier}/${rarity}: ${totals[rarity]}/${N}`);
  }
  const counts = { normal: 0, elite: 0, boss: 0 }, totals = { common: 0, rare: 0, legendary: 0 };
  for (let seed = 0; seed < N; seed++) {
    const position = seed % 100, tier = position < 75 ? 'normal' : position < 95 ? 'elite' : 'boss',
      node = { id: `mixed:${seed}`, ...(tier === 'normal' ? {} : { [tier]: true }) },
      card = drawSkillCard({ campaignSeed: 'exact-mix', mapIndex: 0 }, 'flight', node);
    counts[tier]++;
    totals[SKILL_CARDS[card.cardId].rarity]++;
  }
  assert.deepEqual(counts, { normal: N * .75, elite: N * .2, boss: N * .05 });
  for (const rarity of Object.keys(totals)) {
    const expected = Object.entries(CARD_DROP_MIX).reduce((sum, [tier, weight]) => sum + weight * CARD_DROP_WEIGHTS[tier][rarity] / 10000, 0);
    assert.ok(Math.abs(totals[rarity] / N - expected) < .015, `75/20/5 ${rarity}`);
  }
});

test('the curated starter pool excludes advanced cards and tiered packing survives the model receipt', () => {
  const starterIds = new Set(['body-spark','spark-cache','deep-vessel','tight-packing','field-impulse','harvest-common','dream','rhythm','cache-handling','flash-handling','lift-guide','skim-line','pulse-reader','courier-cord','meter-mark','finish-flag']);
  for (let seed = 0; seed < 200; seed++) assert.ok(getCardStarterOffers({ seed }).every(gift => starterIds.has(gift.cardId)));
  const state = fresh('tiered-packing'), run = state.run;
  run.cardSlots = 5;
  run.mountedCards = ['echo-iii', 'tight-packing-iii', 'echo-iii', 'tight-packing-iii', 'tight-packing-iii']
    .map((id, index) => makeSkillCard(id, `packing:${index}`));
  assert.equal(getCardModifiers(run).cardPackingSources, 36);
  assert.deepEqual(getCardPackingBonus(4, 36), { amount: 36, remainder: 0 });
  const node = M.getChoices(run).find(choice => choice.type !== 'support');
  assert.ok(M.selectNode(run, node.id));
  assert.ok(M.beginFlightAttempt(run));
  assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, { success: true, flame: 0, condensedGlow: 4,
    cardPackingEligible: 4, cardPackingLedger: 1, cardPackingBonus: 36, cardPackingRemainder: 0 }));
  assert.equal(run.lastFlight.cardPackingBonus, 36, 'valid live tiered bonus is not clipped to five base cards');
});

test('every live card has an approved picture or is listed as falling back', async () => {
  const {LIVE_CARDS} = await import('../dist/skill-cards.mjs');
  const {CARD_ART_FILES} = await import('../dist/card-art-files.mjs');
  const {cardArt} = await import('../dist/card-art.mjs');
  const {existsSync} = await import('node:fs');
  const FALLBACK = [];
  for (const def of LIVE_CARDS) {
    if (FALLBACK.includes(def.id)) continue;
    assert.ok(CARD_ART_FILES[def.id], `${def.id}: picture listed`);
    assert.ok(existsSync(new URL('../dist/' + CARD_ART_FILES[def.id], import.meta.url)), `${def.id}: picture file exists`);
    assert.match(cardArt({cardId: def.id}), /data-card-picture="1"/);
  }
  assert.match(cardArt({cardId: 'no-such-card'}), /data-card-art="body-spark"/);
});

test('every live card has an approved picture or is listed as falling back', async () => {
  const {LIVE_CARDS} = await import('../dist/skill-cards.mjs');
  const {CARD_ART_FILES} = await import('../dist/card-art-files.mjs');
  const {cardArt} = await import('../dist/card-art.mjs');
  const {existsSync} = await import('node:fs');
  const FALLBACK = [];
  for (const def of LIVE_CARDS) {
    if (FALLBACK.includes(def.id)) continue;
    assert.ok(CARD_ART_FILES[def.id], `${def.id}: picture listed`);
    assert.ok(existsSync(new URL('../dist/' + CARD_ART_FILES[def.id], import.meta.url)), `${def.id}: picture file exists`);
    assert.match(cardArt({cardId: def.id}), /data-card-picture="1"/);
  }
  assert.match(cardArt({cardId: 'no-such-card'}), /data-card-art="body-spark"/);
});

test('every offered card rolls flat 94.5/5/0.5 whatever the node, map or slot', () => {
  assert.deepEqual(CARD_DROP_WEIGHTS.normal, { common: 94.5, rare: 5, legendary: 0.5 });
  assert.deepEqual(CARD_DROP_WEIGHTS.elite, CARD_DROP_WEIGHTS.normal);
  assert.deepEqual(CARD_DROP_WEIGHTS.boss, CARD_DROP_WEIGHTS.normal);
  const totals = { common: 0, rare: 0, legendary: 0 }; let n = 0;
  for (let seed = 0; seed < 4000; seed++) {
    const node = { id: `flat:${seed}` };
    for (const card of drawSkillCardDraft({ campaignSeed: `flat:${seed}`, mapIndex: seed % 3 }, node)) { totals[SKILL_CARDS[card.cardId].rarity]++; n++; }
  }
  assert.ok(Math.abs(totals.rare / n - .05) < .008, `rare ${totals.rare / n}`);
  assert.ok(Math.abs(totals.legendary / n - .005) < .003, `legendary ${totals.legendary / n}`);
});

test('an Elite reward reserves slot 1 for a Rare and a Guardian reward for a Legendary; the rest roll flat', () => {
  const rest = { elite: { common: 0, rare: 0, legendary: 0 }, boss: { common: 0, rare: 0, legendary: 0 } }; let n = 0;
  for (let seed = 0; seed < 3000; seed++) for (const [kind, rarity] of [['elite', 'rare'], ['boss', 'legendary']]) {
    const offers = drawSkillCardDraft({ campaignSeed: `guarantee:${seed}`, mapIndex: seed % 3 }, { id: `g:${seed}`, [kind]: true });
    assert.equal(SKILL_CARDS[offers[0].cardId].rarity, rarity, `${kind} slot 1`);
    assert.equal(new Set(offers.map(card => SKILL_CARDS[card.cardId].name)).size, 3);
    for (const card of offers.slice(1)) rest[kind][SKILL_CARDS[card.cardId].rarity]++;
    n += 2;
  }
  for (const kind of ['elite', 'boss']) {
    assert.ok(Math.abs(rest[kind].rare / (n / 2) - .05) < .008, `${kind} rest rare ${rest[kind].rare / (n / 2)}`);
    assert.ok(rest[kind].legendary / (n / 2) < .012, `${kind} rest legendary`);
  }
});
