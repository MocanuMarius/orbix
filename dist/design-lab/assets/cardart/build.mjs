// Writes the 12 v1.0-cardart pictures as static SVG files next to this script.
// Run from the repo root: node dist/design-lab/assets/cardart/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CARD_IDS, DIRECTIONS, pictureSvg} from './art.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
for (const id of CARD_IDS) for (const dir of DIRECTIONS) fs.writeFileSync(path.join(here, `${id}-${dir}.svg`), pictureSvg(id, dir) + '\n');
console.log(`wrote ${CARD_IDS.length * DIRECTIONS.length} SVGs to ${here}`);
