// Card-run economy measurement with the production model (synthetic successful flights; not a human win-rate model).
// Usage: node scripts/balance/economy-run.mjs [runs=300] [--write]
// Plays whole 3-map card runs through the real campaign functions. Every flight is cleared (synthetic result), a Rest
// is preferred when a row offers one, the player always takes the rarest card of each pack, and at each Rest the whole
// wallet is spent by one policy: forge (greedy by rarity), evolve (improve toward an Evolve, then Evolve), or none.
import { writeFileSync } from 'node:fs';
import * as M from '../../dist/model.mjs';
import { SKILL_CARDS } from '../../dist/skill-cards.mjs';
import { getGlowCapacity } from '../../dist/vitality.mjs';
const runs = Number(process.argv[2]) || 300, write = process.argv.includes('--write');
const RANK = { common: 0, rare: 1, legendary: 2 };
const owned = r => M.getOwnedCards(r);
function rarityCount(r) { const c = { common: 0, rare: 0, legendary: 0 }; for (const card of owned(r)) { const d = SKILL_CARDS[card.cardId]; if (d) c[d.rarity]++; } return c; }
function spend(state, policy, log) {
  const r = state.run;
  for (let guard = 0; guard < 80; guard++) {
    let acted = false;
    if (policy === 'forge') {
      for (const rarity of ['legendary', 'rare', 'common']) {
        const q = M.getCardForgePreview(r, rarity);
        if (q.eligible && M.forgeOwnedCard(state, rarity, q.token)) { log.forges[rarity]++; log.spent.forge += q.price; acted = true; break; }
      }
    } else if (policy === 'evolve') {
      const options = [];
      for (const card of owned(r)) {
        const p = M.getCardImprovePreview(r, card.instanceId);
        if (!p || !p.eligible || !p.kind) continue;
        const def = SKILL_CARDS[card.cardId];
        const target = p.kind === 'evolution' ? SKILL_CARDS[p.after.cardId] : SKILL_CARDS[def.evolvesTo];
        if (!target) continue;
        options.push({ card, p, score: (p.kind === 'evolution' ? 100 : 0) + RANK[target.rarity] * 10 - p.price / 100 });
      }
      options.sort((a, b) => b.score - a.score);
      const pick = options[0];
      if (pick && M.improveOwnedCard(state, pick.card.instanceId, pick.card.rank, pick.p.token)) {
        if (pick.p.kind === 'evolution') { log.evolves[SKILL_CARDS[pick.p.after.cardId].rarity]++; log.spent.evolve += pick.p.price; } else log.spent.improve += pick.p.price;
        acted = true;
      }
    }
    if (!acted) break;
  }
}
function pickDraft(state) {
  const d = M.getCardDraft(state.run); if (!d) return;
  const best = [...d.offers].sort((a, b) => RANK[SKILL_CARDS[b.cardId].rarity] - RANK[SKILL_CARDS[a.cardId].rarity])[0];
  M.chooseCardDraft(state, d.id, best.instanceId);
}
function playRun(seed, policy) {
  const state = M.newState(); state.profile.tutorialComplete = true;
  const r = state.run = M.createRun(state.profile, seed, 1, { cards: true });
  M.chooseStartingGift(state, M.getStartingGiftOffers(r)[0].id);
  const log = { rests: 0, flights: 0, income: {}, byMap: [{ earned: 0, rests: 0 }, { earned: 0, rests: 0 }, { earned: 0, rests: 0 }], forges: { common: 0, rare: 0, legendary: 0 }, evolves: { rare: 0, legendary: 0 },
    spent: { forge: 0, evolve: 0, improve: 0 }, packs: 0, offeredRare: 0, offeredLegendary: 0 };
  // Income = every rise of the Stored Sparks wallet outside my own spending, by the kind of stop that caused it.
  const credit = (cat, before, mi) => { const gain = Math.max(0, r.condensedGlow - before); log.income[cat] = (log.income[cat] || 0) + gain; log.byMap[mi].earned += gain; };
  for (let turn = 0; turn < 400 && r.phase !== 'ended' && !r.banked; turn++) {
    const mi0 = Math.min(2, r.mapIndex || 0);
    let w0 = r.condensedGlow;
    const d = M.getCardDraft(r);
    if (d) { for (const o of d.offers) { const rar = SKILL_CARDS[o.cardId].rarity; if (rar === 'rare') log.offeredRare++; if (rar === 'legendary') log.offeredLegendary++; } log.packs++; pickDraft(state); credit('card packs', w0, mi0); w0 = r.condensedGlow; }
    if (r.cardReward && !r.cardReward.claimed) r.cardReward.uiAcknowledged = true;
    if (r.victoryPending) { const f = r.flightReward; if (f && !f.claimed) { if (f.offers?.length) M.chooseFlightReward(state, f.offers[0]); else f.claimed = true; } M.acknowledgeVictory(state); credit('flights (reward choice)', w0, mi0); continue; }
    if (r.phase === 'map-clear') { if (!M.advanceMap(r)) break; continue; }
    if (r.phase === 'map') {
      const rank = n => n.kind === 'camp' ? 0 : n.kind === 'treasure' ? 1 : n.type === 'support' ? 2 : (n.elite || n.boss) ? 4 : 3;
      const choices = [...M.getChoices(r)].sort((a, b) => rank(a) - rank(b));
      if (!choices.length || !M.selectNode(r, choices[0].id)) break; continue;
    }
    if (r.phase === 'briefing') {
      const node = r.current, mi = r.mapIndex;
      if (!M.beginFlightAttempt(r) || !M.markFlightAttemptStarted(r)) break;
      if (!M.finishFlight(r, { success: true, flame: getGlowCapacity(r) * .5, collected: 5, boss: node.boss ? { id: node.bossId, defeated: true } : null })) break;
      log.flights++;
      M.settleCheckpoint(state);
      credit(node.boss ? 'flights: Guardian' : node.elite ? 'flights: Elite' : 'flights: ordinary', w0, mi); continue;
    }
    if (r.phase === 'support') {
      const camp = r.current.kind === 'camp', mi = r.mapIndex, kind = r.current.kind;
      if (camp) { log.rests++; log.byMap[mi].rests++; spend(state, policy, log); }
      w0 = r.condensedGlow;
      const choices = M.getSupportChoices(r, state.profile);
      let index = camp ? choices.findIndex(c => c.effect?.restContinue || c.effect?.rest === 'recover') : choices.findIndex(c => !c.disabled);
      if (index < 0) index = choices.findIndex(c => !c.disabled);
      let ok = M.resolveSupport(r, index, state.profile);
      for (let j = 0; j < choices.length && !ok; j++) ok = M.resolveSupport(r, j, state.profile);
      if (!ok) { if (r.current?.kind === 'scribe' && r.flightReward?.offers?.length) { M.chooseFlightReward(state, r.flightReward.offers[0]); M.leaveScribe(r); continue; } break; }
      if (r.pendingChest) M.chooseChestReward(state, 'sparks');
      M.settleCheckpoint(state); credit(camp ? 'Rest' : kind === 'treasure' ? 'chests' : kind === 'event' ? 'events' : 'other stops (' + kind + ')', w0, mi); continue;
    }
    break;
  }
  log.final = rarityCount(r); log.wallet = r.condensedGlow; log.earned = Object.values(log.income).reduce((x, y) => x + y, 0); log.success = !!r.success; log.phase = r.phase;
  return log;
}
const mean = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
const out = {};
for (const policy of ['none', 'forge', 'evolve']) {
  const logs = []; for (let i = 0; i < runs; i++) logs.push(playRun(`econ-${i}`, policy));
  out[policy] = logs;
}
const f = x => x.toFixed(2);
const lines = [];
const base = out.none;
lines.push(`runs=${runs} per policy; reached the end: ${base.filter(l => l.success).length}/${runs} (otherwise stopped in phase: ${[...new Set(base.filter(l => !l.success).map(l => l.phase))].join(',') || 'none'})`);
lines.push(`flights/run ${f(mean(base, l => l.flights))}, Rests/run ${f(mean(base, l => l.rests))} (map 1/2/3: ${[0, 1, 2].map(m => f(mean(base, l => l.byMap[m].rests))).join(' / ')}), card packs/run ${f(mean(base, l => l.packs))}`);
lines.push(`Rares offered/run ${f(mean(base, l => l.offeredRare))}, Legendaries offered/run ${f(mean(base, l => l.offeredLegendary))}`);
lines.push(`Stored Sparks earned/run (no spending): ${f(mean(base, l => l.earned))}; per map ${[0, 1, 2].map(m => f(mean(base, l => l.byMap[m].earned))).join(' / ')}`);
const kinds = [...new Set(base.flatMap(l => Object.keys(l.income)))].sort();
lines.push('', '| income source (Stored Sparks wallet rise) | per run |', '|---|---|', ...kinds.map(k => `| ${k} | ${f(mean(base, l => l.income[k] || 0))} |`));
for (const policy of ['none', 'forge', 'evolve']) {
  const L = out[policy];
  lines.push('', `Policy ${policy}: ends with Commons ${f(mean(L, l => l.final.common))}, Rares ${f(mean(L, l => l.final.rare))}, Legendaries ${f(mean(L, l => l.final.legendary))}; forges C/R/L ${['common', 'rare', 'legendary'].map(k => f(mean(L, l => l.forges[k]))).join('/')}; evolves R/L ${['rare', 'legendary'].map(k => f(mean(L, l => l.evolves[k]))).join('/')}; spent forge ${f(mean(L, l => l.spent.forge))}, evolve ${f(mean(L, l => l.spent.evolve))}, improve ${f(mean(L, l => l.spent.improve))}; wallet left ${f(mean(L, l => l.wallet))}`);
}
console.log(lines.join('\n'));
if (write) writeFileSync('outputs/balance/economy.md', '# Economy per full card run (production model, synthetic cleared flights)\n\nSource: scripts/balance/economy-run.mjs. Drop rates 94.5/5/0.5, Elite slot 1 reserved Rare, Guardian slot 1 reserved Legendary; Forge price doubles per forge of a tier for the rest of the run.\n\n```\n' + lines.join('\n') + '\n```\n');
