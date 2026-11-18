// Proof for ?simrun: opens a link in headless Chrome (touch emulation 924x308), reaches the departure screen, departs, checks a flight runs; saves screenshots.
//   node scripts/balance/sim-replay-shot.mjs [url] [outPrefix]   (needs the local server on :4173)
import path from 'node:path';
import { chrome, until, delay } from '../browser-probe.mjs';
const url = process.argv[2] || 'http://localhost:4173/game.html?simrun=sb0&stop=1', prefix = process.argv[3] || 'outputs/backlog-ui/simrun-sb0-stop1';
const browser = await chrome(['--mute-audio', '--disable-background-timer-throttling']);
try {
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 924, height: 308, deviceScaleFactor: 1, mobile: true });
  await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await browser.visit(url);
  await until(() => browser.ev("!!document.querySelector('.entry-depart:not([disabled])')"), 'departure ready', 300);
  await delay(600); await browser.shot(path.resolve(`${prefix}-departure.png`));
  console.log('departure', await browser.ev("JSON.stringify({href:location.href,screen:document.body.dataset.screen,flightSeed:null,panel:!!document.querySelector('.sim-run-panel')&&!document.querySelector('.sim-run-panel').hidden})"));
  await browser.ev("(()=>{const b=document.querySelector('.entry-depart');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,isPrimary:true,button:0}));b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,isPrimary:true,button:0}));b.click();})()");
  await until(() => browser.ev("document.body.dataset.screen==='flight'"), 'flight screen', 100);
  await delay(2500);
  // a tap resumes after the entry (countdown ramp)
  await browser.ev("document.querySelector('[data-action=wake-flight]')?.click()");
  await delay(900); await browser.shot(path.resolve(`${prefix}-flight.png`));
  console.log('flight', await browser.ev("(()=>{const e=globalThis.__mockFlight?.();return JSON.stringify({screen:document.body.dataset.screen,time:e&&+e.time.toFixed(2),flame:e&&e.flame,lives:e&&e.lives,seed:e&&e.seed,distance:e&&Math.round(e.distance),paused:e&&e.paused,panelHidden:document.querySelector('.sim-run-panel')?.hidden})})()"));
  await delay(7000); await browser.shot(path.resolve(`${prefix}-result.png`)); console.log('result', await browser.ev("JSON.stringify({screen:document.body.dataset.screen,panel:document.querySelector('.sim-run-panel')?.innerText})"));
  console.log('errors', JSON.stringify(browser.errors.slice(0, 5)));
} finally { browser.close(); }
