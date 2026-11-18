// First-visit "Play fullscreen?" question for phones (owner decision, 18 Nov 2026): ask once, on the Home screen, never in flight and
// never inside a tutorial lesson. The answer is a per-device setting kept in its own storage key (not in the save: fullscreen suits
// a device, and a corrupt or reset save must not make the game ask again). Settings has a permanent entry for both actions.
// Everything here is pure or takes the window/storage it needs, so it is tested without a browser (tests/display-prompt.test.mjs).

export const DISPLAY_PROMPT_KEY = 'wispbound.display-prompt.v1';
export const DISPLAY_ANSWERS = Object.freeze(['fullscreen', 'install', 'later']);

/** The remembered answer, or null when the player was never asked. Storage that throws or holds junk counts as never asked. */
export function readDisplayAnswer(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem?.(DISPLAY_PROMPT_KEY) || 'null')?.answer;
    return DISPLAY_ANSWERS.includes(value) ? value : null;
  } catch { return null; }
}
/** Remember an answer. Returns false when storage refuses (the question may then be asked again next visit, which is harmless). */
export function writeDisplayAnswer(answer, storage = globalThis.localStorage) {
  if (!DISPLAY_ANSWERS.includes(answer)) return false;
  try { storage.setItem(DISPLAY_PROMPT_KEY, JSON.stringify({answer, at: Date.now()})); return true; } catch { return false; }
}

/** A touch phone or tablet: the primary pointer is coarse, or the device reports touch points. */
export function isTouchDevice(win = globalThis) {
  try { if (win.matchMedia?.('(pointer: coarse)').matches) return true; } catch { /* no matchMedia */ }
  return Number(win.navigator?.maxTouchPoints) > 0;
}
/** Already installed (standalone/fullscreen display mode, or iOS standalone) or already fullscreen. */
export function isImmersive(win = globalThis) {
  try {
    const queries = ['(display-mode: standalone)', '(display-mode: fullscreen)', '(display-mode: minimal-ui)'];
    if (queries.some(q => win.matchMedia?.(q).matches)) return true;
  } catch { /* no matchMedia */ }
  return Boolean(win.navigator?.standalone || win.document?.fullscreenElement);
}
export const canGoFullscreen = (win = globalThis) => Boolean(win.document?.documentElement?.requestFullscreen);

/**
 * Whether to show the question now.
 * `screen`: the current screen name (only 'home'); `engine`: a flight is running; `lessonActive`: a tutorial lesson or practice run
 * is on; `sheetOpen`: another dialog is already up. All are checked here so the caller only passes facts.
 */
export function shouldAskDisplay({touch, immersive, answer, screen, engine = false, lessonActive = false, sheetOpen = false, secure = true, fullscreenAvailable = true} = {}) {
  if (answer) return false;                       // asked once, never again
  if (!touch || immersive) return false;          // desktop, or already installed/fullscreen
  if (screen !== 'home' || engine || lessonActive || sheetOpen) return false;
  return secure && fullscreenAvailable;           // a browser with no fullscreen has nothing to offer
}

/** Go fullscreen and ask for landscape where the browser allows it. Resolves true when the page is fullscreen. */
export async function enterFullscreen(win = globalThis) {
  const root = win.document?.documentElement;
  try {
    if (!win.document?.fullscreenElement && root?.requestFullscreen) await root.requestFullscreen();
    // Locking the orientation needs fullscreen on most browsers; a refusal is fine, the rotate screen still works.
    try { await win.screen?.orientation?.lock?.('landscape'); } catch { /* not supported */ }
    return Boolean(win.document?.fullscreenElement);
  } catch { return false; }
}

/** Markup for the one-time dialog (rendered with openSheet). "Install app" appears only when the browser offered an install. */
export function displayPromptMarkup({canInstall = false} = {}) {
  return `<h2>Play fullscreen?</h2><p class="display-prompt-note">Fullscreen hides the browser bars and locks the game to landscape. You can change this later in Settings.</p>`
    + `<div class="display-prompt-actions"><button class="primary" data-action="display-fullscreen">Fullscreen</button>`
    + (canInstall ? `<button data-action="display-install">Install app</button>` : '')
    + `<button data-action="display-later">Not now</button></div>`;
}
