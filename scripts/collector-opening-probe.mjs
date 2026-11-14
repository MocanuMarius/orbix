import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const options = Object.fromEntries(process.argv.slice(2).map(arg => arg.slice(2).split('=')));
process.argv.push('--importOnly');
const controller = options.controller
  ? pathToFileURL(path.resolve(options.controller)).href
  : './balance-current-flight.mjs';
const {simulate, buildCase, summarize} = await import(controller);
const {BIOME_LEVELS} = await import('../dist/level-catalog.mjs');
const M = await import('../dist/model.mjs');
const styles = (options.styles || 'human150,human250,human350').split(',');
const seeds = Number(options.seeds || 12);
const skills = 'sight' in options ? {'main-sight': 1} : {};
const records = [];

if ('routes' in options) {
  for (let seed = 0; seed < seeds; seed++) {
    const state = M.newState();
    state.profile.difficulty = 2;
    const run = M.createRun(state.profile, 'starter-a2-' + seed, 2);
    for (const node of M.getChoices(run)) {
      const attempt = structuredClone(run);
      attempt.skills = {...skills};
      M.selectNode(attempt, node.id);
      const n = attempt.current;
      for (const style of styles) {
        records.push(simulate({
          run: structuredClone(attempt), skills, fleet: attempt.companions, terrain: n.terrain,
          difficulty: 2, stage: n.row, role: 'collector', style,
          seed: attempt.seed + '-' + n.id, duration: n.duration,
          profile: n.elite ? 'gauntlet' : 'refuge', node: n
        }));
      }
    }
  }
} else {
  const levels = 'all' in options ? BIOME_LEVELS : BIOME_LEVELS.filter((_, i) => i % 4 === 0);
  for (const level of levels) {
    for (const style of styles) {
      const config = buildCase({terrain: level.terrain, difficulty: 2, stage: 0, role: 'collector', style, skills});
      config.seed += ':' + level.id;
      Object.assign(config.node, {levelId: level.id, biomeId: level.biomeId, locationName: level.name});
      records.push(simulate(config));
    }
  }
}
const summary = summarize(records);
const byStyle = {};
for (const style of styles) {
  const rows = records.filter(r => r.style === style);
  const lead = rows.flatMap(r => r.firstSightLeadSeconds || []).sort((a, b) => a - b);
  const quantile = p => lead.length ? Number(lead[Math.floor((lead.length - 1) * p)].toFixed(2)) : null;
  const latency = rows[0]?.humanStress?.reaction;
  byStyle[style] = {
    trials: rows.length,
    clears: rows.filter(r => r.success).length,
    flightsBelowOneLift: rows.filter(r => r.minFuel + 1e-6 < r.flapCost).length,
    flightsWithDeniedLift: rows[0]?.liftInputs ? rows.filter(r => r.liftInputs.deniedEnergy > 0).length : null,
    lowFuelAtDeath: rows.filter(r => r.lowFuelAtDeath).length,
    fuelCues: lead.length,
    medianFirstSightSeconds: quantile(.5),
    tenthPercentileFirstSightSeconds: quantile(.1),
    cuesWithLessThanReactionTime: lead.length ? lead.filter(v => v < latency).length : null
  };
}
fs.writeFileSync(options.out || 'work/collector-opening.json', JSON.stringify({skills, styles, summary, byStyle, records}, null, 2));
console.log(JSON.stringify(byStyle, null, 2));
