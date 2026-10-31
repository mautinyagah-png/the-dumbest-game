# 🏆 The Dumbest Game in the World

A tiny browser game where a green button gives you instructions, judges your
choices, and eventually asks you to do absolutely nothing.

> *"You'll be done in a few minutes." — The Green Button, lying*

## Play

👉 **https://<your-username>.github.io/the-dumbest-game/**

(Replace `<your-username>` after enabling GitHub Pages.)

## What it is

You click the button when told. Simple. Then the button starts giving you
rules that contradict each other. Then it asks you to *not* touch it — and
touching it (or even hovering over it) sends you back to the start.

The only way out of the dilemma level is to do **nothing**. Hands off.
Don't hover. Don't look at it. That's the whole game.

It is, by design, the dumbest game in the world. It has no skill ceiling,
no strategy, no point — and yet you will absolutely get competitive with it.

## Rules (such as they are)

- Read the instruction at the top.
- If it says press, press. If it says don't press, don't press.
- If the button tells you to do nothing, do **exactly nothing**.
- Failing sends you back to the start of the current level.
- The clock keeps running. Always.

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup and structure |
| `style.css`  | All styling and animations |
| `script.js`  | Game logic + the `LEVELS` array |
| `README.md`  | This file |

## Adding levels

Open `script.js` and add a new object to the `LEVELS` array. Kinds:

- `{ kind: 'normal', prompt, correctAction, letter, letterAt, letterDuration }`
  → single-letter flash level. `correctAction` is `'press'` or `'no-press'`.
- `{ kind: 'normal', prompt, correctAction, sequence, sequenceStart, sequenceStep }`
  → letter-sequence level.
- `{ kind: 'dilemma', prompt, duration, hints }`
  → the trap level. Failing shows the next hint.

## Running locally

Just open `index.html` in a browser. No build step, no dependencies.

## Deploying to GitHub Pages

1. Push this repo to GitHub (public).
2. **Settings → Pages → Source:** `Deploy from a branch`
3. **Branch:** `main`, **folder:** `/ (root)`
4. **Save.** Your game is live in ~1 minute.

## License

MIT. Do whatever you want with it. It's a dumb game.
