// Writes every v1.0-cardart-B card picture (Common, Rare, Legendary and the unreleased engine cards) to
// cards/<id>.svg and the merged cards/manifest.json: {id: {file, rarity, family, idea, line, unreleased?}}.
// family = the card's Trigger family (the contact sheet groups by it); line = its evolution line, base first.
// Run from the repo root: node dist/design-lab/assets/cardart/build-all.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMMON_IDS, COMMON_META, commonSvg} from './art-common.mjs';
import {RARE_IDS, META as RARE_META, pictureSvg as rareSvg} from './art-rare.mjs';
import {ENGINE_IDS, ENGINE_META, DOC_ONLY, engineSvg} from './art-engine.mjs';
import {CARD_CATALOG} from '../../../card-catalog.mjs';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cards');
fs.mkdirSync(out, {recursive: true});
export const TRIGGER_FAMILY = {
  collect: 'Collect', delivery: 'Delivery', latch: 'Latch', wave: 'Pulse', flash: 'Flash', 'flash-ends': 'Flash ends',
  rhythm: 'Rhythm', 'falling-lift': 'Falling Lift', save: 'Save', clear: 'Clear', rest: 'Rest', any: 'Any Trigger',
  next: 'Next card', 'always-on': 'Always on', overfill: 'Overfill', pack: 'Pack', 'take-off': 'Take-off',
  'engine-pulse': 'Pulse from a card', 'engine-gain': 'A card gives Sparks', 'engine-any': 'Any card event',
  'engine-skim': 'Proximity fills', 'engine-lift': 'Lift', '': 'Lift',
};
const DOC_TRIGGER = {'homing-thread': 'delivery', 'momentum': 'always-on'};
const live = Object.values(CARD_CATALOG).filter(c => !c.retired);
function evoLine(id) {
  let base = id;
  for (let prev; (prev = live.find(c => c.evolvesTo === base));) base = prev.id;
  const line = [base];
  while (CARD_CATALOG[line.at(-1)]?.evolvesTo) line.push(CARD_CATALOG[line.at(-1)].evolvesTo);
  return line;
}
const sources = [
  ...COMMON_IDS.map(id => [id, commonSvg, COMMON_META[id].idea]),
  ...RARE_IDS.map(id => [id, rareSvg, RARE_META[id].idea]),
  ...ENGINE_IDS.map(id => [id, engineSvg, ENGINE_META[id].idea]),
];
const manifest = {};
for (const [id, svg, idea] of sources) {
  const card = CARD_CATALOG[id], doc = DOC_ONLY[id];
  fs.writeFileSync(path.join(out, `${id}.svg`), svg(id) + '\n');
  const trigger = card ? card.trigger ?? '' : DOC_TRIGGER[id];
  manifest[id] = {file: `${id}.svg`, rarity: card ? card.rarity : doc.rarity, family: TRIGGER_FAMILY[trigger] ?? trigger, idea, line: card ? evoLine(id) : [id]};
  if (!card || card.unreleased) manifest[id].unreleased = true;
  if (!card) { manifest[id].name = doc.name; manifest[id].notInCatalog = true; }
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const missing = live.filter(c => !manifest[c.id]).map(c => c.id);
console.log(`wrote ${sources.length} SVGs and manifest.json to ${out}`);
if (missing.length) console.log('NO PICTURE YET for catalog cards:', missing.join(', '));
