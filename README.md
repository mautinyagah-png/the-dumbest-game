# 🏆 The Dumbest Game in the World

A tiny browser game where a green button gives you instructions, judges your
choices, and eventually asks you to do absolutely nothing — all over an
animated screensaver background.

> *"You'll be done in a few minutes." — The Green Button, lying*

## Play

👉 **https://<your-username>.github.io/the-dumbest-game/**

## Features

- 🎞️ **Animated background** — 3 scenes cycle every ~18s:
  1. Slow-falling **code rain** (real coding words)
  2. Starfield warp tunnel
  3. Aurora sine waves
- 🎛️ **Airplane-dashboard panel** — frosted glass, corner rivets, instrument grid
- 🚨 **Loud denial reaction** — red button + red panel glow + red flash +
  `!` marks + shake + denial sound
- 🔘 **Real 3D press** — button has a bezel edge and sinks in when pressed
- 🌙/☀️ **Dark & light mode** — saved to `localStorage`
- 🔊/🔇 **Sound effects** — synthesized with Web Audio API (no audio files)
- 📱 **Responsive** — phone, tablet, laptop
- ♿ **Respects `prefers-reduced-motion`**

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup, dashboard decor, overlays |
| `style.css`  | Styling, theming, 3D button, animations |
| `script.js`  | Game logic, sound, theme, denial effect |
| `background.js` | Animated screensaver background (3 scenes) |
| `README.md`  | This file |

## Deploying to GitHub Pages

1. Push all files to a public repo.
2. **Settings → Pages → Source:** `Deploy from a branch`
3. **Branch:** `main`, **folder:** `/ (root)`
4. **Save.** Live in ~1 minute.

## License

MIT. Do whatever you want with it. It's a dumb game.
