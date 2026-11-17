// Small flight diagnostic (owner, 2026-11-18): an FPS number at the top left, updated about twice a second.
// Costs nothing measurable: one counter increment per frame, one text write only when the shown value changes.
// "Show FPS" is stored under its own key (default ON) so the save format stays untouched.
export const FPS_KEY = 'wispbound-show-fps';
export function loadShowFps(storage = globalThis.localStorage) { try { return storage?.getItem?.(FPS_KEY) !== 'off'; } catch { return true; } }
export function saveShowFps(on, storage = globalThis.localStorage) { try { storage?.setItem?.(FPS_KEY, on ? 'on' : 'off'); } catch { /* private mode: keeps the default */ } }

/** Pure averaging: feed frame timestamps (ms); `value` is the whole-number average of the last window, or null before the first. */
export function createFpsMeter({windowMs = 500, maxGapMs = 400} = {}) {
  let start = 0, frames = 0, value = null;
  return {
    get value() { return value; },
    reset() { start = 0; frames = 0; },
    /** Returns the new value when the window closed this frame, else null. */
    frame(now) {
      if (!start || now - start > maxGapMs + windowMs) { start = now; frames = 0; return null; } // first frame, or after a pause
      frames++;
      const span = now - start;
      if (span < windowMs) return null;
      value = Math.round(frames * 1000 / span); start = now; frames = 0;
      return value;
    }
  };
}

export function createFpsCounter(root, {enabled = true} = {}) {
  if (!root) return {frame() {}, setEnabled() {}, destroy() {}};
  const node = root.ownerDocument.createElement('span'), meter = createFpsMeter();
  node.className = 'flight-fps'; node.setAttribute('aria-hidden', 'true'); node.hidden = !enabled;
  (root.querySelector('.canvas-wrap') || root).append(node);
  let shown = null, on = enabled;
  return {
    node, meter,
    frame(now) { if (!on) return; const v = meter.frame(now); if (v !== null && v !== shown) { shown = v; node.textContent = String(v); } },
    setEnabled(next) { on = !!next; node.hidden = !on; meter.reset(); },
    destroy() { node.remove(); }
  };
}
