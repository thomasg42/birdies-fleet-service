#!/usr/bin/env node
/* Screenshots and the fleet-override story. Dev server must already be up. */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlaywright } from './dev-deps.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../review');
mkdirSync(out, { recursive: true });
const prod = process.argv[2] || 'http://127.0.0.1:8080';
const dev = process.argv[3] || 'http://127.0.0.1:8081';
const now = '2026-10-22T09:05';
const { chromium } = loadPlaywright();

async function shot(page, name) {
  await page.screenshot({ path: join(out, name), fullPage: true });
  console.log(name);
}

const browser = await chromium.launch();
const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

const home = await browser.newContext({ viewport: phone });
const p = await home.newPage();
await p.goto(prod + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await shot(p, 'home-390.png');
await home.close();

const wide = await browser.newContext({ viewport: desktop });
const w = await wide.newPage();
await w.goto(prod + '/', { waitUntil: 'networkidle' });
await w.waitForTimeout(400);
await shot(w, 'home-1440.png');
await w.goto(prod + '/mobile-repair/', { waitUntil: 'networkidle' });
await shot(w, 'service-mobile-repair-1440.png');
await w.goto(prod + '/service-area/ennis/', { waitUntil: 'networkidle' });
await shot(w, 'town-ennis-1440.png');
await w.goto(prod + '/schedule/', { waitUntil: 'networkidle' });
await shot(w, 'schedule-production-1440.png');
await wide.close();

const still = await browser.newContext({ viewport: desktop, reducedMotion: 'reduce' });
const s = await still.newPage();
await s.goto(prod + '/', { waitUntil: 'networkidle' });
await shot(s, 'home-reduced-motion-1440.png');
await still.close();

const story = await browser.newContext({ viewport: desktop });
const page = await story.newPage();
const sched = `${dev}/schedule/?now=${encodeURIComponent(now)}`;
await page.goto(sched, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.selectOption('[name=service]', 'mobile-repair');
await page.fill('[name=vehicle]', 'tan pickup');
await page.fill('[name=location]', 'Bozeman driveway');
await page.fill('[name=name]', 'Casey Brooks');
await page.fill('[name=phone]', '4065550142');
const sat = page.locator('input[name=window][value="2026-10-24T08:00"]');
await sat.check();
await shot(page, 'story-1-customer-form.png');
await page.click('#book-submit');
await page.waitForSelector('#book-thanks:not([hidden])', { timeout: 8000 });
await shot(page, 'story-2-customer-booked.png');

await page.goto(`${dev}/fleet-login/?now=${encodeURIComponent(now)}`, { waitUntil: 'networkidle' });
await page.fill('[name=fleetId]', 'demo');
await page.fill('[name=pin]', '1111');
await page.click('#fleet-login button[type=submit]');
await page.waitForSelector('#fleet-board:not([hidden])');
await page.fill('[name=unit]', '12');
await page.fill('[name=location]', 'shop yard');
await page.selectOption('#fleet-book [name=service]', 'fleet-maintenance');
await page.fill('[name=contactName]', 'Pat');
await page.fill('[name=contactPhone]', '4065550160');
await shot(page, 'story-3-fleet-board.png');
await page.locator('[data-window-id="2026-10-24T08:00"]').click();
await page.waitForSelector('#bump-dialog[open], #bump-dialog:visible');
await shot(page, 'story-4-are-you-sure.png');
await page.click('#bump-yes');
await page.waitForFunction(() => (document.getElementById('fleet-done') || {}).textContent?.includes('Booked'));
await shot(page, 'story-5-outbox-after-bump.png');
const outbox = await page.locator('#dev-outbox').innerText();
const link = outbox.match(/https?:\/\/\S+/)[0];
await page.goto(link, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-pick]');
await shot(page, 'story-6-reschedule.png');
await page.locator('[data-pick]').first().click();
await page.waitForFunction(() => document.body.innerText.includes("You're set for"));
await shot(page, 'story-7-rescheduled.png');
const finalOut = await page.locator('#dev-outbox').innerText();
if (!finalOut.includes('RESCHEDULED')) throw new Error('outbox missing RESCHEDULED');
console.log('fleet story ok');
await story.close();
await browser.close();
