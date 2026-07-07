# office-screensaver

Screens for the Phoebe office TVs (Apple TV + KitCast). Three pages:

| Page | URL | What |
|------|-----|------|
| Screensaver | https://phoebe-health.github.io/office-screensaver/ | Bouncing Phoebe logo on black |
| 🔥 Token Burner | https://phoebe-health.github.io/office-screensaver/dash/token-burner.html | Phoebe burning LLM tokens live |
| 🌎 Live Texts | https://phoebe-health.github.io/office-screensaver/dash/texts.html | Messages Phoebe sends, on a globe |
| Launcher | https://phoebe-health.github.io/office-screensaver/dash/ | Links to both dashboards |

## Screensaver
A single self-contained `index.html` (logo embedded as a data URI). The logo
color-changes on each bounce; a rare corner hit flashes the screen and ticks a
small counter. Tweak the constants at the top of its `<script>`:
`COLOR_CYCLE` (false = brand-clean white), `SHOW_CORNERS`, `LOGO_WIDTH_VW`,
`SPEED_FACTOR`.

## Dashboards (`dash/`)
A Vite + React + TypeScript app. Two fun, design-forward, always-on dashboards
driven by **real Phoebe production numbers** — pulled on a schedule into small
committed JSON feeds, then animated live in the browser. They're meant to be
eye-candy for the office, so numbers are **real but approximate**, not exact.

- **Token Burner** uses the [`liveline`](https://www.npmjs.com/package/liveline)
  real-time chart library. Shows a live-ticking token counter + estimated $
  spend, a tokens/sec chart, and a per-model split (voice on Gemini 3.5 Flash,
  memory on Claude Sonnet 4.6).
- **Live Texts** uses a [`cobe`](https://www.npmjs.com/package/cobe) globe
  (the magicUI look) with pulsing arcs for messages Phoebe sends, plus a live
  masked feed. **No PII** — only aggregate volume, stylized city geography, and
  masked/templated lines.

### How the data stays live
`.github/workflows/refresh-data.yml` runs every 15 min, executes
`scripts/refresh-data.mjs` (which queries Phoebe's Logfire for aggregate,
PII-free token and message counts), and commits `dash/public/data/*.json`. That
commit triggers `deploy.yml`, which rebuilds and republishes to Pages. The pages
also re-poll their JSON every 60s and animate smoothly between snapshots. If the
refresh ever fails, the last-good committed feeds keep serving.

### One-time setup (required for live data)
1. **Add the secret:** repo → Settings → Secrets and variables → Actions → new
   secret **`LOGFIRE_READ_TOKEN`** = a Logfire *read* token for the
   `phoebe-production` project (Logfire → project settings → Read tokens).
2. **Set Pages source to GitHub Actions:** repo → Settings → Pages → Build and
   deployment → Source = **GitHub Actions**. (This keeps the screensaver at `/`
   and adds the dashboards under `/dash/` — the deploy workflow assembles both.)

Without the secret, the dashboards still run off the committed seed feeds (real
snapshot numbers, animated) — they just stop re-grounding until it's added.

### Use with KitCast
Add a **Web** zone/content pointing at whichever page URL above you want on that
TV.

### Local dev
```bash
cd dash
npm install
npm run dev      # http://localhost:5173/office-screensaver/dash/token-burner.html
npm run build    # type-check + production build to dash/dist
node ../scripts/refresh-data.mjs   # needs LOGFIRE_READ_TOKEN in env
```
