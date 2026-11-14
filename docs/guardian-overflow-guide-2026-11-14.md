# Guardian, overflow and guide update

- Base natural overflow conversion: 1/3. Fractional credit carries between pickups. Recovery never creates currency.
- Condensation skill: 1/2. Prism Vessel adds 1/3, yielding 2/3 without skills. Combined cap: 1 (no surplus multiplication).
- Existing two-mote wallet animation now waits for the transfer before displaying actual earned currency; zero-credit fragments do not show a fake gain.
- Collector follows continuous, uneven loops in both axes, constrained to its recovering boundary. Returning fetches target the contracted orbit.
- Drift Sense shows falling and immediate-Lift previews. Rank III searches a bounded set of zero/one/two-Lift schedules for the closest visible fuel pickup, favoring fewer Lifts. This is a local suggestion, not a global optimum or safety guarantee. No route is proposed through guardian attacks or unresolved interactive scenery.
- Six guardian silhouettes appear late in flight; three progress orbs light as guardians are cleared. Finale signatures have more trap coverage, stronger storm pushes, and deeper root breathing, while warning times and respite pockets remain.

## Validation

Physics probe: six scenarios, maximum coast error 4.3e-13. Route/orbit probe: no live-state mutation, reachable fuel route, guardian caution, orbit stays inside recovery radius. Local route-search p95 ~2.5 ms; not a phone benchmark.

48 actual-engine imperfect-input guardian runs: 30 clears, 18 collision deaths, no fuel deaths. Small deterministic sample; not an estimate of human win rate.

3,456 campaign economy models across tiers 1/3/6 and four companions. Source stable during measured run. Steady policy median: 5 purchases, 14 flights; median per-run ranks/flight .429; first purchase flight 2; income 518, retained wallet 65. Practiced median ranks/flight .462. This is close to the requested approximately one rank per two flights without filling all trees. Learning policy remains slower (.308), so the model does not establish equal viability for every player or build. Conversion now strongly rewards fuel preservation; no further cost increase applied.

Raw reports: work/economy-overflow-third.json and work/guardian-overflow-final.json. Subsequent edits to relic wording, return-orbit animation and release cache keys do not change these economy or guardian rules.
