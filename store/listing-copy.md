# Shared store listing copy

Reusable copy for all three stores. Each store's `listing.md` references this and
adds store-specific fields. Keep it calm, plain-language, and accurate — never
overstate. State clearly what is free vs Pro.

---

## Product name

Dopamin Detox — Website Blocker

## Short description / summary (≤132 chars)

Block distracting websites with a calm, supportive reminder. Your block list
stays in your browser — we collect nothing.

## Single purpose (one sentence)

Dopamin Detox blocks websites the user chooses, redirecting them to a calm
reminder page to help them step away from distracting sites.

## Full description

Dopamin Detox helps you take back your attention. Add the websites that pull you
in — and when you try to open one, we gently redirect you to a calm reminder
instead of letting the page load. No shame, no lectures. Just a quiet moment to
choose what you actually want to do.

It's a companion to the Dopamin Detox app for iPhone, built on the same calm,
supportive philosophy.

WHAT'S FREE
• Block any website by address, from the toolbar popup or the settings page
• One-tap "Block this site" for the page you're on
• A master on/off switch
• A calm, non-shaming blocked page (never mocking, never guilt-tripping)
• Your block list follows you across your own signed-in browser profiles, using
  your browser's built-in sync — no account needed

PRO (optional subscription)
• Schedules — block sites by time of day and day of week
• Usage limits — block a site after a set amount of time each day
• Strict mode — make a block harder to switch off in a weak moment
• Permanent block (hard mode) — lock a site or category for good; it can’t be
  unblocked from the extension (great for adult sites you never want to reach)
• Category presets — block bundles like social, news, or gaming in one tap

Pro is $1.99/month or $14.99/year, handled securely by ExtPay (Stripe).

PRIVACY — WE COLLECT NOTHING
Dopamin Detox is local-only. Your block list and settings live in your browser.
We do not collect, transmit, or sell your browsing data, and we run no server
that receives it. Blocking is performed by your browser from your own list; the
extension never reads the pages you visit.

Made by App Shaper. Questions? dopaminedetox570@gmail.com

## Free vs Pro (for the pricing/notes field)

Free: website blocking (the full core experience, no account).
Pro ($1.99/mo or $14.99/yr): schedules, usage limits, strict mode, category
presets.

## Permission justifications (reuse per store)

- **declarativeNetRequest + host access ("read and change data on websites"):**
  Required so the browser can redirect the sites you block to our calm reminder
  page. Blocking is evaluated by the browser from your own block list. The
  extension does not read page contents and sends nothing anywhere — host access
  authorizes the redirect, not data access.
- **Storage:** Saves your block list, settings, and (if you subscribe) your Pro
  status, in your browser.
- **Alarms (Pro):** A periodic heartbeat that checks your schedules and per-site
  daily usage limits so blocks turn on/off at the right times.

## Category

Productivity

## Privacy policy URL

https://dopamindetox.app/privacy

## Support / contact

dopaminedetox570@gmail.com — https://dopamindetox.app
