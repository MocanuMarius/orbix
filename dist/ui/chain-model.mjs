// What the Chain screen (v2.3-deck) shows, computed from the game's own rule engine. No DOM here, so tests
// can run it directly. Moved from the approved design-lab preview (dist/design-lab/deck.mjs › runV21, v2.3
// paths only). Every number comes from skill-cards.mjs › previewCardRow; this file only attributes the
// resolver's steps to plates and words.
//
// The plate rule: a card's plate shows what it contributes AT ITS OWN SLOT, counting only what cards to its
// LEFT did to it (an Echo repeating it). Later Boosts and the Encore keep their own plates. Honesty rule: the
// plates read left to right (+ adds, × multiplies the running figure, Encore repeats the line, each firing
// rounded down to whole Sparks) must give the resolver's total; when they do not, plates show plain figures.
import {SKILL_CARDS, CARD_UNIT, getCardRowRule, hasCardRowEvent, previewCardRow, isInventoryOnlyCard, describeSkillCard, cardAmount} from '../skill-cards.mjs?v=guide-clarity-1';
import {getGlowCapacity, glowPoints, GLOW_DISPLAY_SCALE} from '../vitality.mjs?v=guide-clarity-1';
import {CARD_TRIGGERS, getCardTrigger} from '../card-rule-bands.mjs?v=guide-clarity-1';
import {hasEngineCards, engineMetrics, findEngineLoop, engineStarts} from '../card-engine.mjs?v=guide-clarity-1';
import {previewBlackHoleMeals, devourTally} from '../card-black-hole.mjs?v=guide-clarity-1';

/** The Triggers in the designer's order, with the game's names and glossary keys (card-terms.mjs). */
export const TRIGGERS = Object.freeze([
  ...['collect', 'delivery', 'latch', 'wave', 'flash', 'flash-ends', 'falling-lift', 'overfill', 'rhythm', 'save', 'clear']
    .map(id => CARD_TRIGGERS[id]).filter(Boolean)
    .map(t => Object.freeze({kind: t.event, name: t.label, term: t.id, meaning: t.meaning})),
  // Victory is the engine's thirteenth Trigger; no card listens to it by name and it has no glossary entry.
  Object.freeze({kind: 'expedition-victory', name: 'Victory', term: null, meaning: 'You win an expedition.'}),
]);
export const TRIGGER_BY = Object.freeze(Object.fromEntries(TRIGGERS.map(t => [t.kind, t])));
export const triggerName = kind => TRIGGER_BY[kind]?.name || 'this Trigger';

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
  if (!rule) return {cls: 'always', glyph: 'Always on', text: 'Always on'};
  return null;
}
/** Which Trigger the card itself listens to: the WHEN of its real row rule. */
export function whenOf(c) {
  const def = SKILL_CARDS[c?.cardId], rule = def ? getCardRowRule(def, c) : null;
  if (isRest(c)) return {text: 'At Rest'};
  if (rule?.event && TRIGGER_BY[rule.event]) return {kind: rule.event, text: TRIGGER_BY[rule.event].name};
  if (rule?.event === '*') return {text: 'Any Trigger'};
  if (def?.kind === 'echo' || def?.kind === 'chameleon') return {text: 'Same as the card it repeats'};
  if (def?.kind === 'refrain') return {text: 'Any Trigger, after a Bonus'};
  return {text: 'Always on'};
}

// The preview event: a natural Spark with the meter at 6 of the base 30 Sparks (as in the approved preview).
export const METER_MAX = getGlowCapacity({});
export const START_SPARKS = 6;
export const START_FLAME = START_SPARKS / GLOW_DISPLAY_SCALE;
const eventFor = kind => Object.freeze({kind, pickupKind: 'light', meterFraction: START_FLAME / METER_MAX});

export function solveTrigger(row, kind) {
  const listens = hasCardRowEvent(row, kind);
  const ev = eventFor(kind);
  const receipt = previewCardRow({cards: row}, listens ? ev : {...ev, eligible: false});
  const gainFlame = Math.min(receipt.sparks * CARD_UNIT, Math.max(0, METER_MAX - START_FLAME));
  return {kind, listens, receipt, steps: receipt.steps, sparks: receipt.sparks, gainFlame, gain: glowPoints(gainFlame)};
}
/** A Trigger fires this chain when a card listens to it AND the resolver, run with it, has a card that acts. */
export const triggersFor = row => TRIGGERS.filter(t => hasCardRowEvent(row, t.kind) && solveTrigger(row, t.kind).steps.some(st => st.success));

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
const listensTo = card => {const r = getCardRowRule(SKILL_CARDS[card.cardId], card);return r?.event && r.event !== '*' && TRIGGER_BY[r.event] ? r.event : null;};

/** What the plate under one slot says. kind: empty | passive | waits | spent | idle | act (role add/mul/encore/repeat/repeat-paid). */
export function slotInfo(ctx, slot, {plain} = {}) {
  const {row, sol, attr, trigger} = ctx, c = row[slot];
  if (!c) return {kind: 'empty'};
  const noEff = plain ?? ctx.plain;
  const def = SKILL_CARDS[c.cardId], rule = getCardRowRule(def, c);
  const fires = !!rule || ['echo', 'chameleon', 'refrain'].includes(def?.kind);
  if (!fires) return {kind: 'passive', plate: 'Always on'};
  const steps = sol.steps.filter(st => st.slot === slot), ok = steps.find(st => st.success);
  if (!ok) {
    const last = steps.filter(st => !st.success).pop();
    // Its Uses went to an Echo-style card's repeats.
    if (attr?.paid && [...attr.paid.values()].some(p => p.target === slot)) return {kind: 'spent', plate: 'Uses spent'};
    // It listens to a different Trigger: not an error, it waits for that one.
    const ownEvent = listensTo(c);
    const copyEvent = ['echo', 'chameleon'].includes(def.kind) && row[slot + 1] ? listensTo(row[slot + 1]) : null;
    const waits = ownEvent || copyEvent;
    if (waits && waits !== trigger) return {kind: 'waits', plate: `Waits for ${triggerName(waits)}`, waits};
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

/** The sum as the plates show it, read left to right. Each firing rounds down to whole Sparks, as the resolver does. */
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
    total += ctx.sol?.receipt && 'sparksExact' in ctx.sol.receipt ? Math.floor(r + 1e-9) : r;
  }
  return Math.round(total * 100) / 100;
}

/** Everything the Chain tab needs for one row and one wanted Trigger. */
export function resolveChain(row, wanted = null) {
  const cards = (row || []).map(c => c || null);
  const trigs = triggersFor(cards);
  const trigger = trigs.some(t => t.kind === wanted) ? wanted : trigs[0]?.kind || 'body-spark';
  const sol = solveTrigger(cards, trigger);
  const ctx = {row: cards, sol, attr: null, plain: false, trigger, trigs};
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
 * (Collect 10, Pulse 6, Falling Lift 8 per 30 s flight: often; Delivery 4, Latch 3, Flash 3, Flash ends 3, Rhythm 4,
 * Overfill 2, skims 2 to 3, low Lifts a few: a few times; Save, Clear, Pack, Take-off: once). */
export const TRIGGER_BOOK = Object.freeze([
  ['collect', 'You touch a Spark with your wisp.', 'often'],
  ['delivery', 'Collector brings you a pickup.', 'a few times'],
  ['latch', 'Collector grabs a pickup you missed.', 'a few times'],
  ['wave', 'A Pulse crosses a Spark you have not taken.', 'often'],
  ['flash', 'You or Collector pick up a Flash.', 'a few times'],
  ['flash-ends', 'A Flash’s light runs out.', 'a few times'],
  ['falling-lift', 'You Lift while falling.', 'often'],
  ['overfill', 'A Spark brings more than your meter holds.', 'a few times'],
  ['rhythm', 'You Lift 3 times at an even pace.', 'a few times'],
  ['engine-skim', 'You fly close to terrain until Proximity fills.', 'a few times'],
  ['engine-lift', 'You Lift with your meter under a quarter.', 'a few times'],
  ['save', 'Collector stops a crash that would end the flight.', 'once'],
  ['take-off', 'You start a flight.', 'once'],
  ['clear', 'You clear a flight.', 'once'],
  ['pack', 'You clear a flight; spare Sparks are packed.', 'once'],
  ['engine-pulse', 'A card to its left sends a Pulse.', 'each Turn'],
  ['engine-gain', 'A card to its left gives Sparks.', 'each Turn'],
  ['engine-any', 'Any card event reaches it.', 'each Turn'],
  ['engine-turn', 'Your engine goes round once.', 'each Turn'],
  ['timers', 'It changes the Timers in your chain.', 'always'],
  ['any', 'It fires with whatever Trigger fires your chain.', 'with every Trigger'],
  ['next', 'It fires when the card to its right fires.', 'with that card'],
  ['always-on', 'It works the whole time it is in your chain.', 'always'],
  ['rest', 'You use it from your Deck at Rest.', 'at Rest'],
].map(([id, does, often]) => Object.freeze({id, label: CARD_TRIGGERS[id].label, does, often, term: id === 'any' ? 'any-trigger' : id === 'wave' ? 'wave' : id})));
/** The Trigger collection for one run: every Trigger, with the player's own cards that use it (a tile per card
 * kind, with a count). `owned` false rows read "No card yet". */
export function triggerBook(run) {
  const owned = [...(run?.mountedCards || []), ...(run?.reserveCards || [])].filter(Boolean);
  return TRIGGER_BOOK.map(entry => {
    const kinds = new Map();
    for (const card of owned) {
      if (chipOf(card).id !== entry.id) continue;
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
    if (spec.does?.includes('fire-collect')) return {long: 'Fires Collect cards', short: 'Fires Collect'};
    return {long: 'One last Turn', short: 'Last Turn'};
  }
  const d = spec.does || [];
  if (d.includes('homing')) return {long: 'Collector fetches again', short: 'Fetches again'};
  if (d.includes('flash')) return {long: 'Starts a short Flash', short: 'A Flash'};
  if (d.includes('gain') && d.includes('pulse')) return {long: `Sends a Pulse, +${num(amount)}`, short: `Pulse, +${num(amount)}`};
  if (d.includes('gain')) return {long: `${sparks} each Turn`, short: `+${num(amount)} a Turn`};
  if (d.includes('pulse')) return {long: spec.keep ? `Sends a Pulse, keeps ${num(spec.keep)}` : 'Sends a Pulse', short: 'Sends a Pulse'};
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
  if (info.kind === 'passive') return `${at}: always on while it is in your chain. It does not fire.`;
  if (info.kind === 'waits') return `${at}: waits for ${triggerName(info.waits)}. It does nothing on ${on}; that is not a problem.`;
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
/** The plate as words, for screen readers. */
export function plateWords(info) {
  if (info.kind === 'idle') return `No effect here: ${info.why}`;
  if (info.role === 'add' && info.changed) return `adds ${num(info.base)}, worth ${num(info.eff)} here`;
  return info.plate;
}
