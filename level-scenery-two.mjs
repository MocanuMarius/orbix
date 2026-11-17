// v1.2-level: ground, boulders and surface growth for all twelve biomes.
// v1.1-level dressed Frostbound Reach and Oldgrowth Pines and was approved
// (2026-11-17). v1.2 keeps that wiring, removes everything that does not
// belong on an ice sheet, adds strata and half-buried boulders to every
// biome's ground and rolls a look out to the other ten biomes.
// On by default for the biomes in SCENERY_TWO_ON. `?scenery=1` (read once when this module
// loads) or the WispFlight option `{scenery:1}` switches it off; the lab's
// "before" column uses that switch.
//
// The background, sky, course tableaux, near-landscape plates and weather are
// the original shared ones in both modes: the owner preferred their soft,
// misty, inexact look. This module never draws a background layer.
//
// Rules kept here:
// - Whole native-buffer pixels, flat colours, stepped alpha bands. No blur,
//   no shadowBlur, no gradients.
// - Static art is baked once: ground texture and surface growth once per
//   terrain chunk (inside the renderer's existing terrain cache), sprites and
//   the two material tiles once per level. Nothing is drawn per frame here.
// - Decoration never touches collision, pickups or hazards. Ground detail is
//   drawn inside the terrain polygon (the bake is clipped to it). Growth that
//   rises into open air is drawn in a back layer before the terrain, sized to
//   a fraction of the open space above it, and only where the surface is
//   exposed. Boulders sit inside the ground with their tops flush; a large one
//   on soft ground may stand at most 2 px proud, like other growth.
// - Everything here is drawn before the renderer's darkness/light fog, so it
//   dims exactly like terrain does.
//
// Ground recipe, from principles common to well-loved 2D games and card
// landscapes (not any one game's look):
// - Strata: a top lip (snow, moss, grass, ash, sand...), a soft top band that
//   follows the surface, a body layer and a rock layer. The rock boundary is
//   half surface-following and half level, so cliffs cut through the layers
//   and show them; the deep body darkens in three flat steps.
// - Rockiness: steep faces and sharp convex corners expose the rock layer up
//   to the surface and lose the soft lip, so cliffs read as rock and flats as
//   soil/snow/sand. When a course carries material tags (obstacle
//   .surfaceMaterials from the landform courses, `?courses=2`) they decide it:
//   rock/ice/ruin are bare and hard, soil/sand/snow/scree/canopy soft, water
//   wet; without tags the shape decides.
// - Big-medium-small: boulder clusters (at most one large stone, a few medium
//   ones, a scatter of pebbles) with plain rest stretches between clusters.
// - Embedded features deeper in (roots, bones, shells, lenses, embers...) and
//   dashed cracks along the strata boundary.
//
// Biome fit (SCENERY_FIT; tests/level-scenery-two.test.mjs enforces it):
// | biome     | lip                   | ground features                               | growth on tops                 | growth under roofs        |
// | moonruins | dry grass on earth    | masonry courses, broken columns, fallen blocks | dry grass, ivy, rare flowers  | ivy vines, roots          |
// | frost     | snow, sastrugi marks  | firn, glacial ice, lenses, crevasses, erratics | hoarfrost, ice shards, cornices| icicles                  |
// | pinewood  | moss                  | humus, roots, stones, grey rock                | pines, ferns, tufts, mushrooms, twigs, logs | roots, lichen |
// | marsh     | wet moss, water sheen | peat, roots, waterlogged clay, sunk logs       | reeds, cattails, sedge, lily pads (water only) | hanging moss, roots |
// | fungal    | spongy loam, mycelium | loam, mycelium threads                         | mushroom groups, shelf fungi, rare spore dots | hyphae |
// | basalt    | ash drifts            | hexagonal columns, dim ember cracks, scoria    | none                          | cooled lava drips         |
// | desert    | rippled sand          | sand strata, sandstone, bones, fossils         | sparse dry tufts, rare cacti  | none                      |
// | coral     | barnacle crust        | porous coral rock, shells, bones               | fan corals, anemones          | hanging weed              |
// | crystal   | bare rock, glints     | dark rock, crystal veins, embedded crystals    | crystal clusters              | hanging crystals          |
// | cloud     | grass cap             | soil, grey island rock, stones                 | grass, flowers                | roots, dangling rubble    |
// | thorn     | dark moss             | root-bound earth, stone ribs                   | briars, rare blossoms         | hanging briars, roots     |
// | cemetery  | grass                 | soft dark soil, small stones, old bones        | tall grass, wildflowers, rare posts and grave markers | roots |
// Never: grass on ice, sand, basalt, crystal or coral; anything plant-like in
// frost, basalt or crystal; snow and ice outside frost; crystals outside Prism
// Caverns; built stone (masonry, columns) outside Moonlit Ruins; grave markers
// outside Mourning Fields.

export const SCENERY_TWO_CODE = 'v1.2-level';
export const SCENERY_TWO_BIOMES = Object.freeze(['moonruins', 'frost', 'pinewood', 'marsh', 'fungal', 'basalt', 'desert', 'coral', 'crystal', 'cloud', 'thorn', 'cemetery']);
// Biomes whose v1.2 look is finished and has been checked in flight light.
// The rest keep the original look until they are; every listed look is
// complete in LOOKS, this list only decides what ships on by default.
export const SCENERY_TWO_ON = Object.freeze(['frost', 'pinewood']);
const URL_SCENERY = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('scenery'); } catch { return null; } })();
// Counters let tests prove the off path never reaches decoration code.
export const sceneryTwoStats = { created: 0, materials: 0, growth: 0, materialMs: 0, growthMs: 0 };
const now = () => globalThis.performance?.now?.() ?? 0;

// 2 = ground and growth (default), 1 = the original terrain look (off switch).
export function sceneryVersion(engine) {
  const option = engine?.options?.scenery;
  if (option !== undefined && option !== null && option !== '') return Number(option) === 1 ? 1 : 2;
  return Number(URL_SCENERY) === 1 ? 1 : 2;
}

export function createLevelSceneryTwo(engine, identity) {
  if (sceneryVersion(engine) !== 2) return null;
  const biome = identity?.biomeId;
  // `?scenery=2` / {scenery:2} previews a pending biome (design lab, Play links).
  const forced = Number(engine?.options?.scenery ?? URL_SCENERY) === 2;
  if (!SCENERY_TWO_ON.includes(biome) && !(forced && SCENERY_TWO_BIOMES.includes(biome))) return null;
  sceneryTwoStats.created++;
  return new LevelSceneryTwo(engine, identity, biome);
}

// --- Biome fit -----------------------------------------------------------------

// Element kinds each biome may draw. `growth` covers sprites on tops and under
// roofs, `ground` the features baked into the ground, `lip` the top material.
export const SCENERY_FIT = Object.freeze({
  moonruins: { lip: 'drygrass', ground: ['masonry', 'column', 'block', 'stone', 'root', 'roots', 'bone'], growth: ['drygrass', 'ivy', 'flower', 'vine', 'root'] },
  frost: { lip: 'snow', ground: ['erratic', 'stone', 'lens', 'bubble', 'crevasse', 'fracture'], growth: ['hoarfrost', 'shard', 'cornice', 'icicle'] },
  pinewood: { lip: 'moss', ground: ['boulder', 'stone', 'root', 'roots'], growth: ['pine', 'fern', 'tuft', 'mushroom', 'twig', 'log', 'forestRoof'] },
  marsh: { lip: 'wetmoss', ground: ['boulder', 'stone', 'root', 'roots', 'log'], growth: ['reed', 'cattail', 'sedge', 'lily', 'moss', 'root'] },
  fungal: { lip: 'loam', ground: ['boulder', 'stone', 'mycelium'], growth: ['fungus', 'shelf', 'spore', 'hyphae'] },
  basalt: { lip: 'ash', ground: ['scoria', 'stone', 'ember', 'fracture'], growth: ['drip'] },
  desert: { lip: 'sand', ground: ['sandstone', 'stone', 'bone', 'fossil'], growth: ['drytuft', 'cactus'] },
  coral: { lip: 'crust', ground: ['coralhead', 'stone', 'shell', 'bone'], growth: ['fan', 'anemone', 'weed'] },
  crystal: { lip: 'bare', ground: ['boulder', 'stone', 'crystal', 'vein', 'fracture'], growth: ['crystal', 'crystalHang'] },
  cloud: { lip: 'grass', ground: ['boulder', 'stone', 'root', 'fracture'], growth: ['grass', 'flower', 'root', 'rubble'] },
  thorn: { lip: 'darkmoss', ground: ['boulder', 'stone', 'root', 'roots', 'rib'], growth: ['briar', 'blossom', 'briarHang', 'root'] },
  cemetery: { lip: 'grass', ground: ['boulder', 'stone', 'bone', 'root', 'roots'], growth: ['tallgrass', 'flower', 'post', 'grave', 'root'] },
});
// Cross-biome laws the fit table must obey (checked by the test).
export const SCENERY_FIT_LAWS = Object.freeze({
  plants: ['pine', 'fern', 'tuft', 'mushroom', 'twig', 'log', 'forestRoof', 'drygrass', 'grass', 'tallgrass', 'sedge', 'drytuft', 'flower', 'ivy', 'vine', 'reed', 'cattail', 'lily', 'moss', 'fungus', 'shelf', 'spore', 'hyphae', 'cactus', 'briar', 'blossom', 'briarHang', 'root', 'roots', 'mycelium', 'weed'],
  noPlants: ['frost', 'basalt', 'crystal'],
  grass: ['drygrass', 'grass', 'tallgrass', 'sedge', 'tuft'],
  noGrass: ['frost', 'desert', 'basalt', 'crystal', 'coral'],
  only: { frost: ['snow', 'hoarfrost', 'shard', 'cornice', 'icicle', 'lens', 'crevasse', 'erratic'], crystal: ['crystal', 'crystalHang', 'vein'], moonruins: ['masonry', 'column', 'block'], cemetery: ['grave', 'post'] },
});

// --- Palettes --------------------------------------------------------------------
// Limited palettes, one per biome. Every colour drawn by this module is listed.
export const SCENERY_TWO_PALETTES = Object.freeze({
  moonruins: {
    ground: { base: '#3a382f', lumps: ['#423f35', '#2f2d26'], stone: '#4f5046', stoneLit: '#65645a', stoneDark: '#24241f', root: '#2c2a22', rootLit: '#4c4838', deep: '#090b0a', crack: '#1c1d19', crackLit: '#5e5d50', face: '#4b4a3e', seam: '#22231e' },
    rock: { mortar: '#24251f', blocks: ['#4b4d43', '#535548', '#45473e'], lit: '#66665a', dark: '#383a32', fill: '#33322a' },
    soil: { ink: '#433f30', grain: ['#4d4835', '#383528'] },
    lip: { body: '#5a5639', shade: '#45412d', top: '#716b48', mark: '#827b52' },
    under: { ink: '#2c2b24', dot: '#4f6a48' },
    boulder: { body: '#56584c', lit: '#6f6e60', shade: '#3e4037', edge: '#1f201b' },
    embed: { bone: '#a19d86', column: '#615f52', columnLit: '#7a786a', columnDark: '#45453c' },
    g: { dry: ['#7a744d', '#948c5e', '#5f5b3e'], ivy: ['#3c573b', '#516c4c', '#68825e'], flower: ['#b5c2ac', '#c9b98a'], vine: '#3a5038', vineLeaf: '#557050', root: '#2f2a20' },
  },
  frost: {
    ground: { seam: '#26404f', blocks: ['#2b4656', '#30505f', '#283f4e'], blockLit: '#375a6b', glint: '#557f92', bubble: '#1f3444', deep: '#08111b', crack: '#13253a', crackLit: '#5f899e', face: '#43697c' },
    rock: { seam: '#1b3141', blocks: ['#203a4b', '#244254', '#1d3546'], blockLit: '#2d4d60', glint: '#4a7488', bubble: '#162a39', face: '#2f5265', crack: '#10202f' },
    soil: { ink: '#3b6072', grain: ['#47707f', '#33566a'] },
    snow: { body: '#9bb7c6', top: '#bcd2dd', shade: '#6a8a9d' },
    rim: '#86b9ce',
    icicle: { body: '#4f7489', lit: '#8db5c8' },
    shard: { body: '#3f667b', lit: '#7fa9bc' },
    lens: { body: '#3b6a80', lit: '#6d9db2' },
    boulder: { body: '#34363d', lit: '#4e5159', shade: '#25262c', edge: '#15161b', cap: '#9bb7c6' },
    crevasse: '#0b1722',
  },
  pinewood: {
    ground: { base: '#3f3727', lumps: ['#483e2b', '#332c20'], humus: '#262117', stone: '#4c4a3b', stoneLit: '#625f4b', stoneDark: '#1f1b14', root: '#2a2116', rootLit: '#55462f', deep: '#0b0d09', crack: '#1d1912', crackLit: '#4f4836', seam: '#211c14' },
    rock: { seam: '#211e18', blocks: ['#3a382e', '#353228', '#3f3c31'], blockLit: '#4a473a', glint: '#575343', bubble: '#2a2820', face: '#45423a', crack: '#1a1813' },
    soil: { ink: '#342d20', grain: ['#3c3425', '#2b251a'] },
    moss: { body: '#557740', top: '#6a8a4c' },
    boulder: { body: '#4a483b', lit: '#625f4e', shade: '#33322a', edge: '#191812', cap: '#4b6a3a' },
    pine: { body: '#1b3027', dark: '#14251d', lit: '#2b4733', trunk: '#271f17' },
    fern: ['#2f4a2c', '#46663b'],
    log: { bark: '#33281c', end: '#5f5034', ring: '#463a26', moss: '#3f5a33' },
    mushroom: { cap: '#7d563b', spot: '#b9a682', stem: '#a69c84' },
    hanging: { root: '#2e2418', lichen: '#56664a' },
  },
  marsh: {
    ground: { base: '#2b2b20', lumps: ['#333226', '#232219'], stone: '#3f4637', stoneLit: '#56604a', stoneDark: '#1b1d16', root: '#3a3122', rootLit: '#55482f', glint: '#3c524c', deep: '#080b09', crack: '#171913', crackLit: '#4a5642', face: '#34402c', seam: '#1a1e18' },
    rock: { seam: '#161c19', blocks: ['#1f2824', '#232d28', '#1c2420'], blockLit: '#2b3832', glint: '#3f5a55', bubble: '#141a17', face: '#2f3d36', crack: '#111613' },
    soil: { ink: '#30311f', grain: ['#3a3a26', '#26271a'] },
    lip: { body: '#3b4a2c', shade: '#2c3822', top: '#4d5d37', mark: '#5e7462' },
    under: { ink: '#252619', dot: '#5f6e4f' },
    water: { body: '#1d2c2c', glint: '#4e6b66' },
    boulder: { body: '#41473c', lit: '#58604f', shade: '#2d3229', edge: '#16190f', cap: '#4a5a36' },
    log: { bark: '#3a2f22', end: '#6a5a3c', ring: '#4c3e2a', moss: '#44553a' },
    g: { reed: ['#5f6c40', '#7c8857', '#4b5634'], cattail: '#5a3e2a', cattailTip: '#7a5a3a', lily: ['#41593a', '#5f7d4b'], lilyFlower: '#c9c2a0', moss: ['#66755d', '#4f5c48', '#7d8c72'], root: '#2e2418', sedge: ['#55613a', '#6b774a'] },
  },
  fungal: {
    ground: { base: '#352c3a', lumps: ['#3d3343', '#2c2531'], stone: '#4a4352', stoneLit: '#615868', stoneDark: '#221d27', root: '#2a2230', rootLit: '#4a3f52', thread: '#7d7186', deep: '#0b090d', crack: '#1c1720', crackLit: '#5a4f62', face: '#463b4d', seam: '#211b25' },
    rock: { seam: '#1d1922', blocks: ['#2e2836', '#332c3b', '#29242f'], blockLit: '#3d3546', glint: '#544a5e', bubble: '#231e29', face: '#3d3546', crack: '#18141c' },
    soil: { ink: '#3f3346', grain: ['#4a3d52', '#33293a'] },
    lip: { body: '#4c3e55', shade: '#382e40', top: '#5c4b66', mark: '#9a8ea3' },
    under: { ink: '#2c2532', dot: '#8f8296' },
    boulder: { body: '#4a4352', lit: '#615868', shade: '#332d39', edge: '#1a1620' },
    embed: { thread: '#8f8296', threadLit: '#b2a6b6' },
    g: { cap: ['#7e5f87', '#9a789b', '#62496a'], spot: '#d0bfcc', stem: '#b9adb4', gill: '#4a3a52', shelf: ['#8f7264', '#ab8c76', '#665044'], spore: '#8fc3b1', sporeDim: '#45605b', hyphae: ['#9a8ea3', '#766a7f'] },
  },
  basalt: {
    ground: { tones: ['#38323a', '#3f3840', '#332e36'], joint: '#1c181e', lit: '#4c434e', dark: '#2a252c', deep: '#0b090c', crack: '#161317', crackLit: '#4c434e', face: '#3a343c', seam: '#19161a' },
    rock: { seam: '#161318', blocks: ['#2b262d', '#2f2a31', '#272229'], blockLit: '#373038', glint: '#423a43', bubble: '#1f1b20', face: '#373038', crack: '#121014' },
    soil: { ink: '#433c40', grain: ['#4e4648', '#383236'] },
    lip: { body: '#665e60', shade: '#504a4c', top: '#7b7272', mark: '#3c363a' },
    under: { ink: '#28232a', dot: '#4a2a24' },
    boulder: { body: '#2f2a31', lit: '#463f47', shade: '#221e24', edge: '#121014', cap: '#665e60' },
    embed: { ember: '#4a231d', emberHot: '#6e3222' },
    g: { drip: ['#221e24', '#3b353c', '#5e2c22'] },
  },
  desert: {
    ground: { bands: ['#6e5a45', '#66533f', '#75604a', '#5e4c3b'], line: '#4e3f31', grain: '#85704f', deep: '#0d0a08', crack: '#3c3024', crackLit: '#8a7254', face: '#86704f', seam: '#46392b' },
    rock: { bands: ['#5a4838', '#634f3d', '#544233'], line: '#3f3226', grain: '#6e573f' },
    soil: { ink: '#86704f', grain: ['#937a59', '#776246'] },
    lip: { body: '#9c835e', shade: '#7f684b', top: '#b0966f', mark: '#6f5a40' },
    under: { ink: '#4a3c2f', dot: '#7f684b' },
    boulder: { body: '#77604a', lit: '#917759', shade: '#584535', edge: '#362a20', cap: '#9c835e' },
    embed: { bone: '#c2b59a', fossil: '#a19072' },
    g: { dry: ['#857650', '#9e8d66', '#685d40'], cactus: ['#4b5c43', '#637656', '#374532'], cactusFlower: '#c08a74' },
  },
  coral: {
    ground: { base: '#5a4d4f', lumps: ['#625456', '#4f4345'], hole: '#2f2729', holeLit: '#7a6a6a', deep: '#0d0b0b', crack: '#2a2325', crackLit: '#7a6a6a', face: '#6a5a5a', seam: '#2c2527' },
    rock: { seam: '#2a2426', blocks: ['#433b3d', '#4a4143', '#3e3739'], blockLit: '#564b4d', glint: '#6a5c5c', bubble: '#322b2d', face: '#4f4547', crack: '#231e20' },
    soil: { ink: '#665658', grain: ['#736264', '#574a4c'] },
    lip: { body: '#7c6a68', shade: '#5c4f50', top: '#988280', mark: '#bfa49d' },
    under: { ink: '#3b3334', dot: '#988280' },
    boulder: { body: '#6a5c5d', lit: '#867674', shade: '#4c4243', edge: '#2a2324' },
    embed: { shell: '#c4b3a6', shellDark: '#86736d', bone: '#cfc4b4' },
    g: { fan: ['#9f7d8a', '#b98a86', '#785e6b'], anemone: ['#a86b66', '#c79a8a', '#84524f'], weed: ['#4c665a', '#66856e', '#384c44'] },
  },
  crystal: {
    ground: { seam: '#1b1a2a', blocks: ['#343149', '#2c2a40', '#38354e'], blockLit: '#433f5c', glint: '#5e5880', bubble: '#24223a', vein: '#5d5490', deep: '#09080f', crack: '#15141f', crackLit: '#5e5880', face: '#3c3954' },
    rock: { seam: '#141320', blocks: ['#26243a', '#2a283f', '#222034'], blockLit: '#333049', glint: '#4a4570', bubble: '#1b1a2b', vein: '#4f4688', face: '#302d46', crack: '#100f19' },
    lip: { body: '#46425f', shade: '#35324b', top: '#565172', mark: '#9b8fd0' },
    under: { ink: '#26243a', dot: '#8f84c4' },
    boulder: { body: '#39364f', lit: '#4f4b6a', shade: '#29273b', edge: '#14131d' },
    embed: { body: '#665b98', lit: '#bdb2da', dark: '#453d6a', core: '#9286c6', vein: '#6f63a0', veinLit: '#a69bd2' },
  },
  cloud: {
    ground: { base: '#3f3d33', lumps: ['#47453a', '#35332b'], stone: '#5d676b', stoneLit: '#78858a', stoneDark: '#2c3134', root: '#2f2c23', rootLit: '#4c4838', deep: '#0b0d0e', crack: '#1f2326', crackLit: '#65767b', face: '#4f5b60', seam: '#23292d' },
    rock: { seam: '#232a2f', blocks: ['#3e484e', '#434d53', '#394349'], blockLit: '#505b61', glint: '#65767b', bubble: '#2c3439', face: '#4f5b60', crack: '#1c2226' },
    soil: { ink: '#3a3b2e', grain: ['#45463a', '#303126'] },
    lip: { body: '#53704b', shade: '#3f5637', top: '#6a885d', mark: '#83a072' },
    under: { ink: '#2c3338', dot: '#5d676b' },
    boulder: { body: '#5a6468', lit: '#748186', shade: '#41494d', edge: '#1f2427', cap: '#53704b' },
    g: { grass: ['#5c7757', '#7a936d', '#475d43'], flower: ['#d1d2b8', '#c9a9b8', '#c9c27a'], root: '#3b3a30', rubble: ['#5d676b', '#78858a', '#3c4448'] },
  },
  thorn: {
    ground: { base: '#2f2a20', lumps: ['#372f24', '#27231a'], stone: '#4d4a3a', stoneLit: '#64604c', stoneDark: '#1c1914', root: '#3d3122', rootLit: '#5a4832', deep: '#0a0907', crack: '#1a1711', crackLit: '#4f4a38', face: '#3a3627', seam: '#1c1913' },
    rock: { seam: '#1c1b14', blocks: ['#2f3025', '#33342a', '#2b2c22'], blockLit: '#3e4031', glint: '#55583f', bubble: '#22231b', face: '#3e4031', crack: '#16160f' },
    soil: { ink: '#33301f', grain: ['#3d3926', '#29261a'] },
    lip: { body: '#3a4730', shade: '#2b3523', top: '#4a5a3a', mark: '#5a4832' },
    under: { ink: '#26221a', dot: '#5a4832' },
    boulder: { body: '#4a4838', lit: '#615e4a', shade: '#343229', edge: '#191812' },
    embed: { rib: '#646450', ribLit: '#7e7e66', ribDark: '#3f3f31' },
    g: { briar: ['#3a2d24', '#55422f', '#2a211a'], thorn: '#86704f', blossom: '#d2c2ba', blossomCore: '#b89a62', root: '#2e2418' },
  },
  cemetery: {
    ground: { base: '#34322b', lumps: ['#3c3a32', '#2b2a24'], stone: '#5c605a', stoneLit: '#73776f', stoneDark: '#262824', root: '#2c261e', rootLit: '#4a4234', deep: '#0a0b0a', crack: '#1d1f1c', crackLit: '#5b625c', face: '#454b47', seam: '#21231f' },
    rock: { seam: '#202421', blocks: ['#383d3a', '#3d423f', '#343936'], blockLit: '#474d49', glint: '#5b625c', bubble: '#2a2e2b', face: '#454b47', crack: '#1a1d1b' },
    soil: { ink: '#3b382f', grain: ['#45423a', '#302e27'] },
    lip: { body: '#475744', shade: '#354237', top: '#5a6a53', mark: '#6c7c63' },
    under: { ink: '#2b2a24', dot: '#4a4234' },
    boulder: { body: '#595d57', lit: '#70746c', shade: '#3f423d', edge: '#1e201d' },
    embed: { bone: '#b2af9f' },
    g: { grass: ['#66735c', '#83907a', '#505d4b'], flower: ['#c0c9b9', '#b9a3b8', '#c9b77a'], post: ['#4a4036', '#5f5446', '#2f2922'], grave: ['#676d67', '#828880', '#454a46'], root: '#2c261e' },
  },
});

// --- Looks: how each biome builds its ground and growth ------------------------
// body/rock: tile kinds for the two lower strata. steep: slope at which faces
// turn to bare rock. d2: depth (px) of the rock layer under soft ground.
// lip: the top material. boulders: cluster recipe. embeds: buried features.
// growth: placement rules for tops (floor) and roof undersides (roof); p is the
// share of candidate spots, slope/free/frac/max limit where and how tall.
const LOOKS = {
  moonruins: {
    body: { kind: 'soil', ink: 'ground', lumps: 110, stones: 5, roots: 3 }, rock: { kind: 'masonry', ink: 'rock' },
    steep: .95, d2: 10, level: .55, soil: 4,
    lip: { kind: 'drygrass', min: 1, max: 3, slopeMax: 1.2, mark: 'grass' }, under: { depth: 3, dotP: .12, drop: 2 },
    boulders: { kind: 'block', density: .6, big: .45, gap: [44, 120], blocky: true, proud: 2 },
    embeds: [{ kind: 'column', n: .35, depth: [0, 1] }, { kind: 'block', n: .8, depth: [4, 14] }, { kind: 'bone', n: .3, depth: [6, 18] }, { kind: 'root', n: .4, depth: [2, 6] }],
    cracks: { kind: 'roots', per: 120 },
    growth: {
      floor: [{ kind: 'drygrass', p: .34, slope: 1.1, free: 7, frac: .3, max: 6, cluster: 1, spread: 3 }, { kind: 'ivy', p: .16, slope: 1.5, free: 6, frac: .25, max: 4 }, { kind: 'flower', p: .04, slope: .8, free: 10, frac: .3, max: 5 }],
      roof: [{ kind: 'vine', p: .26, free: 8, frac: .28, max: 14, step: [3, 6] }, { kind: 'root', p: .12, free: 8, frac: .25, max: 10 }],
    },
  },
  frost: {
    body: { kind: 'plates', ink: 'ground', cols: 3, rows: 3, ys: 1.5, veins: true, glints: true, bubbles: true, fractures: 4 },
    rock: { kind: 'plates', ink: 'rock', cols: 4, rows: 3, ys: 1.2, veins: false, glints: true, bubbles: true, fractures: 2 },
    steep: 1.05, d2: 14, level: .5, soil: 4, roofRock: .3,
    lip: { kind: 'snow', min: 1, max: 4, drift: true, hollow: true, slopeMax: 1.25, mark: 'sastrugi' }, under: { depth: 5, dotP: .7, rim: true },
    boulders: { kind: 'erratic', density: .5, big: .5, gap: [56, 150], proud: 2 },
    embeds: [{ kind: 'lens', n: .9, depth: [6, 20] }, { kind: 'bubble', n: 1.6, depth: [4, 26] }],
    cracks: { kind: 'fracture', per: 80, crevasse: 150 },
    growth: {
      floor: [{ kind: 'shard', p: .2, slope: 1.2, free: 12, frac: .28, max: 9, cluster: 2, spread: 3 }, { kind: 'hoarfrost', p: .3, slope: .5, free: 8, step: [6, 12] }, { kind: 'cornice', p: .12, free: 16 }],
      roof: [{ kind: 'icicle', p: 1 }],
    },
  },
  pinewood: {
    body: { kind: 'soil', ink: 'ground', lumps: 120, stones: 9, roots: 5 }, rock: { kind: 'plates', ink: 'rock', cols: 4, rows: 3, ys: 1.3, fractures: 2 },
    steep: 1.1, d2: 15, level: .5, soil: 3, ecology: true,
    lip: { kind: 'moss', min: 2, max: 4, slopeMax: 1.3 }, under: { depth: 4, dotP: .2, drop: 3 },
    boulders: { kind: 'boulder', density: .45, big: .4, gap: [60, 160], proud: 2 },
    embeds: [{ kind: 'stone', n: .6, depth: [5, 16] }],
    cracks: { kind: 'roots', per: 90 },
    growth: {
      floor: [{ kind: 'pine', p: .3 }, { kind: 'fern', p: .22, free: 9 }, { kind: 'tuft', p: .14, free: 6 }, { kind: 'mushroom', p: .1, slope: .5, free: 8 }, { kind: 'twig', p: .08, slope: .7, free: 6 }, { kind: 'log', p: .08, free: 12 }],
      roof: [{ kind: 'forestRoof', p: .9 }],
    },
  },
  marsh: {
    body: { kind: 'soil', ink: 'ground', lumps: 140, stones: 3, roots: 9, glints: 0 }, rock: { kind: 'plates', ink: 'rock', cols: 4, rows: 4, ys: 2.2, bubbles: true, glints: true, fractures: 0 },
    steep: 1.15, d2: 9, level: .6, soil: 4,
    lip: { kind: 'wetmoss', min: 2, max: 3, slopeMax: 1.3, mark: 'sheen' }, under: { depth: 4, dotP: .25, drop: 3 },
    boulders: { kind: 'boulder', density: .3, big: .25, gap: [70, 170], proud: 1 },
    embeds: [{ kind: 'log', n: .25, depth: [0, 1] }, { kind: 'root', n: 1, depth: [2, 8] }, { kind: 'stone', n: .3, depth: [5, 12] }],
    cracks: { kind: 'roots', per: 70 },
    growth: {
      floor: [{ kind: 'reed', p: .3, slope: 1, free: 10, frac: .3, max: 15, cluster: 2, spread: 2 }, { kind: 'cattail', p: .12, slope: .9, free: 14, frac: .3, max: 13, cluster: 1, spread: 3 }, { kind: 'sedge', p: .2, slope: 1.2, free: 6, frac: .3, max: 5 }, { kind: 'lily', p: .1, water: true, free: 6 }],
      roof: [{ kind: 'moss', p: .5, free: 8, frac: .3, max: 18, step: [2, 5] }, { kind: 'root', p: .2, free: 8, frac: .25, max: 12 }],
    },
  },
  fungal: {
    body: { kind: 'soil', ink: 'ground', lumps: 110, stones: 4, roots: 2, threads: 7 }, rock: { kind: 'plates', ink: 'rock', cols: 3, rows: 3, ys: 1.4, fractures: 2 },
    steep: 1.1, d2: 12, level: .5, soil: 4,
    lip: { kind: 'loam', min: 2, max: 3, slopeMax: 1.3, mark: 'speck' }, under: { depth: 3, dotP: .2, drop: 2 },
    boulders: { kind: 'boulder', density: .4, big: .35, gap: [60, 150], proud: 1 },
    embeds: [{ kind: 'mycelium', n: 1.4, depth: [2, 12] }, { kind: 'stone', n: .3, depth: [6, 16] }],
    cracks: null,
    growth: {
      floor: [{ kind: 'fungus', p: .3, slope: 1, free: 8, frac: .32, max: 11, gap: 5 }, { kind: 'shelf', p: .25, minSlope: 1.2, free: 6 }, { kind: 'spore', p: .03, slope: .8, free: 10 }],
      roof: [{ kind: 'hyphae', p: .45, free: 8, frac: .28, max: 12, step: [2, 5] }],
    },
  },
  basalt: {
    body: { kind: 'columns', ink: 'ground' }, rock: { kind: 'plates', ink: 'rock', cols: 3, rows: 2, ys: .6, fractures: 3 },
    steep: .9, d2: 16, level: .4, soil: 2,
    lip: { kind: 'ash', min: 1, max: 3, drift: true, hollow: true, slopeMax: 1.1, mark: 'speck' }, under: { depth: 3, dotP: .1, drop: 1 },
    boulders: { kind: 'scoria', density: .55, big: .4, gap: [48, 130], proud: 1, vesicles: true },
    embeds: [{ kind: 'ember', n: .9, depth: [12, 34] }, { kind: 'stone', n: .4, depth: [4, 14] }],
    cracks: { kind: 'fracture', per: 110 },
    growth: {
      floor: [],
      roof: [{ kind: 'drip', p: .3, free: 8, frac: .22, max: 8, overhang: true }],
    },
  },
  desert: {
    body: { kind: 'strata', ink: 'ground', band: [2, 5] }, rock: { kind: 'strata', ink: 'rock', band: [4, 9] },
    steep: 1, d2: 12, level: .75, soil: 4,
    lip: { kind: 'sand', min: 2, max: 4, drift: true, hollow: true, slopeMax: 1.15, mark: 'ripple' }, under: { depth: 3, dotP: .15, drop: 2 },
    boulders: { kind: 'sandstone', density: .5, big: .45, gap: [60, 160], proud: 2 },
    embeds: [{ kind: 'bone', n: .3, depth: [5, 16] }, { kind: 'fossil', n: .2, depth: [8, 22] }],
    cracks: null,
    growth: {
      floor: [{ kind: 'drytuft', p: .07, slope: .7, free: 8, frac: .3, max: 4 }, { kind: 'cactus', p: .022, slope: .5, free: 22, frac: .25, max: 8, gap: 30 }],
      roof: [],
    },
  },
  coral: {
    body: { kind: 'porous', ink: 'ground' }, rock: { kind: 'plates', ink: 'rock', cols: 3, rows: 3, ys: 1.2, bubbles: true, fractures: 1 },
    steep: 1.1, d2: 12, level: .45, soil: 3,
    lip: { kind: 'crust', min: 1, max: 3, slopeMax: 1.4, mark: 'barnacle' }, under: { depth: 3, dotP: .35, drop: 1 },
    boulders: { kind: 'coralhead', density: .45, big: .35, gap: [56, 140], proud: 1, vesicles: true },
    embeds: [{ kind: 'shell', n: 1.1, depth: [3, 16] }, { kind: 'bone', n: .3, depth: [6, 18] }],
    cracks: null,
    growth: {
      floor: [{ kind: 'fan', p: .17, slope: 1, free: 12, frac: .3, max: 10, gap: 6 }, { kind: 'anemone', p: .14, slope: .8, free: 8, frac: .3, max: 5 }],
      roof: [{ kind: 'weed', p: .4, free: 8, frac: .3, max: 14, step: [2, 5] }],
    },
  },
  crystal: {
    body: { kind: 'plates', ink: 'ground', cols: 3, rows: 3, ys: 1.1, veins: true, glints: true, fractures: 3 }, rock: { kind: 'plates', ink: 'rock', cols: 4, rows: 3, ys: 1, veins: true, fractures: 2 },
    steep: .9, d2: 12, level: .5, soil: 0, roofRock: .6,
    lip: { kind: 'bare', min: 1, max: 2, slopeMax: 1.1, mark: 'glint' }, under: { depth: 3, dotP: .08, drop: 1 },
    boulders: { kind: 'boulder', density: .4, big: .3, gap: [60, 150], proud: 0 },
    embeds: [{ kind: 'crystal', n: .5, depth: [3, 16] }, { kind: 'vein', n: .9, depth: [4, 24] }],
    cracks: { kind: 'fracture', per: 100 },
    growth: {
      floor: [{ kind: 'crystal', p: .13, slope: 1.2, free: 12, frac: .3, max: 14, gap: 8 }],
      roof: [{ kind: 'crystalHang', p: .16, free: 12, frac: .25, max: 12, gap: 6 }],
    },
  },
  cloud: {
    body: { kind: 'soil', ink: 'ground', lumps: 100, stones: 8, roots: 4 }, rock: { kind: 'plates', ink: 'rock', cols: 3, rows: 3, ys: 1.3, fractures: 2, glints: true },
    steep: 1.05, d2: 8, level: .35, soil: 3, roofRock: .75,
    lip: { kind: 'grass', min: 2, max: 3, slopeMax: 1.3, mark: 'grass' }, under: { depth: 3, dotP: .2, drop: 2 },
    boulders: { kind: 'boulder', density: .4, big: .35, gap: [60, 150], proud: 1 },
    embeds: [{ kind: 'stone', n: .8, depth: [4, 14] }, { kind: 'root', n: .5, depth: [1, 5] }],
    cracks: { kind: 'fracture', per: 120 },
    growth: {
      floor: [{ kind: 'grass', p: .42, slope: 1.2, free: 6, frac: .3, max: 6, cluster: 1, spread: 3 }, { kind: 'flower', p: .1, slope: .8, free: 8, frac: .3, max: 5 }],
      roof: [{ kind: 'root', p: .3, free: 8, frac: .3, max: 14 }, { kind: 'rubble', p: .14, free: 10, frac: .3, max: 12 }],
    },
  },
  thorn: {
    body: { kind: 'soil', ink: 'ground', lumps: 110, stones: 4, roots: 14 }, rock: { kind: 'plates', ink: 'rock', cols: 3, rows: 3, ys: 1.3, fractures: 2 },
    steep: 1.1, d2: 13, level: .5, soil: 3,
    lip: { kind: 'darkmoss', min: 1, max: 3, slopeMax: 1.3, mark: 'speck' }, under: { depth: 4, dotP: .2, drop: 2 },
    boulders: { kind: 'boulder', density: .3, big: .3, gap: [70, 170], proud: 1 },
    embeds: [{ kind: 'rib', n: .35, depth: [0, 2] }, { kind: 'root', n: 1, depth: [2, 10] }],
    cracks: { kind: 'roots', per: 60 },
    growth: {
      floor: [{ kind: 'briar', p: .3, slope: 1.2, free: 10, frac: .3, max: 9, gap: 4 }, { kind: 'blossom', p: .03, slope: 1, free: 10, frac: .3, max: 5 }],
      roof: [{ kind: 'briarHang', p: .32, free: 10, frac: .3, max: 12, step: [3, 6] }, { kind: 'root', p: .2, free: 8, frac: .25, max: 10 }],
    },
  },
  cemetery: {
    body: { kind: 'soil', ink: 'ground', lumps: 120, stones: 10, roots: 4 }, rock: { kind: 'plates', ink: 'rock', cols: 3, rows: 3, ys: 1.4, fractures: 2 },
    steep: 1.1, d2: 14, level: .5, soil: 4,
    lip: { kind: 'grass', min: 1, max: 3, slopeMax: 1.3, mark: 'grass' }, under: { depth: 3, dotP: .15, drop: 3 },
    boulders: { kind: 'boulder', density: .35, big: .25, gap: [60, 160], proud: 1 },
    embeds: [{ kind: 'stone', n: 1, depth: [3, 12] }, { kind: 'bone', n: .35, depth: [8, 20] }, { kind: 'root', n: .5, depth: [2, 6] }],
    cracks: { kind: 'roots', per: 110 },
    growth: {
      floor: [{ kind: 'tallgrass', p: .44, slope: 1.1, free: 8, frac: .32, max: 12, cluster: 1, spread: 3 }, { kind: 'flower', p: .12, slope: .9, free: 8, frac: .3, max: 6 }, { kind: 'post', p: .018, slope: .4, free: 26, frac: .22, max: 6, gap: 40 }, { kind: 'grave', p: .018, slope: .4, free: 26, frac: .22, max: 7, gap: 40 }],
      roof: [{ kind: 'root', p: .35, free: 8, frac: .28, max: 12 }],
    },
  },
};
export const SCENERY_TWO_LOOKS = LOOKS;

// --- Utilities -------------------------------------------------------------------

const hash = (x, y = 0, seed = 0) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
const vnoise = (t, k, seed) => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return hash(i, k, seed) * (1 - u) + hash(i + 1, k, seed) * u; };
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const seedOf = text => { let h = 2166136261; for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const HARD = new Set(['rock', 'ice', 'ruin']), SOFT = new Set(['soil', 'sand', 'snow', 'scree', 'canopy', 'wood']);

function rect(c, x, y, w, h, ink) {
  w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return;
  c.fillStyle = ink; c.fillRect(Math.round(x), Math.round(y), w, h);
}
function line(c, x0, y0, x1, y1, ink, size = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy; c.fillStyle = ink;
  for (let guard = 0; guard < 512; guard++) {
    c.fillRect(x0, y0, size, size);
    if (x0 === x1 && y0 === y1) break;
    const next = error * 2;
    if (next >= dy) { error += dy; x0 += sx; }
    if (next <= dx) { error += dx; y0 += sy; }
  }
}
function sampler(surface, width = 0) {
  // Surface points are sorted by x (canvas pixels). Clamp beyond the ends.
  const slow = x => {
    if (!surface.length) return 0;
    if (x <= surface[0][0]) return surface[0][1];
    for (let i = 1; i < surface.length; i++) {
      const a = surface[i - 1], b = surface[i];
      if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1);
    }
    return surface.at(-1)[1];
  };
  if (!(width > 0) || !surface.length) return slow;
  // One pass fills a per-column table so per-pixel lookups are O(1).
  const pad = 32, table = new Float32Array(Math.ceil(width) + pad * 2);
  for (let i = 0, k = 0; i < table.length; i++) {
    const x = i - pad;
    if (x <= surface[0][0]) { table[i] = surface[0][1]; continue; }
    while (k < surface.length - 1 && surface[k + 1][0] < x) k++;
    if (k >= surface.length - 1) { table[i] = surface.at(-1)[1]; continue; }
    const a = surface[k], b = surface[k + 1];
    table[i] = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1);
  }
  return x => { const i = Math.round(x) + pad; return i >= 0 && i < table.length ? table[i] : slow(x); };
}
function makeCanvas(document, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width); canvas.height = Math.max(1, height);
  const c = canvas.getContext('2d', { willReadFrequently: true });
  c.imageSmoothingEnabled = false;
  return { canvas, c };
}
// Draw `fn(x)` at x and its wrapped copies so a layer tiles seamlessly.
function wrapped(P, x, extent, fn) {
  fn(x);
  if (x - extent < 0) fn(x + P);
  if (x + extent > P) fn(x - P);
}
// Collects pixel rects per colour, merging horizontal neighbours with the same
// row span, then paints each colour once. Insertion order of colours is paint order.
function rectBatch() {
  const lists = new Map();
  return {
    add(ink, x, y, w, h) {
      if (w <= 0 || h <= 0 || !ink) return;
      let list = lists.get(ink); if (!list) lists.set(ink, list = []);
      const n = list.length;
      if (n && list[n - 3] === y && list[n - 1] === h && list[n - 4] + list[n - 2] === x) { list[n - 2] += w; return; }
      list.push(x, y, w, h);
    },
    size() { return lists.size; },
    flush(c) {
      for (const [ink, list] of lists) { c.fillStyle = ink; for (let i = 0; i < list.length; i += 4) c.fillRect(list[i], list[i + 1], list[i + 2], list[i + 3]); }
      lists.clear();
    },
  };
}
function recorderFor(batch) { return { fillStyle: '', fillRect(x, y, w, h) { batch.add(this.fillStyle, Math.round(x), Math.round(y), Math.round(w), Math.round(h)); } }; }

// --- Material tiles (baked once per level) -----------------------------------------

const TILE_W = 128, TILE_H = 96;
const rgb = hex => (0xFF000000 | parseInt(hex.slice(5, 7), 16) << 16 | parseInt(hex.slice(3, 5), 16) << 8 | parseInt(hex.slice(1, 3), 16)) >>> 0;
// Rect that wraps in both directions.
function tileRect(c, x, y, w, h, ink) {
  for (const ox of [0, -TILE_W, TILE_W]) for (const oy of [0, -TILE_H, TILE_H]) {
    const xx = x + ox, yy = y + oy;
    if (xx + w <= 0 || xx >= TILE_W || yy + h <= 0 || yy >= TILE_H) continue;
    rect(c, xx, yy, w, h, ink);
  }
}
// Plates: a few large irregular plates split by seams that fade in and out
// (ice, rock). Plates are the nearest of jittered seeds, wrapping.
function bakePlates(document, seed, g, o) {
  const { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  const COLS = o.cols || 3, ROWS = o.rows || 3, cw = TILE_W / COLS, rh = TILE_H / ROWS, YS = o.ys || 1.5, N = COLS * ROWS;
  const sx = [], sy = [], tone = [], lit = [];
  for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
    sx.push((k + .5) * cw + (hash(r, k, seed + 3) - .5) * cw * .85 + (r % 2 ? cw * .3 : 0));
    sy.push((r + .5) * rh + (hash(k, r, seed + 5) - .5) * rh * .8);
    const v = hash(r, k, seed + 11); tone.push(v < .4 ? 0 : v < .8 ? 1 : 2); lit.push(hash(r, k, seed + 13) > .45);
  }
  const col = { seam: rgb(g.seam), blocks: g.blocks.map(rgb), lit: rgb(g.blockLit), glint: rgb(g.glint), bubble: rgb(g.bubble), vein: rgb(g.vein || g.face) };
  const id = new Uint8Array(TILE_W * TILE_H), seam = new Uint8Array(TILE_W * TILE_H);
  for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
    let best = 1e9, second = 1e9, bi = 0, si = 0;
    for (let i = 0; i < N; i++) {
      let dx = Math.abs(x + .5 - sx[i]), dy = Math.abs(y + .5 - sy[i]);
      dx = Math.min(dx, TILE_W - dx); dy = Math.min(dy, TILE_H - dy);
      const d = dx * dx + dy * dy * YS * YS;
      if (d < best) { second = best; si = bi; best = d; bi = i; } else if (d < second) { second = d; si = i; }
    }
    const at = y * TILE_W + x; id[at] = bi;
    if (Math.sqrt(second) - Math.sqrt(best) < 1.9) {
      const pair = Math.min(bi, si) * 16 + Math.max(bi, si);
      seam[at] = hash(pair, (x + 2 * y) >> 4, seed + 31) > .32 ? 1 : 0;
    }
  }
  const img = c.createImageData(TILE_W, TILE_H), px = new Uint32Array(img.data.buffer);
  for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
    const at = y * TILE_W + x, i = id[at];
    px[at] = seam[at] ? col.seam : (lit[i] && seam[((y + TILE_H - 1) % TILE_H) * TILE_W + x]) ? col.lit : col.blocks[tone[i]];
  }
  // Details stay inside their own plate: pale veins, a glint pair, trapped bubbles.
  const put = (x, y, ink, i) => { x = ((Math.round(x) % TILE_W) + TILE_W) % TILE_W; y = ((Math.round(y) % TILE_H) + TILE_H) % TILE_H; const at = y * TILE_W + x; if (id[at] === i && !seam[at]) px[at] = ink; };
  for (let i = 0; i < N; i++) {
    const h = k => hash(i, k, seed + 41);
    if (o.veins !== false && h(1) > .35) { const x0 = sx[i] - 8 + h(2) * 10, y0 = sy[i] - 5 + h(3) * 8, len = 4 + Math.floor(h(4) * 7), dir = h(5) > .5 ? 1 : -1;
      for (let k = 0; k < len; k++) put(x0 + k * 1.4, y0 + dir * k * .55, col.vein, i); }
    if (o.glints !== false && h(6) > .45) { const gx = sx[i] + (h(7) - .5) * 18, gy = sy[i] + (h(8) - .5) * 8;
      for (let k = 0; k < 4; k++) { put(gx + k, gy - k * .8, col.glint, i); if (k > 0) put(gx + k + 3, gy - k * .8 + 3, col.glint, i); } }
    const bubbles = o.bubbles === false ? 0 : Math.floor(h(9) * 4);
    for (let b = 0; b < bubbles; b++) { const bx = sx[i] + (h(10 + b) - .5) * 26, by = sy[i] + (h(20 + b) - .5) * 14; put(bx, by, col.bubble, i); if (b === 0 && h(30) > .5) put(bx + 1, by, col.bubble, i); }
  }
  c.putImageData(img, 0, 0);
  // Buried fractures: angled runs of uneven length that cross plates.
  for (let i = 0; i < (o.fractures ?? 4); i++) {
    let x = hash(i, 41, seed) * TILE_W, y = 6 + hash(i, 42, seed) * (TILE_H - 44);
    const len = 1 + Math.floor(hash(i, 44, seed) * 4), dir = hash(i, 45, seed) > .5 ? 1 : -1;
    for (let k = 0; k < len; k++) {
      const nx = x + dir * (4 + hash(i, k + 43, seed) * 12), ny = y + 2 + hash(i, k + 47, seed) * 6;
      wrapped(TILE_W, x, 20, xx => line(c, xx, y, xx + nx - x, ny, g.crack));
      x = nx; y = ny;
    }
  }
  return canvas;
}
// Soil: lumps rather than stripes, buried stones, root fragments, optional
// pale threads (mycelium) and water glints.
function bakeSoil(document, seed, g, o) {
  const { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  rect(c, 0, 0, TILE_W, TILE_H, g.base);
  for (let i = 0; i < (o.lumps ?? 120); i++) {
    const x = Math.floor(hash(i, 1, seed) * TILE_W), y = Math.floor(hash(i, 2, seed) * TILE_H), lw = 3 + Math.floor(hash(i, 3, seed) * 9), lh = 1 + Math.floor(hash(i, 4, seed) * 2.5);
    tileRect(c, x, y, lw, lh, g.lumps[i & 1]);
  }
  for (let i = 0; i < (o.stones ?? 9); i++) {
    const x = Math.floor(hash(i, 5, seed) * TILE_W), y = 6 + Math.floor(hash(i, 6, seed) * (TILE_H - 12)), r = 2 + Math.floor(hash(i, 7, seed) * 3);
    wrapped(TILE_W, x, r * 2, xx => {
      for (let row = -r; row <= r; row++) {
        const hw = Math.floor(Math.sqrt(r * r - row * row) * 1.3);
        rect(c, xx - hw, y + row, hw * 2 + 1, 1, row === -r ? g.stoneLit : row === r ? g.stoneDark : g.stone);
      }
      rect(c, xx - 1, y - r + 1, 2, 1, g.stoneLit);
    });
  }
  for (let i = 0; i < (o.roots ?? 5); i++) {
    let x = hash(i, 61, seed) * TILE_W, y = 6 + hash(i, 62, seed) * (TILE_H - 40);
    for (let k = 0; k < 4; k++) {
      const nx = x + (hash(i, k + 63, seed) - .5) * 18, ny = y + 3 + hash(i, k + 67, seed) * 6;
      wrapped(TILE_W, x, 20, xx => { line(c, xx + 1, y, xx + 1 + nx - x, ny, g.rootLit); line(c, xx, y, xx + nx - x, ny, g.root); });
      x = nx; y = ny;
    }
  }
  for (let i = 0; i < (o.threads ?? 0); i++) {
    let x = hash(i, 71, seed) * TILE_W, y = 4 + hash(i, 72, seed) * (TILE_H - 8);
    for (let k = 0; k < 6; k++) {
      const nx = x + 3 + hash(i, k + 73, seed) * 5, ny = y + (hash(i, k + 79, seed) - .5) * 4;
      wrapped(TILE_W, x, 12, xx => line(c, xx, y, xx + nx - x, ny, g.thread));
      x = nx; y = Math.max(1, Math.min(TILE_H - 2, ny));
    }
  }
  for (let i = 0; i < (o.glints ?? 0); i++) tileRect(c, Math.floor(hash(i, 81, seed) * TILE_W), Math.floor(hash(i, 82, seed) * TILE_H), 2 + Math.floor(hash(i, 83, seed) * 3), 1, g.glint);
  return canvas;
}
// Basalt: vertical columns with dark joints, cross joints, a lit left edge.
function bakeColumns(document, seed, g) {
  const { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  const widths = []; let sum = 0;
  while (sum < TILE_W) { const cw = 6 + Math.floor(hash(widths.length, 1, seed) * 4); widths.push(cw); sum += cw; }
  widths[widths.length - 1] -= sum - TILE_W; if (widths.at(-1) < 4) { widths[widths.length - 2] += widths.pop(); }
  let x = 0;
  for (let k = 0; k < widths.length; k++) {
    const cw = widths[k];
    let y = Math.floor(hash(k, 2, seed) * 20);
    rect(c, x, 0, cw, TILE_H, g.tones[k % 3]);
    // Cross joints break each column into stacked drums at uneven heights.
    for (let j = 0; j < 8; j++) {
      const drum = 10 + Math.floor(hash(k, j + 3, seed) * 18), tilt = hash(k, j + 13, seed) > .5 ? 1 : 0;
      const yy = (y + drum) % TILE_H;
      rect(c, x, yy, cw, 1, g.joint); if (tilt) rect(c, x + (cw >> 1), yy - 1, cw - (cw >> 1), 1, g.joint);
      rect(c, x + 1, (yy + 1) % TILE_H, cw - 2, 1, g.lit);
      y += drum;
      if (y > TILE_H + 30) break;
    }
    rect(c, x, 0, 1, TILE_H, g.joint);
    rect(c, x + 1, 0, 1, TILE_H, g.lit);
    rect(c, x + cw - 2, 0, 1, TILE_H, g.dark);
    x += cw;
  }
  return canvas;
}
// Ruins: worked stone courses with mortar, a few missing blocks filled with earth.
function bakeMasonry(document, seed, g) {
  const { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  rect(c, 0, 0, TILE_W, TILE_H, g.mortar);
  const CH = 8;
  for (let row = 0; row < TILE_H / CH; row++) {
    let x = Math.floor(hash(row, 1, seed) * 12);
    const y = row * CH;
    for (let k = 0; k < 20 && x < TILE_W + 12; k++) {
      const bw = 10 + Math.floor(hash(row, k + 2, seed) * 11), v = hash(row, k + 40, seed);
      const ink = v < .12 ? g.fill : g.blocks[Math.floor(v * 7) % 3];
      tileRect(c, x, y, bw - 1, CH - 1, ink);
      if (v >= .12) {
        tileRect(c, x, y, bw - 1, 1, g.lit);
        tileRect(c, x + bw - 2, y + 1, 1, CH - 2, g.dark);
        if (v > .82) tileRect(c, x + 3 + Math.floor(hash(row, k + 60, seed) * (bw - 7)), y + 2, 1, CH - 4, g.mortar);
      }
      x += bw;
    }
  }
  return canvas;
}
// Sand and sandstone: fine horizontal strata with gently wavy boundaries.
function bakeStrata(document, seed, g, o) {
  const { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  const [b0, b1] = o.band || [2, 5];
  let y = 0, k = 0;
  const phase = hash(1, 1, seed) * 6.28;
  while (y < TILE_H) {
    const bh = b0 + Math.floor(hash(k, 2, seed) * (b1 - b0 + 1)), ink = g.bands[Math.floor(hash(k, 3, seed) * g.bands.length)];
    for (let x = 0; x < TILE_W; x += 2) {
      const wave = Math.round(Math.sin(x / TILE_W * 6.283 * 2 + phase + k) * 1.2);
      rect(c, x, y + wave, 2, bh, ink);
      if (k && hash(k, 4, seed) > .55 && hash(x >> 3, k, seed) > .3) rect(c, x, y + wave, 2, 1, g.line);
    }
    y += bh; k++;
  }
  // Rows wrapped vertically: repeat the top band's colour at the bottom edge.
  for (let i = 0; i < 70; i++) tileRect(c, Math.floor(hash(i, 5, seed) * TILE_W), Math.floor(hash(i, 6, seed) * TILE_H), 1, 1, g.grain);
  return canvas;
}
// Coral rock: lumpy base with small holes, each with a lit lower lip.
function bakePorous(document, seed, g) {
  const { canvas, c } = makeCanvas(document, TILE_W, TILE_H);
  rect(c, 0, 0, TILE_W, TILE_H, g.base);
  for (let i = 0; i < 90; i++) tileRect(c, Math.floor(hash(i, 1, seed) * TILE_W), Math.floor(hash(i, 2, seed) * TILE_H), 3 + Math.floor(hash(i, 3, seed) * 7), 1 + Math.floor(hash(i, 4, seed) * 2), g.lumps[i & 1]);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i, 5, seed) * TILE_W), y = Math.floor(hash(i, 6, seed) * TILE_H), big = hash(i, 7, seed) > .8;
    tileRect(c, x, y, big ? 3 : 1 + (hash(i, 8, seed) > .5 ? 1 : 0), big ? 2 : 1, g.hole);
    tileRect(c, x, y + (big ? 2 : 1), big ? 3 : 1, 1, g.holeLit);
  }
  return canvas;
}
const TILE_BAKERS = { plates: bakePlates, soil: bakeSoil, columns: bakeColumns, masonry: bakeMasonry, strata: bakeStrata, porous: bakePorous };
function fillTile(c, tile, w, h, seed) {
  const pattern = tile && c.createPattern?.(tile, 'repeat');
  if (!pattern) return null;
  const sx = Math.floor(hash(seed, 1) * TILE_W), sy = Math.floor(hash(seed, 2) * TILE_H);
  c.save(); c.translate(-sx, -sy); c.fillStyle = pattern; c.fillRect(sx, sy, w, h); c.restore();
  return pattern;
}

function depthBands(c, at, w, h, inward, seed, ink, alpha, spacing) {
  // Three non-overlapping flat steps (each pixel is darkened once), so the
  // deep body costs one blend instead of three.
  const steps = [rectBatch(), rectBatch(), rectBatch()];
  for (let x = 0; x < w; x += 4) {
    const sy = at(x + 2), edges = [1, 2, 3].map(k => Math.round(sy + inward * (spacing * k + Math.floor(hash(x >> 3, k, seed) * 5))));
    for (let k = 0; k < 3; k++) {
      let y0, y1;
      if (inward > 0) { y0 = edges[k]; y1 = k < 2 ? edges[k + 1] : h; }
      else { y1 = edges[k]; y0 = k < 2 ? edges[k + 1] : 0; }
      y0 = Math.max(0, y0); y1 = Math.min(h, y1);
      if (y1 > y0) steps[k].add(ink, x, y0, 4, y1 - y0);
    }
  }
  for (let k = 0; k < 3; k++) { c.globalAlpha = 1 - Math.pow(1 - alpha, k + 1); steps[k].flush(c); }
  c.globalAlpha = 1;
}

// --- Boulders and embedded features ------------------------------------------------

// A stone embedded in the ground. y0 is the row nearest the open air; rows run
// inward. Light comes from screen-up, the contact side is dark.
function stone(add, cx, y0, bw, bh, inward, B, r, o = {}) {
  const tilt = (r - .5) * (o.blocky ? .5 : .4), rows = [];
  for (let row = 0; row < bh; row++) {
    const t = (row + .5) / bh;
    let hw;
    if (o.blocky) hw = bw / 2 - (row === 0 && r > .55 ? 1 : 0);
    else { const u = Math.min(1, t * 1.7); hw = bw / 2 * Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u))) * (t > .86 ? .9 : 1); }
    hw = Math.max(.6, hw);
    const y = y0 + inward * row, x0 = Math.round(cx - hw + tilt * row), x1 = Math.round(cx + hw + tilt * row), len = x1 - x0;
    if (len <= 0) continue;
    rows.push([y, x0, x1]);
    const upper = inward > 0 ? row : bh - 1 - row, lower = bh - 1 - upper;
    if (lower === 0 || len <= 2) { add(B.edge, x0, y, len, 1); if (len <= 2 && upper === 0) add(B.lit, x0, y, 1, 1); continue; }
    add(B.edge, x0, y, 1, 1); add(B.edge, x1 - 1, y, 1, 1);
    const inner = len - 2, litW = upper === 0 ? Math.max(1, Math.round(inner * .75)) : upper === 1 && bh > 3 ? Math.max(1, Math.round(inner * .4)) : upper === 2 && bh > 6 ? 1 : 0;
    const shadeW = lower === 1 ? inner - litW : Math.min(inner - litW, bw > 8 ? 2 : 1);
    if (litW) add(B.lit, x0 + 1, y, litW, 1);
    const bodyW = inner - litW - shadeW; if (bodyW > 0) add(B.body, x0 + 1 + litW, y, bodyW, 1);
    if (shadeW > 0) add(B.shade, x1 - 1 - shadeW, y, shadeW, 1);
  }
  // Large stones: a crack or a facet; scoria and coral heads: vesicles.
  if (bw >= 10 && rows.length > 4) {
    const [y, x0, x1] = rows[2], mx = Math.round((x0 + x1) / 2) + (r > .5 ? 1 : -2);
    if (o.blocky) { add(B.edge, mx, y - inward, 1, 3); }
    else if (r > .4) { add(B.edge, mx, y - inward, 1, 1); add(B.edge, mx + 1, y, 1, 1); add(B.edge, mx + 1, y + inward, 1, 1); add(B.shade, mx + 2, y + inward * 2, 1, 1); }
    else { add(B.lit, mx - 2, y, 1, 1); add(B.lit, mx - 1, y + inward, 1, 1); }
  }
  if (o.vesicles && bw >= 5) for (const [y, x0, x1] of rows) if (x1 - x0 > 3 && hash(x0, y, 77) > .55) add(B.edge, x0 + 1 + Math.floor(hash(y, x0, 78) * (x1 - x0 - 2)), y, 1, 1);
  if (o.cap && inward > 0) {
    // A cap of snow/ash/sand/moss sits on the stone's top.
    const [y, x0, x1] = rows[0] || [];
    if (y !== undefined) { add(o.cap, x0, y, x1 - x0, 1); const second = rows[1]; if (second && bw >= 6) add(o.cap, second[1] + 1, second[0], Math.max(1, Math.round((second[2] - second[1]) * .55)), 1); }
  }
}

function embed(add, kind, x, y, inward, p, r, seed, lc) {
  const e = p.embed || {}, g = p.ground, B = p.boulder;
  switch (kind) {
    case 'stone': stone(add, x, y, 3 + Math.floor(r * 4), 2 + Math.floor(r * 2.5), inward, B, r); break;
    case 'block': stone(add, x, y, 6 + Math.floor(r * 6), 4 + Math.floor(r * 2), inward, B, r, { blocky: true }); break;
    case 'root': {
      let xx = x, yy = y;
      for (let k = 0; k < 3; k++) { const nx = xx + (hash(k, 1, seed) - .5) * 12, ny = yy + inward * (3 + hash(k, 2, seed) * 5); line(lc, xx + 1, yy, nx + 1, ny, g.rootLit); line(lc, xx, yy, nx, ny, g.root); xx = nx; yy = ny; }
      break;
    }
    case 'bone': {
      const len = 3 + Math.floor(r * 4), ink = e.bone;
      add(ink, x, y, len, 1); add(ink, x - 1, y - 1, 1, 1); add(ink, x - 1, y + 1, 1, 1); add(ink, x + len, y - 1, 1, 1); add(ink, x + len, y + 1, 1, 1);
      break;
    }
    case 'fossil': {
      const ink = e.fossil; add(ink, x, y - 1, 3, 1); add(ink, x - 1, y, 1, 2); add(ink, x + 3, y, 1, 2); add(ink, x, y + 2, 3, 1); add(ink, x + 1, y + 1, 1, 1);
      break;
    }
    case 'shell': {
      add(e.shell, x, y, 3, 1); add(e.shell, x + 1, y - 1, 1, 1); add(e.shellDark, x, y + 1, 3, 1);
      if (r > .6) { add(e.shell, x + 4, y + 1, 2, 1); add(e.shellDark, x + 4, y + 2, 2, 1); }
      break;
    }
    case 'lens': {
      const len = 6 + Math.floor(r * 9);
      add(p.lens.body, x + 1, y, len - 2, 1); add(p.lens.body, x, y + 1, len, 1); add(p.lens.body, x + 2, y + 2, len - 4, 1);
      add(p.lens.lit, x + 2, y, Math.max(1, Math.round(len * .35)), 1);
      break;
    }
    case 'bubble': add(p.ground.bubble, x, y, r > .7 ? 2 : 1, 1); add(p.ground.glint, x, y - 1, 1, 1); break;
    case 'ember': {
      // A dim seam of heat deep inside; never as bright as a Spark.
      let xx = x;
      for (let k = 0; k < 4 + Math.floor(r * 5); k++) { const ny = y + (hash(k, 3, seed) > .5 ? 1 : -1) * (hash(k, 4, seed) > .6 ? 1 : 0); add(e.ember, xx, ny, 2, 1); if (hash(k, 5, seed) > .7) add(e.emberHot, xx, ny, 1, 1); xx += 2; }
      break;
    }
    case 'mycelium': {
      let xx = x, yy = y;
      for (let k = 0; k < 6; k++) { const nx = xx + 2 + hash(k, 6, seed) * 4, ny = yy + (hash(k, 7, seed) - .5) * 3; line(lc, xx, yy, nx, ny, e.thread); if (k === 2) add(e.threadLit, Math.round(nx), Math.round(ny), 1, 1); if (hash(k, 8, seed) > .7) line(lc, nx, ny, nx + 1, ny + inward * 3, e.thread); xx = nx; yy = ny; }
      break;
    }
    case 'column': {
      // A broken column standing upright, its broken top at the surface.
      const cw = 5, ch = 9 + Math.floor(r * 8);
      for (let row = 0; row < ch; row++) {
        const yy = y + inward * row, broken = row === 0 ? Math.floor(hash(x, 9, seed) * 3) : 0;
        add(e.columnLit, x + broken, yy, 1, 1); add(e.column, x + 1 + broken, yy, Math.max(0, 3 - broken), 1); add(e.columnDark, x + cw - 1, yy, 1, 1);
        if (row > 1 && row % 2 === 0) add(e.columnDark, x + 2, yy, 1, 1);
      }
      add(p.rock.mortar, x - 1, y + inward * ch, cw + 2, 1);
      break;
    }
    case 'log': {
      const len = 12 + Math.floor(r * 10), L = p.log;
      for (let row = 0; row < 4; row++) add(row === 0 ? L.moss : row === 3 ? L.ring : L.bark, x, y + inward * row, len, 1);
      add(L.end, x + len - 2, y + inward, 2, 2); add(L.ring, x + len - 1, y + inward * 2, 1, 1);
      break;
    }
    case 'crystal': {
      const len = 5 + Math.floor(r * 7), hgt = 3 + Math.floor(r * 3), dir = r > .5 ? 1 : -1;
      for (let row = 0; row < hgt; row++) {
        const yy = y + row, x0 = x + dir * row;
        add(row === 0 ? e.lit : row === hgt - 1 ? e.dark : e.body, x0, yy, len, 1);
        if (row > 0 && row < hgt - 1) { add(e.core, x0 + 2, yy, 1, 1); add(e.dark, x0 + len - 1, yy, 1, 1); }
      }
      break;
    }
    case 'vein': {
      let xx = x, yy = y;
      for (let k = 0; k < 5; k++) { const nx = xx + 2 + hash(k, 11, seed) * 4, ny = yy + (hash(k, 12, seed) - .4) * 5; line(lc, xx, yy, nx, ny, e.vein); if (hash(k, 13, seed) > .6) add(e.veinLit, Math.round(nx), Math.round(ny), 1, 1); xx = nx; yy = ny; }
      break;
    }
    case 'rib': {
      // A pale stone rib arching down into the ground.
      const span = 8 + Math.floor(r * 10);
      for (let k = 0; k <= span; k++) {
        const t = k / span, yy = y + inward * Math.round(Math.sin(t * Math.PI) * span * .45);
        add(e.rib, x + k, yy, 1, 2); add(e.ribLit, x + k, yy - (inward > 0 ? 0 : 1), 1, 1); add(e.ribDark, x + k, yy + 2 * inward, 1, 1);
      }
      break;
    }
  }
}

// --- Ground material (inside the clipped terrain bake) ---------------------------------

function groundMaterial(c, ctx) {
  const { surface, top, width: w, height: h, seed, p, look: L, tiles, tagAt, proud } = ctx;
  const inward = top ? -1 : 1, at = sampler(surface, w), g = p.ground;
  if (!fillTile(c, tiles.body, w, h, seed)) rect(c, 0, 0, w, h, g.base || g.blocks?.[0] || g.tones?.[0] || g.bands?.[0]);
  // Per 2 px column: rockiness, soft top band and rock depth.
  const cols = Math.ceil(w / 2), syA = new Float32Array(cols), soilT = new Uint8Array(cols), rockD = new Float32Array(cols);
  let ref = 0, refN = 0;
  for (let i = 0; i < cols; i++) { const y = at(i * 2 + 1); syA[i] = y; if (y > -8 && y < h + 8) { ref += y; refN++; } }
  ref = refN ? ref / refN : h / 2;
  const D2 = L.d2 ?? 13, LEVEL = L.level ?? .5, SOIL = p.soil ? L.soil ?? 4 : 0;
  for (let i = 0; i < cols; i++) {
    const x = i * 2 + 1, sy = syA[i], slope = Math.abs(at(x + 3) - at(x - 3)) / 6, convex = inward * ((at(x - 7) + at(x + 7)) / 2 - sy);
    const tag = tagAt?.(x);
    let rho = Math.max(clamp01((slope - L.steep) / .6), clamp01((convex - 2) / 4) * .85);
    if (tag) rho = HARD.has(tag) ? 1 : tag === 'scree' ? Math.max(rho, .5) : SOFT.has(tag) || tag === 'water' ? (slope > 1.6 ? rho : rho * .4) : rho;
    if (top) rho = Math.max(rho, L.roofRock ?? .5);
    soilT[i] = top ? 0 : Math.round(SOIL * (1 - rho) * (.6 + .8 * vnoise(x / 18, 4, seed)));
    const wave = vnoise(x / 26, 3, seed) * 6 - 3, follow = D2 + wave, level = inward * (ref - sy) + D2 + wave;
    let d = Math.max(soilT[i] + 3, (1 - LEVEL) * follow + LEVEL * level);
    d = d * (1 - rho * .8) + rho * .8 * (soilT[i] + 2);
    rockD[i] = Math.min(60, Math.max(soilT[i] + 2, d));
  }
  // Rock layer: the second tile, below a wavy boundary.
  const rockPattern = tiles.rock && c.createPattern?.(tiles.rock, 'repeat');
  if (rockPattern) {
    const ox = Math.floor(hash(seed, 7) * TILE_W), oy = Math.floor(hash(seed, 8) * TILE_H);
    c.save(); c.translate(-ox, -oy); c.fillStyle = rockPattern;
    for (let i = 0; i < cols; i++) {
      const b = Math.round(syA[i] + inward * rockD[i]);
      if (inward > 0) { if (b < h) c.fillRect(i * 2 + ox, Math.max(0, b) + oy, 2, h - Math.max(0, b)); }
      else if (b > 0) c.fillRect(i * 2 + ox, oy, 2, Math.min(h, b));
    }
    c.restore();
  }
  const batch = rectBatch(), add = batch.add, lc = recorderFor(batch);
  // Soft top band, the dashed seam along the rock boundary, embedded features.
  for (let i = 0; i < cols; i++) {
    const x = i * 2, sy = Math.round(syA[i]), t = soilT[i];
    if (sy < -40 || sy > h + 40) continue;
    if (t > 0) {
      add(p.soil.ink, x, sy, 2, t);
      for (let k = 1; k < t; k++) if (hash(x + k * 7, 21, seed) > .78) add(p.soil.grain[k & 1], x + (k & 1), sy + k, 1, 1);
      if (hash(i >> 1, 22, seed) > .5) add(p.soil.grain[1], x, sy + t, 2, 1);
    }
    const b = Math.round(syA[i] + inward * rockD[i]);
    if (hash(i >> 2, 6, seed) > .45) { add(g.seam || g.crack, x, b, 2, 1); if (hash(i, 23, seed) > .7) add(g.crackLit, x, b - inward, 1, 1); }
  }
  for (const spec of L.embeds || []) {
    const count = Math.floor(w / 100 * spec.n + hash(spec.n * 100, 24, seed));
    for (let k = 0; k < count; k++) {
      const r = hash(k, 25 + spec.kind.length, seed), x = Math.round(4 + hash(k, 26 + spec.kind.length, seed) * Math.max(1, w - 8)), sy = at(x);
      if (top && (spec.kind === 'column' || spec.kind === 'log' || spec.kind === 'rib')) continue;
      const slope = Math.abs(at(x + 4) - at(x - 4)) / 8;
      if ((spec.kind === 'column' || spec.kind === 'log' || spec.kind === 'rib') && slope > .6) continue;
      const d = spec.depth[0] + Math.floor(r * (spec.depth[1] - spec.depth[0] + 1));
      embed(add, spec.kind, x, Math.round(sy + inward * d), inward, p, hash(k, 27, seed), seed + k * 131, lc);
    }
  }
  // Cracks.
  const cr = L.cracks;
  if (cr?.kind === 'fracture') {
    const n = Math.ceil(w / cr.per);
    for (let i = 0; i < n; i++) {
      let x = 4 + hash(i, 3, seed) * Math.max(1, w - 8), y = at(x) + inward * (3 + hash(i, 4, seed) * 6);
      const len = 2 + Math.floor(hash(i, 5, seed) * 3);
      for (let k = 0; k < len; k++) {
        const nx = x + (hash(i, k + 10, seed) - .5) * 14, ny = y + inward * (5 + hash(i, k + 20, seed) * 8);
        if (k < 2) line(lc, x + 1, y, nx + 1, ny, g.crackLit);
        line(lc, x, y, nx, ny, g.crack);
        if (hash(i, k + 30, seed) > .72) line(lc, nx, ny, nx + (hash(i, k + 40, seed) - .5) * 14, ny + inward * 6, g.crack);
        x = nx; y = ny;
      }
    }
  } else if (cr?.kind === 'roots') {
    const n = Math.ceil(w / cr.per);
    for (let i = 0; i < n; i++) {
      let x = hash(i, 8, seed) * w, y = at(x) + inward * 3;
      const len = 3 + Math.floor(hash(i, 9, seed) * 3);
      for (let k = 0; k < len; k++) {
        const nx = x + (hash(i, k + 10, seed) - .5) * 11, ny = y + inward * (4 + hash(i, k + 20, seed) * 6);
        if (k < 2) line(lc, x + 1, y, nx + 1, ny, g.rootLit);
        line(lc, x, y, nx, ny, g.root, k < 1 ? 2 : 1);
        if (k === 1 && hash(i, k + 30, seed) > .5) line(lc, nx, ny, nx + (hash(i, k + 40, seed) - .5) * 16, ny + inward * 5, g.root);
        x = nx; y = ny;
      }
    }
  }
  if (cr?.crevasse && !top) {
    // Crevasses: thin dark wedges opening at the snow surface.
    const n = Math.floor(w / cr.crevasse + hash(2, 31, seed));
    for (let i = 0; i < n; i++) {
      const x0 = Math.round(8 + hash(i, 32, seed) * Math.max(1, w - 16)), slope = Math.abs(at(x0 + 4) - at(x0 - 4)) / 8;
      if (slope > .7) continue;
      const len = 6 + Math.floor(hash(i, 33, seed) * 8);
      let xx = x0;
      for (let k = 0; k < len; k++) { if (k && k % 3 === 0) xx += hash(i, k + 34, seed) > .5 ? 1 : -1; add(p.crevasse, xx, Math.round(at(x0)) + k, k < 3 ? 2 : 1, 1); }
    }
  }
  batch.flush(c);
  // Depth: three flat darker steps away from the exposed face.
  depthBands(c, at, w, h, inward, seed, g.deep, .22, 16);
  // The lip: one clear top material on gentle tops, bare face on steep ones,
  // and an underside treatment on roofs.
  const Lp = L.lip, lip = p.lip || (L.lip.kind === 'moss' ? { body: p.moss.body, top: p.moss.top } : p.snow), U = L.under || {}, under = p.under;
  for (let x = 0; x < w; x++) {
    const sy = Math.round(at(x)); if (sy < -12 || sy > h + 12) continue;
    const slope = Math.abs(at(x + 2) - at(x - 2)) / 4;
    if (top) {
      if (p.snow) { add(g.face, x, sy - 5, 1, 5); if (hash(x >> 1, 15, seed) > .3) add(p.rim, x, sy - 1, 1, 1); continue; }
      const ink = under?.ink || g.humus;
      add(ink, x, sy - (U.depth || 4), 1, U.depth || 4);
      if (hash(x, 13, seed) > 1 - (U.dotP ?? .2)) add(under?.dot || p.hanging?.lichen, x, sy - 1 - Math.floor(hash(x, 14, seed) * (U.drop || 1)), 1, 1);
      continue;
    }
    const tag = tagAt?.(x);
    if (tag === 'water' && p.water) { add(p.water.body, x, sy, 1, 3); if (hash(x, 16, seed) > .8) add(p.water.glint, x, sy + 1, 1, 1); continue; }
    if (slope < Lp.slopeMax && !(tag && HARD.has(tag))) {
      let depth;
      if (Lp.drift) {
        // Caps vary along the ledge: thin crust, ordinary cover, and now and
        // then a deep drift; hollows fill deeper still.
        const run = hash(x >> 3, 7, seed), drift = hash(x >> 5, 8, seed) > .7 ? 2 + Math.floor(hash(x >> 5, 9, seed) * 3) : 0;
        depth = (Lp.min + Math.floor(run * (Lp.max - Lp.min + 1)) + drift) * (1 - slope / Lp.slopeMax);
      } else depth = (Lp.min + Math.floor(hash(x >> 2, 9, seed) * (Lp.max - Lp.min + .6))) * (1 - slope / Lp.slopeMax);
      if (Lp.hollow) { const hollow = at(x) - (at(x - 14) + at(x + 14)) / 2; if (hollow > 0) depth += Math.min(9, hollow * .8); }
      if (tag === 'snow' || tag === 'sand') depth += 1;
      depth = Math.round(depth);
      if (depth >= 1) {
        // The contact edge covers the top pixel, so the lip is body + marks.
        add(lip.body, x, sy, 1, depth);
        if (depth >= 3 && lip.shade) add(lip.shade, x, sy + depth - 1, 1, 1);
        if (depth >= 5 && lip.shade && hash(x, 10, seed) > .55) add(lip.shade, x, sy + depth - 2, 1, 1);
        switch (Lp.mark) {
          case 'sastrugi': if (depth >= 3 && (x + (sy >> 1)) % 4 === 0 && hash(x >> 4, 17, seed) > .35) { add(lip.shade, x, sy + 1, 1, 1); add(lip.shade, x + 1, sy + 2, 1, 1); } break;
          case 'ripple': if ((x + Math.floor(hash(x >> 4, 17, seed) * 4)) % 4 === 0) { add(lip.mark, x, sy + 1, 1, 1); if (depth >= 3) add(lip.mark, x + 1, sy + 2, 1, 1); } break;
          case 'sheen': if (hash(x, 18, seed) > .86) add(lip.mark, x, sy + 1, 1, 1); break;
          case 'speck': if (hash(x, 18, seed) > .72) add(lip.mark, x, sy + 1 + Math.floor(hash(x, 19, seed) * Math.max(1, depth - 1)), 1, 1); break;
          case 'grass': if (hash(x, 18, seed) > .45) add(lip.top, x, sy + 1, 1, 1); if (hash(x, 19, seed) > .85) add(lip.mark, x, sy + 2, 1, 1); break;
          case 'barnacle': if (x % 3 === 0 && hash(x, 18, seed) > .3) { add(lip.mark, x, sy + 1, 1, 1); add(lip.shade, x, sy + 2, 1, 1); } break;
          case 'glint': if (hash(x, 18, seed) > .9) add(lip.mark, x, sy + 1, 1, 1); break;
        }
        continue;
      }
    }
    if (g.humus && !p.lip) { add(g.humus, x, sy, 1, 2); continue; }
    add(g.face, x, sy + 1, 1, 2);
  }
  // Boulders: clusters of big, medium and small stones with rest stretches
  // between. Tops are flush with the surface; a large one on soft ground may
  // stand at most 2 px proud (that part is handed to the growth layer).
  const Bk = L.boulders, B = p.boulder;
  if (Bk && B) {
    const cap = B.cap, opts = { blocky: Bk.blocky, vesicles: Bk.vesicles };
    for (let x = 6 + hash(1, 50, seed) * 30, n = 0; x < w - 6 && n < 40; n++) {
      const r = hash(Math.round(x), 51, seed), gap = Bk.gap[0] + hash(Math.round(x), 52, seed) * (Bk.gap[1] - Bk.gap[0]);
      if (r < Bk.density * (top ? .5 : 1)) {
        const cx = Math.round(x), slope = Math.abs(at(cx + 5) - at(cx - 5)) / 10, tag = tagAt?.(cx), scree = tag === 'scree';
        const items = [];
        if (hash(cx, 53, seed) < Bk.big * (scree ? 1.4 : 1) && slope < 1.6 && !top) items.push(['L', cx]);
        const mediums = 1 + Math.floor(hash(cx, 54, seed) * (scree ? 4 : 2.6));
        for (let k = 0; k < mediums; k++) items.push(['M', cx + Math.round((hash(cx, 55 + k, seed) - .5) * 26)]);
        const smalls = 2 + Math.floor(hash(cx, 60, seed) * (scree ? 7 : 4.5));
        for (let k = 0; k < smalls; k++) items.push(['S', cx + Math.round((hash(cx, 61 + k, seed) - .5) * 34)]);
        for (const [size, bx] of items) {
          if (bx < 2 || bx > w - 2) continue;
          const rr = hash(bx, size.charCodeAt(0), seed), sy = at(bx);
          let bw, bh, sink, pr = 0;
          if (size === 'L') { bw = 11 + Math.floor(rr * 7); bh = 7 + Math.floor(rr * 4); sink = 0; const soft = !(tag && HARD.has(tag)); if (soft && Bk.proud) pr = 1 + Math.floor(hash(bx, 70, seed) * Bk.proud); }
          else if (size === 'M') { bw = 5 + Math.floor(rr * 4); bh = 3 + Math.floor(rr * 3); sink = Math.floor(hash(bx, 71, seed) * 3); }
          else { bw = 2 + Math.floor(rr * 2); bh = 1 + Math.floor(rr * 2); sink = 1 + Math.floor(hash(bx, 72, seed) * 6); }
          // On a slope the stone's top follows the uphill side so it stays inside.
          const lowSide = inward > 0 ? Math.max(at(bx - bw / 2), at(bx + bw / 2)) : Math.min(at(bx - bw / 2), at(bx + bw / 2));
          const y0 = Math.round((size === 'L' ? sy : lowSide) + inward * (sink - pr));
          let sink2 = add;
          if (pr && proud) sink2 = (ink, xx, yy, ww, hh) => { add(ink, xx, yy, ww, hh); for (let k = 0; k < ww; k++) if (yy < Math.round(at(xx + k))) proud.push(ink, xx + k, yy); };
          stone(sink2, bx, y0, bw, bh, inward, B, rr, { ...opts, cap: size !== 'S' ? cap : null });
        }
      }
      x += gap;
    }
  }
  batch.flush(c);
}

// --- Surface growth sprites ------------------------------------------------------------

function steppedPine(c, x, baseY, h, ink, opts = {}) {
  // Layered, stepped boughs: each tier widens downwards and steps in.
  h = Math.max(4, Math.round(h)); x = Math.round(x); baseY = Math.round(baseY);
  const trunkH = Math.max(1, Math.round(h * .14)), crownH = h - trunkH;
  const tiers = Math.max(2, Math.round(crownH / 7)), tierH = crownH / tiers, spread = crownH * .34;
  const trunkW = h > 34 ? 3 : h > 16 ? 2 : 1;
  rect(c, x - (trunkW >> 1), baseY - trunkH, trunkW, trunkH + (opts.root || 0), opts.trunk || ink);
  for (let r = 0; r < crownH; r++) {
    const y = baseY - trunkH - r, tier = Math.floor(r / tierH), within = (r - tier * tierH) / tierH;
    const hw = Math.max(0, Math.round(spread * (1 - tier / (tiers + .35)) * (1 - within * .62)));
    rect(c, x - hw, y, hw * 2 + 1, 1, ink);
    if (opts.dark && hw > 1) rect(c, x - hw, y, hw, 1, opts.dark);
    if (opts.lit && hw > 0 && within < .34) rect(c, x + hw, y, 1, 1, opts.lit);
  }
  rect(c, x, baseY - h - 1, 1, 2, ink);
}
function frostShards(c, x, y, h, p, seed) {
  for (let k = 0; k < 3; k++) {
    const sx = x + k * 3 - 3, sh = Math.max(2, Math.round(h * (.55 + hash(k, 1, seed) * .5))), lean = (hash(k, 2, seed) - .5) * 4;
    for (let r = 0; r < sh; r++) {
      const wr = Math.max(1, Math.round(2.2 * (1 - r / sh))), xx = sx + Math.round(lean * r / sh);
      rect(c, xx, y - r, wr, 1, p.shard.body); rect(c, xx, y - r, 1, 1, p.shard.lit);
    }
  }
}
function icicle(c, x, y, len, ink) {
  const bw = len > 8 ? 3 : len > 4 ? 2 : 1;
  for (let r = 0; r < len; r++) {
    const wr = Math.max(1, Math.round(bw * (1 - r / len)));
    rect(c, x, y + r, wr, 1, ink.body);
    if (wr > 1 || r < 2) rect(c, x, y + r, 1, 1, ink.lit);
  }
  if (ink.tip && len > 2) rect(c, x, y + len - 1, 1, 1, ink.tip);
}
// A short run of hoarfrost needles standing on a snow cap.
function frostFringe(c, x, y, len, p, r) {
  for (let k = 0; k < len; k++) {
    const h = 1 + Math.floor(hash(k, 3, r * 1e6) * 2.2);
    if (hash(k, 4, r * 1e6) > .25) rect(c, x + k, y - h, 1, h, k % 3 ? p.snow.shade : p.icicle.lit);
  }
}
// A snow cornice that leans a little past the edge of a ledge before a drop.
function snowLip(c, x, y, len, dir, p) {
  for (let k = 0; k < len; k++) {
    const xx = x + dir * k, sag = k > len - 3 ? 1 : 0;
    rect(c, xx, y - 1 + sag, 1, 2 - sag, p.snow.body);
    if (k < len - 1) rect(c, xx, y + 1, 1, 1, p.snow.shade);
  }
  rect(c, x + dir * (len - 1), y + 1, 1, 2, p.icicle.body);
}
function twig(c, x, y, len, p, r) {
  const dir = r > .5 ? 1 : -1;
  line(c, x, y, x + dir * len, y - (r > .3 ? 1 : 0), p.log.bark);
  line(c, x + dir * Math.round(len * .55), y, x + dir * Math.round(len * .55 + 2), y - 2, p.log.bark);
}
function fern(c, x, y, size, p, r) {
  for (let f = -2; f <= 2; f++) {
    const ink = (f + 2 + Math.floor(r * 4)) % 2 ? p.fern[0] : p.fern[1];
    const mx = x + f * size * .35, my = y - size * (.85 - Math.abs(f) * .12), ex = x + f * size * .85, ey = y - size * (.55 - Math.abs(f) * .1);
    line(c, x, y, mx, my, ink); line(c, mx, my, ex, ey, ink);
  }
}
function tuft(c, x, y, p, r) {
  for (let k = 0; k < 3; k++) rect(c, x + k * 2 - 2, y - 2 - Math.floor(hash(k, 3, r * 1e6) * 3), 1, 4, k % 2 ? p.moss.top : p.fern[1]);
}
function mushrooms(c, x, y, p, r) {
  const n = 1 + Math.floor(r * 3);
  for (let k = 0; k < n; k++) {
    const mx = x + k * 3, big = k === 0 && r > .5;
    rect(c, mx, y - (big ? 3 : 2), 1, big ? 4 : 3, p.mushroom.stem);
    rect(c, mx - (big ? 2 : 1), y - (big ? 5 : 3), big ? 5 : 3, big ? 2 : 1, p.mushroom.cap);
    if (big) rect(c, mx, y - 5, 1, 1, p.mushroom.spot);
  }
}
function fallenLog(c, x, bottom, len, p) {
  rect(c, x, bottom - 4, len, 4, p.log.bark);
  rect(c, x + len - 2, bottom - 4, 2, 4, p.log.end);
  rect(c, x + 2, bottom - 5, len - 6, 1, p.log.moss);
  rect(c, x + 3, bottom - 2, len - 7, 1, p.log.ring); rect(c, x + len - 2, bottom - 3, 1, 2, p.log.ring);
}
// Hanging strand (roots, vines, moss, hyphae, weed, briar). Options add leaves,
// thorns or a stone at the tip.
function strand(c, x, y, len, ink, s, o = {}) {
  let xx = x;
  for (let k = 0; k < len; k += 3) {
    const nx = xx + (hash(k, 5, s) > .5 ? 1 : -1) * (hash(k, 6, s) > (o.wave ? .3 : .55) ? 1 : 0);
    line(c, xx, y + k, nx, y + Math.min(len, k + 3), ink);
    if (o.leaf && k > 0 && hash(k, 7, s) > .3) rect(c, nx + (k % 6 ? 1 : -1), y + k + 1, 1, 1, o.leaf);
    if (o.thorn && k > 0) rect(c, nx + (k % 6 ? 1 : -1), y + k, 1, 1, o.thorn);
    if (o.lit && hash(k, 8, s) > .6) rect(c, nx, y + k + 1, 1, 1, o.lit);
    xx = nx;
  }
  if (o.tip) rect(c, xx, y + len, 1, 1, o.tip);
  if (o.stone) { rect(c, xx - 1, y + len, 3, 2, o.stone[0]); rect(c, xx - 1, y + len, 2, 1, o.stone[1]); rect(c, xx, y + len + 2, 2, 1, o.stone[2]); }
  return xx;
}
function blades(c, x, y, h, n, inks, s, spread = 2, lean = 0) {
  for (let k = 0; k < n; k++) {
    const bx = x + Math.round((k - (n - 1) / 2) * spread), bh = Math.max(1, Math.round(h * (.5 + .5 * hash(k, 1, s))));
    const tip = Math.round((hash(k, 2, s) - .5) * 2.4 + lean * bh / Math.max(1, h));
    line(c, bx, y, bx + tip, y - bh + 1, inks[(k + (s & 3)) % inks.length]);
  }
}
function flower(c, x, y, h, stem, head, s) {
  const lean = hash(1, 2, s) > .5 ? 1 : 0;
  line(c, x, y, x + lean, y - h + 1, stem);
  if (h > 3) rect(c, x - 1, y - Math.round(h * .4), 1, 1, stem);
  rect(c, x + lean, y - h, 1, 1, head); if (h > 3) { rect(c, x + lean - 1, y - h + 1, 1, 1, head); rect(c, x + lean + 1, y - h + 1, 1, 1, head); }
}
function ivy(c, x, y, h, inks, s) {
  const width = 4 + h;
  for (let k = 0; k < width; k++) {
    const edge = 1 - Math.abs(k - (width - 1) / 2) / (width / 2), hh = Math.max(1, Math.round(1 + hash(k, 1, s) * h * edge));
    rect(c, x - (width >> 1) + k, y - hh + 1, 1, hh, inks[1]);
    if (hash(k, 2, s) > .45) rect(c, x - (width >> 1) + k, y - hh + 1, 1, 1, inks[2]);
    if (hh > 2) rect(c, x - (width >> 1) + k, y, 1, 1, inks[0]);
  }
}
function cattail(c, x, y, h, p, s) {
  const lean = hash(1, 3, s) > .5 ? 1 : 0;
  line(c, x, y, x + lean, y - h + 1, p.g.reed[0]);
  rect(c, x + lean, y - h + 1, 2, 3, p.g.cattail); rect(c, x + lean, y - h, 1, 1, p.g.cattailTip);
  line(c, x - 1, y, x - 3, y - Math.round(h * .6), p.g.reed[1]);
}
function lily(c, x, y, p, s) {
  rect(c, x - 3, y, 7, 1, p.g.lily[0]); rect(c, x - 2, y - 1, 4, 1, p.g.lily[1]);
  if (hash(1, 4, s) > .6) rect(c, x + 1, y - 2, 1, 1, p.g.lilyFlower);
}
function fungusGroup(c, x, y, h, p, s) {
  const g = p.g, cap = g.cap[Math.floor(hash(1, 5, s) * g.cap.length)];
  const one = (mx, mh) => {
    mh = Math.max(2, mh); const cw = Math.max(3, Math.min(9, Math.round(mh * .8) | 1)), stemH = Math.max(1, mh - 2);
    rect(c, mx, y - stemH + 1, mh > 7 ? 2 : 1, stemH, g.stem);
    rect(c, mx - (cw >> 1) + 1, y - mh + 1, cw - 2, 1, cap); rect(c, mx - (cw >> 1), y - mh + 2, cw, 1, cap);
    rect(c, mx - (cw >> 1) + 1, y - mh + 3, cw - 2, 1, g.gill);
    if (cw >= 5) rect(c, mx - 1, y - mh + 1, 1, 1, g.spot);
  };
  one(x, h);
  if (h > 4) one(x + 3 + Math.round(h * .3), Math.round(h * .5));
  if (h > 7 && hash(2, 5, s) > .4) one(x - 3 - Math.round(h * .25), Math.round(h * .35));
}
function shelf(c, x, y, w, inks, dir) {
  for (let k = 0; k < 2; k++) {
    const yy = y + k * 3, ww = w - k;
    rect(c, dir > 0 ? x : x - ww + 1, yy, ww, 1, inks[1]);
    rect(c, dir > 0 ? x : x - ww + 2, yy + 1, ww - 1, 1, inks[0]);
    rect(c, dir > 0 ? x : x - ww + 3, yy + 2, Math.max(1, ww - 2), 1, inks[2]);
  }
}
function spore(c, x, y, p) {
  rect(c, x - 1, y, 3, 1, p.g.sporeDim); rect(c, x, y - 1, 1, 1, p.g.sporeDim); rect(c, x, y, 1, 1, p.g.spore);
}
function cactus(c, x, y, h, p, s) {
  const g = p.g.cactus;
  rect(c, x, y - h + 1, 2, h, g[0]); rect(c, x, y - h + 1, 1, h, g[1]); rect(c, x + 1, y - h + 2, 1, h - 2, g[2]);
  if (h >= 6) {
    const side = hash(1, 6, s) > .5 ? 1 : -1, ay = y - Math.floor(h * .45), ax = side > 0 ? x + 2 : x - 2;
    rect(c, ax, ay, 2, 1, g[0]); rect(c, side > 0 ? ax + 1 : ax, ay - 3, 1, 3, g[0]);
  }
  if (hash(2, 6, s) > .7) rect(c, x, y - h, 1, 1, p.g.cactusFlower);
}
function fan(c, x, y, h, p, s) {
  const g = p.g.fan, ink = g[Math.floor(hash(1, 7, s) * 2)];
  for (let k = -3; k <= 3; k++) { const ex = x + Math.round(k * h * .28), ey = y - h + Math.round(Math.abs(k) * h * .14); line(c, x, y, ex, ey, ink); }
  for (let k = -2; k <= 2; k++) rect(c, x + Math.round(k * h * .18), y - Math.round(h * .6), 1, 1, g[2]);
}
function anemone(c, x, y, h, p, s) {
  const g = p.g.anemone;
  rect(c, x - 1, y - 1, 3, 2, g[0]);
  for (let k = -2; k <= 2; k++) { const ty = y - 2 - Math.round(h * (.5 + .5 * hash(k + 3, 8, s))); line(c, x + Math.round(k * .7), y - 2, x + Math.round(k * 1.3), ty, g[k & 1 ? 1 : 2]); }
}
function crystalCluster(c, x, y, h, e, s, dirY) {
  const shards = [[0, h, 0]];
  if (h > 5) shards.push([-2 - Math.round(h * .15), Math.round(h * .6), -1]);
  if (h > 9) shards.push([2 + Math.round(h * .15), Math.round(h * .45), 1]);
  for (const [ox, sh, lean] of shards) {
    const bw = Math.max(2, Math.round(sh * .32));
    for (let r = 0; r < sh; r++) {
      const t = r / sh, wr = Math.max(1, Math.round(bw * (1 - t * t))), xx = x + ox + Math.round(lean * r * .4) - (wr >> 1), yy = y + dirY * r;
      rect(c, xx, yy, wr, 1, e.body);
      rect(c, xx, yy, 1, 1, e.lit);
      if (wr > 2) rect(c, xx + wr - 1, yy, 1, 1, e.dark);
      if (wr > 2 && r % 3 === 1) rect(c, xx + 1, yy, 1, 1, e.core);
    }
  }
}
function briar(c, x, y, h, p, s) {
  const g = p.g;
  for (let k = 0; k < 2 + (h > 6 ? 1 : 0); k++) {
    const x0 = x + (k - 1) * 3, span = (hash(k, 9, s) > .5 ? 1 : -1) * (4 + Math.round(h * .9)), hh = Math.round(h * (.6 + .4 * hash(k, 10, s)));
    let px = x0, py = y;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8, nx = x0 + span * t, ny = y - Math.sin(t * Math.PI * .85) * hh;
      line(c, px, py, nx, ny, g.briar[k % 2]);
      if (i % 2 === 0) rect(c, Math.round(nx), Math.round(ny) - 1, 1, 1, g.thorn);
      px = nx; py = ny;
    }
  }
}
function blossom(c, x, y, h, p, s) {
  briar(c, x, y, h, p, s);
  const bx = x + (hash(3, 9, s) > .5 ? 2 : -2), by = y - h + 1;
  rect(c, bx, by, 2, 2, p.g.blossom); rect(c, bx, by, 1, 1, p.g.blossomCore);
}
function post(c, x, y, h, p) {
  const g = p.g.post;
  rect(c, x, y - h + 1, 2, h, g[0]); rect(c, x, y - h + 1, 1, h, g[1]); rect(c, x + 1, y - h, 1, 1, g[0]);
  rect(c, x + 2, y - h + 2, 2, 1, g[2]);
}
function grave(c, x, y, h, p, s) {
  const g = p.g.grave;
  if (hash(1, 11, s) > .5) {
    rect(c, x, y - h + 1, 1, h, g[0]); rect(c, x - 1, y - h + 2, 3, 1, g[0]); rect(c, x - 1, y - h + 2, 1, 1, g[1]); rect(c, x + 1, y - h + 3, 1, 1, g[2]);
  } else {
    rect(c, x - 1, y - h + 2, 3, h - 1, g[0]); rect(c, x, y - h + 1, 1, 1, g[0]);
    rect(c, x - 1, y - h + 2, 1, h - 1, g[1]); rect(c, x + 1, y - h + 3, 1, h - 3, g[2]);
  }
}

function sprite(document, w, h, ax, ay, draw) {
  const { canvas, c } = makeCanvas(document, w, h);
  draw(c);
  return { canvas, ax, ay, h: 0 };
}
// Floor sprite: base row at the bottom, anchor at its x. Hanging sprite: top row 0.
const floorSet = (d, sizes, w, extra, draw) => sizes.map((size, k) => ({ ...sprite(d, w, size + extra, w >> 1, size + extra - 1, c => draw(c, w >> 1, size + extra - 1, size, k)), h: size }));
const hangSet = (d, sizes, w, extra, draw) => sizes.map((size, k) => ({ ...sprite(d, w, size + extra, w >> 1, 0, c => draw(c, w >> 1, 0, size, k)), h: size }));

const SPRITES = {
  icicle: (d, p) => [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16].map(len => ({ ...sprite(d, 3, len, 0, 0, c => icicle(c, 0, 0, len, p.icicle)), h: len })),
  hoarfrost: (d, p, seed) => [0, 1, 2].map(k => ({ ...sprite(d, 9, 4, 0, 3, c => frostFringe(c, 0, 3, 6 + k, p, hash(k, 21, seed))), h: 3 })),
  cornice: (d, p) => [[4, 1], [6, 1], [4, -1], [6, -1]].map(([len, dir]) => ({ ...sprite(d, 8, 5, dir > 0 ? 0 : 7, 1, c => snowLip(c, dir > 0 ? 0 : 7, 1, len, dir, p)), h: 3, dir })),
  shard: (d, p, seed) => [3, 5, 7, 9].map((h, k) => ({ ...sprite(d, 15, h + 3, 7, h + 1, c => frostShards(c, 7, h + 1, h, p, seed + k * 31)), h })),
  pine: (d, p) => { const pine = h => ({ ...sprite(d, 37, h + 7, 18, h + 1, c => steppedPine(c, 18, h + 1, h, p.pine.body, { dark: p.pine.dark, lit: p.pine.lit, trunk: p.pine.trunk, root: 4 })), h }); return [[8, 10, 12], [13, 15, 17], [19, 22, 25]].map(sizes => sizes.map(pine)); },
  twig: (d, p, seed) => [4, 5, 6].map((len, k) => ({ ...sprite(d, 9, 4, 4, 3, c => twig(c, 4, 3, len, p, hash(k, 8, seed))), h: 2 })),
  fern: (d, p, seed) => [3, 4, 5, 6].map((size, k) => ({ ...sprite(d, 13, 8, 6, 7, c => fern(c, 6, 7, size, p, hash(k, 5, seed))), h: size })),
  tuft: (d, p, seed) => [0, 1].map(k => ({ ...sprite(d, 7, 7, 3, 6, c => tuft(c, 3, 6, p, hash(k, 6, seed))), h: 4 })),
  mushroom: (d, p) => [.2, .55, .7, .9].map(r => ({ ...sprite(d, 12, 7, 3, 6, c => mushrooms(c, 3, 6, p, r)), h: 5 })),
  forestRoof: (d, p, seed) => [4, 6, 8, 10, 12, 14, 16].map((len, k) => ({ ...sprite(d, 5, len + 2, 2, 0, c => strand(c, 2, 0, len, p.hanging.root, Math.floor(hash(k, 7, seed) * 1e6))), h: len })),
  drygrass: (d, p, seed) => floorSet(d, [2, 3, 4, 5, 6], 9, 1, (c, x, y, h, k) => blades(c, x, y, h, 3 + (k & 1) * 2, p.g.dry, seed + k * 7, 1, 1)),
  ivy: (d, p, seed) => floorSet(d, [2, 3, 4], 9, 1, (c, x, y, h, k) => ivy(c, x, y, h, p.g.ivy, seed + k * 11)),
  flower: (d, p, seed) => floorSet(d, [3, 4, 5, 6], 5, 1, (c, x, y, h, k) => flower(c, x, y, h, (p.g.grass || p.g.dry || p.g.ivy)[0], p.g.flower[(k + seed) % p.g.flower.length], seed + k)),
  vine: (d, p, seed) => hangSet(d, [4, 6, 8, 10, 12, 14], 5, 2, (c, x, y, h, k) => strand(c, x, y, h, p.g.vine, seed + k * 13, { leaf: p.g.vineLeaf })),
  root: (d, p, seed) => hangSet(d, [4, 6, 8, 10, 12, 14], 5, 2, (c, x, y, h, k) => strand(c, x, y, h, p.g.root, seed + k * 17)),
  reed: (d, p, seed) => floorSet(d, [6, 9, 12, 15], 9, 1, (c, x, y, h, k) => blades(c, x, y, h, 3, p.g.reed, seed + k * 5, 2, -1)),
  cattail: (d, p, seed) => floorSet(d, [7, 10, 13], 9, 1, (c, x, y, h, k) => cattail(c, x, y, h, p, seed + k)),
  sedge: (d, p, seed) => floorSet(d, [3, 4, 5], 7, 1, (c, x, y, h, k) => blades(c, x, y, h, 4, p.g.sedge, seed + k * 3, 1, 0)),
  lily: (d, p, seed) => floorSet(d, [2], 9, 1, (c, x, y, h, k) => lily(c, x, y, p, seed + k)),
  moss: (d, p, seed) => hangSet(d, [4, 6, 9, 12, 15, 18], 7, 2, (c, x, y, h, k) => { strand(c, x, y, h, p.g.moss[0], seed + k * 19, { lit: p.g.moss[2] }); strand(c, x - 1, y, Math.round(h * .6), p.g.moss[1], seed + k * 23); strand(c, x + 1, y, Math.round(h * .4), p.g.moss[1], seed + k * 29); }),
  fungus: (d, p, seed) => floorSet(d, [3, 5, 7, 9, 11], 17, 1, (c, x, y, h, k) => fungusGroup(c, x - 1, y, h, p, seed + k * 37)),
  shelf: (d, p) => [1, -1].map(dir => ({ ...sprite(d, 6, 7, dir > 0 ? 0 : 5, 0, c => shelf(c, dir > 0 ? 0 : 5, 0, 4, p.g.shelf, dir)), h: 5, dir })),
  spore: (d, p) => [{ ...sprite(d, 3, 2, 1, 1, c => spore(c, 1, 1, p)), h: 2 }],
  hyphae: (d, p, seed) => hangSet(d, [3, 5, 7, 9, 12], 5, 2, (c, x, y, h, k) => strand(c, x, y, h, p.g.hyphae[k & 1], seed + k * 41, { tip: p.g.hyphae[0] })),
  drip: (d, p) => [2, 3, 4, 5, 6, 8].map(len => ({ ...sprite(d, 3, len, 0, 0, c => icicle(c, 0, 0, len, { body: p.g.drip[0], lit: p.g.drip[1], tip: p.g.drip[2] })), h: len })),
  drytuft: (d, p, seed) => floorSet(d, [2, 3, 4], 7, 1, (c, x, y, h, k) => blades(c, x, y, h, 3, p.g.dry, seed + k * 9, 1, 1)),
  cactus: (d, p, seed) => floorSet(d, [4, 6, 8], 9, 1, (c, x, y, h, k) => cactus(c, x, y, h, p, seed + k)),
  fan: (d, p, seed) => floorSet(d, [4, 6, 8, 10], 19, 1, (c, x, y, h, k) => fan(c, x, y, h, p, seed + k * 3)),
  anemone: (d, p, seed) => floorSet(d, [3, 4, 5], 9, 2, (c, x, y, h, k) => anemone(c, x, y, h, p, seed + k * 5)),
  weed: (d, p, seed) => hangSet(d, [4, 6, 8, 11, 14], 5, 2, (c, x, y, h, k) => strand(c, x, y, h, p.g.weed[k & 1], seed + k * 43, { wave: true, lit: p.g.weed[2] })),
  crystal: (d, p, seed) => floorSet(d, [3, 5, 8, 11, 14], 15, 1, (c, x, y, h, k) => crystalCluster(c, x, y, h, p.embed, seed + k, -1)),
  crystalHang: (d, p, seed) => hangSet(d, [3, 5, 8, 10, 12], 13, 1, (c, x, y, h, k) => crystalCluster(c, x, y, h, p.embed, seed + k, 1)),
  grass: (d, p, seed) => floorSet(d, [2, 3, 4, 5, 6], 9, 1, (c, x, y, h, k) => blades(c, x, y, h, 4 + (k & 1), p.g.grass, seed + k * 7, 1, 0)),
  tallgrass: (d, p, seed) => floorSet(d, [4, 6, 8, 10, 12], 11, 1, (c, x, y, h, k) => blades(c, x, y, h, 5 + (k & 1), p.g.grass, seed + k * 7, 1, 1)),
  rubble: (d, p, seed) => hangSet(d, [4, 6, 8, 10, 12], 5, 4, (c, x, y, h, k) => strand(c, x, y, h - 2, p.g.root, seed + k * 47, { stone: p.g.rubble })),
  briar: (d, p, seed) => floorSet(d, [3, 5, 7, 9], 31, 2, (c, x, y, h, k) => briar(c, x, y, h, p, seed + k * 53)),
  blossom: (d, p, seed) => floorSet(d, [3, 5], 31, 2, (c, x, y, h, k) => blossom(c, x, y, h, p, seed + k * 59)),
  briarHang: (d, p, seed) => hangSet(d, [4, 6, 8, 10, 12], 5, 2, (c, x, y, h, k) => strand(c, x, y, h, p.g.briar[k & 1], seed + k * 61, { thorn: p.g.thorn })),
  post: (d, p) => floorSet(d, [4, 5, 6], 7, 1, (c, x, y, h) => post(c, x, y, h, p)),
  grave: (d, p, seed) => floorSet(d, [4, 5, 6, 7], 7, 1, (c, x, y, h, k) => grave(c, x, y, h, p, seed + k)),
};
function bakeSprites(document, look, p, seed) {
  const out = {};
  for (const rule of [...look.growth.floor, ...look.growth.roof]) if (SPRITES[rule.kind]) out[rule.kind] ??= SPRITES[rule.kind](document, p, seed);
  return out;
}

class LevelSceneryTwo {
  constructor(engine, identity, biome) {
    this.engine = engine; this.identity = identity; this.biome = biome;
    this.palette = SCENERY_TWO_PALETTES[biome];
    this.look = LOOKS[biome];
    // The shared terrain-ecology plants and loose stones are replaced by this
    // module's growth, except where they already fit (Oldgrowth Pines).
    this.keepsEcology = Boolean(this.look.ecology);
    this.seed = seedOf(identity.id || biome);
    this.solids = null; this.solidsSource = null; this.proud = null;
  }
  // Baked chunks live in the renderer's terrain cache; the per-level tiles and
  // sprites only depend on the course, so a resize keeps them.
  reset() {}
  destroy() {
    if (this.tiles) for (const tile of Object.values(this.tiles)) if (tile) tile.width = tile.height = 1;
    this.tiles = null;
    if (this.sprites) for (const list of Object.values(this.sprites)) for (const item of list.flat()) item.canvas.width = item.canvas.height = 1;
    this.sprites = null; this.solids = null; this.solidsSource = null; this.proud = null;
  }
  bakeMaterial(c, options) {
    sceneryTwoStats.materials++;
    const seed = this.seed ^ Math.imul((options.obstacle?.id | 0) + 1, 2654435761) ^ (options.top ? 0x5bd1e995 : 0);
    const p = this.palette, look = this.look;
    if (!this.tiles && options.document) {
      const tile = (spec, s) => TILE_BAKERS[spec.kind](options.document, s, p[spec.ink], spec);
      this.tiles = { body: tile(look.body, this.seed), rock: tile(look.rock, this.seed + 7919) };
    }
    const started = now(), proud = [];
    this.proud = { obstacle: options.obstacle, top: options.top, list: proud };
    groundMaterial(c, { ...options, seed, p, look, tiles: this.tiles || {}, tagAt: tagLookup(options.obstacle, options.top, options.ox, options.scale), proud: options.top ? null : proud });
    sceneryTwoStats.materialMs += now() - started;
  }
  // World-space terrain profiles (each solid is everything below a floor's
  // surface or above a roof's), used only to decide where growth is exposed.
  solidsFor(engine) {
    const obstacles = engine.layout?.obstacles || [];
    if (this.solidsSource === obstacles && this.solids) return this.solids;
    const solids = [];
    for (const o of obstacles) for (const top of [true, false]) {
      const shape = top ? o.topShape : o.bottomShape; if (!shape?.length || shape.length < 4) continue;
      const anchor = o.center + (top ? -1 : 1) * o.gap / 2, points = shape.slice(2).map(([x, y]) => [o.x + x, anchor + y]).sort((m, n) => m[0] - n[0]);
      const xs = new Float64Array(points.map(point => point[0])), ys = new Float64Array(points.map(point => point[1]));
      solids.push({ owner: o, top, xs, ys, minX: xs[0], maxX: xs[xs.length - 1] });
    }
    this.solids = solids; this.solidsSource = obstacles;
    return solids;
  }
  bakeGrowth(document, options) {
    sceneryTwoStats.growth++;
    const started = now(), result = this.bakeGrowthLayer(document, options);
    sceneryTwoStats.growthMs += now() - started;
    return result;
  }
  bakeGrowthLayer(document, { surface, top, width, obstacle, engine, ox, oy, scale }) {
    if (!surface?.length || !engine) return null;
    const p = this.palette, look = this.look, s = scale, inward = top ? -1 : 1, at = sampler(surface, width);
    const seed = this.seed ^ Math.imul((obstacle.id | 0) + 1, 2246822519) ^ (top ? 0x27d4eb2f : 0);
    let sMin = Infinity, sMax = -Infinity;
    for (const [, y] of surface) { sMin = Math.min(sMin, y); sMax = Math.max(sMax, y); }
    const pad = 8, G = 62, H = engine.height;
    // Ignore the deep aprons where a face leaves the screen.
    sMin = Math.max(sMin, oy - 2 - (obstacle.center + inward * obstacle.gap / 2) * s - pad);
    sMax = Math.min(sMax, oy - 2 + (H - (obstacle.center + inward * obstacle.gap / 2)) * s + pad);
    if (!(sMax > sMin)) return null;
    const dx = -pad, dy = top ? Math.floor(sMin) - pad : Math.floor(sMin) - G;
    const gw = width + pad * 2, gh = Math.ceil(sMax - sMin) + G + pad * 2;
    if (gh > 2048 || gw > 4096) return null;
    const anchor = obstacle.center + inward * obstacle.gap / 2, left = obstacle.x + (-pad - ox) / s, right = obstacle.x + (width + pad - ox) / s;
    const solids = this.solidsFor(engine).filter(solid => solid.maxX >= left && solid.minX <= right && solid.owner !== obstacle || solid.owner === obstacle && solid.top !== top);
    const heightAt = (solid, x) => {
      const xs = solid.xs; let lo = 0, hi = xs.length - 1;
      while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
      return solid.ys[lo] + (solid.ys[hi] - solid.ys[lo]) * (x - xs[lo]) / (xs[hi] - xs[lo] || 1);
    };
    const covered = (x, y) => {
      for (const solid of solids) {
        if (x < solid.minX || x > solid.maxX) continue;
        const h = heightAt(solid, x);
        if (solid.top ? y <= h : y >= h) return true;
      }
      return false;
    };
    // Open distance (world units) from a surface point into the air, capped.
    const freeAbove = (wx, wy) => {
      const probe = wy - inward * 2;
      let limit = inward > 0 ? Math.max(0, wy - 160) : Math.min(H, wy + 160);
      for (const solid of solids) {
        if (wx < solid.minX || wx > solid.maxX) continue;
        const h = heightAt(solid, wx);
        if (solid.top ? probe <= h : probe >= h) return 0;
        // The nearest opposite face bounds the open air.
        if (inward > 0 && solid.top) limit = Math.max(limit, h);
        if (inward < 0 && !solid.top) limit = Math.min(limit, h);
      }
      return Math.min(160, Math.abs(wy - limit));
    };
    // Sprites are prebaked (once per level); a chunk only places them.
    const sprites = this.sprites ??= bakeSprites(document, look, p, this.seed);
    const placed = [], batch = rectBatch();
    const put = (sprite, gx, gy) => { if (sprite) placed.push(sprite, gx - sprite.ax, gy - sprite.ay); };
    const pick = (list, limit, r) => { let best = null; for (const sprite of list) if (sprite.h <= limit && (!best || sprite.h > best.h || sprite.h === best.h && r > .5)) best = sprite; return best; };
    // Proud boulder tops handed over by this chunk's material bake.
    if (!top && this.proud?.obstacle === obstacle && this.proud.top === top) {
      const list = this.proud.list;
      for (let i = 0; i < list.length; i += 3) batch.add(list[i], list[i + 1] - dx, list[i + 2] - dy, 1, 1);
    }
    const tagAt = tagLookup(obstacle, top, ox, s);
    const rules = top ? look.growth.roof : look.growth.floor;
    let lastTall = -99;
    for (let x = 3 + Math.floor(hash(1, 2, seed) * 5); x < width - 3 && rules.length; ) {
      const r = hash(x, 11, seed), r2 = hash(x, 12, seed), r3 = hash(x, 15, seed), sy = at(x), slope = Math.abs(at(x + 3) - at(x - 3)) / 6;
      const wx = obstacle.x + (x - ox) / s, wy = anchor + (sy - oy) / s;
      let step = 2 + Math.floor(hash(x, 13, seed) * 5);
      if (wy < 2 || wy > H - 2) { x += step; continue; }
      // Only candidates that could place something pay for the exposure test.
      let rule = null;
      for (let i = 0, acc = 0; i < rules.length; i++) { acc += rules[i].p; if (r < acc) { rule = rules[i]; break; } }
      const tag = tagAt?.(x);
      if (!rule || slope > (rule.slope ?? 9) || slope < (rule.minSlope ?? 0) || rule.gap && x - lastTall <= rule.gap
        || rule.water && tag !== 'water' || !rule.water && tag === 'water' && rule.kind !== 'reed' && rule.kind !== 'cattail'
        || tag && HARD.has(tag) && SCENERY_FIT_LAWS.plants.includes(rule.kind)) { x += step; continue; }
      if (this.biome === 'frost' && top && !(slope < 1.3 && hash(x >> 4, 14, seed) > .14)) { x += step; continue; }
      const free = freeAbove(wx, wy) * s, gx = x - dx, gy = Math.round(sy) - dy;
      if (free < Math.max(6, rule.free ?? 6)) { x += step; continue; }
      const list = sprites[rule.kind];
      switch (rule.kind) {
        case 'icicle': {
          // Icicles hang in clusters; where the roof dips to a low point (an
          // overhang) the cluster is denser and a few grow long.
          const dip = at(x) - Math.max(at(x - 10), at(x + 10)), overhang = dip > 2;
          const reach = overhang && r2 > .55 ? 6 + r * 10 : 2 + r * r * 10;
          put(pick(list, Math.min(reach, free * .24), r2), gx, gy - 1);
          if (r2 > .6 && free > 20) put(pick(list, Math.min(2 + r * 4, free * .2), r), gx + 2, gy - 1);
          step = overhang ? 2 + Math.floor(r2 * 2) : 2 + Math.floor(r2 * 4);
          break;
        }
        case 'cornice': {
          // A snow cornice only where a flat ledge breaks into a drop.
          const ahead = at(x + 5) - sy, behind = at(x - 5) - sy;
          const dir = ahead > 4 && Math.abs(behind) < 2 ? 1 : behind > 4 && Math.abs(ahead) < 2 ? -1 : 0;
          if (dir) put(list[(dir > 0 ? 0 : 2) + (r2 > .5 ? 1 : 0)], gx, gy);
          break;
        }
        case 'hoarfrost': put(list[Math.floor(r2 * list.length)], gx, gy); step = rule.step[0] + Math.floor(r2 * (rule.step[1] - rule.step[0])); break;
        case 'forestRoof': {
          // Roots and lichen hang thickest under overhangs.
          const patch = hash(x >> 4, 14, seed), overhang = at(x) - Math.max(at(x - 10), at(x + 10)) > 2;
          if ((patch > .22 || overhang) && r < .55) { put(pick(list, Math.min(4 + r2 * (overhang ? 14 : 10), free * .28), r), gx, gy - 1); step = 2 + Math.floor(r2 * 3); }
          else { const len = Math.round(Math.min(2 + r2 * 5, free * .2)); if (len >= 2) batch.add(p.hanging.lichen, gx, gy - 1, 1, len); if (r2 > .7 && len >= 3) batch.add(p.moss.body, gx + 1, gy - 1, 1, 2); step = 2 + Math.floor(r2 * 3); }
          break;
        }
        case 'pine': {
          if (slope >= 1 || free <= 18 || x - lastTall <= 9) break;
          const size = free > 80 && r2 < .25 ? 2 : free > 45 && r2 < .6 ? 1 : 0;
          const sprite = pick(list[size], free * .3, r) || pick(list[0], free * .3, r);
          if (sprite) { put(sprite, gx, gy + 1); lastTall = x; step = 4 + Math.floor(r * 7); }
          break;
        }
        case 'fern': case 'tuft': case 'twig': put(list[Math.floor(r2 * list.length)], gx, gy + 1); break;
        case 'mushroom': {
          // Mushrooms grow in small groups.
          put(list[Math.floor(r2 * list.length)], gx, gy + 1);
          if (r2 > .4) put(list[Math.floor(r * 7) % list.length], gx + 5, Math.round(at(x + 5)) - dy + 1);
          step = 9 + Math.floor(r2 * 6);
          break;
        }
        case 'log': {
          const len = (r2 < .5 ? 10 : 18) + Math.round(r2 * 10), end = Math.min(width - 2, x + len);
          let hi = Infinity, lo = -Infinity;
          for (let xx = x; xx <= end; xx += 2) { const yy = at(xx); hi = Math.min(hi, yy); lo = Math.max(lo, yy); }
          if (lo - hi < 3 && !covered(obstacle.x + (end - ox) / s, anchor + (at(end) - oy) / s - 2)) {
            fallenLog(recorderFor(batch), gx, Math.round(hi) - dy + 2, end - x, p); step = end - x + 4;
          }
          break;
        }
        case 'shelf': {
          // Shelf fungi stand out from steep faces, toward the open side.
          const dir = at(x + 3) > at(x - 3) ? 1 : -1;
          put(list[dir > 0 ? 0 : 1], gx + dir, gy - 2 - Math.floor(r2 * 3));
          step = 5 + Math.floor(r2 * 6);
          break;
        }
        case 'spore': put(list[0], gx, gy); step = 12; break;
        case 'lily': put(list[0], gx, gy); step = 8 + Math.floor(r2 * 8); break;
        default: {
          if (rule.overhang && !(at(x) - Math.max(at(x - 10), at(x + 10)) > 1) && r2 > .3) break;
          const limit = Math.min(rule.max ?? 99, free * (rule.frac ?? .3)), target = limit * (.45 + .55 * r3);
          const sprite = pick(list, target, r2) || (list[0].h <= limit ? list[0] : null);
          if (!sprite) break;
          put(sprite, gx, top ? gy - 1 : gy + 1);
          const extra = rule.cluster ? Math.floor(r2 * (rule.cluster + 1)) : 0;
          for (let k = 1; k <= extra; k++) {
            const xx = x + k * (rule.spread ?? 3) * (r3 > .5 ? 1 : -1);
            if (xx < 1 || xx > width - 2) continue;
            put(pick(list, target * (.6 + .3 * hash(k, 16, seed)), r) || list[0], xx - dx, Math.round(at(xx)) - dy + (top ? -1 : 1));
          }
          if (rule.gap) lastTall = x;
          if (rule.step) step = rule.step[0] + Math.floor(r2 * (rule.step[1] - rule.step[0]));
          else if (extra) step += extra * (rule.spread ?? 3);
        }
      }
      x += step;
    }
    if (!placed.length && !batch.size()) return null;
    const { canvas, c } = makeCanvas(document, gw, gh);
    batch.flush(c);
    for (let i = 0; i < placed.length; i += 3) c.drawImage(placed[i].canvas, placed[i + 1], placed[i + 2]);
    return { canvas, dx, dy };
  }
}

// Optional course material tags (landform courses, ?courses=2): spans of
// [x0, x1, material] in obstacle-local units. Null when the course has none.
function tagLookup(obstacle, top, ox, scale) {
  const list = obstacle?.surfaceMaterials?.[top ? 'top' : 'bottom'];
  if (!Array.isArray(list) || !list.length || !(scale > 0) || !Number.isFinite(ox)) return null;
  return px => { const lx = (px - ox) / scale; for (const [a, b, m] of list) if (lx >= a - 3 && lx <= b + 3) return m; return null; };
}
