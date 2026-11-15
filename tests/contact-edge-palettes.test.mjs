import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOMES,BIOME_LEVELS} from '../dist/biomes.mjs';
import {CONTACT_EDGE_PALETTES,CONTACT_EDGE_FAMILY_PALETTES,getContactEdgePalette} from '../dist/contact-edge-palettes.mjs';

test('all twelve biome palettes and all forty-eight authored level IDs resolve',()=>{
  assert.equal(BIOMES.length,12);assert.equal(Object.keys(CONTACT_EDGE_PALETTES).length,12);
  for(const biome of BIOMES){
    const expected=CONTACT_EDGE_PALETTES[biome.id];assert.ok(expected);
    assert.equal(getContactEdgePalette(biome.id),expected);assert.equal(getContactEdgePalette(biome),expected);
    const levels=BIOME_LEVELS.filter(level=>level.biomeId===biome.id);assert.equal(levels.length,4);
    for(const level of levels){
      assert.equal(getContactEdgePalette(level.id),expected);
      assert.equal(getContactEdgePalette({levelIdentity:level,terrain:'ruins'}),expected);
      assert.equal(getContactEdgePalette({options:{node:{levelId:level.id}}}),expected);
      assert.equal(getContactEdgePalette({node:level}),expected);
    }
  }
});

test('family and unknown inputs have stable, safe fallbacks',()=>{
  for(const family of ['ruins','canopy','storm']){
    assert.equal(getContactEdgePalette(family),CONTACT_EDGE_FAMILY_PALETTES[family]);
    assert.equal(getContactEdgePalette({terrain:family}),CONTACT_EDGE_FAMILY_PALETTES[family]);
    assert.equal(getContactEdgePalette({options:{node:{terrain:family}}}),CONTACT_EDGE_FAMILY_PALETTES[family]);
  }
  assert.equal(getContactEdgePalette(),CONTACT_EDGE_PALETTES.moonruins);
  assert.equal(getContactEdgePalette('unknown'),CONTACT_EDGE_PALETTES.moonruins);
  const cycle={};cycle.levelIdentity=cycle;assert.equal(getContactEdgePalette(cycle),CONTACT_EDGE_PALETTES.moonruins);
  assert.equal(getContactEdgePalette({biomeId:'unknown',levelId:BIOME_LEVELS[0].id}),CONTACT_EDGE_PALETTES.moonruins);
});

test('palettes are immutable shared hex values with bright readable seams',()=>{
  assert.ok(Object.isFrozen(CONTACT_EDGE_PALETTES));assert.ok(Object.isFrozen(CONTACT_EDGE_FAMILY_PALETTES));
  for(const palette of Object.values(CONTACT_EDGE_PALETTES)){
    assert.ok(Object.isFrozen(palette));assert.deepEqual(Object.keys(palette),['deep','body','fringe','core','hot','mote','seam']);
    for(const hex of Object.values(palette))assert.match(hex,/^#[0-9a-f]{6}$/i);
    assert.throws(()=>{palette.seam='#000000';},TypeError);
    for(const channel of [1,3,5])assert.ok(parseInt(palette.seam.slice(channel,channel+2),16)>=223);
  }
});
