import { storage } from '#imports';

// Central Pro-gating — a single source of truth, conceptually like the iOS
// `ProFeature` enum. FREE features must NEVER import or call this module.

export const PRO_FEATURES = {
  schedules: 'Schedules',
  usageLimits: 'Usage limits',
  strictMode: 'Strict mode',
  categoryPresets: 'Category presets',
} as const;

export type ProFeature = keyof typeof PRO_FEATURES;

// Pro entitlement flag. A payment processor is NOT yet wired (ExtPay/Stripe are
// unavailable in the owner's country) — until one is, Pro unlocks via this local
// flag (set by the temporary "testing" toggle in Options). When a processor is
// added later, it sets/refreshes exactly this flag, so no feature code changes.
export const proActive = storage.defineItem<boolean>('local:proActive', {
  fallback: false,
});

/** Whether the user currently has Pro. */
export async function isPro(): Promise<boolean> {
  return proActive.getValue();
}
