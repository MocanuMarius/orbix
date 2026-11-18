// Inscription markup (menu screens only, never in flight). Each Inscription has its own brand mark (dist/inscription-glyphs.mjs,
// drawn in scripts/build-inscription-glyphs.mjs). On the Chain tab the mark is burned into the slot frame's top-left corner,
// clear of the card's picture, name, trigger chip and the label under the card; tapping it names the Inscription and its rule.
// One thin etched line inside the slot frame; the "Inscription" block of the card inspector. Kit colours and fonts, whole
// pixels, no gradients (styles: dist/ui/card-screens.css, "Inscriptions").
// A TEMPORARY Inscription (events and objectives, dist/temporary-inscriptions.mjs) wears a dashed ring in the accent colour and a pixel
// counter of flights left on the frame; an oath wears an open ring that closes when it is fulfilled. What it covers shows small and grey.
import {getInscription} from './inscriptions.mjs?v=guide-clarity-1';
import {inscriptionGlyph} from './inscription-glyphs.mjs?v=guide-clarity-1';
import {cardTermTextMarkup, cardTermMarkup} from './card-terms.mjs?v=guide-clarity-1';
import {temporaryStatus, temporaryEntries, temporaryLine} from './temporary-inscriptions.mjs?v=guide-clarity-1';
export {inscriptionGlyph};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** What an Inscription does, in plain words, by kind. */
export const INSCRIPTION_KIND_WORDS = Object.freeze({card: 'Changes the card in its slot', standalone: 'Works on its own, even on an empty slot', temporary: 'Temporary: written on a slot, ends by itself'});

/** The small tag of an Inscription on choice screens: "Card" (changes the card in its slot) or "Slot" (works on its own), each a
 * glossary link; a temporary one says how long it lasts ("3 flights", "Oath"). */
export function inscriptionTag(ins, flights) {
  if (!ins) return '';
  if (ins.temporary) return `<span class="ins-tag ins-tag-temp">${ins.until ? 'Oath: until fulfilled' : `${flights ?? ins.flights} ${(flights ?? ins.flights) === 1 ? 'flight' : 'flights'}`}</span>`;
  return `<span class="ins-tag">${cardTermMarkup(ins.kind === 'card' ? 'ins-card' : 'ins-slot', ins.kind === 'card' ? 'Card' : 'Slot', {icon: false})}</span>`;
}
/** The mark of an oath's ring: open while it holds, closed once it is fulfilled. */
export const oathRing = (closed = false) => `<i class="dk2-ins-oath${closed ? ' dk2-ins-oath-closed' : ''}" aria-hidden="true"></i>`;
/** "Mending, 2 flights left" / "The Closed Eye, oath". */
const statusWords = (entry, ins) => !ins.temporary ? '' : ins.until ? ' Oath: stays until fulfilled.' : ` ${temporaryStatus(ins.id, entry?.flightsLeft)}.`;

/** The brand burned into a slot's frame corner. A button, so an empty inscribed slot can still be read (name and rule).
 * `entry` is the slot entry (run.slotInscriptions[slot]); a temporary one adds its ring, counter or oath ring and says what it covers. */
export function inscriptionBrand(slot, id, entry = null) {
  const ins = getInscription(id);
  if (!ins) return '';
  const temp = !!ins.temporary;
  const covered = temp && entry?.covers?.id ? getInscription(entry.covers.id) : null;
  const mark = temp ? (ins.until ? oathRing(false) : `<b class="dk2-ins-count" aria-hidden="true">${esc(entry?.flightsLeft ?? ins.flights)}</b>`) : '';
  return `<button type="button" class="dk2-ins-brand dk2-ins-${ins.kind}" data-ins-slot="${slot}" data-ins-id="${ins.id}" aria-label="${temp ? 'Temporary ' : ''}Inscription on slot ${slot + 1}: ${esc(ins.name)}. ${esc(ins.text)}${esc(statusWords(entry, ins))}${covered ? ` Covers ${esc(covered.name)}, which returns afterwards.` : ''}">${inscriptionGlyph(ins.id, {role: 'brand'})}${mark}</button>`;
}
/** The thin etched line inside the slot frame (also drawn on an empty slot). */
export const inscriptionFrame = id => { const ins = getInscription(id); return ins ? `<i class="dk2-ins-frame dk2-ins-frame-${ins.kind}" aria-hidden="true"></i>` : ''; };

/** The second block of the inspector: the mark, "Inscription: <name>" and its one-line rule, trigger words linked to the glossary.
 * A temporary one says "Temporary: N flights left" (or its oath) and shows the permanent Inscription it covers, small and grey. */
export function inscriptionBlock(slot, id, entry = null) {
  const ins = getInscription(id);
  if (!ins) return '';
  const covered = ins.temporary && entry?.covers?.id ? getInscription(entry.covers.id) : null;
  const status = ins.temporary ? `<p class="dk2-ins-status"><b>${esc(temporaryStatus(ins.id, entry?.flightsLeft))}</b></p>` : '';
  const under = covered ? `<p class="dk2-ins-covered">${inscriptionGlyph(covered.id, {role: 'list'})}<span>Covered: ${esc(covered.name)}. It comes back when this ends.</span></p>` : '';
  return `<section class="dk2-inscription dk2-inscription-${ins.kind}" aria-label="${ins.temporary ? 'Temporary Inscription' : 'Inscription'} on slot ${slot + 1}">
    <h3>${inscriptionGlyph(ins.id, {role: 'list'})}<span>${ins.temporary ? (ins.until ? 'Oath' : 'Temporary') : 'Inscription'}: <b>${esc(ins.name)}</b></span> ${cardTermMarkup('inscription', 'What is this?', {icon: false})}</h3>
    <p>${cardTermTextMarkup(ins.text)}</p>
    ${status}${under}
    <small>${esc(INSCRIPTION_KIND_WORDS[ins.kind])}</small>
  </section>`;
}
/** One line for the screen note (read from the brand on a slot). */
export const inscriptionLine = (slot, id, entry = null) => { const ins = getInscription(id); return ins ? `${ins.temporary ? 'Temporary Inscription' : 'Inscription'} on slot ${slot + 1}: ${ins.name}. ${ins.text}${statusWords(entry, ins)}` : ''; };

/** The temporary Inscriptions on a run's Chain as a list for menu screens (flight preview, briefing): mark, name, rule, what is left. */
export function temporaryEffectsMarkup(run) {
  return temporaryEntries(run).map(e => `<span class="passage-boon passage-temporary">${inscriptionGlyph(e.id, {role: 'list'})}<span><b>${esc(temporaryStatus(e.id, e.flightsLeft))} · slot ${e.slot + 1}</b> ${esc(temporaryLine(e.id, e.flightsLeft))}${e.until ? '' : ' Failures do not spend it.'}</span></span>`).join('');
}
