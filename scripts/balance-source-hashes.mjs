import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
// Record the controllers as well as the game: changing a bot invalidates a
// comparative result just as changing physics or the supply generator does.
export function balanceSourceHashes(){
 const files=fs.readdirSync(new URL('dist/',root)).filter(n=>n.endsWith('.mjs')).map(n=>'dist/'+n);
 files.push(...['balance-current-flight','balance-current-economy','human-flight-planner','human-flight-perception','balance-source-hashes'].map(n=>'scripts/'+n+'.mjs'));
 return Object.fromEntries(files.sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex')]));
}
