# Chrome Web Store — listing

Account: Chrome Web Store developer account ($5 one-time, owner pays).
Package: `.output/*-chrome.zip` (run `npm run zip`).
Shared copy: see `../listing-copy.md`.

## Fields

- **Name:** Dopamin Detox — Website Blocker
- **Summary (≤132 chars):** Block distracting websites with a calm, supportive reminder. Your block list stays in your browser — we collect nothing.
- **Category:** Productivity
- **Language:** English
- **Detailed description:** use the "Full description" from `../listing-copy.md`.
- **Single purpose:** Blocks websites the user chooses, redirecting them to a calm reminder page. (Chrome requires a clear single purpose — this is it.)
- **Privacy policy URL:** https://dopamindetox.app/privacy  (must be live before submit)

## Permission justifications (Chrome asks per permission)

- **declarativeNetRequest:** Block the websites the user adds to their list.
- **host permissions (`*://*/*`):** Required for the declarativeNetRequest
  `redirect` action — to send a blocked site to our calm reminder page. Blocking
  is evaluated by the browser from the user's own list; the extension reads no
  page content and transmits nothing. (Chrome will show "read and change all your
  data on websites" — this is the standard, expected warning for a site blocker.)
- **storage:** Save the user's block list, settings, and Pro status locally.
- **Remote code:** None. The extension bundles all its code; nothing is fetched
  and executed at runtime.
- **Data usage disclosures:** Select "does NOT collect or use" for all data
  categories. We do not collect or transmit user data.

## Required assets

- Store icon: 128×128 PNG (use `public/icons/128.png`).
- Screenshots: at least 1, up to 5 — **1280×800** or 640×400 PNG/JPG. See
  `../SCREENSHOTS.md`.
- Small promo tile: **440×280** PNG (optional but recommended). See `../SCREENSHOTS.md`.
- Marquee promo tile: **1400×560** PNG (optional). See `../SCREENSHOTS.md`.

## Notes

- Chrome Web Store no longer requires the marquee tile, but a small promo tile
  improves placement.
- Make sure the data-usage / privacy practices form matches `../privacy/PRIVACY.md`
  (no data collected).
