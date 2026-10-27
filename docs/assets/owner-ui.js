import { createClient } from './booking-api.js';

// Jay's fleet list: sign in with the owner PIN, add fleet clients, hand out new PINs, turn logins off.
// The sign-in token lives in memory only; closing the tab signs Jay out.

// Offers the sign-in to the phone's password manager where the browser supports it (Chrome,
// Android). Safari and the rest offer it on their own when the form hides after a good sign-in.
function offerToSave(doc, id, password, name) {
  const W = doc.defaultView;
  try {
    if (id && password && W && W.PasswordCredential && W.navigator && W.navigator.credentials) {
      W.navigator.credentials.store(new W.PasswordCredential({ id, password, name })).catch(() => {});
    }
  } catch (err) { /* the browser said no; the sign-in itself still worked */ }
}

export async function bootOwner(doc, opts) {
  const login = doc.getElementById('owner-login');
  if (!login) return;
  const app = doc.getElementById('owner-app');
  const list = doc.getElementById('owner-list');
  const form = doc.getElementById('owner-add');
  const formTitle = doc.getElementById('owner-form-title');
  const cancel = doc.getElementById('owner-cancel');
  const share = doc.getElementById('owner-share');
  const shareText = doc.getElementById('owner-share-text');
  const shareSms = doc.getElementById('owner-share-sms');
  const msg = doc.getElementById('owner-msg');
  const loginUrl = (app && app.dataset.loginUrl) || '';
  const client = createClient({ base: opts.config.api, fetchImpl: opts.fetchImpl });
  let token = '';
  let accounts = [];
  let editing = null; // the Fleet ID getting a new PIN, or null when adding
  let busy = false;

  const field = (name) => form.querySelector(`[name="${name}"]`);
  const say = (text) => { if (msg) msg.textContent = text; };
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

  function problem(res) {
    if (res.status === 0) return res.error === 'no_backend' ? 'This copy of the site is not connected to the booking desk.' : 'Can\'t reach the booking desk. Check the signal and try again.';
    if (res.status === 503) return 'The owner PIN isn\'t set up yet. Ask Thomas.';
    if (res.status === 429) return `Too many tries. Wait ${(res.data && res.data.retryAfter) || 15} minutes.`;
    if (res.status === 422) {
      const names = { id: 'Fleet ID', pin: 'PIN', name: 'Company or name' };
      const fields = (res.data && res.data.fields) || {};
      return `Check ${Object.entries(fields).map(([k, v]) => `${names[k] || k} (${v})`).join(', ')}.`;
    }
    return 'That didn\'t save. Try again.';
  }

  function signOut(text) {
    token = '';
    accounts = [];
    app.hidden = true;
    login.hidden = false;
    share.hidden = true;
    say(text || 'Signed out.');
  }

  function resetForm() {
    editing = null;
    for (const name of ['name', 'id', 'pin']) field(name).value = '';
    field('id').removeAttribute('readonly');
    field('id').removeAttribute('data-touched');
    formTitle.textContent = 'Add a fleet client';
    cancel.hidden = true;
  }

  function render() {
    list.textContent = '';
    if (!accounts.length) {
      const li = doc.createElement('li');
      li.textContent = 'No fleet clients yet. Add the first one below.';
      list.appendChild(li);
      return;
    }
    for (const a of accounts) {
      const li = doc.createElement('li');
      li.className = a.active ? 'owner-row' : 'owner-row is-off';
      const label = doc.createElement('span');
      label.textContent = `${a.name} · Fleet ID ${a.id}${a.active ? '' : ' · OFF'}`;
      const pin = doc.createElement('button');
      pin.type = 'button';
      pin.className = 'btn btn-ghost';
      pin.dataset.pin = a.id;
      pin.textContent = 'New PIN';
      const toggle = doc.createElement('button');
      toggle.type = 'button';
      toggle.className = 'btn btn-ghost';
      toggle.dataset.toggle = a.id;
      toggle.textContent = a.active ? 'Turn off' : 'Turn on';
      li.append(label, pin, toggle);
      list.appendChild(li);
    }
  }

  async function load() {
    const res = await client.ownerFleet(token);
    if (res.status === 401) return signOut('Signed out. Sign in again.');
    if (!res.ok) return say(problem(res));
    accounts = (res.data && res.data.accounts) || [];
    render();
  }

  async function save(body) {
    if (busy) return false;
    busy = true;
    const res = await client.ownerSave(token, body);
    busy = false;
    if (res.status === 401) {
      signOut('Signed out. Sign in again.');
      return false;
    }
    if (!res.ok) {
      say(problem(res));
      return false;
    }
    if (body.pin) {
      const text = `Birdie's fleet login: ${loginUrl} Fleet ID: ${body.id} PIN: ${body.pin}`;
      shareText.value = text;
      shareSms.setAttribute('href', `sms:?&body=${encodeURIComponent(text)}`);
      share.hidden = false;
    }
    await load();
    return true;
  }

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const input = login.querySelector('[name="pin"]');
    busy = true;
    say('Checking…');
    const pin = input.value.trim();
    const res = await client.ownerLogin({ pin });
    busy = false;
    if (!res.ok) { input.value = ''; return say(res.status === 401 ? 'That PIN didn\'t match.' : problem(res)); }
    token = res.data.token;
    login.hidden = true;
    app.hidden = false;
    offerToSave(doc, 'Jay', pin, 'Birdie\'s fleet list');
    input.value = '';
    say('');
    resetForm();
    await load();
  });

  field('name').addEventListener('input', () => {
    if (!editing && !field('id').hasAttribute('data-touched')) field('id').value = slug(field('name').value);
  });
  field('id').addEventListener('input', () => field('id').setAttribute('data-touched', '1'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = { id: slug(field('id').value), name: field('name').value.trim(), pin: field('pin').value.trim() };
    if (!editing && accounts.some((a) => a.id === body.id)) return say(`Fleet ID ${body.id} is already taken. Pick another.`);
    if (editing) {
      const current = accounts.find((a) => a.id === editing);
      body.active = current ? current.active : true;
    }
    const wasEditing = editing;
    say('Saving…');
    if (await save(body)) {
      say(wasEditing ? `New PIN saved for ${body.name}. The old PIN no longer works.` : `${body.name} added. They can sign in now.`);
      resetForm();
    }
  });

  cancel.addEventListener('click', () => {
    resetForm();
    say('');
  });

  list.addEventListener('click', async (event) => {
    const btn = event.target && event.target.closest ? event.target.closest('button') : null;
    if (!btn) return;
    const a = accounts.find((x) => x.id === (btn.dataset.pin || btn.dataset.toggle));
    if (!a) return;
    if (btn.dataset.pin) {
      editing = a.id;
      field('id').value = a.id;
      field('id').setAttribute('readonly', '');
      field('name').value = a.name;
      field('pin').value = '';
      formTitle.textContent = `New PIN for ${a.name}`;
      cancel.hidden = false;
      share.hidden = true;
      if (typeof field('pin').focus === 'function') field('pin').focus();
      return;
    }
    say(`${a.active ? 'Turning off' : 'Turning on'} ${a.name}…`);
    if (await save({ id: a.id, name: a.name, active: !a.active })) say(a.active ? `${a.name} can't sign in now.` : `${a.name} can sign in again.`);
  });

  const out = doc.getElementById('owner-signout');
  if (out) out.addEventListener('click', () => signOut());
}
