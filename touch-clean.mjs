// Touch devices must never keep a tint after a tap (owner request, 18 Nov 2026). Three things paint a tapped control on a phone:
//  - sticky :hover (the browser keeps the last tapped element "hovered"),
//  - :focus rules that paint a background/outline after the tap,
//  - :active rules that fill the control with colour.
// Rather than rewriting ~60 rules across the sheets, this runs once per stylesheet on a touch device and edits the live rules:
//  :hover selectors are dropped, :focus (not :focus-visible / :focus-within) loses background and outline, :active loses its colour
//  fill and filter (a 1px translate or small darken stays). Mouse and keyboard devices are untouched. touch-clean.css adds the rest.
// The pure part works on any object shaped like a CSSRuleList so tests need no browser.

export const TOUCH_QUERY = '(hover: none), (pointer: coarse)';
const HOVER = /:hover(?![-\w])/, FOCUS = /:focus(?![-\w])/, ACTIVE = /:active(?![-\w])/;
const FOCUS_PROPS = ['background', 'background-color', 'background-image', 'outline', 'outline-color', 'outline-width', 'outline-style', 'box-shadow', 'filter'];
const ACTIVE_PROPS = ['background', 'background-color', 'background-image', 'filter', 'color'];

/** Split a selector list at top-level commas (commas inside :is(), :not() and attribute brackets stay). */
export function splitSelectors(text) {
  const out = []; let depth = 0, quote = '', start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === quote && text[i - 1] !== '\\') quote = ''; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) { out.push(text.slice(start, i).trim()); start = i + 1; }
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

/** Clean one style rule in place. Returns 'deleted', 'edited' or 'kept'. */
export function cleanStyleRule(rule) {
  const selectors = splitSelectors(rule.selectorText || '');
  const kept = selectors.filter(s => !HOVER.test(s));
  if (kept.length !== selectors.length) {
    if (!kept.length) return 'deleted';
    try { rule.selectorText = kept.join(', '); } catch { return 'deleted'; }
    clean(kept, rule);
    return 'edited';
  }
  return clean(selectors, rule);
}
function clean(selectors, rule) {
  let changed = false;
  const strip = props => { for (const p of props) if (rule.style?.getPropertyValue?.(p)) { rule.style.removeProperty(p); changed = true; } };
  if (selectors.some(s => FOCUS.test(s) && !/:focus-visible|:focus-within/.test(s))) strip(FOCUS_PROPS);
  if (selectors.some(s => ACTIVE.test(s))) strip(ACTIVE_PROPS);
  return changed ? 'edited' : 'kept';
}

/** Walk a rule list (recursing into @media / @supports / @layer, not @keyframes or @font-face). Returns counts. */
export function cleanRules(list, counts = {deleted: 0, edited: 0}) {
  if (!list) return counts;
  for (let i = list.length - 1; i >= 0; i--) {
    const rule = list[i];
    if (rule.selectorText !== undefined && rule.style) {
      const r = cleanStyleRule(rule);
      if (r === 'deleted') { try { (rule.parentRule?.deleteRule ? rule.parentRule : rule.parentStyleSheet).deleteRule(i); counts.deleted++; } catch { /* leave it */ } }
      else if (r === 'edited') counts.edited++;
    } else if (rule.cssRules && !/keyframes|font-face/i.test(rule.constructor?.name || rule.type || '')) cleanRules(rule.cssRules, counts);
  }
  return counts;
}

export const isTouchLike = (win = globalThis) => { try { return !!win.matchMedia?.(TOUCH_QUERY).matches; } catch { return false; } };

/** Install once: clean every stylesheet now, as they load, and as new ones are added. No-op on mouse devices. */
export function installTouchClean(win = globalThis) {
  if (win.__touchCleanInstalled || !isTouchLike(win)) return null;
  win.__touchCleanInstalled = true;
  const seen = new WeakSet(), doc = win.document;
  const sweep = () => { for (const sheet of doc.styleSheets) { if (seen.has(sheet)) continue; try { const rules = sheet.cssRules; seen.add(sheet); cleanRules(rules); } catch { /* cross-origin or not loaded yet */ } } };
  sweep();
  doc.addEventListener('DOMContentLoaded', sweep); win.addEventListener('load', sweep);
  const watch = node => { if (node.tagName === 'LINK') node.addEventListener('load', sweep, {once: true}); };
  doc.querySelectorAll('link[rel=stylesheet]').forEach(watch);
  new win.MutationObserver(list => { for (const m of list) m.addedNodes.forEach(n => { if (n.nodeType === 1) { watch(n); if (n.tagName === 'STYLE') sweep(); } }); }).observe(doc.documentElement, {childList: true, subtree: true});
  return sweep;
}
if (typeof window !== 'undefined') installTouchClean(window);
