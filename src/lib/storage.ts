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

/** Master on/off for all blocking on this device. */
export const masterEnabled = storage.defineItem<boolean>('local:masterEnabled', {
  fallback: true,
});

/** Add a domain (deduped, sorted). Returns the resulting list. */
export async function addDomain(domain: string): Promise<string[]> {
  const current = await blocklist.getValue();
  if (current.includes(domain)) return current;
  const next = [...current, domain].sort((a, b) => a.localeCompare(b));
  await blocklist.setValue(next);
  return next;
}

/** Remove a domain. Returns the resulting list. */
export async function removeDomain(domain: string): Promise<string[]> {
  const current = await blocklist.getValue();
  const next = current.filter((d) => d !== domain);
  await blocklist.setValue(next);
  return next;
}
