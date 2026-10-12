# Drop50

A personal, phone-first training log: a 3×/week full-body program (trainer.neal's 90-day framework) with a
3-week exercise rotation, one-tap set logging, "beat last time" targets, and daily weight/steps/food tiles.
Static site on GitHub Pages; data stays on the phone.

## Use it on iPhone

1. Open the Pages URL in Safari → Share → **Add to Home Screen**.
2. Use only the home-screen icon. Its storage is separate from Safari, so anything logged in a Safari tab won't show up there.
3. After workouts, tap **Save a backup to Files** now and then (Settings → Your data). Restore from the same place.
4. Settings → **Erase all data** clears test entries before the real start date.

Apple Health: build a "Drop50 Sync" shortcut that copies `drop50 steps=… weight=…` (Settings → Apple Health has the steps and the name field). Pull down on Today or tap the sync icon; Drop50 runs the shortcut and imports the numbers when you return.

New versions install in the background; Today shows **Update now** when one is ready.

## Layout

- `dist/` — the site (no build step): `index.html`, `styles.css`, `app.js` (UI), `engine.js` (program +
  progression logic, shared with tests), `plan.json` (program data), `sw.js` (offline cache), `media/` (demo frames).
- `tools/build_plan.py` — regenerates `dist/plan.json`; `tools/rot.py` searches the balanced rotation.
- `tools/release.sh` — stamps a new version into `app.js` + `sw.js` and runs the tests. Run before every push.
- `tests/` — `node --test tests/`.
- `docs/SPEC-v2.md` — the design spec.

## Run locally

```sh
python3 -m http.server 47311 --directory dist   # then open http://127.0.0.1:47311
node --test tests/
```

Media: the original 11 demos are generated monochrome sprites; the 14 newer ones are photos from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain), graded to match.
This is a general fitness tool, not medical advice.
