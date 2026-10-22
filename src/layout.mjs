import { liveServices, liveTowns, liveCategories } from '../site.config.mjs';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function makeCtx(SITE, slug, opts = {}) {
  const base = SITE.url.replace(/\/$/, '');
  const depth = opts.depth != null ? opts.depth : (slug ? String(slug).split('/').filter(Boolean).length : 0);
  const root = depth ? '../'.repeat(depth) : './';
  const services = liveServices(SITE);
  const towns = liveTowns(SITE);
  const categories = liveCategories(SITE);
  return {
    SITE, slug, root, esc, services, towns, categories,
    dev: !!opts.dev,
    abs: (path = '') => `${base}/${String(path).replace(/^\//, '')}`,
    link: (s) => (s ? `${root}${s}/` : root),
    tel: `tel:${SITE.phone.e164}`,
    sms: `sms:${SITE.phone.e164}?&body=${encodeURIComponent('Birdies, I need help.')}`,
    asset: (p) => `${root}assets/${p}?v=${encodeURIComponent(SITE.assetVersion)}`,
    font: (p) => `${root}assets/fonts/${p}`,
  };
}

function wordmark(ctx) {
  if (ctx.SITE.logo) {
    return `<img class="brand-logo" src="${ctx.asset(ctx.SITE.logo)}" alt="Birdies" width="180" height="48">`;
  }
  return `<span class="wordmark">BIRDIES<small>Fleet Service &amp; Backcountry Repair</small></span>`;
}

const treelines = `<div class="hero-media" aria-hidden="true">
  <svg class="treeline treeline-back" viewBox="0 0 1440 160" preserveAspectRatio="none"><path fill="currentColor" d="M0 160 0 90 70 70 120 100 180 48 250 92 330 40 420 88 520 36 640 96 760 44 900 100 1040 50 1180 92 1320 42 1440 80 1440 160Z"/></svg>
  <svg class="treeline treeline-mid" viewBox="0 0 1440 160" preserveAspectRatio="none"><path fill="currentColor" d="M0 160 0 110 60 78 130 112 200 60 280 104 360 54 470 108 580 48 700 112 830 58 960 116 1100 62 1240 108 1360 70 1440 100 1440 160Z"/></svg>
  <svg class="treeline treeline-front" viewBox="0 0 1440 120" preserveAspectRatio="none"><path fill="currentColor" d="M0 120 0 70 80 48 150 78 230 36 320 74 430 40 540 82 670 34 800 78 940 42 1080 86 1220 46 1440 72 1440 120Z"/></svg>
  <svg class="hero-dog" viewBox="0 0 220 150">
    <path fill="currentColor" d="M22 72c16 0 30 14 36 30-12 2-26-8-32-20-4-8-6-12-4-10z"/>
    <path fill="currentColor" d="M54 112c2-30 24-50 54-50 26 0 46 14 52 36 4 16-2 34-20 42-24 10-70 8-82-8-4-6-6-14-4-20z"/>
    <path fill="currentColor" d="M70 118c6 6 4 16 0 26H56c0-10 4-20 14-26z"/>
    <path fill="currentColor" d="M112 108h16v36h-16zM132 110h16v34h-16z"/>
    <path fill="currentColor" d="M126 74c12-10 28-12 40-2l-8 24c-14 4-28-2-34-16-2-4-2-4 2-6z"/>
    <ellipse cx="168" cy="58" rx="26" ry="22" fill="currentColor"/>
    <path fill="currentColor" d="M184 54h28c8 0 12 8 10 14s-8 12-18 12h-24c-2-8 0-18 4-26z"/>
    <path fill="#6B4A2F" d="M150 48c-8 0-18 12-16 30 1 12 8 18 14 16 10-4 14-18 12-32-1-8-6-14-10-14z"/>
    <circle cx="176" cy="54" r="3" fill="#0F0D0B"/>
    <ellipse cx="214" cy="68" rx="4" ry="3" fill="#0F0D0B"/>
  </svg>
</div>`;

export function homeHero(ctx) {
  const { SITE } = ctx;
  return `<section class="hero" data-hero-slot="v0-placeholder">
  ${treelines}
  <div class="wrap hero-inner">
    ${wordmark(ctx)}
    <h1>Mobile Fleet Service &amp; Backcountry Repair in Southwest Montana</h1>
    <p class="tag">${esc(SITE.tagline)}</p>
    <div class="btn-row">
      <a class="btn btn-blaze" href="${ctx.link('schedule')}">Book a time</a>
      <a class="btn btn-ghost" href="${ctx.tel}">Call ${esc(SITE.phone.display)}</a>
      <a class="btn btn-ghost" href="${ctx.sms}">Text J</a>
    </div>
    <p class="help-line">Need help today or tomorrow? Call or text J.</p>
    <p><a class="fleet-link" href="${ctx.link('fleet-login')}">Fleet client login</a></p>
  </div>
</section>`;
}

function header(ctx) {
  const services = ctx.services.map((s) =>
    `<li><a href="${ctx.link(s.slug)}"${ctx.slug === s.slug ? ' aria-current="page"' : ''}>${esc(s.nav)}</a></li>`).join('');
  const areaCurrent = ctx.slug === 'service-area' || String(ctx.slug).startsWith('service-area/');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="wrap header-row">
    <a class="brand" href="${ctx.link('')}" aria-label="${esc(ctx.SITE.name)}, home">${wordmark(ctx)}</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu">Menu</button>
    <nav id="nav-menu" class="nav-menu" aria-label="Main">
      <details class="nav-services">
        <summary>Services</summary>
        <ul>${services}</ul>
      </details>
      <a href="${ctx.link('service-area')}"${areaCurrent ? ' aria-current="page"' : ''}>Service Area</a>
      <a href="${ctx.link('faq')}"${ctx.slug === 'faq' ? ' aria-current="page"' : ''}>FAQ</a>
      <a href="${ctx.link('about')}"${ctx.slug === 'about' ? ' aria-current="page"' : ''}>About</a>
      <a href="${ctx.link('contact')}"${ctx.slug === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
      <a class="header-phone" href="${ctx.tel}">${esc(ctx.SITE.phone.display)}</a>
      <a class="btn btn-blaze" href="${ctx.link('schedule')}">Book a time</a>
      <a class="fleet-link" href="${ctx.link('fleet-login')}">Fleet login</a>
    </nav>
  </div>
</header>`;
}

function footer(ctx) {
  const services = ctx.services.map((s) => `<li><a href="${ctx.link(s.slug)}">${esc(s.name)}</a></li>`).join('');
  const towns = ctx.towns.map((t) => `<li><a href="${ctx.link('service-area/' + t.slug)}">${esc(t.name)}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="wrap foot-grid">
    <div>
      <p class="wordmark">BIRDIES<small>Fleet Service &amp; Backcountry Repair</small></p>
      <p>${esc(ctx.SITE.slogan)}</p>
      <p><a href="${ctx.tel}">${esc(ctx.SITE.phone.display)}</a></p>
    </div>
    <div>
      <p class="foot-title">Services</p>
      <ul class="link-list">${services}</ul>
    </div>
    <div>
      <p class="foot-title">Towns</p>
      <ul class="link-list">${towns}</ul>
      <p><a href="${ctx.link('fleet-login')}">Fleet login</a></p>
      <p><a href="${ctx.link('privacy')}">Privacy</a></p>
    </div>
  </div>
</footer>
<nav class="tap-bar" aria-label="Call, text, or book">
  <a href="${ctx.tel}">Call</a>
  <a href="${ctx.sms}">Text</a>
  <a class="tap-book" href="${ctx.link('schedule')}">Book</a>
</nav>`;
}

function ld(schema) {
  return schema.filter(Boolean).map((obj) =>
    `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`).join('\n');
}

function head(ctx, page, schema) {
  const { SITE } = ctx;
  const url = page.file === '404.html' ? ctx.abs('404.html') : ctx.abs(page.slug ? `${page.slug}/` : '');
  const noindex = page.noindex || !SITE.launched;
  const og = ctx.abs('assets/og.png');
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'}
<meta name="theme-color" content="#0F0D0B">
<link rel="icon" href="${ctx.root}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${ctx.font('big-shoulders-display-latin-800.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset('site.css')}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Birdies wordmark over a dark pine treeline">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${og}">
${ld(schema)}
<script>
(function(){
  document.documentElement.classList.add('js');
  var motion = false, save = false;
  try { motion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches; } catch (e) {}
  try { save = !!(navigator.connection && navigator.connection.saveData); } catch (e) {}
  if (motion && !save) document.documentElement.classList.add('js-motion');
  setTimeout(function(){ if (!window.__birdiesReady) document.documentElement.classList.remove('js'); }, 3000);
})();
</script>
</head>`;
}

export function crumbs(ctx, items) {
  const lis = items.map((item, i) => {
    if (i === items.length - 1) return `<li aria-current="page">${esc(item.name)}</li>`;
    return `<li><a href="${ctx.link(item.path)}">${esc(item.name)}</a></li>`;
  }).join('');
  return `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${lis}</ol></nav>`;
}

export function businessSchema(ctx) {
  const { SITE } = ctx;
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    '@id': ctx.abs('#business'),
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    telephone: SITE.phone.schema,
    slogan: SITE.slogan,
    founder: { '@type': 'Person', name: SITE.owner },
    address: { '@type': 'PostalAddress', addressRegion: 'MT', addressCountry: 'US' },
    areaServed: ctx.towns.map((t) => ({
      '@type': 'City',
      name: t.name,
      containedInPlace: { '@type': 'State', name: 'Montana' },
    })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: ctx.categories.map((c) => ({
        '@type': 'OfferCatalog',
        name: c.name,
        itemListElement: c.items.map((item) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: item },
        })),
      })),
    },
  };
}

export function webSiteSchema(ctx) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ctx.SITE.name,
    url: ctx.SITE.url,
    publisher: { '@id': ctx.abs('#business') },
  };
}

export function breadcrumbSchema(ctx, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.path === '' ? ctx.abs('') : ctx.abs(`${item.path}/`),
    })),
  };
}

export function serviceSchema(ctx, { name, serviceType, description, area }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    serviceType: serviceType || name,
    description,
    provider: { '@id': ctx.abs('#business') },
    areaServed: area || ctx.towns.map((t) => ({
      '@type': 'City',
      name: t.name,
      containedInPlace: { '@type': 'State', name: 'Montana' },
    })),
  };
}

export function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function pageHero(ctx, { kicker, h1, lead }) {
  return `<section class="page-hero"><div class="wrap">
    <p class="kicker">${esc(kicker)}</p>
    <h1>${h1}</h1>
    <p class="lead">${lead}</p>
    <div class="btn-row">
      <a class="btn btn-blaze" href="${ctx.link('schedule')}">Book a time</a>
      <a class="btn btn-ghost" href="${ctx.tel}">Call ${esc(ctx.SITE.phone.display)}</a>
    </div>
  </div></section>`;
}

export function ctaBand(ctx, title) {
  return `<section class="section band-bark"><div class="wrap reveal">
    <h2>${esc(title)}</h2>
    <div class="btn-row">
      <a class="btn btn-blaze" href="${ctx.link('schedule')}">Book a time</a>
      <a class="btn btn-ghost" href="${ctx.tel}">Call ${esc(ctx.SITE.phone.display)}</a>
      <a class="btn btn-ghost" href="${ctx.sms}">Text J</a>
    </div>
  </div></section>`;
}

function scripts(ctx) {
  const dev = ctx.dev
    ? `\n<script type="module" src="${ctx.root}assets/dev-boot.js"></script>`
    : '';
  return `<script src="${ctx.root}assets/config.js"></script>${dev}
<script type="module" src="${ctx.asset('site.js')}"></script>`;
}

export function renderPage(ctx, page) {
  const schema = page.schema ? page.schema(ctx) : [];
  const ribbon = ctx.dev
    ? `<p class="dev-ribbon" role="status">DEMO DATA, NOT LIVE</p><ol id="dev-outbox" class="outbox-list"></ol>`
    : '';
  return `${head(ctx, page, schema)}
<body class="${page.bodyClass || ''}">
${ribbon}
${header(ctx)}
<main id="main">
${page.body(ctx)}
</main>
${footer(ctx)}
${scripts(ctx)}
</body>
</html>
`;
}
