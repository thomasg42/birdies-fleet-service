import { bootChrome } from './chrome.js';

window.__birdiesReady = true;
const cfg = window.BIRDIES_CONFIG || {};
if (cfg.dev && typeof window.BIRDIES_DEV_BOOT === 'function') {
  await window.BIRDIES_DEV_BOOT(window);
}

const params = new URLSearchParams(window.location.search);
let core = null;
async function loadCore() {
  if (!core) core = await import('./birdies-core.js');
  return core;
}

let now = new Date();
if (params.get('now')) now = (await loadCore()).parseLocal(params.get('now'));

bootChrome(document, cfg);

function opts() {
  return { config: cfg, core, now, search: window.location.search };
}

if (document.getElementById('book-form')) {
  await loadCore();
  const { bootSchedule } = await import('./schedule-ui.js');
  await bootSchedule(document, opts());
}
if (document.getElementById('fleet-login')) {
  await loadCore();
  const { bootFleet } = await import('./fleet-ui.js');
  await bootFleet(document, opts());
}
if (document.getElementById('reschedule-app')) {
  await loadCore();
  const { bootReschedule } = await import('./reschedule-ui.js');
  await bootReschedule(document, opts());
}
if (document.getElementById('contact-form')) {
  await loadCore();
  const { bootContact } = await import('./contact-ui.js');
  bootContact(document, opts());
}
