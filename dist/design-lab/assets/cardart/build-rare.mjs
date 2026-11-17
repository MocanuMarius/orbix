// Writes the v1.0-cardart-B Rare and Legendary pictures to cards/<card-id>.svg and cards/manifest-rare.json.
// Run from the repo root: node dist/design-lab/assets/cardart/build-rare.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RARE_IDS, META, pictureSvg} from './art-rare.mjs';
import {CARD_CATALOG} from '../../../card-catalog.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
// The evolution line a card sits in, base first (follows evolvesTo both ways).
function evoLine(id) {
  const cards = Object.values(CARD_CATALOG).filter(c => !c.retired);
  let base = id;
  for (let prev; (prev = cards.find(c => c.evolvesTo === base));) base = prev.id;
  const line = [base];
  while (CARD_CATALOG[line.at(-1)]?.evolvesTo) line.push(CARD_CATALOG[line.at(-1)].evolvesTo);
  return line;
}
const out = path.join(here, 'cards');
fs.mkdirSync(out, {recursive: true});
const manifest = {};
for (const id of RARE_IDS) {
  fs.writeFileSync(path.join(out, `${id}.svg`), pictureSvg(id) + '\n');
  const m = META[id] || {};
  manifest[id] = {file: `${id}.svg`, rarity: CARD_CATALOG[id].rarity, family: m.family, idea: m.idea, line: evoLine(id)};
}
fs.writeFileSync(path.join(out, 'manifest-rare.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${RARE_IDS.length} SVGs and manifest-rare.json to ${out}`);
