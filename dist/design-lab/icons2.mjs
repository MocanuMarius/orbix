// v2.0-icons design-lab sheet. Renders the proposed icon set (assets/icons2/*.svg) next to the real game renderers.
const IMG = (id, px) => `<img src="assets/icons2/${id}.svg" width="${px}" height="${px}" alt="" class="px">`;
const mods = {};
for (const [key, url] of Object.entries({menu: '../menu-icons.mjs', lives: '../lives.mjs', guide: '../map-guide.mjs', pickup: '../pickup-art.mjs'})) {
  try {mods[key] = await import(url);} catch (error) {console.warn('current renderer unavailable', key, error);}
}
// CURRENT: the real source module and the size the game shows it at (audit, outputs/art-audit/icons.md).
const cur = {
  back: [() => mods.menu.menuIcon('back'), 20], 'back-a': null, settings: [() => mods.menu.menuIcon('tune'), 20], pause: [() => mods.menu.menuIcon('pause'), 20],
  info: [() => mods.menu.menuIcon('info'), 20], sound: [() => mods.menu.menuIcon('sound'), 20], mute: [() => mods.menu.menuIcon('mute'), 20],
  check: [() => mods.menu.menuIcon('check'), 20], deck: [() => mods.menu.menuIcon('cards'), 20], map: [() => mods.menu.menuIcon('route'), 20],
  'heart-full-a': [() => mods.lives.lifeHeartSvg(false), 17], 'heart-empty': [() => mods.lives.lifeHeartSvg(true), 17],
  'stop-flight-a': [() => mods.guide.mapStopIconMarkup('flight'), 40], 'stop-elite': [() => mods.guide.mapStopIconMarkup('elite'), 40], 'stop-boss': [() => mods.guide.mapStopIconMarkup('boss'), 40],
  'stop-encounter': [() => mods.guide.mapStopIconMarkup('encounter'), 40], 'stop-rest': [() => mods.guide.mapStopIconMarkup('rest'), 40], 'stop-chest': [() => mods.guide.mapStopIconMarkup('treasure'), 40],
  'long-flash': [() => mods.pickup.pickupArtSvg('sight'), 36]
};
cur['back-a'] = cur.back; cur['back-b'] = cur.back; cur['heart-full-b'] = cur['heart-full-a']; cur['stop-flight-b'] = cur['stop-flight-a'];
// Which current icon shares a row with which new one when the game has one only.
function current(id) {
  const spec = cur[id];
  if (!spec || !mods.menu) return '<span class="none">none</span>';
  try {
    const wrap = document.createElement('span'); wrap.className = 'cur'; wrap.innerHTML = spec[0]().replaceAll('"assets/', '"../assets/').replaceAll('"./assets/', '"../assets/');
    const svg = wrap.querySelector('svg'); if (!svg) return '<span class="none">none</span>';
    svg.setAttribute('width', spec[1]); svg.setAttribute('height', spec[1] * (svg.getAttribute('viewBox')?.split(' ')[3] / svg.getAttribute('viewBox')?.split(' ')[2] || 1));
    svg.style.cssText = `width:${svg.getAttribute('width')}px;height:${svg.getAttribute('height')}px;max-width:none`;
    return wrap.outerHTML + `<span class="px-note">${spec[1]}px</span>`;
  } catch (error) {return '<span class="none">error</span>';}
}
const manifest = await (await fetch('assets/icons2/manifest.json')).json();
const grounds = [['paper', 'Paper'], ['leather', 'Leather'], ['flight', 'Flight']];
const groups = [...new Set(manifest.map(m => m.group))];
const main = document.getElementById('sheet');
let html = '';
for (const group of groups) {
  const list = manifest.filter(m => m.group === group);
  html += `<section><h2>${group} <span class="count">${list.length}</span></h2><div class="cells">`;
  for (const m of list) {
    const sizes = [m.grid, m.grid * 2, m.grid * 3], cc = current(m.id);
    html += `<article class="cell"><h3>${m.name}</h3><div class="cols"><span>Current</span><span>${sizes[0]}</span><span>${sizes[1]}</span><span>${sizes[2]}</span></div>`;
    for (const [g] of grounds) html += `<div class="row ${g}"><span class="c0">${g === 'paper' ? cc.replaceAll('class="cur"', 'class="cur"') : cc}</span>${sizes.map(s => `<span>${IMG(m.id, s)}</span>`).join('')}</div>`;
    html += `<p class="meta">${m.id}${m.note ? ' · ' + m.note : ''} · show at ${m.sizes.join(' or ')}</p></article>`;
  }
  html += '</div></section>';
}
main.innerHTML = html;

// ---- In place ----
const hearts = (full, shield = false) => Array.from({length: 3}, (_, i) => IMG(i < full ? 'heart-full-a' : 'heart-empty', 16)).join('') + (shield ? IMG('heart-shield', 16) : '');
const row = (icon, label, tail = '') => `<li>${IMG(icon, 32)}<span class="lbl">${label}</span>${tail}</li>`;
document.getElementById('place').innerHTML = `
<div class="mock-grid">
 <figure><figcaption>Map header (paper)</figcaption>
  <div class="mock paper mh">${IMG('back-a', 32)}<b class="ttl">Rootwood Route</b><span class="grow"></span><span class="chip">${hearts(2)}</span><span class="chip">${IMG('stored-b', 32)}<b>3</b></span>${IMG('menu', 32)}</div>
  <div class="mock paper stops">${['stop-flight-a', 'stop-encounter', 'stop-elite', 'stop-rest', 'stop-chest', 'stop-workshop', 'stop-boss', 'stop-unknown'].map(s => IMG(s, 48)).join('')}</div>
 </figure>
 <figure><figcaption>Pause menu rows (leather)</figcaption>
  <ul class="mock leather rows">${row('play', 'Resume', IMG('back-b', 16).replace('back-b', 'back-b'))}${row('settings', 'Settings')}${row('sound', 'Sound')}${row('music', 'Music')}${row('glossary', 'Glossary')}${row('deck', 'Deck')}${row('collection', 'Collection')}${row('map', 'Map')}${row('tutorial', 'Tutorial')}${row('abandon', 'Abandon run')}</ul>
 </figure>
 <figure><figcaption>Flight HUD corner (flight ground)</figcaption>
  <div class="mock flight hud">
   <div class="hud-top">${IMG('pause', 32)}<span class="hearts">${hearts(2, true).replaceAll('width="16" height="16"', 'width="32" height="32"')}</span></div>
   <div class="hud-meter">${IMG('meter-cap', 16)}<span class="bar"><i style="width:62%"></i></span>${IMG('stored-b', 16)}<b>3</b>${IMG('luminance', 16)}<b>2</b>${IMG('collector', 16)}${IMG('long-flash', 16)}</div>
   <div class="hud-slots">${IMG('slot', 32)}${IMG('slot', 32)}${IMG('locked', 32)}</div>
  </div>
 </figure>
 <figure><figcaption>Rest action row (paper)</figcaption>
  <div class="mock paper rest">${[['rest-recover', 'Recover'], ['rest-add-slot', 'Add slot'], ['rest-grow', 'Grow'], ['rest-improve', 'Improve'], ['rest-refill', 'Refill'], ['rest-forge', 'Forge'], ['rest-melt', 'Melt']].map(([i, l]) => `<button type="button">${IMG(i, 32)}<span>${l}</span></button>`).join('')}</div>
  <div class="mock leather rest small">${['info', 'close', 'check', 'new-game', 'sound', 'mute'].map(i => IMG(i, 32)).join('')}</div>
 </figure>
</div>`;
document.body.dataset.ready = '1';
