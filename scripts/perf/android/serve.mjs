// Static server for the emulator realism tests: serves dist/ (read-only), service workers disabled, and patches the served copy of
// boundary-run-inspector.mjs (like scripts/perf/lib.mjs) so ?mock=boundary accepts ?cardset=<name>&late=1&collector=twin&biome=&course=.
// Card sets here are ordinary builds: starter (one card) and mid (five cards, one Pulse card (Spillway), twin Collectors).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const MIME={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.json':'application/json','.webmanifest':'application/manifest+json'};
export const CARD_SETS={starter:['body-spark'],mid:['echo','spillway','cache-handling','body-spark','twin-orbit'],plain:[]};
function patchInspector(src){
 const version=src.match(/['"]\.\/model\.mjs(\?[^'"]*)?['"]/)?.[1]||'';
 let s=`import {makeSkillCard as __mk} from './skill-cards.mjs${version}';\n`+src;
 s=s.replace("createRun(state.profile,storm?query.get('seed')||'shepherd-study':'in-game-boundary-study',1)","createRun(state.profile,query.get('seed')||'perf-fixed-seed',1,{cards:true})");
 s=s.replace(/return state;\s*\}/,`{const q=query,sets=${JSON.stringify(CARD_SETS)};run.cardSlots=5;run.mountedCards=(sets[q.get('cardset')||'plain']||[]).map((id,i)=>__mk(id,'perf:'+i));while(run.mountedCards.length<run.cardSlots)run.mountedCards.push(null);
 const n=run.map[0][0];
 if(q.get('late')==='1'){n.difficulty=3;n.row=4;}}
 return state;}`);
 return s;
}
export async function startServer(root='dist',port=4186){
 root=path.resolve(root);
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');let name=decodeURIComponent(url.pathname.slice(1))||'index.html';
  const file=path.resolve(root,name);if(!file.startsWith(root))throw Error('outside');
  let data=await fs.readFile(file);
  if(name==='boundary-run-inspector.mjs')data=Buffer.from(patchInspector(data.toString()));
  else if(name==='worker.js'||name==='sw.js')data=Buffer.from('// service worker disabled by perf harness');
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 }catch(e){res.writeHead(404).end(String(e))}});
 await new Promise(r=>server.listen(port,'127.0.0.1',r));
 return {server,close:()=>server.close()};
}
