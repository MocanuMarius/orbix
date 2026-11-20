// Inscription markup (menu screens only, never in flight). Each Inscription has its own brand mark (dist/inscription-glyphs.mjs,
// drawn in scripts/build-inscription-glyphs.mjs). On the Chain tab the mark is burned into the slot frame's top-left corner,
// clear of the card's picture, name, trigger chip and the label under the card; tapping it names the Inscription and its rule.
// One thin etched line inside the slot frame; the "Inscription" block of the card inspector. Kit colours and fonts, whole
// pixels, no gradients (styles: dist/ui/card-screens.css, "Inscriptions").
import {getInscription} from './inscriptions.mjs?v=cards-3';
import {inscriptionEffect} from './inscription-on-card.mjs?v=cards-3';
import {inscriptionGlyph} from './inscription-glyphs.mjs?v=cards-3';
import {cardTermTextMarkup, cardTermMarkup} from './card-terms.mjs?v=cards-3';
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
  return `<button type="button" class="dk2-ins-brand dk2-ins-${ins.kind}" data-ins-slot="${slot}" data-ins-id="${ins.id}" aria-label="Inscription on slot ${slot + 1}: ${esc(ins.name)}. Open it">${inscriptionGlyph(ins.id, {role: 'brand'})}<span class="dk2-ins-name" aria-hidden="true">${esc(ins.name)}</span></button>`;
}
/** The thin etched line inside the slot frame (also drawn on an empty slot). */
export const inscriptionFrame = id => { const ins = getInscription(id); return ins ? `<i class="dk2-ins-frame dk2-ins-frame-${ins.kind}" aria-hidden="true"></i>` : ''; };

/** The second block of the inspector: the mark, "Inscription: <name>" and its one-line rule, trigger words linked to the glossary. */
export function inscriptionBlock(slot, id, entry, card) {
  const ins = getInscription(id);
  if (!ins) return '';
  const fx = card ? inscriptionEffect(ins, card) : null;
  return `<section class="dk2-inscription dk2-inscription-${ins.kind}" aria-label="Inscription on slot ${slot + 1}">
    <h3>${inscriptionGlyph(ins.id, {role: 'list'})}<span>${fx ? 'Slot Inscription' : 'Inscription: <b>' + esc(ins.name) + '</b>'}</span> ${cardTermMarkup('inscription', 'What is this?', {icon: false})}</h3>
    ${fx ? `<p class="dk2-ins-fx${fx.works ? '' : ' dk2-ins-fx-idle'}" data-works="${fx.works}">${esc(ins.name)}: ${esc(fx.text)}</p>` : `<p>${cardTermTextMarkup(ins.text)}</p>`}
    ${fx ? "" : `<small>${esc(INSCRIPTION_KIND_WORDS[ins.kind])}</small>`}
  </section>`;
}
/** One line for the screen note (read from the brand on a slot). */
export const inscriptionLine = (slot, id) => { const ins = getInscription(id); return ins ? `Inscription on slot ${slot + 1}: ${ins.name}. ${ins.text}` : ''; };

/** What the Inscription sheet says (pure, for tests): name, tag word, plain text, and "With <card>: <what happens>" when a card is mounted. */
export function inscriptionSheetModel(id, card = null, cardName = '') {
  const ins = getInscription(id);
  if (!ins) return null;
  const fx = card ? inscriptionEffect(ins, card) : null;
  return {id: ins.id, name: ins.name, tag: ins.kind === 'card' ? 'Card' : 'Slot', kindWord: INSCRIPTION_KIND_WORDS[ins.kind], text: ins.text,
    withLine: fx ? `With ${cardName || 'this card'}: ${fx.text.replace(/^no effect on this card/, 'no effect')}` : '', works: fx ? fx.works : null};
}
/** The detail sheet of an Inscription, in the card sheet's own frame (dk2-read / dk2-dialog). One way out: Close. */
export function inscriptionSheetMarkup(slot, id, card = null, cardName = '') {
  const m = inscriptionSheetModel(id, card, cardName), ins = getInscription(id);
  if (!m) return '';
  const where = card ? `On slot ${slot + 1}, under ${cardName}` : `On slot ${slot + 1}, which is empty`;
  return `<div class="dk2-read dk2-ins-read" id="dk2-read"><div class="dk2-dialog" role="dialog" aria-modal="true" aria-labelledby="dk2-read-name">
    <div class="dk2-face dk2-ins-face dk2-inscription-${ins.kind}" aria-hidden="true">${inscriptionGlyph(ins.id, {role: 'huge'})}</div>
    <div class="dk2-info"><div class="dk2-info-body">
     <h2 class="dk2-ins-title" id="dk2-read-name">${esc(m.name)}</h2>
     <p class="dk2-ins-sub">${inscriptionTag(ins)} <span>${esc(where)}</span></p>
     <p class="dk2-rule">${cardTermTextMarkup(m.text)}</p>
     <p class="dk2-ins-kind">${esc(m.kindWord)}.</p>
     ${m.withLine ? `<p class="dk2-here dk2-ins-with${m.works ? '' : ' dk2-here-idle'}" data-works="${m.works}">${m.works ? '' : '<i class="dk2-warn" aria-hidden="true">!</i>'}<span>${esc(m.withLine)}</span></p>` : ''}
    </div><div class="dk2-info-foot"><button type="button" class="wb-sign wb-sign-quiet dk2-close" id="dk2-close" aria-label="Close ${esc(m.name)}"><span class="wb-sign-text"><b>Close</b></span></button></div></div></div></div>`;
}
