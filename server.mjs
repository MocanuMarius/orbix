import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.mp3':'audio/mpeg','.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{let requested;try{requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}const filename=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return}fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data)})});
server.listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log('Emberwing ready at http://localhost:'+server.address().port));
