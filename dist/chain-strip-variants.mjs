// In-flight Chain strip, look variants B, C and D (owner review; codes v1.1-strip-B / -C / -D in docs/design-versions.md).
// Variant A (hollow frames, top centre) stays in card-row-feedback.mjs. These three draw the SAME state machine (createChainStrip: one 0.7 s
// flash at a time, one pending flash per card, idle fade), so only the look differs. Each is a different idea, not a restyled row:
//   B  cards at the bottom   real mini cards (28x40) bottom centre; a firing card jumps 6 px, glows, a big "+N" rises; the next card in the queue has a lit top edge
//   C  side rail             a vertical rail on the left edge, one 14 px pip per slot; a bead runs down the rail to each firing pip, which bursts a ring;
//                            the Sparks gained by the whole resolution pop at the end of the rail
//   D  burst at the Wisp     nothing while idle; a firing card's picture pops out beside the Wisp for 0.6 s with "+N" (max 3 on screen)
// No text to read in flight: only pictures, shapes and a brief large digit. Cheap DOM: one absolutely positioned layer, WAAPI on transform/opacity only.
import {CARD_ART_FILES} from './card-art-files.mjs?v=guide-clarity-1';
import {baseColor, STRIP} from './chain-strip.mjs?v=guide-clarity-1';

export const VARIANT_GEOMETRY = Object.freeze({
  b: Object.freeze({w: 28, h: 40, gap: 4, art: 24, jump: 6, popMs: 500, numMs: 700}),
  c: Object.freeze({pip: 14, pitch: 20, maxTravelMs: 350, ringMs: 450, totalMs: 900}),
  d: Object.freeze({max: 3, ms: 600, art: 24}),
});
const G = VARIANT_GEOMETRY;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const OUT = '0 0 0 1px #0b1210';

/** What each variant keeps on screen, in slot order. B: mounted cards and Inscription-only diamonds. C: every slot (an empty one is a hole). D: nothing while idle. */
export function variantEntries(variant, strip) {
  if (variant === 'd') return [];
  const entries = [], cellBySlot = new Map(strip.cells.map(c => [c.slot, c])), ghostBySlot = new Map(strip.ghosts.map(g => [g.slot, g]));
  for (let i = 0; i < strip.slotCount; i++) {
    if (cellBySlot.has(i)) entries.push({type: 'card', slot: i, ref: cellBySlot.get(i)});
    else if (ghostBySlot.has(i)) entries.push({type: 'ghost', slot: i, ref: ghostBySlot.get(i)});
    else if (variant === 'c') entries.push({type: 'empty', slot: i, ref: null});
  }
  return entries;
}
/** Size in px of what is drawn: B a row (w x h), C a column. */
export function variantExtent(variant, entries, slotCount = entries.length) {
  if (!entries.length) return {w: 0, h: 0};
  if (variant === 'b') return {w: entries.length * G.b.w + (entries.length - 1) * G.b.gap, h: G.b.h};
  if (variant === 'c') return {w: G.c.pip, h: slotCount * G.c.pitch - (G.c.pitch - G.c.pip)};
  return {w: 0, h: 0};
}
/** "+N" text for a floating Spark number: whole numbers, at most three digits, nothing when the firing carried no amount. */
export function sparkNumber(amount) {
  const n = Math.round(Number(amount) || 0);
  return n >= 1 ? '+' + Math.min(n, 999) : '';
}
/** C's bead: runs down the rail from the top to the firing pip, or back up from the pip that fired before it when the Chain loops to an earlier slot. */
export function railTravel(cell) {
  const y = slot => slot * G.c.pitch + G.c.pip / 2;
  const back = cell.from >= 0 && cell.slot <= cell.from;
  const ms = Math.min(G.c.maxTravelMs, 90 + 45 * (back ? cell.from - cell.slot + 1 : cell.slot + 1));
  return {back, fromY: back ? y(cell.from) : -6, toY: y(cell.slot), ms};
}
/** C: the Sparks of one resolution. Add each flash's amount; once the queue has drained the total is due (and the sum restarts). */
export function createResolutionTotal() {
  let sum = 0;
  return {
    add(amount) { sum += Math.max(0, Number(amount) || 0); },
    /** Call after every update; returns the total once nothing is playing or pending, else 0. */
    take(strip) { if (strip.playing || strip.pendingCount || sum <= 0) return 0; const t = sum; sum = 0; return t; },
    get sum() { return sum; },
  };
}
/** D: where the burst appears, in px inside the flight view: beside the Wisp (to its right and a little above), kept inside the view. */
export function wispPopPoint(player, canvasRect, rootRect, logical) {
  const k = canvasRect.width / (logical?.width || canvasRect.width);
  const x = canvasRect.left - rootRect.left + (Number(player?.x) || 0) * k + 26 * Math.max(1, k);
  const y = canvasRect.top - rootRect.top + (Number(player?.y) || 0) * k - 30 * Math.max(1, k);
  return {x: Math.max(8, Math.min(rootRect.width - 60, x)), y: Math.max(8, Math.min(rootRect.height - 50, y))};
}

const CSS = `
.sv-layer{position:absolute;z-index:6;pointer-events:none;transition:opacity 0ms linear}
.sv-layer .sv-num{position:absolute;font:700 18px/18px ui-monospace,Consolas,monospace;color:#f0c86a;text-shadow:-1px 0 #0b1210,1px 0 #0b1210,0 -1px #0b1210,0 1px #0b1210;white-space:nowrap;opacity:0;will-change:transform,opacity}
.sv-layer .sv-art{position:absolute;left:50%;top:0;width:${G.b.art}px;height:${G.b.art}px;margin-left:-${G.b.art / 2}px;background-size:${G.b.art}px ${G.b.art}px;background-repeat:no-repeat;image-rendering:pixelated}
.sv-b{left:calc(50% + var(--cshift,0px));bottom:10px;transform:translateX(-50%);display:flex;gap:${G.b.gap}px;height:${G.b.h}px;align-items:flex-end}
.sv-b .bc{position:relative;display:block;width:${G.b.w}px;height:${G.b.h}px;flex:none;will-change:transform}
.sv-b .bf{position:absolute;inset:0;box-sizing:border-box;border:2px solid var(--tone,#b9cfb0);box-shadow:${OUT};background:#14241e;overflow:hidden}
.sv-b .bf.chain-spent{opacity:.5}
.sv-b .bt{position:absolute;left:0;right:0;bottom:0;height:12px;background:var(--tone,#b9cfb0)}
.sv-b .bg{position:absolute;inset:0;background:#fff;opacity:0;will-change:opacity}
.sv-b .bc.chain-lit .bg{opacity:.7}
.sv-b .bn{left:0;width:100%;text-align:center;top:-22px}
.sv-b .be{position:absolute;left:-2px;right:-2px;top:-5px;height:3px;background:#fff;box-shadow:${OUT};opacity:0}
.sv-b .bc.next .be{opacity:1}
.sv-b .bd{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-8px 0 0 -8px;box-sizing:border-box;border:2px solid #f0c86a;box-shadow:${OUT};transform:rotate(45deg)}
.sv-b .bd.on{background:#f0c86a}
.sv-b .bi{position:absolute;right:-3px;bottom:-3px;width:7px;height:7px;background:#f0c86a;box-shadow:${OUT};transform:rotate(45deg)}
.sv-c{left:6px;top:50%;width:${G.c.pip}px}
.sv-c .cl{position:absolute;left:${G.c.pip / 2 - 1}px;top:0;bottom:0;width:2px;background:#5f6d5c;box-shadow:${OUT}}
.sv-c .cp{position:absolute;left:0;width:${G.c.pip}px;height:${G.c.pip}px;box-sizing:border-box;border:2px solid var(--tone,#b9cfb0);background:#0b1210;box-shadow:${OUT}}
.sv-c .cp::after{content:"";position:absolute;left:3px;top:3px;width:4px;height:4px;background:var(--tone,#b9cfb0)}
.sv-c .cp.chain-spent{opacity:.5}
.sv-c .cf{position:absolute;inset:-2px;background:#fff;opacity:0;will-change:opacity}
.sv-c .cp.chain-lit .cf{opacity:1}
.sv-c .cg{position:absolute;left:0;width:${G.c.pip}px;height:${G.c.pip}px;box-sizing:border-box;border:2px solid #fff;opacity:0;will-change:transform,opacity}
.sv-c .ce{position:absolute;left:${G.c.pip / 2 - 1}px;width:2px;height:2px;background:#5f6d5c}
.sv-c .cd{position:absolute;left:1px;width:12px;height:12px;box-sizing:border-box;border:2px solid #f0c86a;background:#0b1210;box-shadow:${OUT};transform:rotate(45deg) scale(.85)}
.sv-c .cb{position:absolute;left:${G.c.pip + 3}px;width:3px;height:${G.c.pip}px;background:#f0c86a;box-shadow:${OUT}}
.sv-c .cs{position:absolute;left:${G.c.pip / 2 - 4}px;top:-4px;width:8px;height:8px;background:#fff;box-shadow:0 0 0 1px #0b1210,0 0 6px 3px #fff8;opacity:0;will-change:transform,opacity}
.sv-c .cn{left:${G.c.pip + 8}px;transform:none}
.sv-d{inset:0}
.sv-d .dp{position:absolute;width:${G.d.art + 4}px;height:${G.d.art + 4}px;box-sizing:border-box;border:2px solid var(--tone,#b9cfb0);box-shadow:${OUT};background:#14241e;opacity:0;will-change:transform,opacity}
.sv-d .dp .sv-art{width:${G.d.art}px;height:${G.d.art}px;margin-left:-${G.d.art / 2}px;top:0}
.sv-d .dn{left:${G.d.art + 8}px;top:2px}
`;

/** The view for variant 'b', 'c' or 'd'. `paint(strip)` rebuilds the nodes when the Chain changed; `flashes(strip, soft, ctx)` starts animations for new serials
 * (soft = reduced motion: light for the flash, no travel, no jump). ctx = {engine, canvas} for D. `layer` is the element whose opacity is the idle fade. */
export function createVariantView(variant, {doc, root}) {
  if (!doc.getElementById?.('chain-strip-variants-css') && doc.head) {
    const style = doc.createElement('style'); style.id = 'chain-strip-variants-css'; style.textContent = CSS; doc.head.append(style);
  }
  const isB = variant === 'b', isC = variant === 'c', isD = variant === 'd';
  const layer = doc.createElement('div'); layer.className = `sv-layer sv-${variant}`; layer.setAttribute('aria-hidden', 'true'); root.append(layer);
  const total = createResolutionTotal();
  let nodes = [], seen = new Map(), pops = [], popAt = 0, endNum = null, nextCell = null;
  const num = (parent, cls = '') => { const n = doc.createElement('b'); n.className = `sv-num ${cls}`; parent.append(n); return n; };
  const rise = (n, text, ms, dy) => { n.textContent = text; n.animate?.([{transform: 'translate(0,0)', opacity: 1}, {transform: `translate(0,${-dy}px)`, opacity: 1, offset: .65}, {transform: `translate(0,${-dy - 3}px)`, opacity: 0}], {duration: ms, easing: 'steps(6, end)'}); };
  function paint(strip) {
    const entries = variantEntries(variant, strip), ext = variantExtent(variant, entries, strip.slotCount);
    layer.replaceChildren(); nodes = []; pops = []; endNum = null; seen = new Map(strip.cells.map(c => [c, c.lit ? c.fireSerial - 1 : c.fireSerial]));
    if (isD) {
      for (let i = 0; i < G.d.max; i++) { const p = doc.createElement('i'); p.className = 'dp'; const art = doc.createElement('i'); art.className = 'sv-art'; p.append(art); const n = num(p, 'dn'); layer.append(p); pops.push({p, art, n}); }
      return ext;
    }
    if (isC) { layer.style.height = ext.h + 'px'; layer.style.transform = `translateY(${-ext.h / 2}px)`; layer.innerHTML = '<i class="cl"></i>'; }
    for (const en of entries) {
      const ref = en.ref, rec = {en, ref, barSerial: ref?.barSerial || 0, lit: false};
      if (isB) {
        const cell = doc.createElement('span'); cell.className = 'bc'; rec.cell = cell;
        if (en.type === 'card') {
          cell.style.setProperty('--tone', baseColor(ref));
          const art = CARD_ART_FILES[ref.cardId];
          cell.innerHTML = `<i class="bf chain-${esc(ref.state)}">${art ? `<i class="sv-art" style="background-image:url(${esc(art)})"></i>` : ''}<i class="bt"></i><i class="bg"></i></i><i class="be"></i>${ref.bar !== 'none' ? '<b class="bi"></b>' : ''}`;
          rec.glow = cell.querySelector('.bg'); rec.mark = cell.querySelector('.bi'); rec.num = num(cell);
        } else { cell.innerHTML = '<i class="bd"></i>'; rec.diamond = cell.querySelector('.bd'); }
        layer.append(cell);
      } else {
        const top = en.slot * G.c.pitch;
        if (en.type === 'card') {
          const pip = doc.createElement('i'); pip.className = `cp chain-${ref.state}`; pip.style.cssText = `top:${top}px;--tone:${baseColor(ref)}`; pip.innerHTML = '<i class="cf"></i>';
          const ring = doc.createElement('i'); ring.className = 'cg'; ring.style.top = top + 'px';
          layer.append(pip, ring); rec.pip = pip; rec.fill = pip.firstChild; rec.ring = ring;
          if (ref.bar !== 'none') { const b = doc.createElement('b'); b.className = 'cb'; b.style.top = top + 'px'; layer.append(b); rec.mark = b; }
        } else if (en.type === 'ghost') { const d = doc.createElement('i'); d.className = 'cd'; d.style.top = top + 'px'; layer.append(d); rec.diamond = d; }
        else { const e = doc.createElement('i'); e.className = 'ce'; e.style.top = top + G.c.pip / 2 - 1 + 'px'; layer.append(e); }
      }
      nodes.push(rec);
    }
    if (isC) { const bead = doc.createElement('i'); bead.className = 'cs'; layer.append(bead); layer.bead = bead; endNum = num(layer, 'cn'); endNum.style.top = ext.h - 16 + 'px'; }
    return ext;
  }
  function flashes(strip, soft, ctx = {}) {
    // Next-in-queue marker (B): the card that will flash next has a lit top edge.
    if (isB) {
      const next = strip.pending[0]?.slot ?? -1;
      for (const rec of nodes) rec.cell.classList.toggle('next', rec.en.type === 'card' && rec.ref.slot === next);
    }
    if (isD) {
      for (const cell of strip.cells) {
        if (!seen.has(cell)) seen.set(cell, cell.fireSerial);
        if (cell.fireSerial === seen.get(cell)) continue;
        seen.set(cell, cell.fireSerial);
        const pop = pops[popAt++ % pops.length], art = CARD_ART_FILES[cell.cardId], eng = ctx.engine, canvas = ctx.canvas;
        let at = {x: 120, y: 120};
        if (eng && canvas && root.getBoundingClientRect) at = wispPopPoint(eng.player, canvas.getBoundingClientRect(), root.getBoundingClientRect(), {width: eng.width});
        pop.p.style.cssText = `left:${at.x}px;top:${at.y}px;--tone:${baseColor(cell)}`;
        pop.art.style.backgroundImage = art ? `url(${art})` : '';
        const text = sparkNumber(cell.amount);
        pop.n.textContent = text;
        if (!soft) {
          pop.p.animate?.([{transform: 'translate(-6px,6px) scale(.6)', opacity: 0}, {transform: 'translate(0,0) scale(1.15)', opacity: 1, offset: .2}, {transform: 'translate(0,-3px) scale(1)', opacity: 1, offset: .75}, {transform: 'translate(0,-8px) scale(1)', opacity: 0}], {duration: G.d.ms, easing: 'steps(8, end)'});
        } else { pop.p.style.opacity = '1'; setTimeout?.(() => { pop.p.style.opacity = '0'; }, G.d.ms); }
      }
      return;
    }
    for (const rec of nodes) {
      const {en, ref} = rec;
      if (en.type === 'empty') continue;
      if (en.type === 'card' && ref.fireSerial !== seen.get(ref)) {
        seen.set(ref, ref.fireSerial);
        total.add(ref.amount);
        if (!soft && layer.animate !== undefined) {
          if (isB) {
            const J = G.b.jump;
            rec.cell.animate([{transform: 'translateY(0)'}, {transform: `translateY(-${J}px)`, offset: .15}, {transform: `translateY(-${J}px)`, offset: .75}, {transform: 'translateY(0)'}], {duration: STRIP.flashMs, easing: 'steps(1, end)'});
            rec.glow.animate([{opacity: .85}, {opacity: 0}], {duration: G.b.popMs, easing: 'ease-out'});
            const text = sparkNumber(ref.amount); if (text) rise(rec.num, text, G.b.numMs, 22);
          } else {
            const t = railTravel(ref);
            layer.bead.animate([{transform: `translateY(${t.fromY}px)`, opacity: 1}, {transform: `translateY(${t.toY - 4}px)`, opacity: 1, offset: .92}, {transform: `translateY(${t.toY - 4}px)`, opacity: 0}], {duration: t.ms + 60, easing: 'linear'});
            const all = STRIP.flashMs + t.ms, at = t.ms / all;
            rec.fill.animate([{opacity: 0}, {opacity: 0, offset: at}, {opacity: 1, offset: Math.min(at + .001, .99)}, {opacity: 1, offset: .85}, {opacity: 0}], {duration: all, easing: 'linear'});
            rec.ring.animate([{transform: 'scale(1)', opacity: 0}, {transform: 'scale(1)', opacity: 0, offset: at}, {transform: 'scale(1)', opacity: 1, offset: Math.min(at + .001, .99)}, {transform: 'scale(2.3)', opacity: 0}], {duration: t.ms + G.c.ringMs, easing: 'ease-out'});
          }
        }
      }
      if (ref && ref.barSerial !== rec.barSerial) {
        rec.barSerial = ref.barSerial;
        const spin = rec.diamond && isB ? 'rotate(45deg) ' : '', target = rec.diamond || rec.mark;
        if (soft) rec.diamond?.classList.add('on');
        else target?.animate?.([{transform: `${spin}scale(1.8)`, opacity: 1}, {transform: `${spin}scale(1)`, opacity: .8}], {duration: STRIP.flashMs, easing: 'ease-out'});
      }
      if (en.type === 'card') { // reduced motion: lit for the whole 0.7 s, no travel, no jump
        const lit = soft && ref.lit;
        if (lit !== rec.lit) { rec.lit = lit; (isB ? rec.cell : rec.pip).classList[lit ? 'add' : 'remove']('chain-lit'); }
      }
    }
    if (isC) { const sum = total.take(strip), text = sparkNumber(sum); if (text && endNum && !soft) rise(endNum, text, G.c.totalMs, 14); }
  }
  return {paint, flashes, layer, destroy() { layer.remove(); }};
}
