// v1.0-level probe. Needs a local server: $env:PORT='4212'; node server.mjs
// node scripts/level-scenery-probe.mjs --mode=hash            flag-off buffer hashes (pixel identity check)
// node scripts/level-scenery-probe.mjs --mode=shots [--at=30] before/after lit/dark PNGs into outputs/level-audit/v1.0/
// node scripts/level-scenery-probe.mjs --mode=bench           bake and render timing, scenery off vs on
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,until} from './browser-probe.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const base=`http://127.0.0.1:${args.port||4212}/design-lab/level.html`,mode=args.mode||'shots';
const out=path.resolve(args.out||'outputs/level-audit/v1.0');await fs.mkdir(out,{recursive:true});
const b=await chrome(['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']);
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1900,height:1100,deviceScaleFactor:1,mobile:false});
 const at=args.at||30;
 await b.visit(`${base}?still=1&at=${at}${args.only?'&only='+args.only:''}`);
 await until(()=>b.ev('window.__level&&window.__level.ready.then(()=>true)'),'level page',300);
 if(mode==='hash'){
  console.log(JSON.stringify(await b.ev('__level.hashes()'),null,1));
 }else if(mode==='bake'){
  const rows={};
  for(let run=0;run<(Number(args.runs)||3);run++){const result=await b.ev(`__level.bakeLoop({rounds:${Number(args.rounds)||6}})`);for(const [key,value] of Object.entries(result))(rows[key]??=[]).push(value);}
  console.log(JSON.stringify(Object.fromEntries(Object.entries(rows).map(([key,list])=>[key,Object.fromEntries(Object.keys(list[0]).map(f=>[f,list.map(r=>r[f]).sort((x,y)=>x-y)[Math.floor(list.length/2)]]))])),null,1));
 }else if(mode==='bench'){
  const rows={};
  for(const which of ['before','after'])for(let run=0;run<(Number(args.runs)||3);run++){
   const result=await b.ev(`__level.bench({frames:${Number(args.frames)||120},which:'${which}'})`);
   for(const [key,value] of Object.entries(result))(rows[key+'-'+which]??=[]).push(value);
  }
  const summary=Object.fromEntries(Object.entries(rows).map(([key,list])=>[key,Object.fromEntries(Object.keys(list[0]).map(field=>[field,list.map(r=>r[field]).filter(v=>v!=null).sort((x,y)=>x-y)[Math.floor(list.length/2)]??null]))]));
  console.log(JSON.stringify(summary,null,1));
 }else{
  const files=await b.ev(`(()=>{const out=[];for(const pair of __level.pairs){const slug=pair.level.id.replace(/^[a-z]+-/,'');for(const [name,v] of Object.entries(pair.views)){const file=pair.level.biomeId+'-'+slug+'-'+(name.startsWith('before')?'before':'after')+'-'+(name.endsWith('Lit')?'lit':'dark')+'${args.suffix||''}.png';out.push({file,data:v.canvas.toDataURL('image/png')});}}return out;})()`);
  for(const {file,data} of files)await fs.writeFile(path.join(out,file),Buffer.from(data.split(',')[1],'base64'));
  console.log(files.map(f=>path.join(out,f.file)).join('\n'));
 }
 if(b.errors.length)console.error('Page errors:',b.errors);
}finally{b.close();}
