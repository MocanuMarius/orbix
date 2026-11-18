// Renders the Wave Loom picture beside two released cards at 6x for review. node scripts/wave-loom-art-shot.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,delay} from './browser-probe.mjs';
const out=path.resolve('outputs/backlog-ui');await fs.mkdir(out,{recursive:true});
const b=await chrome();
const svg=async id=>'data:image/svg+xml;base64,'+(await fs.readFile(`dist/assets/cards/art/${id}.svg`)).toString('base64');
const ids=['wave-loom','momentum','metronome','heartbeat'];
const html='<body style="margin:0;background:#222;display:flex;gap:10px;padding:10px">'+(await Promise.all(ids.map(async id=>`<img src="${await svg(id)}" style="width:288px;height:288px;image-rendering:pixelated">`))).join('')+'</body>';
await b.send('Emulation.setDeviceMetricsOverride',{width:1240,height:320,deviceScaleFactor:1,mobile:false});
await b.visit('data:text/html;base64,'+Buffer.from(html).toString('base64'));await delay(800);
await b.shot(path.join(out,'wave-loom-art.png'));b.close?.();
