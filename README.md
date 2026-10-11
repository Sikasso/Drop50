# Drop50

A static weight-loss and strength-training tracker. The app runs in the browser and stores its data in that browser's local storage.

## Publish with GitHub Pages

1. Create an empty GitHub repository (public or private, according to your Pages plan) and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source.
3. The included workflow deploys the contents of `dist/` on each push to `main`. The published URL appears under **Settings → Pages** after the first successful run.

## Run locally

From the project directory, run:

```sh
python3 -m http.server 8000 --directory dist
```

Then open <http://localhost:8000>.

## Data and limitations

App data stays in the browser's local storage. Use the app's export/backup feature to save a copy; local storage does not sync across devices or browsers. The app is a general fitness tool and does not guarantee medical outcomes or replace professional medical advice.

## Implementation and checks

The interface uses custom CSS transitions inspired by Motion Primitives; it does not bundle that React library. The exercise loops are simplified movement schematics, paired with written cues.

Node checks cover view rendering, session rotation, phase volume, save/reload, date isolation, historical sessions, import validation, and weekly averages. Browser visual/layout QA remains pending.
