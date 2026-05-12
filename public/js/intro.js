// ═══════════════════════════════════════════════
//  SHUI THREAD — Cinematic Intro
//  Indigo curtain → thread weaves a Shui butterfly motif →
//  red seal stamp → title reveal → curtain splits open
// ═══════════════════════════════════════════════
(function() {
  if (sessionStorage.getItem('shui-intro-seen') === '1') return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { sessionStorage.setItem('shui-intro-seen', '1'); return; }

  document.documentElement.style.overflow = 'hidden';

  const root = document.createElement('div');
  root.className = 'shui-intro';
  root.innerHTML = `
    <div class="shui-intro__panel shui-intro__panel--l"></div>
    <div class="shui-intro__panel shui-intro__panel--r"></div>
    <div class="shui-intro__grain"></div>

    <div class="shui-intro__center">
      <svg class="shui-intro__motif" viewBox="0 0 320 320" aria-hidden="true">
        <defs>
          <linearGradient id="goldThread" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#f4d29a"/>
            <stop offset="0.5" stop-color="#e8a04b"/>
            <stop offset="1" stop-color="#c97326"/>
          </linearGradient>
          <filter id="silkGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <circle class="p p-ring" cx="160" cy="160" r="140"
                fill="none" stroke="url(#goldThread)" stroke-width="0.8"
                stroke-dasharray="2 4" opacity="0.55"/>

        <path class="p p1" d="M160,60 Q158,160 160,260 Q162,160 160,60Z"
              fill="none" stroke="url(#goldThread)" stroke-width="1.5"
              filter="url(#silkGlow)"/>
        <path class="p p2" d="M160,110 Q90,80 70,135 Q60,170 110,175 Q140,175 160,160"
              fill="none" stroke="url(#goldThread)" stroke-width="1.8"
              stroke-linecap="round" filter="url(#silkGlow)"/>
        <path class="p p3" d="M160,110 Q230,80 250,135 Q260,170 210,175 Q180,175 160,160"
              fill="none" stroke="url(#goldThread)" stroke-width="1.8"
              stroke-linecap="round" filter="url(#silkGlow)"/>
        <path class="p p4" d="M160,170 Q110,180 95,220 Q90,250 130,245 Q150,240 160,210"
              fill="none" stroke="url(#goldThread)" stroke-width="1.6"
              stroke-linecap="round" filter="url(#silkGlow)"/>
        <path class="p p5" d="M160,170 Q210,180 225,220 Q230,250 190,245 Q170,240 160,210"
              fill="none" stroke="url(#goldThread)" stroke-width="1.6"
              stroke-linecap="round" filter="url(#silkGlow)"/>
        <path class="p p6" d="M105,135 Q120,145 130,135 Q140,125 150,140"
              fill="none" stroke="url(#goldThread)" stroke-width="1"
              stroke-linecap="round"/>
        <path class="p p7" d="M215,135 Q200,145 190,135 Q180,125 170,140"
              fill="none" stroke="url(#goldThread)" stroke-width="1"
              stroke-linecap="round"/>
        <path class="p p8" d="M160,90 Q150,75 140,70" fill="none"
              stroke="url(#goldThread)" stroke-width="1" stroke-linecap="round"/>
        <path class="p p9" d="M160,90 Q170,75 180,70" fill="none"
              stroke="url(#goldThread)" stroke-width="1" stroke-linecap="round"/>

        <circle class="dot d1" cx="115" cy="115" r="1.6" fill="#f4d29a" opacity="0"/>
        <circle class="dot d2" cx="205" cy="115" r="1.6" fill="#f4d29a" opacity="0"/>
        <circle class="dot d3" cx="160" cy="280" r="2"   fill="#e85d2f" opacity="0"/>
        <circle class="dot d4" cx="90"  cy="195" r="1.2" fill="#f4d29a" opacity="0"/>
        <circle class="dot d5" cx="230" cy="195" r="1.2" fill="#f4d29a" opacity="0"/>
      </svg>

      <div class="shui-intro__seal" aria-hidden="true">
        <span>水</span>
      </div>

      <div class="shui-intro__title">
        <div class="shui-intro__title-en">
          <span>S</span><span>H</span><span>U</span><span>I</span><span>&nbsp;</span><span>T</span><span>H</span><span>R</span><span>E</span><span>A</span><span>D</span>
        </div>
        <div class="shui-intro__title-zh">
          <span>水</span><span>·</span><span>丝</span><span>·</span><span>线</span>
        </div>
        <div class="shui-intro__caption">
          <span class="dashline"></span>
          <em>Horsetail Hair Embroidery · 马尾绣</em>
          <span class="dashline"></span>
        </div>
      </div>
    </div>

    <button class="shui-intro__skip" aria-label="Skip intro">Skip · 跳过</button>
  `;
  document.body.appendChild(root);

  const paths = root.querySelectorAll('.shui-intro__motif .p');
  paths.forEach(p => {
    const len = p.getTotalLength ? p.getTotalLength() : 400;
    p.style.strokeDasharray  = len;
    p.style.strokeDashoffset = len;
  });

  function finish() {
    if (root.classList.contains('shui-intro--open')) return;
    root.classList.add('shui-intro--open');
    setTimeout(() => {
      root.remove();
      document.documentElement.style.overflow = '';
      sessionStorage.setItem('shui-intro-seen', '1');
      document.dispatchEvent(new Event('shui:intro-done'));
    }, 1200);
  }

  root.querySelector('.shui-intro__skip').addEventListener('click', finish);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.add('shui-intro--play'));
  });

  setTimeout(finish, 5400);
})();
