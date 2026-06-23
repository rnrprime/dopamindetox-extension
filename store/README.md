# Store submission

One codebase → three listings. The owner creates the accounts and does the final
upload; this folder holds the copy and assets.

## Contents

- `listing-copy.md` — shared name, descriptions, free/Pro, permission justifications.
- `chrome/listing.md`, `edge/listing.md`, `firefox/listing.md` — per-store fields.
- `privacy/PRIVACY.md` — the local-only privacy notice (DRAFT — needs legal review).
- `SCREENSHOTS.md` — screenshot capture checklist + promo asset export.
- `assets/` — promo tile templates (SVG) + text-free store logos (PNG).

## Before submitting (all stores)

1. **Host the privacy notice** at https://dopamindetox.app/privacy — all three
   stores require a live privacy policy URL. ⚠️ The notice is a **DRAFT**: have a
   qualified professional review it first.
2. **Capture product screenshots** (see `SCREENSHOTS.md`).
3. **Bump the version** in `package.json` if needed, then build packages:
   - Chrome + Edge: `npm run zip` → `.output/*-chrome.zip`
   - Firefox: `npm run zip:firefox` → `.output/*-firefox.zip`
4. **Set the App Store link** in `src/lib/links.ts` (`APP_STORE_URL`) once the iOS
   app is live, and rebuild — until then the cross-promo shows "coming soon".

## Per-store quick facts

| | Account | Package | Notes |
|---|---|---|---|
| Chrome | $5 one-time | `*-chrome.zip` | Single purpose + per-permission justifications. |
| Edge | Free | `*-chrome.zip` (same) | Same Chromium package. |
| Firefox | Free | `*-firefox.zip` | gecko id `dopamindetox@dopamindetox.app`; reviewer needs reproducible build steps (in repo README + `firefox/listing.md`); host access is opt-in post-install. |

## Fees note

ExtPay + Stripe charge fees on Pro subscriptions (owner's call to accept). See the
repo `README.md`.
