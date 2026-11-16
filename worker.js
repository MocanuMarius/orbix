/* global WISP_OFFLINE */
importScripts('./offline-list.js');
const scope = new URL(self.registration.scope);
const prefix = 'wispbound:' + scope.href + ':';
const cacheName = prefix + WISP_OFFLINE.release + ':' + WISP_OFFLINE.revision;
const files = new Set(WISP_OFFLINE.files.map(file => new URL(file, scope).href));

async function installRelease() {
  const alreadyCached = (await caches.keys()).includes(cacheName);
  const cache = await caches.open(cacheName);
  let failed = false;
  const pending = Array.from(files).values();
  // Limit simultaneous transfers while the first online game is starting.
  async function download() {
    for (const href of pending) {
      if (failed) return;
      const url = new URL(href);
      url.searchParams.set('v', WISP_OFFLINE.release);
      const response = await fetch(url, {cache: 'reload'});
      if (!response.ok || response.redirected) throw new Error('Offline file unavailable: ' + url.pathname);
      await cache.put(href, response);
    }
  }
  const downloads = Array.from({length: 4}, () => download().catch(error => { failed = true; throw error; }));
  try { await Promise.all(downloads); }
  catch (error) {
    await Promise.allSettled(downloads);
    // A failed download must not masquerade as the previous complete release
    // during the next upgrade. An identical existing cache remains usable.
    if (!alreadyCached) await caches.delete(cacheName);
    throw error;
  }
}
self.addEventListener('install', event => event.waitUntil(installRelease()));
// The page applies a fully downloaded update automatically at a safe game
// checkpoint. An active or paused flight keeps its current worker until then.
self.addEventListener('message', event => {
  if (event.data?.type === 'activate-build') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => event.waitUntil((async () => {
  const previous = (await caches.keys()).filter(key => key.startsWith(prefix) && key !== cacheName);
  // An already-open launcher checks its own release after activating an update.
  // Other windows can also still request a prior lazy import. Keep exactly the
  // immediately previous cache until the next upgrade, then discard older ones.
  previous.pop();
  for (const key of previous) await caches.delete(key);
  await self.clients.claim();
})()));

async function respond(request, key, release) {
  let name = cacheName;
  if (release && release !== WISP_OFFLINE.release && request.mode !== 'navigate') {
    const retained = (await caches.keys()).filter(candidate => candidate.startsWith(prefix + release + ':'));
    if (retained.length) name = retained[retained.length - 1];
  }
  const cache = await caches.open(name);
  const response = await cache.match(key);
  if (!response) return fetch(request);
  // A cancelled image decode can keep Chromium's CacheStorage response stream
  // alive across navigation and block a waiting worker from taking over. Read
  // these small static images fully so their returned body owns its bytes.
  if (request.destination === 'image') return new Response(await response.arrayBuffer(), {
    status: response.status, statusText: response.statusText, headers: response.headers
  });
  const range = request.headers.get('Range');
  if (!range || !key.endsWith('.mp3')) return response;
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!match) return fetch(request);
  const blob = await response.blob();
  const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), blob.size - 1) : blob.size - 1;
  if (start > end) return new Response(null, {status: 416, headers: {'Content-Range': 'bytes */' + blob.size}});
  return new Response(blob.slice(start, end + 1), {status: 206, headers: {
    'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes',
    'Content-Range': 'bytes ' + start + '-' + end + '/' + blob.size,
    'Content-Length': String(end - start + 1)
  }});
}
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const release = url.searchParams.get('v');
  url.search = '';
  url.hash = '';
  if (url.pathname === scope.pathname) url.pathname += 'index.html';
  if (!files.has(url.href) && !(release && release !== WISP_OFFLINE.release && event.request.mode !== 'navigate')) return;
  // Launchers must learn about a newer release even when their old pathname
  // is cached. The rest of an installed game stays on its complete release.
  if (event.request.mode === 'navigate' && ['cards.html', 'card-workbench.html'].some(file => url.href === new URL(file, scope).href)) {
    event.respondWith(fetch(event.request).then(response => response.ok ? response : respond(event.request, url.href, release))
      .catch(() => respond(event.request, url.href, release)));
    return;
  }
  // The live local editor serves new source files without a release stamp.
  // Keep it live online while supporting an installed offline local build.
  if (['localhost', '127.0.0.1', '[::1]'].includes(scope.hostname)) {
    event.respondWith(fetch(event.request).then(response =>
      response.ok || response.status < 500 ? response : respond(event.request, url.href, release)
    ).catch(() => respond(event.request, url.href, release)));
  } else event.respondWith(respond(event.request, url.href, release));
});
