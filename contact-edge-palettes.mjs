import {getBiome} from './biomes.mjs?v=cord-2';

const palette=(deep,body,fringe,core,hot,mote,seam)=>Object.freeze({deep,body,fringe,core,hot,mote,seam});
// Spirit Fire keeps one silhouette and motion vocabulary; only its mineral hue changes.
export const CONTACT_EDGE_PALETTES=Object.freeze({
  moonruins:palette('#243c59','#527da7','#82abd0','#b9d7ed','#e0effa','#b2d7f2','#f2f8fc'),
  pinewood:palette('#263e32','#557c59','#83a47c','#bed8af','#e0efd0','#a8d394','#f1f7e9'),
  marsh:palette('#153e34','#287d62','#5bb493','#a1dfbf','#d1f3df','#86e0b5','#ebfaf1'),
  thorn:palette('#373e25','#74804a','#a1b16c','#d2dda4','#edf2cd','#c1d98a','#f7f9e8'),
  fungal:palette('#3c2b52','#82639e','#ac8fc4','#d8bdec','#efdcfa','#d2adf0','#f9f0fc'),
  basalt:palette('#503722','#a76c38','#cf975a','#efc38b','#fae3b9','#eab46e','#fff3df'),
  desert:palette('#4b3e23','#a48b43','#ceb766','#ebd99d','#f9edc8','#e7cf7c','#fff9e6'),
  coral:palette('#174047','#288b91','#60bdba','#a1e5db','#d2f7ed','#76e1d4','#edfcf8'),
  crystal:palette('#342650','#7254a3','#9c7ccd','#cbb3ed','#e6d8fa','#baa0f1','#f5effd'),
  frost:palette('#20414d','#4d95aa','#7fc7d6','#b5e9ed','#d9f8f7','#9de5ed','#effdfc'),
  cloud:palette('#334755','#7c9fb7','#adc8db','#d3e5f1','#eaf3fa','#c1dfef','#f6fafd'),
  cemetery:palette('#2c403b','#66867a','#98b8a6','#c5ddcc','#e1eee2','#b4d6c2','#f1f8f1'),
});
export const CONTACT_EDGE_FAMILY_PALETTES=Object.freeze({
  ruins:CONTACT_EDGE_PALETTES.moonruins,
  canopy:CONTACT_EDGE_PALETTES.pinewood,
  storm:CONTACT_EDGE_PALETTES.cloud,
});

function biomeFor(input,depth=0){
  if(!input||depth>4)return null;
  if(typeof input==='string')return getBiome(input);
  // Engine identity wins over broad collision family; node covers map/preview callers.
  return biomeFor(input.levelIdentity,depth+1)||biomeFor(input.options?.node,depth+1)
    ||biomeFor(input.node,depth+1)||getBiome(input)||getBiome(input.levelId)||getBiome(input.id)
    ||getBiome(input.scene)||biomeFor(input.layout?.levelIdentity,depth+1);
}
function familyFor(input,depth=0){
  if(!input||depth>4)return null;
  if(typeof input==='string')return CONTACT_EDGE_FAMILY_PALETTES[input]||null;
  return familyFor(input.levelIdentity,depth+1)||familyFor(input.options?.node,depth+1)
    ||familyFor(input.node,depth+1)||familyFor(input.terrain,depth+1)||familyFor(input.family,depth+1)
    ||familyFor(input.scene,depth+1)||familyFor(input.layout?.levelIdentity,depth+1);
}

/** Returns a shared frozen palette: safe to resolve every frame, no new objects. */
export function getContactEdgePalette(input){
  const biome=biomeFor(input);
  return biome?CONTACT_EDGE_PALETTES[biome.id]:familyFor(input)||CONTACT_EDGE_FAMILY_PALETTES.ruins;
}
