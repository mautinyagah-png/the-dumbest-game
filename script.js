/* ============================================================
   LEVELS
   ------------------------------------------------------------
   The whole game lives in this array. To add a level, append
   a new object. Kinds: 'start', 'normal', 'dilemma', 'win'.

   'normal' objects:
     prompt         → shown to player
     correctAction  → 'press' or 'no-press'
     letter/letterAt/letterDuration  → one letter flash (optional)
     sequence/sequenceStart/sequenceStep → letter sequence (optional)

   'dilemma' objects:
     prompt         → shown to player
     duration       → ms the timer runs
     hints[]        → escalating hint shown on each failed attempt
   ============================================================ */
const LEVELS = [
  { kind: 'start', prompt: 'Click the green button to begin.' },

  {
    kind: 'normal',
    prompt: 'If you see the letter D in the next countdown, press me.',
    correctAction: 'press',
    letter: 'D',
    letterAt: 1500,
    letterDuration: 1200
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D in the next countdown, press me.',
    correctAction: 'no-press',
    letter: 'O',
    letterAt: 1500,
    letterDuration: 1200
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me. Look closely.',
    correctAction: 'press',
    letter: 'D',
    letterAt: 1500,
    letterDuration: 700
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me.',
    correctAction: 'no-press',
    letter: 'Q',
    letterAt: 1500,
    letterDuration: 1200
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me. Watch the sequence.',
    correctAction: 'press',
    sequence: ['O', 'C', 'D', 'Q'],
    sequenceStart: 1000,
    sequenceStep: 500
  },
  {
    kind: 'normal',
    prompt: 'If you see the letter D, press me. One more.',
    correctAction: 'no-press',
    sequence: ['B', 'O', 'G', 'P'],
    sequenceStart: 1000,
    sequenceStep: 500
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

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const instructionEl   = document.getElementById('instruction');
const btnEl           = document.getElementById('greenBtn');
const letterEl        = document.getElementById('letter');
const countdownEl     = document.getElementById('countdown');
const feedbackEl      = document.getElementById('feedback');
const attemptLabelEl  = document.getElementById('attemptLabel');
const timeLabelEl     = document.getElementById('timeLabel');
const progressFillEl  = document.getElementById('progressFill');

/* ============================================================
   TIMER HELPERS
   (we track every timeout/interval so we can nuke them all
    when the level changes — this avoids ghost callbacks)
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
  if (gameStartTime === null) {
    timeLabelEl.textContent = '0:00';
    return;
  }
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

function setFeedback(text) {
  feedbackEl.textContent = text;
}

function updateAttempt() {
  attemptLabelEl.textContent = `attempt #${attempt}`;
}

function setProgress(pct) {
  progressFillEl.style.width = pct + '%';
}

function clearStage() {
  countdownEl.textContent = '';
  letterEl.classList.remove('show');
  letterEl.textContent = '';
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
  btnEl.classList.remove('dim', 'shake');
  btnEl.textContent = 'PRESS';

  const level = LEVELS[index];

  /* --- START SCREEN --- */
  if (level.kind === 'start') {
    setInstruction(level.prompt);
    btnEl.textContent = 'START';
    phase = 'waiting-start';
    return;
  }

  /* --- WIN SCREEN --- */
  if (level.kind === 'win') {
    btnEl.classList.add('dim');
    btnEl.textContent = '🟢';
    setInstruction(level.prompt);
    setProgress(100);

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

  /* --- NORMAL LEVEL --- */
  if (level.kind === 'normal') {
    setInstruction(level.prompt);
    phase = 'waiting-start';
    return;
  }

  /* --- DILEMMA LEVEL --- */
  if (level.kind === 'dilemma') {
    setInstruction(level.prompt);
    phase = 'dilemma-grace';

    trackTimeout(() => {
      if (phase !== 'dilemma-grace') return;

      // If cursor is already on the button when grace ends, they lose.
      if (btnEl.matches(':hover')) {
        handleDilemmaInteraction();
        return;
      }

      phase = 'dilemma-active';

      let remaining = Math.ceil(level.duration / 1000);
      countdownEl.textContent = remaining;

      trackInterval(() => {
        remaining--;
        countdownEl.textContent = remaining > 0 ? remaining : '';
      }, 1000);

      trackTimeout(() => {
        if (phase === 'dilemma-active' && !interactionDuringDilemma) {
          passLevel();
        }
      }, level.duration);
    }, 1200);

    return;
  }
}

/* ============================================================
   INPUT
   ============================================================ */
btnEl.addEventListener('click', onButtonClick);
btnEl.addEventListener('mouseenter', onButtonEnter);

function onButtonClick() {
  totalClicks++;

  /* start screen / normal-level intro click */
  if (phase === 'waiting-start') {
    ensureClock();
    const level = LEVELS[levelIndex];
    if (level.kind === 'start') {
      startLevel(levelIndex + 1);
      return;
    }
    phase = 'countdown-start';
    runCountdown();
    return;
  }

  /* touching the button during a dilemma = you lose */
  if (phase === 'dilemma-grace' || phase === 'dilemma-active') {
    handleDilemmaInteraction();
    return;
  }

  /* register the click during the countdown/response window */
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

  const hints = LEVELS[levelIndex].hints;
  const hint = hints[Math.min(dilemmaFailCount - 1, hints.length - 1)];
  setFeedback(hint);

  trackTimeout(() => {
    attempt++;
    updateAttempt();
    startLevel(levelIndex);
  }, 1600);
}

/* ============================================================
   COUNTDOWN + JUDGEMENT
   ============================================================ */
function runCountdown() {
  const level = LEVELS[levelIndex];
  phase = 'countdown';

  let n = 3;
  countdownEl.textContent = n;

  const iv = trackInterval(() => {
    n--;
    if (n > 0) {
      countdownEl.textContent = n;
    } else {
      countdownEl.textContent = '';
      clearInterval(iv);
    }
  }, 700);

  /* single-letter flash */
  if (level.letter) {
    trackTimeout(() => {
      letterEl.textContent = level.letter;
      letterEl.classList.add('show');
      trackTimeout(
        () => letterEl.classList.remove('show'),
        level.letterDuration || 1200
      );
    }, level.letterAt || 1500);
  }

  /* letter sequence */
  if (level.sequence) {
    level.sequence.forEach((ch, i) => {
      trackTimeout(() => {
        letterEl.textContent = ch;
        letterEl.classList.add('show');
        trackTimeout(() => letterEl.classList.remove('show'), 350);
      }, (level.sequenceStart || 1000) + i * (level.sequenceStep || 500));
    });
  }

  /* end of countdown → 2s response window → judge */
  trackTimeout(() => {
    phase = 'response';
    trackTimeout(judge, 2000);
  }, 2100);
}

function judge() {
  if (phase !== 'response') return;
  phase = 'judging';

  const level = LEVELS[levelIndex];
  const shouldPress = level.correctAction === 'press';

  if (clickedThisLevel === shouldPress) {
    passLevel();
  } else {
    failLevel(
      shouldPress
        ? 'You were supposed to press.'
        : 'You were not supposed to press.'
    );
  }
}

function passLevel() {
  phase = 'pass';
  clearAllTimers();
  setFeedback('✓');
  updateProgress(levelIndex);
  trackTimeout(() => startLevel(levelIndex + 1), 800);
}

function failLevel(message) {
  phase = 'fail';
  clearAllTimers();
  attempt++;
  updateAttempt();
  setFeedback(message);
  btnEl.classList.add('shake');
  trackTimeout(() => btnEl.classList.remove('shake'), 400);
  trackTimeout(() => startLevel(levelIndex), 1200);
}

/* ============================================================
   BOOT
   ============================================================ */
updateAttempt();
startLevel(0);
