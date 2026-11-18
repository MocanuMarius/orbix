// Inscription markup (menu screens only, never in flight). Each Inscription has its own brand mark (dist/inscription-glyphs.mjs,
// drawn in scripts/build-inscription-glyphs.mjs). On the Chain tab the mark is burned into the slot frame's top-left corner,
// clear of the card's picture, name, trigger chip and the label under the card; tapping it names the Inscription and its rule.
// One thin etched line inside the slot frame; the "Inscription" block of the card inspector. Kit colours and fonts, whole
// pixels, no gradients (styles: dist/ui/card-screens.css, "Inscriptions").
import {getInscription} from './inscriptions.mjs?v=guide-2';
import {inscriptionGlyph} from './inscription-glyphs.mjs?v=guide-2';
import {cardTermTextMarkup, cardTermMarkup} from './card-terms.mjs?v=guide-2';
export {inscriptionGlyph};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** What an Inscription does, in plain words, by kind. */
export const INSCRIPTION_KIND_WORDS = Object.freeze({card: 'Changes the card in its slot', standalone: 'Works on its own, even on an empty slot'});

/** The small tag of an Inscription on choice screens: "Card" (changes the card in its slot) or "Slot" (works on its own), each a glossary link. */
export function inscriptionTag(ins) {
  if (!ins) return '';
  return `<span class="ins-tag">${cardTermMarkup(ins.kind === 'card' ? 'ins-card' : 'ins-slot', ins.kind === 'card' ? 'Card' : 'Slot', {icon: false})}</span>`;
}

/** The brand burned into a slot's frame corner. A button, so an empty inscribed slot can still be read (name and rule). */
export function inscriptionBrand(slot, id) {
  const ins = getInscription(id);
  if (!ins) return '';
  return `<button type="button" class="dk2-ins-brand dk2-ins-${ins.kind}" data-ins-slot="${slot}" data-ins-id="${ins.id}" aria-label="Inscription on slot ${slot + 1}: ${esc(ins.name)}. ${esc(ins.text)}">${inscriptionGlyph(ins.id, {role: 'brand'})}</button>`;
}
/** The thin etched line inside the slot frame (also drawn on an empty slot). */
export const inscriptionFrame = id => { const ins = getInscription(id); return ins ? `<i class="dk2-ins-frame dk2-ins-frame-${ins.kind}" aria-hidden="true"></i>` : ''; };

/** The second block of the inspector: the mark, "Inscription: <name>" and its one-line rule, trigger words linked to the glossary. */
export function inscriptionBlock(slot, id) {
  const ins = getInscription(id);
  if (!ins) return '';
  return `<section class="dk2-inscription dk2-inscription-${ins.kind}" aria-label="Inscription on slot ${slot + 1}">
    <h3>${inscriptionGlyph(ins.id, {role: 'list'})}<span>Inscription: <b>${esc(ins.name)}</b></span> ${cardTermMarkup('inscription', 'What is this?', {icon: false})}</h3>
    <p>${cardTermTextMarkup(ins.text)}</p>
    <small>${esc(INSCRIPTION_KIND_WORDS[ins.kind])}</small>
  </section>`;
}
/** One line for the screen note (read from the brand on a slot). */
export const inscriptionLine = (slot, id) => { const ins = getInscription(id); return ins ? `Inscription on slot ${slot + 1}: ${ins.name}. ${ins.text}` : ''; };
