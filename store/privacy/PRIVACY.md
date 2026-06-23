<!-- DRAFT: have a qualified professional review this before launch. -->
<!-- This is the EXTENSION privacy notice. It is intentionally different from
     the iOS app's privacy policy (which covers Firebase / CloudKit / Apple).
     The extension collects far less — do not copy the iOS policy here.
     Host this at https://dopamindetox.app/privacy before store submission
     (all three stores require a public privacy policy URL). -->

# Dopamin Detox — Browser Extension Privacy Notice

**Last updated:** 23 June 2026
**Publisher:** App Shaper
**Contact:** dopaminedetox570@gmail.com

## The short version

Dopamin Detox (the browser extension) is **local-only**. The websites you
choose to block, and your settings, are stored **in your own browser**. We do
**not** collect, transmit, sell, or share your browsing activity, and we run no
server that receives your data.

## What we store, and where

- **Your block list and settings** are saved using your browser's built-in
  storage. If your browser is signed in and syncing, your block list may sync
  across your own browser profiles via your browser maker's account (Google,
  Microsoft, or Mozilla) — this is a feature of your browser, not a service we
  operate, and we never see that data.
- We do **not** keep analytics, telemetry, tracking, or advertising identifiers.
  The extension bundles no third-party trackers.

## What we do NOT do

- We do **not** read, log, collect, or transmit the pages you visit or your
  browsing history.
- We do **not** sell or share any personal data.
- We do **not** require an account to use the extension.

## How blocking works (and why a broad permission is requested)

The extension blocks sites using your browser's **declarativeNetRequest** system.
You give the extension permission to act on websites so it can **redirect a
blocked page to a calm reminder screen**. Importantly, this blocking is performed
**by your browser**, following rules built from your own block list. The
extension's own code does **not** read the contents of the pages you visit and
has no ability to send your browsing anywhere. The permission authorizes the
redirect; it does not give us access to your data.

Permissions we request, and why:

- **Block content on websites (declarativeNetRequest + host access):** to redirect
  sites you have chosen to block to our reminder page.
- **Storage:** to save your block list and settings (and your Pro status, if you
  subscribe).

## Payments (only if you choose Pro)

Optional Pro features are handled by **ExtPay** (extensionpay.com), which uses
**Stripe** to process payments. We do not operate a payment server and do not
store your card details. If you upgrade, your payment information is handled by
ExtPay and Stripe under their own privacy policies:

- ExtPay: https://extensionpay.com/privacy
- Stripe: https://stripe.com/privacy

ExtPay records your paid status against your email **inside the extension** so
your Pro features unlock. This is a payment mechanism only — it is **not** linked
to the Dopamin Detox iOS app and shares nothing with it.

## Children

The extension is not directed at children and does not knowingly collect any
personal data from anyone.

## Changes

If this notice changes, we will update the date above and post the revised
version at https://dopamindetox.app/privacy.

## Contact

Questions about privacy? Email **dopaminedetox570@gmail.com**.
