import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_SYSTEM,CARD_ROW_EVENTS,makeSkillCard,previewCardRowEvent} from '../dist/skill-cards.mjs';
import {getCardRowPreviewEvents,previewEquippedCardRow} from '../dist/card-row-preview.mjs';

const row = (ids, extra = {}) => ({skillSystem:CARD_SYSTEM,cardSlots:ids.length,companions:['collector'],
  mountedCards:ids.map((id,slot) => id ? makeSkillCard(id,`try:${slot}`) : null),...extra});
const option = (run,kind,extra = {}) => getCardRowPreviewEvents(run).find(item => item.event.kind === kind && Object.entries(extra).every(([key,value]) => item.event[key] === value));

test('Try row quotes exact equipped cards, empties, rank and shared uses without changing any run data', () => {
  const run = row(['echo-iii','spark-cache',null,'refrain','closing-chord'],{reserveCards:[makeSkillCard('body-spark','reserve')],scoreLedger:{earned:20},cardHistory:[{type:'pickup'}]});
  run.mountedCards[1].rank = 3;run.mountedCards[1].charges = 2;
  const before = structuredClone(run), preview = previewEquippedCardRow(run);
  assert.deepEqual(preview.trace,previewCardRowEvent(run.mountedCards,preview.event));
  assert.equal(preview.cards[2],null);assert.equal(preview.cards[1].rank,3);
  assert.deepEqual(preview.steps.filter(step => step.slot === 0 && step.pass === 1).map(step => [step.step.chargesBefore,step.step.chargesAfter]),[[2,1],[1,0],[0,0]]);
  assert.equal(preview.trace.passes,2);assert.equal(preview.trace.sparks,21);
  assert.equal(preview.chargesBefore['try:1'],2);assert.equal(preview.chargesAfter['try:1'],0);
  assert.deepEqual(run,before);
});

test('a real but empty second pass remains visible after pass 1 spends the last use', () => {
  const run = row(['spark-cache','refrain']);run.mountedCards[0].charges = 1;
  const p = previewEquippedCardRow(run), starts = p.frames.filter(frame => frame.type === 'pass-start');
  assert.equal(p.passes,2);assert.equal(starts.length,2);
  assert.equal(starts[1].totals.sparks,4);assert.equal(starts[1].passSparks,0);
  assert.equal(starts[1].chargesAfter['try:0'],0);
  assert.equal(p.steps.filter(step => step.pass === 2 && step.success).length,0);
  assert.equal(p.steps.find(step => step.pass === 2).skipReason,'exhausted-source');
  assert.match(p.steps.find(step => step.pass === 2).reason,/no uses left/);
});

test('empty, passive-only and Refrain-only rows never invent a listener or replacement cards', () => {
  for (const ids of [[null,null,null],['deep-vessel','lift-guide',null],['refrain','prism-lens',null]]) {
    const run = row(ids), p = previewEquippedCardRow(run);
    assert.deepEqual(p.cards,run.mountedCards);assert.equal(p.trace.passes,0);assert.equal(p.frames.length,0);
    assert.equal(p.started,false);assert.match(p.noPayReason,/no row pass starts/i);
  }
});

test('a listened-for but unmatched event walks and skips instead of silently becoming another event', () => {
  const run = row(['first-ripple','refrain',null]), later = option(run,CARD_ROW_EVENTS.wave,{firstCrossing:false});
  const p = previewEquippedCardRow(run,later.id);
  assert.equal(p.started,true);assert.equal(p.passes,1);assert.equal(p.trace.sparks,0);
  assert.equal(p.steps[2].skipReason,'empty-slot');assert.equal(p.steps[1].skipReason,'no-productive-action');
  assert.match(p.steps[0].reason,/first crossing/);assert.match(p.noPayReason,/no matching action/);
});

test('event availability shares real ability predicates and cannot manufacture Rhythm or Collector', () => {
  const run = row(['echo','toll-bell','crate-lining','mending-moss','fast-spool'],{companions:['protector'],companionRole:'protector'});
  for (const kind of [CARD_ROW_EVENTS.rhythm,CARD_ROW_EVENTS.delivery]) {
    const selected = option(run,kind), p = previewEquippedCardRow(run,selected.id);
    assert.equal(selected.available,false);assert.equal(p.passes,0);assert.equal(p.trace.sparks,0);
    assert.match(p.noPayReason,kind === CARD_ROW_EVENTS.rhythm ? /Rhythm/ : /Collector/);
  }
  const ordinary = previewEquippedCardRow(run,option(run,CARD_ROW_EVENTS.body,{guardRecovering:false,collectorReeling:false}).id);
  assert.equal(ordinary.available,true);assert.equal(ordinary.trace.reelSeconds,0);assert.equal(ordinary.trace.recoverySeconds,0);
  const recovery = option(run,CARD_ROW_EVENTS.body,{guardRecovering:true});
  assert.equal(recovery.available,false);
});

test('low-meter, pickup, recovery, reel and first/later conditions remain distinct selectable scenarios', () => {
  const run = row(['low-wick','dusk-wick','first-ripple','mending-moss','watchlight']);
  const low = previewEquippedCardRow(run,option(run,CARD_ROW_EVENTS.body,{meterFraction:.2,pickupKind:'dusk',guardRecovering:false}).id);
  const high = previewEquippedCardRow(run,option(run,CARD_ROW_EVENTS.body,{meterFraction:.8,pickupKind:'dusk',guardRecovering:false}).id);
  assert.equal(low.trace.sparks,25);assert.equal(high.trace.sparks,20);
  assert.match(high.steps[0].reason,/threshold/);
  const recovery = previewEquippedCardRow(run,option(run,CARD_ROW_EVENTS.body,{meterFraction:.2,guardRecovering:true}).id);
  assert.equal(recovery.trace.recoverySeconds,3);assert.match(recovery.assumptions,/10s recovery/);
  assert.ok(option(run,CARD_ROW_EVENTS.wave,{firstCrossing:true}));assert.ok(option(run,CARD_ROW_EVENTS.wave,{firstCrossing:false}));
  const reelRun = row(['fast-spool','refrain']);
  const reel = previewEquippedCardRow(reelRun,option(reelRun,CARD_ROW_EVENTS.body,{collectorReeling:true}).id);
  assert.equal(reel.trace.reelSeconds,4);assert.match(reel.description,/4s left/);
  assert.equal(reel.frames.at(-1).totals.reelSeconds,4);
});

test('clear uses real carry-in and remaining cruising speed room, with a separate zeroed second subtotal', () => {
  const run = row(['nest-egg','wind-feather','growth-ring','refrain'],{condensedGlow:99,cardCruisingSpeedUnlocked:5,attemptActive:true,attemptEntry:{cardCarriedStored:20,condensedGlow:80}});
  const p = previewEquippedCardRow(run,option(run,CARD_ROW_EVENTS.clear).id);
  assert.equal(p.event.carriedStored,20);assert.equal(p.event.cruisingSpeedRoom,1);
  assert.equal(p.totals.stored,4);assert.equal(p.totals.cruisingSpeed,1);assert.equal(p.totals.futureCapacity,2);
  assert.match(p.assumptions,/20 Stored Sparks carried into this flight/);
  const last = p.frames.at(-1);
  for (const key of Object.keys(p.totals)) assert.equal(last.totals[key],p.trace[key]);
  run.cardCruisingSpeedUnlocked=6;
  const capped=previewEquippedCardRow(run,option(run,CARD_ROW_EVENTS.clear).id);
  assert.equal(capped.totals.cruisingSpeed,0);assert.match(capped.steps[1].reason,/\+6%/);
});

test('nonrow physical consumers and passives never execute or consume in the preview', () => {
  const run = row(['use-doubler','spark-cache','ember-feeder','devourer','deep-vessel']);
  const p = previewEquippedCardRow(run);
  assert.equal(p.cards[1].charges,6);assert.equal(p.chargesBefore['try:0'],1);assert.equal(p.chargesAfter['try:0'],1);
  for (const slot of [0,2,3,4]) {
    assert.equal(p.steps[slot].success,false);assert.match(p.steps[slot].reason,/separate ability|passive/);
  }
  assert.equal(run.mountedCards.length,5);assert.equal(run.mountedCards[1].charges,6);
});

test('default chooses a productive real scenario while an explicit no-pay choice stays selected', () => {
  const run = row(['harvest-common','prism-lens','refrain']);
  const p = previewEquippedCardRow(run);
  assert.equal(p.event.kind,CARD_ROW_EVENTS.wave);assert.equal(p.trace.sparks,2.5);
  const explicit = previewEquippedCardRow(run,option(run,CARD_ROW_EVENTS.body).id);
  assert.equal(explicit.event.kind,CARD_ROW_EVENTS.body);assert.equal(explicit.passes,0);
  assert.match(explicit.noPayReason,/no row pass starts/);
});
