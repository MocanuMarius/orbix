// Release packaging: follow the shipped desktop and phone entry points. This
// keeps experimental renderers and unused texture atlases off the device.
//
//   node scripts/pwa-assets.mjs [--dist <folder>]
//
// The offline list is built from the PLAYER entry points only. Developer pages
// (inspectors, previews, proofs, studies, galleries) stay published but are not
// downloaded to a player's device. Every top-level dist/*.html page that is not a
// player entry is a developer page, so a new page is developer-only until it is
// added to PLAYER_ENTRIES on purpose. scripts/release.mjs imports this module to
// classify files for `--allow-dev-page-removal` (see developerOnlyFiles).
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extname, dirname, posix, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

// Pages and assets a player's device can open. Reviewed from handoff.md section 14:
// the product/compatibility pages, the card launchers the worker special-cases,
// and the lazy cache-card-help.css (a root because it is loaded by URL at run time).
export const PLAYER_ENTRIES = [
  'index.html', 'game.html', 'cards.html', 'card-workbench.html', 'loading.html', 'first-light.html',
  'scorecard.html', 'nature-credits.html', 'preview.html', 'combo-lesson.html', 'cache-card-help.css',
  // tutorial-visuals.mjs picks reel-near.png or reel-front.png inside a template literal, which the
  // reference scan cannot follow (reel-front.png is reached through card-terms.mjs).
  'assets/previews/collector-tether/reel-near.png'
];
// Explicit asset roots of the old developer comparison pages. They are only listed
// here so the classifier can name what the cleanup removed; they are not cached.
export const DEVELOPER_ASSET_ENTRIES = [
  'assets/previews/terrain-light-comparison.png', 'assets/previews/pixelation-deck.webp', 'assets/previews/pixelation-flight.webp',
  'assets/help/collector-orbit.webp', 'assets/help/collector-fetch.webp',
  'assets/previews/collector-tether/after.mp4', 'assets/previews/collector-tether/before.mp4', 'assets/previews/collector-tether/capture-notes.json',
  'assets/previews/collector-tether/reel-back.png', 'assets/previews/collector-tether/reel-front.png',
  'assets/previews/collector-tether/reel.mp4', 'assets/previews/collector-tether/wake-first-paint-without.png', 'assets/previews/collector-tether/wake-first-paint.png',
  'assets/previews/collector-tow/acceleration-comparison.mp4', 'assets/previews/collector-tow/capture-notes.json',
  'assets/previews/travel-guide/three-guides.png'
];

const toUrl = dist => dist instanceof URL ? dist : pathToFileURL(resolve(String(dist)) + '/');

export async function buildGraph(distInput, entries) {
  const dist = toUrl(distInput), files = new Set(), hash = createHash('sha256');
  const game = await readFile(new URL('game.html', dist), 'utf8');
  const release = /src="app\.mjs\?v=([^"]+)"/.exec(game)?.[1];
  if (!release) throw new Error('Expected a release stamp on the game entry module');
  async function visit(file) {
    if (files.has(file)) return;
    files.add(file);
    const data = await readFile(new URL(file, dist));
    hash.update(file).update(data);
    const ext = extname(file);
    if (!['.html', '.mjs', '.js', '.css', '.webmanifest'].includes(ext)) return;
    const source = data.toString();
    let refs = [];
    if (ext === '.html') refs = [...source.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
    if (ext === '.mjs' || ext === '.js') {
      refs = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']+)["']/g)].map(match => match[1]);
      refs.push(...[...source.matchAll(/["'`]((?:\.\/)?assets\/[\w./-]+\.(?:mp3|mp4|png|svg|ttf|webp|jpg))["'`]/g)].map(match => match[1]));
    }
    if (ext === '.css') refs = [...source.matchAll(/url\(\s*["']?([^)'"]+)["']?\s*\)/g)].map(match => match[1]);
    if (ext === '.webmanifest') refs = JSON.parse(source).icons.map(icon => icon.src);
    for (const ref of refs) {
      if (/^[a-z]+:|^#|^\/\//i.test(ref)) continue;
      // Links back to the game's root refer to its cached index document.
      const path = ref.split(/[?#]/)[0];
      const relative = path.endsWith('/') ? path + 'index.html' : path;
      if (relative) await visit(posix.normalize(posix.join(dirname(file).replaceAll('\\', '/'), relative)));
    }
  }
  for (const entry of entries) await visit(entry);
  return {release, revision: hash.digest('hex').slice(0, 12), files: [...files].sort()};
}

export const playerGraph = distInput => buildGraph(distInput, PLAYER_ENTRIES);

// Developer entry points: every top-level page that is not a player entry, plus the
// explicit asset roots above that exist in this dist.
export async function developerEntries(distInput) {
  const dist = toUrl(distInput), pages = (await readdir(dist)).filter(f => f.endsWith('.html') && !PLAYER_ENTRIES.includes(f)).sort();
  const assets = [];
  for (const f of DEVELOPER_ASSET_ENTRIES) { try { await readFile(new URL(f, dist)); assets.push(f); } catch {} }
  return [...pages, ...assets];
}

// Files that only developer entry points can reach: the reviewed classification
// behind `release.mjs --allow-dev-page-removal`.
export async function developerOnlyFiles(distInput) {
  const player = new Set((await playerGraph(distInput)).files);
  const everything = await buildGraph(distInput, [...PLAYER_ENTRIES, ...await developerEntries(distInput)]);
  return everything.files.filter(f => !player.has(f));
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === resolve(fileURLToPath(import.meta.url)).toLowerCase()) {
  const arg = process.argv.indexOf('--dist');
  const dist = toUrl(arg > 0 ? process.argv[arg + 1] : fileURLToPath(new URL('../dist/', import.meta.url)));
  const list = await playerGraph(dist);
  await writeFile(new URL('offline-list.js', dist), '// Generated by scripts/pwa-assets.mjs.\nconst WISP_OFFLINE = ' + JSON.stringify(list, null, 2) + ';\n');
  console.log(list.files.length + ' offline files · ' + list.release + ' · ' + list.revision);
}
