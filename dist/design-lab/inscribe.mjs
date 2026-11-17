// v1.0-inscribe · design lab only; nothing in the game imports this.
// Three marks for an Inscription (an artifact effect written on a card), drawn on whole-pixel grids.
// Cards use the game's own catalog, rule text, art and frames. No real logic: every frame is static.
import {CARD_CATALOG} from '../card-catalog.mjs?v=guide-clarity-1';
import {getCardRuleBands, cardRuleSentence} from '../card-rule-bands.mjs?v=guide-clarity-1';
import {cardTileLine} from '../card-tile-lines.mjs?v=guide-clarity-1';
import {frameVars, gem, pixelArt, chipIcon, EYE} from '../ui/trigger-icons.mjs?v=guide-clarity-1';
import {triggerDisplay} from '../card-trigger-labels.mjs?v=guide-clarity-1';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const RW = {common: 'Common', rare: 'Rare', legendary: 'Legendary'};
const CAP = {common: 'Common', rare: 'Rare', legendary: 'Legendary'};
document.body.setAttribute('style', frameVars());

// ── Glyphs: 9 × 9, one colour, one per keyword ─────────────────────────────────────────────────
const GLYPH = {
  flame: ['....G....', '...GG....', '...GGG...', '..GGGGG..', '.GGGGGGG.', '.GGGGGGG.', '.GGGGGGG.', '..GGGGG..', '...GGG...'],
  crown: ['.........', 'G...G...G', 'GG.GGG.GG', 'GGGGGGGGG', 'GGGGGGGGG', 'GGGGGGGGG', '.GGGGGGG.', '.........', '.........'],
  eye: ['.........', '.........', '..GGGGG..', '.GG...GG.', 'GG..G..GG', '.GG...GG.', '..GGGGG..', '.........', '.........'],
};
const glyph = (kind, scale, color) => pixelArt(GLYPH[kind], {size: 9 * scale, pal: {G: color}, cls: 'ib-gl'});
// The wax seal: a 13 × 13 disc with outline, highlight and shade, the glyph pressed in the middle.
function sealRows(kind) {
  const N = 13, c = 6, g = Array.from({length: N}, () => Array(N).fill('.'));
  const inside = (x, y) => Math.hypot(x - c, y - c) <= 6.3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(x, y)) g[y][x] = 'W';
  const o = g.map(r => [...r]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === 'W') {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') === '.');
    const d = Math.hypot(x - c, y - c);
    if (edge) o[y][x] = 'O';
    else if (d > 4.2 && x + y < 12) o[y][x] = 'H';
    else if (d > 4.2 && x + y > 12) o[y][x] = 'S';
  }
  GLYPH[kind].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'G') o[j + 2][i + 2] = 'C'; }));
  return o.map(r => r.join(''));
}
const seal = kind => pixelArt(sealRows(kind), {size: 26, pal: {O: '#2a1d12', W: '#a8403a', H: '#d9786b', S: '#6e2622', C: '#f5d195'}, cls: 'ib-seal-svg'});

// ── The three marks, as hooks into each card shape ─────────────────────────────────────────────
// ctx: 'face' (opened card), 'mount' (Chain slot) or 'tile' (deck tile). All three marks are in the markup;
// CSS shows the one named by data-mk on the nearest frame.
const RUNE = '<i class="mkC ib-rune" aria-hidden="true"><s></s><s></s><s></s><s></s></i>';
const mkOuter = (kind, ctx) => `<i class="mkA ib-seal ib-seal-${ctx}" aria-hidden="true">${seal(kind)}</i>${RUNE}${ctx === 'mount' ? `<i class="mkC ib-corner">${glyph(kind, 1, '#6fd6c4')}</i>` : ''}`;
const mkBand = (kind, ctx) => `<i class="mkB ib-band ib-band-${ctx}" aria-hidden="true"><s></s>${glyph(kind, ctx === 'face' ? 2 : 1, '#f0c86a')}<s></s></i>`;
const mkChip = kind => `<i class="mkC ib-chipglyph" aria-hidden="true">${glyph(kind, 1, '#6fd6c4')}</i>`;

// ── Card shapes ───────────────────────────────────────────────────────────────────────────────
const info = id => { const c = CARD_CATALOG[id]; return {id, name: c.name.replace(/\s*\+\d+$/, ''), rarity: c.rarity, trigger: c.trigger,
  tile: cardTileLine({id}), rule: cardRuleSentence(getCardRuleBands(c, c)).replace(/^[^:]*:\s*/, '')}; };
const art = i => `<img class="cb-px" src="assets/cardart/cards/${esc(i.id)}.svg" width="48" height="48" alt="" draggable="false">`;
const label = i => triggerDisplay(i.trigger)?.label || i.trigger;
const chip = i => `${chipIcon(i.trigger, 16)}<b>${esc(label(i))}</b>`;
const whenLine = (i, kind) => `<span class="ca-whenline">${chipIcon(i.trigger, 16)}<span>${esc(label(i))}</span>${kind ? mkChip(kind) : ''}</span>`;

function face(i, kind, big = false) {
  return `<div class="ca-face ib-face${big ? ' cb-face' : ''} dc-r-${i.rarity}" style="--fr:var(--fr-${i.rarity})">${kind ? mkOuter(kind, 'face') : ''}
   <div class="ca-fband">${gem(i.rarity)}<b>${RW[i.rarity]}</b></div><div class="ca-fname">${esc(i.name)}</div>
   <div class="ca-fart">${art(i)}${kind ? mkBand(kind, 'face') : ''}</div>
   <div class="ca-frule"><div class="ca-fcond">${chip(i)}${kind ? mkChip(kind) : ''}</div><div class="ca-feff">${esc(big ? i.rule : i.tile)}</div></div></div>`;
}
function mount(i, kind, cls = '') {
  return `<div class="cb-st ${cls}"><div class="cb-mt dc-r-${i.rarity}" style="--fr:var(--fr-chain${CAP[i.rarity]})">${kind ? mkOuter(kind, 'mount') : ''}
   <span class="cb-mart ib-mart">${art(i)}${kind ? mkBand(kind, 'mount') : ''}</span><b class="cb-mname">${esc(i.name)}</b></div></div>`;
}
function tile(i, kind) {
  return `<div class="ca-tile cb-tile ib-tile dc-r-${i.rarity}" style="--fr:var(--fr-${i.rarity})">${kind ? `<i class="mkA ib-seal ib-seal-tile" aria-hidden="true">${seal(kind)}</i>` : ''}
   <div class="ca-tilemain">${kind ? RUNE : ''}<span class="ca-top"><span class="ca-rtab">${gem(i.rarity)}<b>${RW[i.rarity]}</b></span></span>
   <span class="ca-body"><span class="ca-art ca-art-new ib-art">${art(i)}${kind ? mkBand(kind, 'tile') : ''}</span><span class="ca-text"><b class="ca-name">${esc(i.name)}</b><b class="ca-effect">${esc(i.tile)}</b>${whenLine(i, kind)}</span></span></div>
   <span class="ca-eye" aria-hidden="true"><span class="ca-eyebody">${EYE}</span></span></div>`;
}
const strip = items => `<div class="cb-strip ib-strip"><div class="cb-slots">${items.join('')}</div></div>`;

// ── Sample data ───────────────────────────────────────────────────────────────────────────────
const INS = {
  flame: {name: 'Spark Wick', trig: 'collect', rule: 'Restore up to 10 extra Sparks.', uses: 'Uses: 3 per flight', suits: 'Collect cards', icon: 'flame'},
  crown: {name: 'Salt Crown', trig: 'overfill', rule: 'Store one free Lift.', uses: 'Up to 3 per flight', suits: 'Overfill and Collect cards', icon: 'crown'},
  eye: {name: 'Moonwake Lens', trig: 'collect', rule: 'While falling, reveal the passage for 1.5 s.', uses: 'Up to 3 per flight', suits: 'Collect and Lift cards', icon: 'eye'},
};
const C = {body: info('body-spark'), spring: info('ring-spring'), harvest: info('harvest-legendary'), echo: info('echo'),
  pocket: info('spark-cache'), down: info('downbeat'), courier: info('courier-tip'), dusk: info('dusk-wick'), prism: info('prism-lens')};
const SHOW = [[C.body, 'flame'], [C.spring, 'crown'], [C.harvest, 'eye']];

function variant(code, key, title, text) {
  return `<section class="ib-sec" id="v${key}"><h2>${title} <span class="ib-code">${code}</span></h2><p class="ib-note">${text}</p>
   <div class="ib-frame" data-mk="${key}">
    <div class="ib-row1">
     <div class="ib-grp"><h3>Opened cards</h3><div class="ib-faces">${SHOW.map(([i, k]) => face(i, k)).join('')}</div></div>
     <div class="ib-grp"><h3>Chain row</h3>${strip([mount(C.body, 'flame'), mount(C.echo, null), mount(C.spring, 'crown'), mount(C.harvest, 'eye')])}<p class="ib-cap">Echo (a Repeat card) has none. Wick, Crown and Lens sit on the other three.</p></div>
    </div>
    <div class="ib-grp"><h3>Deck tile</h3><div class="ib-tiles">${SHOW.map(([i, k]) => tile(i, k)).join('')}</div></div>
   </div></section>`;
}

function inspectHtml() {
  const i = C.body, n = INS.flame;
  return `<section class="ib-sec" id="inspect"><h2>Inspect view <span class="ib-code">v1.0-inscribe</span></h2><p class="ib-note">The card's own rule first, then the Inscription as a second block with its keyword and one line.</p>
   <div class="ib-frame ib-follow" data-mk="B">
    <div class="ib-inspect"><div class="ib-big">${face(i, 'flame', true)}</div>
     <div class="ib-panel">
      <div class="ib-block"><h4>Card rule</h4><div class="ib-line"><span class="ib-kw">${chip(i)}</span></div><p>${esc(i.rule)}</p></div>
      <div class="ib-block ib-block-ins"><h4><span class="ib-gbox">${glyph('flame', 2, '#6fd6c4')}</span>Inscription: ${esc(n.name)}</h4>
       <div class="ib-line"><span class="ib-kw">${chipIcon(n.trig, 16)}<b>Collect</b></span><span class="ib-kw ib-kw-quiet">${n.uses}</span></div>
       <p>${esc(n.rule)}</p>
       <p class="ib-small">Works only while this card is in your Chain. It leaves with the card.</p></div>
      <div class="ib-actions"><button type="button" class="ib-btn">Back</button><button type="button" class="ib-btn ib-btn-go">Glossary: Collect</button></div>
     </div></div></div></section>`;
}

function scribeHtml() {
  const opt = (k, sel) => { const n = INS[k]; return `<div class="ib-opt${sel ? ' ib-sel' : ''}"><span class="ib-gbox ib-gbig">${glyph(n.icon, 4, '#6fd6c4')}</span>
    <b class="ib-oname">${esc(n.name)}</b><span class="ib-kw">${chipIcon(n.trig, 16)}<b>${n.trig === 'overfill' ? 'Overfill' : 'Collect'}</b></span><p>${esc(n.rule)}</p><small>Suits: ${esc(n.suits)}</small></div>`; };
  const step = (num, title, sub, body, btns) => `<div class="ib-frame ib-scribe" data-mk="B"><div class="ib-bar"><span class="ib-step">Step ${num}</span><b>${title}</b><span class="ib-sub">${sub}</span></div>${body}<div class="ib-actions ib-foot">${btns}</div></div>`;
  const ok = i => `<div class="ib-ok">${mount(i, null, 'ib-lit')}<span class="ib-tick" aria-hidden="true">${pixelArt(['..........', '.......OO.', '......OGO.', '.....OGO..', 'OO..OGO...', 'OGO.OGO...', '.OGOGO....', '..OGO.....', '...O......', '..........'], {size: 10, pal: {O: '#2a1d12', G: '#f0c86a'}})}</span></div>`;
  const no = (i, why) => `<div class="ib-no">${mount(i, null)}<span class="ib-why">${why}</span></div>`;
  const s1 = step(1, 'Choose an Inscription', 'A Scribe offers three. Pick one.', `<div class="ib-opts">${opt('flame', true)}${opt('crown')}${opt('eye')}</div>`,
    '<button type="button" class="ib-btn">Leave it</button><button type="button" class="ib-btn ib-btn-go">Choose Spark Wick</button>');
  const s2 = step(2, 'Choose a card', 'Spark Wick is a Collect Inscription. Lit cards can carry it.',
    `<div class="ib-picks"><div class="ib-grp"><h3>Chain</h3><div class="ib-pickrow">${ok(C.body)}${no(C.echo, 'Repeat')}${no(C.spring, 'Overfill')}${no(C.prism, 'Boost')}</div></div>
      <div class="ib-grp"><h3>Reserve</h3><div class="ib-pickrow">${ok(C.pocket)}${no(C.down, 'Lift')}${no(C.courier, 'Delivery')}${ok(C.dusk)}</div></div></div>
     <p class="ib-hint">Tap a lit card. Dim cards are not Collect cards; you can still inscribe them if you want (a warning shows).</p>`,
    '<button type="button" class="ib-btn">Back</button><button type="button" class="ib-btn ib-btn-off" disabled>Write it</button>');
  const s3 = step(3, 'Written', 'Spark Wick is now part of Body Spark.',
    `<div class="ib-inspect"><div class="ib-big">${face(C.body, 'flame', true)}</div><div class="ib-panel"><div class="ib-block ib-block-ins"><h4><span class="ib-gbox">${glyph('flame', 2, '#6fd6c4')}</span>Spark Wick</h4>
      <div class="ib-line"><span class="ib-kw">${chipIcon('collect', 16)}<b>Collect</b></span></div><p>${esc(INS.flame.rule)}</p></div>
      <p class="ib-small">Move Body Spark in the Chain and the Inscription moves with it. Melt or sell the card and it goes too.</p></div></div>`,
    '<button type="button" class="ib-btn">Undo</button><button type="button" class="ib-btn ib-btn-go">Done</button>');
  return `<section class="ib-sec" id="scribe"><h2>Scribe stop <span class="ib-code">v1.0-inscribe</span></h2><p class="ib-note">The chest or relic stop becomes a Scribe: choose an Inscription, choose a card, see the result. Static steps.</p>${s1}${s2}${s3}</section>`;
}

document.getElementById('ib-root').innerHTML =
  variant('v1.0-inscribe-A', 'A', 'A Wax seal', 'A 26 px seal presses into the top right corner, over the frame. It never touches the picture, the name or the rule text.') +
  variant('v1.0-inscribe-B', 'B', 'B Engraved band', 'A dark band with the keyword glyph runs along the bottom of the picture. It sits inside the picture, so it is clear of every border and word.') +
  variant('v1.0-inscribe-C', 'C', 'C Rune border', 'A teal rune line runs just inside the frame, with corner studs, and a small glyph sits next to the Trigger chip. In the Chain slot the glyph sits in the top right corner.') +
  inspectHtml() + scribeHtml();

const pick = document.querySelectorAll('input[name="mk"]');
const apply = v => document.querySelectorAll('.ib-follow, .ib-scribe').forEach(f => f.dataset.mk = v);
pick.forEach(r => r.addEventListener('change', () => apply(r.value)));
