// Probes for the cards whose effect happens inside the flight, so the solver and the pilot flights of card-works-audit.mjs cannot see them.
// Each probe measures the PHYSICAL effect against the card's printed text and returns {ok, note, status?}. Added 2026-11-18 (JOB 3).
//   Heart Stitch (id 'tailwind'): the 3rd direct Spark pickup while a heart is missing gives +1 heart and spends a use.
//   Springboard: a direct Spark touched while falling gives a free bounce (the text says "half-Lift").
//   Long Spool / Cast Line: the farthest missed Spark the Collector will fetch, against the printed +35% / x2 reach.
//   Black Hole: at take-off it eats the card to its right; +1/+2/+3 max Sparks by rarity, only while it is mounted.
//   Devourer: a clear while missing a heart eats the next Rare card for +1 heart; full hearts keep both.
import { WispFlight } from '../../dist/flight.mjs';
import { sparkBodyRadius } from '../../dist/spark-size.mjs';
import { getGlowCapacity, glowPoints } from '../../dist/vitality.mjs';
import * as S from '../../dist/skill-cards.mjs';
import { makeRun, M } from './real-flight-check.mjs';

globalThis.requestAnimationFrame ??= () => null; globalThis.cancelAnimationFrame ??= () => {};
const cards = ids => ids.map((id, i) => id ? S.makeSkillCard(id, `probe:${i}`) : null);
/** A real WispFlight with the Chain mounted (same set-up as tests/collector-cards.test.mjs): empty course, Collector on, fast recovery. */
export function synthFlight(ids = [], extra = {}) {
  const e = new WispFlight({ preflight: true, seed: 'card-works-probe', companions: ['collector'], ...extra,
    modifiers: { ...S.getCardModifiers({ skillSystem: S.CARD_SYSTEM, mountedCards: cards(ids) }), wispCooldown: .4, ...extra.modifiers },
    canvas: { getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 900, height: 405 }) } });
  e.running = true; e.render = () => {}; e.renderScheduledFrame = () => {}; e.notify = () => {};
  e.layout.obstacles = []; e.layout.embers = []; e.drafts.zones = []; e.biomeDynamics.items = []; e.blackHoles.items = [];
  return e;
}
const pickup = e => ({ kind: 'light', x: e.distance + e.player.x, y: e.player.y });
const missed = (e, distance) => { const p = { id: `missed:${e.layout.embers.length}`, kind: 'light', y: e.player.y }; p.x = e.distance + e.player.x - distance - sparkBodyRadius(p, e.height); e.layout.embers.push(p); e._nearbyPacketsUntil = -1; return p; };
const tick = (e, dt = 1 / 120) => { e.time += dt; e.previousDistance = e.distance; e.syncCollectors(true); for (const w of e.collectors) w.update(e, dt); };
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** The farthest distance (px behind the wisp) at which the Collector sets out for a missed Spark, found by bisection on a fresh flight each time. */
function farthestCatch(ids) {
  const reaches = d => { const e = synthFlight(ids); try { const p = missed(e, d); tick(e); return e.wisp.target === p; } finally { e.destroy(); } };
  let lo = 40, hi = 600; if (!reaches(lo)) return 0;
  while (hi - lo > .25) { const mid = (lo + hi) / 2; if (reaches(mid)) lo = mid; else hi = mid; }
  return lo;
}
/** Uses left after the Collector has fetched one Spark that sat `distance` px behind the wisp. */
function usesAfterCatch(ids, distance) {
  const e = synthFlight(ids);
  try {
    const p = missed(e, distance); tick(e);
    if (e.wisp.target !== p) return { caught: false };
    for (let i = 0; i < 2400 && !e.wisp.cargo; i++) tick(e);
    return { caught: !!e.wisp.cargo, uses: e.getCardChargeLedger()['probe:0'] };
  } finally { e.destroy(); }
}
const kindsOf = (rarity, not = []) => S.LIVE_CARDS.find(d => d.rarity === rarity && !d.engine && !d.starterOnly && d.copyable !== false && !d.passive && !['black-hole', 'dream', 'devourer', 'echo', 'chameleon', 'chameleon-two', 'camp-grow', 'camp-extra'].includes(d.kind) && !not.includes(d.id))?.id;

/** One real take-off: select a flight node, begin the attempt and mark it started (where the model eats and grows). */
function takeOff(run) {
  const node = M.getChoices(run).find(n => n.type !== 'support');
  M.selectNode(run, node.id); M.beginFlightAttempt(run); M.markFlightAttemptStarted(run); return node;
}

export const PROBES = {
  tailwind() { // Heart Stitch
    const e = synthFlight(['tailwind'], { lives: 1, maxLives: 3 });
    try {
      const seen = []; for (let i = 0; i < 7; i++) { e.collect(pickup(e)); seen.push(e.lives); }
      const stitch = e.cardExecution.cards[0], printed = '3rd Collect: +1 heart';
      const ok = seen.join() === '1,1,2,2,2,3,3' && stitch.charges === 0 && e.cardHeartsRestored === 2;
      return { ok, note: `face "${printed}": hearts after 7 direct pickups from 1 heart = ${seen.join('/')}, uses left ${stitch.charges}/2, restored ${e.cardHeartsRestored} (expected 1/1/2/2/2/3/3 and the 2 uses spent). The id 'tailwind' is Heart Stitch; the "+6% pace" Tailwind is a Skill (main-tailwind), not this card.` };
    } finally { e.destroy(); }
  },
  springboard() {
    const lift = synthFlight(['springboard']), bounce = synthFlight(['springboard']);
    try {
      lift.player.vy = 120; lift.flap(); const vLift = lift.player.vy;
      bounce.player.vy = 120; const flameBefore = bounce.flame; bounce.collect(pickup(bounce)); const vBounce = bounce.player.vy;
      const ratio = vBounce / vLift, hRatio = (vBounce / vLift) ** 2, free = bounce.flame >= flameBefore;
      const second = (() => { const e2 = synthFlight(['springboard']); try { e2.player.vy = -50; e2.collect(pickup(e2)); return e2.player.vy; } finally { e2.destroy(); } })();
      const ok = Math.abs(ratio - Math.SQRT1_2) < .02 && free && second === -50;
      return { ok, status: ok ? 'works' : 'wrong number', note: `a falling pickup gives a bounce at ${round(ratio)} of a Lift's launch speed (${round(vBounce, 1)} vs ${round(vLift, 1)}), which rises only ${round(hRatio)} of a Lift's height (the card says "half-Lift"); free (meter not charged: ${free}); no bounce while rising (${second === -50}).`
        + (Math.abs(hRatio - .5) > .05 ? ' DESIGN: "half-Lift" reads as half the height; the speed is half, the height a quarter.' : '') };
    } finally { lift.destroy(); bounce.destroy(); }
  },
  'long-spool': () => reachProbe('long-spool', 1.35, 5),
  'cast-line': () => reachProbe('cast-line', 2, 2),
  'black-hole'() {
    const out = [];
    for (const rarity of ['common', 'rare', 'legendary']) {
      const victim = kindsOf(rarity); if (!victim) { out.push(`${rarity}: no victim card`); continue; }
      const run = makeRun(['black-hole', victim], { seed: `bh-${rarity}` }), base = glowPoints(getGlowCapacity(run));
      takeOff(run);
      const hole = run.mountedCards[0], grown = glowPoints(getGlowCapacity(run)) - base, want = { common: 1, rare: 2, legendary: 3 }[rarity];
      const eaten = run.mountedCards[1] === null && !(run.reserveCards || []).some(c => c?.cardId === victim);
      // Unmounted, the growth does not count.
      const parked = makeRun(['black-hole', victim], { seed: `bh-${rarity}` }); takeOff(parked);
      const holeCard = parked.mountedCards[0]; parked.mountedCards[0] = null; parked.reserveCards.push(holeCard);
      const unmounted = glowPoints(getGlowCapacity(parked)) - base;
      out.push({ rarity, want, grown, eaten, unmounted, tally: [hole.eaten, hole.eatenGrowth] });
    }
    const ok = out.every(r => r.eaten && r.grown === r.want && r.unmounted === 0);
    return { ok, status: ok ? 'works' : 'wrong number', note: 'at take-off it eats the card on its right: ' + out.map(r => r.rarity ? `${r.rarity} +${r.grown} max Sparks (printed +${r.want}), card gone ${r.eaten}, +${r.unmounted} while unmounted` : r).join('; ') };
  },
  devourer() {
    const rare = kindsOf('rare'), common = kindsOf('common');
    const fly = (lives, victim) => { const run = makeRun(['devourer', victim], { seed: `dv-${lives}-${victim}` }); run.lives = lives; takeOff(run); M.finishFlight(run, { success: true, flame: 50 }); return run; };
    const hurt = fly(2, rare), full = fly(3, rare), commonRun = fly(2, common);
    const a = hurt.lives === 3 && hurt.mountedCards[1] === null && !!hurt.mountedCards[0], b = full.lives === 3 && !!full.mountedCards[1], c = commonRun.lives === 2 && !!commonRun.mountedCards[1];
    const ok = a && b && c;
    return { ok, status: ok ? 'works' : 'never fires', note: `clear at 2 hearts with a Rare on its right: hearts ${hurt.lives}, Rare eaten ${hurt.mountedCards[1] === null}, Devourer kept ${!!hurt.mountedCards[0]}; at 3 hearts: Rare kept ${!!full.mountedCards[1]}; a Common is never eaten (hearts ${commonRun.lives}).` };
  },
};

function reachProbe(id, multiplier, usesPrinted) {
  const base = farthestCatch([]), withCard = farthestCatch([id]), ratio = withCard / base;
  const inside = usesAfterCatch([id], base * .8), beyond = usesAfterCatch([id], (base + withCard) / 2);
  const ok = Math.abs(ratio - multiplier) < .03 * multiplier && inside.uses === usesPrinted && beyond.uses === usesPrinted - 1;
  return { ok, status: ok ? 'works' : 'wrong number', note: `Collector reach ${round(base, 1)} px alone, ${round(withCard, 1)} px with it: x${round(ratio)} (printed x${multiplier}); a catch inside normal reach leaves ${inside.uses}/${usesPrinted} uses, one beyond it ${beyond.uses}/${usesPrinted}.` };
}
