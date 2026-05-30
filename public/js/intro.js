// ════════════════════════════════════════════════════════════════
//  SHUI THREAD — Stitched cinematic intro (poster layout)
//  Top: wordmark.  Left: stitched butterfly.  Right: lede + Enter.
//  Pure SVG + CSS. No external dependencies.
// ════════════════════════════════════════════════════════════════
(function () {
  // ── Intro toggle ──────────────────────────────────────────────
  // Flip to true to re-enable the stitched butterfly opening.
  // Rest of the implementation is preserved below.
  const INTRO_ENABLED = false;
  if (!INTRO_ENABLED) return;

  const ONCE_PER_SESSION = true;
  const SESSION_KEY = 'shui_intro_seen';
  const AUTO_DISMISS_MS = 8500;
  const READY_MIN_MS = 3800;   // butterfly has finished stitching by now

  if (ONCE_PER_SESSION && sessionStorage.getItem(SESSION_KEY)) return;

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';

  const root = document.createElement('div');
  root.className = 'stitch-intro';
  root.innerHTML = `
    <div class="stitch-intro__cloth" aria-hidden="true"></div>

    <div class="stitch-intro__particles" aria-hidden="true">
      ${Array.from({ length: 22 }, () => `<span style="--d:${(Math.random()*10).toFixed(2)}s;--x:${(Math.random()*100).toFixed(1)}%;--s:${(0.4 + Math.random()*0.9).toFixed(2)}"></span>`).join('')}
    </div>

    <header class="stitch-intro__header">
      <div class="stitch-intro__brand-en">Shui Thread</div>
      <span class="stitch-intro__brand-sep">·</span>
      <div class="stitch-intro__brand-zh">水 · 丝 线</div>
    </header>

    <main class="stitch-intro__poster">

      <section class="stitch-intro__col stitch-intro__col--art">
        <svg class="stitch-intro__svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="threadStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0"    stop-color="#0D0D0D"/>
              <stop offset="0.55" stop-color="#2A2A2A"/>
              <stop offset="1"    stop-color="#D94E1F"/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.4" result="b"/>
              <feMerge>
                <feMergeNode in="b"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g class="stitch-intro__butterfly"
             stroke="url(#threadStroke)" fill="none"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
             filter="url(#glow)">
            <path class="seg s-body" pathLength="100" d="M 300 210 C 296 270 296 360 300 430"/>
            <path class="seg s-upL"  pathLength="100" d="M 300 230 C 230 180 130 200 130 290 C 130 340 200 360 300 320"/>
            <path class="seg s-upR"  pathLength="100" d="M 300 230 C 370 180 470 200 470 290 C 470 340 400 360 300 320"/>
            <path class="seg s-loL"  pathLength="100" d="M 300 330 C 240 340 180 400 220 460 C 250 490 290 470 300 410"/>
            <path class="seg s-loR"  pathLength="100" d="M 300 330 C 360 340 420 400 380 460 C 350 490 310 470 300 410"/>
            <path class="seg s-accL" pathLength="100" d="M 210 270 C 220 290 240 305 270 310"/>
            <path class="seg s-accR" pathLength="100" d="M 390 270 C 380 290 360 305 330 310"/>
            <path class="seg s-antL" pathLength="100" d="M 300 210 C 290 195 282 178 270 168"/>
            <path class="seg s-antR" pathLength="100" d="M 300 210 C 310 195 318 178 330 168"/>
            <circle class="dot d1" cx="200" cy="270" r="2.5"/>
            <circle class="dot d2" cx="400" cy="270" r="2.5"/>
            <circle class="dot d3" cx="250" cy="430" r="2"/>
            <circle class="dot d4" cx="350" cy="430" r="2"/>
            <circle class="dot d5" cx="270" cy="168" r="1.8"/>
            <circle class="dot d6" cx="330" cy="168" r="1.8"/>
          </g>
        </svg>
        <div class="stitch-intro__caption">Butterfly · Transformation · 蝶</div>
      </section>

      <div class="stitch-intro__divider" aria-hidden="true"></div>

      <section class="stitch-intro__col stitch-intro__col--copy">
        <div class="stitch-intro__overline">Est. 2026 · Guizhou</div>
        <h1 class="stitch-intro__lede">
          <span class="l1">A film about</span>
          <em class="l2">one strand</em>
          <span class="l3">of horsetail hair.</span>
        </h1>
        <p class="stitch-intro__sub">
          Handcrafted in Sandu, Guizhou — each stitch built around a single hair of horsetail, wrapped in silk.
        </p>
        <button class="stitch-intro__enter" type="button" disabled>
          <span>Enter</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </section>

    </main>

    <footer class="stitch-intro__footer">
      <span>Click anywhere · scroll · or press any key</span>
    </footer>

    <div class="stitch-intro__grain" aria-hidden="true"></div>
  `;
  document.body.appendChild(root);

  requestAnimationFrame(() => root.classList.add('is-running'));

  const enterBtn = root.querySelector('.stitch-intro__enter');
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
    setTimeout(() => root.remove(), 950);
  }

  enterBtn.addEventListener('click', e => { e.stopPropagation(); dismiss(); });
  root.addEventListener('click', dismiss);
  window.addEventListener('wheel', dismiss, { passive: true, once: true });
  window.addEventListener('touchstart', dismiss, { passive: true, once: true });
  window.addEventListener('keydown', dismiss, { once: true });
  setTimeout(dismiss, AUTO_DISMISS_MS);
})();
