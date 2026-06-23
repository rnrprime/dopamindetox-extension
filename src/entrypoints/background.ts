import { browser } from '#imports';
import { enforceOpenTabs, syncRules } from '@/lib/blocking';
import { proActive } from '@/lib/pro';
import { resetUsageClock, setFocused, tickUsage } from '@/lib/usage';
import {
  blocklist,
  masterEnabled,
  schedules,
  usageLimits,
} from '@/lib/storage';

const TICK_ALARM = 'dd-tick';

// Service worker (Chromium) / event page (Firefox).
// - Keeps declarativeNetRequest rules in sync with the effective block set
//   (list + Pro schedules + Pro usage limits), and catches already-open tabs.
// - Tracks focused active-tab time for usage limits.
async function apply(): Promise<void> {
  await syncRules();
  await enforceOpenTabs();
}

export default defineBackground(() => {
  // Re-evaluate when anything that affects the effective block set changes.
  blocklist.watch(() => void apply());
  masterEnabled.watch(() => void apply());
  schedules.watch(() => void apply());
  usageLimits.watch(() => void apply());
  proActive.watch(() => void apply());

  // 1-minute heartbeat: flush usage time, then enforce schedules + limits.
  browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== TICK_ALARM) return;
    void (async () => {
      await tickUsage();
      await apply();
    })();
  });

  // Accumulate usage time on activity (cheap — no rule rebuild here; the
  // heartbeat enforces within a minute).
  browser.tabs.onActivated.addListener(() => void tickUsage());
  browser.tabs.onUpdated.addListener((_id, info) => {
    if (info.status === 'complete' || info.url) void tickUsage();
  });
  browser.windows.onFocusChanged.addListener((windowId) => {
    void (async () => {
      await setFocused(windowId !== browser.windows.WINDOW_ID_NONE);
      await tickUsage();
    })();
  });

  browser.runtime.onInstalled.addListener(() => {
    browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
    void (async () => {
      await resetUsageClock();
      await apply();
    })();
  });
  browser.runtime.onStartup.addListener(() => {
    browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
    void (async () => {
      await resetUsageClock();
      await apply();
    })();
  });

  // Cover the worker being spun up for any other reason.
  void apply();
});
