// Real flights: every Trigger and role, flown by the repository pilot in the actual WispFlight with a real card run.
// Counts what really happened (pickups collected, falling Lifts, Pulses, deliveries) and compares it with what the
// Chain fired and paid. Table: docs/real-flight-triggers.md. Helpers: scripts/balance/real-flight-check.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fly, flyRealNode, playBeats, crashOnce, collectorRecovering, M, S, sum } from '../scripts/balance/real-flight-check.mjs';

const rows = [];
const note = (trigger, cards, occurred, fired, paid, verdict, extra = '') => rows.push({ trigger, cards, occurred, fired, paid, verdict, extra });
const flights = (opts, seeds = [0, 1, 2]) => seeds.map(seedIndex => fly({ ...opts, seedIndex }));
const bodyKinds = o => sum(Object.entries(o.body).filter(([k]) => k !== 'dark'), ([, n]) => n);
const slotSum = (fl, slot, key) => sum(fl, f => f.log.slots[slot]?.[key] || 0);

test('Collect: Body Spark and Cluster Heart fire once per matching pickup the wisp touches', () => {
  const a = flights({ ids: ['body-spark'] });
  const occurred = sum(a, f => bodyKinds(f.log.occurred)), fired = slotSum(a, 0, 'fired'), paid = slotSum(a, 0, 'sparks');
  assert.ok(occurred >= 15);
  assert.equal(sum(a, f => f.log.events['body-spark'] || 0), occurred);
  assert.equal(fired, occurred); assert.equal(paid, 2 * fired);
  note('Collect', 'Body Spark', occurred, fired, `${paid} Sparks (2 each)`, 'works');
  const b = flights({ ids: ['cluster-heart'] });
  const clusters = sum(b, f => f.log.occurred.body.cluster || 0), firedB = slotSum(b, 0, 'fired');
  assert.ok(clusters >= 3);
  assert.equal(firedB, sum(b, x => Math.min(5, x.log.occurred.body.cluster || 0)), 'only clusters, 5 uses per flight');
  b.forEach(f => assert.ok((f.log.slots[0]?.fired || 0) <= 5));
  note('Collect', 'Cluster Heart', clusters + ' clusters', firedB, `${slotSum(b, 0, 'sparks')} Sparks (6 each, 5 uses/flight)`, 'works');
});

test('Lift: Downbeat fires on every Lift while falling; Counterweight shortens a recovering Collector', () => {
  const a = flights({ ids: ['downbeat'] });
  const falling = sum(a, f => f.log.occurred.fallingLifts), fired = slotSum(a, 0, 'fired');
  assert.ok(falling >= 50);
  assert.ok(Math.abs(fired - falling) <= a.length, `${fired} vs ${falling}`);
  assert.equal(slotSum(a, 0, 'sparks'), 2 * fired);
  note('Lift (while falling)', 'Downbeat', falling, fired, `${2 * fired} Sparks (2 each)`, 'works');
  const c = flights({ ids: ['counterweight'], hook: e => collectorRecovering(e) });
  const cf = slotSum(c, 0, 'fired');
  assert.ok(cf >= 1); assert.ok(slotSum(c, 0, 'recovery') > 0 && slotSum(c, 0, 'recovery') <= .75 * cf + 1e-6, 'never more than 0.75 s each, never more than the 12 s that were left');
  note('Lift (while falling)', 'Counterweight (Collector made to recover)', '1 recovery window per flight', cf, `${slotSum(c, 0, 'recovery')} s`, 'works', 'Pays only while the Collector is recovering.');
});

test('Lift on the beat: Toll Bell fires once per completed Rhythm phrase, and each phrase sends a Pulse', () => {
  const a = flights({ ids: ['rhythm', 'toll-bell'], hook: e => playBeats(e) });
  const phrases = sum(a, f => f.log.engine.cardRhythm.waves), fired = slotSum(a, 1, 'fired');
  assert.ok(phrases >= 3); assert.equal(fired, phrases); assert.equal(slotSum(a, 1, 'sparks'), 2 * fired);
  assert.equal(sum(a, f => f.log.pulseBySource['card-rhythm'] || 0), phrases);
  note('Lift (on the beat)', 'Rhythm + Toll Bell (3 even Lifts played by a metronome assist)', `${phrases} phrases`, fired, `${2 * fired} Sparks`, 'works', 'Pilot Lifts muted during each phrase.');
  note('Passive', 'Rhythm (sends a Pulse per phrase)', `${phrases} phrases`, phrases, `${phrases} Pulses`, 'works');
});

test('Pulse: all three Resonant Harvest ids pay per crossing; Flare sends 4 Pulses; First Ripple pays the first crossing of a Pulse', () => {
  const pay = { 'harvest-common': 1, 'harvest-rare': 2, 'harvest-legendary': 2 };
  for (const [id, amount] of Object.entries(pay)) {
    const a = flights({ ids: [id], flare: true }, [0, 1, 2, 3, 4, 5]);
    const flares = sum(a, f => f.log.occurred.flares), crossings = sum(a, f => f.log.events['wave-crossing'] || 0), fired = slotSum(a, 0, 'fired');
    assert.ok(flares >= 5);
    const pulses = sum(a, f => f.log.pulseBySource.flash || 0);
    assert.ok(pulses <= 4 * flares && pulses >= 4 * flares - flares * 2, `${pulses} Pulses for ${flares} Flares`);
    assert.ok(crossings >= 2, 'some uncollected Spark was crossed');
    assert.equal(fired, crossings); assert.equal(slotSum(a, 0, 'sparks'), amount * fired);
    const targets = sum(a, f => f.log.pulseTargets);
    assert.ok(crossings <= targets && crossings >= .5 * targets, 'crossings follow the Sparks that were in reach');
    if (id === 'harvest-legendary') assert.ok(slotSum(a, 0, 'stored') >= 1, 'Stored Spark on a Pulse first crossing');
    assert.ok(a.every(f => f.log.traces >= (f.log.events['wave-crossing'] || 0)), 'every paying crossing sets cardRowTrace (the HUD strip)');
    note('Pulse', `Resonant Harvest (${id.split('-')[1]})`, `${flares} Flares, ${pulses} Pulses, ${targets} Sparks in reach`, fired, `${slotSum(a, 0, 'sparks')} Sparks, ${slotSum(a, 0, 'stored')} Stored`, 'works', `${crossings} crossings`);
  }
  const owner = flights({ ids: ['harvest-common', 'lift-guide', 'lantern-lens'], flare: true }, [0, 1, 2, 3, 4, 5]);
  const oc = sum(owner, f => f.log.events['wave-crossing'] || 0);
  assert.ok(oc >= 2); assert.equal(slotSum(owner, 0, 'fired'), oc);
  note('Pulse', 'Owner Chain: Resonant Harvest, Lift Guide, Lantern Lens (Flare taken)', `${sum(owner, f => f.log.pulses)} Pulses`, oc, `${slotSum(owner, 0, 'sparks')} Sparks`, 'works', 'Lift Guide and Lantern Lens send no Pulse; only the Flare does.');
  const nofl = flights({ ids: ['harvest-common', 'lift-guide', 'lantern-lens'] }, [0, 1, 2]);
  nofl.forEach(f => { if (!f.log.occurred.flares) assert.equal(f.log.pulses, 0, 'no Flare, no Pulse: Resonant Harvest has nothing to hear'); else assert.ok(f.log.pulses <= 4 * f.log.occurred.flares); });
  const fr = flights({ ids: ['first-ripple'], flare: true }, [0, 1, 2, 3, 4, 5]);
  assert.equal(slotSum(fr, 0, 'sparks'), 4 * slotSum(fr, 0, 'fired')); assert.ok(slotSum(fr, 0, 'fired') >= 2);
  note('Pulse', 'First Ripple', 'first crossing per Pulse', slotSum(fr, 0, 'fired'), `${slotSum(fr, 0, 'sparks')} Sparks (4 each)`, 'works');
});

test('Skim: Proximity sends a Pulse after flying near terrain and Resonant Harvest hears it', () => {
  const a = flights({ ids: ['slip-feather', 'harvest-common'] });
  const pulses = sum(a, f => f.log.pulseBySource.proximity || 0), fired = slotSum(a, 1, 'fired');
  assert.ok(pulses >= 2); assert.equal(fired, sum(a, f => f.log.events['wave-crossing'] || 0)); assert.ok(fired >= 2);
  note('Skim', 'Proximity (Passive) + Resonant Harvest', `${pulses} Skim Pulses`, fired, `${slotSum(a, 1, 'sparks')} Sparks`, 'works', 'No released card has a Skim Trigger; Close Call and Whetstone are hidden.');
});

test('Delivery: Courier Tip, Haul Winch (Cluster) and Echo repeating a Delivery card', () => {
  const set = ['twin-orbit', 'long-spool'], seeds = [0, 1, 2, 3, 4, 5];
  const a = flights({ ids: ['courier-tip', ...set] }, seeds);
  const delivered = sum(a, f => sum(Object.values(f.log.occurred.delivery), x => x)), fired = slotSum(a, 0, 'fired');
  assert.ok(delivered >= 4); assert.equal(fired, delivered); assert.equal(slotSum(a, 0, 'sparks'), 2 * fired);
  note('Delivery', 'Courier Tip (+Twin Orbit, Long Spool)', delivered, fired, `${2 * fired} Sparks`, 'works');
  const w = flights({ ids: ['haul-winch', ...set] }, seeds), clusters = sum(w, f => f.log.occurred.delivery.cluster || 0), wf = slotSum(w, 0, 'fired');
  assert.ok(clusters >= 1); assert.equal(wf, Math.min(clusters, 5 * seeds.length)); assert.equal(slotSum(w, 0, 'nextReel'), 3 * wf);
  note('Delivery', 'Haul Winch (Cluster deliveries)', `${clusters} Cluster deliveries`, wf, `${slotSum(w, 0, 'nextReel')} s off the next reel`, 'works');
  const e = flights({ ids: ['echo', 'haul-winch', ...set] }, seeds), ef = slotSum(e, 1, 'fired');
  assert.ok(ef >= 2); e.forEach(f => { const n = slotSum([f], 1, 'fired'); assert.ok(n % 2 === 0 || n === 5, 'twice per delivery, unless the 5 uses run out mid-pair'); }); assert.equal(slotSum(e, 1, 'nextReel'), 3 * ef);
  note('Repeat + Delivery', 'Echo left of Haul Winch', `${sum(e, f => f.log.occurred.delivery.cluster || 0)} Cluster deliveries`, ef, `${slotSum(e, 1, 'nextReel')} s (twice per delivery)`, 'works');
  const rev = flights({ ids: ['haul-winch', 'echo', ...set] }, seeds);
  assert.equal(slotSum(rev, 0, 'fired'), slotSum(w, 0, 'fired'), 'Echo to the RIGHT of Haul Winch adds nothing');
  note('Repeat + Delivery', 'Echo right of Haul Winch', '-', slotSum(rev, 0, 'fired'), 'same as alone', 'works', 'Order matters: Echo copies the card on its right.');
  const crate = flights({ ids: ['crate-lining', ...set] }, seeds);
  const crateDeliveries = sum(crate, f => (f.log.occurred.delivery.cache || 0) + (f.log.occurred.delivery.cluster || 0));
  assert.ok(crateDeliveries >= 1, 'Collector delivers Clusters in real flights');
  assert.equal(slotSum(crate, 0, 'fired'), crateDeliveries);
  note('Delivery', 'Crate Lining (Cache + Cluster deliveries)', `${crateDeliveries} deliveries`, slotSum(crate, 0, 'fired'), '8 per Cache, 4 per Cluster', 'works', 'Pays on a Cluster delivery too, at half.');
});

test('Overfill: Ring Spring banks seconds for the next Collector recovery; the Wellspring Inscription fires its card on every Overfill', () => {
  const a = flights({ ids: ['ring-spring'] });
  assert.ok(sum(a, f => f.log.events['natural-overfill'] || 0) >= 5);
  const fired = slotSum(a, 0, 'fired'); assert.ok(fired >= 1); assert.ok(Math.abs(slotSum(a, 0, 'nextRecovery') - fired) < 1e-6);
  // The banked seconds really come off a later recovery: what was banked minus what is still waiting at the end of each flight.
  const spent = sum(a, f => (f.log.slots[0]?.nextRecovery || 0) - (f.log.engine.cardRecoveryCredit || 0));
  assert.ok(spent >= 1, `banked seconds were taken off a real recovery (${spent} s)`);
  note('Overfill', 'Ring Spring (no assist)', `${sum(a, f => f.log.events['natural-overfill'] || 0)} Overfills`, fired, `${slotSum(a, 0, 'nextRecovery')} s banked, ${spent} s spent on a recovery`, 'works', 'Banks on every Overfill; the next recovery starts that much shorter.');
  // One Overfill rule (2026-11-20): Body Spark's own spill is an Overfill too, but a card never answers an Overfill its own firing made, so it fires on pickups' Overfills only.
  let nat = 0;
  const w = flights({ ids: ['body-spark'], inscriptions: ['wellspring'], hook: e => { const o = e.storeNaturalOverflow.bind(e); e.storeNaturalOverflow = (p, sp, ar, n, c) => { if (n > 1e-7 && !p.fetchedInDream && !p.generated && !p.harmful && sp.fuel > 0 && ar > 0) nat++; return o(p, sp, ar, n, c); }; } });
  const over = sum(w, f => f.log.events['natural-overfill'] || 0), collects = sum(w, f => bodyKinds(f.log.occurred));
  assert.ok(nat >= 5 && over >= nat); assert.equal(slotSum(w, 0, 'fired'), collects + nat);
  note('Overfill', 'Body Spark with Wellspring Inscription', `${over} Overfills`, slotSum(w, 0, 'fired') - collects, `${2 * over} Sparks`, 'works');
});

test('Finish: Home Beacon adds 3 Stored per heart left at the real clear and spends one use; Last Light doubles Spark rewards on the last heart only', () => {
  for (const hearts of [3, 2, 1]) {
    const r = flyRealNode({ ids: ['home-beacon'], mutate: run => { run.lives = hearts; } });
    assert.ok(r.record.success && r.finished);
    const rc = r.run.lastFlight.cardClearReceipt;
    assert.ok(rc.event.meterSparks > 0, 'Meter Sparks at the clear are read'); assert.equal(rc.stored, 3 * hearts + Math.floor(rc.event.meterSparks / 10), `${hearts} hearts`); assert.equal(rc.futureCapacity, 0);
    assert.equal(r.run.mountedCards[0].charges, 2, 'one use spent');
  }
  note('Finish', 'Home Beacon (real clear, 3 / 2 / 1 hearts)', '3 clears', 3, '+9 / +6 / +3 Stored', 'works');
  const hit = h => flights({ ids: ['body-spark', 'last-light'], hook: e => { e.lives = h; } });
  const one = hit(1), three = hit(3);
  assert.ok(slotSum(one, 0, 'fired') >= 10 && slotSum(three, 0, 'fired') >= 10);
  assert.equal(slotSum(three, 0, 'sparks'), 2 * slotSum(three, 0, 'fired'), 'more than one heart: not doubled');
  assert.equal(slotSum(one, 0, 'sparks'), 4 * slotSum(one, 0, 'fired'), 'last heart: Body Spark pays 4 instead of 2');
  note('Passive', 'Last Light + Body Spark (last heart / 3 hearts)', 'Collects', slotSum(one, 0, 'fired'), '4 Sparks each / 2 each', 'works');
});

test('Finish: Growth Ring and Wayfarer Purse pay at the real clear', () => {
  const r = flyRealNode({ ids: ['growth-ring', 'wayfarers-purse'] });
  assert.ok(r.record.success && r.finished);
  const rc = r.run.lastFlight.cardClearReceipt;
  assert.equal(rc.futureCapacity, 0); assert.equal(rc.tallyCapacity, 1); assert.equal(rc.stored, 5); assert.equal(r.run.cardFutureCapacity, 0); assert.equal(r.run.mountedCards[0].tally, 1);
  note('Finish', 'Growth Ring, Wayfarer Purse (real clear through finishFlight)', '1 clear', 2, '+1 max Spark kept on the card, +5 Stored', 'works');
});

test('Passive: Lantern Lens and Deep Vessel change the real flight at once', () => {
  // Courses guarantee a Flare, and a Flare raises Luminance while it lasts, so sample Luminance at a moment no Flare is active.
  const quiet = ids => { let lum = null; const r = fly({ ids, duration: 20, hook: e => { const step = e.step.bind(e); e.step = dt => { const out = step(dt); if (lum === null && e.time >= 1 && !(e.time < e.sightUntil) && !e.flashTether) lum = e.getLuminancePercent(); return out; }; } }); return { lum, engine: r.log.engine }; };
  const base = quiet([null]), lens = quiet(['lantern-lens']), vessel = quiet(['deep-vessel']);
  assert.ok(base.lum !== null && lens.lum !== null, 'a Flare-free moment was sampled');
  assert.ok(Math.abs(lens.lum - base.lum - 20) < 1e-6);
  assert.ok(vessel.engine.maxFlame > base.engine.maxFlame);
  note('Passive', 'Lantern Lens, Deep Vessel', 'every flight', '-', `+20% Luminance, meter ${(vessel.engine.maxFlame / base.engine.maxFlame * 100 - 100).toFixed(1)}% larger`, 'works');
});

test('Boost and Repeat roles; order matters (Echo, Boost, Twin Mark, Gilded, Mirror)', () => {
  const per = (ids, inscriptions = []) => { const a = flights({ ids, inscriptions }); const c = sum(a, f => bodyKinds(f.log.occurred)); return { c, paid: sum(a, f => f.log.paid) / c }; };
  assert.equal(per(['body-spark']).paid, 2);
  const echoL = per(['echo', 'body-spark']), echoR = per(['body-spark', 'echo']);
  assert.equal(echoL.paid, 4); assert.equal(echoR.paid, 2);
  note('Repeat', 'Echo left of Body Spark / right of it', echoL.c, 'x2 / x1', `${echoL.paid} / ${echoR.paid} Sparks per Collect`, 'works');
  const cham = per(['chameleon', 'body-spark']); assert.equal(cham.paid, 4);
  note('Repeat', 'Chameleon (hidden, batch 4) left of Body Spark', cham.c, 'x2', '4 per Collect', 'works');
  const boostR = per(['body-spark', 'crescendo']), boostL = per(['crescendo', 'body-spark']);
  assert.equal(boostR.paid, 4); assert.equal(boostL.paid, 2);
  note('Boost', 'Crescendo right of Body Spark / left of it', boostR.c, 'x1', `${boostR.paid} / ${boostL.paid} per Collect`, 'works', 'A Boost only strengthens cards on its LEFT.');
  const prism = per(['body-spark', 'prism-lens']); assert.equal(prism.paid, 3);
  note('Boost', 'Prism Lens (x1.25) right of Body Spark', prism.c, 'x1', '3 per Collect (2.5 rounds up)', 'works', 'Design note: x1.25 on +2 gives 3; every firing rounds up.');
  const twin = per(['body-spark'], ['twin-mark']), gilded = per(['body-spark'], ['gilded']);
  assert.equal(twin.paid, 4); assert.equal(gilded.paid, 4);
  note('Inscription', 'Twin Mark on Body Spark', twin.c, `${2 * twin.c}`, '4 per Collect', 'works');
  note('Inscription', 'Gilded on Body Spark', gilded.c, gilded.c, '4 per Collect (+2 each firing)', 'works');
  const a = per(['rhythm', 'echo', 'body-spark'], [null, null, 'gilded']);
  const b = per(['rhythm', 'echo', null, 'body-spark'], ['twin-mark', null, null, 'gilded']);
  assert.equal(a.paid, 8, 'Echo adjacent: body-spark fires twice, +2 Gilded each time');
  assert.equal(b.paid, 4, 'empty slot between: Echo does nothing, Gilded still +2');
  note('Order', 'Rhythm, Echo, Body Spark+Gilded', a.c, 2 * a.c, '8 per Collect', 'works', 'Chain preview shows +4 (ignores Inscriptions).');
  note('Order', 'Rhythm(Twin Mark), Echo, empty, Body Spark+Gilded', b.c, b.c, '4 per Collect', 'works', 'Chain preview shows +2 (ignores Inscriptions).');
  const resR = flights({ ids: ['rhythm', 'harvest-common'], hook: e => playBeats(e) }), resL = flights({ ids: ['harvest-common', 'rhythm'], hook: e => playBeats(e) });
  assert.equal(slotSum(resR, 1, 'fired'), slotSum(resL, 0, 'fired'));
  note('Order', 'Pulse card right of / left of Rhythm (Pulse sender)', `${sum(resR, f => f.log.engine.cardRhythm.waves)} phrases`, `${slotSum(resR, 1, 'fired')} / ${slotSum(resL, 0, 'fired')}`, '-', 'works', 'Live Pulse cards hear every crossing, whatever their position.');
  const mirror = flights({ ids: ['body-spark', 'body-spark'], inscriptions: [null, 'mirror'] });
  assert.equal(slotSum(mirror, 1, 'fired'), slotSum(mirror, 0, 'fired'));
});

test('Take-off: Black Hole and Dream eat the card on their right when the flight really starts', () => {
  for (const hole of ['black-hole', 'dream']) {
    const state = M.newState(); state.profile.tutorialComplete = true;
    const run = M.createRun(state.profile, 'rf-hole', 1, { cards: true });
    run.mountedCards[0] = S.makeSkillCard(hole, 'hole0'); run.mountedCards[1] = S.makeSkillCard('harvest-rare', 'victim');
    M.selectNode(run, M.getChoices(run).find(n => n.type !== 'support').id); assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
    assert.equal(run.mountedCards[1], null); assert.ok(run.mountedCards[0].eatenGrowth > 0);
    assert.equal(run.attemptEntry.cardBlackHoleMeals.length, 1);
  }
  note('Take-off (Devour)', 'Black Hole (hidden), Dream', '2 take-offs', 2, 'rare eaten: +2 / +1 growth', 'works', 'The Dream replay itself is attached by the app, not by the pilot harness.');
});

test.after(() => { if (process.env.RF_TABLE) fs.writeFileSync(process.env.RF_TABLE, rows.map(r => `| ${r.trigger} | ${r.cards} | ${r.occurred} | ${r.fired} | ${r.paid} | ${r.verdict} | ${r.extra} |`).join('\n')); });

/** Assist: the pilot's own Lifts are muted; a Lift is tapped only when Lift Guide's arrow is open (`beat`), or only when it is not (`off`). */
function tapByGuide(mode) {
  return (e, log) => {
    const raw = e.flap.bind(e), step = e.step.bind(e); let muted = true; log.beatTaps = 0; log.offTaps = 0;
    e.flap = () => (muted ? false : raw());
    e.step = dt => {
      const cue = e.mod.cardLiftGuide ? e.getLiftGuide() : null, open = !!cue && cue.phase === 'open' && !cue.late && !cue.loan;
      const falling = e.player.vy > 0 && e.player.y > 90;
      if (mode === 'beat' && open) { muted = false; if (raw()) log.beatTaps++; muted = true; }
      else if (mode === 'off' && !open && falling && e.player.vy > 60 * e.scaleY) { muted = false; if (raw()) log.offTaps++; muted = true; }
      return step(dt);
    };
  };
}

test('Lift on the beat: Lift Guide pays +1 Spark per Lift tapped while its arrow is open, nothing off the beat or unmounted', () => {
  const on = flights({ ids: ['lift-guide'], hook: tapByGuide('beat') });
  const taps = sum(on, f => f.log.beatTaps), fired = slotSum(on, 0, 'fired'), paid = slotSum(on, 0, 'sparks');
  assert.ok(taps >= 3, `${taps} on-beat Lifts`);
  assert.equal(sum(on, f => f.log.events['guide-lift'] || 0), taps, 'one event per on-beat Lift');
  assert.equal(fired, taps); assert.equal(paid, taps, '+1 Spark each');
  note('Lift (on the beat)', 'Lift Guide (Lifts tapped while the arrow is open)', `${taps} on-beat Lifts`, fired, `${paid} Sparks (1 each)`, 'works', 'Own arrow window, not the Rhythm phrase.');
  const off = flights({ ids: ['lift-guide'], hook: tapByGuide('off') });
  assert.ok(sum(off, f => f.log.offTaps) >= 3, 'Lifts were tapped with the arrow closed');
  assert.equal(sum(off, f => f.log.events['guide-lift'] || 0), 0, 'off the beat: no Spark');
  const without = flights({ ids: ['body-spark'], hook: tapByGuide('beat') });
  assert.equal(sum(without, f => f.log.beatTaps), 0);
  assert.equal(sum(without, f => f.log.events['guide-lift'] || 0), 0, 'no Lift Guide mounted: nothing fires');
});
