/* ============================================================
   LEVELS
   ============================================================ */
const LEVELS = [
  { kind: 'start', prompt: 'Click the green button to begin.' },

  {
    kind: 'normal',
    prompt: 'If you see the letter D in the next countdown, press me.',
    correctAction: 'press',
    letter: 'D',
    letterAt: 1500,
    letterDuration: 2000
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D in the next countdown, press me.',
    correctAction: 'no-press',
    letter: 'O',
    letterAt: 1500,
    letterDuration: 2000
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me. Look closely.',
    correctAction: 'press',
    letter: 'D',
    letterAt: 1500,
    letterDuration: 1500
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me.',
    correctAction: 'no-press',
    letter: 'Q',
    letterAt: 1500,
    letterDuration: 2000
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me. Watch the sequence.',
    correctAction: 'press',
    sequence: ['O', 'C', 'D', 'Q'],
    sequenceStart: 800,
    sequenceStep: 800,
    sequenceDuration: 600
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me. One more.',
    correctAction: 'no-press',
    sequence: ['B', 'O', 'G', 'P'],
    sequenceStart: 800,
    sequenceStep: 800,
    sequenceDuration: 600
  },

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

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

/* ============================================================
   DOM
   ============================================================ */
const gameEl          = document.getElementById('game');
const instructionEl   = document.getElementById('instruction');
const btnEl           = document.getElementById('greenBtn');
const letterEl        = document.getElementById('letter');
const countdownEl     = document.getElementById('countdown');
const feedbackEl      = document.getElementById('feedback');
const stageEl         = document.getElementById('stage');
const attemptLabelEl  = document.getElementById('attemptLabel');
const timeLabelEl     = document.getElementById('timeLabel');
const progressFillEl  = document.getElementById('progressFill');
const themeToggleEl   = document.getElementById('themeToggle');
const soundToggleEl   = document.getElementById('soundToggle');
const statusLedEl     = document.getElementById('statusLed');

/* ============================================================
   SOUND ENGINE (Web Audio API — no files)
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
  setTimeout(() => beep(659, 0.1, 'sine', 0.1), 90);
  setTimeout(() => beep(784, 0.16, 'sine', 0.1), 180);
}
function sfxFail() {
  beep(220, 0.18, 'sawtooth', 0.1);
  setTimeout(() => beep(150, 0.28, 'sawtooth', 0.1), 140);
}
function sfxDilemmaFail() {
  beep(200, 0.14, 'sawtooth', 0.09);
  setTimeout(() => beep(160, 0.14, 'sawtooth', 0.09), 100);
  setTimeout(() => beep(120, 0.24, 'sawtooth', 0.09), 200);
}
function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => beep(f, 0.22, 'sine', 0.1), i * 130)
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
   DENIAL (called on wrong answer / dilemma touch)
   ============================================================ */
function triggerDenial() {
  gameEl.classList.add('denied');
  btnEl.classList.add('denied');
  setLed('danger');
  spawnDangerMarks();

  setTimeout(() => {
    gameEl.classList.remove('denied');
    btnEl.classList.remove('denied');
    setLed('');
  }, 800);
}

function spawnDangerMarks() {
  for (let i = 0; i < 6; i++) {
    const mark = document.createElement('div');
    mark.textContent = '!';
    mark.className = 'danger-mark';
    mark.style.left = (10 + Math.random() * 80) + '%';
    mark.style.top = (10 + Math.random() * 80) + '%';
    mark.style.fontSize = (28 + Math.random() * 36) + 'px';
    mark.style.animationDelay = (i * 55) + 'ms';
    stageEl.appendChild(mark);
    setTimeout(() => mark.remove(), 1500);
  }
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
  letterEl.classList.remove('show');
  letterEl.textContent = '';
  // remove any stray danger marks
  stageEl.querySelectorAll('.danger-mark').forEach(m => m.remove());
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
  clickedThisLevel = false;
  interactionDuringDilemma = false;
  levelIndex = index;
  phase = 'loading';
  setFeedback('');
  btnEl.classList.remove('dim', 'shake', 'denied', 'pressed');
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
    btnEl.classList.remove('pulse');
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
    btnEl.classList.remove('pulse');
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

  // brief pressed-in feel on every click
  btnEl.classList.add('pressed');
  setTimeout(() => btnEl.classList.remove('pressed'), 90);

  if (phase === 'waiting-start') {
    ensureClock();
    btnEl.classList.remove('pulse');
    const level = LEVELS[levelIndex];
    if (level.kind === 'start') { startLevel(levelIndex + 1); return; }
    phase = 'countdown-start';
    runCountdown();
    return;
  }

  if (phase === 'dilemma-grace' || phase === 'dilemma-active') {
    handleDilemmaInteraction();
    return;
  }

  if (phase === 'countdown' || phase === 'response') {
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
  }, 1800);
}

/* ============================================================
   COUNTDOWN + JUDGEMENT
   ============================================================ */
function runCountdown() {
  const level = LEVELS[levelIndex];
  phase = 'countdown';

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
  }, 900);

  if (level.letter) {
    trackTimeout(() => {
      letterEl.textContent = level.letter;
      letterEl.classList.add('show');
      sfxLetter();
      trackTimeout(
        () => letterEl.classList.remove('show'),
        level.letterDuration || 2000
      );
    }, level.letterAt || 1500);
  }

  if (level.sequence) {
    level.sequence.forEach((ch, i) => {
      trackTimeout(() => {
        letterEl.textContent = ch;
        letterEl.classList.add('show');
        sfxLetter();
        trackTimeout(
          () => letterEl.classList.remove('show'),
          level.sequenceDuration || 600
        );
      }, (level.sequenceStart || 800) + i * (level.sequenceStep || 800));
    });
  }

  trackTimeout(() => {
    phase = 'response';
    trackTimeout(judge, 3000);
  }, 2700);
}

function judge() {
  if (phase !== 'response') return;
  phase = 'judging';
  const level = LEVELS[levelIndex];
  const shouldPress = level.correctAction === 'press';
  if (clickedThisLevel === shouldPress) passLevel();
  else failLevel(shouldPress ? 'You were supposed to press.' : 'You were not supposed to press.');
}

function passLevel() {
  phase = 'pass';
  clearAllTimers();
  setFeedback('✓');
  sfxSuccess();
  updateProgress(levelIndex);
  trackTimeout(() => startLevel(levelIndex + 1), 900);
}

function failLevel(message) {
  phase = 'fail';
  clearAllTimers();
  attempt++;
  updateAttempt();
  setFeedback(message);
  sfxFail();
  triggerDenial();
  trackTimeout(() => startLevel(levelIndex), 1500);
}

/* ============================================================
   BOOT
   ============================================================ */
updateAttempt();
startLevel(0);
