import ExtPay from 'extpay';
import { storage } from '#imports';

// Central Pro-gating — a single source of truth, conceptually like the iOS
// `ProFeature` enum. FREE features must NEVER import or call this module.

export const PRO_FEATURES = {
  schedules: 'Schedules',
  usageLimits: 'Usage limits',
  siteTime: 'Time by website',
  strictMode: 'Strict mode',
  permanentBlock: 'Permanent block (hard mode)',
  categoryPresets: 'Category presets',
} as const;

export type ProFeature = keyof typeof PRO_FEATURES;

// ---- Payments (ExtensionPay → Stripe) ----
//
// ExtPay is a thin layer over the owner's own Stripe account: the customer pays
// on extensionpay.com (hosted Stripe checkout), and ExtPay tells us whether they
// have paid — no backend of our own. Setup, ONE TIME, by the owner:
//   1. Register this extension at https://extensionpay.com and connect Stripe.
//   2. Create two plans: $1.99 / month and $14.99 / year.
//   3. Paste the extension's id slug below (NOT a Stripe key — the ExtPay id).
// Until EXTPAY_ID is set to the real slug, getUser() simply reports "not paid".
export const EXTPAY_ID = 'dopamin-detox-limit-screen-time';

// One ExtPay client per context (ExtPay is designed to be called in background,
// popup and options alike). `startBackground()` is invoked ONCE, in background.
export const extpay = ExtPay(EXTPAY_ID);

// Cached Pro flag. Feature code reads ONLY this (synchronously-ish via storage),
// so it never depends on the network or on ExtPay being reachable. The
// background keeps it in sync with ExtPay via refreshPro() + the onPaid event.
export const proActive = storage.defineItem<boolean>('local:proActive', {
  fallback: false,
});

/** Whether the user currently has Pro (reads the cached flag). */
export async function isPro(): Promise<boolean> {
  return proActive.getValue();
}

/**
 * Ask ExtPay for the latest paid status and cache it into `proActive`.
 * On any failure (offline, ExtPay unreachable) we KEEP the cached value so Pro
 * doesn't flicker off for a paying user who is simply offline. Returns the
 * effective Pro state.
 */
export async function refreshPro(): Promise<boolean> {
  try {
    const user = await extpay.getUser();
    const paid = user.paid === true;
    await proActive.setValue(paid);
    return paid;
  } catch {
    return proActive.getValue();
  }
}
