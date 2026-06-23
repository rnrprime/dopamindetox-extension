import { browser } from '#imports';
import { syncRules } from '@/lib/blocking';
import { blocklist, masterEnabled } from '@/lib/storage';

// Service worker (Chromium) / event page (Firefox).
// Keeps declarativeNetRequest rules in sync with the stored block list:
//   - on install/update and browser startup (rebuild from storage)
//   - whenever the list or the master switch changes (from popup/options)
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void syncRules();
  });
  browser.runtime.onStartup.addListener(() => {
    void syncRules();
  });

  blocklist.watch(() => {
    void syncRules();
  });
  masterEnabled.watch(() => {
    void syncRules();
  });

  // Cover the worker being spun up for any other reason.
  void syncRules();
});
