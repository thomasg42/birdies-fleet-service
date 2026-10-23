import { photoFor, stockPhoto } from './photos.mjs';
import { liveTowns } from '../site.config.mjs';

const ITEM_HREF = {
  'Preventative maintenance': 'fleet-maintenance',
  Diagnostics: 'fleet-maintenance',
  'Emergency fleet repairs': 'fleet-maintenance',
  'DOT inspections': 'dot-inspections',
  Brakes: 'mobile-repair',
  Suspension: 'mobile-repair',
  Steering: 'mobile-repair',
  'Wheel bearings': 'mobile-repair',
  Batteries: 'mobile-repair',
  Alternators: 'mobile-repair',
  Starters: 'mobile-repair',
  'Cooling systems': 'mobile-repair',
  'Diesel pickups': 'diesel-repair',
  'Heavy equipment': 'heavy-equipment-repair',
  'Construction equipment': 'heavy-equipment-repair',
  'Ranch equipment': 'heavy-equipment-repair',
  Hydraulics: 'diesel-repair',
  'Forest Service roads': 'backcountry-repair',
  Trailheads: 'backcountry-repair',
  Campsites: 'backcountry-repair',
  'Hunting areas': 'backcountry-repair',
  'Recovery assistance': 'backcountry-repair',
  'On-site repairs': 'backcountry-repair',
};

export function serviceCards(ctx) {
  return `<div class="cards">${ctx.categories.map((c) => `<article class="card">${stockPhoto(ctx, photoFor(ctx, c.id), 'card-photo')}
    <h3><a href="${ctx.link(c.href)}">${ctx.esc(c.name)}</a></h3>
    <ul>${c.items.map((item) => `<li><a href="${ctx.link(ITEM_HREF[item] || c.href)}">${ctx.esc(item)}</a></li>`).join('')}</ul>
  </article>`).join('')}</div>`;
}

export function howSteps(ctx) {
  const steps = [
    'Pick a time, or call for today and tomorrow.',
    'Tell us where it is parked: driveway, shop yard, job site, ranch, or trailhead.',
    'We come to you.',
  ];
  return `<ol class="steps">${steps.map((s, i) => `<li><strong>${i + 1}.</strong> ${ctx.esc(s)}</li>`).join('')}</ol>`;
}

export function textJ(label = 'Text Jay your location') {
  return `<div class="text-j" data-text-j-wrap>
    <button class="btn btn-blaze" type="button" data-text-j>${label}</button>
    <span class="fine">Your location goes only into your own text to Jay.</span>
    <span data-text-j-note hidden>Add the nearest road, trailhead or mile marker. On an iPhone, Compass can help. In Google Maps, long-press the spot to drop a pin and paste it into the text.</span>
  </div>`;
}

export function routeMap(ctx) {
  const links = ctx.towns.map((t) => `<li><a href="${ctx.link('service-area/' + t.slug)}">${ctx.esc(t.name)}</a></li>`).join('');
  return `<div class="map-layout">
    <div class="map-viewport"><iframe class="google-map" data-google-map data-map-mobile="https://www.google.com/maps/embed?origin=mfe&amp;pb=!1m11!1m8!1m3!1d2868698.1450053034!2d-111.05!3d45.4!3m2!1i1024!2i768!4f13.1!5e0!6i8!3m1!1sen!5m1!1sen" data-map-desktop="https://www.google.com/maps/embed?origin=mfe&amp;pb=!1m11!1m8!1m3!1d1434349.0725026517!2d-111.05!3d45.4!3m2!1i1024!2i768!4f13.1!5e0!6i8!3m1!1sen!5m1!1sen" title="Google Maps: Southwest Montana service area" width="720" height="520" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    <noscript><iframe class="google-map" title="Google Maps: Southwest Montana service area" src="https://www.google.com/maps/embed?origin=mfe&amp;pb=!1m11!1m8!1m3!1d2868698.1450053034!2d-111.05!3d45.4!3m2!1i1024!2i768!4f13.1!5e0!6i8!3m1!1sen!5m1!1sen" width="720" height="520" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></noscript></div>
    <ul class="town-list">${links}</ul>
  </div>`;
}

export function serviceLinks(ctx, except) {
  const items = ctx.services.filter((s) => s.slug !== except)
    .map((s) => `<li><a href="${ctx.link(s.slug)}">${ctx.esc(s.name)}</a></li>`).join('');
  return `<ul class="link-list">${items}</ul>`;
}

export function townLinks(ctx) {
  return `<ul class="town-list">${ctx.towns.map((t) => `<li><a href="${ctx.link('service-area/' + t.slug)}">${ctx.esc(t.name)}</a></li>`).join('')}</ul>`;
}

export function neighborLinks(ctx, town) {
  const byId = Object.fromEntries(liveTowns(ctx.SITE).map((t) => [t.id, t]));
  const items = (town.neighbors || []).map((id) => byId[id]).filter(Boolean)
    .map((t) => `<li><a href="${ctx.link('service-area/' + t.slug)}">${ctx.esc(t.name)}</a></li>`).join('');
  return `<ul class="town-list">${items}</ul>`;
}

const CONSENT = 'Text me about this appointment, including schedule changes. Msg &amp; data rates may apply. Reply STOP to opt out.';

function serviceOptions(ctx) {
  return ctx.services.map((s) => `<option value="${ctx.esc(s.id)}">${ctx.esc(s.name)}</option>`).join('');
}

export function scheduleForm(ctx) {
  const live = !!ctx.dev;
  const title = live ? 'Book a time' : 'Request a time';
  const button = live ? 'Book this time' : 'Request this time';
  return `<form id="book-form" class="stack">
    <label>What needs work
      <select name="service" required>
        <option value="">Select a service</option>
        ${serviceOptions(ctx)}
      </select>
    </label>
    <label>Which item, if you know it
      <input name="serviceItem" autocomplete="off">
    </label>
    <label>What it is doing
      <textarea name="description"></textarea>
    </label>
    <label>Vehicle or equipment
      <input name="vehicle" required autocomplete="off">
    </label>
    <fieldset id="window-box" data-field="window">
      <legend>Time window</legend>
    </fieldset>
    <label>Where it is parked
      <input name="location" required autocomplete="off">
    </label>
    <p><button class="btn btn-ghost" type="button" data-use-location>Use my location</button>
      <a id="location-map" hidden>Map pin</a></p>
    <input type="hidden" name="lat" value="">
    <input type="hidden" name="lng" value="">
    <label>Your name <input name="name" required autocomplete="name"></label>
    <label>Phone <input name="phone" type="tel" required autocomplete="tel" inputmode="tel" pattern="[0-9\\(\\)+\\.\\s\\-]{10,}"></label>
    <label>Email, if you want one <input name="email" type="email" autocomplete="email"></label>
    <label class="check"><input name="smsConsent" type="checkbox" value="yes"> <span>${CONSENT} <a href="${ctx.link('privacy')}">Privacy</a></span></label>
    <p class="hp" hidden><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></p>
    <p id="book-msg" class="form-msg" role="status"></p>
    <button id="book-submit" class="btn btn-blaze" type="submit">${button}</button>
    <div id="book-handoff" hidden>
      <a id="book-handoff-sms" class="btn btn-blaze">Text this to Jay</a>
    </div>
    <p id="book-error" hidden>That did not go through. <a id="book-error-sms">Text Jay</a></p>
    <div id="book-thanks" hidden>
      <p id="book-thanks-label"></p>
      <a id="book-ics" class="btn btn-ghost">Add to calendar</a>
    </div>
  </form>`;
}

export function contactForm(ctx) {
  return `<form id="contact-form" class="stack">
    <label>What do you need
      <select name="type" required>
        <option value="">Select one</option>
        <option value="request-service">Request service</option>
        <option value="fleet-account">Set up a fleet account</option>
        <option value="quote">Get a quote</option>
        <option value="something-else">Something else</option>
      </select>
    </label>
    <div id="fleet-fields" hidden>
      <label>Company <input name="company" autocomplete="organization"></label>
      <label>Units <input name="units" autocomplete="off"></label>
    </div>
    <label>Your name <input name="name" required autocomplete="name"></label>
    <label>Phone <input name="phone" type="tel" required autocomplete="tel" inputmode="tel" pattern="[0-9\\(\\)+\\.\\s\\-]{10,}"></label>
    <label>Email <input name="email" type="email" autocomplete="email"></label>
    <label>Where <input name="where" autocomplete="off"></label>
    <label>Details <textarea name="details"></textarea></label>
    <label class="check"><input name="smsConsent" type="checkbox" value="yes"> <span>${CONSENT} <a href="${ctx.link('privacy')}">Privacy</a></span></label>
    <p class="hp" hidden><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></p>
    <p id="contact-msg" class="form-msg" role="status"></p>
    <button id="contact-submit" class="btn btn-blaze" type="submit">Send to Jay</button>
    <div id="contact-handoff" hidden><a id="contact-handoff-sms" class="btn btn-blaze">Text this to Jay</a></div>
    <p id="contact-error" hidden>That did not go through. <a id="contact-error-sms">Text Jay</a></p>
    <p id="contact-thanks" hidden>Jay has your note.</p>
  </form>`;
}

export function fleetScreen(ctx) {
  return `<p id="fleet-msg" class="form-msg" role="status"></p>
  <form id="fleet-login" class="stack panel">
    <label>Fleet ID <input name="fleetId" required autocomplete="username"></label>
    <label>PIN <input name="pin" required inputmode="numeric" autocomplete="current-password"></label>
    <button class="btn btn-blaze" type="submit">Sign in</button>
    <p><a class="btn btn-ghost" href="${ctx.tel}">Emergency right now? Call Jay</a></p>
  </form>
  <div id="fleet-board" hidden>
    <p><button id="fleet-signout" class="btn btn-ghost" type="button">Sign out</button></p>
    <div id="fleet-windows"></div>
    <form id="fleet-book" class="stack">
      <label>What needs work
        <select name="service" required>
          <option value="">Select a service</option>
          ${serviceOptions(ctx)}
        </select>
      </label>
      <label>Unit <input name="unit" required></label>
      <label>Where it is parked <input name="location" required></label>
      <p><button class="btn btn-ghost" type="button" data-use-location>Use my location</button> <a id="fleet-map" hidden>Map pin</a></p>
      <input type="hidden" name="lat"><input type="hidden" name="lng">
      <label>Details <textarea name="details"></textarea></label>
      <label>On-site contact <input name="contactName" required autocomplete="name"></label>
      <label>Contact phone <input name="contactPhone" type="tel" required pattern="[0-9\\(\\)+\\.\\s\\-]{10,}"></label>
      <button class="btn btn-blaze" type="submit">Book this window</button>
    </form>
    <p id="fleet-done" hidden></p>
  </div>
  <dialog id="bump-dialog" aria-labelledby="bump-title">
    <h2 id="bump-title">Are you sure?</h2>
    <p id="bump-copy"></p>
    <div class="btn-row">
      <button id="bump-yes" class="btn btn-blaze" type="button">Yes, take this time</button>
      <button id="bump-no" class="btn btn-ghost" type="button">No, pick another time</button>
    </div>
  </dialog>`;
}
