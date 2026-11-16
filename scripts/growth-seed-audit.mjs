/** Production card draws and connected maps; assumes successful clears, never physics or human win rates. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import * as M from '../dist/model.mjs';
import * as current from '../dist/skill-cards.mjs';
import { CARD_DROP_WEIGHTS, CARD_DROP_MIX } from '../dist/card-catalog.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')));
const runs = Math.max(1000, Number(args.runs) || 10000), samples = Math.max(10000, Number(args.samples) || 30000);
const baseCommit = args.base || 'c41f0311811e6869a1c10efe0131235aa3ccfef5';
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const oldCatalog = execFileSync('git', ['show', `${baseCommit}:dist/card-catalog.mjs`], { encoding: 'utf8' });
const oldCards = execFileSync('git', ['show', `${baseCommit}:dist/skill-cards.mjs`], { encoding: 'utf8' });
const baseline = await import(asModule(oldCards.replace(/from '\.\/card-catalog\.mjs[^']*'/, `from '${asModule(oldCatalog)}'`)));
function rng(seed) {
  let state = 2166136261;
  for (const c of String(seed)) state = Math.imul(state ^ c.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5; let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1); n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
const tiers = ['normal', 'elite', 'boss'], rarities = ['common', 'rare', 'legendary'];
const tierOf = node => node.boss ? 'boss' : node.elite ? 'elite' : 'normal';
const rarityCounts = () => ({ common: 0, rare: 0, legendary: 0 });
function sampleRaw(api) {
  const result = {};
  for (const tier of tiers) {
    const counts = rarityCounts(), cards = {}, pool = Object.values(api.SKILL_CARDS).filter(def => !def.starterOnly);
    for (let i = 0; i < samples; i++) {
      const node = { id: `probe:${i}`, ...(tier === 'normal' ? {} : { [tier]: true }) };
      const card = api.drawSkillCard({ campaignSeed: `growth-audit:${i}`, mapIndex: i % 3 }, 'flight', node);
      const def = api.SKILL_CARDS[card.cardId]; counts[def.rarity]++; cards[def.id] = (cards[def.id] || 0) + 1;
    }
    for (const rarity of rarities) assert.ok(Math.abs(counts[rarity] / samples - CARD_DROP_WEIGHTS[tier][rarity] / 100) < .012);
    let maxWithinTierSigma = 0;
    for (const def of pool) {
      const sameTier = pool.filter(card => card.rarity === def.rarity), totalWeight = sameTier.reduce((sum, card) => sum + (card.dropWeight || 1), 0);
      const p = (def.dropWeight || 1) / totalWeight, expected = counts[def.rarity] * p;
      const sigma = Math.abs((cards[def.id] || 0) - expected) / Math.sqrt(counts[def.rarity] * p * (1 - p));
      maxWithinTierSigma = Math.max(maxWithinTierSigma, sigma);
      assert.ok(sigma < 6, `${tier}/${def.id}: within-tier sampling outside six sigma`);
    }
    result[tier] = { draws: samples, rarities: counts, growth: Object.entries(cards).reduce((sum, [id, count]) => sum + (api.SKILL_CARDS[id].kind === 'camp-grow' ? count : 0), 0), maxWithinTierSigma, cards };
  }
  const mix = rarityCounts();
  for (let i = 0; i < samples; i++) {
    const position = i % 100, tier = position < 75 ? 'normal' : position < 95 ? 'elite' : 'boss';
    const node = { id: `mixed:${i}`, ...(tier === 'normal' ? {} : { [tier]: true }) };
    const card = api.drawSkillCard({ campaignSeed: 'exact-mix', mapIndex: 0 }, 'flight', node);
    mix[api.SKILL_CARDS[card.cardId].rarity]++;
  }
  for (const rarity of rarities) {
    const expected = Object.entries(CARD_DROP_MIX).reduce((sum, [tier, weight]) => sum + weight * CARD_DROP_WEIGHTS[tier][rarity] / 10000, 0);
    assert.ok(Math.abs(mix[rarity] / samples - expected) < .012);
  }
  result.referenceMix = { draws: samples, sourceMix: CARD_DROP_MIX, rarities: mix };
  return result;
}
function award(api, run, node) {
  run.current = node;
  const card = api.drawSkillCard(run, 'flight', node);
  run.cardReward = { id: card.instanceId, card, source: 'flight', claimed: false };
  api.settleCardReward(run);
  api.recordCardEvent(run, 'drop', { card: api.describeSkillCard(card), elite: node.elite, boss: node.boss });
  return card;
}
function sampleRoutes(api) {
  const profile = M.newState().profile, result = {
    runs, earliestCampAcquired: 0, firstCampObserved: 0, beforeFirstCampAcquired: 0,
    byFirstMapAcquired: 0, byExpeditionAcquired: 0, beforeSecondCommonMissing: 0,
    sourceCounts: { normal: 0, elite: 0, boss: 0 }, rarityCounts: rarityCounts(), uniqueWithinRun: 0, duplicatesWithinRun: 0,
  };
  for (let i = 0; i < runs; i++) {
    const run = M.createRun(profile, `growth-route:${i}`, 1, { cards: true }), branch = rng(`branch:${i}`), owned = new Set();
    let grew = false, firstCamp = false, commons = 0;
    const earlyRun = structuredClone(run), firstCampNode = run.map.flat().filter(n => n.kind === 'camp').sort((a, b) => a.row - b.row)[0];
    const reachesCamp = new Set([firstCampNode.id]);
    for (let row = firstCampNode.row - 1; row >= 0; row--) for (const n of run.map[row]) if (n.nextIds.some(id => reachesCamp.has(id))) reachesCamp.add(n.id);
    let nextIds = null, earlyGrowth = false;
    for (let row = 0; row < firstCampNode.row; row++) {
      const choices = run.map[row].filter(n => (!nextIds || nextIds.includes(n.id)) && reachesCamp.has(n.id));
      const node = choices[Math.floor(branch() * choices.length)];
      if (node.type !== 'support') earlyGrowth = api.SKILL_CARDS[award(api, earlyRun, node).cardId].kind === 'camp-grow' || earlyGrowth;
      nextIds = node.nextIds;
    }
    result.earliestCampAcquired += Number(earlyGrowth);
    for (let map = 0; map < 3; map++) {
      let previous = null;
      for (const row of run.map) {
        const choices = row.filter(n => (!previous || previous.nextIds.includes(n.id)) && !(previous?.elite && n.elite));
        const node = choices[Math.floor(branch() * choices.length)]; assert.ok(node, 'connected route');
        if (node.kind === 'camp' && !firstCamp) { firstCamp = true; result.firstCampObserved++; result.beforeFirstCampAcquired += Number(grew); }
        if (node.type !== 'support') {
          const card = award(api, run, node), def = api.SKILL_CARDS[card.cardId];
          result.sourceCounts[tierOf(node)]++; result.rarityCounts[def.rarity]++;
          if (owned.has(card.cardId)) result.duplicatesWithinRun++; else result.uniqueWithinRun++;
          owned.add(card.cardId); grew = def.kind === 'camp-grow' || grew;
          if (def.rarity === 'common') commons++;
          if (def.rarity === 'common' && commons === 2 && !grew) result.beforeSecondCommonMissing++;
        }
        previous = node;
      }
      if (map === 0) result.byFirstMapAcquired += Number(grew);
      if (map < 2) { Object.assign(run, { phase: 'map-clear', step: run.map.length }); assert.ok(M.advanceMap(run)); }
    }
    result.byExpeditionAcquired += Number(grew);
  }
  return result;
}
const report = {
  method: 'Same monotonically numbered campaign seeds and seeded connected-route choices before/after. Real production draw, reserve settlement and historical drop data. Clears assumed successful; no Forge, seed-aware route choice, physical flight, or human win-rate inference.',
  baselineCommit: baseCommit, runs, samplesPerTier: samples,
  before: { raw: sampleRaw(baseline), routes: sampleRoutes(baseline) },
  after: { raw: sampleRaw(current), routes: sampleRoutes(current) },
};
assert.equal(report.after.routes.beforeSecondCommonMissing, 0);
assert.deepEqual(report.after.routes.sourceCounts, report.before.routes.sourceCounts);
assert.deepEqual(report.after.routes.rarityCounts, report.before.routes.rarityCounts, 'protection preserves every route rarity roll');
const destination = args.out || 'work/growth-seed-audit.json';
await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ destination, before: report.before.routes, after: report.after.routes }, null, 2));
