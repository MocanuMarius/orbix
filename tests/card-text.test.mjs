// Plain card wording v1.0-cardtext (approved 2026-11-17) with the Boost rules and the new ladder.
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_TEXT} from '../dist/design-lab/cardtext.mjs';
import {SKILL_CARDS, makeSkillCard, describeSkillCard, CARD_SYSTEM} from '../dist/skill-cards.mjs';
import {getCardRuleBands, getCardTrigger, CARD_TRIGGERS} from '../dist/card-rule-bands.mjs';
import {triggerDisplay} from '../dist/card-trigger-labels.mjs';
import {CARD_TERMS} from '../dist/card-terms.mjs';
import {CARD_GUIDE_TOPICS} from '../dist/card-guide.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';

const BANNED = [/\bpass(?:es|’s|'s)?\b/i, /\bpayers?\b/i, /\breplay/i, /matching event/i, /\bso far\b/i, /\bearlier\b/i, /\bequipped\b/i, /\bmounted\b/i, /\bbonus\b/i, /\bpays?\b/i];
const CHIP = {'Collect':'collect','Delivery':'delivery','Latch':'latch','Wave':'wave','Flash':'flash','Flash ends':'flash-ends','Falling Lift':'falling-lift','Lift':'falling-lift',
  'Overfill':'overfill','Rhythm':'rhythm','Clear':'clear','Any Trigger':'any','Next card':'next','Always on':'always-on','At Rest':'rest'};
// One word for the ring of light (designer, 2026-11-17): the design-lab data still says "Wave".
// Trigger labels were simplified (dist/card-trigger-labels.mjs); the lab table keeps the old words.
const HEAD = {'Lift':'Lift','Flash':'Collect a Flare','Latch':'When your Collector grabs a Spark','Flash ends':'When a Flare ends','Falling Lift':'Lift while falling','Rhythm':'Lift on the beat','Clear':'Finish','Any Trigger':'Boost','Next card':'Repeat','Always on':'Passive'};
const chipLabel = t => triggerDisplay(CHIP[t]).label, headOf = (t, c) => t === 'Delivery' && c === 'Cluster' ? 'Deliver a Cluster' : (HEAD[t] || t) + (c ? ` · ${c}` : '');
const pulse = text => text && text.replace(/\b[Ww]aves?\b/g, word => word.endsWith('s') ? 'Pulses' : 'Pulse');
const BOOST_TEXT = {'prism-lens':'Every card before it ×1.25','prism-lens-ii':'Every card before it ×3','crescendo':'Double every card before it',
  'closing-chord':'Every card before it ×2.5','second-sun':'Every card before it ×2, ×3 in an Encore'};

test('all 85 approved cards carry their Trigger chip as data and the approved plain wording', () => {
  assert.equal(CARD_TEXT.length, 85);
  // Wave Loom came back as an engine card with its own chip (tests/card-engines.test.mjs); the lab table keeps its old line.
  for (const entry of CARD_TEXT.filter(entry => !SKILL_CARDS[entry.id]?.engine && !['home-beacon', 'last-light', 'mending-moss', 'growth-ring'].includes(entry.id))) { // reworked 2026-11-18 (Save removed); see tests/real-flight-triggers.test.mjs
    const def = SKILL_CARDS[entry.id], card = describeSkillCard(makeSkillCard(entry.id, `text:${entry.id}`));
    assert.ok(def, entry.id);
    assert.equal(def.trigger, CHIP[entry.t], `${entry.id} trigger id`);
    assert.deepEqual({id: getCardTrigger(def).id, label: getCardTrigger(def).label, condition: getCardTrigger(def).condition}, {id: CHIP[entry.t], label: chipLabel(entry.t), condition: entry.c || ''}, entry.id);
    assert.equal(card.trigger.label, chipLabel(entry.t), `${entry.id} described trigger`);
    const bands = getCardRuleBands(card, def);
    assert.equal(bands[0].type, 'condition');assert.equal(bands[0].text, entry.id === 'lift-guide' ? 'Lift on the cue' : headOf(pulse(entry.t), entry.c), entry.id); // Lift Guide uses its own arrow window, not the Rhythm phrase
    assert.equal(bands[0].trigger, CHIP[entry.t]);
    const what = bands.find(band => band.type === 'effect').text;
    assert.equal(what, BOOST_TEXT[entry.id] || pulse(entry.b || entry.x).replace(/Flash/g, "Flare"), `${entry.id} what line`);
    const tag = bands.find(band => band.type === 'note')?.text;
    if (entry.u) assert.equal(tag, entry.u, `${entry.id} tag`); else assert.equal(tag, undefined, entry.id);
    assert.ok(bands.length <= 3, entry.id);
  }
});

test('no card face uses pass, payer, replay, matching event or the other dropped words', () => {
  for (const def of Object.values(SKILL_CARDS)) for (const rank of [1, def.maxRank]) {
    const card = describeSkillCard({...makeSkillCard(def.id, `words:${def.id}`), rank});
    for (const band of getCardRuleBands(card, def)) for (const word of [...BANNED, /\bwaves?\b/i]) assert.doesNotMatch(band.text, word, `${def.id}: ${band.text}`);
    for (const word of [/\bpass(?:es)?\b/i, /\bpayers?\b/i, /\breplay/i, /matching event/i]) assert.doesNotMatch(card.effect, word, `${def.id} description`);
    assert.doesNotMatch(getCardRuleBands(card, def).map(band => band.text).join(' '), /\{\w+\}/, `${def.id}: unresolved token`);
  }
  // Rank and remaining uses stay live on the face.
  const body = describeSkillCard({...makeSkillCard('body-spark', 'rank'), rank: 3});
  assert.equal(getCardRuleBands(body).find(band => band.type === 'effect').text, '+4 Sparks');
  assert.equal(getCardRuleBands(describeSkillCard(makeSkillCard('harvest-common', 'one'))).find(band => band.type === 'effect').text, '+1 Spark');
  const pocket = describeSkillCard({...makeSkillCard('spark-cache', 'uses'), charges: 1});
  assert.equal(getCardRuleBands(pocket).find(band => band.type === 'note').text, '1 use');
});

test('glossary and Field Guide use Chain, Slots, Triggers and Encore, and drop the stale lines', () => {
  for (const key of ['pass', 'slot', 'trigger', 'boost', 'encore', 'always-on', 'next', 'collect', 'delivery', 'overfill', 'falling-lift', 'clear'])
    assert.ok(CARD_TERMS[key], key);
  assert.equal(CARD_TERMS.pass[0], 'Chain');
  for (const [title, text] of Object.values(CARD_TERMS)) for (const word of [/\bpass(?:es)?\b/i, /\bpayers?\b/i, /\breplay/i, /matching event/i])
    assert.doesNotMatch(`${title} ${text}`, word, title);
  const guide = JSON.stringify(CARD_GUIDE_TOPICS);
  for (const word of [/\bpass(?:es)?\b/i, /\bpayers?\b/i, /\breplay/i, /matching event/i, /three ordered slots/i, /choice of two/i, /one charge/i, /Rare equipped/i, /50%/])
    assert.doesNotMatch(guide, word);
  assert.match(guide, /Common 15, Rare 40, Legendary 150/);
  assert.match(guide, /left to right/);
});

test('status labels are plain instructions', () => {
  const run = ids => ({skillSystem: CARD_SYSTEM, companions: ['collector'], mountedCards: ids.map((id, i) => id ? makeSkillCard(id, `st:${i}`) : null)});
  const labels = ids => getEquippedCardStatuses(run(ids)).map(status => status?.label ?? null);
  assert.deepEqual(labels(['echo', null, 'body-spark']), ['Put a card to its right', null, 'Ready']);
  assert.deepEqual(labels(['body-spark', 'closing-chord', 'deep-vessel']).slice(0, 2), ['Ready', 'Move to the last slot']);
  assert.equal(labels(['kindling-bead'])[0], 'Needs a + card before it');
  assert.equal(labels(['prism-lens'])[0], 'Needs a card before it');
  assert.equal(labels(['echo', 'lantern-lens'])[0], "Can't repeat the card to its right");
  assert.equal(labels(['use-doubler', 'body-spark'])[0], 'Needs a card with uses to its right');
  assert.deepEqual(labels(['body-spark', 'refrain', 'refrain']).slice(1), ['Ready', 'Only one Encore fires']);
  for (const status of getEquippedCardStatuses(run(['kindling-bead', 'prism-lens', 'refrain', 'echo', 'toll-bell'])).filter(Boolean))
    for (const word of [/\bpass(?:es)?\b/i, /\bpayers?\b/i, /\breplay/i, /matching event/i]) assert.doesNotMatch(`${status.label} ${status.reason} ${status.fix}`, word, status.label);
});

test('one word for the ring of light: Pulse, in Trigger names, glossary and status text', () => {
  assert.equal(CARD_TRIGGERS.wave.label, 'Pulse');assert.equal(CARD_TRIGGERS.wave.event, 'wave-crossing', 'code ids stay');
  assert.equal(CARD_TERMS.wave[0], 'Pulse');
  for (const [title, text] of Object.values(CARD_TERMS)) assert.doesNotMatch(`${title} ${text}`, /\bwaves?\b/i, title);
  assert.doesNotMatch(JSON.stringify(CARD_GUIDE_TOPICS), /\bwaves?\b/i);
  assert.equal(SKILL_CARDS['wave-loom'].name, 'Wave Loom', 'card names are left for the coordinator');
});
