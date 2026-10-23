import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAIRS, SITE, liveTowns } from '../site.config.mjs';
import { PAGES } from '../src/pages.mjs';
import * as core from '../src/assets/birdies-core.js';
import { createMock } from '../src/assets/booking-mock.js';
import { setControl, val } from '../src/assets/booking-dom.js';
import { bootSchedule } from '../src/assets/schedule-ui.js';
import { bootFleet } from '../src/assets/fleet-ui.js';
import { bootReschedule } from '../src/assets/reschedule-ui.js';
import { loadLinkedom } from '../tools/dev-deps.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs');
const { parseHTML } = loadLinkedom();

function relPosix(from, file) {
  return relative(from, file).replace(/\\/g, '/');
}
function samePayload(disk, fresh, rel) {
  if (disk.equals(fresh)) return true;
  if (/\.(png|jpe?g|gif|webp|ico|woff2?)$/i.test(rel)) return false;
  return disk.toString('utf8').replace(/\r\n/g, '\n') === fresh.toString('utf8').replace(/\r\n/g, '\n');
}
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
function words(text) {
  return text.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, ' and ').replace(/&[^;]+;/g, ' ').split(/\s+/).filter(Boolean);
}
function grams(text) {
  const list = words(text).map((w) => w.toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);
  const out = [];
  for (let i = 0; i <= list.length - 5; i += 1) out.push(list.slice(i, i + 5).join(' '));
  return out;
}
function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}
function htmlFiles() {
  return walk(docs).filter((f) => f.endsWith('.html'));
}
function lum(hex) {
  const n = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('docs matches a fresh production build', () => {
  const out = mkdtempSync(join(tmpdir(), 'birdies-build-'));
  try {
    execFileSync(process.execPath, ['build.mjs', '--out', out], { cwd: root, stdio: 'pipe' });
    const fresh = walk(out).map((f) => relPosix(out, f)).sort();
    const have = walk(docs).map((f) => relPosix(docs, f)).sort();
    assert.deepEqual(have, fresh);
    for (const rel of fresh) {
      assert.equal(samePayload(readFileSync(join(docs, rel)), readFileSync(join(out, rel)), rel), true, rel);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('dev build refuses docs/', () => {
  assert.throws(() => {
    execFileSync(process.execPath, ['build.mjs', '--dev', '--out', docs], { cwd: root, stdio: 'pipe' });
  });
});

test('production docs have no dev mock strings', () => {
  const blob = walk(docs).map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const needle of ['booking-mock', '1111', 'DEMO DATA', 'dev-outbox', 'DEMO']) {
    assert.equal(blob.includes(needle), false, needle);
  }
  assert.equal(existsSync(join(docs, 'assets/booking-mock.js')), false);
  assert.equal(existsSync(join(docs, 'assets/dev-boot.js')), false);
});

test('seo contract, one h1, launched noindex, links and assets', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    assert.match(html, /lang="en-US"/);
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    const desc = html.match(/name="description" content="([^"]*)"/)[1];
    assert.ok(title.length <= 60, title);
    assert.ok(desc.length >= 110 && desc.length <= 160, `${desc.length} ${file}`);
    assert.equal(titles.has(title), false, title);
    assert.equal(descriptions.has(desc), false, desc);
    titles.add(title);
    descriptions.add(desc);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /property="og:image"/);
    assert.match(html, /name="twitter:card"/);
    assert.match(html, /noindex, nofollow/);
    const h1s = html.match(/<h1\b/g) || [];
    assert.equal(h1s.length, 1, file);
    assert.match(html, /tel:\+14355314127/);
    assert.match(html, /sms:/);
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/);
    for (const block of html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
      const raw = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      JSON.parse(raw);
    }
    const dir = dirname(file);
    const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      if (/^(tel:|sms:|mailto:|#|data:)/.test(href)) continue;
      if (/^https?:/.test(href)) {
        assert.match(href, /^https:\/\/thomasg42\.github\.io\/birdies-fleet-service/);
        continue;
      }
      const clean = href.split('#')[0].split('?')[0];
      const url = new URL(clean, `http://local/${relPosix(docs, dir)}/`);
      let rel = decodeURIComponent(url.pathname).replace(/^\//, '');
      if (rel.endsWith('/')) rel += 'index.html';
      if (rel === '') rel = 'index.html';
      const target = join(docs, rel);
      assert.equal(existsSync(target), true, `${file} -> ${href}`);
    }
  }
});

test('AutoRepair schema stays inside confirmed fields', () => {
  const towns = liveTowns().map((t) => t.name).sort();
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const repair = blocks.filter((b) => b['@type'] === 'AutoRepair');
    const rel = relPosix(docs, file);
    const allowed = rel === 'index.html' || rel.startsWith('schedule/') || rel.startsWith('contact/');
    assert.equal(repair.length, allowed ? 1 : 0, rel);
    for (const node of repair) {
      assert.equal(node.name, SITE.name);
      assert.equal(node.alternateName, 'Birdies');
      assert.equal(node.telephone, '+1-435-531-4127');
      assert.equal(node.slogan, 'Keep Exploring');
      assert.equal(node.founder.name, 'J Smith');
      assert.equal(node.address.addressRegion, 'MT');
      assert.equal(node.address.addressCountry, 'US');
      assert.equal(node.address.streetAddress, undefined);
      assert.deepEqual(node.areaServed.map((t) => t.name).sort(), towns);
      for (const key of ['priceRange', 'openingHours', 'aggregateRating', 'review', 'geo', 'sameAs', 'logo', 'image']) {
        assert.equal(node[key], undefined, key);
      }
      assert.equal(node.hasOfferCatalog.itemListElement.length, 4);
    }
  }
});

test('brindle mascot is reused and stays off the tools', () => {
  const alt = 'Illustration of a brindle dog, the Birdies mascot.';
  const home = readFileSync(join(docs, 'index.html'), 'utf8');
  const about = readFileSync(join(docs, 'about/index.html'), 'utf8');
  const missing = readFileSync(join(docs, '404.html'), 'utf8');
  for (const html of [home, about, missing]) {
    assert.equal(html.includes(alt), true);
    assert.equal(html.includes('<use href="#birdies-dog"'), true);
    assert.equal(html.includes('id="birdies-dog"'), true);
  }
  assert.equal(home.includes('class="mascot mascot-color hero-dog"'), true);
  assert.equal(home.includes('And our brindle mascot.'), true);
  assert.equal(home.includes('Insured. Locally owned. J Smith, owner and mobile mechanic.'), true);
  assert.equal(home.includes('class="mascot mascot-ink foot-dog"'), true);
  assert.equal(home.includes('Keep Exploring'), true);
  assert.equal(about.includes('id="mascot"'), true);
  assert.equal(about.includes('And our brindle mascot.'), true);
  assert.equal(missing.includes("Wrong turn. Let's get you back on the trail."), true);
  for (const rel of ['schedule/index.html', 'fleet-login/index.html', 'reschedule/index.html']) {
    const html = readFileSync(join(docs, rel), 'utf8');
    assert.equal(html.includes('birdies-dog'), false, rel);
    assert.equal(html.includes('brindle'), false, rel);
  }
  const og = readFileSync(join(docs, 'assets/og.png'));
  assert.equal(og.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const ogTool = readFileSync(join(root, 'tools/make-og.mjs'), 'utf8');
  assert.equal(ogTool.includes('birdies-dog'), true);
});

test('hero v0 is a still placeholder', () => {
  const html = readFileSync(join(docs, 'index.html'), 'utf8');
  assert.match(html, /data-hero-slot="v0-placeholder"/);
  assert.match(html, /class="[^"]*hero-dog/);
  assert.match(html, /<h1>[^<]*Southwest Montana[^<]*<\/h1>/);
  assert.match(html, /Book a time/);
  assert.match(html, /Call 435-531-4127/);
  assert.doesNotMatch(html, /<video|autoplay|data-hero-video/);
});

test('town and service copy length, doorway overlap, confirms', () => {
  const towns = [];
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    const local = html.match(/data-local-copy[^>]*>([\s\S]*?)<\/div>/);
    const service = html.match(/data-service-copy[^>]*>([\s\S]*?)<\/div>/);
    if (local) {
      const count = words(local[1]).length;
      assert.ok(count >= 300, `${file} ${count}`);
      towns.push({ file, text: local[1], confirm: /data-confirm="true"/.test(local[0]) });
    }
    if (service) assert.ok(words(service[1]).length >= 600, file);
  }
  assert.equal(towns.length, 10);
  const confirmed = towns.filter((t) => t.confirm).map((t) => t.file);
  assert.deepEqual(confirmed, []);
  const blob = towns.map((t) => t.text).join('\n');
  assert.equal(/J has confirmed|this town is confirmed/i.test(blob), false);
  for (let i = 0; i < towns.length; i += 1) {
    for (let j = i + 1; j < towns.length; j += 1) {
      const A = new Set(grams(towns[i].text));
      const B = new Set(grams(towns[j].text));
      let shared = 0;
      for (const g of A) if (B.has(g)) shared += 1;
      const ratio = shared / Math.min(A.size, B.size);
      assert.ok(ratio <= 0.4, `${towns[i].file} ${towns[j].file} ${ratio}`);
    }
  }
});

test('visitor text does not explain the website', () => {
  const banned = /this page|this website|this site|in writing|stand-in|will not invent|confirm the scope/i;
  for (const file of htmlFiles()) {
    const text = visible(readFileSync(file, 'utf8'));
    assert.equal(banned.test(text), false, `${file} ${text.match(banned)}`);
  }
});

test('claims, phones, and dashes stay out of visitor text', () => {
  const banned = /\b(24\/7|same-day|guarantee|guaranteed|warranty|certified|licensed|\base\b|bonded|towing|\btow\b|best|top-rated|testimonial|testimonials|\breviews?\b|\bstars?\b|ford|f-350|f350|\bprice\b|\bprices\b|\bhours\b|\$)\b/i;
  for (const file of htmlFiles()) {
    const text = visible(readFileSync(file, 'utf8'));
    assert.equal(banned.test(text), false, `${file} ${text.match(banned)}`);
    assert.equal(/[\u2013\u2014]/.test(text), false, file);
    const phones = text.match(/\+?\d[\d().\-\s]{8,}\d/g) || [];
    for (const phone of phones) {
      const digits = phone.replace(/\D/g, '');
      assert.ok(digits.endsWith('4355314127'), phone);
    }
  }
});

test('contrast pairs pass AA for small text', () => {
  for (const [fg, bg, size] of PAIRS) {
    const need = size === 'large' ? 3 : 4.5;
    assert.ok(ratio(fg, bg) >= need, `${fg} on ${bg} ${ratio(fg, bg)}`);
  }
});

test('script budget and privacy and consent', () => {
  const byte = (name) => statSync(join(docs, 'assets', name)).size;
  const sum = (names) => names.reduce((n, name) => n + byte(name), 0);
  const base = ['site.js', 'chrome.js'];
  assert.ok(sum(base) < 45000);
  assert.ok(sum([...base, 'birdies-core.js', 'booking-api.js', 'booking-dom.js', 'schedule-ui.js']) < 45000);
  assert.ok(sum([...base, 'birdies-core.js', 'booking-api.js', 'booking-dom.js', 'fleet-ui.js']) < 45000);
  assert.ok(byte('site.css') < 60000);
  for (const file of htmlFiles()) assert.ok(statSync(file).size < 60000, file);
  const privacy = readFileSync(join(docs, 'privacy/index.html'), 'utf8');
  for (const phrase of ['Msg &amp; data rates may apply', 'Reply STOP to opt out', 'Reply HELP for help', 'We do not sell or share your mobile number or text-message consent with third parties or affiliates for marketing.']) {
    assert.ok(privacy.includes(phrase), phrase);
  }
  const schedule = readFileSync(join(docs, 'schedule/index.html'), 'utf8');
  assert.match(schedule, /name="smsConsent"[^>]*type="checkbox"/);
  assert.doesNotMatch(schedule, /name="smsConsent"[^>]*checked/);
  const robots = readFileSync(join(docs, 'robots.txt'), 'utf8');
  assert.match(robots, /Disallow: \//);
  const sitemap = readFileSync(join(docs, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /privacy\//);
  assert.doesNotMatch(sitemap, /fleet-login|reschedule|404/);
  const indexable = PAGES.filter((p) => p.inSitemap !== false && !p.noindex).length;
  assert.equal((sitemap.match(/<loc>/g) || []).length, indexable);
});

test('booking rules match the Denver cases', () => {
  const thu = core.parseLocal('2026-10-22T09:05');
  const sat = core.earliestPublicStart(thu);
  assert.equal(core.toOffsetIso(sat).startsWith('2026-10-24T08:00:00-06'), true);
  const late = core.parseLocal('2026-10-22T23:59');
  assert.equal(core.toOffsetIso(core.earliestPublicStart(late)).startsWith('2026-10-24T08:00:00-06'), true);
  const fri = core.parseLocal('2026-10-23T00:01');
  assert.equal(core.toOffsetIso(core.earliestPublicStart(fri)).startsWith('2026-10-26T08:00:00-06'), true);
  const offset1 = core.earliestPublicStart(thu, { ...core.DEFAULT_RULES, publicFirstDayOffset: 1 });
  assert.equal(core.toOffsetIso(offset1).startsWith('2026-10-23T10:00:00-06'), true);
  assert.equal(core.toOffsetIso(core.zonedTime(2026, 10, 31, 8, 0)).includes('-06:00'), true);
  assert.equal(core.toOffsetIso(core.zonedTime(2026, 11, 2, 8, 0)).includes('-07:00'), true);
  assert.equal(core.toOffsetIso(core.fleetEarliestStart(core.parseLocal('2026-10-22T07:20'))).startsWith('2026-10-22T08:00:00-06'), true);
  assert.equal(core.toOffsetIso(core.fleetEarliestStart(core.parseLocal('2026-10-22T07:45'))).startsWith('2026-10-22T10:00:00-06'), true);
  assert.equal(core.labelWindow(8, 10), '8 to 10 AM');
  assert.equal(core.labelWindow(10, 12), '10 AM to 12 PM');
  assert.equal(core.labelWindow(12, 14), '12 to 2 PM');
  const bump = core.bumpOptions(thu, core.DEFAULT_RULES, '2026-10-22T12:00');
  assert.equal(bump[0].id, '2026-10-22T14:00');
  assert.match(bump[0].label, /2 to 4 PM/);
  assert.equal(bump[1].id, '2026-10-23T08:00');
  assert.equal(core.isWorkDay(core.parseLocal('2026-10-25T12:00')), false);
});

test('mock books, bumps, locks, and reschedules', () => {
  const now = core.parseLocal('2026-10-22T09:05');
  const mock = createMock({ now, nowKey: 'case-a', fresh: true });
  const open = mock.handle('GET', '/api/availability', null, {}).body.days.flatMap((d) => d.windows).find((w) => w.state === 'open');
  assert.equal(open.id, '2026-10-24T08:00');
  const booked = mock.handle('POST', '/api/bookings', {
    service: 'mobile-repair', vehicle: 'tan pickup', windowId: open.id, location: 'Bozeman driveway',
    name: 'Casey Brooks', phone: '4065550142', email: '', smsConsent: false, website: '',
  }, {});
  assert.equal(booked.status, 201);
  assert.equal(booked.body.ok, true);
  const login = mock.handle('POST', '/api/fleet/login', { fleetId: 'demo', pin: '1111' }, {});
  assert.equal(login.status, 200);
  const token = login.body.token;
  const bumped = mock.handle('POST', '/api/fleet/bookings', {
    windowId: open.id, service: 'fleet-maintenance', unit: '12', location: 'yard',
    details: 'no crank', contactName: 'Pat', contactPhone: '4065550160', override: true,
  }, { Authorization: `Bearer ${token}` });
  assert.equal(bumped.status, 201);
  const drafts = mock.state.outbox.filter((row) => row.kind === 'FLEET_OVERRIDE' || row.kind === 'BUMP');
  assert.equal(drafts.length, 2);
  const link = drafts.find((row) => row.kind === 'BUMP').text;
  const tokenMatch = link.match(/[?&]t=([^&\s]+)/);
  assert.ok(tokenMatch);
  const view = mock.handle('GET', `/api/reschedule?t=${tokenMatch[1]}`, null, {});
  assert.equal(view.body.state, 'open');
  assert.equal(view.body.options.length, 2);
  const picked = mock.handle('POST', '/api/reschedule', { token: tokenMatch[1], windowId: view.body.options[0].id }, {});
  assert.equal(picked.status, 200);
  assert.equal(picked.body.state, 'done');
  assert.ok(mock.state.outbox.some((row) => row.kind === 'RESCHEDULED'));
  const again = mock.handle('POST', '/api/reschedule', { token: tokenMatch[1], windowId: view.body.options[1].id }, {});
  assert.equal(again.status, 410);
  const bad = createMock({ now, nowKey: 'case-b', fresh: true });
  for (let i = 0; i < 4; i += 1) assert.equal(bad.handle('POST', '/api/fleet/login', { fleetId: 'demo', pin: '0000' }, {}).status, 401);
  const locked = bad.handle('POST', '/api/fleet/login', { fleetId: 'demo', pin: '0000' }, {});
  assert.equal(locked.status, 429);
  assert.equal(locked.body.retryAfter, 15);
});

function dom(file) {
  const html = readFileSync(join(docs, file), 'utf8');
  const { document } = parseHTML(html);
  document.hidden = false;
  return document;
}

test('schedule request mode never says booked', async () => {
  const doc = dom('schedule/index.html');
  await bootSchedule(doc, {
    config: { api: '', phoneE164: SITE.phone.e164, rules: SITE.booking },
    core, now: core.parseLocal('2026-10-22T09:05'), search: '?service=mobile-repair', timers: false,
  });
  assert.equal(doc.getElementById('book-title').textContent, 'Request a time');
  assert.match(doc.getElementById('book-intro').textContent, /Saturday, October 24/);
  const form = doc.getElementById('book-form');
  assert.equal(val(form, 'service'), 'mobile-repair');
  const radio = form.querySelector('input[name="window"]:not([disabled])');
  radio.checked = true;
  form.querySelector('[name="vehicle"]').value = 'tan pickup';
  form.querySelector('[name="location"]').value = 'Bozeman driveway';
  form.querySelector('[name="name"]').value = 'Casey Brooks';
  form.querySelector('[name="phone"]').value = '4065550142';
  form.querySelector('[name="website"]').value = 'http://spam.example';
  form.dispatchEvent(new doc.defaultView.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(doc.getElementById('book-handoff').hidden, true);
  form.querySelector('[name="website"]').value = '';
  form.dispatchEvent(new doc.defaultView.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(doc.getElementById('book-handoff').hidden, false);
  assert.match(doc.getElementById('book-msg').textContent, /Last step: send it to J/);
  assert.equal(doc.getElementById('book-thanks').hidden, true);
  assert.doesNotMatch(doc.body.textContent, /You're booked/);
});

test('live schedule keeps fields on 409 and posts once', async () => {
  const doc = dom('schedule/index.html');
  let posts = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchImpl = async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    if (method === 'GET') {
      return new Response(JSON.stringify({
        ok: true,
        days: [{ date: '2026-10-24', label: 'Saturday, October 24', windows: [{ id: '2026-10-24T08:00', label: '8 to 10 AM', full: 'Saturday, October 24, 8 to 10 AM', state: 'open', start: '2026-10-24T14:00:00.000Z', end: '2026-10-24T16:00:00.000Z' }] }],
      }), { status: 200 });
    }
    posts += 1;
    if (posts === 1) await gate;
    return new Response(JSON.stringify({ ok: false, error: 'window_taken', availability: { days: [] } }), { status: 409 });
  };
  await bootSchedule(doc, {
    config: { api: '/api', phoneE164: SITE.phone.e164, rules: SITE.booking },
    core, now: core.parseLocal('2026-10-22T09:05'), search: '', timers: false, fetchImpl,
  });
  const form = doc.getElementById('book-form');
  setControl(form.querySelector('[name="service"]'), 'diesel-repair');
  form.querySelector('input[name="window"]').checked = true;
  form.querySelector('[name="vehicle"]').value = 'white diesel';
  form.querySelector('[name="location"]').value = 'Belgrade yard';
  form.querySelector('[name="name"]').value = 'Morgan Lee';
  form.querySelector('[name="phone"]').value = '4065550148';
  const event = new doc.defaultView.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  form.dispatchEvent(new doc.defaultView.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(posts, 1);
  release();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(form.querySelector('[name="vehicle"]').value, 'white diesel');
  assert.match(doc.getElementById('book-msg').textContent, /still here/);
});

test('fleet dialog and reschedule fail closed', async () => {
  const now = core.parseLocal('2026-10-22T09:05');
  const mock = createMock({ now, nowKey: 'ui-fleet', fresh: true });
  const fetchImpl = async (url, init = {}) => {
    const result = mock.handle((init.method || 'GET').toUpperCase(), String(url), init.body ? JSON.parse(init.body) : null, init.headers || {});
    return new Response(JSON.stringify(result.body), { status: result.status });
  };
  const doc = dom('fleet-login/index.html');
  await bootFleet(doc, { config: { api: '/api', phoneE164: SITE.phone.e164, rules: SITE.booking }, core, now, search: '', fetchImpl });
  const login = doc.getElementById('fleet-login');
  login.querySelector('[name="fleetId"]').value = 'nope';
  login.querySelector('[name="pin"]').value = '0000';
  login.dispatchEvent(new doc.defaultView.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 10));
  assert.match(doc.getElementById('fleet-msg').textContent, /didn't match/);
  login.querySelector('[name="fleetId"]').value = 'demo';
  login.querySelector('[name="pin"]').value = '1111';
  login.dispatchEvent(new doc.defaultView.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(doc.getElementById('fleet-board').hidden, false);
  const booked = [...doc.querySelectorAll('[data-state="booked"]')][0];
  assert.ok(booked);
  booked.dispatchEvent(new doc.defaultView.Event('click', { bubbles: true }));
  const dialog = doc.getElementById('bump-dialog');
  assert.equal(dialog.hasAttribute('open') || dialog.open, true);
  assert.match(doc.getElementById('bump-copy').textContent, /Are you sure|Another customer has/);
  assert.match(doc.getElementById('bump-copy').textContent, /something came up/);
  doc.getElementById('bump-no').dispatchEvent(new doc.defaultView.Event('click', { bubbles: true }));
  assert.equal(dialog.hasAttribute('open') || dialog.open, false);

  const res = dom('reschedule/index.html');
  await bootReschedule(res, { config: { api: '', phoneE164: SITE.phone.e164, phoneDisplay: SITE.phone.display }, core, now, search: '' });
  assert.match(res.getElementById('reschedule-view').textContent, /Call or text J/);
});
