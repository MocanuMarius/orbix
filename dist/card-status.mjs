/** Configuration hints only. Every numeric verdict comes from a read-only row quote. */
import { SKILL_CARDS, CARD_ROW_EVENTS, getEffectiveCardSources, getCardRowRule, previewCardRowEvent, getUseDoublerTarget, getEmberFeederTargets, getCardFeederCapacity } from './skill-cards.mjs?v=guide-clarity-1';
import { normalizeCompanionFleet } from './companion-abilities.mjs?v=guide-clarity-1';
import { skillProgress } from './skill-increments.mjs?v=guide-clarity-1';

const ready = reason => ({ state: 'ready', symbol: '✓', label: 'Ready', reason, fix: 'Keep this arrangement to use it when its condition happens.' });
const blocked = (label, reason, fix) => ({ state: 'blocked', symbol: '!', label, reason, fix });
const shared = (label, reason) => ({ state: 'shared', symbol: '≈', label, reason, fix: 'You can keep it equipped or move it to reserve to make room.' });
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
    return blocked('Needs Rhythm', 'This card needs a completed Rhythm phrase. This build cannot produce that event.', 'Equip Rhythm anywhere in the row.');
  if (rule?.event === CARD_ROW_EVENTS.field && !context.field)
    return blocked('Needs Field', 'This card needs a successful Field Impulse. This build has no available Field ability.', 'Equip Field Impulse, or use the native Collector Field Impulse skill.');
  if ((rule?.event === CARD_ROW_EVENTS.guard || rule?.when?.guardRecovering) && !context.guard)
    return blocked('Needs a save', 'This card needs a Collector save or the recovery after one. This build cannot produce that condition.', 'Equip Watchlight, or use the native Collector Last Orbit skill.');
  if (rule?.event === CARD_ROW_EVENTS.delivery && !context.collector)
    return blocked('Needs Collector', 'This card needs a natural fuel delivery by Collector.', 'Choose Collector as your companion.');
  if (rule?.event === CARD_ROW_EVENTS.delivery && rule.when?.pickupKind === 'cache' && !context.cache)
    return blocked('Needs Cache fetch', 'Collector cannot deliver a Cache in this build. Touching it yourself is a different event.', 'Equip Cache Handling, or use the native Collector Cache Handling skill.');
  if (['shorten-recovery', 'shorten-reel'].includes(rule?.operation) && !context.collector)
    return blocked('Needs Collector', 'This card shortens Collector’s recovery, so it needs Collector in the active build.', 'Choose Collector as your companion.');
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
  const key = JSON.stringify([cards.map(card => card ? [card.instanceId, card.cardId, card.rank || 1, card.charges ?? null, card.chargeCapacity ?? null, card.fedCapacity ?? 0] : null), base, run.cardGrowUses || 0,run.cardTwinWickUnlocked===true]);
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
  const results = cards.map((card, slot) => {
    if (!card) return null;
    const ownDef = SKILL_CARDS[card.cardId];
    if (!ownDef) return null;
    const copy = ownDef.kind === 'echo' || ownDef.kind === 'chameleon';
    const source = sources.find(entry => entry.index === slot);
    if (copy && !source) {
      const target = cards[slot + 1], targetDef = SKILL_CARDS[target?.cardId];
      if (!target) return blocked('No target', 'There is no card in the slot immediately to the right.', 'Move this card directly left of a compatible card, with no empty slot between them.');
      if (ownDef.kind === 'echo' && targetDef?.kind !== 'dream' && (targetDef?.kind === 'capacity' || targetDef?.passive))
        return blocked('No action to copy', `${name(target)} is passive. Echo needs a triggered action to repeat.`, 'Move Echo directly left of a compatible action card. Chameleon can borrow this passive.');
      return blocked(`Cannot copy ${name(target)}`, `${name(target)} cannot be ${ownDef.kind === 'echo' ? 'repeated by Echo' : 'borrowed by Chameleon'}.`, 'Move this card directly left of a compatible card. Copying cards cannot copy each other.');
    }
    const def = source?.def || ownDef, physical = source?.source || card, kind = def.kind;
    if (kind === 'use-doubler') {
      const target = getUseDoublerTarget(cards, slot);
      if (!target) return blocked('Needs consumable right', 'The immediately adjacent right slot has no live consumable eligible for doubling.', 'Place a card with remaining uses directly right. Use Doubler cannot target another Use Doubler. It stays unspent without a valid target.');
      return ready(`At real flight entry, consume Use Doubler and double ${name(target)} in slot ${slot + 2} from ${target.charges} to ${target.charges * 2} remaining uses. Preview, Dream and later resumes do not trigger another doubling.`);
    }
    if (kind === 'ember-feeder') {
      const targets = getEmberFeederTargets(cards, slot), growth = getCardFeederCapacity(card);
      if (!targets.length) return blocked('Needs 2 cards right', `This Ember Feeder keeps +${growth} maximum Sparks while equipped, but cannot feed without two occupied cards to its right.`, 'Place two cards anywhere to its right. A successful flight consumes both together; fewer than two consumes neither.');
      return ready(`After a successful flight, permanently consume ${targets.map(({card: target, slot: targetSlot}) => `${name(target)} in slot ${targetSlot + 1}`).join(' and ')} together. This Ember Feeder grows from +${growth} to +${growth + 1} maximum Sparks while equipped. Physical consumers resolve left to right; no refill, copying or replay.`);
    }
    if (kind === 'devourer') {
      const target=cards[slot+1];
      if (SKILL_CARDS[target?.cardId]?.rarity !== 'rare')
        return blocked('Needs Rare to right', 'Devourer has no Rare in the immediately adjacent right slot to consume.', 'Place a Rare directly right. A successful clear consumes it only while a heart is missing; full hearts spare it.');
      return ready(`After a successful clear, consume ${name(target)} in slot ${slot+2} to restore 1 missing heart. Full hearts spare it. Devourers resolve left to right, after Heart Stitch; the target must still be equipped and present.`);
    }
    const rule = getCardRowRule(def, physical);
    const missing = getCardRowTriggerIssue(rule, context);
    if (missing) return missing;
    if (kind === 'refrain') {
      if (replaySlots.has(slot)) return ready('This row has a matching event whose second pass can pay an additional bonus. All Refrains share one replay.');
      if (replaySlots.size) return shared('Shared replay', 'An earlier Refrain already requests the same single replay. Extra Refrains do not add another pass.');
      return blocked('No replay payoff', 'This arrangement has no matching event that gains a bonus from the second pass. A last remaining use spent in the first pass cannot pay again.', 'Equip a repeatable triggered payoff, or preserve enough shared uses for the replay.');
    }
    if (rule) {
      if (successes.has(slot)) return ready(copy ? `Can ${ownDef.kind === 'echo' ? 'repeat' : 'borrow'} ${name(physical)} when its condition happens. Remaining uses belong to the real card.` : 'Can contribute in this arrangement when its printed condition happens. A full meter or temporary recovery does not mean the placement is wrong.');
      if (copiedUse.has(card.instanceId)) return shared('Shared use', 'The earlier copying card can spend this card’s last available use before its own slot acts. The use still pays through the copy.');
      if (rule.when?.lastOccupied && slot !== lastOccupied) return blocked('Must be last', 'Closing Chord only works from the rightmost occupied slot.', 'Move it after every other equipped card, with a Spark payer earlier in the row.');
      if (rule.minimumEarlierPayers >= 2) return blocked('Needs 2 payers', 'This card needs two earlier additive actions that pay Sparks during the same event and pass. Payers for different events cannot combine.', 'Move it after two actions for the same event. Echo repeats count as separate paying actions.');
      if (rule.operation === 'multiply' || rule.operation === 'add-last-payout' || rule.minimumEarlierPayers)
        return blocked('Move after payer', 'No compatible earlier action pays Sparks for this card’s event and conditions in the same pass. A recovery-only action does not pay Sparks.', 'Move it after a Spark-paying card that works on the same event, or equip that payer first.');
      return blocked('No matching effect', 'This arrangement cannot produce a useful result for this card’s matching condition.', 'Pair it with the ability named in its condition, then check the row order.');
    }
    if (['field', 'watchlight', 'cache-handling','twin-orbit','twin-wick','collector-range'].includes(kind) && !context.collector)
      return blocked('Needs Collector', 'This ability uses Collector and its ring.', 'Choose Collector as your companion.');
    if(kind==='twin-orbit'&&(run.cardTwinWickUnlocked||sources.some(entry=>entry.index<slot&&entry.def.kind==='twin-orbit')))
      return shared('Two already available','This expedition or an earlier Twin Orbit already provides a second Collector. The maximum is 2.');
    if(kind==='twin-wick'&&(run.cardTwinWickUnlocked||has('twin-orbit')||sources.some(entry=>entry.index<slot&&entry.def.kind==='twin-wick')))
      return shared('Use preserved','A second Collector is already available. Twin Wick keeps its use until it can unlock one for the expedition.');
    if(kind==='collector-range'&&copy)
      return shared('Shared reach and uses','Borrowing the same range extension adds no reach or catches. The original card supplies its shared remaining uses.');
    if (kind === 'wave-loom' && !context.field)
      return blocked('Needs Field', 'Wave Loom sends its wave after a successful Field Impulse. This build cannot make that swipe.', 'Equip Field Impulse, or use the native Collector Field Impulse skill.');
    if (kind === 'camp-grow' && run.cardGrowUses >= 3)
      return shared('Grow limit reached', 'All three Grow actions for this journey have already been used. Extra Growth Seeds share that limit.');
    if (['guide', 'rhythm', 'dream', 'cache-handling', 'wave-loom', 'watchlight', 'springboard', 'proximity'].includes(kind) && sources.some(entry => entry.index < slot && entry.def.kind === kind))
      return shared('Already covered', 'An earlier equipped card already provides this single shared ability. Extra copies do not add a second effect.');
    if (kind === 'spillway' && sources.some(entry => entry.def.kind === kind && (entry.def.pulseCadence < def.pulseCadence || entry.def.pulseCadence === def.pulseCadence && entry.index < slot)))
      return shared('Already covered', 'Another Spillway already provides the same or faster wave cadence. Only the strongest cadence applies.');
    return ready(copy ? `Can borrow ${name(physical)} in this arrangement. Its printed conditions and shared uses still apply.` : 'This ability can work in this build when its printed condition happens. Ready describes the arrangement, not a promise that it is active right now.');
  });
  lastKey = key;
  lastResult = Object.freeze(results.map(status => status ? Object.freeze(status) : null));
  return lastResult;
}

export function cardStatusText(status) {
  return status ? `${status.label}. ${status.reason} ${status.fix}` : '';
}
