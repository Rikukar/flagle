# 🚩 Flagle

A flag-building puzzle game. You're given a country's name and the **scattered pieces of its flag** — tilted, randomly sized, and shuffled into a tray. Reassemble it: place each piece, rotate it level, and size it right. Your score is **how much of the flag you reproduced correctly**.

![CI](https://github.com/Rikukar/flagle/actions/workflows/ci.yml/badge.svg)

> **Live demo:** **[flagle-seven.vercel.app](https://flagle-seven.vercel.app)**

---

## Gameplay

- **Click a piece** in the tray to drop it onto the flag.
- **Drag the middle** of a piece to move it.
- **Drag an edge** to resize that side; **drag a corner** to resize evenly. Symbols (stars, emblems, discs) always resize evenly so they never distort.
- **Rotate** by dragging just outside a selected piece, or use the **sliders** on the left for fine control.
- Pieces can't be pushed past the flag's borders, and they auto-shrink if a rotation would make them spill over.
- Hit **Submit** to score the flag from **0.00 to 10.00**.

### Scoring

The score is a genuine **pixel comparison**: your assembled flag is rendered and compared, area-by-area, against the real flag. The fraction of the flag you colored correctly *is* your score. Uncovered area counts as wrong, so you have to build the whole flag — no farming points by leaving white space.

Identical pieces (e.g. Nigeria's two green stripes) are interchangeable — it never matters which one goes in which matching slot.

## Modes

- **📅 Daily Challenge** — 5 flags, the **same for everyone** on a given day (seeded by the date). One attempt per day: progress is saved, so you can't leave and replay flags, and you resume exactly where you left off.
- **♾️ Endless** — a fresh round of 5 random flags, replayable as much as you like.

Plus: light/dark theme (remembered across visits), and a per-round score summary including any skipped flags.

## Flags

**70 countries** and counting, every one built to match the real artwork. Flags are described as data — a list of colored building blocks — using four piece types:

| Piece | Used for |
| --- | --- |
| `rect` | stripes, bars, fields, crosses |
| `circle` | discs (Japan, Bangladesh, Palau, Laos) |
| `path` | single-colour emblems, triangles, stars, crescents (Canada, Brazil's rhombus, Vietnam, Turkey…) |
| `image` | complex multi-colour emblems extracted from the real flag (Mexico, Spain, Portugal, South Korea, the US stars/stripes…) |

Colours and geometry are taken directly from the [flag-icons](https://github.com/lipis/flag-icons) source so the built flag matches the reference exactly.

## Tech stack

- **React 18** + **Vite 5**
- SVG for all rendering (flags, pieces, scoring canvas)
- **Vitest** for tests, with v8 coverage
- Deployed on **Vercel**

## Getting started

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # preview the production build locally
npm test           # run the test suite
npm run test:watch # tests in watch mode
npm run coverage   # tests + coverage report
```

## Tests

The pure game logic is unit-tested with Vitest:

- **`src/flags.test.js`** — data integrity: every flag's pieces fit at their target, can reach the correct size, aren't larger than the flag, have valid colours/symmetry, and have a real reference asset.
- **`src/geometry.test.js`** — clamping to bounds, rotation-aware sizing, symmetry-aware scoring, and swap-invariance of identical pieces.
- **`src/daily.test.js`** — deterministic daily selection (same date → same flags) and the seeded RNG.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the build and the coverage report on every push to `main` and every PR; the HTML coverage report is uploaded as a build artifact.

## Project structure

```
src/
  App.jsx          # modes, daily persistence, theme, round flow
  FlagGame.jsx     # the board: pieces, dragging, resizing, pixel scoring
  flags.js         # all flag definitions (the data)
  geometry.js      # pure geometry & scoring helpers (unit-tested)
  daily.js         # deterministic daily-round helpers (unit-tested)
  flagAssets.js    # resolves flag-icons SVGs to bundled URLs
  emblems/         # extracted multi-colour emblem assets
  *.test.js        # Vitest suites
scripts/
  extract-emblem.mjs   # helper for pulling an emblem out of a flag-icons SVG
```

## Adding a flag

Most flags are just a few lines of data in [`src/flags.js`](src/flags.js) using the `vstripe` / `hstripe` / `hband` / `vbar` / `field` / `box` / `disc` helpers. For flags with a complex emblem, see [`EMBLEM-EXTRACTION.md`](EMBLEM-EXTRACTION.md) for the repeatable 3-step process (and `scripts/extract-emblem.mjs`).

## Deployment

It's a static Vite SPA — import the repo on [Vercel](https://vercel.com) and it auto-detects everything (Build: `npm run build`, Output: `dist`). Every push to `main` redeploys.

## Credits

Flag artwork and reference colours from [**flag-icons**](https://github.com/lipis/flag-icons) by Panayiotis Lipiridis (MIT).
