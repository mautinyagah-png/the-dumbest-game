# 🏆 The Dumbest Game in the World

A tiny browser game where a green button gives you instructions, judges your
choices, and eventually asks you to do absolutely nothing — all over an
animated screensaver background.

> *"You'll be done in a few minutes." — The Green Button, lying*

## Play

👉 **https://<your-username>.github.io/the-dumbest-game/**

## Features

- 🎞️ **Animated background** — 3 scenes cycle every ~18s with smooth crossfades:
  1. Matrix code rain
  2. Starfield warp tunnel
  3. Aurora sine waves
- 🌙/☀️ **Dark & light mode** — toggle in the top bar, saved to `localStorage`
- 🔊/🔇 **Sound effects** — synthesized with Web Audio API (no audio files)
- 📱 **Responsive** — works on phone, tablet, laptop
- ⏱️ **Generous reading time** — letters stay up for 2 seconds
- 🛡️ **Touch-safe** — the "don't hover" trap is skipped on touch devices
- ♿ **Respects `prefers-reduced-motion`** — background goes static for users who need it
- 💤 **Pauses on tab blur** — saves battery when the tab is hidden

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup, canvas + overlay, theme/sound toggles |
| `style.css`  | Styling, CSS variables, animations, responsive layout |
| `script.js`  | Game logic, `LEVELS` array, sound engine, theme toggle |
| `background.js` | Animated screensaver background (3 scenes) |
| `README.md`  | This file |

## Deploying to GitHub Pages

1. Push all files to a public GitHub repo.
2. **Settings → Pages → Source:** `Deploy from a branch`
3. **Branch:** `main`, **folder:** `/ (root)`
4. **Save.** Live in ~1 minute.

## License

MIT. Do whatever you want with it. It's a dumb game.
