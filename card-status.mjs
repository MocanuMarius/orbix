/** Configuration hints only. Every numeric verdict comes from a read-only row quote. */
import { SKILL_CARDS, CARD_ROW_EVENTS, CARD_UNIT, getEffectiveCardSources, getCardRowRule, previewCardRowEvent, getUseDoublerTarget, getEmberFeederTargets, getCardFeederCapacity, getAlwaysOnCardBoosts } from './skill-cards.mjs?v=triggers-1';
import { getRawGlowCapacity, GLOW_CAPACITY_LIMIT_UNITS } from './vitality.mjs?v=triggers-1';
import { normalizeCompanionFleet } from './companion-abilities.mjs?v=triggers-1';
import { skillProgress } from './skill-increments.mjs?v=triggers-1';

/** Labels are plain instructions (docs/card-teaching-plan.md §3); `code` is stable for code. */
const ready = reason => ({ state: 'ready', symbol: '✓', label: 'Ready', code: 'ready', reason, fix: 'Keep this order to use it when its Trigger happens.' });
const blocked = (label, reason, fix, code) => ({ state: 'blocked', symbol: '!', label, code, reason, fix });
const shared = (label, reason, code) => ({ state: 'shared', symbol: '≈', label, code, reason, fix: 'You can keep it in your chain or move it to the reserve to make room.' });
const name = card => SKILL_CARDS[card?.cardId]?.name || 'this card';
let lastKey = null, lastResult = null;

function buildContext(run, native) {
  const collector = normalizeCompanionFleet(run.companions, run.companionRole)[0] === 'collector';
  return {
    collector,
    field: collector && !!(native?.collectorFieldImpulse ?? skillProgress(run.skills, 'collector-field-impulse')),
    guard: collector && !!(native?.collectorGuard ?? skillProgress(run.skills, 'collector-last-orbit')),
    cache: collector && (native ? native.collectorFetchMass >= 3 : skillProgress(run.skills, 'collector-fetch-large') > 0),
  };
}

/** Finite feasible combinations cover predicates together, rather than testing each in isolation. */
function fixtures(context) {
  const events = [];
  const add = (kind, detail = {}, { guard = true, recovery = true } = {}) => {
    for (const meterFraction of [.2, .8]) for (const collectorReeling of recovery && context.collector ? [false, true] : [false]) for (const guardRecovering of guard && context.guard && !collectorReeling ? [false, true] : [false]) {
      for (const availableRecovery of recovery && context.collector ? [0, 64] : [0])
        events.push({ kind, meterFraction, guardRecovering, availableRecovery, collectorReeling,
          availableReel: collectorReeling ? availableRecovery : 0, ...detail });
    }
  };
  for (const pickupKind of ['light', 'dusk', 'cluster', 'cache']) add(CARD_ROW_EVENTS.body, { pickupKind });
  for (const firstCrossing of [true, false]) add(CARD_ROW_EVENTS.wave, { firstCrossing, pickupKind: 'light' });
  add(CARD_ROW_EVENTS.flash, { pickupKind: 'sight' });
  add(CARD_ROW_EVENTS.flashExpiry, { pickupKind: 'sight' });
  add(CARD_ROW_EVENTS.lift);
  add(CARD_ROW_EVENTS.overfill, { meterFraction: 1 });
  if (context.collector) for (const pickupKind of ['light', 'cluster', ...(context.cache ? ['cache'] : [])]) {
    // A completed reel delivers at home with its ring ready.
    add(CARD_ROW_EVENTS.delivery, { pickupKind, availableRecovery: 0 }, { guard: false, recovery: false });
    add(CARD_ROW_EVENTS.attach, { pickupKind, availableRecovery: 4, availableReel: 4, collectorReeling: true }, { guard: false, recovery: false });
  }
  add(CARD_ROW_EVENTS.victory, {}, { guard: false, recovery: false });
  add(CARD_ROW_EVENTS.clear, {carriedStored:100}, { guard: false, recovery: false });
  if (context.rhythm) add(CARD_ROW_EVENTS.rhythm);
  if (context.field) for (const direction of ['up', 'down', 'right'])
    add(CARD_ROW_EVENTS.field, { direction, availableRecovery: 10 }, { guard: false, recovery: false });
  if (context.guard) add(CARD_ROW_EVENTS.guard, { availableRecovery: 40 }, { guard: false, recovery: false });
  return events;
}

export function getCardRowTriggerIssue(rule, context) {
  if (rule?.event === CARD_ROW_EVENTS.rhythm && !context.rhythm)
    return blocked('Needs Rhythm in the chain', 'Its Trigger is Rhythm: 3 even Lifts with the Rhythm card. Nothing in this chain makes that happen.', 'Put Rhythm anywhere in your chain.', 'needs-rhythm');
  if (rule?.event === CARD_ROW_EVENTS.field && !context.field)
    return blocked('Needs Field Impulse', 'It needs a Field Impulse swipe, and this build cannot swipe.', 'Learn the Collector Field Impulse skill.', 'needs-field');
  if ((rule?.event === CARD_ROW_EVENTS.guard || rule?.when?.guardRecovering) && !context.guard)
    return blocked('Needs Watchlight or Last Orbit', 'Its Trigger is Save, or the recovery after a save. This build cannot make a save.', 'Put Watchlight in your chain, or learn the Collector Last Orbit skill.', 'needs-save');
  if (rule?.event === CARD_ROW_EVENTS.delivery && !context.collector)
    return blocked('Needs Collector', 'Its Trigger is Delivery: Collector bringing you a pickup.', 'Choose Collector as your companion.', 'needs-collector');
  if (rule?.event === CARD_ROW_EVENTS.delivery && rule.when?.pickupKind === 'cache' && !context.cache)
    return blocked('Needs Cache Handling', 'Collector cannot bring you a Cache in this build. Touching one yourself is a different Trigger (Collect).', 'Put Cache Handling in your chain, or learn the Collector Cache Handling skill.', 'needs-cache');
  if (['shorten-recovery', 'shorten-reel'].includes(rule?.operation) && !context.collector)
    return blocked('Needs Collector', 'This card makes Collector ready sooner, so it needs Collector.', 'Choose Collector as your companion.', 'needs-collector');
  return null;
}

/** Shared physical prerequisites for status hints and read-only event previews. */
export function getCardRowTriggerContext(run = {}, native = null) {
  const cards = (Array.isArray(run) ? run : run.mountedCards || run.cards || []).slice(0, 5);
  const base = buildContext(run, native), sources = getEffectiveCardSources(cards);
  const has = kind => sources.some(entry => entry.def.kind === kind);
  return { ...base, rhythm: has('rhythm'), field: base.collector && (base.field || has('field')),
    guard: base.collector && (base.guard || has('watchlight')), cache: base.collector && (base.cache || has('cache-handling')) };
}

/** One bounded cache entry. Reserve, current meter and current cooldown never enter the key. */
export function getEquippedCardStatuses(run = {}, native = null) {
  const cards = (Array.isArray(run) ? run : run.mountedCards || run.cards || []).slice(0, 5);
  const base = buildContext(run, native);
  // The 100-Spark meter ceiling: capacity from every source, before the cap.
  const rawCapacity = Array.isArray(run) ? 0 : getRawGlowCapacity(run);
  const key = JSON.stringify([cards.map(card => card ? [card.instanceId, card.cardId, card.rank || 1, card.charges ?? null, card.chargeCapacity ?? null, card.fedCapacity ?? 0] : null), base, run.cardGrowUses || 0, Math.round(rawCapacity * 1000)]);
  if (key === lastKey) return lastResult;
  const sources = getEffectiveCardSources(cards);
  const has = kind => sources.some(entry => entry.def.kind === kind);
  const context = getCardRowTriggerContext(run, native);
  const receipts = fixtures(context).map(event => previewCardRowEvent(cards, event));
  const successes = new Set(), copiedUse = new Set(), replaySlots = new Set();
  for (const receipt of receipts) {
    const replayPays = receipt.steps.some(step => step.pass === 2 && step.success && step.operation !== 'replay-row' && (step.amount > 0 || step.stored > 0 || step.recoverySeconds > 0 || step.reelSeconds > 0 || step.futureCapacity > 0 || step.cruisingSpeed > 0));
    for (const step of receipt.steps) {
      if (step.success && step.operation !== 'replay-row') successes.add(step.slot);
      if (step.success && step.copiedBy && step.chargesAfter === 0) copiedUse.add(step.sourceInstanceId);
      if (step.operation === 'replay-row' && step.success && replayPays) replaySlots.add(step.slot);
    }
  }
  const lastOccupied = cards.findLastIndex(Boolean);
  const alwaysOn = getAlwaysOnCardBoosts(cards);
  const maxed = rawCapacity >= GLOW_CAPACITY_LIMIT_UNITS - 1e-9;
  const capacityFull = slot => rawCapacity - alwaysOn.filter(entry => entry.slot === slot && ['capacity', 'ember-feeder'].includes(entry.kind))
    .reduce((sum, entry) => sum + entry.boosted * CARD_UNIT, 0) >= GLOW_CAPACITY_LIMIT_UNITS - 1e-9;
  const max100 = () => shared('Max 100 reached', 'Your Spark Meter is at its 100-Spark ceiling, so this card adds no more max Sparks.', 'max-100');
  const results = cards.map((card, slot) => {
    if (!card) return null;
    const ownDef = SKILL_CARDS[card.cardId];
    if (!ownDef) return null;
    const copy = ownDef.kind === 'echo' || ownDef.kind === 'chameleon';
    const source = sources.find(entry => entry.index === slot);
    if (copy && !source) {
      const target = cards[slot + 1], targetDef = SKILL_CARDS[target?.cardId];
      if (!target) return blocked('Put a card to its right', 'The Slot directly to its right is empty, so there is nothing to copy.', 'Put a card it can copy in the next Slot, with no empty Slot between them.', 'no-target');
      if (ownDef.kind === 'echo' && targetDef?.kind !== 'dream' && (targetDef?.kind === 'capacity' || targetDef?.passive))
        return blocked("Can't repeat the card to its right", `${name(target)} is always on, so it never fires for Echo to repeat.`, 'Put a card with a Trigger directly to its right. Chameleon can copy always-on cards.', 'cannot-repeat');
      return blocked(ownDef.kind === 'echo' ? "Can't repeat the card to its right" : "Can't copy the card to its right", `${name(target)} cannot be ${ownDef.kind === 'echo' ? 'repeated by Echo' : 'copied by Chameleon'}.`, 'Put a card it can copy directly to its right. Copy cards cannot copy each other or × cards.', 'cannot-copy');
    }
    const def = source?.def || ownDef, physical = source?.source || card, kind = def.kind;
    if (kind === 'use-doubler') {
      const target = getUseDoublerTarget(cards, slot);
      if (!target) return blocked('Needs a card with uses to its right', 'The next Slot has no card with uses left to double.', 'Put a card with uses directly to its right; not another Use Doubler. It keeps its own use until then.', 'needs-uses-right');
      return ready(`When a real flight starts, Use Doubler is spent and ${name(target)} in Slot ${slot + 2} goes from ${target.charges} to ${target.charges * 2} uses. Previews, Dream and resuming never double again.`);
    }
    if (kind === 'ember-feeder' && capacityFull(slot)) return max100();
    if (kind === 'ember-feeder') {
      const targets = getEmberFeederTargets(cards, slot), growth = getCardFeederCapacity(card);
      if (!targets.length) return blocked('Needs two cards to its right', `This Ember Feeder keeps +${growth} max Sparks while it is in your chain, but it eats only when two cards sit to its right.`, 'Put two cards anywhere to its right. A clear eats both; fewer than two eats neither.', 'needs-two-right');
      return ready(`After a clear, it eats ${targets.map(({card: target, slot: targetSlot}) => `${name(target)} in Slot ${targetSlot + 1}`).join(' and ')} for good, and grows from +${growth} to +${growth + 1} max Sparks. No refill; copies and Encores never feed it.`);
    }
    if (kind === 'devourer') {
      const target=cards[slot+1];
      if (SKILL_CARDS[target?.cardId]?.rarity !== 'rare')
        return blocked('Needs a Rare card to its right', 'Devourer has no Rare card in the next Slot to eat.', 'Put a Rare card directly to its right. A clear eats it only while a heart is missing; full hearts keep it.', 'needs-rare-right');
      return ready(`After a clear with a heart missing, it eats ${name(target)} in Slot ${slot+2} for +1 heart. Full hearts keep it. Devourers act left to right, after Heart Stitch.`);
    }
    if (kind === 'capacity' && capacityFull(slot)) return max100();
    const rule = getCardRowRule(def, physical);
    if (rule?.operation === 'add-future-capacity' && maxed) return max100();
    const missing = getCardRowTriggerIssue(rule, context);
    if (missing) return missing;
    if (kind === 'keystone') return cards[slot - 1] || cards[slot + 1] ? ready('The cards on both sides of it fire twice when their Trigger happens. Their uses go each time.') : blocked('Needs a neighbour', 'Keystone makes the cards on its left and right fire twice, and both Slots next to it are empty.', 'Put a card in the Slot beside it.', 'no-neighbour');
    if (kind === 'refrain') {
      if (replaySlots.has(slot)) return ready('Some Trigger in this chain gives more in an Encore. All Refrains share one Encore.');
      if (replaySlots.size) return shared('Only one Encore fires', 'Another Refrain already gives this chain its one Encore per Trigger. More Refrains add nothing.', 'one-encore');
      return blocked('Nothing to fire again', 'No card in this chain gives anything more in an Encore. A card whose last use goes the first time cannot fire again.', 'Add a card with a Trigger, or keep enough uses for the Encore.', 'no-encore');
    }
    if (rule) {
      // A Boost with no Trigger of its own also strengthens always-on cards to its left.
      if (rule.operation === 'multiply' && !successes.has(slot) && alwaysOn.some(entry => entry.boostedBy.some(boost => boost.slot === slot)))
        return ready('Strengthens the always-on cards to its left, all the time, and the rewards of cards to its left when they fire.');
      if (successes.has(slot)) return ready(copy ? `${ownDef.kind === 'echo' ? 'Repeats' : 'Acts as'} ${name(physical)} when its Trigger happens. The uses belong to the real card.` : 'Works in this chain when its Trigger happens. A full meter or a ready Collector at the moment does not mean the order is wrong.');
      if (copiedUse.has(card.instanceId)) return shared('Its copy may use the last use', 'The copy card to its left can spend this card’s last use before it fires itself. That use still counts, through the copy.', 'shared-use');
      if (rule.when?.lastOccupied && slot !== lastOccupied) return blocked('Move to the last slot', 'Closing Chord works only as the last card in your chain.', 'Move it after every other card in your chain, with a card that gives something before it.', 'must-be-last');
      if (rule.operation === 'multiply')
        return blocked('Needs a card before it', 'No card to its left gives Sparks or saves Collector time on the same Trigger, so there is nothing to multiply. Boosts never multiply Stored Sparks or forever gains.', 'Put a card that gives Sparks or saves Collector time, with the same Trigger, to its left; or an always-on card it can boost.', 'needs-card-before');
      if (rule.operation === 'add-last-payout' || rule.minimumEarlierPayers)
        return blocked('Needs a + card before it', 'No + card to its left adds Sparks on the same Trigger. A card that only saves Collector time is not a + card.', 'Put a + card with the same Trigger to its left.', 'needs-plus-before');
      return blocked("Can't fire in this chain", 'Nothing in this chain makes its Trigger or condition happen.', 'Pair it with the card or skill named in its Trigger, then check the order.', 'no-effect');
    }
    if (['field', 'watchlight', 'cache-handling','twin-orbit','twin-wick','collector-range'].includes(kind) && !context.collector)
      return blocked('Needs Collector', 'This card uses Collector and its charge.', 'Choose Collector as your companion.', 'needs-collector');
    if(kind==='twin-orbit'&&sources.some(entry=>entry.index<slot&&entry.def.kind==='twin-orbit'))
      return shared('Second Collector already here','Another Twin Orbit already gives you a second Collector. The most is 2.','two-collectors');
    if(kind==='twin-wick'&&(has('twin-orbit')||sources.some(entry=>entry.index<slot&&entry.def.kind==='twin-wick')))
      return shared('Keeps its use for now','A second Collector is already here. Twin Wick keeps its uses until it is needed.','use-kept');
    if(kind==='collector-range'&&copy)
      return shared('Reach already covered','Copying the same reach card adds no reach or catches. The real card keeps its uses.','reach-covered');
    if (kind === 'camp-grow' && run.cardGrowUses >= 3)
      return shared('Grow limit reached', 'All 3 Grows for this journey are used. Every Growth Seed shares that limit.', 'grow-limit');
    if (['guide', 'rhythm', 'dream', 'cache-handling', 'wave-loom', 'watchlight', 'springboard', 'proximity'].includes(kind) && sources.some(entry => entry.index < slot && entry.def.kind === kind))
      return shared('Already covered', 'A card to its left already gives this ability, and extra copies do not add a second one.', 'covered');
    if (kind === 'spillway' && sources.some(entry => entry.def.kind === kind && (entry.def.pulseCadence < def.pulseCadence || entry.def.pulseCadence === def.pulseCadence && entry.index < slot)))
      return shared('Already covered', 'Another Spillway already sends Pulses as often or more often. Only the fastest counts.', 'covered');
    return ready(copy ? `Acts as ${name(physical)} in this chain. Its conditions and uses still apply.` : 'Works in this build when its condition happens. Ready describes the order, not that it is active right now.');
  });
  lastKey = key;
  lastResult = Object.freeze(results.map(status => status ? Object.freeze(status) : null));
  return lastResult;
}

export function cardStatusText(status) {
  return status ? `${status.label}. ${status.reason} ${status.fix}` : '';
}
