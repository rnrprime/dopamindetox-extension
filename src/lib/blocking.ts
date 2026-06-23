import { browser } from '#imports';
import { isPro } from './pro';
import { isWithinSchedules } from './schedule';
import { exceededDomains } from './usage';
import { blocklist, masterEnabled, schedules } from './storage';

// Core blocking via declarativeNetRequest DYNAMIC rules.
//
// Strategy: full re-sync. On every change we compute the effective set of
// blocked domains, remove all existing dynamic rules, and add a fresh rule per
// domain. This avoids ID drift without persisting a separate id<->domain map.
//
// Each rule redirects only top-level navigations (main_frame) to our bundled
// calm "blocked" page, so we control the message (a plain "block" shows the
// browser's error page). The redirect action requires host access (declared in
// the manifest).

const RULE_PRIORITY = 1;

type DnrRule = {
  id: number;
  priority: number;
  action: {
    type: 'redirect';
    redirect: { extensionPath: string };
  };
  condition: {
    urlFilter: string;
    resourceTypes: ['main_frame'];
  };
};

function buildRules(domains: string[]): DnrRule[] {
  return domains.map((domain, i) => ({
    id: i + 1,
    priority: RULE_PRIORITY,
    action: {
      type: 'redirect',
      redirect: {
        extensionPath: `/blocked.html?d=${encodeURIComponent(domain)}`,
      },
    },
    condition: {
      // `||domain` matches the domain and its subdomains, on the host boundary.
      urlFilter: `||${domain}`,
      resourceTypes: ['main_frame'],
    },
  }));
}

/**
 * The domains that should be blocked RIGHT NOW, combining:
 *  - master switch (off => nothing)
 *  - the manual block list, gated by Pro schedules (open outside a window)
 *  - (Pro) domains that have exceeded their daily usage limit today
 */
export async function effectiveBlockedDomains(): Promise<string[]> {
  const [domains, enabled] = await Promise.all([
    blocklist.getValue(),
    masterEnabled.getValue(),
  ]);
  if (!enabled) return [];

  const pro = await isPro();
  const set = new Set<string>();

  // Manual list — active unless a Pro schedule says we're outside a window.
  const sched = pro ? await schedules.getValue() : [];
  if (isWithinSchedules(sched)) {
    for (const d of domains) set.add(d);
  }

  // Usage limits (Pro) — independent trigger; blocked for the rest of the day.
  if (pro) {
    for (const d of await exceededDomains()) set.add(d);
  }

  return [...set];
}

/** Rebuild all dynamic rules from the current effective block set. */
export async function syncRules(): Promise<void> {
  const domains = await effectiveBlockedDomains();

  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const addRules = buildRules(domains);

  try {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (error) {
    // A single invalid rule rejects the whole call, leaving nothing blocked.
    // Surface it in the service-worker console rather than failing silently.
    console.error('[Dopamin Detox] Failed to update blocking rules:', error);
    throw error;
  }
}

/** True if `host` is the domain itself or a subdomain of it. */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Catch sites that were ALREADY open before they were blocked.
 * DNR only intercepts new navigations, so an existing tab keeps rendering until
 * it reloads. Here we scan open tabs and redirect any that match a blocked
 * domain straight to the calm page. Uses host access (no `tabs` permission).
 */
export async function enforceOpenTabs(): Promise<void> {
  const domains = await effectiveBlockedDomains();
  if (domains.length === 0) return;

  let tabs;
  try {
    tabs = await browser.tabs.query({});
  } catch {
    return;
  }

  for (const tab of tabs) {
    const { id, url } = tab;
    if (id == null || !url) continue;

    let host: string;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      continue; // not an http(s) tab (e.g. chrome://, about:)
    }

    const matched = domains.find((d) => hostMatches(host, d));
    if (!matched) continue;

    const target = browser.runtime.getURL(
      `/blocked.html?d=${encodeURIComponent(matched)}`,
    );
    try {
      await browser.tabs.update(id, { url: target });
    } catch {
      // Tab may have closed or be protected; skip it.
    }
  }
}
