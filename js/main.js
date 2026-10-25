import { createBottle } from './bottle3d.js';

(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);
  const params = new URLSearchParams(window.location.search);
  const variant = params.get('v')?.toLowerCase() === 'b' ? 'b' : 'a';
  document.documentElement.dataset.variant = variant;
  // celular: 94 quadros de 540 px (6 fps) para caber na memória do iPhone; desktop: 187 de 1600 px
  const frameCount = { desktop: 187, m: 94 }; const frameStarts = { desktop: 18, m: 1 };
  const frameStart = 18;
  const isPortrait = window.matchMedia('(orientation: portrait)');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameState = { progress: 0, index: 1 };
  const loaded = new Map();
  let frameDir = isPortrait.matches ? 'm' : 'desktop';
  let activeCount = frameCount[frameDir];
  let drawQueued = false;
  let lastDrawn = -1;
  let wProgress = 0; let wQueued = false; let wCache = null;
  function queueW() { if (wQueued) return; wQueued = true; requestAnimationFrame(() => { wQueued = false; if (wStageVisible()) drawW(); }); }
  function wStageVisible() { const st = document.querySelector('.w-stage'); return st && st.style.visibility !== 'hidden'; }
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

  function framePath(index) { return `assets/frames/${frameDir}/f${String(frameStarts[frameDir] + index - 1).padStart(3, '0')}.jpg`; }
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
  // no celular os quadros têm 720 px: acima de 1.5x só gasta GPU
  function dprCap() { return Math.min(window.devicePixelRatio || 1, window.matchMedia('(max-width: 800px)').matches ? 1.5 : 2); }
  function resizeCanvas(canvas, ctx) {
    filmDrawnIndex = -1; wCache = null;
    const ratio = dprCap(); const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio)); canvas.height = Math.max(1, Math.floor(rect.height * ratio)); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function drawCover(ctx, canvas, image) {
    if (!image || !image.complete || !image.naturalWidth) return;
    const rect = canvas.getBoundingClientRect(); const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight); const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
    ctx.clearRect(0, 0, rect.width, rect.height); ctx.drawImage(image, (rect.width - width) / 2, (rect.height - height) / 2, width, height);
  }
  let filmDrawnIndex = -1, filmDrawnImg = null;
  function drawFilm() {
    const index = Math.round(frameState.progress * (activeCount - 1)) + 1; frameState.index = index; const image = nearestLoaded(index); if (index === filmDrawnIndex && image === filmDrawnImg) return; filmDrawnIndex = index; filmDrawnImg = image; drawCover(filmCtx, filmCanvas, image);
    if (lastDrawn !== index) { frameCounter.textContent = `f${String(frameStart + index - 1).padStart(3, '0')} / f204`; frameStatus.textContent = image?.complete ? 'filme Fuwa' : 'carregando o filme'; lastDrawn = index; }
  }
  function queueDraw() { if (drawQueued) return; drawQueued = true; requestAnimationFrame(() => { drawQueued = false; drawFilm(); }); }
  function loadPriorityFrames() {
    [1, ...Array.from({ length: Math.ceil(activeCount / 8) }, (_, i) => (i + 1) * 8)].filter((i) => i <= activeCount).forEach(loadFrame); frameStatus.textContent = 'carregando o filme';
    let next = 2; const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 32));
    const fill = () => { const start = next; for (let i = 0; i < 12 && next <= activeCount; i += 1, next += 1) if (!loaded.has(next)) loadFrame(next); if (next <= activeCount) idle(fill); else if (start !== next) frameStatus.textContent = 'filme pronto'; }; idle(fill);
  }
  function resetFrameSource() { frameDir = isPortrait.matches ? 'm' : 'desktop'; activeCount = frameCount[frameDir]; loaded.clear(); lastDrawn = -1; loadFrame(1); loadFrame(activeCount); resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); queueDraw(); drawW(); loadPriorityFrames(); }

  const W_PATH = new Path2D('M17.5 48C17.5 43.31 21.31 39.5 26 39.5C30.69 39.5 34.5 43.31 34.5 48V74C34.5 78.69 38.31 82.5 43 82.5C47.69 82.5 51.5 78.69 51.5 74V55C51.5 50.31 55.31 46.5 60 46.5C64.69 46.5 68.5 50.31 68.5 55V74C68.5 78.69 72.31 82.5 77 82.5C81.69 82.5 85.5 78.69 85.5 74V39C85.5 34.31 89.31 30.5 94 30.5C98.69 30.5 102.5 34.31 102.5 39V74C102.5 88.08 91.08 99.5 77 99.5C70.47 99.5 64.51 97.04 60 93.01C55.49 97.04 49.53 99.5 43 99.5C28.92 99.5 17.5 88.08 17.5 74Z');
  const A0 = { x: 26, y: 62 }, A1 = { x: 60, y: 65 };
  function drawW() {
    const image = loaded.get(activeCount)?.complete ? loaded.get(activeCount) : nearestLoaded(activeCount); if (!image || !image.complete || !wCanvas.width) return;
    const ratio = dprCap(); const W = wCanvas.width / ratio; const H = wCanvas.height / ratio;
    // a foto fica pré-escalada num canvas à parte: a cada quadro só a máscara muda (bem mais leve no iPhone)
    if (!wCache || wCache.img !== image || wCache.w !== wCanvas.width || wCache.h !== wCanvas.height) {
      const c = document.createElement('canvas'); c.width = wCanvas.width; c.height = wCanvas.height; const k = c.getContext('2d');
      const base = Math.max(c.width / image.naturalWidth, c.height / image.naturalHeight); const iw = image.naturalWidth * base; const ih = image.naturalHeight * base;
      k.drawImage(image, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih); wCache = { img: image, c, w: c.width, h: c.height };
    }
    const raw = gsap.utils.clamp(0, 1, wProgress / 0.86); const e = prefersReduced.matches ? 1 : gsap.parseEase('power2.inOut')(raw);
    const s0 = Math.max((W / 2) / 8.5, (H / 2) / 21) * 1.25; const s1 = Math.min(W * 0.26, H * 0.34) / 85; const sc = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * e);
    const ax = A0.x + (A1.x - A0.x) * e; const ay = A0.y + (A1.y - A0.y) * e; const cx = W / 2; const cy = H * (0.5 - 0.06 * e);
    wCtx.setTransform(1, 0, 0, 1, 0, 0); wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height); wCtx.save();
    wCtx.setTransform(ratio * sc, 0, 0, ratio * sc, ratio * (cx - ax * sc), ratio * (cy - ay * sc)); wCtx.clip(W_PATH);
    wCtx.setTransform(1, 0, 0, 1, 0, 0); wCtx.drawImage(wCache.c, 0, 0);
    const fill = gsap.utils.clamp(0, 1, (raw - 0.8) / 0.2); if (fill > 0) { wCtx.globalAlpha = fill; wCtx.fillStyle = '#6F86A3'; wCtx.fillRect(0, 0, wCanvas.width, wCanvas.height); wCtx.globalAlpha = 1; }
    wCtx.restore();
  }


  function setupMenu() { const trigger = document.querySelector('#menu-trigger'); const menu = document.querySelector('#site-menu'); const close = document.querySelector('#menu-close'); const setOpen = (open) => { menu.classList.toggle('is-open', open); menu.setAttribute('aria-hidden', String(!open)); trigger.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); }; trigger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open'))); close.addEventListener('click', () => setOpen(false)); menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false))); }
  function setupModal() { const modal = document.querySelector('#waitlist-modal'); const form = document.querySelector('#waitlist-form'); const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }; document.querySelectorAll('.waitlist-open').forEach((button) => button.addEventListener('click', () => { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); modal.querySelector('input').focus(); })); modal.querySelector('.modal-close').addEventListener('click', close); modal.addEventListener('click', (event) => { if (event.target === modal) close(); }); form.addEventListener('submit', (event) => { event.preventDefault(); if (!form.checkValidity()) return; form.classList.add('is-success'); form.querySelector('button').textContent = 'feito. até já.'; }); document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { close(); document.querySelector('#lightbox').classList.remove('is-open'); } }); }
  function setupLightbox() { const box = document.querySelector('#lightbox'); const video = document.querySelector('#lightbox-video'); const close = () => { video.pause(); video.removeAttribute('src'); box.classList.remove('is-open'); box.setAttribute('aria-hidden', 'true'); }; document.querySelectorAll('.ugc-card').forEach((button) => button.addEventListener('click', () => { video.src = button.dataset.video; video.muted = false; box.classList.add('is-open'); box.setAttribute('aria-hidden', 'false'); video.play(); })); box.querySelector('.lightbox-close').addEventListener('click', close); box.addEventListener('click', (event) => { if (event.target === box) close(); }); const io = new IntersectionObserver((entries) => entries.forEach((entry) => { const media = entry.target.querySelector('video'); if (entry.isIntersecting) media.play().catch(() => {}); else media.pause(); }), { threshold: .35 }); document.querySelectorAll('.ugc-card').forEach((card) => io.observe(card)); }

  // preloader: espera fontes, rótulo do 3D, as primeiras imagens do filme e as fotos-chave (com teto de tempo)
  function runPreloader() {
    const el = document.querySelector('#preloader'); if (!el) return Promise.resolve();
    const draw = document.querySelector('#pre-w-draw'); const count = document.querySelector('#pre-count');
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const frames = []; if (portrait) { for (let f = 1; f <= 94; f += 1) if (f < 16 || f % 4 === 0) frames.push(`assets/frames/m/f${String(f).padStart(3, '0')}.jpg`); } else { for (let f = 18; f <= 204; f += 1) if (f < 48 || f % 8 === 0) frames.push(`assets/frames/desktop/f${String(f).padStart(3, '0')}.jpg`); }
    const urls = ['assets/3d/label-wrap.jpg', 'assets/3d/bottle-front.png', 'assets/img2/t04-leveza.jpg', ...frames];
    let done = 0; const total = urls.length + 1;
    const tick = () => { done += 1; const p = Math.min(1, done / total); draw.style.strokeDashoffset = String(1 - p); count.textContent = `${Math.round(p * 100)}%`; };
    const jobs = urls.map((u) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => { tick(); res(); }; i.src = u; }));
    jobs.push((document.fonts?.ready || Promise.resolve()).then(tick));
    const minTime = new Promise((r) => setTimeout(r, 1200)); const maxTime = new Promise((r) => setTimeout(r, 9000));
    return Promise.race([Promise.all([Promise.all(jobs), minTime]), maxTime]).then(() => {
      draw.style.strokeDashoffset = '0'; count.textContent = '100%';
      return new Promise((r) => setTimeout(() => { el.classList.add('is-done'); document.body.classList.remove('is-loading'); setTimeout(() => { el.remove(); ScrollTrigger.refresh(); r(); }, 950); }, 350));
    });
  }

  function setupOfferDrop(quiet) {
    const img = document.querySelector('.offer-drop img'); const shadow = document.querySelector('.offer-shadow'); if (!img) return;
    if (quiet) { gsap.set(img, { y: 0, rotation: 0 }); gsap.set(shadow, { opacity: 1, scale: 1, xPercent: -50 }); return; }
    const mobile = window.matchMedia('(max-width: 800px)').matches;
    const st = mobile ? { trigger: '#oferta', start: 'top 95%', end: 'top 15%', scrub: .6 } : { trigger: '#oferta', start: 'top 60%', end: '45% bottom', scrub: .6 };
    gsap.timeline({ scrollTrigger: st })
      .fromTo(img, { y: () => -window.innerHeight * 1.2, rotation: -14 }, { y: 0, rotation: 0, ease: 'power2.in', duration: .82 })
      .to(img, { y: -14, ease: 'power1.out', duration: .09 }).to(img, { y: 0, ease: 'power1.in', duration: .09 })
      .fromTo(shadow, { opacity: 0, scale: .3, xPercent: -50 }, { opacity: 1, scale: 1, xPercent: -50, ease: 'power2.in', duration: .82 }, 0);
  }
  let bottleApi = null;
  // o trecho do rosto (f144 em diante, ~68% dos quadros) recebe mais rolagem: fica mais lento
  function filmEase(p) { const k = 0.5, f = 0.677; return p < k ? (p / k) * f : f + ((p - k) / (1 - k)) * (1 - f); }
  function splitWords(el) {
    const walk = (node) => [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) { const frag = document.createDocumentFragment(); child.textContent.split(/(\s+)/).forEach((part) => { if (!part) return; if (/^\s+$/.test(part)) { frag.append(' '); return; } const span = document.createElement('span'); span.className = 'w'; span.textContent = part; frag.append(span); }); child.replaceWith(frag); }
      else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
    });
    walk(el); return el.querySelectorAll('.w');
  }
  function setupReveal(quiet) {
    // revelação por tempo (não por scrub): o texto termina de aparecer sozinho e sempre fica legível
    document.querySelectorAll('.reveal-words').forEach((el) => {
      const words = splitWords(el);
      if (quiet) { gsap.set(words, { opacity: 1 }); return; }
      gsap.fromTo(words, { opacity: 0, y: '0.35em' }, { opacity: 1, y: 0, duration: .7, stagger: .045, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
    document.querySelectorAll('.has-w').forEach((sec) => gsap.fromTo(sec, { '--wy': '60px' }, { '--wy': '-60px', ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } }));
  }
  function setupCommunityScroll() {
    // celular: trilho lateral guiado pelo scroll dentro de um palco sticky (sem pin, que abria um vão no iOS)
    const mm = gsap.matchMedia();
    mm.add('(max-width: 800px)', () => {
      const track = document.querySelector('#comunidade .ugc-carousel'); if (!track) return;
      const st = ScrollTrigger.create({ trigger: '#comunidade', start: 'top top', end: 'bottom bottom', onUpdate: (self) => { const dist = Math.max(0, track.scrollWidth - window.innerWidth + 40); track.style.transform = `translate3d(${-dist * self.progress}px,0,0)`; } });
      return () => { st.kill(); track.style.transform = ''; };
    });
  }
  function setupBottle() { const mount = document.querySelector('#bottle-mount'); const introFilm = document.querySelector('#intro-film'); let bottle; try { bottle = createBottle({ container: mount, onClip: (polygon, enter, full) => { introFilm.style.clipPath = polygon; introFilm.style.opacity = String(enter);  } }); } catch (error) { console.error(error); document.body.classList.add('is-fallback'); return; } bottleApi = bottle; window.addEventListener('beforeunload', () => bottle.dispose(), { once: true }); }
  function setupMotion() { const quiet = prefersReduced.matches; const header = document.querySelector('.site-header'); gsap.to(header, { autoAlpha: 1, y: 0, duration: quiet ? 0 : .55, delay: quiet ? 0 : .5, ease: 'power3.out' }); gsap.fromTo('.product-bottle', { y: quiet ? 0 : 42, autoAlpha: quiet ? 1 : 0 }, { y: 0, autoAlpha: 1, duration: quiet ? 0 : .9, ease: 'power3.out', scrollTrigger: { trigger: '#produto', start: 'top 76%' } }); document.querySelectorAll('.benefit-grid img').forEach((image, index) => gsap.to(image, { clipPath: 'inset(0 0 0 0)', duration: quiet ? 0 : .9, delay: quiet ? 0 : index * .08, ease: 'power2.out', scrollTrigger: { trigger: image, start: 'top 82%' } })); const mobileIntro = window.matchMedia('(max-width: 800px)');
    const openingStage = document.querySelector('.opening-stage'); const wStage = document.querySelector('.w-stage'); const filmStage = document.querySelector('.film-stage');
    const segments = () => mobileIntro.matches ? [140, 360, 140] : [180, 480, 160];
    const clamp01 = (v) => Math.min(1, Math.max(0, v)); let lastOpen = -1;
    ScrollTrigger.create({ trigger: '#intro', start: 'top top', end: 'bottom bottom', scrub: .5, onUpdate: (self) => {
      const [a, f, w] = segments(); const total = a + f + w - 100; const y = self.progress * total;
      const pOpen = clamp01(y / (a - 100)); const pFilm = clamp01((y - (a - 100)) / f); const pW = clamp01((y - (a - 100) - f) / w);
      if (bottleApi && pOpen !== lastOpen) { bottleApi.setProgress(pOpen); lastOpen = pOpen; }
      document.querySelector('.opening-copy').style.opacity = String(Math.max(0, 1 - pOpen * 4));
      const openingDone = pOpen >= 0.999 || !bottleApi;
      openingStage.style.visibility = openingDone && pOpen >= 0.999 ? 'hidden' : 'visible';
      frameState.progress = filmEase(pFilm); queueDraw();
      filmLines.forEach((line) => { const active = pOpen >= 0.999 && pW <= 0 && frameState.progress >= Number(line.dataset.start) && frameState.progress <= Number(line.dataset.end); line.classList.toggle('active', active); line.style.transform = active || quiet ? 'translateY(0)' : 'translateY(18px)'; });
      wStage.style.visibility = pW > 0 ? 'visible' : 'hidden';
      filmStage.style.visibility = pW > 0.02 ? 'hidden' : 'visible';
      if (pW !== wProgress) { wProgress = pW; queueW(); }
      document.body.classList.toggle('on-dark', pW < 0.35);
      gsap.set('.w-caption', { autoAlpha: clamp01((pW - 0.72) / 0.14), y: quiet ? 0 : 18 * (1 - clamp01((pW - 0.72) / 0.14)) });
    } });
    ScrollTrigger.create({ trigger: '#produto', start: 'top 70%', endTrigger: '.closing', end: 'bottom bottom', onEnter: () => document.querySelector('#fixed-cta').classList.add('is-visible'), onLeave: () => document.querySelector('#fixed-cta').classList.remove('is-visible'), onEnterBack: () => document.querySelector('#fixed-cta').classList.add('is-visible'), onLeaveBack: () => document.querySelector('#fixed-cta').classList.remove('is-visible') }); }

  resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); loadFrame(1); loadFrame(activeCount); loadPriorityFrames(); setupMenu(); setupModal(); setupLightbox(); setupBottle(); setupMotion(); setupReveal(prefersReduced.matches); setupCommunityScroll(); setupOfferDrop(prefersReduced.matches); ScrollTrigger.create({ trigger: '#oferta', start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: document.body, className: 'in-offer' } }); runPreloader();
  window.addEventListener('resize', () => { resizeCanvas(filmCanvas, filmCtx); resizeCanvas(wCanvas, wCtx); queueDraw(); drawW(); ScrollTrigger.refresh(); }); isPortrait.addEventListener?.('change', resetFrameSource); document.fonts?.ready.then(() => ScrollTrigger.refresh());
  gsap.to('#progress-bar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true } }); setTimeout(() => { queueDraw(); drawW(); }, 300);
})();
