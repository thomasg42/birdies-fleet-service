#!/usr/bin/env node
/* Builds src/assets/og.png. The site build itself does not need Playwright. */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { loadPlaywright } from './dev-deps.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../src/assets/og.png');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:1200px;height:630px;background:#0F0D0B;color:#EFE8DC;font-family:Impact,sans-serif}
  body{display:flex;align-items:flex-end;background:linear-gradient(#1F3326,#0F0D0B)}
  .trees{position:absolute;left:0;right:0;bottom:0}
  .copy{position:relative;padding:64px}
  h1{font-size:92px;letter-spacing:.04em;margin:0}
  p{font-family:Georgia,serif;font-size:28px;color:#B89A72;margin:12px 0 0}
</style></head><body>
  <svg class="trees" viewBox="0 0 1200 220" width="1200" height="220" aria-hidden="true">
    <path fill="#2F4A37" d="M0 220 0 120 80 70 150 130 230 60 320 120 430 50 560 130 700 60 860 140 1020 70 1200 120 1200 220Z"/>
    <path fill="#1F3326" d="M0 220 0 150 120 100 220 160 340 90 480 150 640 80 820 160 1000 100 1200 150 1200 220Z"/>
    <path fill="#0F0D0B" d="M0 220 0 180 140 150 280 190 460 150 680 190 900 150 1200 180 1200 220Z"/>
  </svg>
  <div class="copy"><h1>BIRDIES</h1><p>FLEET SERVICE &amp; BACKCOUNTRY REPAIR</p></div>
</body></html>`;

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function fallback() {
  const w = 1200;
  const h = 630;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const pine = y < h * 0.45;
      rgba[i] = pine ? 31 : 15;
      rgba[i + 1] = pine ? 51 : 13;
      rgba[i + 2] = pine ? 38 : 11;
      rgba[i + 3] = 255;
      const ridge = h - 80 - Math.abs(Math.sin(x / 40) * 36);
      if (y > ridge) { rgba[i] = 15; rgba[i + 1] = 13; rgba[i + 2] = 11; }
    }
  }
  writeFileSync(out, png(w, h, rgba));
  console.log('og fallback', out);
}

try {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const buf = await page.screenshot({ type: 'png' });
  await browser.close();
  if (buf.length > 300 * 1024) throw new Error('png too large');
  writeFileSync(out, buf);
  console.log('og', buf.length, out);
} catch (err) {
  console.error(String(err && err.message || err));
  fallback();
}
