// Palmera Bay — tiny static dev server (Node 22, stdlib only).
// Serves game/ at / and screenshots at /shots so the game can be played and
// screenshotted locally. Usage: node serve.ts [port]  (default 8080).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const port = parseInt(process.argv[2] || '8080', 10);
const root = resolve(import.meta.dirname, 'game');
const shots = resolve(import.meta.dirname, 'screenshots');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  let base = root;
  if (path.startsWith('/shots/')) { base = shots; path = path.slice(7); }
  if (path === '/' || path === '') path = '/index.html';
  const file = join(base, path);
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => {
  console.log(`Palmera Bay dev server: http://localhost:${port}/`);
  console.log(`Shots: http://localhost:${port}/?shot=chase&seed=1`);
});
