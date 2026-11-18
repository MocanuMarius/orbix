// Shared by contrast-check.mjs and menu-audit.mjs: in-page text collection and pixel-sampled contrast measurement.
// What the player sees is the ground truth: collect each visible text box with its computed colour, take a screenshot, and read the
// dominant non-text colour behind the box from the pixels. Pixels with no dominant colour (a picture, a gradient) are skipped and counted.
export const COLLECT = `(() => {
  const parse = c => { const p = (c.match(/[0-9.]+/g) || []).map(Number); return p.length < 3 ? null : {r: p[0], g: p[1], b: p[2], a: p[3] ?? 1}; };
  const sel = e => { const parts = []; for (let n = e; n && n.nodeType === 1 && parts.length < 3; n = n.parentElement) parts.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : '')); return parts.join(' < '); };
  const items = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    const text = node.textContent.trim(); if (!text) continue;
    const el = node.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const r = document.createRange(); r.selectNodeContents(node); const box = r.getBoundingClientRect();
    if (box.width < 2 || box.height < 2 || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) continue;
    let opacity = 1, hidden = false;
    for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') { hidden = true; break; } opacity *= Number(s.opacity); }
    if (hidden || opacity < .05) continue;
    const cx = Math.min(innerWidth - 1, Math.max(0, box.left + box.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2));
    const top = document.elementFromPoint(cx, cy);
    if (top && !el.contains(top) && !top.contains(el)) continue; // covered by something else: not what the player reads
    if (el.closest('button:disabled,[aria-disabled=true]')) continue; // inactive controls are exempt from contrast rules
    const closed = el.closest('details:not([open])'); if (closed && !el.closest('summary')) continue; // folded away
    let clipped = false;
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n); if (o.overflow !== 'visible' || o.overflowX !== 'visible' || o.overflowY !== 'visible') { const b = n.getBoundingClientRect(); if (box.bottom > b.bottom + 1 || box.top < b.top - 1 || box.right > b.right + 1 || box.left < b.left - 1) { clipped = true; break; } } }
    if (clipped) continue; // scrolled out of its own box: not on screen
    const cs = getComputedStyle(el), fg = parse(cs.color); if (!fg) continue;
    items.push({cstr: cs.color, selector: sel(el), text: text.slice(0, 40), fg, opacity, size: parseFloat(cs.fontSize), x: Math.max(0, Math.floor(box.left)), y: Math.max(0, Math.floor(box.top)), w: Math.ceil(Math.min(box.width, innerWidth - box.left)), h: Math.ceil(Math.min(box.height, innerHeight - box.top))});
  }
  return items;
})()`;
export const SAMPLE = (b64, items) => `(async () => {
  const img = new Image(); img.src = 'data:image/png;base64,${b64}'; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d', {willReadFrequently: true}); cx.drawImage(img, 0, 0);
  const items = ${JSON.stringify(items)};
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const low = [], seen = new Set(); let skipped = 0, checked = 0;
  for (const it of items) {
    const d = cx.getImageData(it.x, it.y, Math.max(1, it.w), Math.max(1, it.h)).data, buckets = new Map(); let n = 0;
    for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4; const b = buckets.get(k) || {c: 0, r: 0, g: 0, b: 0}; b.c++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; buckets.set(k, b); n++; }
    const fgc = [it.fg.r, it.fg.g, it.fg.b];
    const sorted = [...buckets.values()].map(b => ({c: b.c, rgb: [b.r / b.c, b.g / b.c, b.b / b.c]})).sort((a, b) => b.c - a.c);
    // Skip the bucket that is the text itself (close to its colour) when something else is also present.
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 40;
    let bg = sorted.find(s => !near(s.rgb, fgc)) || sorted[0];
    const share = (sorted.filter(s => Math.hypot(s.rgb[0] - bg.rgb[0], s.rgb[1] - bg.rgb[1], s.rgb[2] - bg.rgb[2]) < 40).reduce((a, s) => a + s.c, 0)) / n;
    if (share < .45) { skipped++; continue; }
    const a = it.fg.a * it.opacity, col = [0, 1, 2].map(i => fgc[i] * a + bg.rgb[i] * (1 - a));
    checked++;
    const need = it.size >= 24 ? 3 : 4.5, r = ratio(col, bg.rgb);
    if (r < need) { const key = it.selector + '|' + it.text.slice(0, 20); if (seen.has(key)) continue; seen.add(key); low.push({raw: it.cstr + ' ' + it.fg.r + ',' + it.fg.g + ',' + it.fg.b + ',' + it.fg.a + ',' + it.opacity, selector: it.selector, text: it.text, fg: hex(col), bg: hex(bg.rgb), ratio: Math.round(r * 100) / 100, size: it.size}); }
  }
  return {low, skipped, checked};
})()`;

