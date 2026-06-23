# Firefox Add-ons (AMO) — listing

Account: Firefox Add-on Developer Hub (free).
Package: `.output/*-firefox.zip` (run `npm run zip:firefox`).
Add-on ID (gecko): `dopamindetox@dopamindetox.app`
Shared copy: see `../listing-copy.md`.

## Fields

- **Name:** Dopamin Detox — Website Blocker
- **Summary:** Block distracting websites with a calm, supportive reminder. Your block list stays in your browser — we collect nothing.
- **Category:** Privacy & Security / Productivity
- **Description:** use the "Full description" from `../listing-copy.md`.
- **Privacy policy URL:** https://dopamindetox.app/privacy  (must be live before submit)
- **License:** owner's choice (e.g. "All Rights Reserved" or an open-source license).

## Permissions on Firefox

Firefox MV3 treats host permissions as **opt-in**. After install, the user must
grant "Access your data for all websites" (about:addons → the add-on →
Permissions) for redirect-blocking to take effect. Note this in the listing
description's setup line, and justify the permission the same way as Chrome (see
`../listing-copy.md`).

## Data collection declaration

The manifest declares `browser_specific_settings.gecko.data_collection_permissions:
{ required: ["none"] }` — i.e. **no data collected**. Keep the AMO data-collection
form consistent with this.

## Required assets

- Icon: 128×128 PNG (`public/icons/128.png`).
- Screenshots: at least 1 — **1280×800** (same set as Chrome). See `../SCREENSHOTS.md`.

## AMO source-code review (IMPORTANT)

AMO requires reviewable source because the submitted package is built/minified.
Provide these build instructions to the reviewer (also in the repo `README.md`):

1. Install Node 22 (see `.nvmrc`).
2. `npm ci`
3. `npm run build:firefox`
4. Output is `.output/firefox-mv3/`; `npm run zip:firefox` produces the uploaded zip.

Operating system used for the official build: macOS. Node: 22 LTS. Package
manager: npm. No other tooling required.
