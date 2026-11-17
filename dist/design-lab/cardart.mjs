// v1.0-cardart showcase. Reads the real card data and the game's current art renderer; the new art is the
// static SVG set in design-lab/assets/cardart/ (source: assets/cardart/art.mjs, written by build.mjs).
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';
import {cardArt} from '../card-art.mjs?v=guide-clarity-1';
import {cardTileLine} from '../card-tile-lines.mjs?v=guide-clarity-1';
import {frameVars, gem, EYE, FIRE, triggerIcon} from '../ui/trigger-icons.mjs?v=guide-clarity-1';
import {PAL, CARD_IDS} from './assets/cardart/art.mjs';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const RARITY = {common: 'Common', rare: 'Rare', legendary: 'Legendary'};
// Plain rule text (from the card's ruleBands in card-catalog.mjs) and its Trigger.
const CARDS = {
  'body-spark': {rule: 'Collect: +2 Sparks.', when: 'Collect', icon: 'body-spark',
    A: 'The wisp, two Sparks flying into it.', B: 'The wisp over a grass ledge, two Sparks dropping into it.'},
  'courier-tip': {rule: 'Delivery: +2 Sparks.', when: 'Delivery', icon: 'collector-delivery',
    A: 'The Collector rushing in with a Spark, two small tip Sparks popping off.', B: 'The same Collector delivery flying low over the ground, with its shadow.'},
  'growth-seed': {rule: 'At Rest, Grow: +5 max Sparks and a full meter. 3 Grows per journey.', when: 'Rest', icon: 'rest',
    A: 'A seed sprouting beside a full meter whose new top rises past the old notch.', B: 'The sprout by the Rest campfire, outgrowing the top notch of a measuring stake.'},
  rhythm: {rule: 'Always on: 3 even Lifts send out a Pulse.', when: 'Always on', icon: 'rhythm-phrase',
    A: 'A metronome with three Spark beats on an even arc, on a lit backdrop.', B: 'The metronome on a hill at night, three Spark beats and the moon.'},
  'harvest-legendary': {rule: 'Pulse: +2 Sparks, and +1 Stored on its first Spark.', when: 'Pulse', icon: 'wave-crossing',
    A: 'A bound golden sheaf in a glow, a ring of Sparks going out from it, gold key-line.', B: 'The sheaf standing in a moonlit field, a gold ring sweeping out and Sparks lifting, gold key-line.'},
  'last-light': {rule: 'Save, with the meter at 1/3 or less: +9 Sparks.', when: 'Save', icon: 'guard-rescue',
    A: 'One small flame held in the Save heart, glowing in the dark, gold key-line.', B: 'The heart and flame on dark ground, its light the only light, gold key-line.'},
};
const whenIcon = (k, size = 16) => k === 'rest' ? FIRE.replace(/width="16" height="16"/, `width="${size}" height="${size}"`) : triggerIcon(k, size);
const newSrc = (id, dir) => `design-lab/assets/cardart/${id}-${dir}.svg`;
const newImg = (id, dir, scale, cls = '') => `<img class="ca-px ${cls}" src="${newSrc(id, dir)}" width="${48 * scale}" height="${48 * scale}" alt="${esc(`${CARDS[id][dir]} (direction ${dir}, ${scale}x)`)}">`;
const current = (card, w, h) => cardArt(card, {compact: true}).replace(/width="120" height="168"/, `width="${w}" height="${h}"`);
const fig = (inner, cap, sub = '') => `<figure class="ca-fig"><div class="ca-frame">${inner}</div><figcaption><b>${cap}</b>${sub ? `<i>${sub}</i>` : ''}</figcaption></figure>`;

document.getElementById('ca-pal').innerHTML = Object.entries(PAL).map(([k, [hex, name]]) =>
  `<li><span class="ca-sw" style="background:${hex}"></span><span><b>${esc(name)}</b><code>${hex}</code></span></li>`).join('');

// ── Compare rows ──
document.getElementById('ca-rows').innerHTML = CARD_IDS.map(id => {
  const card = CARD_CATALOG[id], c = CARDS[id], r = card.rarity;
  const group = (dir) => `<div class="ca-group"><h3><code class="ca-code">v1.0-cardart-${dir}</code></h3><div class="ca-figs">${[1, 2, 3].map(s => fig(newImg(id, dir, s), `${s}x`, `${48 * s} px`)).join('')}</div><p class="ca-desc">${esc(c[dir])}</p></div>`;
  return `<article class="ca-row ca-r-${r}">
   <div class="ca-info"><h3>${esc(card.name)}</h3><p class="ca-rar"><span class="ca-gem">${gem(r)}</span>${RARITY[r]}</p><p class="ca-rule"><span class="ca-when">${whenIcon(c.icon)}</span>${esc(c.rule)}</p></div>
   <div class="ca-scroll">
    <div class="ca-group ca-cur"><h3>Current</h3><div class="ca-figs">${fig(current(card, 44, 44), 'Deck tile', '44 px, 0.55x')}${fig(current(card, 110, 165), 'Opened', '110×165, 2.06x')}</div><p class="ca-desc">Shared painted scene (${esc(card.artFamily)}).</p></div>
    ${group('A')}${group('B')}
   </div></article>`;
}).join('');

// ── In place: Deck tile and opened card, three looks each ──
const looks = [['Current', null], ['v1.0-cardart-A', 'A'], ['v1.0-cardart-B', 'B']];
function tile(card, dir) {
  const r = card.rarity, c = CARDS[card.id];
  const art = dir ? newImg(card.id, dir, 1) : current(card, 44, 44);
  return `<div class="ca-tile dc-r-${r}" style="--fr:var(--fr-${r})"><div class="ca-tilemain">
    <span class="ca-top"><span class="ca-rtab">${gem(r)}<b>${RARITY[r]}</b></span></span>
    <span class="ca-body"><span class="ca-art${dir ? ' ca-art-new' : ''}">${art}</span>
     <span class="ca-text"><b class="ca-name">${esc(card.name)}</b><b class="ca-effect">${esc(cardTileLine(card))}</b><span class="ca-whenline">${whenIcon(c.icon)}<span>${esc(c.when)}</span></span></span></span></div>
    <span class="ca-eye" aria-hidden="true"><span class="ca-eyebody">${EYE}</span></span></div>`;
}
function face(card, dir) {
  const r = card.rarity, c = CARDS[card.id];
  const art = dir ? newImg(card.id, dir, 2) : current(card, 96, 96);
  return `<div class="ca-face dc-r-${r}" style="--fr:var(--fr-${r})">
    <div class="ca-fband">${gem(r)}<b>${RARITY[r]}</b></div>
    <h4 class="ca-fname">${esc(card.name)}</h4>
    <div class="ca-fart${dir ? ' ca-art-new' : ''}">${art}</div>
    <div class="ca-frule"><span class="ca-fcond">${whenIcon(c.icon)}<b>${esc(c.when)}</b></span><b class="ca-feff">${esc(cardTileLine(card))}</b></div></div>`;
}
const inplace = document.getElementById('ca-inplace');
inplace.setAttribute('style', frameVars());
inplace.innerHTML = CARD_IDS.map(id => {
  const card = CARD_CATALOG[id];
  return `<article class="ca-place"><h3>${esc(card.name)} <small>${RARITY[card.rarity]}</small></h3><div class="ca-placescroll">${looks.map(([label, dir]) =>
    `<div class="ca-look"><h4>${dir ? `<code class="ca-code">${label}</code>` : label}</h4>${tile(card, dir)}${face(card, dir)}</div>`).join('')}</div></article>`;
}).join('');
