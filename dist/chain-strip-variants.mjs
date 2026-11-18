// In-flight Chain strip, look variants B and C (owner review, 2026-11-18; codes v1.0-strip-B / v1.0-strip-C in docs/design-versions.md).
// Variant A (hollow frames) stays in card-row-feedback.mjs. B and C draw the SAME state machine (createChainStrip: one 0.7 s
// flash at a time, one pending flash per card, idle fade), so only the look differs. No text is read in flight: B floats a brief
// large "+N" digit, C is a line with pips. Cheap DOM: one container, WAAPI on transform/opacity only, no canvas.
import {CARD_ART_FILES} from './card-art-files.mjs?v=guide-clarity-1';
import {baseColor, STRIP} from './chain-strip.mjs?v=guide-clarity-1';

export const VARIANT_GEOMETRY = Object.freeze({
  b: Object.freeze({cellW: 22, cellH: 28, gap: 3, artSize: 24, popMs: 500, numMs: 600}),
  c: Object.freeze({pip: 8, pitch: 14, h: 18, maxTravelMs: 350}),
});
const G = VARIANT_GEOMETRY;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const OUT = '0 0 0 1px #0b1210';

/** What each variant draws, in slot order. B: mounted cards and Inscription-only diamonds (empty slots skipped, like A). C: every slot, an empty one as a hole in the thread. */
export function variantEntries(variant, strip) {
  const entries = [], n = strip.slotCount, cellBySlot = new Map(strip.cells.map(c => [c.slot, c])), ghostBySlot = new Map(strip.ghosts.map(g => [g.slot, g]));
  for (let i = 0; i < n; i++) {
    if (cellBySlot.has(i)) entries.push({type: 'card', slot: i, ref: cellBySlot.get(i)});
    else if (ghostBySlot.has(i)) entries.push({type: 'ghost', slot: i, ref: ghostBySlot.get(i)});
    else if (variant === 'c') entries.push({type: 'empty', slot: i, ref: null});
  }
  return entries;
}
/** Width in px of the drawn content. */
export function variantWidth(variant, entries, slotCount = entries.length) {
  if (!entries.length) return 0;
  if (variant === 'b') return entries.length * G.b.cellW + (entries.length - 1) * G.b.gap;
  return slotCount * G.c.pitch - (G.c.pitch - G.c.pip);
}
/** "+N" text for a floating Spark number: whole numbers, at most three digits, nothing when the firing carried no amount. */
export function sparkNumber(amount) {
  const n = Math.round(Number(amount) || 0);
  return n >= 1 ? '+' + Math.min(n, 999) : '';
}
/** Where C's spark travels (px from the left end of the line) and for how long: forward from the left, or back along the return line when the Chain loops to an earlier slot. */
export function threadTravel(cell) {
  const x = slot => slot * G.c.pitch + G.c.pip / 2;
  const back = cell.from >= 0 && cell.slot <= cell.from;
  const ms = Math.min(G.c.maxTravelMs, 90 + 45 * (back ? cell.from - cell.slot + 1 : cell.slot + 1));
  return {back, fromX: back ? x(cell.from) : 0, toX: x(cell.slot), ms};
}

const CSS = `
.chain-strip .sv{position:relative;display:flex;align-items:center;flex:none}
.chain-strip .sv-b{gap:${G.b.gap}px;height:${G.b.cellH}px}
.chain-strip .sv-b .bc{position:relative;display:block;width:${G.b.cellW}px;height:${G.b.cellH}px;flex:none}
.chain-strip .sv-b .bf{position:absolute;inset:0;box-sizing:border-box;border:1px solid var(--tone,#b9cfb0);box-shadow:${OUT};background:#14241e;overflow:hidden}
.chain-strip .sv-b .bf.chain-spent{opacity:.5}
.chain-strip .sv-b .ba{position:absolute;left:50%;top:0;width:${G.b.artSize}px;height:${G.b.artSize}px;margin-left:-${G.b.artSize / 2}px;background-size:${G.b.artSize}px ${G.b.artSize}px;background-repeat:no-repeat;image-rendering:pixelated}
.chain-strip .sv-b .bt{position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--tone,#b9cfb0)}
.chain-strip .sv-b .bg{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;will-change:opacity}
.chain-strip .sv-b .bi{position:absolute;right:-1px;bottom:-1px;width:6px;height:6px;background:#f0c86a;box-shadow:${OUT};transform:rotate(45deg);transform-origin:50% 50%}
.chain-strip .sv-b .bn{position:absolute;left:50%;top:-2px;transform:translate(-50%,0);font:700 16px/16px ui-monospace,Consolas,monospace;color:#f0c86a;text-shadow:-1px 0 #0b1210,1px 0 #0b1210,0 -1px #0b1210,0 1px #0b1210;white-space:nowrap;opacity:0;pointer-events:none;will-change:transform,opacity}
.chain-strip .sv-b .bd{position:absolute;left:50%;top:50%;width:11px;height:11px;margin:-6px 0 0 -6px;box-sizing:border-box;border:1px solid #f0c86a;box-shadow:${OUT};transform:rotate(45deg)}
.chain-strip .sv-b .bd.on{background:#f0c86a}
.chain-strip .sv-b .bc.chain-lit .bg{opacity:.7}
.chain-strip .sv-c{height:${G.c.h}px}
.chain-strip .sv-c .cl{position:absolute;left:0;right:0;top:${G.c.pip / 2 - 1}px;height:2px;background:#5f6d5c;box-shadow:${OUT}}
.chain-strip .sv-c .cr{position:absolute;left:0;right:0;top:${G.c.pip + 8}px;height:1px;background:#5f6d5c;opacity:.45}
.chain-strip .sv-c .cp{position:absolute;top:0;width:${G.c.pip}px;height:${G.c.pip}px;box-sizing:border-box;border:1px solid var(--tone,#b9cfb0);background:#0b1210;box-shadow:${OUT}}
.chain-strip .sv-c .cp.chain-spent{opacity:.5}
.chain-strip .sv-c .cf{position:absolute;inset:-1px;background:#fff;opacity:0;will-change:opacity}
.chain-strip .sv-c .cp.chain-lit .cf{opacity:1}
.chain-strip .sv-c .ce{position:absolute;top:${G.c.pip / 2 - 1}px;width:2px;height:2px;background:#5f6d5c}
.chain-strip .sv-c .cd{position:absolute;top:0;width:${G.c.pip}px;height:${G.c.pip}px;box-sizing:border-box;border:1px solid #f0c86a;background:#0b1210;box-shadow:${OUT};transform:rotate(45deg) scale(.85)}
.chain-strip .sv-c .cd.on{background:#f0c86a}
.chain-strip .sv-c .cb{position:absolute;top:${G.c.pip + 2}px;width:${G.c.pip}px;height:2px;background:#f0c86a;box-shadow:${OUT};transform-origin:50% 50%}
.chain-strip .sv-c .cs{position:absolute;top:${G.c.pip / 2 - 3}px;left:-3px;width:6px;height:6px;background:#fff;box-shadow:0 0 0 1px #0b1210,0 0 4px 2px #fff8;opacity:0;will-change:transform,opacity}
.chain-strip .sv-c .cs.back{top:${G.c.pip + 6}px;width:4px;height:4px;left:-2px;box-shadow:0 0 0 1px #0b1210}
`;

/** The view for variant 'b' or 'c'. `paint(strip)` rebuilds the nodes when the Chain changed and returns the content width;
 * `flashes(strip, soft)` starts animations for new serials (soft = reduced motion: solid light for the flash, no travel, no pop). */
export function createVariantView(variant, {doc, button}) {
  if (!doc.getElementById?.('chain-strip-variants-css') && doc.head) {
    const style = doc.createElement('style'); style.id = 'chain-strip-variants-css'; style.textContent = CSS; doc.head.append(style);
  }
  const isB = variant === 'b';
  let box = null, nodes = [], width = 0;
  function paint(strip) {
    const entries = variantEntries(variant, strip);
    width = variantWidth(variant, entries, strip.slotCount);
    box?.remove(); box = doc.createElement('div'); box.className = `sv sv-${variant}`; box.setAttribute('aria-hidden', 'true');
    if (!isB) box.style.width = width + 'px';
    let html = isB ? '' : `<i class="cl"></i>${entries.length > 1 ? '<i class="cr"></i>' : ''}`;
    for (const en of entries) {
      const ref = en.ref, left = en.slot * G.c.pitch;
      if (isB) {
        if (en.type === 'card') {
          const art = CARD_ART_FILES[ref.cardId];
          html += `<span class="bc" data-slot="${en.slot}" style="--tone:${esc(baseColor(ref))}"><i class="bf chain-${esc(ref.state)}">${art ? `<i class="ba" style="background-image:url(${esc(art)})"></i>` : ''}<i class="bt"></i><i class="bg"></i></i>${ref.bar !== 'none' ? '<b class="bi"></b>' : ''}<span class="bn"></span></span>`;
        } else html += `<span class="bc" data-slot="${en.slot}"><i class="bd"></i></span>`;
      } else if (en.type === 'card') html += `<i class="cp chain-${esc(ref.state)}" data-slot="${en.slot}" style="left:${left}px;--tone:${esc(baseColor(ref))}"><i class="cf"></i></i>${ref.bar !== 'none' ? `<b class="cb" data-slot="${en.slot}" style="left:${left}px"></b>` : ''}`;
      else if (en.type === 'ghost') html += `<i class="cd" data-slot="${en.slot}" style="left:${left}px"></i>`;
      else html += `<i class="ce" style="left:${left + G.c.pip / 2 - 1}px"></i>`;
    }
    if (!isB) html += '<i class="cs"></i><i class="cs back"></i>';
    box.innerHTML = html;
    button.replaceChildren(box);
    nodes = entries.map(en => {
      const ref = en.ref, rec = {en, ref, fireSerial: 0, barSerial: 0, lit: false};
      if (en.type === 'card') { rec.fireSerial = ref.lit ? ref.fireSerial - 1 : ref.fireSerial; rec.barSerial = ref.barSerial; }
      if (en.type === 'ghost') rec.barSerial = ref.barSerial;
      const at = box.querySelector(`[data-slot="${en.slot}"]`);
      if (isB) { rec.cell = at; rec.glow = at?.querySelector('.bg'); rec.num = at?.querySelector('.bn'); rec.diamond = at?.querySelector('.bd'); rec.mark = at?.querySelector('.bi'); }
      else { rec.pip = box.querySelector(`.cp[data-slot="${en.slot}"], .cd[data-slot="${en.slot}"]`); rec.fill = rec.pip?.querySelector('.cf'); rec.bar = box.querySelector(`.cb[data-slot="${en.slot}"]`); }
      return rec;
    });
    return width;
  }
  function flashes(strip, soft) {
    const sparks = isB || !box ? null : box.querySelectorAll('.cs');
    for (const rec of nodes) {
      const {en, ref} = rec;
      if (en.type === 'empty') continue;
      if (en.type === 'card' && ref.fireSerial !== rec.fireSerial) {
        rec.fireSerial = ref.fireSerial;
        if (!soft && typeof box.animate === 'function') {
          if (isB) {
            rec.cell.animate([{transform: 'scale(1)'}, {transform: 'scale(1.25)', offset: .2}, {transform: 'scale(1)', offset: .7}, {transform: 'scale(1)'}], {duration: G.b.popMs, easing: 'steps(1, end)'});
            rec.glow.animate([{opacity: .8}, {opacity: 0}], {duration: G.b.popMs, easing: 'ease-out'});
            const text = sparkNumber(ref.amount);
            if (text) { rec.num.textContent = text; rec.num.animate([{transform: 'translate(-50%, 0)', opacity: 1}, {transform: 'translate(-50%, -12px)', opacity: 1, offset: .6}, {transform: 'translate(-50%, -14px)', opacity: 0}], {duration: G.b.numMs, easing: 'steps(6, end)'}); }
          } else if (rec.fill) {
            const t = threadTravel(ref), total = STRIP.flashMs + t.ms, at = t.ms / total, spark = sparks[t.back ? 1 : 0];
            spark.animate([{transform: `translateX(${t.fromX}px)`, opacity: 1}, {transform: `translateX(${t.toX}px)`, opacity: 1, offset: .92}, {transform: `translateX(${t.toX}px)`, opacity: 0}], {duration: t.ms + 60, easing: 'linear'});
            rec.fill.animate([{opacity: 0}, {opacity: 0, offset: at}, {opacity: 1, offset: Math.min(at + .001, .99)}, {opacity: 1, offset: .85}, {opacity: 0}], {duration: total, easing: 'linear'});
          }
        }
      }
      if (ref.barSerial !== rec.barSerial) {
        rec.barSerial = ref.barSerial;
        const spin = isB && rec.diamond ? 'rotate(45deg) ' : '', target = isB ? (rec.diamond || rec.mark) : (rec.bar || rec.pip);
        if (soft) rec.diamond?.classList.add('on');
        else target?.animate?.([{transform: `${spin}scale(1.8)`, opacity: 1}, {transform: `${spin}scale(1)`, opacity: .8}], {duration: STRIP.flashMs, easing: 'ease-out'});
      }
      if (en.type === 'card') { // reduced motion: lit for the whole 0.7 s, no spark, no scale
        const lit = soft && ref.lit;
        if (lit !== rec.lit) { rec.lit = lit; (isB ? rec.cell : rec.pip)?.classList[lit ? 'add' : 'remove']('chain-lit'); }
      }
    }
  }
  return {paint, flashes, get width() { return width; }};
}
