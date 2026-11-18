// One in-flight screenshot of a starter card's cue at 924x308 (production renderer, authored course, normal Lift inputs).
//   node scripts/starter-cue-shot.mjs skim-line|pulse-reader|courier-cord|meter-mark|finish-flag
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome, until} from './browser-probe.mjs';
const card = process.argv[2], root = path.resolve('dist'), out = path.resolve('outputs/backlog-ui');
const CUES = { // setup: staged modifiers/state; hit: when to shoot (evaluated each frame, with e = engine)
  'skim-line': {setup: 'e.mod.cardSkimLine=true;e.mod.proximityUnlocked=true;', hit: 'e.edgingPulse.surface.clearance<=60'},
  'pulse-reader': {setup: 'e.mod.cardPulseReader=true;', hit: 'e.luminanceWaves.cue&&e.luminanceWaves.cue.lead<110',
    each: 'if(e.time>1&&Math.floor(e.time*2)!==this.lw){this.lw=Math.floor(e.time*2);if(!e.luminanceWaves.waves.length)e.luminanceWaves.emit({x:e.distance+e.player.x,y:e.player.y,sourceKind:"card",source:"proof"});}'},
  'courier-cord': {setup: 'e.mod.cardCourierCord=true;', hit: 'e.collectors.some(w=>w.cargo)'},
  'meter-mark': {setup: 'e.mod.cardMeterMark=true;', hit: 'e.time>1.2', each: 'e.flame=e.maxFlame*.95;'},
  'finish-flag': {setup: 'e.mod.cardFinishFlag=true;', hit: 'e.time>4'},
};
const cue = CUES[card]; if (!cue) throw Error('card?');
const bridge = `
muted=true;music.setEnabled(false);
window.__cue={href:location.href,get engine(){return engine},
 async prepare(){const e=engine;e.setMuted(true);music.setEnabled(false);cancelAnimationFrame(e.raf);e.raf=null;
  paused=false;resumeArmed=false;e.paused=false;e.running=true;e.resumeElapsed=e.resumeRampSeconds;document.querySelector('#pause-layer').replaceChildren();
  await document.fonts.ready;await e.environmentArtReady;${cue.setup}
  ${card === 'courier-cord' ? `const {WispCompanion}=await import('./wisp.mjs?v=furnace-tow-1');e.wisp=new WispCompanion(e.player);e.collectors=[e.wisp];e.syncCollectors();e.mod.wispCooldown=.4;
  e.layout.embers.push({id:'cue-p',kind:'light',sparkMass:1,x:e.distance+e.player.x-40,y:e.player.y+20,phase:0});e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;` : ''}
  e.accumulator=1/60;e.render();e.notify();return {width:e.width,height:e.height}},
 last:-10,
 frame(){const e=engine;paused=false;e.paused=false;e.running=true;document.querySelector('#pause-layer').replaceChildren();try{lesson=null}catch{}
  for(let i=0;i<2;i++){const near=e.getNearbyObstacles().find(o=>!o.destroyed&&o.x-e.distance-e.player.x<145&&o.x+o.width>e.distance+e.player.x);
   const target=near?e.obstacleCenter(near):e.height*.52;
   if(e.player.y>target&&e.player.vy>0&&e.time-this.last>.35){e.beginLiftInput();e.endLiftInput();this.last=e.time;}
   ${cue.each || ''}
   e.step(1/60);}
  e.accumulator=1/60;e.render();e.notify();return {t:e.time,dying:e.dying,hit:!!(${cue.hit})}}
};`;
const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json'};
const server = http.createServer(async (req, res) => { try {
  const url = new URL(req.url, 'http://localhost'), file = path.resolve(root, '.' + url.pathname);
  if (!file.startsWith(root + path.sep)) throw Error('outside');
  let data = await fs.readFile(file); if (path.basename(file) === 'app.mjs') data = Buffer.from(data.toString() + bridge);
  res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(data);
} catch (e) { res.writeHead(404).end(String(e)); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port, browser = await chrome(['--mute-audio', '--disable-background-timer-throttling']);
try {
  await browser.send('Emulation.setDeviceMetricsOverride', {width: 924, height: 308, deviceScaleFactor: 1, mobile: true});
  await browser.send('Page.addScriptToEvaluateOnNewDocument', {source: 'localStorage.clear()'});
  const url = base + '/game.html?mock=boundary&cards=1&biome=pinewood&course=1&display=native&proof=' + card;
  await browser.visit(url);
  try{await until(() => browser.ev("window.__cue?.href===" + JSON.stringify(url) + "&&window.__cue?.engine?.pixiReady&&document.querySelector(\"[data-action=wake-flight]\")"), card, 60);}catch(err){console.log(await browser.ev("JSON.stringify({h:window.__cue?.href,l:location.href,px:window.__cue?.engine?.pixiReady,wake:!!document.querySelector(\"[data-action=wake-flight]\"),body:document.body.dataset.screen,t:document.body.innerText.slice(0,200)})"), JSON.stringify(browser.errors));throw err;}
  await browser.ev('__cue.prepare()');
  let shot = false, last;
  for (let i = 0; i < 600 && !shot; i++) { const s = await browser.ev('__cue.frame()'); last = s; if (s.dying) break; if (s.hit || i === 599) { await browser.shot(path.join(out, `starter-${card}.png`)); shot = s; } }
  console.log(card, shot ? 'shot at ' + JSON.stringify(shot) : 'NO SHOT ' + JSON.stringify(last)); console.log('errors', JSON.stringify(browser.errors), 'mod', await browser.ev('JSON.stringify(__cue.engine.mod.cardCourierCord)').catch(() => '?'));
} finally { browser.close(); server.close(); }
