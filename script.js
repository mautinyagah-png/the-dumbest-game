/* ============================================================
   LEVELS
   ============================================================ */
const LEVELS = [
  { kind: 'start', prompt: 'Click the green button to begin.' },

  { kind: 'normal', prompt: 'If you see the letter D in the next countdown, press me.',
    correctAction: 'press', letter: 'D' },
  { kind: 'normal', prompt: 'If you see the letter D in the next countdown, press me.',
    correctAction: 'no-press', letter: 'O' },
  { kind: 'normal', prompt: 'If you see the letter D, press me. Look closely.',
    correctAction: 'press', letter: 'D' },
  { kind: 'normal', prompt: 'If you see the letter D, press me.',
    correctAction: 'no-press', letter: 'Q' },

  { kind: 'normal', prompt: 'If you see the letter D, press me. Watch the sequence.',
    correctAction: 'press', sequence: ['O', 'C', 'D', 'Q'] },
  { kind: 'normal', prompt: 'If you see the letter D, press me. One more.',
    correctAction: 'no-press', sequence: ['B', 'O', 'G', 'P'] },

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
let clickedThisLevel = false;
let interactionDuringDilemma = false;
let gameStartTime = null;
let totalClicks = 0;
let dilemmaFailCount = 0;
let trackedTimers = [];
let activeLetters = [];
let ringRaf = null;

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const RING_CIRCUMFERENCE = 691; // 2 * π * 110

/* ============================================================
   DOM
   ============================================================ */
const gameEl          = document.getElementById('game');
const instructionEl   = document.getElementById('instruction');
const btnEl           = document.getElementById('greenBtn');
const stageEl         = document.getElementById('stage');
const letterLayerEl   = document.getElementById('letterLayer');
const ringFillEl      = document.querySelector('.ring-fill');
const countdownEl     = document.getElementById('countdown');
const feedbackEl      = document.getElementById('feedback');
const attemptLabelEl  = document.getElementById('attemptLabel');
const timeLabelEl     = document.getElementById('timeLabel');
const progressFillEl  = document.getElementById('progressFill');
const themeToggleEl   = document.getElementById('themeToggle');
const soundToggleEl   = document.getElementById('soundToggle');
const statusLedEl     = document.getElementById('statusLed');

/* ============================================================
   SOUND ENGINE
   ============================================================ */
let audioCtx = null;
let soundEnabled = localStorage.getItem('dumbgame_sound') !== 'off';

function initAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

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
  // Sharper, louder, angrier
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

function updateSoundIcon() {
  soundToggleEl.textContent = soundEnabled ? '🔊' : '🔇';
}

soundToggleEl.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('dumbgame_sound', soundEnabled ? 'on' : 'off');
  updateSoundIcon();
  if (soundEnabled) sfxClick();
});

document.addEventListener('pointerdown', () => { initAudio(); }, { once: true });
updateSoundIcon();

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
  const count = 8;
  for (let i = 0; i < count; i++) {
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
   BOUNCING LETTERS
   ============================================================ */
function spawnBouncingLetter(letter, duration = 1600) {
  const stageRect = stageEl.getBoundingClientRect();
  const stageW = stageRect.width;
  const stageH = stageRect.height;

  const fontSize = Math.min(56, Math.max(36, stageW * 0.22));
  const letterR = fontSize * 0.4;

  // Button as circular obstacle
  const btnRect = btnEl.getBoundingClientRect();
  const btnCX = (btnRect.left + btnRect.width / 2) - stageRect.left;
  const btnCY = (btnRect.top + btnRect.height / 2) - stageRect.top;
  const btnR = btnRect.width / 2;

  // Spawn outside the button, inside the socket
  let x, y, tries = 0;
  do {
    x = letterR + 10 + Math.random() * (stageW - 2 * letterR - 20);
    y = letterR + 10 + Math.random() * (stageH - 2 * letterR - 20);
    tries++;
  } while (Math.hypot(x - btnCX, y - btnCY) < btnR + letterR + 4 && tries < 30);

  // Random direction, moderate speed
  const angle = Math.random() * Math.PI * 2;
  const speed = 180 + Math.random() * 100;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;

  const el = document.createElement('div');
  el.className = 'bouncing-letter';
  el.textContent = letter;
  el.style.fontSize = fontSize + 'px';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  letterLayerEl.appendChild(el);

  const start = performance.now();
  let rafId;
  let last = start;

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

    // Wall bounce
    if (x < letterR + 4) { x = letterR + 4; vx = Math.abs(vx); }
    if (x > stageW - letterR - 4) { x = stageW - letterR - 4; vx = -Math.abs(vx); }
    if (y < letterR + 4) { y = letterR + 4; vy = Math.abs(vy); }
    if (y > stageH - letterR - 4) { y = stageH - letterR - 4; vy = -Math.abs(vy); }

    // Button collision
    const dx = x - btnCX;
    const dy = y - btnCY;
    const dist = Math.hypot(dx, dy);
    const minDist = btnR + letterR;
    if (dist < minDist && dist > 0) {
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

    // Fade out near the end
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

function resetRing() {
  if (ringRaf) { cancelAnimationFrame(ringRaf); ringRaf = null; }
  if (!ringFillEl) return;
  ringFillEl.style.transition = 'none';
  ringFillEl.style.strokeDashoffset = RING_CIRCUMFERENCE;
  ringFillEl.style.opacity = '0';
  // force reflow to apply transition reset
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
  countdownEl.textContent = '';
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
  clickedThisLevel = false;
  interactionDuringDilemma = false;
  levelIndex = index;
  phase = 'loading';
  setFeedback('');
  btnEl.classList.remove('dim', 'shake', 'denied', 'pressed', 'pulse');
  btnEl.textContent = 'PRESS';
  setLed('');

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

      let remaining = Math.ceil(level.duration / 1000);
      countdownEl.textContent = remaining;

      trackInterval(() => {
        remaining--;
        if (remaining > 0) {
          countdownEl.textContent = remaining;
          sfxTick();
        } else {
          countdownEl.textContent = '';
        }
      }, 1000);

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
    runCountdown();
    return;
  }

  if (phase === 'dilemma-grace' || phase === 'dilemma-active') {
    handleDilemmaInteraction();
    return;
  }

  if (phase === 'countdown') {
    clickedThisLevel = true;
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
   FAST COUNTDOWN + JUDGEMENT
   ============================================================ */
function runCountdown() {
  const level = LEVELS[levelIndex];
  phase = 'countdown';

  // ---- Countdown numbers 3-2-1 (500ms each = 1.5s) ----
  let n = 3;
  countdownEl.textContent = n;
  sfxTick();
  const iv = trackInterval(() => {
    n--;
    if (n > 0) {
      countdownEl.textContent = n;
      sfxTick();
    } else {
      countdownEl.textContent = '';
      clearInterval(iv);
    }
  }, 500);

  // ---- Spawn bouncing letters ----
  const lettersStart = 800;
  if (level.letter) {
    trackTimeout(() => {
      spawnBouncingLetter(level.letter, 1800);
      sfxLetter();
    }, lettersStart);
  }

  if (level.sequence) {
    level.sequence.forEach((ch, i) => {
      trackTimeout(() => {
        spawnBouncingLetter(ch, 1500);
        sfxLetter();
      }, lettersStart + i * 400);
    });
  }

  // ---- Countdown ring drains during the reaction window ----
  const ringStart = 1500;
  const ringDuration = level.sequence
    ? (lettersStart + level.sequence.length * 400 + 800 - ringStart)
    : 1400;

  trackTimeout(() => startCountdownRing(ringDuration), ringStart);

  // ---- Judge fires when ring empties (fast!) ----
  trackTimeout(() => {
    if (phase !== 'countdown') return;
    judge();
  }, ringStart + ringDuration);
}

function judge() {
  const level = LEVELS[levelIndex];
  if (!level || level.kind !== 'normal') return;
  phase = 'judging';

  const shouldPress = level.correctAction === 'press';
  if (clickedThisLevel === shouldPress) {
    passLevel();
  } else {
    failLevel(shouldPress
      ? 'You were supposed to press.'
      : 'You were not supposed to press.');
  }
}

function passLevel() {
  phase = 'pass';
  clearAllTimers();
  setFeedback('✓');
  sfxSuccess();
  updateProgress(levelIndex);
  trackTimeout(() => startLevel(levelIndex + 1), 550);
}

function failLevel(message) {
  phase = 'fail';
  clearAllTimers();
  attempt++;
  updateAttempt();
  setFeedback(message);
  sfxFail();
  triggerDenial();

  // Fast restart — 900ms is enough to feel the red hit
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
