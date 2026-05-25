// ════════════════════════════════════════════════════════════════
//  SHUI THREAD — Spline cinematic intro
//  Renders a full-screen Spline 3D scene over the page, fades it out
//  on first user gesture or after autoDismissMs, then reveals the site.
// ════════════════════════════════════════════════════════════════
(function () {
  // 🪡  REPLACE THIS with your own scene URL from spline.design
  //    1. spline.design → File → Export → Code Export → Web Component
  //    2. Copy the "Public URL" (ends in .splinecode)
  //    3. Paste it below.
  const SPLINE_SCENE_URL = 'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode';

  // Show the intro at most once per session — set to false to always show.
  const ONCE_PER_SESSION = true;
  const SESSION_KEY = 'shui_intro_seen';
  const AUTO_DISMISS_MS = 9000;   // hard cap, even without a gesture
  const READY_MIN_MS    = 1200;   // minimum time before user can dismiss

  if (ONCE_PER_SESSION && sessionStorage.getItem(SESSION_KEY)) return;

  // Lock page scroll while intro is up
  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  // ── Build the overlay ──────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'spline-intro';
  root.innerHTML = `
    <div class="spline-intro__scene">
      <spline-viewer url="${SPLINE_SCENE_URL}" loading-anim-type="none"></spline-viewer>
    </div>

    <div class="spline-intro__chrome">
      <div class="spline-intro__brand">
        <span class="spline-intro__brand-en">Shui Thread</span>
        <span class="spline-intro__brand-zh">水 · 丝 线 · 马 尾 绣</span>
      </div>

      <div class="spline-intro__line"></div>

      <div class="spline-intro__lede">
        <span>A film about</span>
        <em>one strand</em>
        <span>of horsetail hair.</span>
      </div>

      <button class="spline-intro__enter" type="button" disabled>
        <span>Enter</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>

      <div class="spline-intro__hint">Click anywhere or scroll to continue</div>
    </div>

    <div class="spline-intro__grain" aria-hidden="true"></div>
    <div class="spline-intro__fallback" aria-hidden="true">
      <div class="spline-intro__fallback-mark"></div>
    </div>
  `;
  document.body.appendChild(root);

  // ── Load the Spline web component on demand ────────────────────
  if (!customElements.get('spline-viewer')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@splinetool/viewer@1.9.48/build/spline-viewer.js';
    document.head.appendChild(s);
  }

  // ── Dismiss flow ───────────────────────────────────────────────
  const enterBtn = root.querySelector('.spline-intro__enter');
  let armed = false;

  setTimeout(() => {
    armed = true;
    enterBtn.disabled = false;
    root.classList.add('is-armed');
  }, READY_MIN_MS);

  function dismiss() {
    if (!armed || root.dataset.gone) return;
    root.dataset.gone = '1';
    root.classList.add('is-leaving');
    document.documentElement.style.overflow = prevOverflow;
    if (ONCE_PER_SESSION) sessionStorage.setItem(SESSION_KEY, '1');
    setTimeout(() => root.remove(), 900);
  }

  enterBtn.addEventListener('click', dismiss);
  root.addEventListener('click', dismiss);
  window.addEventListener('wheel', dismiss, { passive: true, once: true });
  window.addEventListener('touchstart', dismiss, { passive: true, once: true });
  window.addEventListener('keydown', dismiss, { once: true });
  setTimeout(dismiss, AUTO_DISMISS_MS);

  // ── Fallback if Spline never loads (network/CORS/etc) ──────────
  setTimeout(() => {
    const viewer = root.querySelector('spline-viewer');
    if (!viewer || !viewer.shadowRoot || viewer.shadowRoot.children.length === 0) {
      root.classList.add('is-fallback');
    }
  }, 4500);
})();
