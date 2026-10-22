/* Dev-only booking API. In-memory plus localStorage. Not copied into docs/. */
import {
  DEFAULT_RULES,
  publicWindows,
  fleetWindows,
  generateWindows,
  bumpOptions,
  bumpDrafts,
  rescheduledDraft,
  newBookingDraft,
  validateBooking,
  validateFleetBooking,
  parseLocal,
  firstName,
} from './birdies-core.js';

const STORE_KEY = 'birdies-mock-v1';
const ACCOUNTS = [{ id: 'demo', pin: '1111', name: 'Demo Fleet' }];

function memStore() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
  };
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

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

function slim(w) {
  return { id: w.id, start: w.start, end: w.end, label: w.label, full: w.full, date: w.date, dayLabel: w.dayLabel };
}

export function createMock(opts = {}) {
  const rules = opts.rules || DEFAULT_RULES;
  const now = opts.now instanceof Date ? new Date(opts.now.getTime()) : parseLocal(opts.now || new Date().toISOString());
  const nowKey = opts.nowKey || now.toISOString();
  const store = opts.store || memStore();
  const origin = opts.origin || '';
  let state = readState();
  if (!state || state.nowKey !== nowKey || opts.fresh) {
    state = seed();
    if (opts.scenario === 'race') state.raceArmed = true;
    save();
  }

  function readState() {
    try {
      const raw = store.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }
  function save() { store.setItem(STORE_KEY, JSON.stringify(state)); }

  function activeOn(windowId) {
    return state.bookings.find((b) => b.status === 'active' && b.windowId === windowId) || null;
  }
  function occupiedIds() {
    return state.bookings.filter((b) => b.status === 'active').map((b) => b.windowId).concat(state.blocks);
  }
  function publicState(id) {
    if (state.blocks.includes(id) || activeOn(id)) return 'booked';
    return 'open';
  }
  function fleetState(id, fleetId) {
    if (state.blocks.includes(id)) return 'blocked';
    const row = activeOn(id);
    if (!row) return 'open';
    if (row.holder === 'fleet' && row.fleetId === fleetId) return 'yours';
    if (row.holder === 'fleet') return 'fleet';
    return 'booked';
  }
  function availabilityBody() {
    const wins = publicWindows(now, rules).map((w) => ({ ...w, state: publicState(w.id) }));
    return {
      ok: true,
      timezone: 'America/Denver',
      earliestPublicStart: wins[0] ? wins[0].start : null,
      days: shapeDays(wins),
    };
  }
  function boardBody(fleetId) {
    const wins = fleetWindows(now, rules).map((w) => {
      const st = fleetState(w.id, fleetId);
      const row = activeOn(w.id);
      return { ...w, state: st, bookedLabel: st === 'booked' && row ? row.full : '' };
    });
    return shapeDays(wins);
  }
  function moreOptions(takenId, chosen) {
    const lead = (rules.bumpLeadHours ?? 2) * 60 * 60 * 1000;
    const earliest = new Date(now.getTime() + lead);
    const end = new Date(now.getTime() + (rules.horizonDays ?? 21) * 24 * 60 * 60 * 1000);
    const skip = new Set([takenId, ...occupiedIds(), ...chosen.map((o) => o.id)]);
    return generateWindows(earliest, end, rules).filter((w) => !skip.has(w.id)).slice(0, 8);
  }
  function rescheduleUrl(token) {
    const q = new URLSearchParams();
    q.set('t', token);
    if (nowKey && nowKey !== 'live') q.set('now', nowKey);
    return `${origin}/reschedule/?${q.toString()}`;
  }
  function auth(headers) {
    const raw = (headers && (headers.Authorization || headers.authorization)) || '';
    const token = String(raw).replace(/^Bearer\s+/i, '');
    return state.tokens[token] || null;
  }

  function seed() {
    const pub = publicWindows(now, rules);
    const fleet = fleetWindows(now, rules);
    const next = {
      nowKey,
      bookings: [],
      blocks: [],
      tokens: {},
      reschedule: {},
      outbox: [],
      pinFails: {},
      leads: [],
      raceArmed: false,
    };
    const storyId = pub[0] && pub[0].id;
    const hold = pub.filter((w) => w.id !== storyId);
    const seeded = [hold[0], hold[3]].filter(Boolean);
    const names = [
      ['Casey Brooks', '4065550142'],
      ['Morgan Lee', '4065550148'],
    ];
    seeded.forEach((w, i) => {
      next.bookings.push({
        id: uid('bk'),
        status: 'active',
        holder: 'public',
        windowId: w.id,
        start: w.start,
        end: w.end,
        full: w.full,
        name: names[i][0],
        phone: names[i][1],
        vehicle: i === 0 ? 'white service pickup' : 'ranch truck',
        service: 'mobile-repair',
        location: i === 0 ? 'Belgrade shop yard' : 'Livingston',
      });
    });
    const block = fleet.find((w) => /T14:00$/.test(w.id) && !pub.some((p) => p.id === w.id));
    if (block) next.blocks.push(block.id);
    const other = fleet.find((w) => /T08:00$/.test(w.id) && !pub.some((p) => p.id === w.id));
    if (other) {
      next.bookings.push({
        id: uid('bk'),
        status: 'active',
        holder: 'fleet',
        fleetId: 'northwind',
        windowId: other.id,
        start: other.start,
        end: other.end,
        full: other.full,
        name: 'Northwind Ranch',
        phone: '4065550177',
        vehicle: 'feed truck',
        service: 'fleet-maintenance',
        location: 'ranch yard',
      });
    }
    return next;
  }

  function bookPublic(body) {
    if (body && (body.website || body.fax)) return { status: 200, body: { ok: true, ignored: true } };
    const errs = validateBooking({
      service: body.service,
      vehicle: body.vehicle,
      windowId: body.windowId,
      location: body.location,
      name: body.name,
      phone: body.phone,
      email: body.email,
    });
    if (Object.keys(errs).length) return { status: 422, body: { ok: false, error: 'invalid', fields: errs } };
    const win = publicWindows(now, rules).find((w) => w.id === body.windowId);
    const race = state.raceArmed;
    if (race) state.raceArmed = false;
    if (!win || publicState(win.id) !== 'open' || race) {
      if (race && win && publicState(win.id) === 'open') {
        state.bookings.push({
          id: uid('bk'), status: 'active', holder: 'public', windowId: win.id,
          start: win.start, end: win.end, full: win.full, name: 'Another customer', phone: '4065550100',
          vehicle: 'truck', service: body.service, location: 'not listed',
        });
      }
      save();
      return { status: 409, body: { ok: false, error: 'window_taken', availability: availabilityBody() } };
    }
    const booking = {
      id: uid('bk'),
      status: 'active',
      holder: 'public',
      windowId: win.id,
      start: win.start,
      end: win.end,
      full: win.full,
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      email: body.email || '',
      vehicle: body.vehicle,
      service: body.service,
      serviceItem: body.serviceItem || '',
      description: body.description || '',
      location: body.location,
      lat: body.lat || '',
      lng: body.lng || '',
      smsConsent: !!body.smsConsent,
    };
    state.bookings.push(booking);
    state.outbox.push(newBookingDraft({
      who: 'A customer',
      label: win.full,
      name: booking.name,
      phone: booking.phone,
      where: booking.location,
    }));
    save();
    return { status: 201, body: { ok: true, booking: { id: booking.id, label: win.full, full: win.full, start: win.start, end: win.end, windowId: win.id } } };
  }

  function login(body) {
    const fleetId = String((body && body.fleetId) || '').trim();
    const pin = String((body && body.pin) || '').trim();
    const fails = state.pinFails[fleetId] || { count: 0, lockedUntil: 0 };
    const clockNow = Date.now();
    if (fails.lockedUntil && clockNow < fails.lockedUntil) {
      const mins = Math.max(1, Math.ceil((fails.lockedUntil - clockNow) / 60000));
      return { status: 429, body: { ok: false, error: 'locked', retryAfter: mins } };
    }
    const acct = ACCOUNTS.find((a) => a.id === fleetId && a.pin === pin);
    if (!acct) {
      fails.count += 1;
      if (fails.count >= 5) {
        fails.lockedUntil = clockNow + 15 * 60 * 1000;
        state.pinFails[fleetId] = fails;
        save();
        return { status: 429, body: { ok: false, error: 'locked', retryAfter: 15 } };
      }
      state.pinFails[fleetId] = fails;
      save();
      return { status: 401, body: { ok: false, error: 'bad_login' } };
    }
    state.pinFails[fleetId] = { count: 0, lockedUntil: 0 };
    const token = uid('tok');
    state.tokens[token] = { fleetId: acct.id, name: acct.name };
    save();
    return { status: 200, body: { ok: true, token, accountName: acct.name } };
  }

  function bookFleet(body, headers) {
    const acct = auth(headers);
    if (!acct) return { status: 401, body: { ok: false, error: 'unauthorized' } };
    const errs = validateFleetBooking(body || {});
    if (Object.keys(errs).length) return { status: 422, body: { ok: false, error: 'invalid', fields: errs } };
    const win = fleetWindows(now, rules).find((w) => w.id === body.windowId);
    if (!win) {
      return { status: 409, body: { ok: false, error: 'unavailable', reason: 'closed', windows: boardBody(acct.fleetId) } };
    }
    const st = fleetState(win.id, acct.fleetId);
    if (st === 'fleet' || st === 'yours' || st === 'blocked') {
      return { status: 409, body: { ok: false, error: 'unavailable', reason: st, windows: boardBody(acct.fleetId) } };
    }
    if (st === 'booked' && !body.override) {
      return { status: 409, body: { ok: false, error: 'override_required', window: { id: win.id, label: win.full } } };
    }
    if (st === 'booked' && body.override) {
      const victim = activeOn(win.id);
      victim.status = 'bumped';
      const options = bumpOptions(now, rules, win.id, occupiedIds());
      const more = moreOptions(win.id, options);
      const token = uid('rs');
      state.reschedule[token] = {
        bookingId: victim.id,
        firstName: firstName(victim.name),
        original: victim.full,
        options: options.map(slim),
        more: more.map(slim),
        used: false,
      };
      state.outbox.push(...bumpDrafts({
        accountName: acct.name,
        label: win.full,
        customerName: victim.name,
        customerPhone: victim.phone,
        options,
        rescheduleUrl: rescheduleUrl(token),
      }));
    }
    state.bookings.push({
      id: uid('bk'),
      status: 'active',
      holder: 'fleet',
      fleetId: acct.fleetId,
      windowId: win.id,
      start: win.start,
      end: win.end,
      full: win.full,
      name: body.contactName,
      phone: body.contactPhone,
      vehicle: body.unit,
      service: body.service,
      location: body.location,
    });
    if (st === 'open') {
      state.outbox.push(newBookingDraft({
        who: acct.name,
        label: win.full,
        name: body.contactName,
        phone: body.contactPhone,
        where: body.location,
      }));
    }
    save();
    return { status: 201, body: { ok: true, booking: { id: state.bookings[state.bookings.length - 1].id, label: win.full, full: win.full, start: win.start, end: win.end } } };
  }

  function getReschedule(token) {
    const row = token && state.reschedule[token];
    if (!row) return { status: 404, body: { ok: false, error: 'not_found', state: 'not_found' } };
    if (row.used) return { status: 410, body: { ok: false, error: 'expired', state: 'expired' } };
    return {
      status: 200,
      body: {
        ok: true,
        state: 'open',
        firstName: row.firstName,
        original: { label: row.original },
        options: row.options,
        more: row.more,
      },
    };
  }

  function postReschedule(body) {
    const row = body && state.reschedule[body.token];
    if (!row) return { status: 404, body: { ok: false, error: 'not_found', state: 'not_found' } };
    if (row.used) return { status: 410, body: { ok: false, error: 'expired', state: 'expired' } };
    const victim = state.bookings.find((b) => b.id === row.bookingId);
    if (body.choice === 'callback') {
      state.outbox.push({
        to: 'J',
        kind: 'CALLBACK',
        text: `Birdies: ${row.firstName} will wait for your call about ${row.original}.`,
      });
      save();
      return { status: 200, body: { ok: true, state: 'callback' } };
    }
    const pick = [...row.options, ...row.more].find((o) => o.id === body.windowId);
    if (!pick) return { status: 422, body: { ok: false, error: 'invalid', fields: { windowId: 'Pick a time.' } } };
    if (activeOn(pick.id) || state.blocks.includes(pick.id)) {
      const options = bumpOptions(now, rules, victim ? victim.windowId : '', occupiedIds());
      row.options = options.map(slim);
      row.more = moreOptions(victim ? victim.windowId : '', options).map(slim);
      save();
      return { status: 409, body: { ok: false, error: 'window_taken', options: row.options, more: row.more } };
    }
    if (victim) victim.status = 'rescheduled';
    state.bookings.push({
      id: uid('bk'),
      status: 'active',
      holder: 'public',
      windowId: pick.id,
      start: pick.start,
      end: pick.end,
      full: pick.full,
      name: victim ? victim.name : row.firstName,
      phone: victim ? victim.phone : '',
      vehicle: victim ? victim.vehicle : '',
      service: victim ? victim.service : '',
      location: victim ? victim.location : '',
    });
    row.used = true;
    state.outbox.push(rescheduledDraft({
      customerName: victim ? victim.name : row.firstName,
      fromLabel: row.original,
      toLabel: pick.full,
    }));
    save();
    return {
      status: 200,
      body: { ok: true, state: 'done', label: pick.full, booking: { label: pick.full, full: pick.full, start: pick.start, end: pick.end, windowId: pick.id } },
    };
  }

  function handle(method, urlString, body, headers) {
    const u = new URL(urlString, 'http://birdies.local');
    const at = u.pathname.indexOf('/api/');
    let path = at >= 0 ? u.pathname.slice(at + 4) : u.pathname;
    if (!path.startsWith('/')) path = `/${path}`;
    const verb = String(method || 'GET').toUpperCase();
    if (opts.scenario === 'down' && (path === '/availability' || path === '/bookings') && verb === 'GET') {
      return { status: 500, body: { ok: false, error: 'down' } };
    }
    if (verb === 'GET' && path === '/availability') return { status: 200, body: availabilityBody() };
    if (verb === 'POST' && path === '/bookings') return bookPublic(body || {});
    if (verb === 'POST' && path === '/fleet/login') return login(body || {});
    if (verb === 'GET' && path === '/fleet/windows') {
      const acct = auth(headers);
      if (!acct) return { status: 401, body: { ok: false, error: 'unauthorized' } };
      return { status: 200, body: { ok: true, accountName: acct.name, windows: boardBody(acct.fleetId) } };
    }
    if (verb === 'POST' && path === '/fleet/bookings') return bookFleet(body || {}, headers || {});
    if (verb === 'GET' && path === '/reschedule') return getReschedule(u.searchParams.get('t'));
    if (verb === 'POST' && path === '/reschedule') return postReschedule(body || {});
    if (verb === 'POST' && path === '/leads') {
      state.leads.push(body || {});
      state.outbox.push({ to: 'J', kind: 'LEAD', text: `Birdies lead: ${(body && body.name) || ''}` });
      save();
      return { status: 200, body: { ok: true } };
    }
    return { status: 404, body: { ok: false, error: 'not_found' } };
  }

  function paint(doc) {
    if (!doc || !doc.getElementById) return;
    const list = doc.getElementById('dev-outbox');
    if (!list) return;
    list.textContent = '';
    for (const item of state.outbox) {
      const li = doc.createElement('li');
      const title = doc.createElement('strong');
      title.textContent = `${item.kind} to ${item.to}`;
      const copy = doc.createElement('p');
      copy.textContent = item.text;
      li.appendChild(title);
      li.appendChild(copy);
      const match = String(item.text).match(/https?:\/\/\S+/);
      if (match) {
        const a = doc.createElement('a');
        a.href = match[0];
        a.textContent = 'Open reschedule link';
        li.appendChild(a);
      }
      list.appendChild(li);
    }
  }

  return { handle, paint, state, now, nowKey, save };
}

export function install(window) {
  const params = new URLSearchParams(window.location.search || '');
  const nowKey = params.get('now') || 'live';
  const now = params.get('now') ? parseLocal(params.get('now')) : new Date();
  const cfg = window.BIRDIES_CONFIG || {};
  const mock = createMock({
    now,
    nowKey,
    scenario: params.get('mock') || '',
    store: window.localStorage,
    rules: cfg.rules || DEFAULT_RULES,
    origin: window.location.origin,
  });
  const orig = window.fetch.bind(window);
  window.fetch = async function mockedFetch(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (String(url).indexOf('/api/') === -1) return orig(input, init);
    const method = ((init && init.method) || 'GET').toUpperCase();
    if (method !== 'GET') {
      try { orig(input, init).catch(() => {}); } catch (err) { /* QA still sees the POST */ }
    }
    let body = null;
    if (init && init.body) {
      try { body = JSON.parse(init.body); } catch (err) { body = null; }
    }
    const result = mock.handle(method, url, body, (init && init.headers) || {});
    mock.paint(window.document);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  mock.paint(window.document);
  window.BIRDIES_MOCK = mock;
  return mock;
}
