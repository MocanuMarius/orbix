import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
const ideas=process.env.RECORD_KIND==='ideas',biomes=process.env.RECORD_KIND==='biomes',recorder=resolve(biomes?'scripts/biome-edges-recorder.html':ideas?'scripts/edge-ideas-recorder.html':'scripts/boundary-video-recorder.html');
const root=resolve('dist'),frames=resolve(biomes?'work/biome-edges/frames':ideas?'work/edge-ideas/frames':'work/boundary-video/frames');await mkdir(frames,{recursive:true});
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname==='/frame'){
  const index=Number(url.searchParams.get('index'));if(!Number.isInteger(index)||index<0||index>500)throw Error('Invalid frame');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const data=Buffer.concat(chunks);if(data.length>8e6)throw Error('Oversize frame');
  await writeFile(join(frames,String(index).padStart(4,'0')+'.png'),data);res.end('saved');return;
 }
 const file=url.pathname==='/recorder'?recorder:resolve(root,'.'+url.pathname);
 if(file!==recorder&&!file.startsWith(root+'\\'))throw Error('Invalid path');
 const data=await readFile(file),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.css':'text/css','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4'};
 const headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;
  if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return;}
  res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));
 }else{res.writeHead(200,{...headers,'Content-Length':data.length});res.end(data);}
}catch(e){res.writeHead(404);res.end(e.message);}}).listen(Number(process.env.RECORD_PORT)||4182,'127.0.0.1',()=>console.log('Actual renderer recorder ready'));
