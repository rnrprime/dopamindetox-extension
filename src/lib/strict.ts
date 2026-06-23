import type { StrictSettings } from './storage';

// Strict mode adds friction to *relaxing* a block (turning blocking off,
// removing a site, disabling strict itself). You can always make blocking
// STRONGER instantly; weakening it requires waiting out a cooldown you start.
//
// This is friction for self-control, not tamper-proof security — a determined
// user with devtools can bypass it, which is fine for this product.

/** True when relaxing actions should be blocked right now. */
export function strictBlocksRelaxing(
  s: StrictSettings,
  now: number = Date.now(),
): boolean {
  if (!s.enabled) return false;
  // A started cooldown that has elapsed temporarily allows relaxing.
  if (s.pendingUnlockAt != null && now >= s.pendingUnlockAt) return false;
  return true;
}

/** True when a cooldown has been started but hasn't elapsed yet. */
export function strictCooldownPending(
  s: StrictSettings,
  now: number = Date.now(),
): boolean {
  return s.enabled && s.pendingUnlockAt != null && now < s.pendingUnlockAt;
}

/** True when a cooldown has been started and has now elapsed. */
export function strictCooldownElapsed(
  s: StrictSettings,
  now: number = Date.now(),
): boolean {
  return s.enabled && s.pendingUnlockAt != null && now >= s.pendingUnlockAt;
}
