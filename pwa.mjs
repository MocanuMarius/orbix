// Chrome delivers its install event to the top-level document. The desktop
// viewport and its game frame therefore share one installation state.
let host = window;
try {
  if (window.parent.location.origin === location.origin) host = window.parent;
} catch { /* External embeds handle their own installation. */ }

const appRoot = new URL('./', import.meta.url);
const key = 'wispboundInstallation:' + appRoot.href;
const installation = host[key] ??= { registration: null, prompt: null, installed: false };
installation.clients ??= new Map();
const changeEvent = key + ':change';
function notify() { host.dispatchEvent(new host.Event(changeEvent)); }
export function onInstallationChange(listener) { host.addEventListener(changeEvent, listener); }
const local = ['localhost','127.0.0.1','[::1]'].includes(appRoot.hostname);

// The shell and same-origin game frame share one coordinator. Only the game
// registers a safety contract: the shell cannot decide whether a flight ended.
export function registerUpdateClient({canReload, beforeReload}) {
  installation.clients.set(window, {document, canReload, beforeReload});
  updateCheckpoint();
  return () => installation.clients.delete(window);
}
export function updateCheckpoint() {
  if (installation.checkpointQueued || installation.saving) return;
  installation.checkpointQueued = true;
  queueMicrotask(() => {
    installation.checkpointQueued = false;
    applyReadyUpdate();
  });
}
function safeClients() {
  const clients = [];
  for (const [clientWindow, client] of installation.clients) {
    try {
      if (clientWindow.closed || clientWindow.document !== client.document) {
        installation.clients.delete(clientWindow);
        continue;
      }
      if (!client.canReload()) return null;
      clients.push(client);
    } catch { return null; }
  }
  return clients.length ? clients : null;
}
function applyReadyUpdate() {
  if (installation.reloading || host.document.hidden) return;
  const waiting = installation.registration?.waiting;
  if (!installation.reloadPending && !waiting) return;
  const clients = safeClients();
  if (!clients) return;
  if (waiting && installation.activating !== waiting) {
    installation.activating = waiting;
    waiting.postMessage({type:'activate-build'});
  }
  if (!installation.reloadPending) return;
  // A failed save leaves the running game intact, including its current run.
  // A later successful checkpoint or foreground event can retry safely.
  try {
    installation.saving = true;
    if (!clients.every(client => client.beforeReload() === true)) return;
  } catch { return; }
  finally { installation.saving = false; }
  installation.reloading = true;
  host.location.reload();
}
// A disposable flight comparison stays online and never installs a second PWA.
const flightComparison = new URLSearchParams(location.search).get('mock') === 'boundary';
if (!flightComparison && !installation.started && host.isSecureContext) {
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
    let hadController = Boolean(host.navigator.serviceWorker.controller);
    host.navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Claiming a first install supplies offline support without restarting
      // the game the player has just opened.
      if (hadController) installation.reloadPending = true;
      hadController = Boolean(host.navigator.serviceWorker.controller);
      notify();
      updateCheckpoint();
    });
    const register = () => host.navigator.serviceWorker
      .register(new URL('worker.js', appRoot), { scope: appRoot.href, updateViaCache: 'none' })
      .then(registration => {
        installation.registration = registration;
        const changed = () => { notify(); updateCheckpoint(); };
        const watchWorker = () => registration.installing?.addEventListener('statechange', changed);
        registration.addEventListener('updatefound', watchWorker);
        watchWorker();
        notify();
        checkForRelease(true);
        updateCheckpoint();
      })
      .catch(() => { /* Playing online remains available with storage disabled. */ });
    if (host.document.readyState === 'complete') register();
    else host.addEventListener('load', register, {once: true});
  }
  const foreground = () => { checkForRelease(true); checkLocalRevision(); updateCheckpoint(); };
  host.document.addEventListener('visibilitychange', foreground);
  host.addEventListener('pageshow', foreground);
  host.addEventListener('online', foreground);
  host.setInterval(() => { checkForRelease(); updateCheckpoint(); }, 60_000);
  if (local) {
    checkLocalRevision();
    host.setInterval(checkLocalRevision, 5_000);
  }
}

async function checkForRelease(force = false) {
  const registration = installation.registration;
  if (!registration || host.document.hidden || !host.navigator.onLine || installation.checking
    || (!force && Date.now() - (installation.lastCheck || 0) < 60_000)) return;
  installation.lastCheck = Date.now();
  installation.checking = true;
  try { await registration.update(); }
  catch { /* Offline or incomplete downloads keep the complete current build. */ }
  finally { installation.checking = false; updateCheckpoint(); }
}

async function checkLocalRevision() {
  if (!local || host.document.hidden || !host.navigator.onLine || installation.checkingLocal) return;
  installation.checkingLocal = true;
  try {
    const response = await host.fetch(new URL('/__dev-revision', appRoot), {cache:'no-store'});
    if (!response.ok) return;
    const {revision} = await response.json();
    if (typeof revision !== 'string' || !revision) return;
    if (installation.localRevision && installation.localRevision !== revision) {
      installation.reloadPending = true;
      notify();
    }
    installation.localRevision = revision;
    updateCheckpoint();
  } catch { /* Other local servers need no revision endpoint. */ }
  finally { installation.checkingLocal = false; }
}

export function installationState() {
  const standalone = host.matchMedia('(display-mode: standalone)').matches || host.navigator.standalone;
  const installed = Boolean(installation.installed || standalone);
  const offline = installation.registration?.active?.state === 'activated';
  const updateReady = Boolean(installation.registration?.waiting || installation.reloadPending);
  return { installed, offline, updateReady, canPrompt: !installed && Boolean(installation.prompt) };
}

// Optional Advanced diagnostic; normal play uses the automatic coordinator.
export async function refreshBuild() {
  await Promise.all([checkForRelease(true), checkLocalRevision()]);
  updateCheckpoint();
  if (installation.reloadPending || installation.registration?.waiting) return 'Updates automatically at the next safe checkpoint';
  if (installation.registration?.installing) return 'Downloading the latest build automatically…';
  return host.navigator.onLine ? 'Automatic updates are on · build is current' : 'Offline · updates resume when online';
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
