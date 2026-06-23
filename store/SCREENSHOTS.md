# Store screenshots & promo assets

## Status

- ✅ **Promo tiles (editable templates):** `assets/promo-marquee.svg` (1400×560),
  `assets/promo-small.svg` (440×280). Open in a browser and export to PNG, or
  edit in any vector tool.
- ✅ **Store logo (text-free):** `assets/logo-300.png` (Edge), `assets/logo-512.png`.
  Chrome's 128px store icon = `public/icons/128.png`.
- ⏳ **Product screenshots:** must be captured from the running extension (a build
  can't fake real UI). Capture checklist below.

## Product screenshots — capture checklist

Target size: **1280×800** PNG (works for all three stores; Chrome also accepts
640×400). Capture 3–5. Use a clean browser profile, default (light) theme, and a
believable block list (e.g. youtube.com, reddit.com, news.ycombinator.com).

Suggested set:

1. **The popup in action** — open the toolbar popup on a normal site, showing the
   master toggle On, "Block this site", and the blocked count.
2. **The calm blocked page** — navigate to a blocked site so it redirects; capture
   the "Taking a moment away" page.
3. **The settings page** — the block list with a few sites + the add field.
4. **(Optional) Pro features** — once P4/P5 ship, the schedules / usage-limit UI.
5. **(Optional) Dark mode** — the popup or blocked page in dark theme.

Tips:
- The popup is ~380px wide; place it on a tidy page and capture a 1280×800 region
  around it, or compose it on a plain background so it isn't lost in a corner.
- No personal data, no real account info, no clutter in the captured tab.
- Keep captions (if the store allows them) plain and accurate.

### How to capture (macOS)

- Load the unpacked build (see repo `README.md`).
- Use ⌘⇧4 then Space to capture a window, or ⌘⇧4 for a region. Resize/pad to
  exactly 1280×800 before upload (Preview → Tools → Adjust Size, or any editor).

## Exporting the promo tiles to PNG

1. Open `assets/promo-marquee.svg` (or `promo-small.svg`) in Chrome.
2. Either screenshot at exact size, or use a converter / vector tool to export at
   the native dimensions (1400×560 / 440×280).
3. Verify the text rendered with a system sans-serif (it will, in a browser).

## Per-store asset summary

| Asset | Size | Chrome | Edge | Firefox |
|---|---|---|---|---|
| Store/tile icon | 128×128 | ✅ `public/icons/128.png` | ✅ | ✅ |
| Store logo | 300×300 | — | ✅ `assets/logo-300.png` | — |
| Screenshots | 1280×800 | ✅ (1–5) | ✅ (1+) | ✅ (1+) |
| Small promo tile | 440×280 | optional | — | — |
| Marquee promo tile | 1400×560 | optional | — | — |
