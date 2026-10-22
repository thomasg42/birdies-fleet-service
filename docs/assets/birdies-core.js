/* Pure booking rules. No DOM. No fetch. A Cloudflare Worker can import this file unchanged. */
const TZ = 'America/Denver';

export const DEFAULT_RULES = {
  timeZone: TZ,
  workDays: [1, 2, 3, 4, 5, 6],
  windows: [
    { start: '08:00', end: '10:00' },
    { start: '10:00', end: '12:00' },
    { start: '12:00', end: '14:00' },
    { start: '14:00', end: '16:00' },
  ],
  publicFirstDayOffset: 2,
  fleetLeadMinutes: 30,
  bumpLeadHours: 2,
  bumpOptionCount: 2,
  horizonDays: 21,
};

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function pad(n) { return String(n).padStart(2, '0'); }

export function denverParts(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  let day = Number(bag.day);
  let month = Number(bag.month);
  let year = Number(bag.year);
  if (hour === 24) hour = 0;
  return {
    year, month, day, hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: bag.weekday,
  };
}

export function zonedTime(year, month, day, hour, minute) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const guess = new Date(utc);
    const p = denverParts(guess);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const want = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = want - shown;
    if (diff === 0) return guess;
    utc += diff;
  }
  return new Date(utc);
}

export function addDays(year, month, day, n) {
  const t = new Date(Date.UTC(year, month - 1, day + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function parseLocal(input) {
  if (input instanceof Date) return new Date(input.getTime());
  const s = String(input);
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) throw new Error('bad date ' + s);
  return zonedTime(+m[1], +m[2], +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

export function isoDate(parts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function toOffsetIso(date) {
  const p = denverParts(date);
  const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let off = Math.round((shown - date.getTime()) / 60000);
  const sign = off >= 0 ? '+' : '-';
  off = Math.abs(off);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${sign}${pad(Math.floor(off / 60))}:${pad(off % 60)}`;
}

function weekdayOf(year, month, day) {
  return denverParts(zonedTime(year, month, day, 12, 0)).weekday;
}

export function isWorkDate(dateLike, rules = DEFAULT_RULES) {
  const days = rules.workDays || DEFAULT_RULES.workDays;
  if (typeof dateLike === 'object' && dateLike.year) {
    return days.includes(WEEKDAY_INDEX[weekdayOf(dateLike.year, dateLike.month, dateLike.day)]);
  }
  const p = denverParts(dateLike);
  return days.includes(WEEKDAY_INDEX[p.weekday]);
}

export function isWorkDay(date, rules = DEFAULT_RULES) {
  return isWorkDate(date, rules);
}

function rollWorkDate(dateLike, rules) {
  let cursor = { year: dateLike.year, month: dateLike.month, day: dateLike.day };
  for (let i = 0; i < 8; i++) {
    if (isWorkDate(cursor, rules)) return cursor;
    cursor = addDays(cursor.year, cursor.month, cursor.day, 1);
  }
  return cursor;
}

function atFirstWindow(dateLike, rules) {
  const [h, m] = rules.windows[0].start.split(':').map(Number);
  return zonedTime(dateLike.year, dateLike.month, dateLike.day, h, m);
}

function clockLabel(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  let h = hour % 12;
  if (h === 0) h = 12;
  return { h, period };
}

export function labelWindow(startHour, endHour) {
  const a = clockLabel(startHour);
  const b = clockLabel(endHour);
  if (a.period === b.period) return `${a.h} to ${b.h} ${b.period}`;
  return `${a.h} ${a.period} to ${b.h} ${b.period}`;
}

export function labelDay(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function labelFull(date, startHour, endHour) {
  return `${labelDay(date)}, ${labelWindow(startHour, endHour)}`;
}

function windowId(parts, start) {
  return `${isoDate(parts)}T${start}`;
}

export function generateWindows(earliestInstant, untilInstant, rules = DEFAULT_RULES) {
  const earliest = earliestInstant.getTime();
  const until = untilInstant.getTime();
  const startParts = denverParts(earliestInstant);
  let cursor = { year: startParts.year, month: startParts.month, day: startParts.day };
  const out = [];
  for (let n = 0; n < 40; n++) {
    if (isWorkDate(cursor, rules)) {
      for (const w of rules.windows) {
        const [sh, sm] = w.start.split(':').map(Number);
        const [eh, em] = w.end.split(':').map(Number);
        const start = zonedTime(cursor.year, cursor.month, cursor.day, sh, sm);
        if (start.getTime() < earliest) continue;
        if (start.getTime() > until) return out;
        const end = zonedTime(cursor.year, cursor.month, cursor.day, eh, em);
        const dayLabel = labelDay(start);
        const label = labelWindow(sh, eh);
        out.push({
          id: windowId(cursor, w.start),
          start: toOffsetIso(start),
          end: toOffsetIso(end),
          date: isoDate(cursor),
          label,
          dayLabel,
          full: `${dayLabel}, ${label}`,
        });
      }
    }
    const next = addDays(cursor.year, cursor.month, cursor.day, 1);
    const nextNoon = zonedTime(next.year, next.month, next.day, 12, 0);
    if (nextNoon.getTime() > until + 24 * 60 * 60 * 1000) break;
    cursor = next;
  }
  return out;
}

export function nextWindowStart(instant, rules = DEFAULT_RULES) {
  const end = new Date(instant.getTime() + 14 * 24 * 60 * 60 * 1000);
  const wins = generateWindows(instant, end, rules);
  return wins.length ? new Date(wins[0].start) : null;
}

export function earliestPublicStart(now, rules = DEFAULT_RULES) {
  const offset = rules.publicFirstDayOffset ?? 2;
  const p = denverParts(now);
  if (offset <= 1) {
    const target = addDays(p.year, p.month, p.day, offset);
    if (!isWorkDate(target, rules)) return atFirstWindow(rollWorkDate(target, rules), rules);
    const instant = zonedTime(target.year, target.month, target.day, p.hour, p.minute);
    return nextWindowStart(instant, rules);
  }
  return atFirstWindow(rollWorkDate(addDays(p.year, p.month, p.day, offset), rules), rules);
}

export function fleetEarliestStart(now, rules = DEFAULT_RULES) {
  const lead = (rules.fleetLeadMinutes ?? 30) * 60 * 1000;
  return nextWindowStart(new Date(now.getTime() + lead), rules);
}

function horizonEnd(now, rules) {
  return new Date(now.getTime() + (rules.horizonDays ?? 21) * 24 * 60 * 60 * 1000);
}

export function publicWindows(now, rules = DEFAULT_RULES) {
  return generateWindows(earliestPublicStart(now, rules), horizonEnd(now, rules), rules);
}

export function fleetWindows(now, rules = DEFAULT_RULES) {
  return generateWindows(fleetEarliestStart(now, rules), horizonEnd(now, rules), rules);
}

export function bumpOptions(now, rules = DEFAULT_RULES, takenId, occupiedIds = []) {
  const lead = (rules.bumpLeadHours ?? 2) * 60 * 60 * 1000;
  const earliest = new Date(now.getTime() + lead);
  const blocked = new Set([takenId, ...(occupiedIds || [])].filter(Boolean));
  const count = rules.bumpOptionCount ?? 2;
  return generateWindows(earliest, horizonEnd(now, rules), rules)
    .filter((w) => !blocked.has(w.id))
    .slice(0, count);
}

export function groupByWeek(windows) {
  const groups = [];
  const byKey = new Map();
  for (const w of windows) {
    const [y, m, d] = w.date.split('-').map(Number);
    const noon = zonedTime(y, m, d, 12, 0);
    const p = denverParts(noon);
    const idx = WEEKDAY_INDEX[p.weekday];
    const mondayOffset = idx === 0 ? -6 : 1 - idx;
    const monday = addDays(y, m, d, mondayOffset);
    const key = isoDate(monday);
    if (!byKey.has(key)) {
      const labelDate = zonedTime(monday.year, monday.month, monday.day, 12, 0);
      const group = { key, label: 'Week of ' + labelDay(labelDate).replace(/^[^,]+, /, ''), windows: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).windows.push(w);
  }
  return groups;
}

export function phoneOk(s) {
  const raw = String(s || '').trim();
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 && /^[0-9\s().+\-]+$/.test(raw);
}

export function emailOk(s) {
  if (!s || !String(s).trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
}

export function validateBooking(v) {
  const errs = {};
  if (!v.service) errs.service = 'Pick what needs work.';
  if (!String(v.vehicle || '').trim()) errs.vehicle = 'Add the vehicle or equipment.';
  if (!v.windowId) errs.window = 'Pick a day and window.';
  if (!String(v.location || '').trim()) errs.location = 'Say where it is parked.';
  if (!String(v.name || '').trim()) errs.name = 'Add your name.';
  if (!phoneOk(v.phone)) errs.phone = 'Add a phone number J can call or text.';
  if (!emailOk(v.email)) errs.email = 'That email does not look right.';
  return errs;
}

export function validateFleetBooking(v) {
  const errs = {};
  if (!v.service) errs.service = 'Pick what needs work.';
  if (!String(v.unit || '').trim()) errs.unit = 'Add the unit.';
  if (!String(v.location || '').trim()) errs.location = 'Say where it is parked.';
  if (!v.windowId) errs.window = 'Pick a window.';
  if (!String(v.contactName || '').trim()) errs.contactName = 'Add an on-site contact.';
  if (!phoneOk(v.contactPhone)) errs.contactPhone = 'Add a phone number for the on-site contact.';
  return errs;
}

export function validateLead(v) {
  const errs = {};
  if (!v.type) errs.type = 'Pick what you need.';
  if (!String(v.name || '').trim()) errs.name = 'Add your name.';
  if (!phoneOk(v.phone)) errs.phone = 'Add a phone number J can call or text.';
  if (!emailOk(v.email)) errs.email = 'That email does not look right.';
  return errs;
}

export function requestMessage(v) {
  const lines = ['Birdies time request'];
  const add = (k, val) => { if (val && String(val).trim()) lines.push(`${k}: ${String(val).trim()}`); };
  add('Service', v.serviceName || v.service);
  add('Item', v.serviceItem);
  add('What it is doing', v.description);
  add('Vehicle', v.vehicle);
  add('Time', v.windowLabel);
  add('Where', v.location);
  if (v.lat && v.lng) add('Map', mapsLink(v.lat, v.lng));
  add('Name', v.name);
  add('Phone', v.phone);
  add('Email', v.email);
  return lines.join('\n');
}

export function leadMessage(v) {
  const lines = ['Birdies website request'];
  const add = (k, val) => { if (val && String(val).trim()) lines.push(`${k}: ${String(val).trim()}`); };
  add('Need', v.typeLabel || v.type);
  add('Name', v.name);
  add('Phone', v.phone);
  add('Email', v.email);
  add('Company', v.company);
  add('Units', v.units);
  add('Where', v.where);
  add('Details', v.details);
  return lines.join('\n');
}

export function smsHref(phone, body) {
  return `sms:${phone}?&body=${encodeURIComponent(body || '')}`;
}

export function mapsLink(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return '';
  return `https://maps.google.com/?q=${la.toFixed(5)},${ln.toFixed(5)}`;
}

export function locationText(lat, lng, accuracy) {
  const map = mapsLink(lat, lng);
  const acc = Number.isFinite(Number(accuracy)) ? ` (about ${Math.round(Number(accuracy))} m)` : '';
  return `Birdies, I need help. My location: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}${acc} ${map}. Vehicle: . What it's doing: .`;
}

export function locationFallbackText() {
  return 'Birdies, I need help. My location: . Vehicle: . What it\'s doing: .';
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function icsStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function icsFor(booking) {
  const start = new Date(booking.start);
  const end = new Date(booking.end);
  const uid = `${booking.id || booking.windowId || icsStamp(start)}@birdies`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Birdies//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(booking.summary || ('Birdies ' + (booking.full || booking.label || 'appointment')))}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function firstName(name) {
  const bit = String(name || '').trim().split(/\s+/)[0];
  return bit || 'there';
}

export function bumpDrafts({ accountName, label, customerName, customerPhone, options, rescheduleUrl }) {
  const openings = (options || []).map((o) => o.full || o.label).join('; ');
  return [
    {
      to: 'J',
      kind: 'FLEET_OVERRIDE',
      text: `Birdies fleet: ${accountName} took ${label}. Bumped ${customerName} ${customerPhone}. They have a reschedule link.`,
    },
    {
      to: 'customer',
      kind: 'BUMP',
      text: `Birdies: Something came up and J needs to move your ${label} appointment. J will reach out to you in a little bit. Next openings: ${openings}. Pick one: ${rescheduleUrl}`,
    },
  ];
}

export function rescheduledDraft({ customerName, fromLabel, toLabel }) {
  return {
    to: 'J',
    kind: 'RESCHEDULED',
    text: `Birdies RESCHEDULED: ${customerName} moved from ${fromLabel} to ${toLabel}.`,
  };
}

export function newBookingDraft({ who, label, name, phone, where }) {
  return {
    to: 'J',
    kind: 'NEW_BOOKING',
    text: `Birdies booking: ${who} booked ${label}. ${name} ${phone}. Where: ${where}.`,
  };
}
