import { createClient } from './booking-api.js';
import { wireIcs } from './booking-dom.js';

export async function bootReschedule(doc, opts) {
  const root = doc.getElementById('reschedule-app');
  if (!root) return;
  const { config, core } = opts;
  const view = doc.getElementById('reschedule-view');
  const client = createClient({ base: config.api, fetchImpl: opts.fetchImpl });
  const params = new URLSearchParams(opts.search || '');
  const token = params.get('t') || '';
  let pending = false;
  let current = null;

  function clear(node) { node.textContent = ''; }
  function p(text) {
    const node = doc.createElement('p');
    node.textContent = text;
    return node;
  }
  function actions() {
    const row = doc.createElement('div');
    row.className = 'btn-row';
    const call = doc.createElement('a');
    call.className = 'btn btn-blaze';
    call.href = `tel:${config.phoneE164}`;
    call.textContent = `Call ${config.phoneDisplay}`;
    const text = doc.createElement('a');
    text.className = 'btn btn-ghost';
    text.href = core.smsHref(config.phoneE164, 'Birdies, I need help with a moved appointment.');
    text.textContent = 'Text J';
    row.appendChild(call);
    row.appendChild(text);
    return row;
  }
  function showFail(copy) {
    clear(view);
    view.appendChild(p(copy));
    view.appendChild(actions());
  }
  function showOptions(data) {
    clear(view);
    view.appendChild(p(`Hi ${data.firstName}, something came up and J needs to move your ${data.original.label} appointment. J will reach out to you in a little bit. If you'd like, pick a new time now:`));
    const list = doc.createElement('div');
    list.className = 'chip-grid';
    for (const option of data.options || []) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-blaze chip-btn';
      btn.setAttribute('data-pick', option.id);
      btn.textContent = option.full || option.label;
      list.appendChild(btn);
    }
    view.appendChild(list);
    const moreBtn = doc.createElement('button');
    moreBtn.type = 'button';
    moreBtn.setAttribute('data-more', '1');
    moreBtn.textContent = 'See more times';
    view.appendChild(moreBtn);
    const more = doc.createElement('div');
    more.className = 'chip-grid';
    more.hidden = true;
    more.id = 'reschedule-more';
    for (const option of data.more || []) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-ghost chip-btn';
      btn.setAttribute('data-pick', option.id);
      btn.textContent = option.full || option.label;
      more.appendChild(btn);
    }
    view.appendChild(more);
    const wait = doc.createElement('button');
    wait.type = 'button';
    wait.setAttribute('data-callback', '1');
    wait.textContent = 'I\'ll wait for J\'s call';
    view.appendChild(wait);
    view.appendChild(actions());
  }
  async function choose(body) {
    if (pending) return;
    pending = true;
    const res = await client.reschedulePost({ token, ...body });
    pending = false;
    const data = res.data || {};
    if (res.status === 409 && data.options) {
      current = {
        firstName: (current && current.firstName) || 'there',
        original: (current && current.original) || { label: 'appointment' },
        options: data.options,
        more: data.more || [],
      };
      showOptions(current);
      return;
    }
    if (res.status === 410) return showFail('This link has expired. Call or text J.');
    if (res.status === 404) return showFail('This link does not match a booking. Call or text J.');
    if (data.state === 'callback') {
      clear(view);
      view.appendChild(p('You asked to wait for J\'s call.'));
      view.appendChild(actions());
      return;
    }
    if (res.ok && data.state === 'done') {
      clear(view);
      view.appendChild(p(`You're set for ${data.label}.`));
      const ics = doc.createElement('a');
      ics.className = 'btn btn-ghost';
      ics.textContent = 'Add to calendar';
      wireIcs(ics, core, data.booking || { label: data.label, full: data.label });
      view.appendChild(ics);
      view.appendChild(actions());
      return;
    }
    showFail('Call or text J.');
  }

  clear(view);
  view.appendChild(p('Checking this link.'));
  if (!token || !config.api) {
    showFail('Call or text J.');
    return;
  }
  let res;
  try {
    res = await client.rescheduleGet(token);
  } catch (err) {
    showFail('Call or text J.');
    return;
  }
  if (!res || res.status === 0) return showFail('Call or text J.');
  if (res.status === 410) return showFail('This link has expired. Call or text J.');
  if (res.status === 404 || !res.ok) return showFail('This link does not match a booking. Call or text J.');
  const data = res.data;
  if (!data || data.state !== 'open') return showFail('Call or text J.');
  current = data;
  showOptions(data);
  view.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || !target.getAttribute) return;
    if (target.getAttribute('data-more')) {
      const more = doc.getElementById('reschedule-more');
      if (more) more.hidden = false;
      return;
    }
    if (target.getAttribute('data-callback')) {
      choose({ choice: 'callback' });
      return;
    }
    const pick = target.getAttribute('data-pick');
    if (pick) choose({ windowId: pick });
  });
}
