/* ============================================================
   LEVELS
   ============================================================ */
const LEVELS = [
  { kind: 'start', prompt: 'Click the green button to begin.' },

  /* Chapter 1: single letters */
  { kind: 'normal', prompt: 'If you see the letter D, press me.',
    requiredPresses: 1, show: 'D' },
  { kind: 'normal', prompt: 'If you see the letter D, press me.',
    requiredPresses: 0, show: 'O' },
  { kind: 'normal', prompt: 'If you see the letter D, press me.',
    requiredPresses: 1, show: 'D' },
  { kind: 'normal', prompt: 'If you see the letter D, press me.',
    requiredPresses: 0, show: 'Q' },

  /* Chapter 2: sequences */
  { kind: 'normal', prompt: 'If the sequence contains D, press me once.',
    requiredPresses: 1, sequence: ['O', 'C', 'D', 'Q'] },
  { kind: 'normal', prompt: 'If the sequence contains D, press me once.',
    requiredPresses: 0, sequence: ['B', 'O', 'G', 'P'] },

  /* Chapter 3: emoji */
  { kind: 'normal', prompt: 'If you see a rat 🐀, don\'t press.',
    requiredPresses: 0, show: '🐀' },
  { kind: 'normal', prompt: 'If you see a rat 🐀, press me once. Otherwise don\'t.',
    requiredPresses: 1, show: '🐈' },
  { kind: 'normal', prompt: 'If you see a rat 🐀, press me TWICE.',
    requiredPresses: 2, show: '🐀' },
  { kind: 'normal', prompt: 'If you see a rat 🐀, press me TWICE. Otherwise press me ONCE.',
    requiredPresses: 1, show: '🐈' },
  { kind: 'normal', prompt: 'If you see a rat 🐀, press me TWICE. Otherwise press me ONCE.',
    requiredPresses: 2, show: '🐀' },

  /* Chapter 4: mixed */
  { kind: 'normal', prompt: 'If you see 🍎, press me ONCE. Otherwise don\'t press.',
    requiredPresses: 1, show: '🍎' },
  { kind: 'normal', prompt: 'If you see 🍎, press me ONCE. Otherwise don\'t press.',
    requiredPresses: 0, show: '🍌' },
  { kind: 'normal', prompt: 'If you see a rat 🐀, don\'t press. If you see anything else, press me TWICE.',
    requiredPresses: 2, show: '🐈' },
  { kind: 'normal', prompt: 'If you see a rat 🐀, don\'t press. If you see anything else, press me TWICE.',
    requiredPresses: 0, show: '🐀' },

  /* Chapter 5: emoji sequences */
  { kind: 'normal', prompt: 'If the sequence contains a rat 🐀, don\'t press.',
    requiredPresses: 0, sequence: ['🍎', '🐈', '🐀', '🍌'] },
  { kind: 'normal', prompt: 'If the sequence contains a rat 🐀, don\'t press. Otherwise press me ONCE.',
    requiredPresses: 1, sequence: ['🍎', '🐈', '🍌', '🍎'] },

  /* Dilemma */
  {
    kind: 'dilemma',
    prompt: 'Press me if the letter is D. Do not press if it is not. One of these is always wrong.',
    duration: 5000,
    hints: [
      "You touched it. You were not supposed to touch it.",
      "You touched it again. The button would like some space.",
      "The button has asked you, politely, to stop touching it.",
      "Just don't hover. That's it. That's the whole thing.",
      "Seriously. Hands off. Don't even look at it.",
      "The button is asking you to reconsider your life choices. Just don't hover."
    ]
  },

  { kind: 'win', prompt: 'Okay. You figured it out. That was the whole game.' }
];

/* ============================================================
   STATE
   ============================================================ */
let levelIndex = 0;
let attempt = 1;
let phase = 'idle';
let clickCountThisLevel = 0;
let clicksActive = false;
let interactionDuringDilemma = false;
let gameStartTime = null;
let totalClicks = 0;
let dilemmaFailCount = 0;
let trackedTimers = [];
let activeLetters = [];
let ringRaf = null;

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const RING_CIRCUMFERENCE = 691;
const REACTION_WINDOW_MS = 8000;

/* ============================================================
   DOM
   ============================================================ */
const gameEl          = document.getElementById('game');
const instructionEl   = document.getElementById('instruction');
const btnEl           = document.getElementById('greenBtn');
const stageEl         = document.getElementById('stage');
const panelContentEl  = document.querySelector('.panel-content');
const letterLayerEl   = document.getElementById('letterLayer');
const clickDotsEl     = document.getElementById('clickDots');
const ringFillEl      = document.querySelector('.ring-fill');
const feedbackEl      = document.getElementById('feedback');
const attemptLabelEl  = document.getElementById('attemptLabel');
const timeLabelEl     = document.getElementById('timeLabel');
const progressFillEl  = document.getElementById('progressFill');
const themeToggleEl   = document.getElementById('themeToggle');
const soundToggleEl   = document.getElementById('soundToggle');
const musicToggleEl   = document.getElementById('musicToggle');
const statusLedEl     = document.getElementById('statusLed');

/* ============================================================
   AUDIO CONTEXT + MUSIC BUS
   ============================================================ */
let audioCtx = null;
let musicGain = null;
let soundEnabled = localStorage.getItem('dumbgame_sound') !== 'off';
let musicEnabled = localStorage.getItem('dumbgame_music') !== 'off';

function initAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!musicGain) {
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

/* ============================================================
   SFX
   ============================================================ */
function beep(freq, duration, type = 'sine', volume = 0.12) {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function sfxClick()      { beep(600, 0.06, 'triangle', 0.1); }
function sfxLetter()     { beep(880, 0.18, 'sine', 0.12); }
function sfxTick()       { beep(400, 0.07, 'square', 0.05); }
function sfxSuccess() {
  beep(523, 0.1, 'sine', 0.1);
  setTimeout(() => beep(659, 0.1, 'sine', 0.1), 80);
  setTimeout(() => beep(784, 0.16, 'sine', 0.1), 160);
}
function sfxFail() {
  beep(280, 0.12, 'sawtooth', 0.14);
  setTimeout(() => beep(180, 0.18, 'sawtooth', 0.13), 80);
  setTimeout(() => beep(120, 0.32, 'square', 0.12), 160);
}
function sfxDilemmaFail() {
  beep(260, 0.12, 'sawtooth', 0.12);
  setTimeout(() => beep(200, 0.12, 'sawtooth', 0.12), 90);
  setTimeout(() => beep(140, 0.18, 'sawtooth', 0.12), 180);
  setTimeout(() => beep(100, 0.3, 'square', 0.11), 270);
}
function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => beep(f, 0.22, 'sine', 0.1), i * 120)
  );
}

/* ============================================================
   MUSIC — synthesized kick/snare/hi-hat loop
   ============================================================ */
let musicScheduler = null;
let musicStartTime = 0;
let musicBarIndex = 0;

function playKick(ctx, time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.15);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.18, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(time);
  osc.stop(time + 0.35);
}

function playSnare(ctx, time) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1600;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  noise.start(time);
}

function playHat(ctx, time) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.045, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  noise.start(time);
}

function startMusic() {
  if (!musicEnabled || musicScheduler) return;
  const ctx = initAudio();
  if (!ctx) return;

  const bpm = 100;
  const beatDur = 60 / bpm;
  const barDur = beatDur * 4;
  musicStartTime = ctx.currentTime + 0.15;
  musicBarIndex = 0;

  let nextBarTime = musicStartTime;

  function scheduleBar(barStart) {
    // Kick on beats 1 and 3
    playKick(ctx, barStart);
    playKick(ctx, barStart + beatDur * 2);
    // Snare on beats 2 and 4
    playSnare(ctx, barStart + beatDur);
    playSnare(ctx, barStart + beatDur * 3);
    // Hats on every 8th
    for (let i = 0; i < 8; i++) {
      playHat(ctx, barStart + i * (beatDur / 2));
    }
    musicBarIndex++;
  }

  function tick() {
    if (!musicEnabled) return;
    if (document.hidden) {
      musicScheduler = setTimeout(tick, 500);
      return;
    }
    while (nextBarTime < ctx.currentTime + barDur) {
      scheduleBar(nextBarTime);
      nextBarTime += barDur;
    }
    musicScheduler = setTimeout(tick, 400);
  }
  tick();
}

function stopMusic() {
  if (musicScheduler) {
    clearTimeout(musicScheduler);
    musicScheduler = null;
  }
}

function updateSoundIcon() {
  soundToggleEl.textContent = soundEnabled ? '🔊' : '🔇';
}

function updateMusicIcon() {
  musicToggleEl.textContent = '🎵';
  musicToggleEl.style.opacity = musicEnabled ? '1' : '0.35';
  musicToggleEl.style.textDecoration = musicEnabled ? 'none' : 'line-through';
}

soundToggleEl.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('dumbgame_sound', soundEnabled ? 'on' : 'off');
  updateSoundIcon();
  if (soundEnabled) sfxClick();
});

musicToggleEl.addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  localStorage.setItem('dumbgame_music', musicEnabled ? 'on' : 'off');
  updateMusicIcon();
  if (musicEnabled) {
    initAudio();
    startMusic();
  } else {
    stopMusic();
  }
  sfxClick();
});

document.addEventListener('pointerdown', () => {
  initAudio();
  if (musicEnabled) startMusic();
}, { once: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopMusic();
  else if (musicEnabled) startMusic();
});

updateSoundIcon();
updateMusicIcon();

/* ============================================================
   THEME
   ============================================================ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleEl.textContent = theme === 'dark' ? '🌙' : '☀️';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f0f14' : '#fdf6e3');
}

let currentTheme = localStorage.getItem('dumbgame_theme');
if (!currentTheme) {
  currentTheme = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
applyTheme(currentTheme);

themeToggleEl.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('dumbgame_theme', currentTheme);
  applyTheme(currentTheme);
  sfxClick();
});

/* ============================================================
   LED
   ============================================================ */
function setLed(state) {
  if (!statusLedEl) return;
  statusLedEl.className = 'led' + (state ? ' ' + state : '');
}

/* ============================================================
   DENIAL
   ============================================================ */
function triggerDenial() {
  gameEl.classList.add('denied');
  btnEl.classList.add('denied');
  setLed('danger');
  spawnDangerMarks();
}

function clearDenial() {
  gameEl.classList.remove('denied');
  btnEl.classList.remove('denied');
  setLed('');
  stageEl.querySelectorAll('.danger-mark').forEach(m => m.remove());
}

function spawnDangerMarks() {
  for (let i = 0; i < 8; i++) {
    const mark = document.createElement('div');
    mark.textContent = '!';
    mark.className = 'danger-mark';
    mark.style.left = (5 + Math.random() * 85) + '%';
    mark.style.top = (5 + Math.random() * 85) + '%';
    mark.style.fontSize = (28 + Math.random() * 34) + 'px';
    mark.style.animationDelay = (i * 40) + 'ms';
    stageEl.appendChild(mark);
    setTimeout(() => mark.remove(), 1400);
  }
}

/* ============================================================
   CLICK DOTS
   ============================================================ */
function setupClickDots() {
  if (!clickDotsEl) return;
  clickDotsEl.innerHTML = '';
  const level = LEVELS[levelIndex];
  if (!level || level.kind !== 'normal') return;
  const required = level.requiredPresses || 0;
  if (required < 1) return;
  for (let i = 0; i < required; i++) {
    const dot = document.createElement('span');
    dot.className = 'click-dot';
    clickDotsEl.appendChild(dot);
  }
}

function updateClickDots() {
  if (!clickDotsEl) return;
  const dots = clickDotsEl.querySelectorAll('.click-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < clickCountThisLevel);
  });
}

/* ============================================================
   BOUNCING ITEMS
   ============================================================ */
function spawnBouncingLetter(value, duration = 2600) {
  const panelRect = panelContentEl.getBoundingClientRect();
  const panelW = panelRect.width;
  const panelH = panelRect.height;

  const isEmoji = !/^[A-Za-z0-9]$/.test(value);
  const fontSize = isEmoji
    ? Math.min(84, Math.max(52, panelW * 0.14))
    : Math.min(64, Math.max(42, panelW * 0.11));
  const radius = fontSize * (isEmoji ? 0.45 : 0.40);

  const btnRect = btnEl.getBoundingClientRect();
  const btnCX = (btnRect.left + btnRect.width / 2) - panelRect.left;
  const btnCY = (btnRect.top + btnRect.height / 2) - panelRect.top;
  const btnR = btnRect.width / 2;

  let x, y, tries = 0;
  do {
    x = radius + 6 + Math.random() * (panelW - 2 * radius - 12);
    y = radius + 6 + Math.random() * (panelH - 2 * radius - 12);
    tries++;
  } while (Math.hypot(x - btnCX, y - btnCY) < btnR + radius + 6 && tries < 40);

  const angle = Math.random() * Math.PI * 2;
  const speed = 220 + Math.random() * 90;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;

  const el = document.createElement('div');
  el.className = 'bouncing-letter';
  el.textContent = value;
  el.style.fontSize = fontSize + 'px';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  letterLayerEl.appendChild(el);

  const start = performance.now();
  let last = start;
  let rafId;

  function tick(now) {
    const elapsed = now - start;
    if (elapsed > duration) {
      el.remove();
      activeLetters = activeLetters.filter(l => l.el !== el);
      return;
    }

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    x += vx * dt;
    y += vy * dt;

    if (x < radius + 4) { x = radius + 4; vx = Math.abs(vx); }
    if (x > panelW - radius - 4) { x = panelW - radius - 4; vx = -Math.abs(vx); }
    if (y < radius + 4) { y = radius + 4; vy = Math.abs(vy); }
    if (y > panelH - radius - 4) { y = panelH - radius - 4; vy = -Math.abs(vy); }

    const dx = x - btnCX;
    const dy = y - btnCY;
    const dist = Math.hypot(dx, dy);
    const minDist = btnR + radius;
    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      x = btnCX + nx * minDist;
      y = btnCY + ny * minDist;
      const dot = vx * nx + vy * ny;
      vx -= 2 * dot * nx;
      vy -= 2 * dot * ny;
    }

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    const remaining = duration - elapsed;
    if (remaining < 300) {
      el.style.opacity = Math.max(0, remaining / 300).toFixed(2);
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  activeLetters.push({ el, cancel: () => cancelAnimationFrame(rafId) });
}

function clearBouncingLetters() {
  activeLetters.forEach(l => { l.cancel(); l.el.remove(); });
  activeLetters = [];
}

/* ============================================================
   COUNTDOWN RING
   ============================================================ */
function startCountdownRing(durationMs) {
  if (!ringFillEl) return;
  if (ringRaf) cancelAnimationFrame(ringRaf);

  ringFillEl.style.strokeDasharray = RING_CIRCUMFERENCE;
  ringFillEl.style.strokeDashoffset = 0;
  ringFillEl.style.opacity = '1';

  const start = performance.now();
  function update(now) {
    const p = Math.min((now - start) / durationMs, 1);
    ringFillEl.style.strokeDashoffset = RING_CIRCUMFERENCE * p;
    if (p < 1) {
      ringRaf = requestAnimationFrame(update);
    } else {
      ringFillEl.style.opacity = '0';
    }
  }
  ringRaf = requestAnimationFrame(update);
}

function stopCountdownRing() {
  if (ringRaf) { cancelAnimationFrame(ringRaf); ringRaf = null; }
  if (ringFillEl) ringFillEl.style.opacity = '0';
}

function resetRing() {
  if (ringRaf) { cancelAnimationFrame(ringRaf); ringRaf = null; }
  if (!ringFillEl) return;
  ringFillEl.style.transition = 'none';
  ringFillEl.style.strokeDashoffset = RING_CIRCUMFERENCE;
  ringFillEl.style.opacity = '0';
  void ringFillEl.getBoundingClientRect();
  ringFillEl.style.transition = '';
}

/* ============================================================
   TIMER HELPERS
   ============================================================ */
function trackTimeout(fn, ms) {
  const id = setTimeout(fn, ms);
  trackedTimers.push({ type: 't', id });
  return id;
}
function trackInterval(fn, ms) {
  const id = setInterval(fn, ms);
  trackedTimers.push({ type: 'i', id });
  return id;
}
function clearAllTimers() {
  trackedTimers.forEach(t => {
    if (t.type === 't') clearTimeout(t.id);
    else clearInterval(t.id);
  });
  trackedTimers = [];
}

/* ============================================================
   CLOCK
   ============================================================ */
setInterval(updateClock, 1000);
updateClock();

function updateClock() {
  if (gameStartTime === null) { timeLabelEl.textContent = '0:00'; return; }
  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  timeLabelEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
}
function ensureClock() {
  if (gameStartTime === null) gameStartTime = Date.now();
}

/* ============================================================
   UI HELPERS
   ============================================================ */
function setInstruction(text) {
  instructionEl.style.opacity = '0';
  setTimeout(() => {
    instructionEl.textContent = text;
    instructionEl.style.opacity = '1';
  }, 120);
}
function setFeedback(text) { feedbackEl.textContent = text; }
function updateAttempt() { attemptLabelEl.textContent = `attempt #${attempt}`; }
function setProgress(pct) { progressFillEl.style.width = pct + '%'; }
function clearStage() {
  clearBouncingLetters();
  stageEl.querySelectorAll('.danger-mark').forEach(m => m.remove());
  resetRing();
}
function updateProgress(passedCount) {
  if (passedCount <= 0) return;
  const playable = LEVELS.length - 2;
  const pct = Math.min((passedCount / playable) * 100, 100);
  setProgress(pct);
}

/* ============================================================
   LEVEL FLOW
   ============================================================ */
function startLevel(index) {
  clearAllTimers();
  clearStage();
  clearDenial();
  clickCountThisLevel = 0;
  clicksActive = false;
  interactionDuringDilemma = false;
  levelIndex = index;
  phase = 'loading';
  setFeedback('');
  btnEl.classList.remove('dim', 'shake', 'denied', 'pressed', 'pulse');
  btnEl.textContent = 'PRESS';
  setLed('');
  setupClickDots();

  const level = LEVELS[index];

  if (level.kind === 'start') {
    setInstruction(level.prompt);
    btnEl.textContent = 'START';
    btnEl.classList.add('pulse');
    phase = 'waiting-start';
    return;
  }

  if (level.kind === 'win') {
    btnEl.classList.add('dim');
    btnEl.textContent = '🟢';
    setInstruction(level.prompt);
    setProgress(100);
    sfxWin();

    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const startOvers = attempt - 1;

    setFeedback(
      `You clicked that button ${totalClicks} times. ` +
      `You started over ${startOvers} times. ` +
      `You spent ${m}m ${s}s on a green circle. ` +
      `The green button is proud of you. The green button is also laughing. ` +
      `Go drink some water. 🟢`
    );
    phase = 'done';
    return;
  }

  if (level.kind === 'normal') {
    setInstruction(level.prompt);
    btnEl.classList.add('pulse');
    phase = 'waiting-start';
    return;
  }

  if (level.kind === 'dilemma') {
    setInstruction(level.prompt);
    phase = 'dilemma-grace';

    trackTimeout(() => {
      if (phase !== 'dilemma-grace') return;

      if (!isTouchDevice && btnEl.matches(':hover')) {
        handleDilemmaInteraction();
        return;
      }

      phase = 'dilemma-active';

      startCountdownRing(level.duration);

      trackTimeout(() => {
        if (phase === 'dilemma-active' && !interactionDuringDilemma) {
          passLevel();
        }
      }, level.duration);
    }, 1500);
    return;
  }
}

/* ============================================================
   INPUT
   ============================================================ */
btnEl.addEventListener('click', onButtonClick);
btnEl.addEventListener('mouseenter', onButtonEnter);
btnEl.addEventListener('touchstart', () => {
  if (phase === 'dilemma-grace' || phase === 'dilemma-active') {
    handleDilemmaInteraction();
  }
}, { passive: true });

function onButtonClick() {
  totalClicks++;
  sfxClick();

  btnEl.classList.add('pressed');
  setTimeout(() => btnEl.classList.remove('pressed'), 90);

  if (phase === 'waiting-start') {
    ensureClock();
    btnEl.classList.remove('pulse');
    const level = LEVELS[levelIndex];
    if (level.kind === 'start') { startLevel(levelIndex + 1); return; }
    phase = 'countdown';
    runLevel();
    return;
  }

  if (phase === 'dilemma-grace' || phase === 'dilemma-active') {
    handleDilemmaInteraction();
    return;
  }

  if (phase === 'countdown' && clicksActive) {
    clickCountThisLevel++;
    updateClickDots();

    const required = LEVELS[levelIndex].requiredPresses || 0;

    // Instant verdict — exact hit = pass, overshoot = fail
    if (clickCountThisLevel >= required && required > 0) {
      judge();
    } else if (clickCountThisLevel > required) {
      judge();
    }
    return;
  }
}

function onButtonEnter() {
  if (phase === 'dilemma-grace' || phase === 'dilemma-active') {
    handleDilemmaInteraction();
  }
}

function handleDilemmaInteraction() {
  if (interactionDuringDilemma) return;
  interactionDuringDilemma = true;
  dilemmaFailCount++;

  clearAllTimers();
  phase = 'dilemma-failing';
  btnEl.classList.add('shake');
  setTimeout(() => btnEl.classList.remove('shake'), 400);
  sfxDilemmaFail();
  triggerDenial();

  const hints = LEVELS[levelIndex].hints;
  const hint = hints[Math.min(dilemmaFailCount - 1, hints.length - 1)];
  setFeedback(hint);

  trackTimeout(() => {
    attempt++;
    updateAttempt();
    startLevel(levelIndex);
  }, 1400);
}

/* ============================================================
   RUN LEVEL — 8-second ring, no visible numbers
   ============================================================ */
function runLevel() {
  const level = LEVELS[levelIndex];
  phase = 'countdown';
  clickCountThisLevel = 0;
  clicksActive = false;

  const itemsStart = 700;

  function startWindow() {
    clicksActive = true;
    startCountdownRing(REACTION_WINDOW_MS);
    trackTimeout(() => {
      if (phase === 'countdown') judge();
    }, REACTION_WINDOW_MS);
  }

  if (level.show) {
    trackTimeout(() => {
      startWindow();
      spawnBouncingLetter(level.show, 3200);
      sfxLetter();
    }, itemsStart);
  }

  if (level.sequence) {
    const step = 600;
    const dur = 1600;
    level.sequence.forEach((value, i) => {
      trackTimeout(() => {
        if (i === 0) startWindow();
        spawnBouncingLetter(value, dur);
        sfxLetter();
      }, itemsStart + i * step);
    });
  }
}

function judge() {
  if (phase !== 'countdown') return;
  const level = LEVELS[levelIndex];
  if (!level || level.kind !== 'normal') return;

  phase = 'judging';
  stopCountdownRing();

  const required = level.requiredPresses || 0;
  if (clickCountThisLevel === required) {
    passLevel();
  } else {
    const msg = required === 0
      ? 'You pressed. You were not supposed to press.'
      : (clickCountThisLevel < required
        ? `You pressed ${clickCountThisLevel} time${clickCountThisLevel === 1 ? '' : 's'}. You needed ${required}.`
        : `You pressed too many times. You needed ${required}.`);
    failLevel(msg);
  }
}

function passLevel() {
  phase = 'pass';
  clearAllTimers();
  stopCountdownRing();
  setFeedback('✓');
  sfxSuccess();
  updateProgress(levelIndex);
  trackTimeout(() => startLevel(levelIndex + 1), 550);
}

function failLevel(message) {
  phase = 'fail';
  clearAllTimers();
  stopCountdownRing();
  attempt++;
  updateAttempt();
  setFeedback(message);
  sfxFail();
  triggerDenial();

  trackTimeout(() => {
    clearDenial();
    startLevel(levelIndex);
  }, 900);
}

/* ============================================================
   BOOT
   ============================================================ */
updateAttempt();
startLevel(0);
