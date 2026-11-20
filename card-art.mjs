import {SKILL_CARDS} from './skill-cards.mjs?v=chance-1';
import {CARD_ART_FILES} from './card-art-files.mjs?v=chance-1';
import {duskCardArt} from './dusk-card-art.mjs?v=chance-1';
/** Sixteen original scenes share one locally cached, square-cell atlas.
 * Order matches the 4×4 asset; each SVG clips exactly one 313px cell. */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ART = Object.freeze({
  'body-spark': {description:'A small pale wisp reaches toward a brilliant golden Spark above a ruined cliff.'},
  'spark-cache': {description:'Golden Sparks spill from a weathered leather satchel among purple woodland leaves.'},
  'deep-vessel': {description:'A luminous turquoise vessel floats in a cavern pool beneath a shaft of daylight.'},
  'tight-packing': {description:'An ornate brass press packs golden light into a small travelling chest.'},
  echo: {description:'A moonlit circular arch and its perfect reflection in still blue water.'},
  chameleon: {description:'A green and gold chameleon curls its tail on a mossy branch among ferns.'},
  'field-impulse': {description:'A mint wisp sweeps a glowing circular current between slender birch trees.'},
  'lift-guide': {description:'A golden luminous flight path rises through a broken stone arch above distant ruins.'},
  'skim-line': {description:'A thin gold band hugs dark terrain beside a small wisp.'},
  'pulse-reader': {description:'A soft gold ring tightens round a small wisp.'},
  'courier-cord': {description:'A bright cord joins a pale Collector to a small wisp.'},
  'meter-mark': {description:'A gold notch beside a nearly full Spark Meter.'},
  'finish-flag': {description:'A gold flag above a bar that fills toward the finish.'},
  'clean-run': {description:'A whole gold heart above a finish mark beside a small wisp.'},
  'victory-lap': {description:'Gold Sparks round an oval lap track with a wisp inside.'},
  'curtain-call': {description:'Gold curtains open on a small wisp with three Sparks above it.'},
  'brimful': {description:'A full gold jar with one Spark spilling over its rim.'},
  'pressure-valve': {description:'A gold valve wheel on a pipe, with a small lift arrow above it.'},
  'floodgate': {description:'A stone floodgate lifted open, gold Sparks pouring out.'},
  rhythm: {description:'Three evenly spaced golden wavefronts glow over a stream between dark cliffs.'},
  'harvest-common': {description:'A pearly luminous flower blooms above a field of small pale woodland blossoms.'},
  'harvest-rare': {description:'Three glowing blue water flowers spread ripples across a moonlit ruin pool.'},
  'harvest-legendary': {description:'Golden light falls from a great autumn tree into an open treasure chest.'},
  'camp-kit': {description:'Two warm hearths burn side by side beneath falling snow and red winter berries.'},
  'growth-seed': {description:'A glowing red seed opens into a young luminous sprout among moss and mushrooms.'},
  'cache-handling': {description:'A small mint Collector tethers a bright cubic Cache across a mossy ruin ledge.'},
  'flash-handling': {description:'A small mint Collector tethers a brilliant triangular Flare over misty ruins.'},
});
export const CARD_ART_IDS = Object.freeze([...Object.keys(ART),'dusk-wick']);
export function cardArt(card = {}, {compact = false, size = null} = {}) {
  // Approved 48x48 pixel pictures (one per card id) win; everything else keeps the older art below.
  const own = String(card.cardId || card.id || '');
  if(Object.hasOwn(CARD_ART_FILES, own)) {
    const rarity = esc(card.rarity || 'common'), name = esc(card.name || own);
    return `<svg xmlns="http://www.w3.org/2000/svg" class="skill-card-art skill-card-illustration card-art-${esc(own)}${compact ? ' card-art-compact' : ''}" data-card-art="${esc(own)}" data-card-picture="1" data-card-rarity="${rarity}" data-art-size="${compact || size === 'compact' ? 'compact' : 'full'}" viewBox="0 0 48 48" width="96" height="96" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="${name}"><image href="./${CARD_ART_FILES[own]}" x="0" y="0" width="48" height="48" preserveAspectRatio="none" style="image-rendering:pixelated"/></svg>`;
  }
  if((card.artFamily || SKILL_CARDS[String(card.cardId || card.id || '')]?.artFamily)==='dusk-wick')return duskCardArt({compact,size,rarity:card.rarity||'common'});
  const requested = String(card.cardId || card.id || ''), family = card.artFamily || SKILL_CARDS[requested]?.artFamily || requested, id = Object.hasOwn(ART, family) ? family : 'body-spark';
  // All three approved ruin frames share Rare's established coarse pixel grain.
  // Sampling per cell keeps each evolved card's established art family.
  const index = CARD_ART_IDS.indexOf(id), cell = 313, x = (index % 4) * cell, y = Math.floor(index / 4) * cell;
  const source = './assets/cards/skill-card-scenes-rare.webp';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="skill-card-art skill-card-illustration card-art-${id}${compact ? ' card-art-compact' : ''}" data-card-art="${id}" data-card-rarity="${esc(card.rarity || 'common')}" data-art-size="${compact || size === 'compact' ? 'compact' : 'full'}" viewBox="${x} ${y} ${cell} ${cell}" width="120" height="168" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="${esc(ART[id].description)}"><image href="${source}" x="0" y="0" width="${cell * 4}" height="${cell * 4}" preserveAspectRatio="none" style="image-rendering:pixelated"/></svg>`;
}
