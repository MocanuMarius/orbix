// Compares container bounding boxes captured before and after the icon build (outputs/icons-build/*/report-*.json).
// Usage: node scripts/icons-geometry-diff.mjs   Lists every shot and selector whose boxes moved or resized by more than 1 px.
import fs from 'node:fs';
const load=label=>{const dir=`outputs/icons-build/${label}/`,out={};for(const f of fs.readdirSync(dir).filter(f=>f.startsWith('report')))Object.assign(out,JSON.parse(fs.readFileSync(dir+f)).geometry);return out;};
const before=load('before'),after=load('after');
const watch=['#header button','#header .ascension-lives','.wb-sign','.rest-benefit','.rest-hub-tools>button','.world-map-node'];
let moved=0,checked=0;
for(const shot of Object.keys(after).sort()){
  if(!before[shot])continue;
  for(const sel of watch){
    const a=after[shot][sel],b=before[shot][sel];
    if(!a||!b)continue;
    if(a.length!==b.length){console.log(`${shot} ${sel}: count ${b.length} -> ${a.length}`);moved++;continue;}
    a.forEach((box,i)=>{checked++;const d=box.map((v,k)=>Math.round((v-b[i][k])*10)/10);if(d.some(v=>Math.abs(v)>1)){moved++;console.log(`${shot} ${sel}[${i}] before ${b[i].join(',')} after ${box.join(',')} delta ${d.join(',')}`);}});
  }
}
console.log(`checked ${checked} boxes, ${moved} changed by more than 1 px`);
