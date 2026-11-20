import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GRAPHICS_KEY,GRAPHICS_PRESETS,DEFAULT_GRAPHICS,skippedGroups,normalizeGraphics,loadGraphics,saveGraphics,urlGraphics,resolveGraphics,setGraphicsPreset,graphicsPreset,graphicsSkips} from '../dist/graphics-preset.mjs';
import {settingsMarkup} from '../dist/ui/pause-menu.mjs';

const store=(initial)=>{const m=new Map(initial===undefined?[]:[[GRAPHICS_KEY,initial]]);return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),m};};

test('presets: High skips nothing, Medium the four decoration groups, Low adds ground detail',()=>{
  assert.deepEqual(GRAPHICS_PRESETS,['high','medium','low']);
  assert.deepEqual([...skippedGroups('high')],[]);
  assert.deepEqual([...skippedGroups('medium')].sort(),['edgeglow','foreground','stars','wake']);
  assert.deepEqual([...skippedGroups('low')].sort(),['ecology','edgeglow','foreground','stars','wake']);
});

test('the lighting pass, pickups, hazards, Black Holes and cues are never skippable by a preset',()=>{
  for(const p of GRAPHICS_PRESETS)for(const g of ['light','pickups','holes','warnings','terrain','fleet','shade','cues','motes'])assert.equal(skippedGroups(p).includes(g),false,`${p} must keep ${g}`);
});

test('default is High; bad values fall back to High',()=>{
  assert.equal(DEFAULT_GRAPHICS,'high');
  assert.equal(loadGraphics(store()),'high');
  assert.equal(loadGraphics(store('ultra')),'high');
  assert.equal(normalizeGraphics('LOW'),'low');
  assert.equal(normalizeGraphics(null),null);
  assert.deepEqual([...skippedGroups('nonsense')],[]);
});

test('stored value round-trips; unwritable storage keeps the default',()=>{
  const s=store();saveGraphics('medium',s);assert.equal(s.m.get(GRAPHICS_KEY),'medium');assert.equal(loadGraphics(s),'medium');
  saveGraphics('bogus',s);assert.equal(loadGraphics(s),'medium');
  const broken={getItem(){throw new Error('x')},setItem(){throw new Error('x')}};
  assert.equal(loadGraphics(broken),'high');assert.doesNotThrow(()=>saveGraphics('low',broken));
});

test('?graphics= overrides the stored choice and is not stored',()=>{
  assert.equal(urlGraphics('?graphics=low'),'low');
  assert.equal(urlGraphics('?graphics=bogus'),null);
  assert.equal(urlGraphics('?skip=foreground'),null);
  const s=store('medium');
  assert.equal(resolveGraphics(s,'?graphics=low'),'low');
  assert.equal(resolveGraphics(s,'?x=1'),'medium');
  assert.equal(s.m.get(GRAPHICS_KEY),'medium');
});

test('a preset change applies at once to the next query',()=>{
  setGraphicsPreset('low');assert.equal(graphicsPreset(),'low');assert.equal(graphicsSkips('ecology'),true);assert.equal(graphicsSkips('light'),false);
  setGraphicsPreset('medium');assert.equal(graphicsSkips('ecology'),false);assert.equal(graphicsSkips('foreground'),true);
  setGraphicsPreset('high');assert.equal(graphicsSkips('foreground'),false);
  setGraphicsPreset('junk');assert.equal(graphicsPreset(),'high');
});

test('Settings shows a Graphics row with the current choice marked',()=>{
  const html=settingsMarkup({graphics:'medium'});
  for(const id of GRAPHICS_PRESETS)assert.match(html,new RegExp(`data-action="graphics" data-id="${id}" aria-pressed="${id==='medium'}"`));
  assert.match(html,/Lower settings remove decoration to run smoother\./);
  assert.doesNotMatch(settingsMarkup({}),/data-action="graphics"/);
});

test('only the renderer and the Settings screen read the preset (simulation and autopilot never see it)',()=>{
  const users=[];
  for(const f of fs.readdirSync(new URL('../dist/',import.meta.url)).filter(f=>f.endsWith('.mjs')))if(/graphics-preset\.mjs/.test(fs.readFileSync(new URL('../dist/'+f,import.meta.url),'utf8')))users.push(f);
  assert.deepEqual(users.sort(),['app.mjs','graphics-preset.mjs','wisp-renderer.mjs'].filter(f=>f!=='graphics-preset.mjs'));
});
