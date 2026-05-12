/**
 * Shui Thread Intro
 * Act 1: Shui-script horse runs left → right
 * Act 2: Camera pushes in to spirally wound tail
 * Act 3: Strands unfurl in wind → page reveals
 */
(function () {
  'use strict';

  const legacy = document.querySelector('.loading-screen');
  if (legacy) legacy.style.display = 'none';

  // ─── Overlay ──────────────────────────────────────────────────────────────
  const ov = document.createElement('div');
  ov.id = 'shui-intro';
  ov.style.cssText =
    'position:fixed;inset:0;z-index:9999;overflow:hidden;pointer-events:all;' +
    'cursor:pointer;background:#08060A;';
  document.body.insertBefore(ov, document.body.firstChild);

  const cv = document.createElement('canvas');
  cv.style.cssText = 'width:100%;height:100%;display:block;';
  ov.appendChild(cv);

  const W = (cv.width  = window.innerWidth);
  const H = (cv.height = window.innerHeight);
  const g  = cv.getContext('2d');

  // ─── Timeline ─────────────────────────────────────────────────────────────
  const FPS = 60;
  const f   = s => Math.round(s * FPS);

  const T = {
    fadeIn:      f(0.5),
    horseStart:  f(0.6),
    horseEnd:    f(5.5),   // horse decelerates to rest
    zoomStart:   f(4.8),   // camera begins pushing in while horse slows
    zoomEnd:     f(8.0),   // fully zoomed: tail fills view
    unfurlStart: f(8.0),   // wound strands begin releasing
    unfurlEnd:   f(11.5),  // strands fully spread
    revealStart: f(10.5),  // page fades in from behind
    revealEnd:   f(14.0),
  };

  // ─── Easing ───────────────────────────────────────────────────────────────
  const o3 = t => 1 - Math.pow(1 - t, 3);
  const o5 = t => 1 - Math.pow(1 - t, 5);

  function pr(a, b) {
    if (b === a) return 1;
    return Math.max(0, Math.min(1, (frame - a) / (b - a)));
  }

  // ─── Horse: Shui-script pictograph style ──────────────────────────────────
  function drawHorse(cx, cy, sc, gait, alpha) {
    const bob   = Math.abs(Math.sin(gait * 1.8)) * sc * 0.015;
    const pitch = Math.sin(gait * 0.5) * 0.018;

    g.save();
    g.translate(cx, cy + bob);
    g.rotate(pitch);
    g.globalAlpha = alpha;

    const ink  = '#C8A448';
    const inkA = a => `rgba(200,164,72,${a})`;

    g.lineCap  = 'round';
    g.lineJoin = 'round';
    g.shadowColor = 'rgba(200,160,60,0.28)';
    g.shadowBlur  = 16;

    // Body — thick horizontal stroke
    const bL = -sc * 0.52, bR = sc * 0.36, bY = 0;
    g.strokeStyle = ink;
    g.lineWidth   = sc * 0.090;
    g.beginPath(); g.moveTo(bL, bY); g.lineTo(bR, bY); g.stroke();

    // Neck
    const nSway = Math.sin(gait * 0.55) * sc * 0.025;
    const nBx = sc * 0.18, nBy = -sc * 0.045;
    const nTx = sc * 0.26 + nSway, nTy = -sc * 0.42;
    g.strokeStyle = ink;
    g.lineWidth   = sc * 0.070;
    g.beginPath(); g.moveTo(nBx, nBy); g.lineTo(nTx, nTy); g.stroke();

    // Head — T-cross (ear bar + crown spike + snout)
    g.strokeStyle = ink;
    g.lineWidth = sc * 0.048;
    g.beginPath();
    g.moveTo(nTx - sc * 0.18, nTy + sc * 0.01);
    g.lineTo(nTx + sc * 0.18, nTy + sc * 0.01);
    g.stroke();

    g.lineWidth = sc * 0.040;
    g.beginPath();
    g.moveTo(nTx, nTy + sc * 0.01);
    g.lineTo(nTx, nTy - sc * 0.16);
    g.stroke();

    g.lineWidth = sc * 0.038;
    g.beginPath();
    g.moveTo(nTx + sc * 0.08, nTy + sc * 0.10);
    g.lineTo(nTx + sc * 0.26, nTy + sc * 0.20);
    g.stroke();

    g.fillStyle = ink;
    g.beginPath();
    g.arc(nTx + sc * 0.26, nTy + sc * 0.20, sc * 0.018, 0, Math.PI * 2);
    g.fill();

    // Legs — 4 alternating strokes with hooves
    const legPhases = [0, Math.PI, Math.PI * 0.58, Math.PI * 1.58];
    const legRootsX = [sc * 0.24, sc * 0.06, -sc * 0.18, -sc * 0.38];
    const legRootY  = sc * 0.045;
    g.strokeStyle = ink;
    for (let i = 0; i < 4; i++) {
      const swing = Math.sin(gait + legPhases[i]) * sc * 0.20;
      const lift  = Math.max(0, Math.sin(gait + legPhases[i])) * sc * 0.12;
      const lx = legRootsX[i], ly = legRootY;

      g.lineWidth = sc * 0.044;
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx + swing * 0.38, ly + sc * 0.24 - lift);
      g.stroke();

      g.lineWidth = sc * 0.030;
      g.beginPath();
      g.moveTo(lx + swing * 0.38, ly + sc * 0.24 - lift);
      g.lineTo(lx + swing * 0.82, ly + sc * 0.46 - lift * 0.4);
      g.stroke();

      const hx = lx + swing * 0.82;
      const hy = ly + sc * 0.46 - lift * 0.4;
      const curl = (i < 2) ? sc * 0.10 : -sc * 0.10;
      g.lineWidth = sc * 0.026;
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + curl, hy + sc * 0.06);
      g.stroke();
    }

    // Tail — upswept waving strands
    const tw  = Math.sin(gait * 0.62) * sc * 0.08;
    const tw2 = Math.sin(gait * 0.40 + 1.2) * sc * 0.04;

    g.lineWidth   = sc * 0.044;
    g.strokeStyle = inkA(0.88);
    g.beginPath();
    g.moveTo(bL, bY);
    g.bezierCurveTo(
      bL - sc * 0.10 + tw,        bY - sc * 0.22,
      bL - sc * 0.14 + tw + tw2,  bY - sc * 0.44,
      bL - sc * 0.04 + tw,        bY - sc * 0.58
    );
    g.stroke();

    g.lineWidth   = sc * 0.026;
    g.strokeStyle = inkA(0.55);
    g.beginPath();
    g.moveTo(bL - sc * 0.02, bY - sc * 0.02);
    g.bezierCurveTo(
      bL - sc * 0.22 + tw,        bY - sc * 0.16,
      bL - sc * 0.28 + tw + tw2,  bY - sc * 0.36,
      bL - sc * 0.20 + tw,        bY - sc * 0.52
    );
    g.stroke();

    g.restore();
  }

  // ─── Wound spiral: tight coil of horsehair strands ────────────────────────
  function drawWoundSpiral(cx, cy, sc, windT, alpha) {
    if (alpha < 0.01) return;
    g.save();
    g.globalAlpha = alpha;

    const COIL_COUNT = 7;
    const loops = 4.5;
    const maxR  = sc * 0.42;
    const steps = 320;

    for (let s = 0; s < COIL_COUNT; s++) {
      const phaseOff = (s / COIL_COUNT) * Math.PI * 2;
      const fade     = 0.92 - s * 0.10;
      g.strokeStyle = `rgba(200,164,72,${fade})`;
      g.lineWidth   = 2.8 - s * 0.28;
      g.lineCap     = 'round';
      g.shadowColor = 'rgba(200,164,72,0.22)';
      g.shadowBlur  = 10;

      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t     = i / steps;
        const angle = t * Math.PI * 2 * loops + phaseOff;
        const r     = t * maxR;
        // subtle wind wobble on outer coils
        const wobble = Math.sin(windT * 1.6 + phaseOff + t * 10) * r * 0.03;
        const x = cx + Math.cos(angle) * r + wobble;
        const y = cy + Math.sin(angle) * r * 0.52; // flatten → oval coil
        if (i === 0) g.moveTo(x, y);
        else         g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }

  // ─── Unfurling strands: horsehair releases and flows outward ──────────────
  const STRAND_COUNT = 18;
  const STRANDS = (function () {
    const arr = [];
    for (let i = 0; i < STRAND_COUNT; i++) {
      const base = (i / STRAND_COUNT) * Math.PI * 2;
      arr.push({
        angle:      base + (i % 2 === 0 ? 0.12 : -0.09),  // slight jitter
        length:     0.55 + (i % 3) * 0.20,                // 0.55 / 0.75 / 0.95
        delay:      (i / STRAND_COUNT) * 0.50,             // staggered release
        wavePhase:  i * 1.37,
        thickness:  1.0 + (i % 5) * 0.38,
        curvature:  (i % 2 === 0 ? 1 : -1) * (0.25 + (i % 3) * 0.08),
      });
    }
    return arr;
  }());

  function drawUnfurledStrands(cx, cy, screenSize, unfurlT, windT) {
    for (let i = 0; i < STRAND_COUNT; i++) {
      const s = STRANDS[i];
      const localT = Math.max(0, Math.min(1, (unfurlT - s.delay) / (1 - s.delay)));
      if (localT <= 0) continue;

      const et       = o5(localT);
      const targetLen = screenSize * s.length;
      const curLen    = et * targetLen;

      // Wind curve: perpendicular oscillation proportional to length
      const perpAngle = s.angle + Math.PI / 2;
      const windAmt   = Math.sin(windT * 1.3 + s.wavePhase) * curLen * s.curvature * et;

      // Bezier control point (gives elegant wind curve to each strand)
      const ctrlX = cx + Math.cos(s.angle) * curLen * 0.52 + Math.cos(perpAngle) * windAmt;
      const ctrlY = cy + Math.sin(s.angle) * curLen * 0.52 + Math.sin(perpAngle) * windAmt;

      // Tip of strand
      const tipX = cx + Math.cos(s.angle) * curLen + Math.cos(perpAngle) * windAmt * 0.4;
      const tipY = cy + Math.sin(s.angle) * curLen + Math.sin(perpAngle) * windAmt * 0.4;

      // Color transition: horsehair gold → brand orange → cream (as strand spreads)
      //   gold: rgb(200,164,72)  orange: rgb(224,90,26)  cream: rgb(247,243,237)
      const p1 = Math.min(1, et * 2);
      const p2 = Math.max(0, et * 2 - 1);
      const r  = Math.round(200 + (224 - 200) * p1 + (247 - 224) * p2);
      const gr = Math.round(164 + (90  - 164) * p1 + (243 - 90)  * p2);
      const b  = Math.round(72  + (26  - 72)  * p1 + (237 - 26)  * p2);

      // Gradient: opaque at root → transparent at tip
      const grad = g.createLinearGradient(cx, cy, tipX, tipY);
      grad.addColorStop(0.0, `rgba(${r},${gr},${b},0.85)`);
      grad.addColorStop(0.6, `rgba(${r},${gr},${b},0.55)`);
      grad.addColorStop(1.0, `rgba(${r},${gr},${b},0.00)`);

      g.save();
      g.strokeStyle = grad;
      g.lineWidth   = s.thickness;
      g.lineCap     = 'round';
      g.shadowColor = `rgba(${r},${gr},${b},0.28)`;
      g.shadowBlur  = 12;

      g.beginPath();
      g.moveTo(cx, cy);
      g.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      g.stroke();
      g.restore();
    }
  }

  // ─── Background ───────────────────────────────────────────────────────────
  function drawBackground() {
    g.fillStyle = '#08060A';
    g.fillRect(0, 0, W, H);

    // Subtle woven-grid grain
    g.save();
    g.globalAlpha = 0.016;
    g.strokeStyle = '#C8A050';
    g.lineWidth   = 0.5;
    const step = 24;
    for (let x = 0; x < W; x += step) { g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); }
    for (let y = 0; y < H; y += step) { g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
    g.restore();

    // Vignette
    const vgr = g.createRadialGradient(W/2,H/2,0, W/2,H/2, Math.max(W,H)*0.72);
    vgr.addColorStop(0, 'rgba(0,0,0,0)');
    vgr.addColorStop(1, 'rgba(0,0,0,0.74)');
    g.fillStyle = vgr;
    g.fillRect(0, 0, W, H);
  }

  // ─── State ────────────────────────────────────────────────────────────────
  let frame = 0;
  let done  = false;

  // ─── Main loop ────────────────────────────────────────────────────────────
  function tick() {
    if (done) return;
    frame++;

    const sc   = Math.min(W, H) * 0.19;
    const gait = frame * 0.19;

    // ── Act 1: horse crosses screen, decelerating to rest ──────────────────
    const horseT = o5(pr(T.horseStart, T.horseEnd));
    const horseX = -W * 0.18 + horseT * W * 0.68;  // rests near center
    const bob    = Math.abs(Math.sin(gait * 1.8)) * sc * 0.015;
    const horseY = H * 0.52;

    // Tail root in world space (left end of body stroke)
    const tailX = horseX - sc * 0.52;
    const tailY = horseY + bob;

    // ── Act 2: camera pushes in toward tail ────────────────────────────────
    const zoomT   = o5(pr(T.zoomStart, T.zoomEnd));
    const maxZoom = 6.5;
    const camZoom = 1 + (maxZoom - 1) * zoomT;

    // Camera offset: map tailX/tailY to screen center
    const camOffX = W / 2 - tailX * camZoom;
    const camOffY = H / 2 - tailY * camZoom;

    // ── Act 3: unfurl ───────────────────────────────────────────────────────
    const unfurlT = o3(pr(T.unfurlStart, T.unfurlEnd));
    const windT   = frame * 0.034;

    // ── Render ──────────────────────────────────────────────────────────────
    drawBackground();

    // Camera-space: horse + wound spiral
    g.save();
    g.translate(camOffX, camOffY);
    g.scale(camZoom, camZoom);

    // Horse: fades as zoom deepens
    const horseAlpha = Math.max(0, 1 - zoomT * 1.4);
    if (frame >= T.horseStart && horseAlpha > 0.01) {
      drawHorse(horseX, horseY, sc, gait, horseAlpha);
    }

    // Wound spiral at tail: emerges as zoom builds, disappears as unfurl starts
    const spiralIn  = Math.max(0, Math.min(1, (zoomT - 0.35) / 0.65));
    const spiralOut = Math.max(0, 1 - unfurlT * 5);
    const spiralA   = spiralIn * spiralOut;
    if (spiralA > 0.01) {
      drawWoundSpiral(tailX, tailY, sc, windT, spiralA);
    }

    g.restore(); // end camera space

    // Screen-space: unfurling strands emanate from the zoomed tail (≈ center)
    if (unfurlT > 0) {
      drawUnfurledStrands(W / 2, H / 2, Math.min(W, H) * 1.15, unfurlT, windT);
    }

    // ── Fade in at start ────────────────────────────────────────────────────
    if (frame < T.fadeIn) {
      g.fillStyle = `rgba(8,6,10,${1 - pr(0, T.fadeIn)})`;
      g.fillRect(0, 0, W, H);
    }

    // ── Page reveal: overlay fades while strands fill the screen ───────────
    if (frame >= T.revealStart) {
      ov.style.opacity = String(Math.max(0, 1 - o5(pr(T.revealStart, T.revealEnd))));
    }

    if (frame >= T.revealEnd) { cleanup(); return; }
    requestAnimationFrame(tick);
  }

  function cleanup() {
    done = true;
    ov.style.transition = 'opacity 0.3s';
    ov.style.opacity    = '0';
    setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 350);
  }

  function skip() {
    if (done) return;
    done = true;
    ov.style.transition = 'opacity 0.4s';
    ov.style.opacity    = '0';
    setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 450);
  }

  ov.addEventListener('click', skip);
  document.addEventListener('keydown', skip);
  requestAnimationFrame(tick);

}());
