/* =========================================================
   Kier Paolo Viray — Portfolio interactions
   GSAP 3 + ScrollTrigger + Lenis
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // If GSAP failed to load, show the page without effects.
  if (!window.gsap || !window.ScrollTrigger) {
    $('.preloader')?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const mm = gsap.matchMedia();

  /* ---------------------------------------------------------
     Smooth scroll (Lenis) synced to GSAP's ticker
  --------------------------------------------------------- */
  let lenis = null;
  if (!prefersReduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // released after the preloader
  }

  const scrollToTarget = (target) => {
    if (lenis) {
      // lock: trackpad/touch momentum can't interrupt the jump halfway.
      // force: works even if Lenis is momentarily stopped.
      // onComplete: snap to the exact spot in case layout shifted mid-scroll.
      lenis.scrollTo(target, {
        duration: 1.6,
        easing: (t) => 1 - Math.pow(1 - t, 4),
        lock: true,
        force: true,
        onComplete: () => { if (target === 0 && window.scrollY > 1) lenis.scrollTo(0, { immediate: true, force: true }); },
      });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: prefersReduced ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
    }
  };

  /* ---------------------------------------------------------
     Text splitting helpers
  --------------------------------------------------------- */
  function splitChars(el) {
    if (!el.closest('[aria-label]')) {
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    }
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.className = 'word';
            word.setAttribute('aria-hidden', 'true');
            for (const c of part) {
              const ch = document.createElement('span');
              ch.className = 'char';
              ch.textContent = c;
              word.appendChild(ch);
            }
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    return $$('.char', el);
  }

  function splitWords(el) {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach((w, i, arr) => {
      const span = document.createElement('span');
      span.className = 'w';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = w;
      el.appendChild(span);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return $$('.w', el);
  }

  /* ---------------------------------------------------------
     Theme: body switches between charcoal and bone
     depending on the section under the viewport centre.
  --------------------------------------------------------- */
  const metaTheme = $('meta[name="theme-color"]');
  let currentTheme = 'dark';
  function setTheme(theme) {
    if (theme === currentTheme) return;
    currentTheme = theme;
    document.body.classList.toggle('is-light', theme === 'light');
    metaTheme?.setAttribute('content', theme === 'light' ? '#ecebe4' : '#121215');
  }
  function updateTheme() {
    const mid = window.innerHeight / 2;
    for (const sec of $$('[data-theme]')) {
      const r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { setTheme(sec.dataset.theme); break; }
    }
  }

  /* =========================================================
     1. HORIZONTAL WORK (created first so its pin spacing is
        accounted for by every trigger after it)
  ========================================================= */
  function initWork() {
    mm.add('(min-width: 901px)', () => {
      const section = $('.work');
      const track = $('.work__track');
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      gsap.to('.work__progress span', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + distance(), scrub: true, invalidateOnRefresh: true },
      });

      $$('.project', track).forEach((card) => {
        const img = $('.project__media img', card);
        gsap.fromTo(img, { xPercent: -2 }, {
          xPercent: 2, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
        gsap.from(card, {
          y: 80, rotate: 2, opacity: 0.25, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 95%', end: 'left 45%', scrub: true },
        });
      });
    });
  }

  /* =========================================================
     2. PRELOADER + HERO INTRO
  ========================================================= */
  const heroChars = $$('.hero__title .split').flatMap(splitChars);

  function setHeroInitial() {
    if (prefersReduced) return;
    gsap.set(heroChars, { yPercent: 115, rotate: 8 });
    heroDash?.setInitial();
    gsap.set('[data-hero-fade]', { y: 30, autoAlpha: 0 });
    gsap.set('.nav > *', { y: -24, autoAlpha: 0 });
  }

  function runPreloader() {
    return new Promise((resolve) => {
      const pre = $('.preloader');
      if (!pre || prefersReduced) { pre?.remove(); resolve(); return; }

      const countEl = $('.preloader__count');
      const bar = $('.preloader__bar span');
      const loaded = new Promise((r) => {
        if (document.readyState === 'complete') r();
        else window.addEventListener('load', r, { once: true });
        setTimeout(r, 3500); // never wait forever on slow images
      });

      gsap.from('.preloader__name span', { yPercent: 110, duration: 1.1, ease: 'expo.out', delay: 0.1 });
      gsap.from('.preloader__role', { autoAlpha: 0, y: 10, duration: 0.8, delay: 0.4 });

      const counter = { v: 0 };
      const count = gsap.to(counter, {
        v: 100,
        duration: 1.9,
        ease: 'power2.inOut',
        onUpdate() {
          countEl.textContent = String(Math.round(counter.v)).padStart(3, '0');
          bar.style.transform = `scaleX(${counter.v / 100})`;
        },
      });

      Promise.all([loaded, count.then()]).then(() => {
        gsap.timeline({ onComplete: () => pre.remove() })
          .to('.preloader__inner, .preloader__bottom', { yPercent: -40, autoAlpha: 0, duration: 0.6, ease: 'power3.in', stagger: 0.05 })
          .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, '-=0.15')
          .add(resolve, '-=0.75');
      });
    });
  }

  function heroIntro() {
    if (prefersReduced) { lenis?.start(); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.6, stagger: 0.045 })
      .to('[data-hero-fade]', { y: 0, autoAlpha: 1, duration: 1.3, stagger: 0.08 }, 0.6)
      .to('.nav > *', { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.06, clearProps: 'transform' }, 0.45)
      .add(() => lenis?.start(), 0.7);
    heroDash?.intro(tl, 0.45);
  }

  /* =========================================================
     2b. HERO DASHBOARD — illustrative "your store" sales chart.
         One GSAP state value `t` (0 = base, 1 = boosted) drives the
         line, area and every metric. Hovering a [data-grow] CTA
         tweens t → 1; the card also turns to "look" at the cursor.
  ========================================================= */
  let heroDash = null;

  function initHeroDashboard() {
    const root = $('.hero__visual');
    if (!root) return;
    const card = $('.dash', root);
    const chart = $('.dash__chart', root);
    const svg = $('svg', chart);
    const grid = $('.dash__grid', svg);
    const lineEl = $('.dash__line', svg);
    const areaEl = $('.dash__area', svg);
    const cross = $('.dash__cross', svg);
    const hoverDot = $('.dash__hover-dot', svg);
    const endDot = $('.dash__end', svg);
    const pulse = $('.dash__end-pulse', svg);
    const tip = $('.dash__tip', chart);
    const chips = $$('.dash-chip', root);
    const outs = (key) => $$(`[data-dash="${key}"]`, root);
    const write = (key, text) => outs(key).forEach((el) => { if (el.textContent !== text) el.textContent = text; });
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = gsap.utils.clamp;

    // --- Two fixed-seed 30-day series (0..1 of chart height) ---
    const N = 30;
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const base = [];
    const boost = [];
    for (let i = 0; i < N; i++) {
      const p = i / (N - 1);
      const n = rand() - 0.5;
      const wave = Math.sin(i * 0.85) * 0.035;
      base.push(clamp(0.06, 0.95, 0.24 + p * 0.24 + n * 0.12 + wave));
      boost.push(clamp(0.06, 0.98, 0.2 + Math.pow(p, 1.8) * 0.78 + n * 0.05 + wave * 0.5));
    }

    const M = {
      // orders × avg. order ≈ total sales, at both ends
      sales: [48920, 186450], growth: [18, 281], orders: [612, 1974],
      conv: [2.1, 4.9], aov: [79, 94], order: [129, 489],
    };
    const state = { t: 0, count: 1 };
    const PAD_T = 16, PAD_B = 6;
    let W = 600, H = 220, pts = [], hoverIndex = -1;

    const money = (v) => '$' + Math.round(v).toLocaleString('en-US');

    function build() {
      const r = svg.getBoundingClientRect();
      W = Math.max(200, r.width);
      H = Math.max(100, r.height);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      cross.setAttribute('y1', PAD_T - 6);
      cross.setAttribute('y2', H);
      grid.innerHTML = '';
      for (let k = 0; k < 4; k++) {
        const y = PAD_T + ((H - PAD_T - PAD_B) * k) / 3;
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', 0); l.setAttribute('x2', W);
        l.setAttribute('y1', y); l.setAttribute('y2', y);
        grid.appendChild(l);
      }
      render();
    }

    // Catmull-Rom → cubic Bézier for a smooth, honest-looking curve
    function smoothPath(p) {
      let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
      for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
        d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}`
          + ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}`
          + ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    }

    function dayValue(i) {
      const vals = base.map((b, k) => lerp(b, boost[k], state.t));
      const sum = vals.reduce((a, v) => a + v, 0);
      return (lerp(M.sales[0], M.sales[1], state.t) * vals[i]) / sum;
    }

    function placeHover(i) {
      if (i < 0) return;
      const [px, py] = pts[i];
      cross.setAttribute('x1', px); cross.setAttribute('x2', px);
      hoverDot.setAttribute('cx', px); hoverDot.setAttribute('cy', py);
      tip.style.left = `${clamp(56, W - 56, px)}px`;
      tip.style.top = `${py}px`;
      tip.innerHTML = `<b>Day ${i + 1}</b><span>${money(dayValue(i))}</span>`;
    }

    function render() {
      const t = state.t;
      pts = base.map((b, i) => [(W * i) / (N - 1), PAD_T + (1 - lerp(b, boost[i], t)) * (H - PAD_T - PAD_B)]);
      const d = smoothPath(pts);
      lineEl.setAttribute('d', d);
      areaEl.setAttribute('d', `${d} L${W},${H} L0,${H} Z`);
      const [ex, ey] = pts[N - 1];
      [endDot, pulse].forEach((c) => { c.setAttribute('cx', ex); c.setAttribute('cy', ey); });

      write('sales', money(lerp(M.sales[0], M.sales[1], t) * state.count));
      write('growth', String(Math.round(lerp(M.growth[0], M.growth[1], t))));
      write('orders', Math.round(lerp(M.orders[0], M.orders[1], t) * state.count).toLocaleString('en-US'));
      const conv = lerp(M.conv[0], M.conv[1], t).toFixed(1);
      write('conv', `${conv}%`);
      write('conv2', conv);
      write('aov', money(lerp(M.aov[0], M.aov[1], t)));
      write('order', `+$${lerp(M.order[0], M.order[1], t).toFixed(2)}`);
      placeHover(hoverIndex);
    }

    build();
    if ('ResizeObserver' in window) new ResizeObserver(() => build()).observe(svg);
    else window.addEventListener('resize', build);

    const interactive = !isTouch && !prefersReduced;

    if (interactive) {
      // --- The card turns to face the cursor ---
      const hero = $('.hero');
      gsap.set(card, { transformPerspective: 1100, transformOrigin: '50% 50%' });
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.9, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.9, ease: 'power3' });
      const depth = [-22, 24]; // order chip drifts away from the header; conv chip toward the cursor
      const chipTo = chips.map((c) => ({ x: gsap.quickTo(c, 'x', { duration: 1, ease: 'power3' }), y: gsap.quickTo(c, 'y', { duration: 1, ease: 'power3' }) }));

      hero.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const dx = clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
        const dy = clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
        ry(dx * 12);
        rx(-dy * 9);
        card.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
        chipTo.forEach((c, i) => { c.x(dx * depth[i]); c.y(dy * depth[i] * 0.8); });
      });
      hero.addEventListener('mouseleave', () => {
        rx(0); ry(0);
        chipTo.forEach((c) => { c.x(0); c.y(0); });
      });

      // --- Crosshair + tooltip snapping to the nearest day ---
      const hoverEls = [cross, hoverDot, tip];
      chart.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect();
        hoverIndex = clamp(0, N - 1, Math.round(((e.clientX - r.left) / r.width) * (N - 1)));
        placeHover(hoverIndex);
        gsap.to(hoverEls, { opacity: 1, duration: 0.2, overwrite: 'auto' });
      });
      chart.addEventListener('mouseleave', () => {
        hoverIndex = -1;
        gsap.to(hoverEls, { opacity: 0, duration: 0.25, overwrite: 'auto' });
      });

      // --- Grow when hovering a "connect with me" CTA ---
      const grow = (on) => {
        card.classList.toggle('is-growing', on);
        gsap.to(state, { t: on ? 1 : 0, duration: on ? 1.2 : 0.9, ease: on ? 'expo.out' : 'power3.out', overwrite: true, onUpdate: render });
        gsap.to(card, { scale: on ? 1.06 : 1, duration: 0.9, ease: 'expo.out', overwrite: 'auto' });
        gsap.to(chips, { scale: on ? 1.08 : 1, duration: 0.9, ease: 'back.out(2)', stagger: 0.06, overwrite: 'auto' });
      };
      $$('[data-grow]').forEach((el) => {
        el.addEventListener('mouseenter', () => grow(true));
        el.addEventListener('mouseleave', () => grow(false));
      });
    }

    heroDash = {
      setInitial() {
        if (prefersReduced) return;
        gsap.set(card, { y: 70, autoAlpha: 0 });
        gsap.set(chips, { scale: 0.6, autoAlpha: 0 });
        gsap.set(areaEl, { opacity: 0 });
        gsap.set([endDot, pulse], { autoAlpha: 0 });
        state.count = 0;
        render();
        const len = lineEl.getTotalLength();
        gsap.set(lineEl, { strokeDasharray: len, strokeDashoffset: len });
      },
      intro(tl, at) {
        tl.to(card, { y: 0, autoAlpha: 1, duration: 1.4 }, at)
          .to(lineEl, {
            strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut',
            onComplete: () => gsap.set(lineEl, { clearProps: 'strokeDasharray,strokeDashoffset' }),
          }, at + 0.35)
          .to(state, { count: 1, duration: 1.9, ease: 'power2.out', onUpdate: render }, at + 0.35)
          .to(areaEl, { opacity: 1, duration: 1.2 }, at + 1.1)
          .to([endDot, pulse], { autoAlpha: 1, duration: 0.4 }, at + 2)
          .to(chips, { scale: 1, autoAlpha: 1, duration: 0.9, ease: 'back.out(1.7)', stagger: 0.18 }, at + 1.4);
      },
    };
  }

  /* =========================================================
     3. CUSTOM CURSOR
  ========================================================= */
  function initCursor() {
    if (isTouch || prefersReduced) return;
    const dot = $('.cursor');
    const label = $('.cursor-label');
    const labelText = $('span', label);
    document.body.classList.add('has-cursor');

    gsap.set([dot, label], { xPercent: -50, yPercent: -50 });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.18, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.18, ease: 'power3' });
    const lx = gsap.quickTo(label, 'x', { duration: 0.55, ease: 'power3' });
    const ly = gsap.quickTo(label, 'y', { duration: 0.55, ease: 'power3' });

    window.addEventListener('mousemove', (e) => {
      dx(e.clientX); dy(e.clientY); lx(e.clientX); ly(e.clientY);
    }, { passive: true });

    document.addEventListener('mouseleave', () => gsap.to([dot, label], { opacity: 0, duration: 0.3 }));
    document.addEventListener('mouseenter', () => gsap.to([dot, label], { opacity: 1, duration: 0.3 }));
    window.addEventListener('mousedown', () => gsap.to(dot, { scale: 0.6, duration: 0.2 }));
    window.addEventListener('mouseup', () => gsap.to(dot, { scale: 1, duration: 0.4, ease: 'elastic.out(1, .4)' }));

    let labelShown = false;
    document.addEventListener('mouseover', (e) => {
      const withLabel = e.target.closest('[data-cursor-label]');
      const hide = e.target.closest('[data-cursor-hide]');
      const interactive = e.target.closest('a, button, .svc__row, .tool');

      if (withLabel) {
        labelText.textContent = withLabel.dataset.cursorLabel;
        if (!labelShown) gsap.to(label, { scale: 1, duration: 0.6, ease: 'expo.out', overwrite: 'auto' });
        labelShown = true;
        dot.classList.add('is-hidden');
        dot.classList.remove('is-hover');
        return;
      }
      if (labelShown) gsap.to(label, { scale: 0, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
      labelShown = false;
      dot.classList.toggle('is-hidden', !!hide);
      dot.classList.toggle('is-hover', !!interactive && !hide);
    });
  }

  /* =========================================================
     4. MAGNETIC ELEMENTS + DIRECTIONAL BUTTON FILLS
  ========================================================= */
  function initMagnetic() {
    if (isTouch || prefersReduced) return;
    $$('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      const ease = 'elastic.out(1, 0.35)';
      const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease });
      const inner = $('.btn__label, .circle-cta__label, .badge__arrow', el);
      const ixTo = inner && gsap.quickTo(inner, 'x', { duration: 0.9, ease });
      const iyTo = inner && gsap.quickTo(inner, 'y', { duration: 0.9, ease });

      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        xTo(mx * strength); yTo(my * strength);
        if (inner) { ixTo(mx * strength * 0.45); iyTo(my * strength * 0.45); }
      });
      el.addEventListener('mouseleave', () => {
        xTo(0); yTo(0);
        if (inner) { ixTo(0); iyTo(0); }
      });
    });
  }

  function initButtonFills() {
    $$('.btn, .circle-cta').forEach((btn) => {
      const fill = $('.btn__fill', btn);
      if (!fill) return;
      gsap.set(fill, { xPercent: -50, yPercent: -50, scale: 0 });
      const at = (e) => {
        const r = btn.getBoundingClientRect();
        return { left: e.clientX - r.left, top: e.clientY - r.top };
      };
      btn.addEventListener('mouseenter', (e) => {
        btn.classList.add('is-hover');
        gsap.set(fill, at(e));
        gsap.to(fill, { scale: 1, duration: 0.65, ease: 'power3.out', overwrite: 'auto' });
      });
      btn.addEventListener('mouseleave', (e) => {
        btn.classList.remove('is-hover');
        gsap.set(fill, at(e));
        gsap.to(fill, { scale: 0, duration: 0.55, ease: 'power3.out', overwrite: 'auto' });
      });
    });
  }

  /* =========================================================
     5. HERO — interactive dot field + variable-weight letters
  ========================================================= */
  function initHeroCanvas() {
    const canvas = $('.hero__canvas');
    const hero = $('.hero');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const GAP = 32;
    const RADIUS = 180;
    let w = 0, h = 0, dots = [];
    const mouse = { x: -9999, y: -9999 };

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) dots.push({ ox: x, oy: y, x, y });
      }
    }

    function draw(time = 0) {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        const dx = d.ox - mouse.x;
        const dy = d.oy - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let tx = d.ox, ty = d.oy, f = 0;
        if (dist < RADIUS) {
          f = 1 - dist / RADIUS;
          const push = f * f * 46;
          tx += (dx / dist) * push;
          ty += (dy / dist) * push;
        }
        d.x += (tx - d.x) * 0.12;
        d.y += (ty - d.y) * 0.12;
        const wave = 0.05 * Math.sin(time * 1.4 + d.ox * 0.012 + d.oy * 0.018);
        ctx.fillStyle = `rgba(236,235,228,${Math.max(0.04, 0.1 + wave + f * 0.6)})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1 + f * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    build();
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { build(); if (prefersReduced) draw(); }, 150); });

    if (prefersReduced) { draw(); return; }

    hero.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    let visible = true;
    ScrollTrigger.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible = s.isActive) });
    gsap.ticker.add((time) => { if (visible) draw(time); });
  }

  // Letters swell to a heavier weight as the cursor approaches (variable font)
  function initWeightHover(container, { min = 500, max = 800, radius = 280 } = {}) {
    if (isTouch || prefersReduced || !container) return;
    const chars = $$('.char', container).filter((c) => !c.closest('em'));
    chars.forEach((c) => { c._w = min; });
    let mx = -9999, my = -9999, active = false;

    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('mouseleave', () => { mx = my = -9999; });
    ScrollTrigger.create({ trigger: container, start: 'top bottom', end: 'bottom top', onToggle: (s) => (active = s.isActive) });

    gsap.ticker.add(() => {
      if (!active) return;
      // Read all positions first, then write (avoids layout thrashing)
      const targets = chars.map((c) => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
        const t = Math.max(0, 1 - d / radius);
        return min + (max - min) * t * t;
      });
      chars.forEach((c, i) => {
        const next = c._w + (targets[i] - c._w) * 0.16;
        if (Math.abs(next - c._w) > 0.2) {
          c._w = next;
          c.style.setProperty('--wght', next.toFixed(1));        }
      });
    });
  }

  /* =========================================================
     6. MARQUEE + ROTATING BADGES — react to scroll velocity
  ========================================================= */
  function initMarquee() {
    const loops = [];
    $$('.marquee__row').forEach((row) => {
      const track = $('.marquee__track', row);
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
      if (prefersReduced) return;
      const dir = Number(row.dataset.dir) || -1;
      const tw = gsap.fromTo($$('.marquee__track', row),
        { xPercent: dir < 0 ? 0 : -100 },
        { xPercent: dir < 0 ? -100 : 0, duration: 32, ease: 'none', repeat: -1 });
      tw.totalTime(tw.duration() * 400); // headroom so it can play in reverse forever
      loops.push(tw);
    });

    if (prefersReduced) return;

    $$('.badge__ring, .contact__ring').forEach((ring) => {
      const tw = gsap.to(ring, { rotation: 360, duration: 18, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
      tw.totalTime(tw.duration() * 400);
      loops.push(tw);
    });

    const skewTo = gsap.quickTo('.marquee__inner', 'skewX', { duration: 0.6, ease: 'power3' });
    let settle;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate(self) {
        const v = self.getVelocity();
        const dir = self.direction;
        const boost = gsap.utils.clamp(1, 7, 1 + Math.abs(v) / 350);
        loops.forEach((tw) => {
          gsap.to(tw, {
            timeScale: dir * boost, duration: 0.25, overwrite: true,
            onComplete: () => gsap.to(tw, { timeScale: dir, duration: 1.4, ease: 'power2.out' }),
          });
        });
        skewTo(gsap.utils.clamp(-8, 8, v / -260));
        clearTimeout(settle);
        settle = setTimeout(() => skewTo(0), 140);
      },
    });
  }

  /* =========================================================
     7. SCROLL REVEALS
  ========================================================= */
  function initReveals() {
    // Split headings: characters rise out of a mask
    $$('[data-split]').forEach((el) => {
      const chars = splitChars(el);
      if (prefersReduced) return;
      gsap.from(chars, {
        yPercent: 120, rotate: 6, duration: 1.2, ease: 'expo.out', stagger: 0.022,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });

    // Statement: words light up as you scroll
    $$('[data-words]').forEach((el) => {
      const words = splitWords(el);
      if (prefersReduced) return;
      gsap.fromTo(words, { opacity: 0.13 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: true },
      });
    });

    // Generic fade-up, batched so neighbours stagger
    if (!prefersReduced) {
      gsap.set('[data-reveal]', { y: 46, autoAlpha: 0 });
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.1 }),
      });
    }

    // Count-up numbers
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      if (prefersReduced) return;
      const o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, {
          v: end, duration: 2.2, ease: 'power3.out',
          onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); },
        }),
      });
    });

    if (prefersReduced) return;

    // Image parallax inside rounded frames
    $$('[data-parallax]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -16 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // About portrait: clip-path reveal
    gsap.from('.about__media', {
      clipPath: 'inset(18% 18% 18% 18% round 22px)', duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: '.about__media', start: 'top 80%' },
    });

    // Services rows slide in
    gsap.from('.svc__row', {
      y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '.svc', start: 'top 82%' },
    });

    // Toolbox cards
    gsap.from('.tool', {
      y: 80, autoAlpha: 0, rotateX: -18, duration: 1.2, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '.tools__grid', start: 'top 82%' },
    });

    // Experience timeline line draws as you scroll
    gsap.to('.xp__line span', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.xp__list', start: 'top 70%', end: 'bottom 60%', scrub: true },
    });

    // Huge outlined name drifts sideways at the very end
    const big = $('.contact__bigname');
    if (big) {
      gsap.fromTo(big, { xPercent: 6, letterSpacing: '0.02em' }, {
        xPercent: 0, letterSpacing: '-0.06em', ease: 'none',
        scrollTrigger: { trigger: big, start: 'top bottom', end: 'max', scrub: 1 },
      });
    }
  }

  /* =========================================================
     8. SERVICES — directional row fill + tool-stack preview
        The active row is derived from the pointer position (also
        re-checked on scroll), so fills never get stuck when the
        page scrolls under a still cursor.
  ========================================================= */
  function initServices() {
    const list = $('.svc');
    const rows = $$('.svc__row');
    const preview = $('.svc-preview');
    const inner = $('.svc-preview__inner');
    const panels = $$('.svc-panel', inner);
    const fillOf = (row) => $('.svc__fill', row);
    rows.forEach((row) => gsap.set(fillOf(row), { yPercent: 101 }));

    const withPreview = !isTouch && !prefersReduced;
    const pointer = { x: -1, y: -1 };
    let active = null;
    let lastX = 0, rotReset;

    let xTo, yTo, rTo;
    if (withPreview) {
      gsap.set(preview, { xPercent: -50, yPercent: -50 });
      xTo = gsap.quickTo(preview, 'x', { duration: 0.7, ease: 'power3' });
      yTo = gsap.quickTo(preview, 'y', { duration: 0.7, ease: 'power3' });
      rTo = gsap.quickTo(preview, 'rotation', { duration: 0.9, ease: 'power3' });
    }
    const showPreview = (on) => withPreview && gsap.to(preview, { scale: on ? 1 : 0, opacity: on ? 1 : 0, duration: on ? 0.6 : 0.4, ease: 'expo.out', overwrite: 'auto' });

    const isAbove = (row) => {
      const r = row.getBoundingClientRect();
      return pointer.y < r.top + r.height / 2;
    };

    function setActive(row) {
      if (row === active) return;
      const wasShowing = !!active;
      if (active) {
        gsap.to(fillOf(active), { yPercent: isAbove(active) ? -101 : 101, duration: 0.55, ease: 'power3.out', overwrite: true });
        active.classList.remove('is-active');
      }
      active = row;
      if (!row) { showPreview(false); return; }

      row.classList.add('is-active');
      gsap.fromTo(fillOf(row), { yPercent: isAbove(row) ? -101 : 101 }, { yPercent: 0, duration: 0.55, ease: 'power3.out', overwrite: true });

      if (withPreview) {
        const i = rows.indexOf(row);
        if (!wasShowing) { xTo(pointer.x, pointer.x); yTo(pointer.y, pointer.y); }
        gsap.to(inner, { yPercent: -(100 / panels.length) * i, duration: wasShowing ? 0.8 : 0, ease: 'expo.out', overwrite: true });
        gsap.fromTo($$('.svc-logo', panels[i]), { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.05, delay: wasShowing ? 0.12 : 0.05, overwrite: true });
        showPreview(true);
      }
    }

    function check() {
      if (pointer.x < 0) { setActive(null); return; }
      const el = document.elementFromPoint(pointer.x, pointer.y);
      const row = el && el.closest('.svc__row');
      setActive(row && list.contains(row) ? row : null);
    }

    window.addEventListener('mousemove', (e) => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      check();
      if (active && withPreview) {
        xTo(e.clientX); yTo(e.clientY);
        rTo(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6));
        clearTimeout(rotReset);
        rotReset = setTimeout(() => rTo(0), 90);
      }
      lastX = e.clientX;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { pointer.x = pointer.y = -1; setActive(null); });
    if (lenis) lenis.on('scroll', check); else window.addEventListener('scroll', check, { passive: true });
  }

  /* =========================================================
     8b. PROJECT PLANNER — 3 quick steps → pre-filled email
  ========================================================= */
  const PLANNER_EMAIL = 'kier.paolotejada@gmail.com';

  function initPlanner() {
    const modal = $('.planner');
    if (!modal) return;
    const panel = $('.planner__panel', modal);
    const form = $('.planner__form', modal);
    const steps = $$('.planner__step', modal);
    const countEl = $('.planner__count b', modal);
    const bar = $('.planner__progress span', modal);
    const back = $('[data-planner-back]', modal);
    const nextLabel = $('.planner__next .btn__label', modal);
    let step = 1;
    let opener = null;
    let brief = { subject: '', body: '' };

    const values = (name) => $$(`[name="${name}"]:checked`, form).map((i) => i.value);
    const field = (name) => (form.elements[name]?.value || '').trim();

    function render(dir = 1) {
      steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === step));
      const current = steps.find((s) => Number(s.dataset.step) === step);
      const shown = Math.min(step, 3);
      countEl.textContent = String(shown).padStart(2, '0');
      gsap.to(bar, { scaleX: step >= 4 ? 1 : shown / 3, duration: 0.6, ease: 'expo.out' });
      back.disabled = step === 1;
      nextLabel.textContent = step === 3 ? 'Create my email' : 'Next';
      modal.classList.toggle('is-done', step === 4);
      $$('.planner__error', modal).forEach((e) => (e.textContent = ''));
      if (!prefersReduced) {
        gsap.fromTo(current.children, { x: 36 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out', stagger: 0.04 });
      }
      panel.scrollTop = 0;
      if (step === 4) setTimeout(() => $('[data-planner-copy]', modal).focus({ preventScroll: true }), 50);
    }

    function error(msg) {
      const el = $('.planner__step.is-active .planner__error', modal);
      if (el) el.textContent = msg;
      if (!prefersReduced) gsap.fromTo(panel, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    }

    function buildBrief() {
      const services = values('services');
      const name = field('name');
      const lines = [
        'Hi Kier,',
        '',
        "I'd like to start a project with you.",
        '',
        'WHAT I NEED',
        ...services.map((s) => `• ${s}`),
        '',
        `TIMELINE: ${values('timeline')[0] || 'Not specified'}`,
        `BUDGET: ${values('budget')[0] || 'Not specified'}`,
        '',
        'ABOUT ME',
        `Name: ${name}`,
        `Email: ${field('email')}`,
      ];
      if (field('store')) lines.push(`Store: ${field('store')}`);
      if (field('message')) lines.push('', 'PROJECT DETAILS', field('message'));
      lines.push('', '— Sent via the project planner on your portfolio');
      return {
        subject: `Project brief — ${services.slice(0, 2).join(' + ')}${services.length > 2 ? ' + more' : ''} — ${name}`,
        body: lines.join('\n'),
      };
    }

    const mailtoHref = () => `mailto:${PLANNER_EMAIL}?subject=${encodeURIComponent(brief.subject)}&body=${encodeURIComponent(brief.body)}`;

    function open(trigger) {
      opener = trigger || document.activeElement;
      step = 1;
      modal.hidden = false;
      document.body.classList.add('planner-open');
      lenis?.stop();
      render();
      if (!prefersReduced) {
        gsap.fromTo($('.planner__backdrop', modal), { opacity: 0 }, { opacity: 1, duration: 0.5 });
        gsap.fromTo(panel, { y: 60, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.8, ease: 'expo.out' });
      }
      setTimeout(() => $('.planner__step.is-active input', modal)?.focus({ preventScroll: true }), 120);
    }

    function close() {
      if (modal.hidden) return;
      const done = () => {
        modal.hidden = true;
        document.body.classList.remove('planner-open');
        lenis?.start();
        opener?.focus?.({ preventScroll: true });
      };
      if (prefersReduced) { done(); return; }
      gsap.to($('.planner__backdrop', modal), { opacity: 0, duration: 0.35 });
      gsap.to(panel, { y: 40, autoAlpha: 0, duration: 0.35, ease: 'power3.in', onComplete: done });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (step === 1 && !values('services').length) { error('Pick at least one thing you need help with.'); return; }
      if (step === 3) {
        const name = form.elements.name;
        const email = form.elements.email;
        name.classList.toggle('is-invalid', !field('name'));
        email.classList.toggle('is-invalid', !field('email') || !email.checkValidity());
        if (!field('name')) { error('Please add your name.'); name.focus(); return; }
        if (!field('email') || !email.checkValidity()) { error('Please add a valid email so I can reply.'); email.focus(); return; }
        brief = buildBrief();
        $('[data-planner-mail]', modal).href = mailtoHref();
        window.location.href = mailtoHref();
      }
      step += 1;
      render(1);
    });

    // Clear the error as soon as the visitor fixes it
    form.addEventListener('input', (e) => {
      $$('.planner__error', modal).forEach((el) => (el.textContent = ''));
      e.target.classList?.remove('is-invalid');
    });

    back.addEventListener('click', () => { if (step > 1) { step -= 1; render(-1); } });
    $$('[data-planner-close]', modal).forEach((b) => b.addEventListener('click', close));

    $('[data-planner-copy]', modal).addEventListener('click', async () => {
      const text = `To: ${PLANNER_EMAIL}\nSubject: ${brief.subject}\n\n${brief.body}`;
      try { await navigator.clipboard.writeText(text); toast('Brief copied — paste it into an email ✦'); }
      catch { toast(`Email me at ${PLANNER_EMAIL}`); }
    });

    // Keyboard: Escape closes, Tab stays inside the dialog
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const focusables = $$('button, a[href], input, textarea', panel).filter((el) => !el.disabled && el.offsetParent !== null);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    $$('[data-planner]').forEach((trigger) => trigger.addEventListener('click', (e) => { e.preventDefault(); open(trigger); }));
  }

  /* =========================================================
     9. EXPERIENCE ACCORDION
  ========================================================= */
  function initAccordion() {
    $$('.xp__item').forEach((item) => {
      const head = $('.xp__head', item);
      const body = $('.xp__body', item);
      if (!item.classList.contains('is-open')) gsap.set(body, { height: 0 });

      head.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        head.setAttribute('aria-expanded', String(open));
        gsap.to(body, {
          height: open ? 'auto' : 0,
          duration: prefersReduced ? 0 : 0.8,
          ease: 'expo.inOut',
          onComplete: () => ScrollTrigger.refresh(),
        });
        if (open && !prefersReduced) {
          gsap.fromTo($$('li', body), { x: -20, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05, delay: 0.15, overwrite: true });
        }
      });
    });
  }

  /* =========================================================
     10. TOOLBOX — 3D tilt + spotlight following the cursor
  ========================================================= */
  function initTilt() {
    if (isTouch || prefersReduced) return;
    $$('.tool').forEach((card) => {
      gsap.set(card, { transformPerspective: 900 });
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3' });
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        ry((px - 0.5) * 12);
        rx((0.5 - py) * 12);
      });
      card.addEventListener('mouseleave', () => { rx(0); ry(0); });
    });
  }

  /* =========================================================
     11. CONTACT — scramble, copy to clipboard, clock
  ========================================================= */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function scramble(el) {
    const original = el.dataset.original || el.textContent;
    el.dataset.original = original;
    const state = { p: 0 };
    gsap.to(state, {
      p: 1, duration: 0.8, ease: 'none', overwrite: true,
      onUpdate() {
        const reveal = Math.floor(state.p * original.length);
        el.textContent = original.split('').map((c, i) => {
          if (i < reveal || c === ' ' || c === '.' || c === '@') return c;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)].toLowerCase();
        }).join('');
      },
      onComplete: () => { el.textContent = original; },
    });
  }

  const toastEl = $('.toast');
  gsap.set(toastEl, { x: 0, y: 0, xPercent: -50, yPercent: 250, autoAlpha: 0 });
  let toastTl;
  function toast(msg) {
    toastEl.textContent = msg;
    toastTl?.kill();
    toastTl = gsap.timeline()
      .to(toastEl, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' })
      .to(toastEl, { yPercent: 250, autoAlpha: 0, duration: 0.5, ease: 'expo.in' }, '+=1.8');
  }

  function initContact() {
    if (!prefersReduced) {
      $$('[data-scramble]').forEach((el) => el.addEventListener('mouseenter', () => scramble(el)));
    }

    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.copy;
        try {
          await navigator.clipboard.writeText(value);
          toast('Email copied — talk soon ✦');
          const label = $('span', btn);
          label.textContent = 'Copied';
          setTimeout(() => (label.textContent = 'Copy'), 2000);
        } catch {
          window.location.href = `mailto:${value}`;
        }
      });
    });

    const clock = $('.clock');
    if (clock) {
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const tick = () => (clock.textContent = fmt.format(new Date()));
      tick();
      setInterval(tick, 1000);
    }
  }

  /* =========================================================
     12. NAVIGATION — anchors, hide on scroll, mobile menu,
         progress bar, floating CTA
  ========================================================= */
  let menuOpen = false;
  let menuTl;

  function toggleMenu(force) {
    const next = typeof force === 'boolean' ? force : !menuOpen;
    if (next === menuOpen) return;
    menuOpen = next;
    const burger = $('.nav__burger');
    document.body.classList.toggle('menu-open', menuOpen);
    burger.setAttribute('aria-expanded', String(menuOpen));
    burger.setAttribute('aria-label', menuOpen ? 'Close menu' : 'Open menu');
    $('.menu').setAttribute('aria-hidden', String(!menuOpen));
    if (menuOpen) { menuTl.timeScale(1).play(); lenis?.stop(); }
    else { menuTl.timeScale(1.6).reverse(); lenis?.start(); }
  }

  function initNav() {
    const nav = $('.nav');
    const bar = $('.scroll-progress span');

    menuTl = gsap.timeline({ paused: true })
      .set('.menu', { visibility: 'visible' })
      .fromTo('.menu',
        { clipPath: 'circle(0% at calc(100% - 45px) 45px)' },
        { clipPath: 'circle(150% at calc(100% - 45px) 45px)', duration: 0.9, ease: 'expo.inOut' })
      .from('.menu__links a', { yPercent: 100, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, '-=0.45')
      .from('.menu__foot', { autoAlpha: 0, y: 20, duration: 0.6, ease: 'expo.out' }, '-=0.5');

    $('.nav__burger').addEventListener('click', () => toggleMenu());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

    // Smooth anchor links
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id === '#' || a.hasAttribute('data-planner')) return;
        const target = id === '#top' ? 0 : $(id);
        if (target === null) return;
        e.preventDefault();
        const go = () => scrollToTarget(target);
        if (menuOpen) { toggleMenu(false); setTimeout(go, 350); } else go();
      });
    });
    $$('[data-scrollto]').forEach((b) => b.addEventListener('click', () => scrollToTarget(Number(b.dataset.scrollto))));

    // Hide nav on scroll down, show on scroll up + progress bar + theme
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate(self) {
        const y = self.scroll();
        nav.classList.toggle('is-hidden', self.direction === 1 && y > window.innerHeight * 0.4 && !menuOpen);
        bar.style.transform = `scaleX(${self.progress})`;
        updateTheme();
      },
    });

    // Floating "Hire me" pill: visible between the hero and the contact section
    const floatCta = $('.float-cta');
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'bottom 30%',
      endTrigger: '.contact',
      end: 'top 85%',
      onToggle: (s) => floatCta.classList.toggle('is-visible', s.isActive),
    });
  }

  /* =========================================================
     BOOT
  ========================================================= */
  initWork();          // pin first
  initHeroDashboard();
  setHeroInitial();
  initCursor();
  initMagnetic();
  initButtonFills();
  initHeroCanvas();
  initMarquee();
  initReveals();
  initServices();
  initAccordion();
  initTilt();
  initContact();
  initPlanner();
  initNav();
  initWeightHover($('.hero__title'), { min: 500, max: 800, radius: 300 });
  initWeightHover($('.contact__title'), { min: 500, max: 800, radius: 260 });
  updateTheme();
  ScrollTrigger.addEventListener('refresh', updateTheme);

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());

  runPreloader().then(heroIntro);
})();
