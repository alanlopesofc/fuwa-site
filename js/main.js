import { createBottle } from './bottle3d.js';

(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);
  const params = new URLSearchParams(window.location.search);
  const variant = params.get('v')?.toLowerCase() === 'b' ? 'b' : 'a';
  document.documentElement.dataset.variant = variant;
  const frameCount = { desktop: 187, mobile: 187 };
  const frameStart = 18;
  const isPortrait = window.matchMedia('(orientation: portrait)');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameState = { progress: 0, index: 1 };
  const loaded = new Map();
  let frameDir = isPortrait.matches ? 'mobile' : 'desktop';
  let activeCount = frameCount[frameDir];
  let drawQueued = false;
  let lastDrawn = -1;
  let wProgress = 0;
  const filmCanvas = document.querySelector('#film-canvas');
  const wCanvas = document.querySelector('#w-canvas');
  const filmCtx = filmCanvas.getContext('2d');
  const wCtx = wCanvas.getContext('2d');
  const frameStatus = document.querySelector('#frame-status');
  const frameCounter = document.querySelector('#frame-counter');
  const filmLines = [...document.querySelectorAll('.film-line')];
  filmLines[0].textContent = variant === 'b' ? filmLines[0].dataset.b : filmLines[0].dataset.a;
  document.querySelector('#opening-title').textContent = variant === 'b' ? 'Você nunca quis tanto lavar o rosto.' : 'Parece chantilly.';
  document.querySelector('#opening-support').textContent = variant === 'b' ? 'Até sentir a FUWA.' : 'Mas não é para comer. É para sentir.';

  function framePath(index) { return `assets/frames/${frameDir}/f${String(frameStart + index - 1).padStart(3, '0')}.jpg`; }
  function loadFrame(index) {
    if (index < 1 || index > activeCount || loaded.has(index)) return loaded.get(index);
    const image = new Image(); image.decoding = 'async'; image.src = framePath(index);
    image.onload = () => { loaded.set(index, image); queueDraw(); if (index === activeCount) drawW(); };
    loaded.set(index, image); return image;
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
    const ratio = Math.min(window.devicePixelRatio || 1, 2); const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio)); canvas.height = Math.max(1, Math.floor(rect.height * ratio)); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function drawCover(ctx, canvas, image) {
    if (!image || !image.complete || !image.naturalWidth) return;
    const rect = canvas.getBoundingClientRect(); const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight); const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
    ctx.clearRect(0, 0, rect.width, rect.height); ctx.drawImage(image, (rect.width - width) / 2, (rect.height - height) / 2, width, height);
  }
  function drawFilm() {
    const index = Math.round(frameState.progress * (activeCount - 1)) + 1; frameState.index = index; const image = nearestLoaded(index); drawCover(filmCtx, filmCanvas, image);
    if (lastDrawn !== index) { frameCounter.textContent = `f${String(frameStart + index - 1).padStart(3, '0')} / f204`; frameStatus.textContent = image?.complete ? 'filme Fuwa' : 'carregando o filme'; lastDrawn = index; }
  }
  function queueDraw() { if (drawQueued) return; drawQueued = true; requestAnimationFrame(() => { drawQueued = false; drawFilm(); }); }
  function loadPriorityFrames() {
    [1, ...Array.from({ length: Math.ceil(activeCount / 8) }, (_, i) => (i + 1) * 8)].filter((i) => i <= activeCount).forEach(loadFrame); frameStatus.textContent = 'carregando o filme';
    let next = 2; const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 32));
    const fill = () => { const start = next; for (let i = 0; i < 12 && next <= activeCount; i += 1, next += 1) if (!loaded.has(next)) loadFrame(next); if (next <= activeCount) idle(fill); else if (start !== next) frameStatus.textContent = 'filme pronto'; }; idle(fill);
  }
  function resetFrameSource() { frameDir = isPortrait.matches ? 'mobile' : 'desktop'; activeCount = frameCount[frameDir]; loaded.clear(); lastDrawn = -1; loadFrame(1); loadFrame(activeCount); resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); queueDraw(); drawW(); loadPriorityFrames(); }

  const W_PATH = new Path2D('M17.5 48C17.5 43.31 21.31 39.5 26 39.5C30.69 39.5 34.5 43.31 34.5 48V74C34.5 78.69 38.31 82.5 43 82.5C47.69 82.5 51.5 78.69 51.5 74V55C51.5 50.31 55.31 46.5 60 46.5C64.69 46.5 68.5 50.31 68.5 55V74C68.5 78.69 72.31 82.5 77 82.5C81.69 82.5 85.5 78.69 85.5 74V39C85.5 34.31 89.31 30.5 94 30.5C98.69 30.5 102.5 34.31 102.5 39V74C102.5 88.08 91.08 99.5 77 99.5C70.47 99.5 64.51 97.04 60 93.01C55.49 97.04 49.53 99.5 43 99.5C28.92 99.5 17.5 88.08 17.5 74Z');
  const A0 = { x: 26, y: 62 }, A1 = { x: 60, y: 65 };
  function drawW() {
    const rect = wCanvas.getBoundingClientRect(); const W = rect.width; const H = rect.height; const image = loaded.get(activeCount)?.complete ? loaded.get(activeCount) : nearestLoaded(activeCount); if (!image || !image.complete || !W) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2); const raw = gsap.utils.clamp(0, 1, wProgress / 0.86); const e = prefersReduced.matches ? 1 : gsap.parseEase('power2.inOut')(raw); const s0 = Math.max((W / 2) / 8.5, (H / 2) / 21) * 1.25; const s1 = Math.min(W * 0.26, H * 0.34) / 85; const s = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * e); const ax = A0.x + (A1.x - A0.x) * e; const ay = A0.y + (A1.y - A0.y) * e; const cx = W / 2; const cy = H * (0.5 - 0.06 * e);
    wCtx.setTransform(ratio, 0, 0, ratio, 0, 0); wCtx.clearRect(0, 0, W, H); wCtx.save(); wCtx.setTransform(ratio * s, 0, 0, ratio * s, ratio * (cx - ax * s), ratio * (cy - ay * s)); wCtx.clip(W_PATH); wCtx.setTransform(ratio, 0, 0, ratio, 0, 0); const z = 1 + 0.06 * e; const base = Math.max(W / image.naturalWidth, H / image.naturalHeight) * z; const iw = image.naturalWidth * base; const ih = image.naturalHeight * base; wCtx.drawImage(image, (W - iw) / 2, (H - ih) / 2, iw, ih); const fill = gsap.utils.clamp(0, 1, (raw - 0.8) / 0.2); if (fill > 0) { wCtx.globalAlpha = fill; wCtx.fillStyle = '#6F86A3'; wCtx.fillRect(0, 0, W, H); wCtx.globalAlpha = 1; } wCtx.restore();
  }

  function setupMenu() { const trigger = document.querySelector('#menu-trigger'); const menu = document.querySelector('#site-menu'); const close = document.querySelector('#menu-close'); const setOpen = (open) => { menu.classList.toggle('is-open', open); menu.setAttribute('aria-hidden', String(!open)); trigger.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); }; trigger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open'))); close.addEventListener('click', () => setOpen(false)); menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false))); }
  function setupModal() { const modal = document.querySelector('#waitlist-modal'); const form = document.querySelector('#waitlist-form'); const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }; document.querySelectorAll('.waitlist-open').forEach((button) => button.addEventListener('click', () => { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); modal.querySelector('input').focus(); })); modal.querySelector('.modal-close').addEventListener('click', close); modal.addEventListener('click', (event) => { if (event.target === modal) close(); }); form.addEventListener('submit', (event) => { event.preventDefault(); if (!form.checkValidity()) return; form.classList.add('is-success'); form.querySelector('button').textContent = 'feito. até já.'; }); document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { close(); document.querySelector('#lightbox').classList.remove('is-open'); } }); }
  function setupLightbox() { const box = document.querySelector('#lightbox'); const video = document.querySelector('#lightbox-video'); const close = () => { video.pause(); video.removeAttribute('src'); box.classList.remove('is-open'); box.setAttribute('aria-hidden', 'true'); }; document.querySelectorAll('.ugc-card').forEach((button) => button.addEventListener('click', () => { video.src = button.dataset.video; video.muted = false; box.classList.add('is-open'); box.setAttribute('aria-hidden', 'false'); video.play(); })); box.querySelector('.lightbox-close').addEventListener('click', close); box.addEventListener('click', (event) => { if (event.target === box) close(); }); const io = new IntersectionObserver((entries) => entries.forEach((entry) => { const media = entry.target.querySelector('video'); if (entry.isIntersecting) media.play().catch(() => {}); else media.pause(); }), { threshold: .35 }); document.querySelectorAll('.ugc-card').forEach((card) => io.observe(card)); }
  let bottleApi = null;
  function setupBottle() { const mount = document.querySelector('#bottle-mount'); const introFilm = document.querySelector('#intro-film'); let bottle; try { bottle = createBottle({ container: mount, onClip: (polygon, enter, full) => { introFilm.style.clipPath = polygon; introFilm.style.opacity = String(enter);  } }); } catch (error) { console.error(error); document.body.classList.add('is-fallback'); return; } bottleApi = bottle; window.addEventListener('beforeunload', () => bottle.dispose(), { once: true }); }
  function setupMotion() { const quiet = prefersReduced.matches; const header = document.querySelector('.site-header'); gsap.to(header, { autoAlpha: 1, y: 0, duration: quiet ? 0 : .55, delay: quiet ? 0 : .5, ease: 'power3.out' }); gsap.fromTo('.product-bottle', { y: quiet ? 0 : 42, autoAlpha: quiet ? 1 : 0 }, { y: 0, autoAlpha: 1, duration: quiet ? 0 : .9, ease: 'power3.out', scrollTrigger: { trigger: '#produto', start: 'top 76%' } }); document.querySelectorAll('.benefit-grid img').forEach((image, index) => gsap.to(image, { clipPath: 'inset(0 0 0 0)', duration: quiet ? 0 : .9, delay: quiet ? 0 : index * .08, ease: 'power2.out', scrollTrigger: { trigger: image, start: 'top 82%' } })); if (quiet) gsap.set('.rupture-light', { clipPath: 'inset(0 0 0 0)' }); else { gsap.to('.rupture-light', { clipPath: 'inset(0 0 0 0)', ease: 'power2.out', scrollTrigger: { trigger: '#ruptura', start: 'top top', end: 'bottom bottom', scrub: .5 } }); gsap.utils.toArray('.rupture-copy p').forEach((el, i) => gsap.to(el, { autoAlpha: 1, y: 0, duration: .5, ease: 'power2.out', scrollTrigger: { trigger: '#ruptura', start: `${35 + i * 17}% top`, end: `${50 + i * 17}% top`, scrub: .5 } })); } const mobileIntro = window.matchMedia('(max-width: 800px)');
    const openingStage = document.querySelector('.opening-stage'); const wStage = document.querySelector('.w-stage'); const filmStage = document.querySelector('.film-stage');
    const segments = () => mobileIntro.matches ? [140, 280, 140] : [180, 380, 160];
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    ScrollTrigger.create({ trigger: '#intro', start: 'top top', end: 'bottom bottom', scrub: .5, onUpdate: (self) => {
      const [a, f, w] = segments(); const total = a + f + w - 100; const y = self.progress * total;
      const pOpen = clamp01(y / (a - 100)); const pFilm = clamp01((y - (a - 100)) / f); const pW = clamp01((y - (a - 100) - f) / w);
      if (bottleApi) bottleApi.setProgress(quiet ? Math.min(pOpen, 1) : pOpen);
      document.querySelector('.opening-copy').style.opacity = String(Math.max(0, 1 - pOpen * 4));
      const openingDone = pOpen >= 0.999 || !bottleApi;
      openingStage.style.visibility = openingDone && pOpen >= 0.999 ? 'hidden' : 'visible';
      frameState.progress = pFilm; queueDraw();
      filmLines.forEach((line) => { const active = pOpen >= 0.999 && pW <= 0 && pFilm >= Number(line.dataset.start) && pFilm <= Number(line.dataset.end); line.classList.toggle('active', active); line.style.transform = active || quiet ? 'translateY(0)' : 'translateY(18px)'; });
      wStage.style.visibility = pW > 0 ? 'visible' : 'hidden';
      filmStage.style.visibility = pW > 0.02 ? 'hidden' : 'visible';
      wProgress = pW; drawW();
      gsap.set('.w-caption', { autoAlpha: clamp01((pW - 0.72) / 0.14), y: quiet ? 0 : 18 * (1 - clamp01((pW - 0.72) / 0.14)) });
    } });
    ScrollTrigger.create({ trigger: '#produto', start: 'top 70%', endTrigger: '#oferta', end: 'top 20%', onEnter: () => document.querySelector('#fixed-cta').classList.add('is-visible'), onLeave: () => document.querySelector('#fixed-cta').classList.remove('is-visible'), onEnterBack: () => document.querySelector('#fixed-cta').classList.add('is-visible'), onLeaveBack: () => document.querySelector('#fixed-cta').classList.remove('is-visible') }); }

  resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); loadFrame(1); loadFrame(activeCount); loadPriorityFrames(); setupMenu(); setupModal(); setupLightbox(); setupBottle(); setupMotion();
  window.addEventListener('resize', () => { resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); queueDraw(); drawW(); ScrollTrigger.refresh(); }); isPortrait.addEventListener?.('change', resetFrameSource); document.fonts?.ready.then(() => ScrollTrigger.refresh());
  gsap.to('#progress-bar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true } }); setTimeout(() => { queueDraw(); drawW(); }, 300);
})();
