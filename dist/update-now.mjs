// "Update now": the owner's phone did not always pick up new builds on its own, so the player can force it. It removes this app's service
// workers and every Cache Storage cache, then reloads from the network. Saves (localStorage, IndexedDB) are never touched.
//
// Version check: `offline-list.js` is generated at release and is NOT in the service worker's own file list, so a fetch for it always
// reaches the network even when an old worker is serving the page (build-version.mjs, by contrast, is served from the old cache and
// would keep reporting the old label). Everything here takes its window/fetch as arguments so it is tested without a browser.

export const VERSION_FILE = 'offline-list.js';

/** `release` and `revision` out of the generated offline-list.js text, or null. */
export function parseOfflineList(text) {
  const release = /"release"\s*:\s*"([^"]+)"/.exec(String(text || ''))?.[1], revision = /"revision"\s*:\s*"([^"]+)"/.exec(String(text || ''))?.[1];
  return release ? {release, revision: revision || null} : null;
}
/** Newer (different) release than the one running? An unreadable answer is never "available". */
export const updateAvailable = (running, remote) => Boolean(running && remote?.release && remote.release !== running);

/** Same page, plus a throwaway query so no HTTP cache entry can answer the reload. Other parameters stay. */
export function cacheBustedUrl(href, now = Date.now()) {
  const url = new URL(href); url.searchParams.set('_u', String(now)); url.hash = ''; return url.href;
}

/** Ask the network (never any cache) which release is published. Resolves {release, revision} or null (offline, error, unreadable). */
export async function fetchPublishedVersion({fetchFn = globalThis.fetch, base = globalThis.location?.href, now = Date.now()} = {}) {
  try {
    const url = new URL(VERSION_FILE, base); url.searchParams.set('_u', String(now));
    const response = await fetchFn(url.href, {cache: 'no-store'});
    return response?.ok ? parseOfflineList(await response.text()) : null;
  } catch { return null; }
}

/**
 * Unregister every service worker of this origin's app scope, delete every cache, reload from the network.
 * Returns {ok:false, reason:'No connection'} without touching anything when offline; {ok:true} once the reload has been requested.
 * `win` is the page window (navigator, caches, location); `onState` hears 'updating'.
 */
export async function updateNow({win = globalThis, onState = () => {}, now = Date.now()} = {}) {
  if (win.navigator?.onLine === false) return {ok: false, reason: 'No connection'};
  // Prove the network answers before deleting the offline copy: a failed reload after the caches are gone would leave nothing to start from.
  if (!await fetchPublishedVersion({fetchFn: win.fetch?.bind(win), base: win.location.href, now})) return {ok: false, reason: 'No connection'};
  onState('updating');
  try {
    const regs = (await win.navigator?.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map(r => r.unregister().catch(() => false)));
  } catch { /* no service worker support */ }
  try {
    const names = (await win.caches?.keys?.()) || [];
    await Promise.all(names.map(name => win.caches.delete(name)));
  } catch { /* no Cache Storage */ }
  const target = cacheBustedUrl(win.location.href, now);
  try { await win.fetch?.(target, {cache: 'reload'}); } catch { /* the reload below decides; offline start still works from the HTTP cache */ }
  win.location.replace(target);
  return {ok: true, target};
}
