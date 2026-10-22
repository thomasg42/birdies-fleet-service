import { postJson } from './booking-api.js';
import { val, mark, smsAnchor, setControl } from './booking-dom.js';

export function bootContact(doc, opts) {
  const form = doc.getElementById('contact-form');
  if (!form) return;
  const { config, core } = opts;
  const params = new URLSearchParams(opts.search || '');
  const type = form.querySelector('[name="type"]');
  const preset = params.get('type');
  if (preset && type && [...type.options].some((o) => o.value === preset)) setControl(type, preset);
  const fleetFields = doc.getElementById('fleet-fields');
  const sync = () => { if (fleetFields) fleetFields.hidden = val(form, 'type') !== 'fleet-account'; };
  sync();
  if (type) type.addEventListener('change', sync);
  const msg = doc.getElementById('contact-msg');
  const handoff = doc.getElementById('contact-handoff');
  const thanks = doc.getElementById('contact-thanks');
  const submit = doc.getElementById('contact-submit');
  let pending = false;
  form.addEventListener('input', (event) => {
    if (event.target && event.target.classList) event.target.classList.remove('is-invalid');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    if (val(form, 'website')) return;
    const values = {
      type: val(form, 'type'),
      typeLabel: type && [...type.options].find((o) => o.value === val(form, 'type')) ? [...type.options].find((o) => o.value === val(form, 'type')).textContent : val(form, 'type'),
      name: val(form, 'name'),
      phone: val(form, 'phone'),
      email: val(form, 'email'),
      company: fleetFields && fleetFields.hidden ? '' : val(form, 'company'),
      units: fleetFields && fleetFields.hidden ? '' : val(form, 'units'),
      where: val(form, 'where'),
      details: val(form, 'details'),
    };
    const errs = core.validateLead(values);
    if (Object.keys(errs).length) {
      mark(form, errs);
      if (msg) msg.textContent = Object.values(errs)[0];
      return;
    }
    const body = core.leadMessage(values);
    if (!config.leadEndpoint) {
      if (handoff) handoff.hidden = false;
      if (thanks) thanks.hidden = true;
      smsAnchor(doc.getElementById('contact-handoff-sms'), core, config.phoneE164, body);
      if (msg) msg.textContent = 'Last step: send it to J';
      return;
    }
    pending = true;
    if (submit) submit.disabled = true;
    const res = await postJson(config.leadEndpoint, {
      type: values.type,
      name: values.name,
      phone: values.phone,
      email: values.email,
      company: values.company,
      units: values.units,
      where: values.where,
      details: values.details,
      smsConsent: !!(form.querySelector('[name="smsConsent"]') && form.querySelector('[name="smsConsent"]').checked),
      website: val(form, 'website'),
    }, opts.fetchImpl);
    if (res.ok) {
      pending = false;
      if (thanks) thanks.hidden = false;
      if (handoff) handoff.hidden = true;
      form.hidden = true;
      if (msg) msg.textContent = '';
      return;
    }
    pending = false;
    if (submit) submit.disabled = false;
    if (msg) msg.textContent = 'That did not go through. Text it to J instead.';
    const err = doc.getElementById('contact-error');
    if (err) err.hidden = false;
    smsAnchor(doc.getElementById('contact-error-sms'), core, config.phoneE164, body);
  });
}

