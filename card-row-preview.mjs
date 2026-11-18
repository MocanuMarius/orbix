/** Try row is a quote of the equipped row, never a flight or a reward settlement. */
import {CARD_ROW_EVENTS, SKILL_CARDS, describeSkillCard, previewCardRowEvent, hasCardRowEvent, cleanCardCruisingSpeed} from './skill-cards.mjs?v=cue-1';
import {rowSnapshot} from './inscriptions.mjs?v=cue-1';
import {getCardRowCards, getCardRowSource, describeCardRowScenario} from './card-row-help.mjs?v=cue-1';
import {getCardRowTriggerContext, getCardRowTriggerIssue} from './card-status.mjs?v=cue-1';

const n = value => Number((Number(value) || 0).toFixed(3));
const count = value => Math.max(0, Math.floor(Number(value) || 0));
// Trigger names (docs/card-teaching-plan.md §1).
const labels = {
  [CARD_ROW_EVENTS.body]:'Collect', [CARD_ROW_EVENTS.wave]:'Pulse', [CARD_ROW_EVENTS.flash]:'Flare',
  [CARD_ROW_EVENTS.flashExpiry]:'Flare', [CARD_ROW_EVENTS.lift]:'Lift', [CARD_ROW_EVENTS.overfill]:'Overfill',
  [CARD_ROW_EVENTS.delivery]:'Delivery', [CARD_ROW_EVENTS.attach]:'Delivery', [CARD_ROW_EVENTS.rhythm]:'Lift', [CARD_ROW_EVENTS.guideLift]:'Lift',
  [CARD_ROW_EVENTS.field]:'Swipe', [CARD_ROW_EVENTS.guard]:'Crash stopped', [CARD_ROW_EVENTS.clear]:'Finish',
  [CARD_ROW_EVENTS.victory]:'Third Guardian defeated',
};
const zeroTotals = () => ({sparks:0, stored:0, futureCapacity:0, tallyCapacity:0, cruisingSpeed:0, recoverySeconds:0, reelSeconds:0});
export const cardRowPreviewTotalsLabel = totals => [
  `+${n(totals.sparks)} Sparks`, totals.stored ? `+${n(totals.stored)} Stored Sparks` : '',
  totals.futureCapacity ? `+${n(totals.futureCapacity)} maximum Sparks` : '', totals.tallyCapacity ? `+${n(totals.tallyCapacity)} max Spark on the card` : '', totals.cruisingSpeed ? `+${n(totals.cruisingSpeed)}% speed on the card` : '',
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
      const event = {kind,pickupKind,meterFraction,firstCrossing,direction,...state,carriedStored:carryIn(run),heartsLeft:Math.max(0,Number(run.lives)||0),lastHeart:run.lives===1,cruisingSpeedRoom:speedRoom(run)};
      const unavailableReason = issueForEvent(event,context);
      const qualifiers = [];
      if ([CARD_ROW_EVENTS.body,CARD_ROW_EVENTS.delivery,CARD_ROW_EVENTS.attach].includes(kind) && (pickups.length > 1 || pickupKind !== 'light')) qualifiers.push(pickupKind === 'light' ? 'Spark' : pickupKind === 'dusk' ? 'Dusk' : pickupKind === 'cluster' ? 'Cluster' : 'Cache');
      if (kind === CARD_ROW_EVENTS.wave) qualifiers.push(firstCrossing ? 'first crossing' : 'later crossing');
      if (meters.length > 1) qualifiers.push(`${Math.round(meterFraction*100)}% meter`);
      if (kind === CARD_ROW_EVENTS.field) qualifiers.push(direction);
      if (allowedStates.length > 1) qualifiers.push(state.guardRecovering ? 'after a save' : state.collectorReeling ? 'Collector reeling' : state.availableRecovery ? 'Collector recovering' : 'Collector ready');
      const description = describeCardRowScenario(event,{steps:matching.map(({slot}) => ({sourceCardId:getCardRowSource(cards,slot)?.source?.cardId})),recoverySeconds:state.availableRecovery});
      const assumptions = [description,
        kind === CARD_ROW_EVENTS.clear ? `${event.carriedStored} Stored Sparks ${run.attemptActive && run.attemptEntry ? 'carried into this flight' : 'assumed carried into the next flight'}; Wind Feather speed is kept on each card (max +10%)` : '',
        state.availableReel ? `${state.availableReel}s reel and recovery remaining` : state.availableRecovery ? `${state.availableRecovery}s recovery remaining` : 'Collector recovery budget: 0s',
        'Card Sparks are shown before the Spark Meter limit; the pickup’s own fuel, drains and other abilities are separate.',
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
      'empty-slot':'This Slot is empty. Go on to the next Slot.', 'incompatible-neighbor':'The card directly to its right cannot be copied.',
      'exhausted-source':'The real card has no uses left. A copy to its left, or the first firing, may have spent them.',
      'empty-subtotal':'No card to its left gave anything on this Trigger, so there is nothing to multiply.',
      'boost-capped':'Nothing to its left could grow: a cap was reached.',
      'not-boostable':'The cards to its left give only Stored Sparks or forever gains, and Boosts never multiply those.',
      'needs-earlier-payer':'No + card to its left has added Sparks on this Trigger.', 'no-earlier-payout':'No + card to its left added Sparks to repeat.',
      'replay-limit':step.pass === 1 ? 'Another Refrain already gives this Trigger its one Encore. More Refrains add nothing.' : 'All Refrains share one Encore. There is no third firing.',
      'no-productive-action':'Nothing worked on this Trigger, so Refrain gives no Encore.',
      'no-recovery':'Collector has no recovery time left to shorten in this scenario.', 'no-active-reel':'Collector has no reel time left to shorten in this scenario.',
      'empty-future-capacity':'No max Spark gain to its left to multiply.', 'no-carried-interest':'Fewer than 10 Stored Sparks were carried into the flight.',
      'cruising-speed-cap':'This card already holds the +10% speed maximum.',
    };
    if (skips[step.skipReason]) return skips[step.skipReason];
    if (step.skipReason === 'different-event-or-passive') return `${describeSkillCard(acting)?.name || 'This card'} is always on, or a separate ability. It does not fire on this Trigger.`;
    if (rule?.event !== '*' && rule?.event !== event.kind) return `Its Trigger is ${labels[rule?.event] || 'a different one'}. This Trigger is ${labels[event.kind] || event.kind}.`;
    if (rule?.when?.lastOccupied) return 'This card must be the last card in your chain.';
    if (rule?.when?.meterAtMost !== undefined && event.meterFraction > rule.when.meterAtMost) return `The meter is above this card’s ${Math.round(rule.when.meterAtMost*100)}% threshold before the event.`;
    if (rule?.when?.pickupKind && rule.when.pickupKind !== event.pickupKind) return `This card needs a ${rule.when.pickupKind} pickup; this scenario uses ${event.pickupKind}.`;
    if (rule?.when?.firstCrossing !== undefined) return `This card needs ${rule.when.firstCrossing ? 'the first' : 'a later'} crossing of the Pulse.`;
    if (rule?.when?.guardRecovering) return 'This card needs Collector to be recovering after a save.';
    if (rule?.when?.collectorReeling) return 'This card needs Collector to be actively reeling in a pickup.';
    return 'Its condition does not match this Trigger.';
  }
  if (step.operation === 'replay-row') return 'Encore: after the last Slot, the chain fires once more from Slot 1 for the same Trigger. Uses spent stay spent.';
  let effect = step.amount > 0 ? `Adds ${n(step.amount)} Sparks.` : '';
  if (step.operation === 'multiply') {
    const parts = [step.after !== step.before ? `Sparks ${n(step.before)} → ${n(step.after)}` : '', step.stored ? `+${n(step.stored)} Stored Sparks` : '',
      step.futureCapacity ? `+${n(step.futureCapacity)} max Sparks` : '', step.cruisingSpeed ? `+${n(step.cruisingSpeed)}% speed` : '',
      step.recoverySeconds ? `${n(step.recoverySeconds)}s more recovery saved` : '', step.reelSeconds ? `${n(step.reelSeconds)}s more reel saved` : ''].filter(Boolean);
    return `Multiplies every card to its left by ${n(step.multiplier)}: ${parts.join(', ')}.`;
  }
  if (step.operation === 'add-last-payout') effect = `Adds the last + card’s Sparks again: +${n(step.amount)} Sparks.`;
  if (step.stored) effect += ` Adds ${n(step.stored)} Stored Sparks.`;
  if (step.futureCapacity) effect = `Adds ${n(step.futureCapacity)} maximum Sparks on a real flight clear. This preview grants nothing.`;
  if (step.tallyCapacity) effect = `Adds ${n(step.tallyCapacity)} max Spark, kept on the card while it is in your Chain. This preview grants nothing.`;
  if (step.cruisingSpeed) effect = `Adds ${n(step.cruisingSpeed)}% speed to the card on a real flight clear, up to +10%.`;
  if (step.recoverySeconds) effect = `Shortens Collector’s remaining recovery from ${n(step.recoveryBefore)}s to ${n(step.recoveryAfter)}s.`;
  if (step.reelSeconds) effect = `Shortens the current reel from ${n(step.reelBefore)}s to ${n(step.reelAfter)}s.`;
  if (step.copiedBy) effect = `Uses ${describeSkillCard(source)?.name || def?.name || 'the immediate right card'}${step.copiedBy === 'echo' ? `, repeat ${step.repeatIndex+1}` : ''}. ${effect}`;
  if (Number.isFinite(step.chargesBefore)) effect += ` ${step.copiedBy ? 'Shared source uses' : 'Uses'}: ${step.chargesBefore} → ${step.chargesAfter}.`;
  return effect.trim();
}

/** The native receipt owns all numbers and visits; presentation only adds words and snapshots. */
export function previewEquippedCardRow(run = {}, eventIdOrOption = null) {
  const cards = getCardRowCards(run).map(card => card ? {...card} : null), snap = rowSnapshot(run, cards), options = getCardRowPreviewEvents(run);
  const requested = typeof eventIdOrOption === 'string' ? eventIdOrOption : eventIdOrOption?.id;
  const listens = option => option.available && (option.event.kind === CARD_ROW_EVENTS.clear || hasCardRowEvent(snap,option.event.kind));
  const option = options.find(item => item.id === requested)
    || options.find(item => listens(item) && previewCardRowEvent(snap,item.event).executions > 0)
    || options.find(item => item.available) || options[0];
  const event = option.event, available = option.available;
  // Flights gate the walker on listeners. Clear settlement walks even a nonpaying row.
  const started = available && (event.kind === CARD_ROW_EVENTS.clear || hasCardRowEvent(snap,event.kind));
  const trace = previewCardRowEvent(snap,started ? event : {...event,eligible:false});
  const chargesBefore = Object.fromEntries(cards.filter(card => Number.isFinite(card?.charges)).map(card => [card.instanceId,card.charges]));
  let charges = {...chargesBefore}, totals = zeroTotals(), pass = 0;
  const frames = [], steps = [];
  for (const step of trace.steps) {
    if (step.pass !== pass) {
      pass = step.pass;
      frames.push({type:'pass-start',label:pass === 1 ? 'Chain fires · from Slot 1' : '↶ Encore · from Slot 1',reason:pass === 1
        ? 'This Trigger fires your chain. Each card fires in turn from left to right if its Trigger and condition match.'
        : 'Refrain gives an Encore for the same Trigger. The Sparks start at 0 again; uses and saved time stay spent.',
        pass,slot:null,passSparks:0,totals:{...totals},totalsLabel:cardRowPreviewTotalsLabel(totals),chargesBefore:{...charges},chargesAfter:{...charges}});
    }
    const before = {...charges};
    if (Number.isFinite(step.chargesAfter)) charges[step.sourceInstanceId] = step.chargesAfter;
    totals.sparks += step.after-step.before;
    for (const key of ['stored','futureCapacity','tallyCapacity','cruisingSpeed','recoverySeconds','reelSeconds']) totals[key] += step[key] || 0;
    const frame = {...step,type:'step',step,label:`Slot ${step.slot+1} · ${describeSkillCard(cards[step.slot])?.name || 'Empty slot'}${step.copiedBy === 'echo' ? ` · repeat ${step.repeatIndex+1}` : ''}`,
      reason:stepReason(step,cards,event),passSparks:step.after,totals:{...totals},totalsLabel:cardRowPreviewTotalsLabel(totals),chargesBefore:before,chargesAfter:{...charges}};
    steps.push(frame);frames.push(frame);
  }
  const empty = !cards.some(Boolean), noPayReason = !available ? option.unavailableReason : !started
    ? empty ? 'Your chain is empty. No card has this Trigger, so the chain does not fire.' : 'No card in your chain has this Trigger, so the chain does not fire. Always-on cards and separate abilities keep their own rules.'
    : !trace.executions ? 'The chain fired, but no card gave anything. Skipped Slots and failed conditions spend no uses.' : '';
  return {cards,trace,event,option,options,description:option.description,assumptions:option.assumptions,available,empty,started,
    steps,frames,passes:trace.passes,chargesBefore,chargesAfter:{...trace.charges},totals,totalsLabel:cardRowPreviewTotalsLabel(totals),noPayReason};
}
