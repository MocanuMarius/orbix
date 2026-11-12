import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const tests = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(tests, '../dist');
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.png': 'image/png' };
http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const fixture = pathname === '/' ? 'lighting-proof.html' : pathname === '/motion' ? 'phoenix-motion-proof.html' : null;
  const filename = fixture ? path.join(tests, fixture) : path.resolve(root, '.' + pathname);
  if (!fixture && !filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await fs.readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
  } catch { res.writeHead(404).end(); }
}).listen(4180, '127.0.0.1', () => console.log('Material lighting proof at http://localhost:4180'));
