// Local play recorder (owner request, 2026-11-19). Off by default; nothing leaves the device.
// While on, a flight keeps plain integer counters (FlightRecorder) and, when the attempt ends, ONE compact line is
// appended to a ring buffer in localStorage (last 300 lines). The log has its own keys: the save is untouched.
// Line = positional integers in base 36 joined by "." , then "/" fields: version, course, cards, inscriptions.
// Export text = one header line (format version and field order) + the lines. Decoder returns named fields.
export const PLAY_LOG_VERSION = 1;
export const PLAY_LOG_KEY = 'wispbound-play-log';
export const PLAY_LOG_ON_KEY = 'wispbound-record-play';
export const PLAY_LOG_MAX = 300;

export const RESULTS = Object.freeze(['cleared', 'fell', 'died']);
export const CAUSES = Object.freeze(['none', 'fuel', 'terrain', 'ceiling', 'obstacle', 'other']);
export const STOPS = Object.freeze(['flight', 'elite', 'guardian']);
/** Lift-gap buckets in seconds (upper edges): <0.3 <0.5 <0.75 <1.0 <1.25 <1.5 <2.0 and >=2.0. */
export const GAP_EDGES = Object.freeze([.3, .5, .75, 1, 1.25, 1.5, 2]);
/** Lift timing error against the cue centre, in fractions of the half window; negative = early. */
export const ERR_EDGES = Object.freeze([-.75, -.5, -.25, 0, .25, .5, .75]);
/** Meter level buckets, percent: <20 <40 <60 <80 >=80. */
export const METER_EDGES = Object.freeze([20, 40, 60, 80]);

// Integer fields, in line order. Histograms follow as gap[8], err[8], meter[5].
export const INT_FIELDS = Object.freeze(['result', 'cause', 'stop', 'map', 'row', 'seed', 'dur', 'heartsStart', 'heartsLost',
  'meterStart', 'meterEnd', 'lifts', 'liftsCue', 'liftsQuick', 'liftsRefused', 'gapMed', 'gap90', 'glide', 'minMeter', 'secLow',
  'sparksSeen', 'wisp', 'collector', 'deliveries', 'skims', 'overfills', 'pulses', 'flares', 'cardSparks', 'stored', 'dist']);
export const HIST_FIELDS = Object.freeze([['gap', 8], ['err', 8], ['meter', 5]]);
export const TEXT_FIELDS = Object.freeze(['version', 'course', 'cards', 'inscriptions']);
export const HEADER = `#orbix-play-log v${PLAY_LOG_VERSION} ints:${INT_FIELDS.join(',')} hist:${HIST_FIELDS.map(([n, k]) => `${n}${k}`).join(',')} text:${TEXT_FIELDS.join(',')} (base36 ints joined by ".", then / fields; course is a 3-char code, cards and inscriptions 4-char codes joined by ",")`;

const b36 = n => Math.max(0, Math.round(Number(n) || 0)).toString(36);
/** Stable short code of an id: FNV-1a, 4 base-36 characters (cards and Inscriptions). */
export function shortCode(id, length = 4) {
  let h = 2166136261; const s = String(id ?? '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 36 ** length).toString(36).padStart(length, '0');
}
/** code -> id table for a list of known ids (decoder side). */
export function codeTable(ids, length = 4) { const t = {}; for (const id of ids) t[shortCode(id, length)] = id; return t; }
export const seedCode = seed => parseInt(shortCode(seed, 5), 36);

const bucket = (value, edges) => { let i = 0; while (i < edges.length && value >= edges[i]) i++; return i; };

/** Encodes a record (see FlightRecorder.finish) into one line. */
export function encodeFlight(rec) {
  const ints = INT_FIELDS.map(name => b36(rec[name]));
  for (const [name, size] of HIST_FIELDS) for (let i = 0; i < size; i++) ints.push(b36(rec[name]?.[i]));
  const trim = list => { const out = list.slice(); while (out.length && !out[out.length - 1]) out.pop(); return out; };
  return `${ints.join('.')}/${[rec.version ?? '', rec.course ? shortCode(rec.course, 3) : '', trim(rec.cards || []).map(id => id ? shortCode(id) : '0000').join(','),
    trim(rec.inscriptions || []).map(id => id ? shortCode(id) : '').join(',')].join('/')}`;
}

/** Decodes a line to named fields; `codes` (optional) maps card/Inscription/course codes back to ids. Returns null if malformed. */
export function decodeFlight(line, {cardCodes = {}, inscriptionCodes = {}, courseCodes = {}} = {}) {
  const parts = String(line || '').trim().split('/');
  if (parts.length < 5) return null;
  const nums = parts[0].split('.').map(s => parseInt(s, 36));
  const expected = INT_FIELDS.length + HIST_FIELDS.reduce((n, [, k]) => n + k, 0);
  if (nums.length !== expected || nums.some(n => !Number.isFinite(n))) return null;
  const rec = {}; let at = 0;
  for (const name of INT_FIELDS) rec[name] = nums[at++];
  for (const [name, size] of HIST_FIELDS) { rec[name] = nums.slice(at, at + size); at += size; }
  rec.resultName = RESULTS[rec.result] || 'unknown'; rec.causeName = CAUSES[rec.cause] || 'unknown'; rec.stopName = STOPS[rec.stop] || 'unknown';
  rec.version = parts[1]; rec.courseCode = parts[2]; rec.course = courseCodes[parts[2]] || parts[2];
  rec.cardCodes = parts[3] ? parts[3].split(',') : []; rec.cards = rec.cardCodes.map(c => c === '0000' ? null : cardCodes[c] || c);
  rec.inscriptionCodes = parts[4] ? parts[4].split(',') : []; rec.inscriptions = rec.inscriptionCodes.map(c => c ? inscriptionCodes[c] || c : null);
  return rec;
}

/** Parses an exported log (with or without the header). Lines starting with "#" are skipped. */
export function parseLog(text, codes = {}) {
  return String(text || '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => decodeFlight(l, codes)).filter(Boolean);
}

// ---- storage: its own keys, never the save ----
const store = storage => storage || globalThis.localStorage;
export function loadRecordPlay(storage) { try { return store(storage)?.getItem?.(PLAY_LOG_ON_KEY) === 'on'; } catch { return false; } }
export function saveRecordPlay(on, storage) { try { store(storage)?.setItem?.(PLAY_LOG_ON_KEY, on ? 'on' : 'off'); } catch { /* private mode: stays off */ } }
export function readLines(storage) { try { const raw = store(storage)?.getItem?.(PLAY_LOG_KEY); return raw ? raw.split('\n').filter(Boolean) : []; } catch { return []; } }
export function countFlights(storage) { return readLines(storage).length; }
/** Appends one line; keeps the last `max` lines (oldest dropped). */
export function appendLine(line, storage, max = PLAY_LOG_MAX) {
  try {
    const s = store(storage); if (!s || !line) return false;
    const lines = readLines(s); lines.push(line);
    s.setItem(PLAY_LOG_KEY, lines.slice(-max).join('\n')); return true;
  } catch { return false; }
}
export function clearLog(storage) { try { store(storage)?.removeItem?.(PLAY_LOG_KEY); } catch { /* nothing to clear */ } }
export function exportText(storage) { const lines = readLines(storage); return lines.length ? `${HEADER}\n${lines.join('\n')}` : ''; }

const GAP_BIN = .05, GAP_BINS = 81; // fine histogram for the median and 90th percentile (4 s range, last bin = more)
const COARSE = GAP_EDGES.map(e => Math.round(e / GAP_BIN));

/** Plain counters for one flight. Created only when recording is on; every method is O(1), nothing allocates after construction. */
export class FlightRecorder {
  constructor(meta = {}) {
    Object.assign(this, {version: '', course: '', stop: 0, map: 0, row: 0, seed: 0, cards: [], inscriptions: [], heartsStart: 0, meterStart: 0}, meta);
    this.lifts = 0; this.liftsCue = 0; this.liftsQuick = 0; this.liftsRefused = 0; this.glide = 0; this.lastLift = -1; this.cause = 0;
    this.minFrac = 1; this.secLow = 0; this.sparksSeen = 0; this.deliveries = 0; this.overfills = 0; this.pulses = 0; this.flares = 0; this.cardSparks = 0;
    this.nextSample = 1; this.seenCursor = 0; this.tEnd = -1;
    this.gaps = new Uint16Array(GAP_BINS); this.err = new Uint16Array(8); this.meter = new Uint16Array(5);
  }
  /** One accepted Lift at flight time t; `cue` is the Lift Guide state at that moment (or null). */
  lift(t, cue) {
    this.lifts++;
    if (this.lastLift >= 0) {
      const gap = t - this.lastLift;
      this.gaps[Math.min(GAP_BINS - 1, Math.floor(gap / GAP_BIN))]++;
      if (gap < .5) this.liftsQuick++;
      if (gap > 2) this.glide += gap;
    }
    this.lastLift = t;
    if (cue && !cue.loan && Number.isFinite(cue.targetIn)) {
      if (cue.phase === 'open' && !cue.late) this.liftsCue++;
      const half = this.cueHalf || .1;
      this.err[bucket(-cue.targetIn / half, ERR_EDGES)]++;
    }
  }
  /** Called once per simulation step while the flight is live. */
  step(e, dt) {
    const frac = e.maxFlame > 0 ? e.flame / e.maxFlame : 0;
    if (frac < this.minFrac) this.minFrac = frac;
    if (frac < .2) this.secLow += dt;
    if (e.time >= this.nextSample) { this.nextSample += 1; this.meter[bucket(frac * 100, METER_EDGES)]++; }
    const list = e.layout?.embers;
    if (list) {
      const limit = e.distance + e.width;
      while (this.seenCursor < list.length && list[this.seenCursor].x <= limit) {
        const p = list[this.seenCursor++];
        if (!p.recSeen) { p.recSeen = true; if (!p.generated && !p.harmful && !p.fetchedInDream && this.countsAsSpark?.(p)) this.sparksSeen++; }
      }
    }
  }
  /** Percentile (0..1) of the Lift gaps in seconds from the fine histogram (bin centre). */
  gapPercentile(q) {
    let total = 0; for (let i = 0; i < GAP_BINS; i++) total += this.gaps[i];
    if (!total) return 0;
    const target = Math.max(1, Math.ceil(total * q)); let run = 0;
    for (let i = 0; i < GAP_BINS; i++) { run += this.gaps[i]; if (run >= target) return (i + .5) * GAP_BIN; }
    return GAP_BINS * GAP_BIN;
  }
  /** Builds the final record. `end` = {result, time, hearts, meterEnd, distancePct, ...stats}. */
  finish(end) {
    const t = this.tEnd >= 0 ? this.tEnd : end.time;
    if (this.lastLift >= 0 && t - this.lastLift > 2) this.glide += t - this.lastLift; // the stretch after the last Lift
    else if (this.lastLift < 0 && t > 2) this.glide += t;
    const gap = new Array(8).fill(0); let from = 0;
    for (let b = 0; b < 8; b++) { const to = b < 7 ? COARSE[b] : GAP_BINS; for (let i = from; i < to; i++) gap[b] += this.gaps[i]; from = to; }
    return {version: this.version, course: this.course, stop: this.stop, map: this.map, row: this.row, seed: this.seed,
      cards: this.cards, inscriptions: this.inscriptions,
      result: end.result, cause: end.result === 0 ? 0 : this.cause || 5, dur: t * 10, heartsStart: this.heartsStart, heartsLost: end.result === 0 ? 0 : 1,
      meterStart: this.meterStart, meterEnd: end.meterEnd, lifts: this.lifts, liftsCue: this.liftsCue, liftsQuick: this.liftsQuick, liftsRefused: this.liftsRefused,
      gapMed: this.gapPercentile(.5) * 10, gap90: this.gapPercentile(.9) * 10, glide: this.glide, minMeter: this.minFrac * 100, secLow: this.secLow,
      sparksSeen: this.sparksSeen, wisp: end.wisp, collector: end.collector, deliveries: this.deliveries, skims: end.skims, overfills: this.overfills,
      pulses: this.pulses, flares: this.flares, cardSparks: this.cardSparks, stored: end.stored, dist: end.distancePct,
      gap, err: Array.from(this.err), meter: Array.from(this.meter)};
  }
}
