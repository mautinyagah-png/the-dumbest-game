/* ============================================================
   ANIMATED BACKGROUND — 3 scenes that cycle with crossfades
   Scenes: Matrix code rain → Starfield warp → Aurora waves
   Theme-aware, respects prefers-reduced-motion, pauses on tab blur
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  /* ---------- THEME COLORS ---------- */
  function getColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return isDark
      ? {
          bg: '#0f0f14',
          bgRgb: '15, 15, 20',
          accent: '#3cff7a',
          accentRgb: '60, 255, 122',
        }
      : {
          bg: '#fdf6e3',
          bgRgb: '253, 246, 227',
          accent: '#16a34a',
          accentRgb: '22, 163, 74',
        };
  }

  /* ---------- REDUCED MOTION → static fill only ---------- */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    const fill = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = getColors().bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    fill();
    window.addEventListener('resize', fill);
    new MutationObserver(fill).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return;
  }

  /* ---------- SIZE (DPR aware) ---------- */
  let W = 0;
  let H = 0;
  let scenes = [];
  let currentScene = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of scenes) s.onResize && s.onResize();
  }
  window.addEventListener('resize', resize);

  /* ============================================================
     SCENE 1: MATRIX CODE RAIN
     ============================================================ */
  function createMatrixRain() {
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>{}[]()=+-*';
    const fontSize = 18;
    let cols = 0;
    let drops = [];

    function onResize() {
      cols = Math.floor(W / fontSize) + 1;
      while (drops.length < cols) {
        drops.push({
          y: Math.random() * H,
          speed: 40 + Math.random() * 100,
        });
      }
      while (drops.length > cols) drops.pop();
    }

    return {
      onResize,
      update(dt) {
        const sec = dt / 1000;
        for (const d of drops) {
          d.y += d.speed * sec;
          if (d.y > H + fontSize * 2) {
            d.y = -Math.random() * 300;
            d.speed = 40 + Math.random() * 100;
          }
        }
      },
      draw() {
        const c = getColors();
        // fade previous frame → builds the trail
        const fadeAlpha = 1 - Math.pow(0.92, dt / 16.67);
        ctx.fillStyle = `rgba(${c.bgRgb}, ${fadeAlpha})`;
        ctx.fillRect(0, 0, W, H);
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 6;
        ctx.shadowColor = c.accent;
        ctx.fillStyle = c.accent;
        for (let i = 0; i < drops.length; i++) {
          const x = i * fontSize;
          const ch = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(ch, x, drops[i].y);
        }
        ctx.shadowBlur = 0;
      },
    };
    // note: `dt` is captured via closure trick below
  }

  /* ============================================================
     SCENE 2: STARFIELD WARP (tunnel of stars)
     ============================================================ */
  function createStarfield() {
    let stars = [];

    function spawn() {
      const z = Math.random() * 1000 + 1;
      return {
        x: Math.random() * W - W / 2,
        y: Math.random() * H - H / 2,
        z: z,
        pz: z,
      };
    }

    function onResize() {
      const count = Math.min(240, Math.max(80, Math.floor((W * H) / 6000)));
      stars = [];
      for (let i = 0; i < count; i++) stars.push(spawn());
    }

    return {
      onResize,
      update(dt) {
        const speed = 320 * (dt / 1000);
        for (const s of stars) {
          s.pz = s.z;
          s.z -= speed;
          if (s.z < 1) Object.assign(s, spawn());
        }
      },
      draw() {
        const c = getColors();
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = c.accent;
        ctx.lineCap = 'round';
        for (const s of stars) {
          const sx = (s.x / s.z) * 400 + W / 2;
          const sy = (s.y / s.z) * 400 + H / 2;
          const px = (s.x / s.pz) * 400 + W / 2;
          const py = (s.y / s.pz) * 400 + H / 2;
          const fade = Math.min(1, (1000 - s.z) / 1000);
          ctx.strokeStyle = `rgba(${c.accentRgb}, ${fade})`;
          ctx.lineWidth = Math.max(0.5, fade * 3);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
      },
    };
  }

  /* ============================================================
     SCENE 3: AURORA WAVES (layered sine waves with gradient fill)
     ============================================================ */
  function createAurora() {
    let waves = [];
    let t = 0;

    function onResize() {
      waves = [];
      for (let i = 0; i < 5; i++) {
        waves.push({
          amp: H * (0.06 + Math.random() * 0.08),
          freq: 0.003 + Math.random() * 0.003,
          speed: 0.3 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          baseY: H * (0.3 + Math.random() * 0.4),
          alpha: 0.14 + Math.random() * 0.18,
        });
      }
    }

    return {
      onResize,
      update(dt) {
        t += dt * 0.001;
      },
      draw() {
        const c = getColors();
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, W, H);
        for (const w of waves) {
          ctx.beginPath();
          ctx.moveTo(0, w.baseY);
          for (let x = 0; x <= W; x += 10) {
            const y = w.baseY + Math.sin(x * w.freq + t * w.speed + w.phase) * w.amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H);
          ctx.lineTo(0, H);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, w.baseY - w.amp, 0, H);
          grad.addColorStop(0, `rgba(${c.accentRgb}, ${w.alpha})`);
          grad.addColorStop(1, `rgba(${c.accentRgb}, 0)`);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      },
    };
  }

  /* ============================================================
     SCENE MANAGER
     ============================================================ */
  scenes = [createMatrixRain(), createStarfield(), createAurora()];
  currentScene = scenes[0];
  resize();

  // dt needs to be visible to matrix rain's draw() for the fade math
  let dt = 16.67;

  let currentSceneIndex = 0;
  let sceneStartTime = performance.now();
  let transitionState = 'idle'; // idle | out | in
  let transitionStart = 0;
  const SCENE_DURATION = 18000;
  const TRANSITION_DURATION = 800;

  let lastTime = performance.now();
  let paused = false;

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) lastTime = performance.now();
  });

  // Respond to theme changes instantly
  new MutationObserver(() => {
    // Scenes read colors fresh each draw, so just nudge a redraw happens naturally
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function loop(now) {
    requestAnimationFrame(loop);
    if (paused) return;

    dt = Math.min(now - lastTime, 50);
    lastTime = now;

    // Handle transitions
    if (transitionState === 'out') {
      const p = (now - transitionStart) / TRANSITION_DURATION;
      if (p >= 1) {
        currentSceneIndex = (currentSceneIndex + 1) % scenes.length;
        currentScene = scenes[currentSceneIndex];
        // fresh canvas for the new scene
        const c = getColors();
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, W, H);
        transitionState = 'in';
        transitionStart = now;
        sceneStartTime = now;
      }
    } else if (transitionState === 'in') {
      const p = (now - transitionStart) / TRANSITION_DURATION;
      if (p >= 1) transitionState = 'idle';
    } else if (now - sceneStartTime > SCENE_DURATION) {
      transitionState = 'out';
      transitionStart = now;
    }

    // Update + draw active scene
    currentScene.update(dt);
    currentScene.draw();

    // Transition overlay (solid bg fade)
    if (transitionState !== 'idle') {
      const p = (now - transitionStart) / TRANSITION_DURATION;
      const alpha = transitionState === 'out' ? p : 1 - p;
      const c = getColors();
      ctx.fillStyle = `rgba(${c.bgRgb}, ${Math.max(0, Math.min(1, alpha))})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  requestAnimationFrame(loop);
})();
