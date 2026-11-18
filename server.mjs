import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
// A revision changes only after runtime writes have settled. Captured previews
// and generated screenshots do not interrupt a locally running game.
let devRevision=Date.now().toString(36),revisionTimer;
const runtimeFile=/\.(?:html|mjs|js|css|webmanifest|json|mp3|mp4|ttf|woff2|svg|webp|png|jpg)$/i;
const previewDirectory=/(?:^|[/\\])(?:previews?|captures?|screenshots?|proofs?|outputs?)[/\\]/i;
const capturedImage=/(?:preview|capture|screenshot|proof)[-_.].*\.(?:png|jpg|webp)$/i;
const watcher=fs.watch(root,{recursive:true},(_event,filename)=>{
  if(!filename||!runtimeFile.test(filename)||previewDirectory.test(filename)||capturedImage.test(filename))return;
  clearTimeout(revisionTimer);
  revisionTimer=setTimeout(()=>{devRevision=Date.now().toString(36);},600);
});
watcher.on('error',()=>{});

// Design-lab card review board: one shared JSON file of the owner's decisions, so a phone on the same
// network and this computer stay in step. Newest change per card wins. Dev server only; never published.
const cardboardFile=path.join(path.dirname(fileURLToPath(import.meta.url)),'outputs','cardboard','decisions.json');
const readCardboard=()=>{try{const v=JSON.parse(fs.readFileSync(cardboardFile,'utf8'));return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return{}}};
// Local play recorder mirror: the game on localhost posts each recorded flight line here (dist/play-log.mjs).
const playLogFile=path.join(root,'..','outputs','play-log-live.txt');
function handlePlayLog(req,res){
  if(req.method!=='POST'){res.writeHead(405);res.end();return}
  let size=0;const parts=[];
  req.on('data',chunk=>{size+=chunk.length;if(size>20000){req.destroy();return}parts.push(chunk)});
  req.on('end',()=>{
    try{
      const [header,...lines]=Buffer.concat(parts).toString('utf8').split('\n').filter(Boolean);
      if(!fs.existsSync(playLogFile))fs.writeFileSync(playLogFile,header+'\n');
      if(lines.length)fs.appendFileSync(playLogFile,lines.join('\n')+'\n');
      res.writeHead(204);res.end();
    }catch{res.writeHead(500);res.end()}
  });
}
function handleCardboard(req,res){
  const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))};
  if(req.method==='GET'){send(200,readCardboard());return}
  if(req.method!=='POST'){send(405,{});return}
  let size=0;const parts=[];
  req.on('data',chunk=>{size+=chunk.length;if(size>200000){req.destroy();return}parts.push(chunk)});
  req.on('end',()=>{
    let incoming;try{incoming=JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{send(400,{});return}
    if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)){send(400,{});return}
    const merged=readCardboard();
    for(const [id,e] of Object.entries(incoming)){
      if(!/^[a-z0-9-]{1,60}$/.test(id)||!e||typeof e!=='object')continue;
      const at=Number(e.at)||0;if(at<=(Number(merged[id]?.at)||0))continue;
      merged[id]={decision:['approve','deny','change'].includes(e.decision)?e.decision:null,note:String(e.note||'').slice(0,600),at};
    }
    try{fs.mkdirSync(path.dirname(cardboardFile),{recursive:true});fs.writeFileSync(cardboardFile,JSON.stringify(merged,null,1))}catch{send(500,{});return}
    send(200,merged);
  });
}
const mime={'.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.mp4':'video/mp4','.ttf':'font/ttf','.woff2':'font/woff2','.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{let requested;try{requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}if(requested==='/__cardboard'){handleCardboard(req,res);return}if(requested==='/__playlog'){handlePlayLog(req,res);return}if(requested==='/__dev-revision'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({revision:devRevision}));return}const filename=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return}fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return}const headers={'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1))}else{res.writeHead(200,{...headers,'Content-Length':data.length});res.end(data)}})});
server.listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log('Emberwing ready at http://localhost:'+server.address().port));
