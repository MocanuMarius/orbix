// v1.2-level probe. Needs a local server: $env:PORT='4271'; node server.mjs
// node scripts/level-scenery-probe.mjs --mode=shots [--suffix=-r1]  before/after PNGs per course and moment into outputs/level-audit/v1.2/
// node scripts/level-scenery-probe.mjs --mode=edges                 edge vs open-air contrast at 2, 6 and 12 wisp radii
// node scripts/level-scenery-probe.mjs --mode=interior              light inside rock (deeper than 24 units) per moment
// node scripts/level-scenery-probe.mjs --mode=bake                  terrain bake cost per chunk
// node scripts/level-scenery-probe.mjs --mode=bench                 bake and per-frame render timing, before vs after
// node scripts/level-scenery-probe.mjs --mode=start                 level start (engine init + first frame) per course
// --only=frost-0 limits to one course; --port=4271.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,until} from './browser-probe.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const base=`http://127.0.0.1:${args.port||4271}/design-lab/level.html`,mode=args.mode||'shots';
const out=path.resolve(args.out||'outputs/level-audit/v1.2');await fs.mkdir(out,{recursive:true});
const b=await chrome(['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']);
const median=list=>list.toSorted((x,y)=>x-y)[Math.floor(list.length/2)];
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1900,height:1100,deviceScaleFactor:1,mobile:false});
 await b.visit(`${base}?still=1${args.only?'&only='+args.only:''}`);
 await until(()=>b.ev('window.__level&&window.__level.ready.then(()=>true)'),'level page',600);
 const keys=await b.ev('__level.courses.map(c=>c.key)');
 if(mode==='edges'){
  const rows={};
  for(const key of keys)for(const which of ['before','after'])for(const moment of ['p1','p2','p3']){
   if(!(await b.ev(`__level.courses.find(c=>c.key==='${key}').moments.includes('${moment}')`)))continue;
   // Two wisp heights: about 2 radii above the floor (near bins) and 5 radii (far bins).
   const near=await b.ev(`__level.edgeContrast({key:'${key}',moment:'${moment}',which:'${which}',clearance:19})`);
   const far=await b.ev(`__level.edgeContrast({key:'${key}',moment:'${moment}',which:'${which}',clearance:46})`);
   rows[`${key}-${moment}-${which}`]={2:near[2],6:far[6],12:far[12]};
  }
  console.log(JSON.stringify(rows));
 }else if(mode==='interior'){
  const rows={};
  for(const key of keys)for(const moment of ['p2','flash','luminance','finish'])for(const which of ['before','after']){
   rows[`${key}-${moment}-${which}`]=await b.ev(`__level.interiorLight({key:'${key}',moment:'${moment}',which:'${which}'})`);
  }
  console.log(JSON.stringify(rows,null,1));
 }else if(mode==='states'){
  // Scene-wide light states, straight from the renderer: finish reveal and the
  // dream rehearsal view, plus Flash and maximum Luminance, before and after.
  const files=await b.ev(`(()=>{const out=[];for(const course of __level.courses){const slug=course.level.id.replace(/^[a-z]+-/,'');
   for(const moment of ['flash','luminance','finish','dream'])for(const which of ['before','after']){const e=course[which];
    __level.setMoment(e,moment==='dream'?'p2':moment);const saved=e.dream;if(moment==='dream')e.dream={mode:'record'};e.render();e.dream=saved;
    out.push({file:'state-'+course.level.biomeId+'-'+slug+'-'+moment+'-'+which+'${args.suffix||''}.png',data:e.pixiView.canvas.toDataURL('image/png')});}}return out;})()`);
  for(const {file,data} of files)await fs.writeFile(path.join(out,file),Buffer.from(data.split(',')[1],'base64'));
  console.log(files.length+' files in '+out);
 }else if(mode==='bake'){
  const rows={};
  for(let run=0;run<(Number(args.runs)||3);run++){const result=await b.ev(`__level.bakeLoop({rounds:${Number(args.rounds)||6}})`);for(const [key,value] of Object.entries(result))(rows[key]??=[]).push(value);}
  console.log(JSON.stringify(Object.fromEntries(Object.entries(rows).map(([key,list])=>[key,Object.fromEntries(Object.keys(list[0]).map(f=>[f,median(list.map(r=>r[f]))]))])),null,1));
 }else if(mode==='bench'){
  const rows={};
  for(const which of ['before','after'])for(let run=0;run<(Number(args.runs)||3);run++){
   const result=await b.ev(`__level.bench({frames:${Number(args.frames)||120},which:'${which}'})`);
   for(const [key,value] of Object.entries(result))(rows[key+'-'+which]??=[]).push(value);
  }
  console.log(JSON.stringify(Object.fromEntries(Object.entries(rows).map(([key,list])=>[key,Object.fromEntries(Object.keys(list[0]).map(f=>[f,median(list.map(r=>r[f]))]))])),null,1));
 }else if(mode==='start'){
  const rows={};
  for(const key of keys)for(const which of ['before','after'])rows[key+'-'+which]=await b.ev(`__level.startCost({key:'${key}',which:'${which}',runs:${Number(args.runs)||5}})`);
  console.log(JSON.stringify(rows,null,1));
 }else{
  const files=await b.ev(`(()=>{const out=[];for(const course of __level.courses){const slug=course.level.id.replace(/^[a-z]+-/,'');for(const moment of course.moments)for(const which of ['before','after'])out.push({file:course.level.biomeId+'-'+slug+'-'+moment+'-'+which+'${args.suffix||''}.png',data:course.views[moment][which].canvas.toDataURL('image/png')});}return out;})()`);
  for(const {file,data} of files)await fs.writeFile(path.join(out,file),Buffer.from(data.split(',')[1],'base64'));
  console.log(files.length+' files in '+out);
 }
 if(b.errors.length)console.error('Page errors:',b.errors);
}finally{b.close();}
