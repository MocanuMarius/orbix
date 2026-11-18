// Loop check for the Overfill trio (2026-11-18): Brimful + Pressure Valve + Floodgate + Echo + Overflow Bell flown in real flights.
// Per minute of flight: Lifts made, free Lifts, Sparks spent on Lifts, Sparks gained from the Chain, and the most firings in one resolution step.
// Run: node scripts/balance/overfill-loop-check.mjs [--flights=2] [--cards=a,b,c]
import { fly, S, M } from './real-flight-check.mjs';
const arg = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
export const TRIO_CHAIN = ['brimful', 'pressure-valve', 'floodgate', 'echo', 'overflow-bell'];
export function measure({ ids = TRIO_CHAIN, flights = 2, stage = 2 } = {}) {
  const total = { seconds: 0, lifts: 0, free: 0, liftSparks: 0, chainSparks: 0, maxStep: 0, halts: 0, floods: 0, flights: 0 };
  const warn = console.warn; let warned = 0; console.warn = (...a) => { if (String(a[0]).includes('card-engine')) warned++; else warn(...a); };
  try {
    for (let i = 0; i < flights; i++) {
      const f = fly({ ids, seedIndex: i, stage, flare: true, hook: e => {
        const eng = () => e.cardEngine;
        const rise = e.syncPressureValve?.bind(e);
        let max = 0; const wrap = () => { const en = eng(); if (!en || en.__w) return; en.__w = true; const raise = en.raise.bind(en);
          en.raise = (...a) => { const before = en.logged; const r = raise(...a); const n = en.log.slice(before).filter(x => x.k === 'hit' || x.k === 'fired').length; if (n > max) max = n; e.__max = max; return r; }; };
        const step = e.step.bind(e); e.step = dt => { wrap(); return step(dt); };
      } });
      const e = f.log.engine, en = e.cardEngine;
      total.seconds += e.time; total.flights++;
      total.lifts += e.flaps; total.free += e.cardFreeLiftsUsed || 0; total.liftSparks += e.effortSpent / S.CARD_UNIT;
      total.chainSparks += f.log.paid + (en?.sparks || 0); total.maxStep = Math.max(total.maxStep, e.__max || 0);
      total.floods += (en?.log || []).filter(x => x.k === 'flood').length;
      total.halts += (en?.log || []).filter(x => x.k === 'halt').length;
    }
  } finally { console.warn = warn; }
  const perMin = v => Math.round(v / (total.seconds / 60) * 10) / 10;
  return { chain: ids.join(' + '), flights: total.flights, seconds: Math.round(total.seconds), liftsPerMin: perMin(total.lifts), freeLiftsPerMin: perMin(total.free), freeShare: total.lifts ? Math.round(total.free / total.lifts * 1000) / 1000 : 0,
    sparksOnLiftsPerMin: perMin(total.liftSparks), chainSparksPerMin: perMin(total.chainSparks), floodsPerMin: perMin(total.floods), maxFiringsInOneStep: total.maxStep, safetyHalts: total.halts, safetyWarnings: warned };
}
if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1]?.endsWith('overfill-loop-check.mjs')) {
  const ids = arg.cards ? String(arg.cards).split(',') : TRIO_CHAIN;
  console.log(JSON.stringify(measure({ ids, flights: Number(arg.flights || 2) }), null, 1));
}
