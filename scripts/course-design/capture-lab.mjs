// Capture the v2.0-courses lab page and an in-game frame of each new course
// with headless Chrome (throwaway profile). Needs the server: PORT=4301 node server.mjs
//   node scripts/course-design/capture-lab.mjs [--port=4301]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chrome, until, delay } from '../browser-probe.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const port = Number(args.port || 4301), dir = path.join(root, 'outputs/course-design/v2.0'); fs.mkdirSync(dir, { recursive: true });
const b = await chrome();
try {
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await b.visit(`http://127.0.0.1:${port}/design-lab/courses.html`);
  await until(() => b.ev(`document.querySelector('#status')?.textContent.includes('courses built')||document.querySelector('#status')?.textContent.startsWith('Error')`), 'lab', 600);
  const status = await b.ev(`document.querySelector('#status').textContent`);
  const sections = await b.ev(`[...document.querySelectorAll('.cl-course')].map(n=>n.getBoundingClientRect().top+scrollY)`);
  for (const [k, top] of sections.entries()) { await b.ev(`scrollTo(0,${Math.round(top) - 6})`); await delay(150); await b.shot(path.join(dir, `lab-course-${k + 1}.png`)); }
  for (const id of ['key', 'plan']) { await b.ev(`document.querySelector('#${id}').scrollIntoView()`); await delay(150); await b.shot(path.join(dir, `lab-${id}.png`)); }
  // Phone width: the page must not scroll sideways (strips scroll inside their boxes).
  await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await b.ev('scrollTo(0,0)'); await delay(300);
  const overflow = await b.ev('document.documentElement.scrollWidth>innerWidth+1');
  await b.shot(path.join(dir, 'lab-phone.png'));
  console.log(JSON.stringify({ status, courses: sections.length, phoneHorizontalOverflow: overflow, errors: b.errors, badResponses: b.badResponses }, null, 1));
} finally { b.close(); }
