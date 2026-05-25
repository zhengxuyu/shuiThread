// ════════════════════════════════════════════════════════════════
//  SHUI THREAD — Stitched cinematic intro
//  A gold-thread butterfly is stitched onto indigo cloth, the
//  wordmark fades in, then the overlay dismisses on first gesture
//  (or after AUTO_DISMISS_MS). Pure SVG + CSS — no external deps.
// ════════════════════════════════════════════════════════════════
(function () {
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
      ${Array.from({ length: 22 }, (_, i) => `<span style="--i:${i};--d:${(Math.random()*10).toFixed(2)}s;--x:${(Math.random()*100).toFixed(1)}%;--s:${(0.4 + Math.random()*0.9).toFixed(2)}"></span>`).join('')}
    </div>

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
         stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"
         filter="url(#glow)">
        <!-- Body -->
        <path class="seg s-body" pathLength="100"
              d="M 300 210 C 296 270 296 360 300 430"/>

        <!-- Upper wings (mirrored pair) -->
        <path class="seg s-upL" pathLength="100"
              d="M 300 230 C 230 180 130 200 130 290 C 130 340 200 360 300 320"/>
        <path class="seg s-upR" pathLength="100"
              d="M 300 230 C 370 180 470 200 470 290 C 470 340 400 360 300 320"/>

        <!-- Lower wings -->
        <path class="seg s-loL" pathLength="100"
              d="M 300 330 C 240 340 180 400 220 460 C 250 490 290 470 300 410"/>
        <path class="seg s-loR" pathLength="100"
              d="M 300 330 C 360 340 420 400 380 460 C 350 490 310 470 300 410"/>

        <!-- Wing accents -->
        <path class="seg s-accL" pathLength="100"
              d="M 210 270 C 220 290 240 305 270 310"/>
        <path class="seg s-accR" pathLength="100"
              d="M 390 270 C 380 290 360 305 330 310"/>

        <!-- Antennae -->
        <path class="seg s-antL" pathLength="100"
              d="M 300 210 C 290 195 282 178 270 168"/>
        <path class="seg s-antR" pathLength="100"
              d="M 300 210 C 310 195 318 178 330 168"/>

        <!-- Dots: traditional Shui accent stitches -->
        <circle class="dot d1" cx="200" cy="270" r="2.5"/>
        <circle class="dot d2" cx="400" cy="270" r="2.5"/>
        <circle class="dot d3" cx="250" cy="430" r="2"/>
        <circle class="dot d4" cx="350" cy="430" r="2"/>
        <circle class="dot d5" cx="270" cy="168" r="1.8"/>
        <circle class="dot d6" cx="330" cy="168" r="1.8"/>
      </g>
    </svg>

    <div class="stitch-intro__chrome">
      <div class="stitch-intro__brand">
        <div class="stitch-intro__brand-en">Shui Thread</div>
        <div class="stitch-intro__brand-zh">水 · 丝 线 · 马 尾 绣</div>
      </div>

      <div class="stitch-intro__rule"></div>

      <div class="stitch-intro__lede">
        <span class="l1">A film about</span>
        <em class="l2">one strand</em>
        <span class="l3">of horsetail hair.</span>
      </div>

      <button class="stitch-intro__enter" type="button" disabled>
        <span>Enter</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      <div class="stitch-intro__hint">Click anywhere · scroll · or press any key</div>
    </div>

    <div class="stitch-intro__grain" aria-hidden="true"></div>
  `;
  document.body.appendChild(root);

  // Force reflow then start
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
