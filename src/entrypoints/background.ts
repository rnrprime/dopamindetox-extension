import { browser } from '#imports';
import { enforceOpenTabs, syncRules } from '@/lib/blocking';
import { blocklist, masterEnabled } from '@/lib/storage';

// Service worker (Chromium) / event page (Firefox).
// Keeps declarativeNetRequest rules in sync with the stored block list, AND
// catches already-open tabs that DNR (new-navigation-only) would miss:
//   - on install/update and browser startup (rebuild from storage)
//   - whenever the list or the master switch changes (from popup/options)
async function apply(): Promise<void> {
  await syncRules();
  await enforceOpenTabs();
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void apply();
  });
  browser.runtime.onStartup.addListener(() => {
    void apply();
  });

  blocklist.watch(() => {
    void apply();
  });
  masterEnabled.watch(() => {
    void apply();
  });

  // Cover the worker being spun up for any other reason.
  void apply();
});
