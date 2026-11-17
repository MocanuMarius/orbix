import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {buildModule} from '../scripts/build-ui-icons.mjs';
import {uiIcon, uiIconGrid, UI_ICON_NAMES} from '../dist/ui-icons.mjs';
import {menuIcon, MENU_ICON_NAMES} from '../dist/menu-icons.mjs';
import {lifeHeartSvg} from '../dist/lives.mjs';
import {mapStopIconMarkup, MAP_STOP_ICON_NAMES} from '../dist/map-guide.mjs';

const dist = path.resolve('dist');
function* sources(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === 'design-lab' || entry.name === 'assets' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(full);
    else if (entry.name.endsWith('.mjs')) yield full;
  }
}
const MENU_CALL = /\b(?:icon|menuIcon)\(\s*'([a-z-]+)'/g;
const UI_CALL = /uiIcon\(\s*['"`]([a-z0-9-]+)['"`]/g;

test('dist/ui-icons.mjs is exactly what the generator produces from the approved SVG files', () => {
  assert.equal(fs.readFileSync(path.join(dist, 'ui-icons.mjs'), 'utf8'), buildModule());
});

test('every approved SVG in dist/assets/ui/icons is exported, and no old drawings shipped', () => {
  const files = fs.readdirSync(path.join(dist, 'assets/ui/icons')).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4));
  for (const name of files) assert.ok(UI_ICON_NAMES.includes(name), name);
  assert.ok(UI_ICON_NAMES.includes('spark'));
  assert.ok(!files.some(name => name.endsWith('-old')));
  for (const picked of ['back', 'heart-full', 'stored', 'stop-flight']) assert.ok(files.includes(picked), picked);
  for (const dropped of ['back-b', 'heart-full-b', 'stored-a', 'stop-flight-a', 'back-a', 'heart-full-a', 'stored-b', 'stop-flight-b']) assert.ok(!files.includes(dropped), dropped);
});

test('every icon name the game requests exists in the set', () => {
  const requested = new Set([...MENU_ICON_NAMES, ...MAP_STOP_ICON_NAMES]);
  for (const file of sources(dist)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(UI_CALL)) requested.add(m[1]);
    // Names given to the menu icon function must resolve to an approved icon or a skill portrait, never to the fallback by accident.
    for (const m of text.matchAll(MENU_CALL)) {
      const markup = menuIcon(m[1]);
      assert.match(markup, /data-ui-icon="|data-menu-art="/, `${path.basename(file)} asks for ${m[1]}`);
      const resolved = /data-ui-icon="([a-z-]+)"/.exec(markup)?.[1];
      if (resolved) requested.add(resolved);
    }
  }
  assert.ok(requested.size >= 15, 'found the icons the game uses');
  for (const name of requested) assert.ok(UI_ICON_NAMES.includes(name), `missing icon ${name}`);
});

test('uiIcon snaps every size to a whole multiple of the grid and marks the icon', () => {
  for (const name of UI_ICON_NAMES) {
    const grid = uiIconGrid(name);
    for (const asked of [1, 13, 17, 20, 27, 34, 46, 100]) {
      const px = Number(/ width="(\d+)"/.exec(uiIcon(name, {size: asked}))[1]);
      assert.equal(px % grid, 0, `${name} ${asked}`);
      assert.ok(px >= grid);
    }
    const markup = uiIcon(name, {size: grid * 2, className: 'x'});
    assert.match(markup, /shape-rendering="crispEdges"/);
    assert.match(markup, /aria-hidden="true"/);
    assert.match(markup, new RegExp(`data-ui-icon="${name}"`));
    assert.match(markup, /class="ui-icon x"/);
    assert.match(markup, new RegExp(`--ui-size:${grid * 2}px`));
  }
  assert.throws(() => uiIcon('no-such-icon'));
});

test('old menu, heart and map-stop functions return the new set and keep their hooks', () => {
  assert.match(menuIcon('back'), /data-ui-icon="back"/);
  assert.match(menuIcon('arrow'), /data-ui-icon="back"[^>]*/);
  assert.match(menuIcon('arrow'), /ui-flip/);
  assert.match(menuIcon('tune', 'extra'), /class="[^"]*\bico\b[^"]*extra/);
  assert.match(menuIcon('✧'), /data-ui-icon="spark"/);
  assert.match(menuIcon('wisp'), /data-ui-icon="spark"/);
  assert.match(menuIcon('♡'), /data-ui-icon="heart-full"/);
  assert.match(menuIcon('route'), /data-ui-icon="map"/);
  assert.match(menuIcon('cards'), /data-ui-icon="deck"/);
  assert.match(menuIcon('unknown-glyph'), /data-ui-icon="/);
  assert.match(lifeHeartSvg(false), /data-ui-icon="heart-full"/);
  assert.match(lifeHeartSvg(true), /data-ui-icon="heart-empty"/);
  assert.match(lifeHeartSvg(true), /class="[^"]*life-heart[^"]*spent/);
  assert.match(lifeHeartSvg(false, {shield: true}), /data-ui-icon="heart-shield"/);
  const stops = {flight: 'stop-flight', treasure: 'stop-chest', rest: 'stop-rest', encounter: 'stop-encounter', boss: 'stop-boss', elite: 'stop-elite'};
  for (const [kind, icon] of Object.entries(stops)) assert.match(mapStopIconMarkup(kind), new RegExp(`data-ui-icon="${icon}"`), kind);
  assert.match(mapStopIconMarkup({boss: true, bossId: 'moonweaver'}), /data-ui-icon="stop-boss"/);
  assert.match(mapStopIconMarkup({elite: true}), /data-ui-icon="stop-elite"/);
  assert.match(mapStopIconMarkup({kind: 'event', eventIndex: 10}), /data-ui-icon="stop-workshop"/);
  assert.match(mapStopIconMarkup('flight'), /data-map-category="flight"/);
  assert.match(mapStopIconMarkup('flight', {size: 72}), /width="72"/);
});

test('the old carving, heart and map drawings are gone from the source modules', () => {
  const read = file => fs.readFileSync(path.join(dist, file), 'utf8');
  assert.doesNotMatch(read('menu-icons.mjs'), /#746a54|#d5c693|carving-light/);
  assert.doesNotMatch(read('lives.mjs'), /#727e65|M2 0h4v2h4V0h4v2h2v6/);
  assert.doesNotMatch(read('map-guide.mjs'), /landmarkArt|stroke-width="1\.8"/);
  assert.doesNotMatch(read('afterglow-ui.mjs'), /#825f47|#483b36/);
});
