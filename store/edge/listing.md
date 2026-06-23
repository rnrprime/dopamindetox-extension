# Microsoft Edge Add-ons — listing

Account: Microsoft Partner Center (free).
Package: the **same** Chromium build as Chrome — `.output/*-chrome.zip`
(`npm run zip`). No separate build needed.
Shared copy: see `../listing-copy.md`.

## Fields

- **Name:** Dopamin Detox — Website Blocker
- **Short description:** Block distracting websites with a calm, supportive reminder. Your block list stays in your browser — we collect nothing.
- **Category:** Productivity
- **Description:** use the "Full description" from `../listing-copy.md`.
- **Privacy policy URL:** https://dopamindetox.app/privacy  (must be live before submit)
- **Search terms / keywords:** website blocker, block sites, focus, distraction, screen time, productivity, self control

## Permission justifications

Same as Chrome (see `../listing-copy.md` → Permission justifications). Edge uses
the identical Chromium package and permission model.

## Required assets

- Store logo: 300×300 PNG (can be produced from the brand mark; see `../SCREENSHOTS.md`).
- Tile icon: 128×128 PNG (`public/icons/128.png`).
- Screenshots: at least 1 — **1280×800** (same set as Chrome). See `../SCREENSHOTS.md`.

## Notes

- Edge certification also reviews privacy practices — keep them consistent with
  `../privacy/PRIVACY.md`.
- Declare that the extension does not collect user data.
