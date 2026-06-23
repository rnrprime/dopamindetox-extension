import { defineConfig } from 'wxt';

// Single codebase -> Chrome/Edge (Chromium) + Firefox packages.
// Permissions are intentionally minimal (see docs/privacy): the core blocker
// uses declarativeNetRequest (no host permissions) + storage. `alarms`/`tabs`
// and the extensionpay host permission are added only in the phases that need
// them (schedules/usage-limits and ExtPay respectively).
export default defineConfig({
  srcDir: 'src',
  // Force MV3 on every target. WXT defaults Firefox to MV2; the brief requires
  // MV3 + declarativeNetRequest dynamic rules on Firefox too (FF 128+ supports it).
  manifestVersion: 3,
  manifest: {
    name: 'Dopamin Detox — Website Blocker',
    description:
      'Block distracting websites with a calm, supportive reminder. Your block list stays in your browser — we collect nothing.',
    // activeTab lets the popup read ONLY the current tab's domain, and only when
    // the user opens the popup (a user gesture). It is not a host permission and
    // shows no scary warning — far narrower than `tabs`.
    permissions: ['declarativeNetRequest', 'storage', 'activeTab'],
    icons: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
    action: {
      default_title: 'Dopamin Detox',
    },
    browser_specific_settings: {
      gecko: {
        id: 'dopamindetox@dopamindetox.app',
        strict_min_version: '128.0',
        // We collect nothing; declare it explicitly (required by AMO for new
        // extensions since Nov 2025). Reinforces the local-only privacy story.
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
    // The calm blocked page is a declarativeNetRequest redirect target, so it
    // must be web-accessible. This exposes only that one bundled page; it grants
    // NO host access (that would be a host permission, which we never request).
    web_accessible_resources: [
      {
        resources: ['blocked.html'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
