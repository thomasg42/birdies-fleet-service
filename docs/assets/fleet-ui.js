import { createClient } from './booking-api.js';
import { val, mark, flattenDays, weekHeading } from './booking-dom.js';

const BUMP_BODY = 'If you take it, they\'re told something came up and get the next two openings, and Jay is told right away.';

export async function bootFleet(doc, opts) {
  const login = doc.getElementById('fleet-login');
  if (!login) return;
  const { config, core, now } = opts;
  const board = doc.getElementById('fleet-board');
  const book = doc.getElementById('fleet-book');
  const windows = doc.getElementById('fleet-windows');
  const msg = doc.getElementById('fleet-msg');
  const title = doc.getElementById('fleet-title');
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
  function openDialog(label, trigger) {
    lastFocus = trigger || doc.activeElement;
    const copy = doc.getElementById('bump-copy');
    if (copy) copy.textContent = `Another customer has ${label}. ${BUMP_BODY}`;
    if (dialog.showModal) dialog.showModal();
    else { dialog.setAttribute('open', ''); dialog.open = true; }
  }
  function closeDialog() {
    if (dialog.close) dialog.close();
    else { dialog.removeAttribute('open'); dialog.open = false; }
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
    if (title) title.textContent = res.data.accountName || 'Fleet';
    paintWindows(res.data.windows || res.data.days || []);
  }
  function backToLogin(text) {
    savedDraft = readDraft();
    token = '';
    board.hidden = true;
    login.hidden = false;
    if (title) title.textContent = 'Fleet client login';
    say(text);
  }

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    const res = await client().fleetLogin({ fleetId: val(login, 'fleetId'), pin: val(login, 'pin') });
    pending = false;
    const pin = login.querySelector('[name="pin"]');
    if (pin) pin.value = '';
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
    say('');
    writeDraft(savedDraft);
    await loadBoard();
  });

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
      token = '';
      savedDraft = null;
      board.hidden = true;
      login.hidden = false;
      if (title) title.textContent = 'Fleet client login';
      say('');
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
