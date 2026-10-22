import { createClient } from './booking-api.js';
import { val, mark, smsAnchor, wireIcs, flattenDays, weekHeading, setControl } from './booking-dom.js';

function renderPublicWindows(doc, box, days, { removeId, core, now, mode }) {
  const submit = doc.getElementById('book-submit');
  box.textContent = '';
  const flat = flattenDays(days, removeId).filter((w) => mode === 'request' || w.state !== 'removed');
  if (!flat.length) {
    const note = doc.createElement('p');
    note.className = 'windows-note';
    note.textContent = 'No open windows are on the board. Call or text J.';
    box.appendChild(note);
    if (submit) submit.disabled = true;
    return;
  }
  const groups = core.groupByWeek(flat);
  let requiredSet = false;
  let openCount = 0;
  for (const group of groups) {
    const section = doc.createElement('div');
    section.className = 'week';
    const h = doc.createElement('h3');
    h.textContent = weekHeading(group, now, core);
    section.appendChild(h);
    const grid = doc.createElement('div');
    grid.className = 'chip-grid';
    for (const w of group.windows) {
      const open = mode === 'request' || !w.state || w.state === 'open';
      const label = doc.createElement('label');
      label.className = open ? 'chip' : 'chip is-booked';
      const input = doc.createElement('input');
      input.type = 'radio';
      input.name = 'window';
      input.value = w.id;
      input.setAttribute('data-label', w.full || `${w.dayLabel}, ${w.label}`);
      if (!open) input.disabled = true;
      else {
        openCount += 1;
        if (!requiredSet) { input.required = true; requiredSet = true; }
      }
      const span = doc.createElement('span');
      span.textContent = open ? `${w.dayLabel} ${w.label}` : `${w.label} Booked`;
      label.appendChild(input);
      label.appendChild(span);
      grid.appendChild(label);
    }
    section.appendChild(grid);
    box.appendChild(section);
  }
  if (submit) submit.disabled = openCount === 0;
}

function showClosed(doc, box) {
  const submit = doc.getElementById('book-submit');
  box.textContent = '';
  const note = doc.createElement('p');
  note.className = 'windows-note';
  note.textContent = 'I cannot verify open times right now, so no times are shown.';
  const retry = doc.createElement('button');
  retry.type = 'button';
  retry.setAttribute('data-retry', '1');
  retry.textContent = 'Retry';
  box.appendChild(note);
  box.appendChild(retry);
  if (submit) submit.disabled = true;
}

export async function bootSchedule(doc, opts) {
  const form = doc.getElementById('book-form');
  if (!form) return;
  const { config, core, now } = opts;
  const rules = config.rules;
  const mode = config.api ? 'live' : 'request';
  const box = doc.getElementById('window-box');
  const msg = doc.getElementById('book-msg');
  const handoff = doc.getElementById('book-handoff');
  const thanks = doc.getElementById('book-thanks');
  const title = doc.getElementById('book-title');
  const intro = doc.getElementById('book-intro');
  const submit = doc.getElementById('book-submit');
  const client = createClient({ base: config.api, fetchImpl: opts.fetchImpl });
  let pending = false;
  const params = new URLSearchParams(opts.search || '');
  const preset = params.get('service');
  const service = form.querySelector('[name="service"]');
  if (preset && service && [...service.options].some((o) => o.value === preset)) setControl(service, preset);
  if (title && mode === 'request') title.textContent = 'Request a time';
  if (submit && mode === 'request') submit.textContent = 'Request this time';
  if (intro) {
    const start = core.earliestPublicStart(now, rules);
    intro.textContent = `First come, first served. Online booking starts ${core.labelDay(start)}. For today or tomorrow, call or text J.`;
  }

  async function refresh() {
    if (!config.api) {
      const flat = core.publicWindows(now, rules);
      const byDay = new Map();
      const dayList = [];
      for (const w of flat) {
        if (!byDay.has(w.date)) {
          const day = { date: w.date, label: w.dayLabel, windows: [] };
          byDay.set(w.date, day);
          dayList.push(day);
        }
        byDay.get(w.date).windows.push({ ...w, state: 'open' });
      }
      renderPublicWindows(doc, box, dayList, { core, now, mode });
      return;
    }
    const res = await client.availability();
    if (!res.ok || !res.data || !Array.isArray(res.data.days)) {
      showClosed(doc, box);
      return;
    }
    renderPublicWindows(doc, box, res.data.days, { core, now, mode });
  }

  box.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-retry]') : null;
    if (target) refresh();
  });

  const locBtn = form.querySelector('[data-use-location]');
  if (locBtn) {
    locBtn.addEventListener('click', () => {
      const geo = doc.defaultView && doc.defaultView.navigator && doc.defaultView.navigator.geolocation;
      const liveGeo = geo || (typeof navigator !== 'undefined' ? navigator.geolocation : null);
      if (!liveGeo) return;
      liveGeo.getCurrentPosition((pos) => {
        form.querySelector('[name="lat"]').value = String(pos.coords.latitude);
        form.querySelector('[name="lng"]').value = String(pos.coords.longitude);
        const link = doc.getElementById('location-map');
        if (link) {
          link.href = core.mapsLink(pos.coords.latitude, pos.coords.longitude);
          link.hidden = false;
          link.textContent = 'Map pin';
        }
      }, () => {}, { enableHighAccuracy: true, timeout: 15000 });
    });
  }

  form.addEventListener('input', (event) => {
    if (event.target && event.target.classList) event.target.classList.remove('is-invalid');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    if (val(form, 'website')) return;
    const checked = [...form.querySelectorAll('input[name="window"]')].find((node) => node.checked);
    const values = {
      service: val(form, 'service'),
      serviceName: (service && [...service.options].find((opt) => opt.selected && opt.value) || { textContent: val(form, 'service') }).textContent,
      serviceItem: val(form, 'serviceItem'),
      description: val(form, 'description'),
      vehicle: val(form, 'vehicle'),
      windowId: checked && !checked.disabled ? checked.value : '',
      windowLabel: checked ? checked.getAttribute('data-label') : '',
      location: val(form, 'location'),
      lat: val(form, 'lat'),
      lng: val(form, 'lng'),
      name: val(form, 'name'),
      phone: val(form, 'phone'),
      email: val(form, 'email'),
      smsConsent: !!(form.querySelector('[name="smsConsent"]') && form.querySelector('[name="smsConsent"]').checked),
    };
    if (service && !values.serviceName) {
      const opt = [...service.options].find((o) => o.value === values.service);
      values.serviceName = opt ? opt.textContent : values.service;
    }
    const errs = core.validateBooking(values);
    if (Object.keys(errs).length) {
      mark(form, errs);
      if (errs.window) box.classList.add('is-invalid');
      if (msg) msg.textContent = Object.values(errs)[0];
      return;
    }
    const body = core.requestMessage(values);
    if (mode === 'request') {
      if (handoff) handoff.hidden = false;
      if (thanks) thanks.hidden = true;
      smsAnchor(doc.getElementById('book-handoff-sms'), core, config.phoneE164, body);
      if (msg) msg.textContent = 'Last step: send it to J';
      return;
    }
    pending = true;
    if (submit) submit.disabled = true;
    const res = await client.book({
      service: values.service,
      serviceItem: values.serviceItem,
      description: values.description,
      vehicle: values.vehicle,
      windowId: values.windowId,
      location: values.location,
      lat: values.lat,
      lng: values.lng,
      name: values.name,
      phone: values.phone,
      email: values.email,
      smsConsent: values.smsConsent,
      website: val(form, 'website'),
    });
    const data = res.data || {};
    if (data.error === 'window_taken') {
      pending = false;
      const days = data.availability && data.availability.days;
      if (days) renderPublicWindows(doc, box, days, { removeId: values.windowId, core, now, mode });
      else showClosed(doc, box);
      if (msg) msg.textContent = 'That window was just taken. Everything else you typed is still here. Pick another time.';
      return;
    }
    if (!res.ok || data.ok !== true || !data.booking) {
      pending = false;
      if (submit) submit.disabled = false;
      if (msg) msg.textContent = 'That did not go through. Text it to J instead.';
      smsAnchor(doc.getElementById('book-error-sms'), core, config.phoneE164, body);
      const err = doc.getElementById('book-error');
      if (err) err.hidden = false;
      return;
    }
    pending = false;
    if (thanks) thanks.hidden = false;
    if (handoff) handoff.hidden = true;
    form.hidden = true;
    const label = data.booking.full || data.booking.label;
    const line = doc.getElementById('book-thanks-label');
    if (line) line.textContent = `Booked: ${label}.`;
    wireIcs(doc.getElementById('book-ics'), core, data.booking);
    if (msg) msg.textContent = '';
  });

  if (opts.timers !== false && mode === 'live') {
    const timer = setInterval(() => {
      if (pending || doc.hidden) return;
      refresh();
    }, 30000);
    if (timer.unref) timer.unref();
    doc.addEventListener('visibilitychange', () => {
      if (!doc.hidden && !pending) refresh();
    });
  }
  await refresh();
}
