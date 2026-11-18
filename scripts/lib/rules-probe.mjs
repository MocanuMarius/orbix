// In-page helper for menu-audit.mjs --probe '<selector>' [--props 'regex']: lists the CSS rules matching the element that set those properties.
export function probe(selector, propRe) {
  const e = document.querySelector(selector); if (!e) return 'no element';
  const out = [], re = new RegExp(propRe);
  const walk = (rules, sheet) => { for (const r of rules) {
    if (r.cssRules && !r.selectorText) { walk(r.cssRules, sheet); continue; } if (!r.selectorText) continue;
    let m = false; try { m = e.matches(r.selectorText); } catch (x) {} if (!m) continue;
    const props = []; for (const n of r.style) if (re.test(n)) props.push(n + ':' + r.style.getPropertyValue(n) + (r.style.getPropertyPriority(n) ? '!' : ''));
    if (props.length) out.push((sheet.href || 'inline').split('/').pop() + ' | ' + r.selectorText.slice(0, 160) + ' | ' + props.join('; ').slice(0, 200)); } };
  for (const s of document.styleSheets) { try { walk(s.cssRules, s); } catch (x) {} }
  const cs = getComputedStyle(e);
  return out.join('\n') + '\nCOMPUTED bg=' + cs.backgroundColor + ' img=' + cs.backgroundImage.slice(0, 60) + ' border-image=' + cs.borderImageSource.slice(0, 60) + ' color=' + cs.color + ' pad=' + cs.padding;
}
