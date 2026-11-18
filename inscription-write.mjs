// ONE screen for writing a permanent Inscription (docs/inscriptions.md): Scribe stops, Guardian/Elite rewards and chest finds.
// Top row: the offers (2 from the Scribe, 1 from a chest). Bottom row: the Chain as it is, every slot visible (3 to 6, shrinking
// evenly). Tap an offer and a slot in either order; the chosen slot shows the result before anything is written: the new brand,
// the old one struck through ("Replaces Gilded"), and the card's before → after from the same row preview the Chain tab uses.
// Nothing is written until "Write". The "?" on a card or a brand and every keyword open the glossary as an overlay; the selection stays.
// Menu screen only, never in flight. Nothing on it scrolls at 890×400, 915×412 or 740×333 (styles: dist/artifact-reward.css).
import {getInscription, getPermanentInscription, slotInscriptionId, slotInscriptionList} from './inscriptions.mjs?v=stops-2';
import {inscriptionGlyph, inscriptionTag} from './inscription-ui.mjs?v=stops-2';
import {cardTermTextMarkup} from './card-terms.mjs?v=stops-2';
import {cardArt} from './card-art.mjs?v=stops-2';
import {inscriptionEffect} from './inscription-on-card.mjs?v=stops-2';
import {SKILL_CARDS, describeSkillCard} from './skill-cards.mjs?v=stops-2';
import {resolveChain, triggersFor, triggerName, num, chipOf} from './ui/chain-model.mjs?v=stops-2';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const rowOf = run => Array.from({length: Math.max(0, Number(run?.cardSlots) || (run?.mountedCards || []).length)}, (_, i) => run?.mountedCards?.[i] || null);
/** The plate the Chain tab would show for a slot under one Trigger: "+4", "×2", or null when the card does not act on it. */
function plateFor(row, kind, inscriptions, slot) {
  const ctx = resolveChain(row, kind, inscriptions?.some(Boolean) ? inscriptions : null);
  if (ctx.trigger !== kind) return null;
  const info = ctx.infos[slot];
  if (info?.kind !== 'act') return null;
  if (info.role === 'add') return `+${num(info.changed ? info.eff : info.base)}`;
  if (info.role === 'mul') return info.plate;
  if (info.role === 'repeat-paid') return `+${num(info.paid.amount)}`;
  return info.plate;
}
/** The card's one-line plate as the Chain shows it now (its own Trigger first), e.g. "Collect +2". */
export function slotPlate(run, slot) {
  const row = rowOf(run), card = row[slot];
  if (!card) return '';
  const ins = slotInscriptionList(run, row), kinds = triggersFor(row, ins).map(t => t.kind), own = chipOf(card);
  const order = [...new Set([...(own?.kind && kinds.includes(own.kind) ? [own.kind] : []), ...kinds])];
  for (const kind of order) { const p = plateFor(row, kind, ins, slot); if (p) return `${triggerName(kind)} ${p}`; }
  return own?.label || '';
}
/** What writing `id` on `slot` would do, from the real row preview (the run is not changed).
 * {replaces: id|null, needsCard, change: {trigger, before, after}|null, line} */
export function writePreview(run, slot, id) {
  const ins = getPermanentInscription(id), row = rowOf(run);
  if (!ins || !Number.isInteger(slot) || slot < 0 || slot >= row.length) return null;
  const card = row[slot], here = slotInscriptionId(run, slot);
  const replaces = here && here !== id ? here : null;
  const out = {id, slot, replaces, same: here === id, needsCard: ins.kind === 'card' && !card, change: null, line: ins.text};
  if (out.needsCard) { out.line = 'Needs a card here'; return out; }
  const eff = card ? inscriptionEffect(ins, card) : null;
  if (eff && !eff.works) { out.noEffect = true; out.line = `${ins.name}: ${eff.text}`; }
  if (!card || ins.kind !== 'card') return out;
  const before = slotInscriptionList(run, row) || row.map(() => null), after = before.map((x, i) => i === slot ? {id} : x);
  const kinds = [...new Set([...triggersFor(row, before), ...triggersFor(row, after)].map(t => t.kind))];
  for (const kind of kinds) {
    const b = plateFor(row, kind, before, slot), a = plateFor(row, kind, after, slot);
    if (a !== b && a) { out.change = {trigger: triggerName(kind), before: b, after: a}; break; }
  }
  if (out.noEffect) return out;
  if (out.change) out.line = out.change.before ? `${out.change.before} → ${out.change.after} on ${out.change.trigger}` : `Now fires on ${out.change.trigger}: ${out.change.after}`;
  else out.line = `${ins.name}: ${eff.text}`;
  return out;
}

/** The help context of a card or an Inscription, so its "?" opens the card help / glossary layer (card-terms.mjs). */
const cardHelp = card => { const d = describeSkillCard(card); return `data-card-help="${esc(card.cardId)}" data-card-name="${esc(d?.name || '')}" data-card-description="${esc(d?.effect || d?.description || '')}"`; };
const helpBtn = (label, terms) => `<button type="button" class="iw-help" data-card-terms="${esc(terms)}" aria-haspopup="dialog" aria-label="${esc(label)}">?</button>`;

/** The offer card: big crisp mark, name, tag, one keyword line. A stretched button selects it; keyword links sit above it. */
function offerCard(id, picked, action) {
  const i = getInscription(id), on = picked === id;
  return `<article class="iw-offer scribe-${i.kind}${on ? ' iw-on' : ''}" data-scribe-offer="${esc(id)}" data-card-help="inscription-${esc(id)}" data-card-name="${esc(i.name)}" data-card-description="${esc(i.text)}">
    <button type="button" class="iw-select" data-action="${action}" data-id="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Selected: ' : 'Select '}${esc(i.name)}. ${esc(i.text)}"></button>
    <span class="scribe-mark">${inscriptionGlyph(id, {role: 'large'})}</span>
    <div class="iw-offer-copy"><h2>${esc(i.name)}</h2>${inscriptionTag(i)}</div>${helpBtn(`Read ${i.name}`, `inscription ${i.kind === 'card' ? 'ins-card' : 'ins-slot'}`)}
    <p class="scribe-rule">${cardTermTextMarkup(i.text)}</p>
  </article>`;
}
/** One slot of the Chain: number, card picture and name, its plate, what is written there; the result when chosen with an offer. */
function slotCard(run, n, picked, chosen, action) {
  const card = run.mountedCards?.[n], def = card ? SKILL_CARDS[card.cardId] : null, name = card ? describeSkillCard(card)?.name || def?.name || 'Card' : '';
  const cur = getInscription(slotInscriptionId(run, n));
  const pv = chosen && picked ? writePreview(run, n, picked) : null, nu = pv ? getInscription(picked) : null;
  const pic = card ? `<span class="iw-pic">${cardArt({cardId: card.cardId, rarity: card.rarity || def?.rarity, name}, {compact: true})}</span>` : '<span class="iw-pic iw-pic-empty" aria-hidden="true"></span>';
  const plate = card ? slotPlate(run, n) : '';
  const brandLine = (ins, cls = '') => `<span class="iw-brand${cls}" data-card-help="inscription-${esc(ins.id)}" data-card-name="${esc(ins.name)}" data-card-description="${esc(ins.text)}"><button type="button" class="iw-brand-help" data-card-terms="inscription${ins.kind === 'card' ? ' ins-card' : ins.kind === 'standalone' ? ' ins-slot' : ''}" aria-haspopup="dialog" aria-label="Read ${esc(ins.name)}">${inscriptionGlyph(ins.id, {role: 'list'})}<span>${esc(ins.name)}</span></button></span>`;
  let ins;
  if (pv) {
    const old = pv.replaces ? getInscription(pv.replaces) : null;
    ins = `${brandLine(nu, ' iw-brand-new')}${old ? `<s class="iw-old" aria-label="Replaces ${esc(old.name)}"><span>Replaces ${esc(old.name)}</span></s>` : ''}<b class="iw-result${pv.needsCard || pv.noEffect ? ' iw-warn' : ''}">${esc(pv.same ? 'Already written here' : pv.line)}</b>`;
  } else if (cur) ins = brandLine(cur);
  else ins = '<span class="iw-none">No Inscription</span>';
  const spoken = `Slot ${n + 1}, ${card ? name : 'empty'}${plate ? `, ${plate}` : ''}. ${pv ? `${nu.name} here: ${pv.line}${pv.replaces ? `, replaces ${getInscription(pv.replaces).name}` : ''}` : cur ? `Written: ${cur.name}` : 'No Inscription'}`;
  return `<article class="iw-slot scribe-slot${chosen ? ' iw-on' : ''}${card ? '' : ' iw-slot-empty'}${cur ? ' scribe-slot-inscribed' : ''}" data-slot="${n}"${card ? ` ${cardHelp(card)}` : ''}>
    <button type="button" class="iw-select" data-action="${action}" data-slot="${n}" aria-pressed="${!!chosen}" aria-label="${esc(spoken)}"></button>
    <span class="iw-slot-head"><b class="scribe-slot-n">Slot ${n + 1}</b>${card ? helpBtn(`Read ${name}`, '') : ''}</span>
    <span class="iw-card">${pic}<span class="iw-card-text"><span class="iw-name scribe-slot-name">${card ? esc(name) : 'Empty slot'}</span>${plate ? `<span class="iw-plate">${esc(plate)}</span>` : ''}</span></span>
    <span class="iw-ins">${ins}</span>
  </article>`;
}
/** The whole screen body (header band, offers, Chain). actions: {pick, slot, write}; picked/slot: the current selection. */
export function inscriptionWriteMarkup(run, {offers = [], picked = null, slot = null, kicker = '', title = 'Write an Inscription', note = '', actions = {pick: 'scribe-pick', slot: 'scribe-slot', write: 'scribe-write'}, className = ''} = {}) {
  const ids = offers.filter(id => getPermanentInscription(id)), sel = ids.includes(picked) ? picked : null;
  const slots = rowOf(run).map((_, n) => n), at = Number.isInteger(slot) && slot >= 0 && slot < slots.length ? slot : null;
  const pv = sel && at !== null ? writePreview(run, at, sel) : null, ready = !!pv && !pv.same;
  const hint = !sel && at === null ? 'Choose an Inscription and a slot' : !sel ? 'Now choose an Inscription' : at === null ? 'Now choose a slot' : pv?.same ? 'Already written there' : pv?.replaces ? `Write ${getInscription(sel).name}, replacing ${getInscription(pv.replaces).name}` : `Write ${getInscription(sel).name} on slot ${at + 1}`;
  const write = `<button type="button" class="wb-sign wb-sign-primary iw-write" data-action="${actions.write}"${ready ? '' : ' disabled aria-disabled="true"'} aria-label="${esc(hint)}"><span>${pv?.replaces ? 'Replace' : 'Write'}</span></button>`;
  return `<section class="scribe-screen ins-write rw-screen wb-reskin wb-ground wb-inline wb-framed reward-open ${className}">
    <header class="iw-head"><div class="iw-titles"><small class="iw-kicker">${esc(kicker)}</small><h1 class="iw-title">${esc(title)}</h1></div><span class="iw-hint" role="status">${esc(note || hint)}</span>${write}</header>
    <div class="iw-offers" role="group" aria-label="Inscriptions" style="--offers:${ids.length}">${ids.map(id => offerCard(id, sel, actions.pick)).join('')}</div>
    <div class="iw-chain scribe-slots" role="group" aria-label="Your Chain" style="--slots:${slots.length}">${slots.map(n => slotCard(run, n, sel, n === at, actions.slot)).join('')}</div>
  </section>`;
}
