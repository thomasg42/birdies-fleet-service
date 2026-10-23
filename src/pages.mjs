import { forestPhoto } from './photos.mjs';
import { metaTitle, metaDescription, liveServices, liveTowns } from '../site.config.mjs';
import {
  homeHero, pageHero, ctaBand, crumbs, businessSchema, webSiteSchema,
  breadcrumbSchema, serviceSchema, faqSchema, renderPage,
} from './layout.mjs';
import {
  serviceCards, howSteps, textJ, routeMap, serviceLinks, townLinks,
  neighborLinks, scheduleForm, contactForm, fleetScreen,
} from './components.mjs';
import { FAQS, ABOUT_HTML, AREA_HTML, PRIVACY_HTML, SERVICE_COPY, TOWN_COPY } from './copy.mjs';
import { dogMark } from './dog.mjs';

export { renderPage };

function page(fields) {
  return {
    inSitemap: true,
    ...fields,
    title: metaTitle(fields.title),
    description: metaDescription(fields.description),
  };
}

const homeCrumb = { name: 'Home', path: '' };

export const PAGES = [
  page({
    slug: '',
    title: 'Birdies Fleet Service in Southwest Montana',
    description: 'J Smith brings fleet service and backcountry repair to the vehicle across Southwest Montana. Call or text 435-531-4127.',
    schema: (ctx) => [businessSchema(ctx), webSiteSchema(ctx)],
    body: (ctx) => `${homeHero(ctx)}
      <section class="section"><div class="wrap reveal">
        <h2>Mobile fleet service and backcountry repair across Southwest Montana</h2>
        ${serviceCards(ctx)}
      </div></section>
      <hr class="rule">
      <section class="section"><div class="wrap reveal">
        <h2>${ctx.esc(ctx.SITE.cardLines[0])}</h2>
        ${howSteps(ctx)}
      </div></section>
      <section class="section band-char"><div class="wrap reveal">
        <h2>Fleet priority accounts</h2>
        <p>A fleet account is a PIN and a board. Sign in to ask for a window sooner than the public line. Set the account up first.</p>
        <p><a class="btn btn-blaze" href="${ctx.link('contact')}?type=fleet-account">Set up a fleet account</a> <a class="btn btn-ghost" href="${ctx.link('fleet-login')}">Fleet client login</a></p>
      </div></section>
      <section class="section band-pine forest-opening" data-forest-opening>${forestPhoto(ctx, true)}<div class="wrap reveal">
        <h2>Backcountry</h2>
        <p>Forest Service roads, trailheads, campsites, and hunting areas. Send a pin when there is no street.</p>
        ${textJ()}
      </div></section>
      <section class="section" data-route><div class="wrap reveal">
        <h2>Service area</h2>
        ${routeMap(ctx)}
      </div></section>
      <section class="section"><div class="wrap trust-row">
        ${dogMark({ variant: 'color', className: 'trust-dog' })}
        <div>
          <p class="trust">${ctx.esc(ctx.SITE.trust)}</p>
          <p class="mascot-line">And our brindle mascot.</p>
        </div>
      </div></section>
      ${ctaBand(ctx, 'Book a window')}`,
  }),
];

for (const service of liveServices()) {
  const copy = SERVICE_COPY[service.id];
  if (!copy) throw new Error(`Missing copy for ${service.id}`);
  PAGES.push(page({
    slug: service.slug,
    title: copy.title,
    description: copy.description,
    schema: (ctx) => [
      serviceSchema(ctx, { name: service.name, serviceType: service.name, description: copy.description }),
      breadcrumbSchema(ctx, [homeCrumb, { name: service.name, path: service.slug }]),
    ],
    body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: service.name, path: service.slug }])}
      ${pageHero(ctx, { kicker: 'Southwest Montana', h1: ctx.esc(service.name), lead: ctx.esc(copy.description) })}
      <section class="section"><div class="wrap prose" data-service-copy>${copy.html}</div></section>
      <section class="section band-char"><div class="wrap">
        <h2>Other services</h2>
        ${serviceLinks(ctx, service.slug)}
        <h2>Towns</h2>
        ${townLinks(ctx)}
        ${service.id === 'backcountry-repair' ? textJ() : ''}
      </div></section>
      ${ctaBand(ctx, 'Book this service')}`,
  }));
}

PAGES.push(page({
  slug: 'service-area',
  title: 'Southwest Montana Service Area',
  description: 'Bozeman, Belgrade, Big Sky, Livingston, Ennis, Gardiner, and the towns between. J Smith comes to the vehicle. Call 435-531-4127.',
  schema: (ctx) => [
    serviceSchema(ctx, { name: 'Mobile mechanic', serviceType: 'Mobile mechanic', description: 'Mobile mechanic service across Southwest Montana.' }),
    breadcrumbSchema(ctx, [homeCrumb, { name: 'Service Area', path: 'service-area' }]),
  ],
  body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'Service Area', path: 'service-area' }])}
    ${pageHero(ctx, { kicker: 'Where we come', h1: 'Service area', lead: 'Ten towns in Southwest Montana. Open one for the roads.' })}
    <section class="section" data-route><div class="wrap prose">${AREA_HTML}${routeMap(ctx)}</div></section>
    ${ctaBand(ctx, 'Book a window')}`,
}));

for (const town of liveTowns()) {
  const html = TOWN_COPY[town.id];
  if (!html) throw new Error(`Missing town copy ${town.id}`);
  const slug = `service-area/${town.slug}`;
  PAGES.push(page({
    slug,
    title: `Mobile Mechanic in ${town.name}, Montana`,
    description: `Mobile mechanic service in ${town.name}, Montana. Fleet maintenance, diesel, and backcountry repair at the vehicle. Call or text 435-531-4127.`,
    schema: (ctx) => [
      serviceSchema(ctx, {
        name: 'Mobile mechanic',
        serviceType: 'Mobile mechanic',
        description: `Mobile mechanic in ${town.name}, Montana.`,
        area: { '@type': 'City', name: town.name, containedInPlace: { '@type': 'State', name: 'Montana' } },
      }),
      breadcrumbSchema(ctx, [homeCrumb, { name: 'Service Area', path: 'service-area' }, { name: town.name, path: slug }]),
    ],
    body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'Service Area', path: 'service-area' }, { name: town.name, path: slug }])}
      ${pageHero(ctx, { kicker: 'Southwest Montana', h1: `Mobile mechanic in ${ctx.esc(town.name)}`, lead: 'J comes to the vehicle. Send the place it is parked.' })}
      <section class="section"><div class="wrap prose" data-local-copy data-confirm="${town.confirm ? 'true' : 'false'}">${html}</div></section>
      <section class="section band-char"><div class="wrap">
        <h2>Services</h2>
        ${serviceLinks(ctx)}
        <h2>Nearby</h2>
        ${neighborLinks(ctx, town)}
        ${textJ()}
      </div></section>
      ${ctaBand(ctx, `Book in ${town.name}`)}`,
  }));
}

PAGES.push(page({
  slug: 'schedule',
  bodyClass: 'page-tool',
  title: 'Book a Time with Birdies',
  description: 'First come, first served windows in Mountain Time. Online booking skips today and tomorrow. Call or text J at 435-531-4127.',
  schema: (ctx) => [businessSchema(ctx), breadcrumbSchema(ctx, [homeCrumb, { name: 'Schedule', path: 'schedule' }])],
  body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'Schedule', path: 'schedule' }])}
    <section class="page-hero"><div class="wrap">
      <h1 id="book-title">${ctx.dev ? 'Book a time' : 'Request a time'}</h1>
      <p id="book-intro">First come, first served. For today or tomorrow, call or text J.</p>
    </div></section>
    <section class="section"><div class="wrap">${scheduleForm(ctx)}</div></section>`,
}));

PAGES.push(page({
  slug: 'about',
  title: 'About J Smith and Birdies',
  description: 'J Smith is the owner and mobile mechanic. Birdies is a locally owned LLC. Insured. We come to you. Call 435-531-4127.',
  schema: (ctx) => [
    { '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Birdies', url: ctx.abs('about/'), mainEntity: { '@id': ctx.abs('#business') } },
    breadcrumbSchema(ctx, [homeCrumb, { name: 'About', path: 'about' }]),
  ],
  body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'About', path: 'about' }])}
    ${pageHero(ctx, { kicker: 'Owner', h1: 'J Smith', lead: 'Owner and mobile mechanic.' })}
    <section class="section"><div class="wrap prose">${ABOUT_HTML}<p class="trust">${ctx.esc(ctx.SITE.trust)}</p></div></section>
    <section class="section band-char" id="mascot"><div class="wrap mascot-block">
      ${dogMark({ variant: 'color', className: 'about-dog' })}
      <div class="prose">
        <h2>Mascot</h2>
        <p>And our brindle mascot.</p>
        <p>The mark rides along. J Smith is still the person who comes to the vehicle.</p>
      </div>
    </div></section>`,
}));

PAGES.push(page({
  slug: 'contact',
  bodyClass: 'page-tool',
  title: 'Contact J Smith at Birdies',
  description: 'Request service, ask about a fleet account, or get a quote from J Smith. Call or text 435-531-4127 in Southwest Montana.',
  schema: (ctx) => [
    businessSchema(ctx),
    { '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact Birdies', url: ctx.abs('contact/'), mainEntity: { '@id': ctx.abs('#business') } },
    breadcrumbSchema(ctx, [homeCrumb, { name: 'Contact', path: 'contact' }]),
  ],
  body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'Contact', path: 'contact' }])}
    <section class="page-hero"><div class="wrap">
      <h1>Contact</h1>
      <p>Call or text ${ctx.esc(ctx.SITE.phone.display)}. Or send the note below.</p>
      ${textJ()}
    </div></section>
    <section class="section"><div class="wrap">${contactForm(ctx)}</div></section>`,
}));

PAGES.push(page({
  slug: 'faq',
  title: 'Birdies FAQ for Booking and Service',
  description: 'Answers on booking windows, Mountain Time, fleet PINs, quotes, and what to text when a vehicle has no street address.',
  schema: (ctx) => [faqSchema(FAQS), breadcrumbSchema(ctx, [homeCrumb, { name: 'FAQ', path: 'faq' }])],
  body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'FAQ', path: 'faq' }])}
    ${pageHero(ctx, { kicker: 'Questions', h1: 'FAQ', lead: 'Booking rules and what to send J.' })}
    <section class="section"><div class="wrap">${FAQS.map((f) => `<details class="panel"><summary>${ctx.esc(f.q)}</summary><p>${ctx.esc(f.a)}</p></details>`).join('')}</div></section>`,
}));

PAGES.push(page({
  slug: 'privacy',
  title: 'Privacy Draft for Birdies Texts',
  description: 'Draft privacy notes for booking texts, fleet sign-in, and location pins. Message rates, STOP, and HELP are spelled out for J to approve.',
  schema: (ctx) => [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Privacy', url: ctx.abs('privacy/') },
    breadcrumbSchema(ctx, [homeCrumb, { name: 'Privacy', path: 'privacy' }]),
  ],
  body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'Privacy', path: 'privacy' }])}
    ${pageHero(ctx, { kicker: 'Draft', h1: 'Privacy', lead: 'A draft for J to approve before the public copy goes out.' })}
    <section class="section"><div class="wrap prose">${PRIVACY_HTML}</div></section>`,
}));

PAGES.push(page({
  slug: 'fleet-login',
  bodyClass: 'page-tool',
  noindex: true,
  inSitemap: false,
  title: 'Fleet Client Login',
  description: 'Fleet clients sign in with a Fleet ID and PIN to see the board and request a window, including one sooner than the public line.',
  schema: (ctx) => [breadcrumbSchema(ctx, [homeCrumb, { name: 'Fleet login', path: 'fleet-login' }])],
  body: (ctx) => `${crumbs(ctx, [{ name: 'Home', path: '' }, { name: 'Fleet login', path: 'fleet-login' }])}
    <section class="page-hero"><div class="wrap">
      <h1 id="fleet-title">Fleet client login</h1>
      <p>Sign in to see the board. The PIN is checked by the desk and is not saved in the browser.</p>
    </div></section>
    <section class="section"><div class="wrap">${fleetScreen(ctx)}</div></section>`,
}));

PAGES.push(page({
  slug: 'reschedule',
  bodyClass: 'page-tool',
  noindex: true,
  inSitemap: false,
  title: 'Move a Birdies Appointment',
  description: 'Open the link from your text to pick a new window or wait for J to call. If the link is old, call or text 435-531-4127.',
  schema: (ctx) => [breadcrumbSchema(ctx, [homeCrumb, { name: 'Reschedule', path: 'reschedule' }])],
  body: () => `<section class="section"><div id="reschedule-app" class="wrap">
      <h1>Move a time</h1>
      <div id="reschedule-view"></div>
    </div></section>`,
}));

PAGES.push(page({
  slug: '404',
  file: '404.html',
  depth: 0,
  linkSlug: '',
  noindex: true,
  inSitemap: false,
  title: 'Wrong turn.',
  description: 'That page is not on the Birdies site. Book a time, browse services, or call and text J at 435-531-4127 in Southwest Montana.',
  schema: () => [],
  body: (ctx) => `<section class="page-hero"><div class="wrap miss-row">
      ${dogMark({ variant: 'color', className: 'miss-dog' })}
      <div>
      <h1>Wrong turn. Let's get you back on the trail.</h1>
      <p>That address is not here. Book a time, look at the services, or reach J directly.</p>
      <div class="btn-row">
        <a class="btn btn-blaze" href="${ctx.link('schedule')}">Book a time</a>
        <a class="btn btn-ghost" href="${ctx.link('fleet-maintenance')}">Services</a>
        <a class="btn btn-ghost" href="${ctx.tel}">Call ${ctx.esc(ctx.SITE.phone.display)}</a>
        <a class="btn btn-ghost" href="${ctx.sms}">Text J</a>
      </div>
      ${textJ()}
      </div>
    </div></section>`,
}));
