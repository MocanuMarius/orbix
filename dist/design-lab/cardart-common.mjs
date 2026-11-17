// v1.0-cardart-B Common sheet. Pictures are the static SVGs in assets/cardart/cards/ (source art-common.mjs,
// written by build-common.mjs). Card names and rule lines come from the real catalog.
// Review helpers: ?zoom=4 adds a 4x column; ?ids=a,b limits the sheet to those cards.
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';
import {cardTileLine} from '../card-tile-lines.mjs?v=guide-clarity-1';
import {frameVars, gem, EYE, FIRE, triggerIcon} from '../ui/trigger-icons.mjs?v=guide-clarity-1';
import {COMMON_META, COMMON_IDS} from './assets/cardart/art-common.mjs';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const q = new URLSearchParams(location.search);
const zoom = Number(q.get('zoom')) || 0;
const only = q.get('ids') ? new Set(q.get('ids').split(',')) : null;
const FAMILIES = ['Collect', 'Delivery', 'Latch', 'Pulse', 'Flash', 'Flash ends', 'Rhythm', 'Falling Lift', 'Lift', 'Save', 'Clear', 'Rest', 'Any Trigger', 'Next card', 'Always on'];
const ICON = {Collect: 'body-spark', Delivery: 'collector-delivery', Latch: 'collector-attach', Pulse: 'wave-crossing', Flash: 'flash-pickup', 'Flash ends': 'flash-expiry', Rhythm: 'rhythm-phrase', 'Falling Lift': 'downbeat-lift', Save: 'guard-rescue', Clear: 'flight-clear'};
const icon = fam => fam === 'Rest' ? FIRE : ICON[fam] ? triggerIcon(ICON[fam], 16) : '';
const rule = card => (card.ruleBands || []).map(b => b.type === 'condition' ? `${b.text}:` : b.type === 'effect' ? b.text : '').filter(Boolean).join(' ')
  .replace('{amountSparks}', `${card.amount} Spark${card.amount === 1 ? '' : 's'}`).replace('{amount}', card.amount).replace('{replayAmount}', card.replayAmount ?? '')
  .replace(/\s*\{uses\}/, card.charges ? ` (${card.charges} use${card.charges === 1 ? '' : 's'})` : '');
const img = (id, s) => `<img class="ca-px" src="design-lab/assets/cardart/cards/${id}.svg" width="${48 * s}" height="${48 * s}" alt="${esc(COMMON_META[id].idea)} (${s}x)">`;
function tile(card, fam) {
  return `<div class="ca-tile dc-r-common" style="--fr:var(--fr-common)"><div class="ca-tilemain">
    <span class="ca-top"><span class="ca-rtab">${gem('common')}<b>Common</b></span></span>
    <span class="ca-body"><span class="ca-art ca-art-new">${img(card.id, 1)}</span>
     <span class="ca-text"><b class="ca-name">${esc(card.name)}</b><b class="ca-effect">${esc(cardTileLine(card))}</b><span class="ca-whenline">${icon(fam)}<span>${esc(fam)}</span></span></span></span></div>
    <span class="ca-eye" aria-hidden="true"><span class="ca-eyebody">${EYE}</span></span></div>`;
}
function cell(id) {
  const card = CARD_CATALOG[id], m = COMMON_META[id];
  const cont = m.line.filter(x => x !== id);
  return `<article class="cc-cell" id="c-${id}">
    <div class="cc-pics">${[1, 2, ...(zoom ? [zoom] : [])].map(s => `<div class="ca-frame">${img(id, s)}</div>`).join('')}</div>
    <div class="cc-info"><h3>${esc(card.name)} <code>${esc(id)}</code></h3><p class="cc-rule">${esc(rule(card))}</p><p class="cc-idea">${esc(m.idea)}</p>
     ${cont.length ? `<p class="cc-line">Line continues: ${cont.map(x => `<code>${esc(x)}</code> <small>${esc(CARD_CATALOG[x]?.rarity || '')}</small>`).join(', ')}</p>` : ''}
     ${tile(card, m.family)}</div></article>`;
}
const ids = COMMON_IDS.filter(id => !only || only.has(id));
const main = document.getElementById('cc-main');
main.setAttribute('style', frameVars());
const fams = FAMILIES.filter(f => ids.some(id => COMMON_META[id].family === f));
main.innerHTML = fams.map(f => {
  const list = ids.filter(id => COMMON_META[id].family === f);
  return `<section class="cc-fam" id="f-${f.replace(/\W+/g, '-')}"><h2 class="ca-sec"><span class="cc-ficon">${icon(f)}</span>${esc(f)} <small>${list.length}</small></h2><div class="cc-grid${zoom ? ' cc-zoom' : ''}">${list.map(cell).join('')}</div></section>`;
}).join('');
document.getElementById('cc-nav').innerHTML = fams.map(f => `<a href="design-lab/cardart-common.html${location.search}#f-${f.replace(/\W+/g, '-')}">${esc(f)}</a>`).join('');
document.getElementById('cc-count').textContent = `${ids.length} cards.`;
