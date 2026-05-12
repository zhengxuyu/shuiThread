// ═══════════════════════════════════════════════
//  SHUI THREAD — Ambient Effects
//  Thread cursor trail · magnetic buttons ·
//  side scroll progress · scroll reveal · hero parallax
// ═══════════════════════════════════════════════
(function() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;

  /* ── Thread cursor trail ───────────────────── */
  if (!isTouch && !reduce) {
    const cv = document.createElement('canvas');
    cv.className = 'fx-trail';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    let w, h, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      w = cv.width  = innerWidth  * dpr;
      h = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
    }
    resize();
    addEventListener('resize', resize);

    const pts = [];
    let mx = -100, my = -100;
    addEventListener('mousemove', e => { mx = e.clientX * dpr; my = e.clientY * dpr; });

    (function loop() {
      pts.push({ x: mx, y: my, a: 1 });
      if (pts.length > 22) pts.shift();

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const t = i / pts.length;
        ctx.strokeStyle = `rgba(217,78,31,${0.55 * t})`;
        ctx.lineWidth = (1 + t * 1.6) * dpr;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ── Magnetic buttons & links ──────────────── */
  if (!isTouch && !reduce) {
    const targets = document.querySelectorAll('.btn-primary, .btn-white, .btn-ghost, .nav-cart-btn, .product-hover-btn');
    targets.forEach(el => {
      el.classList.add('fx-magnet');
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top  + r.height / 2)) / r.height;
        el.style.transform = `translate(${dx * 8}px, ${dy * 6}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ── Side scroll progress thread ───────────── */
  if (!reduce) {
    const bar = document.createElement('div');
    bar.className = 'fx-scrollthread';
    bar.innerHTML = `
      <svg viewBox="0 0 4 100" preserveAspectRatio="none">
        <line x1="2" y1="0" x2="2" y2="100" stroke="rgba(13,13,13,0.10)" stroke-width="0.4"/>
        <line class="fx-scrollthread__fill" x1="2" y1="0" x2="2" y2="0"
              stroke="#D94E1F" stroke-width="0.8" stroke-linecap="round"/>
      </svg>
      <span class="fx-scrollthread__label">水·丝</span>
    `;
    document.body.appendChild(bar);
    const fill = bar.querySelector('.fx-scrollthread__fill');
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? (scrollY / max) * 100 : 0;
      fill.setAttribute('y2', pct.toFixed(2));
    }, { passive: true });
  }

  /* ── Film grain overlay (CSS-only via class) */
  document.body.classList.add('fx-grain');

  /* ── Scroll reveal observer ─────────────────── */
  window.initScrollReveal = function() {
    const els = document.querySelectorAll('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  };
  initScrollReveal();

  /* ── Hero parallax ──────────────────────────── */
  const heroImg = document.querySelector('.hero-image img');
  const heroNum = document.querySelector('.hero-number');
  if (heroImg && !reduce) {
    addEventListener('scroll', () => {
      const y = Math.min(scrollY, 600);
      heroImg.style.transform = `translateY(${y * 0.10}px) scale(${1 + y * 0.0003})`;
      if (heroNum) heroNum.style.transform = `translateY(${y * -0.20}px)`;
    }, { passive: true });
  }

  /* ── Letter split + reveal on hero title ──── */
  document.querySelectorAll('[data-split]').forEach(el => {
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'fx-letter';
      s.style.setProperty('--i', i);
      s.textContent = c === ' ' ? ' ' : c;
      el.appendChild(s);
    });
  });

  /* ── Nav link hover scramble ───────────────── */
  document.querySelectorAll('.nav-links a').forEach(a => {
    const original = a.textContent;
    a.addEventListener('mouseenter', () => {
      if (a.dataset.scrambling) return;
      a.dataset.scrambling = '1';
      const chars = '马尾绣丝线水族SHUITRED';
      let frame = 0;
      const total = 8;
      const id = setInterval(() => {
        let out = '';
        for (let i = 0; i < original.length; i++) {
          if (i < (frame / total) * original.length) out += original[i];
          else out += chars[Math.floor(Math.random() * chars.length)];
        }
        a.textContent = out;
        frame++;
        if (frame > total) {
          clearInterval(id);
          a.textContent = original;
          delete a.dataset.scrambling;
        }
      }, 28);
    });
  });
})();
