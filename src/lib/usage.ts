import { browser } from '#imports';
import { isPro } from './pro';
import {
  siteTimeHistory,
  usageActive,
  usageFocused,
  usageLimits,
  usageState,
} from './storage';

// (Pro) Per-site daily time tracking. We accumulate focused active-tab time per
// domain and use it for two Pro features:
//   - Usage limits: once a limited domain crosses its limit it's blocked for the
//     rest of the day (enforced in blocking.ts).
//   - "Time by website": a local report of where the day's time went.
// Counting uses host access only — no `tabs` permission. Everything is stored in
// local storage and NEVER transmitted. Time resets at local midnight; finished
// days are archived to siteTimeHistory and capped to HISTORY_DAYS. Tracking only
// runs while Pro is active, so free users are never timed.

// Cap a single flush so a sleep/closed gap (when no events fired) can't be
// counted. Normal gaps are <= the 1-minute alarm interval.
const MAX_FLUSH_MS = 120_000;

// How many past days of per-site time to keep (today lives in usageState).
const HISTORY_DAYS = 7;

function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * The domain shown in the focused window's active tab, or null. Counts ANY web
 * domain (not just limited ones). Returns null when no window is focused, on
 * non-http(s) tabs (extension pages, new tab, settings), or on any error.
 */
async function activeDomain(): Promise<string | null> {
  if (!(await usageFocused.getValue())) return null;

  let tabs;
  try {
    tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  } catch {
    return null;
  }
  const url = tabs[0]?.url;
  if (!url || !/^https?:/i.test(url)) return null;

  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  return host || null;
}

/** Move a finished day's totals into the capped history. */
async function archive(state: {
  date: string;
  seconds: Record<string, number>;
}): Promise<void> {
  if (!state.date || Object.keys(state.seconds).length === 0) return;
  const hist = { ...(await siteTimeHistory.getValue()) };
  hist[state.date] = state.seconds;
  // Keep only the most recent HISTORY_DAYS (date strings sort chronologically).
  const kept = Object.keys(hist)
    .sort()
    .slice(-HISTORY_DAYS);
  const pruned: Record<string, Record<string, number>> = {};
  for (const date of kept) {
    const day = hist[date];
    if (day) pruned[date] = day;
  }
  await siteTimeHistory.setValue(pruned);
}

/** Add `seconds` onto a domain's total for today, rolling over at midnight. */
async function flushTo(domain: string, seconds: number): Promise<void> {
  if (seconds <= 0) return;
  const today = todayStr();
  const state = await usageState.getValue();

  if (state.date !== today) {
    await archive(state);
    await usageState.setValue({ date: today, seconds: { [domain]: seconds } });
    return;
  }
  const next = { ...state.seconds };
  next[domain] = (next[domain] ?? 0) + seconds;
  await usageState.setValue({ date: today, seconds: next });
}

/**
 * Flush time onto the previously-active domain, then start counting the
 * now-active one. Safe to call on every tab/focus event and on the alarm tick.
 * No-op (and clears the active domain) when Pro is off — free users aren't timed.
 */
export async function tickUsage(): Promise<void> {
  const now = Date.now();
  const pro = await isPro();

  if (pro) {
    const prev = await usageActive.getValue();
    if (prev.domain && prev.since > 0) {
      const elapsed = Math.min(now - prev.since, MAX_FLUSH_MS);
      if (elapsed > 0) await flushTo(prev.domain, Math.round(elapsed / 1000));
    }
  }

  const next = pro ? await activeDomain() : null;
  await usageActive.setValue({ domain: next, since: now });
}

/** Sum today's seconds across a domain and all of its subdomains. */
function secondsForDomain(
  seconds: Record<string, number>,
  domain: string,
): number {
  let total = 0;
  for (const [host, secs] of Object.entries(seconds)) {
    if (hostMatches(host, domain)) total += secs;
  }
  return total;
}

/** Domains that have hit or passed their daily limit today. */
export async function exceededDomains(): Promise<string[]> {
  const [limits, state] = await Promise.all([
    usageLimits.getValue(),
    usageState.getValue(),
  ]);
  if (state.date !== todayStr()) return [];
  return limits
    .filter((l) => secondsForDomain(state.seconds, l.domain) >= l.minutes * 60)
    .map((l) => l.domain);
}

/** Seconds used today for a domain incl. subdomains (0 if none / stale day). */
export async function usedSecondsToday(domain: string): Promise<number> {
  const state = await usageState.getValue();
  if (state.date !== todayStr()) return 0;
  return secondsForDomain(state.seconds, domain);
}

export interface SiteTime {
  domain: string;
  seconds: number;
}

/** Today's seconds per domain, highest first. Empty on a stale day. */
export async function siteTimeToday(): Promise<SiteTime[]> {
  const state = await usageState.getValue();
  if (state.date !== todayStr()) return [];
  return Object.entries(state.seconds)
    .map(([domain, seconds]) => ({ domain, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

/** Per-domain seconds totalled across the last HISTORY_DAYS (incl. today). */
export async function siteTimeRecent(): Promise<SiteTime[]> {
  const [state, hist] = await Promise.all([
    usageState.getValue(),
    siteTimeHistory.getValue(),
  ]);
  const today = todayStr();
  const cutoff = todayStr(
    new Date(Date.now() - (HISTORY_DAYS - 1) * 86_400_000),
  );

  const totals: Record<string, number> = {};
  for (const [date, seconds] of Object.entries(hist)) {
    if (date === today || date < cutoff) continue; // today comes from usageState
    for (const [domain, secs] of Object.entries(seconds)) {
      totals[domain] = (totals[domain] ?? 0) + secs;
    }
  }
  if (state.date === today) {
    for (const [domain, secs] of Object.entries(state.seconds)) {
      totals[domain] = (totals[domain] ?? 0) + secs;
    }
  }
  return Object.entries(totals)
    .map(([domain, seconds]) => ({ domain, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

/** Record whether a browser window is focused (pauses counting when not). */
export async function setFocused(focused: boolean): Promise<void> {
  await usageFocused.setValue(focused);
}

/** On browser start, don't count downtime: restart the clock from now. */
export async function resetUsageClock(): Promise<void> {
  await usageActive.setValue({ domain: null, since: Date.now() });
}
