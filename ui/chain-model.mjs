// What the Chain screen (v2.3-deck) shows, computed from the game's own rule engine. No DOM here, so tests
// can run it directly. Moved from the approved design-lab preview (dist/design-lab/deck.mjs › runV21, v2.3
// paths only). Every number comes from skill-cards.mjs › previewCardRow; this file only attributes the
// resolver's steps to plates and words.
//
// The plate rule: a card's plate shows what it contributes AT ITS OWN SLOT, counting only what cards to its
// LEFT did to it (an Echo repeating it). Later Boosts and the Encore keep their own plates. Honesty rule: the
// plates read left to right (+ adds, × multiplies the running figure, Encore repeats the line, each firing
// rounded up to whole Sparks) must give the resolver's total; when they do not, plates show plain figures.
import {SKILL_CARDS, CARD_UNIT, getCardRowRule, hasCardRowEvent, getEffectiveCardSources, previewCardRow, isInventoryOnlyCard, describeSkillCard, cardAmount} from '../skill-cards.mjs?v=rates-1';
import {getGlowCapacity, glowPoints, GLOW_DISPLAY_SCALE} from '../vitality.mjs?v=rates-1';
import {CARD_TRIGGERS, getCardTrigger} from '../card-rule-bands.mjs?v=rates-1';
import {DISPLAY_GROUPS, GROUP_TERM} from '../card-trigger-labels.mjs';
import {faceTrigger, faceEffect} from '../card-face-lines.mjs?v=rates-1';
import {getCardRuleBands} from '../card-rule-bands.mjs?v=rates-1';
import {hasEngineCards, engineMetrics, findEngineLoop, engineStarts} from '../card-engine.mjs?v=rates-1';
import {previewBlackHoleMeals, devourTally} from '../card-black-hole.mjs?v=rates-1';

/** The Triggers in the designer's order, with the game's names and glossary keys (card-terms.mjs). */
export const TRIGGERS = Object.freeze([
  ...['collect', 'delivery', 'wave', 'flash', 'falling-lift', 'overfill', 'rhythm', 'save', 'clear']
    .map(id => CARD_TRIGGERS[id]).filter(Boolean)
    .map(t => Object.freeze({kind: t.event, name: t.label, term: t.id, meaning: t.meaning})),
  // Victory is the engine's thirteenth Trigger; no card listens to it by name and it has no glossary entry.
  Object.freeze({kind: 'expedition-victory', name: 'Victory', term: null, meaning: 'You win an expedition.'}),
]);
// Lift: one simulated Lift of the flight (flight.mjs resolves it as a falling Lift or a plain one, then the Lift Guide cue).
export const LIFT_KIND = 'lift-sim', LIFT_COST = 3;
export const LIFT_TRIGGER = Object.freeze({kind: LIFT_KIND, name: 'Lift', term: 'falling-lift', meaning: 'You Lift once. A Lift costs 3 Sparks.'});
export const TRIGGER_BY = Object.freeze({...Object.fromEntries(TRIGGERS.map(t => [t.kind, t])), [LIFT_KIND]: LIFT_TRIGGER});
// Events a card can wait for that have no tab of their own on the Chain screen (a Flare ending, a Latch, a Swipe).
const EVENT_LABEL = Object.freeze({...Object.fromEntries(Object.values(CARD_TRIGGERS).filter(t => t.event).map(t => [t.event, t.label])), 'guide-lift': 'Lift'});
export const triggerName = kind => TRIGGER_BY[kind]?.name || EVENT_LABEL[kind] || 'this Trigger';

export const RARITY_WORD = Object.freeze({common: 'Common', rare: 'Rare', legendary: 'Legendary'});
export const rarityOf = c => SKILL_CARDS[c?.cardId]?.rarity || c?.rarity || 'common';
export const nameOf = c => describeSkillCard(c)?.name || c?.name || 'Empty slot';
export const shortName = c => nameOf(c).replace(/\s*\+\d+$/, '');
export const isRest = c => !!c && isInventoryOnlyCard(c);
export const num = v => String(Number((Number(v) || 0).toFixed(2)));

const REPEAT_ICON = '<svg viewBox="0 0 12 12" width="12" height="12" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M2 3h6V1h1v1h1v1h1v1h-1v1H9v1H8V4H3v3H2zm0 6h7v1H2zm8-2h1v1h-1zM1 8h1v1H1z"/></svg>';
/** The kind mark a card carries on its face: + Adds, × Multiplies, repeat, Encore, always on, Rest. */
export function markOf(c) {
  const def = SKILL_CARDS[c?.cardId];
  if (!def) return null;
  if (isRest(c)) return {cls: 'rest', glyph: 'Rest', text: 'Rest card, works from the Deck'};
  if (def.kind === 'echo' || def.kind === 'chameleon') return {cls: 'repeat', glyph: REPEAT_ICON, text: 'Repeats the card to its right'};
  if (def.kind === 'refrain') return {cls: 'encore', glyph: 'Encore', text: 'Encore'};
  const rule = getCardRowRule(def, c);
  if (rule?.operation === 'multiply') return {cls: 'mul', glyph: '×', text: 'Multiplies'};
  if (rule?.operation === 'add-sparks' || rule?.operation === 'add-last-payout') return {cls: 'add', glyph: '+', text: 'Adds'};
  if (!rule) return {cls: 'always', glyph: 'Passive', text: 'Passive'};
  return null;
}
/** Which Trigger the card itself listens to: the WHEN of its real row rule. */
export function whenOf(c) {
  const def = SKILL_CARDS[c?.cardId], rule = def ? getCardRowRule(def, c) : null;
  if (isRest(c)) return {text: 'At Rest'};
  if (rule?.event && TRIGGER_BY[rule.event]) return {kind: rule.event, text: TRIGGER_BY[rule.event].name};
  if (rule?.event === '*') return {text: 'Boost'};
  if (def?.kind === 'echo' || def?.kind === 'chameleon') return {text: 'Same as the card it repeats'};
  if (def?.kind === 'refrain') return {text: 'Boost, after a Bonus'};
  return {text: 'Passive'};
}

// The preview event: a natural Spark with the meter at 6 of the base 30 Sparks (as in the approved preview).
export const METER_MAX = getGlowCapacity({});
export const START_SPARKS = 6;
export const START_FLAME = START_SPARKS / GLOW_DISPLAY_SCALE;
const eventFor = kind => Object.freeze({kind, pickupKind: 'light', meterFraction: START_FLAME / METER_MAX});

// A card with a condition on its Trigger ("Collect · Dusk Spark", "Pulse · its 1st Spark", "meter ⅓ or less") does
// nothing on the plain preview Spark. That is not a mistake: it waits for a Spark that meets its condition.
const COND_KEYS = ['pickupKind', 'meterAtMost', 'firstCrossing', 'guardRecovering', 'collectorReeling'];
// Cards that save Collector time do nothing unless the Collector has time to save; the plain Spark has none.
const COLLECTOR_OPS = {'shorten-recovery': 'the Collector is recovering', 'shorten-reel': 'the Collector is reeling a Spark in', 'bank-reel': 'the Collector has a reel to shorten'};
const PICKUP_WORD = {dusk: ['a Dusk Spark', 'Dusk Spark'], cluster: ['a Cluster', 'Cluster'], cache: ['a Cache', 'Cache'], light: ['a plain Spark', 'Plain Spark']};
const BASE_WORD = {'body-spark': 'when you Collect', 'collector-delivery': 'when Collector delivers', 'guard-rescue': 'when you are saved', 'flash-pickup': 'when you Collect a Flare', 'wave-crossing': 'when a Pulse crosses a Spark'};
const WAIT_NAME = {'flash-pickup': 'a Flare', 'flash-expiry': 'a Flare ending', 'guide-lift': 'the Lift Guide cue', 'plain-lift': 'a plain Lift'};
/** What a conditional card waits for on its own Trigger: {event: preview fields that meet it, label: plate words, line: "you Collect a Dusk Spark"}. Null for a card without one. */
export function conditionOf(c, trigger) {
  const def = SKILL_CARDS[c?.cardId], rule = def ? getCardRowRule(def, c) : null, w = rule?.when;
  if (!rule || rule.event !== trigger) return null;
  const timeOp = COLLECTOR_OPS[rule.operation];
  if (!(w && COND_KEYS.some(k => w[k] !== undefined)) && !timeOp) return null;
  const event = {}, label = [];
  let lead = BASE_WORD[trigger] || `on ${triggerName(trigger)}`; const tail = [];
  if (!w) {Object.assign(event, {availableRecovery: 4, availableReel: 4, collectorReeling: rule.operation === 'shorten-reel'}); return {event, label: 'Collector busy', line: `${lead}, but only while ${timeOp}`};}
  if (w.pickupKind !== undefined) {
    const [phrase, short] = PICKUP_WORD[w.pickupKind] || [`a ${w.pickupKind}`, w.pickupKind];
    event.pickupKind = w.pickupKind; label.push(short);
    lead = trigger === 'collector-delivery' ? `when Collector delivers ${phrase}` : `when you Collect ${phrase}`;
  }
  if (w.firstCrossing !== undefined) {
    event.firstCrossing = w.firstCrossing; label.push(w.firstCrossing ? 'its 1st Spark' : '2nd Spark onward');
    lead = w.firstCrossing ? 'when a Pulse crosses the first Spark it reaches' : 'when a Pulse crosses its second or later Spark';
  }
  if (w.meterAtMost !== undefined) {event.meterFraction = w.meterAtMost * .5; label.push('low meter'); tail.push('your meter is at a third or less');}
  if (w.guardRecovering !== undefined) {Object.assign(event, {guardRecovering: w.guardRecovering, availableRecovery: 4}); label.push('after a save'); tail.push('the Collector is recovering from a save');}
  if (w.collectorReeling !== undefined) {Object.assign(event, {collectorReeling: w.collectorReeling, availableReel: 4, availableRecovery: 4}); label.push('Collector reeling'); tail.push('the Collector is reeling a Spark in');}
  return {event, label: label.join(', '), line: `${lead}${tail.length ? `, but only while ${tail.join(' and ')}` : ''}`};
}

const LIFT_EVENTS = ['downbeat-lift', 'plain-lift', 'guide-lift'];
/** Which choices a Lift offers for this row: only the ones a mounted card needs. */
export function liftOptions(row) {
  const rules = getEffectiveCardSources((row || []).map(c => c || null)).map(e => getCardRowRule(e.def, e.source)?.event);
  return {falling: rules.includes('downbeat-lift'), cue: rules.includes('guide-lift')};
}
/** One Lift as the flight resolves it: a falling Lift (or a plain one), then the Lift Guide cue when it was on the cue. */
function solveLift(row, inscriptions, {falling = true, cue = true} = {}) {
  const snap = inscriptions?.some(Boolean) ? {cards: row, inscriptions} : row, run = inscriptions?.some(Boolean) ? snap : {cards: row};
  const kinds = [falling ? 'downbeat-lift' : 'plain-lift', ...(cue ? ['guide-lift'] : [])];
  const receipts = kinds.map(k => previewCardRow(run, hasCardRowEvent(snap, k) ? eventFor(k) : {...eventFor(k), eligible: false}));
  const steps = receipts.flatMap(r => r.steps), sparks = receipts.reduce((n, r) => n + r.sparks, 0);
  const receipt = {...receipts[0], steps, sparks, ...('sparksExact' in receipts[0] ? {sparksExact: receipts.reduce((n, r) => n + (r.sparksExact || 0), 0)} : {})};
  const gainFlame = Math.min(sparks * CARD_UNIT, Math.max(0, METER_MAX - START_FLAME));
  return {kind: LIFT_KIND, listens: LIFT_EVENTS.some(k => hasCardRowEvent(snap, k)), receipt, steps, sparks, gainFlame, gain: glowPoints(gainFlame),
    lift: {falling, cue, cost: LIFT_COST, net: Math.round((sparks - LIFT_COST) * 100) / 100}};
}
export function solveTrigger(row, kind, inscriptions = null, extra = null) {
  if (kind === LIFT_KIND) return solveLift(row, inscriptions, extra || {});
  const snap = inscriptions?.some(Boolean) ? {cards: row, inscriptions} : row;
  const listens = hasCardRowEvent(snap, kind);
  const ev = extra ? Object.freeze({...eventFor(kind), ...extra}) : eventFor(kind);
  const receipt = previewCardRow(inscriptions?.some(Boolean) ? {cards: row, inscriptions} : {cards: row}, listens ? ev : {...ev, eligible: false});
  const gainFlame = Math.min(receipt.sparks * CARD_UNIT, Math.max(0, METER_MAX - START_FLAME));
  return {kind, listens, receipt, steps: receipt.steps, sparks: receipt.sparks, gainFlame, gain: glowPoints(gainFlame)};
}
/** For each conditional card that did nothing on the plain preview Spark: the same Trigger solved with a Spark that meets its condition. */
export function conditionalSolves(row, kind, inscriptions, sol) {
  const out = [], seen = new Set();
  row.forEach((c, slot) => {
    if (!c || sol.steps.some(st => st.slot === slot && st.success)) return;
    const cond = conditionOf(c, kind);
    if (!cond || seen.has(cond.line)) return;
    seen.add(cond.line);
    out.push({...cond, slot, sol: solveTrigger(row, kind, inscriptions, cond.event)});
  });
  return out;
}
/** A Trigger fires this chain when a card listens to it AND the resolver, run with it, has a card that acts (on the plain Spark, or on the Spark a conditional card waits for). */
export const triggersFor = (row, inscriptions = null) => TRIGGERS.map(t => t.kind === 'downbeat-lift' ? LIFT_TRIGGER : t).filter(t => {
  if (t.kind === LIFT_KIND) {const sol = solveLift(row, inscriptions);return sol.listens && sol.steps.some(st => st.success);}
  if (!hasCardRowEvent(inscriptions?.some(Boolean) ? {cards: row, inscriptions} : row, t.kind)) return false;
  const sol = solveTrigger(row, t.kind, inscriptions);
  return sol.steps.some(st => st.success) || conditionalSolves(row, t.kind, inscriptions, sol).some(x => x.sol.steps.some(st => st.success));
});

/** Plates: each card's own contribution in the first firing, with only earlier repeats added to it. */
export function leftAttribute(row, sol) {
  const own = new Map(), mods = new Map(), passes = new Map(), paid = new Map();
  for (const st of sol.steps) passes.set(st.pass, st.after);
  // A card that never acts itself in the first firing (its Uses all went to the repeats) does not own the
  // repeats; the repeating card shows what it paid ("Repeats ×3: +9").
  const acted = new Set(sol.steps.filter(st => st.pass === 1 && st.success && !st.copiedBy).map(st => st.slot));
  for (const st of sol.steps) {
    if (st.pass !== 1 || !st.success) continue;
    if (st.operation !== 'add-sparks' && st.operation !== 'add-last-payout') continue;
    let owner = st.slot;
    if (st.copiedBy) {
      owner = row.findIndex(c => c && c.instanceId === st.sourceInstanceId);
      if (owner < 0) return null;
      if (!acted.has(owner)) {const p = paid.get(st.slot) || {amount: 0, count: 0, target: owner};p.amount += st.amount;p.count += 1;paid.set(st.slot, p);continue;}
      const list = mods.get(owner) || [];
      list.push({type: 'repeat', by: st.slot});mods.set(owner, list);
    }
    own.set(owner, (own.get(owner) || 0) + st.amount);
  }
  return {totals: own, mods, paid, passTotals: [...passes.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)};
}

const minPayers = c => Number(getCardRowRule(SKILL_CARDS[c.cardId], c)?.minimumEarlierPayers) || 0;
function whyIdle(ctx, slot, step) {
  const {row, trigger} = ctx, c = row[slot];
  switch (step?.skipReason) {
    case 'empty-subtotal': case 'needs-two-earlier-payers':
      return minPayers(c) >= 2 ? {why: 'it needs two cards that Add before it', fix: 'Move it after two + cards.'} : {why: 'there is no Bonus to multiply yet', fix: 'Move it after a + card.'};
    case 'needs-earlier-payer': return {why: 'it needs a card that Adds before it', fix: 'Move it after a + card.'};
    case 'no-earlier-payout': return {why: 'there is nothing to repeat yet', fix: 'Move it after a + card.'};
    case 'incompatible-neighbor': return row[slot + 1] ? {why: `it can't repeat ${shortName(row[slot + 1])} on ${triggerName(trigger)}`, fix: ''} : {why: 'there is no card to its right', fix: 'Put a + card to its right.'};
    case 'exhausted-source': return {why: 'it has no Uses left', fix: ''};
    case 'replay-limit': return {why: 'only one Encore fires', fix: ''};
    case 'no-productive-action': return {why: 'there is no Bonus yet, so no Encore', fix: 'Put cards that Add before it.'};
    default: return {why: `it does not act on ${triggerName(trigger)}`, fix: ''};
  }
}
const listensTo = card => {const r = getCardRowRule(SKILL_CARDS[card.cardId], card);return r?.event && r.event !== '*' && (TRIGGER_BY[r.event] || EVENT_LABEL[r.event]) ? r.event : null;};

/** What the plate under one slot says. kind: empty | passive | waits | spent | idle | act (role add/mul/encore/repeat/repeat-paid). */
export function slotInfo(ctx, slot, {plain} = {}) {
  const {row, sol, attr, trigger} = ctx, c = row[slot];
  if (!c) return {kind: 'empty'};
  const noEff = plain ?? ctx.plain;
  const def = SKILL_CARDS[c.cardId], rule = getCardRowRule(def, c);
  const fires = !!rule || ['echo', 'chameleon', 'refrain'].includes(def?.kind);
  if (!fires) return {kind: 'passive', plate: 'Passive'};
  const steps = sol.steps.filter(st => st.slot === slot), ok = steps.find(st => st.success);
  if (!ok) {
    const last = steps.filter(st => !st.success).pop();
    // Its Uses went to an Echo-style card's repeats.
    if (attr?.paid && [...attr.paid.values()].some(p => p.target === slot)) return {kind: 'spent', plate: 'Uses spent'};
    // It listens to a different Trigger: not an error, it waits for that one.
    const ownEvent = listensTo(c);
    const copyEvent = ['echo', 'chameleon'].includes(def.kind) && row[slot + 1] ? listensTo(row[slot + 1]) : null;
    const waits = ownEvent || copyEvent;
    if (waits && waits !== trigger) {const waitLabel = WAIT_NAME[waits] || triggerName(waits);return {kind: 'waits', plate: `Waits for ${waitLabel}`, waits, waitLabel};}
    // Same Trigger, but it needs a Spark that meets its condition (or repeats / boosts one that does).
    const own = conditionOf(c, trigger)?.line;
    const hit = (ctx.conds || []).filter(x => x.sol.steps.some(st => st.slot === slot && st.success)).sort((a, b) => (b.line === own) - (a.line === own))[0];
    if (hit) return {kind: 'waits', plate: `Waits for ${hit.label}`, waits: trigger, waitLabel: hit.label, cond: hit.line, condStep: hit.sol.steps.find(st => st.slot === slot && st.success)};
    return {kind: 'idle', plate: 'No effect here', ...whyIdle(ctx, slot, last)};
  }
  if (ok.operation === 'multiply') {
    const second = steps.find(st => st.success && st.pass === 2 && st.operation === 'multiply');
    const m2 = second && Math.abs(second.multiplier - ok.multiplier) > 1e-9 ? second.multiplier : null;
    return {kind: 'act', role: 'mul', plate: `×${num(ok.multiplier)}`, step: ok, m2};
  }
  if (ok.operation === 'replay-row') return {kind: 'act', role: 'encore', plate: 'Encore', step: ok};
  if (ok.copiedBy && attr?.paid?.has(slot)) {const p = attr.paid.get(slot);return {kind: 'act', role: 'repeat-paid', plate: `Repeats ×${p.count}: +${num(p.amount)}`, step: ok, paid: p};}
  if (ok.copiedBy) return {kind: 'act', role: 'repeat', plate: 'Repeats next', step: ok};
  const base = ok.amount, eff = attr && !noEff ? attr.totals.get(slot) || 0 : null;
  const changed = eff !== null && Math.abs(eff - base) > 1e-6;
  return {kind: 'act', role: 'add', base, eff, changed, plate: `+${num(base)}`, step: ok, mods: attr?.mods.get(slot) || []};
}

/** The sum as the plates show it, read left to right. Each firing rounds up to whole Sparks, as the resolver does. */
export function plateSum(ctx, useEff) {
  const infos = ctx.row.map((c, i) => slotInfo(ctx, i, {plain: !useEff}));
  const encore = infos.some(x => x.role === 'encore');
  let total = 0;
  for (const p of encore ? [1, 2] : [1]) {
    let r = 0;
    for (const info of infos) {
      if (info.kind !== 'act') continue;
      if (info.role === 'add') r += Number(num(useEff ? info.eff : info.base));
      else if (info.role === 'repeat-paid') r += Number(num(info.paid.amount));
      else if (info.role === 'mul') r *= p === 2 && info.m2 ? info.m2 : info.step.multiplier;
    }
    total += ctx.sol?.receipt && 'sparksExact' in ctx.sol.receipt ? Math.ceil(r - 1e-9) : r;
  }
  return Math.round(total * 100) / 100;
}

/** Everything the Chain tab needs for one row and one wanted Trigger. */
/** inscriptions: the run's slot Inscriptions aligned to the row ([{id}|null]); the numbers then match a real flight. */
export function resolveChain(row, wanted = null, inscriptions = null, opts = {}) {
  const cards = (row || []).map(c => c || null);
  const trigs = triggersFor(cards, inscriptions);
  const trigger = trigs.some(t => t.kind === wanted) ? wanted : trigs[0]?.kind || 'body-spark';
  const sol = solveTrigger(cards, trigger, inscriptions, trigger === LIFT_KIND ? {falling: opts.liftFalling !== false, cue: opts.liftCue !== false} : null);
  const ctx = {row: cards, sol, attr: null, plain: false, trigger, trigs, lift: sol.lift || null, liftOptions: trigs.some(t => t.kind === LIFT_KIND) ? liftOptions(cards) : null};
  ctx.conds = conditionalSolves(cards, trigger, inscriptions, sol);
  ctx.attr = leftAttribute(cards, sol);
  if (!ctx.attr || Math.abs(plateSum(ctx, true) - Math.round(sol.sparks * 100) / 100) > .011) ctx.plain = true;
  ctx.infos = cards.map((c, i) => slotInfo(ctx, i));
  ctx.encore = ctx.infos.some(x => x.role === 'encore');
  ctx.passes = ctx.encore && (ctx.attr?.passTotals || []).length > 1 ? ctx.attr.passTotals.map(num) : [];
  ctx.linesum = plateSum(ctx, !ctx.plain);
  // Engine Chains only (unreleased cards): extra fields, computed by the flight's own engine rules (card-engine.mjs).
  if (hasEngineCards(cards)) ctx.engine = engineStats(cards);
  const meals = previewBlackHoleMeals(cards);
  if (meals.length) ctx.blackHole = meals;
  return ctx;
}

/** For an engine Chain: Sparks per Turn and Turns per 10 s (the medallion), the loop, and "runs once" (no Timer).
 * The same CardEngine the flight runs, on an uncapped meter started once at t = 0; null numbers when it never turns. */
export function engineStats(row) {
  const cards = (row || []).map(c => c || null), loop = findEngineLoop(cards), m = engineMetrics(cards);
  // The flying that starts it, as Trigger chips (the track's origin when no ordinary Trigger fires the chain).
  const starts = engineStarts(cards).map(e => ({collect: 'collect', skim: 'engine-skim', lift: 'engine-lift', 'flash-end': 'flash-ends'})[e.kind]).filter(Boolean);
  return {runsOnce: loop.runsOnce, timers: loop.timers, returns: loop.returns, entry: loop.entry, heartbeat: loop.heartbeat,
    sparksPerTurn: m.sparksPerTurn, turnsPer10s: m.turnsPer10s, starts};
}

// ── Trigger chips: the badge every card shows first, and the Trigger collection (v1.0-engine Phase 2) ─────────
/** The chip a card carries ({id, label, condition}), from its catalog Trigger (card-rule-bands.mjs). */
export const chipOf = c => getCardTrigger(c || {}, SKILL_CARDS[c?.cardId || c?.id] || {});
/** How often each Trigger fires in a flight, in words, from the firing model of scripts/balance/simulate.mjs
 * (Collect 10, Pulse 6, Lift while falling 8 per 30 s flight: often; Delivery 4, Latch 3, Flare 3 (now under Collect), a Flare ending 3, Rhythm 4,
 * Overfill 2, skims 2 to 3, low Lifts a few: a few times; Save, Finish, Pack, Take-off: once). */
export const TRIGGER_BOOK = Object.freeze(DISPLAY_GROUPS.map(g => Object.freeze({id: g.id, group: g.group, label: g.label, kind: g.kind,
  does: g.does, often: g.often, term: GROUP_TERM[g.group]})));
/** The Trigger collection for one run: every Trigger, with the player's own cards that use it (a tile per card
 * kind, with a count). `owned` false rows read "No card yet". */
export function triggerBook(run) {
  const owned = [...(run?.mountedCards || []), ...(run?.reserveCards || [])].filter(Boolean);
  return TRIGGER_BOOK.map(entry => {
    const kinds = new Map();
    for (const card of owned) {
      if (chipOf(card).group !== entry.group) continue;
      const k = kinds.get(card.cardId) || {cardId: card.cardId, card, count: 0, inChain: false};
      k.count++; if ((run?.mountedCards || []).includes(card)) {k.inChain = true;k.card = card;}
      kinds.set(card.cardId, k);
    }
    const cards = [...kinds.values()].sort((a, b) => Number(b.inChain) - Number(a.inChain) || nameOf(a.card).localeCompare(nameOf(b.card)));
    return {...entry, cards, owned: cards.length > 0};
  });
}

// ── Engine plates (wording for engine cards on the Chain tab) ───────────────────────────────────────────────────
const secs = v => `${num(v)} s`;
/** What an engine card's plate says in this Chain: {long, short}. Null for a card without engine rules. */
export function enginePlate(row, slot) {
  const c = row[slot], def = SKILL_CARDS[c?.cardId], spec = def?.engine;
  if (!spec) return null;
  const scale = row.some(x => SKILL_CARDS[x?.cardId]?.engine?.timerScale) ? .5 : 1;
  const amount = cardAmount(c), sparks = `+${num(amount)} Spark${amount === 1 ? '' : 's'}`;
  if (spec.timer === 'wick' || spec.timer === 'fuse') return {long: `Waits ${secs(spec.wait * scale)}`, short: `Waits ${secs(spec.wait * scale)}`};
  if (spec.timer === 'metronome') return {long: `Fires the next card every ${secs(spec.wait * scale)}`, short: `Every ${secs(spec.wait * scale)}`};
  if (spec.timerScale) return {long: 'Timers wait half as long', short: 'Waits ×½'};
  if (spec.governor === 'third-beat') return {long: 'Every 3rd Turn ×2', short: '3rd Turn ×2'};
  if (spec.governor === 'momentum') return {long: `+${num(amount)}% light after 5 Turns`, short: `+${num(amount)}% light`};
  if (spec.governor === 'wave-loom') return {long: 'A light Pulse each Turn', short: 'Light Pulse'};
  if (spec.family === 'pack') {
    if (spec.does?.includes('gain')) return {long: `${sparks} at Pack`, short: `+${num(amount)} at Pack`};
    if (spec.does?.includes('fire-collect')) return {long: 'Fires Collect, Cluster and Dusk cards', short: 'Fires Collect'};
    return {long: 'Fires the last Trigger again', short: 'Last Trigger again'};
  }
  const d = spec.does || [];
  if (d.includes('homing')) return {long: 'Collector fetches again, 2× reach', short: 'Fetches again'};
  if (d.includes('flash')) return {long: 'Starts a Flare (Pulse every 2 s, very high Luminance)', short: 'A Flare'};
  if (d.includes('gain') && d.includes('pulse')) return {long: `Sends a Pulse, +${num(amount)}`, short: `Pulse, +${num(amount)}`};
  if (d.includes('gain')) return {long: `${sparks} each Turn`, short: `+${num(amount)} a Turn`};
  if (d.includes('pulse')) return {long: spec.keep ? `Sends a Pulse, keeps ${num(spec.keep)} Stored` : 'Sends a Pulse', short: 'Sends a Pulse'};
  return null;
}
/** Black Hole's take-off plate and its running total (card-black-hole.mjs). */
export const holeTally = c => devourTally(c);

/** One plain line about a card in its place (the opened card). */
export function hereLine(ctx, c) {
  if (isRest(c)) return 'Rest card: it works from the Deck at Rest and never goes in the chain.';
  const slot = ctx.row.indexOf(c);
  if (slot < 0) return 'In your Deck, not in the chain: it does nothing until you put it in a slot.';
  const info = slotInfo(ctx, slot), st = info.step, at = `Slot ${slot + 1}`, on = triggerName(ctx.trigger);
  if (info.kind === 'passive') return firesWithoutRule(c) ? firesLine(ctx, c, slot) : `${at}: always on while it is in your chain. It does not fire.`;
  if (info.kind === 'waits' && info.cond) {
    const st2 = info.condStep, next = ctx.row[slot + 1];
    const does = st2.operation === 'multiply' ? `multiplies the running total by ×${num(st2.multiplier)}` : st2.copiedBy ? `repeats ${next ? shortName(next) : 'the next card'}`
      : st2.operation === 'replay-row' ? 'fires the chain a second time' : COLLECTOR_OPS[st2.operation] ? 'saves Collector time' : st2.amount > 0 ? `adds ${num(st2.amount)}` : 'acts';
    return `${at}: fires ${info.cond}: ${does}.`;
  }
  if (info.kind === 'waits') return `${at}: waits for ${info.waitLabel || triggerName(info.waits)}. It does nothing on ${on}; that is not a problem.`;
  if (info.kind === 'spent') return `${at}: its Uses were all spent by the repeats to its left, so it cannot act itself. The repeats count on that card.`;
  if (info.kind === 'idle') return `${at}: no effect on ${on}, because ${info.why}.${info.fix ? ` ${info.fix}` : ''}`;
  if (info.role === 'repeat-paid') return `${at}: repeats ${shortName(ctx.row[info.paid.target])} ${info.paid.count} times, +${num(info.paid.amount)} in all. ${shortName(ctx.row[info.paid.target])} then has no Uses left.`;
  if (info.role === 'mul' && info.m2) return `${at}: ×${num(st.multiplier)} on the first firing, ×${num(info.m2)} on the Encore.`;
  if (info.role === 'mul') return `${at}: multiplies the running total, ${num(st.before)} × ${num(st.multiplier)} = ${num(st.after)}.`;
  if (info.role === 'encore') {const p = ctx.attr?.passTotals || [];return p.length > 1 ? `${at}: fires the chain a second time: ${p.map(num).join(' + ')} = ${num(ctx.sol.sparks)}.` : `${at}: fires the chain a second time.`;}
  if (info.role === 'repeat') {const src = ctx.row.findIndex(x => x && x.instanceId === st.sourceInstanceId);const name = src >= 0 ? shortName(ctx.row[src]) : 'the next card';return `${at}: repeats ${name}. The extra ${num(st.amount)} shows on ${name}'s plate.`;}
  const by = (info.mods || []).filter(m => m.type === 'repeat').map(m => shortName(ctx.row[m.by]));
  return info.changed ? `${at}: adds ${num(info.base)}, repeated by ${[...new Set(by)].join(' and ')}: ${num(info.eff)}.` : `${at}: adds ${num(info.base)}.`;
}
const lower = t => t ? t[0].toLowerCase() + t.slice(1) : t;
/** True for a card that fires on a Trigger although it has no row rule (the engine / maker cards, Black Hole). */
export const firesWithoutRule = c => {const def = SKILL_CARDS[c?.cardId];if (!def || isRest(c) || getCardRowRule(def, c) || ['echo', 'chameleon', 'refrain'].includes(def.kind)) return false;const chip = chipOf(c);return !!def.engine || chip.group !== 'passive' && chip.kind !== 'none';};
/** The true line for a card that fires on its Trigger but has no row rule: when, what, and what in the chain changes it. */
function firesLine(ctx, c, slot) {
  const def = SKILL_CARDS[c.cardId], face = faceTrigger(c, def), plate = enginePlate(ctx.row, slot);
  const what = lower(plate?.long || faceEffect(c, def)) || 'acts';
  const extra = [], left = ctx.row[slot - 1], right = ctx.row[slot + 1], kindOf = x => SKILL_CARDS[x?.cardId]?.kind;
  if (['wick', 'fuse', 'metronome'].includes(def.engine?.timer) && ctx.row.some(x => SKILL_CARDS[x?.cardId]?.engine?.timerScale)) extra.push('Heartbeat in your chain halves the wait');
  if (['echo', 'chameleon'].includes(kindOf(left))) extra.push(`${shortName(left)} to its left repeats it`);
  if (kindOf(left) === 'keystone' || kindOf(right) === 'keystone') extra.push('Keystone beside it makes it fire twice');
  if (Number.isFinite(c.charges)) extra.push(`${c.charges} use${c.charges === 1 ? '' : 's'} left`);
  return `Slot ${slot + 1}: fires on ${face.word}: ${what}.${extra.length ? ` ${extra.join('. ')}.` : ''}`;
}
/** The card's full rule in plain words, with the limits the face leaves out. */
export function fullRuleText(c) {
  const def = SKILL_CARDS[c?.cardId] || {}, bands = getCardRuleBands(c || {}, def);
  const when = bands.find(b => b.type === 'condition')?.text, fx = bands.filter(b => b.type === 'effect').map(b => b.text.replace(/\.$/, ''));
  const notes = bands.filter(b => b.type === 'note' && !/^\d+ (?:shared )?uses?$|^Uses?$/i.test(b.text)).map(b => b.text.replace(/\.$/, '') + '.');
  const first = `${when ? `${when}: ` : ''}${fx.join('. ')}`;
  return [first ? first + '.' : '', ...notes].filter(Boolean).join(' ');
}
/** The plate as words, for screen readers. */
export function plateWords(info) {
  if (info.kind === 'idle') return `No effect here: ${info.why}`;
  if (info.role === 'add' && info.changed) return `adds ${num(info.base)}, worth ${num(info.eff)} here`;
  return info.plate;
}
