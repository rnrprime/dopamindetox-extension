import { browser } from '#imports';
import { enforceOpenTabs, syncRules } from '@/lib/blocking';
import { extpay, proActive, refreshPro } from '@/lib/pro';
import { resetUsageClock, setFocused, tickUsage } from '@/lib/usage';
import {
  blocklist,
  masterEnabled,
  permanentList,
  schedules,
  usageLimits,
} from '@/lib/storage';

const TICK_ALARM = 'dd-tick';
const PRO_ALARM = 'dd-pro';

// Service worker (Chromium) / event page (Firefox).
// - Keeps declarativeNetRequest rules in sync with the effective block set
//   (list + Pro schedules + Pro usage limits), and catches already-open tabs.
// - Tracks focused active-tab time for usage limits + the time-by-website report.
// - Keeps the cached Pro flag in sync with ExtensionPay (Stripe).
async function apply(): Promise<void> {
  await syncRules();
  await enforceOpenTabs();
}

async function refreshAndApply(): Promise<void> {
  await refreshPro();
  await apply();
}

export default defineBackground(() => {
  // Required for ExtPay to work anywhere else in the extension. Safe no-op until
  // EXTPAY_ID is set to a real registered slug.
  extpay.startBackground();

  // Re-evaluate when anything that affects the effective block set changes.
  blocklist.watch(() => void apply());
  permanentList.watch(() => void apply());
  masterEnabled.watch(() => void apply());
  schedules.watch(() => void apply());
  usageLimits.watch(() => void apply());
  proActive.watch(() => void apply());

  // Payment completed → unlock immediately (don't wait for the poll).
  extpay.onPaid.addListener(() => void refreshAndApply());

  // 1-minute heartbeat: flush usage time, then enforce schedules + limits.
  browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  // Re-check paid status periodically (catches cancellations / renewals).
  browser.alarms.create(PRO_ALARM, { periodInMinutes: 30 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TICK_ALARM) {
      void (async () => {
        await tickUsage();
        await apply();
      })();
    } else if (alarm.name === PRO_ALARM) {
      void refreshAndApply();
    }
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
    browser.alarms.create(PRO_ALARM, { periodInMinutes: 30 });
    void (async () => {
      await resetUsageClock();
      await refreshAndApply();
    })();
  });
  browser.runtime.onStartup.addListener(() => {
    browser.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
    browser.alarms.create(PRO_ALARM, { periodInMinutes: 30 });
    void (async () => {
      await resetUsageClock();
      await refreshAndApply();
    })();
  });

  // Cover the worker being spun up for any other reason.
  void refreshAndApply();
});
