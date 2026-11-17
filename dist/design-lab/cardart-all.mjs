// v1.0-cardart-B full-set contact sheet. Pictures and grouping come from assets/cardart/cards/manifest.json
// (written by assets/cardart/build-all.mjs). ?view=lines shows evolution lines only; ?tiles=1 starts with the
// Deck tile mock on.
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';
import {cardTileLine} from '../card-tile-lines.mjs?v=guide-clarity-1';
import {frameVars, gem, EYE} from '../ui/trigger-icons.mjs?v=guide-clarity-1';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const RARITY = {common: 'Common', rare: 'Rare', legendary: 'Legendary'};
const RANK = {common: 0, rare: 1, legendary: 2};
const ORDER = ['Collect', 'Delivery', 'Latch', 'Pulse', 'Flash', 'Flash ends', 'Rhythm', 'Lift', 'Falling Lift', 'Overfill', 'Save', 'Clear', 'Rest',
  'Any Trigger', 'Next card', 'Always on', 'Pulse from a card', 'A card gives Sparks', 'Any card event', 'Proximity fills', 'Pack', 'Take-off'];
const DIR = 'design-lab/assets/cardart/cards/';
const q = new URLSearchParams(location.search);
const linesOnly = q.get('view') === 'lines';

const manifest = await (await fetch(`${DIR}manifest.json`, {cache: 'no-store'})).json();
const stamp = Date.now();
const nameOf = id => CARD_CATALOG[id]?.name ?? manifest[id].name ?? id;
const img = (id, s) => `<img class="ca-px" src="${DIR}${manifest[id].file}?t=${stamp}" width="${48 * s}" height="${48 * s}" alt="${esc(manifest[id].idea)} (${s}x)">`;
const tileLine = id => { try { return CARD_CATALOG[id] ? cardTileLine(CARD_CATALOG[id]) : ''; } catch { return ''; } };

function tile(id) {
  const r = manifest[id].rarity;
  return `<div class="ca-tile dc-r-${r}" style="--fr:var(--fr-${r})"><div class="ca-tilemain">
    <span class="ca-top"><span class="ca-rtab">${gem(r)}<b>${RARITY[r]}</b></span></span>
    <span class="ca-body"><span class="ca-art ca-art-new">${img(id, 1)}</span>
     <span class="ca-text"><b class="ca-name">${esc(nameOf(id))}</b><b class="ca-effect">${esc(tileLine(id))}</b></span></span></div>
    <span class="ca-eye" aria-hidden="true"><span class="ca-eyebody">${EYE}</span></span></div>`;
}
function cell(id) {
  const m = manifest[id], r = m.rarity;
  return `<article class="ax-cell ca-r-${r}" id="c-${id}" title="${esc(m.idea)}">
    <div class="ax-pics"><div class="ca-frame">${img(id, 2)}</div><div class="ca-frame">${img(id, 1)}</div></div>
    <div class="ax-tile">${tile(id)}</div>
    <h3>${esc(nameOf(id))}${m.unreleased ? '<span class="ax-new">new</span>' : ''}</h3>
    <p class="ca-rar"><span class="ca-gem">${gem(r)}</span>${RARITY[r]}${m.notInCatalog ? ' · not in catalog' : ''}</p>
   </article>`;
}
// Lines: the evolution line a card sits in (base first), sorted Common → Rare → Legendary.
const ids = Object.keys(manifest);
const lineKey = id => manifest[id].line[0];
const families = ORDER.filter(f => ids.some(id => manifest[id].family === f)).concat([...new Set(ids.map(id => manifest[id].family))].filter(f => !ORDER.includes(f)));
const groups = families.map(f => {
  const inFam = ids.filter(id => manifest[id].family === f);
  const lines = [...new Set(inFam.map(lineKey))].map(k => inFam.filter(id => lineKey(id) === k).sort((a, b) => RANK[manifest[a].rarity] - RANK[manifest[b].rarity]));
  lines.sort((a, b) => b.length - a.length);
  return [f, linesOnly ? lines.filter(l => l.length > 1) : lines];
}).filter(([, lines]) => lines.length);

const main = document.getElementById('ax-main');
main.setAttribute('style', frameVars());
if (linesOnly) document.body.classList.add('ax-linesonly');
const fid = f => 'f-' + f.replace(/\W+/g, '-');
main.innerHTML = groups.map(([f, lines]) => {
  const n = lines.flat().length;
  return `<section class="ax-fam" id="${fid(f)}" aria-label="${esc(f)}"><h2 class="ca-sec">${esc(f)} <small>${n}</small></h2>
    <div class="ax-lines">${lines.map(l => l.length > 1
      ? `<div class="ax-line">${l.map(cell).join('<span class="ax-arrow" aria-hidden="true">›</span>')}</div>`
      : cell(l[0])).join('')}</div></section>`;
}).join('');
document.getElementById('ax-nav').innerHTML = groups.map(([f, lines]) => `<a href="${location.pathname}${location.search}#${fid(f)}">${esc(f)} <small>${lines.flat().length}</small></a>`).join('');
const shown = groups.flatMap(([, l]) => l.flat());
const count = r => shown.filter(id => manifest[id].rarity === r).length;
document.getElementById('ax-count').textContent = `${shown.length} cards: ${count('common')} Common, ${count('rare')} Rare, ${count('legendary')} Legendary; ${shown.filter(id => manifest[id].unreleased).length} new.`;
const box = document.getElementById('ax-tiles');
const setTiles = on => { document.body.classList.toggle('ax-tiles-on', on); box.checked = on; };
box.addEventListener('change', () => setTiles(box.checked));
setTiles(q.get('tiles') === '1');
document.getElementById(linesOnly ? 'ax-lines' : 'ax-everything').setAttribute('aria-current', 'page');
document.body.dataset.ready = '1';
