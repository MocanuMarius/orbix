export const CAPTURE_STYLES = Object.freeze([
  { id: 'undertow', name: 'Undertow' },
  { id: 'ribbon', name: 'Ribbon' },
  { id: 'split', name: 'Twin current' }
]);

const key = 'wispbound.captureStyle';
const known = id => CAPTURE_STYLES.some(style => style.id === id);

export function readCaptureStyle() {
  try {
    const id = globalThis.localStorage?.getItem(key);
    if (known(id)) return id;
  } catch { /* Storage may be disabled in a private browser. */ }
  return CAPTURE_STYLES[0].id;
}

export function saveCaptureStyle(id) {
  if (!known(id)) return false;
  try {
    globalThis.localStorage.setItem(key,id);
    return true;
  } catch {
    return false;
  }
}
