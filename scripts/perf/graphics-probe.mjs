// Graphics presets probe (desktop headless Chrome, touch emulation). Modes:
//   node scripts/perf/graphics-probe.mjs settings            Settings screen screenshots at 890x400 and 924x308 -> outputs/backlog-ui/graphics-*.png
//   node scripts/perf/graphics-probe.mjs flight [--wait 12]  pinewood late-mid, same moment under High / Medium / Low: frame PNGs + pixel diffs
//   node scripts/perf/graphics-probe.mjs state  [--preset high|low] [--steps 1800]   seeded stepped autopilot flight, prints the end-state hash
import fs from 'node:fs/promises';
import path from 'node:path';
import {startServer, launch, delay, until} from './lib.mjs';
const A = Object.fromEntries(process.argv.slice(3).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]); return acc; }, []));
const mode = process.argv[2], OUT = path.resolve('outputs/backlog-ui');
const phone = (w, h, dpr) => ({width: w, height: h, deviceScaleFactor: dpr, mobile: true, screenOrientation: {type: 'landscapePrimary', angle: 90}});
const flightUrl = (base, extra = '') => `${base}/game.html?mock=boundary&cards=1&autopilot=1&seed=perf-bench&biome=pinewood&course=1&late=1&collector=twin&cardset=mid&edge=spectral${extra}`;
async function depart(b) {
  await until(() => b.ev('!!document.querySelector(".entry-depart:not([disabled])")'), 'depart', 120000, 200);
  for (let i = 0; i < 8; i++) { await b.tapSel('.entry-depart:not([disabled])'); await delay(1500); if (await b.ev('document.body.classList.contains("playing")&&!document.querySelector(".entry-depart")')) return; }
  throw Error('did not depart');
}
const srv = await startServer('dist'), b = await launch();
try {
  await b.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
  await fs.mkdir(OUT, {recursive: true});
  if (mode === 'settings') {
    for (const [w, h] of [[890, 400], [924, 308]]) {
      await b.send('Emulation.setDeviceMetricsOverride', phone(w, h, 1));
      await b.send('Page.navigate', {url: `${srv.base}/game.html?cards=1`}); await until(() => b.ev('!!document.querySelector("[data-action=settings]")'), 'home settings button', 60000, 200); await delay(800);
      await b.ev(`document.querySelector('[data-action=settings]').click()`); await delay(700);
      await until(() => b.ev('!!document.querySelector("[data-action=graphics]")'), 'settings graphics row', 20000, 200);
      const m = await b.ev(`(()=>{const r=n=>n&&n.getBoundingClientRect().toJSON();const body=document.querySelector('.settings-body');const sc=document.scrollingElement;return{w:innerWidth,h:innerHeight,docScroll:sc.scrollHeight-sc.clientHeight,buttons:[...document.querySelectorAll('[data-action=graphics]')].map(n=>({id:n.dataset.id,pressed:n.getAttribute('aria-pressed'),...r(n)})),note:r(document.querySelector('.wb-set-note')),foot:r(document.querySelector('.wb-set-foot')),body:r(body)}})()`);
      console.log(JSON.stringify(m));
      await b.shot(path.join(OUT, `graphics-settings-${w}x${h}.png`));
      await b.ev(`document.querySelector('[data-action=graphics][data-id=low]').click()`); await delay(500);
      await b.shot(path.join(OUT, `graphics-settings-low-${w}x${h}.png`));
      console.log('stored', await b.ev(`localStorage.getItem('wispbound-graphics')`));
      await b.ev(`localStorage.removeItem('wispbound-graphics')`);
    }
  } else if (mode === 'flight') {
    await b.send('Emulation.setDeviceMetricsOverride', phone(924, 308, 2.625));
    await b.send('Page.navigate', {url: flightUrl(srv.base)}); await depart(b); await delay(Number(A.wait || 12) * 1000);
    const r = await b.ev(`(async()=>{const G=await import(performance.getEntriesByType('resource').map(r=>r.name).find(n=>/graphics-preset\.mjs/.test(n)));
      const e=globalThis.__mockFlight?.();const v=e.pixiView,buf=v.buffer;const shot=()=>{e.render();e.render();const c=document.createElement('canvas');c.width=buf.width;c.height=buf.height;c.getContext('2d').drawImage(buf,0,0);return{png:c.toDataURL('image/png'),px:buf.getContext('2d').getImageData(0,0,buf.width,buf.height).data}};
      const out={};for(const p of ['high','medium','low','high']){G.setGraphicsPreset(p);out[p+(out[p]?'2':'')]=shot();}
      const diff=(a,b)=>{let n=0,max=0;for(let i=0;i<a.length;i+=4){const m=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));if(m){n++;if(m>max)max=m;}}return{pixels:n,max}};
      G.setGraphicsPreset('high');
      return{preset:G.graphicsPreset(),w:buf.width,h:buf.height,highTwice:diff(out.high.px,out.high2.px),highVsMedium:diff(out.high.px,out.medium.px),highVsLow:diff(out.high.px,out.low.px),mediumVsLow:diff(out.medium.px,out.low.px),pngs:{high:out.high.png,medium:out.medium.png,low:out.low.png}}})()`, 300000);
    for (const p of ['high', 'medium', 'low']) await fs.writeFile(path.join(OUT, `graphics-flight-${p}.png`), Buffer.from(r.pngs[p].split(',')[1], 'base64'));
    delete r.pngs; console.log(JSON.stringify(r)); console.log('errors', b.errors.slice(0, 5));
  } else if (mode === 'state') {
    await b.send('Emulation.setDeviceMetricsOverride', phone(924, 308, 2.625));
    await b.send('Page.navigate', {url: flightUrl(srv.base, A.preset ? `&graphics=${A.preset}` : '')}); await depart(b);
    // Stop the real-time loop's influence: step the engine by hand at a fixed dt with a render between steps.
    const r = await b.ev(`(()=>{const e=globalThis.__mockFlight?.();if(!e)return null;const steps=${Number(A.steps || 1800)};e.paused=true;
      const proto=Object.getPrototypeOf(e);let n=0;for(;n<steps&&e.running!==false&&!e.finished&&e.alive!==false;n++){e.step(1/60);if(n%3===0)e.render();}
      const keys=['distance','time','flame','sparks','score','alive','finished'];const snap={n,distance:e.distance,time:e.time,y:e.player.y,flame:e.flame,alive:e.alive,finished:e.finished,sparks:e.sparks??e.collected??null};
      let h=0;const s=JSON.stringify(snap);for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return{snap,hash:h}})()`, 300000);
    console.log(A.preset || 'url-default', JSON.stringify(r));
  }
} finally { await b.close(); srv.close(); }
