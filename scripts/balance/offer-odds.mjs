// Read-only measurement of card offer odds using the real draft/forge functions.
// Usage: node scripts/balance/offer-odds.mjs [runs=6000] [--write]
// Assumptions: 3 maps per card run (mapIndex 0..2); each map has 5 normal flights, 1 elite and the
// guardian (7 drafts per map, 21 per run; see CARD_ROUTE_RECIPES in dist/model.mjs). The player
// picks one of the three offers at random (a neutral policy) and keeps every pick, so owned-card
// context and the Growth Seed / Lantern Lens safeguards behave as they do in real play.
import { writeFileSync } from 'node:fs';
import { LIVE_CARDS, SKILL_CARDS, drawSkillCardDraft, drawForgeCard, makeSkillCard } from '../../dist/skill-cards.mjs';
const runs = Number(process.argv[2]) || 6000, write = process.argv.includes('--write');
const plan = []; for (let m = 0; m < 3; m++) { for (let i = 0; i < 5; i++) plan.push({ m, kind: 'normal', i }); plan.push({ m, kind: 'elite', i: 5 }); plan.push({ m, kind: 'boss', i: 6 }); }
const offerable = LIVE_CARDS.filter(d => !d.starterOnly);
const ids = offerable.map(d => d.id);
const offeredRuns = Object.fromEntries(ids.map(id => [id, 0])), offerCount = Object.fromEntries(ids.map(id => [id, 0]));
let totalOffers = 0, drafts = 0;
let pick = 1;
const rnd = () => (pick = (pick * 1664525 + 1013904223) >>> 0) / 4294967296;
for (let r = 0; r < runs; r++) {
  const run = { id: 'r' + r, seed: 'sim-' + r, campaignSeed: 'sim-' + r, mapIndex: 0, mountedCards: [], reserveCards: [], cardHistory: [], cardSlots: 3 };
  const seen = new Set();
  for (const step of plan) {
    run.mapIndex = step.m;
    const node = { id: `m${step.m}-${step.i}`, elite: step.kind === 'elite', boss: step.kind === 'boss' };
    const offers = drawSkillCardDraft(run, node);
    drafts++;
    for (const o of offers) { offerCount[o.cardId] = (offerCount[o.cardId] || 0) + 1; totalOffers++; seen.add(o.cardId); }
    const chosen = offers[Math.floor(rnd() * offers.length)];
    const def = SKILL_CARDS[chosen.cardId];
    (run.mountedCards.length < 3 ? run.mountedCards : run.reserveCards).push(chosen);
    run.cardHistory.push({ type: 'drop', mapIndex: step.m, nodeId: node.id, card: { ...chosen, rarity: def.rarity, kind: def.kind },
      offeredCardIds: offers.map(o => o.cardId) });
  }
  for (const id of seen) offeredRuns[id]++;
}
const rows = offerable.map(d => ({ id: d.id, name: d.name, rarity: d.rarity, weight: d.dropWeight || 1,
  atLeastOnce: offeredRuns[d.id] / runs, perOffer: offerCount[d.id] / totalOffers, perDraft: offerCount[d.id] / drafts }));
rows.sort((a, b) => a.atLeastOnce - b.atLeastOnce || a.id.localeCompare(b.id));
const rank = rows.findIndex(r => r.id === 'slip-feather') + 1;
// Forge: chance a hidden surprise of a rarity is slip-feather (fresh run, nothing owned), over many counts.
const forge = {};
for (const rarity of ['common', 'rare', 'legendary']) {
  let hit = 0, n = 4000;
  for (let c = 0; c < n; c++) { const f = drawForgeCard({ campaignSeed: 'f' + c, seed: 'f' + c, mountedCards: [], reserveCards: [] }, rarity, c % 6); if (f.cardId === 'slip-feather') hit++; }
  forge[rarity] = hit / n;
}
const pct = x => (100 * x).toFixed(1) + '%', pct2 = x => (100 * x).toFixed(2) + '%';
const commons = offerable.filter(d => d.rarity === 'common'), commonWeight = commons.reduce((s, d) => s + (d.dropWeight || 1), 0);
const lines = [];
lines.push(`runs=${runs}, drafts/run=${plan.length}, offerable live cards=${rows.length}, commons=${commons.length} (total weight ${commonWeight})`);
lines.push(`Proximity (slip-feather): offered at least once in ${pct(rows.find(r => r.id === 'slip-feather').atLeastOnce)} of runs; per offer ${pct2(rows.find(r => r.id === 'slip-feather').perOffer)}; rank ${rank} of ${rows.length} from least offered.`);
lines.push(`Forge hidden card is Proximity: common ${pct2(forge.common)}, rare ${pct2(forge.rare)}, legendary ${pct2(forge.legendary)} (fresh run).`);
lines.push('');
lines.push('| # | card | rarity | weight | offered >=1x per run | per offer |');
lines.push('|---|---|---|---|---|---|');
rows.forEach((r, i) => lines.push(`| ${i + 1} | ${r.name} (${r.id}) | ${r.rarity} | ${r.weight} | ${pct(r.atLeastOnce)} | ${pct2(r.perOffer)} |`));
const text = lines.join('\n');
console.log(text.split('\n').slice(0, 3 + 2 + 15).join('\n'));
if (write) writeFileSync('outputs/balance/offer-odds.table.txt', text);
