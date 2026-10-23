#!/usr/bin/env node
// Photographic social preview; the approved real logo can replace the wordmark later.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {loadPlaywright} from './dev-deps.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const image=readFileSync(join(root,'src/assets/photos/forest-hero.webp')).toString('base64');
const font=readFileSync(join(root,'src/assets/fonts/big-shoulders-display-latin-800.woff2')).toString('base64');
const {chromium}=loadPlaywright();
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
try {
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent('<!doctype html><html><head><style>@font-face{font-family:Birdies;src:url(data:font/woff2;base64,'+font+')}*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#0f0d0b;color:#efe8dc}img{position:absolute;width:1200px;height:630px;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(90deg,#0f0d0be6,#0f0d0b33)}.copy{position:absolute;left:70px;bottom:75px}h1{font:800 130px/1 Birdies,Impact,sans-serif;letter-spacing:.02em;margin:0}p{font:24px Arial,sans-serif;letter-spacing:.1em;margin:16px 0 0}</style></head><body><img src="data:image/webp;base64,'+image+'" alt=""><div class="shade"></div><div class="copy"><h1>BIRDIES</h1><p>FLEET SERVICE &amp; BACKCOUNTRY REPAIR</p></div></body></html>');
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:join(root,'src/assets/og.png')});
 console.log('Photographic og.png generated: 1200x630, real forest, no cartoon.');
}finally{await browser.close()}
