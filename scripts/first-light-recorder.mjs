import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
const root=resolve('dist'),before=resolve('work/first-light-films/before/dist'),frames=resolve('work/first-light-films/frames');
await mkdir(frames,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.css':'text/css','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname==='/frame'){
  const index=Number(url.searchParams.get('index')),biome=url.searchParams.get('biome');
  if(!Number.isInteger(index)||index<0||index>359||!['pinewood','basalt'].includes(biome))throw Error('Invalid frame');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const data=Buffer.concat(chunks);if(data.length>5e6)throw Error('Oversize frame');
  await mkdir(join(frames,biome),{recursive:true});await writeFile(join(frames,biome,String(index).padStart(4,'0')+'.png'),data);res.end('saved');return;
 }
 if(req.method==='POST'&&url.pathname==='/evidence'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);await writeFile(resolve('work/first-light-films/renderer-evidence.json'),Buffer.concat(chunks));res.end('saved');return;
 }
 let file;
 if(url.pathname==='/recorder')file=resolve('scripts/first-light-recorder.html');
 else {const old=url.pathname.startsWith('/before/'),after=url.pathname.startsWith('/after/'),base=old?before:root,path=old?url.pathname.slice(7):after?url.pathname.slice(6):url.pathname;file=resolve(base,'.'+path);if(!file.startsWith(base+sep))throw Error('Invalid path');}
 const data=await readFile(file),headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));}
 else {res.writeHead(200,{...headers,'Content-Length':data.length});res.end(data);}
 }catch(error){res.writeHead(404);res.end(error.message);}}).listen(4186,'127.0.0.1',()=>console.log('First Light actual renderer recorder · http://127.0.0.1:4186/recorder'));
