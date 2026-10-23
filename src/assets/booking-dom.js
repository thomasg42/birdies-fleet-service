export function setControl(el, value) {
  if (!el) return;
  if (el.options && el.options.length) {
    for (const opt of el.options) {
      if (opt.value === value) opt.selected = true;
    }
    return;
  }
  try { el.value = value; } catch (err) { el.setAttribute('value', value); }
}
export function val(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  if (!el) return '';
  if (el.type === 'checkbox') return el.checked ? 'yes' : '';
  if (el.type === 'radio') {
    const picked = [...form.querySelectorAll(`[name="${name}"]`)].find((node) => node.checked);
    return picked ? picked.value : '';
  }
  if (el.options && el.options.length) {
    const picked = [...el.options].find((opt) => opt.selected && opt.value);
    if (picked) return picked.value;
  }
  return el.value || '';
}
export function mark(form, errs) {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  for (const key of Object.keys(errs)) {
    const el = form.querySelector(`[name="${key}"]`) || form.querySelector(`[data-field="${key}"]`);
    if (el) el.classList.add('is-invalid');
  }
}
export function smsAnchor(node, core, phone, body) {
  if (!node) return;
  node.setAttribute('href', core.smsHref(phone, body));
}
export function icsHref(core, booking) {
  const text = core.icsFor({
    id: booking.id || booking.windowId,
    start: booking.start,
    end: booking.end,
    summary: `Birdie’s ${booking.full || booking.label || 'appointment'}`,
  });
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(text)}`;
}
export function wireIcs(node, core, booking) {
  if (!node || !booking) return;
  node.setAttribute('href', icsHref(core, booking));
  node.setAttribute('download', 'birdies.ics');
}
export function flattenDays(days, removeId) {
  const out = [];
  for (const day of days || []) {
    for (const w of day.windows || []) {
      if (removeId && w.id === removeId) continue;
      out.push({ ...w, date: w.date || day.date, dayLabel: w.dayLabel || day.label });
    }
  }
  return out;
}
export function weekHeading(group, now, core) {
  const parts = core.denverParts(now);
  const idx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
  const mondayOffset = idx === 0 ? -6 : 1 - idx;
  const monday = core.addDays(parts.year, parts.month, parts.day, mondayOffset);
  const thisKey = core.isoDate(monday);
  const next = core.addDays(monday.year, monday.month, monday.day, 7);
  if (group.key === thisKey) return 'This week';
  if (group.key === core.isoDate(next)) return 'Next week';
  return group.label;
}
