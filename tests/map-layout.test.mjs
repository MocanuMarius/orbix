import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {stopPreviewMarkup} from '../dist/stop-preview.mjs';
import {getMapStopInfo,mapStopIconMarkup} from '../dist/map-guide.mjs';
import {scribeMarkup} from '../dist/reward-screen.mjs';
import {slotInscriptionId} from '../dist/inscriptions.mjs';

// Card-run map layout (rests-scribes-1): every path passes >= 3 Rests, a fourth is optional, and every map offers exactly two Scribes.
// Before: 10 rows, 11 flights, 2 elites, 2 treasures, 2 events, 3 Rests (only one on every path), Scribe only from a boss.
const BEFORE = {rows: 10, flights: 11, elite: 2, treasure: 2, event: 2};
const SEEDS = Array.from({length: 40}, (_, i) => 'layout-' + i);
const kindOf = n => n.boss ? 'boss' : n.kind;
const byId = map => new Map(map.flat().map(n => [n.id, n]));

function paths(map) {
  const nodes = byId(map), out = [];
  const walk = (n, trail) => {
    trail = [...trail, n];
    if (n.row === map.length - 1) { out.push(trail); return; }
    assert.ok(n.nextIds.length, `${n.id} dead-ends before the guardian`);
    for (const id of n.nextIds) walk(nodes.get(id), trail);
  };
  map[0].forEach(n => walk(n, []));
  return out;
}
const everyMap = fn => { for (const seed of SEEDS) for (let index = 0; index < 3; index++) fn(M.makeMap(`${seed}|tier:1|map:${index}`, index, 1, true), index, seed); };

test('every path passes at least 3 Rests, one more Rest is optional and skippable, none are back to back', () => {
  everyMap((map, index, seed) => {
    const all = paths(map), rests = p => p.filter(n => n.kind === 'camp');
    const counts = all.map(p => rests(p).length);
    assert.equal(Math.min(...counts), 3, `${seed} map ${index}`);
    assert.equal(Math.max(...counts), 4, `${seed} map ${index}: the fourth Rest is reachable by choice`);
    const camps = map.flat().filter(n => n.kind === 'camp');
    const unavoidable = camps.filter(c => all.every(p => p.includes(c)));
    const optional = camps.filter(c => !unavoidable.includes(c));
    assert.equal(unavoidable.length, 3); assert.equal(optional.length, 1);
    assert.ok(all.some(p => !p.includes(optional[0])) && all.some(p => p.includes(optional[0])), 'optional Rest can be taken or skipped');
    for (const p of all) for (let i = 1; i < p.length; i++) assert.ok(!(p[i].kind === 'camp' && p[i - 1].kind === 'camp'), 'no Rests in consecutive rows');
    // spread: first Rest early, last Rest one flight or less before the guardian
    const rows = unavoidable.map(c => c.row).sort((a, b) => a - b);
    assert.ok(rows[0] <= 5 && map.length - 1 - rows[2] <= 2 && rows[1] - rows[0] >= 3, JSON.stringify(rows));
  });
});

test('every map offers exactly two Scribes, none from the last guardian, and no path can dodge a Scribe stop', () => {
  let total = 0;
  const totals = [];
  everyMap((map, index, seed) => {
    const run = M.createRun(M.newState().profile, 'scribe-count', 1, {cards: true}), boss = map.at(-1).find(n => n.boss);
    const bossScribe = M.flightRewardKind(run, boss) === 'inscription' ? 1 : 0;
    assert.equal(bossScribe, index === 2 ? 0 : 1, 'the last guardian ends the run and awards no Scribe');
    const stops = map.flat().filter(n => n.kind === 'scribe');
    assert.equal(stops.length, index === 2 ? 2 : 1, `${seed} map ${index}`);
    for (const p of paths(map)) assert.equal(p.filter(n => n.kind === 'scribe').length, index === 2 ? 2 : 1);
    const stopRows = stops.map(s => s.row / (map.length - 1));
    if (index === 2) assert.ok(stopRows[0] > .28 && stopRows[0] < .42 && stopRows[1] > .6 && stopRows[1] < .75, stopRows.join());
    else assert.ok(stopRows[0] > .4 && stopRows[0] < .6, stopRows.join());
    assert.equal(stops.length + bossScribe, 2);
    totals[index] = stops.length + bossScribe;
  });
  total = totals.reduce((a, b) => a + b, 0);
  assert.equal(total, M.SCRIBES_PER_MAP * M.MAP_COUNT); assert.equal(M.SCRIBE_MAX_PER_RUN, 6);
});

test('maps are connected: every node is reachable, every node reaches the guardian, and the length matches the layout', () => {
  everyMap((map, index) => {
    assert.equal(map.length, index === 2 ? 17 : 15);
    const nodes = byId(map), reached = new Set(map[0].map(n => n.id));
    for (const row of map) for (const n of row) if (reached.has(n.id)) n.nextIds.forEach(id => reached.add(id));
    assert.equal(reached.size, nodes.size, 'every node is reachable from the first row');
    const guardians = map.flat().filter(n => n.boss);
    assert.equal(guardians.length, 1); assert.equal(guardians[0].row, map.length - 1); assert.ok(reached.has(guardians[0].id));
    for (const n of nodes.values()) { assert.ok(n.nextIds.every(id => nodes.get(id)?.row === n.row + 1)); assert.ok(n.row === map.length - 1 || n.nextIds.length); }
    // supports are entered from flights and leave into flights, as before
    for (const n of nodes.values()) if (n.type === 'support') for (const id of n.nextIds) assert.notEqual(nodes.get(id).type, 'support');
    for (const n of nodes.values()) if (n.type === 'support' && n.row > 0) assert.ok(map[n.row - 1].every(p => p.type !== 'support' || !p.nextIds.includes(n.id)));
    // every node on a single-node row (Rest, Scribe) is the only way through that row
    for (const row of map) if (row.length === 1 && row[0].row > 0 && row[0].row < map.length - 1) assert.ok(map[row[0].row - 1].every(p => p.nextIds.includes(row[0].id)));
  });
});

test('other stop types stay within a stated tolerance of the old 10-row map', () => {
  everyMap((map, index) => {
    const n = map.flat(), count = pred => n.filter(pred).length;
    assert.equal(count(x => x.elite), BEFORE.elite);
    assert.equal(count(x => x.kind === 'treasure'), BEFORE.treasure);
    assert.equal(count(x => x.kind === 'event'), BEFORE.event);
    const flights = count(x => x.type === 'flight' && !x.elite && !x.boss);
    assert.ok(flights >= BEFORE.flights && flights <= BEFORE.flights + 6, `${flights} ordinary flights`);
    assert.equal(count(x => x.kind === 'camp'), 4); assert.equal(map.length > BEFORE.rows, true);
    for (const x of n) assert.ok(x.routeTopology === 'rests-scribes-1' && x.encounterStage >= 0 && x.encounterStage <= 6);
  });
});

test('legacy (non-card) runs keep their maps: no Scribe stop, ten rows', () => {
  const s = M.newState(), run = M.createRun(s.profile, 'legacy-map', 1);
  assert.equal(run.map.length, 10);
  assert.ok(run.map.flat().every(n => n.kind !== 'scribe'));
});

function atStop(seed, index, kind) {
  const s = M.newState(), run = M.createRun(s.profile, seed, 1, {cards: true});
  run.map = M.makeMap(`${seed}|tier:1|map:${index}`, index, 1, true); run.mapIndex = index; run.seed = `${seed}|tier:1|map:${index}`;
  const stop = run.map.flat().find(n => n.kind === kind), pred = run.map[stop.row - 1].find(n => n.nextIds.includes(stop.id));
  run.step = stop.row; run.path = [pred.id];
  return {s, run, stop};
}

test('the stop page states what each stop gives, and entering the stop gives exactly that (Scribe and Rest)', () => {
  const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const {s, run, stop} = atStop('preview-scribe', 0, 'scribe');
  assert.equal(M.flightRewardKind(run, stop), 'inscription');
  const page = text(stopPreviewMarkup(run, stop, {available: true}));
  assert.ok(page.includes('Scribe — choose an Inscription for a slot of your Chain.'), page);
  assert.ok(page.includes('1 Inscription (choose 1 of 3)'), page);
  assert.equal(getMapStopInfo(stop).summary, M.SCRIBE_STOP_SUMMARY); assert.equal(stop.rewardPreview, M.SCRIBE_STOP_REWARD);
  assert.match(mapStopIconMarkup(stop), /data-ins-glyph="whetted"/);
  assert.ok(M.selectNode(run, stop.id)); assert.equal(run.phase, 'support');
  assert.equal(run.flightReward.kind, 'inscription'); assert.equal(run.flightReward.offers.length, 3); assert.equal(run.flightReward.claimed, false);
  assert.equal(run.scribesOffered, 1);
  // the stop screen: no course name, leaves for the map, never says Continue
  s.run = run;
  const html = scribeMarkup(s, {scribe: {}, title: 'Map stop', stop: true});
  assert.match(html, /Choose an Inscription/);
  // choose one of three, write it on a bare slot, leave
  const [pick] = run.flightReward.offers;
  assert.equal(M.previewScribeWrite(run, pick, 1).needsConfirm, false);
  assert.ok(M.chooseFlightReward(s, pick, 1)); assert.equal(slotInscriptionId(run, 1), pick);
  assert.match(scribeMarkup(s, {scribe: {}, title: 'Map stop', stop: true}), /data-action="leave-scribe">Back to map/);
  assert.ok(M.leaveScribe(run)); assert.equal(run.phase, 'map'); assert.equal(run.step, stop.row + 1); assert.equal(run.flightReward, null);
  // Rest: preview names what it gives, and it awards no Inscription
  const rest = atStop('preview-rest', 0, 'camp');
  const restPage = text(stopPreviewMarkup(rest.run, rest.stop, {available: true}));
  assert.ok(restPage.includes('Recover or Grow') && !/Inscription/.test(restPage), restPage);
  assert.equal(M.flightRewardKind(rest.run, rest.stop), null);
  assert.ok(M.selectNode(rest.run, rest.stop.id)); assert.equal(rest.run.flightReward ?? null, null);
  assert.ok(M.getSupportChoices(rest.run).some(c => /recover/i.test(c.id)));
});

test('backing out of a Scribe stop before writing does not count it; the same three come back on re-entry', () => {
  const {run, stop} = atStop('scribe-back', 1, 'scribe');
  assert.ok(M.selectNode(run, stop.id));
  const offers = [...run.flightReward.offers];
  assert.equal(M.leaveScribe(run), false, 'cannot leave before writing');
  assert.ok(M.cancelScribeStop(run)); assert.equal(run.scribesOffered, 0); assert.equal(run.flightReward, null);
  run.path = run.path.filter(id => id !== stop.id); run.current = null; run.phase = 'map';
  assert.ok(M.selectNode(run, stop.id)); assert.deepEqual(run.flightReward.offers, offers);
  assert.equal(M.ensureScribeStop(run), run.flightReward, 're-rendering does not draw again'); assert.equal(run.scribesOffered, 1);
});

test('a map saved in the old 10-row layout still loads and plays to its end; new maps use the new layout', () => {
  const s = M.newState(), run = M.createRun(s.profile, 'old-save', 1, {cards: true});
  assert.equal(run.map[0][0].routeTopology, 'rests-scribes-1');
  // an old map: ten single-node rows, a guardian at the end, topology longer-journeys-2, a Rest and no Scribe stop
  const old = Array.from({length: 10}, (_, row) => {
    const src = run.map[Math.min(row, run.map.length - 2)][0];
    return [{...src, id: `m0-${row}-0`, row, routeLane: 0, lane: 0, routeTopology: 'longer-journeys-2', recipeId: 'card-lantern-forks',
      nextIds: row < 9 ? [`m0-${row + 1}-0`] : [], boss: row === 9, type: row === 9 ? 'finale' : 'flight', kind: row === 9 ? 'finale' : row === 4 ? 'camp' : 'normal', elite: false}];
  });
  old[4][0].type = 'support';
  run.map = old;
  let data; const storage = {getItem: () => data, setItem: (_, v) => data = v};
  s.run = run; assert.ok(M.saveState(s, storage));
  const loaded = M.loadState(storage).run;
  assert.ok(loaded, 'old-layout run loads'); assert.equal(loaded.map.length, 10);
  assert.ok(loaded.map.flat().every(n => n.routeTopology === 'longer-journeys-2' && n.kind !== 'scribe'));
  // the boss of an old map still awards its Scribe; the next map is generated new
  assert.equal(M.flightRewardKind(loaded, loaded.map[9][0]), 'inscription');
  loaded.phase = 'map-clear'; assert.ok(M.advanceMap(loaded));
  assert.equal(loaded.map.length, 15); assert.equal(loaded.map[0][0].routeTopology, 'rests-scribes-1');
  // and a new-layout run round-trips
  s.run = M.createRun(s.profile, 'new-save', 1, {cards: true}); assert.ok(M.saveState(s, storage));
  assert.equal(M.loadState(storage).run.map.length, 15);
});
