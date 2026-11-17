// Records the glossary's gameplay clips from the REAL game (see docs/term-clips.md).
//
//   node scripts/term-clips.mjs                     re-record every clip
//   node scripts/term-clips.mjs --only flash,wave   re-record some terms (glossary keys)
//   node scripts/term-clips.mjs --list              list the terms and their scenarios
//   node scripts/term-clips.mjs --keep-frames       keep the PNG frames (outputs/term-clips/<term>/)
//
// How it works: a local static server for dist/, headless Chrome with a throwaway profile at the phone size (915x412
// game view, device scale 2), a mock run (?mock=cards&scenario=departure&chain=...&slots=...: nothing is saved) and the
// live WispFlight engine. The engine's own loop is stopped and stepped by hand in 1/60 s steps (two per 30 fps frame),
// CSS animations are driven from the same virtual clock, and a scenario "director" supplies the inputs and places the
// pickups, so a clip is deterministic and can be re-recorded after the game's look changes. Frames are cropped by the
// browser, scaled to 480 px wide and encoded by ffmpeg (H.264, no audio) into dist/assets/terms/<term>.mp4 plus a
// <term>.webp poster. The size limit is MAX_BYTES; the encoder raises the CRF until a clip fits.
import http from 'node:http';
import fs from 'node:fs/promises';
import {existsSync, readdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chrome, until, delay} from './browser-probe.mjs';
import {TERM_CLIPS, MAX_BYTES} from './term-clip-scenarios.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const outDir = path.join(dist, 'assets', 'terms');
const args = process.argv.slice(2);
const flag = name => args.includes('--' + name);
const only = (args.find(a => a.startsWith('--only='))?.slice(7) ?? (args.includes('--only') ? args[args.indexOf('--only') + 1] : '')).split(',').filter(Boolean);

if (flag('list')) {
  for (const c of TERM_CLIPS) console.log(`${c.term.padEnd(12)} ${c.seconds}s  ${c.title}  ${c.url}`);
  process.exit(0);
}

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const probe = spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'});
  if (probe.status === 0) return 'ffmpeg';
  const dir = path.join(root, 'work', 'audio-tools', 'imageio_ffmpeg', 'binaries');
  if (existsSync(dir)) { const f = readdirSync(dir).find(n => /^ffmpeg.*\.exe$|^ffmpeg-/.test(n) && !n.endsWith('.md') && !n.endsWith('.py')); if (f) return path.join(dir, f); }
  throw new Error('No ffmpeg: set FFMPEG, put ffmpeg on PATH or install work/audio-tools/imageio_ffmpeg (see scripts/encode-collector-motion-studies.py).');
}

const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.json': 'application/json', '.webmanifest': 'application/manifest+json'};
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

// Page-side kit. `tc` is the clip's virtual clock and helper set; scenario functions receive (e, tc).
const KIT = `(()=>{
 const e=__mockFlight();
 if(e.raf)cancelAnimationFrame(e.raf);e.raf=null;
 e.setMuted?.(true);e.tutorialAwaitingLift=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;
 document.querySelector('#pause-layer')?.replaceChildren();
 const tc={e,t:0,frameNo:0,lastLift:-9,notes:{},director:null,pilotOn:true,pilotTarget:null};
 tc.lift=()=>{e.beginLiftInput();e.endLiftInput();tc.lastLift=e.time;};
 // Safe human-like pilot: hold the passage's centre line (or the obstacle's), Lift only while falling.
 tc.pilot=()=>{
  if(!tc.pilotOn||e.dying||e.finished)return;
  const px=e.distance+e.player.x;
  const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-px<145&&o.x+o.width>px);
  const target=tc.pilotTarget??(near?e.obstacleCenter(near):e.height*.52);
  if(e.player.y>target&&e.player.vy>0&&e.time-tc.lastLift>.35)tc.lift();
 };
 // Place a pickup of a kind at an offset from the wisp (ahead = +x, in world pixels; y as a fraction of height or px).
 tc.drop=(kind,dx,y,extra={})=>{
  const p={id:'tc:'+kind+':'+Math.round(dx)+':'+(tc.dropN=(tc.dropN||0)+1),kind,collected:false,phase:0,sparkMass:1,...extra};
  p.x=e.distance+e.player.x+dx;p.y=y<=1?y*e.height:y;e.layout.embers.push(p);e.layout.embers.sort((a,b)=>a.x-b.x);e._nearbyPacketsUntil=-1;e._pickupCount=-1;return p;
 };
 tc.animTick=()=>{for(const a of document.getAnimations()){if(a.__tc===undefined){a.__tc=tc.t;try{a.pause();}catch{}}try{a.currentTime=(tc.t-a.__tc)*1000;}catch{}}};
 tc.frame=()=>{
  for(let i=0;i<2;i++){tc.t+=1/60;tc.director?.(e,tc);tc.pilot();e.step(1/60);}
  e.accumulator=1/60;e.render();e.notify();tc.animTick();tc.frameNo++;
  return {time:e.time,alive:e.alive,dying:e.dying,flame:e.flame};
 };
 window.__tc=tc;return true;
})()`;

// Method shorthand (setup(e,tc){}) has no expression form; give it one.
const src = f => { const s = (f || (() => {})).toString(); return /^(async\s+)?(function|\(|[\w$]+\s*=>)/.test(s) ? s : 'function ' + s; };

// Real-time mode for screens that are not the flight engine (the Chain screen's Play, take-off). Steps are page-side
// strings run in order; frames are screenshots with wall-clock stamps, resampled to 30 fps by ffmpeg.
async function recordRealtime(b, clip, frames) {
  await until(() => b.ev(clip.ready), clip.term + ': ready', 300);
  await b.ev('document.fonts.ready.then(()=>true)'); await delay(500);
  const [cx, cy, cw, ch] = clip.crop || [0, 0, 915, 412];
  const stamps = []; let t0 = null, i = 0;
  const grab = async () => {
    const shot = await b.send('Page.captureScreenshot', {format: 'png', clip: {x: cx, y: cy, width: cw, height: ch, scale: 1}});
    const now = Date.now(); t0 ??= now; stamps.push((now - t0) / 1000);
    await fs.writeFile(path.join(frames, String(i++).padStart(4, '0') + '.png'), Buffer.from(shot.data, 'base64'));
  };
  for (const step of clip.steps) {
    if (step.wait) { const end = Date.now() + step.wait * 1000; while (Date.now() < end) await grab(); }
    else if (step.js) { await b.ev(step.js); }
    else if (step.until) { await until(() => b.ev(step.until), clip.term + ': ' + step.until, 100); }
  }
  // The recorded span is trimmed to clip.seconds.
  const list = []; let n = 0;
  for (let k = 0; k < stamps.length; k++) { if (stamps[k] > clip.seconds) break; n++; list.push(`file '${path.join(frames, String(k).padStart(4, '0') + '.png').replaceAll(path.sep, '/')}'`, `duration ${((stamps[k + 1] ?? stamps[k] + .1) - stamps[k]).toFixed(4)}`); }
  list.push(list[list.length - 2]);
  await fs.writeFile(path.join(frames, 'list.txt'), list.join('\n'));
  return {frames, n, concat: path.join(frames, 'list.txt'), notes: {captured: stamps.length, kept: n, fps: +(n / clip.seconds).toFixed(1)}, log: []};
}

async function record(clip, shotIndex) {
  const tag = clip.term;
  const frames = path.join(os.tmpdir(), 'wisp-term-clips', tag);
  await fs.rm(frames, {recursive: true, force: true}); await fs.mkdir(frames, {recursive: true});
  const b = await chrome(['--mute-audio', '--disable-gpu', '--hide-scrollbars']);
  const log = [];
  try {
    await b.send('Emulation.setDeviceMetricsOverride', {width: 915, height: 412, deviceScaleFactor: 2, mobile: true});
    await b.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
    await b.visit(`${base}/game.html?display=native&mock=cards&${clip.url}`);
    if (clip.realtime) return await recordRealtime(b, clip, frames);
    await until(() => b.ev(`!!document.querySelector('.entry-depart:not([disabled])')`), tag + ': depart button', 300);
    await b.ev('document.fonts.ready.then(()=>true)');
    await delay(400);
    await b.ev(`document.querySelector('.entry-depart').click()`);
    await until(() => b.ev('!!__mockFlight()&&!document.querySelector(".entry-depart")'), tag + ': flight started', 100);
    await b.ev(KIT);
    // Page-side scenario code: serialised functions from term-clip-scenarios.mjs.
    await b.ev(`(()=>{const tc=__tc,e=tc.e;tc.pilotTarget=null;(${src(clip.setup)})(e,tc);tc.director=(${src(clip.director)});return true})()`);
    // Warm up (not recorded): let the opening settle.
    for (let i = 0; i < Math.round((clip.warmup ?? 0) * 30); i++) await b.ev('__tc.frame()');
    if (clip.afterWarmup) await b.ev(`(()=>{(${src(clip.afterWarmup)})(__tc.e,__tc);return true})()`);
    const n = Math.round(clip.seconds * 30), [cx, cy, cw, ch] = clip.crop || [0, 0, 915, 412];
    for (let i = 0; i < n; i++) {
      const s = await b.ev('__tc.frame()');
      if (i === 0 || i === n - 1 || i % 30 === 0) log.push({i, ...s});
      const shot = await b.send('Page.captureScreenshot', {format: 'png', clip: {x: cx, y: cy, width: cw, height: ch, scale: 1}});
      await fs.writeFile(path.join(frames, String(i).padStart(4, '0') + '.png'), Buffer.from(shot.data, 'base64'));
    }
    const notes = await b.ev('JSON.stringify(__tc.notes)');
    if (b.errors.length) console.warn(`  ${tag}: page errors:`, [...new Set(b.errors)].slice(0, 3));
    return {frames, n, notes: JSON.parse(notes), log};
  } finally { b.close(); }
}

function encode(clip, rec) {
  const ff = findFfmpeg(), mp4 = path.join(outDir, clip.term + '.mp4'), poster = path.join(outDir, clip.term + '.webp');
  const vf = `scale=${clip.width || 480}:-2:flags=lanczos`;
  let crf = clip.crf || 26, size = 0;
  for (; crf <= 44; crf += 3) {
    const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...(rec.concat ? ['-f', 'concat', '-safe', '0', '-i', rec.concat] : ['-framerate', '30', '-i', path.join(rec.frames, '%04d.png')]), '-vf', rec.concat ? 'fps=30,' + vf : vf,
      '-an', '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], {encoding: 'utf8'});
    if (r.status !== 0) throw new Error('ffmpeg failed: ' + r.stderr);
    size = spawnSync('node', ['-e', `process.stdout.write(String(require('fs').statSync(${JSON.stringify(mp4)}).size))`], {encoding: 'utf8'}).stdout * 1;
    if (size <= MAX_BYTES) break;
  }
  const posterFrame = String(Math.min(rec.n - 1, Math.round(rec.n * (clip.poster ?? .45)))).padStart(4, '0');
  const p = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(rec.frames, posterFrame + '.png'), '-vf', vf, '-frames:v', '1', '-quality', '82', poster], {encoding: 'utf8'});
  if (p.status !== 0) throw new Error('poster failed: ' + p.stderr);
  return {mp4, poster, crf, bytes: size};
}

await fs.mkdir(outDir, {recursive: true});
const todo = TERM_CLIPS.filter(c => !only.length || only.includes(c.term));
if (only.length && todo.length !== only.length) console.warn('Unknown terms:', only.filter(t => !TERM_CLIPS.some(c => c.term === t)));
const results = [];
let code = 0;
for (const clip of todo) {
  const started = Date.now();
  try {
    const rec = await record(clip);
    const out = clip.skipEncode ? null : encode(clip, rec);
    const posterBytes = out ? (await fs.stat(out.poster)).size : 0;
    results.push({term: clip.term, seconds: clip.seconds, kB: out ? +(out.bytes / 1024).toFixed(1) : 0, posterKB: +(posterBytes / 1024).toFixed(1), crf: out?.crf, notes: rec.notes});
    console.log(`${clip.term}: ${clip.seconds}s ${out ? (out.bytes / 1024).toFixed(1) + ' kB (crf ' + out.crf + ') + poster ' + (posterBytes / 1024).toFixed(1) + ' kB' : ''} ${JSON.stringify(rec.notes)} [${((Date.now() - started) / 1000).toFixed(0)}s]`);
    if (!flag('keep-frames')) await fs.rm(rec.frames, {recursive: true, force: true});
    else console.log('  frames:', rec.frames);
  } catch (error) { code = 1; console.error(`${clip.term}: FAILED`, error.message); }
}
server.close();
console.log(`${results.length}/${todo.length} clips; total ${(results.reduce((s, r) => s + r.kB + r.posterKB, 0)).toFixed(1)} kB`);
process.exit(code);
