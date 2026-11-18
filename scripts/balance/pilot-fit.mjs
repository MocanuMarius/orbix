// Quick fit check of one pilot on the first 6 stops (Lift Guide alone): clear/Lift rate/on-cue/capture/gap. node scripts/balance/pilot-fit.mjs --pilot=player-average --runs=6
process.argv.push('--importOnly');
const { createSim } = await import('./starter-sim.mjs');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const sim = await createSim({ style: args.pilot }), rs = [];
for (let i = 0; i < Number(args.runs || 6); i++) rs.push(sim.flyRun(['lift-guide'], `sb${i}`, { q: 0 }));
const S = k => rs.reduce((x, r) => x + r[k], 0), n = S('attempts'), g = rs.flatMap(r => r.gaps).sort((a, b) => a - b), t = S('timeFlown');
console.log(args.pilot, 'flights', n, 'clear', ((n - S('hearts')) / n).toFixed(2), 'lifts/s', (S('lifts') / t).toFixed(2), 'onCue', (S('cueLifts') / S('lifts')).toFixed(2), 'quick', (S('spam50') / S('lifts')).toFixed(2), 'capture', (S('fuelTaken') / S('fuelSeen')).toFixed(2), 'medGap', g[g.length >> 1].toFixed(2), 'glide', (g.filter(x => x > 2).reduce((a, b) => a + b, 0) / t).toFixed(2), 'refused', (S('denied') / n).toFixed(2), 'fuelDeaths', rs.reduce((x, r) => x + r.deaths.fuel, 0), 'under20', (S('under20') / n).toFixed(1));
