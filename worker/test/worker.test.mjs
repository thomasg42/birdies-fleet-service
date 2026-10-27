// Runs the real Worker against a real SQLite database (node:sqlite) shaped like D1.
// node --test worker/test/worker.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { deliverPending } from '../src/index.mjs';

// Minimal D1: prepare/bind/first/all/run plus batch() as one transaction.
function d1(db) {
  const clean = (args) => args.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, clean(a)),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
    exec: () => (/^\s*select/i.test(sql) ? db.prepare(sql).all(...args) : db.prepare(sql).run(...args)),
  });
  return {
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      db.exec('BEGIN');
      try {
        const out = list.map((s) => s.exec());
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

function setup(extra = {}) {
  const raw = new DatabaseSync(':memory:');
  raw.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const env = {
    DB: d1(raw),
    TEST_CLOCK: '1',
    SITE_URL: 'https://thomasg42.github.io/birdies-fleet-service',
    ALLOWED_ORIGINS: 'https://thomasg42.github.io',
    ADMIN_KEY: 'test-admin-key',
    OWNER_NAME: 'Jay',
    ...extra,
  };
  const waits = [];
  const call = async (method, path, { body, token, now = '2026-10-22T09:05', origin, ip = '203.0.113.9' } = {}) => {
    const headers = { 'X-Test-Now': now, 'CF-Connecting-IP': ip };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (origin) headers.Origin = origin;
    const req = new Request(`https://birdies-booking.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await worker.fetch(req, env, { waitUntil: (p) => waits.push(p) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  };
  const rows = (sql, ...args) => raw.prepare(sql).all(...args);
  return { env, call, rows, waits };
}

const customer = (windowId, extra = {}) => ({
  service: 'mobile-repair',
  serviceItem: 'Brakes',
  vehicle: '2016 diesel pickup',
  windowId,
  location: 'Hyalite Canyon Rd pullout',
  name: 'Sam Lee',
  phone: '406-555-0100',
  email: 'sam@example.com',
  smsConsent: true,
  website: '',
  ...extra,
});

async function fleetLogin(t, id = 'acme', name = 'Acme Fleet', pin = '4821') {
  const made = await t.call('POST', '/admin/fleet-accounts', { token: 'test-admin-key', body: { id, name, pin } });
  assert.equal(made.status, 200);
  const res = await t.call('POST', '/fleet/login', { body: { fleetId: id, pin } });
  assert.equal(res.status, 200);
  return res.body.token;
}

const windowState = (days, id) => days.flatMap((d) => d.windows).find((w) => w.id === id)?.state;

test('availability: Thursday morning opens on Monday 8 AM (Mon to Fri), all open', async () => {
  const t = setup();
  const res = await t.call('GET', '/availability');
  assert.equal(res.status, 200);
  assert.equal(res.body.earliestPublicStart, '2026-10-26T08:00:00-06:00');
  assert.equal(res.body.days[0].date, '2026-10-26');
  assert.ok(res.body.days.every((d) => d.windows.every((w) => w.state === 'open')));
});

test('availability crosses the Nov 1 clock change correctly', async () => {
  const t = setup();
  const res = await t.call('GET', '/availability', { now: '2026-10-29T09:05' });
  const monday = res.body.days.find((d) => d.date === '2026-11-02');
  assert.equal(monday.windows[0].start, '2026-11-02T08:00:00-07:00');
});

test('public booking: first wins, second gets 409 with fresh availability, J gets a draft', async () => {
  const t = setup();
  const first = await t.call('POST', '/bookings', { body: customer('2026-10-26T08:00') });
  assert.equal(first.status, 201);
  assert.equal(first.body.booking.windowId, '2026-10-26T08:00');
  const second = await t.call('POST', '/bookings', { body: customer('2026-10-26T08:00', { name: 'Pat Doe' }) });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'window_taken');
  assert.equal(windowState(second.body.availability.days, '2026-10-26T08:00'), 'booked');
  const box = t.rows('SELECT kind, to_role, text FROM outbox');
  assert.equal(box.length, 1);
  assert.equal(box[0].kind, 'NEW_BOOKING');
  assert.match(box[0].text, /Sam Lee/);
});

test('two customers grabbing the same window at the same moment: exactly one wins', async () => {
  const t = setup();
  const results = await Promise.all([
    t.call('POST', '/bookings', { body: customer('2026-10-26T10:00', { name: 'A One' }), ip: '198.51.100.1' }),
    t.call('POST', '/bookings', { body: customer('2026-10-26T10:00', { name: 'B Two' }), ip: '198.51.100.2' }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(t.rows("SELECT COUNT(*) AS n FROM bookings WHERE window_id = '2026-10-26T10:00'")[0].n, 1);
});

test('public cannot book today or tomorrow; honeypot and bad input are refused', async () => {
  const t = setup();
  const soon = await t.call('POST', '/bookings', { body: customer('2026-10-23T10:00') });
  assert.equal(soon.status, 409);
  const bot = await t.call('POST', '/bookings', { body: customer('2026-10-26T12:00', { website: 'spam.example' }) });
  assert.deepEqual(bot.body, { ok: true, ignored: true });
  const bad = await t.call('POST', '/bookings', { body: customer('2026-10-26T12:00', { phone: 'abc', vehicle: '' }) });
  assert.equal(bad.status, 422);
  assert.ok(bad.body.fields.phone && bad.body.fields.vehicle);
  assert.equal(t.rows('SELECT COUNT(*) AS n FROM bookings')[0].n, 0);
});

test('fleet login: wrong PIN 401, five wrong PINs lock for 15 minutes, right PIN works', async () => {
  const t = setup();
  await t.call('POST', '/admin/fleet-accounts', { token: 'test-admin-key', body: { id: 'acme', name: 'Acme Fleet', pin: '4821' } });
  const wrong = await t.call('POST', '/fleet/login', { body: { fleetId: 'acme', pin: '0000' } });
  assert.equal(wrong.status, 401);
  for (let i = 0; i < 3; i++) await t.call('POST', '/fleet/login', { body: { fleetId: 'acme', pin: '0000' } });
  const fifth = await t.call('POST', '/fleet/login', { body: { fleetId: 'acme', pin: '0000' } });
  assert.equal(fifth.status, 429);
  assert.equal(fifth.body.retryAfter, 15);
  const evenRight = await t.call('POST', '/fleet/login', { body: { fleetId: 'acme', pin: '4821' } });
  assert.equal(evenRight.status, 429);
  const other = await fleetLogin(t, 'northwind', 'Northwind Ranch', '7310');
  assert.ok(other);
  assert.equal(t.rows("SELECT COUNT(*) AS n FROM fleet_accounts WHERE pin_hash LIKE '%4821%'")[0].n, 0);
});

test('fleet board shows open, booked, yours, fleet and blocked; anonymous gets 401', async () => {
  const t = setup();
  await t.call('POST', '/bookings', { body: customer('2026-10-26T08:00') });
  const acme = await fleetLogin(t);
  const north = await fleetLogin(t, 'northwind', 'Northwind Ranch', '7310');
  await t.call('POST', '/fleet/bookings', { token: north, body: { windowId: '2026-10-23T08:00', service: 'fleet-maintenance', unit: 'Feed truck', location: 'Ranch yard', contactName: 'Kim', contactPhone: '406-555-0177' } });
  await t.call('POST', '/fleet/bookings', { token: acme, body: { windowId: '2026-10-23T10:00', service: 'dot-inspections', unit: 'Truck 12', location: 'Shop', contactName: 'Lou', contactPhone: '406-555-0123' } });
  await t.call('POST', '/admin/blocks', { token: 'test-admin-key', body: { windowId: '2026-10-22T14:00' } });
  const res = await t.call('GET', '/fleet/windows', { token: acme });
  assert.equal(res.status, 200);
  assert.equal(res.body.accountName, 'Acme Fleet');
  const days = res.body.windows;
  assert.equal(windowState(days, '2026-10-22T10:00'), undefined, '55 minutes out: inside the one-hour notice');
  assert.equal(windowState(days, '2026-10-22T12:00'), 'open', 'same day is fine with an hour of notice');
  assert.equal(windowState(days, '2026-10-26T08:00'), 'booked');
  assert.equal(windowState(days, '2026-10-23T08:00'), 'fleet');
  assert.equal(windowState(days, '2026-10-23T10:00'), 'yours');
  assert.equal(windowState(days, '2026-10-22T14:00'), 'blocked');
  assert.equal((await t.call('GET', '/fleet/windows')).status, 401);
  const blocked = await t.call('POST', '/fleet/bookings', { token: acme, body: { windowId: '2026-10-22T14:00', service: 'fleet-maintenance', unit: 'Truck 3', location: 'Yard', contactName: 'Lou', contactPhone: '406-555-0123' } });
  assert.equal(blocked.body.reason, 'blocked');
  const theirs = await t.call('POST', '/fleet/bookings', { token: acme, body: { windowId: '2026-10-23T08:00', service: 'fleet-maintenance', unit: 'Truck 3', location: 'Yard', contactName: 'Lou', contactPhone: '406-555-0123' } });
  assert.equal(theirs.body.reason, 'fleet');
});

test('the full bump story: confirm, bump, link, callback, reschedule, link used up', async () => {
  const t = setup();
  await t.call('POST', '/bookings', { body: customer('2026-10-26T08:00') });
  const acme = await fleetLogin(t);
  const job = { windowId: '2026-10-26T08:00', service: 'fleet-maintenance', unit: 'Truck 12', location: 'Belgrade yard', contactName: 'Lou', contactPhone: '406-555-0123' };

  const ask = await t.call('POST', '/fleet/bookings', { token: acme, body: job });
  assert.equal(ask.status, 409);
  assert.equal(ask.body.error, 'override_required');

  const take = await t.call('POST', '/fleet/bookings', { token: acme, body: { ...job, override: true } });
  assert.equal(take.status, 201);
  assert.deepEqual(t.rows('SELECT holder, status FROM bookings ORDER BY created_at').map((r) => r.status).sort(), ['active', 'bumped']);
  assert.equal(t.rows("SELECT holder FROM slots WHERE window_id = '2026-10-26T08:00'")[0].holder, 'fleet');

  const box = t.rows("SELECT kind, to_role, to_phone, sms_ok, text FROM outbox WHERE kind IN ('FLEET_OVERRIDE', 'BUMP')");
  assert.deepEqual(box.map((r) => r.kind).sort(), ['BUMP', 'FLEET_OVERRIDE']);
  // Jay hears twice, in order: the emergency, then who got moved; the customer's message comes last.
  const toJay = t.rows("SELECT kind, text, event FROM outbox WHERE kind IN ('FLEET_OVERRIDE', 'BUMP_NOTICE', 'BUMP') ORDER BY id");
  assert.deepEqual(toJay.map((r) => r.kind), ['FLEET_OVERRIDE', 'BUMP_NOTICE', 'BUMP']);
  assert.match(toJay[0].text, /^Birdie's fleet EMERGENCY: Acme Fleet skipped the line for Monday, October 26, 8 to 10 AM\. On site: Lou 406-555-0123\. Unit: Truck 12\. Where: Belgrade yard\./);
  assert.match(toJay[1].text, /^Birdie's: Acme Fleet bumped Sam Lee 406-555-0100 from Monday, October 26, 8 to 10 AM\. We're emailing them the next openings \(.+\) with a link to pick one\. Call them if you like\.$/);
  // Calendar: the fleet job goes on, tagged with its id, and the customer's entry is named for removal.
  const custId = t.rows("SELECT id FROM bookings WHERE holder = 'public' AND status = 'bumped'")[0].id;
  const fleetId = t.rows("SELECT id FROM bookings WHERE holder = 'fleet'")[0].id;
  assert.equal(JSON.parse(t.rows("SELECT event FROM outbox WHERE kind = 'NEW_BOOKING'")[0].event).bookingId, custId);
  const swap = JSON.parse(toJay[0].event);
  assert.equal(swap.bookingId, fleetId);
  assert.equal(swap.cancelBookingId, custId);
  assert.equal(swap.start, '2026-10-26T08:00:00-06:00');
  assert.match(swap.title, /EMERGENCY: Acme Fleet/);
  assert.equal(toJay[1].event, null, 'the notice is email only');
  const bump = box.find((r) => r.kind === 'BUMP');
  assert.equal(bump.to_role, 'customer');
  assert.equal(bump.to_phone, '406-555-0100');
  assert.equal(bump.sms_ok, 1);
  assert.match(bump.text, /Something came up and Jay needs to move your Monday, October 26, 8 to 10 AM appointment/);
  const link = bump.text.match(/https:\/\/thomasg42\.github\.io\/birdies-fleet-service\/reschedule\/\?t=(\S+)$/);
  assert.ok(link, bump.text);
  const token = decodeURIComponent(link[1]);
  assert.equal(t.rows('SELECT COUNT(*) AS n FROM reschedules WHERE token_hash = ?', token)[0].n, 0, 'raw token is never stored');

  const open = await t.call('GET', `/reschedule?t=${encodeURIComponent(token)}`);
  assert.equal(open.status, 200);
  assert.equal(open.body.firstName, 'Sam');
  assert.equal(open.body.original.label, 'Monday, October 26, 8 to 10 AM');
  assert.equal(open.body.options.length, 2);
  assert.equal(open.body.options[0].id, '2026-10-22T12:00', 'later today is offered (public lock does not apply)');

  const wait = await t.call('POST', '/reschedule', { body: { token, choice: 'callback' } });
  assert.deepEqual(wait.body, { ok: true, state: 'callback' });
  assert.match(t.rows("SELECT text FROM outbox WHERE kind = 'CALLBACK'")[0].text, /Sam will wait for your call.*406-555-0100/);
  assert.equal((await t.call('GET', `/reschedule?t=${encodeURIComponent(token)}`)).status, 200, 'callback keeps the link alive');

  const pick = await t.call('POST', '/reschedule', { body: { token, windowId: open.body.options[1].id } });
  assert.equal(pick.status, 200);
  assert.equal(pick.body.state, 'done');
  assert.match(t.rows("SELECT text FROM outbox WHERE kind = 'RESCHEDULED'")[0].text, /Sam Lee moved from Monday, October 26, 8 to 10 AM to/);
  const movedId = t.rows("SELECT id FROM bookings WHERE rescheduled_from = ?", custId)[0].id;
  assert.equal(JSON.parse(t.rows("SELECT event FROM outbox WHERE kind = 'RESCHEDULED'")[0].event).bookingId, movedId);
  assert.equal(t.rows("SELECT COUNT(*) AS n FROM bookings WHERE status = 'active' AND holder = 'public'")[0].n, 1);

  const again = await t.call('POST', '/reschedule', { body: { token, windowId: open.body.more[0].id } });
  assert.equal(again.status, 410);
  assert.equal((await t.call('GET', '/reschedule?t=nope')).status, 404);
});

test('reschedule pick on a window someone else just took: 409 with fresh choices', async () => {
  const t = setup();
  await t.call('POST', '/bookings', { body: customer('2026-10-26T08:00') });
  const acme = await fleetLogin(t);
  await t.call('POST', '/fleet/bookings', { token: acme, body: { windowId: '2026-10-26T08:00', service: 'fleet-maintenance', unit: 'Truck 12', location: 'Yard', contactName: 'Lou', contactPhone: '406-555-0123', override: true } });
  const token = decodeURIComponent(t.rows("SELECT text FROM outbox WHERE kind = 'BUMP'")[0].text.match(/\?t=(\S+)$/)[1]);
  const open = await t.call('GET', `/reschedule?t=${encodeURIComponent(token)}`);
  const target = open.body.options[0].id;
  await t.call('POST', '/fleet/bookings', { token: acme, body: { windowId: target, service: 'fleet-maintenance', unit: 'Truck 9', location: 'Yard', contactName: 'Lou', contactPhone: '406-555-0123' } });
  const lost = await t.call('POST', '/reschedule', { body: { token, windowId: target } });
  assert.equal(lost.status, 409);
  assert.equal(lost.body.error, 'window_taken');
  assert.ok(lost.body.options.every((o) => o.id !== target));
});

test('CORS: the site origin gets headers, a stranger does not', async () => {
  const t = setup();
  const pre = await t.call('OPTIONS', '/bookings', { origin: 'https://thomasg42.github.io' });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), 'https://thomasg42.github.io');
  assert.match(pre.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  const stranger = await t.call('GET', '/availability', { origin: 'https://evil.example' });
  assert.equal(stranger.headers.get('Access-Control-Allow-Origin'), null);
});

test('admin routes need the admin key', async () => {
  const t = setup();
  assert.equal((await t.call('GET', '/admin/outbox')).status, 401);
  assert.equal((await t.call('GET', '/admin/outbox', { token: 'wrong' })).status, 401);
  assert.equal((await t.call('GET', '/admin/outbox', { token: 'test-admin-key' })).status, 200);
});

test('notifications: dry run sends nothing; with a webhook every draft is delivered once', async () => {
  const dry = setup();
  await dry.call('POST', '/bookings', { body: customer('2026-10-26T08:00') });
  await Promise.all(dry.waits);
  assert.equal(dry.rows('SELECT COUNT(*) AS n FROM outbox WHERE delivered_at IS NULL')[0].n, 1, 'dry run keeps it waiting');

  const t = setup({ NOTIFY_WEBHOOK: 'https://n8n.example/webhook/birdies', NOTIFY_SECRET: 'shh' });
  const sent = [];
  const fakeFetch = async (url, init) => {
    sent.push({ url, secret: init.headers['X-Birdies-Secret'], body: JSON.parse(init.body) });
    return new Response('{}', { status: 200 });
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch; // the Worker delivers in the background right after the POST
  try {
    await t.call('POST', '/bookings', { body: customer('2026-10-26T08:00') });
    await Promise.all(t.waits);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(sent.length, 1);
  assert.equal(t.rows('SELECT COUNT(*) AS n FROM outbox WHERE delivered_at IS NOT NULL')[0].n, 1);
  assert.equal(await deliverPending(t.env, fakeFetch), 0, 'never sent twice');
  assert.equal(sent[0].secret, 'shh');
  assert.equal(sent[0].body.kind, 'NEW_BOOKING');
  assert.equal(sent[0].body.to.role, 'owner');
  assert.equal(sent[0].body.event.start, '2026-10-26T08:00:00-06:00', 'calendar start rides along');
  assert.match(sent[0].body.event.title, /^Birdie's: /);
  assert.match(sent[0].body.event.bookingId, /^bk_/, 'the calendar entry carries its booking id');
});

test('fleet can book later the same day with an hour of notice, not less', async () => {
  const t = setup();
  const acme = await fleetLogin(t);
  const job = { service: 'fleet-maintenance', unit: 'Truck 7', location: 'Shop', contactName: 'Lou', contactPhone: '406-555-0123' };
  const tooSoon = await t.call('POST', '/fleet/bookings', { token: acme, now: '2026-10-22T09:05', body: { ...job, windowId: '2026-10-22T10:00' } });
  assert.equal(tooSoon.status, 409);
  assert.equal(tooSoon.body.reason, 'closed');
  const onTime = await t.call('POST', '/fleet/bookings', { token: acme, now: '2026-10-22T09:00', body: { ...job, windowId: '2026-10-22T10:00' } });
  assert.equal(onTime.status, 201);
});

test('bumping a customer who left no email tells Jay to text them', async () => {
  const t = setup();
  await t.call('POST', '/bookings', { body: customer('2026-10-26T08:00', { email: '' }) });
  const acme = await fleetLogin(t);
  const take = await t.call('POST', '/fleet/bookings', { token: acme, body: { windowId: '2026-10-26T08:00', service: 'fleet-maintenance', unit: 'Truck 12', location: 'Belgrade yard', contactName: 'Lou', contactPhone: '406-555-0123', override: true } });
  assert.equal(take.status, 201);
  const notice = t.rows("SELECT text FROM outbox WHERE kind = 'BUMP_NOTICE'")[0].text;
  assert.match(notice, /They left no email, so text them the message in the next email\. Call them if you like\.$/);
  const bump = t.rows("SELECT to_role, to_email FROM outbox WHERE kind = 'BUMP'")[0];
  assert.equal(bump.to_role, 'customer');
  assert.equal(bump.to_email, null);
});

test("Jay's fleet list: owner PIN, add, new PIN, turn off and on", async () => {
  const unset = setup();
  assert.equal((await unset.call('POST', '/owner/login', { body: { pin: '246810' } })).status, 503, 'no OWNER_PIN, no owner page');

  const t = setup({ OWNER_PIN: '246810' });
  assert.equal((await t.call('POST', '/owner/login', { body: { pin: '111111' } })).status, 401);
  assert.equal((await t.call('GET', '/owner/fleet')).status, 401);
  const acme = await fleetLogin(t);
  assert.equal((await t.call('GET', '/owner/fleet', { token: acme })).status, 401, 'a fleet login is not the owner');

  const signIn = await t.call('POST', '/owner/login', { body: { pin: '246810' } });
  assert.equal(signIn.status, 200);
  const owner = signIn.body.token;
  assert.equal((await t.call('GET', '/fleet/windows', { token: owner })).status, 401, 'the owner token is not a fleet login');

  const noPin = await t.call('POST', '/owner/fleet', { token: owner, body: { id: 'demo-fleet', name: 'Demo Fleet' } });
  assert.equal(noPin.status, 422, 'a new fleet client needs a PIN');
  assert.ok(noPin.body.fields.pin);
  const added = await t.call('POST', '/owner/fleet', { token: owner, body: { id: 'demo-fleet', name: 'Demo Fleet', pin: '1357' } });
  assert.deepEqual(added.body, { ok: true, id: 'demo-fleet', name: 'Demo Fleet', active: true });
  const list = await t.call('GET', '/owner/fleet', { token: owner });
  assert.deepEqual(list.body.accounts.map((a) => [a.id, a.active]), [['acme', true], ['demo-fleet', true]]);
  assert.equal(JSON.stringify(list.body).includes('pin'), false, 'PIN hashes never leave the server');

  const demo = await t.call('POST', '/fleet/login', { body: { fleetId: 'demo-fleet', pin: '1357' } });
  assert.equal(demo.status, 200);
  const renewed = await t.call('POST', '/owner/fleet', { token: owner, body: { id: 'demo-fleet', name: 'Demo Fleet', pin: '2468' } });
  assert.equal(renewed.status, 200);
  assert.equal((await t.call('GET', '/fleet/windows', { token: demo.body.token })).status, 401, 'a new PIN signs them out');
  assert.equal((await t.call('POST', '/fleet/login', { body: { fleetId: 'demo-fleet', pin: '1357' } })).status, 401);
  const again = await t.call('POST', '/fleet/login', { body: { fleetId: 'demo-fleet', pin: '2468' } });
  assert.equal(again.status, 200);

  const off = await t.call('POST', '/owner/fleet', { token: owner, body: { id: 'demo-fleet', name: 'Demo Fleet', active: false } });
  assert.equal(off.body.active, false);
  assert.equal((await t.call('GET', '/fleet/windows', { token: again.body.token })).status, 401, 'turning off signs them out');
  assert.equal((await t.call('POST', '/fleet/login', { body: { fleetId: 'demo-fleet', pin: '2468' } })).status, 401);
  const on = await t.call('POST', '/owner/fleet', { token: owner, body: { id: 'demo-fleet', name: 'Demo Fleet', active: true } });
  assert.equal(on.body.active, true);
  assert.equal((await t.call('POST', '/fleet/login', { body: { fleetId: 'demo-fleet', pin: '2468' } })).status, 200, 'back on with the same PIN');

  for (let i = 0; i < 4; i++) assert.equal((await t.call('POST', '/owner/login', { body: { pin: '000000' } })).status, 401);
  const fifth = await t.call('POST', '/owner/login', { body: { pin: '000000' } });
  assert.equal(fifth.status, 429, 'five wrong owner PINs lock it for 15 minutes');
  assert.equal((await t.call('POST', '/owner/login', { body: { pin: '246810' } })).status, 429, 'even the right PIN waits out the lock');
  assert.equal((await t.call('POST', '/fleet/login', { body: { fleetId: 'demo-fleet', pin: '2468' } })).status, 200, 'the owner lock does not lock fleet clients');
});
