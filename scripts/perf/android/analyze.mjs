// Prints the tables for the report from the raw JSON in outputs/perf/android/<date>-bench/.
//   node scripts/perf/android/analyze.mjs [suite|ab|desktop|where|all]
import fs from 'node:fs/promises';
import path from 'node:path';
import {OUT, median} from './benchlib.mjs';
import {analyseAb} from './bench.mjs';
const rd = async f => { try { return JSON.parse(await fs.readFile(path.join(OUT, f), 'utf8')); } catch { return null; } };
const mode = process.argv[2] || 'all';
const rank = a => { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = Array(a.length); idx.forEach(([, i], k) => r[i] = k + 1); return r; };
const spearman = (a, b) => { const ra = rank(a), rb = rank(b), n = a.length; const d2 = ra.reduce((s, x, i) => s + (x - rb[i]) ** 2, 0); return 1 - 6 * d2 / (n * (n * n - 1)); };
const pad = (s, n) => String(s).padEnd(n), pl = (s, n) => String(s).padStart(n);

if (mode === 'suite' || mode === 'all') {
  const s = await rd('suite.json'), e = await rd('suite-rep.json');
  if (s) {
    console.log('\n## suite (median of 5 flights, avg FPS; 1% low FPS; p95 frame ms; frames over 33 ms; spread = (max-min)/median)');
    console.log('| scenario | median FPS | min | max | spread | 1% low | p95 ms | >33 ms | viewport | discarded |');
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    const all = {...s.scenarios}; if (e?.scenarios['marsh-early-starter']) all['marsh-early-starter'] = e.scenarios['marsh-early-starter']; // the first session ran with a taller viewport (870x308)
    for (const [name, v] of Object.entries(all)) {
      const b = v.batches.at(-1), m = b.metrics, vps = [...new Set(b.runs.map(r => r.vp))].join('/');
      console.log(`| ${name} | ${m.avgFps.median} | ${m.avgFps.min} | ${m.avgFps.max} | ${m.avgFps.spreadPct}%${b.unstable ? ' UNSTABLE' : ''} | ${m.low1Fps.median} | ${m.p95Ms.median} | ${m.over33.median} | ${vps} | ${(b.discarded || []).length} |`);
    }
  }
}
if (mode === 'rep' || mode === 'all') {
  const s = await rd('suite.json'), e = await rd('suite-rep.json');
  if (s && e) {
    console.log('\n## replication: same scenarios in a second session (fresh emulator), median avg FPS');
    console.log('| scenario | session 1 | session 2 | difference | clock MHz 1 / 2 |'); console.log('| --- | --- | --- | --- | --- |');
    for (const [n, v] of Object.entries(e.scenarios)) { const b = v.batches.at(-1), a = s.scenarios[n]?.batches.at(-1); if (!a) continue; const clk = x => median(x.runs.map(r => r.host.gpuClockAvg)).toFixed(0); console.log(`| ${n} | ${a.metrics.avgFps.median} | ${b.metrics.avgFps.median} | ${(100 * (b.metrics.avgFps.median - a.metrics.avgFps.median) / a.metrics.avgFps.median).toFixed(0)}% | ${clk(a)} / ${clk(b)} |`); }
  }
}
if (mode === 'ab' || mode === 'all') {
  const a = await rd('ab.json');
  if (a) {
    const an = analyseAb(a);
    console.log(`\n## A/B (${a.scenario}, ${a.rounds} rounds, every condition once per round, same Chrome session)`);
    console.log('| condition | median FPS | min-max | vs base | paired diffs (per round) | sign | noise (base range / cond range) | 1% low | p95 | verdict |');
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of Object.values(an)) console.log(`| ${r.cond} | ${r.fps.median} | ${r.fps.min}-${r.fps.max} | ${r.vsBase ? `${r.vsBase.medianDiff >= 0 ? '+' : ''}${r.vsBase.medianDiff} (${r.vsBase.pctDiff}%)` : 'ref'} | ${r.vsBase ? r.vsBase.pairedDiffs.join(', ') : ''} | ${r.vsBase ? r.vsBase.signAgree : ''} | ${r.vsBase ? r.vsBase.baseRange + ' / ' + r.vsBase.condRange : (r.fps.max - r.fps.min).toFixed(1)} | ${r.low1Fps.median} | ${r.p95Ms.median} | ${r.vsBase ? r.vsBase.verdict : ''} |`);
    console.log('discarded runs:', JSON.stringify(a.discardedRuns || []));
  }
}
if (mode === 'desktop' || mode === 'all') {
  const d = await rd('desktop.json'), s = await rd('suite.json'), e = await rd('suite-rep.json');
  if (d) {
    const emu = {...(s?.scenarios || {})}; if (e?.scenarios['marsh-early-starter']) emu['marsh-early-starter'] = e.scenarios['marsh-early-starter'];
    const names = [...new Set(Object.values(d.cells).map(c => c.scenario))].filter(n => emu[n]);
    console.log('\n## desktop (headless Chrome, 924x412, DPR 2.625), median avg FPS');
    console.log('| scenario | emulator | ' + d.throttles.map(t => t + 'x').join(' | ') + ' |'); console.log('| --- | --- | ' + d.throttles.map(() => '---').join(' | ') + ' |');
    for (const n of names) console.log(`| ${n} | ${emu[n].batches.at(-1).metrics.avgFps.median} | ` + d.throttles.map(t => d.cells[`${n}@${t}x`]?.avgFps?.median ?? '').join(' | ') + ' |');
    const ev = names.map(n => emu[n].batches.at(-1).metrics.avgFps.median);
    for (const t of d.throttles) { const dv = names.map(n => d.cells[`${n}@${t}x`]?.avgFps?.median ?? NaN); if (dv.some(Number.isNaN)) continue; console.log(`throttle ${t}x: Spearman rank correlation with the emulator ${spearman(ev, dv).toFixed(2)}; emulator/desktop FPS ratio median ${median(ev.map((x, i) => x / dv[i])).toFixed(2)} (min ${Math.min(...ev.map((x, i) => x / dv[i])).toFixed(2)}, max ${Math.max(...ev.map((x, i) => x / dv[i])).toFixed(2)})`); }
  }
}
if (mode === 'where' || mode === 'all') {
  for (const name of ['marsh-late-mid', 'pinewood-late-mid']) {
    const w = await rd(`where-${name}.json`); if (!w) continue;
    console.log(`\n## where: ${name}`);
    console.log('light trace fps', w.traceLight?.fps, '\n busy% by thread:', (w.traceLight?.busyPctByThread || []).slice(0, 9).map(x => x.join(' ')).join(' | '));
    const c = w.counts; if (c) console.log(' counts: draw calls/frame', c.drawCallsPerFrame, 'state calls/frame', c.stateCallsPerFrame, 'total', c.totalCanvas2DCallsPerFrame, JSON.stringify(c.byOp), '\n drawImage', JSON.stringify({perFrame: c.drawImage.perFrame, srcMPx: c.drawImage.srcMPx, dstMPx: c.drawImage.dstMPx}), '\n canvases touched/frame', c.canvasesTouchedPerFrame, 'distinct', c.distinctCanvasesTouched, 'touched area MPx/frame', c.sumOfTouchedCanvasAreaMPxPerFrame, '\n uploads/frame', JSON.stringify(c.uploadsPerFrame));
    console.log(' top canvases:', (c?.canvases || []).slice(0, 6).map(x => `${x.size} ${x.callsPerFrame}/f ${x.framesTouchedPct}%`).join(' | '));
    console.log(' top drawImage pairs:', (c?.drawImage.bySourceAndDest || []).slice(0, 6).map(x => `${x.k} ${x.perFrame}/f dst ${x.dstKPx}kpx`).join(' | '));
    console.log(' callers:'); for (const x of (w.callers?.top || []).slice(0, 8)) console.log('  ', x.perFrame, `(${x.pct}%)`, x.caller, JSON.stringify(x.ops));
    console.log(' heavy trace gpu main top:', (w.traceHeavy?.gpuMainTopEventsMsPerS || []).slice(0, 10).map(x => x.join(' ')).join(' | '));
  }
}
