// Reproducible local-only production-renderer benchmark. See frame-performance-probe.mjs.
import http from 'node:http';
import {readFile,writeFile,mkdir,cp,access} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist'),work=resolve('work/frame-performance'),baseline=resolve(process.argv.find(a=>a.startsWith('--baseline='))?.slice(11)||'work/first-light-films/before/dist');
await mkdir(work,{recursive:true});
if(process.argv.includes('--snapshot'))await cp(root,resolve(work,'candidate'),{recursive:true,filter:path=>!path.includes(`${sep}assets${sep}previews`)});
if(process.argv.includes('--snapshot-optimized'))await cp(root,resolve(work,'optimized'),{recursive:true,filter:path=>!path.includes(`${sep}assets${sep}previews`)});
let optimized=root;try{await access(resolve(work,'optimized/flight.mjs'));optimized=resolve(work,'optimized');}catch{}
const roots={baseline,candidate:resolve(work,'candidate'),optimized,live:root};
const instrument={
 'terrain-boundary.mjs':['terrainBoundary','drawTerrainBoundary','beginTerrainBoundaryFrame'],
 'terrain-light.mjs':['castTerrainLight'],
 'terrain-foreground.mjs':['drawTerrainForeground'],
 'terrain-ecology.mjs':['drawTerrainEcology'],
 'contact-edge-art.mjs':['paintContactEdge'],
};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname==='/result'){
  const name=url.searchParams.get('name');if(!/^[\w-]+$/.test(name))throw Error('Invalid result name');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);await writeFile(resolve(work,name+'.json'),Buffer.concat(chunks));res.end('saved');return;
 }
 if(url.pathname==='/probe'){res.setHeader('Content-Type','text/html');res.end(await readFile('scripts/frame-performance-probe.html'));return;}
 const [,variant,...parts]=url.pathname.split('/'),base=roots[variant];if(!base)throw Error('Unknown build');
 const path=parts.join('/'),file=resolve(base,path);if(!file.startsWith(base+sep))throw Error('Invalid path');
 let data=await readFile(file);
 if(instrument[parts.at(-1)]&&url.searchParams.get('raw')!=='1'){
  let source=data.toString();
  for(const name of instrument[parts.at(-1)])if(source.includes(`export function ${name}(`)){
   source=source.replace(`export function ${name}(`,`function raw_${name}(`);
   source+=`\nexport function ${name}(...args){return globalThis.__perfCall?globalThis.__perfCall('${name}',raw_${name},args):raw_${name}(...args)}\n`;
  }
  data=source;
 }
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.ttf':'font/ttf','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(data);
 }catch(e){res.writeHead(404);res.end(String(e));}}).listen(4187,'127.0.0.1',()=>console.log('Frame probe http://127.0.0.1:4187/probe'));
