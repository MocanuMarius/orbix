// v1.0-cardart-B Rare and Legendary sheet. Pictures: design-lab/assets/cardart/cards/<id>.svg, written by
// assets/cardart/build-rare.mjs from assets/cardart/art-rare.mjs. ?ids=a,b limits the sheet to those cards.
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';
import {getCardRuleBands, cardRuleSentence} from '../card-rule-bands.mjs?v=guide-clarity-1';
import {cardTileLine} from '../card-tile-lines.mjs?v=guide-clarity-1';
import {frameVars, gem, EYE} from '../ui/trigger-icons.mjs?v=guide-clarity-1';
import {FAMILIES} from './assets/cardart/art-rare.mjs';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const RARITY = {common: 'Common', rare: 'Rare', legendary: 'Legendary'};
const DIR = 'design-lab/assets/cardart/cards/';
const only = new URLSearchParams(location.search).get('ids')?.split(',').filter(Boolean);

const manifest = await (await fetch(`${DIR}manifest-rare.json`, {cache: 'no-store'})).json();
const ids = Object.keys(manifest).filter(id => !only || only.includes(id));
const stamp = Date.now();
const img = (id, s, alt) => `<img class="ca-px" src="${DIR}${manifest[id].file}?t=${stamp}" width="${48 * s}" height="${48 * s}" alt="${esc(alt)}">`;
const rule = card => cardRuleSentence(getCardRuleBands(card, card));
const lineHtml = (id) => manifest[id].line.length < 2 ? '<span class="cr-solo">No evolution line</span>'
  : manifest[id].line.map(l => { const c = CARD_CATALOG[l];
    return `<span class="cr-step${l === id ? ' cr-here' : ''}">${gem(c.rarity)}${esc(c.name)}</span>`; }).join('<span class="cr-arrow" aria-hidden="true">›</span>');

function tile(card) {
  const r = card.rarity;
  return `<div class="ca-tile dc-r-${r}" style="--fr:var(--fr-${r})"><div class="ca-tilemain">
    <span class="ca-top"><span class="ca-rtab">${gem(r)}<b>${RARITY[r]}</b></span></span>
    <span class="ca-body"><span class="ca-art ca-art-new">${img(card.id, 1, `${card.name} (Deck tile)`)}</span>
     <span class="ca-text"><b class="ca-name">${esc(card.name)}</b><b class="ca-effect">${esc(cardTileLine(card))}</b></span></span></div>
    <span class="ca-eye" aria-hidden="true"><span class="ca-eyebody">${EYE}</span></span></div>`;
}
function cell(id) {
  const card = CARD_CATALOG[id], m = manifest[id], r = card.rarity;
  return `<article class="cr-cell ca-r-${r}" id="c-${id}">
    <div class="cr-figs">${[1, 2, 3].map(s => `<figure class="ca-fig"><div class="ca-frame">${img(id, s, `${m.idea} (${s}x)`)}</div><figcaption>${s}x</figcaption></figure>`).join('')}</div>
    <div class="cr-info">
     <h3>${esc(card.name)} <code class="cr-id">${esc(id)}</code></h3>
     <p class="ca-rar"><span class="ca-gem">${gem(r)}</span>${RARITY[r]}</p>
     <p class="ca-rule">${esc(rule(card))}</p>
     <p class="cr-idea"><b>Picture</b> ${esc(m.idea)}</p>
     <p class="cr-line">${lineHtml(id)}</p>
    </div>
    <div class="cr-tile">${tile(card)}</div>
   </article>`;
}

function contactCell(id) {
  const card = CARD_CATALOG[id], r = card.rarity;
  return `<article class="cr-ccell ca-r-${r}"><div class="cr-pair"><div class="ca-frame">${img(id, 3, manifest[id].idea)}</div><div class="ca-frame">${img(id, 1, manifest[id].idea)}</div></div>
    <h3>${esc(card.name)}</h3><p class="ca-rar"><span class="ca-gem">${gem(r)}</span>${RARITY[r]}</p></article>`;
}
const contact = new URLSearchParams(location.search).get('view') === 'contact';
const main = document.getElementById('cr-main');
main.setAttribute('style', frameVars());
if (contact) document.body.classList.add('cr-contact');
const groups = FAMILIES.map(f => [f, ids.filter(id => manifest[id].family === f)]).filter(([, list]) => list.length);
main.innerHTML = groups.map(([f, list]) => `<section class="cr-fam" id="f-${f.replace(/\W+/g, '-')}" aria-label="${esc(f)}">
  <h2 class="ca-sec">${esc(f)} <small>${list.length}</small></h2><div class="cr-grid">${list.map(contact ? contactCell : cell).join('')}</div></section>`).join('');
document.getElementById('cr-nav').innerHTML = groups.map(([f, list]) => `<a href="${location.pathname}${location.search}#f-${f.replace(/\W+/g, '-')}">${esc(f)} <small>${list.length}</small></a>`).join('');
const rares = ids.filter(id => CARD_CATALOG[id].rarity === 'rare').length;
document.getElementById('cr-count').textContent = `${ids.length} cards: ${rares} Rare, ${ids.length - rares} Legendary.`;
document.body.dataset.ready = '1';
