// Birdie's booking backend: one Cloudflare Worker plus a D1 database.
// It implements BOOKING-API-CONTRACT.md, the contract the site's pages already call.
// Booking rules, Denver time math, labels and message drafts come from birdies-core.js
// (through site.config.mjs), so the site and the backend can never disagree about a window.
import { SITE } from '../../site.config.mjs';
import {
  publicWindows,
  fleetWindows,
  generateWindows,
  bumpOptions,
  bumpDrafts,
  rescheduledDraft,
  newBookingDraft,
  validateBooking,
  validateFleetBooking,
  validateLead,
  firstName,
  parseLocal,
} from '../../src/assets/birdies-core.js';

const { api: _api, ...RULES } = SITE.booking;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SESSION_MS = 12 * HOUR_MS;
const RESCHEDULE_MS = 72 * HOUR_MS;
const LOCK_MS = 15 * 60 * 1000;
const PBKDF2_ITERATIONS = 100000; // the most Workers allow
const MAX_BODY = 20000;

// ---------- helpers ----------

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
const uid = (prefix) => `${prefix}_${randomToken().slice(0, 16)}`;
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const nil = (v) => (v === undefined || v === null || v === '' ? null : v);

async function sha256(text) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text))));
}

async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return b64url(new Uint8Array(bits));
}

function sameString(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Only a lost race counts as a conflict: a taken slot (UNIQUE) or a tripped guard (x = 0).
// Anything else (a NOT NULL slip, a typo) must surface as a 500, never pose as "taken".
const isConflict = (err) => /UNIQUE constraint failed|CHECK constraint failed: x ?= ?0/i.test(String(err && err.message));

// The clock is real time, except in tests (TEST_CLOCK=1) where X-Test-Now or ?now= pins it.
function clock(request, env) {
  if (env.TEST_CLOCK === '1') {
    const pinned = request.headers.get('X-Test-Now') || new URL(request.url).searchParams.get('now');
    if (pinned) return parseLocal(pinned);
  }
  return new Date();
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  const local = env.ALLOW_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!origin || !(allowed.includes(origin) || local)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function overLimit(db, key, max, windowMs) {
  const now = Date.now();
  const row = await db.prepare('SELECT count, reset_at FROM hits WHERE key = ?').bind(key).first();
  if (!row || row.reset_at <= now) {
    await db
      .prepare('INSERT INTO hits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at')
      .bind(key, now + windowMs)
      .run();
    return false;
  }
  if (row.count >= max) return true;
  await db.prepare('UPDATE hits SET count = count + 1 WHERE key = ?').bind(key).run();
  return false;
}

// ---------- windows and slots ----------

const slim = (w) => ({ id: w.id, start: w.start, end: w.end, label: w.label, full: w.full, date: w.date, dayLabel: w.dayLabel });

function shapeDays(windows) {
  const days = [];
  const byDate = new Map();
  for (const w of windows) {
    if (!byDate.has(w.date)) {
      const day = { date: w.date, label: w.dayLabel, windows: [] };
      byDate.set(w.date, day);
      days.push(day);
    }
    byDate.get(w.date).windows.push({
      id: w.id,
      start: w.start,
      end: w.end,
      label: w.label,
      full: w.full,
      state: w.state,
      bookedLabel: w.bookedLabel || '',
    });
  }
  return days;
}

async function slotMap(db, wins) {
  if (!wins.length) return new Map();
  const { results } = await db
    .prepare(
      `SELECT s.window_id, s.holder, s.booking_id, b.fleet_id, b.name, b.phone, b.email, b.sms_consent, b.full_label
       FROM slots s LEFT JOIN bookings b ON b.id = s.booking_id
       WHERE s.window_id BETWEEN ? AND ?`,
    )
    .bind(wins[0].id, wins[wins.length - 1].id)
    .all();
  return new Map(results.map((r) => [r.window_id, r]));
}

function fleetState(slot, fleetId) {
  if (!slot) return 'open';
  if (slot.holder === 'block') return 'blocked';
  if (slot.holder === 'fleet') return slot.fleet_id === fleetId ? 'yours' : 'fleet';
  return 'booked';
}

async function availability(db, now) {
  const wins = publicWindows(now, RULES);
  const slots = await slotMap(db, wins);
  const marked = wins.map((w) => ({ ...w, state: slots.has(w.id) ? 'booked' : 'open' }));
  return { ok: true, timezone: 'America/Denver', earliestPublicStart: marked[0] ? marked[0].start : null, days: shapeDays(marked) };
}

async function board(db, now, fleetId) {
  const wins = fleetWindows(now, RULES);
  const slots = await slotMap(db, wins);
  return shapeDays(
    wins.map((w) => {
      const state = fleetState(slots.get(w.id), fleetId);
      return { ...w, state, bookedLabel: state === 'booked' ? w.full : '' };
    }),
  );
}

// Window ids held from now through the horizon (the bump options must skip them).
async function occupiedIds(db, now) {
  const span = generateWindows(now, new Date(now.getTime() + ((RULES.horizonDays ?? 21) + 1) * DAY_MS), RULES);
  if (!span.length) return [];
  const { results } = await db.prepare('SELECT window_id FROM slots WHERE window_id BETWEEN ? AND ?').bind(span[0].id, span[span.length - 1].id).all();
  return results.map((r) => r.window_id);
}

function moreOptions(now, takenId, occupied, chosen) {
  const earliest = new Date(now.getTime() + (RULES.bumpLeadHours ?? 2) * HOUR_MS);
  const end = new Date(now.getTime() + (RULES.horizonDays ?? 21) * DAY_MS);
  const skip = new Set([takenId, ...occupied, ...chosen.map((o) => o.id)]);
  return generateWindows(earliest, end, RULES).filter((w) => !skip.has(w.id)).slice(0, 8);
}

// ---------- statements ----------

const BOOKING_COLS = [
  'id', 'window_id', 'holder', 'fleet_id', 'status', 'name', 'phone', 'email', 'sms_consent', 'service', 'service_item',
  'description', 'vehicle', 'location', 'lat', 'lng', 'details', 'full_label', 'start_at', 'end_at', 'created_at', 'ip',
  'rescheduled_from',
];

function insertBooking(db, row) {
  return db
    .prepare(`INSERT INTO bookings (${BOOKING_COLS.join(', ')}) VALUES (${BOOKING_COLS.map(() => '?').join(', ')})`)
    .bind(
      ...BOOKING_COLS.map((c) => {
        const v = row[c];
        if (v !== undefined && v !== null) return v;
        if (c === 'sms_consent') return 0;
        if (c === 'status') return 'active';
        return null;
      }),
    );
}

const guard = (db) => db.prepare('INSERT INTO guard (x) SELECT 1 WHERE changes() = 0');

function owner(env) {
  return { role: 'owner', name: env.OWNER_NAME || 'Jay', phone: nil(env.OWNER_PHONE), email: nil(env.OWNER_EMAIL), smsOk: true };
}

// event: optional { start, end, title, where, bookingId, cancelBookingId } so the webhook can put the job on
// Jay's calendar (tagged with bookingId) and take a bumped booking's entry off it (cancelBookingId).
function outbox(db, draft, to, nowIso, event = null) {
  return db
    .prepare('INSERT INTO outbox (kind, to_role, to_name, to_phone, to_email, sms_ok, text, created_at, event) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(draft.kind, to.role, nil(to.name), nil(to.phone), nil(to.email), to.smsOk ? 1 : 0, draft.text, nowIso, event ? JSON.stringify(event) : null);
}

function rescheduleUrl(env, token) {
  return `${String(env.SITE_URL || '').replace(/\/$/, '')}/reschedule/?t=${encodeURIComponent(token)}`;
}

// ---------- routes ----------

async function bookPublic(env, now, body, ip) {
  if (body.website || body.fax) return json(200, { ok: true, ignored: true });
  if (await overLimit(env.DB, `book:${ip}`, 12, DAY_MS)) return json(429, { ok: false, error: 'rate_limited' });
  const errs = validateBooking(body);
  if (Object.keys(errs).length) return json(422, { ok: false, error: 'invalid', fields: errs });
  const win = publicWindows(now, RULES).find((w) => w.id === body.windowId);
  if (!win) return json(409, { ok: false, error: 'window_taken', availability: await availability(env.DB, now) });
  const nowIso = new Date().toISOString();
  const row = {
    id: uid('bk'),
    window_id: win.id,
    holder: 'public',
    status: 'active',
    name: str(body.name, 120),
    phone: str(body.phone, 40),
    email: nil(str(body.email, 200)),
    sms_consent: body.smsConsent ? 1 : 0,
    service: str(body.service, 60),
    service_item: nil(str(body.serviceItem, 120)),
    description: nil(str(body.description, 2000)),
    vehicle: str(body.vehicle, 200),
    location: str(body.location, 300),
    lat: nil(str(body.lat, 30)),
    lng: nil(str(body.lng, 30)),
    full_label: win.full,
    start_at: win.start,
    end_at: win.end,
    created_at: nowIso,
    ip,
  };
  const draft = newBookingDraft({ who: 'A customer', label: win.full, name: row.name, phone: row.phone, where: row.location });
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO slots (window_id, booking_id, holder) VALUES (?, ?, 'public')").bind(win.id, row.id),
      insertBooking(env.DB, row),
      outbox(env.DB, draft, owner(env), nowIso, { start: win.start, end: win.end, title: `Birdie's: ${row.name}`, where: row.location, bookingId: row.id }),
    ]);
  } catch (err) {
    if (isConflict(err)) return json(409, { ok: false, error: 'window_taken', availability: await availability(env.DB, now) });
    throw err;
  }
  return json(201, { ok: true, booking: { id: row.id, label: win.full, full: win.full, start: win.start, end: win.end, windowId: win.id } });
}

async function login(env, body, ip) {
  const fleetId = str(body.fleetId, 60).toLowerCase();
  const pin = str(body.pin, 12);
  const now = Date.now();
  if (await overLimit(env.DB, `login:${ip}`, 30, HOUR_MS)) return json(429, { ok: false, error: 'locked', retryAfter: 60 });
  const fails = await env.DB.prepare('SELECT count, locked_until FROM login_fails WHERE fleet_id = ?').bind(fleetId || '(blank)').first();
  if (fails && fails.locked_until > now) {
    return json(429, { ok: false, error: 'locked', retryAfter: Math.max(1, Math.ceil((fails.locked_until - now) / 60000)) });
  }
  const acct = fleetId && pin
    ? await env.DB.prepare('SELECT id, name, pin_salt, pin_hash FROM fleet_accounts WHERE id = ? AND active = 1').bind(fleetId).first()
    : null;
  // Hash even when the account is unknown, so response time doesn't reveal which Fleet IDs exist.
  const hashed = await pinHash(pin || '-', acct ? acct.pin_salt : 'no-such-account');
  if (!acct || !sameString(hashed, acct.pin_hash)) return failedLogin(env.DB, fleetId || '(blank)', fails, now);
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_fails WHERE fleet_id = ?').bind(fleetId),
    env.DB.prepare('INSERT INTO sessions (token_hash, fleet_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), acct.id, now + SESSION_MS),
  ]);
  return json(200, { ok: true, token, accountName: acct.name });
}

// Five wrong PINs in a row lock that login for 15 minutes.
async function failedLogin(db, key, fails, now) {
  const expired = fails && fails.locked_until && fails.locked_until <= now;
  const count = (fails && !expired ? fails.count : 0) + 1;
  const lockedUntil = count >= 5 ? now + LOCK_MS : 0;
  await db
    .prepare('INSERT INTO login_fails (fleet_id, count, locked_until) VALUES (?, ?, ?) ON CONFLICT(fleet_id) DO UPDATE SET count = excluded.count, locked_until = excluded.locked_until')
    .bind(key, count, lockedUntil)
    .run();
  return lockedUntil ? json(429, { ok: false, error: 'locked', retryAfter: 15 }) : json(401, { ok: false, error: 'bad_login' });
}

async function session(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const row = await env.DB
    .prepare('SELECT s.fleet_id, s.expires_at, a.name FROM sessions s JOIN fleet_accounts a ON a.id = s.fleet_id WHERE s.token_hash = ? AND a.active = 1')
    .bind(await sha256(token))
    .first();
  if (!row || row.expires_at <= Date.now()) return null;
  return { fleetId: row.fleet_id, name: row.name };
}

async function bookFleet(request, env, now, body, ip) {
  const acct = await session(request, env);
  if (!acct) return json(401, { ok: false, error: 'unauthorized' });
  const errs = validateFleetBooking(body);
  if (Object.keys(errs).length) return json(422, { ok: false, error: 'invalid', fields: errs });
  const win = fleetWindows(now, RULES).find((w) => w.id === body.windowId);
  if (!win) return json(409, { ok: false, error: 'unavailable', reason: 'closed', windows: await board(env.DB, now, acct.fleetId) });

  const slot = (await slotMap(env.DB, [win])).get(win.id);
  const state = fleetState(slot, acct.fleetId);
  if (state === 'fleet' || state === 'yours' || state === 'blocked') {
    return json(409, { ok: false, error: 'unavailable', reason: state, windows: await board(env.DB, now, acct.fleetId) });
  }
  if (state === 'booked' && body.override !== true) {
    return json(409, { ok: false, error: 'override_required', window: { id: win.id, label: win.full } });
  }

  const nowIso = new Date().toISOString();
  const row = {
    id: uid('bk'),
    window_id: win.id,
    holder: 'fleet',
    fleet_id: acct.fleetId,
    status: 'active',
    name: str(body.contactName, 120),
    phone: str(body.contactPhone, 40),
    service: str(body.service, 60),
    service_item: nil(str(body.serviceItem, 120)),
    vehicle: str(body.unit, 200),
    location: str(body.location, 300),
    lat: nil(str(body.lat, 30)),
    lng: nil(str(body.lng, 30)),
    details: nil(str(body.details, 2000)),
    full_label: win.full,
    start_at: win.start,
    end_at: win.end,
    created_at: nowIso,
    ip,
  };
  const db = env.DB;
  const stmts = [];
  if (state === 'open') {
    stmts.push(
      db.prepare("INSERT INTO slots (window_id, booking_id, holder) VALUES (?, ?, 'fleet')").bind(win.id, row.id),
      insertBooking(db, row),
      outbox(db, newBookingDraft({ who: acct.name, label: win.full, name: row.name, phone: row.phone, where: row.location }), owner(env), nowIso, { start: win.start, end: win.end, title: `Birdie's fleet: ${acct.name}`, where: row.location, bookingId: row.id }),
    );
  } else {
    // A customer holds this window: move them out, hand them a reschedule link, tell Jay. All or nothing.
    const occupied = await occupiedIds(db, now);
    const options = bumpOptions(now, RULES, win.id, occupied);
    const more = moreOptions(now, win.id, occupied, options);
    const token = randomToken();
    const [toJ, toJMoved, toCustomer] = bumpDrafts({
      accountName: acct.name,
      label: win.full,
      customerName: slot.name,
      customerPhone: slot.phone,
      customerEmailed: !!slot.email,
      unit: row.vehicle,
      location: row.location,
      contactName: row.name,
      contactPhone: row.phone,
      details: row.details,
      options,
      rescheduleUrl: rescheduleUrl(env, token),
    });
    stmts.push(
      db.prepare("DELETE FROM slots WHERE window_id = ? AND holder = 'public' AND booking_id = ?").bind(win.id, slot.booking_id),
      guard(db),
      db.prepare("INSERT INTO slots (window_id, booking_id, holder) VALUES (?, ?, 'fleet')").bind(win.id, row.id),
      db.prepare("UPDATE bookings SET status = 'bumped', bumped_by = ? WHERE id = ? AND status = 'active'").bind(row.id, slot.booking_id),
      guard(db),
      insertBooking(db, row),
      db
        .prepare('INSERT INTO reschedules (token_hash, booking_id, first_name, original, original_window, options, more, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(await sha256(token), slot.booking_id, firstName(slot.name), slot.full_label || win.full, win.id, JSON.stringify(options.map(slim)), JSON.stringify(more.map(slim)), nowIso, Date.now() + RESCHEDULE_MS),
      // The fleet job goes on Jay's calendar and the bumped customer's entry comes off it.
      outbox(db, toJ, owner(env), nowIso, { start: win.start, end: win.end, title: `Birdie's fleet EMERGENCY: ${acct.name}`, where: row.location, bookingId: row.id, cancelBookingId: slot.booking_id }),
      outbox(db, toJMoved, owner(env), nowIso),
      outbox(db, toCustomer, { role: 'customer', name: slot.name, phone: slot.phone, email: slot.email, smsOk: !!slot.sms_consent }, nowIso),
    );
  }
  try {
    await db.batch(stmts);
  } catch (err) {
    if (!isConflict(err)) throw err;
    // Lost a race: report the window as it stands now.
    const now2 = (await slotMap(db, [win])).get(win.id);
    const again = fleetState(now2, acct.fleetId);
    if (again === 'booked') return json(409, { ok: false, error: 'override_required', window: { id: win.id, label: win.full } });
    return json(409, { ok: false, error: 'unavailable', reason: again === 'open' ? 'fleet' : again, windows: await board(db, now, acct.fleetId) });
  }
  return json(201, { ok: true, booking: { id: row.id, label: win.full, full: win.full, start: win.start, end: win.end, windowId: win.id } });
}

async function rescheduleRow(env, token) {
  const t = str(token, 200);
  return t ? env.DB.prepare('SELECT * FROM reschedules WHERE token_hash = ?').bind(await sha256(t)).first() : null;
}

// Offered times that are still free; when none are left, offer fresh ones.
async function liveChoices(env, now, row) {
  const occupied = await occupiedIds(env.DB, now);
  const held = new Set(occupied);
  const still = (list) => list.filter((o) => !held.has(o.id) && new Date(o.start).getTime() > now.getTime());
  let options = still(JSON.parse(row.options));
  let more = still(JSON.parse(row.more));
  if (!options.length) {
    const fresh = bumpOptions(now, RULES, row.original_window, occupied);
    options = fresh.map(slim);
    more = moreOptions(now, row.original_window, occupied, fresh).map(slim);
  }
  return { options, more };
}

async function getReschedule(env, now, token) {
  const row = await rescheduleRow(env, token);
  if (!row) return json(404, { ok: false, error: 'not_found', state: 'not_found' });
  if (row.used_at || row.expires_at <= Date.now()) return json(410, { ok: false, error: 'expired', state: 'expired' });
  const { options, more } = await liveChoices(env, now, row);
  return json(200, { ok: true, state: 'open', firstName: row.first_name, original: { label: row.original }, options, more });
}

async function postReschedule(env, now, body) {
  const row = await rescheduleRow(env, body.token);
  if (!row) return json(404, { ok: false, error: 'not_found', state: 'not_found' });
  if (row.used_at || row.expires_at <= Date.now()) return json(410, { ok: false, error: 'expired', state: 'expired' });
  const victim = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(row.booking_id).first();
  if (!victim) return json(404, { ok: false, error: 'not_found', state: 'not_found' });
  const nowIso = new Date().toISOString();

  if (body.choice === 'callback') {
    // Waiting for Jay's call does not use up the link.
    await env.DB.batch([
      env.DB.prepare('UPDATE reschedules SET callback_at = ? WHERE token_hash = ?').bind(nowIso, row.token_hash),
      outbox(env.DB, { kind: 'CALLBACK', text: `Birdie's: ${row.first_name} will wait for your call about ${row.original}. ${victim.phone || ''}`.trim() }, owner(env), nowIso),
    ]);
    return json(200, { ok: true, state: 'callback' });
  }

  const earliest = new Date(now.getTime() + (RULES.bumpLeadHours ?? 2) * HOUR_MS);
  const pick = generateWindows(earliest, new Date(now.getTime() + (RULES.horizonDays ?? 21) * DAY_MS), RULES).find((w) => w.id === body.windowId);
  if (!pick) return json(422, { ok: false, error: 'invalid', fields: { windowId: 'Pick a time.' } });

  const moved = {
    ...victim,
    id: uid('bk'),
    window_id: pick.id,
    status: 'active',
    full_label: pick.full,
    start_at: pick.start,
    end_at: pick.end,
    created_at: nowIso,
    rescheduled_from: victim.id,
  };
  const db = env.DB;
  try {
    await db.batch([
      db.prepare("INSERT INTO slots (window_id, booking_id, holder) VALUES (?, ?, 'public')").bind(pick.id, moved.id),
      insertBooking(db, moved),
      db.prepare("UPDATE bookings SET status = 'rescheduled', moved_to = ? WHERE id = ? AND status = 'bumped'").bind(moved.id, victim.id),
      guard(db),
      db.prepare('UPDATE reschedules SET used_at = ? WHERE token_hash = ? AND used_at IS NULL').bind(nowIso, row.token_hash),
      guard(db),
      outbox(db, rescheduledDraft({ customerName: victim.name, fromLabel: row.original, toLabel: pick.full }), owner(env), nowIso, { start: pick.start, end: pick.end, title: `Birdie's: ${victim.name} (moved)`, where: victim.location, bookingId: moved.id }),
    ]);
  } catch (err) {
    if (!isConflict(err)) throw err;
    const again = await rescheduleRow(env, body.token);
    if (!again || again.used_at) return json(410, { ok: false, error: 'expired', state: 'expired' });
    const { options, more } = await liveChoices(env, now, again);
    return json(409, { ok: false, error: 'window_taken', options, more });
  }
  return json(200, {
    ok: true,
    state: 'done',
    label: pick.full,
    booking: { label: pick.full, full: pick.full, start: pick.start, end: pick.end, windowId: pick.id },
  });
}

async function postLead(env, body, ip) {
  if (body.website || body.fax) return json(200, { ok: true, ignored: true });
  if (await overLimit(env.DB, `lead:${ip}`, 12, DAY_MS)) return json(429, { ok: false, error: 'rate_limited' });
  const errs = validateLead(body);
  if (Object.keys(errs).length) return json(422, { ok: false, error: 'invalid', fields: errs });
  const nowIso = new Date().toISOString();
  const lead = {
    id: uid('ld'),
    type: str(body.type, 40),
    name: str(body.name, 120),
    phone: str(body.phone, 40),
    email: nil(str(body.email, 200)),
    company: nil(str(body.company, 120)),
    units: nil(str(body.units, 40)),
    location: nil(str(body.location, 300)),
    details: nil(str(body.details, 2000)),
  };
  const text = `Birdie's lead (${lead.type}): ${lead.name} ${lead.phone}${lead.company ? `, ${lead.company}` : ''}${lead.details ? `. ${lead.details}` : ''}`.slice(0, 600);
  await env.DB.batch([
    env.DB
      .prepare('INSERT INTO leads (id, type, name, phone, email, company, units, location, details, sms_consent, created_at, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(lead.id, lead.type, lead.name, lead.phone, lead.email, lead.company, lead.units, lead.location, lead.details, body.smsConsent ? 1 : 0, nowIso, ip),
    outbox(env.DB, { kind: 'LEAD', text }, owner(env), nowIso),
  ]);
  return json(200, { ok: true });
}

// ---------- admin (Bearer ADMIN_KEY; Lane 1 and Thomas only) ----------

async function admin(request, env, path, body) {
  const key = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!env.ADMIN_KEY || !key || !sameString(key, env.ADMIN_KEY)) return json(401, { ok: false, error: 'unauthorized' });
  const db = env.DB;
  if (request.method === 'GET' && path === '/admin/outbox') {
    const { results } = await db.prepare('SELECT * FROM outbox ORDER BY id DESC LIMIT 100').all();
    return json(200, { ok: true, outbox: results });
  }
  if (request.method === 'GET' && path === '/admin/bookings') {
    const { results } = await db.prepare("SELECT * FROM bookings ORDER BY window_id LIMIT 500").all();
    return json(200, { ok: true, bookings: results });
  }
  if (request.method === 'POST' && path === '/admin/fleet-accounts') return saveFleetAccount(db, body);
  if (request.method === 'POST' && path === '/admin/blocks') {
    const windowId = str(body.windowId, 20);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(windowId)) return json(422, { ok: false, error: 'invalid', fields: { windowId: 'YYYY-MM-DDTHH:MM' } });
    if (body.blocked === false) {
      await db.prepare("DELETE FROM slots WHERE window_id = ? AND holder = 'block'").bind(windowId).run();
      return json(200, { ok: true, windowId, blocked: false });
    }
    try {
      await db.prepare("INSERT INTO slots (window_id, booking_id, holder) VALUES (?, NULL, 'block')").bind(windowId).run();
    } catch (err) {
      if (isConflict(err)) return json(409, { ok: false, error: 'window_taken' });
      throw err;
    }
    return json(200, { ok: true, windowId, blocked: true });
  }
  return json(404, { ok: false, error: 'not_found' });
}

// Creates or updates a fleet login. A new PIN or turning a login off signs that fleet out everywhere.
// pinOptional: an existing account can be renamed or switched on/off without a new PIN (Jay's page).
async function saveFleetAccount(db, body, { pinOptional = false } = {}) {
  const id = str(body.id, 40).toLowerCase();
  const name = str(body.name, 80);
  const pin = str(body.pin, 8);
  const existing = /^[a-z0-9-]{2,40}$/.test(id) ? await db.prepare('SELECT id FROM fleet_accounts WHERE id = ?').bind(id).first() : null;
  const fields = {};
  if (!/^[a-z0-9-]{2,40}$/.test(id)) fields.id = 'a-z, 0-9, dashes';
  if (!name) fields.name = 'required';
  if (pin ? !/^\d{4,8}$/.test(pin) : !(pinOptional && existing)) fields.pin = '4 to 8 digits';
  if (Object.keys(fields).length) return json(422, { ok: false, error: 'invalid', fields });
  const active = body.active === false ? 0 : 1;
  if (pin) {
    const salt = randomToken();
    await db
      .prepare(
        `INSERT INTO fleet_accounts (id, name, pin_salt, pin_hash, active, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, pin_salt = excluded.pin_salt, pin_hash = excluded.pin_hash, active = excluded.active`,
      )
      .bind(id, name, salt, await pinHash(pin, salt), active, new Date().toISOString())
      .run();
    await db.prepare('DELETE FROM login_fails WHERE fleet_id = ?').bind(id).run();
  } else {
    await db.prepare('UPDATE fleet_accounts SET name = ?, active = ? WHERE id = ?').bind(name, active, id).run();
  }
  if (pin || !active) await db.prepare('DELETE FROM sessions WHERE fleet_id = ?').bind(id).run();
  return json(200, { ok: true, id, name, active: !!active });
}

// ---------- Jay's fleet list (owner PIN) ----------

// Owner sessions share the sessions table under an id no fleet login can have (ids are a-z, 0-9, dashes).
const OWNER_ID = '!owner';

async function ownerLogin(env, body, ip) {
  if (!env.OWNER_PIN) return json(503, { ok: false, error: 'not_set_up' });
  const now = Date.now();
  if (await overLimit(env.DB, `owner:${ip}`, 30, HOUR_MS)) return json(429, { ok: false, error: 'locked', retryAfter: 60 });
  const fails = await env.DB.prepare('SELECT count, locked_until FROM login_fails WHERE fleet_id = ?').bind(OWNER_ID).first();
  if (fails && fails.locked_until > now) {
    return json(429, { ok: false, error: 'locked', retryAfter: Math.max(1, Math.ceil((fails.locked_until - now) / 60000)) });
  }
  const pin = str(body.pin, 12);
  if (!pin || !sameString(await sha256(pin), await sha256(String(env.OWNER_PIN)))) return failedLogin(env.DB, OWNER_ID, fails, now);
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_fails WHERE fleet_id = ?').bind(OWNER_ID),
    env.DB.prepare('INSERT INTO sessions (token_hash, fleet_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), OWNER_ID, now + SESSION_MS),
  ]);
  return json(200, { ok: true, token });
}

async function ownerRoutes(request, env, path, body) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const row = env.OWNER_PIN && token
    ? await env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash = ? AND fleet_id = ?').bind(await sha256(token), OWNER_ID).first()
    : null;
  if (!row || row.expires_at <= Date.now()) return json(401, { ok: false, error: 'unauthorized' });
  const db = env.DB;
  if (request.method === 'GET' && path === '/owner/fleet') {
    const { results } = await db.prepare('SELECT id, name, active, created_at FROM fleet_accounts ORDER BY active DESC, name').all();
    return json(200, { ok: true, accounts: results.map((r) => ({ id: r.id, name: r.name, active: !!r.active, createdAt: r.created_at })) });
  }
  if (request.method === 'POST' && path === '/owner/fleet') return saveFleetAccount(db, body, { pinOptional: true });
  return json(404, { ok: false, error: 'not_found' });
}

// ---------- notifications ----------

// Sends waiting outbox rows to the n8n notification webhook. With no NOTIFY_WEBHOOK set this
// is a dry run: nothing leaves, and every message stays readable at GET /admin/outbox.
export async function deliverPending(env, fetchImpl = fetch) {
  if (!env.NOTIFY_WEBHOOK) return 0;
  const { results } = await env.DB.prepare('SELECT * FROM outbox WHERE delivered_at IS NULL AND attempts < 5 ORDER BY id LIMIT 25').all();
  let sent = 0;
  for (const row of results) {
    let error = null;
    try {
      const res = await fetchImpl(env.NOTIFY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Birdies-Secret': env.NOTIFY_SECRET || '' },
        body: JSON.stringify({
          id: row.id,
          kind: row.kind,
          to: { role: row.to_role, name: row.to_name, phone: row.to_phone, email: row.to_email, smsOk: !!row.sms_ok },
          text: row.text,
          event: row.event ? JSON.parse(row.event) : null,
          createdAt: row.created_at,
        }),
      });
      if (!res.ok) error = `HTTP ${res.status}`;
    } catch (err) {
      error = String((err && err.message) || err).slice(0, 300);
    }
    if (error) {
      await env.DB.prepare('UPDATE outbox SET attempts = attempts + 1, error = ? WHERE id = ?').bind(error, row.id).run();
    } else {
      await env.DB.prepare('UPDATE outbox SET delivered_at = ?, error = NULL WHERE id = ?').bind(new Date().toISOString(), row.id).run();
      sent += 1;
    }
  }
  return sent;
}

// ---------- router ----------

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api(?=\/)/, '').replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const now = clock(request, env);

  let body = {};
  if (method === 'POST') {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json(413, { ok: false, error: 'too_large' });
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json(400, { ok: false, error: 'bad_json' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  }

  if (path.startsWith('/admin/')) return admin(request, env, path, body);
  if (method === 'GET' && (path === '/' || path === '/health')) return json(200, { ok: true, service: 'birdies-booking' });
  if (method === 'GET' && path === '/availability') return json(200, await availability(env.DB, now));
  if (method === 'POST' && path === '/bookings') return bookPublic(env, now, body, ip);
  if (method === 'POST' && path === '/fleet/login') return login(env, body, ip);
  if (method === 'GET' && path === '/fleet/windows') {
    const acct = await session(request, env);
    if (!acct) return json(401, { ok: false, error: 'unauthorized' });
    return json(200, { ok: true, accountName: acct.name, windows: await board(env.DB, now, acct.fleetId) });
  }
  if (method === 'POST' && path === '/fleet/bookings') return bookFleet(request, env, now, body, ip);
  if (method === 'GET' && path === '/reschedule') return getReschedule(env, now, url.searchParams.get('t'));
  if (method === 'POST' && path === '/reschedule') return postReschedule(env, now, body);
  if (method === 'POST' && path === '/leads') return postLead(env, body, ip);
  if (method === 'POST' && path === '/owner/login') return ownerLogin(env, body, ip);
  if (path.startsWith('/owner/')) return ownerRoutes(request, env, path, body);
  return json(404, { ok: false, error: 'not_found' });
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await route(request, env);
    } catch (err) {
      console.error('birdies-booking error', err && err.stack ? err.stack : err);
      res = json(500, { ok: false, error: 'server_error' });
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    if (request.method === 'POST' && ctx && ctx.waitUntil) ctx.waitUntil(deliverPending(env).catch(() => 0));
    return res;
  },
  // Retries anything the webhook missed (Cron Trigger every 5 minutes).
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(deliverPending(env).catch(() => 0));
  },
};
