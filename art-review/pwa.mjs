// Chrome delivers its install event to the top-level document. The desktop
// viewport and its game frame therefore share one installation state.
let host = window;
try {
  if (window.parent.location.origin === location.origin) host = window.parent;
} catch { /* External embeds handle their own installation. */ }

const appRoot = new URL('./', import.meta.url);
const key = 'wispboundInstallation:' + appRoot.href;
const installation = host[key] ??= { registration: null, prompt: null, installed: false };
const changeEvent = key + ':change';
function notify() { host.dispatchEvent(new host.Event(changeEvent)); }
export function onInstallationChange(listener) { host.addEventListener(changeEvent, listener); }
if (!installation.started && host.isSecureContext) {
  installation.started = true;
  host.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installation.prompt = event;
    notify();
  });
  host.addEventListener('appinstalled', () => {
    installation.installed = true;
    installation.prompt = null;
    notify();
  });
  if ('serviceWorker' in host.navigator) {
    let lastCheck = 0;
    const checkForRelease = () => {
      const registration = installation.registration;
      const standalone = host.matchMedia('(display-mode: standalone)').matches || host.navigator.standalone;
      if (!registration?.active || registration.waiting || !standalone || host.document.hidden
        || !host.navigator.onLine || Date.now() - lastCheck < 15 * 60_000) return;
      lastCheck = Date.now();
      registration.update().catch(() => {});
    };
    const register = () => host.navigator.serviceWorker
      .register(new URL('worker.js', appRoot), { scope: appRoot.href, updateViaCache: 'none' })
      .then(registration => {
        installation.registration = registration;
        const watchWorker = () => registration.installing?.addEventListener('statechange', notify);
        registration.addEventListener('updatefound', watchWorker);
        watchWorker();
        notify();
        checkForRelease();
        host.document.addEventListener('visibilitychange', checkForRelease);
        host.addEventListener('pageshow', checkForRelease);
      })
      .catch(() => { /* Playing online remains available with storage disabled. */ });
    if (host.document.readyState === 'complete') register();
    else host.addEventListener('load', register, {once: true});
  }
}

export function installationState() {
  const standalone = host.matchMedia('(display-mode: standalone)').matches || host.navigator.standalone;
  const installed = Boolean(installation.installed || standalone);
  const offline = installation.registration?.active?.state === 'activated';
  const updateReady = Boolean(installation.registration?.waiting);
  return { installed, offline, updateReady, canPrompt: !installed && Boolean(installation.prompt) };
}

// Registration.update() resolves before the replacement has necessarily
// finished downloading its offline files. Activate only an installed worker.
function waitForWorker(worker, states) {
  return new Promise(resolve => {
    function finish(ready) {
      worker.removeEventListener('statechange', changed);
      clearTimeout(timeout);
      resolve(ready);
    }
    function changed() {
      if (states.includes(worker.state)) finish(true);
      else if (worker.state === 'redundant') finish(false);
    }
    const timeout = setTimeout(() => finish(false), 60_000);
    worker.addEventListener('statechange', changed);
    changed();
  });
}

export async function refreshBuild(beforeReload) {
  const service = host.navigator.serviceWorker;
  const registration = installation.registration ?? await service?.getRegistration(appRoot.href);
  let next = registration?.waiting;
  if (!next && !host.navigator.onLine) return 'Offline';
  if (registration && !next) {
    const active = registration.active;
    await registration.update();
    next = registration.waiting ?? registration.installing;
    if (next && !await waitForWorker(next, ['installed','activating','activated'])) return 'Download incomplete';
    if (!active && next) {
      if (!await waitForWorker(next,['activated'])) return 'Download incomplete';
      next = null;
    }
  }
  if (next) {
    next.postMessage({type:'activate-build'});
    if (!await waitForWorker(next,['activated'])) return 'Update still pending';
  } else {
    const local = ['localhost','127.0.0.1','[::1]'].includes(appRoot.hostname);
    if (registration && !local) return 'Build is current';
    const response = await fetch(new URL('index.html', appRoot), {cache:'no-store'});
    if (!response.ok) return 'Update unavailable';
  }
  beforeReload();
  host.location.reload();
  return 'Reloading…';
}

export async function requestInstall() {
  const prompt = installation.prompt;
  installation.prompt = null;
  if (!prompt) return;
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch { /* A dismissed or unavailable browser prompt returns to the game. */ }
}

export function installationInstructions() {
  if (/iPad|iPhone|iPod/.test(host.navigator.userAgent) ||
      (host.navigator.platform === 'MacIntel' && host.navigator.maxTouchPoints > 1)) {
    return 'In Safari, tap Share, then Add to Home Screen. Turn on Open as Web App if asked.';
  }
  if (/Android/.test(host.navigator.userAgent)) {
    return 'Open your browser menu (⋮) and choose Install app or Add to Home screen.';
  }
  return 'In Chrome or Edge, use the install icon in the address bar or choose Install from the browser menu. On a Mac, Safari also offers File → Add to Dock.';
}
