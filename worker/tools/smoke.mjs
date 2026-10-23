// Live smoke test for the booking backend, run after every deploy.
// Uses throwaway "ZZ TEST" data on the furthest open window and prints PASS/FAIL per check.
//   ADMIN_KEY=$(cat ~/.config/birdies-booking/ADMIN_KEY) node worker/tools/smoke.mjs https://birdies-booking.forevergoldai.workers.dev
// Then remove the test rows (README, "Deploy" step 6). Nothing is sent unless NOTIFY_WEBHOOK is set.
const base = String(process.argv[2] || '').replace(/\/$/, '');
const admin = process.env.ADMIN_KEY;
if (!base || !admin) {
  console.error('usage: ADMIN_KEY=... node worker/tools/smoke.mjs <worker-url>');
  process.exit(2);
}
const origin = 'https://thomasg42.github.io';
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
};

async function call(method, path, { body, token } = {}) {
  const headers = { Accept: 'application/json', Origin: origin };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

const health = await call('GET', '/health');
check(health.status === 200 && health.body.ok, 'health');

const pre = await fetch(`${base}/bookings`, {
  method: 'OPTIONS',
  headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
});
check(pre.status === 204 && pre.headers.get('access-control-allow-origin') === origin, 'CORS preflight from the site');

const avail = await call('GET', '/availability');
const wins = avail.body.days.flatMap((d) => d.windows);
check(avail.status === 200 && wins.length > 0, `availability: ${avail.body.days.length} days, first window ${avail.body.earliestPublicStart}`);

const target = [...wins].reverse().find((w) => w.state === 'open');
const cust = {
  service: 'mobile-repair',
  vehicle: 'ZZ test truck',
  windowId: target.id,
  location: 'ZZ test',
  name: 'ZZ TEST DELETE ME',
  phone: '406-555-0199',
  email: '',
  smsConsent: false,
  website: '',
};
const b1 = await call('POST', '/bookings', { body: cust });
check(b1.status === 201, `public booking on ${target.full}`);
const b2 = await call('POST', '/bookings', { body: { ...cust, name: 'ZZ TEST TWO' } });
check(b2.status === 409, 'the same window again is refused (409)');

const pin = String(1000 + Math.floor(Math.random() * 9000));
const acct = await call('POST', '/admin/fleet-accounts', { token: admin, body: { id: 'zz-test', name: 'ZZ Test Fleet', pin } });
check(acct.status === 200, 'admin created a test fleet account');
const bad = await call('POST', '/fleet/login', { body: { fleetId: 'zz-test', pin: pin === '0000' ? '1234' : '0000' } });
check(bad.status === 401, 'wrong PIN refused');
const login = await call('POST', '/fleet/login', { body: { fleetId: 'zz-test', pin } });
check(login.status === 200 && !!login.body.token, 'fleet login');
const token = login.body.token;

const job = { windowId: target.id, service: 'fleet-maintenance', unit: 'ZZ unit', location: 'ZZ yard', contactName: 'ZZ TEST', contactPhone: '406-555-0198' };
const ask = await call('POST', '/fleet/bookings', { token, body: job });
check(ask.status === 409 && ask.body.error === 'override_required', 'a booked window asks "Are you sure?" first');
const take = await call('POST', '/fleet/bookings', { token, body: { ...job, override: true } });
check(take.status === 201, 'fleet override took the window');

const box = await call('GET', '/admin/outbox', { token: admin });
const bump = box.body.outbox.find((r) => r.kind === 'BUMP');
check(!!bump && box.body.outbox.some((r) => r.kind === 'FLEET_OVERRIDE'), 'J and the bumped customer each got a draft');
const rs = decodeURIComponent(((bump && bump.text.match(/\?t=(\S+)$/)) || [])[1] || '');
const open = await call('GET', `/reschedule?t=${encodeURIComponent(rs)}`);
check(open.status === 200 && open.body.options.length === 2, `reschedule link offers: ${open.body.options.map((o) => o.full).join(' / ')}`);
const pick = open.body.more.length ? open.body.more[open.body.more.length - 1] : open.body.options[1];
const done = await call('POST', '/reschedule', { body: { token: rs, windowId: pick.id } });
check(done.status === 200 && done.body.state === 'done', `customer rebooked to ${pick.full}`);
const again = await call('POST', '/reschedule', { body: { token: rs, windowId: pick.id } });
check(again.status === 410, 'the link is used up');

const box2 = await call('GET', '/admin/outbox', { token: admin });
check(box2.body.outbox.some((r) => r.kind === 'RESCHEDULED'), 'J got the RESCHEDULED draft');
check(box2.body.outbox.every((r) => !r.delivered_at), 'dry run: nothing was sent');
for (const r of box2.body.outbox.slice().reverse()) console.log(`  outbox ${r.kind} to ${r.to_role}: ${r.text}`);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
