// Central place for outbound URLs and identity, so copy stays consistent and
// the App Store link is set in exactly one spot when the iOS app ships.

export const WEBSITE_URL = 'https://dopamindetox.app';
export const PRIVACY_URL = 'https://dopamindetox.app/privacy';
export const SUPPORT_EMAIL = 'dopaminedetox570@gmail.com';

// iOS App Store link — live. The cross-promo card shows a real "Get it on the
// App Store" button (it falls back to "coming soon" only if this is null).
export const APP_STORE_URL: string | null =
  'https://apps.apple.com/us/app/dopamin-detox-earn-screen-time/id6780148393';
