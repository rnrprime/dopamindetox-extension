import { browser } from '#imports';
import { blocklist, masterEnabled } from './storage';

// Core blocking via declarativeNetRequest DYNAMIC rules.
//
// Strategy: full re-sync. On every change we read the stored list, remove all
// existing dynamic rules, and add a fresh rule per domain. This avoids ID drift
// without persisting a separate id<->domain map.
//
// Each rule redirects only top-level navigations (main_frame) to our bundled
// calm "blocked" page, so we control the message (a plain "block" shows the
// browser's error page). DNR needs no host permissions for this.

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

/** Rebuild all dynamic rules from the stored list + master switch. */
export async function syncRules(): Promise<void> {
  const [domains, enabled] = await Promise.all([
    blocklist.getValue(),
    masterEnabled.getValue(),
  ]);

  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const unique = [...new Set(domains)];
  const addRules = enabled ? buildRules(unique) : [];

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
  const [domains, enabled] = await Promise.all([
    blocklist.getValue(),
    masterEnabled.getValue(),
  ]);
  if (!enabled || domains.length === 0) return;

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
