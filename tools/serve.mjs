#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2];
const port = Number(process.argv[3] || 8080);
if (!root) {
  console.error('Usage: node tools/serve.mjs <dir> [port]');
  process.exit(1);
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};
createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
    res.writeHead(204);
    res.end();
    return;
  }
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '').replace(/\.\.(\/|\\)/g, '');
  if (!rel || rel === '/') rel = 'index.html';
  let file = join(root, rel);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) file = join(root, '404.html');
  if (!existsSync(file)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const body = readFileSync(file);
  res.writeHead(file.endsWith('404.html') && !req.url.startsWith('/404') ? 404 : 200, {
    'Content-Type': types[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} on http://127.0.0.1:${port}/`);
});
