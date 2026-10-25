(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  const frameCount = { desktop: 265, mobile: 266 };
  const isPortrait = window.matchMedia('(orientation: portrait)');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameState = { progress: 0, index: 0 };
  const loaded = new Map();
  let frameDir = isPortrait.matches ? 'mobile' : 'desktop';
  let activeCount = frameCount[frameDir];
  let drawQueued = false;
  let lastDrawn = -1;

  const filmCanvas = document.querySelector('#film-canvas');
  const wCanvas = document.querySelector('#w-canvas');
  const filmCtx = filmCanvas.getContext('2d');
  const wCtx = wCanvas.getContext('2d');
  const frameStatus = document.querySelector('#frame-status');
  const frameCounter = document.querySelector('#frame-counter');
  const filmLines = [...document.querySelectorAll('.film-line')];

  function framePath(index) { return `assets/frames/${frameDir}/f${String(index).padStart(3, '0')}.jpg`; }
  function loadFrame(index) {
    if (index < 1 || index > activeCount || loaded.has(index)) return loaded.get(index);
    const image = new Image();
    image.decoding = 'async';
    image.src = framePath(index);
    image.onload = () => { loaded.set(index, image); queueDraw(); if (index === activeCount) drawW(); };
    loaded.set(index, image);
    return image;
  }
  function nearestLoaded(index) {
    if (loaded.get(index)?.complete) return loaded.get(index);
    for (let distance = 1; distance < activeCount; distance += 1) {
      if (loaded.get(index - distance)?.complete) return loaded.get(index - distance);
      if (loaded.get(index + distance)?.complete) return loaded.get(index + distance);
    }
    return loaded.get(1);
  }
  function resizeCanvas(canvas, ctx) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function drawCover(ctx, canvas, image) {
    if (!image || !image.complete || !image.naturalWidth) return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.drawImage(image, (rect.width - width) / 2, (rect.height - height) / 2, width, height);
  }
  function drawFilm() {
    const index = Math.round(frameState.progress * (activeCount - 1)) + 1;
    frameState.index = index;
    const image = nearestLoaded(index);
    drawCover(filmCtx, filmCanvas, image);
    if (lastDrawn !== index) {
      frameCounter.textContent = `${String(index).padStart(2, '0')} / ${activeCount}`;
      frameStatus.textContent = image && image.complete ? 'filme Fuwa' : 'carregando o filme';
      lastDrawn = index;
    }
  }
  function queueDraw() { if (drawQueued) return; drawQueued = true; requestAnimationFrame(() => { drawQueued = false; drawFilm(); }); }
  function loadPriorityFrames() {
    [1, ...Array.from({ length: Math.ceil(activeCount / 8) }, (_, i) => (i + 1) * 8)].forEach(loadFrame);
    frameStatus.textContent = 'carregando o filme';
    let next = 2;
    const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 32));
    const fill = () => {
      const start = next;
      for (let i = 0; i < 12 && next <= activeCount; i += 1, next += 1) if (!loaded.has(next)) loadFrame(next);
      if (next <= activeCount) idle(fill); else if (start !== next) frameStatus.textContent = 'filme pronto';
    };
    idle(fill);
  }
  function resetFrameSource() {
    frameDir = isPortrait.matches ? 'mobile' : 'desktop';
    activeCount = frameCount[frameDir];
    loaded.clear(); lastDrawn = -1;
    loadFrame(1); loadFrame(activeCount); resizeCanvas(filmCanvas, filmCtx); queueDraw(); drawW(); loadPriorityFrames();
  }

  function setupMenu() {
    const trigger = document.querySelector('#menu-trigger'); const menu = document.querySelector('#site-menu'); const close = document.querySelector('#menu-close');
    const setOpen = (open) => { menu.classList.toggle('is-open', open); menu.setAttribute('aria-hidden', String(!open)); trigger.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); };
    trigger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open'))); close.addEventListener('click', () => setOpen(false));
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  }
  function setupForm() {
    const form = document.querySelector('#waitlist-form');
    form.addEventListener('submit', (event) => { event.preventDefault(); if (!form.checkValidity()) return; form.classList.add('is-success'); form.querySelector('button').textContent = 'feito. até já.'; });
  }
  function setupMotion() {
    const mm = gsap.matchMedia();
    const quiet = prefersReduced.matches;
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro.to('.site-header', { autoAlpha: 1, y: 0, duration: quiet ? 0 : .55 }, 1.1)
      .to('.hero-logo', { y: 0, autoAlpha: 1, duration: quiet ? 0 : .9 }, quiet ? 0 : 1.2)
      .to('.hero-tagline', { y: 0, autoAlpha: 1, duration: quiet ? 0 : .6 }, quiet ? 0 : 1.75);
    const revealTargets = document.querySelectorAll('.reveal-copy');
    if (quiet) gsap.set(revealTargets, { clearProps: 'all', opacity: 1 });
    else gsap.utils.toArray(revealTargets).forEach((target) => gsap.fromTo(target, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .85, ease: 'power3.out', scrollTrigger: { trigger: target, start: 'top 82%', end: 'top 58%', scrub: .5 } }));

    const filmTimeline = gsap.timeline({ scrollTrigger: { trigger: '.film', start: 'top top', end: 'bottom bottom', scrub: .5, pin: false, onUpdate: (self) => { frameState.progress = self.progress; queueDraw(); heroFade(self.progress); filmLines.forEach((line) => { const active = self.progress >= Number(line.dataset.start) && self.progress <= Number(line.dataset.end); gsap.to(line, { autoAlpha: active ? 1 : 0, y: quiet ? 0 : active ? 0 : 16, duration: quiet ? 0 : .25, overwrite: true }); }); } } });
    filmTimeline.to(frameState, { progress: 1, ease: 'none', duration: 1 });

    gsap.timeline({ scrollTrigger: { trigger: '.w-reveal', start: 'top top', end: 'bottom bottom', scrub: .6, onUpdate: (self) => { wProgress = self.progress; drawW(); } } })
      .fromTo('.w-caption', { y: quiet ? 0 : 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .14, ease: 'power2.out' }, .72)
      .to({}, { duration: .14 }, .86);
    mm.add('(min-width: 801px)', () => { document.querySelector('.film').style.height = '700vh'; });
  }
  function heroFade(p) {
    const k = gsap.utils.clamp(0, 1, 1 - p / 0.035);
    gsap.set('.film-stage .hero-content, .film-stage .scroll-cue, .film-stage .hero-scrim', { autoAlpha: k, y: quiet() ? 0 : (1 - k) * -24 });
    gsap.set('.film-status', { autoAlpha: 1 - k });
  }
  const quiet = () => prefersReduced.matches;

  // símbolo w (path preenchido de FUWA-SIMBOLO-*.svg); A0 = ponto dentro da haste esquerda, A1 = centro do w
  const W_PATH = new Path2D('M17.5 48C17.5 43.31 21.31 39.5 26 39.5C30.69 39.5 34.5 43.31 34.5 48V74C34.5 78.69 38.31 82.5 43 82.5C47.69 82.5 51.5 78.69 51.5 74V55C51.5 50.31 55.31 46.5 60 46.5C64.69 46.5 68.5 50.31 68.5 55V74C68.5 78.69 72.31 82.5 77 82.5C81.69 82.5 85.5 78.69 85.5 74V39C85.5 34.31 89.31 30.5 94 30.5C98.69 30.5 102.5 34.31 102.5 39V74C102.5 88.08 91.08 99.5 77 99.5C70.47 99.5 64.51 97.04 60 93.01C55.49 97.04 49.53 99.5 43 99.5C28.92 99.5 17.5 88.08 17.5 74Z');
  const A0 = { x: 26, y: 62 }, A1 = { x: 60, y: 65 };
  let wProgress = 0;
  function drawW() {
    const rect = wCanvas.getBoundingClientRect(); const W = rect.width, H = rect.height;
    const image = loaded.get(activeCount)?.complete ? loaded.get(activeCount) : nearestLoaded(activeCount);
    if (!image || !image.complete || !W) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const raw = gsap.utils.clamp(0, 1, wProgress / 0.86);
    const e = quiet() ? 1 : gsap.parseEase('power2.inOut')(raw);
    // escala inicial: a haste (17 un. de largura, ~22 un. acima do ponto) cobre a tela inteira
    const s0 = Math.max((W / 2) / 8.5, (H / 2) / 21) * 1.25;
    const s1 = Math.min(W * 0.26, H * 0.34) / 85;
    const s = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * e);
    const ax = A0.x + (A1.x - A0.x) * e, ay = A0.y + (A1.y - A0.y) * e;
    const cx = W / 2, cy = H * (0.5 - 0.06 * e);
    wCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    wCtx.clearRect(0, 0, W, H);
    wCtx.save();
    wCtx.setTransform(ratio * s, 0, 0, ratio * s, ratio * (cx - ax * s), ratio * (cy - ay * s));
    wCtx.clip(W_PATH);
    wCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const z = 1 + 0.06 * e; const base = Math.max(W / image.naturalWidth, H / image.naturalHeight) * z;
    const iw = image.naturalWidth * base, ih = image.naturalHeight * base;
    wCtx.drawImage(image, (W - iw) / 2, (H - ih) / 2, iw, ih);
    // no fim o w assume o Azul Fuwa
    const fill = gsap.utils.clamp(0, 1, (raw - 0.8) / 0.2);
    if (fill > 0) { wCtx.globalAlpha = fill; wCtx.fillStyle = '#6F86A3'; wCtx.fillRect(0, 0, W, H); wCtx.globalAlpha = 1; }
    wCtx.restore();
  }

  resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); loadFrame(1); loadFrame(activeCount); loadPriorityFrames();
  window.addEventListener('resize', () => { resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); queueDraw(); drawW(); ScrollTrigger.refresh(); });
  isPortrait.addEventListener?.('change', resetFrameSource);
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  setupMenu(); setupForm(); setupMotion(); heroFade(0);
  gsap.to('#progress-bar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true } });
  setTimeout(() => { queueDraw(); drawW(); }, 300);
})();
