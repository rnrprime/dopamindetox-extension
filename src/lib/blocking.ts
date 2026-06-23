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

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
}
