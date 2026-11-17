// What the Chain screen (v2.3-deck) shows, computed from the game's own rule engine. No DOM here, so tests
// can run it directly. Moved from the approved design-lab preview (dist/design-lab/deck.mjs › runV21, v2.3
// paths only). Every number comes from skill-cards.mjs › previewCardRow; this file only attributes the
// resolver's steps to plates and words.
//
// The plate rule: a card's plate shows what it contributes AT ITS OWN SLOT, counting only what cards to its
// LEFT did to it (an Echo repeating it). Later Boosts and the Encore keep their own plates. Honesty rule: the
// plates read left to right (+ adds, × multiplies the running figure, Encore repeats the line, each firing
// rounded down to whole Sparks) must give the resolver's total; when they do not, plates show plain figures.
import {SKILL_CARDS, CARD_UNIT, getCardRowRule, hasCardRowEvent, previewCardRow, isInventoryOnlyCard, describeSkillCard} from '../skill-cards.mjs?v=chain-deck-1';
import {getGlowCapacity, glowPoints, GLOW_DISPLAY_SCALE} from '../vitality.mjs?v=chain-deck-1';
import {CARD_TRIGGERS} from '../card-rule-bands.mjs?v=chain-deck-1';

/** The Triggers in the designer's order, with the game's names and glossary keys (card-terms.mjs). */
export const TRIGGERS = Object.freeze([
  ...['collect', 'delivery', 'latch', 'wave', 'flash', 'flash-ends', 'falling-lift', 'overfill', 'rhythm', 'swipe', 'save', 'clear']
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
  return ctx;
}

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
