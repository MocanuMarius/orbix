// Twelve playable biomes. Geometry keeps the three proven collision families;
// identity, authored course, materials, scenery and interactions vary by biome.
const HINTS={
  crumble:'Cracked masonry shakes, then falls.',
  thaw:'Your light melts hanging ice; avoid the falling shards.',
  pinecone:'Ripe cones drop as you approach.',
  bubble:'Touch reed bubbles for a gentle lift.',
  spore:'Burst puffcaps to ride a rising spore cloud.',
  geyser:'Passing fumaroles trigger short rising jets.',
  sandfall:'Loose sandstone warns with falling sand, then crumbles.',
  tide:'Anemones open into rising currents as you approach.',
  resonate:'Touch resonant crystals to flash the way ahead.',
  draft:'Wind bells warn before a strong local lift.',
  seedpod:'Touch a ripe pod to open it and release a little Glow.',
  bell:'Ring weathered bells to briefly reveal the path.',
};
const biome = (id, name, terrain, materialScene, ink, interaction, description, maps) => Object.freeze({
  id, name, terrain, scene: id, materialScene, ink, interaction, interactionHint:HINTS[interaction], description,
  maps: Object.freeze(maps.map(map => Object.freeze(map))),
});

export const BIOMES = Object.freeze([
  biome('moonruins','Moonlit Ruins','ruins','aqueduct','#bcb39a','crumble',
    'Moonwashed courtyards and broken masonry. Loose stones tremble before falling.',[
      ['low-aqueduct','Low Aqueduct','Low arches · submerged terraces','underpass'],
      ['bell-stair','Broken Bell Stair','Tower shelves · a rising bell stair','shelf'],
      ['courtyard','Roofless Courtyard','Open courts · broken roof crossings','terrace'],
      ['moon-chapel','Drowned Moon Chapel','Vaulted ceiling · a low chapel exit','vault'],
    ]),
  biome('frost','Frostbound Reach','storm','glass','#b4d9e2','thaw',
    'Blue ice shelves and glacier caves. Your light melts hanging ice into falling shards.',[
      ['glacier-gate','Glacier Gate','Stepped ice gates · a sheltered ascent','tooth'],
      ['iceberg-field','Drifting Icebergs','Broad ice floes · high to low crossings','cliff'],
      ['thaw-vault','Thawing Vault','Hanging ice · a descending vault','vault'],
      ['frozen-falls','Frozen Falls','Frozen curtains · alternating ice shelves','shelf'],
    ]),
  biome('pinewood','Oldgrowth Pines','canopy','elder','#8da87c','pinecone',
    'Heavy pine boughs and old timber. Falling cones shake loose from the canopy.',[
      ['timber-run','Timber Run','Low roots · a long rising bank','root'],
      ['high-boughs','High Boughs','Hanging branches · a dipping canopy','hanging'],
      ['fallen-giant','The Fallen Giant','Hollow trunk · narrow timber passages','hollow'],
      ['bark-switchback','Bark Switchback','Root steps · alternating high and low banks','root'],
    ]),
  biome('marsh','Lantern Marsh','canopy','fen','#a7b88c','bubble',
    'Still pools and willow roots. Swollen marsh bubbles rise and burst on contact.',[
      ['reed-channel','Reed Channel','Low reed islands · broad water crossings','hollow'],
      ['willow-veil','Willow Veil','Low willow curtains · a descending channel','hanging'],
      ['sunken-walk','Sunken Boardwalk','Broken banks · a gentle stair over the mire','root'],
      ['mire-bells','The Mire Bells','Rooted arches · a low marsh hollow','root'],
    ]),
  biome('fungal','Spore Hollows','canopy','hanging','#c2a9ca','spore',
    'Layered mushroom caps and luminous spores. Brush a ripe cap to release a rising puff.',[
      ['cap-canopy','Cap Canopy','Low caps · wide open glades','hanging'],
      ['spore-stair','Spore Stair','Mushroom shelves · a rising spiral','root'],
      ['gilled-arch','Gilled Arch','Interlocking caps · a narrow curved tunnel','hollow'],
      ['mycelium-run','Mycelium Run','Low fungal banks · descending root channels','root'],
    ]),
  biome('basalt','Basalt Furnace','storm','ridge','#d89872','geyser',
    'Warm column cliffs above ember seams. Cracked vents warn before a strong upward plume.',[
      ['column-stair','The Column Stair','Tall columns · a stepped ascent','shelf'],
      ['smoke-flue','Smoke Flue','Roofed flues · alternating narrow shelves','vault'],
      ['lava-lip','Cinder Spillway','Low ledges · an open drop and recovery','landing'],
      ['scoria-crown','Scoria Crown','Broken basalt crowns · high roof crossings','razor'],
    ]),
  biome('desert','Glasswind Dunes','ruins','belfry','#c8b18b','sandfall',
    'Buried temples and wind-cut sandstone. Loose ledges warn with falling sand, then shed a chunk of stone.',[
      ['dune-trough','Dune Trough','Broad dunes · a low flowing trough','terrace'],
      ['sand-temple','Sandfall Temple','Temple roofs · a long stone underpass','underpass'],
      ['obelisk-walk','Obelisk Walk','Narrow pillars · a rising stair','shelf'],
      ['oasis-arch','The Oasis Arch','Hollow sandstone · a descending arch','vault'],
    ]),
  biome('coral','Coral Grave','ruins','fen','#c6aaa3','tide',
    'Ancient dry reefs and wreck ribs. Tidal vents send visible pulses through the channels.',[
      ['reef-pass','Reef Pass','Branching reef arches · shallow turns','vault'],
      ['tidal-gully','Tidal Gully','Rounded reef banks · low channels','terrace'],
      ['wreck-canopy','Wreck Canopy','Hanging wreck ribs · open lower passages','underpass'],
      ['coral-lattice','Coral Lattice','Interlaced coral · a staggered ascent','shelf'],
    ]),
  biome('crystal','Prism Caverns','storm','glass','#b2a6d3','resonate',
    'Faceted quartz vaults and geodes. Touch resonant clusters to briefly reveal the path.',[
      ['prism-teeth','Prism Teeth','Opposed crystal teeth · a shallow squeeze','tooth'],
      ['mirror-well','Mirror Well','Sloping geodes · a dip and climb','vault'],
      ['wedge-run','The Wedge Run','Long crystal blades · alternating ceilings','razor'],
      ['chime-stair','Chime Stair','Crystal shelves · a rising spiral','shelf'],
    ]),
  biome('cloud','Cloudbreak Isles','storm','chasm','#b9c9d0','draft',
    'Suspended stone islands and ruined sky bridges. Wind bells awaken strong local gusts.',[
      ['sky-islands','Sky Islands','Open island crossings · a low landing','cliff'],
      ['broken-span','The Broken Span','Roof fragments · alternating bridge landings','landing'],
      ['wind-stair','Wind Stair','Stepped islands · an open ascent','shelf'],
      ['cloud-vault','Cloud Vault','Hanging islands · a low descending route','overhang'],
    ]),
  biome('thorn','Briar Cathedral','canopy','hanging','#a4b28e','seedpod',
    'Arched brambles and swollen seedpods. Brush a ripe pod to release a small light cache.',[
      ['briar-tunnel','Briar Tunnel','Rooted thorn arches · a shallow weave','thorn'],
      ['seedpod-roof','Seedpod Roof','Heavy hanging pods · a descending roof','hanging'],
      ['thicket-run','Thicket Run','Broken low hedges · broad light wells','hollow'],
      ['thorn-steeple','Thorn Steeple','Twisted root steps · a high exit','root'],
    ]),
  biome('cemetery','Mourning Fields','ruins','ossuary','#abb6ad','bell',
    'Leaning grave markers and ruined crypts. Ring a spirit bell to briefly reveal the path.',[
      ['grave-road','The Grave Road','Open grave mounds · a shallow rising road','terrace'],
      ['crypt-pass','Crypt Pass','Low crypt lintels · a stepped underpass','vault'],
      ['bell-garden','Bell Garden','Broken hanging bells · low courtyard crossings','underpass'],
      ['sepulchre-stair','Sepulchre Stair','Burial shelves · a descending stone stair','shelf'],
    ]),
]);

export const BIOME_LEVELS = Object.freeze(BIOMES.flatMap(b => b.maps.map(([slug,name,signature,motif],variant) => Object.freeze({
  id:`${b.id}-${slug}`,biomeId:b.id,biomeName:b.name,terrain:b.terrain,variant,name,
  scene:b.scene,materialScene:b.materialScene,ink:b.ink,motif,signature,
  interaction:b.interaction,interactionHint:b.interactionHint,description:b.description,
}))));

const BY_ID = new Map(BIOMES.map(b => [b.id,b]));
const LEVEL_BIOMES = new Map(BIOME_LEVELS.map(level => [level.id,BY_ID.get(level.biomeId)]));
/** No default biome for legacy saves/tutorials: their authored scenery remains. */
export function getBiome(value) {
  const id=typeof value==='string'?value:value?.biomeId||value?.levelId||value?.id||value?.scene;
  return BY_ID.get(id)||LEVEL_BIOMES.get(id)||null;
}

