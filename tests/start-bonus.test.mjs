import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {drawStartBonusIds, startBonusKind, WISP_STAT_IDS, START_CARD_IDS, wispChipText} from '../dist/start-bonus.mjs';
import {INSCRIPTION_IDS} from '../dist/inscriptions.mjs';
import {getGlowCapacity, getLifeCapacity} from '../dist/vitality.mjs';
import {inscriptionEffect} from '../dist/inscription-on-card.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {NO_EFFECT_AT_START} from '../dist/start-bonus.mjs';
import {starterCardsMarkup} from '../dist/card-ui.mjs';

const fresh = seed => { const state = M.newState(); state.profile.tutorialComplete = true; state.run = M.createRun(state.profile, seed, 1, {cards: true}); return state; };
const reload = state => { let v; assert.ok(M.saveState(state, {setItem: (_, x) => v = x, getItem: () => v})); return M.loadState({getItem: () => v}); };

test('three tiles, no duplicates, every kind mix occurs, each tile is a card / Inscription / Wisp stat with equal weight', () => {
  const n = 6000, kinds = {card: 0, inscription: 0, wisp: 0}, mixes = new Set(), perTile = [{card: 0, inscription: 0, wisp: 0}, {card: 0, inscription: 0, wisp: 0}, {card: 0, inscription: 0, wisp: 0}];
  for (let i = 0; i < n; i++) {
    const ids = drawStartBonusIds(`mix-${i}`);
    assert.equal(ids.length, 3); assert.equal(new Set(ids).size, 3);
    assert.deepEqual(drawStartBonusIds(`mix-${i}`), ids, 'seeded');
    ids.forEach((id, t) => { const k = startBonusKind(id); kinds[k]++; perTile[t][k]++; });
    mixes.add(ids.map(startBonusKind).sort().join('+'));
    for (const id of ids) {
      const [k, key] = id.split(':');
      assert.ok(k === 'card' ? START_CARD_IDS.includes(key) : k === 'inscription' ? INSCRIPTION_IDS.includes(key) : WISP_STAT_IDS.includes(key), id);
    }
  }
  assert.equal(mixes.size, 10, 'all ten multisets of three kinds appear: ' + [...mixes].join(' '));
  for (const k of Object.keys(kinds)) assert.ok(Math.abs(kinds[k] / (3 * n) - 1 / 3) < .02, `${k} share ${kinds[k] / (3 * n)}`);
  for (const t of perTile) for (const k of Object.keys(t)) assert.ok(Math.abs(t[k] / n - 1 / 3) < .03);
  assert.ok(INSCRIPTION_IDS.length === 18 && !INSCRIPTION_IDS.includes('far-lens'));
});

test('a new card run offers the three, keeps them through save and load, and renders three equal tiles', () => {
  const state = fresh('start-bonus-save'), offers = M.getStartingGiftOffers(state.run);
  assert.equal(state.run.cardStarterVersion, 4); assert.deepEqual(state.run.startBonusOfferIds, offers.map(o => o.id));
  assert.deepEqual(M.getStartingGiftOffers(reload(state).run), offers);
  assert.equal((starterCardsMarkup(state.run, offers, false).match(/class="card-pick"/g) || []).length, 3);
  assert.match(starterCardsMarkup(state.run, offers, false), /Choose your start/);
});

function pickById(prefix, seedBase) {
  for (let i = 0; i < 4000; i++) { const state = fresh(`${seedBase}-${i}`), offer = M.getStartingGiftOffers(state.run).find(o => o.id.startsWith(prefix)); if (offer) return {state, offer}; }
  assert.fail(prefix);
}
test('an Inscription pick is written on Chain slot 1 and Lift Guide is always mounted (Hollow leaves slot 1 empty)', () => {
  const {state, offer} = pickById('inscription:', 'ins');
  assert.ok(M.chooseStartingGift(state, offer.id));
  assert.equal(state.run.slotInscriptions[0]?.id, offer.inscriptionId);
  const ids = state.run.mountedCards.map(c => c?.cardId);
  assert.ok(ids.includes('lift-guide'));
  const hollow = pickById('inscription:hollow', 'hollow');
  assert.ok(M.chooseStartingGift(hollow.state, hollow.offer.id));
  assert.equal(hollow.state.run.mountedCards[0], null); assert.equal(hollow.state.run.mountedCards[1].cardId, 'lift-guide');
  assert.equal(hollow.state.run.slotInscriptions[0].id, 'hollow');
});

test('each Wisp stat applies through the run modifiers, respects caps, survives save and shows a chip', () => {
  const base = fresh('wisp-base').run, bm = M.getRunModifiers(base), bCap = getGlowCapacity(base), bLives = getLifeCapacity(base);
  for (const id of WISP_STAT_IDS) {
    const {state} = pickById(`wisp:${id}`, `w-${id}`), run = state.run;
    const lives = run.lives, stored = run.condensedGlow || 0;
    assert.ok(M.chooseStartingGift(state, `wisp:${id}`)); assert.equal(run.wispBonus, id);
    assert.ok(run.mountedCards.some(c => c?.cardId === 'lift-guide'));
    const m = M.getRunModifiers(run), back = reload(state).run;
    assert.equal(back.wispBonus, id); assert.match(wispChipText(back), /^Wisp: /);
    if (id === 'radius') assert.ok(Math.abs(m.attract / bm.attract - 1.2) < 1e-9);
    if (id === 'light') assert.equal(m.cardLuminancePercent - bm.cardLuminancePercent, 10);
    if (id === 'recovery') assert.ok(Math.abs(m.wispCooldown / bm.wispCooldown - .8) < 1e-9);
    if (id === 'meter') { assert.ok(getGlowCapacity(run) > bCap && getGlowCapacity(run) <= 1000 / 3 + 1e-9); assert.equal(run.flame, getGlowCapacity(run)); }
    if (id === 'heart') { assert.equal(getLifeCapacity(run), bLives + 1); assert.equal(run.lives, lives + 1); }
    if (id === 'stored') assert.equal(run.condensedGlow, stored + 10);
  }
});

test('a Boost never multiplies the Wisp stat and the Meter never passes 100', () => {
  const {state} = pickById('wisp:light', 'boost'); assert.ok(M.chooseStartingGift(state, 'wisp:light'));
  const run = state.run; run.mountedCards[2] = {cardId: 'crescendo', instanceId: 'cr:1', rank: 1};
  const withBoost = M.getRunModifiers(run).cardLuminancePercent; assert.equal(withBoost, 10);
  run.cardFutureCapacity = 1000; assert.ok(getGlowCapacity(run) <= 1000 / 3 + 1e-9);
});

test('no offered Inscription is a dud at run start; the excluded ones really do nothing there', () => {
  const guide = makeSkillCard('lift-guide', 'x');
  const offered = new Set();
  for (let i = 0; i < 3000; i++) for (const id of drawStartBonusIds(`dud-${i}`)) if (id.startsWith('inscription:')) offered.add(id.slice(12));
  assert.ok(offered.size >= 14);
  for (const id of offered) { assert.ok(!NO_EFFECT_AT_START.includes(id), id); if (id !== 'hollow') assert.equal(inscriptionEffect(id, guide).works, true, id); }
  assert.equal(inscriptionEffect('whetted', guide).works, false);
  // Mirror and Lodestone act on neighbours; at the start slot 1 has none (Lift Guide alone, slots 2 and 3 empty).
  for (const id of NO_EFFECT_AT_START) assert.ok(!offered.has(id), id);
});
