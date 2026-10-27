import { createClient } from './booking-api.js';
import { val, mark, flattenDays, weekHeading } from './booking-dom.js';

const VIP_TITLE = 'Welcome to the VIP section';
const BUMP_BODY = 'If you take it, they\'re told something came up and get the next two openings, and Jay is told right away.';

// A good sign-in goes to the phone's password manager (Chrome, Android; Safari offers on its own).
function offerToSave(W, id, password, name) {
  try { W.navigator.credentials.store(new W.PasswordCredential({ id, password, name })).catch(() => {}); } catch (e) { /* unsupported */ }
}

export async function bootFleet(doc, opts) {
  const login = doc.getElementById('fleet-login');
  if (!login) return;
  const { config, core, now } = opts;
  const board = doc.getElementById('fleet-board');
  const book = doc.getElementById('fleet-book');
  const windows = doc.getElementById('fleet-windows');
  const msg = doc.getElementById('fleet-msg');
  const title = doc.getElementById('fleet-title');
  const lead = doc.getElementById('fleet-lead');
  const leadText = lead ? lead.textContent : '';
  const welcome = doc.getElementById('fleet-welcome');
  const dialog = doc.getElementById('bump-dialog');
  const done = doc.getElementById('fleet-done');
  let token = '';
  let pending = false;
  let selected = null;
  let overrideArmed = false;
  let savedDraft = null;
  let lastFocus = null;
  const client = () => createClient({ base: config.api, fetchImpl: opts.fetchImpl });

  function say(text) { if (msg) msg.textContent = text; }
  function readDraft() {
    return {
      service: val(book, 'service'),
      unit: val(book, 'unit'),
      location: val(book, 'location'),
      lat: val(book, 'lat'),
      lng: val(book, 'lng'),
      details: val(book, 'details'),
      contactName: val(book, 'contactName'),
      contactPhone: val(book, 'contactPhone'),
    };
  }
  function writeDraft(draft) {
    if (!draft || !book) return;
    for (const key of Object.keys(draft)) {
      const el = book.querySelector(`[name="${key}"]`);
      if (el) el.value = draft[key];
    }
  }
  function dialogOpen() {
    return !!(dialog && (dialog.open || dialog.hasAttribute('open')));
  }
  function show(d) {
    if (d.showModal) d.showModal();
    else { d.setAttribute('open', ''); d.open = true; }
  }
  function hide(d) {
    if (d.close) d.close();
    else { d.removeAttribute('open'); d.open = false; }
  }
  function signedIn(name) {
    if (title) title.textContent = VIP_TITLE;
    if (lead) lead.textContent = `Signed in as ${name}. Pick a time below.`;
  }
  function signedOut(text) {
    token = '';
    board.hidden = true;
    login.hidden = false;
    if (title) title.textContent = 'Fleet client login';
    if (lead) lead.textContent = leadText;
    say(text);
  }
  function openWelcome(name) {
    if (!welcome) return;
    doc.getElementById('fleet-welcome-title').textContent = `Welcome, ${name}`;
    show(welcome);
    doc.getElementById('fleet-welcome-go').focus?.();
  }
  function openDialog(label, trigger) {
    lastFocus = trigger || doc.activeElement;
    const copy = doc.getElementById('bump-copy');
    if (copy) copy.textContent = `Another customer has ${label}. ${BUMP_BODY}`;
    show(dialog);
  }
  function closeDialog() {
    hide(dialog);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function paintWindows(days) {
    windows.textContent = '';
    const flat = flattenDays(days);
    const groups = core.groupByWeek(flat);
    for (const group of groups) {
      const section = doc.createElement('div');
      section.className = 'week';
      const h = doc.createElement('h3');
      h.textContent = weekHeading(group, now, core);
      section.appendChild(h);
      const grid = doc.createElement('div');
      grid.className = 'chip-grid';
      for (const w of group.windows) {
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = `chip chip-btn is-${w.state || 'open'}`;
        btn.setAttribute('data-window-id', w.id);
        btn.setAttribute('data-state', w.state || 'open');
        btn.setAttribute('data-label', w.full || w.label);
        const state = w.state || 'open';
        let extra = '';
        if (state === 'booked') extra = 'Booked by a customer, priority available';
        else if (state === 'fleet') extra = 'Fleet';
        else if (state === 'yours') extra = 'Yours';
        else if (state === 'blocked') extra = 'Blocked';
        else extra = 'Open';
        btn.textContent = `${w.dayLabel} ${w.label}. ${extra}`;
        grid.appendChild(btn);
      }
      section.appendChild(grid);
      windows.appendChild(section);
    }
  }
  async function loadBoard() {
    const res = await client().fleetWindows(token);
    if (res.status === 401) return backToLogin('That sign-in expired. Sign in again. Your fleet form is still here.');
    if (!res.ok || !res.data) { say('The board did not load. Call or text Jay.'); return; }
    signedIn(res.data.accountName || 'fleet client');
    paintWindows(res.data.windows || res.data.days || []);
  }
  function backToLogin(text) {
    savedDraft = readDraft();
    signedOut(text);
  }

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    const fleetId = val(login, 'fleetId');
    const pinValue = val(login, 'pin');
    const res = await client().fleetLogin({ fleetId, pin: pinValue });
    pending = false;
    const pin = login.querySelector('[name="pin"]');
    if (!res.ok && pin) pin.value = '';
    if (res.status === 429) {
      const mins = res.data && res.data.retryAfter;
      say(`Too many tries. Try again in ${mins} minutes.`);
      return;
    }
    if (!res.ok) {
      say('That Fleet ID and PIN didn\'t match. Call or text Jay for help.');
      return;
    }
    token = res.data.token;
    login.hidden = true;
    board.hidden = false;
    const name = res.data.accountName || 'fleet client';
    (opts.saveLogin || ((...a) => offerToSave(doc.defaultView, ...a)))(fleetId, pinValue, name);
    if (pin) pin.value = '';
    signedIn(name);
    say('Sign-in successful.');
    openWelcome(name);
    writeDraft(savedDraft);
    await loadBoard();
  });

  if (welcome) {
    doc.getElementById('fleet-welcome-go').addEventListener('click', () => {
      hide(welcome);
      if (windows && windows.focus) { windows.setAttribute('tabindex', '-1'); windows.focus(); }
    });
  }

  windows.addEventListener('click', (event) => {
    const btn = event.target && event.target.closest ? event.target.closest('[data-window-id]') : null;
    if (!btn) return;
    const state = btn.getAttribute('data-state');
    selected = { id: btn.getAttribute('data-window-id'), label: btn.getAttribute('data-label'), state };
    overrideArmed = false;
    if (state === 'booked') {
      openDialog(selected.label, btn);
      return;
    }
    if (dialogOpen()) closeDialog();
    if (state !== 'open') {
      say('That time is not open.');
      return;
    }
    say(`Selected ${selected.label}.`);
  });

  doc.getElementById('bump-no').addEventListener('click', () => {
    overrideArmed = false;
    closeDialog();
  });
  dialog.addEventListener('close', () => {
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });
  dialog.addEventListener('cancel', (event) => {
    overrideArmed = false;
    if (event.preventDefault) event.preventDefault();
    closeDialog();
  });
  doc.getElementById('bump-yes').addEventListener('click', async () => {
    overrideArmed = true;
    closeDialog();
    await submitFleet();
  });

  async function submitFleet() {
    if (pending || !selected) return;
    const draft = readDraft();
    savedDraft = draft;
    const errs = core.validateFleetBooking({ ...draft, windowId: selected.id });
    if (Object.keys(errs).length) {
      mark(book, errs);
      say(Object.values(errs)[0]);
      overrideArmed = false;
      return;
    }
    if (selected.state === 'booked' && !overrideArmed) {
      openDialog(selected.label);
      return;
    }
    pending = true;
    const payload = {
      windowId: selected.id,
      service: draft.service,
      unit: draft.unit,
      location: draft.location,
      lat: draft.lat,
      lng: draft.lng,
      details: draft.details,
      contactName: draft.contactName,
      contactPhone: draft.contactPhone,
    };
    if (selected.state === 'booked' && overrideArmed) payload.override = true;
    const res = await client().fleetBook(token, payload);
    pending = false;
    overrideArmed = false;
    const data = res.data || {};
    if (res.status === 401) return backToLogin('That sign-in expired. Sign in again. Your fleet form is still here.');
    if (data.error === 'override_required') {
      selected = { id: (data.window && data.window.id) || selected.id, label: (data.window && data.window.label) || selected.label, state: 'booked' };
      openDialog(selected.label);
      return;
    }
    if (res.status === 409 && data.windows) {
      paintWindows(data.windows);
      say('That time is not open. The board is updated. Your other answers are still here.');
      return;
    }
    if (res.status === 422) {
      mark(book, data.fields || {});
      say('Check the fleet form and try that window again.');
      return;
    }
    if (!res.ok || !data.booking) {
      say('That did not go through. Call or text Jay.');
      return;
    }
    if (done) {
      done.hidden = false;
      done.textContent = `Booked: ${data.booking.label}. Jay has been notified.`;
    }
    say('');
  }

  book.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitFleet();
  });

  const signOut = doc.getElementById('fleet-signout');
  if (signOut) {
    signOut.addEventListener('click', () => {
      savedDraft = null;
      signedOut('');
    });
  }

  const locBtn = book.querySelector('[data-use-location]');
  if (locBtn) {
    locBtn.addEventListener('click', () => {
      const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
      if (!geo) return;
      geo.getCurrentPosition((pos) => {
        book.querySelector('[name="lat"]').value = String(pos.coords.latitude);
        book.querySelector('[name="lng"]').value = String(pos.coords.longitude);
        const link = doc.getElementById('fleet-map');
        if (link) {
          link.hidden = false;
          link.href = core.mapsLink(pos.coords.latitude, pos.coords.longitude);
          link.textContent = 'Map pin';
        }
      }, () => {}, { enableHighAccuracy: true, timeout: 15000 });
    });
  }
}
