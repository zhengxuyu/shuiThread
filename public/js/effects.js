// ═══════════════════════════════════════════════
//  SHUI THREAD — Landing choreography
//  IntersectionObserver for act reveals,
//  scroll-thread progress (Hermès orange),
//  nav reveal after Act 1.
// ═══════════════════════════════════════════════
(function() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Act in-view observer (exposed globally so late-rendered acts get observed) ── */
  let io = null;
  window.observeInView = function() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.act').forEach(a => a.classList.add('in-view'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
          }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    }
    document.querySelectorAll('.act:not(.in-view), .reveal:not(.visible)').forEach(el => io.observe(el));
  };

  // Also support legacy .reveal observer (for shop/about pages using cart.js patterns)
  window.initScrollReveal = function() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible'));
  };

  // Act 1 starts in-view immediately (it IS the viewport at load)
  const act1 = document.querySelector('.act-1');
  if (act1) act1.classList.add('in-view');

  observeInView();

  /* ── Nav reveal after first scroll past Act 1 ── */
  const nav = document.querySelector('.cinema-nav');
  const thread = document.querySelector('.scroll-thread');
  if (nav && act1) {
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) {
          nav.classList.add('visible');
          if (thread) thread.classList.add('visible');
        } else {
          nav.classList.remove('visible');
          if (thread) thread.classList.remove('visible');
        }
      });
    }, { threshold: 0.4 });
    navObs.observe(act1);
  }

  /* ── Scroll thread progress fill ── */
  const fill = document.querySelector('.scroll-thread__fill');
  if (fill) {
    let raf = 0;
    addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        const pct = max > 0 ? Math.min(100, (scrollY / max) * 100) : 0;
        fill.setAttribute('y2', pct.toFixed(2));
        raf = 0;
      });
    }, { passive: true });
  }

  /* ── Smooth anchor scroll for nav links ── */
  document.querySelectorAll('.cinema-nav__links a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  /* ── Pause Act 9 credits scroll if user scrolls back up ── */
  // (handled by IntersectionObserver — credits animation only triggers when in-view)

})();
