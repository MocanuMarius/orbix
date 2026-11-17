// Inscription markup (menu screens only, never in flight). One engraved plaque on the lower edge of an inscribed slot,
// one thin etched line inside the slot frame, and the "Inscription" block of the card inspector. Kit colours and fonts, whole
// pixels, no gradients (styles: dist/ui/card-screens.css, "Inscriptions").
import {getInscription, INSCRIPTION_FAMILIES} from './inscriptions.mjs?v=inscribe-2';
import {cardTermTextMarkup, cardTermMarkup} from './card-terms.mjs?v=inscribe-2';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Two 7×7 pixel glyphs on a whole-pixel grid: a chisel mark (card-modifying) and a rune ring (standalone).
const GLYPHS = Object.freeze({
  card: ['..#....', '.##....', '###.#..', '.#.##..', '...###.', '....##.', '.....#.'],
  standalone: ['.#####.', '##...##', '#..#..#', '#.###.#', '#..#..#', '##...##', '.#####.'],
});
export function inscriptionGlyph(kind) {
  const rows = GLYPHS[kind] || GLYPHS.card;
  const rects = rows.flatMap((row, y) => [...row].map((c, x) => c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '')).join('');
  return `<svg class="ins-glyph" viewBox="0 0 7 7" width="14" height="14" shape-rendering="crispEdges" aria-hidden="true" focusable="false" fill="currentColor">${rects}</svg>`;
}

/** The plaque on a slot's lower edge. A button, so an empty inscribed slot can still be read. */
export function inscriptionPlaque(slot, id) {
  const ins = getInscription(id);
  if (!ins) return '';
  return `<button type="button" class="dk2-ins dk2-ins-${ins.kind}" data-ins-slot="${slot}" aria-label="Inscription on slot ${slot + 1}: ${esc(ins.name)}. ${esc(ins.text)}">${inscriptionGlyph(ins.kind)}<b>${esc(ins.name)}</b></button>`;
}
/** The thin etched line inside the slot frame (also drawn on an empty slot). */
export const inscriptionFrame = id => { const ins = getInscription(id); return ins ? `<i class="dk2-ins-frame dk2-ins-frame-${ins.kind}" aria-hidden="true"></i>` : ''; };

/** The second block of the inspector: "Inscription: <name>" and its one-line rule, trigger words linked to the glossary. */
export function inscriptionBlock(slot, id) {
  const ins = getInscription(id);
  if (!ins) return '';
  return `<section class="dk2-inscription dk2-inscription-${ins.kind}" aria-label="Inscription on slot ${slot + 1}">
    <h3>${inscriptionGlyph(ins.kind)}<span>Inscription: <b>${esc(ins.name)}</b></span> ${cardTermMarkup('inscription', 'What is this?', {icon: false})}</h3>
    <p>${cardTermTextMarkup(ins.text)}</p>
    <small>${esc(INSCRIPTION_FAMILIES[ins.kind])} · ${ins.kind === 'card' ? 'changes the card on this slot' : 'works on any slot, even an empty one'}</small>
  </section>`;
}
/** One line for the screen note (an empty inscribed slot, read from its plaque). */
export const inscriptionLine = (slot, id) => { const ins = getInscription(id); return ins ? `Inscription on slot ${slot + 1}: ${ins.name}. ${ins.text}` : ''; };
