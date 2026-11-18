const release = 'seven-1';
const button = document.querySelector('#launch'), status = document.querySelector('#status');
const root = new URL('./', location.href), target = new URL('index.html', root);
const query = new URLSearchParams(location.search);
for (const key of ['collectorArt', 'display', 'zoom']) if (query.has(key)) target.searchParams.set(key, query.get(key));
if (document.body.dataset.cardWorkbench === 'true' || query.get('mock') === 'cards') target.searchParams.set('mock', 'cards');
target.searchParams.set('cards', '1');
target.searchParams.set('v', release);
const open = () => location.replace(target.href);
async function offlineReady() {
  try {
    for (const name of (await caches.keys()).filter(name => name.startsWith('wispbound:' + root.href + ':' + release + ':'))) {
      const cache = await caches.open(name);
      if (await cache.match(new URL('index.html', root).href) && await cache.match(new URL('game.html', root).href)) return true;
    }
  } catch {}
  return false;
}
function waitFor(worker, states) {
  return new Promise((resolve, reject) => {
    const finish = error => { clearTimeout(timer); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); };
    const changed = () => { if (states.includes(worker.state)) finish(); else if (worker.state === 'redundant') finish(Error('The update was interrupted.')); };
    const timer = setTimeout(() => finish(Error('The download is taking longer than expected.')), 120000);
    worker.addEventListener('statechange', changed); changed();
  });
}
async function launch() {
  if (button.disabled) return;
  if (!navigator.onLine) {
    if (await offlineReady()) { open(); return; }
    status.textContent = 'Connect to the internet to prepare the card playtest, then try again. Your saved journeys are kept.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Preparing the latest game… This can take a moment on the first visit.';
  try {
    if (!('serviceWorker' in navigator) || !isSecureContext) { open(); return; }
    const registration = await navigator.serviceWorker.register(new URL('worker.js', root), { scope: root.href, updateViaCache: 'none' });
    await registration.update();
    const next = registration.waiting ?? registration.installing;
    if (next) {
      await waitFor(next, ['installed', 'activating', 'activated']);
      if (next.state === 'installed') { status.textContent = 'The card playtest is ready. Opening…'; next.postMessage({ type: 'activate-build' }); }
      await waitFor(next, ['activated']);
    } else if (!registration.active) throw Error('The game is still preparing.');
    if (!await offlineReady()) throw Error('The card playtest update is not ready.');
    open();
  } catch {
    button.disabled = false;
    button.textContent = 'Try again';
    status.textContent = navigator.onLine ? 'The card playtest could not finish preparing. Keep this page open and try again. Your saved journeys are kept.' : 'The connection was lost. Reconnect, then try again. Your saved journeys are kept.';
  }
}
button.addEventListener('click', launch);
if (document.body.dataset.cardWorkbench === 'true') launch();
else if (!navigator.onLine) offlineReady().then(ready => { status.textContent = ready ? 'Your offline copy is ready. Open the playtest menu, then choose New Game or Continue.' : 'Connect to the internet to prepare the card playtest. Your saved journeys are kept.'; });
