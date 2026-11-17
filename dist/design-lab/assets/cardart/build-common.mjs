// Writes the v1.0-cardart-B Common card pictures to ./cards/<card-id>.svg and ./cards/manifest-common.json.
// Run from the repo root: node dist/design-lab/assets/cardart/build-common.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMMON_IDS, COMMON_META, commonSvg} from './art-common.mjs';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cards');
fs.mkdirSync(out, {recursive: true});
const manifest = {};
for (const id of COMMON_IDS) {
  fs.writeFileSync(path.join(out, `${id}.svg`), commonSvg(id) + '\n');
  const {family, idea, line} = COMMON_META[id];
  manifest[id] = {file: `${id}.svg`, family, idea, line};
}
fs.writeFileSync(path.join(out, 'manifest-common.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${COMMON_IDS.length} Common SVGs and manifest-common.json to ${out}`);
