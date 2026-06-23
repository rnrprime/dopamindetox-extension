# Dopamin Detox — Browser Extension

A cross-browser **website blocker** (Chrome, Microsoft Edge, Firefox) built from a
single codebase, as a companion to the Dopamin Detox iOS app. Block distracting
sites with a calm, non-shaming reminder.

- **Free:** block websites (the core value — fully usable, no account).
- **Pro:** schedules, usage limits, strict mode, category presets — charged via
  [ExtPay](https://extensionpay.com) (Stripe). No backend of ours.
- **Privacy: local-only.** Block lists and settings live in your browser. Nothing
  is sent to any server we operate.

Publisher: **App Shaper** · Support: `dopaminedetox570@gmail.com` ·
Web: `dopamindetox.app`

---

## Tech stack

- [WXT](https://wxt.dev) (Manifest V3, TypeScript strict) — one codebase, per-browser builds.
- Cross-browser APIs via `browser.*` (webextension-polyfill, wired by WXT).
- Blocking via **`declarativeNetRequest` dynamic rules** (no host permissions).
- Vanilla TS + CSS (design tokens mirror the iOS app / website). No analytics, no trackers.

## Prerequisites

- **Node:** see [`.nvmrc`](.nvmrc) (Node 22 LTS). `nvm use` (or install Node 22).

> ⚠️ **Environment note:** at build time on the author's machine Node was located
> at `/private/tmp/node-v22.23.0-darwin-arm64/bin` (a temporary path). Install
> Node 22 properly (nvm/Homebrew/installer) before working on this repo.

## Develop

```bash
npm install            # also runs `wxt prepare`
npm run dev            # Chrome, hot reload
npm run dev:firefox    # Firefox, hot reload
```

### Load unpacked (manual)

- **Chrome / Edge:** build, then `chrome://extensions` (or `edge://extensions`) →
  enable Developer mode → **Load unpacked** → select `.output/chrome-mv3/`.
- **Firefox:** `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on**
  → select `.output/firefox-mv3/manifest.json`.

## Build (per browser)

```bash
npm run build          # -> .output/chrome-mv3/   (Chrome AND Edge use this package)
npm run build:firefox  # -> .output/firefox-mv3/
npm run zip            # -> .output/*-chrome.zip
npm run zip:firefox    # -> .output/*-firefox.zip
npm run compile        # tsc --noEmit typecheck
```

### Icons

PNG icons are generated from [`assets/icon.svg`](assets/icon.svg) and committed to
`public/icons/`. Regenerate with `npm run icons` (uses `sharp`).

## Permissions (minimal, justified)

| Permission | Why |
|---|---|
| `declarativeNetRequest` | Block/redirect the sites the user chooses. Needs no host permissions. |
| `storage` | Save the user's block list + settings (and, later, ExtPay status). |

We never request `<all_urls>` host permission. `alarms` / `tabs` and the
extensionpay.com host permission are added only in the phases that need them
(schedules/usage-limits, and ExtPay payments).

## Payments — ExtPay

Pro is charged via ExtPay (a thin Stripe layer, no server of ours). The owner
registers the extension at extensionpay.com, connects Stripe (App Shaper), and
sets prices ($1.99/mo, $14.99/yr). ExtPay + Stripe fees apply. ExtPay keys paid
status to the user's email **inside the extension only** — it is NOT linked to the
iOS account and shares nothing with the iOS app. (Wired in P4.)

## Cross-browser build status

`npm run build` and `npm run build:firefox` both produce MV3 packages. Real-browser
load/behaviour must be verified manually (see "Load unpacked"); a build succeeding
does not prove blocking works — test in each browser.

## Firefox (AMO) reproducible build

AMO review may require unminified source + build steps:

1. Install Node 22 (`.nvmrc`).
2. `npm ci`
3. `npm run build:firefox`
4. Output is `.output/firefox-mv3/`; `npm run zip:firefox` produces the uploadable zip.

`gecko.id` is `dopamindetox@dopamindetox.app`.

## Dev-dependency audit note

`npm audit` reports advisories in WXT's **build tooling** (dev dependencies).
These do not ship in the extension bundle (the packaged output is the static
files in `.output/`). Review before release, but they are not runtime risks.

## Project structure

See `wxt.config.ts` and `src/` (`entrypoints/`, `lib/`, `styles/`). Store listing
copy + assets live under `store/{chrome,edge,firefox}/`.
