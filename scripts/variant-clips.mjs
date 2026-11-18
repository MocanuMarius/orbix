// Records the owner's A / B / C VIDEO review of an in-flight visual (docs/design-versions.md rule: "Variant A / B / C ... and need to be videos").
// The same real autopilot flight is recorded once per value of one URL parameter, so the clips show identical moments and only the look differs.
//
//   node scripts/variant-clips.mjs --param strip --values a,b,c --scenario strip --chain body-spark,echo,lift-guide,harvest-common \
//        --seed 7 --seconds 10 --out dist/design-lab/assets/strip --prefix strip
//   node scripts/variant-clips.mjs --list                 list the built-in scenarios
//
// Flags (all optional except --param and --values):
//   --param NAME        URL parameter appended to the page and used to name the clips (the game ignores a parameter it does not know, so a value like
//                       'final' just labels one recording: --param strip --values final)
//   --values a,b,c      one clip per value, written to <out>/<prefix>-<value>.webm and .png (poster)
//   --scenario NAME     built-in scenario (below) or --scenario-file path.mjs exporting {setup(e,tc), director(e,tc), warmup}
//   --chain ids         card ids of the mounted Chain (default body-spark,echo,lift-guide,harvest-common)
//   --slots 0:gilded    Inscriptions as slot:id,... (the game's mock URL syntax)
//   --seed N            seeds Math.random inside the page (same flight in every clip); default 7
//   --seconds S         clip length, default 10;  --warmup S  unrecorded lead-in, default 1
//   --width W --height H  CSS size of the view (default 924x412), device scale 2 (--scale)
//   --max-mb M          size limit per clip (default 1.9): the encoder raises the CRF until it fits
//   --poster 0..1       where in the clip the poster PNG is taken (default .5)
//   --zoom SPEC         also write <prefix>-<value>-zoom.webm/.png: the same frames cropped to a CSS-px region and magnified with nearest-neighbour scaling
//                       (so a small strip is readable). SPEC = x,y,w,h,scale  (all values), or per value  a=x,y,w,h,s;b=x,y,w,h,s  (a bare entry is the default)
//   --keep-frames       keep the PNG frames (folder printed)
//
// How it works (same approach as scripts/term-clips.mjs, docs/term-clips.md): a static server for dist/, headless Chrome with a throwaway
// profile, the mock run (game.html?display=native&mock=cards&scenario=departure&chain=...), the live WispFlight engine stopped and stepped by hand
// (1/60 s, two steps per 30 fps frame). performance.now() is replaced by the virtual clock so the HUD strip's own timing is deterministic too, and CSS /
// Web animations are driven from that clock. The wisp flies on the autopilot pilot; the scenario's director places pickups. Encoded by ffmpeg to VP9 .webm.
import http from 'node:http';
import fs from 'node:fs/promises';
import {existsSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chrome, until, delay} from './browser-probe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf('--' + name); return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback; };
const flag = name => argv.includes('--' + name);

// Built-in scenarios: functions that run INSIDE the page against the live engine (serialised with toString: no outer scope).
export const SCENARIOS = {
  // A busy flight for Chain-strip reviews: a Spark about every second on the wisp's line (Body Spark, Echo), a Flare with Sparks behind it twice (Pulse, Harvest),
  // and the pilot's Lifts for Lift Guide.
  strip: {
    title: 'Sparks every second, two Flares with uncollected Sparks, autopilot Lifts', warmup: 1,
    setup(e, tc) { e.flame = e.maxFlame * .5; tc.pilotTarget = e.height * .5; tc.nextSpark = .2; tc.flares = 0; tc.nextFlare = 1.6; },
    director(e, tc) {
      if (tc.t >= tc.nextSpark) { tc.nextSpark = tc.t + .9; tc.drop('light', 190, e.player.y + 6); }
      if (tc.t >= tc.nextFlare && tc.flares < 2) {
        tc.nextFlare = tc.t + 5; tc.flares++;
        tc.flare = tc.drop('sight', 150, e.player.y, {feature: 'sight-niche'});
        [[250, .22], [300, .8], [360, .3], [330, .62], [215, .78]].forEach(([dx, y]) => tc.drop('light', dx, y));
      }
      const f = tc.flare; if (f && !f.collected) { const d = f.y - e.player.y; e.player.y += Math.max(-3, Math.min(3, d)); if (e.player.vy * d < 0) e.player.vy *= .5; }
    },
  },
  // Collector cord reviews (?cord=a|b|c|d): the Collector fetches Sparks at different distances, one at full reach, with Lifts and dives while it tows.
  // Chain: courier-cord,twin-wick,cast-line,long-spool. Sparks are only dropped for an idle Collector, so every variant gets the same fetches (the cord is visual).
  cord: {
    title: 'Collector fetches at several distances, one at full reach, quick Lifts and dives during the tow', warmup: 1,
    // Recording aid, the same in every variant: recovery runs 2x so a 12 s clip holds four fetches (in the game one fetch takes about 10 s).
    setup(e, tc) { e.flame = e.maxFlame; Object.defineProperty(e.flightBoon, "recoveryRate", {value: 2, configurable: true}); tc.n = 0; tc.nextAt = .3; tc.lifts = [3.2, 3.45, 6.4, 6.65, 9.3, 9.55]; },
    director(e, tc) {
      e.flame = Math.max(e.flame, e.maxFlame * .7);
      for (const c of e.__cords || []) if (c.ready && Math.abs(tc.t * 0 + e.time - c.t) < .1) { const k = 'w' + (c.tension < .3 ? 3 : c.tension < .65 ? 2 : 1); tc.notes[k] = (tc.notes[k] || 0) + 1; }
      const fr = [1, .35, .7, .2, 1, .5], dy = [0, 14, -22, 10, 0, 18];
      const idle = (e.collectors || [e.wisp]).find(w => w.enabled(e) && !w.cargo && !w.target && w.phase === 'ready');
      if (idle && tc.t >= tc.nextAt && tc.n < 6 && !e.layout.embers.some(p => !p.collected && !p.carried)) {
        const reach = e.collectorFetchRange(idle) * .98, i = tc.n++;
        tc.nextAt = tc.t + .4; tc.drop("light", reach * fr[i], e.player.y + dy[i]); (tc.log ||= []).push([+tc.t.toFixed(2), +(reach * fr[i]).toFixed(0)]);
      }
      // Extra quick Lifts (the pilot keeps dodging obstacles itself, so the flight stays alive); a Lift is held back while an obstacle is close.
      const px = e.distance + e.player.x, near = e.getNearbyObstacles().some(o => !o.destroyed && o.x - px < 210 && o.x + o.width > px - 20);
      if (tc.lifts.length && tc.t >= tc.lifts[0] && !near) { tc.lifts.shift(); tc.lift(); }
    },
  },
  // Quiet flight, one Spark every 2.5 s: for cues that must read when little happens (starter cues, pickups).
  calm: {
    title: 'One Spark every 2.5 seconds', warmup: 1,
    setup(e, tc) { e.flame = e.maxFlame * .5; tc.pilotTarget = e.height * .5; tc.nextSpark = .4; },
    director(e, tc) { if (tc.t >= tc.nextSpark) { tc.nextSpark = tc.t + 2.5; tc.drop('light', 190, e.player.y + 6); } },
  },
};
// The same cord flight at the game's real timing (no doubled recovery), for the final cord clip.
SCENARIOS.cordreal = {
  title: 'Collector cord at real game timing: fetches at several distances, quick Lifts', warmup: 1,
  setup(e, tc) { e.flame = e.maxFlame; tc.n = 0; tc.nextAt = .3; tc.lifts = [3.2, 3.45, 6.4, 6.65, 9.3, 9.55, 12.2, 12.45]; },
  director: SCENARIOS.cord.director,
};
if (flag('list')) { for (const [k, v] of Object.entries(SCENARIOS)) console.log(k.padEnd(8), v.title); process.exit(0); }

const param = opt('param'), values = (opt('values', '') || '').split(',').filter(Boolean);
if (!param || !values.length) { console.error('Need --param NAME and --values a,b,c (see the header of scripts/variant-clips.mjs).'); process.exit(2); }
let scenario = SCENARIOS[opt('scenario', 'strip')];
if (opt('scenario-file')) scenario = (await import(pathToFileURL(path.resolve(opt('scenario-file'))).href)).default;
if (!scenario) { console.error('Unknown scenario; use --list or --scenario-file.'); process.exit(2); }
const chain = opt('chain', 'body-spark,echo,lift-guide,harvest-common'), slots = opt('slots', ''), seed = Number(opt('seed', 7));
const seconds = Number(opt('seconds', 10)), warmup = Number(opt('warmup', scenario.warmup ?? 1)), W = Number(opt('width', 924)), H = Number(opt('height', 412)), scale = Number(opt('scale', 2));
const maxBytes = Number(opt('max-mb', 1.9)) * 1024 * 1024, posterAt = Number(opt('poster', .5));
const zoomSpec = opt('zoom', '');
const zoomFor = value => { let def = null; for (const part of zoomSpec.split(';').filter(Boolean)) { const m = /^(?:([A-Za-z0-9_-]+)=)?(.+)$/.exec(part.trim()), n = m[2].split(',').map(Number); if (n.length < 5 || n.some(x => !Number.isFinite(x))) continue; if (m[1] === value) return n; if (!m[1]) def = n; } return def; };
const outDir = path.resolve(root, opt('out', 'dist/design-lab/assets/variants')), prefix = opt('prefix', param);

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'}).status === 0) return 'ffmpeg';
  const dir = path.join(root, 'work', 'audio-tools', 'imageio_ffmpeg', 'binaries');
  if (existsSync(dir)) { const f = readdirSync(dir).find(n => /^ffmpeg.*\.exe$|^ffmpeg-/.test(n) && !/\.(md|py)$/.test(n)); if (f) return path.join(dir, f); }
  throw new Error('No ffmpeg: set FFMPEG, put ffmpeg on PATH or install work/audio-tools/imageio_ffmpeg.');
}
const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json'};
const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(dist + path.sep)) throw new Error('outside dist');
    const data = await fs.readFile(file);
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

// Page-side kit (as in scripts/term-clips.mjs) plus a virtual performance.now and a seeded Math.random.
const SEED_JS = s => `(()=>{let a=${s}>>>0;Math.random=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};})()`;
const KIT = `(()=>{
 const e=__mockFlight();
 if(e.raf)cancelAnimationFrame(e.raf);e.raf=null;
 e.setMuted?.(true);e.tutorialAwaitingLift=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
 document.querySelector('#pause-layer')?.replaceChildren();
 const tc={e,t:0,frameNo:0,lastLift:-9,notes:{},director:null,pilotOn:true,pilotTarget:null};
 const t0=performance.now();performance.now=()=>t0+tc.t*1000;
 tc.lift=()=>{e.beginLiftInput();e.endLiftInput();tc.lastLift=e.time;};
 tc.pilot=()=>{
  if(!tc.pilotOn||e.dying||e.finished)return;
  const px=e.distance+e.player.x;
  const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-px<145&&o.x+o.width>px);
  const target=tc.pilotTarget??(near?e.obstacleCenter(near):e.height*.52);
  if(e.player.y>target&&e.player.vy>0&&e.time-tc.lastLift>.35)tc.lift();
 };
 tc.drop=(kind,dx,y,extra={})=>{
  const p={id:'tc:'+kind+':'+Math.round(dx)+':'+(tc.dropN=(tc.dropN||0)+1),kind,collected:false,phase:0,sparkMass:1,...extra};
  p.x=e.distance+e.player.x+dx;p.y=y<=1?y*e.height:y;e.layout.embers.push(p);e.layout.embers.sort((a,b)=>a.x-b.x);e._nearbyPacketsUntil=-1;e._pickupCount=-1;return p;
 };
 tc.animTick=()=>{for(const a of document.getAnimations()){if(a.__tc===undefined){a.__tc=tc.t;try{a.pause();}catch{}}try{a.currentTime=(tc.t-a.__tc)*1000;}catch{}}};
 tc.frame=()=>{
  for(let i=0;i<2;i++){tc.t+=1/60;tc.director?.(e,tc);tc.pilot();e.step(1/60);}
  e.accumulator=1/60;e.render();e.notify();tc.animTick();tc.frameNo++;
  return {time:e.time,alive:e.alive,dying:e.dying};
 };
 window.__tc=tc;return true;
})()`;
const src = f => { const s = (f || (() => {})).toString(); return /^(async\s+)?(function|\(|[\w$]+\s*=>)/.test(s) ? s : 'function ' + s; };

async function record(value) {
  const frames = path.join(os.tmpdir(), 'variant-clips', `${prefix}-${value}`);
  await fs.rm(frames, {recursive: true, force: true}); await fs.mkdir(frames, {recursive: true});
  const b = await chrome(['--mute-audio', '--disable-gpu', '--hide-scrollbars']);
  try {
    await b.send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: scale, mobile: true});
    await b.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
    await b.send('Page.addScriptToEvaluateOnNewDocument', {source: SEED_JS(seed)});
    await b.visit(`${base}/game.html?display=native&mock=cards&scenario=departure&chain=${chain}${slots ? '&slots=' + slots : ''}&${encodeURIComponent(param)}=${encodeURIComponent(value)}`);
    await until(() => b.ev(`!!document.querySelector('.entry-depart:not([disabled])')`), value + ': depart button', 300);
    await b.ev('document.fonts.ready.then(()=>true)'); await delay(400);
    await b.ev(`document.querySelector('.entry-depart').click()`);
    await until(() => b.ev('!!__mockFlight()&&!document.querySelector(".entry-depart")'), value + ': flight started', 100);
    await b.ev(SEED_JS(seed));
    await b.ev(KIT);
    await b.ev(`(()=>{const tc=__tc,e=tc.e;tc.pilotTarget=null;(${src(scenario.setup)})(e,tc);tc.director=(${src(scenario.director)});return true})()`);
    for (let i = 0; i < Math.round(warmup * 30); i++) await b.ev('__tc.frame()');
    const n = Math.round(seconds * 30);
    for (let i = 0; i < n; i++) {
      await b.ev('__tc.frame()');
      const shot = await b.send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: W, height: H, scale: 1}});
      await fs.writeFile(path.join(frames, String(i).padStart(4, '0') + '.png'), Buffer.from(shot.data, 'base64'));
    }
    const fingerprint = await b.ev(`(()=>{const e=__tc.e;return JSON.stringify({d:Math.round(e.distance),y:Math.round(e.player.y),alive:e.alive,collected:e.layout.embers.filter(p=>p.collected).length,notes:__tc.notes})})()`);
    if (b.errors.length) console.warn(`  ${value}: page errors:`, [...new Set(b.errors)].slice(0, 3));
    return {frames, n, fingerprint};
  } finally { b.close(); }
}

function encode(value, rec) {
  const ff = findFfmpeg(), webm = path.join(outDir, `${prefix}-${value}.webm`), poster = path.join(outDir, `${prefix}-${value}.png`);
  let crf = 34, size = 0;
  for (; crf <= 52; crf += 3) {
    const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', path.join(rec.frames, '%04d.png'), '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-row-mt', '1', '-cpu-used', '2', '-pix_fmt', 'yuv420p', webm], {encoding: 'utf8'});
    if (r.status !== 0) throw new Error('ffmpeg failed: ' + r.stderr);
    size = statSync(webm).size;
    if (size <= maxBytes) break;
  }
  const z = zoomFor(value);
  if (z) {
    const [zx, zy, zw, zh, zs] = z, sc = scale, zoomWebm = path.join(outDir, `${prefix}-${value}-zoom.webm`);
    let zc = 30, zsz = 0;
    for (; zc <= 52; zc += 3) {
      const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', path.join(rec.frames, '%04d.png'), '-vf', `crop=${zw * sc}:${zh * sc}:${zx * sc}:${zy * sc},scale=iw*${zs / sc}:ih*${zs / sc}:flags=neighbor`, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(zc), '-row-mt', '1', '-cpu-used', '2', '-pix_fmt', 'yuv420p', zoomWebm], {encoding: 'utf8'});
      if (r.status !== 0) throw new Error('ffmpeg zoom failed: ' + r.stderr);
      zsz = statSync(zoomWebm).size; if (zsz <= maxBytes) break;
    }
    const zf = String(Math.min(rec.n - 1, Math.round(rec.n * posterAt))).padStart(4, '0');
    spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(rec.frames, zf + '.png'), '-vf', `crop=${zw * sc}:${zh * sc}:${zx * sc}:${zy * sc},scale=iw*${zs / sc}:ih*${zs / sc}:flags=neighbor`, '-frames:v', '1', path.join(outDir, `${prefix}-${value}-zoom.png`)]);
    console.log(`  zoom ${value}: ${(zsz / 1024).toFixed(0)} kB -> ${path.relative(root, zoomWebm)}`);
  }
  const frame = String(Math.min(rec.n - 1, Math.round(rec.n * posterAt))).padStart(4, '0');
  fs.copyFile(path.join(rec.frames, frame + '.png'), poster);
  return {webm, poster, crf, bytes: size};
}

await fs.mkdir(outDir, {recursive: true});
let code = 0; const prints = [];
for (const value of values) {
  const t0 = Date.now();
  try {
    const rec = await record(value), out = encode(value, rec);
    prints.push(rec.fingerprint);
    console.log(`${param}=${value}: ${seconds}s ${(out.bytes / 1024).toFixed(0)} kB (crf ${out.crf}) -> ${path.relative(root, out.webm)} [${((Date.now() - t0) / 1000).toFixed(0)}s] ${rec.fingerprint}`);
    if (out.bytes > maxBytes) { code = 1; console.error('  over the size limit even at the highest CRF'); }
    if (!flag('keep-frames')) await fs.rm(rec.frames, {recursive: true, force: true}); else console.log('  frames:', rec.frames);
  } catch (error) { code = 1; console.error(`${param}=${value}: FAILED`, error.message); }
}
if (new Set(prints).size > 1) console.warn('WARNING: the flights differ between clips (end-of-clip fingerprints are not equal), so the clips do not show identical moments.');
server.close();
process.exit(code);
