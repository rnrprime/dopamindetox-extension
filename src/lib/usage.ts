import { browser } from '#imports';
import { usageActive, usageFocused, usageLimits, usageState } from './storage';

// (Pro) Per-site daily time tracking for usage limits. We accumulate focused
// active-tab time per limited domain and, once a domain crosses its limit, it
// gets blocked for the rest of the day (enforced in blocking.ts). Counting uses
// host access only — no `tabs` permission. Time resets at local midnight.

// Cap a single flush so a sleep/closed gap (when no events fired) can't be
// counted. Normal gaps are <= the 1-minute alarm interval.
const MAX_FLUSH_MS = 120_000;

function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** The limited domain shown in the focused window's active tab, or null. */
async function activeLimitDomain(): Promise<string | null> {
  const [limits, focused] = await Promise.all([
    usageLimits.getValue(),
    usageFocused.getValue(),
  ]);
  if (limits.length === 0 || !focused) return null;

  let tabs;
  try {
    tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  } catch {
    return null;
  }
  const url = tabs[0]?.url;
  if (!url) return null;

  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  return limits.find((l) => hostMatches(host, l.domain))?.domain ?? null;
}

/**
 * Flush time onto the previously-active domain, then start counting the
 * now-active one. Safe to call on every tab/focus event and on the alarm tick.
 */
export async function tickUsage(): Promise<void> {
  const now = Date.now();
  const state = await usageState.getValue();
  const today = todayStr();

  const seconds = state.date === today ? { ...state.seconds } : {};

  const prev = await usageActive.getValue();
  if (prev.domain && prev.since > 0) {
    const elapsed = Math.min(now - prev.since, MAX_FLUSH_MS);
    if (elapsed > 0) {
      seconds[prev.domain] = (seconds[prev.domain] ?? 0) + Math.round(elapsed / 1000);
    }
  }
  await usageState.setValue({ date: today, seconds });

  const next = await activeLimitDomain();
  await usageActive.setValue({ domain: next, since: now });
}

/** Domains that have hit or passed their daily limit today. */
export async function exceededDomains(): Promise<string[]> {
  const [limits, state] = await Promise.all([
    usageLimits.getValue(),
    usageState.getValue(),
  ]);
  if (state.date !== todayStr()) return [];
  return limits
    .filter((l) => (state.seconds[l.domain] ?? 0) >= l.minutes * 60)
    .map((l) => l.domain);
}

/** Seconds used today for a domain (0 if none / stale day). */
export async function usedSecondsToday(domain: string): Promise<number> {
  const state = await usageState.getValue();
  if (state.date !== todayStr()) return 0;
  return state.seconds[domain] ?? 0;
}

/** Record whether a browser window is focused (pauses counting when not). */
export async function setFocused(focused: boolean): Promise<void> {
  await usageFocused.setValue(focused);
}

/** On browser start, don't count downtime: restart the clock from now. */
export async function resetUsageClock(): Promise<void> {
  await usageActive.setValue({ domain: null, since: Date.now() });
}
