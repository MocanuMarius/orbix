import {EXTRA_LEVELS} from './world-expansion.mjs?v=upgrade-wallet-1';
import {BIOME_LEVELS,getBiome} from './biomes.mjs?v=upgrade-wallet-1';
export {BIOME_LEVELS} from './biomes.mjs?v=upgrade-wallet-1';
// Location identities are shared by route previews, terrain and scenery.
// Shapes and challenge windows are authored by the flight generator.
export const LEVELS = Object.freeze([
  ...BIOME_LEVELS,
  ...EXTRA_LEVELS,
  { id: 'ruins-aqueduct', terrain: 'ruins', variant: 0, name: 'Broken Aqueduct', scene: 'aqueduct', signature: 'Overgrown cottages · low arches', motif: 'underpass', ink: '#b4a17a' },
  { id: 'ruins-belfry', terrain: 'ruins', variant: 1, name: 'Sunken Belfry', scene: 'belfry', signature: 'Courtyard walls · tower shelves', motif: 'stair', ink: '#a49b89' },
  { id: 'ruins-ossuary', terrain: 'ruins', variant: 2, name: 'Ossuary Vault', scene: 'ossuary', signature: 'Rooted vault walls · narrow exits', motif: 'vault', ink: '#c2bda3' },
  { id: 'canopy-elder', terrain: 'canopy', variant: 0, name: 'Hollow Elder', scene: 'elder', signature: 'Hollow trunks · curling roots', motif: 'root', ink: '#9aab7d' },
  { id: 'canopy-fen', terrain: 'canopy', variant: 1, name: 'Thorn Fen', scene: 'fen', signature: 'Willows & reeds · thorn hollows', motif: 'thorn', ink: '#afad72' },
  { id: 'canopy-hanging', terrain: 'canopy', variant: 2, name: 'Hanging Grove', scene: 'hanging', signature: 'Old trees · hanging roots', motif: 'hanging', ink: '#8eb6a0' },
  { id: 'storm-ridge', terrain: 'storm', variant: 0, name: 'Knife Ridge', scene: 'ridge', signature: 'Bent pines · razor saddles', motif: 'ridge', ink: '#a4bdc2' },
  { id: 'storm-chasm', terrain: 'storm', variant: 1, name: 'Moonfall Chasm', scene: 'chasm', signature: 'Cliff shelters · open drops', motif: 'chasm', ink: '#aaa8c4' },
  { id: 'storm-glass', terrain: 'storm', variant: 2, name: 'Glass Caverns', scene: 'glass', signature: 'Mine timbers · crystal teeth', motif: 'crystal', ink: '#b6c8d1' },
]);

function hash(value) {
  let n = 2166136261;
  for (const ch of String(value)) n = Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0;
  return n;
}

export function getLevelIdentity(terrain = 'ruins', seed = 1, offset = 0) {
  const pool = BIOME_LEVELS.filter(level => level.terrain === terrain);
  const locations = pool.length ? pool : BIOME_LEVELS.filter(level => level.terrain === 'ruins');
  return locations[(hash(`${seed}:${terrain}:location`) + Math.max(0, Math.floor(Number(offset) || 0))) % locations.length];
}

export function getBiomeLevelIdentity(biomeId, seed = 1, offset = 0) {
  const biome=getBiome(biomeId),locations=BIOME_LEVELS.filter(level=>level.biomeId===(biome?.id||'moonruins'));
  return locations[(hash(`${seed}:${biomeId}:variant`) + Math.max(0,Math.floor(Number(offset)||0))) % locations.length];
}

export function resolveLevelIdentity(id, terrain = 'ruins', seed = 1) {
  return LEVELS.find(level => level.id === id && level.terrain === terrain) || getLevelIdentity(terrain, seed);
}
