# office-screensaver

A bouncing-DVD-style screensaver with the Phoebe logo on black, for the
office TVs (Apple TV + KitCast).

- **Live page:** https://phoebe-health.github.io/office-screensaver/
- It's a single self-contained `index.html` (logo embedded as a data URI).
- The logo color-changes on each bounce; a rare corner hit flashes the screen
  and ticks a small counter.

## Use with KitCast
Add a **Web** zone/content in KitCast pointing at the live page URL above.

## Tweaks
Edit the constants at the top of the `<script>` in `index.html`:
- `COLOR_CYCLE` — `false` keeps it brand-clean white
- `SHOW_CORNERS` — hide the corner counter
- `LOGO_WIDTH_VW` / `SPEED_FACTOR` — size / drift speed
