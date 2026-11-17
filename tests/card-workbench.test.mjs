import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCardInspectorState, prepareCardInspectorReward } from '../dist/card-inspector.mjs';
import { cardsBenchMarkup, cardRewardMarkup, cardMeltSelectionMarkup, cardSwapMarkup, cardFace, cardMechanicMarkup } from '../dist/card-ui.mjs';
import { moveMountedCard, improveMountedCard, meltMountedCard, equipOwnedCard, getOwnedCards, getCardReward, getMountedCards, getSupportChoices } from '../dist/model.mjs';
import { makeSkillCard, describeSkillCard } from '../dist/skill-cards.mjs';
import { glowGaugeMarkup } from '../dist/glow-ui.mjs';

test('the direct sample works on real card actions and never touches either player save', () => {
  const app = readFileSync(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  // The factory is selected before loadState; all persistence exits in mock mode.
  assert.match(app, /if\(cardInspector\)state=createCardInspectorState/);
  assert.match(app, /mockMode=[^;]*\|\|cardInspector/);
  assert.match(app, /function persist\(\)\{if\(mockMode\)\{updateCheckpoint\(\);return true;\}/);
  assert.match(app, /if\(cardInspector\)\{const scenario=/);
  assert.match(readFileSync(new URL('../dist/cards.html', import.meta.url), 'utf8'), /cards-launcher\.mjs/);
  assert.match(readFileSync(new URL('../dist/cards-launcher.mjs', import.meta.url), 'utf8'), /query\.get\('mock'\)\s*===\s*'cards'/);
  const sample = createCardInspectorState(), initial = structuredClone(sample.run.mountedCards);
  assert.ok(moveMountedCard(sample.run, 0, 1));
  const outside = JSON.stringify(sample);
  assert.equal(improveMountedCard(sample, 0, 1), false, 'sample services obey the real camp gate');
  assert.equal(JSON.stringify(sample), outside);
  const camp = createCardInspectorState(new URLSearchParams('scenario=rest'));
  assert.ok(moveMountedCard(camp.run, 0, 1));
  assert.ok(improveMountedCard(camp, 0, 1));
  assert.equal(camp.run.mountedCards[0].charges, 4, 'camp improvement preserves remaining uses');
  assert.equal(sample.run.mountedCards[0].charges, 4);
  prepareCardInspectorReward(sample.run);
  const reward = getCardReward(sample.run);
  assert.equal(reward.claimed, true);
  assert.ok(equipOwnedCard(sample.run, reward.card.instanceId, 2));
  const once = sample.run.condensedGlow;
  assert.equal(equipOwnedCard(sample.run, reward.card.instanceId, 2), false);
  assert.equal(sample.run.condensedGlow, once);
  assert.ok(meltMountedCard(sample, 0));
  const reset = createCardInspectorState();
  assert.deepEqual(reset.run.mountedCards, initial);
  assert.equal(reset.run.condensedGlow, 90);
  prepareCardInspectorReward(sample.run);
  assert.ok(sample.run.cardReward.card.instanceId);
  assert.equal(new Set(sample.run.mountedCards.filter(Boolean).map(c=>c.instanceId)).size, sample.run.mountedCards.filter(Boolean).length);
});

test('Equipped foreground keeps collection behind one scrolling Deck and melting explicit', () => {
  const sample = createCardInspectorState(), before = JSON.stringify(sample), owned = getOwnedCards(sample.run);
  assert.equal(owned.length, 9);
  assert.equal(owned.filter(c => c.cardId === 'spark-cache').length, 2);
  const bench = cardsBenchMarkup(sample, { selectedId: 'sample:1', inspecting: true });
  const foreground = cardsBenchMarkup(sample);
  assert.match(foreground, /<h2>Equipped/);
  assert.match(foreground, /card-open-collection/);
  assert.equal((foreground.match(/class="card-equipped-face/g) || []).length, 3);
  assert.doesNotMatch(foreground, /card-deck-gallery|card-preview-forge|card-melt-mode/);
  assert.match(bench, /Equipped · slot 2 · Ready/);
  assert.match(bench, /aria-label="4 of 6 uses remaining: help"/);
  assert.match(bench, /disabled>Improve · Rest/);
  const campBench = cardsBenchMarkup(createCardInspectorState(new URLSearchParams('scenario=rest')), { selectedId: 'sample:1', inspecting: true });
  assert.match(campBench, /Improve · 15/);
  assert.match(bench, /card-unequip/);
  assert.match(bench, /card-readable/);
  assert.match(bench, /card-rule-band/);
  assert.doesNotMatch(bench, /1\/3/);
  const collection = cardsBenchMarkup(sample, { browsing: true });
  assert.equal((collection.match(/class="card-deck-pick/g) || []).length, 6);
  assert.match(collection, /Flash Handling/);
  assert.doesNotMatch(collection, /card-page|card-deck-pages/);
  assert.match(collection, /card-collection-slots/);
  assert.match(collection, /data-deck-drop="return"/);
  assert.match(collection, /select a card, then tap a slot/);
  assert.match(collection, /card-collection-back/);
  assert.equal(JSON.stringify(sample), before);
  const chooser = cardsBenchMarkup(sample, { selectedId: 'sample:stored:1', inspecting: true, equip: true });
  assert.match(chooser, /Echo → Deck/);
  assert.match(chooser, /card-cancel-equip/);
  const selecting = cardsBenchMarkup(sample, { meltMode: true, meltIds: ['sample:1', 'sample:stored:1'] });
  assert.match(selecting, /melt-selected/);
  assert.match(selecting, /1 equipped slot will become empty/);
  assert.match(selecting, /Review Melt/);
  const confirm = cardMeltSelectionMarkup(sample.run, ['sample:1', 'sample:stored:1'], 90);
  assert.match(confirm, /Melt 2 cards/);
  assert.match(confirm, /Equipped slot 2 will become empty/);
  assert.match(confirm, /Banked wallet 90 → 110/);
  assert.match(confirm, /card-cancel-melt/);
  assert.match(confirm, /These cards and their remaining uses will be lost/);
  assert.match(confirm, /card-furnace-icon/);
  assert.match(confirm, /card-melt-payout/);
  prepareCardInspectorReward(sample.run);
  const reward = cardRewardMarkup(sample.run);
  assert.match(reward, /New card/);
  assert.match(reward, /card-reward-continue/);
  assert.match(reward, /card-reward-equip/);
  assert.match(reward, /card-reward-slot/);
  assert.match(reward, /class="primary" data-action="card-reward-continue">Add to collection/);
  assert.match(reward, /card-preview-reward-melt/);
  assert.match(reward, /card-furnace-icon/);
  assert.doesNotMatch(reward, /replace|Melt incoming|card-equip-reward/i);
  const beforeReview = JSON.stringify(sample), single = cardMeltSelectionMarkup(sample.run, [sample.run.cardReward.card.instanceId], 90, { single: true });
  assert.match(single, /This card and its remaining uses will be lost/);
  assert.match(single, /Cancel · keep card/);
  assert.equal(JSON.stringify(sample), beforeReview, 'review does not change the receipt');
});

test('replacement review prints both complete cards, exact destinations and live risks without changing ownership', () => {
  const sample=createCardInspectorState(), run=sample.run;
  run.mountedCards=[makeSkillCard('twin-wick','out'),makeSkillCard('edge-reach','neighbor'),makeSkillCard('spark-cache','swap')];
  run.mountedCards[2].charges=2;run.reserveCards=[makeSkillCard('devourer','in')];
  const before=JSON.stringify(sample), markup=cardSwapMarkup(run,{id:'in',fromSlot:null,slot:0,expectedId:'out'});
  assert.equal((markup.match(/card-rule-band/g)||[]).length,2);
  assert.match(markup,/Equipped now → Deck/);assert.match(markup,/4 uses left/);
  // Approved plain wording (v1.0-cardtext) and plain status instructions.
  assert.doesNotMatch(markup,/Its ability stops/);assert.match(markup,/Fly with 2 Collectors/);assert.match(markup,/Eats the next Rare card/);
  assert.match(markup,/eats Edge Reach in Slot 2/);assert.match(markup,/Full hearts keep it/);
  assert.match(markup,/card-swap-back/);assert.match(markup,/Equip Devourer/);
  assert.equal(JSON.stringify(sample),before,'comparison never edits or spends cards');
  const swap=cardSwapMarkup(run,{id:'swap',fromSlot:2,slot:0,expectedId:'out'});
  assert.match(swap,/Slot 1 → slot 3/);assert.match(swap,/Both cards stay equipped/);assert.match(swap,/2 uses left/);
  assert.doesNotMatch(swap,/Its ability stops until equipped/);
  assert.equal(JSON.stringify(sample),before);
});

test('disposable Rest and starter inspection use the actual production model', () => {
  const rest = createCardInspectorState(new URLSearchParams('scenario=rest'));
  assert.equal(rest.run.phase, 'support');
  assert.ok(getSupportChoices(rest.run).every(c=>!c.effect.cardForge));
  const starter = createCardInspectorState(new URLSearchParams('scenario=starter'));
  assert.ok(getMountedCards(starter.run).every(c=>!c));
  assert.equal(starter.run.cardReward, undefined);
});

test('only a card-pilot meter has two quiet overfill ticks', () => {
  const sample=createCardInspectorState();
  assert.match(glowGaugeMarkup(sample.run), /spark-overfill-ticks/);
  delete sample.run.skillSystem;
  assert.doesNotMatch(glowGaugeMarkup(sample.run), /spark-overfill-ticks/);
});


test('playing-card faces print complete rules with contextual term controls and clipped atlas art', () => {
  const body = describeSkillCard(makeSkillCard('spark-cache', 'portrait:body'));
  const face = cardFace(body), plain = markup => markup.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  assert.match(face, /viewBox="313 0 313 313"/);
  assert.match(face, /assets\/cards\/skill-card-scenes-rare\.webp/);
  assert.match(face, /card-rule-band/);
  // Approved plain wording (v1.0-cardtext): Trigger chip, one short line, a small uses tag.
  assert.match(plain(face), /Collect/);
  assert.match(plain(face), /\+4 Sparks/);
  assert.match(plain(face), /6 uses/);
  assert.doesNotMatch(plain(face), /:/);
  assert.deepEqual([...face.matchAll(/data-rule-type="([^"]+)"/g)].map(match=>match[1]), ['condition','effect','note']);
  assert.match(face, /data-card-term="collect"/);
  assert.match(face, /data-card-term-trigger="spark-cache"/);
  assert.match(face, /aria-label="Pocket Sparks, common"/);
  assert.doesNotMatch(face, /class="card-rarity"/);
  assert.doesNotMatch(face, /title=|1\/3/);
  assert.doesNotMatch(cardFace(body, {compact:true}), /card-rule-band|<button/);
  const mechanics = cardMechanicMarkup(body, { details: true });
  assert.match(mechanics, /aria-label="Spark Meter"/);
  assert.match(face, /aria-label="6 of 6 uses remaining: help"/);
  assert.match(face, />6\/6<\/button>/);
  assert.match(mechanics, /<summary>Details<\/summary>/);
  const swipe = cardMechanicMarkup(describeSkillCard(makeSkillCard('field-impulse', 'portrait:swipe')));
  const echo = cardMechanicMarkup(describeSkillCard(makeSkillCard('echo', 'portrait:echo')));
  assert.match(plain(swipe), /Always on · Collector home, ¼ charge/);
  assert.match(plain(swipe), /Swipe: float, dive or speed up, 0\.8 s/);
  assert.match(swipe, /data-card-term="collector"/);
  assert.match(swipe, /data-card-term="ring"/);
  assert.match(plain(echo), /Next card/);assert.match(plain(echo), /Repeats the next card/);
  assert.match(echo, /data-card-term="copy"/);
  assert.match(echo, /data-card-terms|data-card-term="next"/);
});

test('body rewards stay together and scale with rank; only concrete terms use inline symbols', () => {
  for (const [rank, amount] of [[1,2],[2,3],[3,4]]) {
    const body = cardMechanicMarkup(describeSkillCard({...makeSkillCard('body-spark', 'rank'), rank}));
    const effect = /data-rule-type="effect">([\s\S]*?)<\/span><\/span><\/span>/.exec(body)?.[1] || body;
    assert.match(effect.replace(/<[^>]+>/g,'').replace(/\s+/g,' '), new RegExp(`\\+${amount} Sparks`));
    // The Collect chip names the touch; the green Sparks link to the meter they refill.
    assert.equal((body.match(/class="card-term-icon card-term-icon-meter"/g) || []).length, 1);
    assert.doesNotMatch(body, /card-term-symbol/);
    assert.match(body, /data-card-term="collect"/);
    assert.match(body, /aria-label="Spark Meter: help"/);
    assert.doesNotMatch(body, /natural|extra Sparks|card-mechanic-uses/);
  }
  const legendary = cardMechanicMarkup(describeSkillCard(makeSkillCard('harvest-legendary', 'paired')));
  assert.deepEqual([...legendary.matchAll(/data-rule-type="([^"]+)"/g)].map(match=>match[1]), ['condition','effect']);
  assert.match(cardMechanicMarkup(describeSkillCard(makeSkillCard('deep-vessel', 'passive'))).replace(/<[^>]+>/g,''), /Always on/);
  const terms = readFileSync(new URL('../dist/card-terms.mjs', import.meta.url), 'utf8');
  assert.match(terms, /collector-tether\/reel-front\.png/);
  assert.match(terms, /collector-tether\/reel\.mp4/);
  assert.match(terms, /controls muted playsinline/);
  assert.doesNotMatch(terms, /companionArtSvg|skillPortrait|pickupArtSvg/);
  const rhythm = cardMechanicMarkup(describeSkillCard(makeSkillCard('rhythm', 'rhythm')));
  assert.match(rhythm, /resource-symbol-lift/);
  assert.doesNotMatch(rhythm, /card-term-icon-wave/);
  const finite={...makeSkillCard('spark-cache','finite'),rank:3,charges:2};
  assert.match(cardFace(describeSkillCard(finite)), /aria-label="2 of 6 uses remaining: help"/);
  assert.match(cardFace(describeSkillCard(finite),{compact:true}), /role="img" aria-label="2 of 6 uses remaining">2\/6<\/span>/);
  assert.doesNotMatch(cardFace(describeSkillCard(makeSkillCard('body-spark','endless'))), /card-use-counter/);
});
