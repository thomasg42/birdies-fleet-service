/* Header, reveal, route line, Text J, and the hero scrub Codex will turn on. */

function smsHref(phone, body) {
  return `sms:${phone}?&body=${encodeURIComponent(body || '')}`;
}
function mapsLink(lat, lng) {
  return `https://maps.google.com/?q=${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}
function locationText(lat, lng, accuracy) {
  const map = mapsLink(lat, lng);
  const acc = Number.isFinite(Number(accuracy)) ? ` (about ${Math.round(Number(accuracy))} m)` : '';
  return `Birdies, I need help. My location: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}${acc} ${map}. Vehicle: . What it's doing: .`;
}
function locationFallbackText() {
  return 'Birdies, I need help. My location: . Vehicle: . What it\'s doing: .';
}

function bootNav(doc) {
  const toggle = doc.querySelector('.nav-toggle');
  const menu = doc.getElementById('nav-menu');
  if (!toggle || !menu) return;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  menu.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('a')) setOpen(false);
  });
  const servicesBtn = doc.querySelector('.nav-services-btn');
  const servicesList = doc.getElementById('nav-services-list');
  if (servicesBtn && servicesList) {
    servicesBtn.addEventListener('click', () => {
      const open = servicesBtn.getAttribute('aria-expanded') === 'true';
      servicesBtn.setAttribute('aria-expanded', String(!open));
      servicesList.classList.toggle('is-open', !open);
    });
  }
}

function bootReveal(doc) {
  if (doc.body && doc.body.classList.contains('page-tool')) return;
  const nodes = [...doc.querySelectorAll('.reveal')];
  if (!nodes.length) return;
  if (!('IntersectionObserver' in doc.defaultView)) {
    nodes.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new doc.defaultView.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  nodes.forEach((el) => io.observe(el));
}

function bootMap(doc) {
  const section = doc.querySelector('[data-route]');
  if (!section) return;
  const path = section.querySelector('[data-route-line]');
  const dots = [...section.querySelectorAll('[data-route-dot]')];
  const view = doc.defaultView;
  const reduce = view.matchMedia && view.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = doc.documentElement.classList.contains('js-motion') && !reduce;
  if (!path || typeof path.getTotalLength !== 'function' || !motion) {
    if (path) {
      try {
        const len = path.getTotalLength();
        path.style.strokeDasharray = String(len);
        path.style.strokeDashoffset = '0';
      } catch (err) { /* static map still shows */ }
    }
    dots.forEach((dot) => dot.classList.add('is-on'));
    return;
  }
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  let frame = 0;
  const draw = () => {
    frame = 0;
    const rect = section.getBoundingClientRect();
    const vh = view.innerHeight || 800;
    const total = Math.max(1, rect.height + vh * 0.6);
    const seen = vh * 0.7 - rect.top;
    const p = Math.min(1, Math.max(0, seen / total));
    path.style.strokeDashoffset = String(len * (1 - p));
    dots.forEach((dot) => {
      dot.classList.toggle('is-on', p >= Number(dot.getAttribute('data-route-at') || 0));
    });
  };
  const onScroll = () => { if (!frame) frame = view.requestAnimationFrame(draw); };
  view.addEventListener('scroll', onScroll, { passive: true });
  view.addEventListener('resize', onScroll, { passive: true });
  draw();
}

function bootTextJ(doc, cfg) {
  const phone = cfg.phoneE164 || '';
  doc.querySelectorAll('[data-text-j]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('[data-text-j-wrap]') || btn.parentElement;
      const note = wrap && wrap.querySelector('[data-text-j-note]');
      const go = (body) => { doc.defaultView.location.href = smsHref(phone, body); };
      const fail = () => {
        if (note) note.hidden = false;
        go(locationFallbackText());
      };
      const geo = doc.defaultView.navigator && doc.defaultView.navigator.geolocation;
      if (!geo || !geo.getCurrentPosition) { fail(); return; }
      geo.getCurrentPosition((pos) => {
        go(locationText(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy));
      }, fail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  });
}

export function bootHeroScrub(doc = document) {
  const hero = doc.querySelector('[data-hero-slot]');
  const heroVideo = hero && hero.querySelector('[data-hero-video]');
  if (!hero || !heroVideo) return;
  const heroCanvas = hero.querySelector('[data-hero-canvas]');
  const heroCtx = heroCanvas && heroCanvas.getContext && heroCanvas.getContext('2d', { alpha: false });
  if (!heroCtx) return;
  const view = doc.defaultView;
  const CFG = view.BIRDIES_CONFIG || {};

  function applyBeats(p, forceReveal) {
    hero.style.setProperty('--hero-p', String(p));
    const b1 = hero.querySelector('[data-beat="1"]');
    const b2 = hero.querySelector('[data-beat="2"]');
    const b3 = hero.querySelector('[data-beat="3"]');
    if (b1) b1.classList.toggle('is-on', forceReveal ? false : (p >= 0 && p <= 0.28));
    if (b2) b2.classList.toggle('is-on', forceReveal ? false : (p >= 0.32 && p <= 0.58));
    if (b3) b3.classList.toggle('is-on', forceReveal ? true : p >= 0.62);
  }
  function pickSrc() {
    const portrait = view.matchMedia && view.matchMedia('(orientation: portrait)').matches;
    const src9 = heroVideo.getAttribute('data-src-9x16');
    const src16 = heroVideo.getAttribute('data-src-16x9');
    if (portrait && src9) return src9;
    return src16 || src9 || '';
  }

  const media = hero.querySelector('.hero-media');
  const inner = hero.querySelector('.hero-inner');
  const rmq = view.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = view.navigator.connection && view.navigator.connection.saveData;
  if (rmq.matches || saveData || !pickSrc()) {
    hero.classList.add('is-static');
    applyBeats(1, true);
    return;
  }
  const holdFrom = (CFG.hero && CFG.hero.holdFrom) || 0.88;
  let targetProgress = 0;
  let displayedProgress = 0;
  let frame = 0;
  let ready = false;
  let primed = false;
  let seekPending = false;

  const drawFrame = () => {
    if (rmq.matches || heroVideo.readyState < 2 || !heroVideo.videoWidth) return;
    const density = Math.min(view.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(heroCanvas.clientWidth * density));
    const h = Math.max(1, Math.round(heroCanvas.clientHeight * density));
    if (heroCanvas.width !== w) heroCanvas.width = w;
    if (heroCanvas.height !== h) heroCanvas.height = h;
    const scale = Math.max(w / heroVideo.videoWidth, h / heroVideo.videoHeight);
    const vw = heroVideo.videoWidth * scale;
    const vh = heroVideo.videoHeight * scale;
    heroCtx.drawImage(heroVideo, (w - vw) * 0.5, (h - vh) * 0.5, vw, vh);
    heroCanvas.classList.add('is-ready');
  };
  const videoProgress = (p) => (p >= holdFrom ? 1 : (holdFrom > 0 ? p / holdFrom : p));
  const seek = () => {
    frame = 0;
    const duration = heroVideo.duration;
    if (!ready || rmq.matches || !isFinite(duration) || duration <= 0) return;
    displayedProgress += (targetProgress - displayedProgress) * 0.22;
    if (Math.abs(targetProgress - displayedProgress) < 0.0005) displayedProgress = targetProgress;
    const safeEnd = Math.max(0, duration - 0.04);
    const wantedTime = videoProgress(displayedProgress) * safeEnd;
    if (!seekPending && !heroVideo.seeking && Math.abs(heroVideo.currentTime - wantedTime) > 0.018) {
      seekPending = true;
      heroVideo.currentTime = wantedTime;
      view.setTimeout(() => { seekPending = false; }, 280);
    }
    applyBeats(displayedProgress, false);
    const caughtUp = displayedProgress === targetProgress && !heroVideo.seeking &&
      Math.abs(heroVideo.currentTime - videoProgress(targetProgress) * safeEnd) <= 0.024;
    if (!caughtUp) frame = view.requestAnimationFrame(seek);
  };
  const readScroll = () => {
    if (!ready || !media) return;
    const rect = hero.getBoundingClientRect();
    const top = parseFloat(view.getComputedStyle(media).top) || 0;
    const scrollable = hero.offsetHeight - media.offsetHeight;
    targetProgress = scrollable > 0 ? Math.min(1, Math.max(0, (top - rect.top) / scrollable)) : 0;
    if (!frame) frame = view.requestAnimationFrame(seek);
  };
  const fitCopy = () => {
    if (inner && media) inner.classList.toggle('is-pinned', inner.offsetHeight <= media.offsetHeight + 1);
  };
  const giveUp = () => {
    if (ready || !hero.classList.contains('is-scrub')) return;
    hero.classList.remove('is-scrub');
    hero.classList.add('is-static');
    applyBeats(1, true);
  };
  const markReady = () => {
    if (primed) return;
    primed = true;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      heroVideo.pause();
      ready = true;
      hero.classList.add('is-scrub');
      hero.classList.remove('is-static');
      fitCopy();
      drawFrame();
      readScroll();
    };
    const playback = heroVideo.play();
    if (playback && typeof playback.then === 'function') playback.then(finish, finish);
    else finish();
    view.setTimeout(finish, 1500);
  };

  heroVideo.addEventListener('loadeddata', markReady, { once: true });
  heroVideo.addEventListener('seeked', () => { seekPending = false; drawFrame(); });
  heroVideo.addEventListener('error', giveUp);
  view.addEventListener('scroll', readScroll, { passive: true });
  view.addEventListener('resize', () => { fitCopy(); if (ready) { drawFrame(); readScroll(); } }, { passive: true });
  hero.classList.add('is-scrub');
  fitCopy();
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playsInline = true;
  heroVideo.preload = 'auto';
  heroVideo.setAttribute('src', pickSrc());
  const request = heroVideo.play();
  if (request && request.catch) request.catch(() => {});
  view.setTimeout(() => { if (!primed) giveUp(); }, 6000);
  if (heroVideo.readyState >= 2) markReady();
}

export function bootChrome(doc, cfg = {}) {
  bootNav(doc);
  bootReveal(doc);
  bootMap(doc);
  bootTextJ(doc, cfg || {});
  bootHeroScrub(doc);
}
