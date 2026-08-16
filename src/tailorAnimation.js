/**
 * tailorAnimation.js
 * 3D Cinematic Tailoring Animation — 4-Phase Flip Card Sequence
 * Pure CSS 3D transforms + Canvas/SVG — zero new dependencies
 */

let animationAborted = false;

/**
 * Run the full 3D cinematic tailor animation sequence.
 * @param {string[]} missingKeywords  - keywords from /api/score-jd
 * @param {Function} onComplete       - called when animation finishes
 */
export function run3DTailorSequence(missingKeywords = [], onComplete = () => {}) {
  animationAborted = false;

  const overlay = document.createElement('div');
  overlay.id = 'tailor3dOverlay';
  overlay.className = 'tailor3d-overlay';
  overlay.innerHTML = buildOverlayHTML(missingKeywords);
  document.body.appendChild(overlay);

  // Force reflow then reveal
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
  });

  const scene = overlay.querySelector('.tailor3d-scene');
  const cards = overlay.querySelectorAll('.tailor3d-card');
  const progressBar = overlay.querySelector('.tailor3d-progress-fill');
  const phaseLabel = overlay.querySelector('.tailor3d-phase-label');
  const skipBtn = overlay.querySelector('.tailor3d-skip');

  skipBtn.addEventListener('click', () => {
    animationAborted = true;
    closeOverlay(overlay);
    onComplete();
  });

  const phases = [
    {
      label: 'Phase 1 — Analyzing JD Semantics...',
      duration: 2800,
      onStart: () => startParticleAnimation(cards[0])
    },
    {
      label: 'Phase 2 — Extracting Missing Keywords...',
      duration: 2600,
      onStart: () => startKeywordCloud(cards[1], missingKeywords)
    },
    {
      label: 'Phase 3 — Rewriting with STAR Method...',
      duration: 2800,
      onStart: () => startTypewriter(cards[2])
    },
    {
      label: 'Phase 4 — Compiling LaTeX Resume...',
      duration: 2400,
      onStart: () => startCodeCascade(cards[3])
    }
  ];

  let currentPhase = 0;

  function runPhase(index) {
    if (animationAborted) return;
    if (index >= phases.length) {
      // All done — smooth exit
      setTimeout(() => {
        if (!animationAborted) {
          closeOverlay(overlay);
          onComplete();
        }
      }, 600);
      return;
    }

    const phase = phases[index];
    phaseLabel.textContent = phase.label;
    const progressPct = ((index + 1) / phases.length) * 100;
    progressBar.style.width = `${progressPct}%`;

    // Hide previous card, show current with flip-in
    cards.forEach((c, i) => {
      c.classList.remove('card-active', 'card-exit');
      if (i < index) c.classList.add('card-exit');
    });

    const card = cards[index];
    card.classList.add('card-active');
    phase.onStart();

    setTimeout(() => runPhase(index + 1), phase.duration);
  }

  // Kick off after the overlay fade-in
  setTimeout(() => runPhase(0), 400);
}

function buildOverlayHTML(keywords) {
  const kwTags = keywords.slice(0, 12).map((kw, i) => {
    const depth = 20 + Math.floor(Math.random() * 100);
    const delay = (i * 0.15).toFixed(2);
    return `<span class="kw-chip" style="--depth:${depth}px; --delay:${delay}s">${kw}</span>`;
  }).join('');

  return `
    <div class="tailor3d-scene">
      <!-- Slide 1: Semantic Particle Network -->
      <div class="tailor3d-card card-slide-1">
        <div class="card-glass-inner">
          <div class="card-icon">🧠</div>
          <h3>Analyzing JD Semantics</h3>
          <p>Computing cosine similarity vectors across semantic embedding space...</p>
          <canvas class="particle-canvas" width="320" height="140"></canvas>
          <div class="card-shimmer"></div>
        </div>
      </div>

      <!-- Slide 2: Keyword Vortex Cloud -->
      <div class="tailor3d-card card-slide-2">
        <div class="card-glass-inner">
          <div class="card-icon">🔑</div>
          <h3>Extracting Missing Keywords</h3>
          <p>Identified high-priority JD terms absent from your resume:</p>
          <div class="kw-cloud">${kwTags || '<span class="kw-chip">analyzing...</span>'}</div>
          <div class="card-shimmer"></div>
        </div>
      </div>

      <!-- Slide 3: STAR Method Typewriter -->
      <div class="tailor3d-card card-slide-3">
        <div class="card-glass-inner">
          <div class="card-icon">✍️</div>
          <h3>Rewriting via STAR Method</h3>
          <p>Transforming bullets into impact-driven achievements:</p>
          <div class="terminal-window">
            <div class="terminal-bar">
              <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
              <span style="margin-left:0.5rem;font-size:0.7rem;color:#6b7280;">resume_optimizer.py</span>
            </div>
            <div class="terminal-body">
              <span class="term-old">• Managed team projects and tasks...</span>
              <span class="term-arrow">→</span>
              <span class="term-new typewriter-text" id="twText"></span>
            </div>
          </div>
          <div class="card-shimmer"></div>
        </div>
      </div>

      <!-- Slide 4: LaTeX Code Cascade -->
      <div class="tailor3d-card card-slide-4">
        <div class="card-glass-inner">
          <div class="card-icon">📄</div>
          <h3>Compiling Final LaTeX Resume</h3>
          <p>Sanitizing and rendering professional document...</p>
          <div class="latex-cascade" id="latexCascade">
            <div class="lx-line">\\documentclass[letterpaper,11pt]{article}</div>
            <div class="lx-line">\\usepackage{geometry, hyperref, enumitem}</div>
            <div class="lx-line">\\begin{document}</div>
            <div class="lx-line">  \\section*{\\textbf{Professional Summary}}</div>
            <div class="lx-line">    Results-driven engineer with expertise in...</div>
            <div class="lx-line">  \\section*{\\textbf{Experience}}</div>
            <div class="lx-line">    \\begin{itemize}</div>
            <div class="lx-line">      \\item Accomplished X, measured by Y, by doing Z...</div>
            <div class="lx-line">    \\end{itemize}</div>
            <div class="lx-line">\\end{document}</div>
          </div>
          <div class="card-shimmer"></div>
        </div>
      </div>
    </div>

    <!-- HUD -->
    <div class="tailor3d-hud">
      <div class="tailor3d-progress-track">
        <div class="tailor3d-progress-fill"></div>
      </div>
      <div class="tailor3d-phase-label">Initializing AI Engine...</div>
    </div>
    <button class="tailor3d-skip" type="button">Skip Animation</button>
  `;
}

/* ── Slide 1: SVG/Canvas Particle Network ─────────────────────── */
function startParticleAnimation(card) {
  const canvas = card.querySelector('.particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const nodes = Array.from({ length: 18 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    r: 3 + Math.random() * 3
  }));

  let frame = 0;
  function draw() {
    if (animationAborted) return;
    ctx.clearRect(0, 0, W, H);
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;

      // Draw connections
      nodes.forEach(m => {
        const dist = Math.hypot(n.x - m.x, n.y - m.y);
        if (dist < 70) {
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = `rgba(99,102,241,${(1 - dist / 70) * 0.5})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      // Draw node
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2);
      grd.addColorStop(0, 'rgba(139,92,246,0.9)');
      grd.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });

    frame++;
    if (frame < 200) requestAnimationFrame(draw);
  }
  draw();
}

/* ── Slide 2: Keyword Cloud Float Animation ──────────────────── */
function startKeywordCloud(card) {
  // CSS handles the float animation via @keyframes defined in styles
  // Just trigger the animation class
  const chips = card.querySelectorAll('.kw-chip');
  chips.forEach((chip, i) => {
    chip.style.animationDelay = `${i * 0.12}s`;
    chip.classList.add('kw-animate');
  });
}

/* ── Slide 3: Typewriter Effect ──────────────────────────────── */
function startTypewriter(card) {
  const el = card.querySelector('#twText');
  if (!el) return;
  const text = '• Spearheaded cross-functional API integrations, reducing latency by 35% and improving uptime to 99.95% for 200k+ MAU.';
  let i = 0;
  el.textContent = '';

  function type() {
    if (animationAborted) return;
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(type, 28);
    }
  }
  setTimeout(type, 600);
}

/* ── Slide 4: LaTeX Code Cascade ─────────────────────────────── */
function startCodeCascade(card) {
  const lines = card.querySelectorAll('.lx-line');
  lines.forEach((line, i) => {
    line.style.animationDelay = `${i * 0.18}s`;
    line.classList.add('lx-animate');
  });
}

function closeOverlay(overlay) {
  overlay.classList.remove('visible');
  overlay.classList.add('hiding');
  setTimeout(() => overlay.remove(), 600);
}
