// Central Pro-gating — a single source of truth, conceptually like the iOS
// `ProFeature` enum. FREE features must NEVER import or call this module.
//
// The actual ExtPay wiring lands in P4 (see lib/pay.ts). Until then, Pro is
// treated as locked everywhere.

export const PRO_FEATURES = {
  schedules: 'Schedules',
  usageLimits: 'Usage limits',
  strictMode: 'Strict mode',
  categoryPresets: 'Category presets',
} as const;

export type ProFeature = keyof typeof PRO_FEATURES;

/**
 * Whether the user has an active Pro subscription.
 * Replaced with the ExtPay-backed check in P4.
 */
export async function isPro(): Promise<boolean> {
  return false;
}
