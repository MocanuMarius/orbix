/** Try row is a quote of the equipped row, never a flight or a reward settlement. */
import {CARD_ROW_EVENTS, SKILL_CARDS, describeSkillCard, previewCardRowEvent, hasCardRowEvent, cleanCardCruisingSpeed} from './skill-cards.mjs?v=storm-guide-1';
import {getCardRowCards, getCardRowSource, describeCardRowScenario} from './card-row-help.mjs?v=storm-guide-1';
import {getCardRowTriggerContext, getCardRowTriggerIssue} from './card-status.mjs?v=storm-guide-1';

const n = value => Number((Number(value) || 0).toFixed(3));
const count = value => Math.max(0, Math.floor(Number(value) || 0));
const labels = {
  [CARD_ROW_EVENTS.body]:'Wisp pickup', [CARD_ROW_EVENTS.wave]:'Wave crossing', [CARD_ROW_EVENTS.flash]:'Flash pickup',
  [CARD_ROW_EVENTS.flashExpiry]:'Flash expires', [CARD_ROW_EVENTS.lift]:'Falling Lift', [CARD_ROW_EVENTS.overfill]:'Spark overfill',
  [CARD_ROW_EVENTS.delivery]:'Collector delivery', [CARD_ROW_EVENTS.attach]:'Collector attachment', [CARD_ROW_EVENTS.rhythm]:'Rhythm phrase',
  [CARD_ROW_EVENTS.field]:'Field Impulse swipe', [CARD_ROW_EVENTS.guard]:'Collector save', [CARD_ROW_EVENTS.clear]:'Flight clear',
  [CARD_ROW_EVENTS.victory]:'Third Guardian defeated',
};
const zeroTotals = () => ({sparks:0, stored:0, futureCapacity:0, cruisingSpeed:0, recoverySeconds:0, reelSeconds:0});
export const cardRowPreviewTotalsLabel = totals => [
  `+${n(totals.sparks)} bonus Sparks`, totals.stored ? `+${n(totals.stored)} Stored Sparks` : '',
  totals.futureCapacity ? `+${n(totals.futureCapacity)} maximum Sparks` : '', totals.cruisingSpeed ? `+${n(totals.cruisingSpeed)}% cruising speed` : '',
  totals.recoverySeconds ? `−${n(totals.recoverySeconds)}s recovery` : '', totals.reelSeconds ? `−${n(totals.reelSeconds)}s reel` : '',
].filter(Boolean).join(' · ');

const carryIn = run => count(run?.attemptActive && run.attemptEntry
  ? run.attemptEntry.cardCarriedStored ?? run.attemptEntry.condensedGlow
  : run?.cardCarriedStored ?? run?.carriedCondensedGlow ?? run?.condensedGlow);
const speedRoom = run => 6 - cleanCardCruisingSpeed(run?.cardCruisingSpeedUnlocked ?? run?.cardCruisingSpeed);
const relevantRules = cards => cards.map((_,slot) => ({slot, ...getCardRowSource(cards,slot)})).filter(entry => entry.rule);

function issueForEvent(event, context) {
  const physical = getCardRowTriggerIssue({event:event.kind, when:{pickupKind:event.pickupKind, guardRecovering:event.guardRecovering || undefined}},context);
  if (physical) return `${physical.reason} ${physical.fix}`;
  if (event.kind === CARD_ROW_EVENTS.attach && !context.collector || event.collectorReeling && !context.collector)
    return 'This event needs Collector in the active build. Choose Collector as your companion.';
  if (event.kind === CARD_ROW_EVENTS.attach && event.pickupKind === 'cache' && !context.cache)
    return 'Collector needs Cache Handling before it can attach to a Cache.';
  return '';
}

/** A small set of labeled scenarios derived from the conditions printed in this row. */
export function getCardRowPreviewEvents(run = {}) {
  const cards = getCardRowCards(run), rules = relevantRules(cards), context = getCardRowTriggerContext(run);
  const kinds = [...new Set([CARD_ROW_EVENTS.body, ...rules.map(({rule}) => rule.event).filter(kind => kind !== '*')])];
  const options = [];
  for (const kind of kinds) {
    const matching = rules.filter(({rule}) => rule.event === kind || rule.event === '*' && ![CARD_ROW_EVENTS.clear,CARD_ROW_EVENTS.victory,CARD_ROW_EVENTS.attach].includes(kind));
    const whens = matching.map(({rule}) => rule.when || {});
    const pickups = [CARD_ROW_EVENTS.body,CARD_ROW_EVENTS.delivery,CARD_ROW_EVENTS.attach].includes(kind)
      ? [...new Set(['light', ...whens.map(when => when.pickupKind).filter(Boolean)])] : [kind === CARD_ROW_EVENTS.flash || kind === CARD_ROW_EVENTS.flashExpiry ? 'sight' : 'light'];
    const meters = whens.some(when => when.meterAtMost !== undefined) ? [.2,.8] : [kind === CARD_ROW_EVENTS.overfill ? 1 : .2];
    const crossings = kind === CARD_ROW_EVENTS.wave ? [true,false] : [false];
    const directions = kind === CARD_ROW_EVENTS.field ? [...new Set(['up', ...whens.map(when => when.direction).filter(Boolean)])] : ['up'];
    const needsReel = kind === CARD_ROW_EVENTS.attach || whens.some(when => when.collectorReeling) || matching.some(({rule}) => rule.operation === 'shorten-reel');
    const states = [{guardRecovering:false,collectorReeling:false,availableRecovery:0,availableReel:0}];
    if (matching.some(({rule}) => rule.operation === 'shorten-recovery') && context.collector)
      states.push({guardRecovering:false,collectorReeling:false,availableRecovery:10,availableReel:0});
    if (whens.some(when => when.guardRecovering))
      states.push({guardRecovering:true,collectorReeling:false,availableRecovery:10,availableReel:0});
    if (needsReel) states.push({guardRecovering:false,collectorReeling:true,availableRecovery:4,availableReel:4});
    const allowedStates = kind === CARD_ROW_EVENTS.delivery ? [states[0]] : kind === CARD_ROW_EVENTS.attach ? states.filter(state => state.collectorReeling)
      : kind === CARD_ROW_EVENTS.guard ? [{guardRecovering:false,collectorReeling:false,availableRecovery:40,availableReel:0}]
      : kind === CARD_ROW_EVENTS.field ? [{guardRecovering:false,collectorReeling:false,availableRecovery:10,availableReel:0}]
      : [CARD_ROW_EVENTS.clear,CARD_ROW_EVENTS.victory].includes(kind) ? [states[0]] : states;
    for (const pickupKind of pickups) for (const meterFraction of meters) for (const firstCrossing of crossings) for (const direction of directions) for (const state of allowedStates) {
      const event = {kind,pickupKind,meterFraction,firstCrossing,direction,...state,carriedStored:carryIn(run),cruisingSpeedRoom:speedRoom(run)};
      const unavailableReason = issueForEvent(event,context);
      const qualifiers = [];
      if ([CARD_ROW_EVENTS.body,CARD_ROW_EVENTS.delivery,CARD_ROW_EVENTS.attach].includes(kind) && (pickups.length > 1 || pickupKind !== 'light')) qualifiers.push(pickupKind === 'light' ? 'Spark' : pickupKind === 'dusk' ? 'Dusk' : pickupKind === 'cluster' ? 'Cluster' : 'Cache');
      if (kind === CARD_ROW_EVENTS.wave) qualifiers.push(firstCrossing ? 'first crossing' : 'later crossing');
      if (meters.length > 1) qualifiers.push(`${Math.round(meterFraction*100)}% meter`);
      if (kind === CARD_ROW_EVENTS.field) qualifiers.push(direction);
      if (allowedStates.length > 1) qualifiers.push(state.guardRecovering ? 'after a save' : state.collectorReeling ? 'Collector reeling' : state.availableRecovery ? 'Collector recovering' : 'Collector ready');
      const description = describeCardRowScenario(event,{steps:matching.map(({slot}) => ({sourceCardId:getCardRowSource(cards,slot)?.source?.cardId})),recoverySeconds:state.availableRecovery});
      const assumptions = [description,
        kind === CARD_ROW_EVENTS.clear ? `${event.carriedStored} Stored Sparks ${run.attemptActive && run.attemptEntry ? 'carried into this flight' : 'assumed carried into the next flight'}; ${event.cruisingSpeedRoom}% cruising speed remains before the +6% cap` : '',
        state.availableReel ? `${state.availableReel}s reel and recovery remaining` : state.availableRecovery ? `${state.availableRecovery}s recovery remaining` : 'Collector recovery budget: 0s',
        'Card bonuses are shown before Spark Meter limits; physical pickup fuel, drains and other abilities are separate.',
      ].filter(Boolean).join(' · ');
      const id = [kind,pickupKind,meterFraction,firstCrossing,direction,state.guardRecovering,state.collectorReeling,state.availableRecovery].join(':');
      options.push({id,label:[labels[kind],...qualifiers].join(' · '),event,description,assumptions,available:!unavailableReason,unavailableReason,
        matchedSlots:matching.map(({slot}) => slot)});
    }
  }
  return options;
}

function stepReason(step, cards, event) {
  const acting = cards[step.slot], source = cards.find(card => card?.instanceId === step.sourceInstanceId), def = SKILL_CARDS[source?.cardId];
  const sourceInfo = getCardRowSource(cards,step.slot), rule = sourceInfo?.rule;
  if (!step.success) {
    const skips = {
      'empty-slot':'This slot is empty. Continue to the next slot.', 'incompatible-neighbor':'The immediate right slot has no compatible action to copy.',
      'exhausted-source':'The real source card has no uses left. Earlier copies or this event’s first pass may have spent them.',
      'empty-subtotal':'No earlier slot has paid bonus Sparks in this pass, so multiplying adds nothing.',
      'needs-two-earlier-payers':'This pass needs two earlier additive Spark actions. Multipliers do not count as payers.',
      'needs-earlier-payer':'No earlier additive Spark action has paid in this pass.', 'no-earlier-payout':'There is no earlier additive Spark payout in this pass to repeat.',
      'replay-limit':step.pass === 1 ? 'An earlier Refrain already requested this event’s single second pass. Extra Refrains add no pass.' : 'All Refrains share one replay. This event cannot start a third pass.',
      'no-productive-action':'No card action earned a bonus for this event, so Refrain does not start a second pass.',
      'no-recovery':'Collector has no recovery time left to shorten in this scenario.', 'no-active-reel':'Collector has no reel time left to shorten in this scenario.',
      'empty-future-capacity':'No earlier maximum Spark gain exists in this pass to multiply.', 'no-carried-interest':'Fewer than 10 Stored Sparks were carried into the flight.',
      'cruising-speed-cap':'The expedition has already unlocked the +6% cruising speed cap.',
    };
    if (skips[step.skipReason]) return skips[step.skipReason];
    if (step.skipReason === 'different-event-or-passive') return `${describeSkillCard(acting)?.name || 'This card'} provides a passive or a separate ability. It has no row action for this event.`;
    if (rule?.event !== '*' && rule?.event !== event.kind) return `This card checks ${labels[rule?.event] || 'a different event'}. This event is ${labels[event.kind] || event.kind}.`;
    if (rule?.when?.lastOccupied) return 'This card must occupy the rightmost occupied slot to act.';
    if (rule?.when?.meterAtMost !== undefined && event.meterFraction > rule.when.meterAtMost) return `The meter is above this card’s ${Math.round(rule.when.meterAtMost*100)}% threshold before the event.`;
    if (rule?.when?.pickupKind && rule.when.pickupKind !== event.pickupKind) return `This card needs a ${rule.when.pickupKind} pickup; this scenario uses ${event.pickupKind}.`;
    if (rule?.when?.firstCrossing !== undefined) return `This card needs ${rule.when.firstCrossing ? 'the first' : 'a later'} crossing of the wave.`;
    if (rule?.when?.guardRecovering) return 'This card needs Collector to be recovering after a save.';
    if (rule?.when?.collectorReeling) return 'This card needs Collector to be actively reeling in a pickup.';
    return 'The card’s printed condition does not match this event.';
  }
  if (step.operation === 'replay-row') return 'Finish the remaining slots in pass 1, then return to slot 1 for the same event. Shared uses stay spent.';
  let effect = step.amount > 0 ? `Adds ${n(step.amount)} bonus Sparks to this pass.` : '';
  if (step.operation === 'multiply') effect = `Multiplies this pass’s ${n(step.before)} bonus Sparks by ${n(step.multiplier)} to reach ${n(step.after)}.`;
  if (step.operation === 'add-last-payout') effect = `Repeats the last earlier additive Spark payout: +${n(step.amount)} bonus Sparks.`;
  if (step.stored) effect += ` Adds ${n(step.stored)} Stored Sparks separately.`;
  if (step.futureCapacity) effect = `Adds ${n(step.futureCapacity)} maximum Sparks permanently on a real flight clear. This preview grants nothing.`;
  if (step.cruisingSpeed) effect = `Unlocks ${n(step.cruisingSpeed)}% cruising speed on a real flight clear, within the +6% cap.`;
  if (step.recoverySeconds) effect = `Shortens Collector’s remaining recovery from ${n(step.recoveryBefore)}s to ${n(step.recoveryAfter)}s.`;
  if (step.reelSeconds) effect = `Shortens the current reel from ${n(step.reelBefore)}s to ${n(step.reelAfter)}s.`;
  if (step.copiedBy) effect = `Uses ${describeSkillCard(source)?.name || def?.name || 'the immediate right card'}${step.copiedBy === 'echo' ? `, repeat ${step.repeatIndex+1}` : ''}. ${effect}`;
  if (Number.isFinite(step.chargesBefore)) effect += ` ${step.copiedBy ? 'Shared source uses' : 'Uses'}: ${step.chargesBefore} → ${step.chargesAfter}.`;
  return effect.trim();
}

/** The native receipt owns all numbers and visits; presentation only adds words and snapshots. */
export function previewEquippedCardRow(run = {}, eventIdOrOption = null) {
  const cards = getCardRowCards(run).map(card => card ? {...card} : null), options = getCardRowPreviewEvents(run);
  const requested = typeof eventIdOrOption === 'string' ? eventIdOrOption : eventIdOrOption?.id;
  const listens = option => option.available && (option.event.kind === CARD_ROW_EVENTS.clear || hasCardRowEvent(cards,option.event.kind));
  const option = options.find(item => item.id === requested)
    || options.find(item => listens(item) && previewCardRowEvent(cards,item.event).executions > 0)
    || options.find(item => item.available) || options[0];
  const event = option.event, available = option.available;
  // Flights gate the walker on listeners. Clear settlement walks even a nonpaying row.
  const started = available && (event.kind === CARD_ROW_EVENTS.clear || hasCardRowEvent(cards,event.kind));
  const trace = previewCardRowEvent(cards,started ? event : {...event,eligible:false});
  const chargesBefore = Object.fromEntries(cards.filter(card => Number.isFinite(card?.charges)).map(card => [card.instanceId,card.charges]));
  let charges = {...chargesBefore}, totals = zeroTotals(), pass = 0;
  const frames = [], steps = [];
  for (const step of trace.steps) {
    if (step.pass !== pass) {
      pass = step.pass;
      frames.push({type:'pass-start',label:`Pass ${pass} · start at slot 1`,reason:pass === 1
        ? 'This event starts a pass. Check each equipped slot from left to right; only matching card actions act.'
        : 'Refrain requested the second pass for the same event. Its bonus subtotal starts at 0; uses and saved time stay spent.',
        pass,slot:null,passSparks:0,totals:{...totals},totalsLabel:cardRowPreviewTotalsLabel(totals),chargesBefore:{...charges},chargesAfter:{...charges}});
    }
    const before = {...charges};
    if (Number.isFinite(step.chargesAfter)) charges[step.sourceInstanceId] = step.chargesAfter;
    totals.sparks += step.after-step.before;
    for (const key of ['stored','futureCapacity','cruisingSpeed','recoverySeconds','reelSeconds']) totals[key] += step[key] || 0;
    const frame = {...step,type:'step',step,label:`Slot ${step.slot+1} · ${describeSkillCard(cards[step.slot])?.name || 'Empty slot'}${step.copiedBy === 'echo' ? ` · repeat ${step.repeatIndex+1}` : ''}`,
      reason:stepReason(step,cards,event),passSparks:step.after,totals:{...totals},totalsLabel:cardRowPreviewTotalsLabel(totals),chargesBefore:before,chargesAfter:{...charges}};
    steps.push(frame);frames.push(frame);
  }
  const empty = !cards.some(Boolean), noPayReason = !available ? option.unavailableReason : !started
    ? empty ? 'Your equipped row is empty. No card listens for this event, so no row pass starts.' : 'No equipped card listens for this event, so no row pass starts. Passive and separate abilities keep their own rules.'
    : !trace.executions ? 'The row was checked, but no matching action earned a bonus. Skipped slots and failed conditions spend no uses.' : '';
  return {cards,trace,event,option,options,description:option.description,assumptions:option.assumptions,available,empty,started,
    steps,frames,passes:trace.passes,chargesBefore,chargesAfter:{...trace.charges},totals,totalsLabel:cardRowPreviewTotalsLabel(totals),noPayReason};
}
