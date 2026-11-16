/** Offer weighting describes possible row arrangements, never two declined draft
 * alternatives. Every ordinary card keeps its full base weight, and only one
 * draft slot uses these bounded multipliers.
 */
const copies = new Set(['echo', 'chameleon']);
const excludedWildcardEvents = new Set(['flight-clear', 'expedition-victory', 'collector-attach']);
const dependentOperations = new Set(['multiply', 'add-last-payout']);
const restOnly = def => ['camp-grow', 'camp-extra'].includes(def?.kind);
const broad = ({def, rule}) => copies.has(def.kind)
  || ['refrain', 'use-doubler', 'ember-feeder'].includes(def.kind)
  || (rule?.event === '*' && (dependentOperations.has(rule.operation) || rule.minimumEarlierPayers > 0));
const sparks = entry => entry.rule?.operation === 'add-sparks' && !(entry.rule.minimumEarlierPayers > 0);
const dependent = entry => dependentOperations.has(entry.rule?.operation) || entry.rule?.minimumEarlierPayers > 0;
const eventsMeet = (a, b) => a === b || (a === '*' && !excludedWildcardEvents.has(b))
  || (b === '*' && !excludedWildcardEvents.has(a));
const conditionsMeet = (a, b) => !a?.pickupKind || !b?.pickupKind || a.pickupKind === b.pickupKind;
const repeatable = (copy, target) => target.def.copyable && !restOnly(target.def)
  && (copy.def.kind !== 'echo' || (!target.def.passive && target.def.kind !== 'capacity'));
const finite = entry => entry.def.charges > 0 && !restOnly(entry.def) && entry.def.kind !== 'use-doubler';

function hasPayers(consumer, providers, slots) {
  if (!dependent(consumer)) return false;
  const needed = Math.max(1, Number(consumer.rule.minimumEarlierPayers) || 1);
  if (slots <= needed) return false;
  // A wildcard cannot pay an otherwise empty pass. Count real, independent
  // payers; shared trigger conditions must also be satisfiable together.
  const matches = providers.filter(provider => sparks(provider) && eventsMeet(consumer.rule.event, provider.rule.event)
    && conditionsMeet(consumer.rule.when, provider.rule.when));
  return matches.some(anchor => matches.filter(provider => eventsMeet(anchor.rule.event, provider.rule.event)
    && conditionsMeet(anchor.rule.when, provider.rule.when)).length >= needed);
}

function ready(candidate, owned, slots) {
  if (slots < 2) return false;
  if (copies.has(candidate.def.kind) && owned.some(target => repeatable(candidate, target))) return true;
  if (owned.some(copy => copies.has(copy.def.kind) && repeatable(copy, candidate))) return true;
  if (candidate.def.kind === 'use-doubler' && owned.some(finite)) return true;
  if (finite(candidate) && owned.some(entry => entry.def.kind === 'use-doubler')) return true;
  if (candidate.def.kind === 'ember-feeder' && slots >= 3 && owned.filter(entry => !restOnly(entry.def)).length >= 2) return true;
  if (candidate.def.kind === 'refrain' && owned.some(entry => !!entry.rule)) return true;
  if (candidate.rule && owned.some(entry => entry.def.kind === 'refrain')) return true;
  if (hasPayers(candidate, owned, slots)) return true;
  return sparks(candidate) && owned.some(consumer => hasPayers(consumer,
    [candidate, ...owned.filter(entry => entry !== consumer)], slots));
}

/** Descriptors contain the catalog definition and the real row rule. Forge is
 * deliberately campaign/sequence based: moving, melting or equipping a card
 * must never reroll an already visible quote.
 */
export function cardOfferMultiplier(candidate, owned = [], {mode = 'draft', slots = 3} = {}) {
  const generic = broad(candidate);
  if (mode === 'forge') return generic ? 3 : 1;
  if (ready(candidate, owned, slots)) return generic ? 4 : 2;
  return generic ? 1.5 : 1;
}
