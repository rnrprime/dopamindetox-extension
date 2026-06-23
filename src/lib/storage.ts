import { storage } from '#imports';

// Typed wrappers over browser.storage.
//
// - blocklist lives in `sync:` so it follows the user across their own
//   signed-in browser profiles for free. This is browser-native sync, NOT our
//   backend and NOT the iOS account link.
// - masterEnabled is `local:` — the on/off switch is per-device.
//
// Each device rebuilds its own declarativeNetRequest rules from the synced list.

/** The list of blocked domains, normalized (see normalizeDomain). */
export const blocklist = storage.defineItem<string[]>('sync:blocklist', {
  fallback: [],
});

/**
 * Permanently ("hard mode") blocked domains. Once added these are enforced
 * UNCONDITIONALLY — even when the master switch is off, outside schedules, and
 * regardless of Pro status — and the UI offers no way to remove them. The only
 * escape is uninstalling the extension (a browser extension can't prevent that).
 */
export const permanentList = storage.defineItem<string[]>(
  'sync:permanentList',
  { fallback: [] },
);

/** Master on/off for all blocking on this device. */
export const masterEnabled = storage.defineItem<boolean>('local:masterEnabled', {
  fallback: true,
});

// ---- Pro feature data ----

/** A recurring block window. days: 0=Sun..6=Sat. times: "HH:MM" (local). */
export interface Schedule {
  id: string;
  days: number[];
  start: string;
  end: string;
}

/** Daily time limit for a domain, in minutes. */
export interface UsageLimit {
  domain: string;
  minutes: number;
}

export interface StrictSettings {
  enabled: boolean;
  cooldownMinutes: number;
  /** Epoch ms when a pending unlock becomes effective (null = not pending). */
  pendingUnlockAt: number | null;
}

/** (Pro) Block windows. Empty = block all day whenever master is on. */
export const schedules = storage.defineItem<Schedule[]>('sync:schedules', {
  fallback: [],
});

/** (Pro) Per-domain daily time limits. */
export const usageLimits = storage.defineItem<UsageLimit[]>('sync:usageLimits', {
  fallback: [],
});

/** (Pro) Today's accumulated seconds per domain (resets at local midnight). */
export const usageState = storage.defineItem<{
  date: string;
  seconds: Record<string, number>;
}>('local:usageState', {
  fallback: { date: '', seconds: {} },
});

/** (Pro) The currently-counting domain + when it started (for usage tracking). */
export const usageActive = storage.defineItem<{
  domain: string | null;
  since: number;
}>('local:usageActive', {
  fallback: { domain: null, since: 0 },
});

/** Whether a browser window is currently focused (pauses usage counting). */
export const usageFocused = storage.defineItem<boolean>('local:usageFocused', {
  fallback: true,
});

/** (Pro) Strict mode. */
export const strict = storage.defineItem<StrictSettings>('sync:strict', {
  fallback: { enabled: false, cooldownMinutes: 30, pendingUnlockAt: null },
});

/** Add a domain (deduped, sorted). Returns the resulting list. */
export async function addDomain(domain: string): Promise<string[]> {
  const current = await blocklist.getValue();
  if (current.includes(domain)) return current;
  const next = [...current, domain].sort((a, b) => a.localeCompare(b));
  await blocklist.setValue(next);
  return next;
}

/** Add several domains at once (deduped, sorted). Returns the resulting list. */
export async function addDomains(domains: string[]): Promise<string[]> {
  const current = await blocklist.getValue();
  const set = new Set(current);
  for (const d of domains) set.add(d);
  const next = [...set].sort((a, b) => a.localeCompare(b));
  await blocklist.setValue(next);
  return next;
}

/**
 * Add domains to the PERMANENT (hard mode) list. Irreversible by design — there
 * is intentionally no removePermanent. Also drops them from the regular,
 * removable list so a domain isn't shown in two places.
 */
export async function addPermanent(domains: string[]): Promise<string[]> {
  const [perm, manual] = await Promise.all([
    permanentList.getValue(),
    blocklist.getValue(),
  ]);
  const set = new Set(perm);
  for (const d of domains) set.add(d);
  const next = [...set].sort((a, b) => a.localeCompare(b));
  await permanentList.setValue(next);

  const manualNext = manual.filter((d) => !next.includes(d));
  if (manualNext.length !== manual.length) {
    await blocklist.setValue(manualNext);
  }
  return next;
}

/** Remove a domain. Returns the resulting list. */
export async function removeDomain(domain: string): Promise<string[]> {
  const current = await blocklist.getValue();
  const next = current.filter((d) => d !== domain);
  await blocklist.setValue(next);
  return next;
}
