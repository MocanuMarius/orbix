/* global WISP_OFFLINE */
importScripts('./offline-list.js');
const scope = new URL(self.registration.scope);
const prefix = 'wispbound:' + scope.href + ':';
const cacheName = prefix + WISP_OFFLINE.release + ':' + WISP_OFFLINE.revision;
const files = new Set(WISP_OFFLINE.files.map(file => new URL(file, scope).href));

async function installRelease() {
  const cache = await caches.open(cacheName);
  const pending = Array.from(files).values();
  // Limit simultaneous transfers while the first online game is starting.
  async function download() {
    for (const href of pending) {
      const url = new URL(href);
      url.searchParams.set('v', WISP_OFFLINE.release);
      const response = await fetch(url, {cache: 'reload'});
      if (!response.ok || response.redirected) throw new Error('Offline file unavailable: ' + url.pathname);
      await cache.put(href, response);
    }
  }
  await Promise.all(Array.from({length: 4}, download));
}
self.addEventListener('install', event => event.waitUntil(installRelease()));
// Automatic updates wait until the game closes. Settings can apply a fully
// downloaded update immediately in response to the player's refresh action.
self.addEventListener('message', event => {
  if (event.data?.type === 'activate-build') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => event.waitUntil((async () => {
  const previous = (await caches.keys()).filter(key => key.startsWith(prefix) && key !== cacheName);
  const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  // Another game window can still have a lazy import for the prior release.
  // Keep one matching cache until the next update, without reloading its flight.
  if (windows.filter(client => client.frameType === 'top-level' && client.url.startsWith(scope.href)).length > 1) {
    previous.pop();
  }
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
  // The live local editor serves new source files without a release stamp.
  // Keep it live online while supporting an installed offline local build.
  if (['localhost', '127.0.0.1', '[::1]'].includes(scope.hostname)) {
    event.respondWith(fetch(event.request).then(response =>
      response.ok || response.status < 500 ? response : respond(event.request, url.href, release)
    ).catch(() => respond(event.request, url.href, release)));
  } else event.respondWith(respond(event.request, url.href, release));
});
